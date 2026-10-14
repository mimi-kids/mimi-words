# Mimi

Picture-first vocabulary app for children learning English, Mandarin and Thai.
The language toggle (ABC / 中文 / Thai) chooses the learning language for everything. In English and Chinese mode Thai
is a small helper only; in **Thai mode** the card shows the Thai word large with the English word small below it (no
romanization), and Quiz / Listen ask and answer in Thai (Thai voice th-TH).

- Installable PWA, plain static files, **no build step, no dependencies**: `index.html`, `style.css`,
  `logic.js` (pure rules, shared with the tests), `app.js`, `sw.js`, `manifest.webmanifest`,
  `data/words.json`, `pictures/`, `icons/`.
- Works offline after the first load: the service worker precaches the app and all 100 pictures.
- No ads, no tracking, no analytics, no accounts, no external APIs at runtime. Progress stays in
  `localStorage` on the device; "Reset progress" is on the Credits (i) screen.
- Speech uses the browser's `speechSynthesis` with en-US / zh-CN / th-TH voices from the device.

## Modes (inside each category: 👀 ❓ 👂)

1. **Look (👀)** - picture grid; tap a picture to see the word (Chinese with tone-marked pinyin); tap the big
   picture or 🔊 to hear it; ◀ ▶ to move (silent), "ไทย" button speaks the Thai word.
2. **Quiz (❓)** - a picture is shown, the child picks 1 of 4 word buttons. Right -> green and the word is
   spoken. Wrong -> the button shakes, the right one turns green and is spoken.
3. **Listen (👂)** - the child taps 🔊 to hear the word, then picks 1 of 4 pictures. Same feedback.

**Voice** (owner 2026-10-14): rate 0.75, pitch 1.1, volume 1.0 (constants `SPEECH` in `logic.js`). The voice per language
is chosen automatically by a preference list (en: Google US English, Samantha, Microsoft Aria, any en-US, any en-*;
zh: Google 普通话, Ting-Ting, Tingting, Microsoft Xiaoxiao, any zh-CN, any zh-*; th: Google ไทย, Kanya, Microsoft
Premwadee, any th-TH); with no match the browser default voice speaks. **Settings** (gear ⚙ on the home screen,
for parents): a voice dropdown per language listing this device's voices with a ฟัง test button, a rate slider
0.5-1.0, "คืนค่าเดิม" to reset, and the device voice list to copy (see `evidence/voices.md`). Saved in localStorage.

**Sound only after a tap** (owner 2026-10-14): nothing is spoken when a card opens, on ◀ ▶, on a language change
or when a new question appears; the same code runs on desktop and mobile. Quiz/Listen still speak the word after
the child taps an answer (feedback to that tap).

Rounds are 10 questions from the current category, most-missed words first, then least-recently-seen.
Options are 4 different words from the same category; the right one is always there; no two options share a
label or a picture.

**Progress** (per language: en / zh / th; English and Chinese progress saved before Thai existed is kept): per-word seen / correct / wrong counts and last-seen time; stars per category;
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
node --test tests/                     # 37 unit tests (no npm): data, distractors, queue, progress, streak, voices, Thai
node tools/smoke_test.mjs [shots-dir]  # 36 headless Chrome checks incl. quiz, listen, review, pinyin font, settings, Thai, offline
python3 tools/validate_words.py        # data shape
python3 tools/check_cedict.py <file>   # Chinese + pinyin vs a local CC-CEDICT file (offline)
```

Latest results: `evidence/unit-tests.txt`, `evidence/smoke-tests.txt`.

## Content status

- 100 picture nouns in 6 categories (animals 25, food 25, body 12, colors 10, numbers 10, home 18).
- **All words and category labels are drafts (`reviewed: false`)**; the owner reviews them with `REVIEW.md`.
- Pictures: Twemoji 15.1.0, CC-BY 4.0, credited in the app; sources and hashes in `CONTENT_SOURCES.md`.

## License

- **Code** (HTML, CSS, JavaScript, tools, tests): MIT, see `LICENSE` (copyright 2026 mimi-kids).
- **Word lists and Thai translations** (`data/words.json`, `REVIEW.md`): CC BY 4.0,
  https://creativecommons.org/licenses/by/4.0/ (attribution: mimi-kids).
- **Pictures** (`pictures/twemoji/`): Twemoji 15.1.0, CC-BY 4.0, (c) Twitter, Inc and other contributors;
  see `CONTENT_SOURCES.md`. Unmodified.
- CC-CEDICT was used only to check the Chinese words and pinyin; no CC-CEDICT data is included.

## AI role / owner role

| Who | Role |
|---|---|
| Owner | Requirements; content review (every word, picture choice and label); testing on real phones; release decision |
| Claude Code | Implementation (code, data drafts, tests, this README) |
| Codex | Independent code review - **not yet done** |

## Known limitations / not yet verified

- **Not tested on a phone.** All testing so far is desktop headless Chrome (412x915 viewport). Touch feel,
  installability on Android/iOS and the home-screen icon are unverified.
- **Desktop voices are network voices.** Headless Chrome on the build machine lists 19 Google voices, all
  `localService=false`, and no Thai voice (`evidence/voices.md`). Phone lists still to be collected.
- **Audio not verified.** Headless Chrome plays no sound; whether en-US, zh-CN and th-TH voices exist and
  work offline depends on each device and has not been checked. Without a matching voice the app shows 🔇
  (Look) or the written word (Listen).
- Chinese and pinyin match CC-CEDICT (100/100 headword + reading, `evidence/cedict-check.txt`); that check does
  not confirm the meaning fits the picture - that is part of the owner review.
- **No word is reviewed.** English, Thai, Chinese and the category labels are drafts.
- Pictures still flagged in `REVIEW.md`: water (droplet). Heart is a pink heart by owner decision (heart = love).
  Colors are self-drawn circles. Arm was replaced by finger (2026-10-14).
- Pinyin font: the app ships no web font. On the test machine Chrome renders pinyin (incl. ǜ, U+01DC precomposed)
  with the system font Noto Sans, no fallback needed; phone fonts not checked.
- The streak uses the device's local date; changing the device clock changes it.
- Storage keys keep the old working name (`lingolite.v1` / `lingolite.v2`) so existing progress survives the
  rename to Mimi.
- Progress is per device and per browser; clearing site data deletes it. Private browsing keeps it only
  until the tab closes.
- Accessibility: buttons have Thai/English labels for screen readers, but no screen-reader testing yet.
- No independent (Codex) review yet.
