const CELLS = [
  { key: 'pts', label: 'נקודות' },
  { key: 'ast', label: 'אסיסטים' },
  { key: 'reb', label: 'ריבאונדים' },
  { key: 'stl', label: 'חטיפות' },
  { key: 'blk', label: 'חסימות' },
];

/**
 * ממוצעים למשחק מתחת לשחקן: נקודות, אסיסטים, ריבאונדים, חטיפות, חסימות.
 * stats.label / stats.season מסבירים מאיזו עונה הנתונים (עונה אחרונה / עונת שיא במכבי).
 */
export default function PlayerStatsStrip({ stats }) {
  if (!stats) {
    return <p className="stats-strip stats-strip--empty">אין נתוני סטטיסטיקה לשחקן הזה</p>;
  }

  return (
    <div className="stats-strip">
      <dl className="stats-strip__grid" aria-label="ממוצעים למשחק">
        {CELLS.map(({ key, label }) => (
          <div className="stats-strip__cell" key={key}>
            <dt>{label}</dt>
            <dd className="tnum">{stats[key] ?? '—'}</dd>
          </div>
        ))}
      </dl>
      {(stats.label || stats.season) && (
        <p className="stats-strip__source">
          {stats.label}
          {stats.season ? ` · ${stats.season}` : ''}
          {stats.gp ? ` · ${stats.gp} משחקים` : ''}
        </p>
      )}
    </div>
  );
}
