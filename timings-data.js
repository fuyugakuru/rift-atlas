// Все числовые значения — секунды. Уточнения автора отмечены в примечаниях.
window.RIFT_TIMINGS = [
  {
    id: "scuttle",
    name: "Речной краб",
    category: "jungle",
    first: 90,
    respawn: 120,
    patch: "7.3",
    source:
      "https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-7-3/",
    note: "Первое появление — 01:30. Возрождение — через 02:00 после убийства; интервал уточнён автором сайта. Например: убили в 03:10 → появится в 05:10.",
    sources: [
      {
        label: "Первое появление · Riot 7.3",
        url: "https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-7-3/",
      },
    ],
  },
  {
    id: "dragon",
    name: "Стихийный дракон",
    category: "epic",
    first: 360,
    respawn: 270,
    patch: "6.2",
    source:
      "https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-6-2/",
    note: "Первое появление — 06:00. Следующий дракон — через 04:30 после убийства предыдущего, пока действуют правила стихийных драконов. Поздняя замена на Старшего — отдельное правило.",
    sources: [
      {
        label: "Первое появление · Riot 6.2",
        url: "https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-6-2/",
      },
      {
        label: "Возрождение · Riot 4.2",
        url: "https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-4-2/",
      },
    ],
  },
  {
    id: "herald",
    name: "Герольд Бездны",
    category: "epic",
    first: 360,
    respawn: null,
    patch: "7.0",
    source:
      "https://wildrift.leagueoflegends.com/en-gb/news/game-updates/wild-rift-patch-notes-70/",
    note: "Первое появление — 06:00 по патчу 7.0. Повторное возрождение Герольда удалено в 4.2. После его ухода в этой яме появляется Барон; это другой монстр.",
    sources: [
      {
        label: "Первое появление · Riot 7.0",
        url: "https://wildrift.leagueoflegends.com/en-gb/news/game-updates/wild-rift-patch-notes-70/",
      },
      {
        label: "Повторное появление · Riot 4.2",
        url: "https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-4-2/",
      },
    ],
    respawnText: "Один раз за матч",
  },
  {
    id: "baron",
    name: "Барон Нашор",
    category: "epic",
    first: 660,
    respawn: 210,
    patch: "6.2",
    source:
      "https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-6-2/",
    note: "Первое появление — 11:00. Время 03:30 в столбце возрождения означает ожидание после убийства, а не минуту матча. Опубликованный интервал взят из патча 1.1.",
    sources: [
      {
        label: "Первое появление · Riot 6.2",
        url: "https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-6-2/",
      },
      {
        label: "Возрождение · Riot 1.1",
        url: "https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-1-1/",
      },
    ],
  },
  {
    id: "elder",
    name: "Старший дракон",
    category: "epic",
    first: 1140,
    respawn: 240,
    patch: "6.2",
    source:
      "https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-6-2/",
    note: "Первая отметка — 19:00 по изменению 6.2; повторное появление — через 04:00 после убийства по правилам 3.3. Переход от стихийных драконов и особые условия нужно учитывать отдельно.",
    sources: [
      {
        label: "Первое появление · Riot 6.2",
        url: "https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-6-2/",
      },
      {
        label: "Возрождение · Riot 3.3",
        url: "https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-3-3/",
      },
    ],
  },
  {
    id: "blue",
    name: "Синий страж",
    category: "jungle",
    first: 20,
    respawn: 150,
    note: "Первый выход — 00:20. Отсчёт возрождения начинается после убийства монстра / полной зачистки лагеря. Значения сверены со справочными замерами сообщества; источник исторический, не замер текущего клиента.",
    sources: [
      {
        label: "Замеры лагерей · сообщество, 2023",
        url: "https://www.reddit.com/r/wildrift/comments/15xzna4/quantified_information_on_camps_and_waves/",
      },
    ],
    source:
      "https://www.reddit.com/r/wildrift/comments/15xzna4/quantified_information_on_camps_and_waves/",
    patch: "справочные замеры",
    firstLabel: "Лагеря · справочные данные",
    reference: true,
  },
  {
    id: "red",
    name: "Красный огнедрев",
    category: "jungle",
    first: 20,
    respawn: 150,
    note: "Первый выход — 00:20. Отсчёт возрождения начинается после убийства монстра / полной зачистки лагеря. Значения сверены со справочными замерами сообщества; источник исторический, не замер текущего клиента.",
    sources: [
      {
        label: "Замеры лагерей · сообщество, 2023",
        url: "https://www.reddit.com/r/wildrift/comments/15xzna4/quantified_information_on_camps_and_waves/",
      },
    ],
    source:
      "https://www.reddit.com/r/wildrift/comments/15xzna4/quantified_information_on_camps_and_waves/",
    patch: "справочные замеры",
    firstLabel: "Лагеря · справочные данные",
    reference: true,
  },
  {
    id: "gromp",
    name: "Громп",
    category: "jungle",
    first: 20,
    respawn: 110,
    note: "Первый выход — 00:20. Отсчёт возрождения начинается после убийства монстра / полной зачистки лагеря. Значения сверены со справочными замерами сообщества; источник исторический, не замер текущего клиента.",
    sources: [
      {
        label: "Замеры лагерей · сообщество, 2023",
        url: "https://www.reddit.com/r/wildrift/comments/15xzna4/quantified_information_on_camps_and_waves/",
      },
    ],
    source:
      "https://www.reddit.com/r/wildrift/comments/15xzna4/quantified_information_on_camps_and_waves/",
    patch: "справочные замеры",
    firstLabel: "Лагеря · справочные данные",
    reference: true,
  },
  {
    id: "wolves",
    name: "Волки",
    category: "jungle",
    first: 20,
    respawn: 110,
    note: "Первый выход — 00:20. Отсчёт возрождения начинается после убийства монстра / полной зачистки лагеря. Значения сверены со справочными замерами сообщества; источник исторический, не замер текущего клиента.",
    sources: [
      {
        label: "Замеры лагерей · сообщество, 2023",
        url: "https://www.reddit.com/r/wildrift/comments/15xzna4/quantified_information_on_camps_and_waves/",
      },
    ],
    source:
      "https://www.reddit.com/r/wildrift/comments/15xzna4/quantified_information_on_camps_and_waves/",
    patch: "справочные замеры",
    firstLabel: "Лагеря · справочные данные",
    reference: true,
  },
  {
    id: "raptors",
    name: "Остроклювы",
    category: "jungle",
    first: 20,
    respawn: 110,
    note: "Первый выход — 00:20. Отсчёт возрождения начинается после убийства монстра / полной зачистки лагеря. Значения сверены со справочными замерами сообщества; источник исторический, не замер текущего клиента.",
    sources: [
      {
        label: "Замеры лагерей · сообщество, 2023",
        url: "https://www.reddit.com/r/wildrift/comments/15xzna4/quantified_information_on_camps_and_waves/",
      },
    ],
    source:
      "https://www.reddit.com/r/wildrift/comments/15xzna4/quantified_information_on_camps_and_waves/",
    patch: "справочные замеры",
    firstLabel: "Лагеря · справочные данные",
    reference: true,
  },
  {
    id: "krugs",
    name: "Краги",
    category: "jungle",
    first: 20,
    respawn: 110,
    note: "Первый выход — 00:20. Отсчёт возрождения начинается после убийства монстра / полной зачистки лагеря. Значения сверены со справочными замерами сообщества; источник исторический, не замер текущего клиента.",
    sources: [
      {
        label: "Замеры лагерей · сообщество, 2023",
        url: "https://www.reddit.com/r/wildrift/comments/15xzna4/quantified_information_on_camps_and_waves/",
      },
    ],
    source:
      "https://www.reddit.com/r/wildrift/comments/15xzna4/quantified_information_on_camps_and_waves/",
    patch: "справочные замеры",
    firstLabel: "Лагеря · справочные данные",
    reference: true,
  },
  {
    id: "minions",
    name: "Миньоны на линиях",
    category: "lane",
    first: 0,
    respawn: null,
    note: "В справочных замерах первая волна выходит при 00:00, затем каждые 25 секунд; с волны 18:45 — каждые 20 секунд. Это выход с базы, а не встреча на линии. Миньоны идут по расписанию: гибель прошлой волны его не запускает. Позднюю смену периода нужно пересверить в текущем режиме.",
    sources: [
      {
        label: "Замеры расписания волн · сообщество, 2023",
        url: "https://www.reddit.com/r/wildrift/comments/15xzna4/quantified_information_on_camps_and_waves/",
      },
      {
        label: "Период 25 с в 04:00–10:00 · Riot 4.2",
        url: "https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-4-2/",
      },
    ],
    respawnText: "Волны: 25 с → 20 с",
    reference: true,
    firstLabel: "Миньоны · справочные данные",
    source:
      "https://www.reddit.com/r/wildrift/comments/15xzna4/quantified_information_on_camps_and_waves/",
    patch: "замеры волн",
  },
];
