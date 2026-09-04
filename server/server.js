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

// === המאגר המעודכן שלך עם כל השחקנים החדשים והדירוגים ===
const rawPlayersData = {
    PG: [
        { name: "לוקה דונצ'יץ'", rating: 97 }, { name: "סטף קרי", rating: 96 }, { name: "שיי גילג'ס-אלכסנדר", rating: 96 }, { name: "ג'יילן ברנסון", rating: 93 }, 
        { name: "טייריס הליברטון", rating: 90 }, { name: "ג'ה מוראנט", rating: 92 }, { name: "דמיאן לילארד", rating: 89 }, { name: "טריי יאנג", rating: 89 }, 
        { name: "דיארון פוקס", rating: 88 }, { name: "ג'מאל מארי", rating: 87 }, { name: "דריוס גרלנד", rating: 86 }, { name: "לאמלו בול", rating: 88 }, 
        { name: "טייריס מקסי", rating: 88 }, { name: "ג'רו הולידיי", rating: 86 }, { name: "פרד ואנווליט", rating: 83 }, { name: "ג'יילן סאגס", rating: 82 }, 
        { name: "קייד קנינגהם", rating: 87 }, { name: "עמנואל קוויקלי", rating: 83 }, { name: "קובי וייט", rating: 84 }, { name: "ראיין רולינס", rating: 72 }, 
        { name: "קווין פורטר ג'וניור", rating: 78 }, { name: "דיאנג'לו ראסל", rating: 81 }, { name: "מרקוס סמארט", rating: 80 }, { name: "סקוט הנדרסון", rating: 79 }, 
        { name: "קיונטה ג'ורג'", rating: 81 }, { name: "טרה ג'ונס", rating: 78 }, { name: "טיוס ג'ונס", rating: 79 }, { name: "פייטון פריצ'ארד", rating: 78 }, 
        { name: "טי.ג'יי מקונל", rating: 79 }, { name: "חוסה אלברדו", rating: 77 }, { name: "דניס שרודר", rating: 79 }, { name: "ג'רמי פירס", rating: 73 }, 
        { name: "איגור דמין", rating: 78 }, { name: "בן שרף", rating: 78 }, { name: "איו דוסונמו", rating: 79 }, { name: "קולין סקסטון", rating: 82 }, 
        { name: "ריד שפרד", rating: 79 }, { name: "רוב דילינגהאם", rating: 78 }, { name: "באב קרינגטון", rating: 76 }, { name: "ג'וש גידי", rating: 81 }, 
        { name: "אנדרו נמבהארד", rating: 80 }, { name: "קולין גילספרי", rating: 73 }, { name: "אנתוני בלאק", rating: 76 }, { name: "אייזיאה קולייר", rating: 77 }, 
        { name: "מיילס מקברייד", rating: 78 }, { name: "דז'ונטה מארי", rating: 86 }, { name: "קריס דאן", rating: 76 }, { name: "טרה מאן", rating: 76 }, 
        { name: "בונז היילנד", rating: 75 }, { name: "ג'ארד מקיין", rating: 77 }, { name: "ברנדון וויליאמס", rating: 72 }, { name: "דניס ג'נקינס", rating: 70 }, 
        { name: "דביון מיטשל", rating: 76 }, { name: "קמרון פיין", rating: 75 }, { name: "ארון הולידיי", rating: 74 }, { name: "דילן הארפר", rating: 80 }
    ],
    SG: [
        { name: "אנתוני אדוארדס", rating: 95 }, { name: "דווין בוקר", rating: 95 }, { name: "דונובן מיטשל", rating: 92 }, { name: "ג'יילן בראון", rating: 92 }, 
        { name: "קיירי אירווינג", rating: 93 }, { name: "דזמונד ביין", rating: 85 }, { name: "דריק וייט", rating: 86 }, { name: "סי.ג'יי מקולום", rating: 84 }, 
        { name: "טיילר הירו", rating: 84 }, { name: "זאק לאבין", rating: 83 }, { name: "אמן תומפסון", rating: 81 }, { name: "ג'ורדן פול", rating: 78 }, 
        { name: "ויג'יי אדג'קומבה", rating: 78 }, { name: "ברנדון מילר", rating: 84 }, { name: "קייסון וולאס", rating: 78 }, { name: "אנפרניי סימונס", rating: 83 }, 
        { name: "בראדלי ביל", rating: 84 }, { name: "אוסטין ריבס", rating: 83 }, { name: "ג'יילן גרין", rating: 84 }, { name: "קאם תומאס", rating: 83 }, 
        { name: "לאנדרי שאמט", rating: 74 }, { name: "מאליק מונק", rating: 82 }, { name: "סדריק קאוורד", rating: 75 }, { name: "ג'וש הארט", rating: 82 }, 
        { name: "אלכס קארוסו", rating: 81 }, { name: "קליי תומפסון", rating: 81 }, { name: "קנטביוס קלדוול-פופ", rating: 80 }, { name: "גרייסון אלן", rating: 80 }, 
        { name: "דונטה דיווינצ'נזו", rating: 82 }, { name: "מקס סטרוס", rating: 78 }, { name: "ברנדין פודז'מסקי", rating: 80 }, { name: "קאריס לוורט", rating: 80 }, 
        { name: "באדי הילד", rating: 79 }, { name: "גארי טרנט ג'וניור", rating: 78 }, { name: "נורמן פאוול", rating: 81 }, { name: "לוגנט דורט", rating: 81 }, 
        { name: "כריסטיאן בראון", rating: 78 }, { name: "קיאון אליס", rating: 77 }, { name: "דייסון דניאלס", rating: 77 }, { name: "ג'ורדן הוקינס", rating: 76 }, 
        { name: "גריידי דיק", rating: 78 }, { name: "בנדיקט מת'ורין", rating: 81 }, { name: "בילאל קוליבאלי", rating: 77 }, { name: "סטפון קאסל", rating: 78 }, 
        { name: "דלטון קנקט", rating: 78 }, { name: "טרנס שאנון ג'וניור", rating: 76 }, { name: "קוונטין גריימס", rating: 77 }, { name: "לוק קנארד", rating: 77 }, 
        { name: "אייזיאה ג'ו", rating: 76 }, { name: "ניקיל אלכסנדר-ווקר", rating: 77 }, { name: "גארי האריס", rating: 75 }, { name: "סיאון ג'יימס", rating: 72 }, 
        { name: "ג'ורדן קלארקסון", rating: 79 }, { name: "סם מריל", rating: 76 }, { name: "מקס כריסטי", rating: 75 }, { name: "זאיר ויליאמס", rating: 75 }, 
        { name: "איי.ג'יי גרין", rating: 75 }, { name: "ג'וליאן סטראותר", rating: 76 }, { name: "טרה ג'ונסון", rating: 78 }, { name: "קווין הארטר", rating: 77 }, 
        { name: "קלי אוברה ג'וניור", rating: 80 }, { name: "סת' קרי", rating: 74 }, { name: "טרנס מאן", rating: 77 }, { name: "מוזס מודי", rating: 76 }
    ],
    SF: [
        { name: "ג'ייסון טייטום", rating: 96 }, { name: "לברון ג'יימס", rating: 95 }, { name: "קוואי לנארד", rating: 91 }, { name: "ג'ימי באטלר", rating: 89 }, 
        { name: "פול ג'ורג'", rating: 89 }, { name: "מיקל ברידג'ס", rating: 85 }, { name: "ברנדון אינגרם", rating: 85 }, { name: "או.ג'י אנונובי", rating: 84 }, 
        { name: "פרנץ ואגנר", rating: 86 }, { name: "קופר פלאג", rating: 82 }, { name: "קון קנופל", rating: 77 }, { name: "אייס ביילי", rating: 80 }, 
        { name: "מייקל פורטר ג'וניור", rating: 84 }, { name: "סקוטי בארנס", rating: 86 }, { name: "דמאר דרוזן", rating: 86 }, { name: "ג'יילן וויליאמס", rating: 86 }, 
        { name: "אר.ג'יי בארט", rating: 83 }, { name: "הרברט ג'ונס", rating: 82 }, { name: "ג'ראמי גרנט", rating: 82 }, { name: "דני אבדיה", rating: 82 }, 
        { name: "אנדרו וויגינס", rating: 80 }, { name: "דילון ברוקס", rating: 79 }, { name: "דבין וואסל", rating: 83 }, { name: "גוי סנטוס", rating: 73 }, 
        { name: "ג'ייק לראביה", rating: 75 }, { name: "ג'וש גרין", rating: 76 }, { name: "הריסון בארנס", rating: 78 }, { name: "טריי מרפי", rating: 82 }, 
        { name: "קאם ג'ונסון", rating: 80 }, { name: "קיגן מארי", rating: 82 }, { name: "זאקרי ריזאשה", rating: 78 }, { name: "קלדון ג'ונסון", rating: 80 }, 
        { name: "אוסאר תומפסון", rating: 80 }, { name: "חיימה חאקז ג'וניור", rating: 81 }, { name: "קורי קיספרט", rating: 78 }, { name: "מאטאס בוזליס", rating: 77 }, 
        { name: "טידג'אן סאלון", rating: 75 }, { name: "קודי ויליאמס", rating: 76 }, { name: "קרטר בראיינט", rating: 75 }, { name: "סימונה פונטקיו", rating: 78 }, 
        { name: "רויס אוניל", rating: 76 }, { name: "טוריאן פרינס", rating: 76 }, { name: "קיילב מרטין", rating: 78 }, { name: "נאג'י מרשל", rating: 77 }, 
        { name: "דריק ג'ונס ג'וניור", rating: 77 }, { name: "ברוס בראון", rating: 78 }, { name: "דיאנדרה האנטר", rating: 79 }, { name: "ארון ניסמית'", rating: 78 }, 
        { name: "אייזק אוקורו", rating: 77 }, { name: "ג'יילן מקדניאלס", rating: 74 }, { name: "גארי פייטון השני", rating: 76 }, { name: "סאדיק ביי", rating: 78 }, 
        { name: "פייטון וואטסון", rating: 77 }, { name: "אוסמאן דיינג", rating: 74 }, { name: "קאם ויטמור", rating: 79 }, { name: "ג'בונטה גרין", rating: 76 }, 
        { name: "ג'וליאן שמפני", rating: 75 }, { name: "סם האוזר", rating: 76 }, { name: "טומאני קמארה", rating: 76 }, { name: "כריס מארי", rating: 74 }
    ],
    PF: [
        { name: "יאניס אנטטוקומפו", rating: 97 }, { name: "קווין דוראנט", rating: 96 }, { name: "אנתוני דייוויס", rating: 95 }, { name: "ציון ויליאמסון", rating: 89 }, 
        { name: "פאולו באנקרו", rating: 89 }, { name: "פסקל סיאקם", rating: 88 }, { name: "ג'וליוס רנדל", rating: 85 }, { name: "קארל-אנתוני טאונס", rating: 87 }, 
        { name: "צ'ט הולמגרן", rating: 88 }, { name: "ג'ארן ג'קסון ג'וניור", rating: 86 }, { name: "ג'ון קולינס", rating: 82 }, { name: "לאורי מארקנן", rating: 86 }, 
        { name: "אוואן מובלי", rating: 86 }, { name: "ארון גורדון", rating: 84 }, { name: "דריימונד גרין", rating: 81 }, { name: "קייל קוזמה", rating: 83 }, 
        { name: "מיילס ברידג'ס", rating: 82 }, { name: "ג'ונתן קומינגה", rating: 83 }, { name: "ג'בארי סמית' ג'וניור", rating: 81 }, { name: "רוי הצ'ימורה", rating: 79 }, 
        { name: "נאז ריד", rating: 82 }, { name: "בובי פורטיס", rating: 81 }, { name: "פי.ג'יי וושינגטון", rating: 81 }, { name: "טוביאס האריס", rating: 80 }, 
        { name: "קוילן מארי בוילס", rating: 75 }, { name: "ג'יילן ג'ונסון", rating: 84 }, { name: "ג'רמי סוצ'אן", rating: 79 }, { name: "פטריק ויליאמס", rating: 78 }, 
        { name: "טיילור הנדריקס", rating: 77 }, { name: "ג'ראס ווקר", rating: 77 }, { name: "גרנט ויליאמס", rating: 76 }, { name: "אובי טופין", rating: 79 }, 
        { name: "קלי אוליניק", rating: 77 }, { name: "כריס בושיי", rating: 76 }, { name: "מקסי קלבר", rating: 75 }, { name: "לארי נאנס ג'וניור", rating: 76 }, 
        { name: "דין וייד", rating: 75 }, { name: "קנריץ' וויליאמס", rating: 75 }, { name: "ג'יילן סאלון", rating: 74 }, { name: "אנתוני גיל", rating: 73 }, 
        { name: "ג'ף גרין", rating: 74 }, { name: "לוקה גרזה", rating: 75 }, { name: "דני וולף", rating: 74 }, { name: "ראשיר פלמינג", rating: 72 }, 
        { name: "סנטי אלדאמה", rating: 77 }, { name: "טרי ליילס", rating: 76 }, { name: "רון הולאנד", rating: 77 }, { name: "ג'ונתן אייזק", rating: 80 }, 
        { name: "טארי איסון", rating: 79 }, { name: "סנדרו מאמוקלאשווילי", rating: 75 }
    ],
    C: [
        { name: "ניקולה יוקיץ'", rating: 98 }, { name: "ג'ואל אמביד", rating: 97 }, { name: "ויקטור ומבניאמה", rating: 96 }, { name: "באם אדבאיו", rating: 89 }, 
        { name: "אלכס סאר", rating: 78 }, { name: "דומאנטאס סאבוניס", rating: 88 }, { name: "רודי גובר", rating: 85 }, { name: "אלפרן שנגון", rating: 87 }, 
        { name: "מיילס טרנר", rating: 84 }, { name: "קריסטפס פורזינגיס", rating: 86 }, { name: "ברוק לופז", rating: 80 }, { name: "ג'ארט אלן", rating: 85 }, 
        { name: "ניק קלקסטון", rating: 83 }, { name: "דרק לייבלי", rating: 82 }, { name: "אייזיאה הרטנשטיין", rating: 82 }, { name: "איביצה זובאץ", rating: 81 }, 
        { name: "קלינט קאפלה", rating: 80 }, { name: "יונאס ולנצ'יונאס", rating: 81 }, { name: "ונדל קרטר ג'וניור", rating: 80 }, { name: "יוסוף נורקיץ'", rating: 80 }, 
        { name: "דיאנדרה אייטון", rating: 83 }, { name: "ווקר קסלר", rating: 80 }, { name: "דניאל גאפורד", rating: 81 }, { name: "מארק ויליאמס", rating: 81 }, 
        { name: "ג'יילן דורן", rating: 83 }, { name: "מיטשל רובינסון", rating: 80 }, { name: "סטיבן אדמס", rating: 78 }, { name: "אונייקה אוקונגוו", rating: 80 }, 
        { name: "זאק אידי", rating: 79 }, { name: "דונובן קלינגן", rating: 78 }, { name: "יעקב פולטל", rating: 80 }, { name: "קל'אל וור", rating: 77 }, 
        { name: "טרייס ג'קסון-דייוויס", rating: 79 }, { name: "ג'יילין וויליאמס", rating: 78 }, { name: "דיירון שארפ", rating: 76 }, { name: "ניק ריצ'רדס", rating: 77 }, 
        { name: "פול ריד", rating: 77 }, { name: "גוגה ביטאדזה", rating: 76 }, { name: "מייסון פלאמלי", rating: 75 }, { name: "אנדרה דראמונד", rating: 78 }, 
        { name: "לוק קורנט", rating: 75 }, { name: "מוסא דיאבאטה", rating: 74 }, { name: "ריין קאלקברנר", rating: 74 }, { name: "מקסים ריינוד", rating: 73 }, 
        { name: "דריק קווין", rating: 72 }, { name: "דואופ רית'", rating: 75 }, { name: "דווייט פאוול", rating: 74 }, { name: "ג'קסון הייז", rating: 76 }, 
        { name: "תומאס בראיינט", rating: 75 }, { name: "ג'וק לנדייל", rating: 75 }, { name: "נמיאס קייטה", rating: 75 }, { name: "ג'יילן סמית'", rating: 77 }, 
        { name: "ג'יילן האף", rating: 74 }, { name: "מוץ' ואגנר", rating: 77 }, { name: "ניקולה ווצ'ביץ'", rating: 82 }, { name: "רוברט וויליאמס השלישי", rating: 79 }, 
        { name: "אל הורפורד", rating: 79 }, { name: "אייזאה סטיוארט", rating: 78 }, { name: "מרווין באגלי", rating: 77 }, { name: "ייבס מיסי", rating: 76 }
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
        currentTurnId: null,
        turnEndTime: null 
    },
    leaderboard: leaderboard 
};

