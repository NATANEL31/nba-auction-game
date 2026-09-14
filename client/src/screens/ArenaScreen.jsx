import SquadCard from '../components/SquadCard';
import LeaveButton from '../components/LeaveButton';
import MusicToggle from '../components/MusicToggle';
import PlayerAvatar from '../components/PlayerAvatar';

const TURN_SECONDS = 15;
const DANGER_AT = 5;

export default function ArenaScreen({
  gameState,
  me,
  myId,
  myRoster,
  timeLeft,
  customBid,
  onCustomBidChange,
  onBid,
  onFold,
  onLeave,
  isHost,
  onEndGame,
}) {
  const auction = gameState.currentAuction;
  const player = auction.player;

  const isMyTurn = auction.currentTurnId === myId;
  const currentTurnPlayer = gameState.participants.find(
    (p) => p.id === auction.currentTurnId,
  );

  const currentHighest = auction.highestBid !== undefined ? auction.highestBid : -1;
  const isFirstBid = currentHighest === -1;
  const maxAllowedBid = me ? me.budget : 0;

  const plusOneBid = isFirstBid ? 1 : currentHighest + 1;
  const canPlusOne = isMyTurn && plusOneBid <= maxAllowedBid;
  const isValidCustom =
    customBid !== '' &&
    Number(customBid) > currentHighest &&
    Number(customBid) <= maxAllowedBid;

  // סדר ההצעות, מסודר כך שהתור הנוכחי ראשון
  const activeBidderIds = auction.activeBidders || [];
  const currentTurnIdx = activeBidderIds.indexOf(auction.currentTurnId);
  const upcomingTurns = [];

  if (currentTurnIdx !== -1) {
    for (let i = 0; i < activeBidderIds.length; i++) {
      const id = activeBidderIds[(currentTurnIdx + i) % activeBidderIds.length];
      const p = gameState.participants.find((part) => part.id === id);
      if (p) upcomingTurns.push({ id, name: p.name, isMe: id === myId });
    }
  }

  const timerPct = Math.max(0, Math.min(100, (timeLeft / TURN_SECONDS) * 100));
  const isUrgent = timeLeft <= DANGER_AT;

  const rivals = gameState.participants.filter((p) => p.id !== myId);

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (isValidCustom) onBid(Number(customBid));
  };

  return (
    <div className="app-shell">
      <header className="masthead">
        <h1 className="masthead__title">זירת המכרז</h1>
        <div className="masthead__meta">
          <span className="pill pill--accent tnum">
            סיבוב {gameState.auctionIndex + 1}
          </span>
          {me && <span className="pill pill--money tnum">התקציב שלי ${me.budget}</span>}
          <MusicToggle />
          {isHost && (
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={onEndGame}
            >
              סגור משחק
            </button>
          )}
          <LeaveButton onLeave={onLeave} />
        </div>
      </header>

      <div className="arena">
        {/* ================= הבמה: השחקן + המכרז ================= */}
        <div className="arena__stage">
          {upcomingTurns.length > 0 && (
            <div className="turn-strip">
              <span className="eyebrow">סדר הצעות</span>
              {upcomingTurns.map((turn, idx) => (
                <span key={turn.id} style={{ display: 'contents' }}>
                  <span
                    className={`turn-strip__chip ${idx === 0 ? 'turn-strip__chip--now' : ''}`}
                  >
                    {turn.name}
                    {turn.isMe ? ' (אתה)' : ''}
                  </span>
                  {idx < upcomingTurns.length - 1 && (
                    <span className="turn-strip__arrow" aria-hidden="true">
                      ←
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* --- כרטיס השחקן שעל המגרש --- */}
          <section className="panel">
            <header className="panel__head">
              <h2 className="panel__title">השחקן במכרז</h2>
              <span className="eyebrow">
                סיבוב {gameState.auctionIndex + 1}
              </span>
            </header>

            <div className="player-card__body">
              <div className="player-card__media">
                <PlayerAvatar player={player} />
              </div>

              <div className="player-card__info">
                <div className="player-card__tags">
                  <span className="pos-badge pos-badge--lg">{player.position}</span>
                  <span className="pill pill--rating tnum">
                    ⭐ דירוג {player.rating}
                  </span>
                </div>
                <h3 className="player-card__name">{player.name}</h3>
              </div>
            </div>
          </section>

          {/* --- כרטיס המכרז: הצעה, מוביל, טיימר, פעולות --- */}
          <section className={`panel ${isMyTurn ? 'panel--accent' : ''}`}>
            <header className="panel__head">
              <h2 className="panel__title">המכרז</h2>
              <span className="eyebrow">
                {isMyTurn ? 'התור שלך' : 'ממתין'}
              </span>
            </header>

            <div className="bid-figure">
              <div className="bid-figure__cell">
                <p className="eyebrow">הצעה נוכחית</p>
                {isFirstBid ? (
                  <p className="bid-figure__amount--empty">טרם הוגשה הצעה</p>
                ) : (
                  <p className="bid-figure__amount tnum">${currentHighest}</p>
                )}
              </div>

              <div className="bid-figure__cell">
                <p className="eyebrow">מוביל</p>
                <p className="bid-figure__leader-name">
                  {auction.highestBidder || '—'}
                </p>
              </div>
            </div>

            <div className="panel__section">
              <div className="timer-row">
                <div
                  className={`timer-ring ${isUrgent ? 'timer-ring--danger' : ''}`}
                  style={{ '--pct': timerPct }}
                  role="timer"
                  aria-label={`נותרו ${timeLeft} שניות`}
                >
                  <span className="timer-ring__value tnum">{timeLeft}</span>
                </div>

                <div className="turn-status">
                  <p
                    className={`turn-status__who ${isMyTurn ? 'turn-status__who--mine' : ''}`}
                  >
                    {isMyTurn
                      ? 'התור שלך להציע'
                      : `ממתין ל${currentTurnPlayer?.name || '…'}`}
                  </p>
                  <p className="turn-status__hint">
                    {!isMyTurn
                      ? 'ההצעה תעבור אליך מיד לאחר מכן'
                      : isFirstBid
                        ? 'אתה פותח את המכרז — אי אפשר לפרוש בשלב הזה'
                        : 'בחר הצעה לפני שהזמן נגמר'}
                  </p>
                </div>
              </div>
            </div>

            <div className="panel__section">
              <form className="stack stack--tight" onSubmit={handleCustomSubmit}>
                <div className="bid-controls">
                  <button
                    type="button"
                    className="btn btn--info"
                    disabled={!canPlusOne}
                    onClick={() => onBid(plusOneBid)}
                  >
                    +1$
                  </button>

                  <input
                    type="number"
                    className="input"
                    value={customBid}
                    onChange={(e) => onCustomBidChange(e.target.value)}
                    placeholder="סכום אחר…"
                    disabled={!isMyTurn}
                    min={currentHighest + 1}
                    max={maxAllowedBid}
                    aria-label="סכום הצעה מותאם"
                  />

                  <button
                    type="submit"
                    className="btn btn--success"
                    disabled={!isMyTurn || !isValidCustom}
                  >
                    הצע
                  </button>

                  <span className="bid-controls__spacer" aria-hidden="true" />

                  <button
                    type="button"
                    className={`btn ${isFirstBid ? 'btn--ghost' : 'btn--danger'}`}
                    disabled={!isMyTurn}
                    onClick={() => (isFirstBid ? onBid(0) : onFold())}
                  >
                    {isFirstBid ? 'הצע $0' : 'פרוש'}
                  </button>
                </div>
              </form>

              {isMyTurn && (
                <>
                  <p className="bid-limit">
                    הצעה מקסימלית: <strong className="tnum">${maxAllowedBid}</strong>
                  </p>
                  {isFirstBid && (
                    <p className="bid-note">
                      פתיחת המכרז — חובה להציע לפחות $0, אי אפשר לפרוש עדיין.
                      אם הזמן ייגמר תוגש עבורך הצעה של $0.
                    </p>
                  )}
                </>
              )}
            </div>
          </section>
        </div>

        {/* ================= החמישייה שלי ================= */}
        <div className="arena__mine">
          {me && myRoster && (
            <SquadCard
              participant={me}
              roster={myRoster}
              title="החמישייה שלי"
              accent
            />
          )}
        </div>

        {/* ================= יריבים ================= */}
        <div className="arena__rivals">
          <div className="rivals-list">
            {rivals.map((p) => (
              <SquadCard key={p.id} participant={p} roster={p.roster} compact />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
