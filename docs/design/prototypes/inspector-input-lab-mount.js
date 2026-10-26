/* The lab mounts the exact same controls and events used by the atlas. */
(() => {
  'use strict';
  const kit = window.InspectorInputKit;
  const specs = [
    { id: 'scalar', stage: 'compose', state: { width: 1920 }, fields: [{ key: 'width', label: '宽度', type: 'number', min: 1 }], output: s => `${s.width}` },
    { id: 'range', stage: 'sample', state: { amount: 38 }, fields: [{ key: 'amount', label: '粗细幅度', type: 'range', min: 0, max: 100, unit: '%' }], output: s => `${s.amount}%` },
    { id: 'range-continuous', stage: 'decor', state: { distance: 32 }, fields: [{ key: 'distance', label: '投影距离', type: 'range-continuous', min: 0, max: 80, step: .5 }], output: s => `${s.distance} · 步长 0.5` },
    { id: 'pair', stage: 'compose', state: { position: [273, 181], size: [640, 360] }, fields: [{ key: 'position', label: '坐标', type: 'pair', parts: ['X', 'Y'] }, { key: 'size', label: '宽 / 高', type: 'pair', parts: ['W', 'H'], lock: true, min: 1 }], output: s => `${s.position.join(', ')} · ${s.size.join('×')}` },
    { id: 'angle', stage: 'sample', state: { angle: 24 }, fields: [{ key: 'angle', label: '方向', type: 'angle', min: -180, max: 180 }], output: s => `${s.angle}°` },
    { id: 'choice', stage: 'sample', state: { transition: 'wipe', blend: 'normal' }, fields: [{ key: 'transition', label: '方式', type: 'choice', options: [{ value: 'wipe', label: '扫描擦除' }, { value: 'dissolve', label: '溶解' }, { value: 'fade', label: '淡入淡出' }] }, { key: 'blend', label: '叠加方式', type: 'select', options: [{ value: 'normal', label: '正常' }, { value: 'screen', label: '滤色' }, { value: 'multiply', label: '正片叠底' }] }], output: s => `${s.transition} · ${s.blend}` },
    { id: 'toggle', stage: 'sample', state: { duotone: false, dark: '#1b2e3a', light: '#ead6a8' }, fields: [{ key: 'duotone', label: '双色', rowLabel: '色彩', type: 'toggle', progressive: true }, { key: 'dark', label: '暗色', type: 'color', when: s => s.duotone }, { key: 'light', label: '亮色', type: 'color', when: s => s.duotone }], output: s => s.duotone ? 'ON' : 'OFF' },
    { id: 'color', stage: 'decor', state: { color: '#c95a54', alpha: .64 }, fields: [{ key: 'color', label: '颜色', type: 'color', alphaKey: 'alpha' }], output: s => `${s.color.toUpperCase()} / ${Math.round(s.alpha * 100)}%` },
    { id: 'reference', stage: 'compose', state: { target: 'house' }, fields: [{ key: 'target', label: '引用对象', type: 'reference', options: [{ value: 'house', label: '冬季 · 木屋', kind: 'element' }, { value: 'trees', label: '前景松林', kind: 'element' }, { value: 'dome', label: '玻璃罩组', kind: 'group' }] }], output: s => s.target },
    { id: 'text', stage: 'compose', state: { content: '下一站，秋天。' }, fields: [{ key: 'content', label: '内容', type: 'text' }], output: s => `${Array.from(s.content).length}` },
    { id: 'spatial', stage: 'compose', state: { pivot: 'center' }, fields: [{ key: 'pivot', label: '中心', type: 'spatial' }], output: s => s.pivot === 'center' ? '默认中心' : '等待画布取点' },
    { id: 'pattern', stage: 'decor', state: { pattern: { type: 'lines-horizontal', color: '#e5b85b', opacity: .68, spacing: 10, phaseX: .25, phaseY: .5 } }, fields: [{ key: 'pattern', label: '图样设置', type: 'pattern' }], output: s => `${s.pattern.type} · ${s.pattern.spacing}` }
  ];
  const set = (state, key, value) => {
    const parts = key.split('.'); let node = state;
    while (parts.length > 1) { const part = parts.shift(); node = node[part] ?? (node[part] = {}); }
    node[parts[0]] = value;
  };
  for (const spec of specs) {
    const article = document.getElementById(spec.id);
    const head = article.querySelector('.group-head');
    const foot = article.querySelector('.data-line');
    for (let node = head.nextSibling; node && node !== foot;) { const next = node.nextSibling; node.remove(); node = next; }
    const host = document.createElement('div');
    host.className = 'ik-host'; host.dataset.stage = spec.stage;
    article.insertBefore(host, foot);
    const draw = () => {
      const active = spec.fields.filter(field => !field.when || field.when(spec.state));
      const main = active.filter(field => !field.when).map(field => kit.renderField(field, spec.state)).join('');
      const dependent = active.filter(field => field.when).map(field => kit.renderField(field, spec.state)).join('');
      host.innerHTML = `${main}${dependent ? `<div class="ik-dependent">${dependent}</div>` : ''}`;
      foot.querySelector('strong').textContent = spec.output(spec.state);
    };
    kit.bind(host, (key, value, structural) => { set(spec.state, key, value); if (structural) draw(); else foot.querySelector('strong').textContent = spec.output(spec.state); });
    draw();
  }
})();
