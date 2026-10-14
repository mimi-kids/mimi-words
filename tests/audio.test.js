const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const L = require('../logic.js');
const { validate } = require('../tools/validate_audio.js');
const { data } = require('./helpers.js');

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

// Builds a throwaway repo copy with data/words.json and a fake audio set.
function fixture({ skip = null, corrupt = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mimi-audio-'));
  fs.mkdirSync(path.join(root, 'data'));
  fs.writeFileSync(path.join(root, 'data', 'words.json'), JSON.stringify(data));
  const clips = [];
  for (const lang of ['en', 'zh', 'th']) {
    fs.mkdirSync(path.join(root, 'audio', lang), { recursive: true });
    for (const w of data.words) {
      const key = lang + '/' + w.id;
      if (key === skip) continue;
      const bytes = Buffer.from('fake mp3 ' + key);
      const file = `audio/${lang}/${w.id}.mp3`;
      fs.writeFileSync(path.join(root, file), bytes);
      clips.push({ id: w.id, lang, text: L.labelOf(w, lang), voice: 'test', provider: 'test', date: '2026-10-14', file,
                   sha256: key === corrupt ? '0'.repeat(64) : sha(bytes) });
    }
  }
  fs.writeFileSync(path.join(root, 'audio', 'manifest.json'), JSON.stringify({ provider: 'test', clips }));
  return root;
}

test('manifest validator: complete set (100 words x 3 languages) with matching sha256 is valid', () => {
  const r = validate(fixture());
  assert.deepEqual(r.errors, []);
  assert.equal(r.clips, 300);
});

test('manifest validator: a missing word x language is reported (full mode), tolerated in partial mode', () => {
  const root = fixture({ skip: 'th/animal-cat' });
  assert.deepEqual(validate(root).errors, ['th/animal-cat: no clip']);
  assert.deepEqual(validate(root, { partial: true }).errors, []);
});

test('manifest validator: a sha256 mismatch is reported', () => {
  assert.deepEqual(validate(fixture({ corrupt: 'zh/food-apple' })).errors, ['zh/food-apple: sha256 mismatch']);
});

test('playback chooser: file present -> file, otherwise TTS', () => {
  const idx = L.audioIndex({ clips: [{ id: 'animal-cat', lang: 'th', file: 'audio/th/animal-cat.mp3' }] });
  assert.deepEqual(L.chooseAudio(idx, 'th', 'animal-cat'), { kind: 'file', src: 'audio/th/animal-cat.mp3' });
  assert.deepEqual(L.chooseAudio(idx, 'en', 'animal-cat'), { kind: 'tts' });
  assert.deepEqual(L.chooseAudio(idx, 'th', 'animal-dog'), { kind: 'tts' });
  assert.deepEqual(L.chooseAudio(L.audioIndex(null), 'zh', 'animal-cat'), { kind: 'tts' });
});
