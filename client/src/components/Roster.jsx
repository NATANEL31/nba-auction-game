/**
 * חמישיית שחקנים כטבלה — שורה מופרדת בקו לכל עמדה.
 * onMove מועבר רק כשמותר לסדר מחדש (מסך הסיכום).
 */
export default function Roster({ roster, onMove, compact = false }) {
  return (
    <div className={`roster ${compact ? 'roster--compact' : ''}`}>
      {roster.map((slot, idx) => (
        <div
          key={idx}
          className={`roster__slot ${slot.player ? '' : 'roster__slot--empty'}`}
        >
          <span className="pos-badge">{slot.pos}</span>

          <div className="roster__main">
            <div className="roster__name">
              {slot.player ? slot.player.name : 'פנוי'}
            </div>

            {slot.player && (
              <div className="roster__meta">
                <span className="roster__rating tnum">⭐ {slot.player.rating}</span>
                <span className="roster__price tnum">${slot.player.boughtFor}</span>
                {slot.pos !== slot.player.position && (
                  <span className="roster__note">היה {slot.player.position}</span>
                )}
              </div>
            )}
          </div>

          {onMove && (
            <div className="roster__actions">
              <button
                type="button"
                className="btn btn--icon"
                disabled={idx === 0}
                onClick={() => onMove(idx, -1)}
                aria-label={`העלה את ${slot.pos} מעלה`}
              >
                ▲
              </button>
              <button
                type="button"
                className="btn btn--icon"
                disabled={idx === roster.length - 1}
                onClick={() => onMove(idx, 1)}
                aria-label={`הורד את ${slot.pos} מטה`}
              >
                ▼
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
