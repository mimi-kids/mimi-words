// Mimi pure logic: rounds, distractors, progress, review queue, streak, storage.
// No DOM. Loaded as a plain <script> in the browser (window.LingoLogic) and with require() in tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LingoLogic = factory();
})(this, function () {
  'use strict';

  var STORE_KEY = 'lingolite.v2';
  var OLD_KEY = 'lingolite.v1';
  var LANGS = ['en', 'zh', 'th'];   // learning languages; progress and streak are kept per language

  // ------------------------------------------------------------ random helpers (rng injectable for tests)
  function shuffle(list, rng) {
    var a = list.slice();
    rng = rng || Math.random;
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function labelOf(word, lang) { return lang === 'zh' ? word.zh : lang === 'th' ? word.th : word.en; }

  // ------------------------------------------------------------ distractors
  // 4 distinct options from the correct word's category: the correct one is present, and no two options
  // share a label (in `lang`) or a picture. Throws if the category cannot supply enough options.
  function pickOptions(words, correct, lang, rng, count) {
    count = count || 4;
    var labels = {}, icons = {};
    labels[labelOf(correct, lang)] = true;
    icons[correct.icon] = true;
    var picked = [correct];
    var pool = shuffle(words.filter(function (w) {
      return w.category === correct.category && w.id !== correct.id;
    }), rng);
    for (var i = 0; i < pool.length && picked.length < count; i++) {
      var w = pool[i], l = labelOf(w, lang);
      if (labels[l] || icons[w.icon]) continue;
      labels[l] = true; icons[w.icon] = true;
      picked.push(w);
    }
    if (picked.length < count) throw new Error('not enough distinct options in ' + correct.category);
    return shuffle(picked, rng);
  }

  // ------------------------------------------------------------ progress
  function emptyState() {
    var s = { lang: 'en', progress: {}, streak: {} };
    LANGS.forEach(function (l) { s.progress[l] = {}; s.streak[l] = { count: 0, lastDay: null }; });
    return s;
  }

  function entry(state, lang, id) {
    var p = state.progress[lang];
    if (!p[id]) p[id] = { seen: 0, correct: 0, wrong: 0, last: 0 };
    return p[id];
  }

  function recordSeen(state, lang, id, now) {
    var e = entry(state, lang, id);
    e.seen += 1;
    e.last = now;
    touchStreak(state, lang, localDay(new Date(now)));
  }

  function recordAnswer(state, lang, id, ok, now) {
    var e = entry(state, lang, id);
    e.seen += 1;
    if (ok) e.correct += 1; else e.wrong += 1;
    e.last = now;
    touchStreak(state, lang, localDay(new Date(now)));
  }

  function seenCount(state, lang, words) {
    var p = state.progress[lang];
    return words.filter(function (w) { return p[w.id] && p[w.id].seen > 0; }).length;
  }

  // Ordering shared by rounds and the review queue: most wrong first, then least recently seen
  // (never seen = oldest), then id so the order is deterministic.
  function compareNeed(p) {
    return function (a, b) {
      var ea = p[a.id] || { wrong: 0, last: 0 }, eb = p[b.id] || { wrong: 0, last: 0 };
      if (eb.wrong !== ea.wrong) return eb.wrong - ea.wrong;
      if (ea.last !== eb.last) return ea.last - eb.last;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    };
  }

  // Review queue: words already seen in `lang`, most-missed first, then least-recently-seen.
  function reviewQueue(state, lang, words) {
    var p = state.progress[lang];
    return words.filter(function (w) { return p[w.id] && p[w.id].seen > 0; }).sort(compareNeed(p));
  }

  // One round: up to `size` words from `words`, most-missed first, then least-recently-seen.
  function roundWords(state, lang, words, size) {
    return words.slice().sort(compareNeed(state.progress[lang])).slice(0, size || 10);
  }

  // ------------------------------------------------------------ daily streak (local calendar date)
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function localDay(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function previousDay(day) {
    var p = day.split('-');
    return localDay(new Date(+p[0], +p[1] - 1, +p[2] - 1));
  }
  function touchStreak(state, lang, today) {
    var s = state.streak[lang];
    if (s.lastDay === today) return;
    s.count = s.lastDay === previousDay(today) ? s.count + 1 : 1;
    s.lastDay = today;
  }
  function currentStreak(state, lang, today) {
    var s = state.streak[lang];
    return s.lastDay === today || s.lastDay === previousDay(today) ? s.count : 0;
  }

  // ------------------------------------------------------------ storage (any object with getItem/setItem)
  function loadState(storage) {
    var s = emptyState();
    var raw = null, old = null;
    try { raw = storage.getItem(STORE_KEY); if (!raw) old = storage.getItem(OLD_KEY); } catch (e) { return s; }
    try {
      if (raw) {
        var v = JSON.parse(raw);
        if (LANGS.indexOf(v.lang) >= 0) s.lang = v.lang;
        LANGS.forEach(function (l) {
          if (v.progress && v.progress[l]) s.progress[l] = v.progress[l];
          if (v.streak && v.streak[l]) s.streak[l] = v.streak[l];
        });
      } else if (old) {  // v1 stored only { lang, seen: { en: {id: 1}, zh: {...} } }
        var o = JSON.parse(old);
        if (LANGS.indexOf(o.lang) >= 0) s.lang = o.lang;
        LANGS.forEach(function (l) {
          Object.keys((o.seen && o.seen[l]) || {}).forEach(function (id) {
            s.progress[l][id] = { seen: 1, correct: 0, wrong: 0, last: 0 };
          });
        });
      }
    } catch (e) { /* corrupt data: start fresh */ }
    return s;
  }
  function saveState(storage, state) {
    try { storage.setItem(STORE_KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
  }

  // ------------------------------------------------------------ speech settings and voice choice
  // One place for the speech constants (owner 2026-10-14).
  var SPEECH = { rate: 0.75, pitch: 1.1, volume: 1.0, minRate: 0.5, maxRate: 1.0 };
  // Preference per language: voice-name substrings first (in order), then the language tag, then any variant.
  // The Web Speech API exposes no gender; the named voices are the common female voices on each platform.
  var VOICE_PREFS = {
    en: { tag: 'en-US', names: ['Google US English', 'Samantha', 'Microsoft Aria'], anyPrefix: true },
    zh: { tag: 'zh-CN', names: ['Google 普通话', 'Ting-Ting', 'Tingting', 'Microsoft Xiaoxiao'], anyPrefix: true },
    th: { tag: 'th-TH', names: ['Google ไทย', 'Kanya', 'Microsoft Premwadee'], anyPrefix: false }
  };
  var SETTINGS_KEY = 'mimi.settings.v1';

  function normTag(t) { return String(t || '').replace('_', '-').toLowerCase(); }

  // voices: array of {name, lang, voiceURI, localService}; savedURI: the parent's choice or null.
  // Returns a voice object or undefined (undefined = let the browser use its default voice; never silent).
  function chooseVoice(voices, lang, savedURI) {
    var pref = VOICE_PREFS[lang];
    if (!voices || !voices.length || !pref) return undefined;
    var tag = normTag(pref.tag), prefix = tag.split('-')[0];
    var inLang = voices.filter(function (v) { return normTag(v.lang).split('-')[0] === prefix; });
    if (savedURI) {
      for (var k = 0; k < inLang.length; k++) if (inLang[k].voiceURI === savedURI) return inLang[k];
    }
    for (var i = 0; i < pref.names.length; i++) {
      for (var j = 0; j < inLang.length; j++) {
        if (String(inLang[j].name || '').indexOf(pref.names[i]) >= 0) return inLang[j];
      }
    }
    var exact = inLang.filter(function (v) { return normTag(v.lang) === tag; });
    if (exact.length) return exact[0];
    if (pref.anyPrefix && inLang.length) return inLang[0];
    return undefined;
  }

  function defaultSettings() { return { rate: SPEECH.rate, voices: { en: null, zh: null, th: null } }; }
  function loadSettings(storage) {
    var s = defaultSettings();
    try {
      var v = JSON.parse(storage.getItem(SETTINGS_KEY) || 'null');
      if (v && typeof v.rate === 'number' && v.rate >= SPEECH.minRate && v.rate <= SPEECH.maxRate) s.rate = v.rate;
      if (v && v.voices) ['en', 'zh', 'th'].forEach(function (l) { if (typeof v.voices[l] === 'string') s.voices[l] = v.voices[l]; });
    } catch (e) { /* defaults */ }
    return s;
  }
  function saveSettings(storage, settings) {
    try { storage.setItem(SETTINGS_KEY, JSON.stringify(settings)); return true; } catch (e) { return false; }
  }

  // ------------------------------------------------------------ pre-generated audio (pilot)
  // index: { en: { wordId: 'audio/en/wordId.mp3' }, zh: {...}, th: {...} } built from audio/manifest.json.
  function audioIndex(manifest) {
    var idx = {};
    LANGS.forEach(function (l) { idx[l] = {}; });
    ((manifest && manifest.clips) || []).forEach(function (c) {
      if (idx[c.lang] && c.id && c.file) idx[c.lang][c.id] = c.file;
    });
    return idx;
  }
  // Playback chooser: a pre-generated file when the manifest lists one, otherwise device text-to-speech.
  function chooseAudio(index, lang, wordId) {
    var f = index && index[lang] && index[lang][wordId];
    return f ? { kind: 'file', src: f } : { kind: 'tts' };
  }

  return {
    audioIndex: audioIndex, chooseAudio: chooseAudio,
    SPEECH: SPEECH, VOICE_PREFS: VOICE_PREFS, SETTINGS_KEY: SETTINGS_KEY, chooseVoice: chooseVoice,
    defaultSettings: defaultSettings, loadSettings: loadSettings, saveSettings: saveSettings,
    LANGS: LANGS, STORE_KEY: STORE_KEY, shuffle: shuffle, labelOf: labelOf, pickOptions: pickOptions,
    emptyState: emptyState, recordSeen: recordSeen, recordAnswer: recordAnswer, seenCount: seenCount,
    reviewQueue: reviewQueue, roundWords: roundWords, localDay: localDay, previousDay: previousDay,
    touchStreak: touchStreak, currentStreak: currentStreak, loadState: loadState, saveState: saveState
  };
});
