const fs = require("fs");
const path = require("path");
const file = path.resolve(__dirname, "../Видео скинов.json");
function parse(value, label) {
  if (!value) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw Error(label + ": вставь полную ссылку YouTube.");
  }
  let id;
  if (url.hostname === "youtu.be") id = url.pathname.slice(1);
  else if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname))
    id = url.searchParams.get("v") || url.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/)?.[1];
  if (!/^[\w-]{11}$/.test(id || "")) throw Error(label + ": неверная ссылка YouTube.");
  const raw = url.searchParams.get("t") || url.searchParams.get("start");
  let start;
  if (raw) {
    if (/^\d+s?$/.test(raw)) start = parseInt(raw);
    else if (/^(?:\d+h)?(?:\d+m)?(?:\d+s)?$/.test(raw))
      start =
        +(raw.match(/(\d+)h/)?.[1] || 0) * 3600 +
        +(raw.match(/(\d+)m/)?.[1] || 0) * 60 +
        +(raw.match(/(\d+)s/)?.[1] || 0);
    else throw Error(label + ": неверная отметка времени.");
  }
  return { id, start, source: value };
}
function apply(data) {
  if (!fs.existsSync(file)) return;
  const input = JSON.parse(fs.readFileSync(file, "utf8"));
  const changes = [];
  for (const [champion, entries] of Object.entries(input)) {
    if (!data.champions[champion])
      throw Error("Неизвестный чемпион в Видео скинов.json: " + champion);
    for (const [name, value] of Object.entries(entries)) {
      const skin = data.champions[champion].find((s) => s.name === name);
      if (!skin) throw Error(champion + ": неизвестный образ «" + name + "».");
      if (typeof value !== "string")
        throw Error(champion + " / " + name + ": ссылка должна быть в кавычках.");
      changes.push({ skin, video: parse(value.trim(), champion + " / " + name) });
    }
  }
  for (const { skin, video } of changes) {
    const same = skin.video === video?.id;
    skin.video = video?.id || null;
    skin.videoSource = video?.source || null;
    skin.videoStart = video?.start ?? (same ? skin.videoStart || 0 : 0);
    skin.videoEnd = same ? skin.videoEnd || null : null;
  }
}
module.exports = { apply, parse };
