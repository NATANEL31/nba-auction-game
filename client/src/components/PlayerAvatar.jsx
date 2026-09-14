import { useState } from 'react';

/**
 * תמונת שחקן. אם אין תמונה — או שהיא נכשלת בטעינה —
 * מוצג עיגול ראשי תיבות בצבע שנגזר מהשם, כך שאותו שחקן
 * מקבל תמיד את אותו צבע.
 */

// גוונים שעובדים על רקע כהה בשתי ערכות הנושא
const HUES = [8, 28, 45, 140, 170, 200, 220, 260, 290, 330];

function hueFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return HUES[h % HUES.length];
}

function initialsFor(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2);
  return words[0][0] + words[words.length - 1][0];
}

export default function PlayerAvatar({ player, className = '' }) {
  const [failed, setFailed] = useState(false);
  const showPhoto = player.photo && !failed;

  if (showPhoto) {
    return (
      <div className={`avatar ${className}`}>
        <img
          src={player.photo}
          alt={player.name}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  const hue = hueFor(player.name);

  return (
    <div
      className={`avatar avatar--initials ${className}`}
      style={{
        '--avatar-hue': hue,
      }}
      aria-label={player.name}
      role="img"
    >
      <span>{initialsFor(player.name)}</span>
    </div>
  );
}
