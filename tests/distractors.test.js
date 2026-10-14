const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');
const { data, rng } = require('./helpers.js');

function checkOptions(opts, correct, lang) {
  assert.equal(opts.length, 4);
  assert.ok(opts.some((o) => o.id === correct.id), 'correct option present');
  assert.equal(new Set(opts.map((o) => o.id)).size, 4, 'distinct words');
  assert.equal(new Set(opts.map((o) => L.labelOf(o, lang))).size, 4, 'distinct labels');
  assert.equal(new Set(opts.map((o) => o.icon)).size, 4, 'distinct pictures');
  for (const o of opts) assert.equal(o.category, correct.category, 'same category');
}

test('every word, both languages, 25 seeds: 4 valid options', () => {
  for (const lang of ['en', 'zh']) {
    for (const w of data.words) {
      for (let seed = 1; seed <= 25; seed++) checkOptions(L.pickOptions(data.words, w, lang, rng(seed)), w, lang);
    }
  }
});

test('duplicate labels or pictures in the pool are never offered together', () => {
  const base = { category: 'x' };
  const words = [
    { ...base, id: 'a', en: 'cat', zh: '猫', icon: 'a.svg' },
    { ...base, id: 'b', en: 'cat', zh: '猫咪', icon: 'b.svg' },      // same English label as a
    { ...base, id: 'c', en: 'kitty', zh: '小猫', icon: 'a.svg' },    // same picture as a
    { ...base, id: 'd', en: 'dog', zh: '狗', icon: 'd.svg' },
    { ...base, id: 'e', en: 'pig', zh: '猪', icon: 'e.svg' },
    { ...base, id: 'f', en: 'cow', zh: '牛', icon: 'f.svg' },
  ];
  for (let seed = 1; seed <= 50; seed++) {
    const opts = L.pickOptions(words, words[0], 'en', rng(seed));
    checkOptions(opts, words[0], 'en');
    assert.ok(!opts.some((o) => o.id === 'b' || o.id === 'c'));
  }
});

test('too few distinct options throws instead of repeating', () => {
  const words = [
    { id: 'a', category: 'x', en: 'a', zh: 'a', icon: '1' },
    { id: 'b', category: 'x', en: 'b', zh: 'b', icon: '2' },
    { id: 'c', category: 'x', en: 'a', zh: 'c', icon: '3' },   // duplicate label in en
    { id: 'd', category: 'y', en: 'd', zh: 'd', icon: '4' },   // other category
  ];
  assert.throws(() => L.pickOptions(words, words[0], 'en', rng(1)), /not enough distinct options/);
});

test('correct answer position varies (not always first)', () => {
  const positions = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    positions.add(L.pickOptions(data.words, data.words[0], 'en', rng(seed)).findIndex((o) => o.id === data.words[0].id));
  }
  assert.equal(positions.size, 4);
});

test('Thai mode: every word, 25 seeds: 4 options with 4 distinct Thai labels', () => {
  for (const w of data.words) {
    for (let seed = 1; seed <= 25; seed++) {
      const opts = L.pickOptions(data.words, w, 'th', rng(seed));
      checkOptions(opts, w, 'th');
      for (const o of opts) assert.match(L.labelOf(o, 'th'), /^[฀-๿ ]+$/, 'Thai script');
    }
  }
});
