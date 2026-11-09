import { useMemo } from 'react';
import PlayerAvatar from './PlayerAvatar';

const COLORS = ['var(--accent)', 'var(--gold)', 'var(--success)', 'var(--info)', '#ffffff'];

/**
 * שכבת "נמכר!" — מופיעה לכמה שניות אחרי כל סגירת מכרז, עם קונפטי.
 * info = { playerName, winnerName, price, photo, playerRating }
 */
export default function SoldOverlay({ info }) {
  // פיזור דטרמיניסטי לפי אינדקס (בלי Math.random בזמן רינדור)
  const pieces = useMemo(() => {
    const r = (i, k) => {
      const x = Math.sin((i + 1) * 12.9898 + k * 78.233 + (info?.id ?? 0)) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: 34 }, (_, i) => ({
      left: Math.round(r(i, 1) * 100),
      delay: Math.round(r(i, 2) * 500),
      dur: 1800 + Math.round(r(i, 3) * 1400),
      drift: Math.round(r(i, 4) * 160 - 80),
      rot: Math.round(r(i, 5) * 720),
      color: COLORS[i % COLORS.length],
    }));
  }, [info?.id]);

  if (!info) return null;

  return (
    <div className="sold" role="status" aria-live="polite">
      <div className="sold__confetti" aria-hidden="true">
        {pieces.map((p, i) => (
          <span
            key={i}
            style={{
              left: `${p.left}%`,
              background: p.color,
              animationDelay: `${p.delay}ms`,
              animationDuration: `${p.dur}ms`,
              '--drift': `${p.drift}px`,
              '--rot': `${p.rot}deg`,
            }}
          />
        ))}
      </div>

      <div className="sold__card">
        <div className="sold__stamp">נמכר!</div>
        <div className="sold__photo">
          <PlayerAvatar player={{ name: info.playerName, photo: info.photo }} />
        </div>
        <div className="sold__name">{info.playerName}</div>
        <div className="sold__line">
          נחתם על ידי <strong>{info.winnerName}</strong>
        </div>
        <div className="sold__price tnum">${info.price}</div>
      </div>
    </div>
  );
}
