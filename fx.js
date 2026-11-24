/* FX — animations, sounds, haptics, celebrations. No dependencies. Exposes window.FX. */
(() => {
'use strict';
const FX = {};
const mq = matchMedia('(prefers-reduced-motion: reduce)');
Object.defineProperty(FX, 'reduced', { get: () => mq.matches });
FX.soundOn = true;

/* ---------- helpers ---------- */
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const center = node => { const r = node.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
const rand = (a, b) => a + Math.random() * (b - a);
FX.wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- sound (Web Audio, synthesized) ---------- */
let ac = null;
function ctx() {
  if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ac = new C(); }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function tone(freq, start, dur, { type = 'sine', vol = .12, slide = 0 } = {}) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + start, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02);
}
const SOUNDS = {
  tap: () => tone(660, 0, .06, { type: 'triangle', vol: .05 }),
  flip: () => tone(420, 0, .12, { type: 'sine', vol: .06, slide: 1.6 }),
  correct: () => { tone(880, 0, .12, { type: 'triangle' }); tone(1320, .08, .18, { type: 'triangle' }); },
  good: () => { tone(740, 0, .1, { type: 'triangle', vol: .09 }); tone(988, .07, .16, { type: 'triangle', vol: .09 }); },
  wrong: () => { tone(330, 0, .14, { type: 'sine', vol: .07 }); tone(262, .1, .2, { type: 'sine', vol: .06 }); },
  swoosh: () => tone(300, 0, .18, { type: 'sine', vol: .04, slide: 3 }),
  combo: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .07, .16, { type: 'triangle', vol: .1 })),
  badge: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * .06, .22, { type: 'sine', vol: .09 })),
  level: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * .08, .3, { type: 'triangle', vol: .1 })),
  goal: () => { [392, 523, 659, 784].forEach((f, i) => tone(f, i * .09, .25, { type: 'triangle', vol: .1 })); tone(1047, .4, .6, { type: 'sine', vol: .1 }); },
};
FX.play = name => { if (!FX.soundOn || !SOUNDS[name]) return; try { SOUNDS[name](); } catch {} };
FX.haptic = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch {} };

