/* CELPIP Flashcards — vanilla JS, no build step. Progress is stored in this browser only. */
(() => {
'use strict';

/* ---------- storage ---------- */
const KEY = 'celpip-flash-v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
let S = Object.assign({ cards: {}, starred: [], days: {}, xp: 0, goal: 20, dir: 'en', theme: null, qlen: 10, levels: [1, 2, 3], skill: 'all', badges: {}, sound: true, seenIntro: false, lastWelcome: '' }, load());
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
FX.soundOn = S.sound;

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const app = $('#app');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY = 864e5;
const today = () => new Date().toLocaleDateString('en-CA');
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const PCOL = { 1: 'var(--p1)', 2: 'var(--p2)', 3: 'var(--p3)' };
const INTERVAL = [0, 1, 2, 4, 8, 16]; // days for box 1..5
const LEVELS = [
  { id: 1, name: 'Strong', clb: 'CLB 7–8', fa: 'قوی', icon: '🌱' },
  { id: 2, name: 'Advanced', clb: 'CLB 9', fa: 'پیشرفته', icon: '🚀' },
  { id: 3, name: 'Expert', clb: 'CLB 10+', fa: 'حرفه‌ای', icon: '👑' },
];
const SKILLS = [
  { id: 'all', name: 'All skills', fa: 'همه', icon: '🌐', tip: 'Mix of everything. Pick a skill tab to focus your practice on one part of the test.' },
  { id: 'R', name: 'Reading', fa: 'ریدینگ', icon: '📖', tip: 'Answer choices paraphrase the passage. Knowing precise words like <b>concede</b> or <b>downplay</b> lets you spot the right option fast.' },
  { id: 'W', name: 'Writing', fa: 'رایتینگ', icon: '✍️', tip: 'Raters score range and precision. Use two or three of these per paragraph — correctly — and your vocabulary score climbs.' },
  { id: 'S', name: 'Speaking', fa: 'اسپیکینگ', icon: '🗣️', tip: 'Natural phrases buy you thinking time and sound fluent. Say each example sentence out loud — tap 🔊 and repeat.' },
  { id: 'L', name: 'Listening', fa: 'لیسنینگ', icon: '🎧', tip: 'Speakers use idioms and news language you will not see in the questions. Recognise them instantly and you will not lose the thread.' },
];
const MOTTOS = [
  ['Moe, every word you learn today is a step closer to your Canadian PR. 🇨🇦', 'هر کلمه‌ای که امروز یاد می‌گیری، یک قدم تو را به اقامت کانادا نزدیک‌تر می‌کند.'],
  ['Champions aren\u2019t made on test day, Moe. They\u2019re made in sessions like this one. 🏆', 'قهرمان‌ها روز آزمون ساخته نمی‌شوند؛ در همین تمرین‌های روزانه ساخته می‌شوند.'],
  ['CLB 10 isn\u2019t luck — it\u2019s twenty cards a day, every day. You\u2019ve got this, Moe! 💪', 'نمره‌ی ۱۰ شانسی نیست؛ حاصل بیست کارت در روز، هر روز است.'],
  ['Small steps every day, a big score on test day. Let\u2019s go, Moe! 🔥', 'قدم‌های کوچک هر روز، نمره‌ی بزرگ در روز آزمون.'],
  ['The examiner will notice your vocabulary, Moe. Make every word count. ✨', 'مصحح دامنه‌ی واژگانت را می‌بیند؛ هر کلمه را حساب‌شده به کار ببر.'],
  ['Your future in Canada is being written right now — one word at a time. 🍁', 'آینده‌ی تو در کانادا همین حالا نوشته می‌شود، کلمه به کلمه.'],
  ['Discipline beats talent when talent doesn\u2019t practise. Keep going, Moe! 🚀', 'نظم و تمرین، از استعدادِ بی‌تمرین جلو می‌زند.'],
  ['Moe, the hardest part was starting. You already did that. Now finish strong. 🏁', 'سخت‌ترین قسمت شروع کردن بود که انجامش دادی؛ حالا قوی تمامش کن.'],
];
const dayIndex = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
let mottoShift = 0;
const motto = () => MOTTOS[(dayIndex() + mottoShift) % MOTTOS.length];
const active = id => { const w = WORDS[id]; return S.levels.includes(w.l) && (S.skill === 'all' || SECTIONS[w.s].skills.includes(S.skill)); };
const faNum = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

const card = id => S.cards[id] || { box: 0, due: 0, r: 0, w: 0 };
const status = id => { const c = card(id); return c.box === 0 ? 'new' : c.box >= 5 ? 'mastered' : 'learning'; };
const isDue = id => { const c = card(id); return c.box > 0 && c.due <= Date.now(); };
const starred = id => S.starred.includes(id);

const level = () => Math.floor(S.xp / 500) + 1;
const MILESTONES = [3, 7, 14, 30, 50, 100];
function logActivity(xp) {
  const d = today(), before = S.days[d] || 0, lvBefore = level();
  S.days[d] = before + 1;
  S.xp += xp;
  save();
  updateXP();
  const later = fn => setTimeout(fn, 450);
  if (before === 0) {
    const st = streak();
    if (MILESTONES.includes(st)) later(() => FX.celebrate({ icon: '🔥', title: `${st}-day streak!`, sub: `${st} days in a row, Moe. That's how CLB 10 is built.`, fa: `${faNum(st)} روز پشت سر هم! عالیه!`, kind: 'streak', sound: 'goal', fireworks: st >= 7 }));
  }
  if (before < S.goal && S.days[d] >= S.goal) later(() => FX.celebrate({ img: 'images/moe.jpg', icon: '🎯', title: 'Goal smashed, Moe!', sub: `${S.goal} reviews today. Your future self says thank you.`, fa: 'هدف امروز انجام شد! آفرین!', kind: 'goal', sound: 'goal', fireworks: true }));
  if (level() > lvBefore) later(() => FX.celebrate({ img: 'images/moe.jpg', icon: '⭐', title: `Level ${level()} unlocked!`, sub: `${S.xp} XP earned. You're getting stronger every day.`, fa: `سطح ${faNum(level())} باز شد!`, kind: 'level', sound: 'level' }));
  checkBadges({ hour: new Date().getHours() });
}

/* ---------- badges ---------- */
const masteredCount = () => WORDS.filter(w => status(w.id) === 'mastered').length;
const BADGES = [
  { id: 'first', icon: '👣', name: 'First step', hint: 'Review your first card', test: () => Object.keys(S.cards).length >= 1 },
  { id: 'goal', icon: '🏹', name: 'Goal getter', hint: 'Reach your daily goal', test: () => Object.values(S.days).some(n => n >= S.goal) },
  { id: 's3', icon: '🔥', name: 'On a roll', hint: 'Practise 3 days in a row', test: () => streak() >= 3 },
  { id: 's7', icon: '🌟', name: 'Week warrior', hint: '7-day streak', test: () => streak() >= 7 },
  { id: 's30', icon: '🏅', name: 'Unbreakable', hint: '30-day streak', test: () => streak() >= 30 },
  { id: 'm10', icon: '🥉', name: '10 mastered', hint: 'Master 10 words', test: () => masteredCount() >= 10 },
  { id: 'm50', icon: '🥈', name: '50 mastered', hint: 'Master 50 words', test: () => masteredCount() >= 50 },
  { id: 'm100', icon: '🥇', name: '100 mastered', hint: 'Master 100 words', test: () => masteredCount() >= 100 },
  { id: 'p1', icon: '🎯', name: 'Priority 1 done', hint: 'Master every Priority 1 word', test: () => WORDS.filter(w => w.p === 1).every(w => status(w.id) === 'mastered') },
  { id: 'mall', icon: '👑', name: 'Vocabulary master', hint: 'Master all words', test: () => masteredCount() >= WORDS.length },
  { id: 'speak', icon: '🗣️', name: 'Speaking starter', hint: 'Review 10 speaking phrases', test: () => WORDS.filter(w => SECTIONS[w.s].skills.includes('S') && card(w.id).box > 0).length >= 10 },
  { id: 'xp1000', icon: '⭐', name: '1,000 XP', hint: 'Earn 1,000 XP', test: () => S.xp >= 1000 },
  { id: 'perfect', icon: '💯', name: 'Perfect quiz', hint: 'Score 100% on a quiz', test: x => !!x.perfect },
  { id: 'combo10', icon: '⚡', name: 'Unstoppable', hint: '10 correct answers in a row', test: x => (x.combo || 0) >= 10 },
  { id: 'owl', icon: '🦉', name: 'Night owl', hint: 'Practise after 10 pm', test: x => x.hour >= 22 },
  { id: 'bird', icon: '🐦', name: 'Early bird', hint: 'Practise before 8 am', test: x => x.hour != null && x.hour < 8 },
];
function checkBadges(extra = {}) {
  S.badges = S.badges || {};
  let k = 0;
  BADGES.forEach(b => {
    if (S.badges[b.id] || !b.test(extra)) return;
    S.badges[b.id] = today(); save();
    setTimeout(() => { FX.play('badge'); FX.pop(b.icon, b.name, 'Badge unlocked! 🎉'); }, 600 + k++ * 1200);
  });
}
function streak() {
  let n = 0, t = new Date();
  if (!S.days[today()]) t = new Date(Date.now() - DAY); // streak still alive if you practised yesterday
  while (S.days[t.toLocaleDateString('en-CA')]) { n++; t = new Date(t - DAY); }
  return n;
}
function grade(id, result) { // result: 'again' | 'hard' | 'good'
  const c = Object.assign({}, card(id)), boxBefore = c.box;
  if (result === 'again') { c.box = 1; c.due = Date.now(); c.w++; }
  else if (result === 'hard') { c.box = Math.max(1, c.box); c.due = Date.now() + DAY; c.r++; }
  else { c.box = Math.min(5, c.box + 1); c.due = Date.now() + INTERVAL[c.box] * DAY; c.r++; }
  S.cards[id] = c;
  const xp = result === 'good' ? 10 : result === 'hard' ? 5 : 2;
  logActivity(xp);
  return { xp, mastered: c.box === 5 && boxBefore < 5 };
}

/* ---------- decks ---------- */
function deck(key) {
  const d = deckRaw(key);
  if (key !== 'starred') d.ids = d.ids.filter(active);
  return d;
}
function deckRaw(key) {
  if (key === 'all') return { key, title: 'All words', fa: 'همه‌ی کلمات', ids: WORDS.map(w => w.id), color: 'var(--accent)', icon: '📚' };
  if (key === 'starred') return { key, title: 'Starred words', fa: 'کلمات ستاره‌دار', ids: S.starred.slice(), color: '#e3a008', icon: '⭐' };
  if (key === 'due') return { key, title: 'Due for review', fa: 'نوبت مرور', ids: WORDS.filter(w => isDue(w.id)).map(w => w.id), color: 'var(--accent)', icon: '🔁' };
  if (key[0] === 'p') { const p = PRIORITIES.find(x => x.id === +key.slice(1)); return { key, title: `Priority ${p.id} · ${p.title}`, fa: p.fa, desc: p.desc, ids: WORDS.filter(w => w.p === p.id).map(w => w.id), color: PCOL[p.id], icon: ['', '🔥', '📖', '🏆'][p.id] }; }
  const s = SECTIONS[+key.slice(1)];
  return { key, title: s.title, fa: s.fa, ids: WORDS.filter(w => w.s === s.id).map(w => w.id), color: PCOL[s.priority], icon: s.icon, prio: s.priority };
}
function counts(ids) {
  const c = { new: 0, learning: 0, mastered: 0, due: 0 };
  ids.forEach(id => { c[status(id)]++; if (isDue(id)) c.due++; });
  return c;
}
const bar = (ids) => { const c = counts(ids), n = ids.length || 1; return `<div class="bar"><i class="m" style="width:${c.mastered / n * 100}%"></i><i class="l" style="width:${c.learning / n * 100}%"></i></div>`; };

/* ---------- speech ---------- */
let voice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices();
  voice = vs.find(v => v.lang === 'en-CA') || vs.find(v => v.lang === 'en-US' && /natural|google|samantha/i.test(v.name)) || vs.find(v => v.lang.startsWith('en')) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\s*\/\s*/g, ', '));
  if (voice) u.voice = voice;
  u.lang = voice ? voice.lang : 'en-CA'; u.rate = .92;
  speechSynthesis.speak(u);
}

