require("./format-on-exit.cjs");
// Короткие карточки матчапов. Источники хранятся в JSON, не загромождают интерфейс.
const fs = require("fs"),
  path = require("path"),
  root = path.resolve(__dirname, "..");
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
function apply() {
  const source = root + "/champion-matchups.json";
  if (!fs.existsSync(source)) return;
  const data = JSON.parse(fs.readFileSync(source)),
    catalog = JSON.parse(fs.readFileSync(root + "/champion-catalog.json")),
    champions = Object.fromEntries(catalog.map((c) => [c.id, c])),
    builds = JSON.parse(fs.readFileSync(root + "/champion-builds.json")).champions;
  const faces = JSON.parse(fs.readFileSync(root + "/champion-faces.json"));
  const lanes = {
      TOP: ["baron", "Барона (топ)"],
      MID: ["mid", "Мид"],
      JUNGLE: ["jungle", "Лес"],
      ADC: ["dragon", "Дракона (ADC)"],
      DRAGON: ["dragon", "Дракона (ADC)"],
      SUPPORT: ["support", "Поддержка"],
    },
    buildRoles = { Solo: "TOP", Mid: "MID", Jungle: "JUNGLE", Duo: "DRAGON", Support: "SUPPORT" };
  function cards(rows, kind) {
    if (!rows.length)
      return (
        '<p class="matchup-empty">Для этой линии нет подтверждённых ' +
        (kind === "hard" ? "сложных" : "удобных") +
        " матчапов.</p>"
      );
    return (
      '<div class="matchup-cards">' +
      rows
        .map((r) => {
          const c = champions[r.id];
          if (!c || !faces[c.id] || !fs.existsSync(root + "/" + faces[c.id].icon))
            throw Error("Missing matchup champion " + r.id);
          return (
            '<details class="matchup-card matchup-' +
            kind +
            '" name="champion-matchup-open"><summary><img width="56" height="56" src="' +
            esc(faces[c.id].icon) +
            '" alt="" loading="lazy" decoding="async"><span>' +
            esc(c.name) +
            '</span><b aria-hidden="true">+</b></summary><div class="matchup-advice"><p><strong>' +
            (kind === "hard" ? "Чем опасен" : "Что учитывать") +
            "</strong>" +
            esc(r.why) +
            "</p><p><strong>Как играть</strong>" +
            esc(r.tip) +
            '</p><a href="' +
            esc(r.id) +
            '.html">Страница чемпиона ↗</a></div></details>'
          );
        })
        .join("") +
      "</div>"
    );
  }
  function stage(r, i, id) {
    const owner = champions[id];
    function side(kind, rows) {
      const enemy = champions[rows[0]?.id],
        title = kind === "hard" ? "Контрпики" : "Удобные соперники",
        dialog = "matchup-dialog-" + i + "-" + kind;
      const art = enemy
        ? '<img class="matchup-gate-art" src="' +
          esc(enemy.hero) +
          '" alt="" loading="lazy" decoding="async">'
        : "";
      return (
        '<div class="matchup-gate matchup-gate-' +
        kind +
        '">' +
        art +
        '<div class="matchup-gate-shade"></div><div class="matchup-gate-content"><span class="matchup-gate-count">' +
        rows.length +
        " " +
        (kind === "hard"
          ? rows.length === 1
            ? "контрпик"
            : rows.length
              ? "контрпика"
              : "контрпиков"
          : rows.length === 1
            ? "соперник"
            : rows.length
              ? "соперника"
              : "соперников") +
        "</span><h3>" +
        title +
        "</h3>" +
        (enemy
          ? '<div class="matchup-gate-faces" aria-hidden="true">' +
            rows
              .slice(0, 3)
              .map((row) => '<img src="' + esc(faces[row.id].icon) + '" alt="" loading="lazy">')
              .join("") +
            "</div>"
          : '<p class="matchup-empty">Подборка ещё не подтверждена.</p>') +
        '<button type="button" class="matchup-open-button" data-matchup-open="' +
        dialog +
        '" aria-haspopup="dialog"' +
        (rows.length ? "" : " disabled") +
        ">" +
        (kind === "hard" ? "Открыть контрпики" : "Открыть соперников") +
        '<span aria-hidden="true">↗</span></button></div></div><dialog class="matchup-dialog" id="' +
        dialog +
        '" aria-labelledby="' +
        dialog +
        '-title"><div class="matchup-dialog-heading"><div><span class="matchup-dialog-lane">' +
        esc(owner.name) +
        " · " +
        esc(lanes[r.role][1]) +
        '</span><h3 id="' +
        dialog +
        '-title">' +
        title +
        '</h3></div><button type="button" class="matchup-dialog-close" aria-label="Закрыть окно">×</button></div>' +
        cards(rows, kind) +
        "</dialog>"
      );
    }
    return (
      '<div class="matchup-duel-stage">' +
      side("hard", r.hard) +
      '<div class="matchup-duel-seam" aria-hidden="true"><span>R</span></div>' +
      side("easy", r.easy) +
      "</div>"
    );
  }
  let count = 0;
  for (const [id, c] of Object.entries(data.champions)) {
    const roles = c.roles.filter((r) => lanes[r.role]);
    if (!roles.length) throw Error("No matchup roles " + id);
    const first = buildRoles[builds[id].builds[0].label],
      initial = Math.max(
        0,
        roles.findIndex((r) => r.role === first || (first === "DRAGON" && r.role === "ADC")),
      );
    const html =
      '<section class="champion-matchups" aria-labelledby="matchups-title"><h2 id="matchups-title">Контрпики</h2><div class="matchup-role-tabs" role="tablist" aria-label="Матчапы по линии">' +
      roles
        .map(
          (r, i) =>
            '<button type="button" class="matchup-role-tab" role="tab" id="matchup-tab-' +
            i +
            '" aria-controls="matchup-panel-' +
            i +
            '" aria-selected="' +
            (i === initial) +
            '" tabindex="' +
            (i === initial ? "0" : "-1") +
            '" data-matchup-role="' +
            lanes[r.role][0] +
            '"><img src="assets/lanes/' +
            lanes[r.role][0] +
            '.png" alt="">' +
            esc(lanes[r.role][1]) +
            "</button>",
        )
        .join("") +
      "</div>" +
      roles
        .map(
          (r, i) =>
            '<div class="matchup-role-panel" role="tabpanel" id="matchup-panel-' +
            i +
            '" aria-labelledby="matchup-tab-' +
            i +
            '"' +
            (i === initial ? "" : " hidden") +
            ">" +
            stage(r, i, id) +
            "</div>",
        )
        .join("") +
      "</section>";
    const file = root + "/" + id + ".html";
    let page = fs
      .readFileSync(file, "utf8")
      .replace(/<!-- MATCHUPS START -->[\s\S]*?<!-- MATCHUPS END -->/g, "");
    const anchor = "<!-- ABILITIES START -->";
    if (!page.includes(anchor)) throw Error("Missing anchor " + id);
    page = page.replace(
      anchor,
      "<!-- MATCHUPS START -->" + html + "<!-- MATCHUPS END -->" + anchor,
    );
    fs.writeFileSync(file, page);
    count++;
  }
  console.log("Matchups rendered: " + count);
}
module.exports = { apply };
if (require.main === module) apply();
