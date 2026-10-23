// Browser check of the 3-day free trial: login button, short form, entry, fixed countdown banner, a blocked action
// (message in the chosen language), no side scroll at 390 px, trial over -> back to login, and the ad origin reaching Harbor.
// Needs: client built (npm run build), local Postgres, Playwright. Uses only ports 7831 (app) and 7832 (fake Harbor).
//   node e2e/trial.e2e.mjs        (screenshots go to $E2E_SHOTS or ./e2e/shots)
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(here, '..', 'server', 'src');
const SHOTS = process.env.E2E_SHOTS || path.join(here, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const PRODUCT = 'cohort';
const OWNER_EMAIL = 'owner@example.com';
const OWNER_PASS = 'E2e-owner-pass-1';
const ADMIN_KEY = 'e2e-admin-key-e2e-admin-key-0123456789';
const APP_PORT = 7831;
const HARBOR_PORT = 7832;
const SELO_PORT = 7833; // segundo servidor, no plano Essential, só para o selo de plano
const ADMIN_URL = process.env.TEST_PG_ADMIN_URL || 'postgres://test:test@127.0.0.1:5432/postgres';
const DB = `cohort_trial_e2e_${process.pid}`;
const DB_URL = ADMIN_URL.replace(/\/[^/]*$/, `/${DB}`);

let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

// Harbor de mentira: guarda o que o produto manda.
const harborGot = [];
const harbor = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => { harborGot.push({ headers: req.headers, body: body ? JSON.parse(body) : null }); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}'); });
});
await new Promise((r) => harbor.listen(HARBOR_PORT, '127.0.0.1', r));

const admin = new pg.Client({ connectionString: ADMIN_URL });
await admin.connect();
await admin.query(`CREATE DATABASE ${DB}`);
const seed = spawnSync('node', [path.join(SERVER, 'seed.js')], { env: { ...process.env, DATABASE_URL: DB_URL }, encoding: 'utf8' });
if (seed.status !== 0) { console.error(seed.stderr); process.exit(1); }
const srv = spawn('node', [path.join(SERVER, 'index.js')], {
  env: { ...process.env, NODE_ENV: 'test', PORT: String(APP_PORT), DATABASE_URL: DB_URL, JWT_SECRET: 'e2e-secret-e2e-secret-1234',
    BOOTSTRAP_OWNER_EMAIL: OWNER_EMAIL, BOOTSTRAP_OWNER_PASSWORD: OWNER_PASS, SMTP_HOST: '',
    HARBOR_API_URL: `http://127.0.0.1:${HARBOR_PORT}`, ADMIN_SUMMARY_KEY: ADMIN_KEY },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
srv.stdout.on('data', (d) => { serverLog += d; });
srv.stderr.on('data', (d) => { serverLog += d; });
const base = `http://127.0.0.1:${APP_PORT}`;
for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/api/health')).ok) break; } catch { /* wait */ } await new Promise((r) => setTimeout(r, 150)); }

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const noHScroll = (page) => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, bw: document.body.scrollWidth }));

const TEXT = {
  en: { lead: 'Just exploring?', cta: 'Try it free for 3 days', banner: /Free trial: ends /, blocked: 'Not available in the free trial', ended: /Your free trial has ended/, start: 'Start my trial' },
  pt: { lead: 'Só conhecendo?', cta: 'Teste grátis de 3 dias', banner: /Teste grátis: termina em /, blocked: 'Não disponível no teste grátis', ended: /Seu teste grátis terminou/, start: 'Começar meu teste' },
};

