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
  return (
    <div className="app-shell">
      <header className="masthead">
        <h1 className="masthead__title">המשחק הסתיים</h1>
        <div className="masthead__meta">
          <span className="pill">סדרו את החמישייה והכתירו זוכה</span>
          <MusicToggle />
          <LeaveButton onLeave={onLeave} />
        </div>
      </header>

      <div className="summary-grid">
        {participants.map((p) => {
          const isMe = p.id === myId;
          const roster = isMe && myEditableRoster ? myEditableRoster : p.roster;

          return (
            <SquadCard
              key={p.id}
              participant={p}
              roster={roster}
              title={isMe ? `${p.name} — הקבוצה שלך` : p.name}
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
