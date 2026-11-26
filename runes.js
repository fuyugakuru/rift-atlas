// Каталог рун: одна открытая карточка, расположенная под выбранным рядом.
(() => {
  const data = window.RIFT_RUNES;
  if (!data) return;
  let selected = null;
  const make = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  function addRow(ids, parent, label, color) {
    const row = make('div', 'runes-row');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', label);
    const slot = make('div', 'rune-description-slot');
    ids.forEach(id => {
      const rune = data.runes[id];
      if (!rune) return;
      const button = make('button', 'rune-button');
      button.type = 'button';
      button.setAttribute('aria-expanded', 'false');
      const img = make('img');
      img.src = rune.icon;
      img.alt = '';
      img.width = 64; img.height = 64;
      button.append(img, make('span', 'rune-name', rune.name));
      button.addEventListener('click', () => {
        const same = selected?.button === button;
        if (selected) {
          selected.button.setAttribute('aria-expanded', 'false');
          selected.slot.replaceChildren();
        }
        selected = null;
        if (same) return;
        button.setAttribute('aria-expanded', 'true');
        const card = make('article', 'rune-description');
        if (color) card.style.setProperty('--rune-color', color);
        const heading = make('div', 'rune-description-heading');
        heading.append(img.cloneNode(), make('h3', '', rune.name));
        const description = make('p', '', rune.description);
        description.setAttribute('data-stat-description', '');
        card.append(heading, description);
        slot.append(card);
        selected = {button, slot};
      });
      row.append(button);
    });
    parent.append(row, slot);
  }
  const keys = document.getElementById('runes-keystones');
  addRow(data.keystones, keys, 'Ключевые руны');
  const trees = document.getElementById('runes-trees');
  const chosen = ['precision', 'domination'];
  const panels = [];
  function renderBranches() {
    if (selected && !keys.contains(selected.button)) {
      selected.button.setAttribute('aria-expanded', 'false');
      selected.slot.replaceChildren(); selected = null;
    }
    panels.forEach((panel, side) => {
      const tree = data.trees.find(t => t.id === chosen[side]);
      panel.style.setProperty('--rune-color', tree.color);
      panel.querySelectorAll('.rune-branch-tab').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.tree === tree.id));
      });
      const content = panel.querySelector('.rune-branch-content');
      content.replaceChildren(make('h2', '', tree.name));
      tree.rows.forEach((row, index) => addRow(row, content, `${tree.name}, ряд ${index + 1}`, tree.color));
    });
  }
  ['Основная ветка', 'Дополнительная ветка'].forEach((label, side) => {
    const panel = make('section', 'rune-tree');
    panel.append(make('p', 'rune-branch-label', label));
    const tabs = make('div', 'rune-branch-tabs');
    tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', label);
    data.trees.forEach(tree => {
      const button = make('button', 'rune-branch-tab');
      button.type = 'button'; button.dataset.tree = tree.id;
      button.style.setProperty('--branch-color', tree.color);
      const diamond = make('span', 'rune-branch-diamond');
      const img = make('img'); img.src = data.runes[tree.rows[0][0]].icon; img.alt = '';
      diamond.append(img);
      button.append(diamond, make('span', '', tree.name));
      button.addEventListener('click', () => {
        const other = 1 - side;
        if (chosen[other] === tree.id) chosen[other] = chosen[side];
        chosen[side] = tree.id; renderBranches();
      });
      tabs.append(button);
    });
    panel.append(tabs, make('div', 'rune-branch-content'));
    panels.push(panel); trees.append(panel);
  });
  renderBranches();
})();
