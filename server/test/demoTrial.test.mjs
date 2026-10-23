// Teste grátis de 3 dias: POST /api/demo-request, bloqueio das rotas que saem do sistema, prazo, limpeza e o aviso ao Harbor.
// Precisa de um Postgres local (cria e apaga um banco temporário). Usa só as portas 7831 a 7839.
//   TEST_PG_ADMIN_URL=postgres://test:test@localhost:5432/postgres node --test server/test/demoTrial.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, '..', 'src');
const ADMIN_URL = process.env.TEST_PG_ADMIN_URL || 'postgres://test:test@localhost:5432/postgres';
const DB_NAME = `cohort_trial_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
const DB_URL = ADMIN_URL.replace(/\/[^/]*$/, `/${DB_NAME}`);
const OWNER = { email: 'owner@example.com', pass: 'Owner-pass-12345' };
const ADMIN_KEY = 'k'.repeat(40);
const BLOCKED_MSG = 'Não disponível no teste grátis';

// Portas deste teste: 7831 servidor principal (plano Completo), 7832 servidor no plano Essential (limite de 3 logins),
// 7833 servidor com Harbor de mentira, 7834 com Harbor fora do ar, 7835 com Harbor que não responde, 7836 com o teste desligado.
// 7837 = Harbor de mentira, 7838 = Harbor que trava, 7839 = ninguém escutando (Harbor fora do ar).
const PORT = { main: 7831, basic: 7832, harbor: 7833, down: 7834, hang: 7835, off: 7836, fakeHarbor: 7837, fakeHang: 7838, closed: 7839 };

let admin;
const servers = [];
const fakes = [];
const dbq = async (text, params) => {
  const c = new pg.Client({ connectionString: DB_URL });
  await c.connect();
  try { return (await c.query(text, params)).rows; } finally { await c.end(); }
};

async function startServer(port, extraEnv = {}) {
  const env = {
    ...process.env, NODE_ENV: 'test', PORT: String(port), DATABASE_URL: DB_URL, JWT_SECRET: 'test-secret-test-secret-123',
    BOOTSTRAP_OWNER_EMAIL: OWNER.email, BOOTSTRAP_OWNER_PASSWORD: OWNER.pass, FRONTEND_URL: 'http://app.test',
    SMTP_HOST: '', ...extraEnv,
  };
  for (const k of ['LICENSED_PLAN', 'STRIPE_SECRET_KEY', 'HARBOR_API_URL', 'ADMIN_SUMMARY_KEY', 'DEMO_TRIAL_DISABLED']) if (!(k in extraEnv)) delete env[k];
  const proc = spawn('node', [path.join(SRC, 'index.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  proc.stdout.on('data', (d) => { logs += d; });
  proc.stderr.on('data', (d) => { logs += d; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch { /* ainda subindo */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  const srv = {
    base, proc, logs: () => logs,
    stop: () => new Promise((resolve) => { proc.once('exit', resolve); proc.kill('SIGTERM'); }),
    async call(method, url, { token, body, headers } = {}) {
      const r = await fetch(base + url, {
        method,
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await r.text();
      let json = null; try { json = JSON.parse(text); } catch { /* não é json */ }
      return { status: r.status, json, text };
    },
  };
  servers.push(srv);
  return srv;
}

// Um IP de mentira por teste (o servidor confia no primeiro proxy), para o limite por IP de um teste não afetar os outros.
let ipCounter = 0;
const newIp = () => `10.20.30.${++ipCounter}`;
const trial = (s, body, ip = newIp()) => s.call('POST', '/api/demo-request', { body, headers: { 'X-Forwarded-For': ip } });

before(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${DB_NAME}`);
  const seed = spawnSync('node', [path.join(SRC, 'seed.js')], { env: { ...process.env, DATABASE_URL: DB_URL }, encoding: 'utf8' });
  assert.equal(seed.status, 0, seed.stderr);
});

