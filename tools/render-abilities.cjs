require("./format-on-exit.cjs");
// Создаёт блок навыков из официальных данных Riot. Повторный запуск обновляет блок.
const fs = require("fs"),
  path = require("path"),
  root = path.resolve(__dirname, "..");
const esc = (x) =>
  String(x).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
function clean(html) {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "<br>")
    .replace(/<\/?(?:p|div)[^>]*>/gi, "<br>")
    .replace(/<(?!br\s*\/?>)[^>]+>/gi, "")
    .replace(/^(?:\s*<br>)+|(?:<br>\s*)+$/g, "");
}
const { numericText, parameters } = require("./stat-format.cjs");
function apply() {
  const file = root + "/champion-abilities.json";
  if (!fs.existsSync(file)) return;
  const data = JSON.parse(fs.readFileSync(file));
  const valuesFile = root + "/ability-values.json";
  const values = fs.existsSync(valuesFile) ? JSON.parse(fs.readFileSync(valuesFile)).champions : {};
  let count = 0;
  for (const [id, c] of Object.entries(data.champions)) {
    const page = root + "/" + id + ".html";
    if (!fs.existsSync(page)) continue;
    let html = fs.readFileSync(page, "utf8");
    const label = (i) => (i === 0 ? "П" : i === c.abilities.length - 1 ? "УЛЬТ" : i);
    const title = (a) =>
      a.name.toLocaleLowerCase("ru").replace(/^./u, (c) => c.toLocaleUpperCase("ru"));
    const section = `<section class="champion-abilities ability-picker" aria-labelledby="abilities-title"><div class="abilities-heading"><h2 id="abilities-title">Навыки</h2></div><div class="ability-buttons" role="group" aria-label="Навыки чемпиона">${c.abilities.map((a, i) => `<button type="button" class="ability-button" id="ability-button-${i}" aria-label="${esc(title(a))}" aria-expanded="false" aria-controls="ability-panel-${i}" data-ability="${i}"><img src="${esc(a.icon)}" alt="" loading="lazy"><span>${label(i)}</span></button>`).join("")}</div><div class="ability-panels">${c.abilities.map((a, i) => `<article class="ability-card ability-panel" id="ability-panel-${i}" aria-labelledby="ability-button-${i}" hidden><div class="ability-body"><p class="ability-type">${i === 0 ? "Пассивное умение" : i === c.abilities.length - 1 ? "Абсолютное умение" : "Умение " + i}</p><h3>${esc(title(a))}</h3><div class="ability-description">${values[id]?.abilities[i] ? numericText(values[id].abilities[i].description) : clean(a.description)}</div>${values[id]?.abilities[i] ? parameters(values[id].abilities[i], id) : ""}<p class="ability-level-note">Значения через / — по уровням умения.</p></div><div class="ability-media">${a.video ? `<video class="ability-video" controls muted loop playsinline preload="none" data-video-src="${esc(a.video)}" aria-label="Видео: ${esc(title(a))}"></video><p class="ability-video-error" hidden>Не удалось загрузить видео. <a href="${esc(c.source)}" target="_blank" rel="noopener noreferrer">Посмотреть у Riot ↗</a></p>` : `<p class="ability-video-unavailable">Видео этого навыка пока недоступно.</p>`}</div></article>`).join("")}</div></section>`;
    html = html.replace(/<!-- ABILITIES START -->[\s\S]*?<!-- ABILITIES END -->/g, "");
    html = html.replace(
      '<nav class="character-neighbors"',
      "<!-- ABILITIES START -->" +
        section +
        '<!-- ABILITIES END --><nav class="character-neighbors"',
    );
    fs.writeFileSync(page, html);
    count++;
  }
  require("./render-skins.cjs").apply();
  console.log("Abilities rendered: " + count);
}
module.exports = { apply, numericText };
if (require.main === module) apply();
