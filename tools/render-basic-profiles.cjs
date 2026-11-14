require("./format-on-exit.cjs");
// Единый начальный шаблон для Мэл, Лиссандры и Синдры.
const fs = require("fs"),
  path = require("path");
const root = path.resolve(__dirname, "..");
const catalog = JSON.parse(fs.readFileSync(root + "/champion-catalog.json", "utf8"));
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const template = fs.readFileSync(root + "/akali.html", "utf8");
for (const id of ["mel", "lissandra", "syndra"]) {
  const i = catalog.findIndex((c) => c.id === id),
    c = catalog[i],
    prev = catalog[(i - 1 + catalog.length) % catalog.length],
    next = catalog[(i + 1) % catalog.length];
  const content = `<a class="back" href="champions.html">← Все чемпионы</a><section class="character-profile"><div class="character-photo"><img src="${esc(c.hero)}" alt="${esc(c.name)}"></div><div class="character-info"><p class="eyebrow">WILD RIFT · ЧЕМПИОН</p><h1>${esc(c.name)}</h1><p class="character-subtitle">${esc(c.subtitle)}</p><dl class="character-facts"><div><dt>Роль</dt><dd>${esc(c.role)}</dd></div><div><dt>Сложность</dt><dd>${esc(c.difficulty)}</dd></div></dl><button class="button" data-favorite="${esc(c.id)}" aria-pressed="false">☆ В мой пул</button></div></section><nav class="character-neighbors" aria-label="Другие чемпионы"><a href="${esc(prev.id)}.html">← ${esc(prev.name)}</a><a href="champions.html">Каталог чемпионов</a><a href="${esc(next.id)}.html">${esc(next.name)} →</a></nav>`;
  fs.writeFileSync(
    root + "/" + id + ".html",
    template
      .replace(/<title>[\s\S]*?<\/title>/, "<title>" + esc(c.name) + " · Rift Atlas</title>")
      .replace(/<main id="main">[\s\S]*?<\/main>/, '<main id="main">' + content + "</main>"),
  );
}
console.log("Uniform profiles: Mel, Lissandra, Syndra.");

require("./profile-details.cjs").apply();
