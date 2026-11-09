import SquadCard from '../components/SquadCard';
import LeaveButton from '../components/LeaveButton';
import MusicToggle from '../components/MusicToggle';

export default function SummaryScreen({
  participants,
  myId,
  myEditableRoster,
  onMovePlayer,
  onSaveRoster,
  votes,
  myName,
  isHost,
  onVote,
  onCloseVote,
  onLeave,
}) {
  // דירוג קבוצות לפי סכום הדירוגים — ההכרעה בפועל נעשית בהצבעה
  const ranked = participants
    .map((p) => {
      const roster = p.id === myId && myEditableRoster ? myEditableRoster : p.roster;
      const total = roster.reduce((sum, slot) => sum + (slot.player?.rating ?? 0), 0);
      return { p, roster, total };
    })
    .sort((a, b) => b.total - a.total);

  const connected = participants.filter((p) => p.connected !== false);
  const votedCount = connected.filter((p) => votes[p.name]).length;
  const myVote = myName ? votes[myName] : undefined;
  const totalVotes = Object.keys(votes).length;

  const votersFor = (name) =>
    Object.entries(votes)
      .filter(([, candidate]) => candidate === name)
      .map(([voter]) => voter);

  return (
    <div className="app-shell screen-enter">
      <header className="masthead">
        <h1 className="masthead__title">המשחק הסתיים</h1>
        <div className="masthead__meta">
          <span className="pill">בחרו את הקבוצה הטובה ביותר</span>
          <span className="pill pill--accent tnum">
            🗳️ {votedCount}/{connected.length} הצביעו
          </span>
          {isHost && totalVotes > 0 && (
            <button type="button" className="btn btn--gold btn--sm" onClick={onCloseVote}>
              סגור הצבעה
            </button>
          )}
          <MusicToggle />
          <LeaveButton onLeave={onLeave} />
        </div>
      </header>

      <p className="vote-hint">
        כל משתתף מצביע לקבוצה אחת (אפשר גם לעצמו, ואפשר לשנות עד שכולם מצביעים). הזוכה מוכרז
        כשכולם הצביעו — ובתיקו מכריע סכום הדירוגים.
      </p>

      <div className="summary-grid">
        {ranked.map(({ p, roster, total }, idx) => {
          const isMe = p.id === myId;
          const voters = votersFor(p.name);
          const votedForThis = myVote === p.name;

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
                <div className="vote-tally">
                  <span className="vote-tally__count tnum">
                    {voters.length} {voters.length === 1 ? 'קול' : 'קולות'}
                  </span>
                  <span className="vote-tally__rating tnum">סכום דירוגים {total}</span>
                </div>
                {voters.length > 0 && <p className="vote-tally__names">{voters.join(' · ')}</p>}

                {isMe && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--block"
                    onClick={onSaveRoster}
                  >
                    שמור הרכב מעודכן
                  </button>
                )}
                <button
                  type="button"
                  className={`btn btn--block ${votedForThis ? 'btn--success' : 'btn--gold'}`}
                  onClick={() => onVote(p.name)}
                  disabled={votedForThis}
                >
                  {votedForThis ? '✓ הצבעת לקבוצה הזו' : '🗳️ הצבע לקבוצה הזו'}
                </button>
              </div>
            </SquadCard>
          );
        })}
      </div>
    </div>
  );
}
