'use strict';
// שאיבה ידנית: node server/scripts/fetchStats.js  (או: npm run stats)
// כותב ל-server/stats/ — הקבצים האלה נארזים עם האפליקציה כגיבוי ראשוני.
const fs = require('fs');
const path = require('path');
const { fetchAllStats } = require('../statsFetcher');
const { rawPlayersDataNBA, rawPlayersDataMaccabi, rawPlayersDataEuroleague } = require('../playersData');

(async () => {
    const dir = path.join(__dirname, '..', 'stats');
    fs.mkdirSync(dir, { recursive: true });
    const { data, report } = await fetchAllStats(
        { rawNba: rawPlayersDataNBA, rawMaccabi: rawPlayersDataMaccabi, rawEuroleague: rawPlayersDataEuroleague },
        path.join(dir, 'nameMap.json'),
        { retryNulls: true }
    );
    for (const pack of Object.keys(data)) {
        fs.writeFileSync(path.join(dir, `${pack}.json`), JSON.stringify(data[pack], null, 1));
        const r = report[pack];
        console.log(`${pack}: ${r.matched}/${r.total} matched`);
    }
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 1));
    console.log('wrote', dir);
})().catch((e) => { console.error(e); process.exit(1); });
