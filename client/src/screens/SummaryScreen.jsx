import SquadCard from '../components/SquadCard';
import LeaveButton from '../components/LeaveButton';
import MusicToggle from '../components/MusicToggle';

export default function SummaryScreen({
  participants,
  myId,
  myEditableRoster,
  onMovePlayer,
  onSaveRoster,
  onDeclareWinner,
  onLeave,
}) {
  // דירוג קבוצות לפי סכום הדירוגים — הכתרה בפועל נשארת בידי החברים
  const ranked = participants
    .map((p) => {
      const roster = p.id === myId && myEditableRoster ? myEditableRoster : p.roster;
      const total = roster.reduce((sum, slot) => sum + (slot.player?.rating ?? 0), 0);
      return { p, roster, total };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="app-shell screen-enter">
      <header className="masthead">
        <h1 className="masthead__title">המשחק הסתיים</h1>
        <div className="masthead__meta">
          <span className="pill">סדרו את החמישייה והכתירו זוכה</span>
          <span className="pill pill--rating">ממוין לפי סכום דירוגים</span>
          <MusicToggle />
          <LeaveButton onLeave={onLeave} />
        </div>
      </header>

      <div className="summary-grid">
        {ranked.map(({ p, roster }, idx) => {
          const isMe = p.id === myId;

          return (
            <SquadCard
              key={p.id}
              participant={p}
              roster={roster}
              title={`${idx === 0 ? '👑 ' : ''}${isMe ? `${p.name} — הקבוצה שלך` : p.name}`}
              accent={isMe}
              onMove={isMe ? onMovePlayer : undefined}
            >
              <div className="stack stack--tight">
                {isMe && (
                  <button
                    type="button"
                    className="btn btn--success btn--block"
                    onClick={onSaveRoster}
                  >
                    שמור הרכב מעודכן
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--gold btn--block"
                  onClick={() => onDeclareWinner(p.name)}
                >
                  🏆 הכתר כזוכה
                </button>
              </div>
            </SquadCard>
          );
        })}
      </div>
    </div>
  );
}
