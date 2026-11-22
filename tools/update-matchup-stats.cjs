// Public RiftGG CN matchup snapshots. Source dates are never replaced by fetch dates.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..'),DIR=path.join(ROOT,'assets','matchups');
const RANKS={'1':'Алмаз+','2':'Мастер+','3':'Претендент','4':'CN: 峡谷之巅'};
// RiftGG uses its own lane numbering (not the Tencent ranking endpoint).
const LANES={'1':'mid','2':'baron','3':'dragon','4':'jungle','5':'support'};
function extract(html){
  const flight=[...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)].map(m=>JSON.parse(m[1])).join('');
  const marker='"stats":{"matchups":',at=flight.indexOf(marker);
  if(at<0)throw Error('Matchup data missing');
  const start=flight.indexOf('{',at);let depth=0,quoted=false,escape=false;
  for(let i=start;i<flight.length;i++){const c=flight[i];if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0)return JSON.parse(flight.slice(start,i+1)).matchups;}
  throw Error('Incomplete source JSON');
}
function transform(champion,payload,source,ids,now=new Date()){
  if(!Array.isArray(payload))throw Error('Invalid matchup array');
  const normalize=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
  const mapped=new Map(ids.map(id=>[normalize(id),id]));mapped.set('nunu','nunu-and-willump');mapped.set('monkeyking','wukong');
  const rows=[],seen=new Set();
  for(const scope of payload){const rank=String(scope.rankLevel),lane=LANES[scope.lane],date=String(scope.dataDate).slice(0,10);
    if(!RANKS[rank]||!lane||!Array.isArray(scope.counters)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||Date.parse(date)>+now+86400000)throw Error('Invalid source scope');
    for(const counter of scope.counters){const opponent=mapped.get(normalize(String(counter.heroSlug))),win=Number(counter.metrics?.winRate);
      if(!opponent||opponent===champion)continue;
      if(counter.metrics?.winRate==null||!Number.isFinite(win)||win<0||win>1)throw Error('Invalid matchup win rate');
      const key=rank+':'+lane+':'+opponent;if(seen.has(key))throw Error('Duplicate matchup');seen.add(key);
      rows.push({opponent,rank,lane,date,win:Math.round(win*1000000)/10000});
    }
  }
  rows.sort((a,b)=>(a.rank+':'+a.lane+':'+a.opponent).localeCompare(b.rank+':'+b.lane+':'+b.opponent));
  return {schema:1,champion,region:'CN',source,rows};
}
function atomic(file,data){const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(data)+'\n');fs.renameSync(temp,file);}
function read(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
async function get(url){const response=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'RiftAtlas-MatchupUpdater/1.0 (+https://fuyugakuru.github.io/rift-atlas/)'}});if(!response.ok)throw Error('HTTP '+response.status);const text=await response.text();if(text.length>12000000)throw Error('Response too large');return text;}
let pending;
async function update({maxAgeMs=0}={}){
  if(pending)return pending;
  pending=(async()=>{
    fs.mkdirSync(DIR,{recursive:true});const oldIndex=read(path.join(DIR,'index.json')),age=Date.now()-Date.parse(oldIndex?.checkedAt);
    if(maxAgeMs&&age>=0&&age<maxAgeMs&&oldIndex?.complete)return {skipped:true};
    const box={window:{}};vm.runInNewContext(fs.readFileSync(path.join(ROOT,'matchups-data.js'),'utf8'),box,{timeout:1000});
    const ids=box.window.RIFT_MATCHUPS.map(c=>c.id),catalog=await get('https://www.riftgg.app/en/champions');
    const catalogFlight=[...catalog.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)].map(m=>JSON.parse(m[1])).join('');
    const available=new Set([...catalog.matchAll(/href="\/en\/champions\/([a-z0-9-]+)"/g),...catalogFlight.matchAll(/"slug":"([a-z0-9-]+)"/g)].map(m=>m[1]));
    if(available.size<50)throw Error('Source catalog incomplete');
    const aliases={'nunu-and-willump':'nunu'},queue=ids.map(id=>({id,slug:available.has(id)?id:aliases[id]})).filter(c=>c.slug&&available.has(c.slug));
    let cursor=0,success=0,changed=0;const failures=[];
    async function worker(){while(cursor<queue.length){const {id,slug}=queue[cursor++],file=path.join(DIR,id+'.json');try{
      const source='https://www.riftgg.app/en/champions/'+slug+'/cn-stats',data=transform(id,extract(await get(source)),source,ids),old=read(file);
      if(!data.rows.length){success++;continue;}
      if(old?.rows){const dates=new Map();for(const r of data.rows){const key=r.rank+':'+r.lane;dates.set(key,[dates.get(key)||'',r.date].sort().at(-1));}for(const r of old.rows){const date=dates.get(r.rank+':'+r.lane);if(!date||date<r.date)throw Error('Source scope missing or moved backwards');}}
      if(JSON.stringify(old)!==JSON.stringify(data)){atomic(file,data);changed++;}success++;
    }catch(error){failures.push(id+': '+error.message);console.warn('Retained last matchup snapshot for '+id+': '+error.message);}}}
    await Promise.all([worker(),worker(),worker()]);
    if(success<Math.max(1,queue.length*.6))throw Error('Too many failed source pages; last index retained');
    const entries={};for(const id of ids){const data=read(path.join(DIR,id+'.json'));if(data?.schema===1&&data.rows?.length)entries[id]={rows:data.rows.length,dates:[...new Set(data.rows.map(r=>r.date))].sort()};}
    const index={schema:1,source:'RiftGG',region:'CN',checkedAt:new Date().toISOString(),complete:failures.length===0,failures,champions:entries};atomic(path.join(DIR,'index.json'),index);
    console.log('Matchups: '+Object.keys(entries).length+' champions, '+Object.values(entries).reduce((n,c)=>n+c.rows,0)+' rows, '+changed+' snapshots changed, '+failures.length+' failures');return index;
  })();try{return await pending;}finally{pending=null;}
}
if(require.main===module)update().catch(error=>{console.error('Matchup refresh failed; saved snapshots retained:',error.message);process.exitCode=1;});
module.exports={extract,transform,update};