/* ---------- blanking the word inside its example ---------- */
const SKIP = new Set(['be', 'a', 'an', 'the', 'i']);
const ARTICLES = new Set(['a', 'an', 'the']);
const IRREG = { fall: '(?:fall|falls|fell|fallen|falling)', go: '(?:go|goes|went|gone|going)', bring: '(?:bring|brings|brought|bringing)', meet: '(?:meet|meets|met|meeting)', take: '(?:take|takes|took|taken|taking)', make: '(?:make|makes|made|making)', set: 'set[\\w]*', hit: 'hit[\\w]*', cut: 'cut[\\w]*' };
function findSpan(w) {
  const tokens = w.w.toLowerCase().replace(/\.\.\./g, '').split(/\s+/).filter((t, k) => t && (k === 0 || !ARTICLES.has(t)));
  const pat = tokens.map(t => {
    if (IRREG[t]) return IRREG[t];
    if (SKIP.has(t)) return t === 'be' ? '(?:be|is|are|was|were|been)' : t;
    let stem = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (t.length > 4) stem = stem.replace(/(e|y|ate)$/, '');
    return stem + "[\\w'-]*";
  }).join("\\s+(?:[\\w'-]+\\s+){0,3}?");
  const m = new RegExp('\\b' + pat + '\\b', 'i').exec(w.ex);
  return m ? { start: m.index, end: m.index + m[0].length, text: m[0] } : null;
}
WORDS.forEach(w => { w.span = findSpan(w); });
const highlight = w => w.span ? esc(w.ex.slice(0, w.span.start)) + '<mark>' + esc(w.span.text) + '</mark>' + esc(w.ex.slice(w.span.end)) : esc(w.ex);
const blanked = w => esc(w.ex.slice(0, w.span.start)) + '<span class="gap">?</span>' + esc(w.ex.slice(w.span.end));

