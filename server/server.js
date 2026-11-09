const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); 

const app = express();
app.use(cors());

// בדיקת בריאות לשירותי הענן
app.get('/healthz', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

const indexHtmlPath = path.join(clientBuildPath, 'index.html');

// כל נתיב שאינו קובץ מוחזר ל-SPA. בקשה לקובץ שלא קיים
// (למשל טראק מוזיקה חסר) מחזירה 404 ולא HTML במסווה של קובץ.
app.use((req, res) => {
    if (path.extname(req.path)) {
        res.status(404).end();
        return;
    }

    // client/dist אינו נשמר ב-git — הודעה ברורה במקום דף ריק
    if (!fs.existsSync(indexHtmlPath)) {
        res.status(503).send(
            '<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8">' +
            '<body style="font-family:system-ui;padding:40px;line-height:1.7">' +
            '<h1>הקליינט לא נבנה</h1>' +
            '<p>התיקייה <code>client/dist</code> חסרה. הריצו מתיקיית השורש:</p>' +
            '<pre style="background:#eee;padding:12px;border-radius:6px">' +
            'npm run setup<br>npm run build<br>npm start</pre>' +
            '<p>ואז <code>npm start</code>.</p></body></html>'
        );
        return;
    }

    res.sendFile(indexHtmlPath);
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// DATA_DIR מאפשר להצביע על דיסק קבוע בענן. בלעדיו הקבצים
// נשמרים ליד server.js, וברוב שירותי הענן הם נמחקים בכל הפעלה מחדש.
function resolveDataDir() {
    const requested = process.env.DATA_DIR
        ? path.resolve(process.env.DATA_DIR)
        : __dirname;

    try {
        if (!fs.existsSync(requested)) {
            fs.mkdirSync(requested, { recursive: true });
        }
        // מוודאים שאפשר באמת לכתוב לשם, לא רק שהתיקייה קיימת
        fs.accessSync(requested, fs.constants.W_OK);
        return requested;
    } catch (err) {
        console.error(
            `DATA_DIR "${requested}" is not writable (${err.message}); ` +
            `falling back to ${__dirname}. Data will reset on restart.`
        );
        return __dirname;
    }
}

const dataDir = resolveDataDir();

// קריאה עמידה: קובץ פגום לא יפיל את השרת
function readJsonSafe(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        console.error(`Could not read ${filePath}, starting empty:`, err.message);
        return fallback;
    }
}

function writeJsonSafe(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data));
    } catch (err) {
        console.error(`Could not write ${filePath}:`, err.message);
    }
}

// מיפוי שם שחקן -> תמונה. נוצר מוויקיפדיה העברית.
// שחקן שאינו ברשימה מקבל אווטאר ראשי תיבות בצד הלקוח.
const playerPhotos = readJsonSafe(path.join(__dirname, 'playerPhotos.json'), {});

const { rawPlayersDataNBA, rawPlayersDataMaccabi, rawPlayersDataEuroleague } = require('./playersData');
const { fetchAllStats } = require('./statsFetcher');

// --- סטטיסטיקות שחקנים -------------------------------------------------
// נקודות / ריבאונדים / אסיסטים / חטיפות / חסימות לכל שחקן.
// סדר הטעינה: מטמון מעודכן בדיסק -> קבצים שנארזו עם האפליקציה -> קובץ היורוליג הישן.
// ברקע השרת מרענן את הנתונים מהמאגרים הציבוריים (ראו statsFetcher.js).
const bundledStatsDir = path.join(__dirname, 'stats');
const statsCachePath = path.join(dataDir, 'stats-cache.json');
const nameMapPath = path.join(dataDir, 'stats-namemap.json');
const STATS_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function loadPlayerStats() {
    const cache = readJsonSafe(statsCachePath, null);
    const pick = (pack) =>
        (cache && cache.data && cache.data[pack]) || readJsonSafe(path.join(bundledStatsDir, `${pack}.json`), {});

    const legacyEuro = readJsonSafe(path.join(__dirname, 'euroleagueStats.json'), {});
    const euro = { ...pick('euroleague') };
    for (const [name, s] of Object.entries(legacyEuro)) {
        // שחקן בלי נתון עדכני מקבל לפחות את הממוצעים הישנים
        if (!euro[name]) euro[name] = { pts: s.pts, reb: s.reb, ast: s.ast, stl: null, blk: null, season: null, label: 'ממוצע' };
    }
    return { nba: pick('nba'), maccabi: pick('maccabi'), euroleague: euro };
}

