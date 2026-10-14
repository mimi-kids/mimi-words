// LingoLite - picture-first words for children (Thai speakers) learning English and Chinese.
// Vanilla JS, no dependencies, no network calls besides loading its own files.
(function () {
  'use strict';

  var STORE_KEY = 'lingolite.v1';
  var VOICE_LANG = { en: 'en-US', zh: 'zh-CN', th: 'th-TH' };

  var data = null;            // data/words.json
  var state = loadState();    // { lang: 'en'|'zh', seen: { en: {id: 1}, zh: {id: 1} } }
  var current = { category: null, list: [], index: 0 };

  var $ = function (id) { return document.getElementById(id); };
  var view = $('view');

  // ------------------------------------------------------------ storage (per device only)
  function loadState() {
    var fallback = { lang: 'en', seen: { en: {}, zh: {} } };
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return fallback;
      var s = JSON.parse(raw);
      if (s.lang !== 'en' && s.lang !== 'zh') s.lang = 'en';
      s.seen = s.seen || {};
      s.seen.en = s.seen.en || {};
      s.seen.zh = s.seen.zh || {};
      return s;
    } catch (e) {
      return fallback;
    }
  }
  function saveState() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  // ------------------------------------------------------------ speech (device voices only)
  var voices = [];
  function refreshVoices() {
    if ('speechSynthesis' in window) voices = window.speechSynthesis.getVoices() || [];
  }
  function voiceFor(lang) {
    var want = VOICE_LANG[lang].toLowerCase();
    var prefix = want.split('-')[0];
    var exact = null, close = null;
    for (var i = 0; i < voices.length; i++) {
      var vl = (voices[i].lang || '').toLowerCase().replace('_', '-');
      if (vl === want && (!exact || voices[i].localService)) exact = voices[i];
      else if (vl.split('-')[0] === prefix && !close) close = voices[i];
    }
    return exact || close;
  }
  function canSpeak(lang) {
    return 'speechSynthesis' in window && (voices.length === 0 || !!voiceFor(lang));
  }
  function speak(text, lang) {
    if (!('speechSynthesis' in window)) return false;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = VOICE_LANG[lang];
    var v = voiceFor(lang);
    if (v) u.voice = v;
    u.rate = 0.8;   // a little slower for children
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return true;
  }
  if ('speechSynthesis' in window) {
    refreshVoices();
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
  }

  // ------------------------------------------------------------ helpers
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function picture(src) {
    var img = el('img');
    img.src = src;
    img.alt = '';
    img.width = 96;
    img.height = 96;
    img.decoding = 'async';
    return img;
  }
  function wordsIn(category) {
    return data.words.filter(function (w) { return w.category === category; });
  }
  function seenCount(list) {
    var seen = state.seen[state.lang];
    return list.filter(function (w) { return seen[w.id]; }).length;
  }
  function label(w) { return state.lang === 'zh' ? w.zh : w.en; }

  // ------------------------------------------------------------ screens
  function showHome() {
    current.category = null;
    $('back').hidden = true;
    view.textContent = '';
    var grid = el('div', 'grid');
    data.categories.forEach(function (c) {
      var meta = data.category_labels[c];
      var list = wordsIn(c);
      var b = el('button', 'tile');
      b.setAttribute('aria-label', meta.th + ' / ' + meta[state.lang]);
      b.appendChild(picture(meta.icon));
      b.appendChild(el('span', 'label', meta[state.lang]));
      b.appendChild(el('span', 'count', '⭐ ' + seenCount(list) + '/' + list.length));
      b.addEventListener('click', function () { showCategory(c); });
      grid.appendChild(b);
    });
    view.appendChild(grid);
  }

  function showCategory(c) {
    current.category = c;
    current.list = wordsIn(c);
    $('back').hidden = false;
    view.textContent = '';
    var grid = el('div', 'grid words');
    var seen = state.seen[state.lang];
    current.list.forEach(function (w, i) {
      var b = el('button', 'tile');
      b.setAttribute('aria-label', w.th);
      b.appendChild(picture(w.icon));
      if (seen[w.id]) b.appendChild(el('span', 'star', '★'));
      b.addEventListener('click', function () { openCard(i); });
      grid.appendChild(b);
    });
    view.appendChild(grid);
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------ word card
  var lastFocus = null;
  function openCard(i) {
    lastFocus = document.activeElement;
    $('card').hidden = false;
    renderCard(i, true);
    $('speak').focus();
  }
  function renderCard(i, say) {
    var n = current.list.length;
    current.index = (i + n) % n;
    var w = current.list[current.index];
    $('card-img').src = w.icon;
    $('card-word').textContent = label(w);
    $('card-word').lang = state.lang === 'zh' ? 'zh-CN' : 'en';
    $('card-pinyin').textContent = state.lang === 'zh' ? w.pinyin : '';
    $('card-th').textContent = 'ไทย: ' + w.th;
    $('novoice').hidden = canSpeak(state.lang);
    if (!state.seen[state.lang][w.id]) {
      state.seen[state.lang][w.id] = 1;
      saveState();
    }
    if (say) speak(label(w), state.lang);
  }
  function closeCard() {
    $('card').hidden = true;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (current.category) showCategory(current.category);
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
  }

  // ------------------------------------------------------------ language
  function setLang(lang) {
    state.lang = lang;
    saveState();
    var buttons = document.querySelectorAll('.lang');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-checked', String(buttons[i].dataset.lang === lang));
    }
    if (!$('card').hidden) renderCard(current.index, true);
    else if (current.category) showCategory(current.category);
    else showHome();
  }

  // ------------------------------------------------------------ wiring
  function wire() {
    var buttons = document.querySelectorAll('.lang');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function (e) { setLang(e.currentTarget.dataset.lang); });
    }
    $('back').addEventListener('click', showHome);
    $('card-close').addEventListener('click', closeCard);
    $('card').addEventListener('click', function (e) { if (e.target === $('card')) closeCard(); });
    $('prev').addEventListener('click', function () { renderCard(current.index - 1, true); });
    $('next').addEventListener('click', function () { renderCard(current.index + 1, true); });
    $('speak').addEventListener('click', function () { speak(label(current.list[current.index]), state.lang); });
    $('card-pic').addEventListener('click', function () { speak(label(current.list[current.index]), state.lang); });
    $('card-th').addEventListener('click', function () { speak(current.list[current.index].th, 'th'); });
    $('info').addEventListener('click', function () { $('credits').hidden = false; $('credits-close').focus(); });
    $('credits-close').addEventListener('click', function () { $('credits').hidden = true; });
    $('reset').addEventListener('click', function () {
      state.seen = { en: {}, zh: {} };
      saveState();
      $('credits').hidden = true;
      showHome();
    });
    document.addEventListener('keydown', function (e) {
      if ($('card').hidden) {
        if (e.key === 'Escape' && !$('credits').hidden) $('credits').hidden = true;
        return;
      }
      if (e.key === 'Escape') closeCard();
      else if (e.key === 'ArrowLeft') renderCard(current.index - 1, true);
      else if (e.key === 'ArrowRight') renderCard(current.index + 1, true);
    });
  }

  function start() {
    wire();
    setLang(state.lang);
  }

  fetch('data/words.json')
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) { data = d; start(); })
    .catch(function () { view.textContent = '⚠️'; });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* app still works online */ });
    });
  }
})();
