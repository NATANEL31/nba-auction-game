import { useState } from 'react';
import SquadCard from '../components/SquadCard';
import LeaveButton from '../components/LeaveButton';
import MusicToggle from '../components/MusicToggle';
import PlayerAvatar from '../components/PlayerAvatar';
import AnimatedNumber from '../components/AnimatedNumber';

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

  // --- היסטוריית הצעות לשחקן הנוכחי (נגזרת משינויים במצב) ---
  const bidKey = `${player.name}|${auction.highestBid}|${auction.highestBidder}`;
  const [seenKey, setSeenKey] = useState(bidKey);
  const [seenPlayer, setSeenPlayer] = useState(player.name);
  const [history, setHistory] = useState([]);

  if (bidKey !== seenKey) {
    setSeenKey(bidKey);
    setSeenPlayer(player.name);
    const isNewPlayer = player.name !== seenPlayer;
    const entry =
      auction.highestBid >= 0 && auction.highestBidder
        ? [{ id: bidKey, who: auction.highestBidder, amount: auction.highestBid }]
        : [];
    setHistory((h) => (isNewPlayer ? entry : [...entry, ...h].slice(0, 6)));
  }

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

  // קפיצות מהירות: +5, +10 מעל ההצעה הנוכחית, ו"הכל" (כל התקציב)
  const quickBids = [5, 10]
    .map((n) => (isFirstBid ? n : currentHighest + n))
    .filter((v) => v <= maxAllowedBid && v > currentHighest);
  const allIn = maxAllowedBid > currentHighest && maxAllowedBid > 0 ? maxAllowedBid : null;
  const iLead = Boolean(me && auction.highestBidder && auction.highestBidder === me.name);

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
    <div className="app-shell screen-enter">
      <header className="masthead">
        <h1 className="masthead__title">זירת המכרז</h1>
        <div className="masthead__meta">
          <span className="pill pill--accent tnum">
            סיבוב {gameState.auctionIndex + 1}
          </span>
          {me && (
            <span className="pill pill--money tnum">
              התקציב שלי $<AnimatedNumber value={me.budget} />
            </span>
          )}
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

          {/* --- כרטיס השחקן שעל המגרש (key => אנימציית כניסה לכל שחקן) --- */}
          <section className="panel player-card" key={player.name}>
            <header className="panel__head">
              <h2 className="panel__title">השחקן במכרז</h2>
              <span className="eyebrow">סיבוב {gameState.auctionIndex + 1}</span>
            </header>

            <div className="player-card__body">
              <div className="player-card__media">
                <PlayerAvatar player={player} />
              </div>

              <div className="player-card__info">
                <div className="player-card__tags">
                  <span className="pos-badge pos-badge--lg">{player.position}</span>
                  <span className="pill pill--rating tnum">⭐ דירוג {player.rating}</span>
                </div>
                <h3 className="player-card__name">{player.name}</h3>
              </div>

              {player.stats && (
                <dl className="player-stats" aria-label="ממוצעים למשחק">
                  <div className="player-stats__item">
                    <dt>נק'</dt>
                    <dd className="tnum">{player.stats.pts}</dd>
                  </div>
                  <div className="player-stats__item">
                    <dt>ריב'</dt>
                    <dd className="tnum">{player.stats.reb}</dd>
                  </div>
                  <div className="player-stats__item">
                    <dt>אס'</dt>
                    <dd className="tnum">{player.stats.ast}</dd>
                  </div>
                </dl>
              )}
            </div>
          </section>

          {/* --- כרטיס המכרז: הצעה, מוביל, טיימר, פעולות --- */}
          <section className={`panel ${isMyTurn ? 'panel--accent panel--turn' : ''}`}>
            <header className="panel__head">
              <h2 className="panel__title">המכרז</h2>
              <span className="eyebrow">{isMyTurn ? 'התור שלך' : 'ממתין'}</span>
            </header>

            <div className="bid-figure">
              <div className="bid-figure__cell">
                <p className="eyebrow">הצעה נוכחית</p>
                {isFirstBid ? (
                  <p className="bid-figure__amount--empty">טרם הוגשה הצעה</p>
                ) : (
                  <p className="bid-figure__amount tnum" key={currentHighest}>
                    <AnimatedNumber value={currentHighest} prefix="$" />
                  </p>
                )}
              </div>

              <div className="bid-figure__cell">
                <p className="eyebrow">מוביל</p>
                <p
                  className={`bid-figure__leader-name ${iLead ? 'bid-figure__leader-name--me' : ''}`}
                  key={auction.highestBidder || 'none'}
                >
                  {iLead ? '👑 ' : ''}
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

                  {quickBids.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="btn btn--info"
                      disabled={!isMyTurn}
                      onClick={() => onBid(v)}
                    >
                      ${v}
                    </button>
                  ))}

                  {allIn !== null && (
                    <button
                      type="button"
                      className="btn btn--gold"
                      disabled={!isMyTurn}
                      onClick={() => onBid(allIn)}
                    >
                      הכל ${allIn}
                    </button>
                  )}

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

          {history.length > 0 && (
            <section className="panel">
              <header className="panel__head">
                <h2 className="panel__title">היסטוריית הצעות</h2>
                <span className="eyebrow">אחרונות</span>
              </header>
              <ul className="bid-log">
                {history.map((h) => (
                  <li key={h.id} className="bid-log__row">
                    <span>{h.who}</span>
                    <strong className="tnum">${h.amount}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}
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