let playerStats = loadPlayerStats();
let statsRefreshing = false;

async function refreshStats({ force = false } = {}) {
    if (statsRefreshing || process.env.STATS_REFRESH === 'off') return;
    const cache = readJsonSafe(statsCachePath, null);
    if (!force && cache && Date.now() - (cache.fetchedAt || 0) < STATS_MAX_AGE_MS) return;

    statsRefreshing = true;
    try {
        if (!fs.existsSync(nameMapPath)) {
            const seed = readJsonSafe(path.join(bundledStatsDir, 'nameMap.json'), {});
            writeJsonSafe(nameMapPath, seed);
        }
        const { data, report } = await fetchAllStats(
            { rawNba: rawPlayersDataNBA, rawMaccabi: rawPlayersDataMaccabi, rawEuroleague: rawPlayersDataEuroleague },
            nameMapPath,
            { overridesPath: path.join(bundledStatsDir, 'nameOverrides.json') }
        );
        // לא דורסים מטמון טוב בתוצאה ריקה (למשל כשאין אינטרנט)
        const matched = Object.values(report).reduce((n, r) => n + r.matched, 0);
        if (matched > 0) {
            writeJsonSafe(statsCachePath, { fetchedAt: Date.now(), data });
            playerStats = loadPlayerStats();
            console.log(`[stats] refreshed: nba ${report.nba.matched}/${report.nba.total}, ` +
                `euroleague ${report.euroleague.matched}/${report.euroleague.total}, ` +
                `maccabi ${report.maccabi.matched}/${report.maccabi.total}`);
        }
    } catch (err) {
        console.warn('[stats] refresh failed:', err.message);
    } finally {
        statsRefreshing = false;
    }
}

const leaderboardPath = path.join(dataDir, 'leaderboard.json');
let leaderboard = readJsonSafe(leaderboardPath, {});

// שיאים וסטטיסטיקות לטבלת האלופים: משחקים, ניצחונות, החמישייה היקרה והעסקה הטובה ביותר.
const recordsPath = path.join(dataDir, 'records.json');
let records = readJsonSafe(recordsPath, { players: {}, priciestFive: null, bestDeal: null });
if (!records.players) records.players = {};

const usersPath = path.join(dataDir, 'users.json');
let usersDB = readJsonSafe(usersPath, {});

let playersDB = [];

// כמה שחקנים להגריל מכל עמדה.
//
// הסך הכל חייב להיות בדיוק 5 לכל משתתף — משבצת אחת לכל עמדה בסגל.
// לכן כל פעולה כאן היא *העברה* של מכסה מעמדה אחת לאחרת, אף פעם לא
// יצירה או מחיקה. כך הסך נשמר מתמטית ולא בזכות תיקון בסוף.
//
// כל עמדה מקבלת לפחות שחקן אחד ולכל היותר N+1, כך שהחלוקה משתנה
// ממשחק למשחק (למשל 4 PF מול סנטר אחד) בלי שעמדה שלמה תיעלם.
// רוב ההעברות נשארות בתוך הקבוצה — חוץ או גבוהים — כדי שהמאזן
// בין גארדים לגבוהים לא יקרוס.
const POSITION_GROUPS = [
    ['PG', 'SG', 'SF'],   // חוץ
    ['PF', 'C']           // גבוהים
];
const SAME_GROUP_BIAS = 0.8;

