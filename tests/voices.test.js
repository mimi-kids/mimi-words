const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');
const { memoryStorage } = require('./helpers.js');

const v = (name, lang, uri = name) => ({ name, lang, voiceURI: uri, localService: true });
const pick = (list, lang, saved) => (L.chooseVoice(list, lang, saved) || {}).name;

test('speech constants: rate 0.75, pitch 1.1, volume 1.0, one place', () => {
  assert.equal(L.SPEECH.rate, 0.75);
  assert.equal(L.SPEECH.pitch, 1.1);
  assert.equal(L.SPEECH.volume, 1.0);
});

test('empty or missing voice list -> undefined (browser default voice, never silent)', () => {
  for (const lang of ['en', 'zh', 'th']) {
    assert.equal(L.chooseVoice([], lang, null), undefined);
    assert.equal(L.chooseVoice(undefined, lang, null), undefined);
  }
});

test('en: name preference order, then en-US, then any en-*', () => {
  const all = [v('Daniel', 'en-GB'), v('Fred', 'en-US'), v('Microsoft Aria Online', 'en-US'), v('Samantha', 'en-US'), v('Google US English', 'en-US')];
  assert.equal(pick(all, 'en'), 'Google US English');
  assert.equal(pick(all.slice(0, 4), 'en'), 'Samantha');
  assert.equal(pick(all.slice(0, 3), 'en'), 'Microsoft Aria Online');
  assert.equal(pick(all.slice(0, 2), 'en'), 'Fred');
  assert.equal(pick([v('Daniel', 'en-GB')], 'en'), 'Daniel');
  assert.equal(pick([v('Thomas', 'fr-FR')], 'en'), undefined);
});

test('zh: Google 普通话 > Ting-Ting > Tingting > Microsoft Xiaoxiao > zh-CN > zh-*', () => {
  const all = [v('Sin-ji', 'zh-HK'), v('Kangkang', 'zh-CN'), v('Microsoft Xiaoxiao Online', 'zh_CN'), v('Tingting', 'zh-CN'), v('Ting-Ting', 'zh-CN'), v('Google 普通话（中国大陆）', 'zh-CN')];
  assert.equal(pick(all, 'zh'), 'Google 普通话（中国大陆）');
  assert.equal(pick(all.slice(0, 5), 'zh'), 'Ting-Ting');
  assert.equal(pick(all.slice(0, 4), 'zh'), 'Tingting');
  assert.equal(pick(all.slice(0, 3), 'zh'), 'Microsoft Xiaoxiao Online');
  assert.equal(pick(all.slice(0, 2), 'zh'), 'Kangkang');
  assert.equal(pick(all.slice(0, 1), 'zh'), 'Sin-ji');
});

test('th: Google ไทย > Kanya > Microsoft Premwadee > th-TH; no other fallback', () => {
  const all = [v('Narisa', 'th-TH'), v('Microsoft Premwadee Online', 'th-TH'), v('Kanya', 'th-TH'), v('Google ไทย', 'th-TH')];
  assert.equal(pick(all, 'th'), 'Google ไทย');
  assert.equal(pick(all.slice(0, 3), 'th'), 'Kanya');
  assert.equal(pick(all.slice(0, 2), 'th'), 'Microsoft Premwadee Online');
  assert.equal(pick(all.slice(0, 1), 'th'), 'Narisa');
  assert.equal(pick([v('Samantha', 'en-US')], 'th'), undefined);
});

test('a preferred name in another language is never chosen', () => {
  assert.equal(pick([v('Google US English', 'en-US'), v('Fred', 'en-US')], 'zh'), undefined);
});

test("the parent's saved voice wins when it exists for that language; otherwise automatic", () => {
  const all = [v('Google US English', 'en-US'), v('Fred', 'en-US', 'uri-fred')];
  assert.equal(pick(all, 'en', 'uri-fred'), 'Fred');
  assert.equal(pick(all, 'en', 'uri-gone'), 'Google US English');
  assert.equal(pick([v('Kanya', 'th-TH', 'uri-kanya')], 'en', 'uri-kanya'), undefined);
});

test('settings persist with a mocked storage; bad values fall back to defaults', () => {
  const store = memoryStorage();
  assert.deepEqual(L.loadSettings(store), L.defaultSettings());
  const s = L.defaultSettings();
  s.rate = 0.6; s.voices.zh = 'uri-tingting';
  assert.equal(L.saveSettings(store, s), true);
  assert.deepEqual(L.loadSettings(store), s);
  store.setItem(L.SETTINGS_KEY, JSON.stringify({ rate: 3, voices: { en: 5 } }));
  assert.deepEqual(L.loadSettings(store), L.defaultSettings());
});
