(() => {
  'use strict';
  const kit = window.InspectorInputKit;
  const modules = window.InspectorAtlasData.modules;
  const index = document.getElementById('index'), grid = document.getElementById('grid'), search = document.getElementById('search');
  const names = { scene: '场景', group: '组', element: '元素', primitive: '图元', image: '图片／序列', particle: '粒子', decor: '加样', sample: '采样' };
  const set = (target, path, value) => {
    const parts = path.split('.'); let node = target;
    while (parts.length > 1) { const key = parts.shift(); node = node[key] ?? (node[key] = {}); }
    node[parts[0]] = value;
  };
  const e = kit.escape;
  function renderSections(module) {
    return module.sections(module.state).map(part => `<section class="module"><div class="module-title"><span>${e(part.title)}</span><span>${part.powerKey ? `<button class="atlas-power" type="button" data-atlas-power="${e(part.powerKey)}" aria-pressed="${!!kit.get(module.state, part.powerKey, false)}" aria-label="${e(part.title)}启用或停用">⏻</button>` : ''}${part.timed ? '<span class="time" title="该段支持时序">⌁</span>' : ''}</span></div><div class="module-body">${part.gallery ? `<div class="atlas-gallery">${part.gallery.map(item => `<div class="atlas-gallery-card${kit.get(module.state, part.selectedKey) === item.value ? ' selected' : ''}${kit.get(module.state, `${item.value}.enabled`, false) ? ' enabled' : ''}"><button type="button" data-atlas-select="${e(item.value)}" aria-pressed="${kit.get(module.state, part.selectedKey) === item.value}">${e(item.label)}</button><button type="button" class="atlas-gallery-power" data-atlas-motion-power="${e(item.value)}" aria-pressed="${!!kit.get(module.state, `${item.value}.enabled`, false)}" aria-label="${e(item.label)}启用或停用">⏻</button></div>`).join('')}</div>` : ''}${part.rows.map((line, index) => {
      const fields = line.fields;
      return `<div class="atlas-row" data-layout="${line.layout}" data-nested="${!!line.nested}" data-row="${index}">${fields.map(field => kit.renderField(field, module.state)).join('')}</div>`;
    }).join('')}${part.note ? `<p class="atlas-note">${e(part.note)}</p>` : ''}</div></section>`).join('');
  }
  function draw(module, panel) { panel.querySelector('.panel-content').innerHTML = `<div class="panel-kicker">${e(module.tab)} · ${e(names[module.scope] || module.scope)}</div>${renderSections(module)}`; }
  function mount(module) {
    const article = document.createElement('article');
    article.className = 'atlas-panel ik-host'; article.dataset.stage = module.stage; article.dataset.scope = module.scope; article.dataset.module = module.id;
    article.innerHTML = `<div class="panel-screen"><div class="panel-head"><span>${e(module.name)}</span><small>${e(module.registryId || names[module.scope] || module.scope)}</small></div><div class="panel-tabs"><span class="${module.tab === '成样' ? 'current' : ''}">成样</span><span class="${module.tab === '加样' ? 'current' : ''}">加样</span><span class="${module.tab === '采样' ? 'current' : ''}">采样</span></div><div class="panel-content"></div></div>`;
    draw(module, article);
    kit.bind(article, (key, value, structural) => {
      set(module.state, key, value);
      if (module.id === 'effect-texture-overlay' && key.startsWith('pattern.')) {
        const map = { type: 'texture', color: 'color', opacity: 'alpha', rowPhase: 'rowPhase' };
        set(module.state, map[key.slice(8)] || key.slice(8), value);
      }
      if (module.id === 'effect-texture-overlay' && ['color', 'alpha'].includes(key)) {
        set(module.state, `pattern.${key === 'alpha' ? 'opacity' : key}`, value);
      }
      if (module.id.startsWith('effect-') && key === 'motion.type') {
        const motion = window.EditorEffectRegistryVNext.motionById[value];
        for (const param of motion?.params || []) set(module.state, `motion.${param.key}`, param.default);
      }
      if (structural || /\.(type|layout|mode|enabled|expanded|edit)$/.test(key) || ['textureOn', 'stroke', 'fill', 'texture', 'asset', 'source', 'playback', 'duotone'].includes(key)) draw(module, article);
    });
    article.addEventListener('click', event => {
      const power = event.target.closest('[data-atlas-power]');
      if (power) { const key = power.dataset.atlasPower; set(module.state, key, !kit.get(module.state, key, false)); draw(module, article); return; }
      const motionPower = event.target.closest('[data-atlas-motion-power]');
      if (motionPower) { const id = motionPower.dataset.atlasMotionPower; module.state.selected = id; set(module.state, `${id}.enabled`, !kit.get(module.state, `${id}.enabled`, false)); draw(module, article); return; }
      const selected = event.target.closest('[data-atlas-select]');
      if (selected) { module.state.selected = selected.dataset.atlasSelect; draw(module, article); }
    });
    grid.append(article);
    return article;
  }
  const panels = modules.map(mount);
  const scopes = ['all', 'scene', 'group', 'element', 'primitive', 'image', 'particle', 'decor', 'sample'];
  index.insertAdjacentHTML('beforeend', scopes.map(scope => `<button type="button" data-scope="${scope}" aria-pressed="${scope === 'all'}">${scope === 'all' ? '全部模块' : names[scope]}<span class="count">${scope === 'all' ? modules.length : modules.filter(module => module.scope === scope).length}</span></button>`).join(''));
  let selectedScope = 'all';
  const filter = () => {
    let shown = 0;
    for (let i = 0; i < panels.length; i++) {
      const module = modules[i], query = search.value.trim().toLowerCase();
      const labels = module.sections(module.state).flatMap(part => [part.title, ...part.rows.flatMap(line => line.fields.map(field => field.label))]);
      const visible = (selectedScope === 'all' || module.scope === selectedScope) && [module.name, ...labels].join(' ').toLowerCase().includes(query);
      panels[i].hidden = !visible; if (visible) shown++;
    }
    document.getElementById('empty').hidden = shown > 0;
  };
  index.addEventListener('click', event => {
    const button = event.target.closest('button[data-scope]'); if (!button) return;
    selectedScope = button.dataset.scope;
    index.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    filter();
  });
  search.addEventListener('input', filter);
})();
