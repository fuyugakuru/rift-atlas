// Общая точка форматирования после всех вложенных генераторов.
// beforeExit вызывается повторно после асинхронной работы — флаг предотвращает цикл.
let done = false;
process.on("beforeExit", () => {
  if (done || process.exitCode) return;
  done = true;
  const formatter = require("./format-site.cjs");
  formatter.format(formatter.pages()).catch((error) => {
    console.error("HTML formatting failed: " + error.message);
    process.exitCode = 1;
  });
});
