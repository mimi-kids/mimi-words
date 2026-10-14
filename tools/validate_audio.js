#!/usr/bin/env node
// Validate audio/manifest.json against data/words.json and the audio files (no dependencies).
//   node tools/validate_audio.js            full: every word id x language must be present
//   node tools/validate_audio.js --partial  only the clips that exist (e.g. after --sample)
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const LANGS = ['en', 'zh', 'th'];

function validate(root, { partial = false } = {}) {
  const errors = [];
  const words = JSON.parse(fs.readFileSync(path.join(root, 'data', 'words.json'), 'utf8')).words;
  const mpath = path.join(root, 'audio', 'manifest.json');
  if (!fs.existsSync(mpath)) return { errors: partial ? [] : ['audio/manifest.json missing'], clips: 0 };
  const m = JSON.parse(fs.readFileSync(mpath, 'utf8'));
  const ids = new Set(words.map((w) => w.id));
  const seen = new Set();
  for (const c of m.clips || []) {
    const key = c.lang + '/' + c.id;
    if (!LANGS.includes(c.lang)) errors.push(`${key}: unknown language`);
    if (!ids.has(c.id)) errors.push(`${key}: unknown word id`);
    if (seen.has(key)) errors.push(`${key}: duplicate clip`);
    seen.add(key);
    if (c.file !== `audio/${c.lang}/${c.id}.mp3`) errors.push(`${key}: file path ${c.file}`);
    const f = path.join(root, c.file || '');
    if (!c.file || !fs.existsSync(f)) { errors.push(`${key}: file missing`); continue; }
    const sha = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
    if (sha !== c.sha256) errors.push(`${key}: sha256 mismatch`);
    for (const k of ['text', 'provider']) if (!c[k]) errors.push(`${key}: ${k} missing`);
  }
  if (!partial) {
    for (const w of words) for (const l of LANGS) if (!seen.has(l + '/' + w.id)) errors.push(`${l}/${w.id}: no clip`);
  }
  return { errors, clips: seen.size };
}

if (require.main === module) {
  const partial = process.argv.includes('--partial');
  const { errors, clips } = validate(path.join(__dirname, '..'), { partial });
  console.log(`clips ${clips}${partial ? ' (partial check)' : ''}`);
  for (const e of errors) console.log('ERROR ' + e);
  console.log(errors.length ? `INVALID (${errors.length} errors)` : 'VALID');
  process.exit(errors.length ? 1 : 0);
}
module.exports = { validate, LANGS };
