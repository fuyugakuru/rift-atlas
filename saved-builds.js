(() => {
  "use strict";
  const account = window.RiftAccount,
    client = account?.client;
  if (!client) return;
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const buttons = new Map();
  let uid = account.user?.id || null,
    epoch = 0,
    scheduled = false,
    section,
    list,
    status,
    more,
    offset = 0,
    loading = false;
  const key = (b) => JSON.stringify([b.profile, b.champion, b.lane, b.patch]);
  async function rpc(name, args) {
    let timer;
    try {
      const r = await Promise.race([
        client.rpc(name, args),
        new Promise(
          (_, reject) =>
            (timer = setTimeout(() => reject(Error("timeout")), 15000)),
        ),
      ]);
      if (r.error) throw r.error;
      return r.data;
    } finally {
      clearTimeout(timer);
    }
  }
  function label(button, saved) {
    button.dataset.saved = String(saved);
    button.setAttribute("aria-pressed", String(saved));
    button.textContent = saved ? "★ Сохранено" : "☆ Сохранить сборку";
  }
  function sync(build, saved) {
    for (const [b, data] of buttons)
      if (b.isConnected && key(data) === key(build)) label(b, saved);
  }
  function attach(button) {
    let build;
    try {
      build = JSON.parse(button.dataset.saveBuild);
    } catch {
      return;
    }
    buttons.set(button, build);
    button.type = "button";
    label(button, false);
    button.addEventListener("click", async () => {
      if (!account.user) {
        location.href = "account.html";
        return;
      }
      const turn = epoch,
        save = button.dataset.saved !== "true";
      button.disabled = true;
      const note = button.nextElementSibling?.classList.contains(
        "saved-build-note",
      )
        ? button.nextElementSibling
        : el("span", "saved-build-note");
      note.setAttribute("role", "status");
      button.after(note);
      note.textContent = "";
      try {
        const value = await rpc("set_saved_build", {
          p_profile: build.profile,
          p_champion: build.champion,
          p_lane: build.lane,
          p_patch: build.patch,
          p_saved: save,
        });
        if (turn !== epoch) return;
        sync(build, value);
        note.textContent = value
          ? "Добавлено в профиль."
          : "Убрано из сохранённых.";
        window.dispatchEvent(new Event("rift-saved-builds-changed"));
      } catch (e) {
        if (turn === epoch)
          note.textContent = String(e.message).includes("Your build")
            ? "Это твоя сборка — она уже есть в профиле."
            : String(e.message).includes("limit")
              ? "Можно сохранить до 500 сборок."
              : "Не удалось сохранить. Попробуй ещё раз.";
      } finally {
        button.disabled = false;
      }
    });
  }
  async function flags() {
    const entries = [...buttons].filter(([b]) => b.isConnected),
      turn = epoch;
    if (!uid) {
      entries.forEach(([b]) => label(b, false));
      return;
    }
    for (let i = 0; i < entries.length; i += 100) {
      const page = entries.slice(i, i + 100);
      try {
        const values = await rpc("saved_build_flags", {
          p_builds: page.map(([, data]) => data),
        });
        if (turn !== epoch) return;
        page.forEach(([b], j) => label(b, !!values[j]));
      } catch {
        /* Keep save controls usable if status cannot be loaded. */
      }
    }
  }
  function card(build) {
    const catalog = window.RIFT_BUILD_CATALOG,
      assets = new Map(catalog.assets.map((a) => [a.id, a])),
      article = el("article", "profile-build-card");
    const head = el("div", "profile-build-card-heading"),
      image = el("img", "profile-build-champion");
    image.src = "assets/champions/faces/" + build.champion_id + ".webp";
    image.alt = "";
    image.loading = "lazy";
    const text = el("div"),
      link = el(
        "a",
        "",
        catalog.champions[build.champion_id]?.name || build.champion_id,
      );
    link.href = build.champion_id + ".html";
    text.append(
      link,
      el(
        "p",
        "pb-caption",
        ({
          baron: "Топ",
          jungle: "Лес",
          mid: "Мид",
          dragon: "ADC",
          support: "Поддержка",
        }[build.lane] || build.lane) +
          " · " +
          build.patch,
      ),
    );
    head.append(image, text);
    article.append(head);
    const author = el("a", "pb-author");
    author.href = "player.html?id=" + encodeURIComponent(build.profile_id);
    const avatar = el("img", "pb-author-avatar");
    avatar.src =
      window.RIFT_AUTHOR_AVATARS?.[build.avatar] ||
      "assets/champions/faces/mel.webp";
    avatar.alt = "";
    avatar.loading = "lazy";
    author.append(avatar, el("span", "", "Автор: " + build.nickname));
    article.append(author);
    if (build.title) article.append(el("h3", "pb-build-title", build.title));
    if (build.description) {
      const d = el("details", "pb-build-explanation");
      d.append(
        el("summary", "", "Как играть"),
        el("p", "pb-build-description", build.description),
      );
      article.append(d);
    }
    const detail = el("p", "pb-community-detail");
    detail.hidden = true;
    for (const [cls, keys, labelText] of [
      ["pb-selected", build.items, "Предметы в порядке покупки"],
      [
        "profile-build-runes",
        [...(build.runes || []), ...(build.spells || [])],
        "Руны и заклинания",
      ],
    ]) {
      const row = el("div", cls);
      row.setAttribute("aria-label", labelText);
      for (const id of keys) {
        const a = assets.get(id);
        if (!a) continue;
        const b = el("button", "saved-build-asset");
        b.type = "button";
        b.title = a.name;
        b.setAttribute("aria-label", a.name);
        const img = el("img");
        img.src = a.icon;
        img.alt = "";
        img.loading = "lazy";
        b.append(img);
        b.addEventListener("click", () => {
          detail.hidden = false;
          detail.textContent =
            a.name + (a.description ? " · " + a.description : "");
        });
        row.append(b);
      }
      article.append(row);
    }
    article.append(detail);
    const remove = el(
      "button",
      "pb-button saved-build-remove",
      "Убрать из сохранённых",
    );
    remove.type = "button";
    remove.addEventListener("click", async () => {
      const turn = epoch;
      remove.disabled = true;
      try {
        await rpc("set_saved_build", {
          p_profile: build.profile_id,
          p_champion: build.champion_id,
          p_lane: build.lane,
          p_patch: build.patch,
          p_saved: false,
        });
        if (turn === epoch) {
          sync(
            {
              profile: build.profile_id,
              champion: build.champion_id,
              lane: build.lane,
              patch: build.patch,
            },
            false,
          );
          await load(true);
        }
      } catch {
        if (turn === epoch)
          status.textContent = "Не удалось убрать сборку. Попробуй ещё раз.";
      } finally {
        remove.disabled = false;
      }
    });
    article.append(remove);
    article.dataset.buildFeedback = JSON.stringify({
      profile: build.profile_id,
      champion: build.champion_id,
      lane: build.lane,
      patch: build.patch,
    });
    return article;
  }
  async function load(reset = false) {
    if (!section) return;
    if (reset) {
      epoch++;
      loading = false;
      offset = 0;
      list.replaceChildren();
      more.hidden = true;
    }
    if (!uid) {
      status.textContent = "Войди, чтобы увидеть сохранённые сборки.";
      return;
    }
    if (loading) return;
    loading = true;
    more.disabled = true;
    const turn = epoch;
    status.textContent = "Загружаем…";
    try {
      const data = await rpc("my_saved_builds", { p_offset: offset });
      if (turn !== epoch) return;
      (data.builds || []).forEach((b) => list.append(card(b)));
      offset += (data.builds || []).length;
      status.textContent = data.total
        ? "Показано " + offset + " из " + data.total
        : "Пока нет сохранённых сборок. Сохраняй понравившиеся варианты у других игроков.";
      more.hidden = !data.has_more;
      more.textContent = "Показать ещё";
    } catch {
      if (turn === epoch) {
        status.textContent = "Не удалось загрузить сохранённые сборки.";
        more.textContent = "Повторить";
        more.hidden = false;
      }
    } finally {
      if (turn === epoch) {
        loading = false;
        more.disabled = false;
      }
    }
  }
  function scan() {
    scheduled = false;
    let added = false;
    for (const b of document.querySelectorAll("[data-save-build]"))
      if (!buttons.has(b)) {
        attach(b);
        added = true;
      }
    for (const b of buttons.keys()) if (!b.isConnected) buttons.delete(b);
    if (added) flags();
    const member = document.querySelector("#account-member");
    if (
      !section &&
      member &&
      window.RIFT_BUILD_CATALOG &&
      member.querySelector(".profile-builds")
    ) {
      section = el("section", "player-builds saved-builds");
      section.id = "saved-builds";
      const heading = el("div", "pb-heading");
      heading.append(el("h2", "", "Сохранённые сборки"));
      status = el("p", "pb-status");
      status.setAttribute("role", "status");
      list = el("div", "profile-build-list");
      more = el("button", "pb-button", "Показать ещё");
      more.type = "button";
      more.hidden = true;
      more.addEventListener("click", () => load());
      section.append(heading, status, list, more);
      member.append(section);
      load(true);
    }
  }
  const observer = new MutationObserver(() => {
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(scan);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("rift-account-ready", () => {
    const next = account.user?.id || null;
    if (next !== uid) {
      uid = next;
      epoch++;
      flags();
      load(true);
    }
  });
  window.addEventListener("rift-saved-builds-changed", () => {
    if (section) load(true);
  });
  scan();
})();