function drawQuotas(participantCount, tempDB) {
    const positions = Object.keys(tempDB);
    const quotas = {};
    for (const p of positions) quotas[p] = participantCount;

    if (participantCount < 1) return quotas;

    const floor = 1;
    const ceiling = participantCount + 1;
    const pickFrom = list => list[Math.floor(Math.random() * list.length)];

    const attempts = participantCount * 9;
    for (let i = 0; i < attempts; i++) {
        let from, to;
        if (Math.random() < SAME_GROUP_BIAS) {
            const group = pickFrom(POSITION_GROUPS);
            from = pickFrom(group);
            to = pickFrom(group);
        } else {
            from = pickFrom(positions);
            to = pickFrom(positions);
        }

        if (from === to) continue;
        if (quotas[from] - 1 < floor) continue;
        if (quotas[to] + 1 > ceiling) continue;
        // אי אפשר להגריל יותר שחקנים ממה שיש בעמדה הזו בחבילה
        if (quotas[to] + 1 > tempDB[to].length) continue;

        quotas[from]--;
        quotas[to]++;
    }

    return quotas;
}

function initializeGamePlayers(selectedPack) {
    let selectedPlayers = [];
    // ערבוב Fisher-Yates: התפלגות אחידה אמיתית.
    // הגרסה הקודמת, array.sort(() => 0.5 - Math.random()), החזירה
    // השוואות לא עקביות ולכן שמרה שחקנים קרוב למקומם המקורי —
    // שחקנים בתחילת הרשימה עלו פי 4 יותר מאלה שבסופה.
    const shuffleArray = (array) => {
        const out = [...array];
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    };
    
    // קובע איזה מאגר נטען - מכבי או NBA
    const PACKS = {
        maccabi: { data: rawPlayersDataMaccabi, image: "🟡" },
        euroleague: { data: rawPlayersDataEuroleague, image: "🏆" },
        nba: { data: rawPlayersDataNBA, image: "🏀" }
    };
    const pack = PACKS[selectedPack] || PACKS.nba;
    const dataSource = pack.data;
    const playerImage = pack.image;

    // בונה מאגר זמני בהתאם לבחירה
    const tempDB = {};
    let tempGlobalId = 1;
    for (const position in dataSource) {
        tempDB[position] = dataSource[position].map(player => ({
            id: tempGlobalId++,
            name: player.name,
            rating: player.rating,
            position: position,
            image: playerImage,
            photo: playerPhotos[player.name] || null,
            stats: (playerStats[selectedPack] || {})[player.name] || null
        }));
    }

    const quotas = drawQuotas(gameState.participants.length, tempDB);

    for (const position in tempDB) {
        const shuffledPosition = shuffleArray([...tempDB[position]]);
        selectedPlayers.push(...shuffledPosition.slice(0, quotas[position]));
    }

    playersDB = shuffleArray(selectedPlayers);
}


let gameState = {
    gameStarted: false,
    currentPack: 'nba',
    hostId: null, // שומר מי מנהל המשחק
    participants: [],
    auctionIndex: 0,
    currentAuction: {
        player: null,
        highestBid: -1, 
        highestBidder: null,
        activeBidders: [], 
        currentTurnId: null,
        timeLeft: 15
    },
    leaderboard: leaderboard,
    records: records,
    votes: {} // שם מצביע -> שם הקבוצה שבחר, במסך הסיכום
};

let turnTimerInterval = null;

function clearTurnTimer() {
    if (turnTimerInterval) {
        clearInterval(turnTimerInterval);
        turnTimerInterval = null;
    }
}

