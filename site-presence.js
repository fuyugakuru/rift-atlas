// Онлайн — уникальные браузеры в публичной комнате Presence, без личных данных.
(() => {
  "use strict";
  const client = window.RiftAccount?.client,
    topbar = document.querySelector(".topbar");
  if (!client || !topbar || document.querySelector(".site-online")) return;
  const badge = document.createElement("span");
  badge.className = "site-online";
  badge.innerHTML =
    '<i aria-hidden="true"></i><span class="site-online-label">Онлайн</span><b>—</b>';
  badge.title = "Примерное число посетителей сейчас. Вкладки одного браузера считаются один раз.";
  badge.setAttribute("aria-label", "Счётчик онлайн: подключение");
  const link = topbar.querySelector("[data-account-link]");
  if (link) link.before(badge);
  else (topbar.querySelector("div") || topbar).append(badge);
  const value = badge.querySelector("b"),
    storageKey = "rift-online-visitor-v1";
  const valid = (id) => typeof id === "string" && /^[a-f0-9-]{36}$/i.test(id);
  let visitorId;
  try {
    visitorId = localStorage.getItem(storageKey);
    if (!valid(visitorId)) {
      visitorId = crypto.randomUUID();
      localStorage.setItem(storageKey, visitorId);
    }
    visitorId = localStorage.getItem(storageKey) || visitorId;
  } catch {
    visitorId = crypto.randomUUID();
  }
  // Локальная разработка не увеличивает публичный онлайн.
  const local =
    ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) ||
    location.protocol === "file:";
  const room = local ? "rift-atlas-online-preview-v1" : "rift-atlas-online-v1";
  let channel = null,
    epoch = 0,
    tracked = false;
  function unavailable() {
    badge.classList.remove("is-connected");
    value.textContent = "—";
    badge.setAttribute("aria-label", "Счётчик онлайн временно недоступен");
  }
  function render(current) {
    if (current !== channel || !tracked) return;
    const state = current.presenceState();
    if (!state[visitorId]?.length) return;
    const count = Object.values(state).filter(
      (entries) => Array.isArray(entries) && entries.length > 0,
    ).length;
    value.textContent = count.toLocaleString("ru-RU");
    badge.classList.add("is-connected");
    badge.setAttribute("aria-label", "Сейчас на сайте: " + count);
  }
  function connect() {
    if (channel || !navigator.onLine) return;
    const turn = ++epoch;
    tracked = false;
    const current = client.channel(room, {
      config: { presence: { key: visitorId }, broadcast: { self: false } },
    });
    channel = current;
    current
      .on("presence", { event: "sync" }, () => render(current))
      .subscribe(async (status) => {
        if (turn !== epoch || current !== channel) return;
        if (status === "SUBSCRIBED") {
          try {
            const result = await current.track({ v: 1 });
            if (turn !== epoch) return;
            tracked = result === "ok";
            if (tracked) render(current);
            else unavailable();
          } catch {
            unavailable();
          }
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          tracked = false;
          unavailable();
        }
      });
  }
  function disconnect() {
    const old = channel;
    epoch++;
    channel = null;
    tracked = false;
    if (old) client.removeChannel(old).catch(() => {});
    unavailable();
  }
  window.addEventListener("pagehide", disconnect);
  window.addEventListener("pageshow", connect);
  window.addEventListener("offline", () => {
    disconnect();
  });
  window.addEventListener("online", connect);
  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey) return;
    let canonical = event.newValue;
    try {
      canonical = localStorage.getItem(storageKey) || canonical;
    } catch {}
    if (valid(canonical) && canonical !== visitorId) {
      visitorId = canonical;
      disconnect();
      connect();
    }
  });
  connect();
})();
