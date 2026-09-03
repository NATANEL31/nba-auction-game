const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// הגשת קבצי צד הלקוח (המשחק שעשינו לו build)
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const rawNames = {
    PG: ["שיי", "לוקה", "קנינגהאם", "קרי", "האליברטון", "טריי יאנג", "ג'ה מוראנט", "הארפר", "הארדן", "לאמלו", "קיונטה ג'ורג'", "פריצ'ארד", "הולידיי", "נמבהארד", "קולייר", "קובי וויט", "ואן וליט", "מקונל", "הנדרסון", "מקיין", "אלבראדו", "גודווין", "קאם פיין", "בן שרף", "דיאנג'לו ראסל", "בופקין", "פודזימסקי", "שרודר"],
    SG: ["אדוארדס", "ריבס", "קאסל", "אמן", "מילר", "אדג'קומבה", "אלכסנדר ווקר", "בארט", "לאבין", "ג'יילן גרין", "דוסנמו", "קווארד", "שיידון שארפ", "אלן", "וולאס", "מאות'רין", "פול", "אנפרניי", "רובינסון", "גריימס", "ג'ו", "שאמט", "מלטון", "ביל", "תומפסון", "קנארד", "עמנואל שארפ", "קיספרט", "בן שפרד", "גארי טרנט ג'וניור", "טייבולי"],
    SF: ["בראון", "טריי מרפי", "ג' וויליאמס", "אייס ביילי", "דוראנט", "קוואי", "לברון", "פלאג", "דני אבדיה", "אאוזר", "קנופל", "דרוזן", "ברוקס", "ואסל", "ביי", "סמארט", "נסמית", "אוברה ג'וניור", "איסון", "קוזמה", "האנטר", "קרטר בראיינט", "האוזר", "ריזאשה", "מידלטון", "אוקורו", "לראביה", "גארי פייטון השני", "גריידי דיק"],
    PF: ["יאניס", "טייטום", "בארנס", "סיאקם", "ריד", "באנקרו", "זיון", "הולמגרן", "רנדל", "בוזליס", "מיילס ברידג'ס", "האצ'ימורה", "דריימונד גרין", "אובי טופין", "אלדאמה", "DJJ", "JJJ", "רויס אוניל", "ממוקשווילי", "בובי פורטיס", "שמפני", "ד. ווייד", "דני וולף", "ליילס", "מינוט", "קאמינגה"],
    C: ["וומבניאמה", "אמביד", "יוקיץ", "טאונס", "סבוניס", "אלן", "דורן", "גובר", "זובאק", "אוקונגו", "קלינגן", "פורזינגיס", "אידי", "גאפורד", "דיאבאטה", "לייבלי", "ווצ'ביץ'", "רוברט וויליאמס", "ברוק לופס", "אל הורפורד", "ג'יילין וויליאמס", "דראמונד", "הייז", "קורנט", "בונה", "לנדל", "האף", "סטיבן אדאמס", "ביטאדזה", "קאפלה", "פוסט", "מלוואח", "אוליניק", "מו במבה"]
};

const rawPlayersDB = {};
let globalId = 1;

for (const position in rawNames) {
    rawPlayersDB[position] = rawNames[position].map(name => ({
        id: globalId++,
        name: name,
        position: position,
        image: "🏀" 
    }));
}

let playersDB = [];
let gameState = {
    participants: [],
    auctionIndex: 0,
    currentAuction: {
        player: null,
        highestBid: 0,
        highestBidder: null,
        activeBidders: [], 
        currentTurnId: null 
    }
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
    if (gameState && gameState.currentAuction) {
        gameState.currentAuction.player = playersDB[0];
    }
}

initializeGamePlayers();

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
        const newPlayer = { 
            id: socket.id, 
            name: playerName, 
            budget: 20, 
            roster: [
                { pos: 'PG', player: null },
                { pos: 'SG', player: null },
                { pos: 'SF', player: null },
                { pos: 'PF', player: null },
                { pos: 'C', player: null }
            ] 
        };
        gameState.participants.push(newPlayer);
        
        if (!gameState.currentAuction.activeBidders.includes(socket.id) && gameState.currentAuction.player) {
            gameState.currentAuction.activeBidders.push(socket.id);
            if (!gameState.currentAuction.currentTurnId) {
                gameState.currentAuction.currentTurnId = socket.id;
            }
        }
        io.emit('updateState', gameState);
    });

    socket.on('placeBid', (bidAmount) => {
        if (gameState.currentAuction.currentTurnId !== socket.id) return;
        
        const numericBid = Math.floor(Number(bidAmount));
        const participant = gameState.participants.find(p => p.id === socket.id);
        
        if (participant) {
            const emptySlots = 5 - participant.roster.filter(slot => slot.player !== null).length;
            const requiredReserve = emptySlots > 0 ? emptySlots - 1 : 0;
            const maxAllowedBid = participant.budget - requiredReserve;

            if (numericBid > gameState.currentAuction.highestBid && numericBid <= maxAllowedBid) {
                gameState.currentAuction.highestBid = numericBid;
                gameState.currentAuction.highestBidder = participant.name;
                
                // התיקון: אם הוא היחיד שפעיל במשחק והציע סכום - המכרז נסגר מיד לטובתו
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
        if (gameState.currentAuction.currentTurnId !== socket.id) return;
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
        gameState.participants = gameState.participants.filter(p => p.id !== socket.id);
        
        const activeIdx = gameState.currentAuction.activeBidders.indexOf(socket.id);
        if (activeIdx !== -1) {
            gameState.currentAuction.activeBidders.splice(activeIdx, 1);
            
            if (gameState.currentAuction.currentTurnId === socket.id) {
                if (gameState.currentAuction.activeBidders.length <= 1) {
                    handleAuctionEnd();
                } else {
                    const nextIndex = activeIdx % gameState.currentAuction.activeBidders.length;
                    gameState.currentAuction.currentTurnId = gameState.currentAuction.activeBidders[nextIndex];
                }
            }
        }
        io.emit('updateState', gameState);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});