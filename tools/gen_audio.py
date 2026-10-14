#!/usr/bin/env python3
"""Pre-generate word audio with Google Cloud Text-to-Speech (pilot). Stdlib only.

The owner runs this from his own terminal. The API key is read ONLY from the environment variable
GOOGLE_TTS_API_KEY; it is never printed, logged or written to any file. Errors print the HTTP status and Google's
error message only, never a URL (the URL carries the key) and never a traceback.

    GOOGLE_TTS_API_KEY=... python3 tools/gen_audio.py --sample    # 1 word per language (3 clips), then stop
    GOOGLE_TTS_API_KEY=... python3 tools/gen_audio.py             # all 100 words x 3 languages (300 clips)

Output: audio/<lang>/<word-id>.mp3 (lang = en, zh, th as in the app) and audio/manifest.json. Existing files are
skipped (idempotent). Stops on the first HTTP error (no retry). Total characters must stay below 3,000.
"""
import base64
import datetime
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
API = 'https://texttospeech.googleapis.com/v1'
PROVIDER = 'Google Cloud Text-to-Speech'
# app language -> (Google language code, word field)
LANGS = {'en': ('en-US', 'en'), 'zh': ('cmn-CN', 'zh'), 'th': ('th-TH', 'th')}
TIERS = ('Neural2', 'Wavenet', 'Standard')            # best first; other voice families are not used
AUDIO_CONFIG = {'audioEncoding': 'MP3', 'speakingRate': 0.8, 'pitch': 1.0, 'sampleRateHertz': 24000}
CHAR_LIMIT = 3000
SLEEP_S = 1.0


class ApiError(Exception):
    pass


def call(method, path, key, body=None):
    """One REST call. Raises ApiError with status + Google's message only (no URL, no key)."""
    url = '%s/%s%skey=%s' % (API, path, '&' if '?' in path else '?', key)
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={'Content-Type': 'application/json; charset=utf-8'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        try:
            msg = json.loads(e.read().decode('utf-8')).get('error', {}).get('message', '')
        except Exception:
            msg = ''
        raise ApiError('HTTP %d %s' % (e.code, msg[:300].replace(key, '<key>'))) from None
    except Exception as e:  # network errors: report the class only (their text may contain the URL)
        raise ApiError('request failed: %s' % type(e).__name__) from None


def tier_of(name):
    for i, t in enumerate(TIERS):
        if t in name:
            return i
    return None


def choose_voices(voices):
    """Best FEMALE voice per language by tier Neural2 > Wavenet > Standard; ties by name (deterministic)."""
    chosen = {}
    for lang, (code, _) in LANGS.items():
        cands = [v for v in voices if code in v.get('languageCodes', []) and v.get('ssmlGender') == 'FEMALE'
                 and tier_of(v.get('name', '')) is not None]
        cands.sort(key=lambda v: (tier_of(v['name']), v['name']))
        if not cands:
            raise ApiError('no FEMALE %s voice in tiers %s' % (code, '/'.join(TIERS)))
        chosen[lang] = cands[0]['name']
    return chosen


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()


def load_manifest(path):
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    return {'provider': PROVIDER, 'audioConfig': AUDIO_CONFIG, 'voices': {}, 'clips': []}


def save_manifest(path, m):
    m['clips'].sort(key=lambda c: (c['lang'], c['id']))
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=1)
        f.write('\n')
    os.replace(tmp, path)


def main(argv):
    sample = '--sample' in argv
    key = os.environ.get('GOOGLE_TTS_API_KEY', '')
    if not key:
        print('GOOGLE_TTS_API_KEY is not set; nothing done.')
        return 2
    words = json.load(open(os.path.join(ROOT, 'data', 'words.json'), encoding='utf-8'))['words']
    jobs = []
    for lang, (code, field) in LANGS.items():
        for w in (words[:1] if sample else words):
            jobs.append((lang, code, w['id'], w[field]))
    total_chars = sum(len(t) for *_, t in jobs)
    full_chars = sum(len(w[f]) for (_, f) in LANGS.values() for w in words)
    print('characters: this run %d, full set %d (limit %d)' % (total_chars, full_chars, CHAR_LIMIT))
    if full_chars >= CHAR_LIMIT:
        print('full set would exceed the character limit; nothing done.')
        return 2

    manifest_path = os.path.join(ROOT, 'audio', 'manifest.json')
    m = load_manifest(manifest_path)
    have = {(c['lang'], c['id']) for c in m['clips']}
    try:
        voices = call('GET', 'voices', key).get('voices', [])
        chosen = choose_voices(voices)
    except ApiError as e:
        print('voices: %s - stopped.' % e)
        return 1
    for lang in LANGS:
        print('voice %s (%s): %s' % (lang, LANGS[lang][0], chosen[lang]))
    m['voices'] = chosen
    m['provider'] = PROVIDER
    m['audioConfig'] = AUDIO_CONFIG

    made = skipped = chars = 0
    today = datetime.date.today().isoformat()
    for lang, code, wid, text in jobs:
        rel = 'audio/%s/%s.mp3' % (lang, wid)
        path = os.path.join(ROOT, rel)
        if os.path.exists(path):
            if (lang, wid) not in have:   # file without a manifest entry: record it, voice unknown
                m['clips'].append({'id': wid, 'lang': lang, 'text': text, 'voice': None, 'provider': PROVIDER,
                                   'date': None, 'file': rel, 'sha256': sha256(path), 'bytes': os.path.getsize(path)})
                have.add((lang, wid))
            skipped += 1
            continue
        if made:
            time.sleep(SLEEP_S)
        try:
            out = call('POST', 'text:synthesize', key, {
                'input': {'text': text},
                'voice': {'languageCode': code, 'name': chosen[lang]},
                'audioConfig': AUDIO_CONFIG})
        except ApiError as e:
            save_manifest(manifest_path, m)
            print('%s %s: %s - stopped (no retry). made %d, skipped %d, characters %d.' % (lang, wid, e, made, skipped, chars))
            return 1
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as f:
            f.write(base64.b64decode(out['audioContent']))
        m['clips'] = [c for c in m['clips'] if (c['lang'], c['id']) != (lang, wid)]
        m['clips'].append({'id': wid, 'lang': lang, 'text': text, 'voice': chosen[lang], 'provider': PROVIDER,
                           'date': today, 'file': rel, 'sha256': sha256(path), 'bytes': os.path.getsize(path)})
        have.add((lang, wid))
        save_manifest(manifest_path, m)     # after every clip, so an interruption keeps it consistent
        made += 1
        chars += len(text)
        print('%s %s %s (%d bytes)' % (lang, wid, rel, os.path.getsize(path)))
    save_manifest(manifest_path, m)
    print('done: made %d, skipped %d, characters sent %d (limit %d)%s' % (
        made, skipped, chars, CHAR_LIMIT, ' - sample only' if sample else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
