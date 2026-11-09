import { useEffect, useRef, useState } from 'react';

/**
 * מספר שסופר בעדינות מהערך הקודם לחדש.
 */
export default function AnimatedNumber({ value, prefix = '', duration = 450 }) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return undefined;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (value - from) * eased);
      setShown(current);
      fromRef.current = current;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className="tnum">
      {prefix}
      {shown}
    </span>
  );
}
