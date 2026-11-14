require("./format-on-exit.cjs");
const fs = require("fs"),
  path = require("path"),
  root = path.resolve(__dirname, "..");
const esc = (x) =>
  String(x).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const rarityNames = {
  base: "Базовый",
  standard: "Обычный",
  epic: "Эпический",
  legendary: "Легендарный",
  prestige: "Престижный",
  special: "Особый",
  unknown: "Редкость уточняется",
};
const skinCount = (n) =>
  n +
  " " +
  (n % 100 >= 11 && n % 100 <= 14
    ? "образов"
    : n % 10 === 1
      ? "образ"
      : n % 10 >= 2 && n % 10 <= 4
        ? "образа"
        : "образов");
function badges(s) {
  return (
    '<span class="skin-badge rarity-' +
    esc(s.rarity || "unknown") +
    '">' +
    (rarityNames[s.rarity] || rarityNames.unknown) +
    "</span>" +
    (s.exclusive
      ? '<span class="skin-badge skin-exclusive" title="Особое или ограниченное получение; может возвращаться в событиях">Эксклюзивный</span>'
      : "")
  );
}
function apply() {
  const file = root + "/champion-skins.json";
  if (!fs.existsSync(file)) return;
  const data = JSON.parse(fs.readFileSync(file));
  require("./apply-skin-video-overrides.cjs").apply(data);
  require("./apply-friendly-videos.cjs").apply(data);
  for (const [id, skins] of Object.entries(data.champions)) {
    const page = root + "/" + id + ".html";
    let html = fs.readFileSync(page, "utf8");
    html = html.replace(/<!-- SKINS START -->[\s\S]*?<!-- SKINS END -->/g, "");
    const section =
      '<section class="champion-skins" aria-labelledby="skins-title"><div class="skins-heading"><h2 id="skins-title">Образы</h2><span>' +
      skinCount(skins.length) +
      '</span></div><div class="skin-choices" role="group" aria-label="Выбор образа">' +
      skins
        .map(
          (s, i) =>
            '<button type="button" class="skin-choice" aria-pressed="' +
            (i === 0) +
            '" aria-controls="skin-viewer" data-skin-index="' +
            i +
            '"><img src="' +
            esc(s.image + "&w=320&auto=format") +
            '" alt="" loading="lazy"><span>' +
            esc(s.name) +
            '</span><span class="skin-choice-badges">' +
            badges(s) +
            "</span></button>",
        )
        .join("") +
      '</div><div class="skin-viewer" id="skin-viewer"><div class="skin-art"><img class="skin-main-image" src="' +
      esc(skins[0].image + "&w=1280&auto=format") +
      '" alt="' +
      esc(skins[0].name) +
      '" loading="lazy"></div><div class="skin-info"><p class="ability-type">' +
      esc(
        JSON.parse(fs.readFileSync(root + "/champion-catalog.json")).find((c) => c.id === id)
          ?.name || id,
      ) +
      ' · ОБРАЗ</p><h3 class="skin-current-name">' +
      esc(skins[0].name) +
      '</h3><div class="skin-current-badges">' +
      badges(skins[0]) +
      '</div><button type="button" class="chip skin-watch" hidden>▶ Смотреть эффекты</button><p class="skin-video-missing">Видео эффектов пока не добавлено.</p><div class="skin-video-slot" hidden></div><a class="skin-video-source" hidden target="_blank" rel="noopener noreferrer">SkinSpotlights Wild Rift · YouTube ↗</a></div></div><script type="application/json" class="skin-data">' +
      JSON.stringify(skins).replace(/</g, "\\u003c") +
      "</script></section>";
    html = html.replace(
      '<nav class="character-neighbors"',
      "<!-- SKINS START -->" + section + '<!-- SKINS END --><nav class="character-neighbors"',
    );
    fs.writeFileSync(page, html);
  }
}
module.exports = { apply };
if (require.main === module) apply();
