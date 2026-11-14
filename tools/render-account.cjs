require("./format-on-exit.cjs");
const fs = require("fs"),
  path = require("path"),
  root = path.resolve(__dirname, ".."),
  catalog = JSON.parse(fs.readFileSync(root + "/champion-catalog.json"));
const esc = (x) =>
  String(x).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const coverVideos = JSON.parse(fs.readFileSync(root + "/profile-videos.json")).videos;
const skinAnimations = JSON.parse(fs.readFileSync(root + "/skin-animations.json")).animations;
const skinAvatars = JSON.parse(fs.readFileSync(root + "/skin-avatars.json")).faces;
const allSkins = JSON.parse(fs.readFileSync(root + "/champion-skins.json")).champions;
const avatarData = catalog.map((c) => ({
  id: c.id,
  name: c.name,
  face: "assets/champions/faces/" + c.id + ".webp",
  skins: allSkins[c.id].map((s, i) => ({
    id: s.id,
    name: s.name,
    image: s.image,
    avatar: skinAvatars[s.id]?.src || "",
    animation: i === 0 ? coverVideos[c.id] || "" : skinAnimations[s.id]?.src || "",
  })),
}));
const body = `<div id="account-root"><div class="page-heading"><p class="eyebrow">RIFT ATLAS</p><h1>Личный кабинет</h1></div><p id="account-message" class="account-message" role="status" hidden></p><p id="account-loading" class="muted">Проверяем вход…</p><section id="account-guest" class="account-card"><h2>Твои чемпионы — на любом устройстве</h2><p class="muted">Войди, чтобы сохранять избранное в аккаунте.</p><div class="account-modes"><button class="chip" data-auth-mode="signin" aria-pressed="true">Вход</button><button class="chip" data-auth-mode="signup" aria-pressed="false">Регистрация</button></div><form id="auth-form" data-mode="signin"><label id="auth-nickname-row" hidden>Никнейм<input id="auth-nickname" name="nickname" minlength="2" maxlength="32" autocomplete="nickname"></label><label>Почта<input id="auth-email" name="email" type="email" autocomplete="email" required maxlength="254"></label><label>Пароль<input id="auth-password" name="password" type="password" minlength="8" maxlength="128" autocomplete="current-password" required></label><button id="auth-submit" class="chip active" type="submit">Войти</button><button id="auth-reset" class="account-text-button" type="button">Забыли пароль?</button></form></section><section id="account-member" hidden>
<div class="profile-hero"><img id="profile-cover" class="profile-cover" src="assets/champions/mel-hero.jpg" alt="" aria-hidden="true"><video id="profile-cover-video" class="profile-cover-video" muted loop playsinline autoplay preload="none" aria-hidden="true" tabindex="-1"></video><div class="profile-cover-shade"></div><div class="profile-hero-content"><div class="profile-avatar-frame"><img id="profile-picture" src="assets/champions/faces/mel.webp" alt="Аватар профиля"><span class="profile-avatar-mark" aria-hidden="true">R</span></div><div class="profile-identity"><p class="profile-kicker">ЛИЧНЫЙ ПРОФИЛЬ</p><h2 id="profile-display-name">Игрок</h2><span class="profile-private">Доступен только тебе</span></div><button id="profile-configure" class="profile-configure" type="button" aria-expanded="false" aria-controls="profile-editor"><span aria-hidden="true">⚙</span> Настроить профиль</button></div><div class="profile-hero-bottom"><button type="button" id="profile-motion-toggle" class="profile-motion-toggle" aria-pressed="false" hidden>Включить анимацию</button><span><b id="profile-favorite-count">0</b> в избранном</span><a href="champions.html">Выбрать чемпионов <span aria-hidden="true">↗</span></a></div></div>
<section id="profile-editor" class="account-card profile-editor" aria-labelledby="profile-editor-title" hidden><div class="profile-editor-heading"><h2 id="profile-editor-title">Настройки профиля</h2><button id="profile-editor-close" type="button" class="profile-close" aria-label="Закрыть настройки">×</button></div><p id="account-email" class="muted"></p><form id="profile-form"><div class="profile-edit-fields"><label>Никнейм<input id="profile-nickname" minlength="2" maxlength="32" required autocomplete="nickname"></label><div class="avatar-field"><span class="avatar-field-label">Аватар</span><button type="button" id="avatar-preview" class="avatar-preview"><img src="assets/champions/faces/mel.webp" alt=""><span><strong>Мэл</strong><small>Базовый образ</small></span><span aria-hidden="true">Изменить ↗</span></button><select id="profile-avatar" hidden aria-hidden="true" tabindex="-1">${catalog.map((c) => '<option value="' + esc(c.id) + '" data-hero="' + esc(c.hero) + '" data-cover-video="' + esc(coverVideos[c.id] || "") + '">' + esc(c.name) + "</option>").join("")}</select><dialog id="avatar-dialog" class="avatar-dialog" aria-labelledby="avatar-dialog-title"><div class="avatar-dialog-heading"><h2 id="avatar-dialog-title">Выбор аватара</h2><button type="button" id="avatar-close" class="profile-close" aria-label="Закрыть выбор аватара">×</button></div><div id="avatar-champ-panel"><label class="avatar-search-label">Персонаж<input id="avatar-search" type="search" placeholder="Найти чемпиона…" autocomplete="off"></label><div id="avatar-champions" class="avatar-champions" role="group" aria-label="Персонажи"></div><p id="avatar-no-results" class="muted" hidden>Персонажи не найдены.</p></div><div id="avatar-skin-panel" hidden><button id="avatar-back" class="account-text-button" type="button">← Все персонажи</button><h3 id="avatar-skin-title"></h3><div id="avatar-skins" class="avatar-skins" role="group" aria-label="Образы персонажа"></div></div></dialog><script type="application/json" id="profile-avatar-data">${JSON.stringify(avatarData).replace(/</g, "\\u003c")}</script></div></div><div class="profile-edit-actions"><button id="profile-save" class="chip active" type="submit">Сохранить изменения</button><button id="profile-cancel" class="chip" type="button">Отмена</button></div></form><div class="profile-settings-bottom"><button id="profile-import" class="account-text-button" type="button">Добавить избранное из браузера</button><button id="auth-signout" class="account-text-button" type="button">Выйти из аккаунта ↗</button></div></section>
<section class="profile-pool" aria-labelledby="profile-pool-title"><div class="profile-pool-heading"><div><p class="profile-kicker">МОЯ КОЛЛЕКЦИЯ</p><h2 id="profile-pool-title">Избранные чемпионы</h2></div><a class="profile-catalog-link" href="champions.html?favorites=1">Открыть каталог ↗</a></div><div id="profile-favorites"></div><div id="profile-empty" class="profile-empty"><span aria-hidden="true">☆</span><h3>Выбери своих чемпионов</h3><p>Нажми на звёздочку в каталоге — чемпион появится здесь.</p><a class="chip" href="champions.html">Перейти к чемпионам ↗</a></div></section></section><form id="recovery-form" class="account-card" hidden><h2>Новый пароль</h2><label>Пароль<input id="recovery-password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></label><button id="recovery-save" class="chip active" type="submit">Сохранить новый пароль</button></form></div>`;
let html = fs
  .readFileSync(root + "/champions.html", "utf8")
  .replace(/<title>[\s\S]*?<\/title>/, "<title>Личный кабинет · Rift Atlas</title>")
  .replace(/<main id="main">[\s\S]*?<\/main>/, '<main id="main">' + body + "</main>");
