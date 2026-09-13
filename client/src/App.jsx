import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './App.css'; // מייבאים את קובץ העיצוב החדש!

const socket = io();

function App() {
  const [gameState, setGameState] = useState(null);
  
  const [username, setUsername] = useState(() => localStorage.getItem('michrazUsername') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('michrazPassword') || '');
  
  const [hasJoined, setHasJoined] = useState(false);
  const [customBid, setCustomBid] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [myEditableRoster, setMyEditableRoster] = useState(null);
  const [soldNotification, setSoldNotification] = useState(null);
  
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    socket.on('updateState', (newState) => {
      setGameState(newState);
      setCustomBid('');
      
      if (newState?.currentAuction?.timeLeft !== undefined) {
        setTimeLeft(newState.currentAuction.timeLeft);
      }
      
      if (!newState.gameStarted) {
        setMyEditableRoster(null);
      }
    });

    socket.on('timerUpdate', (time) => {
      setTimeLeft(time);
    });
    
    socket.on('error', (msg) => {
      setErrorMsg(msg);
      setHasJoined(false);
    });

    socket.on('playerSold', (data) => {
      setSoldNotification(`${data.playerName} נדגם על ידי ${data.winnerName}! 🏀`);
      
      setTimeout(() => {
        setSoldNotification(null);
      }, 4000); 
    });

    return () => {
      socket.off('updateState');
      socket.off('timerUpdate');
      socket.off('error');
      socket.off('playerSold');
    };
  }, []);

  const handleJoin = () => {
    if (username.trim() !== '' && password.trim() !== '') {
      localStorage.setItem('michrazUsername', username.trim()); 
      localStorage.setItem('michrazPassword', password.trim()); 
      setErrorMsg('');
      socket.emit('joinGame', { username: username.trim(), password: password.trim() });
      setHasJoined(true);
    } else {
      setErrorMsg('נא למלא שם משתמש וסיסמה');
    }
  };

  const handleStartGame = () => {
    socket.emit('startGame');
  };

  const handleBid = (amount) => socket.emit('placeBid', amount);
  const handleFold = () => socket.emit('fold');

  const handleDeclareWinner = (winnerName) => {
    if (window.confirm(`האם אתם מסכימים להכתיר את ${winnerName} כזוכה של המשחק הזה?`)) {
      socket.emit('declareWinner', winnerName);
    }
  };

  // מציג את ההתראה הקופצת (Toast)
  const NotificationPopup = () => soldNotification ? (
    <div className="toast-notification">{soldNotification}</div>
  ) : null;

  // --- מסך התחברות ---
  if (!hasJoined) {
    return (
      <div className="app-container">
        <div className="card" style={{ maxWidth: '400px', margin: '50px auto' }}>
          <h1 className="main-title">מכרז 🏀</h1>
          {errorMsg && <p style={{ color: 'var(--danger)', fontWeight: 'bold', textAlign: 'center' }}>{errorMsg}</p>}
          
          <div className="flex-center" style={{ marginTop: '20px' }}>
            <input 
              type="text" 
              placeholder="שם משתמש" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
            />
            <input 
              type="password" 
              placeholder="סיסמה" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
            <button onClick={handleJoin} className="btn btn-primary full-width">
              הכנס למשחק
            </button>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9em', textAlign: 'center', margin: 0 }}>
              * בפעם הראשונה המערכת תשמור את הסיסמה. מאותו רגע, רק אתה תוכל להתחבר לשם זה.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- חדר המתנה וטבלת דירוג ---
  if (gameState && !gameState.gameStarted) {
    const sortedLeaderboard = Object.entries(gameState.leaderboard || {}).sort((a, b) => b[1] - a[1]);

    return (
      <div className="app-container">
        <h1 className="main-title">מכרז 🏀 - חדר המתנה</h1>
        
        <div className="grid-container" style={{ marginTop: '30px' }}>
          
          <div className="card">
            <h2 className="sub-title">שחקנים מחוברים:</h2>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: '1.2em' }}>
              {gameState.participants.map(p => (
                <li key={p.id} style={{ margin: '10px 0', backgroundColor: '#f9f9f9', padding: '12px', borderRadius: '8px', opacity: p.connected === false ? 0.5 : 1 }}>
                  <span className="status-indicator">{p.connected === false ? '🔴' : '🟢'}</span> 
                  <strong>{p.name}</strong> {p.id === socket.id ? '(אתה)' : ''} {p.connected === false ? '(מנותק)' : ''}
                </li>
              ))}
            </ul>
            {gameState.participants.length >= 2 ? (
              <div style={{ marginTop: '30px' }}>
                <button onClick={handleStartGame} className="btn btn-success full-width">
                  התחל משחק!
                </button>
              </div>
            ) : (
              <p style={{ color: 'var(--text-light)', marginTop: '20px', textAlign: 'center' }}>ממתין לשחקנים נוספים... (דרושים 2 לפחות)</p>
            )}
          </div>

          {sortedLeaderboard.length > 0 && (
            <div className="card" style={{ borderColor: 'var(--primary)', backgroundColor: '#fffcf8' }}>
              <h2 className="sub-title" style={{ borderColor: '#ffb300' }}>🏆 טבלת אלופים 🏆</h2>
              <table className="leaderboard-table">
                <tbody>
                  {sortedLeaderboard.map(([name, score], idx) => (
                    <tr key={name}>
                      <td style={{ fontWeight: idx === 0 ? 'bold' : 'normal' }}>
                        {idx === 0 && '🥇 '} 
                        {idx === 1 && '🥈 '} 
                        {idx === 2 && '🥉 '}
                        {idx > 2 && `${idx + 1}. `} 
                        {name}
                      </td>
                      <td style={{ fontWeight: 'bold', color: 'var(--secondary)' }}>
                        {score} נק'
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    );
  }

  // לוגיקות משחק
  const isGameOver = gameState?.auctionIndex > 0 && !gameState?.currentAuction?.player;
  const me = gameState?.participants.find(p => p.id === socket.id);
  
  if (isGameOver && me && !myEditableRoster) {
    setMyEditableRoster(JSON.parse(JSON.stringify(me.roster)));
  }

  const movePlayer = (idx, direction) => {
    if (!myEditableRoster) return;
    const newRoster = [...myEditableRoster];
    const swapIdx = idx + direction;
    
    if (swapIdx >= 0 && swapIdx < 5) {
      const temp = newRoster[idx].player;
      newRoster[idx].player = newRoster[swapIdx].player;
      newRoster[swapIdx].player = temp;
      setMyEditableRoster(newRoster);
    }
  };

  const saveRoster = () => {
    if (myEditableRoster) {
      socket.emit('rearrangeRoster', myEditableRoster);
    }
  };

  // --- מסך סיכום המשחק ---
  if (isGameOver) {
    return (
      <div className="app-container">
        <NotificationPopup />

        <h1 className="main-title">המשחק הסתיים! 🎉</h1>
        <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>סיכום קבוצות והכרזת מנצח</h2>
        
        <div className="grid-container">
          {gameState?.participants.map(p => {
            const isMe = p.id === socket.id;
            const displayRoster = (isMe && myEditableRoster) ? myEditableRoster : p.roster;
            
            return (
              <div key={p.id} className="card" style={{ borderColor: isMe ? 'var(--secondary)' : 'var(--border-color)', backgroundColor: isMe ? '#f1f8e9' : 'var(--card-bg)' }}>
                <h3 style={{ margin: '0 0 10px 0', opacity: p.connected === false ? 0.5 : 1 }}>
                  {p.connected === false && '🔴 '}
                  {p.name} {isMe ? '(הקבוצה שלך)' : ''}
                </h3>
                <p style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>עודף בקופה: ${p.budget}</p>
                
                <div className="roster-list">
                  {displayRoster.map((slot, idx) => (
                    <div key={idx} className="roster-slot">
                      <div className="pos-badge">{slot.pos}</div>
                      
                      <div className="player-info">
                        {slot.player ? (
                          <span>
                            {slot.player.name} 
                            <span className="player-rating-small">(⭐ {slot.player.rating})</span> 
                            <span className="player-price">(${slot.player.boughtFor})</span>
                          </span>
                        ) : (
                          <span style={{ color: '#aaa' }}>-</span>
                        )}
                      </div>

                      {isMe && (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => movePlayer(idx, -1)} disabled={idx === 0} className="btn" style={{padding: '5px'}}>⬆️</button>
                          <button onClick={() => movePlayer(idx, 1)} disabled={idx === 4} className="btn" style={{padding: '5px'}}>⬇️</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {isMe && (
                  <button onClick={saveRoster} className="btn btn-success full-width" style={{ marginTop: '15px' }}>
                    שמור הרכב מעודכן
                  </button>
                )}

                <button 
                  onClick={() => handleDeclareWinner(p.name)} 
                  className="btn btn-gold full-width" style={{ marginTop: '10px' }}>
                  🏆 הכתר כזוכה
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- מסך המכרז הפעיל ---
  const isMyTurn = gameState?.currentAuction?.currentTurnId === socket.id;
  const currentTurnPlayer = gameState?.participants.find(p => p.id === gameState?.currentAuction?.currentTurnId);
  
  const currentHighest = gameState?.currentAuction?.highestBid !== undefined ? gameState.currentAuction.highestBid : -1;
  const isFirstBid = currentHighest === -1;
  
  let maxAllowedBid = 0;
  if (me) { maxAllowedBid = me.budget; }

  const plusOneBid = currentHighest === -1 ? 1 : currentHighest + 1;
  const canPlusOne = isMyTurn && plusOneBid <= maxAllowedBid;
  const isValidCustom = customBid !== '' && Number(customBid) > currentHighest && Number(customBid) <= maxAllowedBid;

  const activeBiddersIds = gameState?.currentAuction?.activeBidders || [];
  const currentTurnIdx = activeBiddersIds.indexOf(gameState?.currentAuction?.currentTurnId);
  const upcomingTurns = [];
  
  if (currentTurnIdx !== -1) {
      for (let i = 0; i < activeBiddersIds.length; i++) {
          const id = activeBiddersIds[(currentTurnIdx + i) % activeBiddersIds.length];
          const p = gameState.participants.find(part => part.id === id);
          if (p) upcomingTurns.push(p.name + (id === socket.id ? ' (אתה)' : ''));
      }
  }

  return (
    <div className="app-container">
      <NotificationPopup />

      <h1 className="main-title">זירת המכרז 🏀</h1>
      
      <div className="arena-layout">
        
        {/* סיידבר - המשתתפים */}
        <div className="sidebar card">
          <h2 className="sub-title">משתתפים מחוברים</h2>
          {gameState?.participants.map(p => {
            const filledCount = p.roster.filter(s => s.player !== null).length;
            
            return (
              <div key={p.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', marginBottom: '15px', opacity: p.connected === false ? 0.6 : 1 }}>
                <strong style={{ fontSize: '1.2em' }}>
                  {p.connected === false && '🔴 '}
                  {p.name} {p.id === socket.id ? '(אתה)' : ''}
                  {p.connected === false && <span style={{ color: 'var(--danger)', fontSize: '0.8em' }}> (מנותק)</span>}
                </strong>
                <p style={{ margin: '5px 0', color: 'var(--secondary)', fontWeight: 'bold' }}>תקציב נותר: ${p.budget}</p>
                <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-light)' }}>שחקנים ({filledCount}/5):</p>
                
                <div className="roster-list">
                  {p.roster.map((slot, idx) => (
                    <div key={idx} className="roster-slot" style={{ padding: '4px 0' }}>
                      <div className="pos-badge" style={{ fontSize: '0.9rem', width: '35px' }}>{slot.pos}</div> 
                      <div className="player-info" style={{ fontSize: '0.95rem' }}>
                        {slot.player ? (
                          <span>
                            {slot.player.name} 
                            <span className="player-rating-small">(⭐ {slot.player.rating})</span> 
                            <span className="player-price">(${slot.player.boughtFor})</span>
                            {slot.pos !== slot.player.position && <span style={{ fontSize: '0.75em', color: 'var(--text-light)' }}> (היה {slot.player.position})</span>}
                          </span>
                        ) : (
                          <span style={{ color: '#aaa' }}>פנוי</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* הזירה המרכזית */}
        <div className="main-stage card">
          {gameState?.currentAuction.player ? (
            <div>
              {upcomingTurns.length > 0 && (
                <div className="order-alert">
                  <strong>סדר הצעות: </strong>
                  {upcomingTurns.map((name, idx) => (
                    <span key={idx}>
                      <span style={{ color: idx === 0 ? 'var(--secondary)' : 'var(--text-dark)', fontWeight: idx === 0 ? 'bold' : 'normal' }}>
                        {name} {idx === 0 && '(עכשיו)'}
                      </span>
                      {idx < upcomingTurns.length - 1 && ' ⬅️ '}
                    </span>
                  ))}
                </div>
              )}

              <h2 className="sub-title">סיבוב {gameState.auctionIndex + 1}</h2>
              <p style={{ fontSize: '1.2rem', margin: '10px 0 0 0', fontWeight: 'bold' }}>עמדה: {gameState.currentAuction.player.position}</p>
              
              <h3 style={{ fontSize: '3rem', margin: '20px 0 10px 0', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>
                {gameState.currentAuction.player.name} {gameState.currentAuction.player.image}
              </h3>
              
              <div className="rating-badge">
                ⭐ דירוג 2K27: {gameState.currentAuction.player.rating}
              </div>
              
              <div className="card" style={{ margin: '30px 0', backgroundColor: '#fff', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '1.8rem', color: 'var(--secondary)', margin: '0 0 10px 0' }}>
                  הצעה נוכחית: {isFirstBid ? 'טרם הוגשה' : `$${currentHighest}`}
                </h4>
                <p style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-light)' }}>
                  מוביל: <strong style={{color: 'var(--text-dark)'}}>{gameState.currentAuction.highestBidder ? gameState.currentAuction.highestBidder : 'הצע 0$ כדי להשתלט על השחקן'}</strong>
                </p>
              </div>

              <div className="card" style={{ border: isMyTurn ? '2px solid var(--secondary)' : '1px solid transparent', backgroundColor: isMyTurn ? '#f1f8e9' : 'transparent', boxShadow: 'none' }}>
                <h3 style={{ color: isMyTurn ? 'var(--secondary)' : 'var(--text-light)', margin: '0 0 5px 0', fontSize: '1.4rem' }}>
                  {isMyTurn ? 'התור שלך!' : `ממתין להחלטה של ${currentTurnPlayer?.name || '...'}`}
                </h3>
                
                {/* הטיימר מקבל קלאס של סכנה בשניות האחרונות */}
                <div className={`timer-display ${timeLeft <= 5 ? 'timer-danger' : ''}`}>
                  ⏳ {timeLeft}
                </div>
                
                <div className="flex-center">
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
                    <button 
                      disabled={!canPlusOne}
                      onClick={() => handleBid(plusOneBid)}
                      className="btn btn-blue">
                      +1$ 
                    </button>

                    <input 
                      type="number" 
                      value={customBid}
                      onChange={(e) => setCustomBid(e.target.value)}
                      placeholder="הקלד סכום..."
                      disabled={!isMyTurn}
                      className="input-field"
                      style={{ width: '130px' }}
                    />
                    <button 
                      disabled={!isMyTurn || !isValidCustom}
                      onClick={() => handleBid(Number(customBid))}
                      className="btn btn-success">
                      הצע סכום
                    </button>
                  </div>

                  <button 
                    disabled={!isMyTurn}
                    onClick={() => isFirstBid ? handleBid(0) : handleFold()}
                    className={`btn full-width ${isFirstBid ? 'btn-blue' : 'btn-danger'}`}
                    style={{ maxWidth: '250px' }}>
                    {isFirstBid ? 'הצע $0' : 'פרוש'}
                  </button>
                </div>

                {isMyTurn && (
                  <div style={{ marginTop: '20px' }}>
                    {isFirstBid && (
                      <p style={{ fontSize: '1rem', color: 'var(--primary)', fontWeight: 'bold', margin: '5px 0' }}>
                        ⚠️ המכרז נפתח! לחץ "הצע $0" כדי להעביר את התור ללא עלות.
                      </p>
                    )}
                    <p style={{ fontSize: '0.9rem', color: 'var(--danger)', fontWeight: 'bold', margin: '5px 0' }}>
                      הצעה מקסימלית: ${maxAllowedBid}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <h2>המשחק הסתיים!</h2>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;