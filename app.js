// Mimi - picture-first words for children (Thai speakers) learning English and Chinese.
// Vanilla JS, no dependencies, no network calls besides loading its own files. Logic lives in logic.js.
// Sound plays only after a tap (owner 2026-10-14): never on open, navigation, language change or a new question.
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
  // Constants and voice preferences live in logic.js (L.SPEECH, L.VOICE_PREFS, L.chooseVoice).
  var settings = L.loadSettings(store);
  var voices = [];
  function refreshVoices() {
    if ('speechSynthesis' in window) voices = window.speechSynthesis.getVoices() || [];
    if (screen.name === 'settings') showSettings();   // voices often arrive late (voiceschanged)
  }
  function voiceFor(lang) { return L.chooseVoice(voices, lang, settings.voices[lang]); }
  function canSpeak(lang) {
    // An empty list means "not loaded yet" or "default voice only": speak anyway with the default voice.
    return 'speechSynthesis' in window && (voices.length === 0 || !!voiceFor(lang));
  }
  function speak(text, lang) {
    if (!('speechSynthesis' in window)) return false;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = VOICE_LANG[lang];
    var v = voiceFor(lang);
    if (v) u.voice = v;          // no match -> the browser's default voice, never silent
    u.rate = settings.rate;
    u.pitch = L.SPEECH.pitch;
    u.volume = L.SPEECH.volume;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return true;
  }
  // Pre-generated audio (pilot): a file listed in audio/manifest.json plays instead of text-to-speech.
  var audioIdx = L.audioIndex(null);
  var playing = null;
  function hasFile(w, lang) { return L.chooseAudio(audioIdx, lang, w.id).kind === 'file'; }
  function speakWord(w, lang) {
    var choice = L.chooseAudio(audioIdx, lang, w.id);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (playing) { playing.pause(); playing = null; }
    if (choice.kind === 'file') {
      playing = new Audio(choice.src);
      var p = playing.play();
      // a missing or unplayable file falls back to text-to-speech, never silent
      if (p && p.catch) p.catch(function () { speak(L.labelOf(w, lang), lang); });
      return true;
    }
    return speak(L.labelOf(w, lang), lang);
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
    var gear = el('button', 'gear', '⚙');
    gear.setAttribute('aria-label', 'ตั้งค่าเสียง (สำหรับผู้ปกครอง) / Voice settings');
    gear.addEventListener('click', showSettings);
    var right = el('div', 'homebar-right');
    right.appendChild(gear);
    right.appendChild(review);
    top.appendChild(right);
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
      replay.addEventListener('click', function () { speakWord(q.word, state.lang); });
      stage.appendChild(replay);
      if (!hasFile(q.word, state.lang) && !canSpeak(state.lang)) {
        // No device voice for this language: show the word so the round is still playable.
        stage.appendChild(el('div', 'novoice', '🔇 ' + label(q.word)));
      }
    } else {
      stage.appendChild(picture(q.word.icon));
    }
    view.appendChild(stage);
    var opts = el('div', round.kind === 'listen' ? 'options pics' : 'options');
    q.options.forEach(function (w, i) {
      var b = el('button', round.kind === 'listen' ? 'opt picopt' : 'opt');
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
    // No auto-speak (owner 2026-10-14): in Listen the child taps 🔊 to hear the word.
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
    speakWord(q.word, state.lang);
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
    renderCard(i);
    $('speak').focus();
  }
  function renderCard(i) {
    var n = current.list.length;
    current.index = (i + n) % n;
    var w = current.list[current.index];
    $('card-img').src = w.icon;
    $('card-word').textContent = label(w);
    $('card-word').lang = VOICE_LANG[state.lang];
    // helper line: pinyin in Chinese mode, the English word (small) in Thai mode, nothing in English mode
    $('card-pinyin').textContent = state.lang === 'zh' ? w.pinyin : state.lang === 'th' ? w.en : '';
    $('card-pinyin').lang = state.lang === 'th' ? 'en' : '';
    // the Thai helper button is redundant in Thai mode (the word itself is Thai)
    $('card-th').hidden = state.lang === 'th';
    $('card-th').textContent = 'ไทย: ' + w.th;
    $('novoice').hidden = hasFile(w, state.lang) || canSpeak(state.lang);
    L.recordSeen(state, state.lang, w.id, Date.now());
    save();
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
    if (!$('card').hidden) renderCard(current.index);
    else if (screen.name === 'round') startRound(round.kind, round.source);
    else if (screen.name === 'category') showCategory(screen.category);
    else if (screen.name === 'settings') showSettings();
    else showHome();
  }

  // ------------------------------------------------------------ settings (parent-facing, plain text)
  var SAMPLE = { en: 'cat', zh: '猫', th: 'แมว' };
  var LANG_NAME = { en: 'English', zh: '中文', th: 'Thai' };
  function showSettings() {
    screen = { name: 'settings', category: null };
    round = null;
    $('back').hidden = false;
    clear();
    var box = el('div', 'settings');
    box.appendChild(el('h2', null, 'ตั้งค่าเสียง / Voice settings'));
    ['en', 'zh', 'th'].forEach(function (lang) {
      var row = el('div', 'set-row');
      var id = 'voice-' + lang;
      var lab = el('label', null, LANG_NAME[lang]);
      lab.htmlFor = id;
      row.appendChild(lab);
      var sel = el('select');
      sel.id = id;
      var auto = voiceFor(lang);
      sel.appendChild(new Option('อัตโนมัติ / auto' + (auto ? ' (' + auto.name + ')' : ' (เสียงเริ่มต้น / default)'), ''));
      var prefix = L.VOICE_PREFS[lang].tag.split('-')[0];
      voices.filter(function (v) { return String(v.lang).replace('_', '-').toLowerCase().split('-')[0] === prefix; })
        .forEach(function (v) { sel.appendChild(new Option(v.name + ' (' + v.lang + ')', v.voiceURI)); });
      sel.value = settings.voices[lang] || '';
      sel.addEventListener('change', function () {
        settings.voices[lang] = sel.value || null;
        L.saveSettings(store, settings);
      });
      row.appendChild(sel);
      var test = el('button', 'pill', 'ฟัง');
      test.setAttribute('aria-label', 'ฟัง ' + LANG_NAME[lang] + ' / test');
      test.addEventListener('click', function () { speak(SAMPLE[lang], lang); });
      row.appendChild(test);
      var nFiles = Object.keys(audioIdx[lang] || {}).length;
      var src = el('span', 'audio-source', nFiles ? 'เสียง: ไฟล์ (' + nFiles + ')' : 'เสียง: TTS');
      src.id = 'audio-source-' + lang;
      row.appendChild(src);
      box.appendChild(row);
    });
    var rateRow = el('div', 'set-row');
    var rl = el('label', null, 'ความเร็ว / rate');
    rl.htmlFor = 'rate';
    var rate = el('input');
    rate.type = 'range'; rate.id = 'rate';
    rate.min = String(L.SPEECH.minRate); rate.max = String(L.SPEECH.maxRate); rate.step = '0.05';
    rate.value = String(settings.rate);
    var rv = el('span', 'rate-value', settings.rate.toFixed(2));
    rate.addEventListener('input', function () {
      settings.rate = Number(rate.value);
      rv.textContent = settings.rate.toFixed(2);
      L.saveSettings(store, settings);
    });
    rateRow.appendChild(rl); rateRow.appendChild(rate); rateRow.appendChild(rv);
    box.appendChild(rateRow);
    var reset = el('button', 'pill', 'คืนค่าเดิม');
    reset.id = 'settings-reset';
    reset.addEventListener('click', function () {
      settings = L.defaultSettings();
      L.saveSettings(store, settings);
      showSettings();
    });
    box.appendChild(reset);
    box.appendChild(el('h3', null, 'เสียงบนเครื่องนี้ / Voices on this device (' + voices.length + ')'));
    var list = el('pre', 'voice-list');
    list.id = 'voice-list';
    list.textContent = voices.length
      ? voices.map(function (v) { return v.name + ' | ' + v.lang + ' | localService=' + v.localService; }).join('\n')
      : '(ไม่มีรายการเสียง / no voices reported by this browser)';
    box.appendChild(list);
    view.appendChild(box);
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
    $('prev').addEventListener('click', function () { renderCard(current.index - 1); });
    $('next').addEventListener('click', function () { renderCard(current.index + 1); });
    $('speak').addEventListener('click', function () { speakWord(current.list[current.index], state.lang); });
    $('card-pic').addEventListener('click', function () { speakWord(current.list[current.index], state.lang); });
    $('card-th').addEventListener('click', function () { speakWord(current.list[current.index], 'th'); });
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
      else if (e.key === 'ArrowLeft') renderCard(current.index - 1);
      else if (e.key === 'ArrowRight') renderCard(current.index + 1);
    });
  }

  function start() {
    wire();
    setLang(state.lang);
  }

  var manifestP = fetch('audio/manifest.json')
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; });           // no audio yet -> text-to-speech only
  fetch('data/words.json')
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) { data = d; return manifestP; })
    .then(function (m) { audioIdx = L.audioIndex(m); start(); })
    .catch(function () { view.textContent = '⚠️'; });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* app still works online */ });
    });
  }
})();
