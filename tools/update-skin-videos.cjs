// Сначала проверяем весь список ссылок. При ошибке страницы остаются прежними.
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
try {
  const file = root + "/champion-skins.json";
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  require("./apply-skin-video-overrides.cjs").apply(data);
  require("./apply-friendly-videos.cjs").apply(data);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  require("./render-skins.cjs").apply();
  console.log("Видео обновлены. Обнови страницу сайта через Ctrl+F5.");
} catch (error) {
  console.error("Ошибка в файле «Видео скинов.json»: " + error.message);
  process.exitCode = 1;
}
