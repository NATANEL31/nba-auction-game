import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io();

function App() {
  const [gameState, setGameState] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [customBid, setCustomBid] = useState('');
  
  const [myEditableRoster, setMyEditableRoster] = useState(null);

  useEffect(() => {
    socket.on('updateState', (newState) => {
      setGameState(newState);
      setCustomBid('');
    });
    return () => socket.off('updateState');
  }, []);

  const handleJoin = () => {
    if (playerName.trim() !== '') {
      socket.emit('joinGame', playerName);
      setHasJoined(true);
    }
  };

  const handleBid = (amount) => socket.emit('placeBid', amount);
  const handleFold = () => socket.emit('fold');

  if (!hasJoined) {
    return (
      <div style={{ textAlign: 'center', direction: 'rtl', marginTop: '100px', fontFamily: 'sans-serif' }}>
        <h1>ברוך הבא למכרז NBA 🏀</h1>
        <input 
          type="text" 
          placeholder="איך קוראים לך?" 
          value={playerName} 
          onChange={(e) => setPlayerName(e.target.value)}
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <button onClick={handleJoin} style={{ padding: '10px 20px', fontSize: '16px', marginRight: '10px', cursor: 'pointer' }}>
          הכנס למשחק
        </button>
      </div>
    );
  }

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
      <div style={{ direction: 'rtl', padding: '20px', fontFamily: 'sans-serif' }}>
        <h1 style={{ textAlign: 'center', fontSize: '3em', color: '#ff9800' }}>המשחק הסתיים! 🎉</h1>
        <h2 style={{ textAlign: 'center', marginBottom: '40px' }}>סיכום קבוצות סופי</h2>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
          {gameState?.participants.map(p => {
            const isMe = p.id === socket.id;
            const displayRoster = (isMe && myEditableRoster) ? myEditableRoster : p.roster;
            
            return (
              <div key={p.id} style={{ width: '350px', border: isMe ? '3px solid #4caf50' : '1px solid #ccc', padding: '20px', borderRadius: '8px', backgroundColor: isMe ? '#f1f8e9' : '#fff' }}>
                <h3 style={{ margin: '0 0 10px 0' }}>{p.name} {isMe ? '(הקבוצה שלך)' : ''}</h3>
                <p style={{ color: 'green', fontWeight: 'bold' }}>עודף בקופה: ${p.budget}</p>
                
                <div style={{ marginTop: '15px', backgroundColor: '#fafafa', padding: '10px', borderRadius: '4px', border: '1px solid #eee' }}>
                  {displayRoster.map((slot, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: idx < 4 ? '1px dashed #ddd' : 'none' }}>
                      <strong style={{ width: '40px', color: '#ff9800' }}>{slot.pos}</strong>
                      
                      <div style={{ flex: 1 }}>
                        {slot.player ? (
                          <span>
                            {slot.player.name} <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>(${slot.player.boughtFor})</span>
                          </span>
                        ) : (
                          <span style={{ color: '#aaa' }}>-</span>
                        )}
                      </div>

                      {isMe && (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => movePlayer(idx, -1)} disabled={idx === 0} style={{ cursor: idx === 0 ? 'not-allowed' : 'pointer' }}>⬆️</button>
                          <button onClick={() => movePlayer(idx, 1)} disabled={idx === 4} style={{ cursor: idx === 4 ? 'not-allowed' : 'pointer' }}>⬇️</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {isMe && (
                  <button onClick={saveRoster} style={{ width: '100%', marginTop: '15px', padding: '10px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer' }}>
                    שמור הרכב מעודכן
                  </button>
                )}
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
  const currentHighest = gameState?.currentAuction?.highestBid || 0;
  
  let maxAllowedBid = 0;
  if (me) {
    const emptySlots = 5 - me.roster.filter(s => s.player !== null).length;
    const requiredReserve = emptySlots > 0 ? emptySlots - 1 : 0;
    maxAllowedBid = me.budget - requiredReserve;
  }

  const isValidCustom = Number(customBid) > currentHighest && Number(customBid) <= maxAllowedBid;

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
    <div style={{ direction: 'rtl', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>זירת המכרז 🏀</h1>
      
      <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
        <div style={{ width: '30%', border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <h2>משתתפים מחוברים</h2>
          {gameState?.participants.map(p => {
            const filledCount = p.roster.filter(s => s.player !== null).length;
            
            return (
              <div key={p.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                <strong style={{ fontSize: '1.2em' }}>{p.name} {p.id === socket.id ? '(אתה)' : ''}</strong>
                <p style={{ margin: '5px 0', color: 'green', fontWeight: 'bold' }}>תקציב נותר: ${p.budget}</p>
                <p style={{ margin: 0, fontSize: '0.9em', color: '#555' }}>שחקנים ({filledCount}/5):</p>
                
                <div style={{ marginTop: '10px', fontSize: '0.95em', backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}>
                  {p.roster.map((slot, idx) => (
                    <div key={idx} style={{ padding: '4px 0', borderBottom: idx < 4 ? '1px dashed #eee' : 'none', display: 'flex' }}>
                      <strong style={{ width: '35px', color: '#ff9800' }}>{slot.pos}</strong> 
                      <div style={{ flex: 1 }}>
                        {slot.player ? (
                          <span>
                            {slot.player.name} <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>(${slot.player.boughtFor})</span>
                            {slot.pos !== slot.player.position && <span style={{ fontSize: '0.8em', color: 'gray' }}> (היה {slot.player.position})</span>}
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

        <div style={{ width: '70%', border: '2px solid #ff9800', padding: '30px', borderRadius: '8px', textAlign: 'center', backgroundColor: '#fff8f0' }}>
          {gameState?.currentAuction.player ? (
            <div>
              {upcomingTurns.length > 0 && (
                <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '8px', fontSize: '1.1em' }}>
                  <strong>סדר ההצעות הנוכחי: </strong>
                  {upcomingTurns.map((name, idx) => (
                    <span key={idx}>
                      <span style={{ color: idx === 0 ? 'green' : '#333', fontWeight: idx === 0 ? 'bold' : 'normal' }}>
                        {name} {idx === 0 && '(מציע כעת)'}
                      </span>
                      {idx < upcomingTurns.length - 1 && ' ⬅️ '}
                    </span>
                  ))}
                </div>
              )}

              <h2 style={{ color: '#ff9800', margin: '0' }}>השחקן המוגרל (סיבוב {gameState.auctionIndex + 1})</h2>
              <p style={{ fontSize: '1.2em', margin: '5px 0 0 0', fontWeight: 'bold' }}>עמדה: {gameState.currentAuction.player.position}</p>
              <h3 style={{ fontSize: '2.5em', margin: '15px 0' }}>
                {gameState.currentAuction.player.name} {gameState.currentAuction.player.image}
              </h3>
              
              <div style={{ margin: '30px 0', padding: '20px', backgroundColor: '#fff', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '1.8em', color: '#2e7d32', margin: '0 0 10px 0' }}>
                  הצעה נוכחית: ${currentHighest}
                </h4>
                <p style={{ fontSize: '1.1em', margin: 0 }}>
                  מי מוביל: {gameState.currentAuction.highestBidder ? gameState.currentAuction.highestBidder : 'אין עדיין הצעות'}
                </p>
              </div>

              <div style={{ padding: '15px', border: isMyTurn ? '2px solid green' : '1px solid transparent', borderRadius: '8px' }}>
                <h3 style={{ color: isMyTurn ? 'green' : 'gray', margin: '0 0 15px 0' }}>
                  {isMyTurn ? 'התור שלך! קבל החלטה:' : `ממתין להחלטה של ${currentTurnPlayer?.name || '...'}`}
                </h3>
                
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input 
                      type="number" 
                      value={customBid}
                      onChange={(e) => setCustomBid(e.target.value)}
                      placeholder="הקלד סכום..."
                      disabled={!isMyTurn}
                      style={{ width: '120px', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                    <button 
                      disabled={!isMyTurn || !isValidCustom}
                      onClick={() => handleBid(Number(customBid))}
                      style={{ opacity: (isMyTurn && isValidCustom) ? 1 : 0.5, padding: '10px 15px', fontSize: '16px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: (isMyTurn && isValidCustom) ? 'pointer' : 'not-allowed' }}>
                      הצע סכום זה
                    </button>
                  </div>

                  <button 
                    disabled={!isMyTurn || currentHighest === 0}
                    onClick={handleFold}
                    style={{ opacity: (isMyTurn && currentHighest > 0) ? 1 : 0.5, padding: '10px 20px', fontSize: '16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: (isMyTurn && currentHighest > 0) ? 'pointer' : 'not-allowed' }}>
                    פרוש (Fold)
                  </button>
                </div>

                {isMyTurn && (
                  <div style={{ marginTop: '15px' }}>
                    {currentHighest === 0 && (
                      <p style={{ fontSize: '1em', color: '#ff9800', fontWeight: 'bold', margin: '5px 0' }}>
                        ⚠️ אתה פותח את המכרז! עליך להציע לפחות $1.
                      </p>
                    )}
                    <p style={{ fontSize: '0.9em', color: '#e91e63', fontWeight: 'bold', margin: '5px 0' }}>
                      הצעה מקסימלית עבורך: ${maxAllowedBid} (שומר דולר לכל עמדה ריקה שנותרה)
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <h2>המשחק הסתיים! כל השחקנים חולקו.</h2>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;