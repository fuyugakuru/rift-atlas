// Берёт видео из того же блока Riot, что и название навыка. Не угадывает URL.
const fs = require("fs"),
  path = require("path"),
  root = path.resolve(__dirname, "..");
async function run() {
  const data = JSON.parse(fs.readFileSync(root + "/champion-abilities.json"));
  let cursor = 0,
    found = 0;
  const entries = Object.entries(data.champions),
    errors = [];
  async function worker() {
    while (cursor < entries.length) {
      const [id, c] = entries[cursor++];
      try {
        const response = await fetch(c.source, { signal: AbortSignal.timeout(25000) });
        if (!response.ok) throw Error("HTTP " + response.status);
        const html = await response.text();
        const page = JSON.parse(
          html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1],
        ).props.pageProps.page;
        const groups = page.blades.find((x) => x.type === "iconTab")?.groups;
        if (groups?.length !== c.abilities.length) throw Error("Количество навыков не совпало");
        for (let i = 0; i < groups.length; i++) {
          const g = groups[i];
          if (g.content.title !== c.abilities[i].name && g.label !== c.abilities[i].name)
            throw Error("Название навыка изменилось: " + i);
          const src = g.content.media?.sources?.find((x) => x.type === "video/mp4")?.src;
          if (src && new URL(src).hostname === "cmsassets.rgpub.io") {
            c.abilities[i].video = src;
            found++;
          }
        }
      } catch (e) {
        errors.push(id + ": " + e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  fs.writeFileSync(root + "/champion-abilities.json", JSON.stringify(data, null, 2));
  console.log(JSON.stringify({ videos: found, errors }));
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
