#!/usr/bin/env python3
"""Check data/words.json Chinese headwords + pinyin against a local CC-CEDICT file.

Usage: python3 tools/check_cedict.py cedict_1_0_ts_utf-8_mdbg.txt[.gz]

Offline, stdlib only, read-only: prints one line per word (OK / PINYIN_DIFFERS /
NOT_IN_CEDICT) and never edits words.json. CC-CEDICT is CC BY-SA 4.0 (MDBG).
"""
import gzip
import json
import os
import sys
import unicodedata

MARKS = {'a': 'āáǎà', 'e': 'ēéěè', 'i': 'īíǐì', 'o': 'ōóǒò', 'u': 'ūúǔù', 'ü': 'ǖǘǚǜ'}


def mark_syllable(syl):
    """'hao3' -> 'hǎo'; 'lu:4' / 'lv4' -> 'lǜ'; tone 5 = neutral (no mark)."""
    syl = syl.lower().replace('u:', 'ü').replace('v', 'ü')
    if not syl or not syl[-1].isdigit():
        return syl
    tone, base = int(syl[-1]), syl[:-1]
    if tone in (5, 0):
        return base
    if 'a' in base:
        i = base.index('a')
    elif 'e' in base:
        i = base.index('e')
    elif 'ou' in base:
        i = base.index('o')
    else:
        i = max(base.rfind(v) for v in 'iouü')
    if i < 0:
        return base
    return base[:i] + MARKS[base[i]][tone - 1] + base[i + 1:]


def norm(s):
    return unicodedata.normalize('NFC', s.replace(' ', '').lower())


def load(path):
    opener = gzip.open if path.endswith('.gz') else open
    entries = {}
    with opener(path, 'rt', encoding='utf-8') as f:
        for line in f:
            if line.startswith('#') or '[' not in line:
                continue
            head, rest = line.split('[', 1)
            parts = head.split()
            if len(parts) < 2:
                continue
            simp = parts[1]
            reading = rest.split(']', 1)[0]
            marked = ''.join(mark_syllable(s) for s in reading.split())
            entries.setdefault(simp, set()).add(norm(marked))
    return entries


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    cedict = load(sys.argv[1])
    here = os.path.dirname(os.path.abspath(__file__))
    words = json.load(open(os.path.join(here, '..', 'data', 'words.json'), encoding='utf-8'))['words']
    counts = {}
    for w in words:
        readings = cedict.get(w['zh'])
        if readings is None:
            status = 'NOT_IN_CEDICT'
        elif norm(w['pinyin']) in readings:
            status = 'OK'
        else:
            status = 'PINYIN_DIFFERS (cedict: %s)' % ' | '.join(sorted(readings))
        counts[status.split()[0]] = counts.get(status.split()[0], 0) + 1
        print('%-22s %-6s %-14s %s' % (w['id'], w['zh'], w['pinyin'], status))
    print('summary:', counts)
    sys.exit(0 if counts.get('OK', 0) == len(words) else 1)


if __name__ == '__main__':
    main()