/* ---------- confetti ---------- */
function confetti() { FX.confetti(); }
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = msg; document.body.appendChild(t);
  setTimeout(() => t.classList.add('out'), 1400); setTimeout(() => t.remove(), 1800);
}

/* ---------- router ---------- */
let keyHandler = null;
function go(view, arg) {
  keyHandler = null;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.go === (['list', 'stats'].includes(view) ? view : 'home')));
  ({ home, deckView, study, quiz, list, stats })[view](arg);
  window.scrollTo(0, 0);
  if (!FX.reduced) { app.classList.remove('view-in'); void app.offsetWidth; app.classList.add('view-in'); }
}
function updateXP(animate = true) {
  const n = $('#xpNum'); if (!n) return;
  const from = +n.dataset.v || 0; n.dataset.v = S.xp;
  if (animate && from !== S.xp) FX.countUp(n, S.xp, { from, dur: 700 }); else n.textContent = S.xp;
  $('#lvNum').textContent = level();
}
$('#soundBtn').onclick = () => { S.sound = !S.sound; FX.soundOn = S.sound; save(); paintSound(); if (S.sound) FX.play('correct'); };
const paintSound = () => { $('#soundBtn').textContent = S.sound ? '🔊' : '🔇'; $('#soundBtn').title = S.sound ? 'Sound on' : 'Sound off'; };
paintSound();
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b && b.closest('.top')) go(b.dataset.go); });
document.addEventListener('keydown', e => { if (FX.isOpen()) return; if (keyHandler && !e.metaKey && !e.ctrlKey && !e.altKey) keyHandler(e); });

/* ---------- theme ---------- */
function applyTheme() {
  if (S.theme) document.documentElement.dataset.theme = S.theme; else delete document.documentElement.dataset.theme;
  const dark = S.theme ? S.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const b = document.getElementById('themeBtn'); if (b) b.textContent = dark ? '☀️' : '🌙';
}
$('#themeBtn').onclick = () => {
  const dark = S.theme ? S.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  S.theme = dark ? 'light' : 'dark'; save(); applyTheme();
};
applyTheme();

/* ---------- HOME ---------- */
function ring(done, goal) {
  const r = 34, c = 2 * Math.PI * r, f = Math.min(1, done / goal);
  return `<svg class="ring" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="${r}" class="ring-bg"/><circle cx="42" cy="42" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${FX.reduced ? c * (1 - f) : c}" data-off="${c * (1 - f)}"/></svg>`;
}
function filterBar(onChange) {
  const sk = SKILLS.find(x => x.id === S.skill);
  const html = `<div class="filterbar">
    <div class="skills" role="tablist">${SKILLS.map(x => `<button role="tab" class="skill ${S.skill === x.id ? 'on' : ''}" data-skill="${x.id}"><span class="sk-ic">${x.icon}</span><span>${x.name}</span><small class="fa">${x.fa}</small></button>`).join('')}</div>
    <div class="levels"><span class="lv-label">Level</span>${LEVELS.map(l => `<button class="lv ${S.levels.includes(l.id) ? 'on' : ''}" data-lv="${l.id}" aria-pressed="${S.levels.includes(l.id)}">${l.icon} ${l.name} <small>${l.clb}</small></button>`).join('')}</div>
    <div class="tip"><span>${sk.icon}</span><p>${sk.tip}</p></div>
  </div>`;
  const wire = root => {
    root.querySelectorAll('[data-skill]').forEach(b => b.onclick = () => { S.skill = b.dataset.skill; save(); onChange(); });
    root.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => {
      const id = +b.dataset.lv;
      if (S.levels.includes(id)) { if (S.levels.length === 1) return toast('Pick at least one level'); S.levels = S.levels.filter(x => x !== id); }
      else S.levels = S.levels.concat(id).sort();
      save(); onChange();
    });
  };
  return { html, wire };
}
function home() {
  const all = WORDS.map(w => w.id).filter(active), c = counts(all), done = S.days[today()] || 0, st = streak();
  const [mEn, mFa] = motto();
  const fb = filterBar(home);
  const lv = level(), lvlPct = (S.xp % 500) / 5;
  let html = `
  <section class="hero">
    <div class="moe">
      <div class="moe-pic"><img src="images/moe.jpg" alt="Moe" width="180" height="180"><span class="moe-badge">🎯 CLB 10</span></div>
      <div class="moe-name"><b>Moe</b><span>Road to Canadian PR 🍁</span></div>
    </div>
    <div class="hero-main">
      <div class="hello-row"><div class="hello">${done >= S.goal ? 'Daily goal done — great work! 🎉' : done ? 'Keep going, you are on a roll!' : 'Ready for today’s practice?'}</div><button class="hello more" id="nextMotto" title="Another motivation">↻ another one</button></div>
      <h1 class="motto">${esc(mEn)}</h1>
      <p class="fa hero-fa" dir="rtl">${esc(mFa)}</p>
      <div class="hero-btns">
        <button class="btn primary big-btn" id="startDue">${c.due ? `▶ Review ${c.due} due card${c.due > 1 ? 's' : ''}` : '▶ Start learning'}</button>
        <button class="btn ghost big-btn" id="quickQuiz">⚡ Quick quiz</button>
      </div>
    </div>
    <div class="goal">
      <div class="goal-ring">${ring(done, S.goal)}<div><b>${done}</b><span>/ ${S.goal}</span></div></div>
      <div class="goal-txt">Today's goal<br><button class="link" id="goalBtn">change</button></div>
    </div>
  </section>
  <div class="strip">
    <div class="stat s-fire"><b><span class="flame">🔥</span> <span class="num" data-n="${st}">0</span></b><span>day streak</span></div>
    <div class="stat s-xp"><b>⭐ <span class="num" data-n="${S.xp}">0</span></b><span>XP · level ${lv}</span><div class="mini"><i style="width:${lvlPct}%"></i></div></div>
    <div class="stat s-good"><b>🏆 <span class="num" data-n="${c.mastered}">0</span></b><span>mastered</span></div>
    <div class="stat s-learn"><b>🌱 <span class="num" data-n="${c.learning}">0</span></b><span>learning · ${c.new} new</span></div>
  </div>
  ${fb.html}
  <p class="showing">${all.length} words in your selection · <span class="fa">${faNum(all.length)} کلمه</span></p>`;
  PRIORITIES.forEach(p => {
    const ids = WORDS.filter(w => w.p === p.id && active(w.id)).map(w => w.id), pc = counts(ids);
    const secs = SECTIONS.filter(s => s.priority === p.id && deck('s' + s.id).ids.length);
    if (!secs.length) return;
    html += `<div class="prio-label" style="--c:${PCOL[p.id]}"><h2><span class="dot"></span>Priority ${p.id} · ${esc(p.title)}</h2><button class="link" data-deck="p${p.id}">Study all ${ids.length} →</button></div>
    <p class="prio-desc">${esc(p.desc)} <span class="muted">${pc.mastered}/${ids.length} mastered</span></p><div class="decks">`;
    secs.forEach(s => { html += deckCard(deck('s' + s.id)); });
    html += '</div>';
  });
  html += `<div class="prio-label" style="--c:#e3a008"><h2><span class="dot"></span>Your decks</h2></div><div class="decks">${deckCard(deck('all'))}${deckCard(deck('starred'))}</div>`;
  app.innerHTML = html;
  fb.wire(app);
  app.querySelectorAll('.num').forEach(n => FX.countUp(n, +n.dataset.n, { dur: 1000 }));
  requestAnimationFrame(() => requestAnimationFrame(() => { const r = app.querySelector('.ring-fg'); if (r) r.style.strokeDashoffset = r.dataset.off; }));
  FX.stagger(app, '.stat, .skill, .deck', 30);
  $('#nextMotto').onclick = () => { mottoShift++; const [e, f] = motto(); const m = app.querySelector('.motto'); m.textContent = e; app.querySelector('.hero-fa').textContent = f; FX.play('tap'); if (!FX.reduced) { m.classList.remove('swap'); void m.offsetWidth; m.classList.add('swap'); } };
  app.querySelectorAll('[data-deck]').forEach(b => b.onclick = () => go('deckView', b.dataset.deck));
  $('#startDue').onclick = () => c.due ? go('study', { key: 'due' }) : go('study', { key: 'all' });
  $('#quickQuiz').onclick = () => go('quiz', { key: 'all', mode: 'meaning', n: 10 });
  $('#goalBtn').onclick = () => { const g = [10, 20, 30, 50]; S.goal = g[(g.indexOf(S.goal) + 1) % g.length]; save(); home(); };
}
function deckCard(d) {
  const c = counts(d.ids), n = d.ids.length;
  return `<button class="deck" data-deck="${d.key}" style="--c:${d.color}">
    <div class="deck-top"><span class="deck-ic">${d.icon}</span>${c.due ? `<span class="due-badge">${c.due} due</span>` : c.mastered === n && n ? '<span class="done-badge">✓ done</span>' : ''}</div>
    <div class="t">${esc(d.title)}</div><div class="fa">${esc(d.fa)}</div>
    ${bar(d.ids)}
    <div class="meta"><span>${n} words</span><span>${c.mastered} mastered</span></div></button>`;
}

