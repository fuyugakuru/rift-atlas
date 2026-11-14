// Справочник не запускает часы: показывает данные и упражнение для запоминания.
(() => {
  const rows = document.querySelector("#timing-rows");
  if (!rows) return;
  const data = window.RIFT_TIMINGS;
  const labels = {
    epic: "Эпический монстр",
    jungle: "Лес и река",
    lane: "Линии",
  };
  const format = (s) =>
    Math.floor(s / 60)
      .toString()
      .padStart(2, "0") +
    ":" +
    (s % 60).toString().padStart(2, "0");
  let hide = false;
  function time(value) {
    const el = document.createElement("span");
    el.className = value === null ? "timing-pending" : "timing-number";
    el.textContent = value === null ? "На проверке" : hide ? "••:••" : format(value);
    return el;
  }
  function render() {
    const query = document
      .querySelector("#timing-search")
      .value.toLocaleLowerCase("ru")
      .replaceAll("ё", "е")
      .trim();
    const category = document.querySelector("#timing-category").value;
    const filtered = data.filter(
      (o) =>
        o.name.toLocaleLowerCase("ru").replaceAll("ё", "е").includes(query) &&
        (category === "all" || o.category === category),
    );
    rows.replaceChildren();
    for (const o of filtered) {
      const tr = document.createElement("tr");
      const name = document.createElement("th");
      name.scope = "row";
      const title = document.createElement("strong");
      title.textContent = o.name;
      const sub = document.createElement("small");
      sub.textContent = labels[o.category] + (o.reference ? " · справочные замеры" : "");
      name.append(title, sub);
      tr.append(name);
      for (const key of ["first", "respawn"]) {
        const td = document.createElement("td");
        if (key === "respawn" && o.respawnText) {
          const label = document.createElement("span");
          label.className = "timing-pending";
          label.textContent = o.respawnText;
          td.append(label);
        } else {
          if (key === "respawn" && Number.isFinite(o[key]))
            td.append(document.createTextNode("через "));
          td.append(time(o[key]));
        }
        tr.append(td);
      }
      const source = document.createElement("td");
      for (const ref of o.sources || []) {
        const a = document.createElement("a");
        a.href = ref.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = ref.label + " ↗";
        a.style.display = "block";
        source.append(a);
      }
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "Подробнее";
      const p = document.createElement("p");
      p.textContent = o.note;
      details.append(summary, p);
      source.append(details);
      tr.append(source);
      rows.append(tr);
    }
    document.querySelector("#timing-count").textContent = "Объектов: " + filtered.length;
    document.querySelector("#timing-empty").hidden = filtered.length > 0;
    const timeline = document.querySelector("#spawn-timeline");
    timeline.replaceChildren();
    const groups = new Map();
    for (const o of data.filter((o) => o.first !== null).sort((a, b) => a.first - b.first)) {
      if (!groups.has(o.first)) groups.set(o.first, []);
      groups.get(o.first).push(o);
    }
    for (const [at, objects] of groups) {
      const card = document.createElement("article");
      card.className = "spawn-step";
      card.append(time(at));
      const title = document.createElement("h3");
      title.textContent =
        objects.length > 3 ? "Лесные лагеря" : objects.map((o) => o.name).join(" / ");
      const patch = document.createElement("small");
      patch.textContent =
        "Источник: " +
        [...new Set(objects.map((o) => o.firstLabel || "патч " + o.patch))].join(", ");
      card.append(title, patch);
      timeline.append(card);
    }
  }
  document.querySelector("#timing-search").addEventListener("input", render);
  document.querySelector("#timing-category").addEventListener("change", render);
  document.querySelector("#hide-timings").addEventListener("click", (e) => {
    hide = !hide;
    e.currentTarget.setAttribute("aria-pressed", String(hide));
    e.currentTarget.textContent = hide ? "Показать время" : "Скрыть время для повторения";
    render();
  });
  render();
  // Банк и случайная выборка находятся в timing-quiz.js.
  let questions = [],
    index = 0,
    score = 0,
    answered = false;
  const next = document.querySelector("#practice-next"),
    restart = document.querySelector("#practice-restart"),
    feedback = document.querySelector("#practice-feedback");
  function begin() {
    questions = window.RIFT_QUIZ.create(data);
    index = 0;
    score = 0;
    show();
  }
  function show() {
    answered = false;
    feedback.textContent = "";
    next.hidden = true;
    restart.hidden = true;
    const q = questions[index];
    document.querySelector("#practice-question").textContent = q.text;
    document.querySelector("#practice-progress").textContent = index + 1 + " / 20";
    const options = document.querySelector("#practice-options");
    options.replaceChildren();
    for (const answer of q.options) {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = answer;
      b.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const correct = answer === q.answer;
        if (correct) score++;
        options.querySelectorAll("button").forEach((x) => {
          x.disabled = true;
          if (x.textContent === q.answer) x.classList.add("correct");
        });
        if (!correct) b.classList.add("incorrect");
        feedback.textContent =
          (correct ? "Верно. " : "Правильный ответ: " + q.answer + ". ") + q.explanation;
        next.textContent = index === 19 ? "Показать результат" : "Следующий вопрос →";
        next.hidden = false;
      });
      options.append(b);
    }
  }
  next.addEventListener("click", () => {
    if (!answered) return;
    index++;
    if (index < 20) {
      show();
      return;
    }
    document.querySelector("#practice-question").textContent = "Результат: " + score + " из 20";
    document.querySelector("#practice-options").replaceChildren();
    document.querySelector("#practice-progress").textContent = "20 / 20 · Завершено";
    feedback.textContent = "Можно повторить: получите новую случайную подборку.";
    next.hidden = true;
    restart.hidden = false;
  });
  restart.addEventListener("click", begin);
  begin();
})();
