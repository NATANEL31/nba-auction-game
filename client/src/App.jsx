import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast'; 
import './App.css';

import SoldOverlay from './components/SoldOverlay';
import WinnerOverlay from './components/WinnerOverlay';
import ChatDock from './components/ChatDock';
import { useConfirm } from './components/confirmContext';
import { gavel, soldJingle, fanfare } from './audio/sfx';
import './polish.css';
import './features.css';
import Background from './components/Background';
import { setScene } from './audio/musicManager';
import LoginScreen from './screens/LoginScreen';
import LobbyScreen from './screens/LobbyScreen';
import ArenaScreen from './screens/ArenaScreen';
import SummaryScreen from './screens/SummaryScreen';

const socket = io();

function App() {
  const confirm = useConfirm();
  const [gameState, setGameState] = useState(null);

  const [hasJoined, setHasJoined] = useState(false);
  const [customBid, setCustomBid] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [myEditableRoster, setMyEditableRoster] = useState(null);
  const [soldNotification, setSoldNotification] = useState(null);
  const [winnerInfo, setWinnerInfo] = useState(null);
  const [myName, setMyName] = useState('');

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
    const theme = pack === 'maccabi' ? 'maccabi' : pack === 'euroleague' ? 'euroleague' : 'nba';
    document.documentElement.dataset.theme = theme;
  }, [gameState?.currentPack]);

  // --- חיבור לשרת והאזנה לאירועים ---
  useEffect(() => {
    let timeoutId;
    let winnerTimeoutId;

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
      toast('שהמשחק יתחיל!', {
        icon: '🏀',
        duration: 2500,
      });
    });

    socket.on('playerSold', (data) => {
      // ההודעה הרגילה
      setSoldNotification({ ...data, id: Date.now() });
      gavel();
      soldJingle();

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setSoldNotification(null), 3200);
    });

    socket.on('winnerDeclared', (data) => {
      setWinnerInfo({ ...data, id: Date.now() });
      fanfare();
      clearTimeout(winnerTimeoutId);
      winnerTimeoutId = setTimeout(() => setWinnerInfo(null), 5200);
    });

    return () => {
      socket.off('winnerDeclared');
      socket.off('updateState');
      socket.off('timerUpdate');
      socket.off('error');
      socket.off('kicked');
      socket.off('playerSold');
      socket.off('gameStarted');
      clearTimeout(timeoutId);
      clearTimeout(winnerTimeoutId);
    };
  }, []);

  // --- נגזרות מצב ---
  const isGameOver = gameState?.auctionIndex > 0 && !gameState?.currentAuction?.player;
  const me = gameState?.participants.find((p) => p.id === socket.id);

  const myRoster = myEditableRoster ?? me?.roster ?? null;

  // --- פעולות ---
  const handleJoin = (username) => {
    setErrorMsg('');
    socket.emit('joinGame', username);
    setMyName(username);
    setHasJoined(true);
  };

  const handleStartGame = () => socket.emit('startGame', selectedPack);

  const handleLeaveGame = () => {
    socket.emit('leaveGame');
    setHasJoined(false);
    setGameState(null);
    setMyEditableRoster(null);
    setSoldNotification(null);
    setWinnerInfo(null);
    setCustomBid('');
    setErrorMsg('');
  };
  
  const handleBid = (amount) => socket.emit('placeBid', amount);
  const handleFold = () => socket.emit('fold');
  const handleKick = (playerId) => socket.emit('kickPlayer', playerId);

  const handleEndGameEarly = async () => {
    const ok = await confirm({
      title: 'לסיים את המשחק?',
      message: 'המשחק יסתיים עבור כולם וכולם יחזרו ללובי.',
      confirmText: 'סיים משחק',
      tone: 'danger',
    });
    if (ok) socket.emit('endGameEarly');
  };

  const handleVote = (candidateName) => socket.emit('voteWinner', candidateName);

  const handleCloseVote = async () => {
    const ok = await confirm({
      title: 'לסגור את ההצבעה?',
      message: 'הזוכה ייקבע לפי הקולות שנספרו עד עכשיו.',
      confirmText: 'סגור הצבעה',
    });
    if (ok) socket.emit('closeVote');
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
        records={gameState.records}
      />
    );
  } else if (isGameOver) {
    screenContent = (
      <>
        <SoldOverlay info={soldNotification} />
        <SummaryScreen
          participants={gameState.participants}
          myId={socket.id}
          myEditableRoster={myRoster}
          onMovePlayer={movePlayer}
          onSaveRoster={saveRoster}
          votes={gameState.votes || {}}
          myName={me?.name}
          isHost={gameState.hostId === socket.id}
          onVote={handleVote}
          onCloseVote={handleCloseVote}
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
        <SoldOverlay info={soldNotification} />
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
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: 'var(--surface-2)',
            color: 'var(--text)',
            border: '1px solid var(--border-strong)',
            fontWeight: 700,
          },
        }}
      />
      
      {screenContent}

      <WinnerOverlay info={winnerInfo} />
      {hasJoined && gameState && <ChatDock socket={socket} myName={myName} />}
    </>
  );
}

export default App;