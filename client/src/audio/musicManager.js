/**
 * מוזיקת רקע למשחק.
 *
 * לכל "סצנה" יש טראק בודד (שמתנגן בלופ) או פלייליסט (שמתנגן
 * בסדר מעורבב, שיר אחרי שיר, ומתערבב מחדש כשנגמר).
 *
 * - מעבר חלק בין סצנות (crossfade)
 * - מכבד את חסימת ה-autoplay: מתחיל בנגיעה הראשונה של המשתמש
 * - קובץ חסר פשוט מדולג. שום דבר לא נשבר.
 */

const FADE_MS = 900;
const DEFAULT_VOLUME = 0.35;
const STORAGE_KEY = 'michrazMuted';

const NBA_PLAYLIST = [
  '/audio/nba-1.mp3',
  '/audio/nba-2.mp3',
  '/audio/nba-3.mp3',
  '/audio/nba-4.mp3',
  '/audio/nba-5.mp3',
  '/audio/haik.mp3',
];

// מחרוזת = טראק אחד בלופ. מערך = פלייליסט מעורבב.
export const SOURCES = {
  login: NBA_PLAYLIST,
  lobby: NBA_PLAYLIST,
  'game-nba': NBA_PLAYLIST,
  'game-maccabi': '/audio/game-maccabi.mp3',
  'game-euroleague': '/audio/game-euroleague.mp3',
};

// סצנות שחולקות תור נגינה אחד — המוזיקה ממשיכה ברצף ביניהן
// בלי לקטוע את השיר. הכניסה והלובי הם אותו "תפריט".
const SCENE_GROUP = {
  login: 'menu',
  lobby: 'menu',
};

const groupOf = (scene) => SCENE_GROUP[scene] || scene;

const audioByUrl = new Map();
const fadeTimers = new Map();
const sceneState = new Map();
const listeners = new Set();

let currentScene = null;
let pendingScene = null;
let unlockArmed = false;

let muted = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
})();

function notify() {
  for (const fn of listeners) fn();
}

function trackList(scene) {
  const src = SOURCES[scene];
  if (!src) return [];
  return Array.isArray(src) ? src : [src];
}

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function getAudio(url) {
  if (audioByUrl.has(url)) return audioByUrl.get(url);

  const el = new Audio(url);
  el.preload = 'auto';
  el.volume = 0;
  el.broken = false;
  el.addEventListener('error', () => {
    el.broken = true;
  });

  audioByUrl.set(url, el);
  return el;
}

/** מודד זמן אמת ולא סופר טיקים, כך שה-fade נגמר תמיד תוך FADE_MS */
function fadeTo(el, target, onDone) {
  clearInterval(fadeTimers.get(el));

  const from = el.volume;
  const delta = target - from;

  if (Math.abs(delta) < 0.001) {
    el.volume = target;
    if (onDone) onDone();
    return;
  }

  const startedAt = Date.now();
  const timer = setInterval(() => {
    const progress = Math.min(1, (Date.now() - startedAt) / FADE_MS);
    el.volume = Math.min(1, Math.max(0, from + delta * progress));
    if (progress >= 1) {
      clearInterval(timer);
      fadeTimers.delete(el);
      if (onDone) onDone();
    }
  }, 1000 / 60);

  fadeTimers.set(el, timer);
}

function stateFor(scene) {
  const key = groupOf(scene);
  let st = sceneState.get(key);
  if (!st) {
    st = { order: [], pos: 0, current: null, lastPlayed: null };
    sceneState.set(key, st);
  }
  return st;
}

/** מערבב מחדש, ומוודא שהשיר האחרון שהתנגן לא חוזר מיד בהתחלה */
function reshuffle(scene) {
  const st = stateFor(scene);
  const urls = trackList(scene);
  const order = urls.length > 1 ? shuffle(urls) : [...urls];

  if (order.length > 1 && st.lastPlayed && order[0] === st.lastPlayed) {
    [order[0], order[1]] = [order[1], order[0]];
  }

  st.order = order;
  st.pos = 0;
}

function armUnlock() {
  if (unlockArmed) return;
  unlockArmed = true;

  const unlock = () => {
    unlockArmed = false;
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
    const scene = pendingScene;
    pendingScene = null;
    if (scene && !muted) playCurrent(scene);
    notify();
  };

  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
}

function playCurrent(scene, skips = 0) {
  const st = stateFor(scene);
  if (!st.order.length) reshuffle(scene);

  const url = st.order[st.pos];
  if (!url) return;

  const el = getAudio(url);

  // קובץ חסר או פגום — מדלגים לבא בתור
  if (el.broken) {
    if (skips >= st.order.length) return; // כל הפלייליסט חסר, מפסיקים
    advance(scene, skips + 1);
    return;
  }

  const single = trackList(scene).length === 1;
  el.loop = single;
  el.onended = single ? null : () => {
    // ממשיכים כל עוד אנחנו באותה קבוצת סצנות
    if (groupOf(currentScene) === groupOf(scene)) advance(currentScene);
  };

  st.current = el;
  st.lastPlayed = url;

  const played = el.play();
  if (played && typeof played.catch === 'function') {
    played.catch(() => {
      pendingScene = scene;
      armUnlock();
      notify();
    });
  }

  fadeTo(el, muted ? 0 : DEFAULT_VOLUME);
}

function advance(scene, skips = 0) {
  const st = stateFor(scene);

  if (st.current) {
    clearInterval(fadeTimers.get(st.current));
    st.current.pause();
    st.current.currentTime = 0;
    st.current.volume = 0;
  }

  st.pos += 1;
  if (st.pos >= st.order.length) reshuffle(scene);

  playCurrent(scene, skips);
}

function stopScene(scene) {
  const st = sceneState.get(groupOf(scene));
  if (!st || !st.current) return;

  const el = st.current;
  fadeTo(el, 0, () => {
    el.pause();
    el.currentTime = 0;
  });
}

/** מעבר לסצנה חדשה. קריאה חוזרת לאותה סצנה לא עושה כלום. */
export function setScene(scene) {
  if (scene === currentScene) return;

  const previous = currentScene;
  currentScene = scene;

  // מעבר בתוך אותה קבוצה (התחברות -> לובי): לא נוגעים בנגינה
  if (previous && groupOf(previous) === groupOf(scene)) {
    notify();
    return;
  }

  if (previous) stopScene(previous);

  if (scene) {
    // כל כניסה לסצנה חדשה פותחת בשיר אקראי טרי, לא ממשיכה
    // מאיפה שהפסקנו. reshuffle גם דואג שלא יחזור אותו שיר.
    reshuffle(scene);
    if (!muted) playCurrent(scene);
  }

  notify();
}

export function isMuted() {
  return muted;
}

export function setMuted(next) {
  muted = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  } catch {
    // גלישה פרטית — ממשיכים בלי לשמור
  }

  if (currentScene) {
    if (muted) {
      const st = stateFor(currentScene);
      if (st.current) {
        const el = st.current;
        fadeTo(el, 0, () => el.pause());
      }
    } else {
      playCurrent(currentScene);
    }
  }

  notify();
}

export function toggleMuted() {
  setMuted(!muted);
}

export function isWaitingForGesture() {
  return pendingScene !== null;
}

/** שם הקובץ שמתנגן כרגע — שימושי להצגה או לדיבוג */
export function currentTrack() {
  if (!currentScene) return null;
  const st = sceneState.get(groupOf(currentScene));
  return st ? st.lastPlayed : null;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
