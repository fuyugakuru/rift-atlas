// Общие обозначения для навыков, предметов и рун. Цвет дополняет текст.
const esc = (x) =>
  String(x).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const paths = {
  mana: "M8 1C6 4 2 8 2 11a6 6 0 0 0 12 0C14 8 10 4 8 1Z",
  energy: "m9 1-7 8h5l-1 6 8-9H9Z",
  health: "M8 14 2 8C-2 3 4-1 8 4c4-5 10-1 6 4Z",
  fury: "M8 1c1 5 6 5 5 10a5 5 0 0 1-10 0c0-2 1-4 3-6-1 4 2 5 2-4Z",
  ad: "m11 1 4 0 0 4-8 8-4-4Zm-7 9-3 4m0-4 4 4",
  ap: "m8 1 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z",
  armor: "M8 1 14 3v5c0 3-3 5-6 7-3-2-6-4-6-7V3Zm0 2v9",
  mr: "M8 1 14 3v5c0 3-3 5-6 7-3-2-6-4-6-7V3Zm0 4 2 3-2 3-2-3Z",
  armorpen: "M2 2 11 4v6l-5 4-4-4Zm1 11L14 2m-4 0h4v4",
  magicpen: "M8 1 14 4v5l-6 6-6-6V4Zm-5 12L13 3m-4 0h4v4",
  crit: "m9 1-1 5 6-3-4 6 5 1-6 2-2 4-1-5-5 2 3-5-3-2 5 0Z",
  true: "m8 1 6 7-6 7-6-7Z",
};
function icon(type, label) {
  return (
    '<svg class="stat-icon stat-' +
    type +
    '" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
    paths[type] +
    '"/></svg>'
  );
}
const terms = [
  ["armorpen", /пробивани[ея]\s+брони|снижени[ея]\s+брони/gi],
  ["magicpen", /магическ(?:ое|ого)\s+пробивани[ея]|пробивани[ея]\s+сопротивления\s+магии/gi],
  ["mr", /сопротивлени[еяю]\s+магии/gi],
  ["ap", /сил[аыу]\s+умений|магическ(?:ий|ого|ому)\s+урон[ау]?/gi],
  ["ad", /сил[аыу]\s+атаки|физическ(?:ий|ого|ому)\s+урон[ау]?/gi],
  ["crit", /шанс[а]?\s+критическ(?:ого|их)\s+(?:удара|ударов)|критическ(?:ий|ого)\s+урон[ау]?/gi],
  ["armor", /брон[яию]|брони/gi],
  ["true", /чист(?:ый|ого)\s+урон[ау]?/gi],
];
function kind(text) {
  for (const [t, re] of terms) {
    re.lastIndex = 0;
    if (re.test(text)) return t;
  }
  return "";
}
const phrase = new RegExp(terms.map(([, re]) => "(?:" + re.source + ")").join("|"), "gi");
function words(text) {
  let html = "",
    cursor = 0;
  for (const m of text.matchAll(phrase)) {
    const type = kind(m[0]);
    html +=
      esc(text.slice(cursor, m.index)) +
      '<span class="stat-term stat-' +
      type +
      '">' +
      icon(type) +
      esc(m[0]) +
      "</span>";
    cursor = m.index + m[0].length;
  }
  return html + esc(text.slice(cursor));
}
function numericText(value) {
  const number =
    /\d+(?:[.,]\d+)?(?:\s*%|\s*\/\s*\d+(?:[.,]\d+)?)*%?(?:\s+(?:от\s+)?(?:(?:дополнительной|бонусной|бонуса?|общей|базовой)\s+)?сил[аыу]\s+(?:атаки|умений))?/gi;
  let html = "",
    cursor = 0;
  for (const m of value.matchAll(number)) {
    const text = m[0],
      tail = value.slice(m.index + text.length);
    let type = kind(text);
    if (!type) {
      const suffix = tail
        .replace(/^\s*\([^)]*\)/, "")
        .match(/^\s*(?:(?:дополнительного|от|максимального|базового)\s+)?([^.;,\n]{0,65})/);
      const lead = suffix?.[1] || "";
      if (/^(?:магическ|физическ|чист|брони|броню|сопротивлен|пробиван|шанс|критическ)/i.test(lead))
        type = kind(lead);
    }
    html +=
      words(value.slice(cursor, m.index)) +
      '<strong class="ability-value' +
      (type ? " stat-" + type : "") +
      '">' +
      words(text) +
      "</strong>";
    cursor = m.index + text.length;
  }
  return (html + words(value.slice(cursor))).replace(/\n/g, "<br>");
}
function resource(id) {
  if (["akali", "kennen", "zed", "lee-sin", "shen", "ambessa"].includes(id))
    return ["energy", "Энергия"];
  if (id === "dr-mundo") return ["health", "Здоровье"];
  if (id === "shyvana") return ["fury", "Ярость"];
  return ["mana", "Мана"];
}
function parameters(value, id) {
  const [type, label] = resource(id);
  return (
    '<div class="ability-parameters">' +
    (value.cooldown
      ? "<span><small>Перезарядка</small><b>" +
        esc(value.cooldown.replace(/\s+/g, " ")) +
        " с</b></span>"
      : "") +
    (value.cost
      ? "<span><small>Стоимость " +
        icon(type) +
        '<span class="resource-label stat-' +
        type +
        '">' +
        label +
        "</span></small><b>" +
        esc(value.cost.replace(/\s+/g, " ")) +
        "</b></span>"
      : "") +
    "</div>"
  );
}
module.exports = { numericText, parameters };
