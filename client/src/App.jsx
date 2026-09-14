import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './App.css';

import Toast from './components/Toast';
import { setScene } from './audio/musicManager';
import LoginScreen from './screens/LoginScreen';
import LobbyScreen from './screens/LobbyScreen';
import ArenaScreen from './screens/ArenaScreen';
import SummaryScreen from './screens/SummaryScreen';

const socket = io();

function App() {
  const [gameState, setGameState] = useState(null);

  const [username, setUsername] = useState(
    () => localStorage.getItem('michrazUsername') || '',
  );
  const [password, setPassword] = useState(
    () => localStorage.getItem('michrazPassword') || '',
  );

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
        : 'game-nba';

  useEffect(() => {
    setScene(musicScene);
  }, [musicScene]);

  // --- ערכת נושא: מוחלת על <html> כדי שכל הטוקנים יתחלפו ---
  useEffect(() => {
    const theme = gameState?.currentPack === 'maccabi' ? 'maccabi' : 'nba';
    document.documentElement.dataset.theme = theme;
  }, [gameState?.currentPack]);

  // --- חיבור לשרת ---
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

    // הוצאה על ידי מנהל המשחק
    socket.on('kicked', (msg) => {
      setErrorMsg(msg);
      setHasJoined(false);
      setGameState(null);
    });

    socket.on('playerSold', (data) => {
      setSoldNotification(`${data.playerName} נחתם על ידי ${data.winnerName}! 🎉`);

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setSoldNotification(null), 4000);
    });

    return () => {
      socket.off('updateState');
      socket.off('timerUpdate');
      socket.off('error');
      socket.off('kicked');
      socket.off('playerSold');
      clearTimeout(timeoutId);
    };
  }, []);

  // --- נגזרות מצב ---
  const isGameOver =
    gameState?.auctionIndex > 0 && !gameState?.currentAuction?.player;
  const me = gameState?.participants.find((p) => p.id === socket.id);

  // החמישייה שלי לעריכה: myEditableRoster הוא override בלבד,
  // כל עוד לא סידרתי מחדש מציגים את מה שהגיע מהשרת.
  const myRoster = myEditableRoster ?? me?.roster ?? null;

  // --- פעולות ---
  const handleJoin = () => {
    if (username.trim() === '' || password.trim() === '') {
      setErrorMsg('נא למלא שם משתמש וסיסמה');
      return;
    }

    localStorage.setItem('michrazUsername', username.trim());
    localStorage.setItem('michrazPassword', password.trim());
    setErrorMsg('');
    socket.emit('joinGame', {
      username: username.trim(),
      password: password.trim(),
    });
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

  // פעולות מנהל בלבד
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

  // --- ניתוב מסכים ---
  if (!hasJoined) {
    return (
      <LoginScreen
        username={username}
        password={password}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onJoin={handleJoin}
        errorMsg={errorMsg}
      />
    );
  }

  if (!gameState) {
    return (
      <div className="loading">
        <div className="spinner" aria-hidden="true" />
        <p>מתחבר לזירה…</p>
      </div>
    );
  }

  if (!gameState.gameStarted) {
    return (
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
  }

  if (isGameOver) {
    return (
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
  }

  if (!gameState.currentAuction?.player) {
    return (
      <div className="loading">
        <div className="spinner" aria-hidden="true" />
        <p>טוען את השחקן הבא…</p>
      </div>
    );
  }

  return (
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

export default App;
