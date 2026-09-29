/* <vnext:00-namespace.js> */
/* ToSampool Runtime vNext source module: shared namespace. */
(function (global) {
  'use strict';

  const existing = global.ToSampoolRuntimeVNext || {};
  const modules = existing.modules || Object.create(null);
  global.ToSampoolRuntimeVNext = existing;
  existing.modules = modules;
  existing.VERSION = 1;
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:00-namespace.js> */

/* <vnext:15-builtin-registry.js> */
/* ToSampool Runtime vNext source module: controlled declarative builtin registry. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function normalizeParam(param, value) {
    if (param.type === 'number') {
      let next = finite(value, param.default);
      if (param.integer) next = Math.round(next);
      if (param.min != null) next = Math.max(param.min, next);
      if (param.max != null) next = Math.min(param.max, next);
      return next;
    }
    if (param.type === 'boolean') return value == null ? !!param.default : !!value;
    if (param.type === 'select') return (param.options || []).includes(value) ? value : param.default;
    if (param.type === 'color') return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : param.default;
    return value == null ? param.default : String(value);
  }

  function star(ctx, values, params, time) {
    const rays = Math.round(params.rays), outer = Math.max(1, Math.min(values.w, values.h) / 2);
    const pulse = 1 + Math.sin(time * Math.PI * 2 / Math.max(.05, params.period)) * params.twinkle;
    const inner = outer * params.innerRadius, points = rays * 2;
    ctx.save(); ctx.scale(pulse, pulse); ctx.beginPath();
    for (let index = 0; index < points; index++) {
      const radius = index % 2 ? inner : outer, angle = -Math.PI / 2 + index * Math.PI / rays;
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fillStyle = params.color; ctx.fill();
    const core = outer * params.coreSize;
    if (core > 0) { ctx.fillStyle = params.coreColor; ctx.fillRect(-core / 2, -core / 2, core, core); }
    ctx.restore();
  }

  function cloud(ctx, values, params) {
    const w = values.w, h = values.h, lobes = Math.round(params.lobes);
    ctx.fillStyle = params.shadow;
    ctx.fillRect(-w * .42, h * .08, w * .84, h * .3);
    ctx.fillStyle = params.color;
    ctx.fillRect(-w / 2, 0, w, h * .34);
    for (let index = 0; index < lobes; index++) {
      const p = lobes === 1 ? .5 : index / (lobes - 1), x = -w * .34 + p * w * .68;
      const radius = h * (.22 + ((index * 13 + params.seed) % 5) * .025);
      ctx.beginPath(); ctx.arc(x, 0, radius, Math.PI, Math.PI * 2); ctx.fill();
    }
  }

  function trainBeam(ctx, values, params, time) {
    const phase = Math.sin(time * Math.PI * 2 / Math.max(.05, params.period));
    const alpha = clamp(params.alpha * (1 - params.flicker * (.5 + .5 * phase)), 0, 1);
    const length = values.w * params.length, spread = Math.max(1, values.h * params.spread);
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = params.color; ctx.beginPath();
    ctx.moveTo(-values.w / 2, -spread * .12); ctx.lineTo(-values.w / 2 + length, -spread / 2);
    ctx.lineTo(-values.w / 2 + length, spread / 2); ctx.lineTo(-values.w / 2, spread * .12);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  const definitions = Object.freeze([
    Object.freeze({
      id:'pixel-star', version:1, name:'像素星', aliases:['星星','闪烁星光','pixel star'],
      purpose:'无需外部素材的轻量星光，可作天空细节或粒子实体。', avoidWhen:['需要写实镜头光斑时'],
      cost:'low', timeDependent:params=>params.twinkle>0,
      params:Object.freeze([
        { key:'color', label:'星芒颜色', type:'color', default:'#fff2a8', timing:'linear-safe' },
        { key:'coreColor', label:'核心颜色', type:'color', default:'#ffffff', timing:'linear-safe' },
        { key:'rays', label:'星芒数量', type:'number', default:4, min:3, max:12, step:1, integer:true, timing:'step' },
        { key:'innerRadius', label:'内径', type:'number', default:.4, min:.05, max:.95, step:.05, timing:'linear-safe' },
        { key:'coreSize', label:'核心大小', type:'number', default:.22, min:0, max:1, step:.05, timing:'linear-safe' },
        { key:'twinkle', label:'闪烁幅度', type:'number', default:.12, min:0, max:.8, step:.01, timing:'step' },
        { key:'period', label:'闪烁周期', type:'number', default:1.8, min:.05, max:30, step:.05, timing:'step' },
      ]), draw:star,
    }),
    Object.freeze({
      id:'pixel-cloud', version:1, name:'像素云', aliases:['云','块状云','pixel cloud'],
      purpose:'可调色的低成本块状云，运动应交给对象动态或时序。', avoidWhen:['需要写实云层体积时'],
      cost:'low', timeDependent:()=>false,
      params:Object.freeze([
        { key:'color', label:'云色', type:'color', default:'#f2f4ff', timing:'linear-safe' },
        { key:'shadow', label:'阴影色', type:'color', default:'#b9c2d8', timing:'linear-safe' },
        { key:'lobes', label:'云团数量', type:'number', default:5, min:2, max:12, step:1, integer:true, timing:'step' },
        { key:'seed', label:'形态种子', type:'number', default:1, min:0, max:9999, step:1, integer:true, timing:'step' },
      ]), draw:cloud,
    }),
    Object.freeze({
      id:'train-beam', version:1, name:'列车光束', aliases:['车灯','前灯','列车前灯','train beam'],
      purpose:'轻量像素列车前灯或探照光束；保留 Legacy train-beam 的稳定名称。', avoidWhen:['需要真实体积光散射时'],
      cost:'low', timeDependent:params=>params.flicker>0,
      params:Object.freeze([
        { key:'color', label:'光束颜色', type:'color', default:'#ffe5a3', timing:'linear-safe' },
        { key:'alpha', label:'透明度', type:'number', default:.7, min:0, max:1, step:.01, timing:'linear-safe' },
        { key:'length', label:'长度比例', type:'number', default:1, min:.05, max:1, step:.01, timing:'linear-safe' },
        { key:'spread', label:'扩散比例', type:'number', default:.8, min:.02, max:1, step:.01, timing:'linear-safe' },
        { key:'flicker', label:'闪烁幅度', type:'number', default:.04, min:0, max:1, step:.01, timing:'step' },
        { key:'period', label:'闪烁周期', type:'number', default:.35, min:.05, max:30, step:.05, timing:'step' },
      ]), draw:trainBeam,
    }),
  ]);
  const byId = Object.freeze(Object.fromEntries(definitions.map(definition => [definition.id, definition])));

  function definition(id, version) {
    const value = byId[id];
    if (!value) throw new Error(`未注册的内建组件：${id || '(空)'}`);
    if ((version == null ? 1 : +version) !== value.version) throw new Error(`内建组件「${id}」不支持版本 ${version}`);
    return value;
  }
  function normalize(input) {
    const value = input || {}, item = definition(String(value.id || ''), value.version);
    const params = {};
    for (const param of item.params) params[param.key] = normalizeParam(param, value.params && value.params[param.key]);
    return { id:item.id, version:item.version, params };
  }
  function paramsFor(entityOrValues) { const value = normalize(entityOrValues && entityOrValues.builtin); return value.params; }
  function render(ctx, entity, values, frame) {
    const value = normalize(values && values.builtin || entity && entity.builtin), item = definition(value.id, value.version);
    item.draw(ctx, values, value.params, frame && frame.time || 0);
  }
  function timeDependent(entity) {
    if (!entity || entity.type !== 'builtin' || !entity.builtin) return false;
    const value = normalize(entity.builtin), item = definition(value.id, value.version);
    return !!item.timeDependent(value.params);
  }
  function manifest() {
    return definitions.map(item => ({
      id:item.id, version:item.version, name:item.name, aliases:item.aliases, purpose:item.purpose,
      avoidWhen:item.avoidWhen, cost:item.cost,
      parameters:item.params.map(param => clone(param)),
    }));
  }

  api.modules.builtins = Object.freeze({ definitions, byId, definition, normalize, normalizeParam, paramsFor, render, timeDependent, manifest });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:15-builtin-registry.js> */

/* <vnext:10-scene-normalize.js> */
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
/* </vnext:10-scene-normalize.js> */

/* <vnext:20-timeline-evaluator.js> */
/* ToSampool Runtime vNext source module: sparse Step / Linear value evaluation. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const linear = (a, b, p) => +a + (+b - +a) * p;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function parseColor(value) {
    if (typeof value !== 'string') return null;
    const input = value.trim();
    let match = /^#([0-9a-f]{3})$/i.exec(input);
    if (match) return match[1].split('').map(part => parseInt(part + part, 16));
    match = /^#([0-9a-f]{6})$/i.exec(input);
    if (!match) return null;
    return [0, 2, 4].map(index => parseInt(match[1].slice(index, index + 2), 16));
  }

  function colorAt(a, b, p) {
    const from = parseColor(a), to = parseColor(b);
    if (!from || !to) return null;
    return '#' + from.map((value, index) => Math.round(linear(value, to[index], p)).toString(16).padStart(2, '0')).join('');
  }

  function segmentAt(segments, rel) {
    if (!Array.isArray(segments)) return null;
    return segments.find((segment, index) => {
      const f = segment && segment.f;
      return Array.isArray(f) && rel >= f[0] - .000001 && (rel < f[1] - .000001 || (index === segments.length - 1 && rel <= f[1] + .000001));
    }) || null;
  }

  function assign(out, key, value) {
    const parts = String(key || '').split('.');
    if (parts.length === 1) { out[parts[0]] = value; return; }
    let target = out;
    for (let index = 0; index < parts.length - 1; index++) {
      const part = parts[index];
      target[part] = Object.assign({}, target[part] || {});
      target = target[part];
    }
    target[parts[parts.length - 1]] = value;
  }

  function neighborValues(segments,index,direction) {
    for(let cursor=index+direction;cursor>=0&&cursor<segments.length;cursor+=direction){const candidate=segments[cursor];if(candidate&&candidate.type!=='linear'&&candidate.values&&Object.keys(candidate.values).length)return candidate.values;}
    return null;
  }

  function applyValues(base, segment, rel, segments) {
    if (!segment) return Object.assign({}, base);
    if (segment.type !== 'linear') { const out = Object.assign({}, base); Object.entries(segment.values || {}).forEach(([key, value]) => assign(out, key, value)); return out; }
    const f = segment.f || [0, 1];
    const p = clamp((rel - f[0]) / Math.max(.000001, f[1] - f[0]), 0, 1);
    const index=(segments||[]).indexOf(segment),left=neighborValues(segments||[],index,-1)||{},right=neighborValues(segments||[],index,1)||{},from=Object.assign({},left,segment.from||{}),to=Object.assign({},right,segment.to||{}),out = Object.assign({}, base);
    const allowed=Array.isArray(segment.linearKeys)?new Set(segment.linearKeys):null,keys = new Set(Object.keys(from).concat(Object.keys(to)));
    for (const key of keys) {
      const a = from[key] !== undefined ? from[key] : base[key];
      const b = to[key] !== undefined ? to[key] : base[key];
      if (!allowed || allowed.has(key)) {
        if (Number.isFinite(+a) && Number.isFinite(+b)) { assign(out, key, linear(a, b, p)); continue; }
        const color = colorAt(a, b, p);
        if (color) { assign(out, key, color); continue; }
      }
      if (p>=1&&b !== undefined) assign(out, key, b);
      else if (a !== undefined) assign(out, key, a);
    }
    return out;
  }

  function valuesFor(scene, ownerId, base, rel) {
    const tracks = scene.timeline && scene.timeline.tracks || {};
    const track = tracks[ownerId] || tracks[`entity:${ownerId}`];
    return applyValues(base, track && segmentAt(track.segments, rel), rel, track&&track.segments);
  }

  function visibleFor(scene, ownerId, rel) {
    const map = scene.timeline && scene.timeline.visibility || {}, track = map[ownerId];
    if (!track) return true;
    const segment = segmentAt(track.segments, rel);
    return !segment || segment.visible !== false;
  }

  function effectTrackKey(scope, ownerId, effectId) {
    return scope === 'scene' ? `effect:scene:${ownerId}:${effectId}` : `effect:object:${ownerId}:${effectId}`;
  }
  function effectValuesFor(scene, scope, ownerId, effectId, base, rel) {
    const tracks = scene.timeline && scene.timeline.tracks || {}, key = effectTrackKey(scope, ownerId, effectId);
    const track=tracks[key];return applyValues(base, segmentAt(track && track.segments, rel), rel, track&&track.segments);
  }

  function controllerTrackKey(scope, ownerId, controllerId) {
    return scope === 'scene' ? `controller:scene:${ownerId}:${controllerId}` : `controller:object:${ownerId}:${controllerId}`;
  }
  function controllerValuesFor(scene, scope, ownerId, controllerId, base, rel) {
    const tracks = scene.timeline && scene.timeline.tracks || {}, key = controllerTrackKey(scope, ownerId, controllerId), input = tracks[key];
    return applyValues(base, segmentAt(input && input.segments, rel), rel, input && input.segments);
  }

  api.modules.timeline = Object.freeze({ segmentAt, applyValues, valuesFor, visibleFor, effectTrackKey, effectValuesFor, controllerTrackKey, controllerValuesFor, colorAt });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:20-timeline-evaluator.js> */

/* <vnext:30-frame-state.js> */
/* ToSampool Runtime vNext source module: deterministic per-frame state. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const wrap = (t, loop) => ((+t % loop) + loop) % loop;
  const IDENTITY = Object.freeze([1, 0, 0, 1, 0, 0]);
  function multiply(left, right) { return [left[0] * right[0] + left[2] * right[1], left[1] * right[0] + left[3] * right[1], left[0] * right[2] + left[2] * right[3], left[1] * right[2] + left[3] * right[3], left[0] * right[4] + left[2] * right[5] + left[4], left[1] * right[4] + left[3] * right[5] + left[5]]; }
  function pivotFor(values) { const pivot=values&&values.pivot,custom=pivot&&pivot.mode==='custom';return{x:(+values.w||0)*(custom?Math.max(0,Math.min(1,+pivot.x||0)):.5),y:(+values.h||0)*(custom?Math.max(0,Math.min(1,+pivot.y||0)):.5)}; }
  function matrixFor(values) {
    const x = +values.x || 0, y = +values.y || 0, sx = Number.isFinite(+values.scaleX) ? +values.scaleX : 1, sy = Number.isFinite(+values.scaleY) ? +values.scaleY : 1, radians = (+values.rot || 0) * Math.PI / 180, cos = Math.cos(radians), sin = Math.sin(radians), a = cos * sx, b = sin * sx, c = -sin * sy, d = cos * sy, pivot=pivotFor(values),px=x+pivot.x,py=y+pivot.y;
    return [a, b, c, d, px - a * pivot.x - c * pivot.y, py - b * pivot.x - d * pivot.y];
  }

  /* A small, deterministic motion vocabulary.  These are periodic primitives,
     not keyframe curves: every mode closes at the loop boundary and costs one
     O(1) calculation per animated object. */
  function curve(phase, mode) {
    const p = ((+phase % 1) + 1) % 1, half = p < .5 ? p * 2 : 2 - p * 2;
    const ease = mode === 'ease-in' ? half * half : mode === 'ease-out' ? 1 - (1 - half) * (1 - half) : mode === 'ease-in-out' ? (half < .5 ? 2 * half * half : 1 - Math.pow(-2 * half + 2, 2) / 2) : half;
    if (mode === 'step') return p < .5 ? -1 : 1;
    if (mode === 'linear' || mode === 'ease-in' || mode === 'ease-out' || mode === 'ease-in-out') return p < .5 ? -1 + ease * 2 : 1 - ease * 2;
    return Math.sin(p * Math.PI * 2);
  }

  function motion(scene, values, entity, time) {
    const anim = values.anim || entity.anim || {};
    const out = Object.assign({}, values);
    const enabled = key => api.modules.timeline.visibleFor(scene, `motion:object:${entity.id}:${key}`, time / Math.max(.001, +scene.loop || 1));
    if (anim.bob && enabled('bob') && Number.isFinite(+anim.bob.amount)) {
      const period = Math.max(.001, +anim.bob.period || 1), angle = (Number.isFinite(+anim.bob.angle) ? +anim.bob.angle : 90) * Math.PI / 180, offset = curve(time / period, anim.bob.curve) * +anim.bob.amount;
      out.x += Math.cos(angle) * offset; out.y += Math.sin(angle) * offset;
    }
    if (anim.scroll && enabled('scroll') && Number.isFinite(+anim.scroll.speed)) {
      const angle = (+anim.scroll.angle || 0) * Math.PI / 180, span = Math.max(0, +anim.scroll.span || 0), raw = time * +anim.scroll.speed, distance = anim.scroll.repeat !== false && span > 0 ? ((raw % span) + span) % span : raw;
      out.x += Math.cos(angle) * distance; out.y += Math.sin(angle) * distance;
    }
    if (anim.pulse && enabled('pulse') && Number.isFinite(+anim.pulse.amount)) {
      const period = Math.max(.001, +anim.pulse.period || 1), scale = 1 + curve(time / period, anim.pulse.curve) * +anim.pulse.amount;
      out.scaleX = (Number.isFinite(+out.scaleX) ? +out.scaleX : 1) * scale; out.scaleY = (Number.isFinite(+out.scaleY) ? +out.scaleY : 1) * scale;
    }
    if (anim.spin && enabled('spin') && Number.isFinite(+anim.spin.speed)) out.rot += time * +anim.spin.speed;
    if (anim.wave && enabled('wave') && Number.isFinite(+anim.wave.amount)) out.rot += Math.sin(time / Math.max(.001, +anim.wave.period || 1) * Math.PI * 2) * +anim.wave.amount;
    if (anim.blink && enabled('blink') && Number.isFinite(+anim.blink.amount)) {
      const period = Math.max(.001, +anim.blink.period || 1);
      out.alpha *= 1 - Math.max(0, Math.min(1, +anim.blink.amount)) * ((curve(time / period, anim.blink.curve) + 1) / 2);
    }
    return out;
  }

  function create(scene, t, preview) {
    const time = wrap(t, scene.loop);
    const rel = time / scene.loop;
    const local = new Map(), byId = new Map(), entities = new Map(scene.entities.map(entity => [entity.id, entity]));
    for (const entity of scene.entities) {
      const values = api.modules.timeline.valuesFor(scene, entity.id, entity, rel);
      values.timelineVisible = api.modules.timeline.visibleFor(scene, entity.id, rel);
      local.set(entity.id, motion(scene, values, entity, time));
    }
    function resolve(entity) {
      if (byId.has(entity.id)) return byId.get(entity.id);
      const parent = entity.parentId && entities.get(entity.parentId), parentValues = parent ? resolve(parent) : null, values = Object.assign({}, local.get(entity.id) || entity);
      values.parentMatrix = parentValues ? parentValues.worldMatrix : IDENTITY;
      values.parentAlpha = parentValues ? parentValues.parentAlpha * parentValues.alpha : 1;
      values.parentHidden = !!(parentValues && (parentValues.parentHidden || parent.hidden || parentValues.timelineVisible === false));
      values.worldMatrix = multiply(values.parentMatrix, matrixFor(values));
      const frozen = Object.freeze(values); byId.set(entity.id, frozen); return frozen;
    }
    for (const entity of scene.entities) resolve(entity);
    const quality=Object.freeze({pixelDivMultiplier:Math.max(1,Math.round(preview&&+preview.pixelDivMultiplier||1))});
    return Object.freeze({ time, rel, preview:quality, valuesFor: entity => byId.get(entity.id) || entity, effectValuesFor: (scope, ownerId, effectId, base) => api.modules.timeline.effectValuesFor(scene, scope, ownerId, effectId, base, rel), controllerValuesFor: (scope, ownerId, controllerId, base) => api.modules.timeline.controllerValuesFor(scene, scope, ownerId, controllerId, base, rel) });
  }

  api.modules.frame = Object.freeze({ create, matrixFor, multiply, pivotFor, curve, IDENTITY });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:30-frame-state.js> */

/* <vnext:40-surface-pool.js> */
/* ToSampool Runtime vNext source module: reusable local effect surfaces. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  function makeCanvas(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
    if (typeof document !== 'undefined' && document.createElement) {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas;
    }
    return null;
  }
  function create() {
    const free = new Map();
    let peakPixels = 0, acquires = 0, reuses = 0, backingSizeWrites = 0, workPixels = 0, pixelPasses = 0;
    function acquire(width, height) {
      width = Math.max(1, Math.ceil(width)); height = Math.max(1, Math.ceil(height));
      const key = `${width}x${height}`;
      const bucket = free.get(key);
      const reused = !!(bucket && bucket.length), canvas = reused ? bucket.pop() : makeCanvas(width, height);
      if (!canvas) throw new Error('当前环境无法创建离屏 Canvas');
      // Reassigning an unchanged Canvas dimension clears and reallocates its backing
      // store. Every consumer explicitly clears/draws its working surface, so reuse
      // must retain the existing backing store instead.
      if (canvas.width !== width) { canvas.width = width; backingSizeWrites += 1; }
      if (canvas.height !== height) { canvas.height = height; backingSizeWrites += 1; }
      acquires += 1; if (reused) reuses += 1;
      peakPixels = Math.max(peakPixels, width * height);
      return canvas;
    }
    function release(canvas) {
      if (!canvas) return;
      const key = `${canvas.width}x${canvas.height}`;
      const bucket = free.get(key) || []; bucket.push(canvas); free.set(key, bucket);
    }
    function beginFrame(){workPixels=0;pixelPasses=0;}
    function notePixels(width,height,passes){passes=Math.max(1,+passes||1);workPixels+=Math.max(1,Math.round(width))*Math.max(1,Math.round(height))*passes;pixelPasses+=passes;}
    function clear() { free.clear(); peakPixels = 0; acquires = 0; reuses = 0; backingSizeWrites = 0; beginFrame(); }
    return Object.freeze({ acquire, release, beginFrame, notePixels, clear, stats: () => ({ peakPixels, acquires, reuses, backingSizeWrites, workPixels, pixelPasses }) });
  }
  api.modules.surfaces = Object.freeze({ create });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:40-surface-pool.js> */

/* <vnext:50-mask-resolver.js> */
/* ToSampool Runtime vNext source module: static mask geometry, ready for alpha sources. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const IDENTITY = [1, 0, 0, 1, 0, 0];
  function multiply(left, right) { return [left[0] * right[0] + left[2] * right[1], left[1] * right[0] + left[3] * right[1], left[0] * right[2] + left[2] * right[3], left[1] * right[2] + left[3] * right[3], left[0] * right[4] + left[2] * right[5] + left[4], left[1] * right[4] + left[3] * right[5] + left[5]]; }
  function inverse(matrix) {
    const m = Array.isArray(matrix) && matrix.length === 6 ? matrix : IDENTITY, determinant = m[0] * m[3] - m[1] * m[2];
    if (!Number.isFinite(determinant) || Math.abs(determinant) < .0000001) return IDENTITY;
    return [m[3] / determinant, -m[1] / determinant, -m[2] / determinant, m[0] / determinant, (m[2] * m[5] - m[3] * m[4]) / determinant, (m[1] * m[4] - m[0] * m[5]) / determinant];
  }
  function followMatrix(mask, owner, frame) {
    if (!mask || !mask.follow || !owner || !frame || !frame.valuesFor) return IDENTITY;
    const values = frame.valuesFor(owner), current = values && values.worldMatrix, base = mask.followMatrix;
    if (!Array.isArray(current) || current.length !== 6 || !Array.isArray(base) || base.length !== 6) return IDENTITY;
    return multiply(current, inverse(base));
  }
  function transform(ctx, matrix) { if (matrix !== IDENTITY) ctx.transform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]); }
  function clipPath(ctx, mask) {
    if (!mask || !mask.type || mask.type === 'none') return false;
    ctx.beginPath();
    if (mask.type === 'rect') ctx.rect(+mask.x || 0, +mask.y || 0, Math.max(0, +mask.w || 0), Math.max(0, +mask.h || 0));
    else if (mask.type === 'ellipse') ctx.ellipse((+mask.x || 0) + (+mask.w || 0) / 2, (+mask.y || 0) + (+mask.h || 0) / 2, Math.abs(+mask.w || 0) / 2, Math.abs(+mask.h || 0) / 2, 0, 0, Math.PI * 2);
    else if (mask.type === 'poly' && Array.isArray(mask.points) && mask.points.length >= 3) {
      mask.points.forEach((point, index) => index ? ctx.lineTo(+point[0] || 0, +point[1] || 0) : ctx.moveTo(+point[0] || 0, +point[1] || 0));
      ctx.closePath();
    } else return false;
    return true;
  }
  function applyStatic(surface, mask, bounds, surfaces, owner, frame) {
    if (!mask || !['rect', 'ellipse', 'poly'].includes(mask.type)) return false;
    const ctx = surface && surface.getContext && surface.getContext('2d');
    if (!ctx || !clipPath) return false;
    // Canvas clipping constrains drawing but does not itself clear pixels outside
    // the path. Render through a temporary surface so the static mask is a real
    // crop rather than a no-op on browsers with optimized compositing.
    const clipped = surfaces.acquire(surface.width, surface.height), out = clipped.getContext('2d');
    out.clearRect(0, 0, clipped.width, clipped.height);
    const follow = followMatrix(mask, owner, frame);
    if (mask.invert) {
      // Start from the complete object and punch its absolute-coordinate mask
      // out.  The temporary surface is local to `bounds`, hence the translation.
      out.drawImage(surface, 0, 0); out.save(); out.translate(-bounds.x, -bounds.y); transform(out, follow);
      if (!clipPath(out, mask)) { out.restore(); surfaces.release(clipped); return false; }
      // clip() belongs to the saved Canvas state, so do not restore here: it
      // would discard the clip.  Instead cancel the path transform in-place.
      out.clip(); transform(out, inverse(follow)); out.clearRect(bounds.x, bounds.y, bounds.w, bounds.h); out.restore();
    } else {
      // Keep the transformed coordinate system while drawing: drawing at the
      // absolute bounds origin maps the source surface back to local (0, 0).
      out.save(); out.translate(-bounds.x, -bounds.y); transform(out, follow);
      if (!clipPath(out, mask)) { out.restore(); surfaces.release(clipped); return false; }
      // Same separation as the inverted branch: keep the clip, but cancel the
      // transform before placing the pre-rendered object capsule.
      out.clip(); transform(out, inverse(follow)); out.drawImage(surface, bounds.x, bounds.y); out.restore();
    }
    ctx.clearRect(0, 0, surface.width, surface.height); ctx.drawImage(clipped, 0, 0); surfaces.release(clipped);
    return true;
  }
  function compose(surface, alpha, invert) {
    const ctx = surface.getContext('2d'); ctx.save(); ctx.globalCompositeOperation = invert ? 'destination-out' : 'destination-in'; ctx.drawImage(alpha, 0, 0); ctx.restore();
  }
  function alphaAsset(scene, mask) {
    const raw = scene.assets && scene.assets[mask.assetId || mask.imageId]; return raw && (raw.image || raw.canvas || raw);
  }
  function applyAlpha(surface, mask, bounds, scene, surfaces, owner, frame) {
    const image = alphaAsset(scene, mask); if (!image) throw new Error(`Alpha 蒙版缺少素材：${mask.assetId || mask.imageId || '(空)'}`);
    const alpha = surfaces.acquire(surface.width, surface.height), ctx = alpha.getContext('2d'), x = Number.isFinite(+mask.x) ? +mask.x : 0, y = Number.isFinite(+mask.y) ? +mask.y : 0, w = Math.max(1, +mask.w || scene.width), h = Math.max(1, +mask.h || scene.height);
    ctx.clearRect(0, 0, alpha.width, alpha.height); ctx.save(); ctx.translate(-bounds.x, -bounds.y); transform(ctx, followMatrix(mask, owner, frame)); ctx.drawImage(image, x, y, w, h); ctx.restore();
    if (mask.mode === 'luma') {
      try { const pixels = ctx.getImageData(0, 0, alpha.width, alpha.height); for (let i = 0; i < pixels.data.length; i += 4) pixels.data[i + 3] = Math.round((pixels.data[i] * .2126 + pixels.data[i + 1] * .7152 + pixels.data[i + 2] * .0722) * (pixels.data[i + 3] / 255)); ctx.putImageData(pixels, 0, 0); }
      catch (error) { surfaces.release(alpha); throw new Error(`明度蒙版读取失败：${error.message || 'Canvas 可能被跨域素材污染'}`); }
    }
    compose(surface, alpha, !!mask.invert); surfaces.release(alpha); return true;
  }
  function applyElement(surface, mask, bounds, scene, frame, surfaces) {
    const source = scene.entities.find(entity => entity.id === mask.targetId); if (!source) throw new Error(`元素蒙版缺少来源：${mask.targetId || '(空)'}`);
    const alpha = surfaces.acquire(surface.width, surface.height), ctx = alpha.getContext('2d'); ctx.clearRect(0, 0, alpha.width, alpha.height); ctx.save(); ctx.translate(-bounds.x, -bounds.y); if (source.type === 'group') api.modules.content.drawGroup(ctx, scene, source, frame); else api.modules.content.draw(ctx, scene, source, frame.valuesFor(source), frame); ctx.restore(); compose(surface, alpha, !!mask.invert); surfaces.release(alpha); return true;
  }
  function apply(surface, mask, bounds, scene, frame, surfaces, owner) {
    if (!mask || !mask.type || mask.type === 'none') return false;
    if (['rect', 'ellipse', 'poly'].includes(mask.type)) return applyStatic(surface, mask, bounds, surfaces, owner, frame);
    if (mask.type === 'alpha') return applyAlpha(surface, mask, bounds, scene, surfaces, owner, frame);
    if (mask.type === 'element') return applyElement(surface, mask, bounds, scene, frame, surfaces);
    return false;
  }
  function maskOnlySources(scene) {
    const ids = new Set();
    function include(id) { ids.add(id); for (const child of scene.entities || []) if (child.parentId === id) include(child.id); }
    function inspect(mask) { if (mask && mask.type === 'element' && mask.sourceVisibility === 'mask-only') include(mask.targetId); }
    for (const owner of scene.entities || []) inspect(owner.effects && owner.effects.mask);
    const effects=scene.sceneEffects||{};
    for(const stage of ['overlay','sample'])for(const config of Object.values(effects[stage]||{}))inspect(config&&config.mask);
    return ids;
  }
  api.modules.masks = Object.freeze({ clipPath, apply, maskOnlySources, followMatrix });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:50-mask-resolver.js> */

/* <vnext:55-pattern-field.js> */
/* ToSampool Runtime vNext source module: shared procedural Pattern Field. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  // `cache` stores final, static stamps. `tileCache` stores the much smaller
  // repeat unit used by patterns whose period is exact.  Keeping these caches
  // separate lets animated phase only repaint a native CanvasPattern instead
  // of re-running the JS geometry loops every frame.
  const cache = new Map();
  const tileCache = new Map();
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function makeCanvas(width,height){if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(width,height);if(global.document&&global.document.createElement){const canvas=global.document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;}return null;}
  function polygon(ctx,cx,cy,radius,sides,roundness){
    if(roundness>=.98){ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.fill();return;}
    const vertices=Array.from({length:sides},(_,index)=>[cx+Math.cos(index*Math.PI*2/sides)*radius,cy+Math.sin(index*Math.PI*2/sides)*radius]),cut=clamp(roundness*.46,0,.46);
    ctx.beginPath();if(!cut){ctx.moveTo(vertices[0][0],vertices[0][1]);for(let index=1;index<vertices.length;index++)ctx.lineTo(vertices[index][0],vertices[index][1]);ctx.closePath();ctx.fill();return;}
    vertices.forEach((point,index)=>{const previous=vertices[(index+sides-1)%sides],next=vertices[(index+1)%sides],a=[point[0]+(previous[0]-point[0])*cut,point[1]+(previous[1]-point[1])*cut],b=[point[0]+(next[0]-point[0])*cut,point[1]+(next[1]-point[1])*cut];if(!index)ctx.moveTo(a[0],a[1]);else ctx.lineTo(a[0],a[1]);ctx.quadraticCurveTo(point[0],point[1],b[0],b[1]);});ctx.closePath();ctx.fill();
  }
  function pointShape(pattern){
    if(pattern.shape==='triangle')return{sides:3,roundness:0};
    if(pattern.shape==='square')return{sides:4,roundness:0};
    if(pattern.shape==='pentagon')return{sides:5,roundness:0};
    if(pattern.shape==='circle')return{sides:4,roundness:1};
    if(pattern.shape==='hexagon')return{sides:6,roundness:0};
    return{sides:Math.max(3,Math.min(6,Math.round(finite(pattern.sides,4)))),roundness:clamp(finite(pattern.roundness,0),0,1)};
  }
  function motionStep(raw,time){const motion=raw&&raw.motion||{};if(!motion.enabled)return raw;const period=Math.max(.001,finite(motion.period,2)),phase=((finite(time,0)/period)%1+1)%1,steps=Math.max(1,Math.round(finite(motion.steps,8)));
    // Grain is not a translated geometric tile.  Legacy-style noise refreshes
    // a sparse deterministic dot set each tick, while keeping its footprint
    // and object-alpha clip intact.
    if(raw&&raw.type==='noise'&&(motion.type==='noise-snow'||motion.type==='random-hold'))return Object.assign({},raw,{noiseTick:Math.floor(finite(time,0)/period*steps),motion:Object.assign({},motion)});
    const layer=raw&&Array.isArray(raw.layers)&&raw.layers[0],fallback=layer?finite(layer.spacing,finite(layer.width,1)+Math.max(0,finite(layer.gap,3))):4,type=motion.type==='texture-drift'?'pattern-drift':motion.type==='random-hold'?'pattern-random':motion.type,spacing=Math.max(1,finite(raw&&raw.spacing,finite(raw&&raw.cell,fallback))),next=Object.assign({},raw,{motion:Object.assign({},motion,{type})});
    if(type==='pattern-drift'){const steps=Math.max(1,Math.round(finite(motion.steps,16))),tick=Math.floor(phase*steps)%steps,progress=tick/steps;next.phaseX=finite(raw.phaseX,0)+progress*Math.round(finite(motion.cyclesX,1))*spacing;next.phaseY=finite(raw.phaseY,0)+progress*Math.round(finite(motion.cyclesY,0))*spacing;}
    else if(type==='pattern-step'){const steps=Math.max(1,Math.round(finite(motion.steps,8))),tick=Math.floor(phase*steps)%steps;next.phaseX=finite(raw.phaseX,0)+tick*Math.round(finite(motion.stepX,1));next.phaseY=finite(raw.phaseY,0)+tick*Math.round(finite(motion.stepY,0));}
    else if(type==='pattern-random'){const steps=Math.max(1,Math.round(finite(motion.steps,8))),tick=Math.floor(phase*steps)%steps,seed=(Math.imul((Math.round(finite(motion.seed,1))+tick+1)|0,1103515245)+12345)>>>0,rangeX=Math.max(0,finite(motion.rangeX,1))*spacing,rangeY=Math.max(0,finite(motion.rangeY,1))*spacing;next.phaseX=finite(raw.phaseX,0)+Math.round(((seed&65535)/65535*2-1)*rangeX);next.phaseY=finite(raw.phaseY,0)+Math.round((((seed>>>16)&65535)/65535*2-1)*rangeY);}
    else if(type==='pattern-pulse'){const steps=Math.max(2,Math.round(finite(motion.steps,6))),tick=Math.floor(phase*steps)%steps,wave=Math.sin(tick/steps*Math.PI*2),amount=clamp(finite(motion.amount,.35),0,1);if(Array.isArray(raw.layers)){next.layers=raw.layers.map(layer=>Object.assign({},layer,{width:Math.max(1,Math.round(finite(layer.width,1)*(1+wave*amount)))}));}else next.size=Math.max(1,Math.round(finite(raw.size,3)*(1+wave*amount)));}
    return next;
  }
  function canonical(raw,color){
    const source=raw||{},type=['lines','dots','checker','noise'].includes(source.type)?source.type:'lines',result={type,color:source.color&&source.color!=='inherit'?source.color:(color||'#ffffff'),phaseX:finite(source.phaseX,0),phaseY:finite(source.phaseY,0)};
    if(type==='noise'){result.density=clamp(finite(source.density,.15),0,1);result.size=Math.max(1,Math.round(finite(source.size,1)));result.seed=Math.round(finite(source.seed,1));result.noiseTick=Math.round(finite(source.noiseTick,0));return result;}
    if(type==='lines'){
      result.layers=(Array.isArray(source.layers)&&source.layers.length?source.layers:[{angle:45,width:1,gap:3}]).slice(0,3).map(layer=>{const width=Math.max(1,finite(layer&&layer.width,1)),spacing=Math.max(width,finite(layer&&layer.spacing,width+Math.max(0,finite(layer&&layer.gap,3))));return{angle:finite(layer&&layer.angle,45),width,spacing,gap:Math.max(0,spacing-width)};});
      return result;
    }
    result.size=Math.max(1,finite(source.size,3));result.cell=Math.max(result.size,finite(source.cell,finite(source.spacing,result.size+Math.max(0,finite(source.gap,2)))));result.spacing=result.cell;result.gap=Math.max(0,result.cell-result.size);result.phase=clamp(finite(source.phase,type==='checker'?.5:0),0,1);result.angle=finite(source.angle,0);result.layout=source.layout==='stagger'?'stagger':type==='checker'?'checker':'regular';Object.assign(result,pointShape(source));return result;
  }
  function keyFor(width,height,pattern,color){return JSON.stringify({width,height,pattern:canonical(pattern,color)});}
  function axisAngle(value){const angle=((finite(value,0)%180)+180)%180;return Math.abs(angle)<.001||Math.abs(angle-90)<.001?Math.round(angle):null;}
  function gcd(a,b){a=Math.abs(a|0);b=Math.abs(b|0);while(b){const next=a%b;a=b;b=next;}return a||1;}
  function lcm(a,b){return Math.abs(a*b)/gcd(a,b);}
  function integerPeriod(value){const n=Math.round(value);return Math.abs(value-n)<.001&&n>0?n:null;}
  function tileSpec(raw,color){
    const pattern=canonical(raw,color);
    if(pattern.type==='dots'||pattern.type==='checker'){
      const angle=axisAngle(pattern.angle);if(angle!==0||pattern.layout==='stagger')return null;
      const step=integerPeriod(pattern.cell||Math.max(pattern.size+1,pattern.size+pattern.gap));if(!step)return null;
      // Checker occupancy repeats every two cells; dots repeat every cell.
      const period=pattern.type==='checker'?step*2:step;
      if(period>512)return null;
      return { pattern, width:period, height:period, kind:'points' };
    }
    if(pattern.type!=='lines')return null;
    let width=1,height=1;
    for(const layer of pattern.layers){
      const angle=axisAngle(layer.angle),period=integerPeriod(layer.spacing==null?layer.width+layer.gap:layer.spacing);
      if(angle==null||!period)return null;
      if(angle===0)height=lcm(height,period);else width=lcm(width,period);
      if(width>512||height>512)return null;
    }
    return { pattern, width, height, kind:'lines' };
  }
  function tileKey(spec){const pattern=Object.assign({},spec.pattern,{phaseX:0,phaseY:0});return JSON.stringify({width:spec.width,height:spec.height,pattern});}
  function paintTile(ctx,spec){
    const pattern=spec.pattern,W=spec.width,H=spec.height;ctx.clearRect(0,0,W,H);ctx.fillStyle=pattern.color;
    if(spec.kind==='lines'){
      for(const layer of pattern.layers){const angle=axisAngle(layer.angle);if(angle===0)ctx.fillRect(0,0,W,layer.width);else ctx.fillRect(0,0,layer.width,H);}
      return;
    }
    const checker=pattern.type==='checker',step=checker?W/2:W;
    for(let row=0;row<(checker?2:1);row++)for(let column=0;column<(checker?2:1);column++){
      if(checker&&((row+column)&1))continue;
      polygon(ctx,column*step+(checker?0:step/2),row*step+(checker?0:step/2),checker?step/2:pattern.size/2,checker?4:pattern.sides,checker?0:pattern.roundness);
    }
  }
  function repeatingTexture(width,height,raw,color){
    const spec=tileSpec(raw,color);if(!spec)return null;
    const key=tileKey(spec);let tile=tileCache.get(key);
    if(!tile){tile=makeCanvas(spec.width,spec.height);const tileCtx=tile&&tile.getContext&&tile.getContext('2d');if(!tileCtx)return null;paintTile(tileCtx,spec);tileCache.set(key,tile);if(tileCache.size>32)tileCache.delete(tileCache.keys().next().value);}
    const result=makeCanvas(width,height),ctx=result&&result.getContext&&result.getContext('2d');if(!ctx||typeof ctx.createPattern!=='function')return null;
    const brush=ctx.createPattern(tile,'repeat');if(!brush)return null;
    const pattern=spec.pattern;ctx.save();ctx.translate(finite(pattern.phaseX,0),finite(pattern.phaseY,0));ctx.fillStyle=brush;ctx.fillRect(-finite(pattern.phaseX,0),-finite(pattern.phaseY,0),width,height);ctx.restore();return result;
  }
  function paint(ctx,width,height,raw,color){
    const pattern=canonical(raw,color),extent=Math.ceil(Math.hypot(width,height))+24;ctx.fillStyle=pattern.color;
    if(pattern.type==='noise'){
      // Matches the useful Legacy grain character: sparse final-size squares,
      // not a full getImageData recolour pass.  It is deterministic for a
      // given seed/tick and remains cheap at large canvas dimensions.
      const dots=Math.min(360,Math.max(1,Math.round(width*height*pattern.density/14))),hash=(index,salt)=>{const value=Math.sin((index+1)*12.9898+(pattern.seed+1)*78.233+(pattern.noiseTick+1)*37.719+salt*19.17)*43758.5453;return value-Math.floor(value);};
      for(let index=0;index<dots;index++)ctx.fillRect(Math.floor(hash(index,1)*width),Math.floor(hash(index,2)*height),pattern.size,pattern.size);
      return pattern;
    }
    if(pattern.type==='lines'){
      for(const layer of pattern.layers){const step=Math.max(1,layer.spacing==null?layer.width+layer.gap:layer.spacing),angle=layer.angle*Math.PI/180;ctx.save();ctx.translate(width/2,height/2);ctx.rotate(angle);for(let y=-extent+pattern.phaseY;y<=extent;y+=step)ctx.fillRect(-extent+pattern.phaseX,y,extent*2,layer.width);ctx.restore();}return pattern;
    }
    const checker=pattern.type==='checker'||pattern.layout==='checker',step=pattern.cell||Math.max(pattern.size+1,pattern.size+pattern.gap),count=Math.ceil(extent/step)+2,angle=pattern.angle*Math.PI/180;ctx.save();ctx.translate(width/2,height/2);ctx.rotate(angle);
    for(let row=-count;row<=count;row++){const offset=(pattern.layout==='stagger'||checker)?Math.abs(row)%2*pattern.phase*step:0;for(let column=-count;column<=count;column++){if(checker&&((row+column)&1))continue;polygon(ctx,column*step+offset+pattern.phaseX,row*step+pattern.phaseY,pattern.size/2,checker?4:pattern.sides,checker?0:pattern.roundness);}}
    ctx.restore();return pattern;
  }
  function texture(width,height,pattern,color,options){const W=Math.max(1,Math.round(width)),H=Math.max(1,Math.round(height)),source=options&&options.time!=null?motionStep(pattern,options.time):pattern,dynamic=!!(options&&options.dynamic),key=keyFor(W,H,source,color);if(!dynamic&&cache.has(key))return cache.get(key);const repeated=repeatingTexture(W,H,source,color);const canvas=repeated||makeCanvas(W,H),ctx=canvas&&canvas.getContext&&canvas.getContext('2d');if(!ctx)return null;if(!repeated){ctx.clearRect(0,0,W,H);paint(ctx,W,H,source,color);}if(!dynamic){cache.set(key,canvas);if(cache.size>16)cache.delete(cache.keys().next().value);}return canvas;}
  function overlay(config){
    const value=config||{},scale=Math.max(.1,finite(value.scale,1)),spacing=Math.max(1,Math.round(finite(value.spacing,4)*scale)),size=Math.min(spacing,Math.max(1,Math.round(finite(value.size,1)*scale))),style=value.texture||'lines-horizontal',angle=finite(value.angle,0),phaseX=finite(value.phaseX,0),phaseY=finite(value.phaseY,0),common={color:value.color||'#ffffff',phaseX,phaseY,motion:value.motion};
    if(style==='noise')return Object.assign(common,{type:'noise',density:clamp(finite(value.noiseDensity,.15),0,1),size:Math.max(1,Math.round(finite(value.noiseSize,1))),seed:Math.round(finite(value.noiseSeed,1))});
    if(style==='dots')return Object.assign(common,{type:'dots',size,spacing,cell:spacing,angle,phase:clamp(finite(value.rowPhase,.5),0,1),shape:value.shape||'circle',layout:value.layout==='stagger'?'stagger':'regular'});
    if(style==='checker')return Object.assign(common,{type:'checker',size:spacing,gap:0,cell:spacing,angle,phase:.5,layout:'checker'});
    const layers=[{angle,width:size,spacing}];if(style==='grid')layers.push({angle:angle+90,width:size,spacing});if(style==='lines-layers'){layers.push({angle:finite(value.layer2Angle,angle+90),width:Math.min(Math.max(1,finite(value.layer2Width,1)),Math.max(1,finite(value.layer2Spacing,spacing))),spacing:Math.max(1,finite(value.layer2Spacing,spacing))});layers.push({angle:finite(value.layer3Angle,angle+135),width:Math.min(Math.max(1,finite(value.layer3Width,1)),Math.max(1,finite(value.layer3Spacing,spacing))),spacing:Math.max(1,finite(value.layer3Spacing,spacing))});}return Object.assign(common,{type:'lines',layers});
  }
  function clear(){cache.clear();tileCache.clear();}
  api.modules.pattern=Object.freeze({ canonical, paint, texture, overlay, motionStep, clear });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:55-pattern-field.js> */

/* <vnext:60-content-renderer.js> */
/* ToSampool Runtime vNext source module: base content only, before vNext effects. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  // Host adapters may hand the Runtime a CanvasImageSource directly or wrap it
  // as { image }, { canvas }, or { bitmap }.  Serialized scene data keeps only
  // the locator; the resolved drawable stays in this non-serialized asset map.
  function drawable(raw) {
    if (!raw) return null;
    if (raw.image || raw.canvas || raw.bitmap) return raw.image || raw.canvas || raw.bitmap;
    // Persisted asset descriptors are deliberately not drawable. The host must
    // resolve their locator and inject a matching runtimeAssets entry first.
    if (typeof raw === 'object' && Object.prototype.hasOwnProperty.call(raw, 'locator')) return null;
    return raw;
  }
  function asset(scene, id) { return drawable(scene.assets && scene.assets[id]); }
  function assetFrame(scene, id, time, source) {
    const raw = scene.assets && scene.assets[id]; if (!raw) return null;
    const frames = Array.isArray(raw.frames) && raw.frames.length ? raw.frames : null;
    if (!frames) return drawable(raw);
    const fps = Math.max(.1, +(source && source.fps) || +raw.fps || 8), count = frames.length, index = source && source.frameLoop === false || raw.frameLoop === false ? Math.min(count - 1, Math.floor(Math.max(0, time) * fps)) : Math.floor(Math.max(0, time) * fps) % count;
    return drawable(frames[index]);
  }
  function roundedRect(ctx, x, y, w, h, radius) {
    const r = Math.max(0, Math.min(+radius || 0, Math.abs(w) / 2, Math.abs(h) / 2));
    if (!r) { ctx.rect(x, y, w, h); return; }
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  }
  function patternTexture(scene,part,time){const pat=part.fillPattern,color=pat.color&&pat.color!=='inherit'?pat.color:(part.fill||'#ffffff');return api.modules.pattern.texture(Math.max(1,scene.width),Math.max(1,scene.height),pat,color,{time:time||0,dynamic:!!(pat.motion&&pat.motion.enabled)});}
  function partMotion(part, time) {
    const out=Object.assign({},part),anim=part.anim||{},phase=time*Math.PI*2,curve=(period,mode)=>api.modules.frame.curve(time/Math.max(.001,+period||1),mode);
    if(anim.bob&&Number.isFinite(+anim.bob.amount)){const offset=curve(anim.bob.period,anim.bob.curve)*+anim.bob.amount,angle=(Number.isFinite(+anim.bob.angle)?+anim.bob.angle:90)*Math.PI/180,dx=Math.cos(angle)*offset,dy=Math.sin(angle)*offset;out.x=(+out.x||0)+dx;out.y=(+out.y||0)+dy;if(out.type==='line'){out.x2=(+out.x2||0)+dx;out.y2=(+out.y2||0)+dy;}}
    if(anim.scroll&&Number.isFinite(+anim.scroll.speed)){const angle=(+anim.scroll.angle||0)*Math.PI/180,span=Math.max(0,+anim.scroll.span||0),raw=time*+anim.scroll.speed,distance=anim.scroll.repeat!==false&&span>0?((raw%span)+span)%span:raw,dx=Math.cos(angle)*distance,dy=Math.sin(angle)*distance;out.x=(+out.x||0)+dx;out.y=(+out.y||0)+dy;if(out.type==='line'){out.x2=(+out.x2||0)+dx;out.y2=(+out.y2||0)+dy;}}
    if(anim.spin&&Number.isFinite(+anim.spin.speed))out.rot=(+out.rot||0)+time*+anim.spin.speed;
    if(anim.blink&&Number.isFinite(+anim.blink.amount))out.alpha=(out.alpha==null?1:+out.alpha)*(1-Math.max(0,Math.min(1,+anim.blink.amount))*((curve(anim.blink.period,anim.blink.curve)+1)/2));
    if(anim.pulse&&Number.isFinite(+anim.pulse.amount)){const scale=1+curve(anim.pulse.period,anim.pulse.curve)*+anim.pulse.amount;out.scaleX=(Number.isFinite(+out.scaleX)?+out.scaleX:1)*scale;out.scaleY=(Number.isFinite(+out.scaleY)?+out.scaleY:1)*scale;}
    if(anim.wave&&Number.isFinite(+anim.wave.amount))out.rot=(+out.rot||0)+Math.sin(phase/Math.max(.001,+anim.wave.period||1))*+anim.wave.amount;
    return out;
  }
  function partBox(part){if(part.type==='line'){const x=Math.min(+part.x||0,+part.x2||0),y=Math.min(+part.y||0,+part.y2||0);return{x,y,w:Math.max(1,Math.abs((+part.x2||0)-(+part.x||0))),h:Math.max(1,Math.abs((+part.y2||0)-(+part.y||0)))};}return{x:+part.x||0,y:+part.y||0,w:Math.max(1,+part.w||1),h:Math.max(1,+part.h||1)};}
  function paintPath(ctx, part, scene, origin, time) {
    const pattern=part.fillPattern&&part.fillPattern.type&&part.fillPattern.type!=='none'?part.fillPattern:null,solid=part.fill&&(!pattern||pattern.mode!=='replace');
    if(solid&&part.type!=='line'){ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,part.fillAlpha==null?1:+part.fillAlpha));ctx.fillStyle=pattern&&pattern.mode==='overlay'?(pattern.baseColor||part.fill):part.fill;ctx.fill();ctx.restore();}
    if(pattern&&part.type!=='line'){const texture=patternTexture(scene,part,time);if(texture){ctx.save();ctx.clip();if(ctx.setTransform)ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha*=Math.max(0,Math.min(1,pattern.opacity==null?1:+pattern.opacity));ctx.drawImage(texture,-(origin&&origin.x||0),-(origin&&origin.y||0));ctx.restore();}}
    if(part.stroke&&Math.max(0,+part.strokeWidth||0)>0){ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,part.strokeAlpha==null?1:+part.strokeAlpha));ctx.strokeStyle=part.stroke;ctx.lineWidth=Math.max(0,+part.strokeWidth||0);ctx.stroke();ctx.restore();}
  }
  function drawPart(ctx, raw, ownerW, ownerH, time, scene, origin) {
    if(!raw||raw.hidden)return;const part=partMotion(raw,time||0),box=partBox(part),cx=box.x+box.w/2,cy=box.y+box.h/2;
    ctx.save();ctx.translate(-ownerW/2,-ownerH/2);ctx.globalAlpha*=Math.max(0,Math.min(1,part.alpha==null?1:+part.alpha));ctx.globalCompositeOperation=part.blend&&part.blend!=='normal'?part.blend:'source-over';ctx.translate(cx,cy);ctx.rotate((+part.rot||0)*Math.PI/180);ctx.scale(Number.isFinite(+part.scaleX)?+part.scaleX:1,Number.isFinite(+part.scaleY)?+part.scaleY:1);ctx.translate(-cx,-cy);ctx.beginPath();
    if(part.type==='ellipse')ctx.ellipse(box.x+box.w/2,box.y+box.h/2,box.w/2,box.h/2,0,0,Math.PI*2);
    else if(part.type==='line'){ctx.moveTo(+part.x||0,+part.y||0);ctx.lineTo(+part.x2||0,+part.y2||0);}
    else if(part.type==='poly'&&Array.isArray(part.points)&&part.points.length>=3){part.points.forEach((point,index)=>{const x=box.x+(+point[0]||0)*box.w,y=box.y+(+point[1]||0)*box.h;if(index)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();}
    else {roundedRect(ctx,box.x,box.y,box.w,box.h,part.radius);ctx.closePath();}
    paintPath(ctx,part,scene,origin,time);ctx.restore();
  }
  function drawParts(ctx, entity, values, frame, scene, origin){for(const part of entity.parts||[])drawPart(ctx,part,values.w,values.h,frame&&frame.time||0,scene,origin);}
  function draw(ctx, scene, entity, values, frame, origin) {
    if (entity.type === 'group') return;
    const w = values.w, h = values.h;
    ctx.save();
    if (values.parentMatrix && ctx.transform) ctx.transform(...values.parentMatrix);
    /* An effected object is built at full Alpha in a transparent capsule.
       Both its opacity and blend belong to the final scene composite, after
       mask/decorate/sample work; otherwise an outer decoration leaks through
       the object's own semi-transparent source. */
    const deferComposite=origin&&origin.deferComposite;
    ctx.globalAlpha *= deferComposite?1:(values.parentAlpha == null ? 1 : values.parentAlpha) * values.alpha;
    ctx.globalCompositeOperation = deferComposite ? 'source-over' : ({normal:'source-over',screen:'screen',multiply:'multiply',lighter:'lighter'})[values.blend || entity.blend || 'normal'] || 'source-over';
    const pivot=api.modules.frame.pivotFor(values);
    ctx.translate(values.x + pivot.x, values.y + pivot.y);
    ctx.rotate(values.rot * Math.PI / 180);
    ctx.scale(values.scaleX, values.scaleY);
    ctx.translate(w / 2 - pivot.x, h / 2 - pivot.y);
    ctx.fillStyle = values.fill || '#ffffff';
    ctx.strokeStyle = values.stroke || '#000000';
    ctx.lineWidth = Math.max(0, +values.strokeWidth || 0);
    if (entity.type === 'builtin') { api.modules.builtins.render(ctx, entity, values, frame); drawParts(ctx, entity, values, frame, scene, origin); }
    else if (entity.type === 'vector') { drawParts(ctx, entity, values, frame, scene, origin); }
    else if (entity.type === 'ellipse') { ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); paintPath(ctx,Object.assign({},values,{type:'ellipse'}),scene,origin,frame&&frame.time||0); }
    else if (entity.type === 'poly' && Array.isArray(values.points) && values.points.length >= 3) { ctx.beginPath(); values.points.forEach((point, index) => { const x = (+point[0] - .5) * w, y = (+point[1] - .5) * h; if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); paintPath(ctx,Object.assign({},values,{type:'poly'}),scene,origin,frame&&frame.time||0); }
    else if (entity.type === 'line') { ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); paintPath(ctx,Object.assign({},values,{type:'line'}),scene,origin,frame&&frame.time||0); }
    else if (entity.type === 'text') {
      const raster = values.rasterAssetId && asset(scene, values.rasterAssetId);
      if (raster && ctx.drawImage) ctx.drawImage(raster, -w / 2, -h / 2, w, h);
      else {
        const size=Math.max(1,+values.fontSize||16),tracking=+values.letterSpacing||0,lineHeight=Math.max(.5,+values.lineHeight||1.25),lines=String(values.text||'').split('\n');ctx.font=`${size}px ${values.fontFamily||'sans-serif'}`;ctx.textBaseline='top';
        lines.forEach((line,row)=>{let x=-w/2;for(const char of Array.from(line)){ctx.fillText(char,x,-h/2+row*size*lineHeight);x+=ctx.measureText?ctx.measureText(char).width+tracking:size*.6+tracking;}});
      }
      drawParts(ctx, entity, values, frame, scene, origin);
    }
    else if (entity.type === 'image') {
      const image = assetFrame(scene, entity.assetId, frame && frame.time || 0, entity);
      if (!image) throw new Error(`图片实体「${entity.id}」缺少已解析素材：${entity.assetId || '(空)'}`);
      if (ctx.drawImage) ctx.drawImage(image, -w / 2, -h / 2, w, h);
      drawParts(ctx, entity, values, frame, scene, origin);
    }
    else if (entity.type === 'rect') { if(!values.fillPattern&&!+values.radius){if(values.fill){ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,values.fillAlpha==null?1:+values.fillAlpha));ctx.fillStyle=values.fill;ctx.fillRect(-w/2,-h/2,w,h);ctx.restore();}if(values.stroke&&Math.max(0,+values.strokeWidth||0)>0){ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,values.strokeAlpha==null?1:+values.strokeAlpha));ctx.strokeStyle=values.stroke;ctx.lineWidth=Math.max(0,+values.strokeWidth||0);ctx.strokeRect(-w/2,-h/2,w,h);ctx.restore();}}else{ctx.beginPath();roundedRect(ctx,-w/2,-h/2,w,h,values.radius);ctx.closePath();paintPath(ctx,Object.assign({},values,{type:'rect'}),scene,origin,frame&&frame.time||0);}drawParts(ctx, entity, values, frame, scene, origin); }
    else { ctx.fillRect(-w / 2, -h / 2, w, h); if (ctx.lineWidth) ctx.strokeRect(-w / 2, -h / 2, w, h); drawParts(ctx, entity, values, frame, scene, origin); }
    ctx.restore();
  }
  function drawGroup(ctx, scene, group, frame) {
    for (const entity of scene.entities) {
      if (entity.parentId !== group.id) continue;
      if (entity.type === 'group') drawGroup(ctx, scene, entity, frame);
      else draw(ctx, scene, entity, frame.valuesFor(entity), frame);
    }
  }
  function drawBackground(ctx, scene, frame) {
    const layers = scene.background && scene.background.layers || [];
    for (const layer of layers) { if (!layer || layer.hidden || !layer.assetId) continue; const image = assetFrame(scene, layer.assetId, frame && frame.time || 0, layer); if (!image || !ctx.drawImage) continue; const alpha = Math.max(0, Math.min(1, layer.alpha == null ? 1 : +layer.alpha)); if (!alpha) continue; const w = Math.max(1, +layer.w || image.width || scene.width), h = Math.max(1, +layer.h || image.height || scene.height); ctx.save(); ctx.globalAlpha *= alpha; if (layer.layout === 'stretch') ctx.drawImage(image, 0, 0, scene.width, scene.height); else if (layer.layout === 'tile') { for (let y = (+layer.y || 0) - h; y < scene.height; y += h) for (let x = (+layer.x || 0) - w; x < scene.width; x += w) ctx.drawImage(image, x, y, w, h); } else ctx.drawImage(image, +layer.x || 0, +layer.y || 0, w, h); ctx.restore(); }
  }
  api.modules.content = Object.freeze({ draw, drawPart, drawParts, drawGroup, asset, assetFrame, drawBackground });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:60-content-renderer.js> */

