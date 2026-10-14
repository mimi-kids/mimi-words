// LingoLite - picture-first words for children (Thai speakers) learning English and Chinese.
// Vanilla JS, no dependencies, no network calls besides loading its own files. Logic lives in logic.js.
(function () {
  'use strict';

  var L = window.LingoLogic;
  var VOICE_LANG = { en: 'en-US', zh: 'zh-CN', th: 'th-TH' };
  var ROUND_SIZE = 10;

  var data = null;                 // data/words.json
  var store = storage();
  var state = L.loadState(store);  // see logic.js emptyState()
  var screen = { name: 'home', category: null };
  var current = { list: [], index: 0 };   // word card
  var round = null;                // { kind, source, title, questions, index, score, locked }

  var $ = function (id) { return document.getElementById(id); };
  var view = $('view');

  function storage() {
    try { var s = window.localStorage; s.getItem('x'); return s; } catch (e) {
      var mem = {};  // private mode: progress lives until the tab closes
      return { getItem: function (k) { return mem[k] || null; }, setItem: function (k, v) { mem[k] = String(v); } };
    }
  }
  function save() { L.saveState(store, state); }

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
  function label(w) { return L.labelOf(w, state.lang); }
  function wordButtonContent(b, w) {
    b.appendChild(el('span', 'opt-word', label(w)));
    if (state.lang === 'zh') b.appendChild(el('span', 'opt-pinyin', w.pinyin));
  }
  function clear() {
    view.textContent = '';
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  // ------------------------------------------------------------ screens
  function showHome() {
    screen = { name: 'home', category: null };
    round = null;
    $('back').hidden = true;
    clear();
    var today = L.localDay(new Date());
    var top = el('div', 'homebar');
    var streak = L.currentStreak(state, state.lang, today);
    var s = el('div', 'streak', '🔥 ' + streak);
    s.setAttribute('aria-label', 'เล่นต่อเนื่อง ' + streak + ' วัน / ' + streak + ' day streak');
    top.appendChild(s);
    var queue = L.reviewQueue(state, state.lang, data.words);
    var review = el('button', 'review');
    review.setAttribute('aria-label', 'ทบทวน / Review');
    review.appendChild(el('span', null, '🔁 ' + Math.min(queue.length, ROUND_SIZE)));
    review.disabled = queue.length === 0;
    review.addEventListener('click', function () { startRound('quiz', 'review'); });
    top.appendChild(review);
    view.appendChild(top);
    var grid = el('div', 'grid');
    data.categories.forEach(function (c) {
      var meta = data.category_labels[c];
      var list = wordsIn(c);
      var b = el('button', 'tile');
      b.setAttribute('aria-label', meta.th + ' / ' + meta[state.lang]);
      b.appendChild(picture(meta.icon));
      b.appendChild(el('span', 'label', meta[state.lang]));
      b.appendChild(el('span', 'count', '⭐ ' + L.seenCount(state, state.lang, list) + '/' + list.length));
      b.addEventListener('click', function () { showCategory(c); });
      grid.appendChild(b);
    });
    view.appendChild(grid);
  }

  function modeBar(c, active) {
    var bar = el('div', 'modes');
    [['learn', '👀', 'ดูภาพ / Look'], ['quiz', '❓', 'ทายคำ / Quiz'], ['listen', '👂', 'ฟังแล้วเลือกภาพ / Listen']].forEach(function (m) {
      var b = el('button', 'mode' + (m[0] === active ? ' on' : ''));
      b.setAttribute('aria-label', m[2]);
      b.setAttribute('aria-pressed', String(m[0] === active));
      b.appendChild(el('span', null, m[1]));
      b.addEventListener('click', function () {
        if (m[0] === 'learn') showCategory(c);
        else startRound(m[0], c);
      });
      bar.appendChild(b);
    });
    return bar;
  }

  function showCategory(c) {
    screen = { name: 'category', category: c };
    round = null;
    current.list = wordsIn(c);
    $('back').hidden = false;
    clear();
    view.appendChild(modeBar(c, 'learn'));
    var grid = el('div', 'grid words');
    var p = state.progress[state.lang];
    current.list.forEach(function (w, i) {
      var b = el('button', 'tile');
      b.setAttribute('aria-label', w.th);
      b.appendChild(picture(w.icon));
      if (p[w.id] && p[w.id].seen > 0) b.appendChild(el('span', 'star', '★'));
      b.addEventListener('click', function () { openCard(i); });
      grid.appendChild(b);
    });
    view.appendChild(grid);
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------ rounds (quiz + listen)
  // kind = 'quiz' (picture -> pick the word) or 'listen' (spoken word -> pick the picture).
  // source = a category name. 10 questions, most-missed words first.
  // source 'review' = the review queue (most-missed, then least-recently-seen) across all categories;
  // distractors always come from each word's own category.
  function startRound(kind, source) {
    var words = source === 'review'
      ? L.reviewQueue(state, state.lang, data.words).slice(0, ROUND_SIZE)
      : L.roundWords(state, state.lang, wordsIn(source), ROUND_SIZE);
    if (!words.length) { showHome(); return; }
    round = {
      kind: kind, source: source, index: 0, score: 0, locked: false,
      questions: words.map(function (w) { return { word: w, options: L.pickOptions(data.words, w, state.lang) }; })
    };
    screen = { name: 'round', category: source };
    $('back').hidden = false;
    renderQuestion();
  }

  function renderQuestion() {
    clear();
    var q = round.questions[round.index];
    round.locked = false;
    if (round.source !== 'review') view.appendChild(modeBar(round.source, round.kind));
    view.appendChild(el('div', 'progress', (round.index + 1) + ' / ' + round.questions.length));
    var stage = el('div', 'stage');
    if (round.kind === 'listen') {
      var replay = el('button', 'round listen speak');
      replay.setAttribute('aria-label', 'ฟังอีกครั้ง / Listen again');
      replay.appendChild(el('span', null, '🔊'));
      replay.addEventListener('click', function () { speak(label(q.word), state.lang); });
      stage.appendChild(replay);
      if (!canSpeak(state.lang)) {
        // No device voice for this language: show the word so the round is still playable.
        stage.appendChild(el('div', 'novoice', '🔇 ' + label(q.word)));
      }
    } else {
      stage.appendChild(picture(q.word.icon));
    }
    view.appendChild(stage);
    var opts = el('div', 'options');
    q.options.forEach(function (w, i) {
      var b = el('button', round.kind === 'listen' ? 'opt pic' : 'opt');
      if (round.kind === 'listen') {
        b.setAttribute('aria-label', 'ภาพ ' + (i + 1) + ' / picture ' + (i + 1));
        b.appendChild(picture(w.icon));
      } else {
        wordButtonContent(b, w);
      }
      b.dataset.id = w.id;
      b.addEventListener('click', function () { answer(b, w); });
      opts.appendChild(b);
    });
    view.appendChild(opts);
    if (round.kind === 'listen') {
      var r = round;
      setTimeout(function () { if (r === round && !r.locked) speak(label(q.word), state.lang); }, 250);
    }
  }

  function answer(button, chosen) {
    if (round.locked) return;
    round.locked = true;
    var q = round.questions[round.index];
    var ok = chosen.id === q.word.id;
    L.recordAnswer(state, state.lang, q.word.id, ok, Date.now());
    save();
    var buttons = view.querySelectorAll('.opt');
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].dataset.id === q.word.id) buttons[i].classList.add('right');
    }
    if (ok) {
      round.score += 1;
    } else {
      button.classList.add('wrong', 'shake');
    }
    speak(label(q.word), state.lang);
    var r = round;
    setTimeout(function () { nextQuestion(r); }, ok ? 1300 : 2200);
  }

  function nextQuestion(r) {
    if (!round || r !== round) return;   // the child left or restarted the round meanwhile
    round.index += 1;
    if (round.index < round.questions.length) renderQuestion();
    else showRoundEnd();
  }

  function showRoundEnd() {
    clear();
    var box = el('div', 'done');
    box.appendChild(el('div', 'score', '⭐ ' + round.score + ' / ' + round.questions.length));
    var row = el('div', 'row');
    var again = el('button', 'round big');
    again.setAttribute('aria-label', 'อีกครั้ง / Again');
    again.appendChild(el('span', null, '🔁'));
    var kind = round.kind, source = round.source;
    again.addEventListener('click', function () { startRound(kind, source); });
    var home = el('button', 'round big');
    home.setAttribute('aria-label', 'หน้าแรก / Home');
    home.appendChild(el('span', null, '🏠'));
    home.addEventListener('click', showHome);
    row.appendChild(again);
    row.appendChild(home);
    box.appendChild(row);
    view.appendChild(box);
    again.focus();
  }

  // ------------------------------------------------------------ word card (learn mode)
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
    L.recordSeen(state, state.lang, w.id, Date.now());
    save();
    if (say) speak(label(w), state.lang);
  }
  function closeCard() {
    $('card').hidden = true;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (screen.name === 'category') showCategory(screen.category);
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
  }

  // ------------------------------------------------------------ language
  function setLang(lang) {
    state.lang = lang;
    save();
    var buttons = document.querySelectorAll('.lang');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-checked', String(buttons[i].dataset.lang === lang));
    }
    if (!$('card').hidden) renderCard(current.index, true);
    else if (screen.name === 'round') startRound(round.kind, round.source);
    else if (screen.name === 'category') showCategory(screen.category);
    else showHome();
  }

  function goBack() {
    if (screen.name === 'round' && data.categories.indexOf(screen.category) >= 0) showCategory(screen.category);
    else showHome();
  }

  // ------------------------------------------------------------ wiring
  function wire() {
    var buttons = document.querySelectorAll('.lang');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function (e) { setLang(e.currentTarget.dataset.lang); });
    }
    $('back').addEventListener('click', goBack);
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
      var lang = state.lang;
      state = L.emptyState();
      state.lang = lang;
      save();
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
