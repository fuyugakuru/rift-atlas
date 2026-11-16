// Публичные профили и дружба. Приватные таблицы доступны только через ограниченные RPC.
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
  const button = (text, fn) => {
    const n = el("button", "pb-button", text);
    n.type = "button";
    n.addEventListener("click", fn);
    return n;
  };
  async function rpc(name, args = {}) {
    let timer;
    try {
      const { data, error } = await Promise.race([
        client.rpc(name, args),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(Error("timeout")), 15000);
        }),
      ]);
      if (error) throw error;
      return data;
    } finally {
      clearTimeout(timer);
    }
  }
  function avatar(value) {
    const img = el("img", "pb-author-avatar");
    img.src = window.RIFT_AUTHOR_AVATARS?.[value] || "assets/champions/faces/mel.webp";
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener(
      "error",
      () => {
        img.src = "assets/champions/faces/mel.webp";
      },
      { once: true },
    );
    return img;
  }
  function author(p) {
    const a = el("a", "pb-author");
    a.href = "player.html?id=" + encodeURIComponent(p.id);
    a.append(avatar(p.avatar), el("strong", "", p.nickname));
    return a;
  }
  async function action(id, type, container, refresh) {
    container.querySelectorAll("button").forEach((b) => (b.disabled = true));
    try {
      await rpc("friendship_action", { p_profile: id, p_action: type });
      await refresh();
    } catch {
      container.append(
        el("p", "pb-error", "Не удалось выполнить действие. Обнови страницу и попробуй снова."),
      );
    } finally {
      container.querySelectorAll("button").forEach((b) => (b.disabled = false));
    }
  }
  const publicRoot = document.querySelector("#public-player");
  if (publicRoot) {
    const id = new URLSearchParams(location.search).get("id");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "")) {
      publicRoot.replaceChildren(el("h1", "", "Профиль не найден"));
      return;
    }
    publicRoot.classList.add("unified-profile-page");
    const view = new URLSearchParams(location.search).get("view"),
      allBuilds = view === "builds",
      allFriends = view === "friends";
    let epoch = 0,
      offset = 0,
      loading = false;
    const catalog = window.RIFT_BUILD_CATALOG,
      assets = new Map(catalog.assets.map((a) => [a.id, a])),
      lanes = { baron: "Топ", jungle: "Лес", mid: "Мид", dragon: "ADC", support: "Поддержка" };
    const header = el("div", "profile-hero public-profile-hero"),
      status = el("p", "pb-status"),
      favorites = el("div", "public-player-favorites"),
      list = el("div", "pb-combinations"),
      more = allBuilds
        ? button("Ещё сборки", () => loadBuilds())
        : el("a", "pb-button", "Все сборки");
    if (!allBuilds) more.href = "player.html?id=" + encodeURIComponent(id) + "&view=builds";
    const buildsTitle = el("h2", "", allBuilds ? "Все сборки игрока" : "Сборки игрока");
    const friends = el("section", "public-friends"),
      friendsTitle = el("h2", "", "Друзья"),
      friendsList = el("div", "social-list"),
      friendsMore = allFriends
        ? button("Ещё друзей", () => loadFriends())
        : el("a", "pb-button", "Все друзья");
    if (!allFriends)
      friendsMore.href = "player.html?id=" + encodeURIComponent(id) + "&view=friends";
    friends.append(friendsTitle, friendsList, friendsMore);
    friendsMore.hidden = true;
    let friendOffset = 0,
      friendLoading = false,
      friendEpoch = 0;
    const mediaLayer = el("div", "public-profile-media"),
      cover = el("img", "profile-cover"),
      video = el("video", "profile-cover-video"),
      shade = el("div", "profile-cover-shade"),
      content = el("div", "profile-hero-content"),
      motionButton = button("Ⅱ Пауза", () => {});
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    motionButton.className = "profile-motion-toggle";
    const bottom = el("div", "profile-hero-bottom"),
      favoriteCount = el("span", "profile-stat-cell"),
      friendTile = el("a", "profile-stat-cell profile-friends-tile");
    friendTile.href = "player.html?id=" + encodeURIComponent(id) + "&view=friends";
    bottom.append(motionButton, favoriteCount, friendTile);
    motionButton.hidden = true;
    mediaLayer.append(cover, video);
    header.append(mediaLayer, shade, content, bottom);
    const motion = window.createProfileCoverMotion?.(video, motionButton);
    status.setAttribute("role", "status");
    more.hidden = true;
    const intro = el("div", "page-heading");
    intro.append(
      el("p", "eyebrow", "RIFT ATLAS"),
      el("h1", "", allBuilds ? "Сборки игрока" : allFriends ? "Друзья игрока" : "Профиль игрока"),
    );
    publicRoot.replaceChildren(intro, header, status, favorites, friends, buildsTitle, list, more);
    favorites.hidden = allBuilds || allFriends;
    friends.hidden = !allFriends;
    buildsTitle.hidden = list.hidden = allFriends;
    more.hidden = true;
    if (allBuilds || allFriends) {
      const back = el("a", "pb-button", "← В профиль");
      back.href = "player.html?id=" + encodeURIComponent(id);
      header.before(back);
    }
    async function loadProfile() {
      const turn = ++epoch;
      try {
        const p = await rpc("public_player_profile", { p_profile: id });
        if (turn !== epoch) return;
        if (!p) {
          header.replaceChildren(el("h1", "", "Профиль не найден"));
          list.replaceChildren();
          more.hidden = true;
          return;
        }
        header.replaceChildren(mediaLayer, shade, content, bottom);
        content.replaceChildren();
        const selectedMedia = window.RIFT_PROFILE_MEDIA?.[p.avatar];
        cover.src =
          selectedMedia?.cover ||
          window.RIFT_AUTHOR_AVATARS?.[p.avatar] ||
          "assets/champions/mel-hero.jpg";
        motion?.update(selectedMedia?.animation || "");
        friendsTitle.textContent = "Друзья · " + Number(p.friend_count || 0);
        favoriteCount.replaceChildren(
          el(
            "b",
            "",
            p.favorites === null
              ? p.relationship === "self"
                ? String(account.favorites?.length || 0)
                : "—"
              : String(p.favorites.length),
          ),
          document.createTextNode(" в избранном"),
        );
        favoriteCount.title =
          p.favorites === null ? "Избранное скрыто владельцем" : "Избранные чемпионы";
        friendTile.replaceChildren(
          el("b", "", String(p.friend_count || 0)),
          document.createTextNode("Друзья"),
        );
        const identity = el("div", "profile-avatar-frame"),
          text = el("div", "profile-identity");
        identity.append(avatar(p.avatar), el("span", "profile-avatar-mark", "R"));
        text.append(el("p", "profile-kicker", "ПРОФИЛЬ ИГРОКА"), el("h2", "", p.nickname));
        if (p.riot_id) text.append(el("p", "profile-riot-id", p.riot_id));
        content.append(identity, text);
        const controls = el("div", "pb-actions profile-hero-actions");
        content.append(controls);
        if (p.relationship === "self") {
          const a = el("a", "pb-button", "Мой кабинет");
          a.href = "account.html";
          controls.append(a);
        } else if (!account.user) {
          const a = el("a", "pb-button", "Войти, чтобы добавить в друзья");
          a.href = "account.html";
          controls.append(a);
        } else {
          const add = (label, type) =>
            controls.append(button(label, () => action(id, type, controls, loadProfile)));
          if (p.relationship === "friends") {
            controls.append(el("span", "pb-caption", "У вас в друзьях"));
            add("Удалить из друзей", "remove");
          } else if (p.relationship === "incoming") {
            add("Принять заявку", "accept");
            add("Отклонить", "decline");
          } else if (p.relationship === "outgoing") {
            controls.append(el("span", "pb-caption", "Заявка отправлена"));
            add("Отменить заявку", "cancel");
          } else add("Добавить в друзья", "send");
        }
        favorites.id = "public-profile-favorites";
        favorites.classList.add("profile-pool");
        favorites.replaceChildren(
          el("p", "profile-kicker", "МОЯ КОЛЛЕКЦИЯ"),
          el("h3", "", "Избранные чемпионы"),
        );
        if (p.favorites === null)
          favorites.append(el("p", "pb-caption", "Скрыты владельцем профиля."));
        else if (!p.favorites.length)
          favorites.append(el("p", "pb-caption", "Пока нет избранных чемпионов."));
        else {
          const row = el("div", "public-favorite-grid");
          for (const champ of p.favorites) {
            if (!catalog.champions[champ]) continue;
            const a = el("a", "profile-favorite");
            a.href = champ + ".html";
            const img = el("img");
            img.src = "assets/champions/faces/" + champ + ".webp";
            img.alt = "";
            img.loading = "lazy";
            a.append(img, el("span", "", catalog.champions[champ].name));
            row.append(a);
          }
          favorites.append(row);
        }
        status.textContent = "";
        if (allFriends) loadFriends(true);
      } catch {
        if (turn === epoch) {
          status.textContent = "Не удалось загрузить профиль.";
          header.replaceChildren(button("Повторить", loadProfile));
        }
      }
    }
    function buildCard(build) {
      const card = el("article", "pb-community-card"),
        head = el("div", "pb-community-heading"),
        link = el("a", "", catalog.champions[build.champion_id]?.name || build.champion_id),
        line = el("ol", "pb-community-items"),
        detail = el("p", "pb-community-detail");
      link.href = build.champion_id + ".html";
      head.append(link, el("span", "", (lanes[build.lane] || build.lane) + " · " + build.patch));
      detail.hidden = true;
      function pick(key, i) {
        const a = assets.get(key);
        if (!a) return el("span", "", "Недоступно");
        const b = button("", () => {
          const open = b.getAttribute("aria-expanded") !== "true";
          card
            .querySelectorAll("[aria-expanded]")
            .forEach((n) => n.setAttribute("aria-expanded", "false"));
          b.setAttribute("aria-expanded", String(open));
          detail.hidden = !open;
          detail.textContent = a.name + (a.description ? " · " + a.description : "");
        });
        b.className = "pb-community-item";
        b.title = a.name;
        b.setAttribute("aria-label", a.name);
        b.setAttribute("aria-expanded", "false");
        const img = el("img");
        img.src = a.icon;
        img.alt = "";
        img.loading = "lazy";
        if (i) b.append(el("span", "pb-order-number", String(i)));
        b.append(img);
        return b;
      }
      build.items.forEach((key, i) => {
        const li = el("li");
        li.append(pick(key, i + 1), el("span", "pb-community-name", assets.get(key)?.name || ""));
        line.append(li);
      });
      card.append(head, line);
      for (const [label, keys] of [
        ["Руны", build.runes],
        ["Заклинания", build.spells],
      ])
        if (keys?.length) {
          const row = el("div", "pb-author-runes");
          row.setAttribute("aria-label", label);
          keys.forEach((key) => row.append(pick(key, 0)));
          card.append(row);
        }
      card.append(detail);
      return card;
    }
    async function loadBuilds() {
      if (loading) return;
      loading = true;
      more.disabled = true;
      try {
        const data = await rpc("public_player_builds", { p_profile: id, p_offset: offset });
        const shown = allBuilds ? data.builds : data.builds.slice(0, 3);
        shown.forEach((b) => list.append(buildCard(b)));
        offset += data.builds.length;
        more.hidden = allBuilds ? !data.has_more : data.total <= 3;
        more.textContent = allBuilds ? "Ещё сборки" : "Все сборки (" + data.total + ")";
        if (!data.total) list.append(el("p", "pb-caption", "У игрока пока нет сборок."));
      } catch {
        more.hidden = false;
        more.textContent = "Повторить загрузку";
      } finally {
        loading = false;
        more.disabled = false;
      }
    }
    async function loadFriends(reset = false) {
      if (reset) {
        friendEpoch++;
        friendOffset = 0;
        friendLoading = false;
        friendsList.replaceChildren();
      }
      if (friendLoading) return;
      const turn = friendEpoch;
      friendLoading = true;
      friendsMore.disabled = true;
      try {
        const data = await rpc("public_player_friends", { p_profile: id, p_offset: friendOffset });
        if (turn !== friendEpoch) return;
        friendsTitle.textContent = "Друзья · " + data.total;
        const shown = allFriends ? data.players : data.players.slice(0, 3);
        shown.forEach((p) => {
          const card = el("div", "social-person");
          card.append(author(p));
          friendsList.append(card);
        });
        friendOffset += data.players.length;
        friendsMore.hidden = allFriends ? !data.has_more : data.total > 0 ? false : true;
        friendsMore.textContent = allFriends ? "Ещё друзей" : "Все друзья (" + data.total + ")";
        if (!data.total) friendsList.replaceChildren(el("p", "pb-caption", "Пока нет друзей."));
      } catch {
        if (turn !== friendEpoch) return;
        friendsList.append(el("p", "pb-caption", "Не удалось загрузить друзей."));
        if (allFriends) {
          friendsMore.hidden = false;
          friendsMore.textContent = "Повторить";
        }
      } finally {
        if (turn === friendEpoch) {
          friendLoading = false;
          friendsMore.disabled = false;
        }
      }
    }
    loadProfile();
    if (!allFriends) loadBuilds();
    window.addEventListener("rift-account-ready", loadProfile);
    window.addEventListener("rift-account-favorites", loadProfile);
    return;
  }
  const member = document.querySelector("#account-member");
  if (!member) return;
  const section = el("section", "player-builds social-account");
  section.innerHTML =
    '<h2>Друзья</h2><div class="pb-actions social-tabs"></div><p class="pb-status" role="status"></p><div class="social-list"></div><h3>Публичный профиль</h3><p class="pb-caption">Ник, аватар и сохранённые сборки видны посетителям. Почта закрыта.</p><div class="visibility-controls"><label><input type="checkbox" id="show-public-riot"> Показывать игровой тег</label><label><input type="checkbox" id="show-public-favorites"> Показывать избранных чемпионов</label></div><div class="pb-actions visibility-actions"></div><p class="visibility-status pb-status" role="status"></p>';
  member.append(section);
  const ownFriendTile = el("a", "profile-stat-cell profile-friends-tile");
  ownFriendTile.hidden = true;
  ownFriendTile.append(el("b", "", "0"), document.createTextNode("Друзья"));
  document.querySelector("#profile-favorite-count")?.closest("span")?.after(ownFriendTile);
  const tabs = section.querySelector(".social-tabs"),
    status = section.querySelector(".pb-status"),
    list = section.querySelector(".social-list"),
    settingsStatus = section.querySelector(".visibility-status"),
    settingActions = section.querySelector(".visibility-actions");
  let mode = "friends",
    epoch = 0,
    offset = 0,
    uid = null,
    fetching = false,
    settingsLoaded = false;
  const more = button("Ещё", () => loadList());
  more.hidden = true;
  list.after(more);
  for (const [key, label] of [
    ["friends", "Друзья"],
    ["incoming", "Входящие заявки"],
    ["outgoing", "Отправленные заявки"],
  ]) {
    const b = button(label, () => {
      mode = key;
      loadList(true);
    });
    b.dataset.mode = key;
    tabs.append(b);
  }
  async function loadList(reset = false) {
    if (!account.user) {
      list.replaceChildren();
      return;
    }
    if (reset) {
      epoch++;
      offset = 0;
      list.replaceChildren();
      fetching = false;
    }
    if (fetching) return;
    fetching = true;
    const turn = epoch;
    status.textContent = "Загружаем…";
    more.disabled = true;
    tabs
      .querySelectorAll("button")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    try {
      const data = await rpc("my_friendships", { p_section: mode, p_offset: offset });
      if (turn !== epoch) return;
      const friendCount =
        mode === "friends"
          ? data.total
          : (await rpc("my_friendships", { p_section: "friends", p_offset: 0 })).total;
      if (turn !== epoch) return;
      ownFriendTile.querySelector("b").textContent = String(friendCount);
      for (const p of data.players) {
        const card = el("div", "social-person"),
          actions = el("div", "pb-actions");
        card.append(author(p), actions);
        const add = (label, type) =>
          actions.append(button(label, () => action(p.id, type, card, () => loadList(true))));
        if (mode === "incoming") {
          add("Принять", "accept");
          add("Отклонить", "decline");
        } else if (mode === "outgoing") add("Отменить заявку", "cancel");
        else add("Удалить из друзей", "remove");
        list.append(card);
      }
      offset += data.players.length;
      status.textContent = data.total
        ? "Всего: " + data.total
        : mode === "friends"
          ? "Пока нет друзей. Добавляй игроков через их профили."
          : "Заявок пока нет.";
      more.hidden = !data.has_more;
      more.textContent = "Ещё";
    } catch {
      if (turn === epoch) {
        status.textContent = "Не удалось загрузить список.";
        more.hidden = false;
        more.textContent = "Повторить";
      }
    } finally {
      if (turn === epoch) {
        fetching = false;
        more.disabled = false;
      }
    }
  }
  const save = button("Сохранить видимость", async () => {
    if (!settingsLoaded) return;
    save.disabled = true;
    settingsStatus.textContent = "Сохраняем…";
    try {
      await rpc("profile_visibility", {
        p_riot: section.querySelector("#show-public-riot").checked,
        p_favorites: section.querySelector("#show-public-favorites").checked,
      });
      settingsStatus.textContent = "Настройки сохранены.";
    } catch {
      settingsStatus.textContent = "Не удалось сохранить настройки.";
    } finally {
      save.disabled = false;
    }
  });
  save.disabled = true;
  settingActions.append(save);
  async function refresh() {
    const next = account.user?.id;
    if (!next || account.loading) return;
    const changed = uid !== next;
    uid = next;
    loadList(true);
    if (!changed && settingsLoaded) return;
    settingsLoaded = false;
    save.disabled = true;
    try {
      const data = await rpc("profile_visibility");
      if (uid !== next || !data) return;
      section.querySelector("#show-public-riot").checked = data.show_riot_id;
      section.querySelector("#show-public-favorites").checked = data.show_favorites;
      let link = settingActions.querySelector("a");
      if (!link) {
        link = el("a", "pb-button", "Открыть мой профиль ↗");
        settingActions.append(link);
      }
      link.href = "player.html?id=" + encodeURIComponent(data.id);
      ownFriendTile.href = link.href + "&view=friends";
      ownFriendTile.hidden = false;
      settingsLoaded = true;
      save.disabled = false;
    } catch {
      settingsStatus.textContent = "Не удалось загрузить настройки видимости.";
    }
  }
  window.addEventListener("rift-account-ready", refresh);
  window.addEventListener("rift-account-favorites", () => {
    if (account.user?.id !== uid || !settingsLoaded) refresh();
  });
  refresh();
})();