/* ---------- DECK ---------- */
function deckView(key) {
  const d = deck(key), c = counts(d.ids);
  if (!d.ids.length && key !== 'starred') { app.innerHTML = `<button class="back" id="bk">← Back</button><div class="empty card-empty"><div class="emoji">🔍</div><h2>No words for this skill and level</h2><p>Change the skill tab or turn on more levels on the Practice page.</p></div>`; $('#bk').onclick = () => go('home'); return; }
  if (!d.ids.length) { app.innerHTML = `<button class="back" id="bk">← Back</button><div class="empty card-empty"><div class="emoji">⭐</div><h2>No starred words yet</h2><p>Tap the ☆ on any card or in the Word list to collect the words you find hardest.</p></div>`; $('#bk').onclick = () => go('home'); return; }
  const canGap = d.ids.filter(id => WORDS[id].span).length >= 4;
  app.innerHTML = `<button class="back" id="bk">← All decks</button>
  <div class="deck-hero" style="--c:${d.color}">
    <div class="deck-ic big">${d.icon}</div>
    <div><h1>${esc(d.title)}</h1><div class="fa sub">${esc(d.fa)}</div>${d.desc ? `<p class="sub">${esc(d.desc)}</p>` : ''}</div>
  </div>
  <div class="strip three">
    <div class="stat"><b>${c.new}</b><span>new</span></div>
    <div class="stat"><b>${c.learning}</b><span>learning</span></div>
    <div class="stat"><b>${c.mastered}</b><span>mastered</span></div>
  </div>${bar(d.ids)}
  <div class="modes">
    <button class="mode m1" data-m="study"><span class="ic">🃏</span><span><b>Flashcards</b><span>Flip, then rate yourself. Smart review brings back what you forget.</span><span class="fa">کارت‌ها را برگردان و خودت را ارزیابی کن</span></span></button>
    <button class="mode m2" data-m="meaning"><span class="ic">🎯</span><span><b>Meaning quiz</b><span>See the English word, choose the right Farsi meaning.</span><span class="fa">معنی درست را انتخاب کن</span></span></button>
    <button class="mode m3" data-m="gap" ${canGap ? '' : 'disabled'}><span class="ic">🧩</span><span><b>Fill the gap</b><span>Pick the word that completes a real sentence — trains Writing.</span><span class="fa">جای خالی جمله را پر کن</span></span></button>
    <button class="mode m4" data-m="type" ${canGap ? '' : 'disabled'}><span class="ic">⌨️</span><span><b>Type it</b><span>From the Farsi meaning, type the English word. Hardest mode.</span><span class="fa">از روی معنی فارسی، کلمه را تایپ کن</span></span></button>
  </div>
  <div class="opts">Quiz length <span class="seg" id="qlen">${[10, 20, 30].map(n => `<button data-n="${n}" class="${S.qlen === n ? 'on' : ''}">${n}</button>`).join('')}</span>
  Card front <span class="seg" id="dir"><button data-d="en" class="${S.dir === 'en' ? 'on' : ''}">English</button><button data-d="fa" class="${S.dir === 'fa' ? 'on' : ''}">فارسی</button></span></div>`;
  $('#bk').onclick = () => go('home');
  FX.stagger(app, '.stat, .mode', 50);
  app.querySelectorAll('#qlen button').forEach(b => b.onclick = () => { S.qlen = +b.dataset.n; save(); deckView(key); });
  app.querySelectorAll('#dir button').forEach(b => b.onclick = () => { S.dir = b.dataset.d; save(); deckView(key); });
  app.querySelectorAll('.mode').forEach(b => b.onclick = () => b.dataset.m === 'study' ? go('study', { key }) : go('quiz', { key, mode: b.dataset.m, n: S.qlen }));
}

