// Procedurally generated UI sounds (Web Audio). Original sound-alikes, no copyrighted samples.
let ctx = null, muted = false;
try { muted = localStorage.getItem('bc_sfx') === 'off'; } catch {}

function ac() {
  if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function env(g, t, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
function tone(c, type, f0, f1, t, dur, peak) {
  const o = c.createOscillator(), g = c.createGain(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, peak, dur); o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(c, t, dur, peak, freq) {
  const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = c.createGain(); env(g, t, peak, dur);
  s.connect(f).connect(g).connect(c.destination); s.start(t);
}

export const sfx = {
  get muted() { return muted; },
  setMuted(v) { muted = v; try { localStorage.setItem('bc_sfx', v ? 'off' : 'on'); } catch {} },
  click() { if (muted) return; const c = ac(); if (!c) return; const t = c.currentTime; tone(c, 'square', 540, 120, t, 0.07, 0.16); noise(c, t, 0.035, 0.07, 1900); },
  pop() { if (muted) return; const c = ac(); if (!c) return; const t = c.currentTime; tone(c, 'triangle', 280, 880, t, 0.09, 0.2); noise(c, t, 0.025, 0.04, 2600); },
  slot() { if (muted) return; const c = ac(); if (!c) return; const t = c.currentTime; tone(c, 'square', 330, 250, t, 0.05, 0.1); tone(c, 'triangle', 660, 520, t + 0.03, 0.06, 0.1); },
  levelup() { if (muted) return; const c = ac(); if (!c) return; const t = c.currentTime; [523, 659, 784, 1047].forEach((f, i) => tone(c, 'square', f, f * 0.995, t + i * 0.09, 0.16, 0.1)); },
  error() { if (muted) return; const c = ac(); if (!c) return; const t = c.currentTime; tone(c, 'sawtooth', 220, 90, t, 0.18, 0.12); },
};

// click sound for anything clickable, on every page
const CLICKABLE = 'a[href], button, .btn, summary, label.toggle, .tab, .rk-tab, .rk-row, [role=button], .seg button, .theme, .gal-card, .hb-slot';
document.addEventListener('pointerdown', (e) => {
  if (e.button > 0) return;
  const el = e.target.closest(CLICKABLE);
  if (!el || el.disabled || el.dataset.nosound !== undefined) return;
  sfx.click();
}, true);
