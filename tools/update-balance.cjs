// Runs on GitHub, never on visitors' devices. Only official EN publications are parsed.
const fs=require('node:fs'),path=require('node:path');
const {parse,localize}=require('./balance-core.cjs');
const root=path.resolve(__dirname,'..');
async function update(){
  const feed=JSON.parse(fs.readFileSync(path.join(root,'current-patch.json'),'utf8'));
  const file=path.join(root,'balance-candidates.js');
  const old=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
  const previous=old?JSON.parse(old.slice(old.indexOf('=')+1).trim().replace(/;$/,'')):{releases:[]};
  const releases=new Map(previous.releases.map(r=>[r.patch,r]));
  // Re-read the latest article every hour, including silent edits / hotfixes.
  const current=feed.current;
  // Fill the two previous releases once; only the latest is re-read every hour.
  const wanted=[current,...(feed.entries||[]).slice(0,3).filter(entry=>entry.version!==current.version&&!releases.has(entry.version))];
  for(const entry of wanted){try{
  const url=entry.url.replace('/ru-ru/','/en-us/');
  const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error('Official balance article HTTP '+response.status);
  const english=await response.text(),release=parse(english,entry.version,url);
  try{const ru=await fetch(url.replace('/en-us/','/ru-ru/'),{signal:AbortSignal.timeout(25000)});if(ru.ok)release.labels=localize(english,await ru.text());}catch{console.warn('Russian translation unavailable; keeping English identifiers');}
  if(!release.labels&&releases.get(release.patch)?.contentHash===release.contentHash)release.labels=releases.get(release.patch).labels;
  releases.set(release.patch,release);
  }catch(error){if(entry.version===current.version)throw error;console.warn('Archive '+entry.version+': '+error.message);}}
  const compare=require('./update-patches.cjs').compare;
  const data={schema:1,releases:[...releases.values()].sort((a,b)=>compare(b.patch,a.patch)).slice(0,12)};
  const next='// Generated from official Riot publications. Approval is required before application.\nwindow.RIFT_BALANCE_CANDIDATES = '+JSON.stringify(data,null,2)+';\n';
  if(old===next){console.log('Balance article unchanged: '+current.version);return;}
  fs.writeFileSync(file+'.tmp',next);fs.renameSync(file+'.tmp',file);
  console.log('Prepared '+data.releases.length+' releases; latest '+current.version);
}
if(require.main===module)update().catch(e=>{console.error('Previous balance snapshot retained:',e.message);process.exitCode=1;});
module.exports={update};
