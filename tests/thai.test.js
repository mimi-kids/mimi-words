const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');
const { memoryStorage } = require('./helpers.js');

test('three learning languages en / zh / th', () => {
  assert.deepEqual(L.LANGS, ['en', 'zh', 'th']);
  const w = { en: 'cat', zh: '猫', th: 'แมว' };
  assert.equal(L.labelOf(w, 'en'), 'cat');
  assert.equal(L.labelOf(w, 'zh'), '猫');
  assert.equal(L.labelOf(w, 'th'), 'แมว');
});

test('progress and streak are keyed per language (en / zh / th)', () => {
  const s = L.emptyState();
  L.recordAnswer(s, 'th', 'animal-cat', false, Date.UTC(2026, 9, 14, 3));
  assert.equal(s.progress.th['animal-cat'].wrong, 1);
  assert.equal(s.progress.en['animal-cat'], undefined);
  assert.equal(s.progress.zh['animal-cat'], undefined);
  assert.equal(s.streak.th.count, 1);
  assert.equal(s.streak.en.count, 0);
});

test('Thai can be the saved language', () => {
  const store = memoryStorage();
  const s = L.emptyState();
  s.lang = 'th';
  L.saveState(store, s);
  assert.equal(L.loadState(store).lang, 'th');
});

test('existing en/zh progress (saved before Thai existed) survives; Thai starts empty', () => {
  const store = memoryStorage();
  const before = {
    lang: 'zh',
    progress: { en: { 'animal-cat': { seen: 3, correct: 2, wrong: 1, last: 5 } }, zh: { 'animal-dog': { seen: 1, correct: 0, wrong: 1, last: 6 } } },
    streak: { en: { count: 2, lastDay: '2026-10-13' }, zh: { count: 1, lastDay: '2026-10-14' } },
  };
  store.setItem(L.STORE_KEY, JSON.stringify(before));
  const s = L.loadState(store);
  assert.equal(s.lang, 'zh');
  assert.deepEqual(s.progress.en, before.progress.en);
  assert.deepEqual(s.progress.zh, before.progress.zh);
  assert.deepEqual(s.streak.en, before.streak.en);
  assert.deepEqual(s.progress.th, {});
  assert.deepEqual(s.streak.th, { count: 0, lastDay: null });
});
