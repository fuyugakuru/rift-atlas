require("./format-on-exit.cjs");
// Дополняет каталог фотографиями и создаёт локальные страницы всех чемпионов.
// Запуск: node tools/expand-champions.cjs
const fs = require("fs"),
  path = require("path"),
  vm = require("vm");
const root = path.resolve(__dirname, "..");
const origin = "https://wildrift.leagueoflegends.com";
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
async function request(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw Error(r.status + " " + url);
      return r;
    } catch (e) {
      if (attempt === 2) throw e;
    }
  }
}
async function page(url) {
  const h = await (await request(url)).text();
  const match = h.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw Error("No page data: " + url);
  return JSON.parse(match[1]).props.pageProps.page;
}
function walk(x, fn) {
  if (!x || typeof x !== "object") return;
  fn(x);
  for (const v of Object.values(x)) if (typeof v === "object") walk(v, fn);
}
async function download(url, file) {
  if (fs.existsSync(root + "/" + file)) return file;
  const u = new URL(url);
  u.searchParams.set("w", "1280");
  u.searchParams.set("q", "85");
  const r = await request(u.href);
  fs.writeFileSync(root + "/" + file, Buffer.from(await r.arrayBuffer()));
  return file;
}
async function run() {
  fs.mkdirSync(root + "/assets/champions", { recursive: true });
  const catalogPage = await page(origin + "/ru-ru/champions/");
  const cards = [],
    seen = new Set();
  walk(catalogPage, (x) => {
    const href = x.action?.payload?.url;
    if (x.title && x.media?.url && href && /\/champions\/[^/]+\/$/.test(href)) {
      const id = href.split("/").filter(Boolean).at(-1);
      if (!seen.has(id)) {
        seen.add(id);
        cards.push({
          id,
          name: x.title,
          url: new URL(href, origin).href,
          portraitUrl: x.media.url,
        });
      }
    }
  });
  if (cards.length < 100) throw Error("Unexpected catalogue size: " + cards.length);
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(root + "/data.js", "utf8"), ctx);
  const data = ctx.window.RIFT_DATA;
  const existing = new Map(data.champions.map((c) => [c.id, c]));
  let cursor = 0,
    done = 0;
  const errors = [];
  async function worker() {
    while (cursor < cards.length) {
      const c = cards[cursor++];
      try {
        c.image = await download(c.portraitUrl, "assets/champions/" + c.id + "-portrait.jpg");
        const old = existing.get(c.id);
        if (old) {
          c.name = old.name;
          c.subtitle = old.subtitle;
          c.role = old.role;
          c.difficulty = old.difficulty;
          c.hero = old.image;
          c.hasGuide = false;
        } else {
          const p = await page(c.url);
          const h = p.blades.find((x) => x.type === "characterMasthead");
          c.subtitle = h?.subtitle || "";
          c.role = h?.role?.roles?.map((r) => r.name).join(" · ") || "";
          c.difficulty = h?.difficulty?.name || "";
          const skins = p.blades.find((x) => x.type === "landingMediaCarousel");
          let image = "";
          walk(skins, (x) => {
            if (!image && x.type === "image" && x.dimensions?.width > 1000) image = x.url;
          });
          c.hero = image
            ? await download(image, "assets/champions/" + c.id + "-hero.jpg")
            : c.image;
        }
        delete c.portraitUrl;
        done++;
        if (done % 20 === 0) console.log("Prepared " + done + "/" + cards.length);
      } catch (e) {
        errors.push(c.id + ": " + e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  if (errors.length) throw Error(errors.join("\n"));
  cards.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const template = fs.readFileSync(root + "/champions.html", "utf8");
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (existing.has(c.id)) continue;
    const previous = cards[(i - 1 + cards.length) % cards.length],
      next = cards[(i + 1) % cards.length];
    const content = `<a class="back" href="champions.html">← Все чемпионы</a><section class="character-profile"><div class="character-photo"><img src="${esc(c.hero)}" alt="${esc(c.name)}"></div><div class="character-info"><p class="eyebrow">WILD RIFT · ЧЕМПИОН</p><h1>${esc(c.name)}</h1><p class="character-subtitle">${esc(c.subtitle)}</p><dl class="character-facts">${c.role ? `<div><dt>Роль</dt><dd>${esc(c.role)}</dd></div>` : ""}${c.difficulty ? `<div><dt>Сложность</dt><dd>${esc(c.difficulty)}</dd></div>` : ""}</dl><button class="button" data-favorite="${esc(c.id)}" aria-pressed="false">☆ В мой пул</button></div></section><nav class="character-neighbors" aria-label="Другие чемпионы"><a href="${esc(previous.id)}.html">← ${esc(previous.name)}</a><a href="champions.html">Каталог чемпионов</a><a href="${esc(next.id)}.html">${esc(next.name)} →</a></nav>`;
    let html = template
      .replace(/<title>[\s\S]*?<\/title>/, "<title>" + esc(c.name) + " · Rift Atlas</title>")
      .replace(/<main id="main">[\s\S]*?<\/main>/, '<main id="main">' + content + "</main>");
    fs.writeFileSync(root + "/" + c.id + ".html", html);
  }
  require("./profile-details.cjs").apply();
  data.catalog = cards;
  data.catalogChecked = "2026-11-09";
  fs.writeFileSync(
    root + "/data.js",
    "window.RIFT_DATA = " + JSON.stringify(data, null, 2) + ";\n",
  );
  fs.writeFileSync(root + "/champion-catalog.json", JSON.stringify(cards, null, 2));
  const riot = JSON.parse(fs.readFileSync(root + "/riot-data.json", "utf8"));
  riot.catalog = cards;
  fs.writeFileSync(root + "/riot-data.json", JSON.stringify(riot, null, 2));
  // При следующем запуске базового генератора новые карточки и страницы сохраняются.
  let builder = fs.readFileSync(root + "/tools/build.cjs", "utf8");
  if (!builder.includes("champion-catalog.json"))
    builder +=
      '\n// Расширенный каталог сохраняется независимо от базовых трёх гайдов.\n{ const context={window:{}}; require("vm").runInNewContext(fs.readFileSync(root+"/data.js","utf8"),context); const full=JSON.parse(fs.readFileSync(root+"/champion-catalog.json","utf8")); context.window.RIFT_DATA.catalog=full; fs.writeFileSync(root+"/data.js","window.RIFT_DATA = "+JSON.stringify(context.window.RIFT_DATA,null,2)+";\\n"); }\n';
  fs.writeFileSync(root + "/tools/build.cjs", builder);
  console.log(
    "SUCCESS: " +
      cards.length +
      " portraits, " +
      (cards.length - existing.size) +
      " new pages, " +
      existing.size +
      " guides preserved.",
  );
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
