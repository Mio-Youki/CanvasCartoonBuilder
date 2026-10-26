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
  const PART_TYPES = new Set(['rect', 'ellipse', 'line', 'poly', 'stroke', 'custom']);
  // Persistent geometry is authored on the pixel grid.  Runtime animation can
  // still interpolate these values, but the final frame state snaps them back
  // to pixels before drawing (see 30-frame-state.js).
  const pixel = (value, fallback) => Math.round(finite(value, fallback));

  // Field distribution and Alpha edge protection became children of uneven
  // sampling in v4.1.  Keep this boundary migration in Runtime too: exported
  // v4.0 JSON remains readable, while no render path treats them as global
  // sampling controllers any longer.
  function normalizeSample(sample) {
    if (!sample || typeof sample !== 'object') return sample || {};
    const group = sample, controllers = Object.assign({}, group.controllers || {}), uneven = group['uneven-sampling'];
    const halftone = group.halftone;
    if(group['color-map']){
      const map=group['color-map'];delete map.motion;
      map.mode=map.mode==='gradient'?'gradient':'discrete';
      map.colors=2**Math.max(1,Math.min(6,Math.round(Math.log2(Math.max(2,+map.colors||16)))));
    }
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
      Object.assign(part,api.modules.pathStroke.normalize(part));
      if(part.type==='custom'){
        part.recipe=api.modules.customShapes.normalizePartRecipe(part);part.stroke=part.stroke===undefined?'#ffd23f':part.stroke;part.strokeWidth=Math.max(0,finite(part.strokeWidth,3));part.fill=null;delete part.fillPattern;delete part.fillPaint;
      }
      part.x = pixel(part.x, 0); part.y = pixel(part.y, 0); part.scaleX = finite(part.scaleX, 1); part.scaleY = finite(part.scaleY, 1); part.rot = finite(part.rot, 0); part.alpha = Math.max(0, Math.min(1, finite(part.alpha, 1)));
      if (part.type === 'line') { part.x2 = pixel(part.x2, part.x + 1); part.y2 = pixel(part.y2, part.y + 1); delete part.w; delete part.h; }
      else if (part.type === 'stroke') { part.points = Array.isArray(part.points) ? part.points.map(point => [pixel(point && point[0], 0), pixel(point && point[1], 0)]) : [[part.x, part.y], [part.x + 1, part.y + 1]]; part.stroke = part.stroke || '#000000'; part.strokeWidth = Math.max(1, pixel(part.strokeWidth, 1)); delete part.fill; delete part.w; delete part.h; }
      else { part.w = Math.max(1, finite(part.w, 1)); part.h = Math.max(1, finite(part.h, 1)); }
      if (part.type === 'rect') part.radius = Math.max(0, Math.min(finite(part.radius, 0), part.w / 2, part.h / 2));
      if (part.type === 'poly') part.points = Array.isArray(part.points) ? part.points : [[.5,0],[1,1],[0,1]];
      if(Array.isArray(part.extensions?.attached)&&part.extensions.attached.some(id=>api.modules.pathGenerators?.definition(id)))part.extensions=api.modules.pathExtensions.normalize(part);
      return part;
    });
  }

  /* A Scene variant is an authored alternative for one semantic entity, not a
     second draw-layer.  It keeps all Scene-specific geometry in the same
     selectable object so the renderer only evaluates and paints the active
     alternative.  This is intentionally narrower than arbitrary shape
     morphing: variants switch at Scene boundaries and remain ordinary pixel
     geometry inside each Scene. */
  function normalizeSceneVariants(entity) {
    if (!Array.isArray(entity.sceneVariants) || !entity.sceneVariants.length) { delete entity.sceneVariants; return; }
    entity.sceneVariants = entity.sceneVariants.map((input, index) => {
      const variant = Object.assign({}, clone(input) || {});
      for (const key of ['x', 'y']) if (variant[key] != null) variant[key] = pixel(variant[key], 0);
      for (const key of ['w', 'h']) if (variant[key] != null) variant[key] = Math.max(1, pixel(variant[key], 1));
      for (const key of ['scaleX', 'scaleY', 'rot']) if (variant[key] != null) variant[key] = finite(variant[key], key.startsWith('scale') ? 1 : 0);
      if (variant.alpha != null) variant.alpha = Math.max(0, Math.min(1, finite(variant.alpha, 1)));
      if (variant.parts != null) {
        const carrier = { id:`${entity.id}:scene-${index + 1}`, type:entity.type, parts:variant.parts };
        normalizeParts(carrier); variant.parts = carrier.parts;
      }
      return variant;
    });
  }

  function normalizeEntity(input, index, moduleScope) {
    const entity = Object.assign({
      id: `entity-${index + 1}`,
      type: 'rect', x: 0, y: 0, w: 1, h: 1,
      scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rot: 0, alpha: 1,
      fill: '#ffffff', hidden: false,
    }, clone(input) || {});
    entity.id = String(entity.id || `entity-${index + 1}`);
    entity.x = pixel(entity.x, 0); entity.y = pixel(entity.y, 0);
    entity.w = Math.max(1, pixel(entity.w, 1)); entity.h = Math.max(1, pixel(entity.h, 1));
    entity.scaleX = finite(entity.scaleX, 1); entity.scaleY = finite(entity.scaleY, 1); entity.skewX = Math.max(-80, Math.min(80, finite(entity.skewX, 0))); entity.skewY = Math.max(-80, Math.min(80, finite(entity.skewY, 0)));
    entity.rot = finite(entity.rot, 0); entity.alpha = Math.max(0, Math.min(1, finite(entity.alpha, 1)));
    if(['rect','ellipse','poly','line'].includes(entity.type))Object.assign(entity,api.modules.pathStroke.normalize(entity));
    if (entity.type === 'text') {
      entity.textCompletion = Math.max(0, Math.min(100, finite(entity.textCompletion, 100)));
      if (entity.textCursor) entity.textCursor = Object.assign({}, entity.textCursor, {
        enabled:!!entity.textCursor.enabled,
        style:['bar','underline','block'].includes(entity.textCursor.style) ? entity.textCursor.style : 'bar',
        period:Math.max(0, finite(entity.textCursor.period, 1)),
      });
    }
    if (entity.type === 'builtin') entity.builtin = api.modules.builtins.normalize(entity.builtin);
    if (entity.type === 'procedural') Object.assign(entity, api.modules.sceneModules.normalize(entity,{scope:moduleScope}));
    normalizeParts(entity);
    normalizeSceneVariants(entity);
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
    api.modules.patternProviders.validateScene(raw);
    const version = raw.format || raw.formatVersion || FORMAT;
    if (version !== FORMAT && version !== 4) throw new Error(`Runtime vNext 只接受 ${FORMAT}，收到 ${version}`);
    const width = Math.max(1, Math.round(finite(raw.width, 320)));
    const height = Math.max(1, Math.round(finite(raw.height, 180)));
    const loop = Math.max(.001, finite(raw.loop, 4)), moduleScope=String(raw._moduleScope || raw.moduleScope || 'global');
    const entities = (Array.isArray(raw.entities) ? raw.entities : []).map((entity,index)=>normalizeEntity(entity,index,moduleScope));
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
      if(entity.particle.mode!=null&&!['sprite','layer'].includes(entity.particle.mode))throw Error('未知粒子实体模式：'+entity.particle.mode);
      if(entity.particle.mode==='layer'){
        const p=entity.particle;
        if(p.layerEmission!=null&&!['burst','continuous'].includes(p.layerEmission))throw Error('未知图层发射方式');
        if(p.fragmentShape!=null&&!['rect','circle'].includes(p.fragmentShape))throw Error('未知切片形状');
        if(p.sampleTime!=null&&!['birth','fixed'].includes(p.sampleTime))throw Error('未知图层取样时间');
        if(p.sourceFps!=null&&(!Number.isInteger(p.sourceFps)||p.sourceFps<1||p.sourceFps>30))throw Error('来源刷新率须为1～30的整数');
        if(p.cellSize!=null&&(!Number.isInteger(p.cellSize)||p.cellSize<1))throw Error('图层切片尺寸须为正整数');
        if(p.startTime!=null&&(!Number.isFinite(p.startTime)||p.startTime<0||p.startTime>=loop))throw Error('图层切片开始时间须位于循环内');
      }
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
    api.modules.maskContract?.validateReferences({entities,sceneEffects});
    return Object.freeze({
      format: FORMAT, width, height, loop, moduleScope,
      background: Object.assign({ color: '#ffffff', alpha: 1, layers: [] }, raw.background || {}),
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
