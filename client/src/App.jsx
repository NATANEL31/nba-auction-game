import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast'; // התוספת של הספרייה
import './App.css';

import Toast from './components/Toast'; // ה-Toast המקורי שלך
import Background from './components/Background';
import { setScene } from './audio/musicManager';
import LoginScreen from './screens/LoginScreen';
import LobbyScreen from './screens/LobbyScreen';
import ArenaScreen from './screens/ArenaScreen';
import SummaryScreen from './screens/SummaryScreen';

const socket = io();

function App() {
  const [gameState, setGameState] = useState(null);

  const [hasJoined, setHasJoined] = useState(false);
  const [customBid, setCustomBid] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [myEditableRoster, setMyEditableRoster] = useState(null);
  const [soldNotification, setSoldNotification] = useState(null);

  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedPack, setSelectedPack] = useState('nba');

  // --- מוזיקת רקע: טראק לכל שלב במשחק ---
  const musicScene = !hasJoined
    ? 'login'
    : !gameState || !gameState.gameStarted
      ? 'lobby'
      : gameState.currentPack === 'maccabi'
        ? 'game-maccabi'
        : gameState.currentPack === 'euroleague'
          ? 'game-euroleague'
          : 'game-nba';

  useEffect(() => {
    setScene(musicScene);
  }, [musicScene]);

  // --- ערכת נושא: מוחלת על <html> כדי שכל הטוקנים יתחלפו ---
  useEffect(() => {
    const pack = gameState?.currentPack;
    const theme =
      pack === 'maccabi' ? 'maccabi' : pack === 'euroleague' ? 'euroleague' : 'nba';
    document.documentElement.dataset.theme = theme;
  }, [gameState?.currentPack]);

  // --- חיבור לשרת והאזנה לאירועים ---
  useEffect(() => {
    let timeoutId;

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

    socket.on('timerUpdate', (time) => setTimeLeft(time));

    socket.on('error', (msg) => {
      setErrorMsg(msg);
      setHasJoined(false);
    });

    socket.on('kicked', (msg) => {
      setErrorMsg(msg);
      setHasJoined(false);
      setGameState(null);
    });

    // הלוגיקה של ההודעה בתחילת המשחק
    socket.on('gameStarted', () => {
      toast('Let the game begin!', {
        icon: '🏀',
        duration: 3500,
        style: {
          background: '#333',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '18px'
        },
      });
    });

    socket.on('playerSold', (data) => {
      // ההודעה המקורית שלך נשארת
      setSoldNotification(`${data.playerName} נחתם על ידי ${data.winnerName}! 🎉`);

      // 1. תנאי אוברול נמוך בסיבוב ראשון
      if (data.isFirstPlayer && data.playerRating < 73) {
        toast('איזה בתול 🤓', { 
            icon: '🤦‍♂️', 
            duration: 4000 
        });
      }

      // 2. תנאי שחקן מעל 90 אוברול
      if (data.playerRating >= 90) {
        toast(`${data.winnerName} יצאת מלך 👑`, {
          icon: '🔥',
          duration: 4000,
          style: {
            border: '2px solid #FFD700',
            padding: '16px',
            fontWeight: 'bold'
          },
        });
      }

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setSoldNotification(null), 4000);
    });

    return () => {
      socket.off('updateState');
      socket.off('timerUpdate');
      socket.off('error');
      socket.off('kicked');
      socket.off('playerSold');
      socket.off('gameStarted');
      clearTimeout(timeoutId);
    };
  }, []);

  // --- נגזרות מצב ---
  const isGameOver =
    gameState?.auctionIndex > 0 && !gameState?.currentAuction?.player;
  const me = gameState?.participants.find((p) => p.id === socket.id);

  const myRoster = myEditableRoster ?? me?.roster ?? null;

  // --- פעולות ---
  const handleJoin = (selectedAvatar) => {
    setErrorMsg('');
    socket.emit('joinGame', selectedAvatar);
    setHasJoined(true);
  };

  const handleStartGame = () => socket.emit('startGame', selectedPack);

  const handleLeaveGame = () => {
    socket.emit('leaveGame');
    setHasJoined(false);
    setGameState(null);
    setMyEditableRoster(null);
    setSoldNotification(null);
    setCustomBid('');
    setErrorMsg('');
  };
  
  const handleBid = (amount) => socket.emit('placeBid', amount);
  const handleFold = () => socket.emit('fold');
  const handleKick = (playerId) => socket.emit('kickPlayer', playerId);

  const handleEndGameEarly = () => {
    if (window.confirm('לסיים את המשחק עבור כולם ולחזור ללובי?')) {
      socket.emit('endGameEarly');
    }
  };

  const handleDeclareWinner = (winnerName) => {
    if (window.confirm(`האם אתם מסכימים להכתיר את ${winnerName} כזוכה של המשחק הזה?`)) {
      socket.emit('declareWinner', winnerName);
    }
  };

  const movePlayer = (idx, direction) => {
    if (!myRoster) return;
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= myRoster.length) return;

    const newRoster = myRoster.map((slot) => ({ ...slot }));
    const temp = newRoster[idx].player;
    newRoster[idx].player = newRoster[swapIdx].player;
    newRoster[swapIdx].player = temp;
    setMyEditableRoster(newRoster);
  };

  const saveRoster = () => {
    if (myRoster) socket.emit('rearrangeRoster', myRoster);
  };

  // --- ניתוב מסכים בצורה ששומרת על ה-Toaster על המסך ---
  let screenContent;

  if (!hasJoined) {
    screenContent = <LoginScreen onJoin={handleJoin} errorMsg={errorMsg} />;
  } else if (!gameState) {
    screenContent = (
      <div className="loading">
        <div className="spinner" aria-hidden="true" />
        <p>מתחבר לזירה…</p>
      </div>
    );
  } else if (!gameState.gameStarted) {
    screenContent = (
      <LobbyScreen
        participants={gameState.participants}
        leaderboard={gameState.leaderboard}
        selectedPack={selectedPack}
        onPackChange={setSelectedPack}
        onStartGame={handleStartGame}
        onLeave={handleLeaveGame}
        myId={socket.id}
        hostId={gameState.hostId}
        onKick={handleKick}
      />
    );
  } else if (isGameOver) {
    screenContent = (
      <>
        <Toast message={soldNotification} />
        <SummaryScreen
          participants={gameState.participants}
          myId={socket.id}
          myEditableRoster={myRoster}
          onMovePlayer={movePlayer}
          onSaveRoster={saveRoster}
          onDeclareWinner={handleDeclareWinner}
          onLeave={handleLeaveGame}
        />
      </>
    );
  } else if (!gameState.currentAuction?.player) {
    screenContent = (
      <div className="loading">
        <div className="spinner" aria-hidden="true" />
        <p>טוען את השחקן הבא…</p>
      </div>
    );
  } else {
    screenContent = (
      <>
        <Toast message={soldNotification} />
        <ArenaScreen
          gameState={gameState}
          me={me}
          myId={socket.id}
          myRoster={myRoster}
          timeLeft={timeLeft}
          customBid={customBid}
          onCustomBidChange={setCustomBid}
          onBid={handleBid}
          onFold={handleFold}
          onLeave={handleLeaveGame}
          isHost={gameState.hostId === socket.id}
          onEndGame={handleEndGameEarly}
        />
      </>
    );
  }

  return (
    <>
      <Background />
      {/* מחזיק את ההודעות הקופצות המיוחדות בכל חלקי האפליקציה */}
      <Toaster position="top-center" reverseOrder={false} />
      
      {screenContent}
    </>
  );
}

export default App;