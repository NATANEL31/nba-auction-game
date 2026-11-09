'use strict';
/**
 * שאיבת סטטיסטיקות אוטומטית ממאגרים ציבוריים.
 *
 *  - NBA        : ESPN (ממוצעים למשחק, העונה הנוכחית; אם אין מספיק משחקים — הקודמת)
 *  - יורוליג     : ה-API הרשמי של היורוליג (העונה הנוכחית, אחרת הקודמת)
 *  - מכבי       : היורוליג, כל העונות — העונה הטובה ביותר (לפי PIR) במדי מכבי תל אביב
 *
 * שמות NBA ומכבי ברשימות הם בעברית, לכן מתרגמים לאנגלית דרך קישורי השפה
 * של ויקיפדיה העברית. התרגומים נשמרים ב-nameMap.json כדי לא לשאול שוב.
 *
 * הפלט לכל שחקן: { pts, reb, ast, stl, blk, gp, season, label }
 */

const fs = require('fs');
const path = require('path');

const UA = 'nba-auction-game/1.0 (friends game; stats fetch)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 5) {
    let lastErr;
    for (let i = 0; i < tries; i++) {
        try {
            const res = await fetch(url, {
                headers: { 'user-agent': UA, accept: 'application/json' },
                signal: AbortSignal.timeout(25000)
            });
            if (res.status === 429) { await sleep(4000 * (i + 1)); throw new Error('HTTP 429'); }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            lastErr = err;
            await sleep(700 * (i + 1));
        }
    }
    throw new Error(`${url.slice(0, 70)}… -> ${lastErr && lastErr.message}`);
}

// ---------- name matching ----------

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);

