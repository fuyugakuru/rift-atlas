(() => {
  "use strict";
  const root = document.querySelector(".rift-overview");
  if (!root) return;
  const championStrip = root.querySelector(".atlas-champion-strip");
  const pauseChampions = championStrip?.querySelector(".atlas-champions-pause");
  pauseChampions?.addEventListener("click", () => {
    const paused = championStrip.classList.toggle("is-paused");
    pauseChampions.setAttribute("aria-pressed", String(paused));
    pauseChampions.setAttribute(
      "aria-label",
      paused ? "Продолжить движение чемпионов" : "Приостановить движение чемпионов",
    );
    pauseChampions.textContent = paused ? "▶" : "Ⅱ";
  });
  const timings = new Map((window.RIFT_TIMINGS || []).map((o) => [o.id, o]));
  const shapes = {
    tower: "M5 21h14M7 21V9H5V3h3v3h3V3h2v3h3V3h3v6h-2v12M10 21v-5h4v5",
    minion: "M5 10 8 4h8l3 6v9H5ZM8 12h2m4 0h2M10 17h4",
    dragon: "M3 17 7 6l5 5 5-5 4 11-9-4Zm4-11L4 3m13 3 3-3",
    baron: "M4 5 8 9l4-6 4 6 4-4-2 14H6Zm4 8h.1m7 0h.1M9 17h6",
    herald: "m3 12 9-8 9 8-9 8Zm5 0 4-4 4 4-4 4Z",
    blue: "m12 3 8 9-8 9-8-9Z",
    red: "M12 3c0 6 7 6 7 12a7 7 0 0 1-14 0c0-3 2-5 4-7-1 6 4 6 3-5Z",
    scuttle: "M7 7h10l3 5-3 6H7l-3-6Zm-3 3L1 8m3 7-3 2m19-7 3-2m-3 7 3 2",
    camp: "m4 8 8-4 8 4-2 11H6Zm4 3h1m6 0h1M9 15h6",
    lane: "M4 20 20 4M4 14v6h6M14 4h6v6",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm6 0a4 4 0 1 0 8 0 4 4 0 0 0-8 0",
  };
  const svg = (key) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
    (shapes[key] || shapes.camp) +
    '"/></svg>';
  const objects = {
    dragon: {
      name: "Стихийный дракон",
      icon: "dragon",
      x: 69.3,
      y: 57.8,
      color: "teal",
      intro: "Командный объект на стороне линии Дракона.",
      tips: [
        "Подготовьте обзор у подходов к реке.",
        "Перед началом проверьте положение вражеского лесника.",
      ],
    },
    herald: {
      name: "Герольд Бездны",
      icon: "herald",
      x: 41.4,
      y: 19.5,
      color: "violet",
      intro: "Объект для давления на башни. Появляется один раз за матч.",
      tips: [
        "Обсудите, на какой линии использовать Герольда.",
        "Следите за соседними линиями: они могут первыми прийти к яме.",
      ],
    },
    baron: {
      name: "Барон Нашор",
      icon: "baron",
      x: 41.4,
      y: 19.5,
      color: "violet",
      intro: "Поздний командный объект для усиления давления на линии.",
      tips: [
        "Сначала убедитесь, что команда готова подойти вместе.",
        "Проверьте обзор у ямы и пути отхода.",
      ],
    },
    elder: {
      name: "Старший дракон",
      icon: "dragon",
      x: 69.3,
      y: 57.8,
      color: "gold",
      intro: "Поздний объект, вокруг которого важно заранее собраться командой.",
      tips: [
        "Не начинайте в одиночку, когда команда далеко.",
        "Оцените готовность ключевых умений и Кары.",
      ],
    },
    blue: {
      name: "Синий страж",
      icon: "blue",
      x: 38,
      y: 36.5,
      color: "blue",
      intro: "Один из основных лесных лагерей.",
      tips: [
        "Следите за входами в свой лес.",
        "Возрождение считается от убийства монстра, а не от первого появления.",
      ],
    },
    red: {
      name: "Красный огнедрев",
      icon: "red",
      x: 56.8,
      y: 67,
      color: "red",
      intro: "Один из основных лесных лагерей.",
      tips: [
        "Выбирайте следующий лагерь с учётом ближайших линий.",
        "Перед заходом во вражеский лес проверьте обзор и поддержку команды.",
      ],
    },
    gromp: {
      name: "Громп",
      icon: "camp",
      x: 30.4,
      y: 33.9,
      color: "teal",
      intro: "Лагерь в части леса рядом с Синим стражем.",
      tips: [
        "Не теряйте время между лагерями без причины.",
        "Учитывайте, кому принадлежит ближайшая линия.",
      ],
    },
    wolves: {
      name: "Волки",
      icon: "camp",
      x: 33.9,
      y: 48.4,
      color: "gold",
      intro: "Небольшой лагерь между базой и рекой.",
      tips: [
        "Смотрите на мини-карту во время зачистки.",
        "Планируйте путь к следующему лагерю или объекту.",
      ],
    },
    raptors: {
      name: "Остроклювы",
      icon: "camp",
      x: 53.6,
      y: 56,
      color: "gold",
      intro: "Лагерь в части леса Красного огнедрева.",
      tips: [
        "Проверяйте, можно ли помочь мидеру.",
        "Не выходите в реку без информации о противнике.",
      ],
    },
    krugs: {
      name: "Краги",
      icon: "camp",
      x: 68.5,
      y: 72,
      color: "gold",
      intro: "Лагерь рядом с боковой линией.",
      tips: [
        "Оцените состояние боковой линии перед выходом из леса.",
        "Следите за временем появления крупных объектов.",
      ],
    },
    scuttle: {
      name: "Речной краб",
      icon: "scuttle",
      x: 74.5,
      y: 54.5,
      color: "teal",
      intro: "Нейтральный монстр в реке.",
      tips: [
        "Помните, что соседние линии могут вмешаться в размен.",
        "Не рискуйте всем здоровьем, если команда не может помочь.",
      ],
    },
  };
  const lanes = {
    baron: {
      name: "Линия Барона",
      icon: "lane",
      x: 27,
      y: 12,
      color: "violet",
      intro: "Одиночная боковая линия. На карте показана со стороны синей команды.",
      tips: [
        "Следите за волной и возможностью безопасно вернуться на базу.",
        "Помогайте ближайшему леснику, когда можете выйти с линии.",
      ],
    },
    mid: {
      name: "Средняя линия",
      icon: "lane",
      x: 55,
      y: 45,
      color: "gold",
      intro: "Короткая центральная линия между двумя частями реки.",
      tips: ["Смотрите на обе стороны реки.", "Перед перемещением оцените положение своей волны."],
    },
    dragon: {
      name: "Линия Дракона",
      icon: "lane",
      x: 81,
      y: 81,
      color: "blue",
      intro: "Боковая линия для стрелка и поддержки.",
      tips: [
        "Согласовывайте размены со своим напарником.",
        "Подготавливайте реку к командному объекту.",
      ],
    },
    jungle: {
      name: "Лес",
      icon: "camp",
      x: 61,
      y: 70,
      color: "teal",
      intro: "Лагеря, перемещения и помощь линиям.",
      tips: [
        "Сопоставляйте путь зачистки с состоянием линий.",
        "Учитывайте тайминги и положение противника.",
      ],
    },
  };
  lanes.support = {
    name: "Поддержка",
    icon: "lane",
    x: 86,
    y: 81,
    color: "teal",
    intro: "Поддержка играет на линии Дракона рядом со стрелком.",
    tips: ["Помогайте напарнику в разменах и контролируйте обзор."],
  };
  const laneIcon = (id) => '<img src="assets/lanes/' + id + '.png" alt="" width="24" height="24">';
  const turretTips = [
    "У каждой башни 5 пластин. Они снимаются на порогах 90%, 75%, 55%, 30% и 0% здоровья.",
    "Пластины сохраняются весь матч. После потери пластины башня на 10 секунд получает 20 брони и сопротивления магии.",
  ];
  const towerPositions = {
    mid: [
      [46.8, 45.1],
      [40.4, 60],
      [31.4, 67.3],
    ],
    baron: [
      [23, 35],
      [20, 48],
      [19, 62],
    ],
    dragon: [
      [69, 86],
      [53, 87],
      [38, 86],
    ],
  };
  const laneNames = { baron: "Барона", mid: "мид", dragon: "Дракона" };
  for (const [lane, positions] of Object.entries(towerPositions))
    positions.forEach(([x, y], i) => {
      const tier = i < 3 ? i : 5 - i;
      const hp = [7000, 4500, 4250][tier];
      const title = ["Внешняя башня", "Внутренняя башня", "Башня ингибитора"][tier];
      objects["tower-" + lane + "-" + i] = {
        name: title + " · " + laneNames[lane] + " · " + (i < 3 ? "синяя" : "красная"),
        icon: "tower",
        x,
        y,
        color: i < 3 ? "blue" : "red",
        kind: "structure",
        native: lane === "mid" && i < 3,
        intro: "Защитная башня на линии " + laneNames[lane] + ".",
        stats: [
          ["Здоровье", hp + " HP"],
          ["Пластины", "5"],
        ],
        tips: turretTips,
      };
    });
  for (const [id, x, y, color] of [["blue", 23.5, 78.5, "blue"]]) {
    objects["nexus-" + id] = {
      name: "Нексус · " + (id === "blue" ? "синяя" : "красная") + " сторона",
      icon: "blue",
      x,
      y,
      color,
      kind: "structure",
      native: id === "blue",
      intro: "Главная цель на базе. Уничтожение вражеского нексуса завершает матч.",
      stats: [
        ["Здоровье", "4000 HP"],
        ["Пластины", "Нет"],
      ],
      tips: [
        "Нексус защищает базу и атакует противников.",
        "Перед осадой подведите союзную волну миньонов.",
      ],
    };
    objects["fountain-" + id] = {
      name: "Фонтан · " + (id === "blue" ? "синяя" : "красная") + " сторона",
      icon: "blue",
      x: id === "blue" ? 13.2 : 86,
      y: id === "blue" ? 90.2 : 3,
      color,
      kind: "structure",
      native: id === "blue",
      intro: "Зона появления и восстановления чемпионов на базе.",
      stats: [
        ["Здоровье", "Неразрушаем"],
        ["Восстановление", "Здоровье и мана"],
      ],
      tips: [
        "Здесь можно купить предметы и восстановиться перед возвращением на линию.",
        "Не заходите на вражеский фонтан: он защищает зону появления.",
      ],
    };
  }
  for (const [lane, x, y] of [
    ["baron", 27, 8],
    ["mid", 55, 46],
    ["dragon", 84.5, 74.5],
  ])
    objects["minions-" + lane] = {
      name: "Миньоны · " + laneNames[lane],
      icon: "minion",
      x,
      y,
      color: "gold",
      kind: "minions",
      native: lane === "dragon",
      intro:
        "Волны союзных и вражеских миньонов движутся по линии и атакуют друг друга и строения.",
      stats: [
        ["Типы", "Ближние, дальние, осадные и суперминьоны"],
        ["Суперминьон", "1100 базового HP"],
      ],
      tips: [
        "Суперминьоны появляются на линии после разрушения вражеской башни ингибитора.",
        "Здоровье зависит от типа и усиления миньона: 1100 — базовое значение суперминьона, а не всех миньонов.",
      ],
    };
  Object.assign(objects, {
    honeyfruit: {
      name: "Медоцвет",
      icon: "camp",
      x: 28.1,
      y: 21.1,
      color: "teal",
      kind: "plant",
      native: true,
      intro:
        "Ударьте растение, чтобы сбить плоды. Подберите их для восстановления здоровья и маны.",
      stats: [
        ["Лечение", "Точное значение уточняется"],
        ["Восстановление", "Здоровье и мана"],
      ],
      tips: [
        "Базовое лечение медоцвета для текущего Wild Rift пока не подтверждено источником. Значения из ПК-версии здесь не используются.",
        "Подбирайте плоды, когда здоровье или мана потрачены.",
      ],
    },
    blastcone: {
      name: "Взрывная шишка",
      icon: "camp",
      x: 64.1,
      y: 65.1,
      color: "teal",
      kind: "plant",
      native: true,
      intro:
        "При ударе взрывается и подбрасывает находящихся рядом бойцов, отталкивая их от растения. Помогает перепрыгивать стены.",
      stats: [
        ["Активация", "Обычная атака"],
        ["Направление", "От центра растения"],
      ],
      tips: [
        "Встаньте со стороны, противоположной направлению прыжка.",
        "Взрыв может переместить как союзников, так и противников.",
      ],
    },
    scryer: {
      name: "Провидящий цветок",
      icon: "eye",
      x: 82.4,
      y: 57.8,
      color: "teal",
      kind: "plant",
      native: true,
      intro:
        "После удара выпускает волну обзора, которая раскрывает область в выбранном направлении, помогая проверить туман войны.",
      stats: [
        ["Активация", "Обычная атака"],
        ["Эффект", "Раскрытие области"],
      ],
      tips: [
        "Волна идёт от атакующего через цветок.",
        "Используйте его перед проверкой реки или вражеского леса.",
      ],
    },
  });
  objects.herald.x = 45.6;
  objects.elder.image = "assets/overview/elder-dragon.png";
  objects.elder.x = 64;
  objects.elder.y = 57.8;
  for (const [id, item] of Object.entries(objects)) {
    const photo = id.startsWith("tower-")
      ? "tower"
      : id.startsWith("minions-")
        ? "minions"
        : id.startsWith("nexus-")
          ? "nexus"
          : id.startsWith("fountain-")
            ? "fountain"
            : id;
    item.photo =
      "assets/overview/photos/" +
      photo +
      (["blue", "red", "gromp", "krugs", "wolves"].includes(photo) ? ".webp" : ".jpg");
  }
  const healthRanges = {
    dragon: ["4900–10900 HP", "5–15"],
    herald: ["7100–11100 HP", "5–15"],
    baron: ["14000–18500 HP", "9–15"],
    elder: ["19000–20200 HP", "11–15"],
    blue: ["2200–4650 HP", "1–15"],
    red: ["2200–4650 HP", "1–15"],
    gromp: ["1800–4390 HP", "1–15"],
    wolves: ["1200–3230 HP", "1–15"],
    raptors: ["1000–2540 HP", "1–15"],
    krugs: ["1300–3050 HP", "1–15"],
    scuttle: ["1500–3600 HP", "1–15"],
  };
  for (const [id, [health, levels]] of Object.entries(healthRanges)) {
    objects[id].stats = [
      ["Здоровье", health],
      ["Уровень монстра", levels],
    ];
    objects[id].tips.push(
      "Здоровье зависит от уровня монстра, который масштабируется по среднему уровню всех чемпионов.",
    );
  }
  objects.wolves.stats.push(["Малый волк", "600–1510 HP"]);
  objects.raptors.stats.push(["Малый остроклюв", "500–1270 HP"]);
  objects.krugs.stats.push(["Малый краг", "550–1560 HP"]);
  for (const item of Object.values(objects))
    if (item.kind === "plant") item.stats.push(["Прочность", "Разрушается одной атакой"]);
  function badge(item) {
    if (item.image)
      return (
        '<img class="atlas-monster-image" src="' + item.image + '" alt="" width="32" height="32">'
      );
    const key=item.kind==='minions'?'minions':item.icon==='tower'?'tower':item.kind==='structure'?(item.name.startsWith('Нексус')?'nexus':'fountain'):Object.entries(objects).find(([,v])=>v===item)?.[0];
    return '<img class="atlas-vector-badge" src="assets/overview/icons/'+key+'.svg" alt="" width="32" height="36">';
  }

  const phases = {
    start: {
      label: "Начало игры",
      selected: "blue",
      note: "Лесные лагеря, первые волны и контроль входов в лес.",
    },
    objectives: {
      label: "Первые объекты",
      selected: "dragon",
      note: "Подготовка реки и соседних линий к Дракону и Герольду.",
    },
    middle: {
      label: "Середина игры",
      selected: "baron",
      note: "Барон, башни и согласованные перемещения команды.",
    },
    late: {
      label: "Поздняя игра",
      selected: "elder",
      note: "Старший дракон и Барон: заранее готовьте обзор и собирайтесь вместе.",
    },
  };
  let layer = "objects",
    phase = "objectives",
    selected = "dragon";
  const pins = root.querySelector(".atlas-pins"),
    list = root.querySelector(".atlas-object-list"),
    times = root.querySelector(".atlas-times");
  const format = (s) =>
    Math.floor(s / 60)
      .toString()
      .padStart(2, "0") +
    ":" +
    (s % 60).toString().padStart(2, "0");
  function entries() {
    if (layer === "lanes") return lanes;
    return Object.fromEntries(
      Object.entries(objects).filter(
        ([id]) => !(["middle", "late"].includes(phase) && id === "herald"),
      ),
    );
  }
  function choose(id) {
    selected = id;
    render(false);
  }
  function render(rebuild = true) {
    const data = entries();
    if (!data[selected]) selected = Object.keys(data)[0];
    if (rebuild) {
      pins.replaceChildren();
      list.replaceChildren();
      for (const [id, item] of Object.entries(data)) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "atlas-pin";
        b.dataset.key = id;
        b.dataset.color = item.color;
        b.dataset.kind = item.kind || "monster";
        b.dataset.native = String(item.native ?? !item.kind);
        b.style.left = item.x + "%";
        b.style.top = item.y + "%";
        b.innerHTML = layer === "lanes" ? laneIcon(id) : badge(item);
        b.setAttribute("aria-label", item.name);
        b.title = item.name;
        b.addEventListener("click", () => choose(id));
        pins.append(b);
        const chip = document.createElement("button");
        chip.type = "button";
        chip.dataset.key = id;
        chip.textContent = item.name;
        chip.addEventListener("click", () => choose(id));
        list.append(chip);
      }
    }
    root
      .querySelectorAll("[data-key]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.key === selected)));
    root
      .querySelectorAll("[data-layer]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.layer === layer)));
    root
      .querySelectorAll("[data-phase]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.phase === phase)));
    root.dataset.layer = layer;
    root.dataset.phase = phase;
    const item = data[selected],
      time = layer === "objects" ? timings.get(selected) : null;
    const art = root.querySelector(".atlas-detail-art");
    art.innerHTML = layer === "lanes" ? laneIcon(selected) : badge(item);
    art.dataset.color = item.color;
    art.classList.toggle("has-map-icon", layer === "objects");
    const photo = root.querySelector(".atlas-detail-photo");
    const photoImage = photo.querySelector("img");
    const hasPhoto = layer === "objects" && !!item.photo;
    photo.hidden = !hasPhoto;
    root.querySelector(".atlas-inspector").classList.toggle("has-photo", hasPhoto);
    if (hasPhoto) {
      photoImage.src = item.photo;
      photoImage.alt = item.name + " — игровой вид";
      photo.dataset.photo = selected;
    } else {
      photoImage.removeAttribute("src");
      photoImage.alt = "";
    }
    root.querySelector(".atlas-detail-type").textContent =
      layer === "objects"
        ? item.kind === "structure"
          ? "Строение"
          : item.kind === "minions"
            ? "Миньоны"
            : item.kind === "plant"
              ? "Растение"
              : time?.category === "epic"
                ? "Эпический объект"
                : "Лес и река"
        : layer === "lanes"
          ? "Линии и роли"
          : "Зоны обзора";
    root.querySelector("#atlas-detail-title").textContent = item.name;
    root.querySelector(".atlas-detail-intro").textContent = item.intro;
    root.querySelector(".atlas-selected-label").textContent = item.name;
    times.replaceChildren();
    if (time) {
      for (const [label, value] of [
        ["Первое появление", Number.isFinite(time.first) ? format(time.first) : "—"],
        [
          "Возрождение",
          time.respawnText ||
            (Number.isFinite(time.respawn) ? "через " + format(time.respawn) : "—"),
        ],
      ]) {
        const pair = document.createElement("div"),
          dt = document.createElement("dt"),
          dd = document.createElement("dd");
        dt.textContent = label;
        dd.textContent = value;
        pair.append(dt, dd);
        times.append(pair);
      }
    }
    if (item.stats)
      for (const [label, value] of item.stats) {
        const pair = document.createElement("div"),
          dt = document.createElement("dt"),
          dd = document.createElement("dd");
        dt.textContent = label;
        dd.textContent = value;
        if (/Здоровье|Суперминьон|Малый/.test(label)) dd.className = "atlas-health";
        pair.append(dt, dd);
        times.append(pair);
      }
    times.hidden = !time && !item.stats;
    root.querySelector(".atlas-timing-note").textContent = time
      ? time.reference
        ? "Справочные замеры лагерей: значения требуют сверки с текущим клиентом."
        : Number.isFinite(time.respawn)
          ? "Возрождение отсчитывается после убийства."
          : "Герольд появляется только один раз за матч."
      : "";
    const link = root.querySelector(".atlas-detail-link");
    link.hidden = !!item.kind;
    link.href =
      layer === "objects"
        ? "timers.html#timing-table"
        : layer === "lanes"
          ? "champions.html"
          : "timers.html";
    link.firstChild.textContent =
      layer === "objects"
        ? "Открыть таймеры "
        : layer === "lanes"
          ? "Выбрать чемпиона "
          : "Справочник объектов ";
    const advice = root.querySelector(".atlas-advice ul");
    advice.replaceChildren();
    for (const tip of item.tips) {
      const li = document.createElement("li");
      li.textContent = tip;
      advice.append(li);
    }
    root.querySelector(".atlas-phase-note").textContent = phases[phase].note;
  }
  root.querySelectorAll("[data-layer]").forEach((b) =>
    b.addEventListener("click", () => {
      layer = b.dataset.layer;
      selected = layer === "objects" ? phases[phase].selected : layer === "lanes" ? "mid" : "river";
      render();
    }),
  );
  root.querySelectorAll("[data-phase]").forEach((b) =>
    b.addEventListener("click", () => {
      phase = b.dataset.phase;
      layer = "objects";
      selected = phases[phase].selected;
      render();
    }),
  );
  render();
})();
