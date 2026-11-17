(() => {
  "use strict";
  const account = window.RiftAccount,
    client = account?.client;
  if (!client) return;
  const entries = new Map();
  let scheduled = false,
    epoch = 0,
    uid = account.user?.id || null;
  const key = (b) =>
    JSON.stringify([b.profile || null, b.champion, b.lane, b.patch]);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const thumb =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M7 10h-4v11h4M7 10l5-8c2 0 3 2 2 5l-1 3h6c2 0 2 2 2 3l-2 7c0 1-1 1-2 1h-10z"/></svg>';
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
  function render(entry, data) {
    entry.vote = Number(data.vote) || 0;
    entry.self = !!data.self;
    const total = Math.max(0, Number(data.saves) || 0);
    entry.saves.textContent = String(total);
    entry.saves.setAttribute("aria-label", "Сохранили сборку: " + total);
    entry.saves.title = "Количество игроков, сохранивших сборку";
    for (const [value, button, count, word] of [
      [1, entry.like, data.likes, "Нравится"],
      [-1, entry.dislike, data.dislikes, "Не нравится"],
    ]) {
      button.querySelector("span").textContent = String(
        Math.max(0, Number(count) || 0),
      );
      button.setAttribute("aria-pressed", String(entry.vote === value));
      button.setAttribute("aria-label", word + ": " + (Number(count) || 0));
      button.disabled = entry.self || entry.busy;
      button.title = entry.self ? "Нельзя оценивать свою сборку" : word;
    }
  }
  async function refresh(onlyKey) {
    const turn = epoch,
      all = [...entries.values()].filter(
        (e) => e.target.isConnected && (!onlyKey || key(e.build) === onlyKey),
      );
    for (let i = 0; i < all.length; i += 100) {
      const page = all.slice(i, i + 100);
      try {
        const data = await rpc("build_engagement", {
          p_builds: page.map((e) => e.build),
        });
        if (turn !== epoch) return;
        page.forEach((e, j) => {
          if (data[j]) render(e, data[j]);
        });
      } catch {
        if (turn === epoch)
          page.forEach((e) => {
            e.saves.textContent = "—";
            e.saves.title = "Не удалось загрузить счётчики";
          });
      }
    }
  }
  function attach(target) {
    let build;
    try {
      build = JSON.parse(
        target.dataset.saveBuild || target.dataset.buildFeedback,
      );
    } catch {
      return;
    }
    const toolbar = el("div", "pb-build-actions");
    if (target.matches("[data-save-build]")) {
      target.before(toolbar);
      toolbar.append(target);
    } else target.append(toolbar);
    const saves = el("span", "pb-save-count", "—"),
      like = el("button", "pb-vote pb-vote-like"),
      dislike = el("button", "pb-vote pb-vote-dislike"),
      note = el("p", "pb-feedback-note");
    note.setAttribute("role", "status");
    for (const b of [like, dislike]) {
      b.type = "button";
      b.innerHTML = thumb;
      b.append(el("span", "", "—"));
      b.setAttribute("aria-pressed", "false");
    }
    like.setAttribute("aria-label", "Нравится");
    dislike.setAttribute("aria-label", "Не нравится");
    toolbar.append(saves, like, dislike, note);
    const entry = {
      target,
      build,
      saves,
      like,
      dislike,
      note,
      vote: 0,
      busy: false,
      self: false,
    };
    entries.set(target, entry);
    for (const [value, button] of [
      [1, like],
      [-1, dislike],
    ])
      button.addEventListener("click", async () => {
        if (!account.user) {
          location.href = "account.html";
          return;
        }
        if (entry.busy || entry.self) return;
        const turn = epoch,
          desired = entry.vote === value ? 0 : value,
          buildKey = key(build),
          matching = [...entries.values()].filter(
            (e) => key(e.build) === buildKey,
          );
        matching.forEach((e) => {
          e.busy = true;
          e.like.disabled = e.dislike.disabled = true;
          e.note.textContent = "";
        });
        try {
          const vote = await rpc("set_build_vote", {
            p_profile: build.profile,
            p_champion: build.champion,
            p_lane: build.lane,
            p_patch: build.patch,
            p_vote: desired,
          });
          if (turn !== epoch) return;
          matching.forEach((e) => {
            e.vote = Number(vote) || 0;
            e.like.setAttribute("aria-pressed", String(e.vote === 1));
            e.dislike.setAttribute("aria-pressed", String(e.vote === -1));
          });
          await refresh(buildKey);
        } catch {
          if (turn === epoch)
            note.textContent = "Не удалось отправить оценку. Попробуй ещё раз.";
        } finally {
          matching.forEach((e) => {
            e.busy = false;
            e.like.disabled = e.dislike.disabled = e.self;
          });
        }
      });
  }
  function scan() {
    scheduled = false;
    let added = false;
    for (const target of document.querySelectorAll(
      "[data-save-build],[data-build-feedback]",
    ))
      if (!entries.has(target)) {
        attach(target);
        added = true;
      }
    for (const target of entries.keys())
      if (!target.isConnected) entries.delete(target);
    if (added) refresh();
  }
  new MutationObserver(() => {
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(scan);
    }
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("rift-saved-builds-changed", () => refresh());
  window.addEventListener("rift-account-ready", () => {
    const next = account.user?.id || null;
    if (uid !== next) {
      uid = next;
      epoch++;
      for (const e of entries.values()) {
        e.vote = 0;
        e.self = false;
        e.like.setAttribute("aria-pressed", "false");
        e.dislike.setAttribute("aria-pressed", "false");
        e.like.disabled = e.dislike.disabled = false;
      }
      refresh();
    }
  });
  window.addEventListener("focus", () => refresh());
  scan();
})();
