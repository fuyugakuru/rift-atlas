(() => {
 const list=document.querySelector('.patch-list');
 const status=document.querySelector('.patch-sync-note');
 const originalVersions=new Set(list?[...list.querySelectorAll('.patch-number')].map(e=>e.textContent.trim()):[]);
 const versionParts=v=>{const m=v.match(/^(\d+)\.(\d+)([a-z]?)$/);return m?[+m[1],+m[2],m[3]?m[3].charCodeAt(0)-96:0]:null;};
 const newer=(a,b)=>{const x=versionParts(a),y=versionParts(b);return x&&y&&(x[0]>y[0]||x[0]===y[0]&&(x[1]>y[1]||x[1]===y[1]&&x[2]>y[2]));};
 let baseline;for(const v of originalVersions)if(!baseline||newer(v,baseline))baseline=v;
 const dateLabel=value=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value));
 function valid(entry){try{return versionParts(entry.version)&&new URL(entry.url).origin==='https://wildrift.leagueoflegends.com'&&Number.isFinite(Date.parse(entry.publishedAt))&&typeof entry.title==='string';}catch{return false;}}
 let busy=false;
 let latestPatch=null,pageAcknowledged=false,lastAnnounced=null;
 const publicSeenKey='rift-seen-public-patch',gameSeenKey='rift-seen-game-patch';
 const seen=key=>{try{return window.localStorage?.getItem(key)||null;}catch{return null;}};
 const remember=(key,version)=>{try{window.localStorage?.setItem(key,version);}catch{}};
 function updateSignals(){
  if(!latestPatch)return;const version=latestPatch.version,path=location.pathname.split('/').pop();
  if(!pageAcknowledged&&!document.hidden){if(path==='patches.html')remember(publicSeenKey,version);if(path==='balance-review.html')remember(gameSeenKey,version);pageAcknowledged=true;}
  const unread=key=>!versionParts(seen(key)||'')||newer(version,seen(key));
  function badge(link,isNew,label){const parent=link.querySelector('strong,h2')||link;let mark=parent.querySelector('.patch-unread-indicator');if(!isNew){mark?.remove();return;}if(!mark){mark=document.createElement('span');mark.className='patch-unread-indicator';parent.append(mark);}mark.textContent=label;mark.title='Вышло обновление '+version;}
  for(const link of document.querySelectorAll('.sidebar a[href="patches.html"],.atlas-destinations a[href="patches.html"]'))badge(link,unread(publicSeenKey),'Новое');
  const game=document.getElementById('staff-balance-shortcut');if(game)badge(game,unread(gameSeenKey),'Новый патч '+version);
  for(const pill of document.querySelectorAll('.patch-pill')){let dot=pill.querySelector('.patch-pill-new');if(!unread(publicSeenKey)){dot?.remove();continue;}if(!dot){dot=document.createElement('span');dot.className='patch-pill-new';dot.textContent='●';dot.setAttribute('aria-label','Новое обновление');pill.append(dot);}dot.title='Доступно новое описание патча';}
 }
 window.addEventListener('storage',event=>{if([publicSeenKey,gameSeenKey].includes(event.key))updateSignals();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateSignals();});
 async function refresh(){if(busy)return;busy=true;try{let feed,fromCache=false;try{const cached=JSON.parse(sessionStorage.getItem('rift-patch-feed-cache')||'null');const age=Date.now()-cached?.at;if(age>=0&&age<60000){feed=cached.data;fromCache=true;}}catch{}if(!feed){const res=await fetch('current-patch.json',{cache:'no-cache',signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error();feed=await res.json();}if(feed.schema!==1||!valid(feed.current)||!Array.isArray(feed.entries)||!feed.entries.every(valid))throw Error();
 if(!fromCache)try{sessionStorage.setItem('rift-patch-feed-cache',JSON.stringify({at:Date.now(),data:feed}));}catch{} const current=feed.current;
 for(const badge of document.querySelectorAll('.patch-pill')){badge.textContent='ПАТЧ '+current.version;badge.title='Официальная публикация Riot: '+dateLabel(current.publishedAt);}
 latestPatch=current;updateSignals();if(lastAnnounced!==current.version){lastAnnounced=current.version;window.dispatchEvent(new CustomEvent('rift-patch-updated',{detail:current}));}
 for(const sidebar of document.querySelectorAll('.sidebar-bottom')){for(const node of sidebar.childNodes)if(node.nodeType===Node.TEXT_NODE&&node.textContent.includes('Данные проверены'))node.textContent=node.textContent.replace('Данные проверены','Текущий патч');const small=sidebar.querySelector('small');if(small)small.textContent=current.version+' · '+dateLabel(current.publishedAt);}
 if(list){for(const node of list.querySelectorAll('[data-auto-patch]'))node.remove();const fragment=document.createDocumentFragment();for(const entry of feed.entries){if(originalVersions.has(entry.version)||baseline&&!newer(entry.version,baseline))continue;const article=document.createElement('article');article.className='panel patch-entry';article.id='patch-'+entry.version.replace('.','-');article.dataset.autoPatch=entry.version;const meta=document.createElement('div'),number=document.createElement('span'),date=document.createElement('span');number.className='patch-number';number.textContent=entry.version;date.className='badge';date.textContent=dateLabel(entry.publishedAt);meta.append(number,date);const content=document.createElement('div'),heading=document.createElement('h2'),summary=document.createElement('p'),link=document.createElement('a'),note=document.createElement('p');heading.textContent=entry.title;summary.textContent=entry.summary||'Опубликовано официальное описание обновления.';link.href=entry.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Полное описание Riot ↗';note.className='muted';note.textContent='Публикация добавлена автоматически. Характеристики и сборки проверяются отдельно.';content.append(heading,summary,note,link);article.append(meta,content);fragment.append(article);}list.prepend(fragment);}
 if(status)status.textContent='Новые официальные публикации проверяются каждый час. Сборки и характеристики обновляются после отдельной проверки.';
 }catch{if(status)status.textContent='Проверка новых публикаций временно недоступна. Показаны последние сохранённые описания.';}finally{busy=false;}}
 refresh();setInterval(()=>{if(!document.hidden)refresh();},15*60000);
})();