after(async () => {
  for (const s of servers) if (s.proc.exitCode === null && s.proc.signalCode === null) await s.stop();
  for (const f of fakes) f.close();
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)`);
  await admin.end();
});

let main;
let T; // token do teste grátis principal
let trialAccount;

test('pedido válido cria a conta de teste (3 dias, sem senha conhecida) e devolve token que abre os dados de exemplo', async () => {
  main = await startServer(PORT.main, { LICENSED_PLAN: 'completo', ADMIN_SUMMARY_KEY: ADMIN_KEY });
  const r = await trial(main, { name: '  Pat Prospect ', email: 'Pat@Prospect.com' });
  assert.equal(r.status, 201, r.text);
  assert.ok(r.json.token);
  trialAccount = r.json.account;
  T = r.json.token;
  assert.equal(trialAccount.isDemoTrial, true);
  assert.equal(trialAccount.email, 'pat@prospect.com');
  assert.equal(trialAccount.name, 'Pat Prospect');
  assert.equal(trialAccount.role, 'staff', 'nunca dono');
  assert.equal(trialAccount.password_hash, undefined);
  assert.ok(!r.text.includes('password'), 'nada de senha na resposta');
  const left = new Date(trialAccount.demoExpiresAt).getTime() - Date.now();
  assert.ok(left > 2.99 * 86400000 && left <= 3 * 86400000 + 5000, `cerca de 3 dias (${left})`);
  const inq = await main.call('GET', '/api/inquiries', { token: T });
  assert.equal(inq.status, 200);
  assert.ok(inq.json.length >= 10, 'vê os dados de exemplo');
  const me = await main.call('GET', '/api/auth/me', { token: T });
  assert.equal(me.json.account.isDemoTrial, true);
});

test('a mesma pessoa voltando no meio do teste recebe a mesma conta, sem reiniciar o relógio', async () => {
  const again = await trial(main, { name: 'Pat', email: ' PAT@prospect.com ' });
  assert.equal(again.status, 200);
  assert.equal(again.json.account.id, trialAccount.id);
  assert.equal(again.json.account.demoExpiresAt, trialAccount.demoExpiresAt);
  assert.ok(again.json.token);
  assert.equal((await dbq(`SELECT COUNT(*)::int n FROM accounts WHERE lower(email) = 'pat@prospect.com'`))[0].n, 1);
});

test('e-mail de conta real dá 409 e a conta real não muda; e-mail inválido e pedido vazio dão 400', async () => {
  const before = (await dbq(`SELECT id, role, is_demo_trial, password_hash FROM accounts WHERE lower(email) = $1`, [OWNER.email]))[0];
  const r = await trial(main, { name: 'Impostor', email: OWNER.email });
  assert.equal(r.status, 409);
  assert.equal(r.json.code, 'email_in_use');
  assert.equal(r.json.token, undefined);
  const after = (await dbq(`SELECT id, role, is_demo_trial, password_hash FROM accounts WHERE lower(email) = $1`, [OWNER.email]))[0];
  assert.deepEqual(after, before);
  const ip = newIp();
  assert.equal((await trial(main, { name: 'X', email: 'nope' }, ip)).status, 400);
  assert.equal((await trial(main, { name: 'X', email: 'a@b' }, ip)).json.code, 'invalid_email');
  assert.equal((await trial(main, { name: '', email: 'x@y.com' }, ip)).status, 400);
  assert.equal((await trial(main, { name: 'X' }, ip)).status, 400);
  assert.equal((await trial(main, {}, ip)).status, 400);
});

test('a conta de teste não entra por senha nem recebe link de redefinição', async () => {
  const login = await main.call('POST', '/api/auth/login', { body: { email: 'pat@prospect.com', password: 'qualquer-coisa-123' }, headers: { 'X-Forwarded-For': newIp() } });
  assert.equal(login.status, 401);
  const f = await main.call('POST', '/api/auth/forgot', { body: { email: 'pat@prospect.com' }, headers: { 'X-Forwarded-For': newIp() } });
  assert.equal(f.status, 200);
  assert.equal((await dbq(`SELECT reset_token_hash FROM accounts WHERE id = $1`, [trialAccount.id]))[0].reset_token_hash, null);
});

test('blockDemo: bloqueia o que sai do sistema, gasta dinheiro ou mexe em contas/segurança', async () => {
  const blocked = [
    ['POST', '/api/integrations/whatsapp/send', { to: '+15551234567', text: 'oi' }],
    ['POST', '/api/integrations/whatsapp/connect', { phoneNumberId: '1', accessToken: 'x' }],
    ['POST', '/api/integrations/whatsapp/disconnect', {}],
    ['GET', '/api/integrations/whatsapp/conversations'],
    ['GET', '/api/integrations/whatsapp/conversations/15551234567'],
    ['POST', '/api/billing/checkout', { plan: 'essencial' }],
    ['POST', '/api/billing/portal', {}],
    ['GET', '/api/accounts'],
    ['POST', '/api/accounts', { name: 'N', email: 'n@x.com', password: 'Temp-pass-12345' }],
    ['POST', '/api/accounts/1/reset-password', { password: 'Temp-pass-12345' }],
    ['DELETE', '/api/accounts/1'],
    ['POST', '/api/auth/change-password', { currentPassword: 'a', newPassword: 'Another-pass-12345' }],
    ['GET', '/api/photo-import/status'],
    ['POST', '/api/photo-import', {}],
    ['PUT', '/api/photo-import/credit', { enabled: true }],
    ['POST', '/api/users', { name: 'N', email: 'n@x.com', role: 'r', initials: 'N', color: '#000' }],
    ['PUT', '/api/users/1', { name: 'N', email: 'n@x.com', role: 'r', initials: 'N', color: '#000' }],
    ['DELETE', '/api/users/1'],
    ['POST', '/api/applicants/1/recommendations', { recommender_name: 'Ms Teacher', recommender_email: 't@school.org' }],
    ['POST', '/api/families/1/portal-link', {}],
    ['POST', '/api/contracts', { family_id: 1, title: 'T', body: 'x'.repeat(30), send_email: true }],
  ];
  for (const [m, u, body] of blocked) {
    const r = await main.call(m, u, { token: T, body });
    assert.equal(r.status, 403, `${m} ${u} -> ${r.status} ${r.text}`);
    assert.equal(r.json.code, 'demo_blocked', `${m} ${u}`);
    assert.equal(r.json.error, BLOCKED_MSG);
  }
  // nada saiu: nenhum usuário/conta nova e nenhum e-mail de recomendação
  assert.equal((await dbq(`SELECT COUNT(*)::int n FROM accounts WHERE lower(email) = 'n@x.com'`))[0].n, 0);
  assert.equal((await dbq(`SELECT COUNT(*)::int n FROM users WHERE lower(email) = 'n@x.com'`))[0].n, 0);
  assert.equal((await dbq(`SELECT COUNT(*)::int n FROM recommendations WHERE recommender_email = 't@school.org'`))[0].n, 0);
});

test('blockDemo não atrapalha o resto: leitura e o trabalho do dia a dia nos dados de exemplo seguem liberados', async () => {
  const ok = [
    ['GET', '/api/auth/me'], ['GET', '/api/dashboard'], ['GET', '/api/reports'], ['GET', '/api/inquiries'], ['GET', '/api/applicants'],
    ['GET', '/api/families'], ['GET', '/api/students'], ['GET', '/api/users'], ['GET', '/api/seats'], ['GET', '/api/contracts'],
    ['GET', '/api/billing/status'], ['GET', '/api/integrations/whatsapp/status'], ['GET', '/api/automations'], ['GET', '/api/tuition-invoices'],
  ];
  for (const [m, u] of ok) {
    const r = await main.call(m, u, { token: T });
    assert.equal(r.status, 200, `${m} ${u} -> ${r.status} ${r.text}`);
  }
  const created = await main.call('POST', '/api/inquiries', { token: T, body: { student_name: 'Trial Kid', grade_applying_for: '3rd Grade', parent_name: 'Pat', source: 'Website' } });
  assert.equal(created.status, 201, created.text);
  assert.equal((await main.call('DELETE', `/api/inquiries/${created.json.id}`, { token: T })).status, 200);
  const fam = (await main.call('GET', '/api/families', { token: T })).json[0];
  const contract = await main.call('POST', '/api/contracts', { token: T, body: { family_id: fam.id, title: 'Enrollment 2027', body: 'Terms of enrollment for the year. '.repeat(2) } });
  assert.equal(contract.status, 201, contract.text);
  assert.equal(contract.json.emailed, false);
  assert.equal((await main.call('DELETE', `/api/contracts/${contract.json.id}`, { token: T })).status, 204);
});

test('conta de teste não conta no limite de logins do plano nem no resumo do Harbor', async () => {
  assert.ok((await dbq(`SELECT COUNT(*)::int n FROM accounts WHERE is_demo_trial`))[0].n >= 1);
  const login = await main.call('POST', '/api/auth/login', { body: { email: OWNER.email, password: OWNER.pass }, headers: { 'X-Forwarded-For': newIp() } });
  assert.equal(login.status, 200);
  const O = login.json.token;
  assert.equal((await main.call('GET', '/api/billing/status', { token: O })).json.users, 1, 'só contas reais');
  const sum = await main.call('GET', '/api/admin-summary', { headers: { 'X-Admin-Key': ADMIN_KEY } });
  assert.equal(sum.status, 200);
  assert.equal(sum.json.accounts, 1, 'accounts = só contas reais');

  // plano Essential (3 logins): com contas de teste existindo, o dono ainda pode criar 2 de equipe (1 + 2 = 3) e o 3º é recusado
  const basic = await startServer(PORT.basic, { LICENSED_PLAN: 'basico', ADMIN_SUMMARY_KEY: ADMIN_KEY });
  const add = (n) => basic.call('POST', '/api/accounts', { token: O, body: { name: `Staff ${n}`, email: `staff${n}@example.com`, password: 'Temp-pass-12345' } });
  assert.equal((await add(1)).status, 201);
  assert.equal((await add(2)).status, 201);
  const third = await add(3);
  assert.equal(third.status, 402);
  assert.equal(third.json.code, 'user_limit');
  const st = (await basic.call('GET', '/api/billing/status', { token: O })).json;
  assert.equal(st.users, 3);
  assert.equal(st.userLimit, 3);
  assert.equal((await basic.call('GET', '/api/admin-summary', { headers: { 'X-Admin-Key': ADMIN_KEY } })).json.accounts, 3);
  await basic.stop();
});

test('selo de plano + teste grátis: /api/billing/status serve a conta de teste (sem ser "dono"), o "Ver como plano" não vale para ela e os bloqueios por plano seguem o plano da instalação', async () => {
  // O e-mail do teste é digitado pelo visitante: mesmo sendo um e-mail de OWNER_EMAILS sem conta real, a conta de teste nunca vira "dono da plataforma".
  const VISITOR = 'plataforma-dono@example.com';
  const basic = await startServer(PORT.basic, { LICENSED_PLAN: 'basico', OWNER_EMAILS: VISITOR });
  try {
    const t = await trial(basic, { name: 'Visitante Dono', email: VISITOR });
    assert.equal(t.status, 201, t.text);
    const tok = t.json.token;
    const st = await basic.call('GET', '/api/billing/status', { token: tok });
    assert.equal(st.status, 200, st.text);
    assert.equal(st.json.plan, 'basico');
    assert.equal(st.json.owner, false, 'conta de teste não é dono da plataforma');
    assert.equal(st.json.previewPlan, null);
    assert.equal(st.json.gates.seats.minPlan, 'essencial');
    assert.equal(st.json.gates.seats.locked, true);
    assert.equal(st.json.gates.whatsapp.locked, true);
    assert.equal(st.json.users, (await dbq(`SELECT COUNT(*)::int n FROM accounts WHERE NOT is_demo_trial`))[0].n, 'a conta de teste não conta nos logins do plano');
    assert.ok(Array.isArray(st.json.catalog) && st.json.catalog.length === 3);
    // "Ver como plano" é ignorado: continua no plano da instalação
    const prev = await basic.call('GET', '/api/billing/status', { token: tok, headers: { 'X-Preview-Plan': 'completo' } });
    assert.equal(prev.json.plan, 'basico');
    assert.equal(prev.json.previewPlan, null);
    assert.equal((await basic.call('GET', '/api/seats', { token: tok, headers: { 'X-Preview-Plan': 'completo' } })).status, 402);
    // recurso do plano da instalação segue livre para leitura; o que seria cobrança/plano segue fechado ao teste
    assert.equal((await basic.call('GET', '/api/students', { token: tok })).status, 200);
    assert.equal((await basic.call('POST', '/api/billing/checkout', { token: tok, body: { plan: 'completo' } })).status, 403);
    assert.equal((await basic.call('GET', '/api/public/plans')).status, 200);
  } finally { await basic.stop(); }
});

test('teste vencido: o token é recusado com mensagem clara, a limpeza apaga a conta, e quem volta ganha um teste novo', async () => {
  await dbq(`UPDATE accounts SET demo_expires_at = now() - interval '1 minute' WHERE id = $1`, [trialAccount.id]);
  const r = await main.call('GET', '/api/inquiries', { token: T });
  assert.equal(r.status, 401);
  assert.equal(r.json.code, 'demo_expired');
  assert.match(r.json.error, /free trial has ended/i);
  assert.equal((await main.call('GET', '/api/auth/me', { token: T })).status, 401);
  // ainda não varrida: pedir de novo recria a conta com prazo novo
  const again = await trial(main, { name: 'Pat Again', email: 'pat@prospect.com' });
  assert.equal(again.status, 201);
  assert.notEqual(again.json.account.id, trialAccount.id);
  assert.ok(new Date(again.json.account.demoExpiresAt) > new Date());
  assert.equal((await main.call('GET', '/api/inquiries', { token: again.json.token })).status, 200);
  assert.equal((await main.call('GET', '/api/inquiries', { token: T })).status, 401, 'o token antigo continua recusado');

  // a limpeza de hora em hora (mesma função, rodada aqui) apaga as vencidas e só elas
  await dbq(`UPDATE accounts SET demo_expires_at = now() - interval '1 minute' WHERE id = $1`, [again.json.account.id]);
  const keep = await trial(main, { name: 'Keep Me', email: 'keep@prospect.com' });
  assert.equal(keep.status, 201);
  process.env.DATABASE_URL = DB_URL;
  const { cleanupExpiredDemoTrials } = await import('../src/demoTrial.js');
  assert.equal(await cleanupExpiredDemoTrials(), 1);
  await (await import('../src/db.js')).default.end(); // conexão deste processo: fecha antes de apagar o banco
  assert.equal((await dbq(`SELECT COUNT(*)::int n FROM accounts WHERE lower(email) = 'pat@prospect.com'`))[0].n, 0);
  assert.equal((await dbq(`SELECT COUNT(*)::int n FROM accounts WHERE lower(email) = 'keep@prospect.com'`))[0].n, 1);
  assert.equal((await dbq(`SELECT COUNT(*)::int n FROM accounts WHERE lower(email) = $1`, [OWNER.email]))[0].n, 1, 'conta real intocada');
  assert.equal((await main.call('GET', '/api/inquiries', { token: keep.json.token })).status, 200);
});

test('limite por IP: 5 pedidos por janela, o 6º leva 429 com Retry-After', async () => {
  const ip = '10.99.99.99';
  for (let i = 0; i < 5; i++) assert.equal((await trial(main, { name: 'Bot', email: `bot${i}@x.com` }, ip)).status, 201);
  const r = await trial(main, { name: 'Bot', email: 'bot9@x.com' }, ip);
  assert.equal(r.status, 429);
  assert.equal(r.json.code, 'too_many_attempts');
  assert.ok(r.json.retryAfter > 0);
  // outro IP segue livre
  assert.equal((await trial(main, { name: 'Ok', email: 'ok-other-ip@x.com' }, '10.99.99.98')).status, 201);
});

// ---------------------------------------------------------------- aviso ao Harbor
function fakeHarbor(port, { hang = false } = {}) {
  const got = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      got.push({ method: req.method, url: req.url, headers: req.headers, body });
      if (hang) return; // nunca responde: o cadastro não pode esperar
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}');
    });
  });
  return new Promise((resolve) => { server.listen(port, '127.0.0.1', () => { fakes.push({ close: () => { server.closeAllConnections?.(); server.close(); } }); resolve({ got }); }); });
}
const waitFor = async (fn, ms = 4000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await new Promise((r) => setTimeout(r, 50)); } return null; };

test('Harbor: o aviso leva X-Capture-Key, produto, source e notes exatos, só a origem do anúncio permitida, e nunca senha/token', async () => {
  const fh = await fakeHarbor(PORT.fakeHarbor);
  const s = await startServer(PORT.harbor, { HARBOR_API_URL: `http://127.0.0.1:${PORT.fakeHarbor}/`, ADMIN_SUMMARY_KEY: ADMIN_KEY });
  const r = await trial(s, {
    name: 'Lead Person', email: 'Lead@Person.com',
    attribution: { utm_source: 'facebook', utm_medium: 'paid', utm_campaign: 'cohort-oct', utm_content: 'ad-3', utm_term: 'schools', fbclid: 'IwAR123', evil: 'drop table', utm_x: 'no', utm_medium_long: 'y', cookie: 'abc' },
  });
  assert.equal(r.status, 201, r.text);
  await waitFor(() => fh.got.length);
  assert.equal(fh.got.length, 1);
  const hit = fh.got[0];
  assert.equal(hit.method, 'POST');
  assert.equal(hit.url, '/api/public/leads');
  assert.equal(hit.headers['x-capture-key'], ADMIN_KEY);
  const body = JSON.parse(hit.body);
  assert.equal(body.product, 'Cohort');
  assert.equal(body.source, 'Trial signup');
  assert.equal(body.notes, '3-day demo trial (demo-request)');
  assert.equal(body.name, 'Lead Person');
  assert.equal(body.email, 'lead@person.com');
  assert.deepEqual(
    { utm_source: body.utm_source, utm_medium: body.utm_medium, utm_campaign: body.utm_campaign, utm_content: body.utm_content, utm_term: body.utm_term, fbclid: body.fbclid },
    { utm_source: 'facebook', utm_medium: 'paid', utm_campaign: 'cohort-oct', utm_content: 'ad-3', utm_term: 'schools', fbclid: 'IwAR123' },
  );
  for (const k of ['evil', 'utm_x', 'utm_medium_long', 'cookie']) assert.equal(body[k], undefined, `${k} não passa`);
  assert.ok(!hit.body.includes(r.json.token), 'token nunca vai ao Harbor');
  assert.ok(!/password|senha|token/i.test(hit.body), 'senha/token nunca vão ao Harbor');
  // voltar no meio do teste não avisa de novo
  assert.equal((await trial(s, { name: 'Lead Person', email: 'lead@person.com' })).status, 200);
  await new Promise((r2) => setTimeout(r2, 300));
  assert.equal(fh.got.length, 1);
  // texto longo da origem é cortado
  const long = await trial(s, { name: 'Long Attr', email: 'long@attr.com', attribution: { utm_source: 'z'.repeat(500), fbclid: 12345 } });
  assert.equal(long.status, 201);
  await waitFor(() => fh.got.length >= 2);
  const body2 = JSON.parse(fh.got[1].body);
  assert.equal(body2.utm_source.length, 120);
  assert.equal(body2.fbclid, undefined, 'só texto');
  assert.ok(!s.logs().includes(ADMIN_KEY), 'a chave nunca aparece no log');
});

