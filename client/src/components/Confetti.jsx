import { useMemo } from 'react';

const COLORS = ['var(--accent)', 'var(--gold)', 'var(--success)', 'var(--info)', '#ffffff'];

/**
 * קונפטי נופל. seed שונה => פיזור שונה. דטרמיניסטי (בלי Math.random בזמן רינדור).
 */
export default function Confetti({ seed = 0, count = 34 }) {
  const pieces = useMemo(() => {
    const r = (i, k) => {
      const x = Math.sin((i + 1) * 12.9898 + k * 78.233 + seed) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: count }, (_, i) => ({
      left: Math.round(r(i, 1) * 100),
      delay: Math.round(r(i, 2) * 500),
      dur: 1800 + Math.round(r(i, 3) * 1400),
      drift: Math.round(r(i, 4) * 160 - 80),
      rot: Math.round(r(i, 5) * 720),
      color: COLORS[i % COLORS.length],
    }));
  }, [seed, count]);

  return (
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
  );
}
