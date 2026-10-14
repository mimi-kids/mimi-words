const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');

const W = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, category: 'x', en: id, zh: id, icon: id }));
const ids = (list) => list.map((w) => w.id);

function stateWith(entries) {
  const s = L.emptyState();
  Object.assign(s.progress.en, entries);
  return s;
}

test('review queue: most-missed first, then least-recently-seen; unseen excluded', () => {
  const s = stateWith({
    a: { seen: 3, correct: 3, wrong: 0, last: 500 },
    b: { seen: 4, correct: 1, wrong: 3, last: 900 },
    c: { seen: 2, correct: 1, wrong: 1, last: 100 },
    d: { seen: 1, correct: 1, wrong: 0, last: 200 },
  });
  assert.deepEqual(ids(L.reviewQueue(s, 'en', W)), ['b', 'c', 'd', 'a']);
});

test('review queue: ties broken by id for a stable order', () => {
  const s = stateWith({
    c: { seen: 1, correct: 0, wrong: 1, last: 100 },
    a: { seen: 1, correct: 0, wrong: 1, last: 100 },
  });
  assert.deepEqual(ids(L.reviewQueue(s, 'en', W)), ['a', 'c']);
});

test('review queue is per language', () => {
  const s = stateWith({ a: { seen: 1, correct: 0, wrong: 1, last: 1 } });
  assert.deepEqual(ids(L.reviewQueue(s, 'zh', W)), []);
});

test('round: missed words first, then unseen/oldest, capped at size', () => {
  const s = stateWith({
    a: { seen: 5, correct: 5, wrong: 0, last: 900 },
    e: { seen: 2, correct: 0, wrong: 2, last: 800 },
  });
  assert.deepEqual(ids(L.roundWords(s, 'en', W, 3)), ['e', 'b', 'c']);
  assert.equal(L.roundWords(s, 'en', W, 10).length, 5);
});

test('recordAnswer updates counts and moves a missed word to the front', () => {
  const s = L.emptyState();
  for (const w of W) L.recordSeen(s, 'en', w.id, 1000);
  L.recordAnswer(s, 'en', 'd', false, 2000);
  L.recordAnswer(s, 'en', 'a', true, 2000);
  assert.deepEqual(s.progress.en.d, { seen: 2, correct: 0, wrong: 1, last: 2000 });
  assert.deepEqual(s.progress.en.a, { seen: 2, correct: 1, wrong: 0, last: 2000 });
  assert.equal(ids(L.reviewQueue(s, 'en', W))[0], 'd');
});