function setTurnTimer() {
    clearTurnTimer();
    if (!gameState.gameStarted || !gameState.currentAuction || !gameState.currentAuction.player) return;

    gameState.currentAuction.timeLeft = 15;
    io.emit('timerUpdate', gameState.currentAuction.timeLeft);
    
    turnTimerInterval = setInterval(() => {
        gameState.currentAuction.timeLeft--;
        io.emit('timerUpdate', gameState.currentAuction.timeLeft);
        
        if (gameState.currentAuction.timeLeft <= 0) {
            const turnId = gameState.currentAuction.currentTurnId;
            if (turnId) {
                // המציע הראשון לא יכול "לעבור" על שחקן: אם נגמר הזמן
                // מגישים עבורו אוטומטית הצעה של $0 במקום לפרוש.
                if (gameState.currentAuction.highestBid === -1) {
                    applyBid(turnId, 0);
                } else {
                    executeFold(turnId);
                }
            }
        }
    }, 1000);
}

// === הפונקציה שעודכנה: חיתוך דינמי לפי כמות משתתפים ===


function handleAuctionEnd() {
    clearTurnTimer(); 
    const active = gameState.currentAuction.activeBidders;
    
    if (active.length === 1) {
        const winnerId = active[0];
        const winner = gameState.participants.find(p => p.id === winnerId);
        
        const finalBid = Math.max(0, gameState.currentAuction.highestBid);

        if (winner && winner.budget >= finalBid) {
            winner.budget -= finalBid;
            
            // --- תוספת: בודק אם הסגל כרגע ריק לחלוטין (לפני שמוסיפים את השחקן) ---
            const isFirstPlayer = winner.roster.every(slot => slot.player === null);

            const positionsOrder = ['PG', 'SG', 'SF', 'PF', 'C'];
            const startIdx = positionsOrder.indexOf(gameState.currentAuction.player.position);
            
            for (let i = 0; i < 5; i++) {
                const checkIdx = (startIdx + i) % 5;
                if (winner.roster[checkIdx].player === null) {
                    winner.roster[checkIdx].player = {
                        ...gameState.currentAuction.player,
                        boughtFor: finalBid
                    };
                    break; 
                }
            }

            // --- עדכון ההודעה שנשלחת ללקוח כדי שתכיל את הרייטינג והבדיקה ---
            io.emit('playerSold', {
                playerName: gameState.currentAuction.player.name,
                winnerName: winner.name,
                playerRating: gameState.currentAuction.player.rating,
                price: finalBid,
                photo: gameState.currentAuction.player.photo || null,
                isFirstPlayer: isFirstPlayer
            });
        }
    }
    
    gameState.auctionIndex++;
    startNextAuction();
}

function startNextAuction() {
    if (gameState.auctionIndex < playersDB.length) {
        const validParticipants = gameState.participants.filter(p => {
            const filledSpots = p.roster.filter(slot => slot.player !== null).length;
            return p.budget >= 0 && filledSpots < 5;
        });
        
        let orderedBidders = [];
        let startingId = null;

        if (validParticipants.length > 0) {
            const starterIndex = gameState.auctionIndex % gameState.participants.length;
            let startIdx = 0;
            for (let i = 0; i < gameState.participants.length; i++) {
                const checkIdx = (starterIndex + i) % gameState.participants.length;
                const candidateId = gameState.participants[checkIdx].id;
                const validIdx = validParticipants.findIndex(p => p.id === candidateId);
                if (validIdx !== -1) {
                    startIdx = validIdx;
                    break;
                }
            }

            for (let i = 0; i < validParticipants.length; i++) {
                orderedBidders.push(validParticipants[(startIdx + i) % validParticipants.length].id);
            }
            startingId = orderedBidders[0];
        }
        
        gameState.currentAuction = {
            player: playersDB[gameState.auctionIndex],
            highestBid: -1, 
            highestBidder: null,
            activeBidders: orderedBidders,
            currentTurnId: startingId,
            timeLeft: 15
        };
        
        setTurnTimer(); 
    } else {
        gameState.currentAuction.player = null; 
    }
    io.emit('updateState', gameState);
}

