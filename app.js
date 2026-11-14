/* Google Analytics — Wild Rift Atlas */

window.dataLayer = window.dataLayer || [];

window.gtag = function() {
  window.dataLayer.push(arguments);
};

window.gtag('js', new Date());
window.gtag('config', 'G-QNZ4VFYFE7');

const analyticsScript = document.createElement('script');
analyticsScript.async = true;
analyticsScript.src =
  'https://www.googletagmanager.com/gtag/js?id=G-QNZ4VFYFE7';

document.head.appendChild(analyticsScript);

/* Конец подключения Google Analytics */


// Общие данные загружаются из data.js. Избранное хранится только в этом браузере.
const data = window.RIFT_DATA;
// Пробная галерея образов. YouTube подключается только по нажатию.
document.querySelectorAll('.champion-skins').forEach(section=>{
  const strip=section.querySelector('.skin-choices');
  strip.addEventListener('wheel',event=>{
    if(event.ctrlKey||event.deltaX||!event.deltaY||strip.scrollWidth<=strip.clientWidth)return;
    const delta=event.deltaY*(event.deltaMode===1?28:event.deltaMode===2?strip.clientWidth:1);
    const next=Math.max(0,Math.min(strip.scrollWidth-strip.clientWidth,strip.scrollLeft+delta));
    if(Math.abs(next-strip.scrollLeft)>0.5){event.preventDefault();strip.scrollLeft=next;}
  },{passive:false});
  const skins=JSON.parse(section.querySelector('.skin-data').textContent);
  const choices=[...section.querySelectorAll('.skin-choice')],image=section.querySelector('.skin-main-image'),name=section.querySelector('.skin-current-name'),watch=section.querySelector('.skin-watch'),slot=section.querySelector('.skin-video-slot'),source=section.querySelector('.skin-video-source'),missing=section.querySelector('.skin-video-missing');
  let selected=0;
  choices.forEach((button,index)=>button.addEventListener('click',()=>{
    selected=index;const skin=skins[index];
    choices.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
    image.src=skin.image+'&w=1280&auto=format';image.alt=skin.name;name.textContent=skin.name;
    const badges=section.querySelector('.skin-current-badges');
    if(badges){badges.replaceChildren();const labels={base:'Базовый',standard:'Обычный',epic:'Эпический',legendary:'Легендарный',prestige:'Престижный',special:'Особый',unknown:'Редкость уточняется'};
      const badge=document.createElement('span');badge.className='skin-badge rarity-'+(skin.rarity||'unknown');badge.textContent=labels[skin.rarity]||labels.unknown;badges.append(badge);
      if(skin.exclusive){const tag=document.createElement('span');tag.className='skin-badge skin-exclusive';tag.textContent='Эксклюзивный';tag.title='Особое или ограниченное получение; может возвращаться в событиях';badges.append(tag);}
    }
    slot.replaceChildren();slot.hidden=true;watch.hidden=!skin.video;watch.textContent='▶ Смотреть эффекты';watch.setAttribute('aria-expanded','false');missing.hidden=!!skin.video;source.hidden=!skin.video;
    if(skin.video)source.href=skin.videoSource;
  }));
  watch.addEventListener('click',()=>{
    if(!slot.hidden){slot.replaceChildren();slot.hidden=true;watch.textContent='▶ Смотреть эффекты';watch.setAttribute('aria-expanded','false');return;}
    const skin=skins[selected];if(!skin.video)return;
    const frame=document.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+skin.video+'?playsinline=1'+(skin.videoStart?'&start='+Number(skin.videoStart):'')+(skin.videoEnd?'&end='+Number(skin.videoEnd):'');frame.title='Эффекты образа: '+skin.name;frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';slot.append(frame);slot.hidden=false;watch.textContent='Скрыть видео';watch.setAttribute('aria-expanded','true');
  });
});
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
window.addEventListener('rift-account-favorites',event=>{
  favorites=Array.isArray(event.detail)?event.detail:[];paintFavorites();
  if(document.querySelector('#champ-search'))filterChampions();
});
document.querySelectorAll("[data-favorite]").forEach((b) =>
  b.addEventListener("click", async () => {
    const id = b.dataset.favorite;
    const account=window.RiftAccount;
    if(account?.loading){account.message('Подожди, профиль ещё загружается.');return;}
    if(account?.user){b.disabled=true;try{await account.toggleFavorite(id);}catch{account.message('Не удалось сохранить избранное. Попробуй ещё раз.',true);}finally{b.disabled=false;}return;}
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
let championLane = 'all', championRole = 'all';
function filterChampions() {
  const q = normalize(document.querySelector('#champ-search').value.trim());
  let count = 0;
  document.querySelectorAll('#champion-cards .champ-card').forEach(card => {
    const id = card.dataset.champion || card.querySelector('[data-favorite]').dataset.favorite;
    const name = card.dataset.name || aliases[id] || '';
    const isGuide = card.dataset.guide === 'true';
    const match = normalize(id + ' ' + name + ' ' + (aliases[id] || '')).includes(q)
      && (scope !== 'favorites' || favorites.includes(id))
      && (championLane === 'all' || (card.dataset.lanes || '').split(' ').includes(championLane))
      && (championRole === 'all' || (card.dataset.roles || '').split(' ').includes(championRole))
      && (scope !== 'guides' || isGuide);
    card.hidden = !match;
    if (match) count++;
  });
  document.querySelector('#empty').hidden = count > 0;
  document.querySelector('#search-count').textContent = count ? 'Чемпионов: ' + count : 'Нет результатов';
  document.querySelectorAll('[data-scope]').forEach(b => b.classList.toggle('active', b.dataset.scope === scope));
}
if (document.querySelector("#champ-search")) {
  const filterToggle=document.querySelector('#champ-filter-toggle');
  filterToggle?.addEventListener('click',()=>{
    const expanded=filterToggle.getAttribute('aria-expanded')!=='true';
    filterToggle.setAttribute('aria-expanded',String(expanded));
    document.querySelector('#champ-filters').hidden=!expanded;
  });
  document.querySelectorAll('.champ-filter').forEach(button=>button.addEventListener('click',()=>{
    const kind=button.hasAttribute('data-lane')?'lane':'role';
    if(kind==='lane')championLane=button.dataset.lane;else championRole=button.dataset.role;
    document.querySelectorAll('.champ-filter[data-'+kind+']').forEach(item=>{
      const active=item===button;
      item.classList.toggle('active',active);
      item.setAttribute('aria-pressed',String(active));
    });
    filterChampions();
  }));
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
  const cards = [...document.querySelectorAll('#items-list .item-card')];
  const itemList = document.querySelector('#items-list');
  const originalOrder = new Map(cards.map((card, index) => [card, index]));
  let itemKind = 'all', itemShop = 'all';
  const filterItems = () => {
    const query = normalize(document.querySelector('#item-search').value.trim());
    let count = 0;
    cards.forEach(card => {
      const boots = ['Ботинки', 'Улучшения ботинок'].includes(card.dataset.kind) || card.id === 'boots-of-speed';
      const kindMatches = itemKind === 'all' || (itemKind === 'Ботинки' ? boots : card.dataset.kind === itemKind);
      const shopMatches = itemShop === 'all' || card.dataset.shop.split(' ').includes(itemShop);
      card.hidden = !(normalize(card.dataset.name).includes(query) && kindMatches && shopMatches);
      if (!card.hidden) count++;
    });
    const sorted = [...cards].sort((a, b) => itemShop === 'all'
      ? originalOrder.get(a) - originalOrder.get(b)
      : (JSON.parse(a.dataset.shopOrder)[itemShop] ?? 10000) - (JSON.parse(b.dataset.shopOrder)[itemShop] ?? 10000)
        || originalOrder.get(a) - originalOrder.get(b));
    sorted.forEach(card => itemList.append(card));
    document.querySelector('#items-empty').hidden = count > 0;
    document.querySelector('#item-filter-count').textContent = 'Найдено: ' + count + ' из ' + cards.length;
  };
  const toggle = document.querySelector('#item-filter-toggle');
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(expanded));
    document.querySelector('#item-filters').hidden = !expanded;
  });
  document.querySelectorAll('[data-item-filter]').forEach(button => button.addEventListener('click', () => {
    const group = button.dataset.itemFilter;
    if (group === 'kind') itemKind = button.dataset.value; else itemShop = button.dataset.value;
    document.querySelectorAll('[data-item-filter="' + group + '"]').forEach(other => {
      const active = other === button;
      other.classList.toggle('active', active);
      other.setAttribute('aria-pressed', String(active));
    });
    filterItems();
  }));
  document.querySelector('#item-search').addEventListener('input', filterItems);
  filterItems();
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
        const panel=document.getElementById(item.getAttribute('aria-controls'));
        panel.hidden=!selected;
        const video=panel.querySelector('.ability-video');
        if(video){
          if(!selected){video.pause();}
          else if(!video.getAttribute('src')){
            video.addEventListener('error',()=>{panel.querySelector('.ability-video-error').hidden=false;});
            video.src=video.dataset.videoSrc;
            video.load();
          }
        }
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
  const buildPanel=chooser.closest('.build-panel');
  buildPanel.querySelectorAll('[data-equipment-runes]').forEach(panel=>panel.hidden=panel.dataset.equipmentRunes!==button.dataset.equipment);
  buildPanel.querySelectorAll('[data-equipment-rune-situations]').forEach(panel=>panel.hidden=panel.dataset.equipmentRuneSituations!==button.dataset.equipment);
  buildPanel.querySelectorAll('.situation-button').forEach(item=>item.setAttribute('aria-expanded','false'));
  buildPanel.querySelectorAll('.situation-result').forEach(item=>item.hidden=true);
 }));
});
// Источник и версия данных принадлежат выбранной сборке.
document.querySelectorAll('.champion-builds').forEach(section=>{
 function updateSource(){const panel=section.querySelector('.build-panel:not([hidden])');if(!panel)return;const link=section.querySelector('.builds-footer a');if(link){link.href=panel.dataset.buildSource;link.textContent='Источник: '+panel.dataset.buildSourceLabel+' ↗';}const patch=section.querySelector('.build-patch');if(patch)patch.textContent='Патч '+panel.dataset.buildPatch;}
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

// Матчапы имеют свои вкладки линий; синхронизируются со сборкой, если линия подтверждена.
document.querySelectorAll('.champion-matchups').forEach(section=>{
 const tabs=[...section.querySelectorAll('.matchup-role-tab')];
 function select(tab){tabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!active;});section.querySelectorAll('details[open]').forEach(d=>d.open=false);}
 tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>select(tab));tab.addEventListener('keydown',event=>{const n=event.key==='ArrowRight'?(i+1)%tabs.length:event.key==='ArrowLeft'?(i-1+tabs.length)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;if(n!==null){event.preventDefault();select(tabs[n]);tabs[n].focus();}});});
 const builds=document.querySelector('.champion-builds');
 function sync(){const tab=builds?.querySelector('.build-tab[aria-selected="true"]'),label=tab?.textContent.trim(),match=tabs.find(t=>t.textContent.trim()===label);if(match)select(match);}
 if(builds)new MutationObserver(sync).observe(builds.querySelector('.build-tabs'),{subtree:true,attributes:true,attributeFilter:['aria-selected']});
});

