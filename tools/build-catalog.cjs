require("./format-on-exit.cjs");
const { roles } = require("./profile-details.cjs");
// Создаёт каталог из сохранённых официальных данных. Не обращается к сети.
const fs = require("fs"),
  path = require("path");
const root = path.resolve(__dirname, "..");
const catalog = JSON.parse(fs.readFileSync(root + "/champion-catalog.json", "utf8"));
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const laneData = JSON.parse(fs.readFileSync(root + "/champion-lanes.json")).positions;
const laneOptions = {
  baron: "Барона (топ)",
  jungle: "Лес",
  mid: "Мид",
  dragon: "Дракона (ADC)",
  support: "Поддержка",
};
const roleOptions = {
  tank: "Танк",
  fighter: "Воин",
  mage: "Маг",
  assassin: "Убийца",
  marksman: "Стрелок",
  support: "Поддержка",
};
const roleKeys = {
  ТАНК: "tank",
  ВОИН: "fighter",
  МАГ: "mage",
  УБИЙЦА: "assassin",
  СТРЕЛОК: "marksman",
  ПОДДЕРЖКА: "support",
};
const filterRow = (kind, label, options) =>
  '<div class="champ-filter-row" role="group" aria-label="' +
  label +
  '"><span class="champ-filter-label">' +
  label +
  '</span><button type="button" class="champ-filter active" data-' +
  kind +
  '="all" aria-pressed="true">Все</button>' +
  Object.entries(options)
    .map(
      ([id, name]) =>
        '<button type="button" class="champ-filter" data-' +
        kind +
        '="' +
        id +
        '" aria-pressed="false">' +
        (kind === "lane"
          ? '<img src="assets/lanes/' + id + '.png" alt="">'
          : '<span class="role-symbol" style="--role-image:url(assets/roles/' +
            id +
            '.svg)" aria-hidden="true"></span>') +
        name +
        "</button>",
    )
    .join("") +
  "</div>";
const filters =
  '<div class="champ-filter-toggle-row"><button type="button" class="chip champ-filter-toggle" id="champ-filter-toggle" aria-expanded="false" aria-controls="champ-filters">Фильтры <span aria-hidden="true">⌄</span></button></div><div class="champ-filters" id="champ-filters" hidden>' +
  filterRow("lane", "Линия", laneOptions) +
  filterRow("role", "Роль", roleOptions) +
  "</div>";
const cards = catalog
  .map(
    (c) =>
      `<article class="champ-card" data-champion="${esc(c.id)}" data-name="${esc(c.name)}" data-lanes="${esc((laneData[c.id] || []).join(" "))}" data-roles="${esc(
        c.role
          .split(/[·,]/)
          .map((r) => roleKeys[r.trim()])
          .filter(Boolean)
          .join(" "),
      )}" data-guide="${Boolean(c.hasGuide)}" style="--accent:#bba1ef"><a href="${esc(c.id)}.html" aria-label="Открыть страницу ${esc(c.name)}"><img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy" decoding="async"><div class="champ-gradient"></div>${c.role ? `<span class="champ-role">${roles(c.role)}</span>` : ""}<div class="champ-caption"><small>${esc(c.subtitle)}</small><h3>${esc(c.name)}</h3><span>Открыть страницу <b>↗</b></span></div></a><button class="favorite" data-favorite="${esc(c.id)}" aria-label="Добавить ${esc(c.name)} в избранное" aria-pressed="false">☆</button></article>`,
  )
  .join("");
const content = `<div class="page-heading"><p class="eyebrow">КАТАЛОГ</p><h1>Чемпионы Wild Rift</h1></div><div class="toolbar"><label class="search"><span>⌕</span><input id="champ-search" type="search" placeholder="Имя чемпиона…" aria-label="Поиск чемпиона"></label><button class="chip active" data-scope="all">Все</button><button class="chip" data-scope="favorites">☆ Избранное</button></div>${filters}<p class="muted" id="search-count" role="status"></p><div class="champ-grid full-catalog" id="champion-cards">${cards}</div><p id="empty" class="empty" hidden>Чемпионы не найдены. Измените имя или фильтр.</p>`;
const file = root + "/champions.html";
let html = fs.readFileSync(file, "utf8");
html = html.replace(/<main id="main">[\s\S]*?<\/main>/, '<main id="main">' + content + "</main>");
fs.writeFileSync(file, html);
console.log("Catalogue rendered: " + catalog.length + " local cards.");

if (!process.argv.includes("--catalog-only")) require("./render-basic-profiles.cjs");