/* <vnext:65-decorate-effects.js> */
/* ToSampool Runtime vNext source module: first object decorate primitives. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const active = (group, id) => group && group[id] && group[id].enabled ? group[id] : null;
  const alpha = value => Math.max(0, Math.min(1, Number.isFinite(+value) ? +value : 1));
  const blend = value => ({normal:'source-over',screen:'screen',multiply:'multiply',lighter:'lighter'})[value || 'normal'] || 'source-over';
  function animated(id,config,time){
    const motion=config&&config.motion;if(!motion||!motion.enabled)return config;const next=Object.assign({},config),period=Math.max(.001,+motion.period||1),phase=((time/period)%1+1)%1;
    if(id==='tint-overlay'&&(motion.type==='fade'||motion.type==='blink')){const amount=alpha(motion.amount),wave=motion.type==='blink'?(Math.floor(phase*Math.max(2,Math.round(+motion.steps||2)))%2):((Math.sin(phase*Math.PI*2)+1)/2);next.alpha=alpha((+config.alpha||0)*(1-amount*wave));}
    if(id==='texture-overlay'&&['pattern-drift','pattern-step','pattern-random','pattern-pulse','texture-drift','random-hold','noise-snow'].includes(motion.type))next._patternTime=time;
    return next;
  }
  function tintedSurface(source, surfaces, color, opacity, dx, dy) {
    const target = surfaces.acquire(source.width, source.height), ctx = target.getContext('2d');
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.drawImage(source, dx || 0, dy || 0);
    ctx.globalCompositeOperation = 'source-in'; ctx.globalAlpha = alpha(opacity); ctx.fillStyle = color || '#000000'; ctx.fillRect(0, 0, target.width, target.height);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    return target;
  }
  function projection(source, config, surfaces) {
    const angle = (+config.angle || 0) * Math.PI / 180, distance = Math.max(0, +config.distance || 0);
    const tint = tintedSurface(source, surfaces, config.color, config.alpha, Math.cos(angle) * distance, Math.sin(angle) * distance);
    const output = surfaces.acquire(source.width, source.height), ctx = output.getContext('2d');
    ctx.clearRect(0, 0, output.width, output.height); ctx.globalCompositeOperation=blend(config.blend);ctx.drawImage(tint, 0, 0);ctx.globalCompositeOperation='source-over';ctx.drawImage(source, 0, 0); surfaces.release(tint); return output;
  }
  function outline(source, config, surfaces) {
    const width = Math.max(1, Math.round(+config.width || 1));
    // A previous radial fill stamped every radius in every direction. At width 16
    // it made roughly 1,600 full-size copies of a 1920px image. Use a bounded,
    // pixelated silhouette expansion instead: the source is reduced only for the
    // outline alpha, then composited behind the original at a capped set of offsets.
    const divisor = width >= 4 ? Math.min(4, Math.max(1, Math.floor(width / 4))) : 1;
    const workW = Math.max(1, Math.ceil(source.width / divisor)), workH = Math.max(1, Math.ceil(source.height / divisor));
    const tint = surfaces.acquire(workW, workH), tintCtx = tint.getContext('2d');
    tintCtx.clearRect(0, 0, workW, workH); tintCtx.imageSmoothingEnabled = false;
    tintCtx.drawImage(source, 0, 0, workW, workH);
    tintCtx.globalCompositeOperation = 'source-in'; tintCtx.globalAlpha = alpha(config.alpha); tintCtx.fillStyle = config.color || '#000000'; tintCtx.fillRect(0, 0, workW, workH);
    tintCtx.globalCompositeOperation = 'source-over'; tintCtx.globalAlpha = 1;
    const output = surfaces.acquire(source.width, source.height), ctx = output.getContext('2d');
    ctx.clearRect(0, 0, output.width, output.height); ctx.imageSmoothingEnabled = false;
    const points = Math.min(24, Math.max(8, Math.ceil(Math.PI * 2 * Math.sqrt(width))));
    ctx.globalCompositeOperation=blend(config.blend);
    for (let i = 0; i < points; i++) {
      const a = i / points * Math.PI * 2;
      ctx.drawImage(tint, Math.round(Math.cos(a) * width), Math.round(Math.sin(a) * width), source.width, source.height);
    }
    ctx.globalCompositeOperation='source-over';ctx.drawImage(source, 0, 0); surfaces.release(tint); return output;
  }
  function tintOverlay(source, config, surfaces) {
    const tint = tintedSurface(source, surfaces, config.color, config.alpha, 0, 0);
    const output = surfaces.acquire(source.width, source.height), ctx = output.getContext('2d');
    ctx.clearRect(0, 0, output.width, output.height); ctx.drawImage(source, 0, 0);
    ctx.globalCompositeOperation = ['normal', 'screen', 'multiply', 'lighter'].includes(config.blend) ? config.blend : 'source-over';
    ctx.drawImage(tint, 0, 0); ctx.globalCompositeOperation = 'source-over'; surfaces.release(tint); return output;
  }
  function textureAlpha(source, config, surfaces) {
    // Fill patterns and texture overlays intentionally share the same Pattern
    // Field geometry.  This branch only adds the object-alpha clipping and
    // blend semantics that belong to the decorate stage.
    const texture = surfaces.acquire(source.width, source.height), ctx = texture.getContext('2d'), pattern = api.modules.pattern.overlay(config), stamp = api.modules.pattern.texture(source.width, source.height, pattern, pattern.color,{time:config._patternTime==null?0:config._patternTime,dynamic:!!(config.motion&&config.motion.enabled)});
    ctx.clearRect(0, 0, texture.width, texture.height);ctx.globalAlpha=alpha(config.alpha);if(stamp)ctx.drawImage(stamp,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(source, 0, 0); ctx.globalCompositeOperation = 'source-over'; return texture;
  }
  function textureOverlay(source, config, surfaces) {
    const texture = textureAlpha(source, config, surfaces), output = surfaces.acquire(source.width, source.height), ctx = output.getContext('2d');
    ctx.clearRect(0, 0, output.width, output.height); ctx.drawImage(source, 0, 0); ctx.globalCompositeOperation = ['normal', 'screen', 'multiply', 'lighter'].includes(config.blend) ? config.blend : 'source-over'; ctx.drawImage(texture, 0, 0); ctx.globalCompositeOperation = 'source-over'; surfaces.release(texture); return output;
  }
  /* A glow is not a stack of full outlines: that would add their alpha and
     make the band nearest the edge much brighter than its declared opacity.
     Build non-overlapping alpha rings instead.  For size 6 / layers 3 these
     rings are [0..2], [2..4], [4..6] at 1, 2/3 and 1/3 opacity. */
  function copyAlpha(source, surfaces) {
    const result=surfaces.acquire(source.width,source.height),ctx=result.getContext('2d');ctx.clearRect(0,0,result.width,result.height);ctx.drawImage(source,0,0);return result;
  }
  function ringPoints(radius){return Math.min(24,Math.max(8,Math.ceil(Math.PI*2*Math.sqrt(Math.max(1,radius)))));}
  function expandedAlpha(source,radius,surfaces){
    if(radius<=0)return copyAlpha(source,surfaces);
    const divisor=radius>=4?Math.min(4,Math.max(1,Math.floor(radius/4))):1,workW=Math.max(1,Math.ceil(source.width/divisor)),workH=Math.max(1,Math.ceil(source.height/divisor)),small=surfaces.acquire(workW,workH),smallCtx=small.getContext('2d'),result=surfaces.acquire(source.width,source.height),ctx=result.getContext('2d');
    smallCtx.clearRect(0,0,workW,workH);smallCtx.imageSmoothingEnabled=false;smallCtx.drawImage(source,0,0,workW,workH);ctx.clearRect(0,0,result.width,result.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(small,0,0,source.width,source.height);
    const points=ringPoints(radius);for(let i=0;i<points;i++){const theta=i/points*Math.PI*2;ctx.drawImage(small,Math.round(Math.cos(theta)*radius),Math.round(Math.sin(theta)*radius),source.width,source.height);}surfaces.release(small);return result;
  }
  function erodedAlpha(source,radius,surfaces){
    const result=copyAlpha(source,surfaces);if(radius<=0)return result;const ctx=result.getContext('2d'),points=ringPoints(radius);ctx.globalCompositeOperation='source-in';for(let i=0;i<points;i++){const theta=i/points*Math.PI*2;ctx.drawImage(source,Math.round(Math.cos(theta)*radius),Math.round(Math.sin(theta)*radius));}ctx.globalCompositeOperation='source-over';return result;
  }
  function subtractAlpha(target,cut){const ctx=target.getContext('2d');ctx.globalCompositeOperation='destination-out';ctx.drawImage(cut,0,0);ctx.globalCompositeOperation='source-over';}
  function lightHalo(source,config,surfaces,inward){
    const size=Math.max(1,Math.round(+config.size||1)),requested=Math.max(1,Math.min(6,Math.round(+config.layers||2))),layers=Math.min(requested,size),halo=surfaces.acquire(source.width,source.height),haloCtx=halo.getContext('2d');haloCtx.clearRect(0,0,halo.width,halo.height);
    let previous=copyAlpha(source,surfaces);
    for(let index=0;index<layers;index++){
      const radius=Math.max(1,Math.round(size*(index+1)/layers)),next=inward?erodedAlpha(source,radius,surfaces):expandedAlpha(source,radius,surfaces),ring=inward?copyAlpha(previous,surfaces):copyAlpha(next,surfaces);
      if(inward)subtractAlpha(ring,next);else subtractAlpha(ring,previous);
      const tint=tintedSurface(ring,surfaces,config.color,(+config.alpha||0)*(layers-index)/layers,0,0);haloCtx.drawImage(tint,0,0);surfaces.release(tint);surfaces.release(ring);surfaces.release(previous);previous=next;
    }
    surfaces.release(previous);return halo;
  }
  function outerLight(source,config,surfaces){
    const halo=lightHalo(source,config,surfaces,false),output=surfaces.acquire(source.width,source.height),ctx=output.getContext('2d');ctx.clearRect(0,0,output.width,output.height);ctx.drawImage(source,0,0);ctx.globalCompositeOperation=blend(config.blend||'screen');ctx.drawImage(halo,0,0);ctx.globalCompositeOperation='source-over';surfaces.release(halo);return output;
  }
  function innerLight(source,config,surfaces){
    const halo=lightHalo(source,config,surfaces,true),output=surfaces.acquire(source.width,source.height),ctx=output.getContext('2d'),legacyBlend=!config.blend&&config.mode==='shadow'?'multiply':'screen';ctx.clearRect(0,0,output.width,output.height);ctx.drawImage(source,0,0);ctx.globalCompositeOperation=blend(config.blend||legacyBlend);ctx.drawImage(halo,0,0);ctx.globalCompositeOperation='source-over';surfaces.release(halo);return output;
  }
  function apply(source, group, surfaces, frame) {
    let current = source;
    const handlers = { projection, outline, 'tint-overlay': tintOverlay, 'texture-overlay': textureOverlay, 'inner-light': innerLight, 'outer-light': outerLight };
    for (const id of ['projection', 'outline', 'tint-overlay', 'texture-overlay', 'inner-light', 'outer-light']) {
      const config = active(group, id); if (!config) continue;
      const handler = handlers[id]; if (!handler) throw new Error(`Runtime vNext 尚未实现加样效果：${id}`);
      const next = handler(current, animated(id,config,frame&&frame.time||0), surfaces);
      if (current !== source) surfaces.release(current);
      current = next;
    }
    return current;
  }
  function padding(group) {
    let amount = 2;
    const shadow = active(group, 'projection'); if (shadow) amount = Math.max(amount, Math.ceil(Math.max(0, +shadow.distance || 0)) + 2);
    const edge = active(group, 'outline'); if (edge) amount = Math.max(amount, Math.ceil(Math.max(1, +edge.width || 1)) + 2);
    const outer = active(group, 'outer-light'); if (outer) amount = Math.max(amount, Math.ceil(Math.max(1, +outer.size || 1)) + 2);
    return amount;
  }
  api.modules.decorate = Object.freeze({ apply, padding });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:65-decorate-effects.js> */

/* <vnext:67-sampling-field.js> */
/* ToSampool Runtime vNext source module: shared sampling grid, field and edge rule. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const hash = (x, y, seed, tick) => { let n = (Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul((seed | 0) + 1, 69069) ^ Math.imul((tick | 0) + 1, 362437)) >>> 0; n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
  function tick(config, time) { const motion = config && config.motion || {}; return motion.fieldFlow ? Math.floor(time / Math.max(.001, +motion.period || 3) * Math.max(1, Math.round(+motion.steps || 24))) : 0; }
  function edgeDistance(alpha, width, height) {
    const count = width * height, distance = new Float32Array(count), infinity = width + height + 8;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) distance[y * width + x] = alpha[(y * width + x) * 4 + 3] < 8 || !x || !y || x === width - 1 || y === height - 1 ? 0 : infinity;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const i = y * width + x; if (x) distance[i] = Math.min(distance[i], distance[i - 1] + 1); if (y) distance[i] = Math.min(distance[i], distance[i - width] + 1); }
    for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) { const i = y * width + x; if (x < width - 1) distance[i] = Math.min(distance[i], distance[i + 1] + 1); if (y < height - 1) distance[i] = Math.min(distance[i], distance[i + width] + 1); }
    return distance;
  }
  function build(source, uneven, time) {
    uneven = uneven || {}; const fieldCfg = uneven.field || {}, edge = uneven.edge || {};
    const ctx = source.getContext('2d'); let image;
    try { image = ctx.getImageData(0, 0, source.width, source.height); } catch (error) { throw new Error(`采样场读取失败：${error.message || 'Canvas 可能被跨域素材污染'}`); }
    const width = source.width, height = source.height, values = new Float32Array(width * height), enabled = !!fieldCfg.enabled, type = fieldCfg.type || 'wave', contrast = clamp(fieldCfg.contrast == null ? .5 : +fieldCfg.contrast, 0, 1), scale = Math.max(4, +fieldCfg.scale || 48), seed = +fieldCfg.seed || 1, motion = uneven.motion || {}, phase = tick(uneven, time), steps = Math.max(1, Math.round(+motion.steps || 24)), flow = motion.fieldFlow ? phase / steps * (+motion.flowSpeed || 0) : 0, angle = (+fieldCfg.direction || 0) * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle), centerX = clamp(fieldCfg.centerX == null ? .5 : +fieldCfg.centerX, 0, 1) * width, centerY = clamp(fieldCfg.centerY == null ? .5 : +fieldCfg.centerY, 0, 1) * height;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let raw = .5;
      if (enabled && type === 'wave') raw = .5 + .5 * Math.sin(((x * cos + y * sin) / scale - flow + seed * .031) * Math.PI * 2);
      else if (enabled && type === 'radial') raw = .5 + .5 * Math.sin((Math.hypot(x - centerX, y - centerY) / scale - flow + seed * .031) * Math.PI * 2);
      else if (enabled && type === 'noise') raw = hash(Math.floor(x / scale), Math.floor(y / scale), seed, phase);
      values[y * width + x] = .5 + (raw - .5) * contrast;
    }
    const mode = edge.mode === 'alpha-lock' ? 'contour' : edge.mode === 'edge-only' ? 'interior' : edge.mode === 'inside-only' ? 'off' : edge.mode || 'off';
    if (mode !== 'off') {
      const distance = edgeDistance(image.data, width, height), edgeWidth = Math.max(1, +edge.width || 2);
      for (let i = 0; i < values.length; i++) { const near = clamp(1 - distance[i] / edgeWidth, 0, 1); if (mode === 'contour') values[i] = .5 + (values[i] - .5) * (1 - near); else if (mode === 'interior') values[i] = .5 + (values[i] - .5) * near; }
    }
    return Object.freeze({ width, height, values, field: fieldCfg, edge, tick: phase });
  }
  api.modules.field = Object.freeze({ build, hash });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:67-sampling-field.js> */

/* <vnext:68-sampling-effects.js> */
/* ToSampool Runtime vNext source module: first CPU sampling primitives. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const active = (group, id) => group && group[id] && group[id].enabled ? group[id] : null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const hash = (x, y, seed, tick) => { let n = (Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul((seed | 0) + 1, 69069) ^ Math.imul((tick | 0) + 1, 362437)) >>> 0; n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
  const color = value => {
    const hex = String(value || '#000000').replace('#', '');
    const text = hex.length === 3 ? hex.split('').map(char => char + char).join('') : hex.padEnd(6, '0').slice(0, 6);
    return [parseInt(text.slice(0, 2), 16) || 0, parseInt(text.slice(2, 4), 16) || 0, parseInt(text.slice(4, 6), 16) || 0];
  };
  const PALETTES = Object.freeze({
    pico8: Object.freeze([[0,0,0],[29,43,83],[126,37,83],[0,135,81],[171,82,54],[95,87,79],[194,195,199],[255,241,232],[255,0,77],[255,163,0],[255,236,39],[0,228,54],[41,173,255],[131,118,156],[255,119,168],[255,204,170],[41,54,111],[43,83,120],[112,120,51],[131,143,196],[159,73,28],[83,54,32],[81,31,25],[141,135,123],[79,91,40],[87,79,74],[187,160,119],[142,154,114],[129,156,143],[105,115,98],[178,161,131],[227,204,155]]),
    nes: Object.freeze([[0,0,0],[124,124,124],[248,248,248],[252,60,48],[252,152,56],[252,252,88],[184,248,24],[88,216,84],[32,184,152],[0,136,196],[72,60,168],[168,64,208],[252,60,148],[252,152,192],[64,64,64],[188,188,188]]),
    vga: Object.freeze([[0,0,0],[128,0,0],[0,128,0],[128,128,0],[0,0,128],[128,0,128],[0,128,128],[192,192,192],[128,128,128],[255,0,0],[0,255,0],[255,255,0],[0,0,255],[255,0,255],[0,255,255],[255,255,255]]),
    gb: Object.freeze([[15,56,15],[48,98,48],[139,172,15],[155,188,15]]),
  });
  // A colour map is often applied every preview frame. Keep extraction and
  // nearest-colour lookup separate: the palette keeps source RGB precision,
  // while the 5-bit lookup table keeps the per-pixel mapping inexpensive.
  const colorMapCache = new Map(), COLOR_MAP_CACHE_LIMIT = 12, AUTO_PALETTE_SOURCE_LIMIT = 65536;
  const rgb5 = (r, g, b) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
  const rgb5Color = code => [((code >> 10) & 31) * 8 + 4, ((code >> 5) & 31) * 8 + 4, (code & 31) * 8 + 4];
  function sourceFingerprint(data) {
    const pixels = data.length >>> 2, stride = Math.max(1, Math.floor(pixels / 4096)); let hash = 2166136261;
    for (let pixel = 0; pixel < pixels; pixel += stride) { const i = pixel * 4; hash = Math.imul(hash ^ data[i], 16777619); hash = Math.imul(hash ^ data[i + 1], 16777619); hash = Math.imul(hash ^ data[i + 2], 16777619); hash = Math.imul(hash ^ data[i + 3], 16777619); }
    return (hash >>> 0).toString(36);
  }
  function putColorMapCache(key, value) { colorMapCache.delete(key); colorMapCache.set(key, value); if (colorMapCache.size > COLOR_MAP_CACHE_LIMIT) colorMapCache.delete(colorMapCache.keys().next().value); return value; }
  // Keep the source palette in full RGB, not RGB555.  The older version made
  // 16+ colours converge prematurely because it merged nearby source hues
  // before Median Cut had a chance to divide them.  Mapping still uses a
  // 32³ LUT afterwards, just like PixelTool, so this costs only on cache miss.
  function boxStats(items) { let minR=255,minG=255,minB=255,maxR=0,maxG=0,maxB=0,weight=0; for (const entry of items) { const {r,g,b}=entry; if(r<minR)minR=r;if(r>maxR)maxR=r;if(g<minG)minG=g;if(g>maxG)maxG=g;if(b<minB)minB=b;if(b>maxB)maxB=b;weight+=entry.count; } return { items, minR, minG, minB, maxR, maxG, maxB, weight }; }
  function autoPalette(data, count) {
    // Match the useful part of PixelTool's behaviour: gather exact source
    // colours (bounded for pathological photographs), then use weighted
    // Median Cut.  Do not alpha-weight colours: a semi-transparent anti-aliased
    // edge must not crowd out the image's actual paint colours.
    const histogram = new Map();
    for (let i=0;i<data.length;i+=4) {
      if (data[i+3] < 128) continue;
      const code=(data[i]<<16)|(data[i+1]<<8)|data[i+2], known=histogram.get(code);
      if (known) known.count += 1;
      else if (histogram.size < AUTO_PALETTE_SOURCE_LIMIT) histogram.set(code,{r:data[i],g:data[i+1],b:data[i+2],count:1});
    }
    const entries=Array.from(histogram.values());
    if (!entries.length) return [[0,0,0]];
    const boxes=[boxStats(entries)];
    while(boxes.length<count){
      let pick=-1,score=-1;
      for(let index=0;index<boxes.length;index++){const box=boxes[index],range=Math.max(box.maxR-box.minR,box.maxG-box.minG,box.maxB-box.minB),next=range*box.weight;if(box.items.length>1&&next>score){score=next;pick=index;}}
      if(pick<0)break;
      const box=boxes[pick],ranges=[box.maxR-box.minR,box.maxG-box.minG,box.maxB-box.minB],channel=ranges.indexOf(Math.max(...ranges)),items=box.items.slice().sort((a,b)=>channel===0?a.r-b.r:channel===1?a.g-b.g:a.b-b.b),half=box.weight/2;
      let cumulative=0,split=1; for(;split<items.length;split++){cumulative+=items[split-1].count;if(cumulative>=half)break;}
      boxes.splice(pick,1,boxStats(items.slice(0,split)),boxStats(items.slice(split)));
    }
    return boxes.map(box=>{let r=0,g=0,b=0,total=0;for(const entry of box.items){r+=entry.r*entry.count;g+=entry.g*entry.count;b+=entry.b*entry.count;total+=entry.count;}return [Math.round(r/total),Math.round(g/total),Math.round(b/total)];});
  }
  function paletteLut(palette) { const lut=new Uint16Array(32768); for(let code=0;code<lut.length;code++){const [r,g,b]=rgb5Color(code);let best=0,distance=Infinity;for(let index=0;index<palette.length;index++){const candidate=palette[index],dr=r-candidate[0],dg=g-candidate[1],db=b-candidate[2],next=dr*dr+dg*dg+db*db;if(next<distance){distance=next;best=index;}}lut[code]=best;} return lut; }
  function mappedPalette(data, config) {
    const selected = config.palette === 'none' ? 'auto' : config.palette || 'auto', colors=clamp(Math.round(+config.colors || 16),2,256), named=Array.isArray(selected)?selected:PALETTES[selected];
    if (selected !== 'auto' && !named) throw new Error(`未知调色板：${selected}`);
    const key = named ? `named:${Array.isArray(selected) ? JSON.stringify(selected) : selected}` : `auto:${colors}:${sourceFingerprint(data)}`;
    const cached=colorMapCache.get(key); if(cached){colorMapCache.delete(key);colorMapCache.set(key,cached);return cached;}
    const palette=named ? named.map(entry=>entry.slice()) : autoPalette(data,colors);
    return putColorMapCache(key,{palette,lut:paletteLut(palette)});
  }
  // Sampling grid is a real, visible nearest-neighbour resample pass.  It is
  // deliberately not merely a coordinate controller: this is the v4 form of
  // Legacy's pixelDiv contract and the common low-resolution work surface for
  // boil / halftone / uneven sampling.
  const gridSize = group => Math.max(1, Math.round(+((group && group.controllers && group.controllers['sampling-grid'] || {}).size || 1)));
  const hasBaseGrid = group => gridSize(group) > 1;
  const tickAt = (config, time) => {
    const motion = config.motion || {};
    if (!motion.enabled) return 0;
    const period = Math.max(.001, +motion.period || 1), steps = Math.max(1, Math.round(+motion.steps || 12));
    return Math.floor(time / period * steps);
  };
  function withPixels(source, surfaces, transform) {
    const input = source.getContext('2d'), output = surfaces.acquire(source.width, source.height), out = output.getContext('2d');
    let from, to;
    try { from = input.getImageData(0, 0, source.width, source.height); to = out.getImageData(0, 0, source.width, source.height); }
    catch (error) { surfaces.release(output); throw new Error(`采样读取失败：${error.message || 'Canvas 可能被跨域素材污染'}`); }
    if(surfaces.notePixels)surfaces.notePixels(source.width,source.height,1);transform(from.data, to.data, source.width, source.height);
    out.putImageData(to, 0, 0); return output;
  }
  function colorMap(source, config, surfaces, time) {
    // Palette flash is deliberately binary: one full cycle contains original
    // and mapped states. Its period therefore replaces both the former step
    // count and amount controls. Returning the source on its original phase
    // also avoids an unnecessary full pixel pass for half its frames.
    const selected=config.palette === 'none' ? 'auto' : config.palette || 'auto',colors=clamp(Math.round(+config.colors || 16),2,256);
    // Keep PixelTool's useful ceiling contract without changing the control:
    // automatic 256 means “preserve source colour”, while named/custom palettes
    // remain explicit mappings. This makes the upper end visibly recover the
    // original image instead of looking like another near-identical reduction.
    if (selected === 'auto' && colors === 256) return source;
    const motion=config.motion||{},flash=motion.enabled&&motion.type==='palette-flash',period=Math.max(.001,+motion.period||1),tick=Math.floor(time/period*2),mix=flash?(tick%2?1:0):1;
    if (mix === 0) return source;
    return withPixels(source, surfaces, (from, to) => {
      const mapped=mappedPalette(from,config),palette=mapped.palette,lut=mapped.lut;
      for (let i = 0; i < from.length; i += 4) {
        const best=palette[lut[rgb5(from[i],from[i+1],from[i+2])]];
        to[i] = from[i]+(best[0]-from[i])*mix; to[i + 1] = from[i+1]+(best[1]-from[i+1])*mix; to[i + 2] = from[i+2]+(best[2]-from[i+2])*mix;
        to[i + 3] = from[i + 3];
      }
    });
  }
  function threshold(source, config, surfaces, time) {
    const dark = color(config.dark), light = color(config.light), motion = config.motion || {}, pulse = motion.enabled ? (+motion.amount || 0) * Math.sin(time / Math.max(.001, +motion.period || 1) * Math.PI * 2) : 0;
    const pivot = clamp((+config.threshold || .5) + pulse, 0, 1) * 255;
    return withPixels(source, surfaces, (from, to) => {
      for (let i = 0; i < from.length; i += 4) { const luma = from[i] * .2126 + from[i + 1] * .7152 + from[i + 2] * .0722, pick = luma >= pivot ? light : dark; to[i] = pick[0]; to[i + 1] = pick[1]; to[i + 2] = pick[2]; to[i + 3] = from[i + 3]; }
    });
  }
  /* Every owner reaches the sampling stage as a prepared high-resolution
     capsule: image, text, vector and builtin content therefore share one
     source-sampling implementation.  Legacy's single source-window crop is
     useful for a bitmap frame, but becomes a visible one-way zoom when used
     on a transparent object capsule.  v4 therefore makes several centred
     source samples before reduction, then picks a candidate per sample cell.
     The result is true pixel boil rather than an enlarged-block translation. */
  function boilFrame(config, controllers, time) {
    const type = config && (config.type || 'boil');
    if (type !== 'boil') return null;
    const grid = Math.max(1, Math.round(+((controllers && controllers['sampling-grid'] || {}).size || 1)));
    if (grid < 2) return null;
    const boil = config.boil || {}, motion = config.motion || {}, bias = Math.round(clamp(+(boil.bias == null ? 1 : boil.bias), 0, grid - 1));
    if (!bias) return null;
    const enabled = motion.enabled !== false, rate = Math.max(.05, +(motion.frequency == null ? 4 : motion.frequency)), phase = enabled ? Math.max(0, +time || 0) * rate : 0, tick = Math.floor(phase), fraction = phase - tick, drift = motion.type === 'sampling-drift';
    return { bias, coverage:clamp(+(boil.coverage == null ? .3 : boil.coverage),0,1), seed:+config.seed || 1, tick, fraction, drift, mode:drift ? 'drift' : 'step', edge:Object.assign({mode:'off',width:1},config.edge||{}) };
  }
  function boilOffset(config, controllers, time) {
    const frame=boilFrame(config,controllers,time);if(!frame)return null;
    // Public helper / diagnostics: one centred candidate, not the final
    // per-cell choice.  Integer coordinates avoid soft sub-pixel filtering.
    const axis=salt=>Math.round((hash(salt,0,frame.seed,frame.tick)*2-1)*frame.bias);
    return { x:axis(17), y:axis(53), bias:frame.bias, mode:frame.mode };
  }
  function boilProtected(base,width,height,x,y,frame){
    const guard=Math.max(1,Math.round(+frame.edge.width||1));
    if(x<guard||y<guard||x>=width-guard||y>=height-guard)return true;
    const mode=frame.edge.mode||'off';if(mode==='off')return false;
    const at=(xx,yy)=>base[(yy*width+xx)*4+3],alpha=at(x,y);
    if(mode==='interior')return alpha>=254;
    // contour: retain partially transparent cells and the one-cell Alpha
    // transition around them, leaving the opaque interior free to boil.
    if(alpha<254)return true;
    for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)if(at(xx,yy)!==alpha)return true;
    return false;
  }
  function boilChoice(frame,x,y){
    // Centre is deliberately dominant.  A full per-cell replacement makes
    // the frame read as a violent mosaic; the coverage gate makes this a
    // controlled, sparse pixel boil instead.
    const at=tick=>hash(x,y,frame.seed+41,tick)>=frame.coverage?0:1+Math.floor(hash(x,y,frame.seed,tick)*4)%4;
    const left=at(frame.tick);if(!frame.drift)return left;
    const right=at(frame.tick+1),threshold=hash(x,y,frame.seed+97,frame.tick);
    // A temporal dither changes cells gradually without blending colours or
    // creating a global slide direction.
    return threshold<frame.fraction?right:left;
  }
  function boilWork(source,width,height,frame,surfaces){
    const inset=frame.bias;if(source.width<=inset*2||source.height<=inset*2)return null;
    const directions=[[0,0],[-inset,0],[inset,0],[0,-inset],[0,inset]],samples=[];
    try{
      for(const [dx,dy] of directions){const canvas=surfaces.acquire(width,height),ctx=canvas.getContext('2d');ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;ctx.drawImage(source,inset+dx,inset+dy,source.width-inset*2,source.height-inset*2,0,0,width,height);samples.push(canvas);}
      const images=samples.map(canvas=>canvas.getContext('2d').getImageData(0,0,width,height)),output=surfaces.acquire(width,height),ctx=output.getContext('2d'),base=images[0].data,result=ctx.getImageData(0,0,width,height),to=result.data;
      if(surfaces.notePixels)surfaces.notePixels(width,height,images.length+1);
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){const offset=(y*width+x)*4,from=images[boilProtected(base,width,height,x,y,frame)?0:boilChoice(frame,x,y)].data;to[offset]=from[offset];to[offset+1]=from[offset+1];to[offset+2]=from[offset+2];to[offset+3]=from[offset+3];}
      ctx.putImageData(result,0,0);return output;
    }catch(error){return null;}finally{for(const canvas of samples)surfaces.release(canvas);}
  }
  function breathFrame(config,controllers,time){
    const type=config&&(config.type||'boil');if(type!=='breath')return null;
    const grid=Math.max(1,Math.round(+((controllers&&controllers['sampling-grid']||{}).size||1)));if(grid<2)return null;
    // Pixel breath deliberately preserves Legacy's fractional source-window
    // phase.  Unlike boil's integer neighbour candidates, the fractional
    // resize causes individual low-resolution cells to cross a source-pixel
    // threshold at slightly different moments.
    const breath=config.breath||{},motion=config.motion||{},bias=clamp(+(breath.bias==null?.1:breath.bias),0,grid-1);if(!bias)return null;
    const enabled=motion.enabled!==false,rate=Math.max(.05,+(motion.frequency==null?4:motion.frequency)),phase=enabled?Math.max(0,+time||0)*rate:0,tick=Math.floor(phase),fraction=phase-tick,drift=motion.type==='sampling-drift';
    return {bias,seed:+config.seed||1,tick,fraction,drift,edge:Object.assign({mode:'off'},breath.edge||{})};
  }
  function breathOffset(frame,tick){
    const smooth=value=>value*value*(3-value*2),mix=frame.drift?smooth(frame.fraction):0;
    const axis=salt=>{const a=hash(salt,0,frame.seed,tick),b=hash(salt,0,frame.seed,tick+1);return(a+(b-a)*mix)*frame.bias;};
    return {x:axis(127),y:axis(251)};
  }
  function breathProtected(base,width,height,x,y,frame){
    if((frame.edge&&frame.edge.mode)!=='contour')return false;
    const at=(xx,yy)=>base[(yy*width+xx)*4+3],alpha=at(x,y);if(alpha<254)return true;
    for(let yy=Math.max(0,y-1);yy<=Math.min(height-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(width-1,x+1);xx++)if(at(xx,yy)!==alpha)return true;
    return false;
  }
  function breathWork(source,width,height,frame,surfaces){
    const amount=frame.bias;if(source.width<=amount||source.height<=amount)return null;
    const offset=breathOffset(frame,frame.tick),output=surfaces.acquire(width,height),ctx=output.getContext('2d');let baseline=null;
    try{
      ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
      // This is intentionally the old source-window formula: the window has
      // width - amount, while its fractional origin travels inside amount.
      ctx.drawImage(source,offset.x,offset.y,source.width-amount,source.height-amount,0,0,width,height);
      if((frame.edge&&frame.edge.mode)!=='contour')return output;
      baseline=surfaces.acquire(width,height);const baseCtx=baseline.getContext('2d');baseCtx.clearRect(0,0,width,height);baseCtx.imageSmoothingEnabled=false;baseCtx.drawImage(source,0,0,width,height);
      const base=baseCtx.getImageData(0,0,width,height),result=ctx.getImageData(0,0,width,height),from=base.data,to=result.data;
      if(surfaces.notePixels)surfaces.notePixels(width,height,2);
      for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(breathProtected(from,width,height,x,y,frame)){const at=(y*width+x)*4;to[at]=from[at];to[at+1]=from[at+1];to[at+2]=from[at+2];to[at+3]=from[at+3];}
      ctx.putImageData(result,0,0);return output;
    }catch(error){surfaces.release(output);return null;}finally{if(baseline)surfaces.release(baseline);}
  }
  function offsetSampling(source, config, controllers, surfaces, time) {
    const type = config.type || config.mode || 'boil';
    // Boil and breath are consumed by apply() while the source is still high-resolution.
    // Keeping this no-op prevents a second low-resolution crop after sampling.
    if (type === 'boil' || type === 'breath') return source;
    const bands = config.bands || {}, motion = config.motion || {}, rate = Math.max(.05, +(motion.frequency == null ? 4 : motion.frequency)), phase = motion.enabled === false ? 0 : Math.max(0, +time || 0) * rate, tick = Math.floor(phase), fraction = phase - tick, drift = motion.type === 'sampling-drift', seed = +config.seed || 1;
    const orientation = bands.orientation || 'horizontal', count = Math.max(0, Math.round(+(bands.count == null ? 6 : bands.count))), thickness = Math.max(1, Math.round(+(bands.thickness == null ? bands.width || 3 : bands.thickness))), amount = Math.max(0, +(bands.offset == null ? config.amount || 0 : bands.offset)), channels = bands.channels || 'combined';
    if (!count || !amount) return source;
    return withPixels(source, surfaces, (from, to, width, height) => {
      to.set(from);
      const smooth = value => value * value * (3 - 2 * value), blend = drift ? smooth(fraction) : 0, valueAt = (index, salt) => { const a = hash(index, salt, seed, tick), b = hash(index, salt, seed, tick + 1); return a + (b - a) * blend; };
      const span = orientation === 'horizontal' ? height : width, copyBand = (start, size, shift, channel) => {
        for (let cross = 0; cross < size; cross++) for (let along = 0; along < (orientation === 'horizontal' ? width : height); along++) {
          const x = orientation === 'horizontal' ? along : start + cross, y = orientation === 'horizontal' ? start + cross : along;
          if (x < 0 || y < 0 || x >= width || y >= height) continue;
          const sx = clamp(Math.round(x + (orientation === 'horizontal' ? shift : 0)), 0, width - 1), sy = clamp(Math.round(y + (orientation === 'vertical' ? shift : 0)), 0, height - 1), at = (y * width + x) * 4, sourceAt = (sy * width + sx) * 4;
          if (channel == null) { to[at] = from[sourceAt]; to[at + 1] = from[sourceAt + 1]; to[at + 2] = from[sourceAt + 2]; }
          else to[at + channel] = from[sourceAt + channel];
        }
      };
      for (let index = 0; index < count; index++) {
        const start = Math.floor(valueAt(index, 11) * Math.max(1, span - thickness)), shift = Math.round((valueAt(index, 23) * 2 - 1) * amount);
        if (channels === 'rgb') for (let channel = 0; channel < 3; channel++) copyBand(start, thickness, shift + Math.round((channel - 1) * amount / 3), channel);
        else copyBand(start, thickness, shift, null);
      }
    });
  }
  const halftonePlans=new Map();
  // 网点映射不再维护第二套“间距”。size 表示共享采样格的倍数：
  // grid=2、size=4 时，一个印刷单元就是输出上的 8×8 像素。
  function halftonePlan(width,height,cell,angle){
    const key=[width,height,cell,angle].join('|');if(halftonePlans.has(key))return halftonePlans.get(key);
    const cx=width/2,cy=height/2,rad=angle*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad),corners=[[0,0],[width,0],[width,height],[0,height]].map(([x,y])=>{const dx=x-cx,dy=y-cy;return[dx*cos+dy*sin,-dx*sin+dy*cos];}),xs=corners.map(point=>point[0]),ys=corners.map(point=>point[1]),minX=Math.floor(Math.min(...xs)/cell)*cell-cell,maxX=Math.ceil(Math.max(...xs)/cell)*cell+cell,minY=Math.floor(Math.min(...ys)/cell)*cell-cell,maxY=Math.ceil(Math.max(...ys)/cell)*cell+cell,points=[];
    // Keep lattice centers as floats. Rounding each rotated center created
    // alternating gaps at 45°, which nearest-neighbour enlargement exposed.
    for(let ly=minY;ly<=maxY;ly+=cell)for(let lx=minX;lx<=maxX;lx+=cell){const x=cx+lx*cos-ly*sin,y=cy+lx*sin+ly*cos;if(x>=-cell&&y>=-cell&&x<=width+cell&&y<=height+cell)points.push({x,y});}
    const plan=Object.freeze({points:Object.freeze(points),cos,sin});halftonePlans.set(key,plan);if(halftonePlans.size>24)halftonePlans.delete(halftonePlans.keys().next().value);return plan;
  }
  function appendDot(path,x,y,radius,shape,rotation){
    if(shape==='circle'){path.moveTo(x+radius,y);path.arc(x,y,radius,0,Math.PI*2);return;}
    const count=shape==='triangle'?3:shape==='square'?4:shape==='hexagon'?6:5,base=(shape==='square'?Math.PI/4:-Math.PI/2)+(rotation||0),scale=shape==='square'?Math.SQRT2:1;
    for(let index=0;index<count;index++){const theta=base+index/count*Math.PI*2,px=x+Math.cos(theta)*radius*scale,py=y+Math.sin(theta)*radius*scale;if(index)path.lineTo(px,py);else path.moveTo(px,py);}path.closePath();
  }
  function paintHalftonePath(ctx,marks,color,append){
    const Path=global.Path2D,chunk=12000;ctx.fillStyle=color;
    if(typeof Path!=='function'){ctx.beginPath();for(const mark of marks)append(ctx,mark);ctx.fill();return;}
    for(let start=0;start<marks.length;start+=chunk){const path=new Path();for(let index=start;index<Math.min(marks.length,start+chunk);index++)append(path,marks[index]);ctx.fill(path);}
  }
  function halftoneColour(red,green,blue){
    // Halftone Factory's important distinction: a mark owns one sampled
    // colour, rather than revealing a multicolour patch of the source image.
    // 3 bits per RGB channel gives at most 512 Path2D batches, keeping a
    // photographic source responsive while still retaining recognisable hue.
    const r=(red>>5)*32+16,g=(green>>5)*32+16,b=(blue>>5)*32+16;return`rgb(${r} ${g} ${b})`;
  }
  function paintHalftoneColourBatches(ctx,marks,shape,rotation){
    const batches=new Map();for(const mark of marks){let batch=batches.get(mark.colour);if(!batch){batch=[];batches.set(mark.colour,batch);}batch.push(mark);}
    for(const [colour,batch] of batches)paintHalftonePath(ctx,batch,colour,(path,mark)=>appendDot(path,mark.x,mark.y,mark.radius,shape,rotation));
  }
  function cssColour(rgb){return`rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;}
  function samplingPadding(group){const halftone=active(group,'halftone');if(!halftone)return 0;const actualCell=Math.max(1,Math.round(+halftone.size||4))*gridSize(group);return Math.ceil(actualCell*.52)+2;}
  function halftone(source, config, group, surfaces, time) {
    // Halftone Factory's useful division is preserved here: first make a
    // compact brightness grid, then stamp cached geometry.  We therefore do
    // not scan a full source rectangle for every mark.
    const cell=Math.max(1,Math.round(+config.size||4)),angle=+config.angle||0,output=surfaces.acquire(source.width,source.height),ctx=output.getContext('2d'),analysis=surfaces.acquire(Math.max(1,Math.ceil(source.width/cell)),Math.max(1,Math.ceil(source.height/cell))),analysisCtx=analysis.getContext('2d');let image;
    try{analysisCtx.clearRect(0,0,analysis.width,analysis.height);analysisCtx.imageSmoothingEnabled=true;analysisCtx.imageSmoothingQuality='high';analysisCtx.drawImage(source,0,0,analysis.width,analysis.height);image=analysisCtx.getImageData(0,0,analysis.width,analysis.height);}catch(error){surfaces.release(analysis);surfaces.release(output);throw new Error(`网点映射读取失败：${error.message||'Canvas 可能被跨域素材污染'}`);}
    if(surfaces.notePixels)surfaces.notePixels(analysis.width,analysis.height,1);
    const data=image.data,motion=config.motion||{},motionPeriod=Math.max(.001,+motion.period||2),motionSteps=Math.max(1,Math.round(+motion.steps||12)),motionPhase=Math.floor((time/motionPeriod)*motionSteps)/motionSteps,drift=motion.enabled&&motion.type==='dot-drift'?Math.sin(motionPhase*Math.PI*2)*clamp(+motion.amount||0,0,1):0,plan=halftonePlan(source.width,source.height,cell,angle),phase=(clamp(+config.phase||0,0,1)+drift)*cell,dx=plan.cos*phase,dy=plan.sin*phase,shape=config.shape||'circle',threshold=clamp(config.threshold==null?.5:+config.threshold,0,1),contrast=clamp(config.contrast==null?1:+config.contrast,.1,3),duotone=!!config.duotone,dark=cssColour(color(config.duotoneDark||'#111827')),light=cssColour(color(config.duotoneLight||'#f2e8cf')),marks=[];
    for(const point of plan.points){const x=point.x+dx,y=point.y+dy,ix=clamp(Math.floor(x/cell),0,analysis.width-1),iy=clamp(Math.floor(y/cell),0,analysis.height-1),at=(iy*analysis.width+ix)*4,alpha=data[at+3]/255,luma=(data[at]*.2126+data[at+1]*.7152+data[at+2]*.0722)/255,tone=1-luma,strength=clamp((tone-.5)*contrast+.5+(threshold-.5),0,1),colour=duotone?(luma>=threshold?light:dark):halftoneColour(data[at],data[at+1],data[at+2]);marks.push({x,y,radius:strength*cell*.52,alpha,colour});}
    // Alpha participates only in point admission/size.  Complete marks are
    // intentionally not clipped back to the original contour: this matches
    // print halftone edges and is why object capsules reserve sample padding.
    ctx.clearRect(0,0,source.width,source.height);paintHalftoneColourBatches(ctx,marks.filter(mark=>mark.alpha>.01&&mark.radius>.15),shape,angle*Math.PI/180);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;surfaces.release(analysis);return output;
  }
  function unevenSampling(source, config, controllers, surfaces, tide) {
    // The field is the effect, not an optional multiplier.  In particular,
    // an old scene with field.enabled:false must be a no-op instead of a
    // uniform maximum coarse pass.
    if (!tide || !tide.frame || !tide.frame.field || !tide.frame.field.enabled) return source;
    return withPixels(source, surfaces, (from, to, width, height) => {
      // Same field → variable cell rule as Legacy applyGrain.  It is run in
      // the low-resolution sampling work image, then enlarged once by apply.
      const amount = clamp(+tide.amount || 0, 0, 1), coarseness = Math.max(2, Math.round(+config.coarseness || 5)), span = Math.max(1, coarseness - 1);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const field = tide.frame.values[y * width + x], cell = 1 + Math.floor(clamp(field,0,1) * amount * span), sx = Math.min(width - 1, Math.floor(x / cell) * cell), sy = Math.min(height - 1, Math.floor(y / cell) * cell), fromIndex = (sy * width + sx) * 4, at = (y * width + x) * 4; to[at] = from[fromIndex]; to[at + 1] = from[fromIndex + 1]; to[at + 2] = from[fromIndex + 2]; to[at + 3] = from[fromIndex + 3]; }
    });
  }
  function applyFull(source, group, surfaces, frame) {
    let current = source, controllers = group && group.controllers || {}, tideConfig = active(group, 'uneven-sampling'), tideMotion=tideConfig&&tideConfig.motion||{},tideAnimated=!!(tideMotion.enabled&&tideMotion.type==='uneven-motion'),tidePulse=tideAnimated?(Math.sin(frame.time/Math.max(.001,+tideMotion.period||3)*Math.PI*2)+1)/2:.5,tideScale=tideAnimated?Math.max(0,1+(tidePulse-.5)*2*clamp(+tideMotion.tideAmount||0,0,1)):1,fieldConfig=tideConfig&&Object.assign({},tideConfig,{field:Object.assign({enabled:true},tideConfig.field||{}),motion:Object.assign({},tideMotion,{fieldFlow:tideAnimated&&(+tideMotion.flowSpeed||0)!==0})}),tide=tideConfig?{ frame: api.modules.field.build(source, fieldConfig, frame.time), amount:clamp((+tideConfig.amount||0)*tideScale,0,1) } : null;
    const handlers = { 'color-map': colorMap, threshold, 'offset-sampling': offsetSampling, halftone, 'uneven-sampling': unevenSampling };
    for (const id of ['color-map', 'threshold', 'offset-sampling', 'halftone', 'uneven-sampling']) {
      const config = active(group, id); if (!config) continue;
      const handler = handlers[id]; if (!handler) throw new Error(`Runtime vNext 尚未实现采样效果：${id}`);
      const next = id === 'offset-sampling' ? handler(current, config, controllers, surfaces, frame.time) : id === 'threshold' ? handler(current, config, surfaces, frame.time) : id === 'halftone' ? handler(current, config, group, surfaces, frame.time) : id === 'uneven-sampling' ? handler(current, config, controllers, surfaces, tide) : handler(current, config, surfaces, frame.time);
      if (next !== current) { if (current !== source) surfaces.release(current); current = next; }
    }
    return current;
  }
  function apply(source,group,surfaces,frame){
    // Preview quality is an extra transient divisor; the scene's sampling
    // grid remains a persistent, visible stage in Full and Draft previews.
    const baseGrid=gridSize(group),previewDivisor=Math.max(1,Math.round(frame&&frame.preview&&frame.preview.pixelDivMultiplier||1)),divisor=Math.max(1,baseGrid*previewDivisor);
    if(divisor===1)return applyFull(source,group,surfaces,frame);
    const width=Math.max(1,Math.ceil(source.width/divisor)),height=Math.max(1,Math.ceil(source.height/divisor)),work=surfaces.acquire(width,height),ctx=work.getContext('2d');
    const offset=active(group,'offset-sampling'),boil=boilFrame(offset,group&&group.controllers,frame&&frame.time),breath=breathFrame(offset,group&&group.controllers,frame&&frame.time);
    let prepared=null;
    if(boil)prepared=boilWork(source,width,height,boil,surfaces);
    else if(breath)prepared=breathWork(source,width,height,breath,surfaces);
    ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
    if(prepared){ctx.drawImage(prepared,0,0);surfaces.release(prepared);}
    else ctx.drawImage(source,0,0,width,height);
    const sampled=applyFull(work,group,surfaces,frame),output=surfaces.acquire(source.width,source.height),out=output.getContext('2d');
    out.clearRect(0,0,output.width,output.height);out.imageSmoothingEnabled=false;out.drawImage(sampled,0,0,source.width,source.height);
    if(sampled!==work)surfaces.release(sampled);surfaces.release(work);return output;
  }
  api.modules.sampling = Object.freeze({ apply, hash, colorMap, autoPalette, boilOffset, palettes: PALETTES, gridSize, hasBaseGrid, padding:samplingPadding });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:68-sampling-effects.js> */

/* <vnext:69-scene-effects.js> */
/* ToSampool Runtime vNext source module: masked scene-level overlay and sampling stages. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const active = (group, id) => group && group[id] && group[id].enabled ? group[id] : null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const effectIds = group => Object.keys(group || {}).filter(id => id !== 'controllers' && active(group, id));
  function withPixels(source, surfaces, transform, frame) {
    const divisor=Math.max(1,Math.round(frame&&frame.preview&&frame.preview.pixelDivMultiplier||1)),width=Math.max(1,Math.ceil(source.width/divisor)),height=Math.max(1,Math.ceil(source.height/divisor)),input=divisor===1?source:surfaces.acquire(width,height),inputCtx=input.getContext('2d');
    if(divisor>1){inputCtx.clearRect(0,0,width,height);inputCtx.imageSmoothingEnabled=false;inputCtx.drawImage(source,0,0,width,height);}
    const work=surfaces.acquire(width,height),out=work.getContext('2d');let from,to;
    try { from=inputCtx.getImageData(0,0,width,height);to=out.getImageData(0,0,width,height); } catch(error){if(divisor>1)surfaces.release(input);surfaces.release(work);throw new Error(`场景调色读取失败：${error.message || 'Canvas 可能被跨域素材污染'}`);}
    if(surfaces.notePixels)surfaces.notePixels(width,height,1);transform(from.data,to.data);out.putImageData(to,0,0);if(divisor===1)return work;
    const output=surfaces.acquire(source.width,source.height),full=output.getContext('2d');full.clearRect(0,0,output.width,output.height);full.imageSmoothingEnabled=false;full.drawImage(work,0,0,source.width,source.height);surfaces.release(input);surfaces.release(work);return output;
  }
  function colorGrade(source, config, surfaces, frame) {
    const hue = (+config.hue || 0) * Math.PI / 180, cos = Math.cos(hue), sin = Math.sin(hue), brightness = (+config.brightness || 0) * 2.55, contrast = Math.max(0, 1 + (+config.contrast || 0) / 100), saturation = Math.max(0, 1 + (+config.saturation || 0) / 100);
    return withPixels(source, surfaces, (from, to) => {
      for (let i = 0; i < from.length; i += 4) {
        const r = from[i], g = from[i + 1], b = from[i + 2];
        let rr = (.213 + cos * .787 - sin * .213) * r + (.715 - cos * .715 - sin * .715) * g + (.072 - cos * .072 + sin * .928) * b;
        let gg = (.213 - cos * .213 + sin * .143) * r + (.715 + cos * .285 + sin * .14) * g + (.072 - cos * .072 - sin * .283) * b;
        let bb = (.213 - cos * .213 - sin * .787) * r + (.715 - cos * .715 + sin * .715) * g + (.072 + cos * .928 + sin * .072) * b;
        const luma = rr * .2126 + gg * .7152 + bb * .0722; rr = luma + (rr - luma) * saturation; gg = luma + (gg - luma) * saturation; bb = luma + (bb - luma) * saturation;
        to[i] = clamp((rr - 128) * contrast + 128 + brightness, 0, 255); to[i + 1] = clamp((gg - 128) * contrast + 128 + brightness, 0, 255); to[i + 2] = clamp((bb - 128) * contrast + 128 + brightness, 0, 255); to[i + 3] = from[i + 3];
      }
    },frame);
  }
  function compositeMasked(source, result, mask, scene, frame, surfaces) {
    if (!mask || mask.type === 'none') return result;
    // Some sampling passes intentionally return their input when their own
    // prerequisite is not active.  A mask must never clip that shared input
    // surface in place: it is also the unfiltered scene underneath.
    if (result === source) {
      result = surfaces.acquire(source.width, source.height);
      const copied = result.getContext('2d');
      copied.clearRect(0, 0, result.width, result.height);
      copied.drawImage(source, 0, 0);
    }
    const bounds = { x: 0, y: 0, w: source.width, h: source.height };
    if (!api.modules.masks.apply(result, mask, bounds, scene, frame, surfaces)) { surfaces.release(result); throw new Error(`场景滤镜使用了未实现的范围蒙版：${mask.type || '未知'}`); }
    const output = surfaces.acquire(source.width, source.height), ctx = output.getContext('2d'); ctx.clearRect(0, 0, output.width, output.height); ctx.drawImage(source, 0, 0); ctx.drawImage(result, 0, 0); surfaces.release(result); return output;
  }
  function maskedInnerLight(source, config, scene, frame, surfaces) {
    // Legacy's useful "暗场" was a cheap radial vignette, not an expensive
    // alpha erosion.  Keep the optional mask as a range clip, but let the
    // effect work on the full scene by default.
    const bounds = { x: 0, y: 0, w: source.width, h: source.height }, edge = surfaces.acquire(source.width, source.height), edgeCtx = edge.getContext('2d'), strength = clamp(config.strength == null ? +config.alpha || .4 : +config.strength, 0, 1), inner = clamp(config.inner == null ? .35 : +config.inner, 0, 1.5), outer = Math.max(inner + .001, config.outer == null ? .72 : +config.outer), color = config.color || '#000000';
    edgeCtx.clearRect(0,0,edge.width,edge.height);edgeCtx.globalAlpha=strength;if(typeof edgeCtx.createRadialGradient==='function'){const gradient=edgeCtx.createRadialGradient(edge.width/2,edge.height/2,Math.min(edge.width,edge.height)*inner,edge.width/2,edge.height/2,Math.max(edge.width,edge.height)*outer);gradient.addColorStop(0,'rgba(0,0,0,0)');gradient.addColorStop(1,color);edgeCtx.fillStyle=gradient;}else edgeCtx.fillStyle=color;edgeCtx.fillRect(0,0,edge.width,edge.height);edgeCtx.globalAlpha=1;
    if(config.mask&&config.mask.type&&config.mask.type!=='none'&&!api.modules.masks.apply(edge,config.mask,bounds,scene,frame,surfaces)){surfaces.release(edge);throw new Error(`场景暗场使用了未实现的范围蒙版：${config.mask.type || '未知'}`);}
    const output=surfaces.acquire(source.width,source.height),out=output.getContext('2d');out.clearRect(0,0,output.width,output.height);out.drawImage(source,0,0);out.globalCompositeOperation=['normal','screen','multiply','lighter'].includes(config.blend)?config.blend:'source-over';out.drawImage(edge,0,0);out.globalCompositeOperation='source-over';surfaces.release(edge);return output;
  }
  function applyOne(source, id, config, scene, frame, surfaces, controllers) {
    let result;
    if (id === 'color-grade') result = colorGrade(source, config, surfaces,frame);
    else if (id === 'tint-overlay') result = api.modules.decorate.apply(source, { 'tint-overlay': config }, surfaces, frame);
    else if (id === 'texture-overlay') result = api.modules.decorate.apply(source, { 'texture-overlay': config }, surfaces, frame);
    else if (id === 'masked-inner-light') return maskedInnerLight(source, config, scene, frame, surfaces);
    else if (['color-map', 'threshold', 'offset-sampling', 'halftone', 'uneven-sampling'].includes(id)) result = api.modules.sampling.apply(source, Object.assign({ controllers: controllers || {} }, { [id]: config }), surfaces, frame);
    else throw new Error(`Runtime vNext 尚未实现场景滤镜：${id}`);
    return compositeMasked(source, result, config.mask, scene, frame, surfaces);
  }
  function applyStage(source, stage, scene, frame, surfaces) {
    const group = stage === 'overlay' ? scene.sceneEffects.overlay : scene.sceneEffects.sample;
    const order = stage === 'overlay' ? ['color-grade', 'tint-overlay', 'texture-overlay', 'masked-inner-light'] : ['color-map', 'threshold', 'offset-sampling', 'halftone', 'uneven-sampling'];
    let current = source, count = 0, controllers = {};
    for (const [id, config] of Object.entries(group && group.controllers || {})) controllers[id] = frame.controllerValuesFor('scene', 'sample', id, config);
    // A scene-level sampling grid is independently visible.  With no other
    // sample effect it must still allocate a work surface and resample once.
    if(stage==='sample'&&api.modules.sampling.hasBaseGrid({controllers})&&!effectIds(group).length){const next=api.modules.sampling.apply(current,{controllers},surfaces,frame);if(next!==current){if(current!==source)surfaces.release(current);current=next;}count+=1;}
    for (const id of order) { const config = active(group, id); if (!config) continue; const timed = frame.effectValuesFor('scene', stage, id, config); const next = applyOne(current, id, timed, scene, frame, surfaces, controllers); if (next !== current) { if (current !== source) surfaces.release(current); current = next; } count += 1; }
    return { surface: current, count };
  }
  function activeCount(scene) {
    const effects = scene.sceneEffects || {};
    return effectIds(effects.overlay).length + effectIds(effects.sample).length + (api.modules.sampling.hasBaseGrid(effects.sample) ? 1 : 0);
  }
  api.modules.sceneEffects = Object.freeze({ applyStage, activeCount, colorGrade, maskedInnerLight });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:69-scene-effects.js> */

/* <vnext:70-object-composer.js> */
/* ToSampool Runtime vNext source module: fast path now; capsule path lands in R2. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const effectEntries = group => Object.entries(group || {}).filter(([key, value]) => key !== 'controllers' && value && value.enabled);
  const visibleFormationEntries = group => effectEntries(group).filter(([id, config]) => id !== 'color-grade' || !!(+config.hue || +config.brightness || +config.contrast || +config.saturation));
  function timedGroup(frame, entity, group) {
    const output = Object.assign({}, group || {});
    for (const [id, config] of effectEntries(group)) output[id] = frame.effectValuesFor('object', entity.id, id, config);
    if (group && group.controllers) {
      output.controllers = {};
      for (const [id, config] of Object.entries(group.controllers)) output.controllers[id] = frame.controllerValuesFor('object', entity.id, id, config);
    }
    return output;
  }
  function effectsEnabled(entity) {
    const effects = entity.effects;
    if (!effects) return false;
    return !!(effects.mask && effects.mask.type !== 'none' || visibleFormationEntries(effects.formation).length || effectEntries(effects.decorate).length || effectEntries(effects.sample).length || api.modules.sampling.hasBaseGrid(effects.sample));
  }
  function boundsFor(values, padding) {
    const matrix = values.worldMatrix || api.modules.frame.matrixFor(values), points = [[0, 0], [values.w, 0], [values.w, values.h], [0, values.h]].map(([x, y]) => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]]), xs = points.map(point => point[0]), ys = points.map(point => point[1]), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    return { x: Math.floor(minX - padding), y: Math.floor(minY - padding), w: Math.max(1, Math.ceil(maxX - minX + padding * 2)), h: Math.max(1, Math.ceil(maxY - minY + padding * 2)) };
  }
  /* Legacy scroll's “repeat” was a tiled stream, not merely a modulo applied
     to one object.  Keep that inexpensive semantic for every direct v4
     entity: build one effect capsule where needed, then place copies along
     the same local scroll axis. */
  function repeatOffsets(scene, entity, values) {
    const scroll = values && values.anim && values.anim.scroll || entity && entity.anim && entity.anim.scroll;
    // Match the legacy contract: repeat only has a visible meaning for an
    // actively moving scroll.  A disabled / zero-speed scroll remains one
    // object instead of unexpectedly filling the whole stage with copies.
    if (!scroll || scroll.repeat === false || !Number.isFinite(+scroll.speed) || !(+scroll.speed)) return null;
    const span = Math.max(1, +scroll.span || +values.w || 1), angle = (+scroll.angle || 0) * Math.PI / 180;
    // Keep the legacy tiled-stream semantics.  The preview scheduler, rather
    // than silently dropping visible tiles here, owns any future quality cap.
    const count = Math.ceil(Math.hypot(+scene.width || 1, +scene.height || 1) / span) + 2, result = [];
    for (let index = -count; index <= count; index++) result.push({ x:index * span * Math.cos(angle), y:index * span * Math.sin(angle) });
    return result;
  }
  function worldOffset(values, offset) { const matrix=values.parentMatrix || api.modules.frame.IDENTITY; return { x:matrix[0] * offset.x + matrix[2] * offset.y, y:matrix[1] * offset.x + matrix[3] * offset.y }; }
  function unsupported(entity, stage, entries) {
    const names = entries.map(([id]) => id).join(', ');
    throw new Error(`Runtime vNext 尚未实现实体「${entity.id}」在 ${stage} 阶段的效果：${names}`);
  }
  function createCapsule(scene, entity, frame, stats, surfaces) {
    const values = frame.valuesFor(entity), effects = entity.effects || {}, formation = timedGroup(frame, entity, effects.formation), decorate = timedGroup(frame, entity, effects.decorate), sample = timedGroup(frame, entity, effects.sample), bounds = boundsFor(values, Math.max(api.modules.decorate.padding(decorate),api.modules.sampling.padding(sample)));
    let capsule = surfaces.acquire(bounds.w, bounds.h), local = capsule.getContext('2d');
    if (!local) throw new Error('对象视觉胶囊没有 2D 上下文');
    local.clearRect(0, 0, bounds.w, bounds.h);
    local.save(); local.translate(-bounds.x, -bounds.y);
    api.modules.content.draw(local, scene, entity, values, frame, { x:bounds.x, y:bounds.y, deferComposite:true });
    local.restore();
    const grade = formation && formation['color-grade'];
    if (grade && grade.enabled && (+grade.hue || +grade.brightness || +grade.contrast || +grade.saturation)) { const graded = api.modules.sceneEffects.colorGrade(capsule, grade, surfaces, frame); surfaces.release(capsule); capsule = graded; }
    const stages = Array.isArray(effects.pipeline) ? effects.pipeline : ['mask', 'decorate', 'sample'];
    for (const stage of stages) {
      if (stage === 'mask' && effects.mask) {
        if (!api.modules.masks.apply(capsule, effects.mask, bounds, scene, frame, surfaces, entity)) throw new Error(`Runtime vNext 尚未实现实体「${entity.id}」的 ${effects.mask.type || '未知'}蒙版`);
        stats.maskedObjects += 1;
      }
      if (stage === 'decorate') {
          const entries = effectEntries(decorate);
        if (entries.length) {
          const decorated = api.modules.decorate.apply(capsule, decorate, surfaces, frame);
          if (decorated !== capsule) { surfaces.release(capsule); capsule = decorated; }
        }
      }
      if (stage === 'sample') {
          const entries = effectEntries(sample), hasGrid = api.modules.sampling.hasBaseGrid(sample);
        if (entries.length || hasGrid) {
          const sampled = api.modules.sampling.apply(capsule, sample, surfaces, frame); if (sampled !== capsule) { surfaces.release(capsule); capsule = sampled; }
        }
      }
    }
    return { capsule, bounds };
  }
  function drawCapsule(ctx, scene, entity, frame, stats, surfaces) {
    const rendered = createCapsule(scene, entity, frame, stats, surfaces);
    return drawCapsuleResult(ctx, rendered.capsule, rendered.bounds, stats, surfaces, frame.valuesFor(entity));
  }
  function drawCapsuleResult(ctx, capsule, bounds, stats, surfaces, values) {
    ctx.save();ctx.globalAlpha*=((values&&values.parentAlpha)==null?1:values.parentAlpha)*(values&&values.alpha==null?1:values.alpha);ctx.globalCompositeOperation=({normal:'source-over',screen:'screen',multiply:'multiply',lighter:'lighter'})[values&&values.blend || 'normal'] || 'source-over';ctx.drawImage(capsule, bounds.x, bounds.y);ctx.restore(); surfaces.release(capsule); stats.capsuleObjects += 1;
  }
  function draw(ctx, scene, entity, frame, stats, surfaces) {
    const values = frame.valuesFor(entity);
    if (entity.type === 'group' || entity.hidden || values.parentHidden || values.timelineVisible === false) return;
    const repeats = repeatOffsets(scene, entity, values);
    if (effectsEnabled(entity)) {
      try {
        if (!repeats) drawCapsule(ctx, scene, entity, frame, stats, surfaces);
        else { const rendered=createCapsule(scene, entity, frame, stats, surfaces);ctx.save();ctx.globalAlpha*=((values.parentAlpha)==null?1:values.parentAlpha)*(values.alpha==null?1:values.alpha);ctx.globalCompositeOperation=({normal:'source-over',screen:'screen',multiply:'multiply',lighter:'lighter'})[values.blend || 'normal'] || 'source-over';for(const offset of repeats){const world=worldOffset(values,offset);ctx.drawImage(rendered.capsule,rendered.bounds.x+world.x,rendered.bounds.y+world.y);}ctx.restore();surfaces.release(rendered.capsule);stats.capsuleObjects+=1; }
      }
      catch (error) { stats.unsupportedEffects.push(entity.id); throw error; }
      return;
    }
    if (!repeats) api.modules.content.draw(ctx, scene, entity, values, frame);
    else for (const offset of repeats) api.modules.content.draw(ctx, scene, entity, Object.assign({}, values, { x:(+values.x || 0)+offset.x, y:(+values.y || 0)+offset.y }), frame);
    stats.directObjects += 1;
  }
  api.modules.objects = Object.freeze({ draw, effectsEnabled, boundsFor, createCapsule });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:70-object-composer.js> */

/* <vnext:75-particle-renderer.js> */
/* ToSampool Runtime vNext source module: deterministic shared-sprite particle emitters. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const hash = (index, salt, seed) => api.modules.sampling.hash(index, salt, seed | 0, 0);
  function sourceFor(scene, emitter) {
    const id = emitter.particle && emitter.particle.sourceId;
    return scene.entities.find(entity => entity.id === id) || null;
  }
  function draw(ctx, scene, emitter, frame, stats, surfaces) {
    if (emitter.hidden || frame.valuesFor(emitter).parentHidden || frame.valuesFor(emitter).timelineVisible === false) return;
    const values = frame.valuesFor(emitter), particle = values.particle || emitter.particle || {}, source = sourceFor(scene, Object.assign({}, emitter, { particle }));
    if (!source) throw new Error(`粒子发射器「${emitter.id}」找不到 sourceId`);
    const rendered = api.modules.objects.createCapsule(scene, source, frame, stats, surfaces), sprite = rendered.capsule;
    const count = clamp(Math.round(+particle.count || 0), 0, 600), life = Math.max(.001, +particle.life || 2), speed = Math.max(0, +particle.speed || 0), direction = (+particle.direction || 0) * Math.PI / 180, spread = Math.max(0, +particle.spread || 0) * Math.PI / 180, gravity = +particle.gravity || 0, wind = +particle.wind || 0, seed = +particle.seed || 1, scaleBase = Math.max(.01, +particle.size || 1), sizeVar = clamp(+particle.sizeVar || 0, 0, 1), baseAlpha = clamp(+particle.alpha || 0, 0, 1), time = frame.time;
    ctx.save();
    if (values.parentMatrix && ctx.transform) ctx.transform(...values.parentMatrix);
    ctx.globalAlpha *= (values.parentAlpha == null ? 1 : values.parentAlpha) * values.alpha;
    const pivot=api.modules.frame.pivotFor(values);ctx.translate(values.x + pivot.x, values.y + pivot.y); ctx.rotate(values.rot * Math.PI / 180); ctx.scale(values.scaleX, values.scaleY);ctx.translate(values.w / 2 - pivot.x, values.h / 2 - pivot.y);
    for (let index = 0; index < count; index++) {
      const age = (time + index / Math.max(1, count) * life) % life, angle = direction + (hash(index, 1, seed) * 2 - 1) * spread / 2, velocityX = Math.cos(angle) * speed, velocityY = Math.sin(angle) * speed, startX = hash(index, 2, seed) * values.w - values.w / 2, startY = hash(index, 3, seed) * values.h - values.h / 2, x = startX + velocityX * age + wind * age * age / 2, y = startY + velocityY * age + gravity * age * age / 2, scale = scaleBase * (1 + (hash(index, 4, seed) * 2 - 1) * sizeVar), opacity = baseAlpha * (particle.fade === false ? 1 : 1 - age / life), spin = ((+particle.spin || 0) + (+particle.spinSpeed || 0) * age + (hash(index, 5, seed) * 2 - 1) * (+particle.spinVar || 0)) * Math.PI / 180;
      if (opacity <= 0) continue;
      ctx.save(); ctx.globalAlpha *= opacity; ctx.translate(x, y); ctx.rotate(spin); ctx.scale(scale, scale); ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2); ctx.restore(); stats.particlesDrawn += 1;
    }
    ctx.restore(); surfaces.release(sprite); stats.particleEmitters += 1; stats.particleSpriteBuilds += 1;
  }
  api.modules.particles = Object.freeze({ draw, sourceFor });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:75-particle-renderer.js> */

/* <vnext:80-scene-renderer.js> */
/* ToSampool Runtime vNext source module: deterministic fixed-time renderer. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  function sceneAt(scene,rel){const segments=scene.timeline&&Array.isArray(scene.timeline.scenes)&&scene.timeline.scenes.length?scene.timeline.scenes:[{f:[0,1]}];let index=segments.findIndex((segment,current)=>rel>=+(segment.f||[0,1])[0]-.000001&&(rel<+(segment.f||[0,1])[1]-.000001||current===segments.length-1&&rel<=+(segment.f||[0,1])[1]+.000001));if(index<0)index=Math.max(0,segments.length-1);return{index,segment:segments[index]};}
  function backgroundValues(scene,frame){
    const current=sceneAt(scene,frame.rel),segment=current.segment||{},range=segment.f||[0,1],local=Math.max(0,Math.min(1,(frame.rel-(+range[0]||0))/Math.max(.000001,(+range[1]||1)-(+range[0]||0)))),base=Object.assign({color:'#000000',alpha:1},scene.background||{},segment.background||{}),key=`scene-background:${segment.id||current.index}`,track=scene.timeline&&scene.timeline.tracks&&scene.timeline.tracks[key],timed=api.modules.timeline&&api.modules.timeline.segmentAt(track&&track.segments,local);
    return { current, local, values:api.modules.timeline&&api.modules.timeline.applyValues?api.modules.timeline.applyValues(base,timed,local,track&&track.segments):base };
  }
  function drawBackgroundFill(ctx,scene,frame){
    const background=backgroundValues(scene,frame).values,alpha=Math.max(0,Math.min(1,+background.alpha||0));
    if(background.color&&alpha>0){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=background.color;ctx.fillRect(0,0,scene.width,scene.height);ctx.restore();}
    const pattern=background.fillPattern;
    if(pattern&&pattern.type&&pattern.type!=='none'&&api.modules.pattern){ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,pattern.opacity==null?1:+pattern.opacity));api.modules.pattern.paint(ctx,scene.width,scene.height,pattern,pattern.color||background.color||'#ffffff');ctx.restore();}
    return background;
  }
  function transitionHash(x,y,seed){let value=(Math.imul(x+1,374761393)^Math.imul(y+1,668265263)^Math.imul(seed+1,69069))>>>0;value=Math.imul(value^value>>>13,1274126177);return((value^value>>>16)>>>0)/4294967296;}
  function transitionState(scene,frame){const current=sceneAt(scene,frame.rel),segment=current.segment||{},raw=segment.transition||{},legacyType=raw.type==='scan'?'wipe':raw.type||'none',type=['blackout','fade','wipe','dissolve'].includes(legacyType)?legacyType:'none';if(type==='none'||current.index<=0)return null;const range=segment.f||[0,1],sceneDuration=Math.max(.001,(+range[1]-+range[0])*scene.loop),duration=Math.max(.001,Math.min(sceneDuration,+raw.duration||.25)),localTime=Math.max(0,(frame.rel-+range[0])*scene.loop),progress=Math.max(0,Math.min(1,localTime/duration));if(progress>=1)return null;return{current,segment,config:raw,type,duration,progress,direction:raw.direction||((raw.type==='scan')?'down':'right')};}
  // `next` is already on ctx. Fade / Wipe / Dissolve composite the previous
  // Scene where it has not been revealed. Blackout retains the Legacy black-
  // field language: a configurable colour cover fades away to the new Scene.
  function drawTransition(ctx,scene,frame,previous){const state=transitionState(scene,frame);if(!state)return false;const width=scene.width,height=scene.height,progress=state.progress;if(state.type!=='blackout'&&(!previous||!ctx.drawImage))return false;ctx.save();ctx.globalCompositeOperation='source-over';if(state.type==='blackout'){ctx.globalAlpha=1-progress;ctx.fillStyle=state.config.color||'#000000';ctx.fillRect(0,0,width,height);}else if(state.type==='fade'){ctx.globalAlpha=1-progress;ctx.drawImage(previous,0,0);}
    else if(state.type==='wipe'){ctx.beginPath();if(state.direction==='left')ctx.rect(0,0,Math.ceil(width*(1-progress)),height);else if(state.direction==='up')ctx.rect(0,0,width,Math.ceil(height*(1-progress)));else if(state.direction==='down')ctx.rect(0,Math.floor(height*progress),width,height);else ctx.rect(Math.floor(width*progress),0,width,height);ctx.clip();ctx.drawImage(previous,0,0);}
    else if(state.type==='dissolve'){const size=Math.max(1,Math.round(+state.config.cell||Math.max(2,Math.min(width,height)/36))),seed=Math.round(+state.config.seed||13);for(let y=0;y<height;y+=size)for(let x=0;x<width;x+=size)if(transitionHash((x/size)|0,(y/size)|0,seed)>progress)ctx.drawImage(previous,x,y,size,size,x,y,size,size);}
    ctx.restore();return true;}
  function createRuntime(input) {
    const scene = api.modules.scene.normalize(input);
    const surfaces = api.modules.surfaces.create();
    let lastStats = null, backingSizeWrites = 0;
    function renderTo(target, t, options) {
      if (!target || !target.getContext) throw new Error('renderTo 需要目标 Canvas');
      let canvasResized = false;
      if (target.width !== scene.width) { target.width = scene.width; backingSizeWrites += 1; canvasResized = true; }
      if (target.height !== scene.height) { target.height = scene.height; backingSizeWrites += 1; canvasResized = true; }
      const targetCtx = target.getContext('2d');
      if (!targetCtx) throw new Error('目标 Canvas 无 2D 上下文');
      surfaces.beginFrame();const frame = api.modules.frame.create(scene, t || 0,options);
      const sceneEffectCount = api.modules.sceneEffects.activeCount(scene), base = sceneEffectCount ? surfaces.acquire(scene.width, scene.height) : target, ctx = base.getContext('2d');
      if (!ctx) throw new Error('场景绘制层没有 2D 上下文');
      const stats = { time: frame.time, directObjects: 0, capsuleObjects: 0, maskedObjects: 0, particleEmitters: 0, particlesDrawn: 0, particleSpriteBuilds: 0, sceneEffects: 0, unsupportedEffects: [], canvasResized, backingSizeWrites };
      ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, scene.width, scene.height);
      drawBackgroundFill(ctx,scene,frame);
      api.modules.content.drawBackground(ctx, scene, frame);
      const maskOnly = api.modules.masks.maskOnlySources(scene);
      for (const entity of scene.entities) {
        if (maskOnly.has(entity.id) || entity.particleSourceOnly) continue;
        if (entity.type === 'particle-emitter') api.modules.particles.draw(ctx, scene, entity, frame, stats, surfaces);
        else api.modules.objects.draw(ctx, scene, entity, frame, stats, surfaces);
      }
      ctx.restore();
      let current = base;
      for (const stage of scene.sceneEffects.pipeline || ['overlay', 'sample']) {
        if (stage !== 'overlay' && stage !== 'sample') continue;
        const applied = api.modules.sceneEffects.applyStage(current, stage, scene, frame, surfaces); if (applied.surface !== current) { if (current !== base) surfaces.release(current); current = applied.surface; } stats.sceneEffects += applied.count;
      }
      if (base !== target) { targetCtx.clearRect(0, 0, scene.width, scene.height); targetCtx.drawImage(current, 0, 0); if (current !== base) surfaces.release(current); surfaces.release(base); }
      // Each top-level Scene has independent background / timing values.  During
      // an entry transition we render the preceding Scene at its final instant
      // into a temporary surface, then reveal the already-rendered current one.
      // This is intentionally the same Runtime path used by fixed-time export.
      if(!options||!options._skipTransition){const transition=transitionState(scene,frame);if(transition){if(transition.type==='blackout')drawTransition(targetCtx,scene,frame,null);else{const previousSegment=(scene.timeline&&scene.timeline.scenes||[])[transition.current.index-1],previousTime=Math.max(0,((previousSegment&&previousSegment.f&&previousSegment.f[1])||0)*scene.loop-.00001),previous=surfaces.acquire(scene.width,scene.height);try{createRuntime(scene).renderTo(previous,previousTime,Object.assign({},options||{},{_skipTransition:true}));drawTransition(targetCtx,scene,frame,previous);}finally{surfaces.release(previous);}}}}
      stats.previewPixelDivMultiplier=frame.preview.pixelDivMultiplier;stats.surfaces = surfaces.stats();stats.workPixels=stats.surfaces.workPixels;stats.pixelPasses=stats.surfaces.pixelPasses;lastStats = Object.freeze(stats); return lastStats;
    }
    return Object.freeze({ scene, renderTo, getLastFrameStats: () => lastStats, clearCaches: () => surfaces.clear() });
  }
  api.modules.renderer = Object.freeze({ createRuntime,drawTransition,transitionState,sceneAt,backgroundValues,drawBackgroundFill });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:80-scene-renderer.js> */

/* <vnext:90-public-api.js> */
/* ToSampool Runtime vNext source module: public self-contained API. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  api.apiVersion = 1;
  api.capabilities = Object.freeze({ fixedTimeRender: 1, deterministicFrames: 1, vnextBase: 1, objectEffects: 0, objectDecorateBase: 1, objectSamplingBase: 1, samplingField: 1, halftone: 1, namedPalettes: 1, textureOverlay: 1, lightEffects: 1, imageAssets: 1, backgroundLayers: 1, groupTransforms: 1, programMotion: 1, sceneTransitions: 1, sharedSpriteParticles: 1, registeredBuiltins: 1, staticMasks: 1, alphaMasks: 1, elementMasks: 1, sceneEffects: 1 });
  api.createRuntime = api.modules.renderer.createRuntime;
  api.renderTo = function renderTo(target, scene, t, options) { return api.createRuntime(scene).renderTo(target, t, options); };
  Object.freeze(api.modules);
  Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:90-public-api.js> */
