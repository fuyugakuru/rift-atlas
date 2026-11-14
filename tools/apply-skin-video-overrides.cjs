const fs = require("fs"),
  path = require("path"),
  root = path.resolve(__dirname, "..");
function apply(data) {
  const file = root + "/skin-video-overrides.json";
  if (!fs.existsSync(file)) return;
  for (const row of JSON.parse(fs.readFileSync(file)).entries) {
    const skin = data.champions[row.champion]?.find(
      (s) => s.englishName?.toLowerCase() === row.name.toLowerCase(),
    );
    if (!skin) throw Error("Skin video override has no match: " + row.name);
    skin.video = row.video;
    skin.videoAuthor = "SkinSpotlights Wild Rift";
    skin.videoStart = row.videoStart || 0;
    skin.videoEnd = row.videoEnd || null;
    skin.videoSource =
      "https://www.youtube.com/watch?v=" +
      row.video +
      (skin.videoStart ? "&t=" + skin.videoStart + "s" : "");
  }
}
module.exports = { apply };
if (require.main === module) {
  const file = root + "/champion-skins.json",
    data = JSON.parse(fs.readFileSync(file));
  apply(data);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
