const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');
const champions=JSON.parse(fs.readFileSync(path.join(root,'champion-catalog.json'),'utf8'));
const positions=JSON.parse(fs.readFileSync(path.join(root,'champion-lanes.json'),'utf8')).positions;
const stats=JSON.parse(fs.readFileSync(path.join(root,'champion-stats.json'),'utf8'));
const patch=JSON.parse(fs.readFileSync(path.join(root,'current-patch.json'),'utf8')).current.version;
const snapshot={schema:stats.schema,region:stats.region,patch,dates:stats.dates,rows:stats.rows.map(({champion,rank,lane,tier,positionInLane})=>({champion,rank,lane,tier,positionInLane}))};
fs.writeFileSync(path.join(root,'tier-catalog.js'),'window.RIFT_TIER_CHAMPIONS = '+JSON.stringify(champions.map(c=>({id:c.id,name:c.name,lanes:positions[c.id]||[],icon:'assets/champions/faces/'+c.id+'.webp'})))+';\nwindow.RIFT_TIER_SNAPSHOT = '+JSON.stringify(snapshot)+';\n');
console.log('Tier catalog: '+champions.length+' champions');