test('Harbor fora do ar ou que não responde nunca derruba nem atrasa o cadastro', async () => {
  const down = await startServer(PORT.down, { HARBOR_API_URL: `http://127.0.0.1:${PORT.closed}`, ADMIN_SUMMARY_KEY: ADMIN_KEY });
  const r = await trial(down, { name: 'Down Case', email: 'down@case.com' });
  assert.equal(r.status, 201, r.text);
  assert.equal((await down.call('GET', '/api/inquiries', { token: r.json.token })).status, 200);
  await waitFor(() => /harbor-lead/.test(down.logs()));
  assert.match(down.logs(), /harbor-lead\] could not reach Harbor/);
  assert.ok(!down.logs().includes(ADMIN_KEY));

  const fh = await fakeHarbor(PORT.fakeHang, { hang: true });
  const hang = await startServer(PORT.hang, { HARBOR_API_URL: `http://127.0.0.1:${PORT.fakeHang}`, ADMIN_SUMMARY_KEY: ADMIN_KEY });
  const t0 = Date.now();
  const r2 = await trial(hang, { name: 'Hang Case', email: 'hang@case.com' });
  assert.equal(r2.status, 201, r2.text);
  assert.ok(Date.now() - t0 < 2500, `não esperou o Harbor (${Date.now() - t0} ms)`);
  await waitFor(() => fh.got.length);
  assert.equal(fh.got.length, 1, 'o aviso foi tentado');

  // sem HARBOR_API_URL o cadastro segue normal (o servidor principal roda assim)
  assert.equal((await trial(main, { name: 'No Harbor', email: 'noharbor@case.com' })).status, 201);
});

test('DEMO_TRIAL_DISABLED desliga a rota (instalação com dados reais)', async () => {
  const off = await startServer(PORT.off, { DEMO_TRIAL_DISABLED: 'true' });
  const r = await trial(off, { name: 'Nope', email: 'nope@case.com' });
  assert.equal(r.status, 404);
  assert.equal(r.json.code, 'demo_disabled');
  assert.equal((await dbq(`SELECT COUNT(*)::int n FROM accounts WHERE lower(email) = 'nope@case.com'`))[0].n, 0);
});
