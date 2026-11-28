(() => {
  const host = document.querySelector('.champion-stats');
  if (!host || document.getElementById('cs-metric-chart')) return;
  const panel = document.createElement('div');
  panel.className = 'cs-trend'; panel.id='cs-metric-chart'; panel.hidden=true;
  panel.setAttribute('role','region'); panel.setAttribute('aria-label','История статистики');
  panel.innerHTML='<div class="cs-trend-controls"><strong class="cs-chart-heading"></strong><label>Период <select aria-label="Период графика"><option value="7">7 дней</option><option value="30">30 дней</option></select></label><button type="button" class="cs-chart-close" aria-label="Закрыть график">×</button></div><p class="cs-trend-note"></p><div class="cs-trend-plot"></div><p class="cs-trend-point" aria-live="polite"></p>';
  const hero=host.closest('.character-profile');
  if(hero){panel.classList.add('cs-trend-below');hero.after(panel);}else host.append(panel);
  const names={win:'Победы',pick:'Пики',ban:'Баны'}, buttons={};
  let metric='win';
  for(const key of Object.keys(names)){
    const value=host.querySelector('[data-cs="'+key+'"]'), old=value.parentElement;
    const button=document.createElement('button'); button.type='button';button.className='cs-metric-button';
    button.setAttribute('aria-label','Статистика: '+names[key]);button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','false');
    while(old.firstChild)button.append(old.firstChild);old.replaceWith(button);buttons[key]=button;
    button.addEventListener('click',()=>{const close=!panel.hidden&&metric===key;metric=key;panel.hidden=close;for(const [id,b] of Object.entries(buttons))b.setAttribute('aria-expanded',String(!close&&id===metric));if(!close)load();else requestId++;});
  }
  panel.querySelector('.cs-chart-close').addEventListener('click',()=>{panel.hidden=true;requestId++;for(const button of Object.values(buttons))button.setAttribute('aria-expanded','false');buttons[metric].focus();});
  const controls=panel.querySelector('.cs-trend-controls'),note=panel.querySelector('.cs-trend-note'),plot=panel.querySelector('.cs-trend-plot'),pointLabel=panel.querySelector('.cs-trend-point'),period=panel.querySelector('select');
  const isLocalBlitz=location.pathname.endsWith('/blitzcrank.html')&&['127.0.0.1','localhost'].includes(location.hostname);
  let demo=isLocalBlitz,history,requestId=0;
  const today=new Date();
  const demoPoints=Array.from({length:30},(_,i)=>({date:new Date(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()-29+i)).toISOString().slice(0,10),win:Math.round((46+Math.random()*8)*100)/100,pick:Math.round((3+Math.random()*9)*100)/100,ban:Math.round(Math.random()*40*100)/100}));
  if(isLocalBlitz){const label=document.createElement('label');label.className='cs-demo-switch';const input=document.createElement('input');input.type='checkbox';input.checked=true;label.append(input,' Демо: случайные значения');controls.append(label);input.addEventListener('change',()=>{demo=input.checked;load();});}
  const dateText=date=>new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'));
  const number=value=>value.toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
  const day=date=>Date.parse(date+'T00:00:00Z')/86400000;
  function color(value){if(metric==='pick')return '#f2eef7';if(metric==='ban'){const t=Math.min(value/40,1);return `hsl(28 ${45+t*50}% ${85-t*22}%)`;}return value>=50?`hsl(145 58% ${73-Math.min((value-50)/10,1)*12}%)`:value>=48?`hsl(32 95% ${72-(50-value)*3}%)`:`hsl(${8-Math.min((48-value)/8,1)*8} 92% ${76-Math.min((48-value)/8,1)*14}%)`;}
  function render(){
    panel.querySelector('.cs-chart-heading').textContent=names[metric];
    const all=demo?demoPoints:history?.series?.[[host.dataset.champion,host.dataset.rank,host.dataset.lane].join('|')]||[];
    const end=all.at(-1)?.date;
    const points=all.filter(p=>day(p.date)>=day(end)-(Number(period.value)-1)&&Number.isFinite(p[metric])).map(p=>({date:p.date,value:p[metric]}));
    plot.replaceChildren();pointLabel.textContent='';note.classList.toggle('is-demo',demo);
    if(!points.length){note.textContent='История этого показателя ещё не накоплена для выбранного ранга и линии.';return;}
    const last=points.at(-1),change=last.value-points[0].value;
    note.textContent=demo?'ДЕМО · Случайные значения, не статистика матчей.':points.length<2?'Пока сохранён один день. График появится после следующей даты от источника.':`${change>=0?'↑':'↓'} ${number(Math.abs(change))} п.п. · ${dateText(points[0].date)}–${dateText(last.date)}`;
    pointLabel.textContent=(demo?'Демо · ':'')+last.date+' · '+number(last.value)+'%';pointLabel.style.color=color(last.value);
    if(points.length<2)return;
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 440 165');svg.setAttribute('role','img');svg.setAttribute('aria-label',(demo?'Демонстрационный график: ':'История: ')+names[metric]);
    const values=points.map(p=>p.value),low=Math.max(0,Math.floor(Math.min(...values,...(metric==='win'?[50]:[]))-1)),high=Math.min(100,Math.ceil(Math.max(...values,...(metric==='win'?[50]:[]))+1));
    const x=p=>42+(day(p.date)-day(points[0].date))/(day(last.date)-day(points[0].date))*380,y=value=>12+(high-value)/(high-low)*118;
    function el(tag,attrs,text){const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;svg.append(e);return e;}
    const levels=[...new Set([low,metric==='win'?50:Math.round((low+high)/2),high])];for(const v of levels){el('line',{x1:42,x2:422,y1:y(v),y2:y(v),class:metric==='win'&&v===50?'cs-chart-baseline':'cs-chart-grid'});el('text',{x:34,y:y(v)+3,'text-anchor':'end'},v+'%');}
    const defs=document.createElementNS(ns,'defs'),gradient=document.createElementNS(ns,'linearGradient');gradient.id='cs-chart-color';gradient.setAttribute('gradientUnits','userSpaceOnUse');gradient.setAttribute('x1','0');gradient.setAttribute('x2','0');gradient.setAttribute('y1','12');gradient.setAttribute('y2','130');
    const stops=[high,...(metric==='win'?[50,49.9999,48,47.9999]:[]),low].filter(v=>v>=low&&v<=high).sort((a,b)=>b-a);for(const v of stops){const stop=document.createElementNS(ns,'stop');stop.setAttribute('offset',String((high-v)/(high-low)));stop.setAttribute('stop-color',color(v));gradient.append(stop);}defs.append(gradient);svg.append(defs);
    el('polyline',{points:points.map(p=>x(p)+','+y(p.value)).join(' '),fill:'none',class:'cs-chart-line',style:'stroke:url(#cs-chart-color)'});
    for(const p of points){const circle=el('circle',{cx:x(p),cy:y(p.value),r:4,tabindex:0,class:'cs-chart-dot',style:'fill:'+color(p.value),'aria-label':p.date+': '+number(p.value)+'%'});const title=document.createElementNS(ns,'title');title.textContent=p.date+' · '+number(p.value)+'%';circle.append(title);const show=()=>{pointLabel.textContent=(demo?'Демо · ':'')+p.date+' · '+number(p.value)+'%';pointLabel.style.color=color(p.value);};circle.addEventListener('pointerenter',show);circle.addEventListener('focus',show);circle.addEventListener('click',show);}
    el('text',{x:42,y:153},dateText(points[0].date));el('text',{x:422,y:153,'text-anchor':'end'},dateText(last.date));plot.append(svg);
  }
  async function load(){if(panel.hidden)return;const id=++requestId;if(demo){render();return;}note.textContent='Загружаем историю…';plot.replaceChildren();pointLabel.textContent='';panel.querySelector('.cs-chart-heading').textContent=names[metric];try{const res=await fetch('champion-stats-history.json',{cache:'no-cache',signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error();const data=await res.json();if(data.schema!==1||data.region!=='CN'||!data.series)throw Error();if(id!==requestId)return;history=data;render();}catch{if(id!==requestId)return;if(history)render();else note.textContent='История временно недоступна.';}}
  period.addEventListener('change',render);host.addEventListener('stats:updated',load);
})();
