# Voices (text-to-speech) - evidence

Mimi speaks with the device's own voices (`speechSynthesis`). Which voices exist depends on the phone, the browser
and its settings, so the list must be collected on each device. Nothing here proves that a voice works offline.

## How the owner collects the phone list

1. Open Mimi on the phone (the installed app or the browser), connected to the internet once.
2. On the home screen tap the gear ⚙ (top right, next to 🔁).
3. Scroll to **เสียงบนเครื่องนี้ / Voices on this device**. Each line is `name | lang | localService=true/false`.
4. Long-press the list, select all, copy, and paste it below under the phone's model and browser.
5. In the same screen tap **ฟัง** for English, 中文 and ไทย and note which ones speak.
6. Optional offline check: turn on airplane mode, open Mimi again, tap **ฟัง** for each language, note which speak.
   `localService=false` means a network voice; it may stay silent offline.

## Phone list (owner to paste)

| Field | Value |
|---|---|
| Phone model | |
| OS version | |
| Browser / installed app | |
| Date | |

```
(paste the list from Settings here)
```

| Language | Voice chosen automatically (shown as 'auto (...)') | Speaks online? | Speaks offline? |
|---|---|---|---|
| English | | | |
| 中文 | | | |
| ไทย | | | |

## Desktop list (headless Chrome on the build machine, 2026-10-14)

From `node tools/smoke_test.mjs` (Google Chrome, Linux, headless; see `evidence/smoke-tests.txt`): **count = 19**.

```
Google Deutsch | de-DE | localService=false
Google US English | en-US | localService=false
Google UK English Female | en-GB | localService=false
Google UK English Male | en-GB | localService=false
Google español | es-ES | localService=false
Google español de Estados Unidos | es-US | localService=false
Google français | fr-FR | localService=false
Google हिन्दी | hi-IN | localService=false
Google Bahasa Indonesia | id-ID | localService=false
Google italiano | it-IT | localService=false
Google 日本語 | ja-JP | localService=false
Google 한국의 | ko-KR | localService=false
Google Nederlands | nl-NL | localService=false
Google polski | pl-PL | localService=false
Google português do Brasil | pt-BR | localService=false
Google русский | ru-RU | localService=false
Google 普通话（中国大陆） | zh-CN | localService=false
Google 粤語（香港） | zh-HK | localService=false
Google 國語（臺灣） | zh-TW | localService=false
```

Observations (desktop only):
- Every voice is a Google network voice (`localService=false`): on this desktop none is a local voice, so offline
  speech is not expected to work here.
- English picks **Google US English** and 中文 picks **Google 普通话（中国大陆）** (first entries of the owner's
  preference lists). There is **no Thai voice**: ไทย falls back to the browser default voice (the app does not
  stay silent, but the default voice may not read Thai correctly).
- Gender is not reported by the browser API; the preference lists name common female voices.
