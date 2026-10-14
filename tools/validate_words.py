#!/usr/bin/env python3
"""Validate data/words.json (stdlib only, read-only). Exit 0 = valid."""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
FIELDS = {'id', 'category', 'en', 'zh', 'pinyin', 'th', 'icon', 'source', 'reviewed'}
TONE = re.compile('[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]')
HAN = re.compile('^[一-鿿]+$')
THAI = re.compile('^[฀-๿ ]+$')


def main():
    data = json.load(open(os.path.join(ROOT, 'data', 'words.json'), encoding='utf-8'))
    words, cats = data['words'], data['categories']
    errors = []
    if len(words) != 100:
        errors.append('expected 100 words, got %d' % len(words))
    ids = [w.get('id') for w in words]
    if len(set(ids)) != len(ids):
        errors.append('duplicate ids')
    for w in words:
        wid = w.get('id', '?')
        if set(w) != FIELDS:
            errors.append('%s: fields %s' % (wid, sorted(set(w) ^ FIELDS)))
            continue
        if w['category'] not in cats:
            errors.append('%s: unknown category' % wid)
        if not HAN.match(w['zh']):
            errors.append('%s: zh not Han characters' % wid)
        if not TONE.search(w['pinyin']):
            errors.append('%s: pinyin has no tone mark' % wid)
        if not THAI.match(w['th']):
            errors.append('%s: th not Thai script' % wid)
        if w['icon'].startswith('data:image/svg+xml,'):
            pass  # self-drawn inline SVG (colors)
        elif not os.path.isfile(os.path.join(ROOT, w['icon'])):
            errors.append('%s: icon missing %s' % (wid, w['icon']))
        if w['reviewed'] is not False:
            errors.append('%s: reviewed must stay false until the owner reviews' % wid)
    per_cat = {c: sum(w['category'] == c for w in words) for c in cats}
    print('words %d, categories %s' % (len(words), per_cat))
    for e in errors:
        print('ERROR', e)
    print('VALID' if not errors else 'INVALID (%d errors)' % len(errors))
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
