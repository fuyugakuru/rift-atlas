require("./format-on-exit.cjs");
const fs = require("fs");
const root = require("path").resolve(__dirname, "..");
const riot = JSON.parse(fs.readFileSync(root + "/riot-data.json", "utf8"));
const official = "https://wildrift.leagueoflegends.com";
const patch = (id) => official + "/en-us/news/game-updates/wild-rift-patch-notes-" + id + "/";
const guides = {
  mel: {
    name: "Мэл",
    tag: "Способности, предметы и матчапы",
    accent: "#e4bb71",
    intro: "Маг с дальними атаками, контролем области и отражением снарядов.",
    plan: "Играйте от дистанции и контроля зоны. Зеркальный щит — ответ на важный снаряд, а не кнопка для случайного размена.",
    skills: [
      "Способности усиливают следующую атаку; накопленные метки помогают добить цель.",
      "Залп снарядов в выбранную область.",
      "Защитное окно с отражением вражеских снарядов.",
      "Контроль области для подготовки попаданий.",
      "Давление на противников с накопленными метками.",
    ],
    combo: "E → Q → автоатака → R",
    comboNote:
      "Учебная последовательность. Сначала подтвердите попадание контролем; W сохраняйте для ответа.",
    counters: [
      [
        "Лиссандра",
        "Направленный контроль ультимейта не стоит путать с обычным отражаемым снарядом. Не давайте ей свободно сокращать дистанцию.",
      ],
      ["Физз", "Угрожает заходом в ближний бой. Сохраняйте защиту и не продвигайтесь без обзора."],
      ["Зед", "Следите за тенями и готовьте ответ на момент его появления после ультимейта."],
    ],
    order: "Q → E → W; R при доступности",
    items: ["luden", "orb", "rabadon"],
    rune: "Для коротких разменов можно тестировать «Казнь электричеством». Это учебный вариант, а не подтверждённая сборка текущего патча.",
  },
  lissandra: {
    name: "Лиссандра",
    tag: "Способности, предметы и матчапы",
    accent: "#81d8ee",
    intro: "Маг контроля с перемещением и выбором цели ультимейта.",
    plan: "Сильна идеей контролируемого входа. Перед перемещением по E оцените, успеют ли союзники продолжить бой. R на себя и R на врага решают разные задачи.",
    skills: [
      "Павшие поблизости враги становятся ледяными слугами и взрываются.",
      "Осколок для разменов и работы с волной.",
      "Контроль противников поблизости.",
      "Ледяной путь с возможностью перемещения.",
      "На врага — оглушение; на себя — восстановление и временная неуязвимость.",
    ],
    combo: "E → повтор E → W → Q → R",
    comboNote: "Входите только при поддержке команды. Выбор цели R зависит от угрозы и позиции.",
    counters: [
      [
        "Орианна",
        "Может удерживать дистанцию и зону шара. Не заходите по прямой через её подготовленную область.",
      ],
      ["Зиггс", "Заставляет тратить здоровье до входа. Ищите фланг, а не длинную погоню по линии."],
      [
        "Мэл",
        "Может наказать за предсказуемый снаряд. Отличайте отражаемые умения от направленного контроля.",
      ],
    ],
    order: "Q → W → E; R при доступности",
    items: ["luden", "rabadon", "orb"],
    rune: "«Казнь электричеством» — пример для короткой серии урона. Защитные варианты нужно проверять в текущем клиенте.",
  },
  syndra: {
    name: "Синдра",
    tag: "Способности, предметы и матчапы",
    accent: "#ba9af8",
    intro: "Маг со сферами, отбрасыванием и уроном по выбранной цели.",
    plan: "Не расходуйте отбрасывание без причины, если противник может прыгнуть на вас. Положение сфер важнее красивой, но неподготовленной комбинации.",
    skills: [
      "Накопление осколков улучшает способности и усиливает магию.",
      "Создаёт тёмную сферу.",
      "Захват и бросок для урона и контроля.",
      "Отбрасывание; сферы расширяют угрозу оглушения.",
      "Сферы атакуют выбранного чемпиона; улучшение усиливает добивание.",
    ],
    combo: "Q → E → W → R",
    comboNote:
      "Пример размена после попадания оглушением. Не рассчитывайте на гарантированное убийство без оценки здоровья и защиты.",
    counters: [
      [
        "Физз",
        "Может избегать ключевого урона и навязывать ближний бой. Сохраняйте E до его подхода.",
      ],
      ["Зед", "Заходит через тени с нескольких направлений. Держите безопасный путь отхода."],
      [
        "Лиссандра",
        "Угрожает контролем после сближения. Следите за E и не стойте без союзников слишком близко.",
      ],
    ],
    order: "Q → W → E; R при доступности",
    items: ["luden", "orb", "rabadon"],
    rune: "«Казнь электричеством» — учебная отправная точка для взрывного размена, без заявления о лучшем винрейте.",
  },
};
riot.champions.forEach((c) => Object.assign(c, guides[c.id]));
const items = [
  {
    id: "luden",
    name: "Эхо Людена",
    en: "Luden’s Echo",
    kind: "Магия",
    glyph: "◈",
    color: "#9b9aff",
    why: "Вариант для урона заклинаниями и разменов с дистанции.",
    who: "Мэл · Синдра · Лиссандра",
    note: "В 7.3 обновлён эффект Echo. Числа всех характеристик здесь не заявлены как полный актуальный паспорт.",
    source: patch("7-3"),
  },
  {
    id: "orb",
    name: "Сфера бесконечности",
    en: "Infinity Orb",
    kind: "Магия",
    glyph: "◉",
    color: "#e6a6d6",
    why: "Вариант для завершения атаки по ослабленной цели.",
    who: "Мэл · Синдра · Лиссандра",
    note: "В 7.3 порог эффекта Inevitable Demise поднят до 40% здоровья.",
    source: patch("7-3"),
  },
  {
    id: "rabadon",
    name: "Смертельная шляпа Рабадона",
    en: "Rabadon’s Deathcap",
    kind: "Магия",
    glyph: "⌁",
    color: "#c674a4",
    why: "Усиление магического урона после появления основы сборки.",
    who: "Маги с масштабированием от силы умений",
    note: "Позиция в сборке зависит от экономики и необходимости защититься. Цена и точные параметры требуют проверки в клиенте.",
    source: patch("7-3"),
  },
  {
    id: "divine",
    name: "Божественный разделитель",
    en: "Divine Sunderer",
    kind: "Физический урон",
    glyph: "✦",
    color: "#e8c882",
    why: "Рассматривайте для подходящих бойцов; не заменяет магическую основу трёх героинь.",
    who: "Бойцы с подходящей механикой атак",
    note: "В патче 7.3d стоимость снижена с 3400 до 3300.",
    source: patch("7-3d"),
  },
  {
    id: "essence",
    name: "Похититель сущности",
    en: "Essence Reaver",
    kind: "Физический урон",
    glyph: "⟡",
    color: "#8bd9cd",
    why: "Вариант для физических чемпионов, использующих способности и криты.",
    who: "Ситуативно для подходящих стрелков",
    note: "В 7.3d сила атаки повышена с 50 до 55.",
    source: patch("7-3d"),
  },
  {
    id: "storm",
    name: "Штормовой клинок",
    en: "Stormrazor",
    kind: "Физический урон",
    glyph: "ϟ",
    color: "#8dbbeb",
    why: "Рассматривается для подходящих стрелков, а не как предмет для любого чемпиона.",
    who: "Критовые стрелки по ситуации",
    note: "В 7.3d урон Bolt снижен до 100, ускорение — до 35%.",
    source: patch("7-3d"),
  },
];
fs.writeFileSync(
  root + "/data.js",
  "window.RIFT_DATA=" +
    JSON.stringify({
      checked: riot.checked,
      champions: riot.champions,
      catalog: riot.catalog,
      items,
    }) +
    ";",
);
const nav = [
  ["index.html", "Обзор"],
  ["champions.html", "Чемпионы"],
  ["items.html", "Предметы"],
  ["matchups.html", "Контрпики"],
  ["meta.html", "Мета"],
  ["patches.html", "Патчи"],
  ["timers.html", "Таймеры"],
];
function shell(file, title, body) {
  return `<!doctype html><html lang="ru"><head><link rel="icon" type="image/svg+xml" href="favicon.svg?v=1" /><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0c0e14"><meta name="description" content="Rift Atlas — независимый справочник Wild Rift: чемпионы, предметы, патчи и таймеры."><title>${title} · Rift Atlas</title><link rel="stylesheet" href="style.css"><script src="data.js" defer></script><script src="app.js" defer></script></head><body><a class="skip" href="#main">К содержанию</a><aside class="sidebar"><a class="brand" href="index.html"><span class="brand-mark">R</span><span>RIFT<span class="brand-light">ATLAS</span><small>WILD RIFT COMPANION</small></span></a><p class="nav-caption">НАВИГАЦИЯ</p><nav aria-label="Основная навигация">${nav.map(([url, n], i) => `<a href="${url}" ${url === file ? 'aria-current="page"' : ""}><span class="nav-icon">${["◈", "♜", "⬡", "⚔", "↗", "▤", "◷"][i]}</span>${n}</a>`).join("")}</nav><div class="sidebar-bottom"><span class="live-dot"></span> Данные проверены<small>08 ноября 2026 · патч 7.3e</small><a href="sources.html">Источники и обновления ↗</a></div></aside><div class="workspace"><header class="topbar"><span>WILD RIFT <b>/</b> ${title}</span><div><span class="patch-pill">ПАТЧ 7.3e</span><a href="champions.html?favorites=1" aria-label="Избранные чемпионы">☆ <span class="hide-mobile">Мой пул</span></a></div></header><main id="main">${body}</main><footer><span><b>RIFT ATLAS</b> · Справочник Wild Rift.</span><span>Неофициальный фан-проект. Не связан с Riot Games.</span><a href="sources.html">Источники</a></footer></div></body></html>`;
}
const heading = (label, title, text) =>
  `<div class="page-heading"><p class="eyebrow">${label}</p><h1>${title}</h1><p>${text}</p></div>`;