function tokens(name) {
    return String(name || '')
        .replace(/[łŁ]/g, 'l').replace(/[đĐ]/g, 'd').replace(/[øØ]/g, 'o')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/(.*?)/g, ' ')
        .replace(/[.'’`]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .split(' ')
        .filter((t) => t && !SUFFIXES.has(t));
}

const normKey = (name) => tokens(name).join(' ');
const setKey = (name) => tokens(name).sort().join(' ');

class Index {
    constructor() { this.exact = new Map(); this.sets = new Map(); }
    add(name, value) {
        this.exact.set(normKey(name), value);
        this.sets.set(setKey(name), value);
    }
    find(name) {
        if (!name) return null;
        return this.exact.get(normKey(name)) || this.sets.get(setKey(name)) || null;
    }
}

// "LAUVERGNE, JOFFREY" -> "JOFFREY LAUVERGNE"
function flipEuroName(name) {
    const i = name.indexOf(',');
    return i === -1 ? name : `${name.slice(i + 1).trim()} ${name.slice(0, i).trim()}`;
}

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

// ---------- Hebrew -> English (Hebrew Wikipedia language links) ----------

async function wikiLookup(titles) {
    const out = {};
    for (let i = 0; i < titles.length; i += 20) {
        const batch = titles.slice(i, i + 20);
        const url =
            'https://he.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=langlinks&lllang=en&lllimit=500&titles=' +
            encodeURIComponent(batch.join('|'));
        try {
            const j = await getJson(url);
            const q = j.query || {};
            const toNorm = {};
            (q.normalized || []).forEach((n) => { toNorm[n.from] = n.to; });
            const toRedir = {};
            (q.redirects || []).forEach((r) => { toRedir[r.from] = r.to; });
            const byTitle = {};
            Object.values(q.pages || {}).forEach((p) => {
                if (p.langlinks && p.langlinks[0]) byTitle[p.title] = p.langlinks[0]['*'];
            });
            for (const t of batch) {
                let final = toNorm[t] || t;
                final = toRedir[final] || final;
                if (byTitle[final]) out[t] = byTitle[final];
            }
        } catch (err) {
            console.warn('[stats] wiki batch failed:', err.message);
        }
        await sleep(500);
    }
    return out;
}

/** מחזיר { עברית: אנגלית|null }. מבקש מויקיפדיה רק שמות שאין במטמון. */
async function resolveEnglishNames(hebrewNames, cache, retryNulls = false) {
    const missing = hebrewNames.filter(
        (n) => (!(n in cache) || (retryNulls && cache[n] === null)) && /[֐-׿]/.test(n)
    );
    if (missing.length) {
        const first = await wikiLookup(missing);
        for (const n of missing) if (first[n]) cache[n] = first[n];

        // ניסיון שני: דף עם סיומת הבהרה
        const retry = missing.filter((n) => !(n in cache));
        if (retry.length) {
            const second = await wikiLookup(retry.map((n) => `${n} (כדורסלן)`));
            for (const n of retry) cache[n] = second[`${n} (כדורסלן)`] || null;
        }
    }
    return cache;
}

// ---------- NBA (ESPN) ----------

function espnSeasonFor(date = new Date()) {
    // ESPN מסמן עונה לפי שנת הסיום: 2025-26 => 2026
    return date.getMonth() >= 9 ? date.getFullYear() + 1 : date.getFullYear();
}

async function fetchEspnSeason(season) {
    const players = [];
    let page = 1;
    let pages = 1;
    do {
        const url =
            'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete' +
            `?region=us&lang=en&contentorigin=espn&isqualified=false&limit=100&page=${page}&season=${season}&seasontype=2`;
        const j = await getJson(url);
        pages = (j.pagination && j.pagination.pages) || 1;

        const idx = {};
        (j.categories || []).forEach((c) => {
            idx[c.name] = Object.fromEntries(c.names.map((n, i) => [n, i]));
        });
        const val = (a, cat, key) => {
            const c = (a.categories || []).find((x) => x.name === cat);
            const i = idx[cat] && idx[cat][key];
            return c && i !== undefined ? c.values[i] : 0;
        };

        for (const a of j.athletes || []) {
            players.push({
                name: a.athlete.displayName,
                gp: val(a, 'general', 'gamesPlayed'),
                pts: round1(val(a, 'offensive', 'avgPoints')),
                reb: round1(val(a, 'general', 'avgRebounds')),
                ast: round1(val(a, 'offensive', 'avgAssists')),
                stl: round1(val(a, 'defensive', 'avgSteals')),
                blk: round1(val(a, 'defensive', 'avgBlocks'))
            });
        }
        page++;
    } while (page <= pages);
    return players;
}

const seasonLabel = (endYear) => `${endYear - 1}-${String(endYear).slice(2)}`;

async function fetchNbaIndex(minGames = 8) {
    const cur = espnSeasonFor();
    const result = new Index();
    const seen = new Map(); // normKey -> { season, p }

    for (const season of [cur - 1, cur]) { // קודמת קודם, נוכחית דורסת אם יש מספיק משחקים
        let list = [];
        try { list = await fetchEspnSeason(season); } catch (err) {
            console.warn(`[stats] ESPN season ${season} failed:`, err.message);
        }
        for (const p of list) {
            const key = normKey(p.name);
            const prev = seen.get(key);
            const isCurrent = season === cur;
            if (!prev || (isCurrent && p.gp >= minGames)) {
                seen.set(key, { season, p });
            }
        }
    }

    for (const { season, p } of seen.values()) {
        result.add(p.name, {
            pts: p.pts, reb: p.reb, ast: p.ast, stl: p.stl, blk: p.blk, gp: p.gp,
            season: seasonLabel(season),
            label: 'עונה אחרונה'
        });
    }
    return result;
}

// ---------- Euroleague ----------

function euroSeasonFor(date = new Date()) {
    return date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
}

async function fetchEuroSeason(startYear) {
    const url =
        'https://api-live.euroleague.net/v3/competitions/E/statistics/players/traditional' +
        `?SeasonMode=Single&SeasonCode=E${startYear}&limit=1000`;
    const j = await getJson(url);
    return (j.players || []).map((r) => ({
        name: flipEuroName(r.player.name),
        team: r.player.team && r.player.team.code,
        gp: r.gamesPlayed,
        pir: r.pir,
        pts: round1(r.pointsScored),
        reb: round1(r.totalRebounds),
        ast: round1(r.assists),
        stl: round1(r.steals),
        blk: round1(r.blocks)
    }));
}

const euroLabel = (y) => `${y}-${String(y + 1).slice(2)}`;

async function fetchEuroleagueIndex(minGames = 5) {
    const cur = euroSeasonFor();
    const seen = new Map();
    for (const y of [cur - 1, cur]) {
        let list = [];
        try { list = await fetchEuroSeason(y); } catch (err) {
            console.warn(`[stats] Euroleague E${y} failed:`, err.message);
        }
        for (const p of list) {
            const key = normKey(p.name);
            const prev = seen.get(key);
            if (!prev || (y === cur && p.gp >= minGames)) seen.set(key, { y, p });
        }
    }
    const idx = new Index();
    for (const { y, p } of seen.values()) {
        idx.add(p.name, {
            pts: p.pts, reb: p.reb, ast: p.ast, stl: p.stl, blk: p.blk, gp: p.gp,
            season: euroLabel(y), label: 'עונה אחרונה'
        });
    }
    return idx;
}

// ---------- Maccabi: best Euroleague season in a Maccabi shirt ----------

async function fetchMaccabiBestIndex(fromYear = 2007, minGames = 10) {
    const cur = euroSeasonFor();
    const best = new Map();
    for (let y = fromYear; y <= cur; y++) {
        let list = [];
        try { list = await fetchEuroSeason(y); } catch { continue; }
        for (const p of list) {
            if (p.team !== 'TEL' || p.gp < minGames) continue;
            const key = normKey(p.name);
            const prev = best.get(key);
            if (!prev || p.pir > prev.p.pir) best.set(key, { y, p });
        }
    }
    const idx = new Index();
    for (const { y, p } of best.values()) {
        idx.add(p.name, {
            pts: p.pts, reb: p.reb, ast: p.ast, stl: p.stl, blk: p.blk, gp: p.gp,
            season: euroLabel(y),
            label: 'עונת שיא במכבי'
        });
    }
    return idx;
}

// ---------- orchestration ----------

const flatNames = (raw) => Object.values(raw).flat().map((p) => p.name);

function matchPack(names, index, toEnglish) {
    const stats = {};
    const unmatched = [];
    for (const name of names) {
        const english = toEnglish ? toEnglish(name) : name;
        const hit = index.find(english);
        if (hit) stats[name] = hit; else unmatched.push(name);
    }
    return { stats, unmatched };
}

/**
 * @param {{rawNba:object, rawMaccabi:object, rawEuroleague:object}} raw
 * @param {string} nameMapPath  קובץ מטמון תרגום שמות
 * @returns {Promise<{data:{nba:object,euroleague:object,maccabi:object}, report:object}>}
 */
async function fetchAllStats(raw, nameMapPath, { retryNulls = false, overridesPath } = {}) {
    const cache = (() => {
        try { return JSON.parse(fs.readFileSync(nameMapPath, 'utf8')); } catch { return {}; }
    })();

    const nbaNames = flatNames(raw.rawNba);
    const macNames = flatNames(raw.rawMaccabi);
    const euroNames = flatNames(raw.rawEuroleague);

    const [nbaIdx, euroIdx, macIdx] = await Promise.all([
        fetchNbaIndex(),
        fetchEuroleagueIndex(),
        fetchMaccabiBestIndex(),
        resolveEnglishNames([...nbaNames, ...macNames], cache, retryNulls)
    ]);

    try {
        fs.mkdirSync(path.dirname(nameMapPath), { recursive: true });
        fs.writeFileSync(nameMapPath, JSON.stringify(cache, null, 1));
    } catch (err) {
        console.warn('[stats] could not save name map:', err.message);
    }

    const overrides = (() => {
        try { return JSON.parse(fs.readFileSync(overridesPath || path.join(path.dirname(nameMapPath), 'nameOverrides.json'), 'utf8')); } catch { return {}; }
    })();
    const en = (he) => overrides[he] || cache[he] || null;
    const nba = matchPack(nbaNames, nbaIdx, en);
    const mac = matchPack(macNames, macIdx, en);
    const euro = matchPack(euroNames, euroIdx, null);

    return {
        data: { nba: nba.stats, maccabi: mac.stats, euroleague: euro.stats },
        report: {
            nba: { total: nbaNames.length, matched: Object.keys(nba.stats).length, unmatched: nba.unmatched },
            maccabi: { total: macNames.length, matched: Object.keys(mac.stats).length, unmatched: mac.unmatched },
            euroleague: { total: euroNames.length, matched: Object.keys(euro.stats).length, unmatched: euro.unmatched }
        }
    };
}

module.exports = { fetchAllStats, normKey, setKey };
