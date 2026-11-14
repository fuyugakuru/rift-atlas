// Объединяет проверенные позиции; неполные наборы не выдаются за готовые сборки.
const fs = require("fs"),
  root = "E:/Сайты/RiftAtlas";
const file = root + "/champion-builds.json",
  data = JSON.parse(fs.readFileSync(file)),
  audit = JSON.parse(fs.readFileSync(root + "/champion-role-audit.json")),
  lanes = JSON.parse(fs.readFileSync(root + "/champion-lanes.json")),
  ru = JSON.parse(fs.readFileSync(root + "/build-labels-ru.json"));
const map = {
  TOP: ["Solo", "baron"],
  MID: ["Mid", "mid"],
  JUNGLE: ["Jungle", "jungle"],
  ADC: ["Duo", "dragon"],
  DRAGON: ["Duo", "dragon"],
  SUPPORT: ["Support", "support"],
};
const pool = new Map();
for (const c of Object.values(data.champions))
  for (const b of c.builds) {
    for (const g of ["items", "starting", "core", "boots", "runes", "spells"])
      for (const a of b[g] || []) pool.set(a.name, a);
    for (const s of [...(b.situational || []), ...(b.situationalRunes || [])])
      for (const a of [s.replace, s.item]) pool.set(a.name, a);
  }
const aliases = {
  "Grasp of Undying": "Grasp of the Undying",
  "Eyeball Collection": "Eyeball Collector",
  "Legend Bloodline": "Legend: Bloodline",
  "Legend Alacrity": "Legend: Alacrity",
  "Zhonyas Hourglass": "Zhonya's Hourglass",
};
function asset(a) {
  const name = aliases[a.name] || a.name;
  if (pool.has(name)) return pool.get(name);
  return { ...a, name };
}
const fixed = {
  "aurora:TOP": [
    "Electrocute",
    "Sudden Impact",
    "Chain Assault",
    "Eyeball Collector",
    "Bone Plating",
  ],
  "veigar:SUPPORT": ["Electrocute", "Cheap Shot", "Chain Assault", "Zombie Ward", "Cut Down"],
  "gragas:TOP": ["Grasp of the Undying", "Demolish", "Bone Plating", "Overgrowth", "Cut Down"],
  "gragas:MID": [
    "First Strike",
    "Sudden Impact",
    "Chain Assault",
    "Eyeball Collector",
    "Bone Plating",
  ],
  "pyke:MID": ["Electrocute", "Sudden Impact", "Chain Assault", "Eyeball Collector", "Second Wind"],
  "pantheon:MID": ["First Strike", "Brutal", "Coup de Grace", "Legend: Bloodline", "Bone Plating"],
  "talon:MID": [
    "Electrocute",
    "Sudden Impact",
    "Chain Assault",
    "Eyeball Collector",
    "Bone Plating",
  ],
};
function metaRunes(id, lane) {
  const role = map[lane][1],
    h = fs.readFileSync("work/rift/meta-" + id + "-" + role + ".html", "utf8"),
    a = h.indexOf("Spells and runes"),
    b = h.indexOf("Skill order", a),
    part = h.slice(a, b),
    available = [...part.matchAll(/<img class="table-icon"[^>]*alt="([^"]+)"/g)].map(
      (m) => aliases[m[1].replace(/ icon$/, "")] || m[1].replace(/ icon$/, ""),
    );
  return fixed[id + ":" + lane].map((name) => {
    if (!available.includes(name)) throw Error("Unverified rune " + id + " " + name);
    if (!pool.has(name)) throw Error("Missing rune icon " + name);
    return pool.get(name);
  });
}
let added = 0;
for (const [id, c] of Object.entries(audit.champions)) {
  const existing = data.champions[id];
  existing.additionalSources = [c.source];
  const allSwaps = existing.builds.flatMap((b) => b.situationalRunes || []);
  for (const source of c.builds) {
    const role = map[source.lane];
    if (!role) throw Error(source.lane);
    if (existing.builds.some((b) => b.label === role[0])) continue;
    const standard = source.variants[0];
    if (standard?.items.length !== 5 || source.boots.length !== 1)
      throw Error("No full items " + id);
    let runes = source.runes.map(asset),
      runeSource = null;
    if (runes.length !== 5) {
      runes = metaRunes(id, source.lane);
      runeSource = "https://www.wildriftmeta.com/champions/" + id + "/builds/" + role[1] + "/";
    }
    if (runes.length !== 5) throw Error("Incomplete runes " + id);
    const equipmentVariants = source.variants
      .slice(1)
      .map((v) => ({
        key: v.key,
        label: v.label,
        items: [...source.boots, ...v.items].map(asset),
      }));
    const build = {
      id: "core-" + source.lane,
      label: role[0],
      lane: role[1],
      source: c.source,
      sourceLabel: "Wild Rift Core",
      patch: "7.3",
      runeSource,
      items: [...source.boots, ...standard.items].map(asset),
      starting: [],
      core: standard.items.map(asset),
      boots: source.boots.map(asset),
      runes,
      spells: [],
      situational: [],
      situationalRunes: allSwaps.filter((s) => runes.some((r) => r.name === s.replace.name)),
      equipmentVariants,
    };
    existing.builds.push(build);
    added++;
  }
  const confirmed = new Set([
    ...lanes.positions[id],
    ...c.positions.map((p) => map[p]?.[1]).filter(Boolean),
  ]);
  lanes.positions[id] = [...confirmed];
  existing.extraPositions = [...confirmed].filter(
    (l) =>
      !existing.builds.some(
        (b) =>
          b.lane === l ||
          map[
            { Solo: "TOP", Mid: "MID", Jungle: "JUNGLE", Duo: "ADC", Support: "SUPPORT" }[b.label]
          ]?.[1] === l,
      ),
  );
}
lanes.additionalSources = ["https://wildriftcore.com/en/champions/"];
lanes.checked = "2026-11-09";
fs.writeFileSync(file, JSON.stringify(data, null, 2));
fs.writeFileSync(root + "/champion-lanes.json", JSON.stringify(lanes, null, 2));
const unknown = new Set();
for (const c of Object.values(data.champions))
  for (const b of c.builds)
    for (const a of [
      ...b.items,
      ...b.runes,
      ...(b.equipmentVariants?.flatMap((v) => v.items) || []),
    ])
      if (!ru.names[a.name]) unknown.add(a.name);
console.log("ADDED " + added + " builds; missing Russian names:", JSON.stringify([...unknown]));
