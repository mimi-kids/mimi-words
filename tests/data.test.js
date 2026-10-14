const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, data } = require('./helpers.js');

const TONE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/;

test('exactly 100 records', () => assert.equal(data.words.length, 100));

test('ids are unique', () => {
  const ids = data.words.map((w) => w.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('en, zh, pinyin, th are non-empty strings', () => {
  for (const w of data.words) {
    for (const f of ['en', 'zh', 'pinyin', 'th']) {
      assert.ok(typeof w[f] === 'string' && w[f].trim().length > 0, `${w.id}.${f}`);
    }
  }
});

test('pinyin contains a tone mark', () => {
  for (const w of data.words) assert.match(w.pinyin, TONE, w.id);
});

test('every picture file exists (words and category tiles)', () => {
  const icons = data.words.map((w) => w.icon).concat(Object.values(data.category_labels).map((c) => c.icon));
  for (const icon of icons) assert.ok(fs.existsSync(path.join(ROOT, icon)), icon);
});

test('every category is known and has at least 4 words', () => {
  for (const w of data.words) assert.ok(data.categories.includes(w.category), w.id);
  for (const c of data.categories) assert.ok(data.words.filter((w) => w.category === c).length >= 4, c);
});

test('nothing is marked reviewed (owner reviews)', () => {
  for (const w of data.words) assert.equal(w.reviewed, false, w.id);
  assert.equal(data.category_labels_reviewed, false);
});