/* ---------- STUDY (flashcards) ---------- */
function study({ key }) {
  const d = deck(key);
  const due = shuffle(d.ids.filter(isDue));
  const fresh = d.ids.filter(id => status(id) === 'new').slice(0, 15);
  let queue = due.concat(fresh), practice = false;
  if (!queue.length) { queue = pick(d.ids, 20); practice = true; }
  const total = queue.length, tally = { again: 0, hard: 0, good: 0 };
  let done = 0, flipped = false, cur, busy = false, prevPct = 0, killUndo = null;

  function show() {
    if (!queue.length) return finish();
    cur = queue.shift(); flipped = false;
    const w = WORDS[cur], st = status(cur), front = S.dir === 'fa'
      ? `<div class="meaning fa">${esc(w.fa)}</div><div class="pos">${esc(w.pos)}</div>`
      : `<div class="word">${esc(w.w)}</div><div class="pos">${esc(w.pos)}</div>`;
    app.innerHTML = `<div class="sess-top"><button class="back" id="bk">✕</button><div class="progress"><i style="width:${prevPct}%"></i></div><span class="count">${done}/${total}</span></div>
    ${practice ? '<p class="hint">Nothing is due in this deck — here is a free practice round.</p>' : ''}
    <div class="scene enter" id="scene"><div class="stamp good">GOT IT ✓</div><div class="stamp again">AGAIN ↺</div><div class="stamp hard">HARD 🤔</div><div class="card" id="card">
      <div class="face a" style="--c:${PCOL[w.p]}">
        <div class="tag"><span class="pill p${w.p}">P${w.p} · ${esc(SECTIONS[w.s].title)}</span><span class="lvl l${w.l}">${LEVELS[w.l - 1].icon} ${LEVELS[w.l - 1].name}</span><span class="state ${st}">${st === 'new' ? '✨ new' : st === 'mastered' ? '🏆 mastered' : '🌱 box ' + card(cur).box}</span></div>
        <div class="mid">${front}</div>
        <div class="hint">Tap to flip · برای دیدن جواب ضربه بزن</div>
      </div>
      <div class="face b" style="--c:${PCOL[w.p]}">
        <div class="tag"><span class="pill p${w.p}">${esc(w.pos)}</span><span><button class="star ${starred(cur) ? 'on' : ''}" id="star" title="Star">${starred(cur) ? '★' : '☆'}</button> <button class="speak" id="say" title="Listen">🔊</button></span></div>
        <div class="mid"><div class="word">${esc(w.w)}</div><div class="meaning fa">${esc(w.fa)}</div><div class="example">${highlight(w)}</div></div>
      </div>
    </div></div>
    <button class="btn primary flipbtn" id="flip">Show answer</button>
    <div class="rate hidden" id="rate">
      <button class="again" data-r="again">😕 Again<small>didn't know</small></button>
      <button class="hard" data-r="hard">🤔 Hard<small>tomorrow</small></button>
      <button class="good" data-r="good">😎 Got it<small>${INTERVAL[Math.min(5, card(cur).box + 1)]} day${INTERVAL[Math.min(5, card(cur).box + 1)] > 1 ? 's' : ''}</small></button>
    </div>
    <div class="swipe-hint hidden" id="swHint">👈 Again · 👆 Hard · Got it 👉</div>
    <div class="keys"><kbd>Space</kbd> flip · <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> rate · <kbd>S</kbd> listen</div>`;
    busy = false;
    const pct = done / total * 100; requestAnimationFrame(() => { const b = app.querySelector('.progress i'); if (b) b.style.width = pct + '%'; }); prevPct = pct;
    FX.swipeable($('#scene'), { enabled: () => flipped && !busy, onSwipe: d => rate(d, true), onTap: () => { if (!busy) flip(); } });
    $('#bk').onclick = () => go('deckView', key === 'due' ? 'all' : key);
    $('#flip').onclick = flip;
    $('#say').onclick = () => speak(w.w + '. ' + w.ex);
    $('#star').onclick = () => { toggleStar(cur); $('#star').classList.toggle('on'); $('#star').textContent = starred(cur) ? '★' : '☆'; };
    app.querySelectorAll('#rate button').forEach(b => b.onclick = () => rate(b.dataset.r));
  }
  function flip() {
    flipped = !flipped; $('#card').classList.toggle('flip', flipped); FX.play('flip');
    $('#flip').classList.toggle('hidden', flipped); $('#rate').classList.toggle('hidden', !flipped);
    $('#swHint').classList.toggle('hidden', !flipped || (S.swipes || 0) >= 6);
  }
  async function rate(r, swiped) {
    if (!flipped || busy) return;
    busy = true;
    if (killUndo) killUndo();
    const id = cur, w = WORDS[id], snap = { card: S.cards[id] ? Object.assign({}, S.cards[id]) : null, xp: S.xp, day: S.days[today()] || 0, queue: queue.slice(), done, tally: Object.assign({}, tally), pct: prevPct };
    const src = swiped ? $('#scene') : app.querySelector('#rate .' + r);
    if (swiped) { S.swipes = (S.swipes || 0) + 1; }
    const g = grade(id, r); tally[r]++;
    if (r === 'again') queue.splice(Math.min(3, queue.length), 0, id); else done++;
    FX.play(r === 'good' ? 'good' : r === 'hard' ? 'tap' : 'swoosh'); FX.haptic(r === 'good' ? 12 : 25);
    if (r === 'good') FX.burstAt(src, { count: 12, spread: 70 });
    FX.flyXP(src, `+${g.xp} XP`, $('#xpPill'));
    if (g.mastered) { FX.pop('🏆', `“${w.w}” mastered!`, 'Word mastered'); FX.burstAt(src, { emoji: ['✨', '🏆', '⭐'], count: 10 }); }
    await FX.flyOut($('#scene'), r);
    show();
    killUndo = FX.undo(`${r === 'good' ? '😎 Got it' : r === 'hard' ? '🤔 Hard' : '😕 Again'} · ${esc(w.w)}`, () => {
      if (snap.card) S.cards[id] = snap.card; else delete S.cards[id];
      S.xp = snap.xp; S.days[today()] = snap.day; save(); updateXP();
      queue.length = 0; queue.push(id, ...snap.queue);
      done = snap.done; Object.assign(tally, snap.tally); prevPct = snap.pct;
      FX.play('tap'); show();
    });
  }
  function finish() {
    if (killUndo) killUndo();
    window.scrollTo(0, 0);
    FX.confetti(); FX.play('combo');
    const pct = Math.round(tally.good / Math.max(1, tally.good + tally.hard + tally.again) * 100);
    app.innerHTML = `<div class="result"><div class="emoji">${pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '🌱'}</div><h1>Session complete!</h1>
    <p class="sub">${done} cards reviewed · آفرین، ادامه بده!</p><div class="cheer-row"><img src="images/moe.jpg" alt="" class="av"><p class="cheer">${esc(motto()[0])}</p></div>
    <div class="tally"><div class="t-good"><b data-n="${tally.good}">0</b>Got it</div><div class="t-hard"><b data-n="${tally.hard}">0</b>Hard</div><div class="t-again"><b data-n="${tally.again}">0</b>Again</div></div>
    <div class="row-btns"><button class="btn primary" id="more">Study more</button><button class="btn" id="qz">🎯 Quiz this deck</button><button class="btn" id="hm">Home</button></div></div>`;
    app.querySelectorAll('.tally b').forEach(b => FX.countUp(b, +b.dataset.n, { dur: 800 }));
    if (!FX.reduced) { app.classList.remove('view-in'); void app.offsetWidth; app.classList.add('view-in'); }
    $('#more').onclick = () => go('study', { key });
    $('#qz').onclick = () => go('quiz', { key: key === 'due' ? 'all' : key, mode: 'meaning', n: S.qlen });
    $('#hm').onclick = () => go('home');
  }
  keyHandler = e => {
    if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); if (!flipped) flip(); else rate('good'); }
    else if (e.key === '1') rate('again'); else if (e.key === '2') rate('hard'); else if (e.key === '3') rate('good');
    else if (e.key.toLowerCase() === 's') speak(WORDS[cur].w);
  };
  show();
}
function toggleStar(id) { S.starred = starred(id) ? S.starred.filter(x => x !== id) : S.starred.concat(id); save(); }

