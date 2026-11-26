(() => {
 'use strict';
 const champions=window.RIFT_TIER_CHAMPIONS||[],byId=new Map(champions.map(c=>[c.id,c]));
 const $=id=>document.getElementById(id),el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const lanes={baron:'Барона',jungle:'Лес',mid:'Мид',dragon:'Дракона',support:'Поддержка'};
 const sourceRanks={'1':'Алмаз','2':'Мастер / Грандмастер','3':'Претендент','4':'Суверен'};
 const tierLabels=['S+','S','A','B','C','D'];
 const communityRanks={iron:'Железо',bronze:'Бронза',silver:'Серебро',gold:'Золото',platinum:'Платина',emerald:'Изумруд',diamond:'Алмаз',master:'Мастер',grandmaster:'Грандмастер',challenger:'Претендент',sovereign:'Суверен'};
 const params=new URLSearchParams(location.search);let lane=Object.hasOwn(lanes,params.get('lane'))?params.get('lane'):'baron',source=params.get('source')==='community'?'community':'official',rank=params.get('rank')||'1',stats=window.RIFT_TIER_SNAPSHOT||null,patch=document.querySelector('.patch-pill')?.textContent.match(/\d+\.\d+[a-z]?/)?.[0]||'7.3g',request=0,busy=false,myVotes=[];
 const communityCache=new Map(),pendingRPC=new Map();let boardKey='',boardSignature='';
 const api=()=>window.RiftAccount,client=()=>api()?.client;
 const rpc=async(name,args)=>{if(!client())throw Error('Unavailable');const key=name+JSON.stringify(args);if(pendingRPC.has(key))return pendingRPC.get(key);const promise=client().rpc(name,args).then(r=>{if(r.error)throw r.error;return r.data;}).finally(()=>pendingRPC.delete(key));pendingRPC.set(key,promise);return promise;};
 function rankOptions(){const options=source==='official'?sourceRanks:{all:'Все ранги',...communityRanks};if(!Object.hasOwn(options,rank))rank=source==='official'?'1':'all';$('tier-rank').replaceChildren();for(const [value,label]of Object.entries(options).sort((a,b)=>source==='official'?['1','2','3','4'].indexOf(a[0])-['1','2','3','4'].indexOf(b[0]):0)){const option=el('option','',label);option.value=value;$('tier-rank').append(option);}$('tier-rank').value=rank;}
 function link(c,votes){const a=el('a','tier-champion');a.href=c.id+'.html';a.setAttribute('aria-label','Открыть страницу '+c.name);if(votes)a.title='Оценок игроков: '+votes;const img=el('img');img.src=c.icon;img.alt='';img.loading='lazy';img.width=64;img.height=64;a.append(img,el('span','',c.name));return a;}
 function board(rows){
  const signature=JSON.stringify(rows.map(r=>[r.champion,r.tier,r.positionInLane,r.score,r.votes]));if(signature===boardSignature)return;boardSignature=signature;const host=$('tier-board');host.replaceChildren();const known=rows.filter(r=>byId.has(r.champion));
  for(let tier=0;tier<=5;tier++){const row=el('section','tier-row tier-level-'+tier),label=el('h2','tier-grade',tierLabels[tier]),list=el('div','tier-champions');row.setAttribute('aria-label','Уровень '+tierLabels[tier]);const entries=known.filter(r=>r.tier===tier).sort((a,b)=>(a.positionInLane??a.score??999)-(b.positionInLane??b.score??999)||byId.get(a.champion).name.localeCompare(byId.get(b.champion).name,'ru'));for(const r of entries)list.append(link(byId.get(r.champion),r.votes));if(!entries.length)list.append(el('span','tier-empty-row','—'));row.append(label,list);host.append(row);}
  const missing=known.filter(r=>!Number.isInteger(r.tier)||r.tier<0||r.tier>5);if(missing.length){const section=el('section','tier-unrated');section.append(el('h2','','Без оценки источника'));const list=el('div','tier-champions');missing.forEach(r=>list.append(link(byId.get(r.champion))));section.append(list);host.append(section);}
 }
 function shell(){rankOptions();document.querySelectorAll('[data-tier-source]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tierSource===source)));document.querySelectorAll('[data-tier-lane]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tierLane===lane)));$('tier-rate-open').hidden=source!=='community';$('tier-source-link').hidden=source!=='official';$('tier-community-note').hidden=source!=='community';const p=new URLSearchParams({lane,rank});if(source==='community')p.set('source',source);history.replaceState(history.state,'',location.pathname+'?'+p);}
 async function render(){
  shell();const turn=++request;const key=source+':'+lane+':'+rank+':'+patch;if(key!==boardKey){if(!busy)closePanel();boardKey=key;boardSignature='';$('tier-board').replaceChildren();} $('tier-empty').hidden=true;
  if(source==='official'){
   if(!stats){$('tier-status').textContent='Загружаем китайский список…';return;}
   const rows=stats.rows.filter(r=>r.rank===rank&&r.lane===lane);board(rows);$('tier-empty').hidden=!!rows.length;$('tier-empty').textContent='Для этой линии и выборки нет данных.';
   const latest=stats.dates?.at(-1);$('tier-status').textContent='Китай · '+sourceRanks[rank]+(rank==='4'?' · Вершина Ущелья':rank==='2'?' · Мастер и выше':'')+(latest?' · '+new Date(latest+'T00:00:00Z').toLocaleDateString('ru-RU',{timeZone:'UTC'}):'');return;
  }
  $('tier-status').textContent='Загружаем оценки игроков…';
  try{const cached=communityCache.get(key);const data=cached&&Date.now()-cached.at<30000?cached.data:await rpc('community_tier_list',{p_lane:lane,p_rank:rank,p_patch:patch});if(turn!==request)return;if(!Array.isArray(data?.rows))throw Error('Invalid list');communityCache.set(key,{at:Date.now(),data});board(data.rows);$('tier-status').textContent='Патч '+patch+' · участников: '+data.voters;$('tier-empty').hidden=!!data.rows.length;$('tier-empty').textContent='На этой линии пока нет оценок. Добавь свою первым.';}
  catch{if(turn===request){$('tier-status').textContent='Оценки игроков временно не загрузились.';$('tier-empty').hidden=false;$('tier-empty').textContent='Попробуй обновить список чуть позже.';}}
 }
 for(const [id,name]of Object.entries(lanes)){const b=el('button','tier-lane');b.type='button';b.dataset.tierLane=id;const img=el('img');img.src='assets/lanes/'+id+'.png';img.alt='';img.width=22;img.height=22;b.append(img,el('span','',name));b.onclick=()=>{lane=id;render();};$('tier-lanes').append(b);}
 document.querySelectorAll('[data-tier-source]').forEach(b=>b.onclick=()=>{source=b.dataset.tierSource;rank=source==='official'?'1':'all';render();});$('tier-rank').onchange=()=>{rank=$('tier-rank').value;render();};
 const dialog=$('tier-rating-dialog'),form=$('tier-rating-form'),champ=$('tier-vote-champion'),voteRank=$('tier-vote-rank'),tierInput=$('tier-vote-level');
 const layout=el('div','tier-layout'),content=el('div','tier-content');const panelParts=[document.querySelector('.tier-source-tabs'),document.querySelector('.tier-controls'),document.querySelector('.tier-meta'),$('tier-community-note'),$('tier-empty'),$('tier-board')];panelParts[0].before(layout);content.append(...panelParts);layout.append(content,dialog);
 function openPanel(){dialog.hidden=false;layout.classList.add('tier-panel-open');$('tier-rate-open').setAttribute('aria-expanded','true');}
 function closePanel(){dialog.hidden=true;layout.classList.remove('tier-panel-open');$('tier-rate-open').setAttribute('aria-expanded','false');}
 for(const c of [...champions].sort((a,b)=>a.name.localeCompare(b.name,'ru'))){const o=el('option','',c.name);o.value=c.id;champ.append(o);}
 for(const [id,name]of Object.entries(communityRanks)){const o=el('option','',name);o.value=id;voteRank.append(o);}
 for(let tier=0;tier<=5;tier++){const o=el('option','',tierLabels[tier]+(tier===0?' · самый высокий':tier===5?' · самый низкий':''));o.value=String(tier);tierInput.append(o);}
 const picker=el('div','tier-face-picker'),search=el('input','tier-face-search');search.type='search';search.placeholder='Найти чемпиона';search.setAttribute('aria-label','Найти чемпиона для оценки');
 const faces=el('div','tier-face-grid'),selected=el('p','tier-face-selected'),choices=el('div','tier-vote-choices');choices.setAttribute('role','group');choices.setAttribute('aria-label','Оценить выбранного чемпиона');
 champ.closest('label').hidden=true;tierInput.closest('label').hidden=true;$('tier-vote-save').hidden=true;
 picker.append(search,faces,selected);champ.closest('label').before(picker);tierInput.closest('label').after(choices);
 function buildFaces(){if(faces.children.length)return;const fragment=document.createDocumentFragment();for(const c of [...champions].sort((a,b)=>a.name.localeCompare(b.name,'ru'))){const button=el('button','tier-face-option');button.type='button';button.dataset.champion=c.id;button.setAttribute('aria-label',c.name);button.title=c.name;const img=el('img');img.src=c.icon;img.alt='';img.width=42;img.height=42;img.loading='lazy';img.decoding='async';button.append(img);button.onclick=()=>{if(busy)return;champ.value=c.id;paintVote();paintPicker();};fragment.append(button);}faces.append(fragment);}
 search.oninput=()=>{const query=search.value.trim().toLocaleLowerCase('ru');for(const b of faces.children)b.hidden=!byId.get(b.dataset.champion).name.toLocaleLowerCase('ru').includes(query);};
 tierLabels.forEach((name,tier)=>{const button=el('button','tier-vote-choice tier-level-'+tier,name);button.type='button';button.onclick=()=>{tierInput.value=String(tier);save();};choices.append(button);});
 function paintPicker(){for(const b of faces.children)b.setAttribute('aria-pressed',String(b.dataset.champion===champ.value));selected.textContent=byId.get(champ.value)?.name||'Выбери чемпиона';for(const [i,b]of [...choices.children].entries())b.setAttribute('aria-pressed',String(myVotes.some(v=>v.champion===champ.value&&v.tier===i)));}
 async function flyPortrait(id,origin){const target=$('tier-board').querySelector('a[href="'+id+'.html"] img');if(!target||!origin||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;target.scrollIntoView({block:'center',behavior:'instant'});const end=target.getBoundingClientRect(),ghost=el('img','tier-flying-face');ghost.src=byId.get(id).icon;ghost.alt='';ghost.style.cssText=`position:fixed;left:${origin.left}px;top:${origin.top}px;width:${origin.width}px;height:${origin.height}px;z-index:10000;pointer-events:none;border-radius:9px;box-shadow:0 0 24px #c294f0;`;document.body.append(ghost);try{await ghost.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${(end.left-origin.left)*.5}px,${(end.top-origin.top)*.5-50}px) scale(1.2)`,opacity:1,offset:.5},{transform:`translate(${end.left-origin.left}px,${end.top-origin.top}px) scale(${end.width/origin.width})`,opacity:1}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'}).finished;target.animate([{filter:'brightness(1.8)',transform:'scale(1.15)'},{filter:'brightness(1)',transform:'scale(1)'}],{duration:350});}finally{ghost.remove();}}
 function paintVote(){const saved=myVotes.find(v=>v.champion===champ.value);voteRank.value=saved?.rank||(Object.hasOwn(communityRanks,rank)?rank:'diamond');tierInput.value=String(saved?.tier??2);$('tier-vote-delete').hidden=!saved;$('tier-vote-save').textContent=saved?'Обновить оценку':'Сохранить оценку';}
 champ.onchange=()=>{paintVote();paintPicker();};
 $('tier-rate-open').onclick=async()=>{
  if(api()?.loading){$('tier-status').textContent='Подожди, проверяем вход…';return;}
  if(!api()?.user){$('tier-status').replaceChildren(document.createTextNode('Чтобы оценивать чемпионов, '));const login=el('a','','войди в профиль');login.href='account.html';$('tier-status').append(login);return;}
  if(!dialog.hidden){closePanel();return;}const turn=request,scopeLane=lane,scopePatch=patch;buildFaces();const first=champions.find(c=>c.lanes.includes(lane));if(first)champ.value=first.id;myVotes=[];paintVote();paintPicker();search.value='';search.oninput();$('tier-rating-scope').textContent=lanes[lane]+' · патч '+patch;openPanel();$('tier-rating-status').textContent='Загружаем твои оценки…';for(const b of choices.children)b.disabled=true;
  try{const votes=await rpc('my_tier_votes',{p_lane:scopeLane,p_patch:scopePatch});if(turn!==request||!api()?.user||dialog.hidden)return;myVotes=votes;paintVote();paintPicker();$('tier-rating-status').textContent='';for(const b of choices.children)b.disabled=false;}catch{if(!dialog.hidden)$('tier-rating-status').textContent='Не удалось загрузить оценки. Закрой панель и попробуй снова.';}
 };
 $('tier-rating-close').onclick=()=>{if(!busy)closePanel();};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!busy)closePanel();});
 async function save(remove=false){
  if(busy)return;busy=true;for(const b of choices.children)b.disabled=true;voteRank.disabled=true;$('tier-vote-save').disabled=$('tier-vote-delete').disabled=true;$('tier-rating-status').textContent='Сохраняем…';const scope={p_champion:champ.value,p_lane:lane,p_patch:patch},origin=faces.querySelector('[aria-pressed="true"] img')?.getBoundingClientRect();
  try{await rpc(remove?'remove_tier_vote':'save_tier_vote',remove?scope:{...scope,p_rank:voteRank.value,p_tier:Number(tierInput.value)});communityCache.clear();closePanel();if(!remove&&rank!=='all')rank=voteRank.value;await render();if(!remove)await flyPortrait(scope.p_champion,origin).catch(()=>{});}catch{$('tier-rating-status').textContent='Не удалось сохранить оценку. Проверь вход и попробуй ещё раз.';}finally{busy=false;for(const b of choices.children)b.disabled=false;voteRank.disabled=false;$('tier-vote-save').disabled=$('tier-vote-delete').disabled=false;}
 }
 form.onsubmit=e=>{e.preventDefault();save();};$('tier-vote-delete').onclick=()=>save(true);
 window.addEventListener('rift-account-ready',()=>{if(!dialog.hidden)closePanel();myVotes=[];if(source==='community')render();});
 window.addEventListener('rift-patch-updated',()=>{const next=document.querySelector('.patch-pill')?.textContent.match(/\d+\.\d+[a-z]?/)?.[0];if(next&&next!==patch){patch=next;if(!dialog.hidden)closePanel();if(source==='community')render();}});
 fetch('current-patch.json',{cache:'no-cache',signal:AbortSignal.timeout(12000)}).then(r=>r.ok?r.json():null).then(data=>{const next=data?.current?.version;if(/^\d+\.\d+[a-z]?$/.test(next)&&next!==patch){patch=next;if(!dialog.hidden)closePanel();if(source==='community')render();}}).catch(()=>{});
 fetch('champion-stats.json',{cache:'no-cache',signal:AbortSignal.timeout(12000)}).then(r=>{if(!r.ok)throw Error('Source failed');return r.json();}).then(data=>{if(data.schema!==1||data.region!=='CN'||!Array.isArray(data.rows))throw Error('Invalid source');stats=data;if(source==='official')render();}).catch(()=>{if(source==='official')$('tier-status').textContent='Китайский источник временно недоступен.';});
 render();
})();






