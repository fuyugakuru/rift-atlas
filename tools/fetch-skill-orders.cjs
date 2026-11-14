// Читает рекомендации автора гайда; не подставляет порядок другой позиции.
const fs = require("fs"),
  path = require("path"),
  root = path.resolve(__dirname, "..");
const builds = JSON.parse(fs.readFileSync(root + "/champion-builds.json")).champions;
const cache = path.join(root, ".research-skills");
fs.mkdirSync(cache, { recursive: true });
function parse(h) {
  const out = [];
  for (const m of h.matchAll(/<div class="skills-counters-block[^>]*data-guide-id="([^"]+)"/g)) {
    const part = h.slice(m.index, h.indexOf('counters-block">', m.index + 50));
    const sequence = Array(15).fill(null),
      rows = [];
    for (const r of part.matchAll(/<ul data-row="(\d+)"[^>]*>([\s\S]*?)<\/ul>/g)) {
      const n = +r[1],
        levels = [];
      for (const cell of r[2].matchAll(/<li level="(\d+)"([^>]*)>/g)) {
        if (/\blit\b/.test(cell[2])) {
          const level = +cell[1];
          if (sequence[level - 1]) throw Error("Duplicate level");
          sequence[level - 1] = n;
          levels.push(level);
        }
      }
      rows.push({ skill: n, levels });
    }
    if (rows.length !== 4 || sequence.some((x) => !x))
      throw Error("Incomplete skill order " + m[1]);
    const priority = rows
      .filter((r) => r.skill !== 4)
      .sort((a, b) => a.levels.at(-1) - b.levels.at(-1))
      .map((r) => r.skill);
    out.push({ guideId: m[1], sequence, priority });
  }
  return out;
}
async function main() {
  const data = { checked: new Date().toISOString().slice(0, 10), champions: {} },
    ids = Object.keys(builds);
  let cursor = 0,
    done = 0;
  const errors = [];
  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor++],
        c = builds[id];
      try {
        const url = c.source,
          f = cache + "/" + id + ".html";
        let h;
        if (fs.existsSync(f)) h = fs.readFileSync(f, "utf8");
        else {
          const r = await fetch(url, { signal: AbortSignal.timeout(45000) });
          if (!r.ok) throw Error(r.status);
          h = await r.text();
          fs.writeFileSync(f, h);
        }
        const orders = parse(h);
        if (!orders.length) throw Error("No skill orders");
        const roles = {};
        for (const b of c.builds) {
          const order = orders.find((o) => o.guideId === b.id);
          if (order) roles[b.label] = { ...order, source: url };
        }
        data.champions[id] = { roles };
      } catch (e) {
        errors.push(id + ": " + e.message);
      }
      if (++done % 25 === 0) console.log("Skills " + done + "/" + ids.length);
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker));
  fs.writeFileSync(root + "/champion-skill-orders.json", JSON.stringify(data, null, 2));
  console.log("Complete", Object.keys(data.champions).length, "Errors", errors);
  if (errors.length) process.exitCode = 1;
}
module.exports = { parse };
if (require.main === module)
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