// מגיש הצעה בשם שחקן. מחזיר true אם ההצעה התקבלה.
function applyBid(socketId, bidAmount) {
    if (!gameState.gameStarted || !gameState.currentAuction || !gameState.currentAuction.player) return false;
    if (gameState.currentAuction.currentTurnId !== socketId) return false;

    const numericBid = Math.floor(Number(bidAmount));
    const participant = gameState.participants.find(p => p.id === socketId);
    if (!participant) return false;

    if (numericBid <= gameState.currentAuction.highestBid || numericBid > participant.budget) return false;

    gameState.currentAuction.highestBid = numericBid;
    gameState.currentAuction.highestBidder = participant.name;

    if (gameState.currentAuction.activeBidders.length === 1) {
        handleAuctionEnd();
    } else {
        const currentIndex = gameState.currentAuction.activeBidders.indexOf(socketId);
        const nextIndex = (currentIndex + 1) % gameState.currentAuction.activeBidders.length;
        gameState.currentAuction.currentTurnId = gameState.currentAuction.activeBidders[nextIndex];
        setTurnTimer();
        io.emit('updateState', gameState);
    }
    return true;
}

// מוציא שחקן מהמשחק לחלוטין (יציאה יזומה מהתפריט).
function leaveGame(socketId) {
    const idx = gameState.participants.findIndex(p => p.id === socketId);
    if (idx === -1) return;

    gameState.participants.splice(idx, 1);
    ensureHost(); // בלי זה חדר נתקע בלי מנהל כשהמנהל יוצא

    if (gameState.participants.length === 0) {
        clearTurnTimer();
        gameState.gameStarted = false;
        gameState.hostId = null;
        gameState.auctionIndex = 0;
        gameState.currentAuction = { player: null, highestBid: -1, highestBidder: null, activeBidders: [], currentTurnId: null, timeLeft: 15 };
        io.emit('updateState', gameState);
        return;
    }

    if (gameState.gameStarted && gameState.currentAuction && gameState.currentAuction.player) {
        const bidderIdx = gameState.currentAuction.activeBidders.indexOf(socketId);
        if (bidderIdx !== -1) {
            gameState.currentAuction.activeBidders.splice(bidderIdx, 1);

            if (gameState.currentAuction.activeBidders.length <= 1) {
                handleAuctionEnd();
                return;
            }

            if (gameState.currentAuction.currentTurnId === socketId) {
                const nextIndex = bidderIdx % gameState.currentAuction.activeBidders.length;
                gameState.currentAuction.currentTurnId = gameState.currentAuction.activeBidders[nextIndex];
                setTurnTimer();
            }
        }
    }

    io.emit('updateState', gameState);
}

// מחזיר את כולם ללובי ומאפס קבוצות. משמש גם בהכתרת זוכה
// וגם בסיום יזום על ידי המנהל.
function resetGameToLobby() {
    clearTurnTimer();
    gameState.gameStarted = false;
    gameState.auctionIndex = 0;
    gameState.currentAuction = { player: null, highestBid: -1, highestBidder: null, activeBidders: [], currentTurnId: null, timeLeft: 15 };
    gameState.leaderboard = leaderboard;
    gameState.records = records;
    gameState.votes = {};

    gameState.participants = gameState.participants.filter(p => p.connected);
    gameState.participants.forEach(p => {
        p.budget = 20;
        p.roster = [
            { pos: 'PG', player: null },
            { pos: 'SG', player: null },
            { pos: 'SF', player: null },
            { pos: 'PF', player: null },
            { pos: 'C', player: null }
        ];
    });

    ensureHost();
    io.emit('updateState', gameState);
}

// המנהל חייב להיות שחקן שקיים בחדר. אם הוא עזב/הועף/התנתק —
// הניהול עובר לראשון ברשימה.
function ensureHost() {
    if (gameState.participants.some(p => p.id === gameState.hostId)) return;
    const next = gameState.participants[0];
    gameState.hostId = next ? next.id : null;
}

