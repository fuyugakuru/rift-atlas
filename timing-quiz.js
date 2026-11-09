// Чистая логика теста. Один проход = 20 разных вопросов, перемешанных заново.
(function (root) {
  function shuffle(list, random = Math.random) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  const format = (s) =>
    Math.floor(s / 60)
      .toString()
      .padStart(2, "0") +
    ":" +
    (s % 60).toString().padStart(2, "0");
  function options(value) {
    const set = new Set([value]);
    for (const d of [-60, 60, 120, -30, 30]) {
      if (value + d >= 0) set.add(value + d);
      if (set.size === 4) break;
    }
    return [...set].map(format);
  }
  function bank(data) {
    const result = [];
    for (const o of data) {
      if (Number.isFinite(o.first))
        result.push({
          id: o.id + "-first",
          text:
            "Когда впервые появляется " + o.name.toLocaleLowerCase("ru") + "?",
          answer: format(o.first),
          options: options(o.first),
          explanation:
            "Первое появление — " + format(o.first) + " от начала матча.",
        });
      if (Number.isFinite(o.respawn))
        result.push({
          id: o.id + "-respawn",
          text:
            "Через сколько после убийства " +
            (o.category === "jungle" ? "или полной зачистки лагеря " : "") +
            "возрождается " +
            o.name.toLocaleLowerCase("ru") +
            "?",
          answer: format(o.respawn),
          options: options(o.respawn),
          explanation:
            "Ожидание — " +
            format(o.respawn) +
            " после убийства или зачистки, а не фиксированная минута матча.",
        });
    }
    result.push(
      {
        id: "herald-once",
        text: "Сколько раз за матч появляется Герольд Бездны?",
        answer: "Один раз",
        options: ["Один раз", "Два раза", "Каждые 4 минуты", "Неограниченно"],
        explanation:
          "Герольд появляется один раз. Барон в той же яме — другой монстр.",
      },
      {
        id: "minions-period",
        text: "Как часто выходят обычные волны миньонов до позднего ускорения по таблице?",
        answer: "Каждые 25 секунд",
        options: [
          "Каждые 15 секунд",
          "Каждые 20 секунд",
          "Каждые 25 секунд",
          "Каждые 30 секунд",
        ],
        explanation:
          "По указанному расписанию волны идут через 25 секунд; позднее — через 20 секунд.",
      },
      {
        id: "minions-late",
        text: "Какой интервал между волнами указан после позднего ускорения?",
        answer: "20 секунд",
        options: ["15 секунд", "20 секунд", "25 секунд", "30 секунд"],
        explanation: "В таблице указан поздний период волн 20 секунд.",
      },
      {
        id: "minions-independent",
        text: "Зависит ли выход новой волны миньонов от гибели предыдущей?",
        answer: "Нет, волны идут по расписанию",
        options: [
          "Да, все должны погибнуть",
          "Да, должен погибнуть осадный миньон",
          "Нет, волны идут по расписанию",
          "Только после разрушения башни",
        ],
        explanation: "Миньоны выходят по расписанию, а не по таймеру убийства.",
      },
      {
        id: "crab-example",
        text: "Краба убили в 03:10. Когда он возродится при интервале 2 минуты?",
        answer: "05:10",
        options: ["04:10", "04:40", "05:10", "06:10"],
        explanation: "03:10 + 02:00 = 05:10.",
      },
    );
    return result;
  }
  function create(data, random = Math.random) {
    const pool = bank(data);
    const mandatory = pool.find((q) => q.id === "herald-once");
    const selected = shuffle(
      pool.filter((q) => q.id !== mandatory.id),
      random,
    ).slice(0, 19);
    if (selected.length !== 19)
      throw Error("Для теста нужно минимум 20 вопросов");
    return shuffle([mandatory, ...selected], random).map((q) => ({
      ...q,
      options: shuffle(q.options, random),
    }));
  }
  root.RIFT_QUIZ = { create, bank };
})(typeof window !== "undefined" ? window : globalThis);
