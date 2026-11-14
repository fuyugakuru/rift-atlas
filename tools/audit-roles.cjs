// Сверяет дополнительные позиции и сборки всех чемпионов с Wild Rift Core.
const fs = require("fs"),
  path = require("path"),
  root = path.resolve(__dirname, "..");
const plain = (s) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#160;|&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
function element(html, start, tag = "div") {
  const re = new RegExp("<\\/?" + tag + "\\b[^>]*>", "gi");
  re.lastIndex = start;
  let depth = 0,
    m;
  while ((m = re.exec(html))) {
    depth += m[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(start, re.lastIndex);
  }
  throw Error("Unclosed " + tag);
}
function blocks(html, cls, tag = "div") {
  const re = new RegExp("<" + tag + '[^>]*class="[^\"]*\\b' + cls + '\\b[^\"]*"[^>]*>', "g"),
    out = [];
  let m;
  while ((m = re.exec(html))) {
    const body = element(html, m.index, tag);
    out.push(body);
    re.lastIndex = m.index + body.length;
  }
  return out;
}
function icons(html) {
  return [...html.matchAll(/<img\b[^>]*>/g)]
    .map((m) => {
      const src = m[0].match(/src="([^"]+)"/)?.[1],
        name = plain(m[0].match(/alt="([^"]+)"/)?.[1] || "");
      if (!src || !name) return null;
      return {
        name,
        sourceIcon: new URL(src, "https://wildriftcore.com").href,
        icon: "assets/builds/core/" + src.split("/").at(-1),
      };
    })
    .filter(Boolean);
}
async function request(url) {
  for (let n = 0; n < 4; n++) {
    await new Promise((r) => setTimeout(r, 1800));
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (response.ok) return response;
    if (response.status === 429) {
      const delay = Math.max(30, Number(response.headers.get("retry-after")) || 30);
      console.log("Rate limit: waiting " + delay + " seconds");
      await new Promise((r) => setTimeout(r, delay * 1000));
      continue;
    }
    throw Error(response.status + " " + url);
  }
  throw Error("Repeated rate limit " + url);
}
async function run() {
  const cache = process.argv[2] || root + "/tools/source-cache/core";
  fs.mkdirSync(cache, { recursive: true });
  const catalog = JSON.parse(fs.readFileSync(root + "/champion-catalog.json")),
    audit = { checked: "2026-11-09", champions: {} };
  const aliases = {
    velkoz: "vel-koz",
    ksante: "k-sante",
    khazix: "kha-zix",
    kaisa: "kai-sa",
    kogmaw: "kog-maw",
    "nunu-and-willump": "nunu-willump",
    chogath: "cho-gath",
  };
  let cursor = 0,
    done = 0;
  const errors = [];
  async function worker() {
    while (cursor < catalog.length) {
      const c = catalog[cursor++];
      try {
        const url = "https://wildriftcore.com/en/champions/" + (aliases[c.id] || c.id) + "/builds/",
          file = cache + "/" + c.id + ".html";
        const html = fs.existsSync(file)
          ? fs.readFileSync(file, "utf8")
          : await (await request(url)).text();
        fs.writeFileSync(file, html);
        const cover = plain(html.match(/<span class="cover__id">([\s\S]*?)<\/span>/)?.[1] || "");
        const lanes = cover
          .split("·")
          .map((s) => s.trim())
          .filter((s) => ["TOP", "MID", "JUNGLE", "ADC", "DRAGON", "SUPPORT"].includes(s));
        if (!lanes.length) throw Error("No positions");
        const panels = blocks(html, "eb-rolepanel");
        const sourcePanels = panels.length ? panels : [html];
        const builds = sourcePanels.map((panel, i) => {
          const title = plain(panel.match(/<h3 class="eb-role-title">([\s\S]*?)<\/h3>/)?.[1] || "");
          let lane = title.includes("Baron")
            ? "TOP"
            : title.includes("Mid")
              ? "MID"
              : title.includes("Jungle")
                ? "JUNGLE"
                : title.includes("Support")
                  ? "SUPPORT"
                  : /Dragon|Duo|ADC/.test(title)
                    ? "ADC"
                    : lanes[i] || lanes[0];
          const variants = blocks(panel, "engine-builds__variant", "article")
            .map((v) => ({
              key: v.match(/data-variant-key="([^"]+)"/)?.[1],
              label: plain(v.match(/<h[34][^>]*>([\s\S]*?)<\/h[34]>/)?.[1] || ""),
              items: icons(blocks(v, "eb-items")[0] || ""),
            }))
            .filter((v) => v.items.length >= 4);
          const shared = blocks(panel, "engine-builds__shared-block")[0] || "";
          const boots = icons(blocks(shared, "eb-sit")[0] || "").filter(
            (a) => !a.sourceIcon.includes("runes"),
          );
          const runes = icons(blocks(shared, "eb-sit--runes")[0] || "");
          return { lane: lane === "DRAGON" ? "ADC" : lane, variants, boots, runes };
        });
        audit.champions[c.id] = { source: url, positions: lanes, builds };
        fs.writeFileSync(root + "/champion-role-audit.json", JSON.stringify(audit, null, 2));
        done++;
        if (done % 20 === 0) console.log("Reviewed " + done + "/" + catalog.length);
      } catch (e) {
        errors.push(c.id + ": " + e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: 1 }, worker));
  fs.writeFileSync(root + "/champion-role-audit.json", JSON.stringify(audit, null, 2));
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "REVIEWED " +
      done +
      " champions; " +
      Object.values(audit.champions).reduce((n, c) => n + c.positions.length, 0) +
      " position records",
  );
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