/* ---------- particles ---------- */
FX.burst = (x, y, { count = 16, colors = ['#4fcf8a', '#ffd36e', '#6d97ff', '#ff7ac6'], emoji = null, spread = 90, size = 8 } = {}) => {
  if (FX.reduced) return;
  for (let i = 0; i < count; i++) {
    const p = el('span', 'fx-p', emoji ? emoji[i % emoji.length] : '');
    const ang = (Math.PI * 2 * i) / count + rand(-.3, .3), dist = rand(spread * .5, spread);
    if (!emoji) { p.style.background = colors[i % colors.length]; p.style.width = p.style.height = rand(size * .6, size * 1.2) + 'px'; }
    else p.style.fontSize = rand(14, 22) + 'px';
    p.style.left = x + 'px'; p.style.top = y + 'px';
    document.body.appendChild(p);
    p.animate([
      { transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(1)`, opacity: 1, offset: .6 },
      { transform: `translate(calc(-50% + ${Math.cos(ang) * dist * 1.15}px), calc(-50% + ${Math.sin(ang) * dist * 1.15 + 30}px)) scale(.6)`, opacity: 0 },
    ], { duration: rand(650, 900), easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => p.remove();
  }
};
FX.burstAt = (node, opts) => { if (!node) return; const c = center(node); FX.burst(c.x, c.y, opts); };

/* ---------- flying "+10 XP" ---------- */
FX.flyXP = (from, label, target, onLand) => {
  if (!from || !target || FX.reduced) { onLand && onLand(); return; }
  const a = center(from), b = center(target);
  const f = el('span', 'xp-fly', label);
  f.style.left = a.x + 'px'; f.style.top = a.y + 'px';
  document.body.appendChild(f);
  const anim = f.animate([
    { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
    { transform: 'translate(-50%,calc(-50% - 46px)) scale(1.15)', opacity: 1, offset: .3 },
    { transform: `translate(calc(-50% + ${b.x - a.x}px), calc(-50% + ${b.y - a.y}px)) scale(.5)`, opacity: .9 },
  ], { duration: 900, easing: 'cubic-bezier(.5,0,.3,1)' });
  anim.onfinish = () => { f.remove(); FX.bump(target); onLand && onLand(); };
};
FX.bump = node => { if (!node) return; node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump'); };

/* ---------- count-up numbers ---------- */
FX.countUp = (node, to, { from = 0, dur = 900, fmt = n => n } = {}) => {
  if (!node) return;
  if (FX.reduced || to === from) { node.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = t => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    node.textContent = fmt(Math.round(from + (to - from) * e));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

/* ---------- confetti & fireworks (canvas) ---------- */
function canvas() {
  const cv = el('canvas', 'confetti'); document.body.appendChild(cv);
  const c = cv.getContext('2d'), dpr = devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; c.scale(dpr, dpr);
  return [cv, c];
}
const COLS = ['#ff5a5f', '#ffb400', '#00c2a8', '#4d7cff', '#a35bff', '#ff7ac6', '#ffd36e'];
FX.confetti = (power = 1) => {
  if (FX.reduced) return;
  const [cv, c] = canvas();
  const ps = [];
  const shoot = (x, dir) => { for (let i = 0; i < 70 * power; i++) ps.push({ x, y: innerHeight * .9, vx: dir * rand(3, 11) + rand(-2, 2), vy: -rand(12, 22), s: rand(5, 10), col: COLS[i % COLS.length], r: rand(0, 6), vr: rand(-.3, .3), shape: i % 3 }); };
  shoot(innerWidth * .1, 1); shoot(innerWidth * .9, -1);
  let t = 0;
  (function f() {
    c.clearRect(0, 0, innerWidth, innerHeight);
    ps.forEach(p => {
      p.vy += .4; p.vx *= .985; p.vy *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.col;
      if (p.shape === 0) c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      else if (p.shape === 1) { c.beginPath(); c.arc(0, 0, p.s / 3, 0, 7); c.fill(); }
      else { c.beginPath(); c.moveTo(0, -p.s / 2); c.lineTo(p.s / 2, p.s / 2); c.lineTo(-p.s / 2, p.s / 2); c.fill(); }
      c.restore();
    });
    if (++t < 200) requestAnimationFrame(f); else cv.remove();
  })();
};
FX.fireworks = (bursts = 6) => {
  if (FX.reduced) return;
  const [cv, c] = canvas();
  const sparks = [];
  let launched = 0, t = 0;
  const boom = () => {
    const x = rand(innerWidth * .15, innerWidth * .85), y = rand(innerHeight * .15, innerHeight * .45), col = COLS[launched % COLS.length];
    for (let i = 0; i < 46; i++) { const a = (Math.PI * 2 * i) / 46, v = rand(2.5, 5.5); sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, col }); }
    launched++;
  };
  (function f() {
    if (launched < bursts && t % 14 === 0) boom();
    c.globalCompositeOperation = 'destination-out'; c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(0, 0, innerWidth, innerHeight);
    c.globalCompositeOperation = 'lighter';
    sparks.forEach(s => { s.vy += .06; s.vx *= .98; s.vy *= .98; s.x += s.vx; s.y += s.vy; s.life -= .014; if (s.life > 0) { c.globalAlpha = s.life; c.fillStyle = s.col; c.beginPath(); c.arc(s.x, s.y, 2.4, 0, 7); c.fill(); } });
    c.globalAlpha = 1;
    if (++t < 190) requestAnimationFrame(f); else cv.remove();
  })();
};

/* ---------- screen-edge glow & combo banner ---------- */
FX.edgeGlow = (color = '#ff7a59') => {
  if (FX.reduced) return;
  const g = el('div', 'edge-glow'); g.style.setProperty('--g', color); document.body.appendChild(g);
  setTimeout(() => g.remove(), 1300);
};
FX.banner = (big, small, color) => {
  const b = el('div', 'combo-banner', `<b>${big}</b>${small ? `<span>${small}</span>` : ''}`);
  if (color) b.style.setProperty('--bc', color);
  document.body.appendChild(b);
  setTimeout(() => b.classList.add('out'), 1500); setTimeout(() => b.remove(), 2000);
};

/* ---------- toast-style pop (badges, mastered) ---------- */
FX.pop = (icon, title, sub) => {
  const p = el('div', 'unlock-pop', `<span class="up-ic">${icon}</span><span><small>${sub || ''}</small><b>${title}</b></span><i class="shine"></i>`);
  document.body.appendChild(p);
  setTimeout(() => p.classList.add('out'), 2800); setTimeout(() => p.remove(), 3300);
};

/* ---------- full-screen celebration overlay (queued) ---------- */
const queue = [];
let open = null;
FX.isOpen = () => !!open;
FX.celebrate = opts => new Promise(res => { queue.push([opts, res]); if (!open) next(); });
function next() {
  const item = queue.shift(); if (!item) { open = null; return; }
  const [o, res] = item;
  const ov = el('div', 'celebrate ' + (o.kind || ''), `
    <div class="cel-card">
      <div class="cel-rays"></div>
      ${o.img ? `<div class="cel-pic"><img src="${o.img}" alt=""><span class="cel-ic">${o.icon || ''}</span></div>` : `<div class="cel-big">${o.icon || '🎉'}</div>`}
      <h2>${o.title}</h2>${o.sub ? `<p>${o.sub}</p>` : ''}${o.fa ? `<p class="fa">${o.fa}</p>` : ''}
      <button class="btn primary cel-btn">${o.btn || 'Keep going 🚀'}</button>
    </div>`);
  document.body.appendChild(ov);
  open = ov;
  requestAnimationFrame(() => ov.classList.add('in'));
  FX.play(o.sound || 'level'); FX.haptic([30, 40, 60]);
  if (o.fireworks) FX.fireworks(); else FX.confetti(.7);
  const close = () => { ov.removeEventListener('click', onClick); ov.classList.remove('in'); ov.classList.add('out'); setTimeout(() => { ov.remove(); res(); next(); }, 280); };
  const onClick = e => { if (e.target.closest('.cel-btn') || e.target === ov) close(); };
  ov.addEventListener('click', onClick);
  ov._close = close;
  setTimeout(() => ov.querySelector('.cel-btn').focus({ preventScroll: true }), 50);
}
document.addEventListener('keydown', e => { if (open && ['Enter', 'Escape', ' '].includes(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); open._close(); } }, true);

/* ---------- undo chip ---------- */
FX.undo = (label, onUndo, ms = 4000) => {
  document.querySelectorAll('.undo-chip').forEach(n => n.remove());
  const u = el('button', 'undo-chip', `${label} <b>Undo</b>`);
  document.body.appendChild(u);
  let done = false;
  const kill = () => { if (done) return; done = true; u.classList.add('out'); setTimeout(() => u.remove(), 250); };
  u.onclick = () => { if (done) return; kill(); onUndo(); };
  setTimeout(kill, ms);
  return kill;
};

/* ---------- swipe for flashcards ---------- */
FX.swipeable = (node, { enabled, onSwipe, onTap }) => {
  let sx = 0, sy = 0, dx = 0, dy = 0, drag = false, moved = false, id = null;
  const stamps = { good: node.querySelector('.stamp.good'), again: node.querySelector('.stamp.again'), hard: node.querySelector('.stamp.hard') };
  const setStamps = () => {
    const g = Math.max(0, Math.min(1, dx / 110)), a = Math.max(0, Math.min(1, -dx / 110)), h = Math.max(0, Math.min(1, -dy / 110)) * (Math.abs(dx) < 60 ? 1 : 0);
    if (stamps.good) stamps.good.style.opacity = g; if (stamps.again) stamps.again.style.opacity = a; if (stamps.hard) stamps.hard.style.opacity = h;
    node.style.setProperty('--glow', g > a && g > h ? `rgba(46,204,113,${g * .55})` : a > h ? `rgba(240,115,106,${a * .55})` : `rgba(240,173,74,${h * .55})`);
  };
  node.addEventListener('pointerdown', e => {
    if (e.button > 0 || e.target.closest('button')) return;
    sx = e.clientX; sy = e.clientY; dx = dy = 0; drag = true; moved = false; id = e.pointerId;
  });
  node.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== id) return;
    dx = e.clientX - sx; dy = e.clientY - sy;
    if (!moved && Math.hypot(dx, dy) > 8) { moved = true; if (enabled()) { node.setPointerCapture(id); node.classList.add('dragging'); } }
    if (moved && enabled()) { node.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`; setStamps(); }
  });
  const end = e => {
    if (!drag || (e && e.pointerId !== id)) return;
    drag = false; node.classList.remove('dragging');
    if (!moved) { onTap && onTap(); return; }
    if (!enabled()) { reset(); return; }
    const dir = dx > 100 ? 'good' : dx < -100 ? 'again' : dy < -100 ? 'hard' : null;
    if (dir) onSwipe(dir, true); else reset();
  };
  const reset = () => { node.style.transition = 'transform .35s cubic-bezier(.2,1.4,.4,1)'; node.style.transform = ''; dx = dy = 0; setStamps(); setTimeout(() => { node.style.transition = ''; }, 360); };
  node.addEventListener('pointerup', end);
  node.addEventListener('pointercancel', () => { if (drag) { drag = false; node.classList.remove('dragging'); reset(); } });
};
FX.flyOut = (node, dir) => new Promise(res => {
  if (FX.reduced) { res(); return; }
  const cur = node.style.transform || '';
  const to = dir === 'good' ? 'translate(130vw, -40px) rotate(28deg)' : dir === 'again' ? 'translate(-130vw, -40px) rotate(-28deg)' : 'translate(0, -120vh) rotate(-4deg)';
  const s = node.querySelector('.stamp.' + dir); if (s) s.style.opacity = 1;
  node.animate([{ transform: cur || 'none' }, { transform: to }], { duration: 380, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).onfinish = res;
});

/* ---------- welcome splash ---------- */
FX.splash = ({ img, greeting, line, motto }) => new Promise(res => {
  const s = el('div', 'splash', `
    <div class="sp-inner">
      <div class="sp-pic"><img src="${img}" alt=""><span class="sp-ring"></span></div>
      <h1 class="sp-hi">${greeting}</h1>
      <div class="sp-line">${line}</div>
      <p class="sp-motto"></p>
      <small class="sp-skip">Tap to start</small>
    </div>`);
  document.body.appendChild(s);
  requestAnimationFrame(() => s.classList.add('in'));
  const m = s.querySelector('.sp-motto');
  if (FX.reduced) m.textContent = motto;
  else { let i = 0; const typer = setInterval(() => { m.textContent = motto.slice(0, ++i); if (i >= motto.length) clearInterval(typer); }, 22); }
  let gone = false;
  const close = () => { if (gone) return; gone = true; s.classList.add('out'); setTimeout(() => { s.remove(); res(); }, 450); };
  s.addEventListener('click', close);
  setTimeout(close, 3400);
});

/* ---------- onboarding slides ---------- */
FX.onboarding = (slides, onDone) => {
  const o = el('div', 'onboard', `
    <div class="ob-card">
      <button class="ob-skip">Skip</button>
      <div class="ob-track">${slides.map(s => `<section class="ob-slide"><div class="ob-art">${s.art}</div><h2>${s.title}</h2><p>${s.text}</p>${s.fa ? `<p class="fa">${s.fa}</p>` : ''}${s.extra || ''}</section>`).join('')}</div>
      <div class="ob-dots">${slides.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
      <button class="btn primary ob-next">Next</button>
    </div>`);
  document.body.appendChild(o);
  requestAnimationFrame(() => o.classList.add('in'));
  let i = 0;
  const track = o.querySelector('.ob-track'), dots = o.querySelectorAll('.ob-dots i'), nextBtn = o.querySelector('.ob-next');
  const goTo = k => {
    i = Math.max(0, Math.min(slides.length - 1, k));
    track.style.transform = `translateX(${-i * 100}%)`;
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
    nextBtn.textContent = i === slides.length - 1 ? 'Let’s go, Moe! 🚀' : 'Next';
  };
  const finish = () => { o.classList.add('out'); setTimeout(() => o.remove(), 350); onDone(o); };
  nextBtn.onclick = () => { FX.play('tap'); i === slides.length - 1 ? finish() : goTo(i + 1); };
  o.querySelector('.ob-skip').onclick = finish;
  let sx = null;
  track.addEventListener('pointerdown', e => { if (!e.target.closest('button')) sx = e.clientX; });
  track.addEventListener('pointerup', e => { if (sx == null) return; const d = e.clientX - sx; sx = null; if (d < -40) goTo(i + 1); else if (d > 40) goTo(i - 1); });
  return o;
};

/* ---------- entrance stagger ---------- */
FX.stagger = (root, selector, step = 35) => {
  if (FX.reduced) return;
  root.querySelectorAll(selector).forEach((n, k) => { n.style.setProperty('--d', Math.min(k, 14) * step + 'ms'); n.classList.add('rise'); });
};

window.FX = FX;
})();
