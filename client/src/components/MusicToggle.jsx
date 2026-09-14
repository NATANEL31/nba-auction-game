import { useEffect, useState } from 'react';
import {
  isMuted,
  toggleMuted,
  isWaitingForGesture,
  subscribe,
} from '../audio/musicManager';

/**
 * כפתור השתקה. מציג רמז נפרד כשהדפדפן חוסם נגינה
 * עד לנגיעה הראשונה של המשתמש.
 */
export default function MusicToggle() {
  const [, force] = useState(0);

  useEffect(() => subscribe(() => force((n) => n + 1)), []);

  const muted = isMuted();
  const waiting = !muted && isWaitingForGesture();

  const label = muted
    ? 'הפעל מוזיקה'
    : waiting
      ? 'לחץ להפעלת המוזיקה'
      : 'השתק מוזיקה';

  return (
    <button
      type="button"
      className={`btn btn--ghost btn--sm ${waiting ? 'btn--nudge' : ''}`}
      onClick={toggleMuted}
      title={label}
      aria-label={label}
    >
      {muted ? '🔇' : waiting ? '🔈' : '🔊'}
    </button>
  );
}
