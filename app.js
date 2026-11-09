// Общие данные загружаются из data.js. Избранное хранится только в этом браузере.
const data = window.RIFT_DATA;
let favorites = [];
try {
  favorites = JSON.parse(localStorage.getItem("rift-favorites") || "[]");
  if (!Array.isArray(favorites)) favorites = [];
} catch {}
function paintFavorites() {
  document.querySelectorAll("[data-favorite]").forEach((b) => {
    const on = favorites.includes(b.dataset.favorite);
    b.setAttribute("aria-pressed", String(on));
    b.textContent = b.classList.contains("favorite")
      ? on
        ? "★"
        : "☆"
      : on
        ? "★ В моём пуле"
        : "☆ В мой пул";
  });
}
document.querySelectorAll("[data-favorite]").forEach((b) =>
  b.addEventListener("click", () => {
    const id = b.dataset.favorite;
    favorites = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    try {
      localStorage.setItem("rift-favorites", JSON.stringify(favorites));
    } catch {}
    paintFavorites();
    if (document.querySelector("#champ-search")) filterChampions();
  }),
);
paintFavorites();
const aliases = { mel: "Мэл", lissandra: "Лиссандра", syndra: "Синдра" };
const esc = (x) =>
  String(x).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let scope = new URLSearchParams(location.search).get("favorites")
  ? "favorites"
  : "all";
const normalize = (x) => String(x).toLocaleLowerCase("ru").replaceAll("ё", "е");
function filterChampions() {
  const q = normalize(document.querySelector('#champ-search').value.trim());
  let count = 0;
  document.querySelectorAll('#champion-cards .champ-card').forEach(card => {
    const id = card.dataset.champion || card.querySelector('[data-favorite]').dataset.favorite;
    const name = card.dataset.name || aliases[id] || '';
    const isGuide = card.dataset.guide === 'true';
    const match = normalize(id + ' ' + name + ' ' + (aliases[id] || '')).includes(q)
      && (scope !== 'favorites' || favorites.includes(id))
      && (scope !== 'guides' || isGuide);
    card.hidden = !match;
    if (match) count++;
  });
  document.querySelector('#empty').hidden = count > 0;
  document.querySelector('#search-count').textContent = count ? 'Чемпионов: ' + count : 'Нет результатов';
  document.querySelectorAll('[data-scope]').forEach(b => b.classList.toggle('active', b.dataset.scope === scope));
}
if (document.querySelector("#champ-search")) {
  document
    .querySelector("#champ-search")
    .addEventListener("input", filterChampions);
  document.querySelectorAll("[data-scope]").forEach((b) =>
    b.addEventListener("click", () => {
      scope = b.dataset.scope;
      filterChampions();
    }),
  );
  filterChampions();
}
if (document.querySelector("#item-search")) {
  const filter = () => {
    const q = normalize(document.querySelector("#item-search").value);
    const kind = document.querySelector("#item-kind").value;
    let count = 0;
    document.querySelectorAll(".item-card").forEach((c) => {
      c.hidden = !(
        normalize(c.dataset.name).includes(q) &&
        (kind === "all" || kind === c.dataset.kind)
      );
      if (!c.hidden) count++;
    });
    document.querySelector("#items-empty").hidden = count > 0;
  };
  document.querySelector("#item-search").addEventListener("input", filter);
  document.querySelector("#item-kind").addEventListener("change", filter);
}
if (document.querySelector("#matchup-champion")) {
  const render = () => {
    const c = data.champions.find(
      (c) => c.id === document.querySelector("#matchup-champion").value,
    );
    document.querySelector("#matchup-result").innerHTML =
      `<section class="panel"><p class="eyebrow">${esc(c.name)} · АВТОРСКИЙ РАЗБОР</p><h2>Угрозы, которые стоит учитывать</h2><div class="item-grid">${c.counters.map(([n, t]) => `<article><h3>${esc(n)}</h3><p>${esc(t)}</p></article>`).join("")}</div><a class="button" href="${c.id}.html">Полный гайд ↗</a></section>`;
  };
  document
    .querySelector("#matchup-champion")
    .addEventListener("change", render);
  render();
}

// Один открытый навык; повторное нажатие скрывает описание.
document.querySelectorAll('.ability-picker').forEach(picker=>{
  const buttons=[...picker.querySelectorAll('.ability-button')];
  buttons.forEach((button,index)=>{
    button.addEventListener('click',()=>{
      const open=button.getAttribute('aria-expanded')!=='true';
      buttons.forEach(item=>{
        const selected=item===button&&open;
        item.setAttribute('aria-expanded',String(selected));
        document.getElementById(item.getAttribute('aria-controls')).hidden=!selected;
      });
    });
    button.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight')next=(index+1)%buttons.length;
      if(event.key==='ArrowLeft')next=(index-1+buttons.length)%buttons.length;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=buttons.length-1;
      if(next!==undefined){event.preventDefault();buttons[next].focus();}
    });
  });
});

// Переключение сборки меняет предметы, руны и заклинания одновременно.
document.querySelectorAll('.champion-builds').forEach(section=>{
  const tabs=[...section.querySelectorAll('.build-tab')];
  function select(tab){tabs.forEach(item=>{const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!active;});}
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>select(tab));
    tab.addEventListener('keydown',event=>{
      let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;
      if(next!==undefined){event.preventDefault();select(tabs[next]);tabs[next].focus();}
    });
  });
});

