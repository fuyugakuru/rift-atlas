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
    data = JSON.parse(fs.readFileSync(file)),
    all = Object.entries(data.champions);
  let cursor = 0;
  async function worker() {
    while (cursor < all.length) {
      const [id, c] = all[cursor++];
      const h = await (await request(c.source)).text();
      const groups = blocks(h, "wf-champion__data__situational");
      for (const b of c.builds) {
        const section = groups.find((x) => x.id === b.id);
        b.situational = [];
        if (!section) continue;
        for (const row of blocks(section.html, "section situation")) {
          const label = plain(
            row.html.match(/<span class="situation"[^>]*>([\s\S]*?)<\/span>/)?.[1] || "",
          );
          const items = blocks(row.html, "ico-holder")
            .map((x) => {
              const a = icons(x.html)[0];
              if (a)
                a.name = plain(x.html.match(/<div class="name">([\s\S]*?)<\/div>/)?.[1] || a.name);
              return a;
            })
            .filter(Boolean);
          if (label && items.length >= 2)
            b.situational.push({ label, replace: items[0], item: items[1] });
        }
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  const assets = new Map();
  const labels = new Set(),
    names = new Set();
  for (const c of Object.values(data.champions))
    for (const b of c.builds)
      for (const s of b.situational) {
        labels.add(s.label);
        for (const a of [s.replace, s.item]) {
          names.add(a.name);
          assets.set(a.icon, a);
        }
      }
  for (const a of assets.values()) {
    const dest = root + "/" + a.icon;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (!fs.existsSync(dest))
      fs.writeFileSync(dest, Buffer.from(await (await request(a.sourceIcon)).arrayBuffer()));
  }
  const ru = JSON.parse(fs.readFileSync(root + "/build-labels-ru.json")).names;
  console.log("Contexts", JSON.stringify([...labels]));
  console.log("Missing names", JSON.stringify([...names].filter((x) => !ru[x])));
  console.log(
    "Situational rows",
    Object.values(data.champions)
      .flatMap((c) => c.builds)
      .reduce((n, b) => n + b.situational.length, 0),
  );
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