/* ---------- QUIZ ---------- */
function quiz({ key, mode, n }) {
  const d = deck(key);
  let pool = d.ids.filter(id => mode === 'meaning' || WORDS[id].span);
  if (pool.length < 4) pool = WORDS.filter(w => active(w.id) && (mode === 'meaning' || w.span)).map(w => w.id);
  // weaker words first, then random
  const qs = shuffle(pool).sort((a, b) => card(a).box - card(b).box).slice(0, Math.min(n, pool.length));
  const order = shuffle(qs);
  let i = 0, score = 0, combo = 0, best = 0, answered = false;
  const missed = [];
  const title = { meaning: '🎯 Meaning quiz', gap: '🧩 Fill the gap', type: '⌨️ Type it' }[mode];

  function distractors(id) {
    const w = WORDS[id];
    const same = WORDS.filter(x => x.id !== id && x.s === w.s && (mode !== 'gap' || x.span));
    const near = WORDS.filter(x => x.id !== id && x.p === w.p && x.s !== w.s && (mode !== 'gap' || x.span));
    const posMatch = a => a.filter(x => x.pos.split(' ')[0] === w.pos.split(' ')[0]);
    let c = pick(posMatch(same), 3);
    if (c.length < 3) c = c.concat(pick(same.filter(x => !c.includes(x)), 3 - c.length));
    if (c.length < 3) c = c.concat(pick(near, 3 - c.length));
    return c;
  }
  function show() {
    if (i >= order.length) return finish();
    answered = false;
    window.scrollTo(0, 0);
    const id = order[i], w = WORDS[id];
    let body = '';
    if (mode === 'meaning') {
      const opts = shuffle([w].concat(distractors(id)));
      body = `<div class="qprompt"><div class="pill p${w.p}">${esc(w.pos)}</div><div class="word">${esc(w.w)}</div><button class="speak" id="say">🔊</button></div>
      <p class="qq">What does it mean? · معنی آن چیست؟</p>
      <div class="choices">${opts.map((o, k) => `<button class="choice fa" data-id="${o.id}"><span class="n">${k + 1}</span><span>${esc(o.fa)}</span></button>`).join('')}</div>`;
    } else if (mode === 'gap') {
      const opts = shuffle([w].concat(distractors(id)));
      body = `<p class="qq">Choose the word that best completes the sentence</p><div class="qsent">${blanked(w)}</div>
      <div class="choices two">${opts.map((o, k) => `<button class="choice" data-id="${o.id}"><span class="n">${k + 1}</span><span>${esc(o.w)}</span></button>`).join('')}</div>`;
    } else {
      body = `<p class="qq">Type the English word or phrase</p><div class="qfa fa">${esc(w.fa)}</div><div class="qsent">${blanked(w)}</div>
      <div class="typein"><input id="ans" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer…"><button class="btn primary" id="check">Check</button></div>
      <button class="link" id="hintBtn">💡 Hint</button>`;
    }
    app.innerHTML = `<div class="sess-top"><button class="back" id="bk">✕</button><div class="progress"><i style="width:${i / order.length * 100}%"></i></div><span class="count">${i + 1}/${order.length}</span></div>
    <div class="qhead"><span>${title}</span><span class="combo ${combo >= 3 ? 'hot' : ''}">${combo >= 2 ? `🔥 ${combo} in a row` : `Score ${score}`}</span></div>
    <div class="qbox q-enter">${body}<div id="fb"></div></div>`;
    $('#bk').onclick = () => go('deckView', key);
    if ($('#say')) $('#say').onclick = () => speak(w.w);
    app.querySelectorAll('.choice').forEach(b => b.onclick = () => answer(+b.dataset.id === id, b));
    if (mode === 'type') {
      const inp = $('#ans'); inp.focus();
      $('#check').onclick = () => checkTyped();
      inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); answered ? next() : checkTyped(); } };
      $('#hintBtn').onclick = () => { const t = w.w; inp.placeholder = t[0] + t.slice(1).replace(/[A-Za-z]/g, '•'); inp.focus(); };
    }
  }
  const norm = s => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z' -]/g, '').replace(/\s+/g, ' ').trim();
  function checkTyped() {
    if (answered) return;
    const w = WORDS[order[i]], v = norm($('#ans').value);
    if (!v) return;
    const ok = v === norm(w.w) || (w.span && v === norm(w.span.text)) || w.w.split('/').some(x => norm(x) === v);
    $('#ans').classList.add(ok ? 'right' : 'wrong'); $('#ans').readOnly = true;
    answer(ok);
  }
  const PRAISE = ['Nailed it, Moe!', 'Brilliant!', 'CLB 10 vibes!', 'Perfect!', 'Spot on!', 'Excellent!', 'You know this!'];
  const KIND = ['Almost! Now it\u2019ll stick 💡', 'No worries — that\u2019s how you learn 🌱', 'Good try! Remember this one 💪', 'Close! You\u2019ll get it next time ✨'];
  const COMBOS = { 3: ['🔥 On fire!', '3 in a row', '#ff7a59'], 5: ['⚡ Unstoppable!', '5 in a row', '#f6b100'], 10: ['👑 Legendary!', '10 in a row', '#a35bff'], 15: ['🚀 Out of this world!', '15 in a row', '#2a9df4'], 20: ['🏆 CLB 10 mode!', '20 in a row', '#00b894'] };
  function answer(ok, btn) {
    if (answered) return; answered = true;
    const id = order[i], w = WORDS[id];
    app.querySelectorAll('.choice').forEach(b => { b.disabled = true; if (+b.dataset.id === id) b.classList.add('right'); });
    if (btn && !ok) btn.classList.add('wrong');
    const src = btn || $('#ans');
    if (ok) {
      score++; combo++; best = Math.max(best, combo); grade(id, 'good');
      FX.play('correct'); FX.haptic(15);
      if (btn) btn.insertAdjacentHTML('beforeend', '<svg class="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>');
      FX.burstAt(src, { count: 14, spread: 80 });
      FX.flyXP(src, '+10 XP', $('#xpPill'));
      const cm = COMBOS[combo];
      if (cm) { setTimeout(() => { FX.banner(cm[0], cm[1], cm[2]); FX.edgeGlow(cm[2]); FX.play('combo'); FX.burst(innerWidth / 2, innerHeight * .4, { emoji: ['🔥', '⭐', '✨'], count: 14, spread: 140 }); }, 250); }
    } else {
      combo = 0; missed.push(id); grade(id, 'again');
      FX.play('wrong'); FX.haptic([30, 40, 30]);
      const r = app.querySelector('.choice.right'); if (r) r.classList.add('reveal');
    }
    $('#fb').innerHTML = `<div class="feedback ${ok ? 'ok' : 'no'}"><div class="fb-h">${ok ? '✅ ' + PRAISE[Math.random() * PRAISE.length | 0] : KIND[Math.random() * KIND.length | 0]}</div>
      <b>${esc(w.w)}</b> <span class="muted">${esc(w.pos)}</span> <button class="speak sm" id="say2">🔊</button><div class="fa">${esc(w.fa)}</div><div class="ex">${highlight(w)}</div></div>
      <button class="btn primary next" id="next">${i + 1 < order.length ? 'Next →' : 'See results'}</button>`;
    $('#say2').onclick = () => speak(w.w);
    $('#next').onclick = next; $('#next').focus({ preventScroll: true });
    requestAnimationFrame(() => $('#next').scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    const q = app.querySelector('.qhead .combo'); q.textContent = combo >= 2 ? `🔥 ${combo} in a row` : `Score ${score}`; q.classList.toggle('hot', combo >= 3); FX.bump(q);
    const pb = app.querySelector('.sess-top .progress i'); if (pb) pb.style.width = ((i + 1) / order.length * 100) + '%';
  }
  function next() { i++; show(); }
  function finish() {
    window.scrollTo(0, 0);
    const pct = Math.round(score / order.length * 100), stars = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;
    app.innerHTML = `<div class="result"><div class="emoji">${pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '💪' : '📚'}</div>
    <div class="stars">${[0, 1, 2].map(k => `<span class="star3 ${k < stars ? 'on' : ''}" style="--d:${300 + k * 280}ms">★</span>`).join('')}</div>
    <div class="big"><span id="scoreN">0</span>/${order.length}</div><h1>${pct >= 90 ? 'Outstanding!' : pct >= 70 ? 'Great job!' : pct >= 50 ? 'Good effort!' : 'Keep practising!'}</h1>
    <div class="cheer-row"><img src="images/moe.jpg" alt="" class="av"><p class="cheer">${pct >= 70 ? 'That\u2019s CLB 9+ energy, Moe! Keep it up.' : 'Every mistake here is one you won\u2019t make on test day, Moe.'}</p></div><p class="sub">${pct}% correct · best streak 🔥 ${best}${missed.length ? ' · missed words were added to your review pile' : ''}</p>
    ${missed.length ? `<div class="missed"><h2>Review these</h2>${missed.map(id => `<div><b>${esc(WORDS[id].w)}</b><span class="fa">${esc(WORDS[id].fa)}</span></div>`).join('')}</div>` : ''}
    <div class="row-btns"><button class="btn primary" id="again">Try again</button>${missed.length ? '<button class="btn" id="rev">🃏 Flashcards for missed</button>' : ''}<button class="btn" id="hm">Back to deck</button></div></div>`;
    FX.countUp($('#scoreN'), score, { dur: 900 });
    if (!FX.reduced) { app.classList.remove('view-in'); void app.offsetWidth; app.classList.add('view-in'); }
    [0, 1, 2].slice(0, stars).forEach(k => setTimeout(() => FX.play('tap'), 300 + k * 280));
    if (pct === 100 && order.length >= 5) FX.celebrate({ img: 'images/moe.jpg', icon: '💯', title: 'Perfect score, Moe!', sub: `${score}/${order.length} — not a single mistake. That\u2019s top-band work.`, fa: 'نمره‌ی کامل! فوق‌العاده‌ای!', kind: 'perfect', sound: 'level', fireworks: true });
    else if (pct >= 70) { FX.confetti(); FX.play('combo'); }
    checkBadges({ perfect: pct === 100 && order.length >= 5, combo: best, hour: new Date().getHours() });
    $('#again').onclick = () => go('quiz', { key, mode, n });
    if ($('#rev')) $('#rev').onclick = () => go('study', { key: 'due' });
    $('#hm').onclick = () => go('deckView', key);
  }
  keyHandler = e => {
    if (mode === 'type' && document.activeElement && document.activeElement.id === 'ans') return;
    if (answered && (e.key === 'Enter' || e.code === 'Space')) { e.preventDefault(); next(); return; }
    const k = +e.key; if (!answered && k >= 1 && k <= 4) { const b = app.querySelectorAll('.choice')[k - 1]; if (b) b.click(); }
  };
  show();
}

