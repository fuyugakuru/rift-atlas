// Подробные подсказки предметов, рун и заклинаний из WildRiftFire.
const fs = require("fs"),
  path = require("path"),
  root = path.resolve(__dirname, "..");
const decode = (s) =>
  s
    .replace(/&#x([a-f0-9]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
const plain = (s) =>
  decode(s.replace(/<br\s*\/?>|<\/(?:p|span)>/gi, "\n").replace(/<[^>]*>/g, ""))
    .replace(/[ \t\r]+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
function div(h, start) {
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
function section(h, cls) {
  const re = new RegExp('<div[^>]*class="' + cls + '"[^>]*>'),
    m = re.exec(h);
  return m ? div(h, m.index) : "";
}
async function request(url) {
  for (let n = 0; n < 3; n++) {
    const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (r.ok) return r;
    if (r.status === 429) {
      await new Promise((r) => setTimeout(r, 15000));
      continue;
    }
    throw Error(r.status + " " + url.slice(0, 100));
  }
  throw Error("Rate limit");
}
async function translate(text) {
  const values = [];
  const safe = text.replace(/\d+(?:[.,]\d+)?/g, (n) => {
    const token = "ZXQ" + String(values.length).padStart(3, "0") + "QXZ";
    values.push({ token, value: n });
    return token;
  });
  const json = await (
    await request(
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q=" +
        encodeURIComponent(safe),
    )
  ).json();
  let ru = json[0].map((x) => x[0] || "").join("");
  for (const v of values) {
    if (ru.split(v.token).length !== 2) throw Error("Numeric token lost");
    ru = ru.replace(v.token, v.value);
  }
  return ru
    .replace(/сил[аыу] способностей/gi, "силы умений")
    .replace(/сил[аыу] заклинаний/gi, "силы умений")
    .replace(/\bAP\b/g, "силы умений")
    .replace(/\bAD\b/g, "силы атаки")
    .replace(/урон[а]? от атаки/gi, "силы атаки")
    .replace(/Урон атаки/gi, "Сила атаки")
    .replace(/ускорение способностей/gi, "ускорение умений")
    .replace(/Переработка:/g, "Повторное применение:");
}
function identity(a) {
  const type =
    /runes?[-/]/i.test(a.sourceIcon) || a.icon.includes("/runes/")
      ? "rune"
      : /summoner|\/spells\//i.test(a.sourceIcon)
        ? "spell"
        : "item";
  return type + ":" + a.name;
}
async function run() {
  const cache = process.argv[2],
    dataFile = root + "/build-asset-details.json";
  fs.mkdirSync(cache, { recursive: true });
  const entries = {};
  for (const file of ["fire-item-list", "fire-rune-list"]) {
    const h = fs.readFileSync(process.argv[3] + "/" + file + ".html", "utf8");
    const re = /<div class="ico-holder ajax-tooltip[^>]*>/g;
    let m;
    while ((m = re.exec(h))) {
      const id = m[0].match(/i:(\d+)/)?.[1],
        type = m[0].match(/t:'([^']+)'/)?.[1];
      if (!id || !type) continue;
      const body = div(h, m.index),
        img = body.match(/src="([^\"]+)"/)?.[1],
        name = plain(body.match(/<span>([\s\S]*?)<\/span>/)?.[1] || "");
      if (name && img) {
        entries[(type === "Rune" ? "rune" : "item") + ":" + name] = { type, id };
        entries[img.split("/").at(-1)] = { type, id };
      }
    }
  }
  const builds = JSON.parse(fs.readFileSync(root + "/champion-builds.json")),
    assets = new Map();
  for (const c of Object.values(builds.champions))
    for (const b of c.builds)
      for (const a of [
        ...b.items,
        ...b.runes,
        ...b.starting,
        ...b.spells,
        ...(b.equipmentVariants || []).flatMap((v) => v.items),
        ...(b.situational || []).flatMap((s) => [s.replace, s.item]),
        ...(b.situationalRunes || []).flatMap((s) => [s.replace, s.item]),
      ])
        assets.set(identity(a), a);
  // Заклинания также присутствуют в сохранённых страницах гайдов; точные ID берём из разметки.
  for (const file of fs.readdirSync(process.argv[3]).filter((f) => f.endsWith(".html"))) {
    const h = fs.readFileSync(process.argv[3] + "/" + file, "utf8");
    for (const m of h.matchAll(
      /<div[^>]*class="img-bg ajax-tooltip[^>]*t:'(Item|Rune|SummonerSpell)',i:(\d+)[^>]*>([\s\S]*?)<\/div>/g,
    )) {
      const img = m[3].match(/src="([^\"]+)"/)?.[1];
      if (img) entries[img.split("/").at(-1)] = { type: m[1], id: m[2] };
    }
  }
  const result = fs.existsSync(dataFile)
    ? JSON.parse(fs.readFileSync(dataFile))
    : { checked: "2026-11-09", entries: {} };
  const names = JSON.parse(fs.readFileSync(root + "/build-labels-ru.json")).names;
  let cursor = 0,
    done = 0;
  const all = [...assets],
    errors = [];
  async function worker() {
    while (cursor < all.length) {
      const [key, a] = all[cursor++];
      try {
        if (!result.entries[key]) {
          const source =
            entries[key] ||
            entries[a.icon.split("/").at(-1)] ||
            (a.name === "Lord Dominik's Regards" ? entries["item:Lord Dominik's Regard"] : null);
          if (!source) throw Error("Missing source ID");
          const url =
              "https://www.wildriftfire.com/ajax/tooltip?relation_type=" +
              source.type +
              "&relation_id=" +
              source.id +
              "&lang=en",
            file = cache + "/" + source.type + "-" + source.id + ".html";
          const h = fs.existsSync(file)
            ? fs.readFileSync(file, "utf8")
            : await (await request(url)).text();
          fs.writeFileSync(file, h);
          const stats = plain(section(h, "tt__info__stats")),
            effects = plain(
              section(h, "tt__info__uniques") ||
                section(h, "tt__info__desc") ||
                section(h, "tt__info__description"),
            );
          let original = [stats, effects].filter(Boolean).join("\n\n");
          if (!original) {
            const body = h.match(/<div class="tt__info">([\s\S]*)<\/div>/)?.[1] || h;
            original = plain(body).replace(a.name, "").trim();
          }
          if (original.length < 8) throw Error("No effect text");
          const description = await translate(original);
          const cost = plain(section(h, "tt__info__cost")).replace(/[^\d]/g, "") || null;
          result.entries[key] = {
            name: names[a.name] || a.name,
            type: key.split(":")[0],
            icon: a.icon,
            source: url,
            original,
            description,
            cost,
          };
          fs.writeFileSync(dataFile, JSON.stringify(result, null, 2));
        }
        done++;
        if (done % 25 === 0) console.log("Descriptions " + done + "/" + all.length);
      } catch (e) {
        errors.push([key, e.message]);
        console.log("CHECK " + key + " " + e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  fs.writeFileSync(root + "/build-asset-details-errors.json", JSON.stringify(errors, null, 2));
  console.log("DONE " + done + "/" + all.length);
  if (errors.length) process.exitCode = 1;
}
module.exports = { identity, translate, plain };
if (require.main === module)
  run().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
