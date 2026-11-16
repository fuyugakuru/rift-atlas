// Личные сборки: читаем только строки текущего пользователя, порциями по 12.
(() => {
  "use strict";
  const account = window.RiftAccount,
    catalog = window.RIFT_BUILD_CATALOG;
  const member = document.querySelector("#account-member");
  if (!account?.client || !catalog || !member) return;
  const assets = new Map(catalog.assets.map((a) => [a.id, a]));
  const lanes = {
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
  const section = el("section", "player-builds profile-builds");
  section.setAttribute("aria-labelledby", "profile-builds-title");
  section.innerHTML =
    '<div class="pb-heading"><div><p class="pb-kicker">МОЯ КОЛЛЕКЦИЯ</p><h2 id="profile-builds-title">Мои сборки</h2></div><a class="profile-catalog-link" href="champions.html">Выбрать чемпиона ↗</a></div><p class="pb-caption">Твои сохранённые сборки по чемпионам, линиям и патчам.</p><p class="pb-status" role="status" aria-live="polite"></p><div class="profile-build-list"></div>';
  member.append(section);
  const list = section.querySelector(".profile-build-list"),
    status = section.querySelector(".pb-status");
  const more = el("button", "pb-button", "Показать ещё");
  more.type = "button";
  more.hidden = true;
  section.append(more);
  let uid,
    epoch = 0,
    offset = 0,
    total = 0,
    pending = false;
  function card(build) {
    const article = el("article", "profile-build-card"),
      heading = el("div", "profile-build-card-heading");
    const portrait = el("img", "profile-build-champion");
    portrait.src = "assets/champions/faces/" + build.champion_id + ".webp";
    portrait.alt = "";
    portrait.loading = "lazy";
    portrait.addEventListener("error", () => portrait.remove());
    const text = el("div");
    text.append(
      el("h3", "", catalog.champions[build.champion_id]?.name || build.champion_id),
      el("p", "pb-caption", (lanes[build.lane] || build.lane) + " · патч " + build.patch),
    );
    heading.append(portrait, text);
    const items = el("div", "pb-selected");
    items.setAttribute("aria-label", "Предметы в порядке покупки");
    for (const key of build.items) {
      const a = assets.get(key);
      if (!a) continue;
      const img = el("img");
      img.src = a.icon;
      img.alt = a.name;
      img.title = a.name;
      img.loading = "lazy";
      items.append(img);
    }
    const runes = el("div", "profile-build-runes");
    for (const key of [...(build.runes || []), ...(build.spells || [])]) {
      const a = assets.get(key);
      if (!a) continue;
      const img = el("img");
      img.src = a.icon;
      img.alt = a.name;
      img.title = a.name;
      img.loading = "lazy";
      runes.append(img);
    }
    const link = el("a", "pb-button", "Открыть и изменить ↗");
    const url = new URL(build.champion_id + ".html", location.href);
    url.searchParams.set("buildLane", build.lane);
    url.searchParams.set("buildPatch", build.patch);
    url.hash = "player-builds-title";
    link.href = url.href;
    const date = new Date(build.updated_at);
    const updated = el(
      "p",
      "pb-saved-note",
      "Обновлено " + (Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ru-RU")),
    );
    article.append(heading, items);
    if (runes.children.length) article.append(runes);
    article.append(updated, link);
    return article;
  }
  async function load(reset = false) {
    const next = account.user?.id;
    if (reset) {
      epoch++;
      uid = next;
      offset = 0;
      total = 0;
      list.replaceChildren();
      more.hidden = true;
      pending = false;
    }
    if (!next) {
      status.textContent = "Войди в аккаунт, чтобы увидеть свои сборки.";
      return;
    }
    if (pending) return;
    const turn = epoch;
    pending = true;
    more.disabled = true;
    status.textContent = "Загружаем сборки…";
    status.classList.remove("pb-error");
    let timer;
    try {
      const result = await Promise.race([
        account.client
          .from("player_builds")
          .select("champion_id,lane,patch,items,runes,spells,updated_at", { count: "exact" })
          .eq("user_id", next)
          .order("updated_at", { ascending: false })
          .order("champion_id")
          .order("lane")
          .order("patch")
          .range(offset, offset + 11),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(Error("timeout")), 15000);
        }),
      ]);
      if (turn !== epoch || account.user?.id !== next) return;
      if (result.error) throw result.error;
      for (const build of result.data) list.append(card(build));
      offset += result.data.length;
      total = result.count || 0;
      status.textContent = total
        ? "Показано " + offset + " из " + total
        : "Пока нет сохранённых сборок. Создай первую на странице чемпиона.";
      more.hidden = offset >= total;
    } catch {
      if (turn === epoch) {
        status.textContent = "Не удалось загрузить сборки. Нажми «Повторить». ";
        status.classList.add("pb-error");
        more.textContent = "Повторить";
        more.hidden = false;
      }
    } finally {
      clearTimeout(timer);
      if (turn === epoch) {
        pending = false;
        more.disabled = false;
      }
    }
  }
  more.addEventListener("click", () => {
    more.textContent = "Показать ещё";
    load();
  });
  function authChanged() {
    if (uid !== account.user?.id) load(true);
  }
  window.addEventListener("rift-account-ready", authChanged);
  window.addEventListener("rift-account-favorites", authChanged);
  load(true);
})();
