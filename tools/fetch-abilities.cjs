// Загружает официальные русские умения Wild Rift и значки Riot.
const fs = require("fs"),
  path = require("path");
const root = path.resolve(__dirname, "..");
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
  const catalog = JSON.parse(fs.readFileSync(root + "/champion-catalog.json"));
  const file = root + "/champion-abilities.json";
  const data = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file))
    : { checked: "2026-11-09", champions: {} };
  fs.mkdirSync(root + "/assets/abilities", { recursive: true });
  let cursor = 0,
    done = 0;
  const errors = [];
  async function worker() {
    while (cursor < catalog.length) {
      const c = catalog[cursor++];
      try {
        if (!data.champions[c.id]) {
          const html = await (await request(c.url)).text();
          const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
          if (!m) throw Error("Missing Riot page data");
          const page = JSON.parse(m[1]).props.pageProps.page;
          const skills = page.blades.find((x) => x.type === "iconTab")?.groups;
          if (!skills || skills.length < 5) throw Error("Missing abilities");
          const abilities = [];
          for (let i = 0; i < skills.length; i++) {
            const s = skills[i],
              description = s.content?.description?.body;
            if (!s.thumbnail?.url || !description) throw Error("Incomplete ability " + i);
            const icon = "assets/abilities/" + c.id + "-" + i + ".png";
            const response = await request(s.thumbnail.url);
            const bytes = Buffer.from(await response.arrayBuffer());
            if (bytes.length < 100) throw Error("Invalid icon");
            fs.writeFileSync(root + "/" + icon, bytes);
            abilities.push({
              name: s.content.title || s.label,
              type: s.content.subtitle,
              icon,
              description,
              sourceIcon: s.thumbnail.url,
            });
          }
          data.champions[c.id] = { source: c.url, abilities };
          fs.writeFileSync(file, JSON.stringify(data, null, 2));
        }
        done++;
        if (done % 20 === 0) console.log("Prepared " + done + "/" + catalog.length);
      } catch (e) {
        errors.push(c.id + ": " + e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  if (errors.length) throw Error(errors.join("\n"));
  console.log("READY " + done + " champions");
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
