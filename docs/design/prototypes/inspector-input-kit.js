/* One visual/interaction source for the input lab and Inspector atlas. */
(function (global) {
  'use strict';

  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const get = (state, path, fallback) => {
    let value = state;
    for (const key of String(path).split('.')) value = value && typeof value === 'object' ? value[key] : undefined;
    return value === undefined ? fallback : value;
  };
  const option = item => typeof item === 'string' ? { value: item, label: item } : item;
  const options = field => (field.options || []).map(option);
  const decimalPlaces = value => { const source = String(value ?? 1); return Math.min(6, (source.split('.')[1] || '').length); };
  function normalizeNumberValue(raw, field, fallback = 0) {
    let value = Number(raw);
    if (!Number.isFinite(value)) value = Number(fallback) || 0;
    if (field.min != null) value = Math.max(Number(field.min), value);
    if (field.max != null) value = Math.min(Number(field.max), value);
    const decimals = field.integer ? 0 : Math.max(0, Math.min(6, Number(field.decimals ?? Math.max(decimalPlaces(field.step), decimalPlaces(field.min), decimalPlaces(field.max))) || 0));
    value = Number(value.toFixed(decimals));
    if (field.min != null) value = Math.max(Number(field.min), value);
    if (field.max != null) value = Math.min(Number(field.max), value);
    return { value, display: field.displayDecimals != null ? value.toFixed(Math.max(0, Math.min(6, Number(field.displayDecimals) || 0))) : String(value) };
  }
  const number = (field, value, key = field.key) => `<input class="ik-number" type="number" data-ik-key="${escape(key)}" data-ik-last="${escape(value)}"${field.alphaScale || field.scale ? ` data-ik-scale="${field.alphaScale || field.scale}"` : ''}${field.integer ? ' data-ik-integer="true"' : ''}${field.decimals != null ? ` data-ik-decimals="${field.decimals}"` : ''}${field.displayDecimals != null ? ` data-ik-display-decimals="${field.displayDecimals}"` : ''} value="${escape(value)}" step="${field.step ?? 1}"${field.min != null ? ` min="${field.min}"` : ''}${field.max != null ? ` max="${field.max}"` : ''} aria-label="${escape(field.label)}">`;
  const numberBox = (field, value, key = field.key) => `<span class="ik-number-box${field.unit ? ' with-unit' : ''}"${field.unit ? ` style="--ik-digits:${Math.max(3, String(value ?? '').length)}"` : ''}>${number(field, value, key)}${field.unit ? `<span class="ik-unit" aria-hidden="true">${escape(field.unit)}</span>` : ''}</span>`;
  const select = (field, value, key = field.key) => `<span class="ik-select"><span class="ik-chevron" aria-hidden="true">&gt;</span><select data-ik-key="${escape(key)}" aria-label="${escape(field.label)}">${options(field).map(item => `<option value="${escape(item.value)}"${String(item.value) === String(value) ? ' selected' : ''}>${escape(item.label)}</option>`).join('')}</select></span>`;
  const color = (field, value, key = field.key) => {
    const hex = /^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : '#ffffff';
    const alphaKey = field.alphaKey;
    const alpha = alphaKey ? Math.round(Number(get(field.state, alphaKey, field.alphaDefault ?? 1)) * (field.alphaScale || 100)) : 100;
    return `<span class="ik-color"><span class="ik-checker" style="--ik-color:${escape(hex)};--ik-alpha:${alpha / 100}"><input type="color" data-ik-key="${escape(key)}" value="${escape(hex)}" aria-label="${escape(field.label)}"></span><input class="ik-hex" type="text" data-ik-hex="${escape(key)}" value="${escape(hex.toUpperCase())}" aria-label="${escape(field.label)}色号">${alphaKey ? numberBox({ ...field, label: `${field.label}透明度`, unit: '%', min: 0, max: 100, alphaScale: field.alphaScale || 100 }, alpha, alphaKey) : ''}</span>`;
  };

  function pattern(field, state) {
    const key = field.key;
    const data = get(state, key, field.default || {}) || {};
    const type = data.type || 'lines-horizontal';
    const base = sub => `${key}.${sub}`;
    const row = (label, markup, full = false) => `<div class="ik-field${full ? ' full' : ''}"><span class="ik-label">${escape(label)}</span>${markup}</div>`;
    const size = (label, sub, value, min = 0, max, step = 1) => row(label, numberBox({ label, min, max, step }, data[sub] ?? value, base(sub)));
    const pair = (label, a, b, valueA, valueB) => row(label, `<span class="ik-pair"><label>X${number({ label: `${label} X`, min: 0, max: 1, step: .01 }, data[a] ?? valueA, base(a))}</label><label>Y${number({ label: `${label} Y`, min: 0, max: 1, step: .01 }, data[b] ?? valueB, base(b))}</label><span class="ik-slot"></span></span>`);
    const choices = [
      { value: 'lines-horizontal', label: '单线' }, { value: 'grid', label: '网格' },
      { value: 'lines-layers', label: '叠线' }, { value: 'dots', label: '点阵' }, { value: 'noise', label: '屏幕噪点' }
    ];
    let details = '';
    if (type === 'noise') details = size('噪点强度', 'noiseDensity', .18, 0, 1, .01) + size('颗粒大小', 'noiseSize', 1, 1, 16) + size('随机种子', 'noiseSeed', 1, 0);
    else {
      details = size('格距', 'spacing', 4, 1, 256) + size('图样大小', 'size', 1, 1, 256) + size('整体旋转', 'angle', 0, -180, 180, 1) + pair('起始偏移', 'phaseX', 'phaseY', 0, 0);
      if (type === 'dots') {
        details += row('点形', select({ label: '点形', options: [
          { value: 'circle', label: '圆点' }, { value: 'triangle', label: '三角' }, { value: 'square', label: '矩形' },
          { value: 'pentagon', label: '五边形' }, { value: 'hexagon', label: '六边形' }
        ] }, data.shape || 'circle', base('shape')));
        details += row('排列', select({ label: '排列', options: [{ value: 'regular', label: '整齐' }, { value: 'stagger', label: '错列' }] }, data.layout || 'regular', base('layout')));
        if (data.layout === 'stagger') details += size('错列偏移', 'rowPhase', .5, 0, 1, .01);
      }
      if (type === 'lines-layers') for (const index of [2, 3]) details += size(`线 ${index} 角度`, `layer${index}Angle`, index === 2 ? 90 : 135, -180, 180) + size(`线 ${index} 线宽`, `layer${index}Width`, 1, 1, 256) + size(`线 ${index} 格距`, `layer${index}Spacing`, 4, 1, 256);
    }
    const previewStyle = type === 'noise'
      ? `radial-gradient(circle,var(--ik-pattern-color) 22%,transparent 28%) 0 0 / 7px 7px`
      : type === 'dots' ? `radial-gradient(circle,var(--ik-pattern-color) 35%,transparent 41%) 0 0 / 12px 12px`
      : `repeating-linear-gradient(0deg,transparent 0 8px,var(--ik-pattern-color) 8px 9px)`;
    return `<div class="ik-pattern"><div class="ik-pattern-preview" style="--ik-pattern-color:${escape(data.color || '#e3ad4e')};background-image:${escape(previewStyle)};opacity:${Math.max(0,Math.min(1,Number(data.opacity ?? 1)))}"></div>${row('图样类型', select({ label: '图样类型', options: choices }, type, base('type')))}${row('颜色', color({ label: '颜色', state, alphaKey: base('opacity'), alphaDefault: data.opacity ?? 1 }, data.color || '#e3ad4e', base('color')))}<div class="ik-pattern-details">${details}</div></div>`;
  }

  function renderField(field, state) {
    field = { ...field, state };
    const value = get(state, field.key, field.default);
    let body = '';
    switch (field.type) {
      case 'number': body = numberBox(field, field.scale ? Math.round(Number(value) * field.scale) : value); break;
      case 'range':
      case 'range-continuous': {
        const min = field.min ?? 0, max = field.max ?? 100;
        const shown = field.scale ? Math.round(Number(value) * field.scale) : Number(value);
        const fill = max > min ? Math.max(0, Math.min(100, (shown - min) / (max - min) * 100)) : 0;
        const track = field.type === 'range-continuous'
          ? `<span class="ik-linear-track" style="--ik-position:${fill}%"><span class="ik-linear-rail"></span><span class="ik-linear-cursor"></span><input type="range" data-ik-key="${escape(field.key)}"${field.scale ? ` data-ik-scale="${field.scale}"` : ''} min="${min}" max="${max}" step="${field.step ?? 1}" value="${escape(shown)}" aria-label="${escape(field.label)}"></span>`
          : `<span class="ik-meter"><span class="ik-meter-fill" style="width:${fill}%"></span><span class="ik-meter-cursor" style="left:${fill}%"></span><input type="range" data-ik-key="${escape(field.key)}"${field.scale ? ` data-ik-scale="${field.scale}"` : ''} min="${min}" max="${max}" step="${field.step ?? 1}" value="${escape(shown)}" aria-label="${escape(field.label)}"></span>`;
        body = `<span class="ik-range"><span class="ik-range-controls"><span class="ik-range-main"><span class="ik-range-ends"><span>${min}</span><span>${max}</span></span>${track}</span>${numberBox(field, shown)}</span></span>`;
        break;
      }
      case 'pair': {
        const parts = field.parts || ['X', 'Y'], values = Array.isArray(value) ? value : [0, 0];
        body = `<span class="ik-pair" data-ik-pair="${escape(field.key)}"><label>${escape(parts[0])}${number({ ...field, label: `${field.label} ${parts[0]}` }, values[0], `${field.key}.0`)}</label><label>${escape(parts[1])}${number({ ...field, label: `${field.label} ${parts[1]}` }, values[1], `${field.key}.1`)}</label>${field.lock ? '<button class="ik-lock" type="button" aria-pressed="false" aria-label="锁定比例"><svg viewBox="0 0 12 22" aria-hidden="true"><path d="M5 1.5c-1.4 0-2 1-2 2.3v3.4C3 8 3.6 9 5 9s2-1 2-2.3V3.8c0-1.3-.6-2.3-2-2.3ZM7 13c-1.4 0-2 1-2 2.3v3.4C5 20 5.6 21 7 21s2-1 2-2.3v-3.4C9 14 8.4 13 7 13Z"/><path class="ik-link-join" d="M6 7v8"/></svg></button>' : '<span class="ik-slot"></span>'}</span>`;
        break;
      }
      case 'angle': {
        body = `<span class="ik-angle"><span class="ik-dial-ring"><button class="ik-dial" type="button" data-ik-dial="${escape(field.key)}" style="--ik-angle:${Number(value) || 0}deg" aria-label="${escape(field.label)}方向盘">${Array.from({ length: 8 }, (_, index) => `<i style="--tick:${index * 45}deg"></i>`).join('')}</button></span>${numberBox({ ...field, step: field.step ?? 1, unit: '°' }, value)}</span>`;
        break;
      }
      case 'select': body = select(field, value); break;
      case 'choice': body = `<span class="ik-choice">${options(field).map(item => `<button type="button" data-ik-choice="${escape(field.key)}" data-value="${escape(item.value)}" aria-pressed="${String(item.value) === String(value)}">${escape(item.label)}</button>`).join('')}</span>`; break;
      case 'toggle': body = `<span class="ik-toggle"><button type="button" role="switch" data-ik-toggle="${escape(field.key)}" data-ik-progressive="${!!field.progressive}" aria-checked="${!!value}" aria-label="${escape(field.label)}"><i></i></button><strong>${escape(field.label)}</strong></span>`; break;
      case 'disclosure': body = `<button class="ik-disclosure" type="button" data-ik-disclosure="${escape(field.key)}" aria-expanded="${!!value}">${escape(field.action || '参数')} <span aria-hidden="true">${value ? '⌄' : '›'}</span></button>`; break;
      case 'color': body = color(field, value); break;
      case 'reference': {
        const items = options(field).length ? options(field) : [{ value, label: value }];
        const current = items.find(item => String(item.value) === String(value)) || items[0];
        body = `<span class="ik-reference"><button class="ik-reference-trigger" type="button" data-ik-reference="${escape(field.key)}" aria-expanded="false"><i class="ik-reference-icon ${escape(current.kind || '')}" aria-hidden="true"></i><span>${escape(current.label)}</span><b aria-hidden="true">⌄</b></button><span class="ik-reference-menu" hidden>${items.map(item => `<button type="button" data-ik-reference-option="${escape(field.key)}" data-value="${escape(item.value)}"><i class="ik-reference-icon ${escape(item.kind || '')}" aria-hidden="true"></i><span>${escape(item.label)}</span></button>`).join('')}</span></span>`;
        break;
      }
      case 'text': body = `<textarea class="ik-text" data-ik-key="${escape(field.key)}" aria-label="${escape(field.label)}">${escape(value)}</textarea>`; break;
      case 'spatial': body = `<span class="ik-spatial"><button type="button" data-ik-action="${escape(field.key)}">${escape(field.action || '设置中心')}</button><button type="button" data-ik-reset="${escape(field.key)}" aria-label="还原为中心">⌖</button></span>`; break;
      case 'pattern': body = pattern(field, state); break;
      default: body = escape(value);
    }
    const full = ['text', 'pattern'].includes(field.type);
    const rowLabel = field.type === 'toggle' ? field.rowLabel || '状态' : field.label;
    return `<div class="ik-field${full ? ' full' : ''}" data-ik-field="${escape(field.key)}" data-input-type="${escape(field.type)}"><span class="ik-label">${escape(rowLabel)}</span>${body}</div>`;
  }

  function bind(root, onChange = () => {}) {
    const emit = (key, value, structural = false) => onChange(key, value, structural);
    const updateUnitBox = input => input?.closest('.ik-number-box.with-unit')?.style.setProperty('--ik-digits', String(Math.max(3, input.value.length)));
    const updateRangeVisual = input => {
      const range = input?.closest('.ik-range'), slider = range?.querySelector('input[type=range]');
      if (!slider) return;
      const min = Number(slider.min), max = Number(slider.max);
      const percent = max > min ? Math.max(0, Math.min(100, (Number(slider.value) - min) / (max - min) * 100)) : 0;
      const fill = range.querySelector('.ik-meter-fill'), cursor = range.querySelector('.ik-meter-cursor'), linear = range.querySelector('.ik-linear-track');
      if (fill) fill.style.width = `${percent}%`;
      if (cursor) cursor.style.left = `${percent}%`;
      if (linear) linear.style.setProperty('--ik-position', `${percent}%`);
    };
    const commitNumber = input => {
      if (!input) return;
      if (input.value === '') input.value = input.dataset.ikLast || '0';
      const normalized = normalizeNumberValue(input.value, {
        min: input.min === '' ? undefined : input.min,
        max: input.max === '' ? undefined : input.max,
        step: input.step,
        integer: input.dataset.ikInteger === 'true',
        decimals: input.dataset.ikDecimals,
        displayDecimals: input.dataset.ikDisplayDecimals
      }, input.dataset.ikLast);
      input.value = normalized.display;
      input.dataset.ikLast = normalized.display;
      updateUnitBox(input);
      const range = input.closest('.ik-range'), slider = range?.querySelector('input[type=range]');
      if (slider) { slider.value = String(normalized.value); updateRangeVisual(slider); }
      if (input.closest('.ik-color')) input.closest('.ik-color').querySelector('.ik-checker')?.style.setProperty('--ik-alpha', String(normalized.value / 100));
      const patternPreview = input.closest('.ik-pattern')?.querySelector('.ik-pattern-preview');
      if (patternPreview && input.closest('.ik-color')) patternPreview.style.opacity = String(normalized.value / 100);
      emit(input.dataset.ikKey, normalized.value / Number(input.dataset.ikScale || 1));
      syncPair(input);
    };
    const syncPair = input => {
      const pair = input.closest('.ik-pair'), lock = pair?.querySelector('.ik-lock');
      if (!lock || lock.getAttribute('aria-pressed') !== 'true') return;
      const values = [...pair.querySelectorAll('.ik-number')], index = values.indexOf(input);
      if (index < 0 || values.length !== 2) return;
      const ratio = Number(pair.dataset.ikRatio) || 1;
      const other = values[1 - index], next = index === 0 ? Number(input.value) / ratio : Number(input.value) * ratio;
      other.value = String(Math.round(next * 1000) / 1000);
      emit(other.dataset.ikKey, Number(other.value));
    };
    root.addEventListener('input', event => {
      const target = event.target;
      if (target.matches('input[type=range][data-ik-key]')) {
        const paired = target.closest('.ik-range')?.querySelector('input[type=number]');
        if (paired) { paired.value = target.value; paired.dataset.ikLast = target.value; }
        updateUnitBox(paired);
        updateRangeVisual(target);
        emit(target.dataset.ikKey, Number(target.value) / Number(target.dataset.ikScale || 1));
      } else if (target.matches('input[type=number][data-ik-key]')) {
        if (target.value === '') return;
        const paired = target.closest('.ik-range')?.querySelector('input[type=range]');
        if (paired) paired.value = target.value;
        updateUnitBox(target);
        updateRangeVisual(target);
        if (target.closest('.ik-color')) {
          target.closest('.ik-color').querySelector('.ik-checker')?.style.setProperty('--ik-alpha', String(Number(target.value) / 100));
          const preview = target.closest('.ik-pattern')?.querySelector('.ik-pattern-preview');
          if (preview) preview.style.opacity = String(Number(target.value) / 100);
        }
        emit(target.dataset.ikKey, Number(target.value) / Number(target.dataset.ikScale || 1));
        syncPair(target);
      } else if (target.matches('input[type=color][data-ik-key]')) {
        const checker = target.closest('.ik-checker');
        if (checker) checker.style.setProperty('--ik-color', target.value);
        target.closest('.ik-pattern')?.querySelector('.ik-pattern-preview')?.style.setProperty('--ik-pattern-color', target.value);
        const hex = target.closest('.ik-color')?.querySelector('.ik-hex');
        if (hex) hex.value = target.value.toUpperCase();
        emit(target.dataset.ikKey, target.value);
      } else if (target.matches('textarea[data-ik-key]')) emit(target.dataset.ikKey, target.value);
    });
    root.addEventListener('change', event => {
      const target = event.target;
      if (target.matches('select[data-ik-key]')) emit(target.dataset.ikKey, target.value, true);
      if (target.matches('.ik-hex')) {
        const value = /^#[0-9a-f]{6}$/i.test(target.value) ? target.value.toUpperCase() : target.closest('.ik-color')?.querySelector('input[type=color]')?.value;
        target.value = value;
        const colorInput = target.closest('.ik-color')?.querySelector('input[type=color]');
        if (colorInput) colorInput.value = value;
        target.closest('.ik-color')?.querySelector('.ik-checker')?.style.setProperty('--ik-color', value);
        emit(target.dataset.ikHex, value);
      }
      if (target.matches('input[type=number][data-ik-key]')) commitNumber(target);
    });
    root.addEventListener('focusout', event => { if (event.target.matches('input[type=number][data-ik-key]')) commitNumber(event.target); });
    root.addEventListener('click', event => {
      const toggle = event.target.closest('[data-ik-toggle]');
      if (toggle) { const next = toggle.getAttribute('aria-checked') !== 'true'; toggle.setAttribute('aria-checked', String(next)); emit(toggle.dataset.ikToggle, next, true); return; }
      const disclosure = event.target.closest('[data-ik-disclosure]');
      if (disclosure) { const next = disclosure.getAttribute('aria-expanded') !== 'true'; disclosure.setAttribute('aria-expanded', String(next)); disclosure.querySelector('span').textContent = next ? '⌄' : '›'; emit(disclosure.dataset.ikDisclosure, next, true); return; }
      const choice = event.target.closest('[data-ik-choice]');
      if (choice) { choice.parentElement.querySelectorAll('[data-ik-choice]').forEach(button => button.setAttribute('aria-pressed', String(button === choice))); emit(choice.dataset.ikChoice, choice.dataset.value, true); return; }
      const referenceTrigger = event.target.closest('[data-ik-reference]');
      if (referenceTrigger) {
        const menu = referenceTrigger.parentElement.querySelector('.ik-reference-menu'), open = referenceTrigger.getAttribute('aria-expanded') !== 'true';
        referenceTrigger.setAttribute('aria-expanded', String(open)); menu.hidden = !open; return;
      }
      const referenceOption = event.target.closest('[data-ik-reference-option]');
      if (referenceOption) {
        const holder = referenceOption.closest('.ik-reference'), trigger = holder.querySelector('[data-ik-reference]'), item = options({ options: [...holder.querySelectorAll('[data-ik-reference-option]')].map(button => ({ value: button.dataset.value, label: button.querySelector('span').textContent, kind: button.querySelector('i').className.replace('ik-reference-icon', '').trim() })) }).find(entry => String(entry.value) === referenceOption.dataset.value);
        const icon = trigger.querySelector('.ik-reference-icon'); icon.className = `ik-reference-icon ${item?.kind || ''}`;
        trigger.querySelector('span').textContent = item?.label || referenceOption.textContent.trim();
        trigger.setAttribute('aria-expanded', 'false'); holder.querySelector('.ik-reference-menu').hidden = true;
        emit(referenceOption.dataset.ikReferenceOption, referenceOption.dataset.value, true); return;
      }
      const lock = event.target.closest('.ik-lock');
      if (lock) { const on = lock.getAttribute('aria-pressed') !== 'true'; lock.setAttribute('aria-pressed', String(on)); if (on) { const values = lock.closest('.ik-pair').querySelectorAll('.ik-number'); lock.closest('.ik-pair').dataset.ikRatio = String((Number(values[0].value) || 1) / (Number(values[1].value) || 1)); } return; }
      const action = event.target.closest('[data-ik-action]');
      if (action) { const done = action.textContent.trim() === '完成'; action.textContent = done ? '编辑' : '点击画布取点…'; emit(action.dataset.ikAction, done ? 'done' : 'editing', true); return; }
      const reset = event.target.closest('[data-ik-reset]');
      if (reset) { reset.previousElementSibling.textContent = '设置中心'; emit(reset.dataset.ikReset, 'center', true); }
    });
    root.addEventListener('pointerdown', event => {
      if (event.target.closest('.ik-reference')) return;
      root.querySelectorAll('.ik-reference-trigger[aria-expanded=true]').forEach(trigger => { trigger.setAttribute('aria-expanded', 'false'); trigger.parentElement.querySelector('.ik-reference-menu').hidden = true; });
    });
    root.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      const trigger = event.target.closest('.ik-reference')?.querySelector('.ik-reference-trigger[aria-expanded=true]');
      if (trigger) { trigger.setAttribute('aria-expanded', 'false'); trigger.parentElement.querySelector('.ik-reference-menu').hidden = true; trigger.focus(); }
    });
    root.addEventListener('pointerdown', event => {
      const selectNode = event.target.closest('.ik-select select');
      if (selectNode) selectNode.parentElement.classList.add('open');
      const dial = event.target.closest('[data-ik-dial]');
      if (dial) {
        const update = pointer => {
          const box = dial.getBoundingClientRect();
          const angle = Math.round(Math.atan2(pointer.clientX - box.left - box.width / 2, box.top + box.height / 2 - pointer.clientY) * 180 / Math.PI);
          dial.style.setProperty('--ik-angle', `${angle}deg`);
          const value = dial.closest('.ik-angle').querySelector('input[type=number]');
          value.value = angle;
          updateUnitBox(value);
          emit(dial.dataset.ikDial, angle);
        };
        dial.setPointerCapture(event.pointerId); update(event);
        dial.onpointermove = pointer => { if (dial.hasPointerCapture(pointer.pointerId)) update(pointer); };
        dial.onpointerup = () => { dial.onpointermove = null; dial.onpointerup = null; };
      }
      const input = event.target.closest('.ik-number');
      if (!input || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey) return;
      const startY = event.clientY, startValue = Number(input.value) || 0, step = Number(input.step) > 0 ? Number(input.step) : 1;
      let dragging = false;
      const move = pointer => {
        const delta = startY - pointer.clientY;
        if (!dragging && Math.abs(delta) < 4) return;
        dragging = true;
        const min = input.min === '' ? -Infinity : Number(input.min), max = input.max === '' ? Infinity : Number(input.max);
        input.value = String(Math.min(max, Math.max(min, startValue + Math.trunc(delta / 5) * step)));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        pointer.preventDefault();
      };
      const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', stop, { once: true });
      window.addEventListener('pointercancel', stop, { once: true });
    });
    root.addEventListener('change', event => { if (event.target.matches('.ik-select select')) event.target.parentElement.classList.remove('open'); });
    root.addEventListener('focusout', event => { if (event.target.matches('.ik-select select')) event.target.parentElement.classList.remove('open'); });
  }

  global.InspectorInputKit = Object.freeze({ renderField, bind, get, escape });
})(typeof window !== 'undefined' ? window : globalThis);