function executeFold(socketId) {
    if (!gameState.gameStarted || !gameState.currentAuction || !gameState.currentAuction.player) return;
    
    const currentIndex = gameState.currentAuction.activeBidders.indexOf(socketId);
    if (currentIndex !== -1) {
        gameState.currentAuction.activeBidders.splice(currentIndex, 1);
        
        if (gameState.currentAuction.activeBidders.length <= 1) {
            handleAuctionEnd();
        } else {
            const nextIndex = currentIndex % gameState.currentAuction.activeBidders.length;
            gameState.currentAuction.currentTurnId = gameState.currentAuction.activeBidders[nextIndex];
            setTurnTimer(); 
            io.emit('updateState', gameState);
        }
    }
}

// === הצבעה, שיאים, צ'אט ===

const chatLog = [];
const ALLOWED_REACTIONS = ['👏', '🔥', '😂', '😱', '💀', '🤝', '😤', '🏀'];
const rateStamps = new Map();
function rateLimitOk(socketId, key, minGapMs) {
    const k = socketId + ':' + key;
    const now = Date.now();
    if (now - (rateStamps.get(k) || 0) < minGapMs) return false;
    rateStamps.set(k, now);
    return true;
}

function isGameOver() {
    return gameState.gameStarted && gameState.auctionIndex > 0 &&
        !(gameState.currentAuction && gameState.currentAuction.player);
}

const rosterRating = (p) => p.roster.reduce((sum, slot) => sum + (slot.player ? slot.player.rating : 0), 0);

// ניקוד "עסקה": דירוג השחקן פחות 3 נקודות על כל דולר ששולם
const dealScore = (player) => player.rating - 3 * (player.boughtFor || 0);

function recordGameResults(winnerName) {
    for (const p of gameState.participants) {
        const rec = records.players[p.name] || (records.players[p.name] = { games: 0, wins: 0, priciest: null, bestDeal: null });
        rec.games++;
        if (p.name === winnerName) rec.wins++;

        const owned = p.roster.map(s => s.player).filter(Boolean);
        if (owned.length === 0) continue;

        const total = owned.reduce((sum, pl) => sum + (pl.boughtFor || 0), 0);
        const list = owned.map(pl => ({ name: pl.name, price: pl.boughtFor || 0 }));
        if (!rec.priciest || total > rec.priciest.total) rec.priciest = { total, players: list };
        if (!records.priciestFive || total > records.priciestFive.total) {
            records.priciestFive = { owner: p.name, total, players: list };
        }

        for (const pl of owned) {
            const entry = { player: pl.name, rating: pl.rating, price: pl.boughtFor || 0, score: dealScore(pl) };
            if (!rec.bestDeal || entry.score > rec.bestDeal.score) rec.bestDeal = entry;
            if (!records.bestDeal || entry.score > records.bestDeal.score) records.bestDeal = { owner: p.name, ...entry };
        }
    }
    writeJsonSafe(recordsPath, records);
}

function finishVoting() {
    const names = new Set(gameState.participants.map(p => p.name));
    const counts = {};
    let voters = 0;
    for (const [voter, candidate] of Object.entries(gameState.votes)) {
        if (!names.has(voter) || !names.has(candidate)) continue;
        counts[candidate] = (counts[candidate] || 0) + 1;
        voters++;
    }
    const max = Math.max(0, ...Object.values(counts));
    if (max === 0) return;

    // תיקו: מי שהחמישייה שלו עם סכום הדירוגים הגבוה יותר
    const tied = gameState.participants
        .filter(p => counts[p.name] === max)
        .sort((a, b) => rosterRating(b) - rosterRating(a));
    const winner = tied[0];

    recordGameResults(winner.name);
    leaderboard[winner.name] = (leaderboard[winner.name] || 0) + 1;
    writeJsonSafe(leaderboardPath, leaderboard);

    io.emit('winnerDeclared', { winnerName: winner.name, votes: max, voters, tie: tied.length > 1, counts });
    resetGameToLobby();
}

