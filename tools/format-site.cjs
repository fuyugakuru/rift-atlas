// Prettier 3.6.2 хранится в проекте: установка Node-пакетов не нужна.
const fs = require("fs");
const path = require("path");
const prettier = require("./vendor/prettier/standalone.js");
const plugins = ["html", "babel", "estree", "postcss"].map((name) =>
  require("./vendor/prettier/plugins/" + name + ".js"),
);
const root = path.resolve(__dirname, "..");
async function format(files) {
  let changed = 0;
  for (const file of files) {
    const parser = /\.html$/.test(file)
      ? "html"
      : /\.css$/.test(file)
        ? "css"
        : /\.json$/.test(file)
          ? "json"
          : "babel";
    const before = fs.readFileSync(file, "utf8");
    const after = await prettier.format(before, {
      parser,
      plugins,
      printWidth: 100,
      tabWidth: 2,
      useTabs: false,
      endOfLine: "lf",
      htmlWhitespaceSensitivity: "css",
    });
    if (before !== after) {
      fs.writeFileSync(file, after);
      changed++;
    }
  }
  return changed;
}
function pages() {
  return fs
    .readdirSync(root)
    .filter((n) => n.endsWith(".html"))
    .map((n) => path.join(root, n));
}
module.exports = { format, pages };
if (require.main === module)
  format(pages())
    .then((n) => console.log("Formatted pages: " + n))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
