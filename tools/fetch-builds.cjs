// Сборки по позициям: предметы, ботинки, руны, заклинания. Источник WildRiftFire.
const fs = require("fs"),
  path = require("path"),
  root = path.resolve(__dirname, "..");
const plain = (s) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/&#(?:0?39);|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
function divAt(html, start) {
  const tokens = /<\/?div\b[^>]*>/gi;
  tokens.lastIndex = start;
  let depth = 0,
    m;
  while ((m = tokens.exec(html))) {
    if (m[0].startsWith("</")) depth--;
    else depth++;
    if (depth === 0) return html.slice(start, tokens.lastIndex);
  }
  throw Error("Unclosed div");
}
function blocks(html, cls) {
  const re = new RegExp('<div[^>]*class="[^"]*\\b' + cls + '\\b[^\"]*"[^>]*>', "g");
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const body = divAt(html, m.index);
    out.push({ html: body, id: m[0].match(/data-guide-id="([^"]+)"/)?.[1] });
    re.lastIndex = m.index + body.length;
  }
  return out;
}
function icons(html) {
  const out = [];
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const src = m[0].match(/src="([^"]+)"/)?.[1];
    if (!src || !/^\/images\/(items|runes|summoners)\//.test(src)) continue;
    const name = plain(
      m[0].match(/alt="([^"]*)"/)?.[1] ||
        src
          .split("/")
          .at(-1)
          .replace(/\.png$/, "")
          .replaceAll("-", " "),
    );
    out.push({
      name,
      sourceIcon: "https://www.wildriftfire.com" + src,
      icon: "assets/builds/" + src.split("/").slice(-2).join("/"),
    });
  }
  return out;
}
async function request(url) {
  for (let n = 0; n < 3; n++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw Error(r.status + " " + url);
      return r;
    } catch (e) {
      if (n === 2) throw e;
    }
  }
}
async function run() {
  const file = root + "/champion-builds.json",
    data = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file))
      : { checked: "2026-11-09", champions: {} };
  const catalog = JSON.parse(fs.readFileSync(root + "/champion-catalog.json"));
  let cursor = 0,
    done = 0;
  const errors = [];
  async function worker() {
    while (cursor < catalog.length) {
      const c = catalog[cursor++];
      try {
        if (!data.champions[c.id]) {
          const url =
            "https://www.wildriftfire.com/guide/" +
            (c.id === "nunu-and-willump" ? "nunu-amp-willump" : c.id);
          const h = await (await request(url)).text();
          const labels = {};
          for (const m of h.matchAll(
            /<span[^>]*data-guide-id="([^"]+)"[^>]*>\s*<img[^>]*src="([^"]+)"[^>]*>\s*([^<]+)/g,
          ))
            labels[m[1]] = {
              label: plain(m[3]).replace(/\s*Build$/i, ""),
              lane: m[2].match(/white-([^/.]+)/)?.[1],
            };
          const items = blocks(h, "wf-champion__data__items"),
            spells = blocks(h, "wf-champion__data__spells");
          const builds = items.map((b, i) => {
            const pick = (cls) => icons(blocks(b.html, "section " + cls)[0]?.html || "");
            const spell = spells.find((x) => x.id === b.id) || spells[i];
            const defaultLane = h.match(/Recommended Role[\s\S]{0,500}?white-([a-z]+)\.png/)?.[1];
            const fallback = {
              label: {
                solo: "Solo",
                baron: "Solo",
                jungle: "Jungle",
                mid: "Mid",
                duo: "Duo",
                adc: "Duo",
                support: "Support",
              }[defaultLane],
              lane: defaultLane,
            };
            const result = {
              ...(labels[b.id] || fallback),
              id: b.id || String(i),
              items: pick("final"),
              starting: pick("starting"),
              core: pick("core"),
              boots: pick("boots"),
              runes: icons(blocks(spell?.html || "", "section runes")[0]?.html || ""),
              spells: icons(blocks(spell?.html || "", "section spells")[0]?.html || ""),
            };
            if (result.items.length < 5 || result.runes.length < 4 || result.spells.length !== 2)
              throw Error(
                "Incomplete build " +
                  JSON.stringify({
                    items: result.items.length,
                    runes: result.runes.length,
                    spells: result.spells.length,
                  }),
              );
            return result;
          });
          if (!builds.length) throw Error("No builds");
          data.champions[c.id] = {
            source: url,
            patch: h.match(/<span class="data">([\d.]+[a-z]?)<\/span>/)?.[1] || null,
            builds,
          };
          fs.writeFileSync(file, JSON.stringify(data, null, 2));
        }
        done++;
        if (done % 20 === 0) console.log("Fetched " + done + "/" + catalog.length);
      } catch (e) {
        errors.push(c.id + ": " + e.message);
        console.log("CHECK " + c.id + ": " + e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker));
  if (errors.length) throw Error(errors.join("\n"));
  const assets = new Map();
  for (const c of Object.values(data.champions))
    for (const b of c.builds)
      for (const group of ["items", "starting", "core", "boots", "runes", "spells"])
        for (const asset of b[group]) assets.set(asset.icon, asset);
  const list = [...assets.values()];
  let pos = 0;
  async function download() {
    while (pos < list.length) {
      const asset = list[pos++],
        dest = root + "/" + asset.icon;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (!fs.existsSync(dest))
        fs.writeFileSync(dest, Buffer.from(await (await request(asset.sourceIcon)).arrayBuffer()));
    }
  }
  await Promise.all(Array.from({ length: 6 }, download));
  console.log(
    "READY " +
      done +
      " champions, " +
      Object.values(data.champions).reduce((n, c) => n + c.builds.length, 0) +
      " builds, " +
      list.length +
      " assets",
  );
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
