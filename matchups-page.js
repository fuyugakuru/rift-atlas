// Matchup explorer. Lists and advice come from the existing champion pages.
(() => {
  'use strict';
  const host=document.querySelector('.mx-page'), champions=window.RIFT_MATCHUPS;
  if(!host||!Array.isArray(champions))return;
  const byId=new Map(champions.map(c=>[c.id,c]));
  const labels={baron:'Барона',jungle:'Лес',mid:'Мид',dragon:'Дракона',support:'Поддержка'};
  const $=id=>document.getElementById(id);
  const normalize=s=>s.normalize('NFKC').toLocaleLowerCase('ru').replaceAll('ё','е').replace(/[^\p{L}\p{N}]/gu,'');
  let params=new URLSearchParams(location.search),selected=byId.get(params.get('champion'))||null;
  let lane=params.get('lane'), mode=params.get('mode')==='enemy'?'enemy':'own';
  let navigationReady=false,restoringHistory=false;
  let view=params.get('view')==='synergy'?'synergy':'opponents';
  let rivalFilter='all', visibleLimit=20, synergyLimit=8;
  let rank='1', snapshot=null, snapshotId=null, loadEpoch=0, checking=false, checkedAt=null;
  let pickRows=[];
  const snapshots=new Map(),rankNames={'1':'Алмаз+','2':'Мастер+','3':'Претендент','4':'CN: 峡谷之巅'};
  const rankedOptions=[['1','Алмаз+'],['2','Мастер+'],['3','Грандмастер'],['4','Претендент'],['sovereign','Суверен']];
  const dateLabel=value=>new Intl.DateTimeFormat('ru-RU',{timeZone:'UTC'}).format(new Date(value));
  function selectedRows(){return snapshot?.rows?.filter(r=>r.rank===rank&&r.lane===lane)||[];}
  const communityView=()=>$('mx-stats-source').value==='community';
  const patch=()=>document.querySelector('.patch-pill')?.textContent.match(/\d+\.\d+[a-z]?/i)?.[0]||'7.3f';
  window.RiftMatchups={context:()=>({champion:selected?.id||null,lane,patch:patch(),rank:communityView()?rank:'all'}),refresh:()=>{statsStatus();allRivals();}};
  function notifyContext(){window.dispatchEvent(new CustomEvent('rift-matchup-context'));}
  function statsStatus(){if(!selected)return;
    if(communityView()){
      const choices=[['all','Все ранги'],['diamond','Алмаз'],['master','Мастер'],['grandmaster','Грандмастер'],['challenger','Претендент'],['sovereign','Суверен']];if(!choices.some(([id])=>id===rank))rank='all';$('mx-rank').replaceChildren();for(const [id,text] of choices){const o=element('option','',text);o.value=id;$('mx-rank').append(o);}$('mx-rank').value=rank;$('mx-rank').disabled=false;$('mx-rank').title='Ранг, указанный игроком в отчёте';return;
    }
    const available=Object.keys(rankNames).filter(id=>snapshot?.rows?.some(r=>r.lane===lane&&r.rank===id));
    if(available.length&&!available.includes(rank))rank=available[0];
    $('mx-rank').replaceChildren();
    for(const [id,name] of rankedOptions){const o=element('option','',name+(available.includes(id)?'':' — нет данных'));o.value=id;o.disabled=!available.includes(id);$('mx-rank').append(o);}$('mx-rank').value=rank;$('mx-rank').disabled=!available.length;$('mx-rank').title='Названия рангов настроены для сайта; исходная выборка указана рядом со статистикой.';
  }
  async function loadStats(){if(!selected)return;const id=selected.id;if(snapshotId===id){statsStatus();return;}const turn=++loadEpoch;snapshotId=id;snapshot=null;checking=true;statsStatus();
    try{if(!snapshots.has(id)){const response=await fetch('assets/matchups/'+encodeURIComponent(id)+'.json',{cache:'no-cache',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();if(data.schema!==1||data.champion!==id||data.region!=='CN'||!Array.isArray(data.rows)||!data.rows.every(r=>byId.has(r.opponent)&&rankNames[r.rank]&&labels[r.lane]&&Number.isFinite(r.win)&&r.win>=0&&r.win<=100&&Number.isFinite(Date.parse(r.date))))throw Error('Invalid matchup data');snapshots.set(id,data);}if(turn===loadEpoch)snapshot=snapshots.get(id);
    }catch{if(turn===loadEpoch)snapshot=null;}finally{if(turn===loadEpoch){checking=false;statsStatus();allRivals();}}}
  function element(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;}
  function image(src,cls){const img=element('img',cls);img.src=src;img.alt='';img.loading='lazy';img.decoding='async';return img;}
  function closePicker(focus=false){$('mx-picker').hidden=true;$('mx-picker-toggle').setAttribute('aria-expanded','false');if(focus)$('mx-picker-toggle').focus();}
  function updateURL(){
    const p=new URLSearchParams();if(params.get('review')==='1')p.set('review','1');if(selected){p.set('champion',selected.id);p.set('lane',lane);}if(view==='synergy')p.set('view','synergy');if(mode==='enemy')p.set('mode',mode);
    const url=location.pathname+(p.size?'?'+p:'')+location.hash;
    if(restoringHistory)return;
    const state={...history.state,riftMatchups:true};
    if(!navigationReady)history.replaceState(state,'',url);
    else if(url!==location.pathname+location.search+location.hash)history.pushState(state,'',url);
  }
  function renderPicker(){const q=normalize($('mx-search').value);let count=0;
    for(const button of $('mx-champions').children){const c=byId.get(button.dataset.champion);button.hidden=q&&!normalize(c.name+' '+c.id).includes(q);button.setAttribute('aria-pressed',String(c.id===selected?.id));if(!button.hidden)count++;}
    $('mx-search-empty').hidden=count!==0;
  }
  for(const c of [...champions].sort((a,b)=>a.name.localeCompare(b.name,'ru'))){
    const button=element('button','mx-champion');button.type='button';button.dataset.champion=c.id;
    button.append(image('assets/champions/faces/'+c.id+'.webp'),element('span','',c.name));
    button.addEventListener('click',()=>{selected=c;lane=null;render();closePicker(true);});$('mx-champions').append(button);
  }
  // A missing pairing has no assessment. Never infer a 50% rate or copy an
  // overall champion win rate into a head-to-head matchup.
  function pickMap(){const sourceRank=!communityView()&&Object.hasOwn(rankNames,rank)?rank:'1';return new Map(pickRows.filter(r=>r.lane===lane&&r.rank===sourceRank).map(r=>[r.champion,r.pick]));}
  function allRivals(){if(!selected)return;
    const role=selected.roles[lane]||{hard:[],easy:[]};
    const hard=new Map(role.hard.map(e=>[e.id,e])),easy=new Map(role.easy.map(e=>[e.id,e]));
    const stats=new Map(selectedRows().map(r=>[r.opponent,r]));
    const q=normalize($('mx-rival-search').value),picks=pickMap();
    const rows=champions.filter(c=>c.id!==selected.id&&(c.lanes.includes(lane)||Object.hasOwn(c.roles,lane))).map(c=>({champion:c,kind:hard.has(c.id)?'hard':easy.has(c.id)?'easy':'unknown',advice:hard.get(c.id)||easy.get(c.id)}));
    const filtered=rows.filter(r=>(rivalFilter==='all'||r.kind===rivalFilter)&&(!q||normalize(r.champion.name+' '+r.champion.id).includes(q))).sort((a,b)=>(picks.get(b.champion.id)??-1)-(picks.get(a.champion.id)??-1)||a.champion.name.localeCompare(b.champion.name,'ru'));
    $('mx-all-count').textContent=labels[lane]+' · '+filtered.length+' из '+rows.length;
    $('mx-all-list').replaceChildren();$('mx-all-empty').hidden=filtered.length>0;
    document.querySelectorAll('[data-mx-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mxFilter===rivalFilter)));
    for(const row of filtered.slice(0,visibleLimit)){
      const c=row.champion,details=element('details','mx-rival mx-rival-'+row.kind),summary=element('summary','mx-rival-summary');
      const identity=element('span','mx-rival-identity');identity.append(image('assets/champions/faces/'+c.id+'.webp'),element('span','',c.name));
      const classification=element('span','mx-rival-kind',row.kind==='hard'?'Контрпик':row.kind==='easy'?'Удобный':'Без оценки');
      const stat=communityView()?window.RiftMatchupCommunity?.getStats(c.id):stats.get(c.id);
      const origin=stat?(communityView()?'Игроки сайта · '+stat.reports+' отчётов · '+stat.players+' игроков':'Китай · '+rankNames[rank]+' · '+dateLabel(stat.date)+' · RiftGG'):'Нет статистики этой пары';
      const rate=(label,loss=false)=>{const roundedWin=stat?Math.round(stat.win*10)/10:null,number=stat?(loss?100-roundedWin:roundedWin):null,span=element('span','mx-pair-rate',number===null?'—':number.toLocaleString('ru-RU',{minimumFractionDigits:1,maximumFractionDigits:1})+'%');span.setAttribute('aria-label',label+': '+(stat?span.textContent+', '+origin:'нет данных'));span.title=origin;if(stat)span.dataset.band=loss?'loss':stat.win>=50?'good':stat.win>=48?'middle':'bad';return span;};
      if(communityView()&&stat)classification.append(element('small','mx-report-count',stat.reports+' отчётов'));
      summary.append(identity,classification,rate('Победы '+selected.name),rate('Поражения '+selected.name,true));
      const body=element('div','mx-rival-body'),actions=element('div','mx-pair-actions'),result=element('button','mx-community-open mx-add-result','Добавить результат');result.type='button';result.addEventListener('click',()=>window.RiftMatchupCommunity?.open({...window.RiftMatchups.context(),opponent:c.id}));actions.append(element('h3','',selected.name+' против '+c.name),result);body.append(actions);
      const layout=element('div','mx-matchup-layout'),media=element('div','mx-matchup-media'),videoSlot=element('div','mx-matchup-video-slot'),advice=element('div','mx-matchup-advice');
      const videoId=window.RIFT_MATCHUP_VIDEOS?.[selected.id]?.[lane]?.[c.id],hasVideo=typeof videoId==='string'&&/^[A-Za-z0-9_-]{11}$/.test(videoId),videoTitle='Видеоразбор: '+selected.name+' против '+c.name;
      media.append(element('h4','','Видеоразбор'),videoSlot);layout.append(media,advice);body.append(layout);
      function mountVideo(){videoSlot.replaceChildren();if(!hasVideo){const empty=element('div','mx-matchup-video-empty');empty.append(element('span','mx-matchup-video-mark','R'),element('p','','Видеоразбор этой пары пока не добавлен.'));videoSlot.append(empty);return;}const frame=document.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+videoId+'?playsinline=1';frame.title=videoTitle;frame.allow='encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';videoSlot.append(frame);}

      if(row.advice){advice.append(element('p','',row.advice.why));if(row.advice.tip)advice.append(element('h4','','Совет за '+selected.name),element('p','',row.advice.tip));}
      else advice.append(element('p','mx-unreviewed','Подробный разбор этой пары ещё не добавлен. Чемпион не отнесён к контрпикам или удобным соперникам.'));
      advice.append(element('p','mx-pair-missing',stat?origin+(communityView()?' · '+stat.wins+' побед / '+stat.losses+' поражений. Скриншоты проверены администратором; игрового подтверждения API нет.':'. Процент поражений рассчитан как 100% минус процент побед.'):'Победы / поражения: нет данных по этой паре.'));
      const guide=element('a','',c.name+' — навыки и сборки ↗');guide.href=c.id+'.html';advice.append(guide);const tips=element('section','mx-inline-community');body.append(tips);details.append(summary,body);
      details.addEventListener('toggle',()=>{if(details.open){mountVideo();window.RiftMatchupTips?.mount(tips,{...window.RiftMatchups.context(),opponent:c.id});for(const other of $('mx-all-list').querySelectorAll('details'))if(other!==details)other.open=false;}else videoSlot.replaceChildren();});
      $('mx-all-list').append(details);
    }
    $('mx-more').hidden=filtered.length<=visibleLimit;$('mx-more').textContent='Показать ещё · осталось '+Math.max(0,filtered.length-visibleLimit);
  }
  function chooseStart(id,tab='opponents'){selected=byId.get(id);view=tab;lane=null;render();closePicker();}
  const startIds=[...champions].sort((a,b)=>a.name.localeCompare(b.name,'ru')).map(c=>c.id);
  for(const id of startIds){const c=byId.get(id);if(!c)continue;const b=element('button','mx-start-champion');b.type='button';b.append(image('assets/champions/faces/'+id+'.webp'),element('span','',c.name));b.dataset.startChampion=id;$('mx-start-champions').append(b);}
  $('mx-start-champions').addEventListener('click',e=>{const b=e.target.closest('[data-start-champion]');if(b&&$('mx-start-champions').contains(b))chooseStart(b.dataset.startChampion);});
  for(const id of ['yasuo','xayah','lucian']){const pair=(window.RIFT_SYNERGIES||[]).find(p=>p.a===id||p.b===id);if(!pair)continue;const a=byId.get(pair.a),b=byId.get(pair.b);if(!a||!b)continue;const card=element('button','mx-start-pair');card.type='button';const faces=element('span','mx-start-pair-faces');faces.append(image('assets/champions/faces/'+a.id+'.webp'),element('span','','+'),image('assets/champions/faces/'+b.id+'.webp'));card.append(faces,element('strong','',a.name+' + '+b.name),element('span','mx-start-pair-link','Смотреть синергию ↗'));card.addEventListener('click',()=>chooseStart(id,'synergy'));$('mx-start-pairs').append(card);}
  function renderSynergies(){
    const list=$('mx-synergy-list');list.replaceChildren();if(!selected)return;
    const q=normalize($('mx-ally-search').value),pairs=(window.RIFT_SYNERGIES||[]).filter(p=>p.a===selected.id||p.b===selected.id).map(p=>({pair:p,ally:byId.get(p.a===selected.id?p.b:p.a)})).filter(p=>p.ally&&(!q||normalize(p.ally.name+' '+p.ally.id).includes(q))).sort((a,b)=>a.ally.name.localeCompare(b.ally.name,'ru'));
    $('mx-synergy-empty').hidden=pairs.length>0;$('mx-synergy-empty').textContent=q?'Союзники не найдены.':'Для этого чемпиона союзные пары пока не добавлены.';$('mx-synergy-count').textContent='Показано '+Math.min(synergyLimit,pairs.length)+' из '+pairs.length;$('mx-synergy-more').hidden=pairs.length<=synergyLimit;$('mx-synergy-more').textContent='Показать ещё · осталось '+Math.max(0,pairs.length-synergyLimit);
    for(const {pair:p,ally} of pairs.slice(0,synergyLimit)){const card=element('article','mx-synergy-card'),head=element('div','mx-synergy-head');head.append(image('assets/champions/faces/'+ally.id+'.webp'),element('h3','',ally.name));card.append(head,element('p','mx-synergy-reason',p.why),element('p','',p.tip));const link=element('a','','Навыки и сборки ↗');link.href=ally.id+'.html';card.append(link);list.append(card);}
  }
  function renderView(){const chosen=!!selected;$('mx-start').hidden=chosen;document.querySelector('.mx-lane-row').hidden=!chosen||view==='synergy';document.querySelector('.mx-all').hidden=!chosen||view==='synergy';$('mx-synergy').hidden=!chosen||view!=='synergy';$('mx-view-tabs').hidden=!chosen;document.querySelectorAll('[data-mx-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mxView===view)));if(chosen){$('mx-selection-label').textContent=view==='synergy'?'ТВОЙ ЧЕМПИОН':mode==='own'?'ТВОЙ ЧЕМПИОН':'ЧЕМПИОН ПРОТИВНИКА';renderSynergies();}}
  function render(){
    synergyLimit=8;$('mx-ally-search').value='';
    const chosen=!!selected;host.querySelector('.mx-selection').classList.toggle('is-empty',!chosen);$('mx-hero').hidden=!chosen;$('mx-guide').hidden=!chosen;$('mx-picker-toggle').innerHTML=(chosen?'Сменить чемпиона':'Выбрать чемпиона')+' <span aria-hidden="true">⌄</span>';renderView();
    if(!selected){$('mx-name').textContent='Выбери чемпиона';$('mx-subtitle').textContent='Соперники, советы и хорошие союзные пары';$('mx-selection-label').textContent='RIFT ATLAS';$('mx-hero').removeAttribute('src');renderPicker();updateURL();notifyContext();return;}
    const lanes=[...new Set([...Object.keys(selected.roles),...selected.lanes])].filter(id=>labels[id]);
    if(!lanes.includes(lane))lane=lanes[0]||'mid';
    $('mx-name').textContent=selected.name;$('mx-subtitle').textContent=selected.subtitle;
    $('mx-all-title').textContent=mode==='own'?'Все соперники':'Выбор против '+selected.name;
    $('mx-selection-label').textContent=mode==='own'?'ТВОЙ ЧЕМПИОН':'ЧЕМПИОН ПРОТИВНИКА';
    $('mx-hero').src=selected.hero;const focus={sett:['52%','0%'],malphite:['55%','15%'],'aurelion-sol':['65%','10%'],chogath:['60%','10%'],nautilus:['55%','10%']}[selected.id]||['60%','0%'];$('mx-hero').style.setProperty('--mx-hero-x',focus[0]);$('mx-hero').style.setProperty('--mx-hero-y',focus[1]);$('mx-guide').href=selected.id+'.html';$('mx-lanes').replaceChildren();
    for(const id of lanes){const button=element('button','mx-lane');button.type='button';button.setAttribute('aria-pressed',String(id===lane));button.append(image('assets/lanes/'+id+'.png'),element('span','',labels[id]));button.addEventListener('click',()=>{lane=id;render();});$('mx-lanes').append(button);}
    document.querySelectorAll('[data-mx-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mxMode===mode)));
    visibleLimit=20;rivalFilter='all';$('mx-rival-search').value='';renderPicker();updateURL();
    loadStats();allRivals();renderView();notifyContext();
  }
  document.querySelectorAll('[data-mx-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.mxView;renderView();updateURL();}));
  $('mx-ally-search').addEventListener('input',()=>{synergyLimit=8;renderSynergies();});
  $('mx-synergy-more').addEventListener('click',()=>{synergyLimit+=8;renderSynergies();});
  $('mx-picker-toggle').addEventListener('click',()=>{const open=$('mx-picker').hidden;$('mx-picker').hidden=!open;$('mx-picker-toggle').setAttribute('aria-expanded',String(open));if(open){$('mx-search').value='';renderPicker();$('mx-search').focus();}});
  $('mx-picker-close').addEventListener('click',()=>closePicker(true));$('mx-search').addEventListener('input',renderPicker);
  $('mx-picker').addEventListener('keydown',e=>{if(e.key==='Escape')closePicker(true);});
  $('mx-rival-search').addEventListener('input',()=>{visibleLimit=20;allRivals();});
  document.querySelectorAll('[data-mx-filter]').forEach(b=>b.addEventListener('click',()=>{rivalFilter=b.dataset.mxFilter;visibleLimit=20;allRivals();}));
  $('mx-more').addEventListener('click',()=>{visibleLimit+=20;allRivals();});
  $('mx-rank').addEventListener('change',()=>{rank=$('mx-rank').value;visibleLimit=20;statsStatus();allRivals();notifyContext();});
  $('mx-stats-source').addEventListener('change',()=>{statsStatus();allRivals();notifyContext();});
  fetch('assets/matchups/index.json',{cache:'no-cache',signal:AbortSignal.timeout(12000)}).then(r=>r.ok?r.json():null).then(index=>{if(index?.schema===1&&Number.isFinite(Date.parse(index.checkedAt))){checkedAt=index.checkedAt;statsStatus();}}).catch(()=>{});
  fetch('champion-stats.json',{cache:'no-cache',signal:AbortSignal.timeout(12000)}).then(r=>r.ok?r.json():null).then(data=>{if(data?.schema!==1||data.region!=='CN'||!Array.isArray(data.rows))return;pickRows=data.rows.filter(r=>byId.has(r.champion)&&labels[r.lane]&&Object.hasOwn(rankNames,r.rank)&&Number.isFinite(r.pick)&&r.pick>=0&&r.pick<=100);allRivals();}).catch(()=>{});
  // A direct champion link also has a single Back step to the matchup overview.
  // The marker survives reloads; Back/Forward never manufacture extra entries.
  if(selected&&!history.state?.riftMatchups){
    const deepURL=location.pathname+location.search+location.hash;
    const startParams=new URLSearchParams();if(params.get('review')==='1')startParams.set('review','1');
    history.replaceState({...history.state,riftMatchups:true},'',location.pathname+(startParams.size?'?'+startParams:'') );
    history.pushState({riftMatchups:true},'',deepURL);
  }
  window.addEventListener('popstate',()=>{
    params=new URLSearchParams(location.search);selected=byId.get(params.get('champion'))||null;lane=params.get('lane');view=params.get('view')==='synergy'?'synergy':'opponents';mode=params.get('mode')==='enemy'?'enemy':'own';
    ++loadEpoch;snapshotId=null;snapshot=null;checking=false;
    $('mx-all-list').replaceChildren();closePicker();
    restoringHistory=true;try{render();}finally{restoringHistory=false;}
  });
  render();navigationReady=true;
})();