io.on('connection', (socket) => {
    socket.on('joinGame', (avatarName) => {
        const cleanName = avatarName.trim();

        if (!cleanName) {
            socket.emit('error', 'נא לבחור שחקן.');
            return;
        }

        const existingPlayer = gameState.participants.find(p => p.name === cleanName);

        if (existingPlayer) {
            // בודק אם הדמות כבר נתפסה על ידי מישהו שכרגע מחובר למשחק
            if (existingPlayer.connected) {
                socket.emit('error', 'השחקן הזה כבר נתפס על ידי משתתף אחר! בחר דמות אחרת.');
                return;
            } else {
                // המשתמש התנתק וחוזר למשחק - מתחבר מחדש לאותה דמות
                const oldId = existingPlayer.id;
                existingPlayer.id = socket.id; 
                existingPlayer.connected = true; 
                
                if (gameState.hostId === oldId) {
                    gameState.hostId = socket.id;
                }

                if (gameState.currentAuction) {
                    const activeIndex = gameState.currentAuction.activeBidders.indexOf(oldId);
                    if (activeIndex !== -1) {
                        gameState.currentAuction.activeBidders[activeIndex] = socket.id;
                    }
                    if (gameState.currentAuction.currentTurnId === oldId) {
                        gameState.currentAuction.currentTurnId = socket.id;
                    }
                }
                
                io.emit('updateState', gameState);
                return;
            }
        }

        if (gameState.gameStarted) {
            socket.emit('error', 'המשחק כבר התחיל, לא ניתן להצטרף כרגע.');
            return;
        }

        // משתתף חדש
        const newPlayer = { 
            id: socket.id, 
            name: cleanName, 
            budget: 20, 
            connected: true, 
            roster: [
                { pos: 'PG', player: null },
                { pos: 'SG', player: null },
                { pos: 'SF', player: null },
                { pos: 'PF', player: null },
                { pos: 'C', player: null }
            ] 
        };
        gameState.participants.push(newPlayer);
        
        if (!gameState.hostId) {
            gameState.hostId = socket.id;
        }
        
        io.emit('updateState', gameState);
    });

    socket.on('startGame', (selectedPack) => {
        if (!gameState.gameStarted && gameState.participants.length > 0 && socket.id === gameState.hostId) {
            gameState.gameStarted = true;
            gameState.currentPack = selectedPack || 'nba'; 
            gameState.auctionIndex = 0;
            initializeGamePlayers(selectedPack || 'nba');
            
            // --- תוספת: שולח התראה לכל השחקנים שהמשחק התחיל ---
            gameState.votes = {};
            io.emit('gameStarted');
            
            startNextAuction();
        }
    });

    // --- הצבעת זוכה: כל משתתף מצביע לקבוצה, והזוכה נקבע כשכולם הצביעו ---
    socket.on('voteWinner', (candidateName) => {
        if (!isGameOver()) return;
        const voter = gameState.participants.find(p => p.id === socket.id);
        const candidate = gameState.participants.find(p => p.name === candidateName);
        if (!voter || !candidate) return;

        gameState.votes[voter.name] = candidate.name;

        const everyoneVoted = gameState.participants
            .filter(p => p.connected)
            .every(p => gameState.votes[p.name]);
        if (everyoneVoted) {
            finishVoting();
        } else {
            io.emit('updateState', gameState);
        }
    });

    // המנהל יכול לסגור הצבעה גם כשמישהו לא הצביע (למשל נרדם)
    socket.on('closeVote', () => {
        if (socket.id !== gameState.hostId || !isGameOver()) return;
        if (Object.keys(gameState.votes).length === 0) return;
        finishVoting();
    });

    // --- צ'אט ואימוג'י-תגובות ---
    socket.on('requestChat', () => {
        socket.emit('chatHistory', chatLog);
    });

    socket.on('chat', (text) => {
        const sender = gameState.participants.find(p => p.id === socket.id);
        if (!sender || typeof text !== 'string') return;
        const clean = text.trim().slice(0, 140);
        if (!clean || !rateLimitOk(socket.id, 'chat', 700)) return;

        const msg = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, from: sender.name, text: clean, ts: Date.now() };
        chatLog.push(msg);
        if (chatLog.length > 40) chatLog.shift();
        io.emit('chatMessage', msg);
    });

    socket.on('reaction', (emoji) => {
        const sender = gameState.participants.find(p => p.id === socket.id);
        if (!sender || !ALLOWED_REACTIONS.includes(emoji)) return;
        if (!rateLimitOk(socket.id, 'reaction', 350)) return;
        io.emit('reaction', { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, from: sender.name, emoji });
    });

    // סיום משחק יזום — מנהל בלבד
    socket.on('endGameEarly', () => {
        if (socket.id !== gameState.hostId) return;
        resetGameToLobby();
    });

    // הוצאת שחקן — מנהל בלבד
    socket.on('kickPlayer', (targetId) => {
        if (socket.id !== gameState.hostId) return;
        if (targetId === gameState.hostId) return; // המנהל לא מעיף את עצמו

        const targetIndex = gameState.participants.findIndex(p => p.id === targetId);
        if (targetIndex === -1) return;

        io.to(targetId).emit('kicked', 'הוצאת מהמשחק על ידי מנהל המשחק.');

        // אם הוא באמצע תור, מקפלים אותו לפני ההסרה
        if (gameState.gameStarted && gameState.currentAuction) {
            const activeIndex = gameState.currentAuction.activeBidders.indexOf(targetId);
            if (activeIndex !== -1) {
                executeFold(targetId);
            }
        }

        gameState.participants.splice(targetIndex, 1);
        ensureHost();

        // משחק פעיל שנשאר בלי מספיק שחקנים חוזר ללובי
        if (gameState.gameStarted && gameState.participants.filter(p => p.connected).length < 1) {
            resetGameToLobby();
        } else {
            io.emit('updateState', gameState);
        }
    });

    socket.on('placeBid', (bidAmount) => {
        applyBid(socket.id, bidAmount);
    });

    socket.on('fold', () => {
        if (!gameState.gameStarted || gameState.currentAuction.currentTurnId !== socket.id) return;
        // אין אפשרות לפרוש לפני שהוגשה הצעה כלשהי — המציע הראשון
        // חייב להציע $0 לפחות. פרישה אפשרית רק אחרי שמישהו העלה.
        if (gameState.currentAuction.highestBid === -1) return;
        executeFold(socket.id);
    });

    socket.on('leaveGame', () => {
        leaveGame(socket.id);
    });

    socket.on('rearrangeRoster', (newRoster) => {
        const participant = gameState.participants.find(p => p.id === socket.id);
        if (participant) {
            participant.roster = newRoster;
            io.emit('updateState', gameState);
        }
    });

    socket.on('disconnect', () => {
        const player = gameState.participants.find(p => p.id === socket.id);
        if (player) {
            player.connected = false;
        }

        if (!gameState.gameStarted) {
            gameState.participants = gameState.participants.filter(p => p.connected);
            // המנהל התנתק לפני שהמשחק התחיל — הניהול עובר הלאה
            ensureHost();
        }

        const anyConnected = gameState.participants.some(p => p.connected);
        if (!anyConnected) {
            chatLog.length = 0;
            clearTurnTimer();
            gameState.gameStarted = false;
            gameState.participants = [];
            gameState.hostId = null;
            gameState.auctionIndex = 0;
            gameState.currentAuction = { player: null, highestBid: -1, highestBidder: null, activeBidders: [], currentTurnId: null, timeLeft: 15 };
        }

        io.emit('updateState', gameState);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    // רענון נתונים ברקע: בהפעלה (אם המטמון ישן) ואז בדיקה כל כמה שעות
    refreshStats();
    setInterval(() => refreshStats(), 6 * 60 * 60 * 1000).unref();
    console.log(`Server is running on port ${PORT}`);
    console.log(`Data directory: ${dataDir}`);
});