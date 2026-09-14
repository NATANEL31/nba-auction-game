# מוזיקת רקע

הקבצים כאן נטענים אוטומטית על ידי
[`client/src/audio/musicManager.js`](../../src/audio/musicManager.js).

## מה מתנגן איפה

| קובץ | מתנגן ב־ | השיר |
|---|---|---|
| `game-maccabi.mp3` | משחק בחבילת מכבי | I Feel Devotion — EuroLeague Theme, Full Version |
| `game-euroleague.mp3` | משחק בחבילת יורוליג | I Feel Devotion — Remix |
| `nba-1.mp3` | פלייליסט NBA | DJ Khaled — We Takin Over |
| `nba-2.mp3` | פלייליסט NBA | DJ Premier — Bum Bum Bum |
| `nba-3.mp3` | פלייליסט NBA | Nas — Made You Look |
| `nba-4.mp3` | פלייליסט NBA | Gang Starr — Same Team, No Games |
| `nba-5.mp3` | פלייליסט NBA | DJ Premier — Hold The City Down |

## איך הפלייליסט מתנהג

חמשת טראקי ה-NBA משמשים **גם** במסך ההתחברות, **גם** בלובי, **וגם**
במשחק בחבילת NBA:

- הסדר מעורבב (Fisher-Yates), שיר אחרי שיר
- כשנגמר הסבב הרשימה מתערבבת מחדש, ואותו שיר לא חוזר פעמיים ברצף
- מעבר מהתחברות ללובי **לא קוטע את השיר** — הוא ממשיך לנגן
- כל כניסה למשחק פותחת בשיר אקראי טרי

מכבי ויורוליג הם טראק בודד בלופ.

## להחליף או להוסיף שיר

להחלפה: פשוט דרסו את הקובץ באותו שם.
להוספה לפלייליסט: הוסיפו `nba-6.mp3` והוסיפו שורה ל-`NBA_PLAYLIST`
ב-`musicManager.js`.

קובץ חסר פשוט מדולג — שום דבר לא נשבר.

## אחרי כל שינוי

```
npm run build
```

מתיקיית השורש. `client/dist` אינו נשמר ב-git, אז חייבים build לפני הרצה.

## זכויות יוצרים

הקבצים כאן הם הקלטות מסחריות (EuroLeague / NBA 2K16). מתאים לשימוש
פרטי. אם המשחק עולה לאוויר ציבורית — שווה להחליף לחלופות ברישיון חופשי
(Pixabay Music, YouTube Audio Library, Incompetech).
