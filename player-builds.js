// Личные сборки на страницах чемпионов. Общие числа доступны только через RPC.
(() => {
  "use strict";
  const id = location.pathname
      .split("/")
      .pop()
      .replace(/\.html$/, ""),
    catalog = window.RIFT_BUILD_CATALOG,
    champion = catalog?.champions[id],
    anchor = document.querySelector(".champion-builds"),
    account = window.RiftAccount;
  if (!champion || !anchor || !account?.client) return;
  const assets = new Map(catalog.assets.map((a) => [a.id, a])),
    laneNames = {
      baron: "Барона (топ)",
      jungle: "Лес",
      mid: "Мид",
      dragon: "Дракона (ADC)",
      support: "Поддержка",
    },
    patch = /^[0-9]{1,2}\.[0-9]{1,2}[a-z]?$/.test(
      new URLSearchParams(location.search).get("buildPatch") || "",
    )
      ? new URLSearchParams(location.search).get("buildPatch")
      : catalog.patch,
    client = account.client;
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const button = (text, fn, cls = "pb-button") => {
    const b = el("button", cls, text);
    b.type = "button";
    if (fn) b.addEventListener("click", fn);
    return b;
  };
  const section = el("section", "player-builds");
  section.setAttribute("aria-labelledby", "player-builds-title");
  section.innerHTML =
    '<div class="pb-heading"><div><p class="pb-kicker">Сообщество Rift Atlas</p><h2 id="player-builds-title">Сборки игроков</h2></div></div><p class="pb-caption">Сохрани свою сборку и посмотри, какие предметы выбирают другие игроки.</p><div class="pb-toolbar"><label>Линия <select aria-label="Линия пользовательской сборки"></select></label><span class="pb-caption"></span></div><p class="pb-status" role="status" aria-live="polite"></p><div class="pb-mine"></div><div class="pb-editor" hidden><h3>Порядок покупки · 6 предметов</h3><p class="pb-caption">Нажми на ячейку, чтобы выбрать предмет. Стрелки меняют порядок. Ботинки занимают один слот.</p><ol class="pb-slots pb-item-slots"></ol><h3>Руны <small>· необязательно</small></h3><p class="pb-caption">Первая — ключевая. Затем выбери три руны основной ветки и одну дополнительной по правилам игрового клиента.</p><ol class="pb-slots pb-rune-slots"></ol><div class="pb-actions"></div></div><h3>Популярные предметы</h3><p class="pb-caption pb-count"></p><div class="pb-stats"></div>';
  anchor.after(section);
  const heading = section.querySelector(".pb-heading"),
    laneSelect = section.querySelector("select"),
    status = section.querySelector(".pb-status"),
    mine = section.querySelector(".pb-mine"),
    editor = section.querySelector(".pb-editor"),
    itemSlots = section.querySelector(".pb-item-slots"),
    runeSlots = section.querySelector(".pb-rune-slots"),
    actions = section.querySelector(".pb-actions"),
    stats = section.querySelector(".pb-stats"),
    count = section.querySelector(".pb-count");
  const moreStats = button("Все предметы", () => {
    const expanded = moreStats.getAttribute("aria-expanded") !== "true";
    moreStats.setAttribute("aria-expanded", String(expanded));
    [...stats.children].forEach((card, index) => (card.hidden = !expanded && index >= 12));
    moreStats.textContent = expanded ? "Свернуть" : "Все предметы (" + stats.children.length + ")";
  });
  moreStats.hidden = true;
  moreStats.setAttribute("aria-expanded", "false");
  stats.after(moreStats);
  for (const lane of champion.lanes) {
    const o = el("option", "", laneNames[lane] || lane);
    o.value = lane;
    laneSelect.append(o);
  }
  section.querySelector(".pb-toolbar > span").textContent = "Патч " + patch;
  const requestedLane = new URLSearchParams(location.search).get("buildLane");
  if (champion.lanes.includes(requestedLane)) laneSelect.value = requestedLane;
  let lane = laneSelect.value,
    items = Array(6).fill(null),
    runes = Array(5).fill(null),
    saved = null,
    busy = false,
    generation = 0,
    statsGeneration = 0,
    editing = false,
    dirty = false,
    userId = null,
    selection = null,
    loadFailed = false;
  const notify = (text, error = false) => {
    status.textContent = text;
    status.classList.toggle("pb-error", error);
  };
  const timeout = (p) => {
    let timer;
    return Promise.race([
      p,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error("timeout")), 15000);
      }),
    ]).finally(() => clearTimeout(timer));
  };
  const describe = (a) => {
    const img = el("img");
    img.src = a.icon;
    img.alt = "";
    img.loading = "lazy";
    return img;
  };
  const create = button("Создать сборку", () => {
    if (account.loading) {
      notify("Проверяем вход. Подожди немного.");
      return;
    }
    if (!account.user) {
      notify("Для сохранения сборки войди в аккаунт.");
      return;
    }
    if (loadFailed) {
      notify("Сначала обнови страницу: сохранённую сборку загрузить не удалось.", true);
      return;
    }
    editing = true;
    editor.hidden = false;
    renderSlots();
    itemSlots.querySelector("button")?.focus();
  });
  heading.append(create);
  const dialog = el("dialog", "pb-dialog");
  dialog.setAttribute("aria-labelledby", "pb-picker-title");
  dialog.innerHTML =
    '<div class="pb-dialog-head"><h3 id="pb-picker-title">Выбрать предмет</h3></div><input type="search" aria-label="Поиск в каталоге" placeholder="Поиск по названию"><p class="pb-dialog-detail"></p><div class="pb-catalog"></div>';
  document.body.append(dialog);
  dialog.querySelector(".pb-dialog-head").append(button("Закрыть", () => dialog.close()));
  const search = dialog.querySelector("input"),
    list = dialog.querySelector(".pb-catalog"),
    description = dialog.querySelector(".pb-dialog-detail");
  dialog.addEventListener("close", () => {
    search.value = "";
    selection = null;
  });
  search.addEventListener("input", renderPicker);
  function openPicker(type, index) {
    if (type === "rune" && index > 1 && !runes[1]) {
      notify("Сначала выбери первую руну основной ветки.");
      return;
    }
    selection = { type, index };
    search.value = "";
    description.textContent = "";
    dialog.querySelector("h3").textContent =
      type === "item" ? "Выбрать предмет" : index === 0 ? "Ключевая руна" : "Выбрать руну";
    renderPicker();
    dialog.showModal();
    search.focus();
  }
  function renderPicker() {
    if (!selection) return;
    list.replaceChildren();
    const { type, index } = selection,
      selected = type === "item" ? items : runes,
      needle = search.value.trim().toLocaleLowerCase("ru");
    let shown = 0;
    for (const a of catalog.assets) {
      if (a.type !== type || !a.name.toLocaleLowerCase("ru").includes(needle)) continue;
      if (type === "rune" && a.keystone !== (index === 0)) continue;
      if (type === "rune" && index > 0) {
        const tree = assets.get(runes[1])?.tree;
        if (index === 1 && a.row !== 1) continue;
        if (index === 2 && (a.tree !== tree || a.row !== 2)) continue;
        if (index === 3 && (a.tree !== tree || a.row !== 3)) continue;
        if (index === 4 && a.tree === tree) continue;
      }
      const b = button(
        a.name,
        () => {
          selected[index] = a.id;
          if (type === "rune" && index === 1) {
            for (const i of [2, 3]) if (assets.get(runes[i])?.tree !== a.tree) runes[i] = null;
            if (assets.get(runes[4])?.tree === a.tree) runes[4] = null;
          }
          dirty = true;
          dialog.close();
          renderSlots();
        },
        "",
      );
      b.prepend(describe(a));
      b.title = a.description;
      b.disabled =
        selected.some((v, i) => i !== index && v === a.id) ||
        (type === "item" && a.boot && items.some((v, i) => i !== index && assets.get(v)?.boot));
      b.addEventListener("focus", () => (description.textContent = a.description));
      b.addEventListener("pointerenter", () => (description.textContent = a.description));
      list.append(b);
      shown++;
    }
    if (!shown) list.append(el("p", "pb-caption", "Ничего не найдено."));
  }
  function renderSlots() {
    for (const [type, values, container] of [
      ["item", items, itemSlots],
      ["rune", runes, runeSlots],
    ]) {
      container.replaceChildren();
      values.forEach((key, index) => {
        const a = assets.get(key),
          li = el("li", "pb-slot"),
          pick = button(
            a
              ? a.name
              : type === "item"
                ? "Предмет " + (index + 1)
                : index === 0
                  ? "Ключевая"
                  : "Руна " + index,
            () => openPicker(type, index),
            "pb-slot-pick",
          );
        pick.setAttribute(
          "aria-label",
          (type === "item" ? "Предмет " : "Руна ") + (index + 1) + ": " + (a?.name || "выбрать"),
        );
        if (a) {
          pick.textContent = "";
          pick.append(describe(a), el("span", "", String(index + 1)));
          pick.title = a.name;
        }
        li.append(pick);
        const controls = el("div", "pb-slot-move");
        if (type === "item") {
          for (const [delta, text] of [
            [-1, "←"],
            [1, "→"],
          ]) {
            const move = button(
              text,
              () => {
                [values[index], values[index + delta]] = [values[index + delta], values[index]];
                dirty = true;
                renderSlots();
              },
              "",
            );
            move.disabled = index + delta < 0 || index + delta >= values.length;
            move.setAttribute(
              "aria-label",
              "Передвинуть предмет " + (index + 1) + (delta < 0 ? " влево" : " вправо"),
            );
            controls.append(move);
          }
        }
        const clear = button(
          "×",
          () => {
            values[index] = null;
            dirty = true;
            renderSlots();
          },
          "",
        );
        clear.disabled = !a;
        clear.setAttribute(
          "aria-label",
          "Очистить " + (type === "item" ? "предмет " : "руну ") + (index + 1),
        );
        controls.append(clear);
        li.append(controls);
        container.append(li);
      });
    }
  }
  const save = button("Сохранить сборку", saveBuild, "pb-button pb-button-primary"),
    cancel = button("Отмена", () => {
      editing = false;
      editor.hidden = true;
      dirty = false;
      items = saved ? [...saved.items] : Array(6).fill(null);
      runes = saved?.runes.length ? [...saved.runes] : Array(5).fill(null);
      notify("");
    }),
    clearRunes = button("Без рун", () => {
      runes = Array(5).fill(null);
      dirty = true;
      renderSlots();
    });
  actions.append(save, cancel, clearRunes);
  function renderMine() {
    mine.replaceChildren();
    create.textContent = saved ? "Изменить сборку" : "Создать сборку";
    create.disabled = busy || account.loading || loadFailed;
    create.hidden = !account.user;
    if (!account.user) {
      const p = el("p", "pb-empty"),
        a = el("a", "pb-guest-link", "Войди в аккаунт");
      a.href = "account.html";
      p.append(
        a,
        document.createTextNode(
          ", чтобы создать свою сборку. Смотреть популярность можно без входа.",
        ),
      );
      mine.append(p);
      return;
    }
    if (saved) {
      const box = el("div", "pb-summary");
      box.append(el("strong", "", "Моя сборка"));
      const row = el("div", "pb-selected");
      for (const key of saved.items) {
        const a = assets.get(key);
        if (a) {
          const img = describe(a);
          img.title = a.name;
          img.alt = a.name;
          row.append(img);
        }
      }
      box.append(row);
      const remove = button("Удалить", deleteBuild);
      remove.disabled = busy;
      box.append(remove);
      mine.append(
        box,
        el(
          "p",
          "pb-saved-note",
          "Повторное сохранение обновит эту сборку. В статистике ты учитываешься один раз.",
        ),
      );
    } else
      mine.append(
        el(
          "p",
          "pb-caption",
          busy
            ? "Загружаем твою сборку…"
            : loadFailed
              ? "Не удалось загрузить твою сборку. Обнови страницу."
              : "На этой линии и в этом патче у тебя пока нет сборки.",
        ),
      );
  }
  async function loadMine() {
    const turn = ++generation,
      uid = account.user?.id;
    userId = uid;
    loadFailed = false;
    saved = null;
    editing = false;
    dirty = false;
    editor.hidden = true;
    items = Array(6).fill(null);
    runes = Array(5).fill(null);
    busy = !!uid;
    renderMine();
    if (!uid) return;
    try {
      const { data, error } = await timeout(
        client
          .from("player_builds")
          .select("items,runes,updated_at")
          .eq("user_id", uid)
          .eq("champion_id", id)
          .eq("lane", lane)
          .eq("patch", patch)
          .maybeSingle(),
      );
      if (error) throw error;
      if (turn !== generation) return;
      saved = data;
      items = data ? [...data.items] : items;
      runes = data?.runes.length ? [...data.runes] : runes;
      notify("");
    } catch (e) {
      if (turn === generation) {
        loadFailed = true;
        notify("Не удалось загрузить сборку. Проверь связь и обнови страницу.", true);
      }
    } finally {
      if (turn === generation) {
        busy = false;
        renderMine();
      }
    }
  }
  async function loadStats() {
    const turn = ++statsGeneration;
    count.textContent = "Загружаем статистику…";
    stats.replaceChildren();
    moreStats.hidden = true;
    moreStats.setAttribute("aria-expanded", "false");
    try {
      const { data, error } = await timeout(
        client.rpc("build_item_popularity", { p_champion: id, p_lane: lane, p_patch: patch }),
      );
      if (error) throw error;
      if (turn !== statsGeneration) return;
      const total = Number(data?.[0]?.participants || 0);
      count.textContent = total
        ? "Участников: " +
          total +
          " · " +
          laneNames[lane] +
          " · патч " +
          patch +
          (total < 20 ? " · Пока мало сборок для устойчивых выводов." : "")
        : "Сборок пока нет. Стань первым участником на этой линии.";
      for (const row of data || []) {
        const a = assets.get(row.item_id);
        if (!a) continue;
        const card = el("div", "pb-stat"),
          text = el("div");
        text.append(
          el("strong", "", Number(row.percentage).toLocaleString("ru") + "%"),
          el("span", "", a.name),
          el("small", "", row.picks + " из " + total),
        );
        card.append(describe(a), text);
        card.hidden = stats.children.length >= 12;
        stats.append(card);
      }
      moreStats.hidden = stats.children.length <= 12;
      moreStats.textContent = "Все предметы (" + stats.children.length + ")";
    } catch {
      if (turn === statsGeneration)
        count.textContent = "Статистика временно недоступна. Попробуй обновить страницу.";
    }
  }
  async function saveBuild() {
    if (busy) return;
    if (!account.user || account.user.id !== userId) {
      notify("Сессия изменилась. Обнови страницу и войди снова.", true);
      return;
    }
    if (items.some((v) => !v) || new Set(items).size !== 6) {
      notify("Выбери шесть разных предметов.", true);
      return;
    }
    const selectedRunes = runes.filter(Boolean);
    if (selectedRunes.length && selectedRunes.length !== 5) {
      notify("Выбери все пять рун или нажми «Без рун».", true);
      return;
    }
    if (selectedRunes.length) {
      const page = runes.map((key) => assets.get(key));
      if (
        !page[0]?.keystone ||
        page[1]?.row !== 1 ||
        page[2]?.row !== 2 ||
        page[3]?.row !== 3 ||
        page[2]?.tree !== page[1]?.tree ||
        page[3]?.tree !== page[1]?.tree ||
        page[4]?.tree === page[1]?.tree
      ) {
        notify("Проверь ветки рун: три ряда одной ветки и дополнительная руна из другой.", true);
        return;
      }
    }
    const turn = generation,
      payload = {
        user_id: userId,
        champion_id: id,
        lane,
        patch,
        items: [...items],
        runes: [...selectedRunes],
      };
    busy = true;
    editor.inert = true;
    save.disabled = true;
    laneSelect.disabled = true;
    cancel.disabled = true;
    create.disabled = true;
    try {
      const { error } = await timeout(
        client
          .from("player_builds")
          .upsert(payload, { onConflict: "user_id,champion_id,lane,patch" }),
      );
      if (error) throw error;
      if (turn !== generation) return;
      saved = payload;
      dirty = false;
      editing = false;
      editor.hidden = true;
      notify("Сборка сохранена. Статистика обновлена.");
      await loadStats();
    } catch {
      if (turn === generation)
        notify(
          "Не удалось сохранить сборку. Твой выбор остался на странице — попробуй ещё раз.",
          true,
        );
    } finally {
      busy = false;
      editor.inert = false;
      save.disabled = false;
      laneSelect.disabled = false;
      cancel.disabled = false;
      renderMine();
    }
  }
  async function deleteBuild() {
    if (busy || !saved) return;
    const uid = account.user?.id,
      turn = generation;
    if (!uid) return;
    if (!confirm("Удалить твою сборку для этой линии и патча?")) return;
    busy = true;
    laneSelect.disabled = true;
    renderMine();
    try {
      const { error } = await timeout(
        client
          .from("player_builds")
          .delete()
          .eq("user_id", uid)
          .eq("champion_id", id)
          .eq("lane", lane)
          .eq("patch", patch),
      );
      if (error) throw error;
      if (turn !== generation) return;
      saved = null;
      dirty = false;
      editing = false;
      editor.hidden = true;
      items = Array(6).fill(null);
      runes = Array(5).fill(null);
      notify("Сборка удалена.");
      await loadStats();
    } catch {
      notify("Не удалось удалить сборку. Попробуй ещё раз.", true);
    } finally {
      busy = false;
      laneSelect.disabled = false;
      renderMine();
    }
  }
  laneSelect.addEventListener("change", () => {
    if (dirty && !confirm("Перейти на другую линию без сохранения изменений?")) {
      laneSelect.value = lane;
      return;
    }
    lane = laneSelect.value;
    notify("");
    loadMine();
    loadStats();
  });
  let lastUser = account.user?.id;
  window.addEventListener("rift-account-favorites", () => {
    const next = account.user?.id;
    if (next !== lastUser) {
      lastUser = next;
      if (dialog.open) dialog.close();
      notify("");
      loadMine();
    } else renderMine();
  });
  window.addEventListener("rift-account-ready", () => {
    if (account.user?.id !== userId) loadMine();
    else renderMine();
  });
  client.auth.onAuthStateChange(() =>
    setTimeout(() => {
      if (account.user?.id !== userId) loadMine();
      else renderMine();
    }, 0),
  );
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  loadMine();
  loadStats();
})();
