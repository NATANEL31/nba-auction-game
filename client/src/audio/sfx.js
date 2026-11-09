/**
 * אפקטי קול קצרים, מסונתזים ב-Web Audio — בלי קבצי אודיו נוספים.
 * מכבדים השתקה נפרדת ממוזיקת הרקע (נשמרת ב-localStorage).
 */

const KEY = 'michrazSfxMuted';

let ctx = null;
let muted = (() => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
})();
const listeners = new Set();

function audio() {
  if (muted) return null;
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(c, { freq, at = 0, dur = 0.15, type = 'sine', gain = 0.14, slideTo }) {
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function knock(c, at = 0, gain = 0.5) {
  const t0 = c.currentTime + at;
  const len = Math.floor(c.sampleRate * 0.09);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
  tone(c, { freq: 170, slideTo: 55, at, dur: 0.14, type: 'triangle', gain: 0.3 });
}

/** פטיש מכרז: שתי דפיקות */
export function gavel() {
  const c = audio();
  if (!c) return;
  knock(c, 0, 0.55);
  knock(c, 0.17, 0.4);
}

/** ג'ינגל "נמכר!" — ארפג'יו עולה */
export function soldJingle() {
  const c = audio();
  if (!c) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
    tone(c, { freq, at: 0.4 + i * 0.1, dur: 0.22, type: 'triangle', gain: 0.16 }),
  );
  tone(c, { freq: 1046.5, at: 0.8, dur: 0.5, type: 'sine', gain: 0.12 });
}

/** ביפ של שניות אחרונות; urgent = גבוה וחד יותר */
export function beep(urgent = false) {
  const c = audio();
  if (!c) return;
  tone(c, { freq: urgent ? 1320 : 880, dur: urgent ? 0.14 : 0.1, type: 'square', gain: 0.07 });
}

/** צלצול קל כשמגיע התור שלך */
export function turnChime() {
  const c = audio();
  if (!c) return;
  tone(c, { freq: 659.25, dur: 0.14, type: 'sine', gain: 0.14 });
  tone(c, { freq: 880, at: 0.12, dur: 0.2, type: 'sine', gain: 0.14 });
}

/** תשואות קטנות לניצחון */
export function fanfare() {
  const c = audio();
  if (!c) return;
  [392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
    tone(c, { freq, at: i * 0.11, dur: 0.25, type: 'triangle', gain: 0.15 }),
  );
}

export function isSfxMuted() {
  return muted;
}

export function toggleSfxMuted() {
  muted = !muted;
  try {
    localStorage.setItem(KEY, muted ? '1' : '0');
  } catch {
    /* אחסון חסום — ההשתקה תחול רק עד הרענון */
  }
  listeners.forEach((fn) => fn());
}

export function subscribeSfx(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