async function run(label, lang, ctxOpts, email, utm) {
  // one made-up address per run (the server trusts the first proxy), so the per-address limit of one run never touches another
  const ctx = await browser.newContext({ ...ctxOpts, locale: lang === 'pt' ? 'pt-BR' : 'en-US', extraHTTPHeaders: { 'X-Forwarded-For': `10.50.0.${utm.length}${label.length}` } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const tag = `[${label}]`;
  const X = TEXT[lang];

  // ---- login: the trial button, with the ad origin in the URL ----
  await page.goto(`${base}/?utm_source=${utm}&utm_medium=paid&utm_campaign=cohort-oct&fbclid=FB-${utm}#/`);
  await page.waitForSelector('input[type=email]');
  await page.selectOption('select[aria-label]', lang);
  const open = page.locator('[data-testid=trial-open]');
  check(`${tag} login: trial link visible in ${lang}`, (await open.count()) === 1 && (await open.innerText()).includes(X.cta), await open.innerText());
  let m = await noHScroll(page);
  check(`${tag} login: no horizontal scroll`, m.sw <= m.iw && m.bw <= m.iw, `scrollWidth=${m.sw} inner=${m.iw}`);
  await open.click();
  await page.waitForSelector('[data-testid=trial-form]');
  check(`${tag} trial form: name + e-mail, no password field`, (await page.locator('[data-testid=trial-form] input').count()) === 2 && (await page.locator('input[type=password]').count()) === 0);
  m = await noHScroll(page);
  check(`${tag} trial form: no horizontal scroll`, m.sw <= m.iw && m.bw <= m.iw, `scrollWidth=${m.sw}`);
  await page.screenshot({ path: path.join(SHOTS, `${PRODUCT}-trial-form-${label}.png`) });
  check(`${tag} trial form: button text in ${lang}`, (await page.locator('[data-testid=trial-submit]').innerText()) === X.start);

  // an e-mail that belongs to a real account: friendly error, still on the form
  await page.fill('input[name=trial-name]', 'Impostor');
  await page.fill('input[name=trial-email]', OWNER_EMAIL);
  await page.click('[data-testid=trial-submit]');
  await page.waitForSelector('[role=alert]');
  check(`${tag} trial form: real account e-mail -> friendly error`, (await page.locator('[role=alert]').innerText()).length > 5 && (await page.locator('[data-testid=trial-form]').count()) === 1);

  // ---- start the trial: straight in ----
  await page.fill('input[name=trial-name]', 'Pat Prospect');
  await page.fill('input[name=trial-email]', email);
  await page.click('[data-testid=trial-submit]');
  await page.waitForSelector('[data-testid=signout]', { state: 'attached' });
  await page.waitForSelector('[data-testid=trial-banner]');
  const bannerText = await page.locator('[data-testid=trial-banner-text]').innerText();
  check(`${tag} banner: shows when the trial ends (${lang})`, X.banner.test(bannerText), bannerText);
  check(`${tag} banner: subscribe link goes to Impact Digital support`, ((await page.locator('[data-testid=trial-subscribe]').getAttribute('href')) || '').startsWith('mailto:support@impactdigital.network'));
  check(`${tag} logged in: sample data visible`, /Ashford|Dashboard/.test(await page.locator('body').innerText()));
  await page.screenshot({ path: path.join(SHOTS, `${PRODUCT}-trial-home-${label}.png`) });

  // banner stays fixed (outside the scrolling area) and nothing scrolls sideways
  for (const route of ['/', '/families', '/settings', '/pipeline']) {
    await page.goto(`${base}/#${route}`);
    await page.waitForTimeout(600);
    m = await noHScroll(page);
    check(`${tag} trial ${route}: no horizontal scroll`, m.sw <= m.iw && m.bw <= m.iw, `scrollWidth=${m.sw} inner=${m.iw}`);
    const pos = await page.evaluate(() => { const r = document.querySelector('[data-testid=trial-banner]').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, ih: innerHeight }; });
    check(`${tag} trial ${route}: banner on screen`, pos.top >= 0 && pos.bottom <= pos.ih, JSON.stringify(pos));
  }
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(200);
  const afterScroll = await page.evaluate(() => document.querySelector('[data-testid=trial-banner]').getBoundingClientRect().top);
  check(`${tag} banner stays put after scrolling`, afterScroll >= 0 && afterScroll < 80, `top=${afterScroll}`);

  // ---- a blocked action: the photo button (AI) shows the message at once ----
  await page.goto(`${base}/#/families`);
  await page.waitForSelector('[data-testid=photo-import-open]');
  await page.click('[data-testid=photo-import-open]');
  await page.waitForSelector('[data-testid=demo-blocked-toast]');
  check(`${tag} blocked (photo import): message in ${lang}`, (await page.locator('[data-testid=demo-blocked-toast]').innerText()).includes(X.blocked));
  check(`${tag} blocked (photo import): no window opened`, (await page.locator('[data-testid=photo-import-open]').count()) === 1 && (await page.locator('text=/Take photo|Tirar foto/').count()) === 0);
  m = await noHScroll(page);
  check(`${tag} toast: no horizontal scroll`, m.sw <= m.iw, `scrollWidth=${m.sw}`);
  await page.screenshot({ path: path.join(SHOTS, `${PRODUCT}-trial-blocked-${label}.png`) });

  // ---- a blocked action that goes to the server: connect WhatsApp (an integration) ----
  await page.goto(`${base}/#/settings`);
  await page.waitForSelector('text=Integrations');
  await page.locator('button:has-text("Connect")').first().click();
  await page.waitForSelector('form input');
  const modalInputs = page.locator('form:has-text("Phone Number ID") input');
  await modalInputs.nth(0).fill('123456789');
  await modalInputs.nth(1).fill('EAAB-not-a-real-token');
  await page.locator('form:has-text("Phone Number ID") button[type=submit]').click();
  await page.waitForSelector('[data-testid=demo-blocked-toast]');
  check(`${tag} blocked (server 403): toast in ${lang}`, (await page.locator('[data-testid=demo-blocked-toast]').innerText()).includes(X.blocked));
  check(`${tag} blocked (server 403): the form shows the same message`, (await page.locator('form:has-text("Phone Number ID")').innerText()).includes(X.blocked));
  // nothing was saved
  const dbw = new pg.Client({ connectionString: DB_URL });
  await dbw.connect();
  const saved = (await dbw.query(`SELECT COUNT(*)::int n FROM whatsapp_connection`)).rows[0].n;
  await dbw.end();
  check(`${tag} blocked (server 403): nothing was saved`, saved === 0, `rows=${saved}`);
  // the trial login shows no "change password" block
  check(`${tag} settings: no change-password form for a trial login`, (await page.locator('input[name=current-password]').count()) === 0);

  // ---- survives a reload; then the 3 days are up ----
  await page.reload();
  await page.waitForSelector('[data-testid=trial-banner]');
  check(`${tag} session survives reload`, true);
  const dbc = new pg.Client({ connectionString: DB_URL });
  await dbc.connect();
  await dbc.query(`UPDATE accounts SET demo_expires_at = now() - interval '1 minute' WHERE lower(email) = $1`, [email]);
  await dbc.end();
  await page.reload();
  await page.waitForSelector('[data-testid=trial-ended]');
  check(`${tag} trial over: back to login with a clear message (${lang})`, X.ended.test(await page.locator('[data-testid=trial-ended]').innerText()) && (await page.locator('input[type=email]').count()) >= 1);
  m = await noHScroll(page);
  check(`${tag} trial over: no horizontal scroll`, m.sw <= m.iw && m.bw <= m.iw, `scrollWidth=${m.sw}`);
  await page.screenshot({ path: path.join(SHOTS, `${PRODUCT}-trial-ended-${label}.png`) });
  await page.reload();
  await page.waitForSelector('input[type=email]');
  check(`${tag} trial over: message shown only once`, (await page.locator('[data-testid=trial-ended]').count()) === 0);

  // ---- a real login never sees the banner ----
  await page.fill('input[type=email]', OWNER_EMAIL);
  await page.fill('input[name=password]', OWNER_PASS);
  await page.click('button[type=submit]');
  await page.waitForSelector('[data-testid=signout]', { state: 'attached' });
  check(`${tag} real login: no trial banner`, (await page.locator('[data-testid=trial-banner]').count()) === 0);

  check(`${tag} no uncaught page errors`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}

try {
  await run('390-en', 'en', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'pat.mobile@prospect.test', 'fbmobile');
  await run('1440-pt', 'pt', { viewport: { width: 1440, height: 900 } }, 'pat.desktop@prospect.test', 'fbdesktop');
  await run('390-pt', 'pt', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'pat.mobilept@prospect.test', 'fbmobilept');
  await run('1440-en', 'en', { viewport: { width: 1440, height: 900 } }, 'pat.desktopen@prospect.test', 'fbdesktopen');

  // the ad origin travelled from the URL, through the form, to Harbor
  await new Promise((r) => setTimeout(r, 300));
  check('harbor: one notice per trial started', harborGot.length === 4, `got ${harborGot.length}`);
  for (const [u, em] of [['fbmobile', 'pat.mobile@prospect.test'], ['fbdesktop', 'pat.desktop@prospect.test']]) {
    const hit = harborGot.find((h) => h.body?.email === em);
    check(`harbor: ${u} notice has the right key, product, source, notes and ad origin`,
      !!hit && hit.headers['x-capture-key'] === ADMIN_KEY && hit.body.product === 'Cohort' && hit.body.source === 'Trial signup'
      && hit.body.notes === '3-day demo trial (demo-request)' && hit.body.utm_source === u && hit.body.utm_medium === 'paid'
      && hit.body.utm_campaign === 'cohort-oct' && hit.body.fbclid === `FB-${u}`, JSON.stringify(hit?.body));
  }
  // plan badge ("selo") + trial: same database, but a second server on the Essential plan; the trial login must see the
  // menu badges, no platform-owner selector, and a locked feature opens the plan window instead of breaking
  const srv2 = spawn('node', [path.join(SERVER, 'index.js')], {
    env: { ...process.env, NODE_ENV: 'test', PORT: String(SELO_PORT), DATABASE_URL: DB_URL, JWT_SECRET: 'e2e-secret-e2e-secret-1234',
      BOOTSTRAP_OWNER_EMAIL: OWNER_EMAIL, BOOTSTRAP_OWNER_PASSWORD: OWNER_PASS, SMTP_HOST: '', LICENSED_PLAN: 'basico', DEMO_TRIAL_DISABLED: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const base2 = `http://127.0.0.1:${SELO_PORT}`;
    for (let i = 0; i < 100; i++) { try { if ((await fetch(base2 + '/api/health')).ok) break; } catch { /* wait */ } await new Promise((r) => setTimeout(r, 150)); }
    for (const [label, opts] of [['1440', { viewport: { width: 1440, height: 900 } }], ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
      const ctx = await browser.newContext({ ...opts, locale: 'en-US', extraHTTPHeaders: { 'X-Forwarded-For': `10.60.0.${label.length}${label[0]}` } });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${base2}/#/`);
      await page.waitForSelector('[data-testid=trial-open]');
      await page.click('[data-testid=trial-open]');
      await page.fill('input[name=trial-name]', 'Pat Selo');
      await page.fill('input[name=trial-email]', `pat.selo${label}@prospect.test`);
      await page.click('[data-testid=trial-submit]');
      await page.waitForSelector('[data-testid=trial-banner]');
      await page.waitForSelector('aside nav [data-plan-badge]', { state: 'attached', timeout: 8000 });
      const badges = await page.$$eval('aside nav [data-plan-badge]', (els) => els.map((e) => e.dataset.planBadge));
      check(`[selo-${label}] menu shows plan badges for a trial login on the Essential plan`, badges.length >= 5 && badges.every((b) => ['essencial', 'completo'].includes(b)), badges.join(','));
      check(`[selo-${label}] no platform-owner preview selector for a trial login`, (await page.locator('[data-testid="plan-preview-slot"]').count()) === 0);
      const mm = await noHScroll(page);
      check(`[selo-${label}] no horizontal scroll with banner + badges`, mm.sw <= mm.iw && mm.bw <= mm.iw, `scrollWidth=${mm.sw}`);
      await page.goto(`${base2}/#/interviews`);
      await page.waitForTimeout(800);
      const txt = await page.locator('body').innerText();
      check(`[selo-${label}] locked screen shows the friendly plan card, not an error`, /Professional/.test(txt) && !/Request failed|Something went wrong/i.test(txt));
      await page.screenshot({ path: path.join(SHOTS, `${PRODUCT}-trial-selo-${label}.png`) });
      check(`[selo-${label}] no uncaught page errors`, errors.length === 0, errors.join(' | '));
      await ctx.close();
    }
  } finally { srv2.kill('SIGTERM'); }
} catch (e) {
  console.error(e);
  failures++;
} finally {
  await browser.close();
  srv.kill('SIGTERM');
  harbor.close();
  await new Promise((r) => setTimeout(r, 300));
  await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await admin.end();
}
if (serverLog.includes(ADMIN_KEY) || serverLog.includes(OWNER_PASS)) { console.log('FAIL  a secret appeared in the server log'); failures++; }
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