html = html
  .replace(/(<a href="champions\.html") aria-current="page"/g, "$1")
  .replace("WILD RIFT <b>/</b> Чемпионы", "WILD RIFT <b>/</b> Мой профиль")
  .replace(
    'data-account-link href="account.html"',
    'data-account-link aria-current="page" href="account.html"',
  );
html = html.replace(
  '<script src="account.js" defer></script>',
  '<script src="profile-avatar.js" defer></script>\n<script src="account.js" defer></script>',
);
fs.writeFileSync(root + "/account.html", html);
for (const name of fs.readdirSync(root).filter((n) => n.endsWith(".html"))) {
  let s = fs.readFileSync(root + "/" + name, "utf8");
  if (!s.includes('src="account.js"'))
    s = s.replace(
      /(<script src="app.js" defer><\/script>)/,
      '$1\n<script src="assets/vendor/supabase.js" defer></script>\n<script src="account.js" defer></script>',
    );
  if (!s.includes("data-account-link"))
    s = s.replace(
      "</aside>",
      '<a class="account-nav-link" data-account-link href="account.html">Войти</a></aside>',
    );
  if (!s.includes('id="account-toast"'))
    s = s.replace(
      "</body>",
      '<p id="account-toast" class="account-toast" role="status" hidden></p></body>',
    );
  s = require("./account-navigation.cjs")(s, name === "account.html");
  fs.writeFileSync(root + "/" + name, s);
}
console.log("Account page and navigation updated");
