(() => {
  'use strict';
  const profile = document.querySelector('.character-profile');
  if (!profile || document.querySelector('.champion-stats')) return;
  const champion = location.pathname.split('/').pop().replace(/\.html$/, '');
  const section = document.createElement('section');
  section.className = 'champion-stats';
  section.setAttribute('aria-labelledby', 'champion-stats-title');
  section.innerHTML = `<div class="cs-heading"><div><p class="cs-eyebrow">РЕЙТИНГОВЫЕ МАТЧИ · КИТАЙ</p><h2 id="champion-stats-title">Статистика чемпиона</h2></div><div class="cs-filters"><label>Ранг<select class="cs-rank" aria-label="Ранг статистики"></select></label><label>Линия<select class="cs-lane" aria-label="Линия статистики"></select></label></div></div><div class="cs-metrics"><div><span>Победы</span><strong data-cs="win">—</strong></div><div><span>Пики</span><strong data-cs="pick">—</strong></div><div><span>Баны</span><strong data-cs="ban">—</strong></div></div><p class="cs-status" aria-live="polite">Загружаем статистику…</p><div class="cs-footer"><span>Данные матчей китайского сервера</span><a href="https://lolm.qq.com/act/a20220818raider/index.html" target="_blank" rel="noopener noreferrer">Tencent ↗</a></div>`;
  const facts = profile.querySelector('.character-facts');
  facts?.classList.add('cs-role-lanes');
  const difficulty = profile.querySelector('.difficulty-indicator')?.closest('dd')?.parentElement;
  if (facts && difficulty) {
    const row = document.createElement('div');
    row.className = 'character-rating-row';
    const difficultyFacts = document.createElement('dl');
    difficultyFacts.className = 'character-facts cs-difficulty';
    difficultyFacts.append(difficulty);
    row.append(difficultyFacts, section);
    facts.insertAdjacentElement('afterend', row);
  } else {
    profile.querySelector('.character-info').append(section);
  }
  const rank = section.querySelector('.cs-rank'), lane = section.querySelector('.cs-lane');
  const status = section.querySelector('.cs-status');
  const labels = { baron: 'Барона', jungle: 'Лес', mid: 'Мид', dragon: 'Дракона', support: 'Поддержка' };
  const preferredLane = [...profile.querySelectorAll('.champion-lanes img')].map(i => i.getAttribute('src')?.match(/\/([^/]+)\.png/)?.[1]).find(id => labels[id]);
  const percent = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateLabel = date => new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC' }).format(new Date(date + 'T00:00:00Z'));
  let snapshot;
  function render() {
    const row = snapshot.rows.find(r => r.champion === champion && r.rank === rank.value && r.lane === lane.value);
    for (const key of ['win', 'pick', 'ban']) {
      const value = section.querySelector('[data-cs="' + key + '"]');
      value.textContent = row ? percent.format(row[key]) + '%' : '—';
      value.style.removeProperty('color');
      delete value.dataset.band;
      if (!row) { value.style.color = '#a397b0'; continue; }
      if (key === 'win') {
        // Site display thresholds, not an official assessment of champion strength.
        const win = row.win;
        value.dataset.band = win >= 50 ? 'green' : win >= 48 ? 'orange' : 'red';
        value.style.color = win >= 50
          ? `hsl(145 58% ${73 - Math.min((win - 50) / 10, 1) * 12}%)`
          : win >= 48
            ? `hsl(32 95% ${72 - (50 - win) * 3}%)`
            : `hsl(${8 - Math.min((48 - win) / 8, 1) * 8} 92% ${76 - Math.min((48 - win) / 8, 1) * 14}%)`;
      } else if (key === 'pick') {
        value.style.color = '#f2eef7';
      } else {
        const intensity = Math.min(row.ban / 40, 1);
        value.style.color = `hsl(28 ${45 + intensity * 50}% ${85 - intensity * 22}%)`;
      }
    }
    const stale = Date.now() - Date.parse(snapshot.fetchedAt) > 48 * 3600000 || Date.now() - Date.parse((row?.date || snapshot.dates.at(-1)) + 'T00:00:00Z') > 72 * 3600000;
    section.classList.toggle('is-stale', stale);
    status.textContent = row ? 'Данные за ' + dateLabel(row.date) + (stale ? ' · Данные задерживаются, показаны последние доступные.' : '') : 'Для этого чемпиона, ранга и линии источник не опубликовал статистику.';
    if(row)status.textContent+=' · Выборка источника: '+({'1':'Алмаз+','2':'Мастер+','3':'Претендент','4':'CN: 峡谷之巅'}[rank.value]||rank.value);
    section.querySelector('[data-cs="win"]').title = 'Доля побед в опубликованных матчах на выбранной линии и ранге.';
    section.querySelector('[data-cs="pick"]').title = 'Частота выбора на этой линии по методике Tencent.';
    section.querySelector('[data-cs="ban"]').title = 'Частота банов по данным Tencent; может совпадать для разных линий.';
    section.dataset.champion = champion;
    section.dataset.rank = rank.value;
    section.dataset.lane = lane.value;
    section.dispatchEvent(new CustomEvent('stats:updated'));
  }
  function selectLanes() {
    const before = lane.value;
    const available = Object.keys(labels).filter(id => snapshot.rows.some(r => r.champion === champion && r.rank === rank.value && r.lane === id));
    lane.replaceChildren();
    for (const id of available) lane.add(new Option(labels[id], id));
    if (!available.length) lane.add(new Option('Нет данных', ''));
    lane.value = available.includes(before) ? before : available.includes(preferredLane) ? preferredLane : available[0] || '';
    lane.disabled = available.length < 2;
    render();
  }
  rank.addEventListener('change', selectLanes);
  lane.addEventListener('change', render);
  let request;
  async function refresh() {
    if (request) return request;
    request = (async () => {
      try {
        let data,fromCache=false;
        try{const cached=JSON.parse(sessionStorage.getItem('rift-cn-stats-cache')||'null');const age=Date.now()-cached?.at;if(age>=0&&age<300000){data=cached.data;fromCache=true;}}catch{}
        if(!data){const res = await fetch('champion-stats.json', { cache: 'no-cache', signal: AbortSignal.timeout(12000) });
          if (!res.ok) throw Error('HTTP ' + res.status);
          data = await res.json();}
        if (data.schema !== 1 || data.region !== 'CN' || !Array.isArray(data.rows) || !data.ranks || !Number.isFinite(Date.parse(data.fetchedAt))) throw Error('Invalid stats');
        snapshot = data;
        if(!fromCache)try{sessionStorage.setItem('rift-cn-stats-cache',JSON.stringify({at:Date.now(),data}));}catch{}
        rank.disabled = false;
        const before = rank.value;
        rank.replaceChildren();
        const availableRanks = Object.keys(snapshot.ranks).filter(id => snapshot.rows.some(row => row.champion === champion && row.rank === id));
        const displayRanks=[['1','Алмаз+'],['2','Мастер+'],['3','Грандмастер'],['4','Претендент'],['sovereign','Суверен']];
        for(const [id,text] of displayRanks){const available=availableRanks.includes(id);const option=new Option(text+(available?'':' — нет данных'),id);option.disabled=!available;rank.add(option);}
        rank.title='Названия рангов настроены для сайта; исходная выборка указана под процентами.';
        rank.value = availableRanks.includes(before) ? before : availableRanks.includes('1') ? '1' : availableRanks[0] || '1';
        rank.disabled = !availableRanks.length;
        selectLanes();
      } catch {
        if (snapshot) { render(); status.textContent += ' · Проверка обновления не удалась.'; }
        else { rank.disabled = lane.disabled = true; status.textContent = 'Статистика временно недоступна. Попробуйте открыть страницу позже.'; }
      }
    })();
    try { await request; } finally { request = null; }
  }
  refresh();
  // A long-open tab also sees new snapshots; no external requests per visitor.
  setInterval(() => { if (!document.hidden) refresh(); }, 15 * 60000);
})();
