import Roster from './Roster';

/**
 * כרטיס קבוצה של משתתף — פאנל עם כותרת משלו.
 * accent=true לקבוצה שלי, compact=true ליריבים בסיידבר.
 */
export default function SquadCard({
  participant,
  roster,
  title,
  accent = false,
  compact = false,
  onMove,
  children,
}) {
  const isOffline = participant.connected === false;
  const filled = roster.filter((slot) => slot.player !== null).length;

  return (
    <section
      className={`panel ${accent ? 'panel--accent' : ''} ${isOffline ? 'squad--offline' : ''}`}
    >
      <header className="panel__head">
        <h2 className="panel__title squad__head">
          <span className={`dot ${isOffline ? 'dot--off' : ''}`} aria-hidden="true" />
          <span className="squad__name">{title ?? participant.name}</span>
          {isOffline && <span className="player-row__tag">מנותק</span>}
        </h2>

        <div className="masthead__meta">
          <span className="pill pill--money tnum">${participant.budget}</span>
          <span className="pill tnum">
            {filled}/{roster.length}
          </span>
        </div>
      </header>

      <div className="panel__body--flush">
        <Roster roster={roster} onMove={onMove} compact={compact} />
      </div>

      {children && <div className="panel__section">{children}</div>}
    </section>
  );
}
