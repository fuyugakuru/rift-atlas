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
 async function refresh(){if(busy)return;busy=true;try{const res=await fetch('current-patch.json',{cache:'no-cache',signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error();const feed=await res.json();if(feed.schema!==1||!valid(feed.current)||!Array.isArray(feed.entries)||!feed.entries.every(valid))throw Error();
 const current=feed.current;
 for(const badge of document.querySelectorAll('.patch-pill')){badge.textContent='ПАТЧ '+current.version;badge.title='Официальная публикация Riot: '+dateLabel(current.publishedAt);}
 for(const sidebar of document.querySelectorAll('.sidebar-bottom')){for(const node of sidebar.childNodes)if(node.nodeType===Node.TEXT_NODE&&node.textContent.includes('Данные проверены'))node.textContent=node.textContent.replace('Данные проверены','Текущий патч');const small=sidebar.querySelector('small');if(small)small.textContent=current.version+' · '+dateLabel(current.publishedAt);}
 if(list){for(const node of list.querySelectorAll('[data-auto-patch]'))node.remove();const fragment=document.createDocumentFragment();for(const entry of feed.entries){if(originalVersions.has(entry.version)||baseline&&!newer(entry.version,baseline))continue;const article=document.createElement('article');article.className='panel patch-entry';article.id='patch-'+entry.version.replace('.','-');article.dataset.autoPatch=entry.version;const meta=document.createElement('div'),number=document.createElement('span'),date=document.createElement('span');number.className='patch-number';number.textContent=entry.version;date.className='badge';date.textContent=dateLabel(entry.publishedAt);meta.append(number,date);const content=document.createElement('div'),heading=document.createElement('h2'),summary=document.createElement('p'),link=document.createElement('a'),note=document.createElement('p');heading.textContent=entry.title;summary.textContent=entry.summary||'Опубликовано официальное описание обновления.';link.href=entry.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Полное описание Riot ↗';note.className='muted';note.textContent='Публикация добавлена автоматически. Характеристики и сборки проверяются отдельно.';content.append(heading,summary,note,link);article.append(meta,content);fragment.append(article);}list.prepend(fragment);}
 if(status)status.textContent='Новые официальные публикации проверяются каждый час. Сборки и характеристики обновляются после отдельной проверки.';
 }catch{if(status)status.textContent='Проверка новых публикаций временно недоступна. Показаны последние сохранённые описания.';}finally{busy=false;}}
 refresh();setInterval(()=>{if(!document.hidden)refresh();},15*60000);
})();