let turnTimer = null;

function clearTurnTimer() {
    if (turnTimer) {
        clearTimeout(turnTimer);
        turnTimer = null;
    }
}

function setTurnTimer() {
    clearTurnTimer();
    if (!gameState.gameStarted || !gameState.currentAuction || !gameState.currentAuction.player) return;

    gameState.currentAuction.turnEndTime = Date.now() + 15000;
    
    turnTimer = setTimeout(() => {
        const turnId = gameState.currentAuction.currentTurnId;
        if (turnId) {
            executeFold(turnId);
        }
    }, 15000);
}

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
    clearTurnTimer(); 
    const active = gameState.currentAuction.activeBidders;
    
    if (active.length === 1) {
        const winnerId = active[0];
        const winner = gameState.participants.find(p => p.id === winnerId);
        
        const finalBid = gameState.currentAuction.highestBid > 0 ? gameState.currentAuction.highestBid : 1;

        if (winner && winner.budget >= finalBid) {
            winner.budget -= finalBid;
            
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

            io.emit('playerSold', {
                playerName: gameState.currentAuction.player.name,
                winnerName: winner.name
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
            currentTurnId: startingId,
            turnEndTime: null
        };
        
        setTurnTimer(); 
    } else {
        gameState.currentAuction.player = null; 
    }
    io.emit('updateState', gameState);
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

io.on('connection', (socket) => {
    socket.on('joinGame', (playerName) => {
        const cleanName = playerName.trim();
        const existingPlayer = gameState.participants.find(p => p.name === cleanName);

        if (existingPlayer) {
            const oldId = existingPlayer.id;
            existingPlayer.id = socket.id; 
            existingPlayer.connected = true; 

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
        clearTurnTimer();
        if (!leaderboard[winnerName]) {
            leaderboard[winnerName] = 0;
        }
        leaderboard[winnerName] += 1;
        
        fs.writeFileSync(leaderboardPath, JSON.stringify(leaderboard));
        
        gameState.gameStarted = false;
        gameState.auctionIndex = 0;
        gameState.currentAuction = { player: null, highestBid: 0, highestBidder: null, activeBidders: [], currentTurnId: null, turnEndTime: null };
        gameState.leaderboard = leaderboard;
        
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
                    setTurnTimer(); 
                    io.emit('updateState', gameState);
                }
            }
        }
    });

    socket.on('fold', () => {
        if (!gameState.gameStarted || gameState.currentAuction.currentTurnId !== socket.id) return;
        executeFold(socket.id);
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
        }

        const anyConnected = gameState.participants.some(p => p.connected);
        if (!anyConnected) {
            clearTurnTimer();
            gameState.gameStarted = false;
            gameState.participants = [];
            gameState.auctionIndex = 0;
            gameState.currentAuction = { player: null, highestBid: 0, highestBidder: null, activeBidders: [], currentTurnId: null, turnEndTime: null };
        }

        io.emit('updateState', gameState);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});