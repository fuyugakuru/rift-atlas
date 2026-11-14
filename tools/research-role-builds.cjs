// Дополнительная сверка по слотам рун и позициям Jungler.GG; сохраняет исходные ссылки.
const fs = require("fs"),
  path = require("path"),
  root = path.resolve(__dirname, "..");
const plain = (s) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
function divAt(h, start) {
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = start;
  let depth = 0,
    m;
  while ((m = re.exec(h))) {
    depth += m[0].startsWith("</") ? -1 : 1;
    if (!depth) return h.slice(start, re.lastIndex);
  }
  throw Error("Unclosed div");
}
function blocks(h, pattern) {
  const re = new RegExp('<div[^>]*class="[^\"]*' + pattern + '[^\"]*"[^>]*>', "g"),
    out = [];
  let m;
  while ((m = re.exec(h))) {
    const body = divAt(h, m.index);
    out.push(body);
    re.lastIndex = m.index + body.length;
  }
  return out;
}
function icons(h) {
  return [...h.matchAll(/<img\b[^>]*>/g)]
    .map((m) => {
      const name = m[0].match(/alt="Wild Rift ([^"]+)"/)?.[1],
        src = m[0].match(/\bsrc="([^"]+)"/)?.[1];
      if (!name || !src) return null;
      const uri = new URL(src.replaceAll("&amp;", "&"), "https://jungler.gg");
      const raw = uri.searchParams.get("url") || uri.pathname;
      return {
        name: plain(name)
          .replace(/^Rune /, "")
          .replace(/ Item$/, ""),
        sourceIcon: new URL(raw, "https://jungler.gg").href,
        icon: "assets/builds/jungler/" + raw.split("/").at(-1).split("?")[0],
      };
    })
    .filter(Boolean);
}
const key = (s) => s.replace(/[^a-z0-9]/g, "").replace("andwillump", "willump");
async function run() {
  const cache = process.argv[2],
    catalog = JSON.parse(fs.readFileSync(root + "/champion-catalog.json")),
    links = JSON.parse(fs.readFileSync(process.argv[3]));
  fs.mkdirSync(cache, { recursive: true });
  const file = root + "/champion-build-research.json",
    data = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file))
      : { checked: "2026-11-09", champions: {} };
  const queue = [];
  for (const c of catalog) {
    const href = links.find((l) => key(l.split("/")[3]) === key(c.id));
    if (href) queue.push({ id: c.id, url: new URL(href, "https://jungler.gg").href });
  }
  const seen = new Set(queue.map((x) => x.url));
  let done = 0;
  for (let index = 0; index < queue.length; index++) {
    const { id, url } = queue[index],
      cacheFile =
        cache +
        "/" +
        id +
        "-" +
        (url.split("/").filter(Boolean).at(-1) === "build"
          ? "default"
          : url.split("/").filter(Boolean).at(-1)) +
        ".html";
    let h;
    if (fs.existsSync(cacheFile)) h = fs.readFileSync(cacheFile, "utf8");
    else {
      await new Promise((r) => setTimeout(r, 1000));
      let response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (response.status === 429) {
        console.log("Rate limit, waiting 30 seconds");
        await new Promise((r) => setTimeout(r, 30000));
        response = await fetch(url);
      }
      if (!response.ok) {
        console.log("Unavailable " + url + " " + response.status);
        continue;
      }
      h = await response.text();
      fs.writeFileSync(cacheFile, h);
    }
    const roleLinks = [
      ...h.matchAll(
        /href="([^"#]*\/wild-rift\/champions\/[^"#]+\/build\/(?:solo|mid|duo|support|jungle)\/)"/g,
      ),
    ].map((m) => new URL(m[1], "https://jungler.gg").href);
    for (const link of roleLinks)
      if (!seen.has(link)) {
        seen.add(link);
        queue.push({ id, url: link });
      }
    const heading = plain(
      h.match(/<h2 class="Build-module__[^"]+__title">([\s\S]*?)<\/h2>/)?.[1] || "",
    );
    const role = heading
      .match(/(Solo|Baron|Top|Mid|Duo|Dragon|ADC|Support|Jungle)\s+Build$/i)?.[1]
      .toLowerCase();
    if (!role) {
      console.log("Missing role " + id);
      continue;
    }
    const groups = blocks(h, 'Runes-module__[^\s"]+__wrapper').map((g) => icons(g));
    const runes = groups.map((g) => g[0]).filter(Boolean);
    const runeAlternatives = groups
      .map((g) => ({ base: g[0], options: g.slice(1) }))
      .filter((g) => g.options.length);
    function itemGroup(label) {
      const m = new RegExp("<h4[^>]*>" + label + "<\\/h4>\\s*<div[^>]*>", "g").exec(h);
      if (!m) return [];
      const start = m.index + m[0].lastIndexOf("<div");
      return icons(divAt(h, start));
    }
    const allIcons = icons(h);
    const spells = [
      ...new Map(
        allIcons.filter((a) => /summoner|\/spells\//.test(a.sourceIcon)).map((a) => [a.name, a]),
      ).values(),
    ];
    const patch = plain(h.match(/Patch\s*([\d.]+[a-z]?)/)?.[1] || "");
    const page = {
      source: url,
      patch,
      role,
      items: itemGroup("Full Build"),
      starting: itemGroup("Starting Items"),
      enchants: itemGroup("Enchants"),
      runes,
      runeAlternatives,
      spells,
    };
    data.champions[id] ??= { pages: [] };
    const pages = data.champions[id].pages,
      old = pages.findIndex((p) => p.role === role);
    if (old < 0) pages.push(page);
    else if (!url.endsWith("/build/")) pages[old] = page;
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    done++;
    if (done % 20 === 0) console.log("Checked " + done + " role pages; queue " + queue.length);
  }
  console.log(
    "DONE " +
      Object.keys(data.champions).length +
      " champions, " +
      Object.values(data.champions).reduce((n, c) => n + c.pages.length, 0) +
      " role builds",
  );
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
