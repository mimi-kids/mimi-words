# LingoLite (working name)

Picture-first vocabulary app for children who speak Thai and are learning English and Mandarin.
The child taps a picture, sees the word in the chosen language (Chinese with tone-marked pinyin) and hears it
spoken by the device's own voice. Thai is a small helper button only.

- Installable PWA, plain static files, **no build step, no dependencies**: `index.html`, `style.css`, `app.js`,
  `sw.js`, `manifest.webmanifest`, `data/words.json`, `pictures/`, `icons/`.
- Works offline after the first load: the service worker precaches the app shell and all 100 pictures.
- No ads, no tracking, no analytics, no accounts, no external APIs at runtime. Progress (stars) is kept in
  `localStorage` on the device only; "Reset stars" is on the Credits screen.
- Speech uses the browser's `speechSynthesis` with en-US / zh-CN / th-TH voices. Whether a voice exists depends
  on the device (Android and iOS usually have all three; desktop Linux often has none). With no matching
  voice the card shows 🔇 and stays silent.

## Run locally

```
python3 -m http.server 8765 --bind 127.0.0.1    # then open http://127.0.0.1:8765/
```

Service workers need `https://` or `localhost`; any static host works (e.g. GitHub Pages, from a sub-path too:
all URLs are relative).

## Content status

- 100 picture nouns in 6 categories (animals 25, food 25, body 12, colors 10, numbers 10, home 18).
- **All words are drafts (`reviewed: false`)**; the owner reviews them using `REVIEW.md`.
- Chinese and pinyin are **not yet checked against CC-CEDICT**. See `CONTENT_SOURCES.md`.
- Pictures: Twemoji 15.1.0, CC-BY 4.0, credited in the app.

## Checks

```
python3 tools/validate_words.py            # data shape, 100 words, tone marks, Thai script, icon files, reviewed=false
python3 tools/check_cedict.py <cedict>     # Chinese + pinyin vs a local CC-CEDICT file (offline)
node tools/smoke_test.mjs [shots-dir]      # headless Chrome: navigation, Chinese card, progress, offline reload
```

Change any shipped file -> bump `CACHE` in `sw.js` so installed copies update.
