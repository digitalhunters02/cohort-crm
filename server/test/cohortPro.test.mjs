// Recursos pro de Cohort: inscrição online, recomendação, vagas por série, parcelas, portal da família e contrato.
// Precisa de um Postgres local (cria e apaga um banco temporário), como auth.test.mjs.
//   TEST_PG_ADMIN_URL=postgres://test:test@localhost:5432/postgres node --test server/test/cohortPro.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, '..', 'src');
const ADMIN_URL = process.env.TEST_PG_ADMIN_URL || 'postgres://test:test@localhost:5432/postgres';
const DB_NAME = `cohort_pro_${process.pid}_${Date.now() % 100000}`;
const DB_URL = ADMIN_URL.replace(/\/[^/]*$/, `/${DB_NAME}`);
const OWNER = { email: 'owner@example.com', pass: 'Owner-pass-12345' };
const FREE_PATH = '/api/inquiries', MID_PATH = '/api/interviews', TOP_PATH = '/api/automations';

let admin;
const servers = [];
const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); s.on('error', reject); });

async function start(extraEnv = {}) {
  const port = await freePort();
  const env = { ...process.env, NODE_ENV: 'test', PORT: String(port), DATABASE_URL: DB_URL, JWT_SECRET: 'test-secret-test-secret-123', BOOTSTRAP_OWNER_EMAIL: OWNER.email, BOOTSTRAP_OWNER_PASSWORD: OWNER.pass, FRONTEND_URL: 'http://app.test', SMTP_HOST: '' };
  for (const k of ['LICENSED_PLAN', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_API_BASE']) delete env[k];
  Object.assign(env, extraEnv);
  const proc = spawn('node', [path.join(SRC, 'index.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = ''; proc.stdout.on('data', (d) => { logs += d; }); proc.stderr.on('data', (d) => { logs += d; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch { /* subindo */ } await new Promise((r) => setTimeout(r, 150)); }
  const srv = {
    proc, logs: () => logs,
    stop: () => new Promise((resolve) => { proc.once('exit', resolve); proc.kill('SIGTERM'); }),
    async call(method, url, { token, body, headers, raw } = {}) {
      const r = await fetch(base + url, { method, headers: { ...(body || raw ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: raw ?? (body ? JSON.stringify(body) : undefined) });
      const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch { /* texto */ }
      return { status: r.status, json, text };
    },
  };
  servers.push(srv);
  const login = (await srv.call('POST', '/api/auth/login', { body: { email: OWNER.email, password: OWNER.pass } })).json;
  srv.token = login.token;
  return srv;
}
async function stop(srv) { await srv.stop(); servers.splice(servers.indexOf(srv), 1); }

before(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL }); await admin.connect();
  await admin.query(`CREATE DATABASE ${DB_NAME}`);
  const seed = spawnSync('node', [path.join(SRC, 'seed.js')], { env: { ...process.env, DATABASE_URL: DB_URL }, encoding: 'utf8' });
  assert.equal(seed.status, 0, seed.stderr);
});
after(async () => {
  for (const s of servers) if (s.proc.exitCode === null && s.proc.signalCode === null) await s.stop();
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)`); await admin.end();
});


test('inscrição online: Essencial recebe em Inquiries; básico não vê; robô e repetição não duplicam', async () => {
  let s = await start({ LICENSED_PLAN: 'basico' });
  assert.equal((await s.call('GET', '/api/public/apply')).status, 404);
  assert.equal((await s.call('POST', '/api/public/apply', { body: { student_name: 'X Y', parent_name: 'P Q', parent_email: 'a@b.co', grade: 'Kindergarten' } })).status, 404);
  await stop(s);
  s = await start({ LICENSED_PLAN: 'essencial' });
  const info = await s.call('GET', '/api/public/apply'); assert.equal(info.status, 200); assert.ok(info.json.grades.includes('3rd Grade'));
  const body = { student_name: 'Lia Rocha', parent_name: 'Marta Rocha', parent_email: 'Marta.Rocha@Example.com', parent_phone: '555-0100', grade: '3rd Grade', message: '=HYPERLINK("x")' };
  assert.equal((await s.call('POST', '/api/public/apply', { body: { ...body, parent_email: 'ruim' } })).status, 400);
  assert.equal((await s.call('POST', '/api/public/apply', { body: { ...body, student_name: 'L' } })).status, 400);
  assert.equal((await s.call('POST', '/api/public/apply', { body: { ...body, grade: '' } })).status, 400);
  assert.equal((await s.call('POST', '/api/public/apply', { body })).status, 201);
  assert.equal((await s.call('POST', '/api/public/apply', { body })).status, 201, 'repetir não duplica');
  assert.equal((await s.call('POST', '/api/public/apply', { body: { ...body, student_name: 'Robo Bot', website: 'http://spam' } })).json.ok, true);
  const inq = (await s.call('GET', '/api/inquiries', { token: s.token })).json.filter((i) => i.parent_email === 'marta.rocha@example.com');
  assert.equal(inq.length, 1); assert.equal(inq[0].source, 'Website form'); assert.equal(inq[0].status, 'New');
  assert.equal((await s.call('GET', '/api/inquiries', { token: s.token })).json.some((i) => i.student_name === 'Robo Bot'), false);
  await stop(s);
});

test('recomendação do professor por link: pedir, responder sem login, uma vez só', async () => {
  let s = await start({ LICENSED_PLAN: 'basico' });
  const apps = (await s.call('GET', '/api/applicants', { token: s.token })).json; const a = apps[0];
  assert.equal((await s.call('POST', `/api/applicants/${a.id}/recommendations`, { token: s.token, body: { recommender_name: 'Ms Lee', recommender_email: 'lee@school.org' } })).status, 402);
  await stop(s);
  s = await start({ LICENSED_PLAN: 'essencial' });
  const mk = (b) => s.call('POST', `/api/applicants/${a.id}/recommendations`, { token: s.token, body: b });
  assert.equal((await mk({ recommender_name: 'M', recommender_email: 'lee@school.org' })).status, 400);
  assert.equal((await mk({ recommender_name: 'Ms Lee', recommender_email: 'ruim' })).status, 400);
  assert.equal((await s.call('POST', '/api/applicants/999999/recommendations', { token: s.token, body: { recommender_name: 'Ms Lee', recommender_email: 'lee@school.org' } })).status, 404);
  const r = await mk({ recommender_name: 'Ms Lee', recommender_email: 'lee@school.org' });
  assert.equal(r.status, 201); assert.match(r.json.url, /^http:\/\/app\.test\/#\/recommend\/[\w-]{30,}$/); assert.match(r.json.emailError, /not set up/);
  const v = await s.call('GET', `/api/public/recommendation/${r.json.token}`);
  assert.equal(v.status, 200); assert.equal(v.json.student_name, a.student_name); assert.equal(v.json.status, 'Requested');
  assert.equal((await s.call('GET', `/api/public/recommendation/${'z'.repeat(30)}`)).status, 404);
  const ok = { name: 'Ms Lee', recommend: 'strongly', comments: 'Wonderful student.', ratings: { academics: 5, character: 5, leadership: 4, potential: 5 } };
  assert.equal((await s.call('POST', `/api/public/recommendation/${r.json.token}`, { body: { ...ok, ratings: { academics: 9, character: 5, leadership: 4, potential: 5 } } })).status, 400, 'nota fora de 1 a 5');
  assert.equal((await s.call('POST', `/api/public/recommendation/${r.json.token}`, { body: { ...ok, ratings: { academics: 5 } } })).status, 400, 'falta nota');
  assert.equal((await s.call('POST', `/api/public/recommendation/${r.json.token}`, { body: { ...ok, recommend: 'maybe' } })).status, 400);
  assert.equal((await s.call('POST', `/api/public/recommendation/${r.json.token}`, { body: { ...ok, name: '' } })).status, 400);
  assert.equal((await s.call('POST', `/api/public/recommendation/${r.json.token}`, { body: ok })).status, 200);
  assert.equal((await s.call('POST', `/api/public/recommendation/${r.json.token}`, { body: ok })).status, 409, 'só uma vez');
  const list = (await s.call('GET', `/api/applicants/${a.id}/recommendations`, { token: s.token })).json;
  assert.equal(list[0].status, 'Received'); assert.equal(list[0].ratings.leadership, 4); assert.equal(list[0].recommend, 'strongly');
  await stop(s);
});

test('vagas por série: capacidade, matriculados, aceitos e vagas livres', async () => {
  let s = await start({ LICENSED_PLAN: 'basico' });
  assert.equal((await s.call('GET', '/api/seats', { token: s.token })).status, 402);
  await stop(s);
  s = await start({ LICENSED_PLAN: 'essencial' });
  const before = (await s.call('GET', '/api/seats', { token: s.token })).json;
  assert.ok(before.rows.length > 0 && before.rows.every((r) => r.seats === null));
  const withStudents = before.rows.find((r) => r.enrolled > 0);
  assert.equal((await s.call('PUT', `/api/seats/${encodeURIComponent(withStudents.grade)}`, { token: s.token, body: { seats: -1 } })).status, 400);
  assert.equal((await s.call('PUT', `/api/seats/${encodeURIComponent(withStudents.grade)}`, { token: s.token, body: { seats: 20 } })).status, 200);
  const after = (await s.call('GET', '/api/seats', { token: s.token })).json;
  const row = after.rows.find((r) => r.grade === withStudents.grade);
  assert.equal(row.seats, 20); assert.equal(row.open, 20 - row.enrolled - row.accepted);
  assert.ok(after.totals.seats >= 20);
  await stop(s);
});

test('parcelas da mensalidade: só no Completo; divide certo e cria as faturas', async () => {
  let s = await start({ LICENSED_PLAN: 'essencial' });
  assert.equal((await s.call('POST', '/api/tuition-plans', { token: s.token, body: {} })).status, 402);
  await stop(s);
  s = await start({ LICENSED_PLAN: 'completo' });
  const fam = (await s.call('GET', '/api/families', { token: s.token })).json[0];
  const body = { family_id: fam.id, term: '2027 Fall', total: 10000, installments: 3, first_due_date: '2027-01-31' };
  const dry = await s.call('POST', '/api/tuition-plans', { token: s.token, body: { ...body, dry_run: true } });
  assert.equal(dry.status, 200); assert.deepEqual(dry.json.schedule.map((x) => x.amount_due), [3333, 3333, 3334]);
  assert.deepEqual(dry.json.schedule.map((x) => x.due_date), ['2027-01-31', '2027-02-28', '2027-03-31'], 'fim de mês ajustado');
  const n0 = (await s.call('GET', '/api/tuition-invoices', { token: s.token })).json.length;
  assert.equal((await s.call('POST', '/api/tuition-plans', { token: s.token, body: { ...body, installments: 1 } })).status, 400);
  assert.equal((await s.call('POST', '/api/tuition-plans', { token: s.token, body: { ...body, installments: 13 } })).status, 400);
  assert.equal((await s.call('POST', '/api/tuition-plans', { token: s.token, body: { ...body, first_due_date: 'ontem' } })).status, 400);
  assert.equal((await s.call('POST', '/api/tuition-plans', { token: s.token, body: { ...body, family_id: 99999 } })).status, 400);
  assert.equal((await s.call('GET', '/api/tuition-invoices', { token: s.token })).json.length, n0, 'nada criado nos erros');
  assert.equal((await s.call('POST', '/api/tuition-plans', { token: s.token, body })).status, 201);
  const inv = (await s.call('GET', '/api/tuition-invoices', { token: s.token })).json;
  assert.equal(inv.length, n0 + 3);
  assert.equal(inv.filter((i) => i.term.startsWith('2027 Fall')).reduce((a, i) => a + i.amount_due, 0), 10000);
  await stop(s);
});

test('portal da família e contrato com assinatura: só no Completo, sem login, uma assinatura', async () => {
  let s = await start({ LICENSED_PLAN: 'essencial' });
  const fam = (await s.call('GET', '/api/families', { token: s.token })).json[0];
  assert.equal((await s.call('POST', `/api/families/${fam.id}/portal-link`, { token: s.token })).status, 402);
  assert.equal((await s.call('GET', '/api/contracts', { token: s.token })).status, 402);
  assert.equal((await s.call('GET', `/api/public/family/${'a'.repeat(32)}`)).status, 404);
  await stop(s);
  s = await start({ LICENSED_PLAN: 'completo' });
  const pl = await s.call('POST', `/api/families/${fam.id}/portal-link`, { token: s.token });
  assert.equal(pl.status, 200); assert.match(pl.json.url, /#\/portal\/[\w-]{30,}$/);
  assert.equal((await s.call('POST', '/api/families/999999/portal-link', { token: s.token })).status, 404);
  const p = await s.call('GET', `/api/public/family/${pl.json.token}`);
  assert.equal(p.status, 200); assert.equal(p.json.family, fam.primary_guardian_name);
  assert.equal(p.json.totals.balance, p.json.invoices.reduce((a, i) => a + Math.max(0, i.amount_due - i.amount_paid), 0));
  assert.ok(!('email' in p.json) && !('phone' in p.json), 'portal não vaza contato');
  // contrato
  const mk = (b) => s.call('POST', '/api/contracts', { token: s.token, body: b });
  assert.equal((await mk({ family_id: fam.id, title: 'Enrollment 2027', body: 'curto' })).status, 400);
  assert.equal((await mk({ family_id: 99999, title: 'Enrollment 2027', body: 'x'.repeat(40) })).status, 400);
  const c = await mk({ family_id: fam.id, student_name: 'Lia', title: 'Enrollment 2027', body: 'The family agrees to pay tuition on time.\nSecond line.', send_email: true });
  assert.equal(c.status, 201); assert.match(c.json.emailError, /not set up|no email/);
  const token = c.json.url.split('/contract/')[1];
  const v = await s.call('GET', `/api/public/contract/${token}`); assert.equal(v.status, 200); assert.equal(v.json.status, 'Sent'); assert.match(v.json.body, /Second line/);
  const withContract = (await s.call('GET', `/api/public/family/${pl.json.token}`)).json; assert.equal(withContract.contracts.length, 1);
  assert.equal((await s.call('POST', `/api/public/contract/${token}`, { body: { name: 'Marta Rocha' } })).status, 400, 'precisa concordar');
  assert.equal((await s.call('POST', `/api/public/contract/${token}`, { body: { agree: true, name: '' } })).status, 400);
  assert.equal((await s.call('POST', `/api/public/contract/${token}`, { body: { agree: true, name: 'Marta Rocha' } })).status, 200);
  assert.equal((await s.call('POST', `/api/public/contract/${token}`, { body: { agree: true, name: 'Outro' } })).status, 409);
  const list = (await s.call('GET', '/api/contracts', { token: s.token })).json;
  assert.equal(list[0].status, 'Signed'); assert.equal(list[0].signed_by, 'Marta Rocha'); assert.ok(!('token' in list[0]));
  assert.equal((await s.call('DELETE', `/api/contracts/${list[0].id}`, { token: s.token })).status, 409, 'assinado não apaga');
  const c2 = await mk({ family_id: fam.id, title: 'Another', body: 'y'.repeat(40) });
  assert.equal((await s.call('DELETE', `/api/contracts/${c2.json.id}`, { token: s.token })).status, 204);
  assert.equal((await s.call('GET', `/api/public/contract/${c2.json.url.split('/contract/')[1]}`)).status, 404);
  await stop(s);
});
