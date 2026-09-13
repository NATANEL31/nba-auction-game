import React from 'react';

const MEDALS = ['🥇', '🥈', '🥉'];
const MIN_PLAYERS = 2;

export default function LobbyScreen({
  participants,
  leaderboard,
  selectedPack,
  onPackChange,
  onStartGame,
  myId,
  hostId,
  onKick
}) {
  const ranked = Object.entries(leaderboard || {}).sort((a, b) => b[1] - a[1]);
  const canStart = participants.length >= MIN_PLAYERS;
  const isHost = myId === hostId;

  return (
    <div className="app-shell">
      <header className="masthead">
        <h1 className="masthead__title">חדר המתנה</h1>
        <div className="masthead__meta">
          <span className="pill pill--accent tnum">
            {participants.length} מחוברים
          </span>
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
                  {p.id === hostId && <span className="pill pill--accent" style={{marginLeft: '8px'}}>👑 מנהל</span>}
                  {isOffline && <span className="player-row__tag" style={{marginLeft: '8px'}}>מנותק</span>}
                  
                  {isHost && p.id !== myId && (
                      <button 
                          className="btn btn--danger btn--sm" 
                          style={{marginRight: 'auto'}} 
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
            {isHost ? (
              canStart ? (
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
                    התחל משחק
                  </button>
                </div>
              ) : (
                <p className="empty-note">
                  ממתין לשחקנים נוספים… (דרושים {MIN_PLAYERS} לפחות כדי להתחיל)
                </p>
              )
            ) : (
                <p className="empty-note">
                  ממתין למנהל המשחק ({participants.find(p => p.id === hostId)?.name}) שיתחיל את המכרז...
                </p>
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