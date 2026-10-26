/* Declarative v4 effect mutations. UI owns events; this module owns paths. */
(function (global) {
  'use strict';

  function registry() {
    if (!global.EditorEffectRegistryVNext || !global.EditorVNextInspectorModel) throw new Error('vNext 效果状态需要 Registry 与 Inspector Model');
    return global.EditorEffectRegistryVNext;
  }
  function setPath(target, key, value) {
    const parts = String(key).split('.'); let cursor = target;
    for (let index = 0; index < parts.length - 1; index++) cursor = cursor[parts[index]] = Object.assign({}, cursor[parts[index]] || {});
    cursor[parts[parts.length - 1]] = value;
  }
  function effect(scope, id) {
    const item = registry().effectById[id];
    if (!item || !item.scopes.includes(scope)) throw new Error(`效果「${id}」不适用于${scope === 'scene' ? '场景' : '对象'}`);
    if (registry().runtimeSupport[id][scope] !== 'ready') throw new Error(`效果「${id}」尚未可运行，不能写入 Scene`);
    return item;
  }
  function entity(scene, id) {
    const found = (scene.entities || []).find(item => item.id === id);
    if (!found) throw new Error(`找不到对象「${id || '(空)'}」`);
    return found;
  }
  function owner(scene, scope, ownerId) { return scope === 'scene' ? scene : entity(scene, ownerId); }
  function defaults(item) {
    const result = { enabled: true };
    for (const param of item.params || []) setPath(result, param.key, param.default&&typeof param.default==='object'?JSON.parse(JSON.stringify(param.default)):param.default);
    return result;
  }
  function parameter(definition, key) {
    const result = (definition.params || []).find(candidate => candidate.key === key);
    if (!result) throw new Error(`项目「${definition.name}」没有参数「${key || '(空)'}」`);
    return result;
  }
  function normalizeParam(definition, key, value) {
    const param = parameter(definition, key);
    if(param.type==='extracted-palette'){
      if(value==null)return null;
      if(![2,4,8,16,32,64].includes(value.colors)||!Array.isArray(value.entries)||!value.entries.length||value.entries.length>value.colors||value.entries.some(p=>!Array.isArray(p)||p.length!==3||p.some(v=>!Number.isInteger(v)||v<0||v>255)))throw new Error('提取色板需要2～64色上限和有效RGB颜色');
      return {colors:value.colors,entries:value.entries.map(p=>p.slice())};
    }
    if (param.type === 'tile-pixels') {
      if (!Array.isArray(value) || value.length > 4096 || value.some(pixel => !/^#[0-9a-f]{8}$/i.test(pixel))) throw new Error(`参数「${param.label}」需要有效的 RGBA 格子数组`);
      return value.map(pixel => pixel.toLowerCase());
    }
    if (param.type === 'number') {
      const number = +value;
      if (!Number.isFinite(number)) throw new Error(`参数「${param.label}」需要数字`);
      const limited = Math.max(param.min == null ? -Infinity : param.min, Math.min(param.max == null ? Infinity : param.max, number));
      if(Array.isArray(param.options))return param.options.reduce((best,next)=>Math.abs(Math.log2(next/limited))<=Math.abs(Math.log2(best/limited))?next:best,param.options[0]);
      return param.integer ? Math.round(limited) : limited;
    }
    if(param.type==='gradient'){
      const paint=global.ToSampoolRuntimeVNext?.modules.paint.normalize(value);
      if(!paint)throw new Error(`参数「${param.label}」需要至少两个有效色标`);
      return {type:'linear',stops:paint.stops};
    }
    if (param.type === 'color') {
      const color = String(value || '').trim();
      if (!/^#[0-9a-f]{3,8}$/i.test(color)) throw new Error(`参数「${param.label}」需要 Hex 颜色`);
      return color;
    }
    if (param.type === 'boolean') return value === true || value === 'true' || value === 1 || value === '1';
    if (param.type === 'text') {
      const text=String(value == null ? '' : value);
      const graphemes=typeof Intl!=='undefined'&&Intl.Segmenter?Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text),item=>item.segment):Array.from(text);
      if (!text.length || /[\r\n\t]/.test(text) || new Set(graphemes).size > 128 || text.length>8192) throw new Error(`参数「${param.label}」需要一行有效字符（最多128个字形）`);
      if(definition.id==='ascii-mapping'&&key==='edgeCharacters'&&graphemes.length!==4)throw new Error('方向字符需要四个字形：横、竖、右上斜、右下斜');
      return text;
    }
    if (param.type === 'font') return String(value || 'builtin');
    if (param.type === 'select' && (!Array.isArray(param.options) || !param.options.includes(value))) throw new Error(`参数「${param.label}」不接受该选项`);
    if (param.type === 'texture' || param.type === 'palette' || param.type === 'select') {
      const text = String(value || '').trim();
      if (!text) throw new Error(`参数「${param.label}」不能为空`);
      return text;
    }
    throw new Error(`参数「${param.label}」类型尚未支持`);
  }
  function bucket(scene, scope, ownerId, item) {
    const target = owner(scene, scope, ownerId), path = global.EditorVNextInspectorModel.path(scope, item);
    let cursor = target;
    for (let index = 0; index < path.length - 1; index++) cursor = cursor[path[index]] = Object.assign({}, cursor[path[index]] || {});
    return { target, values: cursor, key: path[path.length - 1] };
  }
  function controller(scope, id) {
    const item = registry().controllerById && registry().controllerById[id];
    if (!item || !item.scopes.includes(scope)) throw new Error(`共享控制器「${id || '(空)'}」不适用于${scope === 'scene' ? '场景' : '对象'}`);
    return item;
  }
  function controllerBucket(scene, scope, ownerId) {
    const target = owner(scene, scope, ownerId), sample = scope === 'scene' ? target.sceneEffects = Object.assign({}, target.sceneEffects || {}) : target.effects = Object.assign({}, target.effects || {});
    const group = scope === 'scene' ? sample.sample = Object.assign({}, sample.sample || {}) : sample.sample = Object.assign({}, sample.sample || {});
    group.controllers = Object.assign({}, group.controllers || {});
    return group.controllers;
  }
  function controllerDefaults(item) {
    const result = {};
    for (const param of item.params || []) setPath(result, param.key, param.default);
    return result;
  }
  function controllerValues(scene, options) {
    const scope = options && options.scope === 'scene' ? 'scene' : 'object', item = controller(scope, options && options.controllerId), target = owner(scene, scope, options && options.ownerId), group = scope === 'scene' ? target.sceneEffects && target.sceneEffects.sample : target.effects && target.effects.sample;
    return Object.assign(controllerDefaults(item), group && group.controllers && group.controllers[item.id] || {});
  }
  function enable(scene, options) {
    const scope = options && options.scope === 'scene' ? 'scene' : 'object', item = effect(scope, options && options.effectId), slot = bucket(scene, scope, options && options.ownerId, item);
    slot.values[slot.key] = Object.assign(defaults(item), slot.values[slot.key] || {}, { enabled: true });
    return slot.values[slot.key];
  }
  function setEnabled(scene, options, enabled) {
    const scope=options&&options.scope==='scene'?'scene':'object',item=effect(scope,options&&options.effectId),slot=bucket(scene,scope,options&&options.ownerId,item);
    slot.values[slot.key]=Object.assign(defaults(item),slot.values[slot.key]||{},{enabled:enabled!==false});
    return slot.values[slot.key];
  }
  function disable(scene, options) {
    const scope = options && options.scope === 'scene' ? 'scene' : 'object', item = effect(scope, options && options.effectId), slot = bucket(scene, scope, options && options.ownerId, item);
    delete slot.values[slot.key];
    const tracks = scene.timeline && scene.timeline.tracks;
    if (tracks) delete tracks[global.EditorVNextInspectorModel.trackKey(scope, scope === 'scene' ? global.EditorVNextInspectorModel.storageFor(item, scope) : options.ownerId, item)];
    return true;
  }
  function setParam(scene, options) {
    const scope = options && options.scope === 'scene' ? 'scene' : 'object', item = effect(scope, options && options.effectId), param = parameter(item, options && options.key);
    const slot=bucket(scene,scope,options&&options.ownerId,item),current=slot.values[slot.key],config=current?setEnabled(scene,options,current.enabled):enable(scene,options);
    setPath(config, param.key, normalizeParam(item, param.key, options.value)); return config;
  }
  function reorderObjectStages(scene, ownerId, next) {
    const valid = ['mask', 'decorate', 'sample'];
    if (!Array.isArray(next) || next.length !== valid.length || next.some(stage => !valid.includes(stage)) || new Set(next).size !== valid.length) throw new Error('对象效果阶段必须是 mask / decorate / sample 的完整排列');
    const target = entity(scene, ownerId); target.effects = Object.assign({ mask: null, decorate: {}, sample: {} }, target.effects || {}); target.effects.pipeline = next.slice(); return target.effects.pipeline;
  }
  /* “成样” is the fixed source stage.  The only user-selectable placement is
     where the one mask stage lands around decorate/sample.  Keeping this as a
     three-value intent avoids exposing arbitrary pipeline permutations. */
  function maskPosition(scene, ownerId) {
    const target = entity(scene, ownerId), pipeline = target.effects && target.effects.pipeline || ['mask','decorate','sample'], mask = pipeline.indexOf('mask'), decorate = pipeline.indexOf('decorate'), sample = pipeline.indexOf('sample');
    if (mask < decorate && mask < sample) return 'after-source';
    if (decorate < mask && mask < sample) return 'after-decorate';
    if (decorate < mask && sample < mask) return 'after-sample';
    // Old arbitrary drag order cannot always be described by the new three
    // positions.  Read it safely, then let the next user choice canonicalize.
    return 'after-source';
  }
  function setMaskPosition(scene, ownerId, position) {
    const next = ({ 'after-source':['mask','decorate','sample'], 'after-decorate':['decorate','mask','sample'], 'after-sample':['decorate','sample','mask'] })[position];
    if (!next) throw new Error('蒙版位置必须是成样后、加样后或采样后');
    reorderObjectStages(scene, ownerId, next);
    return position;
  }
  function setController(scene, options) {
    const scope = options && options.scope === 'scene' ? 'scene' : 'object', item = controller(scope, options && options.controllerId), param = parameter(item, options && options.key), slot = controllerBucket(scene, scope, options && options.ownerId);
    slot[item.id] = Object.assign(controllerDefaults(item), slot[item.id] || {}); setPath(slot[item.id], param.key, normalizeParam(item, param.key, options.value)); return slot[item.id];
  }
  function enableController(scene, options) {
    const scope = options && options.scope === 'scene' ? 'scene' : 'object', item = controller(scope, options && options.controllerId), slot = controllerBucket(scene, scope, options && options.ownerId);
    slot[item.id] = Object.assign(controllerDefaults(item), slot[item.id] || {}); return slot[item.id];
  }
  function clearController(scene, options) {
    const scope = options && options.scope === 'scene' ? 'scene' : 'object', item = controller(scope, options && options.controllerId), target = owner(scene, scope, options && options.ownerId), group = scope === 'scene' ? target.sceneEffects && target.sceneEffects.sample : target.effects && target.effects.sample;
    if (group && group.controllers) {
      delete group.controllers[item.id];
      if (!Object.keys(group.controllers).length) delete group.controllers;
    }
    const ownerId = scope === 'scene' ? 'sample' : options && options.ownerId, tracks = scene.timeline && scene.timeline.tracks;
    if (tracks) delete tracks[global.EditorVNextInspectorModel.controllerTrackKey(scope, ownerId, item)];
    return true;
  }
  global.EditorVNextEffectState = Object.freeze({ defaults, enable, setEnabled, disable, setParam, reorderObjectStages, maskPosition, setMaskPosition, normalizeParam, controllerDefaults, controllerValues, setController, enableController, clearController });
})(typeof window !== 'undefined' ? window : globalThis);
