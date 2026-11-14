require("./format-on-exit.cjs");
// Единое отображение роли и сложности на всех страницах чемпионов.
const fs = require("fs"),
  path = require("path");
const root = path.resolve(__dirname, "..");
function roles(value) {
  const mapping = {
    МАГ: ["mage", "Маг"],
    ПОДДЕРЖКА: ["support", "Поддержка"],
    ТАНК: ["tank", "Танк"],
    ВОИН: ["fighter", "Воин"],
    СТРЕЛОК: ["marksman", "Стрелок"],
    УБИЙЦА: ["assassin", "Убийца"],
  };
  return `<span class="role-list">${value
    .split(/[·,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => {
      const role = mapping[name];
      if (!role) throw Error("Unknown role: " + name);
      return `<span class="role-token"><span class="role-symbol" style="--role-image:url('assets/roles/${role[0]}.svg')" aria-hidden="true"></span><span>${role[1]}</span></span>`;
    })
    .join("")}</span>`;
}
function lanes(id) {
  const data = JSON.parse(fs.readFileSync(root + "/champion-lanes.json", "utf8"));
  const labels = {
    baron: "Барона (топ)",
    jungle: "Лес",
    mid: "Мид",
    dragon: "Дракона (ADC)",
    support: "Поддержка",
  };
  if (!data.positions[id]?.length) throw Error("Missing lanes: " + id);
  return (
    '<span class="role-list lane-list">' +
    data.positions[id]
      .map(
        (lane) =>
          '<span class="role-token"><img class="lane-symbol" src="assets/lanes/' +
          lane +
          '.png" alt="" aria-hidden="true"><span>' +
          labels[lane] +
          "</span></span>",
      )
      .join("") +
    "</span>"
  );
}
function difficulty(value) {
  const level = { Низкая: 1, Средняя: 2, Высокая: 3 }[value];
  if (!level) return "";
  const label = level === 1 ? "Лёгкая" : level === 2 ? "Средняя" : "Высокая";
  return `<span class="difficulty-indicator" data-level="${level}" role="img" aria-label="Сложность: ${label.toLowerCase()}, ${level} из 3"><span class="difficulty-gems" aria-hidden="true">${[1, 2, 3].map((n) => `<i class="difficulty-gem${n <= level ? " is-lit" : ""}"></i>`).join("")}</span><span class="difficulty-caption" aria-hidden="true"><strong>${label}</strong><small>${level} / 3</small></span></span>`;
}
function apply() {
  const ratingFile = root + "/champion-difficulty.json";
  const ratings = fs.existsSync(ratingFile)
    ? JSON.parse(fs.readFileSync(ratingFile)).champions
    : {};
  const catalog = JSON.parse(fs.readFileSync(root + "/champion-catalog.json", "utf8"));
  let count = 0;
  for (const c of catalog) {
    const file = root + "/" + c.id + ".html";
    let html = fs.readFileSync(file, "utf8");
    html = html.replace(/<dt>Класс<\/dt>/g, "<dt>Роль</dt>");
    html = html.replace(
      /<dt>Роль<\/dt>\s*<dd>[\s\S]*?<\/dd>/,
      `<dt>Роль</dt><dd>${roles(c.role)}</dd>`,
    );
    const own = ratings[c.id];
    const rating = own ? ["", "Низкая", "Средняя", "Высокая"][own.level] : c.difficulty;
    html = html.replace(
      /<dt>Сложность(?: освоения)?<\/dt>\s*<dd>[\s\S]*?<\/dd>/,
      `<dt>Сложность освоения</dt><dd title="${own ? "Оценка Rift Atlas. " + own.reason : "Официальная оценка Riot"}">${difficulty(rating)}</dd>`,
    );
    html = html.replace(/<div class="champion-lanes">[\s\S]*?<\/dd><\/div>/g, "");
    html = html.replace("<dt>Сложность</dt>", "<dt>Сложность</dt>");
    html = html.replace(
      /(<div>\s*<dt>Сложность(?: освоения)?<\/dt>)/,
      '<div class="champion-lanes"><dt>Линия</dt><dd>' + lanes(c.id) + "</dd></div>$1",
    );
    fs.writeFileSync(file, html);
    count++;
  }
  console.log("Profile details updated: " + count);
  require("./render-abilities.cjs").apply();
  require("./render-builds.cjs").apply();
}
module.exports = { difficulty, roles, apply };
if (require.main === module) apply();
