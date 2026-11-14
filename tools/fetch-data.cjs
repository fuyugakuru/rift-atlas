const fs = require("fs"),
  path = require("path");
const root = path.resolve(__dirname, "..");
fs.mkdirSync(root + "/assets", { recursive: true });
async function page(url) {
  const r = await fetch(url);
  if (!r.ok) throw Error(url + " " + r.status);
  const html = await r.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  return JSON.parse(m[1]).props.pageProps.page;
}
function walk(x, fn) {
  if (!x || typeof x !== "object") return;
  fn(x);
  for (const v of Object.values(x)) if (typeof v === "object") walk(v, fn);
}
async function asset(url, name) {
  if (!url) return "";
  const r = await fetch(url);
  if (!r.ok) throw Error("Asset " + r.status);
  fs.writeFileSync(root + "/assets/" + name, Buffer.from(await r.arrayBuffer()));
  return "assets/" + name;
}
(async () => {
  const champions = [];
  for (const id of ["mel", "lissandra", "syndra"]) {
    const p = await page("https://wildrift.leagueoflegends.com/ru-ru/champions/" + id + "/");
    const head = p.blades.find((x) => x.type === "characterMasthead");
    const skills = p.blades.find((x) => x.type === "iconTab").groups;
    const skin = p.blades.find((x) => x.type === "landingMediaCarousel");
    let image = "";
    walk(skin, (x) => {
      if (!image && x.type === "image" && x.dimensions?.width > 1000) image = x.url;
    });
    if (!image) {
      walk(p, (x) => {
        if (
          !image &&
          x.type === "image" &&
          x.dimensions?.width > 1000 &&
          x.dimensions?.height > 600
        )
          image = x.url;
      });
    }
    champions.push({
      id,
      name: head.title,
      subtitle: head.subtitle,
      difficulty: head.difficulty.name,
      role: head.role.roles.map((x) => x.name).join(", "),
      image: await asset(image, id + ".jpg"),
      source: p.url,
      abilities: await Promise.all(
        skills.map(async (s, i) => ({
          name: s.label,
          key: ["P", "Q", "W", "E", "R"][i],
          icon: await asset(s.thumbnail.url, id + "-" + i + ".png"),
        })),
      ),
    });
  }
  const catalogPage = await page("https://wildrift.leagueoflegends.com/ru-ru/champions/");
  const catalog = [];
  const seen = new Set();
  walk(catalogPage, (x) => {
    const href = x.action?.payload?.url || x.url || x.href;
    if (typeof href === "string" && /\/champions\/[^/]+\/$/.test(href)) {
      const id = href.split("/").filter(Boolean).at(-1);
      if (!seen.has(id)) {
        seen.add(id);
        catalog.push({
          id,
          name: x.title || x.name || x.label || id,
          url: new URL(href, "https://wildrift.leagueoflegends.com").href,
        });
      }
    }
  });
  fs.writeFileSync(
    root + "/riot-data.json",
    JSON.stringify({ checked: "2026-11-08", champions, catalog }, null, 2),
  );
  console.log("Fetched", champions.length, "profiles;", catalog.length, "catalog entries");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
