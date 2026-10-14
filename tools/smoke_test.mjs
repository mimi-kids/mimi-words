// Dev-only smoke test (not shipped): serves the app on 127.0.0.1, drives headless Chrome over the
// DevTools protocol (Node 22 built-in WebSocket, no npm), checks the main flows and offline mode.
// Usage: node tools/smoke_test.mjs [screenshot-dir]
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = process.argv[2] || null;
const PORT = 8765, DEBUG = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${detail}`); };

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const profile = mkdtempSync(join(tmpdir(), 'mimi-chrome-'));
const chrome = spawn('google-chrome', ['--headless=new', `--remote-debugging-port=${DEBUG}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--window-size=412,915', 'about:blank'], { stdio: 'ignore' });

let ws, nextId = 1;
const pending = new Map();
async function cdp(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
async function evaluate(expr) {
  const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + expr);
  return r.result.value;
}
async function waitFor(expr, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await evaluate(expr).catch(() => false)) return true; await sleep(150); }
  return false;
}
async function shot(name) {
  if (!SHOTS) return;
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(SHOTS, name + '.png'), Buffer.from(r.data, 'base64'));
}

try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${DEBUG}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    }
  });
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
  await cdp('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });

  check('home shows 6 categories', await waitFor("document.querySelectorAll('#view .tile').length === 6"));
  await sleep(300); await shot('1-home');

  await evaluate("document.querySelector('#view .tile').click()");
  check('animals grid shows 25 pictures', await waitFor("document.querySelectorAll('#view .tile').length === 25"));
  check('back button visible', await evaluate("!document.getElementById('back').hidden"));
  await sleep(300); await shot('2-animals');

  await evaluate("document.querySelector('#view .tile').click()");
  check('card opens with English word', await waitFor("!document.getElementById('card').hidden && document.getElementById('card-word').textContent === 'cat'"));
  check('Thai helper shown', await evaluate("document.getElementById('card-th').textContent.includes('แมว')"));
  await evaluate("document.querySelector('.lang[data-lang=zh]').click()");
  check('Chinese word + tone-marked pinyin', await waitFor("document.getElementById('card-word').textContent === '猫' && document.getElementById('card-pinyin').textContent === 'māo'"));
  await sleep(300); await shot('3-card-zh');
  await evaluate("document.getElementById('next').click()");
  check('next goes to dog', await waitFor("document.getElementById('card-word').textContent === '狗'"));
  await evaluate("document.getElementById('card-close').click()");
  check('stars on seen pictures', await waitFor("document.querySelectorAll('#view .tile .star').length === 2"));
  const saved = await evaluate("JSON.parse(localStorage.getItem('lingolite.v2'))");
  check('progress saved per language', saved.lang === 'zh' && saved.progress.zh['animal-cat'].seen >= 1 && saved.progress.en['animal-cat'].seen >= 1);

  // ---- quiz: picture + 4 word buttons (Chinese now)
  const correctId = "fetch('data/words.json').then(r => r.json()).then(d => d.words.find(w => w.icon === new URL(document.querySelector('.stage img').src).pathname.slice(1)).id)";
  await evaluate("document.querySelectorAll('.modes .mode')[1].click()");
  check('quiz shows picture + 4 word options', await waitFor("document.querySelectorAll('.opt').length === 4 && !!document.querySelector('.stage img') && document.querySelector('.progress').textContent === '1 / 10'"));
  const id1 = await evaluate(correctId);
  await evaluate(`document.querySelector('.opt[data-id="${id1}"]').click()`);
  check('right answer turns green', await evaluate(`document.querySelector('.opt[data-id="${id1}"]').classList.contains('right')`));
  await sleep(300); await shot('5-quiz-right');
  check('next question after a right answer', await waitFor("document.querySelector('.progress') && document.querySelector('.progress').textContent === '2 / 10'", 4000));
  const id2 = await evaluate(correctId);
  await evaluate(`[...document.querySelectorAll('.opt')].find(b => b.dataset.id !== '${id2}').click()`);
  check('wrong answer shakes and shows the right one', await evaluate(`!!document.querySelector('.opt.wrong.shake') && document.querySelector('.opt[data-id="${id2}"]').classList.contains('right')`));
  await sleep(200); await shot('6-quiz-wrong');

  // ---- listen: 🔊 + 4 pictures
  await evaluate("document.querySelectorAll('.modes .mode')[2].click()");
  check('listen shows replay button + 4 picture options', await waitFor("!!document.querySelector('.stage .listen') && document.querySelectorAll('.opt.picopt img').length === 4"));
  const pics = await evaluate("[...document.querySelectorAll('.opt.picopt img')].map(i => i.src)");
  check('listen options are 4 different pictures', new Set(pics).size === 4);
  await sleep(300); await shot('7-listen');

  // ---- home: streak + review tile running Quiz over the queue
  await evaluate("document.getElementById('back').click()");
  await evaluate("document.getElementById('back').click()");
  check('home shows streak 1', await waitFor("document.querySelector('.streak') && document.querySelector('.streak').textContent === '🔥 1'"));
  check('review tile enabled', await evaluate("!document.querySelector('.review').disabled"));
  const saved2 = await evaluate("JSON.parse(localStorage.getItem('lingolite.v2'))");
  const missed = Object.entries(saved2.progress.zh).filter(([, e]) => e.wrong > 0).map(([k]) => k);
  check('wrong answer recorded', missed.length === 1, JSON.stringify(missed));
  await sleep(200); await shot('8-home-review');
  await evaluate("document.querySelector('.review').click()");
  check('review round starts with the missed word', await waitFor("document.querySelectorAll('.opt').length === 4 && !document.querySelector('.modes')"));
  check('review first question = most-missed word', (await evaluate(correctId)) === missed[0]);
  await evaluate("document.getElementById('back').click()");

  // ---- pinyin with ü: which font actually renders it (CSS.getPlatformFontsForNode)
  await evaluate("document.querySelectorAll('#view .tile')[3].click()");
  await waitFor("document.querySelectorAll('#view .tile').length === 10");
  await evaluate("document.querySelectorAll('#view .tile')[2].click()");
  check('green card shows lǜsè', await waitFor("document.getElementById('card-pinyin').textContent === 'lǜsè'"));
  check('color pictures are inline circles', await evaluate("document.getElementById('card-img').src.startsWith('data:image/svg+xml,')"));
  await cdp('DOM.enable'); await cdp('CSS.enable');
  const doc = await cdp('DOM.getDocument', { depth: 0 });
  const node = await cdp('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#card-pinyin' });
  const fonts = (await cdp('CSS.getPlatformFontsForNode', { nodeId: node.nodeId })).fonts;
  const fontText = fonts.map((f) => `${f.familyName} (${f.glyphCount} glyphs)`).join(', ');
  check('pinyin ü rendered by one font, no fallback', fonts.length === 1, `(${fontText})`);
  await sleep(200); await shot('9-green-pinyin');
  await evaluate("document.getElementById('card-close').click()");
  await evaluate("document.getElementById('back').click()");

  // ---- settings (parent-facing): gear on home, 3 voice dropdowns, rate slider, reset
  await waitFor("!!document.querySelector('.gear')");
  await evaluate("document.querySelector('.gear').click()");
  check('settings: 3 voice dropdowns + test buttons', await waitFor("document.querySelectorAll('.settings select').length === 3 && document.querySelectorAll('.settings .set-row .pill').length === 3"));
  // expected text per language follows audio/manifest.json: "เสียง: ไฟล์ (n)" when it lists n clips, else "เสียง: TTS"
  const srcOk = await evaluate(`fetch('audio/manifest.json').then(r => r.ok ? r.json() : {clips: []}).then(m => ['en','zh','th'].every(l => {
    const n = (m.clips || []).filter(c => c.lang === l).length;
    return document.getElementById('audio-source-' + l).textContent === (n ? 'เสียง: ไฟล์ (' + n + ')' : 'เสียง: TTS');
  }))`);
  check('settings: audio source per language matches the manifest', srcOk);
  check('a pre-generated clip is served (audio/th/animal-cat.mp3)', await evaluate("fetch('audio/th/animal-cat.mp3').then(r => r.ok && r.headers.get('content-length') !== '0')"));
  check('settings: rate slider 0.5-1.0, default 0.75', await evaluate("(() => { const r = document.getElementById('rate'); return r.min === '0.5' && r.max === '1' && Number(r.value) === 0.75; })()"));
  await evaluate("(() => { const r = document.getElementById('rate'); r.value = '0.6'; r.dispatchEvent(new Event('input')); })()");
  check('settings saved in localStorage', await evaluate("JSON.parse(localStorage.getItem('mimi.settings.v1')).rate === 0.6"));
  await evaluate("document.getElementById('settings-reset').click()");
  check('settings reset restores 0.75', await waitFor("Number(document.getElementById('rate').value) === 0.75 && JSON.parse(localStorage.getItem('mimi.settings.v1')).rate === 0.75"));
  const voiceList = await evaluate("document.getElementById('voice-list').textContent");
  const voiceCount = await evaluate("speechSynthesis.getVoices().length");
  console.log('VOICES (headless desktop): count=' + voiceCount + ' | ' + voiceList.replace(/\n/g, ' ; '));
  await sleep(200); await shot('10-settings');
  await evaluate("document.getElementById('back').click()");

  // ---- Thai learning mode
  await evaluate("document.querySelector('.lang[data-lang=th]').click()");
  check('Thai mode selected; selector label is "Thai"', await waitFor("(() => { const b = document.querySelector('.lang[aria-checked=true]'); return b && b.dataset.lang === 'th' && b.textContent === 'Thai'; })()"));
  check('heading in Thai mode reads "Thai" (Latin letters)', await evaluate("document.querySelector('.lang[data-lang=th]').textContent === 'Thai'"));
  await evaluate("document.querySelector('#view .tile').click()");
  await waitFor("document.querySelectorAll('#view .tile').length === 25");
  await evaluate("document.querySelector('#view .tile').click()");
  check('Thai card: Thai word large, English helper small, no Thai helper button', await waitFor("document.getElementById('card-word').textContent === 'แมว' && document.getElementById('card-pinyin').textContent === 'cat' && document.getElementById('card-th').hidden"));
  await sleep(200); await shot('11-thai-card');
  await evaluate("document.getElementById('card-close').click()");
  await evaluate("document.querySelectorAll('.modes .mode')[1].click()");
  check('Thai quiz: 4 distinct Thai options', await waitFor("(() => { const t = [...document.querySelectorAll('.opt .opt-word')].map(e => e.textContent); return t.length === 4 && new Set(t).size === 4 && t.every(x => /^[\u0e00-\u0e7f ]+$/.test(x)); })()"));
  await sleep(200); await shot('12-thai-quiz');
  const saved3 = await evaluate("JSON.parse(localStorage.getItem('lingolite.v2'))");
  check('progress keyed per language (th has the cat, en/zh kept)', saved3.lang === 'th' && saved3.progress.th['animal-cat'].seen >= 1 && saved3.progress.zh['animal-cat'].seen >= 1 && saved3.progress.en['animal-cat'].seen >= 1);
  await evaluate("document.getElementById('back').click()");
  await evaluate("document.getElementById('back').click()");

  check('service worker active', await waitFor("navigator.serviceWorker.ready.then(r => !!r.active)", 15000));
  const cached = await evaluate("caches.open('mimi-v11').then(c => c.keys()).then(k => k.length)");
  check('precache has shell + 90 picture files (colors are inline)', cached >= 100, `(${cached} entries)`);

  await cdp('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await cdp('Page.reload', { ignoreCache: false });
  check('offline reload still shows home', await waitFor("document.querySelectorAll('#view .tile').length === 6"));
  const lastIcon = await evaluate("fetch('pictures/twemoji/2602.svg').then(r => r.ok)");
  check('offline picture served from cache', lastIcon === true);
  await shot('4-offline-home');
} catch (e) {
  check('smoke test ran', false, String(e));
} finally {
  try { ws && ws.close(); } catch {}
  chrome.kill(); server.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `SMOKE FAIL (${failed})` : `SMOKE PASS (${results.length} checks)`);
process.exit(failed ? 1 : 0);