// Поиск по полным спискам контрпиков: русское имя или латинский идентификатор.
document.querySelectorAll('.champion-matchups').forEach(section=>{
 const input=section.querySelector('.matchup-search input');if(!input)return;
 const normalize=value=>value.normalize('NFKC').toLocaleLowerCase('ru').replaceAll('ё','е').trim();
 const groups=[...section.querySelectorAll('.matchup-group')].map(group=>{const cards=[...group.querySelectorAll('.matchup-card')],count=group.querySelector('.matchup-count');let empty=null;if(cards.length){empty=document.createElement('p');empty.className='matchup-filter-empty';empty.textContent='Противник не найден.';empty.hidden=true;group.append(empty);}return{cards,count,empty};});
 input.addEventListener('input',()=>{const query=normalize(input.value);groups.forEach(({cards,count,empty})=>{let shown=0;cards.forEach(card=>{const text=normalize(card.querySelector('summary').textContent+' '+card.querySelector('a').getAttribute('href'));card.hidden=!text.includes(query);if(card.hidden)card.open=false;else shown++;});if(count)count.textContent=query?shown+' / '+cards.length:String(cards.length);if(empty)empty.hidden=shown!==0;});});
});

// Окна матчапов: стандартный dialog удерживает фокус и закрывается по Escape.
document.querySelectorAll('[data-matchup-open]').forEach(button=>button.addEventListener('click',()=>{
 const dialog=document.getElementById(button.dataset.matchupOpen);if(!dialog)return;dialog.showModal();document.body.classList.add('matchup-modal-open');
}));
document.querySelectorAll('.matchup-dialog').forEach(dialog=>{
 dialog.querySelector('.matchup-dialog-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 dialog.addEventListener('close',()=>{if(!document.querySelector('.matchup-dialog[open]'))document.body.classList.remove('matchup-modal-open');dialog.querySelectorAll('details[open]').forEach(d=>d.open=false);});
});