/* ---------- WORD LIST ---------- */
let listState = { q: '', f: 'all' };
function list() {
  const fb = filterBar(list);
  app.innerHTML = `<h1>Word list</h1><p class="sub">Search English or Farsi · <span class="fa">جستجو به انگلیسی یا فارسی</span></p>
  ${fb.html}
  <input class="search" id="q" placeholder="Search… e.g. mitigate, کاهش" value="${esc(listState.q)}">
  <div class="filters" id="flt">${[['all', 'All'], ['p1', 'Priority 1'], ['p2', 'Priority 2'], ['p3', 'Priority 3'], ['star', '★ Starred'], ['new', '✨ New'], ['learning', '🌱 Learning'], ['mastered', '🏆 Mastered']].map(([k, l]) => `<button class="chip ${listState.f === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
  <div id="rows"></div>
  <h2>Upgrade map · everyday idea → advanced word</h2>
  <table class="up">${UPGRADES.map(u => `<tr><td>${esc(u[0])}</td><td><b>${esc(u[1])}</b></td><td class="fa">${esc(u[2])}</td></tr>`).join('')}</table>`;
  const draw = () => {
    const q = listState.q.trim().toLowerCase(), f = listState.f;
    const rows = WORDS.filter(w => active(w.id) && (!q || w.w.toLowerCase().includes(q) || w.fa.includes(q) || w.ex.toLowerCase().includes(q))
      && (f === 'all' || (f[0] === 'p' && w.p === +f[1]) || (f === 'star' && starred(w.id)) || status(w.id) === f));
    $('#rows').innerHTML = rows.length ? `<p class="muted small">${rows.length} word${rows.length > 1 ? 's' : ''}</p>` + rows.map(w => {
      const st = status(w.id);
      return `<div class="entry" style="--c:${PCOL[w.p]}"><div class="w"><b>${esc(w.w)}</b><small>${esc(w.pos)}</small> <span class="lvl l${w.l}">${LEVELS[w.l - 1].icon} ${LEVELS[w.l - 1].name}</span></div><div class="fa">${esc(w.fa)}</div><div class="ex">${highlight(w)}</div>
      <div class="acts"><button class="star ${starred(w.id) ? 'on' : ''}" data-star="${w.id}">${starred(w.id) ? '★' : '☆'}</button><button class="speak" data-say="${w.id}">🔊</button><span class="box-badge">${st === 'new' ? '✨' : st === 'mastered' ? '🏆' : '🌱'}</span></div></div>`;
    }).join('') : '<div class="empty">No words match.</div>';
    $('#rows').querySelectorAll('[data-star]').forEach(b => b.onclick = () => { toggleStar(+b.dataset.star); draw(); });
    $('#rows').querySelectorAll('[data-say]').forEach(b => b.onclick = () => speak(WORDS[+b.dataset.say].w));
  };
  fb.wire(app);
  $('#q').oninput = e => { listState.q = e.target.value; draw(); };
  $('#flt').querySelectorAll('.chip').forEach(b => b.onclick = () => { listState.f = b.dataset.f; $('#flt').querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  draw();
}

/* ---------- STATS ---------- */
function stats() {
  const all = WORDS.map(w => w.id), c = counts(all);
  const days = Array.from({ length: 14 }, (_, k) => { const d = new Date(Date.now() - (13 - k) * DAY); return { d, n: S.days[d.toLocaleDateString('en-CA')] || 0 }; });
  const max = Math.max(S.goal, ...days.map(x => x.n));
  const pctM = Math.round(c.mastered / all.length * 100);
  app.innerHTML = `<h1>Your progress</h1><p class="sub">Saved in this browser · <span class="fa">پیشرفت شما در همین مرورگر ذخیره می‌شود</span></p>
  <div class="strip">
    <div class="stat s-fire"><b>🔥 ${streak()}</b><span>day streak</span></div>
    <div class="stat s-xp"><b>⭐ ${S.xp}</b><span>total XP</span></div>
    <div class="stat s-good"><b>${pctM}%</b><span>of list mastered</span></div>
    <div class="stat s-learn"><b>${c.due}</b><span>cards due now</span></div>
  </div>
  <h2>Badges <span class="muted small">${Object.keys(S.badges || {}).length}/${BADGES.length}</span></h2>
  <div class="badges">${BADGES.map(b => { const got = (S.badges || {})[b.id]; return `<div class="badge ${got ? 'got' : ''}" title="${esc(b.hint)}"><span class="b-ic">${got ? b.icon : '🔒'}</span><b>${esc(b.name)}</b><small>${got ? 'Unlocked ' + got : esc(b.hint)}</small></div>`; }).join('')}</div>
  <h2>Last 14 days</h2>
  <div class="chart">${days.map(x => `<div class="col" title="${x.n} reviews"><i style="height:${x.n / max * 100}%;${x.n >= S.goal ? 'background:var(--good)' : ''}"></i><small>${x.d.getDate()}</small></div>`).join('')}</div>
  <div class="legend"><span><i style="background:var(--good)"></i>goal reached</span><span><i style="background:var(--accent)"></i>practised</span></div>
  <h2>By priority</h2>
  ${PRIORITIES.map(p => { const ids = WORDS.filter(w => w.p === p.id).map(w => w.id), pc = counts(ids); return `<div class="pbar" style="--c:${PCOL[p.id]}"><div class="h"><b>Priority ${p.id} · ${esc(p.title)}</b><span class="muted">${pc.mastered} mastered · ${pc.learning} learning · ${pc.new} new</span></div>${bar(ids)}</div>`; }).join('')}
  <div class="legend"><span><i style="background:var(--good)"></i>mastered (box 5)</span><span><i style="background:var(--warn)"></i>learning</span><span><i style="background:var(--surface2);border:1px solid var(--line)"></i>new</span></div>
  <h2>Hardest words</h2>
  ${(() => { const h = WORDS.filter(w => card(w.id).w > 0).sort((a, b) => card(b.id).w - card(a.id).w).slice(0, 8); return h.length ? `<div class="missed">${h.map(w => `<div><b>${esc(w.w)}</b><span class="fa">${esc(w.fa)}</span><span class="muted">✗ ${card(w.id).w}</span></div>`).join('')}</div>` : '<p class="muted">Words you miss will show up here.</p>'; })()}
  <h2>Backup</h2>
  <p class="sub">Move your progress between phone and laptop: export here, import on the other device.</p>
  <div class="tools"><button class="btn" id="exp">⬇ Export progress</button><label class="btn">⬆ Import progress<input type="file" id="imp" accept=".json,application/json" hidden></label><button class="btn danger" id="reset">Reset all progress</button></div>
  <h2>App</h2>
  <div class="tools"><button class="btn" id="intro">👋 Replay the intro</button><button class="btn" id="snd">${S.sound ? '🔇 Turn sound off' : '🔊 Turn sound on'}</button></div>`;
  FX.stagger(app, '.stat, .badge', 25);
  $('#intro').onclick = () => showIntro();
  $('#snd').onclick = () => { $('#soundBtn').click(); stats(); };
  $('#exp').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' }));
    a.download = `celpip-progress-${today()}.json`; a.click();
  };
  $('#imp').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => { const d = JSON.parse(t); if (!d.cards) throw 0; S = Object.assign(S, d); save(); applyTheme(); toast('✅ Progress imported'); stats(); }).catch(() => alert('That file is not a progress export.'));
  };
  $('#reset').onclick = () => { if (confirm('Delete all progress, stars and streak on this device?')) { S = Object.assign(S, { cards: {}, starred: [], days: {}, xp: 0, badges: {} }); save(); updateXP(false); stats(); } };
}

function showIntro() {
  const o = FX.onboarding([
    { art: `<div class="ob-moe"><img src="images/moe.jpg" alt=""><span>👋</span></div>`, title: 'Welcome, Moe!', text: `${WORDS.length} advanced CELPIP words and phrases, picked for a top score. A few minutes a day is all it takes.`, fa: 'چند دقیقه تمرین در روز، برای بهترین نمره.' },
    { art: `<div class="ob-demo"><div class="ob-mini">mitigate<small>کاهش دادن</small></div></div>`, title: 'Flip, then swipe', text: 'Tap a card to see the answer. Swipe <b>right</b> if you knew it, <b>left</b> to see it again soon, <b>up</b> if it was hard. Buttons work too.', fa: 'راست: بلد بودم · چپ: دوباره · بالا: سخت بود' },
    { art: `<div class="ob-goal">🎯</div>`, title: 'Pick your daily goal', text: 'How many reviews a day? You can change it any time.', extra: `<div class="ob-goals">${[10, 20, 30, 50].map(g => `<button class="lv ${S.goal === g ? 'on' : ''}" data-g="${g}">${g}${g === 20 ? ' ⭐' : ''}</button>`).join('')}</div>` },
  ], () => { S.seenIntro = true; S.lastWelcome = today(); save(); go('home'); FX.confetti(.6); FX.play('goal'); });
  o.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { S.goal = +b.dataset.g; save(); o.querySelectorAll('[data-g]').forEach(x => x.classList.toggle('on', x === b)); FX.play('tap'); });
}
async function startup() {
  updateXP(false);
  go('home');
  if (!S.seenIntro) { showIntro(); return; }
  if (S.lastWelcome !== today()) {
    S.lastWelcome = today(); save();
    const h = new Date().getHours(), st = streak(), due = WORDS.filter(w => isDue(w.id)).length;
    await FX.splash({
      img: 'images/moe.jpg',
      greeting: h < 12 ? 'Good morning, Moe! ☀️' : h < 18 ? 'Good afternoon, Moe! 🌤️' : 'Good evening, Moe! 🌙',
      line: (st ? `<span class="flame">🔥</span> ${st}-day streak — keep it alive!` : 'Let\u2019s start a streak today! 🔥') + (due ? `<br><small>${due} card${due > 1 ? 's' : ''} waiting for review</small>` : ''),
      motto: motto()[0],
    });
  }
}
startup();
})();
