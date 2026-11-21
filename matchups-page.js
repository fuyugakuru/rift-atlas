// Matchup explorer. Lists and advice come from the existing champion pages.
(() => {
  'use strict';
  const host=document.querySelector('.mx-page'), champions=window.RIFT_MATCHUPS;
  if(!host||!Array.isArray(champions))return;
  const byId=new Map(champions.map(c=>[c.id,c]));
  const labels={baron:'Барона',jungle:'Лес',mid:'Мид',dragon:'Дракона',support:'Поддержка'};
  const $=id=>document.getElementById(id);
  const normalize=s=>s.normalize('NFKC').toLocaleLowerCase('ru').replaceAll('ё','е').replace(/[^\p{L}\p{N}]/gu,'');
  let params=new URLSearchParams(location.search),selected=byId.get(params.get('champion'))||byId.get('akali')||champions[0];
  let lane=params.get('lane'), mode=params.get('mode')==='enemy'?'enemy':'own';
  let rivalFilter='all', visibleLimit=20;
  function element(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;}
  function image(src,cls){const img=element('img',cls);img.src=src;img.alt='';img.loading='lazy';img.decoding='async';return img;}
  function closePicker(focus=false){$('mx-picker').hidden=true;$('mx-picker-toggle').setAttribute('aria-expanded','false');if(focus)$('mx-picker-toggle').focus();}
  function updateURL(){const p=new URLSearchParams();p.set('champion',selected.id);p.set('lane',lane);if(mode==='enemy')p.set('mode',mode);history.replaceState(null,'',location.pathname+'?'+p);}
  function renderPicker(){const q=normalize($('mx-search').value);let count=0;
    for(const button of $('mx-champions').children){const c=byId.get(button.dataset.champion);button.hidden=q&&!normalize(c.name+' '+c.id).includes(q);button.setAttribute('aria-pressed',String(c.id===selected.id));if(!button.hidden)count++;}
    $('mx-search-empty').hidden=count!==0;
  }
  for(const c of [...champions].sort((a,b)=>a.name.localeCompare(b.name,'ru'))){
    const button=element('button','mx-champion');button.type='button';button.dataset.champion=c.id;
    button.append(image('assets/champions/faces/'+c.id+'.webp'),element('span','',c.name));
    button.addEventListener('click',()=>{selected=c;lane=null;render();closePicker(true);});$('mx-champions').append(button);
  }
  // A missing pairing has no assessment. Never infer a 50% rate or copy an
  // overall champion win rate into a head-to-head matchup.
  function allRivals(){
    const role=selected.roles[lane]||{hard:[],easy:[]};
    const hard=new Map(role.hard.map(e=>[e.id,e])),easy=new Map(role.easy.map(e=>[e.id,e]));
    const q=normalize($('mx-rival-search').value);
    const rows=champions.filter(c=>c.id!==selected.id&&(c.lanes.includes(lane)||Object.hasOwn(c.roles,lane))).map(c=>({champion:c,kind:hard.has(c.id)?'hard':easy.has(c.id)?'easy':'unknown',advice:hard.get(c.id)||easy.get(c.id)}));
    const filtered=rows.filter(r=>(rivalFilter==='all'||r.kind===rivalFilter)&&(!q||normalize(r.champion.name+' '+r.champion.id).includes(q))).sort((a,b)=>a.champion.name.localeCompare(b.champion.name,'ru'));
    $('mx-all-count').textContent=labels[lane]+' · '+filtered.length+' из '+rows.length;
    $('mx-all-list').replaceChildren();$('mx-all-empty').hidden=filtered.length>0;
    document.querySelectorAll('[data-mx-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mxFilter===rivalFilter)));
    for(const row of filtered.slice(0,visibleLimit)){
      const c=row.champion,details=element('details','mx-rival mx-rival-'+row.kind),summary=element('summary','mx-rival-summary');
      const identity=element('span','mx-rival-identity');identity.append(image('assets/champions/faces/'+c.id+'.webp'),element('span','',c.name));
      const classification=element('span','mx-rival-kind',row.kind==='hard'?'Контрпик':row.kind==='easy'?'Удобный':'Без оценки');
      const rate=label=>{const span=element('span','mx-pair-rate','—');span.setAttribute('aria-label',label+': нет подтверждённых данных');span.title='Нет подтверждённой статистики этой пары';return span;};
      summary.append(identity,classification,rate('Победы '+selected.name),rate('Поражения '+selected.name));
      const body=element('div','mx-rival-body');body.append(element('h3','',selected.name+' против '+c.name));
      if(row.advice){body.append(element('p','',row.advice.why));if(row.advice.tip)body.append(element('h4','','Совет за '+selected.name),element('p','',row.advice.tip));}
      else body.append(element('p','mx-unreviewed','Подробный разбор этой пары ещё не добавлен. Чемпион не отнесён к контрпикам или удобным соперникам.'));
      body.append(element('p','mx-pair-missing','Победы / поражения: нет подтверждённых данных по этой паре.'));
      const guide=element('a','',c.name+' — навыки и сборки ↗');guide.href=c.id+'.html';body.append(guide);details.append(summary,body);
      details.addEventListener('toggle',()=>{if(details.open)for(const other of $('mx-all-list').querySelectorAll('details'))if(other!==details)other.open=false;});
      $('mx-all-list').append(details);
    }
    $('mx-more').hidden=filtered.length<=visibleLimit;$('mx-more').textContent='Показать ещё · осталось '+Math.max(0,filtered.length-visibleLimit);
  }
  function render(){
    const lanes=[...new Set([...Object.keys(selected.roles),...selected.lanes])].filter(id=>labels[id]);
    if(!lanes.includes(lane))lane=lanes[0]||'mid';
    $('mx-name').textContent=selected.name;$('mx-subtitle').textContent=selected.subtitle;
    $('mx-all-title').textContent=mode==='own'?'Все соперники':'Выбор против '+selected.name;
    host.querySelector('.mx-stats-note').textContent='Победы и поражения '+selected.name+' в матчах против соперника. Если подтверждённой статистики пары нет, показан прочерк.';
    $('mx-selection-label').textContent=mode==='own'?'ТВОЙ ЧЕМПИОН':'ЧЕМПИОН ПРОТИВНИКА';
    $('mx-hero').src=selected.hero;$('mx-guide').href=selected.id+'.html';$('mx-lanes').replaceChildren();
    for(const id of lanes){const button=element('button','mx-lane');button.type='button';button.setAttribute('aria-pressed',String(id===lane));button.append(image('assets/lanes/'+id+'.png'),element('span','',labels[id]));button.addEventListener('click',()=>{lane=id;render();});$('mx-lanes').append(button);}
    document.querySelectorAll('[data-mx-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mxMode===mode)));
    visibleLimit=20;rivalFilter='all';$('mx-rival-search').value='';allRivals();renderPicker();updateURL();
  }
  $('mx-picker-toggle').addEventListener('click',()=>{const open=$('mx-picker').hidden;$('mx-picker').hidden=!open;$('mx-picker-toggle').setAttribute('aria-expanded',String(open));if(open){$('mx-search').value='';renderPicker();$('mx-search').focus();}});
  $('mx-picker-close').addEventListener('click',()=>closePicker(true));$('mx-search').addEventListener('input',renderPicker);
  $('mx-picker').addEventListener('keydown',e=>{if(e.key==='Escape')closePicker(true);});
  document.querySelectorAll('[data-mx-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mxMode;render();}));
  $('mx-rival-search').addEventListener('input',()=>{visibleLimit=20;allRivals();});
  document.querySelectorAll('[data-mx-filter]').forEach(b=>b.addEventListener('click',()=>{rivalFilter=b.dataset.mxFilter;visibleLimit=20;allRivals();}));
  $('mx-more').addEventListener('click',()=>{visibleLimit+=20;allRivals();});
  render();
})();
