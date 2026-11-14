// Единая заметная кнопка аккаунта в верхней панели всех страниц.
module.exports = (html, current = false) => {
  html = html.replace(/<a\b[^>]*data-account-link[^>]*>[\s\S]*?<\/a\s*>/g, "");
  const link =
    '<a class="account-top-link" data-account-link' +
    (current ? ' aria-current="page"' : "") +
    ' href="account.html"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg><span data-account-label>Войти</span></a>';
  return html.replace(
    /(<header\b[^>]*class="topbar"[^>]*>[\s\S]*?)(<\/div>\s*<\/header>)/,
    (_, start, end) => start + link + end,
  );
};
