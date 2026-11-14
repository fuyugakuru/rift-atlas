const fs = require("fs"),
  path = require("path"),
  root = path.resolve(__dirname, "..");
const videos = {},
  catalog = JSON.parse(fs.readFileSync(root + "/champion-catalog.json"));
for (const c of catalog) {
  const file = root + "/.research-skins/" + c.id + "-ru.html";
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, "utf8"),
    m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) continue;
  const p = JSON.parse(m[1]).props.pageProps.page;
  const src = p.blades
    .find((b) => b.type === "characterMasthead")
    ?.backdrop?.background?.sources?.find((s) => s.type === "video/mp4")?.src;
  if (src && new URL(src).hostname === "cmsassets.rgpub.io") videos[c.id] = src;
}
fs.writeFileSync(
  root + "/profile-videos.json",
  JSON.stringify({ source: "Официальные страницы чемпионов Riot Wild Rift", videos }, null, 2),
);
console.log("Profile animations: " + Object.keys(videos).length + "/" + catalog.length);
