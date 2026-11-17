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
    '<div class="pb-heading"><div><p class="pb-kicker">Сообщество Rift Atlas</p><h2 id="player-builds-title">Сборки игроков</h2></div></div><p class="pb-caption">Сохрани свою сборку и посмотри, какие предметы выбирают другие игроки.</p><div class="pb-toolbar"><label>Линия <select aria-label="Линия пользовательской сборки"></select></label><span class="pb-caption"></span></div><p class="pb-status" role="status" aria-live="polite"></p><div class="pb-mine"></div><div class="pb-editor" hidden><h3>Порядок покупки · 6 предметов</h3><p class="pb-caption">Сохранённая сборка публикуется под твоим ником на странице сборок игроков.</p><p class="pb-caption">Нажми на ячейку, чтобы выбрать предмет. Стрелки меняют порядок. Ботинки занимают один слот.</p><ol class="pb-slots pb-item-slots"></ol><h3>Заклинания</h3><ol class="pb-slots pb-spell-slots"></ol><h3>Руны <small>· необязательно</small></h3><p class="pb-caption">Первая — ключевая. Затем выбери три руны основной ветки и одну дополнительной по правилам игрового клиента.</p><ol class="pb-slots pb-rune-slots"></ol><div class="pb-actions"></div></div><h3>Популярная сборка</h3><p class="pb-caption pb-count"></p><div class="pb-stats"></div>';
  anchor.after(section);
  const heading = section.querySelector(".pb-heading"),
    laneSelect = section.querySelector("select"),
    status = section.querySelector(".pb-status"),
    mine = section.querySelector(".pb-mine"),
    editor = section.querySelector(".pb-editor"),
    itemSlots = section.querySelector(".pb-item-slots"),
    runeSlots = section.querySelector(".pb-rune-slots"),
    spellSlots = section.querySelector(".pb-spell-slots"),
    actions = section.querySelector(".pb-actions"),
    stats = section.querySelector(".pb-stats"),
    count = section.querySelector(".pb-count");
  const buildText=el('div','pb-build-text-fields');
  buildText.innerHTML='<label>Название сборки <input class="pb-build-title-input" type="text" maxlength="60" placeholder="Например: Сплитпуш против танков"></label><label>Как играть и когда брать <textarea class="pb-build-description-input" rows="3" maxlength="600" placeholder="Коротко объясни замысел сборки и ситуативные замены"></textarea></label><small class="pb-build-text-count">Необязательно · название до 60, описание до 600 символов</small>';
  editor.prepend(buildText);
  const buildTitleInput=buildText.querySelector('input'),buildDescriptionInput=buildText.querySelector('textarea');
  for(const field of [buildTitleInput,buildDescriptionInput])field.addEventListener('input',()=>{dirty=true;});
  function restoreBuildText(build){buildTitleInput.value=build?.title||'';buildDescriptionInput.value=build?.description||'';}
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
    spells = Array(2).fill(null),
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
    buildTitleInput.focus();
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
      type === "item"
        ? "Выбрать предмет"
        : type === "spell"
          ? "Выбрать заклинание"
          : index === 0
            ? "Ключевая руна"
            : "Выбрать руну";
    renderPicker();
    dialog.showModal();
    search.focus();
  }
  function renderPicker() {
    if (!selection) return;
    list.replaceChildren();
    const { type, index } = selection,
      selected = type === "item" ? items : type === "spell" ? spells : runes,
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
      ["spell", spells, spellSlots],
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
                : type === "spell"
                  ? "Заклинание " + (index + 1)
                  : index === 0
                    ? "Ключевая"
                    : "Руна " + index,
            () => openPicker(type, index),
            "pb-slot-pick",
          );
        pick.setAttribute(
          "aria-label",
          (type === "item" ? "Предмет " : type === "spell" ? "Заклинание " : "Руна ") +
            (index + 1) +
            ": " +
            (a?.name || "выбрать"),
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
          "Очистить " +
            (type === "item" ? "предмет " : type === "spell" ? "заклинание " : "руну ") +
            (index + 1),
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
      spells = saved?.spells?.length ? [...saved.spells] : Array(2).fill(null);
      restoreBuildText(saved);
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
      box.append(el("strong", "", saved.title || "Моя сборка"));
      if(saved.description)box.append(el("p","pb-build-description",saved.description));
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
      for (const key of saved.spells || []) {
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
    restoreBuildText(null);
    editing = false;
    dirty = false;
    editor.hidden = true;
    items = Array(6).fill(null);
    runes = Array(5).fill(null);
    spells = Array(2).fill(null);
    busy = !!uid;
    renderMine();
    if (!uid) return;
    try {
      const { data, error } = await timeout(
        client
          .from("player_builds")
          .select("items,runes,spells,title,description,updated_at")
          .eq("user_id", uid)
          .eq("champion_id", id)
          .eq("lane", lane)
          .eq("patch", patch)
          .maybeSingle(),
      );
      if (error) throw error;
      if (turn !== generation) return;
      saved = data;
      restoreBuildText(data);
      items = data ? [...data.items] : items;
      runes = data?.runes.length ? [...data.runes] : runes;
      spells = data?.spells?.length ? [...data.spells] : Array(2).fill(null);
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
    count.textContent = "Загружаем сборки…";
    stats.replaceChildren();
    const publicLink = el("a", "pb-button", "Сборки игроков ↗");
    publicLink.href =
      "community-builds.html?champion=" +
      encodeURIComponent(id) +
      "&lane=" +
      encodeURIComponent(lane) +
      "&patch=" +
      encodeURIComponent(patch);
    stats.append(publicLink);
    const pct = (value) => Number(value).toLocaleString("ru") + "%";
    function itemButton(a, number, detail, percentage) {
      const pick = button(
        "",
        () => {
          const active = pick.getAttribute("aria-expanded") !== "true";
          pick
            .closest(".pb-community-card,.pb-position-column")
            .querySelectorAll("[aria-expanded]")
            .forEach((b) => b.setAttribute("aria-expanded", "false"));
          pick.setAttribute("aria-expanded", String(active));
          detail.hidden = !active;
          detail.textContent = a.name + (a.description ? " · " + a.description : "");
        },
        "pb-community-item",
      );
      pick.title = a.name + " · " + pct(percentage) + " игроков";
      pick.setAttribute("aria-label", number + ". " + a.name + ", " + pct(percentage) + " игроков");
      pick.setAttribute("aria-expanded", "false");
      pick.append(el("span", "pb-order-number", String(number)), describe(a));
      return pick;
    }
    try {
      const { data, error } = await timeout(
        client.rpc("build_community_stats", {
          p_champion: id,
          p_lane: lane,
          p_patch: patch,
          p_offset: 0,
        }),
      );
      if (error) throw error;
      if (turn !== statsGeneration) return;
      const total = Number(data?.participants || 0),
        overall = new Map((data.items || []).map((r) => [r.item_id, r]));
      count.textContent = total
        ? "Игроков: " +
          total +
          " · " +
          laneNames[lane] +
          " · патч " +
          patch +
          (total < 20 ? " · Пока мало сборок." : "")
        : "Сборок пока нет. Стань первым участником на этой линии.";
      if (!total) return;
      // Выбираем наиболее популярные позиции без повторов предметов и пар ботинок.
      let choices = new Map([[0, { score: 0, rows: Array(6).fill(null) }]]);
      const candidates = new Map();
      for (const row of data.slots || []) {
        if (!assets.has(row.item_id)) continue;
        if (!candidates.has(row.item_id)) candidates.set(row.item_id, []);
        candidates.get(row.item_id).push(row);
      }
      for (const [key, rows] of candidates) {
        const next = new Map(choices),
          boot = assets.get(key).boot;
        for (const [state, value] of choices) {
          if (boot && state & 64) continue;
          for (const row of rows) {
            const index = Number(row.slot) - 1,
              bit = 1 << index;
            if (state & bit) continue;
            const target = state | bit | (boot ? 64 : 0),
              score = value.score + Number(row.picks);
            if (!next.has(target) || score > next.get(target).score) {
              const selected = value.rows.slice();
              selected[index] = row;
              next.set(target, { score, rows: selected });
            }
          }
        }
        choices = next;
      }
      const best = [choices.get(63), choices.get(127)]
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)[0];
      const selected = best?.rows || [];
      const card = el("article", "pb-community-card"),
        head = el("div", "pb-community-heading"),
        line = el("ol", "pb-community-items"),
        detail = el("p", "pb-community-detail");
      head.append(el("strong", "", "Самая популярная сборка"));
      detail.hidden = true;
      selected.forEach((row, index) => {
        const a = assets.get(row.item_id),
          li = el("li");
        li.append(
          itemButton(a, index + 1, detail, row.percentage),
          el("span", "pb-community-name", a.name),
          el("strong", "pb-item-percentage", pct(row.percentage)),
          el("small", "pb-percentage-label", "на этом месте"),
        );
        li.title =
          "В любой позиции: " + pct(overall.get(row.item_id)?.percentage || 0) + " игроков";
        line.append(li);
      });
      const extras = el('div','pb-popular-extras');
      const runeRows = data.rune_slots || [], selectedRunes = [];
      for (let slot = 1; slot <= 5; slot++) {
        const tree = assets.get(selectedRunes[1]?.rune_id)?.tree;
        const options = runeRows.filter(row => Number(row.slot) === slot && assets.has(row.rune_id)).filter(row => {
          const rune = assets.get(row.rune_id);
          return slot < 3 || (slot < 5 ? rune.tree === tree : rune.tree !== tree);
        }).sort((a,b) => Number(b.picks)-Number(a.picks) || a.rune_id.localeCompare(b.rune_id));
        if(options[0]) selectedRunes.push(options[0]);
      }
      const runeSetup = selectedRunes.length === 5 ? {ids:selectedRunes.map(row=>row.rune_id)} : null;
      for (const [label, setup] of [['Руны',runeSetup],['Заклинания',data.spell_pair]]) {
        const group = el('div','pb-popular-small-group');
        group.append(el('span','pb-caption',label));
        if (setup?.ids?.length) {
          const icons=el('div','pb-popular-small-icons');
          setup.ids.forEach((key,index)=>{
            const a=assets.get(key);if(!a)return;
            const b=button('',()=>{const open=b.getAttribute('aria-expanded')!=='true';card.querySelectorAll('[aria-expanded]').forEach(v=>v.setAttribute('aria-expanded','false'));b.setAttribute('aria-expanded',String(open));detail.hidden=!open;detail.textContent=a.name+(a.description?' · '+a.description:'');},'pb-community-item');
            b.title=a.name;b.setAttribute('aria-label',a.name);b.setAttribute('aria-expanded','false');b.append(describe(a));
            if(label==='Руны') { const cell=el('div','pb-rune-popularity');b.prepend(el('span','pb-mini-order',String(index+1)));b.title=a.name+' · '+pct(selectedRunes[index].percentage)+' на этом месте';cell.append(b,el('small','',pct(selectedRunes[index].percentage)));icons.append(cell); } else icons.append(b);
          });
          group.append(icons);if(label!=='Руны') group.append(el('small','pb-caption',pct(setup.percentage)));
        } else group.append(el('small','pb-caption','Пока не указаны'));
        extras.append(group);
      }
      card.append(head, line, extras, detail);
      stats.append(
        card,
        el("p", "pb-caption", "По популярности на каждом месте покупки. Предметы не повторяются."),
      );
    } catch {
      if (turn !== statsGeneration) return;
      count.textContent = "Статистика временно недоступна.";
      stats.append(button("Повторить", loadStats));
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
    const buildTitle=buildTitleInput.value.trim(),buildDescription=buildDescriptionInput.value.trim();
    if([...buildTitle].length>60||[...buildDescription].length>600){notify('Название — до 60 символов, описание — до 600.',true);return;}
    const selectedSpells = spells.filter(Boolean);
    if (selectedSpells.length !== 2 || new Set(selectedSpells).size !== 2) {
      notify("Выбери два разных заклинания.", true);
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
        spells: [...selectedSpells],
        title: buildTitle,
        description: buildDescription,
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
      spells = Array(2).fill(null);
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