const panel = (title, text) => `<article class="panel"><h3>${title}</h3><p>${text}</p></article>`;
const card = (c) =>
  `<article class="champ-card" style="--accent:${c.accent}"><a href="${c.id}.html"><img src="${c.image}" alt="${c.name}" loading="lazy"><div class="champ-gradient"></div><span class="champ-role">МИД · МАГ</span><div class="champ-caption"><small>${c.subtitle}</small><h3>${c.name}</h3><span>Открыть гайд <b>↗</b></span></div></a><button class="favorite" data-favorite="${c.id}" aria-label="Добавить ${c.name} в избранное" aria-pressed="false">☆</button></article>`;
const write = (file, title, body) => fs.writeFileSync(root + "/" + file, shell(file, title, body));
write(
  "index.html",
  "Обзор",
  `<section class="hero"><img class="hero-image" src="assets/syndra.jpg" alt="Синдра"><div class="hero-shade"></div><div class="hero-content"><p class="eyebrow"><span class="live-dot"></span> WILD RIFT</p><h1>Справочник<br><em>Wild Rift</em></h1><p>Твои чемпионы, осмысленные сборки<br>и важные изменения — в одном месте.</p><div class="actions"><a class="button" href="champions.html">Найти чемпиона <span>↗</span></a><a class="text-button" href="patches.html">Что изменилось в 7.3e →</a></div></div><div class="hero-label"><span>В ФОКУСЕ</span><b>СИНДРА</b><small>Темная властительница</small></div></section><div class="quick-grid"><a href="champions.html"><span>01 / ЧЕМПИОНЫ</span><strong>${riot.catalog.length} в каталоге <b>↗</b></strong><small>Страницы всех чемпионов</small></a><a href="items.html"><span>02 / СБОРКИ</span><strong>Подбор предметов <b>↗</b></strong><small>Что выбрать и в какой ситуации</small></a><a href="timers.html"><span>03 / МАКРО</span><strong>Тайминги объектов <b>↗</b></strong><small>Время первого появления</small></a></div><section><div class="section-title"><div><p class="eyebrow">ГАЙДЫ</p><h2>Мэл, Лиссандра и Синдра</h2></div><a href="champions.html">Все чемпионы ↗</a></div><div class="champ-grid">${riot.champions.map(card).join("")}</div></section><section class="bottom-grid"><div class="panel patch-feature"><p class="eyebrow">ПОСЛЕДНИЙ НАЙДЕННЫЙ ПАТЧ</p><span class="patch-number">7.3e</span><h3>Изменения AAA ARAM</h3><p>Новые серии аугментаций. Эти изменения не следует автоматически переносить на обычный режим.</p><a href="patches.html" class="text-button">Читать разбор →</a></div><div class="panel"><p class="eyebrow">ПОДБОР ПРЕДМЕТОВ</p><h2>Выбор предметов<br>по ситуации</h2><p>Дистанция, контроль и угроза от врага меняют приоритеты. В гайдах мы объясняем выбор и отделяем советы от проверенных чисел.</p><a href="items.html" class="text-button">Разобраться в предметах →</a></div></section>`,
);
write(
  "champions.html",
  "Чемпионы",
  `${heading("КАТАЛОГ", "Каталог чемпионов", "Три подробных гайда и полный список с официального сайта Wild Rift.")}<div class="toolbar"><label class="search"><span>⌕</span><input id="champ-search" type="search" placeholder="Имя чемпиона: Мэл, Syndra…" aria-label="Поиск чемпиона"></label><button class="chip active" data-scope="all">Все</button><button class="chip" data-scope="guides">С гайдом</button><button class="chip" data-scope="favorites">☆ Избранное</button></div><p class="muted" id="search-count" role="status"></p><div class="champ-grid" id="champion-cards">${riot.champions.map(card).join("")}</div><h2 class="catalog-title">Официальный каталог</h2><p class="muted">Карточки ниже ведут к Riot Games. Подробный гайд на нашем сайте пока есть только у трёх чемпионов выше.</p><div class="roster" id="roster"></div><p id="empty" class="empty" hidden>Ничего не найдено. Попробуйте другое имя или измените фильтр.</p>`,
);
for (const c of riot.champions) {
  write(
    c.id + ".html",
    c.name,
    `<a href="champions.html" class="back">← К чемпионам</a><section class="profile-hero" style="--accent:${c.accent}"><img src="${c.image}" alt="${c.name}"><div class="hero-shade"></div><div class="profile-content"><p class="eyebrow">МИД / МАГ / ${c.difficulty.toUpperCase()} СЛОЖНОСТЬ</p><h1>${c.name}</h1><h2>${c.tag}</h2><p>${c.intro}</p><button class="button" data-favorite="${c.id}" aria-pressed="false">☆ В мой пул</button></div></section><div class="notice">Способности: официальный источник. Сборки, прокачка и матчи — авторский учебный разбор, без статистической гарантии.</div><nav class="anchors" aria-label="Разделы гайда"><a href="#abilities">Способности</a><a href="#build">Сборка</a><a href="#matchups">Соперники</a><a href="#plan">План игры</a></nav><section id="abilities"><div class="section-title"><h2>Способности</h2><a href="${c.source}" target="_blank" rel="noopener">Страница Riot ↗</a></div><div class="abilities">${c.abilities.map((a, i) => `<article><img src="${a.icon}" alt=""><div><span class="key">${a.key}</span><h3>${a.name}</h3><p>${c.skills[i]}</p></div></article>`).join("")}</div><div class="bottom-grid"><div class="panel"><p class="eyebrow">ПРИМЕР КОМБИНАЦИИ</p><h3 class="combo">${c.combo}</h3><p>${c.comboNote}</p></div><div class="panel"><p class="eyebrow">ПРОКАЧКА И РУНЫ · АВТОРСКИЙ ВАРИАНТ</p><h3>${c.order}</h3><p>${c.rune}</p></div></div></section><section id="build"><div class="section-title"><h2>Основа магической сборки</h2><span class="muted">Порядок меняется по игре</span></div><div class="item-grid">${c.items
      .map((id, i) => {
        const it = items.find((x) => x.id === id);
        return `<a class="panel build-item" href="items.html#${it.id}"><span class="item-glyph" style="--item:${it.color}">${it.glyph}</span><small>ВАРИАНТ ${i + 1}</small><h3>${it.name}</h3><p>${it.why}</p></a>`;
      })
      .join(
        "",
      )}</div><p class="muted">Это ядро из трёх предметов, не полная сборка из шести слотов. Ботинки, зачарование и защита выбираются под состав врага.</p></section><section id="matchups"><div class="section-title"><h2>Кого учитывать на линии</h2><span class="badge">Не рейтинг винрейта</span></div><div class="item-grid">${c.counters.map(([name, note]) => panel(name, note)).join("")}</div></section><section id="plan" class="panel strategy"><p class="eyebrow">ПЛАН ИГРЫ</p><h2>Рекомендации по игре</h2><p>${c.plan}</p><p class="muted">Проверка источника: 08.11.2026. В официальном тексте 7.3e нет отдельных изменений этой героини; это не означает отсутствия изменений в предыдущих патчах.</p></section>`,
  );
}
write(
  "items.html",
  "Предметы",
  `${heading("ПРЕДМЕТЫ", "Предметы и применение", "")}<div class="toolbar"><label class="search"><span>⌕</span><input id="item-search" type="search" placeholder="Найти предмет…" aria-label="Поиск предмета"></label><select id="item-kind" aria-label="Тип предмета"><option value="all">Все типы</option><option>Магия</option><option>Физический урон</option></select></div><div id="items-list" class="item-grid">${items.map((it) => `<article class="panel item-card" id="${it.id}" data-name="${it.name} ${it.en}" data-kind="${it.kind}"><span class="item-glyph" style="--item:${it.color}">${it.glyph}</span><span class="badge">${it.kind}</span><h2>${it.name}</h2></article>`).join("")}</div><p id="items-empty" hidden class="empty">Подходящих предметов нет.</p><section class="panel strategy"><h2>Не копируй сборку — смотри на противников и создавай её сам.</h2></section>`,
);
write(
  "matchups.html",
  "Контрпики",
  `${heading("ПОДГОТОВКА К ЛИНИИ", "Матчапы чемпионов", "Разбор механик матчапов. Без выдуманных процентов побед и заявления об автоматической победе на выборе.")}<div class="toolbar"><label for="matchup-champion">Ваш чемпион</label><select id="matchup-champion">${riot.champions.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}</select></div><div id="matchup-result"></div><section class="panel strategy"><h2>Что проверить до первого размена</h2><div class="item-grid"><div><h3>Дистанция</h3><p>Кто может наносить урон, не попадая под ответ? Играйте вокруг дальности ключевого контроля.</p></div><div><h3>Окно уязвимости</h3><p>Рывок, отражение или отбрасывание потрачены — появляется возможность для размена.</p></div><div><h3>Состав команды</h3><p>Сильный дуэльный выбор может оказаться слабым решением для общей композиции.</p></div></div></section>`,
);
write(
  "meta.html",
  "Мета",
  `${heading("ИЗМЕНЕНИЯ БАЛАНСА", "Кто изменился в патче", "Официальные бафы и нерфы 7.3d. Это список изменений, а не тир-лист текущей силы чемпионов.")}<div class="notice">Статистический тир-лист пока не подключён. Для него нужны регион, ранг, размер выборки и дата. Мы не подменяем эти данные догадками.</div><div class="bottom-grid"><section class="panel"><span class="badge green">УСИЛЕНИЯ · 7.3d</span><h2>Усиленные чемпионы</h2>${[
    ["Акали", "Улучшены базовая броня и рост скорости атаки."],
    ["Ли Син", "Повышены рост скорости атаки и базовый урон ультимейта."],
    ["Камилла", "Повышен рост скорости атаки."],
    ["Мисс Фортуна", "Усилены пассивный эффект и критический урон ультимейта."],
  ]
    .map(([n, t]) => `<div class="change-row"><b>${n}</b><p>${t}</p></div>`)
    .join(
      "",
    )}</section><section class="panel"><span class="badge red">ОСЛАБЛЕНИЯ · 7.3d</span><h2>Ослабленные чемпионы</h2>${[
    ["Мальфит", "Снижены щит и урон усиленной атаки."],
    ["Экко", "Снижены модификаторы урона по монстрам."],
    ["Самира", "Уменьшены коэффициенты урона двух способностей."],
    ["Синджед", "Снижены базовые здоровье и скорость передвижения."],
  ]
    .map(([n, t]) => `<div class="change-row"><b>${n}</b><p>${t}</p></div>`)
    .join(
      "",
    )}</section></div><a class="button" href="${patch("7-3d")}" target="_blank" rel="noopener">Полный патч Riot ↗</a>`,
);
write(
  "patches.html",
  "Патчи",
  `${heading("ЛЕНТА ИЗМЕНЕНИЙ", "Обновления Wild Rift", "Последние проверенные официальные публикации. Дата проверки — 8 ноября 2026.")}<div class="notice">Это проверенный снимок, а не поток в реальном времени. Новые патчи не появляются автоматически без обновления сайта.</div><div class="patch-list"><article class="panel patch-entry"><div><span class="patch-number">7.3e</span><span class="badge">04 НОЯБРЯ 2026</span></div><div><p class="eyebrow">AAA ARAM</p><h2>Новые аугментации AAA ARAM</h2><p>Появились дополнительные тематические варианты усилений и взаимодействия с призванными существами. Изменения этого выпуска относятся к AAA ARAM.</p><a href="${patch("7-3e")}" target="_blank" rel="noopener">Официальные изменения ↗</a></div></article><article class="panel patch-entry"><div><span class="patch-number">7.3d</span><span class="badge">28 ОКТЯБРЯ 2026</span></div><div><p class="eyebrow">ЧЕМПИОНЫ · ПРЕДМЕТЫ · КАРТА</p><h2>Баланс основного режима</h2><p>Изменены чемпионы, отдельные предметы, усиление Барона и урон башен. Подборку по героям смотрите в разделе «Мета».</p><a href="${patch("7-3d")}" target="_blank" rel="noopener">Полный список Riot ↗</a></div></article><article class="panel patch-entry"><div><span class="patch-number">7.3</span><span class="badge">21 СЕНТЯБРЯ 2026</span></div><div><p class="eyebrow">БАЗОВЫЕ СИСТЕМЫ</p><h2>Большое обновление сезона</h2><p>Переработка экосистемы стрелков, леса, предметов и систем карты. Для первого речного краба указано время 01:30.</p><a href="${patch("7-3")}" target="_blank" rel="noopener">Изучить первоисточник ↗</a></div></article></div><a class="button" href="${official}/en-us/news/game-updates/" target="_blank" rel="noopener">Проверить новые публикации Riot ↗</a>`,
);
write(
  "timers.html",
  "Таймеры",
  `${heading("МАКРОИГРА", "Таймеры матча", "Ручной помощник. Сайт не читает текущий матч и не запускается вместе с игрой автоматически.")}<section class="clock-panel panel"><div><p class="eyebrow">ВРЕМЯ МАТЧА</p><output id="game-clock" aria-label="Время матча">00:00</output><p class="muted">Синхронизируйте вручную с часами в игре.</p></div><div class="clock-controls"><label for="sync-time">Текущее время</label><input id="sync-time" value="00:00" pattern="[0-9]{1,3}:[0-5][0-9]" aria-describedby="clock-error"><div class="actions"><button id="clock-toggle" class="button">Старт</button><button id="clock-sync" class="chip">Синхронизировать</button><button id="clock-reset" class="chip">Сброс</button></div><p id="clock-error" class="error" role="status"></p></div></section><div class="timer-grid"><article class="panel"><span class="badge green">ПОДТВЕРЖДЕНО В 7.3</span><h2>Речной краб</h2><div class="timer-value" id="scuttle-time">01:30</div><p>До первого появления. Дальнейшее возрождение здесь автоматически не предполагается.</p><a href="${patch("7-3")}" target="_blank" rel="noopener">Источник Riot ↗</a></article><article class="panel"><span class="badge">РУЧНОЙ ТАЙМЕР</span><h2>Своя цель</h2><form id="custom-timer-form"><label for="objective-name">Название</label><input id="objective-name" value="Дракон" maxlength="40" required><label for="respawn">Время до появления, секунды</label><input id="respawn" type="number" min="1" max="3600" required placeholder="Введите по данным клиента"><button class="button" type="submit">Запустить отсчёт ↗</button></form><p id="custom-name"></p><output id="custom-left" class="timer-value">—</output></article></div><section class="panel strategy"><h2>Миньоны, лес и эпические монстры</h2><p>Таблица точных первых появлений и интервалов ещё требует отдельной проверки по текущему режиму. Для дракона, Барона, Герольда и лесных лагерей не подставляем старые тайминги из PC League of Legends. До проверки пользуйтесь ручным отсчётом и информацией игрового клиента.</p><p class="muted">Таймер использует фактически прошедшее время, но не сохраняет состояние после перезагрузки страницы. Звукового сигнала нет.</p></section>`,
);
write(
  "sources.html",
  "Источники",
  `${heading("ПРОЗРАЧНОСТЬ ДАННЫХ", "Источники данных", "Дата проверки: 08.11.2026. Версия сайта: первый рабочий выпуск.")}<div class="bottom-grid">${panel("Официальные факты", "Названия чемпионов, роли, способности и иллюстрации взяты со страниц Riot Games. Список каталога загружен с официального сайта Wild Rift. Проверенные изменения снабжены ссылками на патчи.")}${panel("Авторская интерпретация", "Комбинации, приоритеты прокачки, примеры предметов и советы по матчапам — учебные рекомендации. Они не являются статистикой или официальной рекомендацией Riot.")}${panel("Что пока не подключено", "Нет автоматического обновления патчей, проверенного статистического тир-листа, полного магазина предметов, статистики контрпиков и полной таблицы спавнов. Эти ограничения обозначены в соответствующих разделах.")}${panel("Обновление сайта", "Для новой версии нужно обновить исходные файлы и загрузить архив в Deploys существующего проекта Netlify. Проверять новые статьи можно по кнопке в разделе «Патчи».")}</div><section class="panel strategy"><h2>Первоисточники</h2><ul class="source-list">${riot.champions.map((c) => `<li><a href="${c.source}" target="_blank" rel="noopener">${c.name} — официальный Wild Rift ↗</a></li>`).join("")}${["7-3", "7-3d", "7-3e"].map((id) => `<li><a href="${patch(id)}" target="_blank" rel="noopener">Патч ${id.replaceAll("-", ".")} ↗</a></li>`).join("")}</ul><p class="muted">Riot Games, Wild Rift и персонажи принадлежат их правообладателям. Этот бесплатный фан-проект не одобрен и не спонсируется Riot Games.</p></section>`,
);
console.log("Built 11 pages, catalog", riot.catalog.length);

