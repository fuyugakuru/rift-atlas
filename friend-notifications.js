// Private friendship and build notifications. No notification or email is sent outside the site.
(() => {
  "use strict";
  const account = window.RiftAccount,
    client = account?.client,
    bar = document.querySelector(".topbar");
  if (!client || !bar || document.querySelector(".rift-notifications")) return;
  const host = document.createElement("div");
  host.className = "rift-notifications";
  host.hidden = true;
  host.innerHTML =
    '<button type="button" class="notification-toggle" aria-label="Уведомления" aria-expanded="false" aria-controls="friend-notification-panel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><b hidden></b></button><section id="friend-notification-panel" class="notification-panel" aria-label="Уведомления" hidden><div class="notification-heading"><strong>Уведомления</strong><button type="button" class="notification-close" aria-label="Закрыть уведомления">×</button></div><p class="notification-status" role="status" aria-live="polite"></p><div class="notification-list"></div><button type="button" class="notification-more" hidden>Показать ещё</button><a class="notification-friends-link" href="account.html?view=friends">Перейти к друзьям ↗</a></section>';
  const accountLink = bar.querySelector("[data-account-link]");
  if (accountLink) accountLink.before(host);
  else (bar.querySelector("div") || bar).append(host);
  const toggle = host.querySelector(".notification-toggle"),
    counter = toggle.querySelector("b"),
    panel = host.querySelector(".notification-panel"),
    list = host.querySelector(".notification-list"),
    status = host.querySelector(".notification-status"),
    more = host.querySelector(".notification-more");
  let uid = null,
    epoch = 0,
    busy = false,
    offset = 0,
    timer = null;
  const node = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  async function rpc(name, args) {
    let deadline;
    try {
      const result = await Promise.race([
        client.rpc(name, args),
        new Promise((_, reject) => {
          deadline = setTimeout(() => reject(Error("timeout")), 12000);
        }),
      ]);
      if (result.error) throw result.error;
      return result.data;
    } finally {
      clearTimeout(deadline);
    }
  }
  function count(n) {
    const total = Math.max(0, Number(n) || 0);
    window.dispatchEvent(new CustomEvent('rift-notification-count',{detail:total}));
    counter.hidden = !total;
    counter.textContent = total > 99 ? "99+" : String(total);
    toggle.setAttribute(
      "aria-label",
      total ? "Уведомления: " + total + " непрочитанных" : "Уведомления",
    );
  }
  function close() {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }
  const notificationChampionNames = {
    aurora: "АВРОРА",
    akali: "АКАЛИ",
    akshan: "АКШАН",
    alistar: "АЛИСТАР",
    ambessa: "АМБЕССА",
    amumu: "АМУМУ",
    ahri: "АРИ",
    aatrox: "АТРОКС",
    "aurelion-sol": "АУРЕЛИОН СОЛ",
    bard: "БАРД",
    blitzcrank: "БЛИЦКРАНК",
    braum: "БРАУМ",
    brand: "БРЭНД",
    vi: "ВАЙ",
    warwick: "ВАРВИК",
    varus: "ВАРУС",
    veigar: "ВЕЙГАР",
    vayne: "ВЕЙН",
    vex: "ВЕКС",
    velkoz: "ВЕЛ'КОЗ",
    viego: "ВИЕГО",
    viktor: "ВИКТОР",
    vladimir: "ВЛАДИМИР",
    volibear: "ВОЛИБИР",
    wukong: "ВУКОНГ",
    galio: "ГАЛИО",
    garen: "ГАРЕН",
    gwen: "ГВЕН",
    hecarim: "ГЕКАРИМ",
    gnar: "ГНАР",
    gragas: "ГРАГАС",
    graves: "ГРЕЙВЗ",
    darius: "ДАРИУС",
    jax: "ДЖАКС",
    "jarvan-iv": "ДЖАРВАН IV",
    jayce: "ДЖЕЙС",
    jhin: "ДЖИН",
    jinx: "ДЖИНКС",
    diana: "ДИАНА",
    "dr-mundo": "ДОКТОР МУНДО",
    draven: "ДРЕЙВЕН",
    yone: "ЁНЭ",
    janna: "ЖАННА",
    zyra: "ЗАЙРА",
    zed: "ЗЕД",
    zeri: "ЗЕРИ",
    ziggs: "ЗИГГС",
    zilean: "ЗИЛЕАН",
    zoe: "ЗОИ",
    irelia: "ИРЕЛИЯ",
    ksante: "К'Санте",
    khazix: "КА'ЗИКС",
    kayn: "КАИН",
    kaisa: "КАЙ'СА",
    kalista: "КАЛИСТА",
    camille: "КАМИЛЛА",
    karma: "КАРМА",
    kassadin: "КАССАДИН",
    katarina: "КАТАРИНА",
    kayle: "КЕЙЛ",
    caitlyn: "КЕЙТЛИН",
    kennen: "КЕННЕН",
    kindred: "КИНДРЕД",
    kogmaw: "КОГ'МАО",
    corki: "КОРКИ",
    "xin-zhao": "КСИН ЖАО",
    leona: "ЛЕОНА",
    "lee-sin": "ЛИ СИН",
    lillia: "ЛИЛЛИЯ",
    lissandra: "Лиссандра",
    lulu: "ЛУЛУ",
    lux: "ЛЮКС",
    lucian: "ЛЮЦИАН",
    malphite: "МАЛЬФИТ",
    maokai: "МАОКАЙ",
    "master-yi": "МАСТЕР ЙИ",
    milio: "МИЛИО",
    "miss-fortune": "МИСС ФОРТУНА",
    morgana: "МОРГАНА",
    mordekaiser: "МОРДЕКАЙЗЕР",
    mel: "Мэл",
    nami: "НАМИ",
    nasus: "НАСУС",
    nautilus: "НАУТИЛУС",
    nidalee: "НИДАЛИ",
    nilah: "НИЛА",
    nocturne: "НОКТЮРН",
    norra: "НОРРА",
    "nunu-and-willump": "НУНУ и ВИЛЛУМП",
    olaf: "ОЛАФ",
    orianna: "ОРИАННА",
    ornn: "ОРН",
    pyke: "ПАЙК",
    pantheon: "ПАНТЕОН",
    poppy: "ПОППИ",
    ryze: "РАЙЗ",
    rumble: "РАМБЛ",
    rammus: "РАММУС",
    rell: "РЕЛЛ",
    rengar: "РЕНГАР",
    renekton: "РЕНЕКТОН",
    riven: "РИВЕН",
    rakan: "РЭЙКАН",
    sylas: "САЙЛАС",
    samira: "САМИРА",
    swain: "СВЕЙН",
    senna: "СЕННА",
    seraphine: "СЕРАФИНА",
    sett: "СЕТТ",
    sivir: "СИВИР",
    singed: "СИНДЖЕД",
    syndra: "Синдра",
    sion: "СИОН",
    skarner: "СКАРНЕР",
    smolder: "СМОЛДЕР",
    sona: "СОНА",
    soraka: "СОРАКА",
    taliyah: "ТАЛИЯ",
    talon: "ТАЛОН",
    "twisted-fate": "ТВИСТЕД ФЭЙТ",
    twitch: "ТВИЧ",
    teemo: "ТИМО",
    thresh: "ТРЕШ",
    tryndamere: "ТРИНДАМИР",
    tristana: "ТРИСТАНА",
    urgot: "УРГОТ",
    fiddlesticks: "ФИДДЛСТИКС",
    fizz: "ФИЗЗ",
    fiora: "ФИОРА",
    hwei: "ХВЭЙ",
    heimerdinger: "ХЕЙМЕРДИНГЕР",
    chogath: "ЧО'ГАТ",
    xayah: "ШАЯ",
    shen: "ШЕН",
    shyvana: "ШИВАНА",
    evelynn: "ЭВЕЛИНН",
    ezreal: "ЭЗРЕАЛЬ",
    ekko: "ЭККО",
    annie: "ЭННИ",
    ashe: "ЭШ",
    yuumi: "ЮМИ",
    yunara: "ЮНАРА",
    yasuo: "ЯСУО",
  };
  function card(notice) {
    const entry = node(
      "div",
      "notification-entry" + (notice.unread ? " is-unread" : ""),
    );
    const build = notice.build;
    const isBuild =
      (notice.kind === "build_saved" || notice.kind === "build_likes") &&
      build &&
      /^[a-z0-9-]+$/.test(build.champion || "");
    const isMilestone = isBuild && notice.kind === "build_likes";
    let href =
      notice.kind === "request"
        ? "account.html?view=friends&tab=incoming"
        : "account.html?view=friends";
    if (isBuild) {
      const url = new URL(build.champion + ".html", location.href);
      url.searchParams.set("buildLane", build.lane);
      url.searchParams.set("buildPatch", build.patch);
      url.hash = "player-builds-title";
      href = url.href;
    }
    const avatarLink = node("a", "notification-avatar-link");
    avatarLink.href = isMilestone
      ? href
      : "player.html?id=" + encodeURIComponent(notice.player.id);
    avatarLink.setAttribute(
      "aria-label",
      isMilestone ? "Открыть сборку" : "Профиль: " + notice.player.nickname,
    );
    const img = node("img", "notification-avatar");
    const champion = isMilestone
      ? build.champion
      : String(notice.player.avatar || "mel").split("--")[0];
    img.src =
      (!isMilestone && window.RIFT_AUTHOR_AVATARS?.[notice.player.avatar]) ||
      "assets/champions/faces/" +
        (/^[a-z0-9-]+$/.test(champion) ? champion : "mel") +
        ".webp";
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener(
      "error",
      () => {
        img.src = "assets/champions/faces/mel.webp";
      },
      { once: true },
    );
    avatarLink.append(img);
    const text = node("span", "notification-copy"),
      link = node("a", "notification-target");
    link.href = href;
    const name = isBuild
      ? notificationChampionNames[build.champion] || build.champion
      : "";
    let message =
      notice.kind === "request"
        ? "Заявка в друзья от " + notice.player.nickname
        : "Заявка принята · " + notice.player.nickname;
    if (isBuild)
      message = isMilestone
        ? "Твоя сборка · " +
          name +
          " получила " +
          Number(build.milestone) +
          (Number(build.milestone) === 1
            ? " отметку «Нравится»"
            : " отметок «Нравится»")
        : "Игрок " + notice.player.nickname + " сохранил твою сборку · " + name;
    link.append(node("strong", "", message));
    text.append(link);
    if (isBuild && build.title)
      text.append(node("small", "notification-build-title", build.title));
    const date = new Date(notice.created_at);
    text.append(
      node(
        "small",
        "",
        Number.isNaN(date.getTime())
          ? ""
          : date.toLocaleString("ru-RU", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
      ),
    );
    entry.append(avatarLink, text);
    return entry;
  }
  async function load(append = false) {
    if (!uid || busy || document.hidden) return;
    busy = true;
    const turn = epoch,
      me = uid,
      open = !panel.hidden,
      start = append ? offset : 0;
    if (open && !append) {
      list.replaceChildren();
      offset = 0;
      status.textContent = "Загружаем…";
    }
    more.disabled = true;
    try {
      const data = await rpc("my_notifications", { p_offset: start });
      if (turn !== epoch || uid !== me) return;
      count(data.unread);
      if (!panel.hidden) {
        if (!append) {
          list.replaceChildren();
          offset = 0;
        }
        const notices = data.notifications || [];
        notices.forEach((n) => list.append(card(n)));
        offset += notices.length;
        status.textContent = offset ? "" : "Пока нет уведомлений.";
        more.hidden = !data.has_more;
        const unread = notices.filter((n) => n.unread).map((n) => n.id);
        if (unread.length) {
          try {
            const remaining = await rpc("read_notifications", {
              p_ids: unread,
            });
            if (turn === epoch && uid === me) count(remaining);
          } catch {
            /* Unread state is retained when marking fails. */
          }
        }
      }
    } catch {
      if (turn === epoch && !panel.hidden) {
        status.textContent = "Не удалось загрузить уведомления.";
        more.hidden = false;
        more.textContent = "Повторить";
      }
    } finally {
      if (turn === epoch) {
        busy = false;
        more.disabled = false;
      }
    }
  }
  toggle.addEventListener("click", () => {
    const opening = panel.hidden;
    panel.hidden = !opening;
    toggle.setAttribute("aria-expanded", String(opening));
    if (opening) load();
  });
  window.addEventListener('rift-open-notifications',()=>{
    if(!uid)return;
    panel.hidden=false;toggle.setAttribute('aria-expanded','true');load();
    toggle.focus();
  });
  host.querySelector(".notification-close").addEventListener("click", () => {
    close();
    toggle.focus();
  });
  document.addEventListener("pointerdown", (e) => {
    if (!host.contains(e.target)) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) {
      close();
      toggle.focus();
    }
  });
  more.addEventListener("click", () => {
    const retry = more.textContent === "Повторить";
    more.textContent = "Показать ещё";
    load(!retry);
  });
  function refresh() {
    const next = account.user?.id || null;
    if (next !== uid) {
      epoch++;
      uid = next;
      busy = false;
      offset = 0;
      close();
      list.replaceChildren();
      count(0);
    }
    host.hidden = !uid;
    if (timer) clearInterval(timer);
    timer = null;
    if (uid) {
      load();
      timer = setInterval(() => {
        if (panel.hidden) load();
      }, 60000);
    }
  }
  window.addEventListener("rift-account-ready", refresh);
  window.addEventListener("rift-friendships-changed", () => load());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) load();
  });
  window.addEventListener("focus", () => load());
  window.addEventListener("pagehide", () => {
    if (timer) clearInterval(timer);
  });
  refresh();
})();
