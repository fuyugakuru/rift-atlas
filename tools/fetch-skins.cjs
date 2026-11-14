const fs = require("fs"),
  path = require("path"),
  root = path.resolve(__dirname, "..");
async function run() {
  const catalog = JSON.parse(fs.readFileSync(root + "/champion-catalog.json"));
  const file = root + "/champion-skins.json",
    data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : { champions: {} };
  data.sources = [
    "https://wildrift.leagueoflegends.com/ru-ru/champions/",
    "https://wiki.leagueoflegends.com/en-us/Module:SkinDataWR/data",
  ];
  const cache = root + "/.research-skins";
  fs.mkdirSync(cache, { recursive: true });
  let cursor = 0,
    done = 0;
  const errors = [];
  async function read(url, file) {
    if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
    const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw Error("HTTP " + r.status);
    const s = await r.text();
    fs.writeFileSync(file, s);
    return s;
  }
  function parse(s) {
    return JSON.parse(s.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]).props
      .pageProps.page;
  }
  async function worker() {
    while (cursor < catalog.length) {
      const c = catalog[cursor++];
      try {
        const [ru, en] = await Promise.all([
          read(c.url, cache + "/" + c.id + "-ru.html"),
          read(c.url.replace("/ru-ru/", "/en-us/"), cache + "/" + c.id + "-en.html"),
        ]);
        const rp = parse(ru),
          ep = parse(en),
          rg = rp.blades.find((b) => b.type === "landingMediaCarousel")?.groups,
          eg = ep.blades.find((b) => b.type === "landingMediaCarousel")?.groups;
        if (!rg?.length) throw Error("No skins");
        const old = data.champions[c.id] || [];
        data.champions[c.id] = rg.map((g, i) => {
          const image = g.content.media.url;
          if (!image) throw Error("No image");
          const prior = old.find((s) => s.image === image);
          return {
            ...prior,
            id: c.id + "-" + i,
            name: prior?.name || (i === 0 ? c.name + " · базовый образ" : g.label),
            officialName: g.label,
            englishName:
              eg?.find((e) => e.content.media.url.split("?")[0] === image.split("?")[0])?.label ||
              null,
            image,
            video: prior?.video || null,
            videoSource: prior?.videoSource || null,
            championEnglish: ep.blades.find((b) => b.type === "characterMasthead")?.title,
          };
        });
        done++;
        if (done % 30 === 0) console.log("Prepared " + done);
      } catch (e) {
        errors.push(c.id + ": " + e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(
    JSON.stringify({
      champions: Object.keys(data.champions).length,
      skins: Object.values(data.champions).flat().length,
      errors,
    }),
  );
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
