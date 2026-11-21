const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),target=path.join(root,'current-patch.json');
const origin='https://wildrift.leagueoflegends.com';
function compare(a,b){const parts=v=>{const m=v.match(/^(\d+)\.(\d+)([a-z]?)$/);if(!m)throw Error('Invalid patch version');return [+m[1],+m[2],m[3]?m[3].charCodeAt(0)-96:0]};const x=parts(a),y=parts(b);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2];}
function parse(html,locale,now=Date.now()){
 const json=html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];if(!json)throw Error('Riot page structure changed');
 const entries=new Map();
 function walk(o){if(!o||typeof o!=='object')return;const href=o.action?.payload?.url;const m=typeof href==='string'&&href.match(/\/news\/game-updates\/wild-rift-patch-notes-(\d+)-(\d+)([a-z]?)(?:\/|$)/);
  if(m&&o.title&&o.publishedAt&&o.tags?.some(t=>t.machineName==='patch_notes')){const url=new URL(href,origin);const time=Date.parse(o.publishedAt);if(url.origin!==origin||!Number.isFinite(time))throw Error('Invalid Riot publication');if(time<=now){const version=m[1]+'.'+m[2]+m[3];const text=String(o.description?.body||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();const words=text.split(' ');entries.set(version,{version,title:'Обновление Wild Rift '+version,publishedAt:new Date(time).toISOString(),url:url.href,locale,summary:'Опубликовано официальное описание обновления. Полный список изменений доступен в публикации Riot Games.'});}}
  for(const v of Object.values(o))if(v&&typeof v==='object')walk(v);
 }walk(JSON.parse(json));if(!entries.size)throw Error('No official patch publications found');return [...entries.values()].sort((a,b)=>compare(b.version,a.version));
}
let pending;
async function update(){if(pending)return pending;pending=(async()=>{const entries=new Map(),errors=[];
 for(const locale of ['ru-ru','en-us']){try{const res=await fetch(origin+'/'+locale+'/news/tags/patch-notes/',{signal:AbortSignal.timeout(20000)});if(!res.ok)throw Error('HTTP '+res.status);for(const entry of parse(await res.text(),locale))if(!entries.has(entry.version))entries.set(entry.version,entry);}catch(e){errors.push(locale+': '+e.message);}}
 if(!entries.size)throw Error(errors.join('; '));
 const list=[...entries.values()].sort((a,b)=>compare(b.version,a.version)).slice(0,20),current=list[0];
 let previous;if(fs.existsSync(target))previous=JSON.parse(fs.readFileSync(target,'utf8'));
 if(previous&&compare(current.version,previous.current.version)<0)throw Error('Source rollback; keeping latest known patch');
 // Verify that the newest announcement really opens; a failed fetch cannot erase the old feed.
 const article=await fetch(current.url,{signal:AbortSignal.timeout(20000)});if(!article.ok)throw Error('Latest official publication HTTP '+article.status);await article.text();
 const data={schema:1,source:origin,current,entries:list};
 if(JSON.stringify(data)===JSON.stringify(previous)){console.log('Official patch unchanged: '+current.version);return {changed:false,data};}
 fs.writeFileSync(target+'.tmp',JSON.stringify(data,null,2)+'\n');fs.renameSync(target+'.tmp',target);console.log('Official patch feed updated: '+current.version);return {changed:true,data};
 })();try{return await pending;}finally{pending=null;}}
if(require.main===module)update().catch(e=>{console.error('Patch check failed; previous feed retained:',e.message);process.exitCode=1;});
module.exports={parse,compare,update};

