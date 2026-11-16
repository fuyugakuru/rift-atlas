// Публичные сборки: сервер возвращает только никнейм, предметы, руны и дату.
(() => {
  "use strict";
  const params = new URLSearchParams(location.search),
    id = params.get("champion"),
    catalog = window.RIFT_BUILD_CATALOG,
    champion = catalog?.champions[id],
    client = window.RiftAccount?.client;
  const status = document.querySelector("#community-status"),
    list = document.querySelector("#community-list"),
    more = document.querySelector("#community-more"),
    select = document.querySelector("#community-lane");
  if (!champion || !client) {
    status.textContent = "Выбери чемпиона в каталоге, чтобы посмотреть сборки.";
    more.hidden = true;
    return;
  }
  const patch = /^[0-9]{1,2}\.[0-9]{1,2}[a-z]?$/.test(params.get("patch") || "")
      ? params.get("patch")
      : catalog.patch,
    assets = new Map(catalog.assets.map((a) => [a.id, a])),
    lanes = {
      baron: "Барона (топ)",
      jungle: "Лес",
      mid: "Мид",
      dragon: "Дракона (ADC)",
      support: "Поддержка",
    };
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  document.querySelector("#community-title").textContent = champion.name + " · сборки игроков";
  document.title = champion.name + " · сборки игроков · Rift Atlas";
  document.querySelector("#community-patch").textContent = "Патч " + patch;
  for (const lane of champion.lanes) {
    const o = el("option", "", lanes[lane]);
    o.value = lane;
    select.append(o);
  }
  if (champion.lanes.includes(params.get("lane"))) select.value = params.get("lane");
  let offset = 0,
    epoch = 0,
    busy = false;
  function updateBack() {
    document.querySelector("#community-back").href =
      id +
      ".html?buildLane=" +
      encodeURIComponent(select.value) +
      "&buildPatch=" +
      encodeURIComponent(patch) +
      "#player-builds-title";
  }
  function pick(key, number, detail, card) {
    const a = assets.get(key);
    if (!a) return el("span", "", "Предмет недоступен");
    const b = el("button", "pb-community-item");
    b.type = "button";
    b.title = a.name;
    b.setAttribute("aria-label", a.name);
    b.setAttribute("aria-expanded", "false");
    const img = el("img");
    img.src = a.icon;
    img.alt = "";
    img.loading = "lazy";
    if (number) b.append(el("span", "pb-order-number", String(number)));
    b.append(img);
    b.addEventListener("click", () => {
      const open = b.getAttribute("aria-expanded") !== "true";
      card
        .querySelectorAll("[aria-expanded]")
        .forEach((x) => x.setAttribute("aria-expanded", "false"));
      b.setAttribute("aria-expanded", String(open));
      detail.hidden = !open;
      detail.textContent = a.name + (a.description ? " · " + a.description : "");
    });
    return b;
  }
  async function load(reset = false) {
    if (busy && !reset) return;
    if (reset) {
      epoch++;
      offset = 0;
      list.replaceChildren();
      updateBack();
    }
    const turn = epoch,
      start = offset,
      lane = select.value;
    busy = true;
    more.disabled = true;
    status.textContent = "Загружаем сборки…";
    let timer;
    try {
      const result = await Promise.race([
        client.rpc("list_community_builds", {
          p_champion: id,
          p_lane: lane,
          p_patch: patch,
          p_offset: start,
        }),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(Error("timeout")), 15000);
        }),
      ]);
      if (result.error) throw result.error;
      if (turn !== epoch) return;
      const data = result.data;
      for (const build of data.builds || []) {
        const card = el("article", "pb-community-card"),
          head = el("div", "pb-community-heading"),
          line = el("ol", "pb-community-items"),
          detail = el("p", "pb-community-detail");
        detail.hidden = true;
        const author = el("a", "pb-author");
        if (build.profile_id)
          author.href = "player.html?id=" + encodeURIComponent(build.profile_id);
        const avatar = el("img", "pb-author-avatar");
        avatar.src =
          window.RIFT_AUTHOR_AVATARS?.[build.avatar] || "assets/champions/faces/mel.webp";
        avatar.alt = "";
        avatar.loading = "lazy";
        avatar.addEventListener(
          "error",
          () => {
            avatar.src = "assets/champions/faces/mel.webp";
          },
          { once: true },
        );
        author.append(avatar, el("strong", "", "Автор: " + build.nickname));
        head.append(author, el("span", "", new Date(build.updated_at).toLocaleDateString("ru-RU")));
        build.items.forEach((key, i) => {
          const li = el("li");
          li.append(
            pick(key, i + 1, detail, card),
            el("span", "pb-community-name", assets.get(key)?.name || ""),
          );
          line.append(li);
        });
        card.append(head, line);
        if (build.runes.length) {
          const runes = el("div", "pb-author-runes");
          runes.setAttribute("aria-label", "Руны автора");
          build.runes.forEach((key) => runes.append(pick(key, 0, detail, card)));
          card.append(runes);
        }
        const spells = el("div", "pb-author-spells");
        spells.setAttribute("aria-label", "Заклинания автора");
        if (build.spells?.length)
          build.spells.forEach((key) => spells.append(pick(key, 0, detail, card)));
        else spells.append(el("span", "pb-caption", "Заклинания пока не указаны"));
        card.append(spells, detail);
        list.append(card);
        offset++;
      }
      status.textContent = data.total
        ? "Сборок: " + data.total + " · показано " + offset
        : "На этой линии пока нет сборок.";
      more.hidden = !data.has_more;
      more.textContent = "Ещё сборки";
    } catch {
      if (turn === epoch) {
        status.textContent = "Не удалось загрузить сборки. Попробуй ещё раз.";
        more.hidden = false;
        more.textContent = "Повторить";
      }
    } finally {
      clearTimeout(timer);
      if (turn === epoch) {
        busy = false;
        more.disabled = false;
      }
    }
  }
  select.addEventListener("change", () => load(true));
  more.addEventListener("click", () => load());
  load(true);
})();
