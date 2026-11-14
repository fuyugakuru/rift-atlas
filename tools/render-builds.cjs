require("./format-on-exit.cjs");
// Отображает сборки по позициям перед навыками на страницах чемпионов.
const fs = require("fs"),
  path = require("path"),
  root = path.resolve(__dirname, "..");
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
function bSource(c) {
  return c.additionalSources?.length ? "sources.html#build-sources" : c.source;
}
const { identity } = require("./fetch-asset-details.cjs");
const { numericText } = require("./render-abilities.cjs");
function apply() {
  const file = root + "/champion-builds.json";
  if (!fs.existsSync(file)) return;
  const data = JSON.parse(fs.readFileSync(file)),
    names = JSON.parse(fs.readFileSync(root + "/build-labels-ru.json")).names;
  const detailFile = root + "/build-asset-details.json";
  const detailData = fs.existsSync(detailFile)
    ? JSON.parse(fs.readFileSync(detailFile)).entries
    : {};
  const bootMap = fs.existsSync(root + "/boot-upgrades.json")
    ? JSON.parse(fs.readFileSync(root + "/boot-upgrades.json"))
    : {};
  function upgradeFor(items) {
    return items.map((a) => ({ base: a, upgrade: bootMap[a.name] })).find((x) => x.upgrade);
  }
  function bootUpgrade(items) {
    const pair = upgradeFor(items);
    if (!pair) return "";
    return (
      '<div class="build-group build-group-boot-upgrade"><div class="boot-upgrade-heading"><h3>Улучшение ботинок</h3><span>Вне очереди · с 10:00</span></div><div class="boot-upgrade-line"><ol class="build-assets">' +
      icon(pair.base, 0, false) +
      '</ol><span class="boot-upgrade-arrow" aria-hidden="true">→</span><ol class="build-assets">' +
      icon(pair.upgrade, 0, false) +
      '</ol><span class="boot-upgrade-caption">' +
      esc(names[pair.upgrade.name]) +
      "<small>+1000 золота · тот же слот</small></span></div></div>"
    );
  }
  const lanes = {
    Solo: ["baron", "Барона (топ)"],
    Jungle: ["jungle", "Лес"],
    Mid: ["mid", "Мид"],
    Duo: ["dragon", "Дракона (ADC)"],
    Support: ["support", "Поддержка"],
  };
  function icon(a, i, numbered) {
    if (!names[a.name]) throw Error("Missing Russian name: " + a.name);
    if (!fs.existsSync(root + "/" + a.icon)) throw Error("Missing icon: " + a.icon);
    return `<li class="build-asset"><button type="button" class="build-item-button" title="${esc(names[a.name])}" aria-label="${esc(names[a.name])}" data-item-name="${esc(names[a.name])}" data-item-key="${esc(identity(a))}" aria-expanded="false"><img src="${esc(a.icon)}" alt="" loading="lazy">${numbered ? "<span>" + String(i + 1) + "</span>" : ""}</button></li>`;
  }
  const conditions = {
    "vs Healing": "Против лечения",
    "vs Burst Damage": "Против взрывного урона",
    "vs Crowd Control": "Против контроля",
    "vs Tanks": "Против танков",
    "vs Shielding": "Против щитов",
    "vs AP / CC": "Против магов и контроля",
    "vs Critical Strike Damage": "Против критов",
    "vs Critial Strike Damage": "Против критов",
    "vs Ability Power": "Против магов",
    "vs Attack Speed": "Против скорости атаки",
    "vs Attack Damage": "Против физ. урона",
    "For Split Pushing": "Для сплитпуша",
    "vs Squishies": "Против хрупких целей",
    "vs Tanks / Healing": "Против танков и лечения",
  };
  function situations(build, kind = "items") {
    const rows = kind === "runes" ? build.situationalRunes : build.situational;
    if (!rows?.length) return "";
    const contexts = {
      "vs Poke": "Против постоянного харасса",
      "For More Damage": "Больше урона",
      ...conditions,
    };
    const notes = {
      "vs Poke": "Если противник постоянно наносит урон с расстояния.",
      "vs Burst Damage": "Если опасен короткий взрывной урон.",
      "vs Crowd Control": "Если мешают оглушения, обездвиживание и другой контроль.",
      "vs Tanks": "Для игры против живучих противников.",
      "For More Damage": "Если можно отказаться от защиты ради урона.",
      "vs Squishies": "Для игры против хрупких целей.",
    };
    return (
      '<div class="build-situations"><h3>' +
      (kind === "runes" ? "Ситуативные руны" : "Ситуативные предметы") +
      '</h3><div class="situation-buttons">' +
      rows
        .map((s, i) => {
          if (!contexts[s.label]) throw Error("Unknown situation " + s.label);
          return (
            '<button type="button" class="situation-button" aria-expanded="false" data-situation="' +
            kind +
            "-" +
            i +
            '">' +
            esc(contexts[s.label]) +
            "</button>"
          );
        })
        .join("") +
      "</div>" +
      rows
        .map(
          (s, i) =>
            '<div class="situation-result" data-situation-result="' +
            kind +
            "-" +
            i +
            '" hidden><span class="swap-label">Заменить</span><ol class="build-assets swap-assets">' +
            icon(s.replace, 0, false) +
            '</ol><span class="swap-arrow" aria-hidden="true">→</span><ol class="build-assets swap-assets">' +
            icon(s.item, 0, false) +
            '</ol><span class="swap-name">' +
            esc(names[s.item.name]) +
            "</span>" +
            (kind === "runes" && notes[s.label]
              ? '<span class="rune-context">' + esc(notes[s.label]) + "</span>"
              : "") +
            "</div>",
        )
        .join("") +
      "</div>"
    );
  }

  function equipment(build) {
    if (!build.equipmentVariants?.length)
      return group("Предметы", build.items, "items", true) + bootUpgrade(build.items);
    const labels = {
      "anti-tank": "Против танков",
      safety: "Защитный вариант",
      sustain: "Для выживания",
      utility: "Для команды",
      pen: "Пробивание",
      "anti-ad": "Против физ. урона",
      "anti-ap": "Против магов",
      peel: "Защита союзников",
      "anti-dive": "Против врыва",
      bruiser: "Для затяжного боя",
    };
    const variants = [
      { items: build.items, label: build.equipmentBaseLabel || "Базовая" },
      ...build.equipmentVariants.map((v) => ({ ...v, label: labels[v.key] || v.label })),
    ];
    return (
      '<div class="equipment-chooser"><div class="equipment-buttons">' +
      variants
        .map(
          (v, i) =>
            '<button type="button" class="equipment-button" data-equipment="' +
            i +
            '" aria-pressed="' +
            (i === 0) +
            '">' +
            esc(v.label) +
            "</button>",
        )
        .join("") +
      "</div>" +
      variants
        .map(
          (v, i) =>
            '<div data-equipment-panel="' +
            i +
            '"' +
            (i ? " hidden" : "") +
            ">" +
            group("Предметы", v.items, "items", true) +
            bootUpgrade(v.items) +
            "</div>",
        )
        .join("") +
      "</div>"
    );
  }
  function runeGroups(build) {
    if (!build.equipmentVariants?.length) return group("Руны", build.runes, "runes");
    return [{ runes: build.runes }, ...build.equipmentVariants]
      .map(
        (v, i) =>
          '<div data-equipment-runes="' +
          i +
          '"' +
          (i ? " hidden" : "") +
          ">" +
          group("Руны", v.runes || build.runes, "runes") +
          "</div>",
      )
      .join("");
  }
  function runeSituations(build) {
    if (!build.equipmentVariants?.length) return situations(build, "runes");
    return [build, ...build.equipmentVariants]
      .map(
        (v, i) =>
          '<div data-equipment-rune-situations="' +
          i +
          '"' +
          (i ? " hidden" : "") +
          ">" +
          situations(
            {
              ...v,
              situationalRunes: (v.situationalRunes || []).filter((s) =>
                (v.runes || build.runes).some((r) => r.name === s.replace.name),
              ),
            },
            "runes",
          ) +
          "</div>",
      )
      .join("");
  }
  function assetDetails(build, index) {
    const assets = [
      ...build.items,
      ...build.runes,
      ...build.spells,
      ...build.starting,
      ...(build.equipmentVariants || []).flatMap((v) => [
        ...v.items,
        ...(v.runes || []),
        ...(v.situationalRunes || []).flatMap((s) => [s.replace, s.item]),
      ]),
      ...[build.items, ...(build.equipmentVariants || []).map((v) => v.items)]
        .map((items) => upgradeFor(items)?.upgrade)
        .filter(Boolean),
      ...(build.situational || []).flatMap((s) => [s.replace, s.item]),
      ...(build.situationalRunes || []).flatMap((s) => [s.replace, s.item]),
    ];
    const unique = new Map(assets.map((a) => [identity(a), a]));
    return (
      '<div class="build-item-info item-detail-region" id="build-detail-' +
      index +
      '" hidden><button type="button" class="build-detail-close" aria-label="Скрыть описание">Скрыть ×</button>' +
      [...unique]
        .map(([key, a], j) => {
          const d = detailData[key];
          if (!d) throw Error("Missing description " + key);
          const type = { item: "Предмет", rune: "Руна", spell: "Заклинание" }[d.type];
          return (
            '<article class="build-asset-detail" data-detail-key="' +
            esc(key) +
            '" aria-labelledby="asset-detail-title-' +
            index +
            "-" +
            j +
            '" hidden><div class="asset-detail-header"><img src="' +
            esc(a.icon) +
            '" alt=""><div><p class="ability-type">' +
            type +
            '</p><h3 id="asset-detail-title-' +
            index +
            "-" +
            j +
            '">' +
            esc(d.name) +
            "</h3>" +
            (d.cost ? '<span class="asset-detail-cost">' + esc(d.cost) + " золота</span>" : "") +
            '</div></div><div class="ability-description asset-detail-description">' +
            numericText(d.description) +
            '</div><a class="asset-detail-source" href="' +
            esc(d.source) +
            '" target="_blank" rel="noopener noreferrer">Источник ↗</a></article>'
          );
        })
        .join("") +
      "</div>"
    );
  }
  function extraPositions(c) {
    const labels = {
      baron: "Барона (топ)",
      jungle: "Лес",
      mid: "Мид",
      dragon: "Дракона (ADC)",
      support: "Поддержка",
    };
    if (!c.extraPositions?.length) return "";
    return (
      '<details class="extra-positions"><summary>Другие ситуативные позиции: ' +
      c.extraPositions.map((p) => labels[p]).join(", ") +
      "</summary><p>Позиции отмечены в источниках, но отдельная полная сборка пока не подтверждена.</p></details>"
    );
  }
  function group(title, assets, kind, numbered = false) {
    return assets.length
      ? `<div class="build-group build-group-${kind}"><h3>${title}</h3><ol class="build-assets build-assets-${kind}">${assets.map((a, i) => icon(a, i, numbered)).join("")}</ol></div>`
      : "";
  }
  let count = 0;
  for (const [id, c] of Object.entries(data.champions)) {
    const file = root + "/" + id + ".html";
    let html = fs.readFileSync(file, "utf8");
    const tabs = c.builds
      .map((b, i) => {
        const lane = lanes[b.label];
        if (!lane) throw Error("Unknown build lane: " + id + " " + b.label);
        return `<button type="button" class="build-tab" id="build-tab-${i}" role="tab" aria-selected="${i === 0}" aria-controls="build-panel-${i}" tabindex="${i === 0 ? 0 : -1}"><img src="assets/lanes/${lane[0]}.png" alt="">${esc(lane[1])}</button>`;
      })
      .join("");
    const section = `<section class="champion-builds compact-builds" aria-labelledby="builds-title"><div class="builds-heading"><h2 id="builds-title">Сборка</h2>${c.patch ? '<span class="build-patch">Патч ' + esc(c.patch) + "</span>" : ""}</div><div class="build-tabs" role="tablist" aria-label="Сборка по позиции">${tabs}</div>${c.builds.map((b, i) => `<div class="build-panel" data-build-source="${esc(b.source || c.source)}" data-build-source-label="${esc(b.sourceLabel || "WildRiftFire")}" data-build-patch="${esc(b.patch || c.patch || "")}" id="build-panel-${i}" role="tabpanel" aria-labelledby="build-tab-${i}"${i === 0 ? "" : " hidden"}>${equipment(b)}<div class="build-extras">${group("Старт", b.starting, "starting")}${group("Заклинания", b.spells, "spells")}${runeGroups(b)}${b.runeStatus === "incomplete" ? '<p class="build-rune-status">Полный набор рун для этой позиции ещё не подтверждён.</p>' : ""}</div>${b.runeSource ? '<p class="build-rune-source">Руны: <a href="' + esc(b.runeSource) + '" target="_blank" rel="noopener noreferrer">Wild Rift Meta ↗</a></p>' : ""}${situations(b)}${runeSituations(b)}${assetDetails(b, i)}</div>`).join("")}${extraPositions(c)}<div class="builds-footer"><p>Не копируй сборку — смотри на противников и создавай её сам.</p></div></section>`;
    html = html.replace(/<!-- BUILDS START -->[\s\S]*?<!-- BUILDS END -->/g, "");
    const anchor = "<!-- ABILITIES START -->";
    if (!html.includes(anchor)) throw Error("Missing abilities anchor: " + id);
    html = html.replace(anchor, "<!-- BUILDS START -->" + section + "<!-- BUILDS END -->" + anchor);
    fs.writeFileSync(file, html);
    count++;
  }
  console.log("Builds rendered: " + count);
  require("./render-matchups.cjs").apply();
}
module.exports = { apply };
if (require.main === module) apply();