// Подсказка по значку и ситуативная замена в выбранной сборке.
document.querySelectorAll('.build-panel').forEach(panel=>{
  const info=panel.querySelector('.build-item-info');
  function closeDetails(){info.hidden=true;panel.querySelectorAll('.build-item-button').forEach(b=>{b.setAttribute('aria-expanded','false');b.classList.remove('is-active');});info.querySelectorAll('.build-asset-detail').forEach(a=>a.hidden=true);}
  panel.querySelectorAll('.build-item-button').forEach(button=>{
    button.setAttribute('aria-controls',info.id);
    button.addEventListener('click',()=>{
      const wasOpen=button.getAttribute('aria-expanded')==='true';closeDetails();
      if(wasOpen)return;
      const detail=[...info.querySelectorAll('.build-asset-detail')].find(a=>a.dataset.detailKey===button.dataset.itemKey);
      if(!detail)return;
      const anchor=button.closest('.build-group')||button.closest('.situation-result');
      if(anchor)anchor.insertAdjacentElement('afterend',info);
      detail.hidden=false;info.hidden=false;button.setAttribute('aria-expanded','true');button.classList.add('is-active');
      info.scrollIntoView({block:info.offsetHeight>window.innerHeight*0.75?'start':'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    });
  });
  info.querySelector('.build-detail-close').addEventListener('click',closeDetails);
  panel.querySelectorAll('.equipment-button').forEach(button=>button.addEventListener('click',closeDetails));
  panel.closest('.champion-builds').querySelectorAll('.build-tab').forEach(button=>{button.addEventListener('click',closeDetails);button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key))closeDetails();});});
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){const active=panel.querySelector('.build-item-button[aria-expanded="true"]');closeDetails();active?.focus();}});
  panel.querySelectorAll('.situation-button').forEach(button=>button.addEventListener('click',()=>{
    const open=button.getAttribute('aria-expanded')!=='true';
    panel.querySelectorAll('.situation-button').forEach(item=>item.setAttribute('aria-expanded',String(item===button&&open)));
    panel.querySelectorAll('.situation-result').forEach(result=>result.hidden=!(open&&result.dataset.situationResult===button.dataset.situation));
    closeDetails();
  }));
});

// Полные варианты предметов для выбранной позиции.
document.querySelectorAll('.equipment-chooser').forEach(chooser=>{
 chooser.querySelectorAll('.equipment-button').forEach(button=>button.addEventListener('click',()=>{
  chooser.querySelectorAll('.equipment-button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  chooser.querySelectorAll('[data-equipment-panel]').forEach(panel=>panel.hidden=panel.dataset.equipmentPanel!==button.dataset.equipment);
 }));
});
// Источник и версия данных принадлежат выбранной сборке.
document.querySelectorAll('.champion-builds').forEach(section=>{
 function updateSource(){const panel=section.querySelector('.build-panel:not([hidden])');if(!panel)return;const link=section.querySelector('.builds-footer a');link.href=panel.dataset.buildSource;link.textContent='Источник: '+panel.dataset.buildSourceLabel+' ↗';const patch=section.querySelector('.build-patch');if(patch)patch.textContent='Патч '+panel.dataset.buildPatch;}
 section.querySelectorAll('.build-tab').forEach(tab=>{tab.addEventListener('click',updateSource);tab.addEventListener('keyup',updateSource);});
 updateSource();
});

// На телефоне боковая навигация открывается поверх страницы.
(() => {
 const sidebar=document.querySelector('.sidebar'),topbar=document.querySelector('.topbar');
 if(!sidebar||!topbar)return;
 const mobile=window.matchMedia('(max-width: 900px)');
 sidebar.id='site-sidebar';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='mobile-nav-toggle';toggle.setAttribute('aria-label','Открыть меню');toggle.setAttribute('aria-controls',sidebar.id);toggle.setAttribute('aria-expanded','false');toggle.innerHTML='<span aria-hidden="true">☰</span>';
 topbar.prepend(toggle);
 const close=document.createElement('button');close.type='button';close.className='mobile-nav-close';close.setAttribute('aria-label','Закрыть меню');close.innerHTML='<span aria-hidden="true">×</span>';sidebar.prepend(close);
 const backdrop=document.createElement('button');backdrop.type='button';backdrop.className='mobile-nav-backdrop';backdrop.setAttribute('aria-label','Закрыть меню');backdrop.tabIndex=-1;document.body.append(backdrop);
 const workspace=document.querySelector('.workspace');let open=false;
 function setOpen(value,restore=true){
  open=Boolean(value&&mobile.matches);document.body.classList.toggle('nav-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');
  sidebar.inert=mobile.matches&&!open;
  if(open){sidebar.setAttribute('role','dialog');sidebar.setAttribute('aria-modal','true');sidebar.setAttribute('aria-label','Навигация');if(workspace)workspace.inert=true;close.focus();}
  else{sidebar.removeAttribute('role');sidebar.removeAttribute('aria-modal');sidebar.removeAttribute('aria-label');if(workspace)workspace.inert=false;if(restore&&mobile.matches)toggle.focus();}
 }
 toggle.addEventListener('click',()=>setOpen(!open));close.addEventListener('click',()=>setOpen(false));backdrop.addEventListener('click',()=>setOpen(false));
 sidebar.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setOpen(false,false)));
 document.addEventListener('keydown',event=>{
  if(!open)return;if(event.key==='Escape'){event.preventDefault();setOpen(false);return;}
  if(event.key==='Tab'){const focusable=[...sidebar.querySelectorAll('button,a[href],input,select,[tabindex="0"]')].filter(e=>!e.disabled&&e.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
 });
 mobile.addEventListener('change',()=>setOpen(false,false));document.body.classList.add('nav-enhanced');setOpen(false,false);
})();

// Подключает порядок прокачки на страницах чемпионов.
if(document.querySelector('.champion-builds')){const script=document.createElement('script');script.src='skill-orders.js';document.body.append(script);}
