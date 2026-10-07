#!/usr/bin/env node
/* render.js — يرسم فريمات الفيديو من compose.html (محرّك reel-styles).
   node render.js <work> preview 2.4 9.9 31.0        ← فريم لكل ثانية بالقائمة → <work>/prev/tX.XX.jpg
   node render.js <work> range 12.0 18.5             ← يعيد رسم نافذة (بعد تعديل مشهد)
   node render.js <work> all [--force] [--workers 3] ← كل الفيديو؛ بيكمّل من وين وقف (بيتخطّى الفريمات الجاهزة)
   المدخلات من <work>: compose.html · caps.json · vfr/NNNNN.jpg · theme.json? · behind.json? · bt/person/NNNNN.png? · sfx.json? (outro)
   المخرج: <work>/out/NNNNN.jpg (يبدأ من 00000، 30 فريم/ث) */
const fs = require('fs'), path = require('path'), os = require('os'), { pathToFileURL } = require('url');

function loadPuppeteer() {
  const here = path.resolve(__dirname, '..');
  for (const p of [process.env.PUPPETEER_PATH, path.join(here, 'node_modules', 'puppeteer-core'), 'puppeteer-core', 'puppeteer']) {
    if (!p) continue; try { return require(p); } catch (e) { /* التالي */ }
  }
  console.error('❌ puppeteer-core مو مثبّت. شغّل:  cd "' + here + '" && npm install'); process.exit(2);
}
function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const LA = process.env.LOCALAPPDATA || '', PF = process.env.ProgramFiles || 'C:/Program Files', P86 = process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)';
  const c = [PF + '/Google/Chrome/Application/chrome.exe', P86 + '/Google/Chrome/Application/chrome.exe', LA + '/Google/Chrome/Application/chrome.exe',
    PF + '/Microsoft/Edge/Application/msedge.exe', P86 + '/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  for (const p of c) { try { if (fs.existsSync(p)) return p; } catch (e) { /* التالي */ } }
  console.error('❌ ما لقيت Chrome أو Edge. ثبّت واحد منهم، أو حدّد CHROME_PATH.'); process.exit(2);
}

const argv = process.argv.slice(2);
const W = path.resolve(argv[0] || '.') + path.sep, mode = argv[1] || 'all';
const flag = (n, d) => { const i = argv.indexOf(n); return i < 0 ? d : argv[i + 1]; };
const FORCE = argv.includes('--force'), FPS = 30, QUALITY = 0.92;
const WORKERS = Math.max(1, parseInt(flag('--workers', Math.min(3, Math.max(1, os.cpus().length - 1))), 10));
const rd = f => JSON.parse(fs.readFileSync(W + f, 'utf8')), has = f => fs.existsSync(W + f);
if (!has('compose.html') || !has('caps.json')) { console.error('❌ لازم compose.html و caps.json بمجلد المشروع'); process.exit(2); }
const caps = rd('caps.json'), THEME = has('theme.json') ? rd('theme.json') : {}, BEHIND = has('behind.json') ? rd('behind.json') : null;
const OUTRO = has('sfx.json') ? (rd('sfx.json').outro || 0) : 0, DUR = caps.total + OUTRO, N = Math.round(DUR * FPS);
const NVF = fs.existsSync(W + 'vfr') ? fs.readdirSync(W + 'vfr').filter(f => f.endsWith('.jpg')).length : 0;
if (!NVF) { console.error('❌ مجلد vfr فاضي — شغّل prepare.py أول'); process.exit(2); }
const pad = i => String(i).padStart(5, '0');

async function openPage(browser) {
  const p = await browser.newPage();
  await p.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 }); await p.setCacheEnabled(false);
  p.on('pageerror', e => console.error('[compose] PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') console.error('[compose] ' + m.text()); });
  await p.goto(pathToFileURL(W + 'compose.html').href, { waitUntil: 'networkidle0' });
  await p.evaluate((c, t, b) => window.init({ cards: c.cards, total: c.total, theme: t, behind: b }), caps, THEME, BEHIND);
  return p;
}
async function renderFrame(p, i, file, q) {
  const t = i / FPS, idx = Math.min(NVF, Math.max(1, Math.round(t * FPS) + 1)), id = pad(idx);
  await p.evaluate(s => window.setFrame(s), pathToFileURL(W + 'vfr/' + id + '.jpg').href);
  const pf = W + 'bt/person/' + id + '.png', inR = BEHIND && (BEHIND.ranges || []).some(r => idx >= r[0] && idx <= r[1]);
  await p.evaluate(s => window.setPerson(s), inR && fs.existsSync(pf) ? pathToFileURL(pf).href : null);
  const d = await p.evaluate((tt, qq) => { window.draw(tt); return window.shot(qq); }, t, q);
  fs.writeFileSync(file, Buffer.from(d.split(',')[1], 'base64'));
}

(async () => {
  const pup = loadPuppeteer();
  const browser = await pup.launch({ executablePath: findChrome(), headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files', '--font-render-hinting=none', '--force-color-profile=srgb'] });
  try {
    if (mode === 'preview') {
      const times = argv.slice(2).filter(x => !x.startsWith('--')).map(Number).filter(x => !isNaN(x));
      fs.mkdirSync(W + 'prev', { recursive: true }); const p = await openPage(browser);
      for (const t of times) { await renderFrame(p, Math.round(t * FPS), W + 'prev/t' + t.toFixed(2) + '.jpg', 0.9); console.log('معاينة ' + t); }
      return;
    }
    let from = 0, to = N - 1, force = FORCE;
    if (mode === 'range') { from = Math.max(0, Math.floor(parseFloat(argv[2]) * FPS)); to = Math.min(N - 1, Math.ceil(parseFloat(argv[3]) * FPS)); force = true; }
    fs.mkdirSync(W + 'out', { recursive: true });
    const todo = []; for (let i = from; i <= to; i++) if (force || !fs.existsSync(W + 'out/' + pad(i) + '.jpg')) todo.push(i);
    let done = 0; const pages = []; for (let k = 0; k < Math.min(WORKERS, Math.max(1, todo.length)); k++) pages.push(await openPage(browser));
    await Promise.all(pages.map(async (p, k) => { for (let j = k; j < todo.length; j += pages.length) {
      const i = todo[j]; await renderFrame(p, i, W + 'out/' + pad(i) + '.jpg', QUALITY); done++;
      if (done % 100 === 0) console.log('فريم ' + done + ' / ' + todo.length); } }));
    console.log('تم ' + done + ' فريم مرسوم من ' + N + ' — المدة ' + DUR.toFixed(3));
  } finally { await browser.close(); }
})().catch(e => { console.error('❌ ' + (e && e.stack || e)); process.exit(1); });
