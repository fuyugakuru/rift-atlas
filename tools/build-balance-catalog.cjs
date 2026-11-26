// Local reference for the review form; visitors don't load this large catalog.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {plain}=require('./balance-core.cjs');const root=path.resolve(__dirname,'..');
const json=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const catalog=[];
const names=new Map(json('champion-catalog.json').map(c=>[c.id,c.name]));
const values=json('ability-values.json').champions;
const official=json('champion-abilities.json').champions;
for(const [id,name]of names)catalog.push({key:`champion:${id}:base`,kind:'champion',entity:id,name,context:'Base Stats',contextName:'Базовые характеристики',description:'',url:id+'.html',index:'base'});
for(const [id,c]of Object.entries(values))for(const [index,a]of c.abilities.entries()) {
  if(!a?.description)continue;
  catalog.push({key:`champion:${id}:${index}`,kind:'champion',entity:id,name:names.get(id)||id,context:a.name,contextName:official[id]?.abilities[index]?.name||a.name,description:a.description,cooldown:a.cooldown||'',cost:a.cost||'',url:id+'.html',index});
}
for(const file of fs.readdirSync(root).filter(f=>/^item-.+\.html$/.test(f))) {
  const html=fs.readFileSync(path.join(root,file),'utf8');
  const english=plain(html.match(/class="item-detail-english"[^>]*>([\s\S]*?)<\/p>/)?.[1]);
  if(!english)continue;
  const stats=html.match(/<section class="panel item-detail-stats">([\s\S]*?)<\/section>/)?.[1]||'';
  const effects=html.match(/<section class="panel item-detail-effects">([\s\S]*?)<\/section>/)?.[1]||'';
  const strip=s=>s.replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/g,'');
  const statLines=[...stats.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map(m=>plain(m[1]).replace(/\s+/g,' ')).join('\n');
  catalog.push({key:'item:'+english,kind:'item',entity:english,name:plain(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1])||english,context:'',description:statLines+'\n\n'+plain(strip(effects)).replace(/\s+/g,' '),url:file});
}
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'runes-data.js'),'utf8'),context);
for(const rune of Object.values(context.window.RIFT_RUNES.runes))catalog.push({key:'rune:'+rune.id,kind:'rune',entity:rune.id,name:rune.name,context:'',description:rune.description,url:'runes.html'});
fs.writeFileSync(path.join(root,'balance-catalog.js'),'window.RIFT_BALANCE_CATALOG = '+JSON.stringify(catalog,null,2)+';\n');
const publicEntities=[];
for(const c of json('champion-catalog.json'))publicEntities.push({kind:'champion',id:c.id,name:c.name,url:c.id+'.html',icon:'assets/champions/faces/'+c.id+'.webp'});
for(const c of catalog.filter(c=>c.kind==='item')){const html=fs.readFileSync(path.join(root,c.url),'utf8');const icon=html.match(/class="item-detail-icon"\s+src="([^"]+)"/)?.[1]||'';publicEntities.push({kind:'item',id:c.entity,name:c.name,url:c.url,icon});}
for(const r of Object.values(context.window.RIFT_RUNES.runes))publicEntities.push({kind:'rune',id:r.id,name:r.name,url:'runes.html',icon:r.icon});
fs.writeFileSync(path.join(root,'patch-entities.js'),'window.RIFT_PATCH_ENTITIES = '+JSON.stringify(publicEntities)+';\n');
console.log('Review catalog: '+catalog.length+' entries');
