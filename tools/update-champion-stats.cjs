// Public Tencent CN ranked snapshots. No player accounts or credentials are used.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'champion-stats.json');
const HISTORY = path.join(ROOT, 'champion-stats-history.json');
const { mergeHistory } = require('./stats-history.cjs');
const SOURCE = 'https://lolm.qq.com/act/a20220818raider/index.html';
const ENDPOINT = 'https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2';
const HEROES = 'https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js';
const RANKS = { '1': 'Алмаз+', '2': 'Мастер+', '3': 'Претендент', '4': 'CN: 峡谷之巅' };
const LANES = { '1': 'mid', '2': 'baron', '3': 'dragon', '4': 'support', '5': 'jungle' };
const normalize = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
function transform(rankPayload, heroPayload, championIds, now = new Date()) {
  if (rankPayload.result !== 0 || !rankPayload.data || !heroPayload.heroList) throw Error('Tencent: unexpected response schema');
  const local = new Map(championIds.map(id => [normalize(id), id]));
  const aliases = { Nunu: 'nunu-and-willump', MonkeyKing: 'wukong' };
  const mapped = new Map();
  for (const [id, hero] of Object.entries(heroPayload.heroList)) {
    const english = hero.poster?.match(/\/([^/]+)_\d+\.[a-z]+$/i)?.[1];
    const slug = english && (aliases[english] || local.get(normalize(english)));
    if (slug && championIds.includes(slug)) mapped.set(id, slug);
  }
  const rows = [], dates = new Set(), seen = new Set();
  for (const rank of Object.keys(RANKS)) {
    const lanes = rankPayload.data[rank];
    if (!lanes || typeof lanes !== 'object') throw Error('Missing rank ' + rank);
    for (const [position, lane] of Object.entries(LANES)) {
      const sourceRows = lanes[position];
      if (!Array.isArray(sourceRows) || !sourceRows.length) throw Error('Missing lane ' + position);
      for (const row of sourceRows) {
        const champion = mapped.get(String(row.hero_id));
        if (!champion) continue; // CN may contain champions not yet in our catalog.
        if (String(row.position) !== position) throw Error('Inconsistent lane');
        const values = ['win_rate_percent', 'appear_rate_percent', 'forbid_rate_percent'].map(key => {
          if (row[key] === null || row[key] === undefined || row[key] === '') throw Error('Missing percentage');
          const value = Number(row[key]);
          if (!Number.isFinite(value) || value < 0 || value > 100) throw Error('Invalid percentage');
          return value;
        });
        const rawDate = String(row.dtstatdate);
        if (!/^\d{8}$/.test(rawDate)) throw Error('Invalid source date');
        const date = rawDate.slice(0,4) + '-' + rawDate.slice(4,6) + '-' + rawDate.slice(6,8);
        const parsed = new Date(date + 'T00:00:00Z');
        if (!Number.isFinite(+parsed) || parsed.toISOString().slice(0,10) !== date || +parsed > +now + 86400000) throw Error('Invalid source date');
        const key = champion + ':' + rank + ':' + lane;
        if (seen.has(key)) throw Error('Duplicate champion/rank/lane');
        seen.add(key); dates.add(date);
        rows.push({ champion, rank, lane, win: values[0], pick: values[1], ban: values[2], date });
      }
    }
  }
  if (rows.length < 300 || new Set(rows.map(r => r.champion)).size < 100) throw Error('Incomplete snapshot; retaining previous data');
  rows.sort((a,b) => (a.champion + a.rank + a.lane).localeCompare(b.champion + b.rank + b.lane));
  return { schema: 1, region: 'CN', source: SOURCE, endpoint: ENDPOINT, fetchedAt: now.toISOString(),
    dates: [...dates].sort(), ranks: RANKS, rows };
}
let pending;
async function update({ maxAgeMs = 0 } = {}) {
  if (pending) return pending;
  pending = (async () => {
    if (maxAgeMs && fs.existsSync(TARGET)) {
      try { const age = Date.now() - Date.parse(JSON.parse(fs.readFileSync(TARGET, 'utf8')).fetchedAt);
        if (age >= 0 && age < maxAgeMs) return { skipped: true }; } catch {}
    }
    const get = async url => {
      let last;
      for (let attempt = 0; attempt < 3; attempt++) {
        try { const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
          if (!res.ok) throw Error('Tencent HTTP ' + res.status);
          return await res.json();
        } catch (error) { last = error; }
      }
      throw last;
    };
    const [ranks, heroes] = await Promise.all([get(ENDPOINT), get(HEROES)]);
    const ids = fs.readdirSync(ROOT).filter(file => file.endsWith('.html') && fs.readFileSync(path.join(ROOT,file), 'utf8').includes('class="character-profile"')).map(file => file.slice(0,-5));
    const data = transform(ranks, heroes, ids);
    // Do not let a CDN rollback replace a newer known snapshot.
    let old;
    if (fs.existsSync(TARGET)) {
      try { old = JSON.parse(fs.readFileSync(TARGET, 'utf8')); } catch {}
      if (old?.dates?.length && data.dates.at(-1) < old.dates.at(-1)) throw Error('Source date moved backwards; retaining previous data');
    }
    const history = fs.existsSync(HISTORY) ? JSON.parse(fs.readFileSync(HISTORY, 'utf8')) : null;
    const mergedHistory = mergeHistory(history, [old, data]);
    fs.writeFileSync(HISTORY + '.tmp', JSON.stringify(mergedHistory) + '\n');
    fs.renameSync(HISTORY + '.tmp', HISTORY);
    const temporary = TARGET + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(data) + '\n');
    fs.renameSync(temporary, TARGET);
    console.log('CN stats updated: ' + new Set(data.rows.map(r => r.champion)).size + ' champions, ' + data.rows.length + ' rows, source dates ' + data.dates.join(', '));
    return data;
  })();
  try { return await pending; } finally { pending = null; }
}
if (require.main === module) update().catch(error => { console.error('Stats update failed; last good snapshot kept:', error.message); process.exitCode = 1; });
module.exports = { transform, update };
