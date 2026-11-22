// Basic search metadata and sitemap for the published GitHub Pages address.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const base = 'https://fuyugakuru.github.io/rift-atlas/';
const pages = {
  'index.html': ['Rift Atlas — гайды League of Legends: Wild Rift', 'Рифт Атлас — справочник и гайды по League of Legends: Wild Rift (Лига Легенд: Вайлд Рифт). Чемпионы, сборки, руны, предметы, матчапы и таймеры.'],
  'champions.html': ['Чемпионы Wild Rift — гайды, сборки и руны | Rift Atlas', 'Чемпионы League of Legends: Wild Rift — навыки, сборки предметов, руны, прокачка и матчапы. Каталог героев Вайлд Рифт с фильтрами по линиям и ролям.'],
  'items.html': ['Предметы Wild Rift — эффекты, сборки и рецепты | Rift Atlas', 'Предметы League of Legends: Wild Rift — характеристики, эффекты и рецепты сборки. Узнайте, какие предметы Вайлд Рифт подходят вашему чемпиону.'],
  'matchups.html': ['Матчапы чемпионов Wild Rift | Rift Atlas', 'Матчапы и удобные соперники чемпионов Wild Rift. Сравнивайте матчапы на разных линиях и переходите к сборкам и навыкам чемпионов.'],
  'timers.html': ['Таймеры Wild Rift — монстры, драконы и Барон | Rift Atlas', 'Первое появление и возрождение объектов Wild Rift: драконы, Барон, Герольд и лесные лагеря. Таблица таймингов и тест для запоминания.'],
  'patches.html': ['Патчи Wild Rift — изменения игры | Rift Atlas', 'Обновления Wild Rift: изменения чемпионов, предметов и игровых объектов. Информация о патчах и ссылки на официальные описания обновлений.'],
  'meta.html': ['Мета и выбор чемпионов Wild Rift | Rift Atlas', 'Раздел меты Wild Rift: выбор чемпионов, игровые роли и переходы к справочнику чемпионов, сборкам и контрпикам.'],
  'sources.html': ['Источники и обновления справочника | Rift Atlas', 'Источники данных Rift Atlas: официальные материалы Wild Rift, справочники и информация об обновлении данных сайта.'],
};
const escape = text => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function metadata(html, file) {
  const [title, description] = pages[file];
  html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + escape(title) + '</title>');
  let found = false;
  html = html.replace(/<meta\b[^>]*>/gi, tag => {
    if (!/\bname\s*=\s*["']description["']/i.test(tag)) return tag;
    found = true;
    return '<meta name="description" content="' + escape(description) + '" />';
  });
  if (!found) html = html.replace(/<\/head>/i, '    <meta name="description" content="' + escape(description) + '" />\n  </head>');
  html = html.replace(/\s*<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/gi, '');
  const canonical = base + (file === 'index.html' ? '' : file);
  return html.replace(/<\/head>/i, '    <link rel="canonical" href="' + canonical + '" />\n  </head>');
}
function sitemap(files) {
  const excluded = new Set(['account.html', 'player.html', 'community-builds.html', '404.html']);
  const urls = files.filter(file => file.endsWith('.html') && !excluded.has(file) && !/^google[a-z0-9]+\.html$/i.test(file)).sort();
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(file => '  <url><loc>' + escape(base + (file === 'index.html' ? '' : file)) + '</loc></url>').join('\n') + '\n</urlset>\n';
}
function workflow(html) {
  if (html.includes('cp -- sitemap.xml')) return html;
  return html.replace(/(\s+cp -- \*\.html \*\.css \*\.js \*\.svg "\$RUNNER_TEMP\/website\/"\r?\n)/, '$1          cp -- sitemap.xml "$RUNNER_TEMP/website/"\n');
}
if (require.main === module) {
  for (const file of Object.keys(pages)) fs.writeFileSync(path.join(root, file), metadata(fs.readFileSync(path.join(root, file), 'utf8'), file));
  fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap(fs.readdirSync(root)));
  const flow = path.join(root, '.github/workflows/pages.yml');
  fs.writeFileSync(flow, workflow(fs.readFileSync(flow, 'utf8')));
  console.log('SEO metadata: ' + Object.keys(pages).length + ' pages. Sitemap created.');
}
module.exports = { pages, metadata, sitemap, workflow };