// Отдельный шаблон справочника позволяет менять его без редактирования общего каркаса.
{
  const file = root + "/timers.html";
  let html = fs.readFileSync(file, "utf8");
  html = html.replace(
    /<main id="main">[\s\S]*?<\/main>/,
    `<main id="main">${fs.readFileSync(root + "/tools/timings-content.html", "utf8")}</main>`,
  );
  html = html.replace(
    "</head>",
    `<script src="timings-data.js" defer></script><script src="timing-quiz.js" defer></script><script src="timings.js" defer></script></head>`,
  );
  fs.writeFileSync(file, html);
}

// Расширенный каталог сохраняется независимо от базовых трёх гайдов.
{
  const context = { window: {} };
  require("vm").runInNewContext(fs.readFileSync(root + "/data.js", "utf8"), context);
  const full = JSON.parse(fs.readFileSync(root + "/champion-catalog.json", "utf8"));
  context.window.RIFT_DATA.catalog = full;
  fs.writeFileSync(
    root + "/data.js",
    "window.RIFT_DATA = " + JSON.stringify(context.window.RIFT_DATA, null, 2) + ";\n",
  );
}

require("./build-catalog.cjs");
// Сохраняем расширенный каталог предметов из актуального шаблона.
fs.copyFileSync(root + "/tools/items-page.html", root + "/items.html");
require("./render-account.cjs");
