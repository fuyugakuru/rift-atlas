// Daily additive discovery from Riot. Never rewrites the hand-maintained skin catalogue.
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const identity=s=>new URL(s).pathname;
const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
function extract(html){
 const match=html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
 if(!match)throw Error('Не найден каталог Riot');
 const page=JSON.parse(match[1]).props.pageProps.page;
 const groups=page.blades.find(b=>b.type==='landingMediaCarousel')?.groups;
 if(!Array.isArray(groups)||!groups.length)throw Error('Пустой каталог Riot');
 return groups.slice(1).map(g=>{
  const image=g.content?.media?.url,name=g.label?.trim();
  if(!name||!image)throw Error('Неполный образ Riot');
  const u=new URL(image);if(u.protocol!=='https:'||!['cmsassets.rgpub.io','images.contentstack.io'].includes(u.hostname))throw Error('Неизвестный сервер изображений');
  return {name,officialName:name,image,rarity:'unknown',video:null,videoSource:null,exclusive:false};
 });
}
function discover(champion,skins,known){
 return skins.filter(s=>!known.some(k=>identity(k.image)===identity(s.image)||normalize(k.officialName||k.name)===normalize(s.officialName))).map(s=>({
  ...s,id:champion.id+'-riot-'+crypto.createHash('sha256').update(identity(s.image)).digest('hex').slice(0,16),champion:champion.id,championName:champion.name,source:champion.url
 }));
}
async function run(){
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'champion-catalog.json'))),baseline=JSON.parse(fs.readFileSync(path.join(root,'champion-skins.json')));
 const target=path.join(root,'skin-candidates.js');let previous={skins:[],checked:{}};
 if(fs.existsSync(target))previous=JSON.parse(fs.readFileSync(target,'utf8').replace(/^window\.RIFT_SKIN_CANDIDATES=/,'').replace(/;\s*$/,''));
 const byChampion=new Map(),checked={...previous.checked},errors=[];let cursor=0;
 await Promise.all(Array.from({length:4},async()=>{while(cursor<catalog.length){const c=catalog[cursor++];try{
  const response=await fetch(c.url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'RiftAtlas-SkinCatalog/1.0'}});if(!response.ok)throw Error('HTTP '+response.status);
  const skins=extract(await response.text());byChampion.set(c.id,discover(c,skins,baseline.champions[c.id]||[]));checked[c.id]=new Date().toISOString();
 }catch(e){errors.push(c.id+': '+e.message);}}}));
 // Keep last successful candidates on a partial outage, never silently delete discoveries.
 const merged=new Map((previous.skins||[]).filter(s=>!(baseline.champions[s.champion]||[]).some(k=>identity(k.image)===identity(s.image)||normalize(k.officialName||k.name)===normalize(s.name))).map(s=>[s.id,s]));
 for(const list of byChampion.values())for(const s of list)if(!merged.has(s.id)&&![...merged.values()].some(old=>old.champion===s.champion&&normalize(old.name)===normalize(s.name)))merged.set(s.id,s);
 const skins=[...merged.values()].sort((a,b)=>a.champion.localeCompare(b.champion)||a.id.localeCompare(b.id));
 const output={skins,checked,errors};
 if(!byChampion.size)throw Error('Ни одна страница Riot не ответила; старый файл сохранён');
 fs.writeFileSync(target,'window.RIFT_SKIN_CANDIDATES='+JSON.stringify(output,null,2).replace(/</g,'\\u003c')+';\n');
 console.log(JSON.stringify({champions:byChampion.size,candidates:skins.length,errors}));
}
module.exports={extract,discover};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
