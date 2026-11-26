// Public patch browser. It reads official publications, not private moderation state.
(() => {
 'use strict';
 const root=document.getElementById('patch-browser');if(!root)return;
 const releases=window.RIFT_BALANCE_CANDIDATES?.releases||[],entities=window.RIFT_PATCH_ENTITIES||[];
 const byPatch=new Map(releases.map(r=>[r.patch,r])),params=new URLSearchParams(location.search);
 let feed=[],selected=params.get('patch')||releases[0]?.patch||'',kind=['all','champion','item','rune'].includes(params.get('kind'))?params.get('kind'):'all',query=(params.get('q')||'').slice(0,80),interacted=false;
 const $=id=>document.getElementById(id),el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const normal=s=>String(s||'').normalize('NFKC').toLocaleLowerCase('ru').replaceAll('ё','е').replace(/[^\p{L}\p{N}]/gu,'');
 const date=value=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}):'';
 const official=url=>{try{const u=new URL(url);return u.origin==='https://wildrift.leagueoflegends.com'&&u.pathname.includes('/news/game-updates/wild-rift-patch-notes-');}catch{return false;}};
 const compare=(a,b)=>{const parts=s=>{const m=s.match(/^(\d+)\.(\d+)([a-z]?)$/);return m?[+m[1],+m[2],m[3]?.charCodeAt(0)||0]:[0,0,0]};const x=parts(a),y=parts(b);return y[0]-x[0]||y[1]-x[1]||y[2]-x[2];};
 const find=row=>entities.find(e=>e.kind===row.kind&&(normal(e.id)===normal(row.entity)||normal(e.name)===normal(row.entity)));
 function groups(rows){const map=new Map();for(const row of rows){const id=row.kind+'|'+row.entity+'|'+row.mode;if(!map.has(id))map.set(id,[]);map.get(id).push(row);}return [...map.values()];}
 function text(row,release){return release.labels?.texts?.[row.text]||row.text;}
 function entityName(row,release){return release.labels?.entities?.[row.entity]||find(row)?.name||row.entity;}
 function matches(rows,release){const needle=normal(query);return !needle||rows.some(r=>normal([entityName(r,release),r.entity,release.labels?.contexts?.[r.context]||r.context,text(r,release)].join(' ')).includes(needle));}
 function change(row,release){
  const li=el('li','patch-change'),line=text(row,release),arrow=line.indexOf('→'),colon=line.indexOf(':');
  if(arrow>=0&&colon>=0&&colon<arrow){
   li.append(el('span','patch-change-label',line.slice(0,colon).trim()));
   const values=el('div','patch-change-values'),before=el('span','patch-before'),after=el('span','patch-after');
   before.append(el('small','','Было'),el('span','',line.slice(colon+1,arrow).trim()));after.append(el('small','','Стало'),el('span','',line.slice(arrow+1).trim()));
   const mark=el('span','patch-change-arrow','→');mark.setAttribute('aria-hidden','true');values.append(before,mark,after);li.append(values);
  }else li.append(el('p','patch-change-text',line));
  return li;
 }
 function card(rows,release){
  const first=rows[0],entity=find(first),article=el('article','patch-change-card'),header=el('header','patch-card-header');
  if(entity?.icon){const img=el('img');img.src=entity.icon;img.alt='';img.width=48;img.height=48;img.loading='lazy';header.append(img);}
  const identity=el('div','patch-card-identity'),kindLabel=({champion:'ЧЕМПИОН',item:'ПРЕДМЕТ',rune:'РУНА'})[first.kind]||'ИЗМЕНЕНИЕ',modeLabel=({'aaa-aram':'AAA ARAM',aram:'ARAM'})[first.mode];identity.append(el('small','',kindLabel+(modeLabel?' · '+modeLabel:'')),el('h3','',entityName(first,release)));header.append(identity);
  if(entity?.url&&/^[a-z0-9-]+\.html$/.test(entity.url)){const link=el('a','patch-entity-link','Открыть ↗');link.href=entity.url;link.setAttribute('aria-label','Открыть: '+entityName(first,release));header.append(link);}
  article.append(header);const contexts=new Map();for(const r of rows){const key=r.context||'';if(!contexts.has(key))contexts.set(key,[]);contexts.get(key).push(r);}
  for(const [context,changes]of contexts){const section=el('div','patch-card-section');if(context)section.append(el('h4','',release.labels?.contexts?.[context]||({ 'Base Stats':'Основные показатели','Base Stats:':'Основные показатели','Life Line':'Линия жизни','Blessed Blade':'Благословенный клинок','Censer':'Кадильница'})[context]||context));const list=el('ul','patch-changes');changes.forEach(r=>list.append(change(r,release)));section.append(list);article.append(section);}
  return article;
 }
 function fillSelector(){
  const versions=[...new Set([...feed.map(r=>r.version),...byPatch.keys()])].sort(compare);
  if(!versions.includes(selected))selected=versions[0]||'';
  $('patch-release').replaceChildren();for(const version of versions){const item=el('option','',version+(version===versions[0]?' · последний':''));item.value=version;$('patch-release').append(item);}$('patch-release').value=selected;
 }
 function render(){
  const release=byPatch.get(selected),entry=feed.find(r=>r.version===selected),rows=release?.changes||[],url=entry?.url||release?.source;
  $('patch-current-number').textContent=selected||'Патчи';$('patch-current-date').textContent=date(entry?.publishedAt);
  const source=$('patch-official-link');source.hidden=!official(url);if(official(url))source.href=url.replace('/en-us/','/ru-ru/');
  $('patch-current-summary').textContent=rows.length?'Изменения баланса чемпионов, предметов и рун.':'Для этого патча доступна официальная публикация Riot.';
  const allGroups=groups(rows),classic=allGroups.filter(g=>g[0].mode==='classic'),special=allGroups.filter(g=>g[0].mode!=='classic');
  document.querySelectorAll('[data-patch-kind]').forEach(button=>{const key=button.dataset.patchKind,count=classic.filter(g=>key==='all'||g[0].kind===key).length;button.setAttribute('aria-pressed',String(kind===key));button.querySelector('span').textContent=count;});
  const filter=g=>(kind==='all'||g[0].kind===kind)&&matches(g,release),visible=classic.filter(filter),other=special.filter(filter);
  const main=$('patch-change-list'),aram=$('patch-special-list');main.replaceChildren();aram.replaceChildren();visible.forEach(g=>main.append(card(g,release)));other.forEach(g=>aram.append(card(g,release)));
  $('patch-result-count').textContent=query?`Найдено: ${visible.length+other.length}`:`Записей: ${visible.length}${other.length?' · в особых режимах: '+other.length:''}`;
  $('patch-empty').hidden=visible.length>0;$('patch-empty').textContent=!release?'Подробный список здесь пока не собран. Открой официальное описание обновления.':query?'По этому запросу изменений в обычном режиме нет.':'Для выбранного раздела нет изменений в обычном режиме.';
  $('patch-special').hidden=!other.length;$('patch-special-count').textContent=other.length;$('patch-special').open=!!query&&!!other.length;
  $('patch-clear-search').hidden=!query;
  const p=new URLSearchParams();if(selected)p.set('patch',selected);if(kind!=='all')p.set('kind',kind);if(query)p.set('q',query);history.replaceState(history.state,'',location.pathname+(p.size?'?'+p:'')+location.hash);
 }
 $('patch-search').value=query;
 $('patch-release').addEventListener('change',()=>{interacted=true;selected=$('patch-release').value;render();});
 $('patch-search').addEventListener('input',()=>{query=$('patch-search').value.trim().slice(0,80);render();});
 $('patch-clear-search').addEventListener('click',()=>{query='';$('patch-search').value='';render();$('patch-search').focus();});
 document.querySelectorAll('[data-patch-kind]').forEach(button=>button.addEventListener('click',()=>{kind=button.dataset.patchKind;render();}));
 fillSelector();render();
 fetch('current-patch.json',{cache:'no-cache',signal:AbortSignal.timeout(12000)}).then(r=>r.ok?r.json():null).then(data=>{if(!Array.isArray(data?.entries))return;feed=data.entries.filter(e=>/^\d+\.\d+[a-z]?$/.test(e.version)&&official(e.url));if(!interacted&&!params.has('patch')&&feed[0])selected=feed[0].version;fillSelector();render();}).catch(()=>{});
})();
