const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');
const { memoryStorage } = require('./helpers.js');

test('save + load round trip with a mocked storage', () => {
  const store = memoryStorage();
  const s = L.emptyState();
  s.lang = 'zh';
  L.recordAnswer(s, 'zh', 'animal-cat', false, Date.UTC(2026, 9, 14, 3));
  L.recordSeen(s, 'en', 'food-apple', Date.UTC(2026, 9, 14, 4));
  assert.equal(L.saveState(store, s), true);
  const back = L.loadState(store);
  assert.deepEqual(back, s);
  assert.equal(back.progress.zh['animal-cat'].wrong, 1);
  assert.equal(back.progress.en['animal-cat'], undefined, 'languages kept apart');
});

test('v1 stars are migrated to v2 progress', () => {
  const store = memoryStorage();
  store.setItem('lingolite.v1', JSON.stringify({ lang: 'zh', seen: { en: { 'animal-cat': 1 }, zh: { 'animal-dog': 1 } } }));
  const s = L.loadState(store);
  assert.equal(s.lang, 'zh');
  assert.equal(s.progress.en['animal-cat'].seen, 1);
  assert.equal(s.progress.zh['animal-dog'].seen, 1);
});

test('corrupt or missing data gives a clean state', () => {
  const store = memoryStorage();
  assert.deepEqual(L.loadState(store), L.emptyState());
  store.setItem(L.STORE_KEY, '{not json');
  assert.deepEqual(L.loadState(store), L.emptyState());
});

test('storage that throws (private mode) never breaks the app', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.deepEqual(L.loadState(broken), L.emptyState());
  assert.equal(L.saveState(broken, L.emptyState()), false);
});

test('streak: same day no change, next day +1, gap resets to 1', () => {
  const s = L.emptyState();
  L.touchStreak(s, 'en', '2026-10-14');
  L.touchStreak(s, 'en', '2026-10-14');
  assert.equal(s.streak.en.count, 1);
  L.touchStreak(s, 'en', '2026-10-15');
  assert.equal(s.streak.en.count, 2);
  L.touchStreak(s, 'en', '2026-10-17');
  assert.equal(s.streak.en.count, 1);
  assert.equal(s.streak.zh.count, 0, 'per language');
});

test('streak crosses month and year boundaries on the local calendar', () => {
  assert.equal(L.previousDay('2026-03-01'), '2026-02-28');
  assert.equal(L.previousDay('2028-03-01'), '2028-02-29');
  assert.equal(L.previousDay('2027-01-01'), '2026-12-31');
});

test('current streak shows 0 once a day was missed', () => {
  const s = L.emptyState();
  L.touchStreak(s, 'en', '2026-10-14');
  assert.equal(L.currentStreak(s, 'en', '2026-10-15'), 1);
  assert.equal(L.currentStreak(s, 'en', '2026-10-16'), 0);
});

test('localDay uses the local calendar date', () => {
  assert.equal(L.localDay(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});
