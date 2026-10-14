# Mimi

Picture-first vocabulary app for children who speak Thai and are learning English and Mandarin.
The language toggle (ABC / 中文) chooses the language for everything; Thai is a small helper only.

- Installable PWA, plain static files, **no build step, no dependencies**: `index.html`, `style.css`,
  `logic.js` (pure rules, shared with the tests), `app.js`, `sw.js`, `manifest.webmanifest`,
  `data/words.json`, `pictures/`, `icons/`.
- Works offline after the first load: the service worker precaches the app and all 100 pictures.
- No ads, no tracking, no analytics, no accounts, no external APIs at runtime. Progress stays in
  `localStorage` on the device; "Reset progress" is on the Credits (i) screen.
- Speech uses the browser's `speechSynthesis` with en-US / zh-CN / th-TH voices from the device.

## Modes (inside each category: 👀 ❓ 👂)

1. **Look (👀)** - picture grid; tap a picture to see the word (Chinese with tone-marked pinyin) and hear it;
   ◀ ▶ to move, "ไทย" button speaks the Thai word.
2. **Quiz (❓)** - a picture is shown, the child picks 1 of 4 word buttons. Right -> green and the word is
   spoken. Wrong -> the button shakes, the right one turns green and is spoken.
3. **Listen (👂)** - the word is spoken (🔊 replays it), the child picks 1 of 4 pictures. Same feedback.

Rounds are 10 questions from the current category, most-missed words first, then least-recently-seen.
Options are 4 different words from the same category; the right one is always there; no two options share a
label or a picture.

**Progress** (per language): per-word seen / correct / wrong counts and last-seen time; stars per category;
a daily streak (🔥, local calendar date); a **review** tile (🔁) on the home screen that runs a Quiz over the
review queue (most-missed first, then least-recently-seen).

## Run locally

```
python3 -m http.server 8765 --bind 127.0.0.1    # then open http://127.0.0.1:8765/
```

Service workers need `https://` or `localhost`. Any static host works (all URLs are relative).
After changing any shipped file, bump `CACHE` in `sw.js` so installed copies update.

## Tests

```
node --test tests/                     # 24 unit tests (no npm): data, distractors, queue, progress, streak
node tools/smoke_test.mjs [shots-dir]  # 24 headless Chrome checks incl. quiz, listen, review, offline reload
python3 tools/validate_words.py        # data shape
python3 tools/check_cedict.py <file>   # Chinese + pinyin vs a local CC-CEDICT file (offline)
```

Latest results: `evidence/unit-tests.txt`, `evidence/smoke-tests.txt`.

## Content status

- 100 picture nouns in 6 categories (animals 25, food 25, body 12, colors 10, numbers 10, home 18).
- **All words and category labels are drafts (`reviewed: false`)**; the owner reviews them with `REVIEW.md`.
- Pictures: Twemoji 15.1.0, CC-BY 4.0, credited in the app; sources and hashes in `CONTENT_SOURCES.md`.

## AI role / owner role

| Who | Role |
|---|---|
| Owner | Requirements; content review (every word, picture choice and label); testing on real phones; release decision; license choice |
| Claude Code | Implementation (code, data drafts, tests, this README) |
| Codex | Independent code review - **not yet done** |

## Known limitations / not yet verified

- **Not tested on a phone.** All testing so far is desktop headless Chrome (412x915 viewport). Touch feel,
  installability on Android/iOS and the home-screen icon are unverified.
- **Audio not verified.** Headless Chrome plays no sound; whether en-US, zh-CN and th-TH voices exist and
  work offline depends on each device and has not been checked. Without a matching voice the app shows 🔇
  (Look) or the written word (Listen).
- Chinese and pinyin match CC-CEDICT (100/100 headword + reading, `evidence/cedict-check.txt`); that check does
  not confirm the meaning fits the picture - that is part of the owner review.
- **No word is reviewed.** English, Thai, Chinese and the category labels are drafts.
- Four pictures are stand-ins, flagged in `REVIEW.md`: water (droplet), arm (flexed biceps), heart (symbol),
  pink (pink heart).
- The streak uses the device's local date; changing the device clock changes it.
- Storage keys keep the old working name (`lingolite.v1` / `lingolite.v2`) so existing progress survives the
  rename to Mimi.
- Progress is per device and per browser; clearing site data deletes it. Private browsing keeps it only
  until the tab closes.
- Accessibility: buttons have Thai/English labels for screen readers, but no screen-reader testing yet.
- No LICENSE file yet (owner decides).
- No independent (Codex) review yet.
