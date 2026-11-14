// Числовые параметры Wild Rift: исходный текст, перевод, источник и проверка чисел.
const fs = require("fs"),
  path = require("path"),
  root = path.resolve(__dirname, "..");
const plain = (s) =>
  s
    .replace(/<br\s*\/?>|<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/[\t\r ]+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
const nums = (s) =>
  (
    s
      .replace(/(\d),(?=\d{3}(?:\D|$))/g, "$1")
      .replace(/(\d),(?=\d)/g, "$1.")
      .match(/\d+(?:\.\d+)?/g) || []
  ).join("|");
async function request(url) {
  for (let n = 0; n < 3; n++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(40000) });
      if (!r.ok) throw Error(r.status + " " + url.slice(0, 100));
      return r;
    } catch (e) {
      if (n === 2) throw e;
    }
  }
}
async function translate(text) {
  const values = [];
  const protectedText = text.replace(/\d+(?:[.,]\d+)?/g, (n) => {
    const key = "ZXQ" + String(values.length).padStart(3, "0") + "QXZ";
    values.push({ key, value: n });
    return key;
  });
  const raw = await (
    await request(
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q=" +
        encodeURIComponent(protectedText),
    )
  ).json();
  let ru = raw[0].map((x) => x[0] || "").join("");
  for (const v of values) {
    if (ru.split(v.key).length !== 2) throw Error("Translation lost a numeric token");
    ru = ru.replace(v.key, v.value);
  }
  return ru
    .replace(/\bAP\b/g, "силы умений")
    .replace(/\bAD\b/g, "силы атаки")
    .replace(/\bHP\b/g, "здоровья");
}

async function run() {
  const catalog = JSON.parse(fs.readFileSync(root + "/champion-catalog.json"));
  const file = root + "/ability-values.json",
    data = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file))
      : { checked: "2026-11-09", champions: {} };
  let cursor = 0,
    done = 0;
  const errors = [];
  async function worker() {
    while (cursor < catalog.length) {
      const c = catalog[cursor++];
      try {
        if (!data.champions[c.id]) {
          const slug = c.id === "nunu-and-willump" ? "nunu-amp-willump" : c.id;
          const url = "https://www.wildriftfire.com/guide/" + slug;
          const h = await (await request(url)).text();
          const blocks = h
            .split('<div class="statsBlock__block">')
            .slice(1)
            .map((b) => ({
              name: b.match(/<div class="name">([\s\S]*?)<\/div>/)?.[1],
              body: b.match(/<div class="lower">([\s\S]*?)<\/div>/)?.[1],
              cooldown: b.match(/<div class="cooldown">([\s\S]*?)<\/div>/)?.[1],
              cost: b.match(/<div class="cost">([\s\S]*?)<\/div>/)?.[1],
            }))
            .filter((x) => x.name && x.body);
          if (blocks.length !== 5 && !(c.id === "kayn" && blocks.length === 10))
            throw Error("Expected 5 skills; found " + blocks.length);
          const abilities = [];
          for (const b of blocks) {
            let original = plain(b.body);
            if (c.id === "kayn" && abilities.length === 6)
              original =
                "Rhaast: Each hit deals 60% total AD plus 7% (+6% per 100 bonus AD) of the target maximum health as physical damage. The dash and the swing can both hit the same enemy. Maximum damage against monsters per hit: 235 / 310 / 385 / 460.";
            const translation =
              c.id === "vi" && abilities.length === 0
                ? "Каждая 3-я атака по одному противнику наносит дополнительный физический урон в размере 4.8%–9% (+0.03% силы атаки) от его максимального здоровья, снижает его броню на 20% и повышает скорость атаки Вай на 27% на 4 секунды. Максимальный урон монстрам: 300."
                : c.id === "vi" && abilities.length === 3
                  ? "Следующая атака Вай наносит цели и противникам за ней дополнительно 20 / 45 / 70 / 95 (+15% силы атаки +70% силы умений) физического урона. Новый заряд появляется каждые 11 / 10 / 9 / 8 секунд. Можно хранить до 2 зарядов."
                  : await translate(original).catch((e) => {
                      throw Error("skill " + abilities.length + ": " + e.message);
                    });
            abilities.push({
              name: plain(b.name).replace(/^[P1-4]/, ""),
              original,
              description: translation,
              cooldown: b.cooldown ? plain(b.cooldown).replace(/^Cooldown:\s*/, "") : null,
              cost: b.cost ? plain(b.cost).replace(/^Cost:\s*/, "") : null,
            });
          }
          if (c.id === "kayn") {
            for (let i = 0; i < 5; i++) {
              abilities[i].description =
                "Теневой убийца: " +
                abilities[i].description +
                "\n\nРааст: " +
                abilities[i + 5].description +
                "\nПерезарядка Рааста: " +
                (abilities[i + 5].cooldown || "—") +
                " с.";
            }
            abilities.splice(5);
          }
          data.champions[c.id] = {
            source: url,
            abilities,
            ...(c.id === "kayn"
              ? {
                  additionalSource: "https://wiki.leagueoflegends.com/en-us/WR:Kayn",
                  note: "Rhaast Reaping Slash numeric formula cross-checked with Wild Rift wiki",
                }
              : {}),
          };
          fs.writeFileSync(file, JSON.stringify(data, null, 2));
        }
        done++;
        if (done % 10 === 0) console.log("Prepared " + done + "/" + catalog.length);
      } catch (e) {
        errors.push(c.id + ": " + e.message);
        console.log("CHECK " + c.id + ": " + e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  console.log("DONE " + done + "/" + catalog.length);
  if (errors.length) {
    fs.writeFileSync(root + "/ability-values-errors.json", JSON.stringify(errors, null, 2));
    process.exitCode = 1;
  }
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
