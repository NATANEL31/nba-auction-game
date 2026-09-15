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

// ממוצעים למשחק. כרגע קיימים רק ליורוליג — שאר החבילות פשוט
// לא יציגו את השורה הזו עד שיסופקו נתונים.
const playerStats = {
    euroleague: readJsonSafe(path.join(__dirname, 'euroleagueStats.json'), {})
};

const leaderboardPath = path.join(dataDir, 'leaderboard.json');
let leaderboard = readJsonSafe(leaderboardPath, {});

const usersPath = path.join(dataDir, 'users.json');
let usersDB = readJsonSafe(usersPath, {});

const rawPlayersDataNBA = {
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
        { name: "ג'ייסון טייטום", rating: 94 }, { name: "לברון ג'יימס", rating: 92 }, { name: "קוואי לנארד", rating: 93 }, { name: "ג'ימי באטלר", rating: 85 }, 
        { name: "פול ג'ורג'", rating: 84 }, { name: "מיקל ברידג'ס", rating: 83 }, { name: "ברנדון אינגרם", rating: 84 }, { name: "או.ג'י אנונובי", rating: 88 }, 
        { name: "פרנץ ואגנר", rating: 86 }, { name: "קופר פלאג", rating: 87 }, { name: "קון קנופל", rating: 81 }, { name: "אייס ביילי", rating: 77 }, 
        { name: "מייקל פורטר ג'וניור", rating: 84 }, { name: "סקוטי בארנס", rating: 88 }, { name: "דמאר דרוזן", rating: 82 }, { name: "ג'יילן וויליאמס", rating: 86 }, 
        { name: "אר.ג'יי בארט", rating: 82 }, { name: "הרברט ג'ונס", rating: 78 }, { name: "ג'ראמי גרנט", rating: 78 }, { name: "דני אבדיה", rating: 89 }, 
        { name: "אנדרו וויגינס", rating: 80 }, { name: "דילון ברוקס", rating: 81 }, { name: "דבין וואסל", rating: 80 }, { name: "גוי סנטוס", rating: 73 }, 
        { name: "ג'ייק לראביה", rating: 75 }, { name: "ג'וש גרין", rating: 72 }, { name: "הריסון בארנס", rating: 74 }, { name: "טריי מרפי", rating: 82 }, 
        { name: "קאם ג'ונסון", rating: 79 }, { name: "קיגן מארי", rating: 78 }, { name: "זאקרי ריזאשה", rating: 75 }, { name: "קלדון ג'ונסון", rating: 76 }, 
        { name: "אוסאר תומפסון", rating: 80 }, { name: "חיימה חאקז ג'וניור", rating: 80 }, { name: "קורי קיספרט", rating: 76 }, { name: "מאטאס בוזליס", rating: 79 }, 
        { name: "טידג'אן סאלון", rating: 70 }, { name: "קודי ויליאמס", rating: 72 }, { name: "קרטר בראיינט", rating: 71 }, { name: "סימונה פונטקיו", rating: 75 }, 
        { name: "רויס אוניל", rating: 74 }, { name: "טוריאן פרינס", rating: 72 }, { name: "קיילב מרטין", rating: 75 }, { name: "נאג'י מרשל", rating: 76 }, 
        { name: "דריק ג'ונס ג'וניור", rating: 76 }, { name: "ברוס בראון", rating: 75 }, { name: "דיאנדרה האנטר", rating: 78 }, { name: "ארון ניסמית'", rating: 79 }, 
        { name: "אייזק אוקורו", rating: 74 }, { name: "ג'יידן מקדניאלס", rating: 83 }, { name: "גארי פייטון השני", rating: 73 }, { name: "סאדיק ביי", rating: 75 }, 
        { name: "פייטון וואטסון", rating: 79 }, { name: "אוסמאן דיינג", rating: 69 }, { name: "קאם ויטמור", rating: 74 }, { name: "ג'בונטה גרין", rating: 71 }, 
        { name: "ג'וליאן שמפני", rating: 77 }, { name: "סם האוזר", rating: 75 }, { name: "טומאני קמארה", rating: 77 }, { name: "כריס מארי", rating: 66 }
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
const rawPlayersDataMaccabi = {
    PG: [
        { name: "טייריס רייס", rating: 89 }, { name: "יוגב אוחיון", rating: 85 }, { name: "יובל נעימי", rating: 74 }, { name: "ג'ורדן פארמר", rating: 88 }, { name: "טיילור רוצ'סטי", rating: 80 }, { name: "גל מקל", rating: 86 }, { name: "נוריס קול", rating: 84 }, { name: "פייר ג'קסון", rating: 83 }, { name: "נייט וולטרס", rating: 79 }, { name: "ארון ג'קסון", rating: 83 }, { name: "כריס ג'ונס", rating: 82 }, { name: "קינן אוונס", rating: 81 }, { name: "יפתח זיו", rating: 71 }, { name: "לורנזו בראון", rating: 88 }, { name: "תמיר בלאט", rating: 85 }, { name: "רוקאס יוקובאיטיס", rating: 83 }, { name: "עומר מאייר", rating: 70 },
        { name: "תיאו פאפאלוקאס", rating: 82 }, { name: "מורן רות", rating: 75 }, { name: "עמית עבו", rating: 69 }, { name: "ים מדר", rating: 83 }, { name: "רמון סשנס", rating: 81 }, { name: "ג'רמי פארגו", rating: 92 }
    ],
    SG: [
        { name: "ריקי היקמן", rating: 88 }, { name: "סילבן לנדסברג", rating: 81 }, { name: "אנדרו גאודלוק", rating: 86 }, { name: "די.ג'יי. סילי", rating: 73 }, { name: "דגן יבזורי", rating: 75 }, { name: "ג'ון דיברתולומיאו", rating: 84 }, { name: "קנדריק ריי", rating: 73 }, { name: "טיילר דורסי", rating: 87 }, { name: "קיירי תומאס", rating: 73 }, { name: "ווייד בולדווין", rating: 92 }, { name: "אוסטין הולינס", rating: 74 }, { name: "ג'יילן אדאמס", rating: 79 }, { name: "ג'ו תומאסון", rating: 70 },
        { name: "טל בורשטיין", rating: 83 }, { name: "דיוויד לוגאן", rating: 85 }, { name: "לוני ווקר", rating: 83 }, { name: "ג'ימי קלארק", rating: 87 }, { name: "סקוטי וילבקין", rating: 91 }, { name: "ג'ף דאוטין", rating: 75 }, { name: "גבריאל איפה לונדברג", rating: 84 }, { name: "קית לנגפורד", rating: 88 }
    ],
    SF: [
        { name: "ליוואי רנדולף", rating: 82 }, { name: "דווין סמית'", rating: 89 }, { name: "ג'ו אינגלס", rating: 77 }, { name: "גיא פניני", rating: 80 }, { name: "סוני ווימס", rating: 88 }, { name: "דיאנדרה קיין", rating: 80 }, { name: "יובל זוסמן", rating: 77 }, { name: "כארם משעור", rating: 70 }, { name: "דני אבדיה", rating: 86 }, { name: "אלייז'ה בראיינט", rating: 86 }, { name: "סנדי כהן", rating: 72 }, { name: "ג'יימס נאנלי", rating: 80 }, { name: "בונזי קולסון", rating: 85 }, { name: "רפי מנקו", rating: 74 }, { name: "אנטוניוס קליבלנד", rating: 76 }, { name: "מריאל שאיוק", rating: 73 },         { name: "צ'אק אידסון", rating: 83 }, { name: "אושה בריסט", rating: 83 }, { name: "עוז בלייזר", rating: 74 }, { name: "מייקל רול", rating: 79 }, { name: "דארן היליארד", rating: 78 }, { name: "ניק קיינר מדלי", rating: 76 }
    ],
    PF: [
        { name: "דייוויד בלו", rating: 88 }, { name: "ג'ייק כהן", rating: 80 }, { name: "בריאן רנדל", rating: 87 }, { name: "ג'ו אלכסנדר", rating: 75 }, { name: "דראגן בנדר", rating: 71 }, { name: "ויקטור ראד", rating: 73 }, { name: "קווינסי מילר", rating: 78 }, { name: "ג'ונה בולדן", rating: 79 }, { name: "ג'וני אובראיינט", rating: 80 }, { name: "אנג'לו קלויארו", rating: 82 }, { name: "עומרי כספי", rating: 85 }, { name: "קווינסי אייסי", rating: 82 }, { name: "טי.ג'יי. קליין", rating: 72 }, { name: "דריק ויליאמס", rating: 82 }, { name: "אלכס פוית'רס", rating: 81 }, { name: "ג'רל מרטין", rating: 78 }, { name: "סולימאן בריימו", rating: 71 }, { name: "ג'יימס ווב", rating: 75 }, { name: "ג'יילן הורד", rating: 88 }, { name: "וויל ריימן", rating: 77 },
        { name: "טי ג'יי ליף", rating: 81 }, { name: "ריצ'רד הנדריקס", rating: 85 }, { name: "איתי שגב", rating: 72 }, { name: "רומן סורקין", rating: 87 }
    ],
    C: [
        { name: "שון ג'יימס", rating: 84 }, { name: "סופוקליס שחורציאניטיס", rating: 93 }, { name: "אלכס טיוס", rating: 87 }, { name: "בן אלטיט", rating: 69 }, { name: "ארינזה אונואקו", rating: 79 }, { name: "קולטון אייברסון", rating: 72 }, { name: "מאיק צירבס", rating: 74 }, { name: "נמרוד לוי", rating: 68 }, { name: "טאריק בלאק", rating: 86 }, { name: "אותלו האנטר", rating: 84 }, { name: "ג'יילן ריינולדס", rating: 79 }, { name: "אמארה סטודמאייר", rating: 86 }, { name: "אנטה ז'יז'יץ'", rating: 81 }, { name: "מת'יאס לסור", rating: 82 }, { name: "ג'וש ניבו", rating: 87 }, { name: "חסיאל ריברו", rating: 84 }, { name: "ווניין גבריאל", rating: 73 },
        { name: "יניב גרין", rating: 77 }, { name: "עידן זלמנסון", rating: 73 }, { name: "זאק הנקינס", rating: 74 }, { name: "מרסיו סנטוס", rating: 76 }
    ]
};

const rawPlayersDataEuroleague = {
    PG: [
        { name: "Mike James", rating: 89 }, { name: "Codi Miller-McIntyre", rating: 83 }, { name: "Jean Montero", rating: 83 }, { name: "Scottie Wilbekin", rating: 87 },
        { name: "Shane Larkin", rating: 87 }, { name: "Wade Baldwin IV", rating: 86 }, { name: "Facundo Campazzo", rating: 87 }, { name: "Carsen Edwards", rating: 81 },
        { name: "Trent Forrest", rating: 79 }, { name: "Vasilije Micić", rating: 81 }, { name: "Kostas Sloukas", rating: 78 }, { name: "Jimmy Clark III", rating: 81 },
        { name: "Gabriel Lundberg", rating: 81 }, { name: "Matthew Strazel", rating: 75 }, { name: "Théo Maledon", rating: 77 }, { name: "TJ Shorts II", rating: 79 },
        { name: "Patty Mills", rating: 78 }, { name: "Sergio Llull", rating: 88 }, { name: "Tamir Blatt", rating: 77 },
        { name: "Yam Madar", rating: 80 }, { name: "Amit Ebo", rating: 63 },
        { name: "Šarūnas Jasikevičius", rating: 92 },
        { name: "Oded Kattash", rating: 91 },
        { name: "Sylvain Francisco", rating: 85 },
        { name: "Justin Robinson", rating: 83 },
        { name: "Nando de Colo", rating: 89 },
        { name: "Tyrese Rice", rating: 86 },
        { name: "Tomáš Satoranský", rating: 77 },
        { name: "Tyler Ennis", rating: 71 },
        { name: "Yiftach Ziv", rating: 64 },
        { name: "Vassilis Spanoulis", rating: 92 },
        { name: "Luka Dončić", rating: 94 },
        { name: "Sergio Rodríguez", rating: 88 },
        { name: "Jeremy Pargo", rating: 87 },
        { name: "Miloš Teodosić", rating: 88 }
    ],
    SG: [
        { name: "Dzanan Musa", rating: 83 }, { name: "Nadir Hifi", rating: 87 }, { name: "Elijah Bryant", rating: 85 }, { name: "Kendrick Nunn", rating: 88 },
        { name: "Talen Horton-Tucker", rating: 82 }, { name: "Markus Howard", rating: 80 }, { name: "Kevin Punter", rating: 84 }, { name: "Tyler Dorsey", rating: 86 },
        { name: "Andreas Obst", rating: 86 }, { name: "PJ Dozier", rating: 80 }, { name: "Élie Okobo", rating: 82 },
        { name: "Antonio Blakeney", rating: 82 }, { name: "Brancou Badio", rating: 81 }, { name: "Jordan Loyd", rating: 80 },
        { name: "Marko Gudurić", rating: 81 }, { name: "Isaïa Cordinier", rating: 80 }, { name: "Devon Hall", rating: 75 }, { name: "Panagiotis Kalaitzakis", rating: 73 },
        { name: "Miki Berkovich", rating: 90 }, { name: "Keaton Wallace", rating: 78 }, { name: "John DiBartolomeo", rating: 73 }, 
        { name: "Doron Jamchi", rating: 86 },
        { name: "Tal Brody", rating: 85 },
        { name: "Anthony Parker", rating: 93 },
        { name: "Kadeem Carrington", rating: 76 },
        { name: "Guy Palatin", rating: 66 },
        { name: "Bar Timor", rating: 65 },
        { name: "Juan Carlos Navarro", rating: 91 },
        { name: "Tal Burstein", rating: 80 },
        { name: "Doron Perkins", rating: 85 }
    ],
    SF: [
        { name: "Dwayne Bacon", rating: 85 }, { name: "Shavon Shields", rating: 84 }, { name: "Evan Fournier", rating: 81 }, { name: "Oshae Brissett", rating: 79 }, { name: "Isaac Bonga", rating: 79 },
        { name: "Jaron Blossomgame", rating: 80 }, { name: "Collin Malcolm", rating: 75 }, { name: "Bonzie Colson", rating: 80 }, { name: "Braxton Key", rating: 70 },
        { name: "T.J. Warren", rating: 77 }, { name: "Amir Coffey", rating: 80 }, { name: "Tyrese Martin", rating: 76 },
        { name: "Gur Lavi", rating: 69 },
        { name: "Nadav Henefeld", rating: 85 },
        { name: "Jordan Nwora", rating: 86 },
        { name: "Devin Smith", rating: 86 },
        { name: "Oz Blayzer", rating: 67 },
        { name: "Guy Pnini", rating: 82 },
        { name: "Andrei Kirilenko", rating: 90 }, { name: "Cedi Osman", rating: 79 }
    ],
    PF: [
        { name: "Aleksandar Vezenkov", rating: 89 }, { name: "Jaylen Hoard", rating: 83 }, { name: "Nikola Kalinić", rating: 87 }, { name: "Nigel Hayes-Davis", rating: 86 }, { name: "Guerschon Yabusele", rating: 86 },
        { name: "Tornike Shengelia", rating: 84 }, { name: "Zach LeDay", rating: 84 }, { name: "Dario Šarić", rating: 82 }, { name: "T. J. Leaf", rating: 78 },
        { name: "Ercan Osmani", rating: 75 }, { name: "Juancho Hernangómez", rating: 79 }, { name: "Dāvis Bertāns", rating: 69 }, { name: "Jae Crowder", rating: 80 },
        { name: "Kostas Papanikolaou", rating: 74 }, { name: "Chuma Okeke", rating: 77 }, { name: "Chris Duarte", rating: 76 }, { name: "Jacob Toppin", rating: 75 },
        { name: "Dinos Mitoglou", rating: 75 }, { name: "Will Rayman", rating: 70 },
        { name: "Aulcie Perry", rating: 90 },
        { name: "Kevin Magee", rating: 89 },
        { name: "Chima Moneke", rating: 84 },
        { name: "David Bluthenthal", rating: 85 },
        { name: "Tomer Ginat", rating: 70 },
        { name: "Ish Wainright", rating: 76 },
        { name: "Itay Segev", rating: 63 }
    ],
    C: [
        { name: "Mfiondu Kabengele", rating: 87 }, { name: "Mathias Lessort", rating: 85 }, { name: "Jonas Valančiūnas", rating: 84 }, { name: "Daniel Oturu", rating: 84 },
        { name: "Roman Sorkin", rating: 81 }, { name: "Nikola Milutinov", rating: 80 }, { name: "Edy Tavares", rating: 89 }, { name: "Josh Nebo", rating: 83 },
        { name: "Daniel Theis", rating: 80 }, { name: "Sam Hunter", rating: 71 }, { name: "Tyrique Jones", rating: 79 }, { name: "Mbaye Ndiaye", rating: 79 },
        { name: "Bruno Fernando", rating: 80 }, { name: "Georgios Papagiannis", rating: 72 }, { name: "Ante Žižić", rating: 73 }, { name: "Devin Booker", rating: 78 },
        { name: "Mustapha Fall", rating: 70 }, { name: "Wenyen Gabriel", rating: 71 }, { name: "Tai Odiase", rating: 75 }, { name: "Armando Bacot Jr.", rating: 68 }, { name: "Donta Hall", rating: 76 },
        { name: "Nikola Vujčić", rating: 92 }, { name: "Kai Jones", rating: 78 },
        { name: "Tanhum Cohen-Mintz", rating: 80 },  { name: "Márcio Santos", rating: 73 },
        { name: "Sofoklis Schortsanitis", rating: 89 },
        { name: "Jan Veselý", rating: 86 },
        { name: "Kyle Hines", rating: 87 },
        { name: "Ante Tomić", rating: 86 }
    ]
};

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
    leaderboard: leaderboard 
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
            gameState.currentPack = selectedPack || 'nba'; // <-- מעדכן את החבילה בסטייט
            gameState.auctionIndex = 0;
            initializeGamePlayers(selectedPack || 'nba');
            startNextAuction();
        }
    });

    socket.on('declareWinner', (winnerName) => {
        if (!leaderboard[winnerName]) {
            leaderboard[winnerName] = 0;
        }
        leaderboard[winnerName] += 1;
        writeJsonSafe(leaderboardPath, leaderboard);

        resetGameToLobby();
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
    console.log(`Server is running on port ${PORT}`);
    console.log(`Data directory: ${dataDir}`);
});