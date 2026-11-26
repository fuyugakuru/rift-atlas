// Official publication parser. Mode boundaries are retained; no inferred buffs/nerfs.
const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function plain(value) {
  return String(value || '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>|<\/(?:p|li|div)>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&#x([\da-f]+);/gi, (_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n))
    .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'")
    .replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
function parse(html, patch, source) {
  const url = new URL(source);
  if(url.origin !== 'https://wildrift.leagueoflegends.com' || !/\/news\/game-updates\/wild-rift-patch-notes-/.test(url.pathname)) throw Error('Only official Riot patch articles are accepted');
  const raw = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if(!raw)throw Error('Riot article format changed');
  const page=JSON.parse(raw).props?.pageProps?.page;
  if(!Array.isArray(page?.blades))throw Error('Missing official article body');
  const rows=[];
  function add(kind, entity, context, text, mode) {
    text=plain(text);if(!text||!entity)return;
    const pos=text.indexOf('→'),colon=text.indexOf(':');
    const field=pos>=0&&colon>=0&&colon<pos?text.slice(0,colon).trim():'';
    const before=pos>=0?text.slice(field?colon+1:0,pos).trim():null,after=pos>=0?text.slice(pos+1).trim():null;
    const row={patch,kind,entity:plain(entity),context:plain(context),text,field,before,after,mode,source};
    row.id=hash(JSON.stringify(row)); rows.push(row);
  }
  let mode='classic',kind='',entity='',context='';
  for(const blade of page.blades) {
    if(Array.isArray(blade.characters)) {
      // Structured champion blocks are distinct from ARAM text sections.
      for(const c of blade.characters)for(const change of c.changes||[]) {
        const body=change.description?.body||'';
        const items=[...body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];
        for(const item of items)add('champion',c.character?.name,change.title,item[1],mode);
      }
    }
    const body=blade.richText?.body;if(!body)continue;
    for(const match of body.matchAll(/<(h[2-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
      const tag=match[1],text=plain(match[2]);if(!text)continue;
      if(/^h/.test(tag)&&/^(?:Season-Exclusive )?Champion (?:Balance Adjustments|Buffs)$/i.test(text)){kind='champion';entity='';continue;}
      if(/^h/.test(tag)&&/^Item Adjustments$/i.test(text)){kind='item';entity='';continue;}
      if(tag==='h2'||tag==='h3') {
        if(/AAA\s*ARAM/i.test(text)){mode='aaa-aram';kind='';entity='';continue;}
        if(/\bARAM\b/i.test(text)){mode='aram';kind='';entity='';continue;}
        if(/^(ITEMS|Item Adjustments)$/i.test(text)){kind='item';entity='';continue;}
        if(/^RUNES$/i.test(text)){kind='rune';entity='';continue;}
        if(/Champion (?:Balance Adjustments|Buffs)/i.test(text)){kind='champion';entity='';continue;}
        if(tag==='h2'){kind='';entity='';}
      }
      if(/^h[4-6]$/.test(tag)&&kind){entity=text;context='';continue;}
      if(tag==='p'&&kind&&entity&&text.length<85&&!/[.!?]$/.test(text))context=text;
      if(tag==='li'&&kind&&entity)add(kind,entity,context,match[2],mode);
    }
  }
  if(!rows.length)throw Error('No balance entries found; keeping last valid snapshot');
  const unique=[...new Map(rows.map(r=>[r.id,r])).values()];
  return {schema:1,patch,source,contentHash:hash(JSON.stringify(unique)),changes:unique};
}
function localize(enHtml,ruHtml){
 const page=html=>JSON.parse(html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]).props.pageProps.page;
 const en=page(enHtml).blades,ru=page(ruHtml).blades,labels={entities:{},contexts:{},texts:{}};
 const items=html=>[...String(html||'').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m=>plain(m[1]));
 const numbers=s=>(s.match(/\d+(?:[.,]\d+)?/g)||[]).map(n=>n.replace(',','.')).join('|');
 const pair=(a,b)=>{if(a.length!==b.length)return false;return a.every((v,i)=>numbers(v)===numbers(b[i]));};
 for(let i=0;i<en.length;i++){
  const a=en[i],b=ru[i];if(!b)continue;
  if(a.characters?.length&&a.characters.length===b.characters?.length){for(let j=0;j<a.characters.length;j++){
   const c=a.characters[j],d=b.characters[j];if(c.changes.length!==d.changes.length)continue;
   if(!c.changes.every((v,k)=>pair(items(v.description?.body),items(d.changes[k].description?.body))))continue;
   labels.entities[c.character.name]=d.character.name;
   c.changes.forEach((change,k)=>{const other=d.changes[k];labels.contexts[change.title]=other.title;const x=items(change.description?.body),y=items(other.description?.body);x.forEach((line,n)=>labels.texts[line]=y[n]);});
  }}
  if(a.richText?.body&&b.richText?.body){const x=items(a.richText.body),y=items(b.richText.body);if(!pair(x,y))continue;x.forEach((line,n)=>labels.texts[line]=y[n]);const headings=body=>[...body.matchAll(/<h[4-6]\b[^>]*>([\s\S]*?)<\/h[4-6]>/gi)].map(m=>plain(m[1]));const eh=headings(a.richText.body),rh=headings(b.richText.body);if(eh.length===rh.length)eh.forEach((v,n)=>labels.entities[v]=rh[n]);}
 }
 return labels;
}
module.exports={hash,plain,parse,localize};
