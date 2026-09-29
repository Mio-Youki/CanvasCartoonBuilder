/* Declarative, validated base-object writes for the v4 composition Inspector. */
(function (global) {
  'use strict';

  const fields = Object.freeze({
    x: Object.freeze({ kind: 'number', default: 0, label: 'X' }),
    y: Object.freeze({ kind: 'number', default: 0, label: 'Y' }),
    w: Object.freeze({ kind: 'number', default: 1, min: 1, label: '宽' }),
    h: Object.freeze({ kind: 'number', default: 1, min: 1, label: '高' }),
    scaleX: Object.freeze({ kind: 'number', default: 1, label: '宽比例' }),
    scaleY: Object.freeze({ kind: 'number', default: 1, label: '高比例' }),
    rot: Object.freeze({ kind: 'number', default: 0, label: '旋转' }),
    blend: Object.freeze({ kind: 'text', default: 'normal', label: '叠加方式' }),
    alpha: Object.freeze({ kind: 'number', default: 1, min: 0, max: 1, label: '透明度' }),
    fill: Object.freeze({ kind: 'color', default: '#ffffff', label: '填色' }),
    fillAlpha: Object.freeze({ kind: 'number', default: 1, min: 0, max: 1, label: '填色透明度' }),
    stroke: Object.freeze({ kind: 'color', default: '#000000', label: '路径描线颜色' }),
    strokeAlpha: Object.freeze({ kind: 'number', default: 1, min: 0, max: 1, label: '路径描线透明度' }),
    strokeWidth: Object.freeze({ kind: 'number', default: 0, min: 0, label: '路径描线宽度' }),
    radius: Object.freeze({ kind: 'number', default: 0, min: 0, label: '圆角' }),
    text: Object.freeze({ kind: 'text', default: 'Text', label: '文字' }),
    fontSize: Object.freeze({ kind: 'number', default: 16, min: 1, label: '字号' }),
    fontId: Object.freeze({ kind: 'text', default: '', label: '字体连接' }),
    fontFamily: Object.freeze({ kind: 'text', default: 'sans-serif', label: '字体' }),
    letterSpacing: Object.freeze({ kind: 'number', default: 0, label: '字距' }),
    lineHeight: Object.freeze({ kind: 'number', default: 1.25, min: .5, max: 4, label: '行高' }),
  });
  function entity(scene, ownerId) {
    const found = (scene && scene.entities || []).find(item => item.id === ownerId);
    if (!found) throw new Error(`找不到对象「${ownerId || '(空)'}」`);
    return found;
  }
  function definition(key) {
    const result = fields[key];
    if (!result) throw new Error(`不允许直接写入对象字段「${key || '(空)'}」`);
    return result;
  }
  function normalize(key, value) {
    const spec = definition(key);
    if (spec.kind === 'color') {
      const text = String(value || '').trim();
      if (!/^#[0-9a-f]{3,8}$/i.test(text)) throw new Error(`字段「${spec.label}」需要 Hex 颜色`);
      return text;
    }
    if (spec.kind === 'text') return String(value == null ? '' : value);
    const number = +value;
    if (!Number.isFinite(number)) throw new Error(`字段「${spec.label}」需要数字`);
    return Math.max(spec.min == null ? -Infinity : spec.min, Math.min(spec.max == null ? Infinity : spec.max, number));
  }
  function value(entity, key) {
    const spec = definition(key), raw = entity && entity[key];
    return raw == null || raw === '' ? spec.default : raw;
  }
  function set(scene, options) {
    const target = entity(scene, options && options.ownerId), key = options && options.key;
    target[key] = normalize(key, options && options.value);
    return target[key];
  }
  function fieldsFor(target) {
    const base = target && target.type === 'group' ? ['x','y','scaleX','scaleY','rot','blend','alpha'] : ['x','y','w','h','scaleX','scaleY','rot','blend','alpha'];
    if (target && !['image','group','line','vector'].includes(target.type)) base.push('fill','fillAlpha');
    if (target && ['rect','ellipse','line','poly'].includes(target.type)) base.push('stroke','strokeAlpha','strokeWidth');
    if (target && target.type === 'rect') base.push('radius');
    if (target && target.type === 'text') base.push('text','fontSize','fontId','fontFamily','letterSpacing','lineHeight');
    return base;
  }
  global.EditorVNextEntityState = Object.freeze({ fields, fieldsFor, entity, value, set, normalize });
})(typeof window !== 'undefined' ? window : globalThis);
