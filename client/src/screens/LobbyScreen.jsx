import LeaveButton from '../components/LeaveButton';
import MusicToggle from '../components/MusicToggle';

const MEDALS = ['🥇', '🥈', '🥉'];
// אפשר להתחיל גם לבד — שימושי לבדיקה בלי לחכות ליריב.
const MIN_PLAYERS = 1;

export default function LobbyScreen({
  participants,
  leaderboard,
  selectedPack,
  onPackChange,
  onStartGame,
  onLeave,
  myId,
  hostId,
  onKick,
}) {
  const ranked = Object.entries(leaderboard || {}).sort((a, b) => b[1] - a[1]);
  const canStart = participants.length >= MIN_PLAYERS;
  const isSolo = participants.length === 1;
  const isHost = myId === hostId;

  return (
    <div className="app-shell">
      <header className="masthead">
        <h1 className="masthead__title">חדר המתנה</h1>
        <div className="masthead__meta">
          <span className="pill pill--accent tnum">
            {participants.length} מחוברים
          </span>
          <MusicToggle />
          <LeaveButton onLeave={onLeave} inGame={false} />
        </div>
      </header>

      <div className="lobby-grid">
        <section className="panel">
          <header className="panel__head">
            <h2 className="panel__title">שחקנים בחדר</h2>
            <span className="eyebrow">Lobby</span>
          </header>

          <ul>
            {participants.map((p) => {
              const isOffline = p.connected === false;
              return (
                <li
                  key={p.id}
                  className={`player-row ${isOffline ? 'player-row--offline' : ''}`}
                >
                  <span
                    className={`dot ${isOffline ? 'dot--off' : ''}`}
                    aria-hidden="true"
                  />
                  <span>{p.name}</span>
                  {p.id === myId && <span className="player-row__you">אתה</span>}
                  {p.id === hostId && (
                    <span className="pill pill--accent">👑 מנהל</span>
                  )}
                  {isOffline && <span className="player-row__tag">מנותק</span>}

                  {isHost && p.id !== myId && (
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      style={{ marginInlineStart: 'auto' }}
                      onClick={() => onKick(p.id)}
                    >
                      הוצא
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="panel__section" style={{ borderTop: '1px solid var(--border)' }}>
            {!isHost ? (
              <p className="empty-note">
                ממתין ש{participants.find((p) => p.id === hostId)?.name || 'המנהל'}{' '}
                יתחיל את המשחק…
              </p>
            ) : canStart ? (
              <div className="stack">
                <div className="field">
                  <label className="field__label" htmlFor="pack">
                    חבילת שחקנים
                  </label>
                  <select
                    id="pack"
                    className="input select"
                    value={selectedPack}
                    onChange={(e) => onPackChange(e.target.value)}
                  >
                    <option value="nba">ליגת ה-NBA 🏀</option>
                    <option value="maccabi">מכבי תל אביב — הווה ואגדות 💛</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="btn btn--primary btn--lg btn--block"
                  onClick={onStartGame}
                >
                  {isSolo ? 'התחל משחק סולו' : 'התחל משחק'}
                </button>

                {isSolo && (
                  <p className="form-note">
                    אתה לבד בחדר — המשחק ירוץ במצב בדיקה ותזכה בכל שחקן
                    במחיר שתציע.
                  </p>
                )}
              </div>
            ) : (
              <p className="empty-note">ממתין לשחקנים…</p>
            )}
          </div>
        </section>

        {ranked.length > 0 && (
          <section className="panel">
            <header className="panel__head">
              <h2 className="panel__title">🏆 טבלת אלופים</h2>
              <span className="eyebrow">All time</span>
            </header>

            <div>
              {ranked.map(([name, score], idx) => (
                <div
                  key={name}
                  className={`leaderboard__row ${idx === 0 ? 'leaderboard__row--top' : ''}`}
                >
                  <span className="leaderboard__rank">
                    {MEDALS[idx] ?? `${idx + 1}.`}
                  </span>
                  <span className="leaderboard__name">{name}</span>
                  <span className="leaderboard__score tnum">{score} נק'</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
