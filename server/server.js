const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); 

const app = express();
app.use(cors());

const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

app.use((req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const leaderboardPath = path.join(__dirname, 'leaderboard.json');
let leaderboard = {};
if (fs.existsSync(leaderboardPath)) {
    leaderboard = JSON.parse(fs.readFileSync(leaderboardPath, 'utf8'));
}

const rawPlayersData = {
    PG: [
        { name: "שיי", rating: 97 }, { name: "לוקה", rating: 97 }, { name: "קנינגהאם", rating: 87 }, { name: "קרי", rating: 95 }, 
        { name: "האליברטון", rating: 90 }, { name: "טריי יאנג", rating: 89 }, { name: "ג'ה מוראנט", rating: 91 }, { name: "הארפר", rating: 80 }, 
        { name: "הארדן", rating: 84 }, { name: "לאמלו", rating: 88 }, { name: "קיונטה ג'ורג'", rating: 81 }, { name: "פריצ'ארד", rating: 78 }, 
        { name: "הולידיי", rating: 86 }, { name: "נמבהארד", rating: 80 }, { name: "קולייר", rating: 77 }, { name: "קובי וויט", rating: 84 }, 
        { name: "ואן וליט", rating: 83 }, { name: "מקונל", rating: 79 }, { name: "הנדרסון", rating: 79 }, { name: "מקיין", rating: 77 }, 
        { name: "אלבראדו", rating: 77 }, { name: "גודווין", rating: 74 }, { name: "קאם פיין", rating: 75 }, { name: "בן שרף", rating: 78 }, 
        { name: "דיאנג'לו ראסל", rating: 81 }, { name: "בופקין", rating: 75 }, { name: "פודזימסקי", rating: 80 }, { name: "שרודר", rating: 79 }
    ],
    SG: [
        { name: "אדוארדס", rating: 95 }, { name: "ריבס", rating: 83 }, { name: "קאסל", rating: 78 }, { name: "אמן", rating: 81 }, 
        { name: "מילר", rating: 84 }, { name: "אדג'קומבה", rating: 78 }, { name: "אלכסנדר ווקר", rating: 77 }, { name: "בארט", rating: 83 }, 
        { name: "לאבין", rating: 83 }, { name: "ג'יילן גרין", rating: 84 }, { name: "דוסנמו", rating: 79 }, { name: "קווארד", rating: 75 }, 
        { name: "שיידון שארפ", rating: 81 }, { name: "אלן", rating: 80 }, { name: "וולאס", rating: 78 }, { name: "מאות'רין", rating: 81 }, 
        { name: "פול", rating: 78 }, { name: "אנפרניי", rating: 83 }, { name: "רובינסון", rating: 78 }, { name: "גריימס", rating: 77 }, 
        { name: "ג'ו", rating: 76 }, { name: "שאמט", rating: 74 }, { name: "מלטון", rating: 77 }, { name: "ביל", rating: 84 }, 
        { name: "תומפסון", rating: 80 }, { name: "קנארד", rating: 77 }, { name: "עמנואל שארפ", rating: 73 }, { name: "קיספרט", rating: 78 }, 
        { name: "בן שפרד", rating: 75 }, { name: "גארי טרנט ג'וניור", rating: 78 }, { name: "טייבולי", rating: 76 }
    ],
    SF: [
        { name: "בראון", rating: 92 }, { name: "טריי מרפי", rating: 82 }, { name: "ג' וויליאמס", rating: 86 }, { name: "אייס ביילי", rating: 80 }, 
        { name: "דוראנט", rating: 94 }, { name: "קוואי", rating: 91 }, { name: "לברון", rating: 95 }, { name: "פלאג", rating: 82 }, 
        { name: "דני אבדיה", rating: 82 }, { name: "אאוזר", rating: 80 }, { name: "קנופל", rating: 77 }, { name: "דרוזן", rating: 86 }, 
        { name: "ברוקס", rating: 79 }, { name: "ואסל", rating: 83 }, { name: "ביי", rating: 78 }, { name: "סמארט", rating: 80 }, 
        { name: "נסמית", rating: 78 }, { name: "אוברה ג'וניור", rating: 80 }, { name: "איסון", rating: 79 }, { name: "קוזמה", rating: 83 }, 
        { name: "האנטר", rating: 79 }, { name: "קרטר בראיינט", rating: 75 }, { name: "האוזר", rating: 76 }, { name: "ריזאשה", rating: 78 }, 
        { name: "מידלטון", rating: 83 }, { name: "אוקורו", rating: 77 }, { name: "לראביה", rating: 75 }, { name: "גארי פייטון השני", rating: 76 }, 
        { name: "גריידי דיק", rating: 78 }
    ],
    PF: [
        { name: "יאניס", rating: 97 }, { name: "טייטום", rating: 96 }, { name: "בארנס", rating: 85 }, { name: "סיאקם", rating: 88 }, 
        { name: "ריד", rating: 82 }, { name: "באנקרו", rating: 89 }, { name: "זיון", rating: 89 }, { name: "הולמגרן", rating: 88 }, 
        { name: "רנדל", rating: 85 }, { name: "בוזליס", rating: 77 }, { name: "מיילס ברידג'ס", rating: 82 }, { name: "האצ'ימורה", rating: 79 }, 
        { name: "דריימונד גרין", rating: 81 }, { name: "אובי טופין", rating: 79 }, { name: "אלדאמה", rating: 77 }, { name: "DJJ", rating: 77 }, 
        { name: "JJJ", rating: 86 }, { name: "רויס אוניל", rating: 76 }, { name: "ממוקשווילי", rating: 75 }, { name: "בובי פורטיס", rating: 81 }, 
        { name: "שמפני", rating: 75 }, { name: "ד. ווייד", rating: 75 }, { name: "דני וולף", rating: 74 }, { name: "ליילס", rating: 76 }, 
        { name: "מינוט", rating: 74 }, { name: "קאמינגה", rating: 83 }
    ],
    C: [
        { name: "וומבניאמה", rating: 95 }, { name: "אמביד", rating: 97 }, { name: "יוקיץ", rating: 98 }, { name: "טאונס", rating: 87 }, 
        { name: "סבוניס", rating: 88 }, { name: "אלן", rating: 85 }, { name: "דורן", rating: 83 }, { name: "גובר", rating: 85 }, 
        { name: "זובאק", rating: 81 }, { name: "אוקונגו", rating: 80 }, { name: "קלינגן", rating: 78 }, { name: "פורזינגיס", rating: 86 }, 
        { name: "אידי", rating: 79 }, { name: "גאפורד", rating: 81 }, { name: "דיאבאטה", rating: 74 }, { name: "לייבלי", rating: 82 }, 
        { name: "ווצ'ביץ'", rating: 82 }, { name: "רוברט וויליאמס", rating: 79 }, { name: "ברוק לופס", rating: 80 }, { name: "אל הורפורד", rating: 79 }, 
        { name: "ג'יילין וויליאמס", rating: 78 }, { name: "דראמונד", rating: 78 }, { name: "הייז", rating: 76 }, { name: "קורנט", rating: 75 }, 
        { name: "בונה", rating: 74 }, { name: "לנדל", rating: 75 }, { name: "האף", rating: 74 }, { name: "סטיבן אדאמס", rating: 78 }, 
        { name: "ביטאדזה", rating: 76 }, { name: "קאפלה", rating: 80 }, { name: "פוסט", rating: 73 }, { name: "מלוואח", rating: 76 }, 
        { name: "אוליניק", rating: 77 }, { name: "מו במבה", rating: 76 }
    ]
};

const rawPlayersDB = {};
let globalId = 1;

for (const position in rawPlayersData) {
    rawPlayersDB[position] = rawPlayersData[position].map(player => ({
        id: globalId++,
        name: player.name,
        rating: player.rating,
        position: position,
        image: "🏀" 
    }));
}

let playersDB = [];
let gameState = {
    gameStarted: false,
    participants: [],
    auctionIndex: 0,
    currentAuction: {
        player: null,
        highestBid: 0,
        highestBidder: null,
        activeBidders: [], 
        currentTurnId: null 
    },
    leaderboard: leaderboard 
};

function initializeGamePlayers() {
    let selectedPlayers = [];
    const shuffleArray = (array) => array.sort(() => 0.5 - Math.random());

    for (const position in rawPlayersDB) {
        const shuffledPosition = shuffleArray([...rawPlayersDB[position]]);
        const selectedFromPosition = shuffledPosition.slice(0, 3);
        selectedPlayers.push(...selectedFromPosition);
    }

    playersDB = shuffleArray(selectedPlayers);
}

function handleAuctionEnd() {
    const active = gameState.currentAuction.activeBidders;
    
    if (active.length === 1) {
        const winnerId = active[0];
        const winner = gameState.participants.find(p => p.id === winnerId);
        
        if (winner && gameState.currentAuction.highestBid > 0) {
            winner.budget -= gameState.currentAuction.highestBid;
            
            const positionsOrder = ['PG', 'SG', 'SF', 'PF', 'C'];
            const startIdx = positionsOrder.indexOf(gameState.currentAuction.player.position);
            
            for (let i = 0; i < 5; i++) {
                const checkIdx = (startIdx + i) % 5;
                if (winner.roster[checkIdx].player === null) {
                    winner.roster[checkIdx].player = {
                        ...gameState.currentAuction.player,
                        boughtFor: gameState.currentAuction.highestBid
                    };
                    break; 
                }
            }
        }
    }
    
    gameState.auctionIndex++;
    startNextAuction();
}

function startNextAuction() {
    if (gameState.auctionIndex < playersDB.length) {
        const validParticipants = gameState.participants.filter(p => {
            const filledSpots = p.roster.filter(slot => slot.player !== null).length;
            return p.budget > 0 && filledSpots < 5;
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
            highestBid: 0,
            highestBidder: null,
            activeBidders: orderedBidders,
            currentTurnId: startingId
        };
    } else {
        gameState.currentAuction.player = null; 
    }
    io.emit('updateState', gameState);
}

io.on('connection', (socket) => {
    socket.on('joinGame', (playerName) => {
        const cleanName = playerName.trim();
        const existingPlayer = gameState.participants.find(p => p.name === cleanName);

        if (existingPlayer) {
            const oldId = existingPlayer.id;
            existingPlayer.id = socket.id; 
            existingPlayer.connected = true; // סימון כשחקן מחובר

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

        if (gameState.gameStarted) {
            socket.emit('error', 'המשחק כבר התחיל, לא ניתן להצטרף כרגע.');
            return;
        }

        const newPlayer = { 
            id: socket.id, 
            name: cleanName, 
            budget: 20, 
            connected: true, // סימון כשחקן מחובר
            roster: [
                { pos: 'PG', player: null },
                { pos: 'SG', player: null },
                { pos: 'SF', player: null },
                { pos: 'PF', player: null },
                { pos: 'C', player: null }
            ] 
        };
        gameState.participants.push(newPlayer);
        io.emit('updateState', gameState);
    });

    socket.on('startGame', () => {
        if (!gameState.gameStarted && gameState.participants.length > 0) {
            gameState.gameStarted = true;
            gameState.auctionIndex = 0;
            initializeGamePlayers();
            startNextAuction();
        }
    });

    socket.on('declareWinner', (winnerName) => {
        if (!leaderboard[winnerName]) {
            leaderboard[winnerName] = 0;
        }
        leaderboard[winnerName] += 1;
        
        fs.writeFileSync(leaderboardPath, JSON.stringify(leaderboard));
        
        gameState.gameStarted = false;
        gameState.auctionIndex = 0;
        gameState.currentAuction = { player: null, highestBid: 0, highestBidder: null, activeBidders: [], currentTurnId: null };
        gameState.leaderboard = leaderboard;
        
        // ניקוי אוטומטי של כל מי שהתנתק מהמשחק הקודם לפני שחוזרים ללובי
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

        io.emit('updateState', gameState);
    });

    socket.on('placeBid', (bidAmount) => {
        if (!gameState.gameStarted || gameState.currentAuction.currentTurnId !== socket.id) return;
        
        const numericBid = Math.floor(Number(bidAmount));
        const participant = gameState.participants.find(p => p.id === socket.id);
        
        if (participant) {
            const emptySlots = 5 - participant.roster.filter(slot => slot.player !== null).length;
            const requiredReserve = emptySlots > 0 ? emptySlots - 1 : 0;
            const maxAllowedBid = participant.budget - requiredReserve;

            if (numericBid > gameState.currentAuction.highestBid && numericBid <= maxAllowedBid) {
                gameState.currentAuction.highestBid = numericBid;
                gameState.currentAuction.highestBidder = participant.name;
                
                if (gameState.currentAuction.activeBidders.length === 1) {
                    handleAuctionEnd();
                } else {
                    const currentIndex = gameState.currentAuction.activeBidders.indexOf(socket.id);
                    const nextIndex = (currentIndex + 1) % gameState.currentAuction.activeBidders.length;
                    gameState.currentAuction.currentTurnId = gameState.currentAuction.activeBidders[nextIndex];
                    io.emit('updateState', gameState);
                }
            }
        }
    });

    socket.on('fold', () => {
        if (!gameState.gameStarted || gameState.currentAuction.currentTurnId !== socket.id) return;
        if (gameState.currentAuction.highestBid === 0) return; 
        
        const currentIndex = gameState.currentAuction.activeBidders.indexOf(socket.id);
        if (currentIndex !== -1) {
            gameState.currentAuction.activeBidders.splice(currentIndex, 1);
            
            if (gameState.currentAuction.activeBidders.length <= 1) {
                handleAuctionEnd();
            } else {
                const nextIndex = currentIndex % gameState.currentAuction.activeBidders.length;
                gameState.currentAuction.currentTurnId = gameState.currentAuction.activeBidders[nextIndex];
                io.emit('updateState', gameState);
            }
        }
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

        // אם אנחנו בחדר ההמתנה והוא התנתק - מוחקים אותו מיד (אין לו קבוצה להפסיד)
        if (!gameState.gameStarted) {
            gameState.participants = gameState.participants.filter(p => p.connected);
        }

        // אם *כל* המשתתפים במערכת מנותקים - מאפסים את השרת לחלוטין
        const anyConnected = gameState.participants.some(p => p.connected);
        if (!anyConnected) {
            gameState.gameStarted = false;
            gameState.participants = [];
            gameState.auctionIndex = 0;
            gameState.currentAuction = { player: null, highestBid: 0, highestBidder: null, activeBidders: [], currentTurnId: null };
        }

        io.emit('updateState', gameState);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});