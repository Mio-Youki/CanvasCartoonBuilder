/* ToSampool Runtime vNext source module: isolated v4 scene contract. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const FORMAT = 'tosampool-scene/v4';
  const OBJECT_PIPELINE = Object.freeze(['mask', 'decorate', 'sample']);
  const SCENE_PIPELINE = Object.freeze(['overlay', 'sample']);
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const sameStages = (candidate, stages) => Array.isArray(candidate) && candidate.length === stages.length && candidate.every(stage => stages.includes(stage)) && new Set(candidate).size === stages.length;
  const PART_TYPES = new Set(['rect', 'ellipse', 'line', 'poly']);

  // Field distribution and Alpha edge protection became children of uneven
  // sampling in v4.1.  Keep this boundary migration in Runtime too: exported
  // v4.0 JSON remains readable, while no render path treats them as global
  // sampling controllers any longer.
  function normalizeSample(sample) {
    if (!sample || typeof sample !== 'object') return sample || {};
    const group = sample, controllers = Object.assign({}, group.controllers || {}), uneven = group['uneven-sampling'];
    const halftone = group.halftone;
    // v4.2 gives halftone one unambiguous scale: sampling-grid × size.
    // Earlier drafts stored a raw point radius plus a separate spacing; the
    // spacing is the closest equivalent of the new unit multiplier.
    if (halftone && typeof halftone === 'object' && halftone.spacing != null) {
      halftone.size = Math.max(1, Math.round(+halftone.spacing || 4));
      delete halftone.spacing;
    }
    if (uneven && typeof uneven === 'object') {
      const legacyField = controllers['sampling-field'] || {}, legacyEdge = controllers['edge-rule'] || {}, legacyMotion = uneven.motion || {}, legacyFieldMotion = legacyField.motion || {};
      const field = Object.assign({}, legacyField, uneven.field || {}), edge = Object.assign({}, legacyEdge, uneven.edge || {});
      delete field.motion;
      const legacyAnimated=!!legacyFieldMotion.enabled||!!(legacyMotion.enabled&&legacyMotion.type==='sampling-tide')||legacyMotion.fieldFlow===true||legacyMotion.tide===true;
      const motion=legacyMotion.type==='uneven-motion'?Object.assign({},legacyMotion):Object.assign({enabled:legacyAnimated,type:'uneven-motion',period:legacyMotion.period == null ? (legacyFieldMotion.period == null ? 3 : legacyFieldMotion.period) : legacyMotion.period,steps:legacyMotion.steps == null ? (legacyFieldMotion.steps == null ? 24 : legacyFieldMotion.steps) : legacyMotion.steps,flowSpeed:legacyFieldMotion.speed == null ? 1 : legacyFieldMotion.speed,tideAmount:legacyMotion.amount == null ? .35 : legacyMotion.amount},legacyMotion.type==='sampling-tide'?{enabled:true,type:'uneven-motion'}:{});
      if (legacyField.type === 'uniform' && !uneven.field) field.enabled = false;
      else if (Object.keys(field).length) field.enabled = field.enabled !== false;
      if (field.strength != null && field.contrast == null) field.contrast = field.strength;
      if (field.angle != null && field.direction == null) field.direction = field.angle;
      delete field.strength; delete field.angle;
      if (edge.mode === 'alpha-lock') edge.mode = 'contour'; else if (edge.mode === 'edge-only') edge.mode = 'interior'; else if (edge.mode === 'inside-only') edge.mode = 'off';
      group['uneven-sampling'] = Object.assign({}, uneven, { field:Object.assign({enabled:true,type:'wave',contrast:.5,scale:48,seed:1,direction:0,centerX:.5,centerY:.5},field), edge:Object.assign({mode:'off',width:2},edge), motion });
      delete group['uneven-sampling'].targets;
    }
    delete controllers['sampling-field']; delete controllers['edge-rule'];
    if (Object.keys(controllers).length) group.controllers = controllers; else delete group.controllers;
    return group;
  }

  function normalizeParts(entity) {
    if (!Array.isArray(entity.parts)) { if (entity.type === 'vector') entity.parts = []; return; }
    const seen = new Set();
    entity.parts = entity.parts.map((input, index) => {
      const part = Object.assign({ id:`part-${index + 1}`, type:'rect', x:0, y:0, w:1, h:1, scaleX:1, scaleY:1, rot:0, alpha:1, hidden:false }, input || {});
      part.id = String(part.id || `part-${index + 1}`);
      if (seen.has(part.id)) throw new Error(`实体「${entity.id}」存在重复图元 id：${part.id}`);
      seen.add(part.id);
      if (!PART_TYPES.has(part.type)) throw new Error(`实体「${entity.id}」的图元「${part.id}」类型无效：${part.type}`);
      part.x = finite(part.x, 0); part.y = finite(part.y, 0); part.scaleX = finite(part.scaleX, 1); part.scaleY = finite(part.scaleY, 1); part.rot = finite(part.rot, 0); part.alpha = Math.max(0, Math.min(1, finite(part.alpha, 1)));
      if (part.type === 'line') { part.x2 = finite(part.x2, part.x + 1); part.y2 = finite(part.y2, part.y + 1); delete part.w; delete part.h; }
      else { part.w = Math.max(1, finite(part.w, 1)); part.h = Math.max(1, finite(part.h, 1)); }
      if (part.type === 'rect') part.radius = Math.max(0, Math.min(finite(part.radius, 0), part.w / 2, part.h / 2));
      if (part.type === 'poly') part.points = Array.isArray(part.points) ? part.points : [[.5,0],[1,1],[0,1]];
      return part;
    });
  }

  function normalizeEntity(input, index) {
    const entity = Object.assign({
      id: `entity-${index + 1}`,
      type: 'rect', x: 0, y: 0, w: 1, h: 1,
      scaleX: 1, scaleY: 1, rot: 0, alpha: 1,
      fill: '#ffffff', hidden: false,
    }, clone(input) || {});
    entity.id = String(entity.id || `entity-${index + 1}`);
    entity.x = finite(entity.x, 0); entity.y = finite(entity.y, 0);
    entity.w = Math.max(1, finite(entity.w, 1)); entity.h = Math.max(1, finite(entity.h, 1));
    entity.scaleX = finite(entity.scaleX, 1); entity.scaleY = finite(entity.scaleY, 1);
    entity.rot = finite(entity.rot, 0); entity.alpha = Math.max(0, Math.min(1, finite(entity.alpha, 1)));
    if (entity.type === 'builtin') entity.builtin = api.modules.builtins.normalize(entity.builtin);
    normalizeParts(entity);
    if (entity.pivot && entity.pivot.mode === 'custom') entity.pivot = { mode:'custom', x:Math.max(0, Math.min(1, finite(entity.pivot.x, .5))), y:Math.max(0, Math.min(1, finite(entity.pivot.y, .5))) };
    else delete entity.pivot;
    if (entity.effects) {
      entity.effects = Object.assign({ pipeline: OBJECT_PIPELINE.slice(), mask: null, formation: {}, decorate: {}, sample: {} }, entity.effects);
      if (!sameStages(entity.effects.pipeline, OBJECT_PIPELINE)) entity.effects.pipeline = OBJECT_PIPELINE.slice();
      normalizeSample(entity.effects.sample);
    }
    return entity;
  }

  function normalize(scene) {
    const raw = clone(scene) || {};
    const version = raw.format || raw.formatVersion || FORMAT;
    if (version !== FORMAT && version !== 4) throw new Error(`Runtime vNext 只接受 ${FORMAT}，收到 ${version}`);
    const width = Math.max(1, Math.round(finite(raw.width, 320)));
    const height = Math.max(1, Math.round(finite(raw.height, 180)));
    const loop = Math.max(.001, finite(raw.loop, 4));
    const entities = (Array.isArray(raw.entities) ? raw.entities : []).map(normalizeEntity);
    const seen = new Set();
    for (const entity of entities) {
      if (seen.has(entity.id)) throw new Error(`Runtime vNext 场景存在重复实体 id：${entity.id}`);
      seen.add(entity.id);
    }
    const byId = new Map(entities.map(entity => [entity.id, entity]));
    // Groups are transform-only parents. Children stay in the flat entity list
    // and keep its draw order; parentId therefore never creates a render tree.
    for (const entity of entities) {
      if (entity.parentId == null || entity.parentId === '') { entity.parentId = null; continue; }
      entity.parentId = String(entity.parentId);
      const parent = byId.get(entity.parentId);
      if (!parent) throw new Error(`实体「${entity.id}」引用了不存在的组：${entity.parentId}`);
      if (parent.type !== 'group') throw new Error(`实体「${entity.id}」的 parentId 必须指向 group：${entity.parentId}`);
      if (parent.id === entity.id) throw new Error(`组「${entity.id}」不能成为自身的父级`);
    }
    for (const start of entities) {
      const visited = new Set(); let next = start;
      while (next && next.parentId) { if (visited.has(next.id)) throw new Error(`组父级存在循环引用：${start.id}`); visited.add(next.id); next = byId.get(next.parentId); }
    }
    for (const entity of entities) {
      if (entity.type !== 'particle-emitter') continue;
      entity.particle = Object.assign({ count: 40, life: 2, speed: 20, direction: 90, spread: 0, gravity: 0, wind: 0, size: 1, sizeVar: 0, alpha: 1, fade: true, seed: 1 }, entity.particle || {});
      const sourceId = String(entity.particle.sourceId || entity.sourceId || '');
      const source = byId.get(sourceId);
      if (!source) throw new Error(`粒子发射器「${entity.id}」缺少可用 sourceId：${sourceId || '(空)'}`);
      if (source.id === entity.id || source.type === 'group' || source.type === 'particle-emitter') throw new Error(`粒子发射器「${entity.id}」的 sourceId 必须指向普通实体`);
      entity.particle.sourceId = sourceId;
    }
    const dependencies = new Map();
    for (const owner of entities) {
      const mask = owner.effects && owner.effects.mask;
      if (!mask || mask.type !== 'element') continue;
      if (!mask.targetId || !byId.has(mask.targetId)) throw new Error(`元素「${owner.id}」引用了不存在的蒙版来源：${mask.targetId || '(空)'}`);
      if (mask.targetId === owner.id) throw new Error(`元素「${owner.id}」不能引用自身作为蒙版`);
      dependencies.set(owner.id, mask.targetId);
    }
    for (const start of dependencies.keys()) { const visited = new Set(); let next = start; while (dependencies.has(next)) { if (visited.has(next)) throw new Error(`元素蒙版存在循环引用：${start}`); visited.add(next); next = dependencies.get(next); } }
    const sceneEffects = Object.assign({ overlay: {}, sample: {}, pipeline: SCENE_PIPELINE.slice() }, raw.sceneEffects || {});
    delete sceneEffects.outputGrain;
    normalizeSample(sceneEffects.sample);
    if (sceneEffects.sample && sceneEffects.sample['uneven-sampling'] && sceneEffects.sample['uneven-sampling'].edge) sceneEffects.sample['uneven-sampling'].edge.mode = 'off';
    // Scene stages are intentionally not draggable.  Preserve no malformed or
    // legacy ordering here: output grain must remain the final pixel pass.
    sceneEffects.pipeline = SCENE_PIPELINE.slice();
    return Object.freeze({
      format: FORMAT, width, height, loop,
      background: Object.assign({ color: '#000000', alpha: 1, layers: [] }, raw.background || {}),
      entities: Object.freeze(entities),
      timeline: raw.timeline || { tracks: {} },
      sceneEffects,
      // CanvasImageSource 不能经 JSON clone 保持可绘制；持久 Scene 的 assets
      // 只保存 locator，宿主把可绘制对象注入 runtimeAssets。保留 assets 兜底
      // 是为了允许纯 Runtime 调用直接传入 CanvasImageSource 映射。
      assets: scene && (scene.runtimeAssets || scene.assets) || {},
      assetRefs: raw.assets || {},
    });
  }

  api.modules.scene = Object.freeze({ FORMAT, OBJECT_PIPELINE, SCENE_PIPELINE, normalize });
})(typeof window !== 'undefined' ? window : globalThis);
