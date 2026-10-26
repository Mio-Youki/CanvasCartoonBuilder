/* <vnext:00-namespace.js> */
/* ToSampool Runtime vNext source module: shared namespace. */
(function (global) {
  'use strict';

  const existing = global.ToSampoolRuntimeVNext || {};
  const modules = existing.modules || Object.create(null);
  global.ToSampoolRuntimeVNext = existing;
  existing.modules = modules;
  const blendModes = Object.freeze(new Set(['multiply', 'darken', 'screen', 'lighten', 'overlay', 'soft-light', 'difference', 'luminosity', 'saturation', 'hue', 'color', 'lighter']));
  modules.blend = Object.freeze({ toCanvas: value => blendModes.has(value) ? value : 'source-over' });
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

/* <vnext:16-scene-module-registry.js> */
/* ToSampool Runtime vNext: controlled, project-scoped procedural scene modules. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const records = new Map();
  let activeScope = 'global';
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const scopeFor = scope => String(scope == null || scope === '' ? activeScope || 'global' : scope);
  const keyFor = (id, version, scope) => `${scopeFor(scope)}::${id}@${version}`;
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function parameters(manifest) { return Array.isArray(manifest && manifest.parameters) ? manifest.parameters : Array.isArray(manifest && manifest.params) ? manifest.params : []; }
  function optionValues(param) { return (param.options || []).map(option => typeof option === 'object' ? option.value : option); }
  function normalizeParam(param, value) {
    if (param.type === 'number') { let output=finite(value,param.default); if(param.integer)output=Math.round(output); return clamp(output,param.min == null ? -Infinity : param.min,param.max == null ? Infinity : param.max); }
    if (param.type === 'boolean') return value == null ? !!param.default : !!value;
    if (param.type === 'select') return optionValues(param).includes(value) ? value : param.default;
    if (param.type === 'color') return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : param.default;
    return value == null ? param.default : String(value);
  }
  function validate(definition) {
    const manifest=definition && definition.manifest;
    if (!manifest || manifest.format !== 'tosampool-scene-module/v1') throw new Error('程序构件需要 tosampool-scene-module/v1 Manifest');
    if (!manifest.id || !Number.isInteger(+manifest.version) || +manifest.version < 1) throw new Error('程序构件 Manifest 缺少稳定 id 或版本');
    if (typeof definition.render !== 'function') throw new Error(`程序构件「${manifest.id}」缺少 render 入口`);
    return manifest;
  }
  function register(definition, options) {
    const manifest=validate(definition), scope=scopeFor(options&&options.scope), key=keyFor(manifest.id,manifest.version,scope), prior=records.get(key);
    if (prior && prior.render !== definition.render) throw new Error(`程序构件「${key}」已注册；不得由第二份未知代码覆盖`);
    const record=Object.freeze({ manifest:clone(manifest), render:definition.render, timeDependent:typeof definition.timeDependent === 'function' ? definition.timeDependent : () => !!manifest.timeDependent });
    records.set(key,record); return clone(record.manifest);
  }
  function definition(id, version, options) { const record=records.get(keyFor(String(id || ''),+(version || 1),options&&options.scope)); if(!record)throw new Error(`未注册或未信任的程序构件：${id || '(空)'}@${version || 1}`); return record; }
  function normalize(entity, options) {
    const value=entity || {}, record=definition(value.moduleId,value.moduleVersion,options), params={};
    for(const param of parameters(record.manifest)) params[param.key]=normalizeParam(param,value.params&&value.params[param.key]);
    return { moduleId:record.manifest.id, moduleVersion:record.manifest.version, params };
  }
  function seeded(seed, time) { const base=(Math.imul((+seed||1)|0,2654435761)^Math.imul(Math.floor((+time||0)*1000),2246822519))>>>0; return salt=>{let value=(base^Math.imul((+salt||0)|0,3266489917))>>>0;value=Math.imul(value^(value>>>16),2246822519);value=Math.imul(value^(value>>>13),3266489917);return((value^(value>>>16))>>>0)/4294967296;}; }
  function render(ctx, entity, values, frame, scene) {
    const scope=scene&&scene.moduleScope, value=normalize(values&&values.moduleId ? values : entity,{scope}), record=definition(value.moduleId,value.moduleVersion,{scope}), declared=new Set((record.manifest.assets || []).map(item=>typeof item==='string'?item:item&&item.id).filter(Boolean)), assets={};
    for(const id of declared) if(scene.assets&&scene.assets[id]) assets[id]=scene.assets[id];
    record.render({
      ctx,
      time:frame&&frame.time||0,
      sceneIndex:frame&&Number.isInteger(frame.sceneIndex)?frame.sceneIndex:0,
      sceneProgress:frame&&Number.isFinite(+frame.sceneProgress)?+frame.sceneProgress:0,
      width:values.w,
      height:values.h,
      params:value.params,
      assets,
      random:seeded(value.params.seed == null ? entity.seed : value.params.seed,frame&&frame.time||0)
    });
  }
  function timeDependent(entity, options) { if(!entity||entity.type!=='procedural')return false;const value=normalize(entity,options),record=definition(value.moduleId,value.moduleVersion,options);return !!record.timeDependent(value.params); }
  function manifest(options) { const scope=scopeFor(options&&options.scope);return Array.from(records.entries()).filter(([key])=>key.startsWith(scope+'::')).map(([,record])=>clone(record.manifest)); }
  function withScope(scope, operation) { const prior=activeScope;activeScope=scopeFor(scope);let result;try{result=operation();}catch(error){activeScope=prior;throw error;}if(result&&typeof result.then==='function')return result.then(value=>{activeScope=prior;return value;},error=>{activeScope=prior;throw error;});activeScope=prior;return result; }

  api.modules.sceneModules = Object.freeze({ register, definition, normalize, normalizeParam, render, timeDependent, manifest, withScope, parameters });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:16-scene-module-registry.js> */

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
    if(parts[0]==='partsById'){
      let id=parts[1];try{id=decodeURIComponent(id);}catch(_){}
      const index=(out.parts||[]).findIndex(part=>part.id===id);
      if(index<0)return;
      return assign(out,['parts',String(index)].concat(parts.slice(2)).join('.'),value);
    }
    for(let i=0;i<parts.length-1;i++)if(parts[i]==='extensionsById'){let id=parts[i+1];try{id=decodeURIComponent(id);}catch(_){}if(['__proto__','prototype','constructor'].includes(id))return;parts.splice(i,2,'extensions',id);i++;}
    if (parts.length === 1) { out[parts[0]] = value; return; }
    let target = out;
    for (let index = 0; index < parts.length - 1; index++) {
      const part = parts[index];
      target[part] = Array.isArray(target[part]) ? target[part].slice() : Object.assign({}, target[part] || {});
      target = target[part];
    }
    target[parts[parts.length - 1]] = value;
  }

  function valueAt(base,key){
    const parts=String(key||'').split('.');let value=base;
    if(parts[0]==='partsById'){let id=parts[1];try{id=decodeURIComponent(id);}catch(_){}value=(base.parts||[]).find(part=>part.id===id);parts.splice(0,2);}
    for(let i=0;i<parts.length;i++){let part=parts[i];if(value==null)return undefined;if(part==='extensionsById'){let id=parts[++i];try{id=decodeURIComponent(id);}catch(_){}value=value.extensions?.[id];continue;}if(part==='strokeCompletion'&&['stroke','line','rect','ellipse','poly'].includes(value.type)&&value[part]==null)return 100;if(part==='pathStart'&&value[part]==null)return 0;value=value[part];}return value;
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
      const a = from[key] !== undefined ? from[key] : valueAt(base,key);
      const b = to[key] !== undefined ? to[key] : valueAt(base,key);
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
    const raw=tracks[ownerId]||tracks[`entity:${ownerId}`],input=api.modules.maskContract?api.modules.maskContract.withoutTiming(raw):raw,track=api.modules.parameterTiming?api.modules.parameterTiming.forEntity(base,input,scene):input;
    const result=applyValues(base, track && segmentAt(track.segments, rel), rel, track&&track.segments);return api.modules.maskContract?api.modules.maskContract.restoreBase(result,base):result;
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
    const track=api.modules.maskContract?api.modules.maskContract.withoutTiming(tracks[key],true):tracks[key],result=applyValues(base, segmentAt(track && track.segments, rel), rel, track&&track.segments);return api.modules.maskContract?api.modules.maskContract.restoreBase(result,base,true):result;
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

/* <vnext:21-parameter-timing.js> */
/* Parameter capability gate. Uses the one Runtime Step/Linear evaluator. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,copy=v=>JSON.parse(JSON.stringify(v)),cache=new WeakMap();
  const modes=Object.freeze({No:'No',Step:'Step',Linear:'Linear',none:'No',step:'Step','linear-safe':'Linear',linear:'Linear'});
  function capability(param){
    const timing=modes[param.timing??'No'];if(!timing)throw Error('未知参数时序能力');
    if(timing==='Linear'&&(param.type!=='number'&&param.type!=='color'||param.integer))throw Error('该参数类型不能声明Linear');
    const interpolation=param.interpolation||(param.type==='color'?'color':'number');
    if(timing==='Linear'&&!['number','color','angle-direct'].includes(interpolation))throw Error('未知插值规则');
    if(timing==='Linear'&&(interpolation==='color')!==(param.type==='color'))throw Error('插值规则与参数类型不一致');
    return{timing,interpolation};
  }
  function filterTrack(track,parameters,options){
    const rules=new Map(parameters.map(p=>[p.path||p.key,capability(p)])),prefixes=options?.prefixes||[],strict=options?.strict!==false;
    const policy=key=>rules.get(key)||((strict||prefixes.some(p=>key.startsWith(p)))?{timing:'No'}:{timing:'Linear'});
    const segments=(track?.segments||[]).map(segment=>{
      const out={...segment};for(const key of ['values','from','to'])if(out[key])out[key]=Object.fromEntries(Object.entries(out[key]).filter(([path])=>policy(path).timing!=='No'));
      return out;
    });
    const keys=[...new Set(segments.flatMap(s=>['values','from','to'].flatMap(k=>Object.keys(s[k]||{}))))];
    for(const segment of segments)if(segment.type==='linear')segment.linearKeys=keys.filter(key=>policy(key).timing==='Linear'&&(!Array.isArray(segment.linearKeys)||segment.linearKeys.includes(key)));
    return{...track,segments};
  }
  function evaluate(base,track,rel,parameters){const filtered=filterTrack(track,parameters);return api.modules.timeline.applyValues(base,api.modules.timeline.segmentAt(filtered.segments,rel),rel,filtered.segments);}
  function threeSegments(base,target,armed,parameters,transition){
    const selected=new Set(armed),values={};
    for(const p of parameters)if(selected.has(p.key)&&capability(p).timing!=='No'&&Object.hasOwn(target,p.key))values[p.key]=copy(target[p.key]);
    const linearKeys=parameters.filter(p=>capability(p).timing==='Linear').map(p=>p.key);
    return{segments:[{f:[0,1/3],type:'step',values:{}},transition?{f:[1/3,2/3],type:'linear',linearKeys}:{f:[1/3,2/3],type:'step',values:{}},{f:[2/3,1],type:'step',values}]};
  }
  function forRecipes(base,track){
    if(!track||!base.recipe?.definition&&!(base.parts||[]).some(part=>part.recipe?.definition))return track;
    if(!track?.segments?.some(s=>['values','from','to'].some(k=>Object.keys(s[k]||{}).some(key=>key.startsWith('recipe.params.')||key.includes('.recipe.params.')))))return track;
    const providers=[base,...base.parts||[]].filter(part=>part.recipe?.definition),sign=providers.flatMap(part=>[part.id,part.recipe.definition,part===base?-1:base.parts.indexOf(part)]),prior=cache.get(track);
    if(prior&&sign.length===prior.signature.length&&sign.every((value,i)=>value===prior.signature[i]))return prior.track;
    const parameters=[],prefixes=[];
    for(const part of providers){
      const prefix=part===base?'recipe.params.':'partsById.'+encodeURIComponent(part.id).replace(/\./g,'%2E')+'.recipe.params.';
      prefixes.push(prefix);
      for(const param of part.recipe.definition.parameters)parameters.push({...param,path:prefix+param.key});
      if(part!==base){const indexPrefix='parts.'+base.parts.indexOf(part)+'.recipe.params.';prefixes.push(indexPrefix);for(const param of part.recipe.definition.parameters)parameters.push({...param,path:indexPrefix+param.key});}
    }
    if(!prefixes.length)return track;
    const filtered=filterTrack(track,parameters,{strict:false,prefixes});cache.set(track,{signature:sign,track:filtered});return filtered;
  }
  const attachedCache=new WeakMap(),programCache=new WeakMap(),particleCache=new WeakMap();
  function forProgram(base,track,scene){
    if(!track||!['builtin','procedural'].includes(base.type))return track;
    let definition,parameters,prefix;
    try{if(base.type==='builtin'){definition=api.modules.builtins.definition(base.builtin.id,base.builtin.version);parameters=definition.params;prefix='builtin.params.';}else{definition=api.modules.sceneModules.definition(base.moduleId,base.moduleVersion,{scope:scene?.moduleScope||scene?._moduleScope});parameters=definition.manifest.parameters||definition.manifest.params||[];prefix='params.';}}catch{return track;}
    const prior=programCache.get(track);if(prior?.definition===definition&&prior.prefix===prefix)return prior.track;
    const result=filterTrack(track,parameters.map(p=>({...p,path:prefix+p.key})),{strict:false,prefixes:[prefix]});programCache.set(track,{definition,prefix,track:result});return result;
  }
  function forEntity(base,track,scene){
    if(base.type==='particle-emitter'&&track){
      if(!particleCache.has(track)){const keys=['particle.mode','particle.cellSize','particle.startTime','particle.sourceId','particle.layerEmission','particle.fragmentShape','particle.sampleTime','particle.sourceFps','particle.showSource'];particleCache.set(track,filterTrack(track,keys.map(key=>({key,type:'number',timing:'No'})),{strict:false,prefixes:keys}));}track=particleCache.get(track);
    }
    const filtered=forRecipes(base,forProgram(base,track,scene));if(!filtered)return filtered;
    const bindings=[];for(const part of [base,...base.parts||[]])for(const id of part.extensions?.attached||[]){const config=part.extensions[id];if(config?.definition?.format==='tosampool-pattern-generator/v1')bindings.push({part,id,definition:config.definition});}
    if(!bindings.length)return filtered;const signature=bindings.flatMap(b=>[b.part.id,b.id,b.definition,b.part===base?-1:base.parts.indexOf(b.part)]),prior=attachedCache.get(filtered);
    if(prior&&signature.length===prior.signature.length&&signature.every((v,i)=>v===prior.signature[i]))return prior.track;
    const parameters=[],prefixes=[];for(const {part,id,definition}of bindings){const group='extensionsById.'+encodeURIComponent(id).replace(/\./g,'%2E')+'.',roots=part===base?['']:[`partsById.${encodeURIComponent(part.id).replace(/\./g,'%2E')}.`,`parts.${base.parts.indexOf(part)}.`];for(const root of roots){parameters.push({key:root+group+'enabled',type:'boolean',timing:'Step'});prefixes.push(root+group+'params.');for(const p of definition.parameters)parameters.push({...p,path:root+group+'params.'+p.key});}}
    const result=filterTrack(filtered,parameters,{strict:false,prefixes});attachedCache.set(filtered,{signature,track:result});return result;
  }
  api.modules.parameterTiming=Object.freeze({capability,filterTrack,evaluate,threeSegments,forEntity});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:21-parameter-timing.js> */

/* <vnext:29-motion.js> */
/* Shared deterministic time primitives. Effects map these values to their own units. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,wrap=p=>((p%1)+1)%1;
  const ease=(p,mode)=>mode==='ease-in'?p*p:mode==='ease-out'?1-(1-p)*(1-p):mode==='smooth'||mode==='ease-in-out'?p*p*(3-2*p):p;
  function curve(phase,mode){
    const raw=wrap(phase);
    if(mode==='step')return raw<.5?-1:1;
    if(!mode||mode==='smooth')return Math.sin(raw*Math.PI*2);
    const shift=mode==='ease-in'?Math.SQRT1_2/2:mode==='ease-out'?(1-Math.SQRT1_2)/2:.25,p=wrap(raw+shift),leg=p<.5?p*2:2-p*2;
    return -1+2*ease(leg,mode);
  }
  function clock(spec,time,options={}){
    spec=spec||{};
    const period=Math.max(.001,Number.isFinite(+spec.period)&&+spec.period>0?+spec.period:options.period||1),position=(Number.isFinite(+time)?+time:0)/period,cycle=Math.floor(position),phase=position-cycle;
    const frames=Math.max(1,Math.round(+spec.periodFrames||+spec.steps||options.frames||8)),stepped=spec.stepped??options.stepped??false,index=Math.min(frames-1,Math.floor(phase*frames+1e-10));
    return{period,cycle,phase:stepped?index/frames:phase,index,frames,stepped,tick:cycle*frames+index};
  }
  function oscillate(spec,time,options){
    const c=clock(spec,time,options),mode=spec?.curve||'smooth';
    if(!c.stepped)return curve(c.phase,mode);
    // Discrete oscillators sample from an extremum: N=2 is -1,+1, never 0,0.
    if(mode==='step')return c.phase<.5?-1:1;
    if(mode==='smooth')return-Math.cos(c.phase*Math.PI*2);
    return-1+2*ease(c.phase<.5?c.phase*2:2-c.phase*2,mode);
  }
  function progress(spec,time,options){return ease(clock(spec,time,options).phase,spec?.curve||'linear');}
  function advance(spec,time,options){const c=clock(spec,time,options);return c.cycle+ease(c.phase,spec?.curve||'linear');}
  function motionTime(spec,time,period){if(!(period>0)||!Number.isFinite(period))return time;const c=clock({...spec,period},time);return(c.cycle+c.phase)*period;}
  function refresh(spec,time,options={}){const c=clock({...spec,stepped:true},time,options);return options.loop===false?c.tick:c.index;}
  api.modules.motion=Object.freeze({ease,curve,clock,oscillate,progress,advance,motionTime,refresh});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:29-motion.js> */

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
    const x = +values.x || 0, y = +values.y || 0, sx = Number.isFinite(+values.scaleX) ? +values.scaleX : 1, sy = Number.isFinite(+values.scaleY) ? +values.scaleY : 1, skewX=Math.tan(Math.max(-80,Math.min(80,+values.skewX||0))*Math.PI/180),skewY=Math.tan(Math.max(-80,Math.min(80,+values.skewY||0))*Math.PI/180), radians = (+values.rot || 0) * Math.PI / 180, cos = Math.cos(radians), sin = Math.sin(radians), a = cos*sx*(1+skewX*skewY)-sin*sy*skewY, b = sin*sx*(1+skewX*skewY)+cos*sy*skewY, c = cos*sx*skewX-sin*sy, d = sin*sx*skewX+cos*sy, pivot=pivotFor(values),px=x+pivot.x,py=y+pivot.y;
    return [a, b, c, d, px - a * pivot.x - c * pivot.y, py - b * pivot.x - d * pivot.y];
  }

  /* Deterministic periodic primitives, not keyframe curves. Each motion cycle
     closes; a scene loop closes only when its duration fits those cycles.
     Evaluation is O(1) per animated object, without pixel buffers. */
  const {curve,ease,motionTime}=api.modules.motion;
  const travel=(spec,time,period)=>api.modules.motion.advance({...spec,period},time);
  const oscillate=(spec,time)=>api.modules.motion.oscillate(spec,time);

  /* Gate is the declaration for a periodic on/off light.  Unlike the normal
     blink amplitude (a two-state dimmer), it retains an explicit duty window
     and phase.  It is useful beyond Legacy conversion: signal lights,
     machine indicators and a deliberately off-beat pixel window can all be
     described without a custom draw callback. */
  function blinkAlpha(spec, time) {
    if (!spec || typeof spec !== 'object') return 1;
    if (spec.mode === 'gate') {
      const period=Math.max(.001,+spec.period||1),duty=Math.max(0,Math.min(1,spec.duty==null?.5:+spec.duty)),phase=((+spec.phase||0)%1+1)%1,pos=((time/period)%1+1)%1,relative=(pos-phase+1)%1;
      return relative<duty?(spec.on==null?1:Math.max(0,Math.min(1,+spec.on))):(spec.off==null?0:Math.max(0,Math.min(1,+spec.off)));
    }
    if (!Number.isFinite(+spec.amount)) return 1;
    const period=Math.max(.001,+spec.period||1);
    return 1-Math.max(0,Math.min(1,+spec.amount))*((oscillate(spec,time)+1)/2);
  }

  function motion(scene, values, entity, time) {
    const anim = values.anim || entity.anim || {};
    const out = Object.assign({}, values);
    const enabled = key => api.modules.timeline.visibleFor(scene, `motion:object:${entity.id}:${key}`, time / Math.max(.001, +scene.loop || 1));
    if (anim.bob && enabled('bob') && Number.isFinite(+anim.bob.amount)) {
      const angle = (Number.isFinite(+anim.bob.angle) ? +anim.bob.angle : 90) * Math.PI / 180, offset = oscillate(anim.bob,time) * +anim.bob.amount;
      out.x += Math.cos(angle) * offset; out.y += Math.sin(angle) * offset;
    }
    if (anim.scroll && enabled('scroll') && Number.isFinite(+anim.scroll.speed)) {
      const angle = (+anim.scroll.angle || 0) * Math.PI / 180, span = Math.max(0, +anim.scroll.span || 0), repeating=anim.scroll.repeat!==false&&span>0,period=span/Math.abs(+anim.scroll.speed),raw=repeating&&Number.isFinite(period)?travel(anim.scroll,time,period)*span*Math.sign(+anim.scroll.speed):time*+anim.scroll.speed, distance = repeating ? ((raw % span) + span) % span : raw;
      out.x += Math.cos(angle) * distance; out.y += Math.sin(angle) * distance;
    }
    if (anim.pulse && enabled('pulse') && Number.isFinite(+anim.pulse.amount)) {
      const scale = 1 + oscillate(anim.pulse,time) * +anim.pulse.amount;
      out.scaleX = (Number.isFinite(+out.scaleX) ? +out.scaleX : 1) * scale; out.scaleY = (Number.isFinite(+out.scaleY) ? +out.scaleY : 1) * scale;
    }
    if (anim.spin && enabled('spin') && Number.isFinite(+anim.spin.speed)){const period=360/Math.abs(+anim.spin.speed);out.rot+=Number.isFinite(period)?travel(anim.spin,time,period)*360*Math.sign(+anim.spin.speed):0;}
    if (anim.wave && enabled('wave') && Number.isFinite(+anim.wave.amount))out.rot+=oscillate(anim.wave,time)*+anim.wave.amount;
    if (anim.blink && enabled('blink')) out.alpha *= blinkAlpha(anim.blink,time);
    return out;
  }

  // Linear tracks deliberately retain sub-pixel values while being evaluated.
  // Only the drawable frame is snapped, so interpolation stays smooth in data
  // and every raster edge still lands on the pixel grid.
  function snapGeometry(values) {
    const out = Object.assign({}, values);
    for (const key of ['x', 'y', 'w', 'h']) if (Number.isFinite(+out[key])) out[key] = key === 'w' || key === 'h' ? Math.max(1, Math.round(+out[key])) : Math.round(+out[key]);
    return out;
  }

  function sceneSegmentAt(scene, rel) {
    const scenes=scene.timeline&&Array.isArray(scene.timeline.scenes)&&scene.timeline.scenes.length?scene.timeline.scenes:[{f:[0,1]}];
    const index=scenes.findIndex((segment,current)=>rel>=+(segment.f||[0,1])[0]-.000001&&(rel<+(segment.f||[0,1])[1]-.000001||current===scenes.length-1&&rel<=+(segment.f||[0,1])[1]+.000001));
    const safeIndex=index<0?Math.max(0,scenes.length-1):index;
    return { index:safeIndex, segment:scenes[safeIndex]||{f:[0,1]} };
  }
  function sceneIndexAt(scene, rel) {
    return sceneSegmentAt(scene,rel).index;
  }
  function sceneVariant(entity, index) {
    const variants=entity&&entity.sceneVariants;
    return Array.isArray(variants)&&variants.length?variants[Math.min(Math.max(0,index),variants.length-1)]||null:null;
  }

  function create(scene, t, preview) {
    const time = wrap(t, scene.loop);
    const rel = time / scene.loop;
    const currentScene=sceneSegmentAt(scene,rel),currentSceneIndex=currentScene.index,sceneRange=currentScene.segment.f||[0,1],sceneStart=Math.max(0,Math.min(1,+sceneRange[0]||0)),sceneEnd=Math.max(sceneStart+.000001,Math.min(1,+sceneRange[1]||1)),sceneProgress=Math.max(0,Math.min(1,(rel-sceneStart)/(sceneEnd-sceneStart)));
    const local = new Map(), byId = new Map(), entities = new Map(scene.entities.map(entity => [entity.id, entity]));
    for (const entity of scene.entities) {
      // Editor projections may evaluate an authored (not yet Runtime-normalized)
      // document. Match the drawable defaults before motion and parent Alpha.
      const variant=sceneVariant(entity,currentSceneIndex),base=Object.assign({x:0,y:0,w:1,h:1,scaleX:1,scaleY:1,rot:0,alpha:1},entity,variant||{});
      const values = api.modules.timeline.valuesFor(scene, entity.id, base, rel);
      values.timelineVisible = api.modules.timeline.visibleFor(scene, entity.id, rel);
      local.set(entity.id, snapGeometry(motion(scene, values, entity, time)));
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
    return Object.freeze({ scene, time, rel, sceneIndex:currentSceneIndex, sceneProgress, preview:quality, paletteCapture:preview&&preview.paletteCapture, valuesFor: entity => byId.get(entity.id) || entity, effectValuesFor: (scope, ownerId, effectId, base) => api.modules.timeline.effectValuesFor(scene, scope, ownerId, effectId, base, rel), controllerValuesFor: (scope, ownerId, controllerId, base) => api.modules.timeline.controllerValuesFor(scene, scope, ownerId, controllerId, base, rel) });
  }

  api.modules.frame = Object.freeze({ create, matrixFor, multiply, pivotFor, curve, ease, motionTime, travel, blinkAlpha, snapGeometry, sceneSegmentAt, sceneIndexAt, IDENTITY });
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
    const roles = new Map(), roleCanvases = new WeakSet(), identities = new WeakMap();
    let nextIdentity = 0, roleAllocations = 0;
    const clearHooks = new Set();
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
      if (!canvas || roleCanvases.has(canvas)) return;
      const key = `${canvas.width}x${canvas.height}`;
      const bucket = free.get(key) || []; bucket.push(canvas); free.set(key, bucket);
    }
    function acquireRole(role,width,height){
      width=Math.max(1,Math.ceil(width));height=Math.max(1,Math.ceil(height));
      let canvas=roles.get(role);
      if(!canvas||canvas.width!==width||canvas.height!==height){
        canvas=makeCanvas(width,height);if(!canvas)throw new Error('当前环境无法创建固定角色 Canvas');
        roles.set(role,canvas);roleCanvases.add(canvas);roleAllocations++;
      }else reuses++;
      acquires++;peakPixels=Math.max(peakPixels,width*height);return canvas;
    }
    function describe(canvas){
      if(!canvas)return null;
      if(!identities.has(canvas))identities.set(canvas,++nextIdentity);
      return {id:identities.get(canvas),width:canvas.width,height:canvas.height};
    }
    function beginFrame(){workPixels=0;pixelPasses=0;}
    function notePixels(width,height,passes){passes=Math.max(1,+passes||1);workPixels+=Math.max(1,Math.round(width))*Math.max(1,Math.round(height))*passes;pixelPasses+=passes;}
    function clear() { for(const hook of clearHooks)hook();clearHooks.clear();free.clear();roles.clear();roleAllocations=0; peakPixels = 0; acquires = 0; reuses = 0; backingSizeWrites = 0; beginFrame(); }
    return Object.freeze({ acquire, acquireRole, describe, release, beginFrame, notePixels, clear, onClear:hook=>clearHooks.add(hook), stats: () => Object.assign({ peakPixels, acquires, reuses, backingSizeWrites, workPixels, pixelPasses },roles.size?{roleSurfaceCount:roles.size,roleAllocations,rolePixels:[...roles.values()].reduce((sum,c)=>sum+c.width*c.height,0)}:{}) });
  }
  api.modules.surfaces = Object.freeze({ create });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:40-surface-pool.js> */

/* <vnext:49-mask-contract.js> */
/* Mask domain v1: base-only parameters and render dependency validation. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,cache=new WeakMap(),SKIP=Symbol('mask-No');
  const roots=Object.freeze(['effects.mask','particle.emissionRange','particle.motionRange']);
  const geometryTypes=Object.freeze(['rect','ellipse','poly']);
  function channel(r,g,b,a,mode){return mode==='luma'?Math.round((r*.2126+g*.7152+b*.0722)*a/255):a;}
  function containsGeometry(shape,x,y){
    if(shape.type==='shapes')return shape.shapes.some(s=>containsGeometry(s,x,y));
    if(shape.type==='rect')return shape.w>0&&shape.h>0&&x>=shape.x&&x<=shape.x+shape.w&&y>=shape.y&&y<=shape.y+shape.h;
    if(shape.type==='ellipse'){const dx=(x-shape.x-shape.w/2)/(shape.w/2),dy=(y-shape.y-shape.h/2)/(shape.h/2);return dx*dx+dy*dy<=1;}
    if(shape.type==='poly'){
      let winding=0;const points=shape.points||[];
      for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],cross=(b[0]-a[0])*(y-a[1])-(x-a[0])*(b[1]-a[1]);if(a[1]<=y&&b[1]>y&&cross>0)winding++;else if(a[1]>y&&b[1]<=y&&cross<0)winding--;}
      return winding!==0;
    }return false;
  }
  function normalizeShapes(mask){
    if(mask?.type!=='shapes')return mask;
    if(mask.version!==1||!Array.isArray(mask.shapes)||mask.shapes.length<1||mask.shapes.length>64)throw Error('图形蒙版需要版本1及1到64个图形');
    const ids=new Set();let points=0;
    const shapes=mask.shapes.map(shape=>{
      if(!shape||typeof shape.id!=='string'||!shape.id||ids.has(shape.id))throw Error('蒙版图形ID缺失或重复');ids.add(shape.id);
      if(!geometryTypes.includes(shape.type))throw Error('蒙版图形仅支持矩形、椭圆和多边形');
      if(Object.keys(shape).some(key=>!['id','name','type','x','y','w','h','points'].includes(key)))throw Error('蒙版图形含未声明字段；跟随和反相应设置在合并层');
      const out={id:shape.id,type:shape.type};if(shape.name!=null)out.name=String(shape.name);
      if(shape.type==='poly'){
        if(!Array.isArray(shape.points)||shape.points.length<3||shape.points.length>4096||shape.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>typeof v!=='number'||!Number.isFinite(v))))throw Error('蒙版图形路径无效或超出4096点预算');
        points+=shape.points.length;out.points=shape.points.map(p=>p.slice());
      }else{for(const key of ['x','y','w','h'])if(typeof shape[key]!=='number'||!Number.isFinite(shape[key]))throw Error('蒙版图形范围无效');if(shape.w<=0||shape.h<=0)throw Error('蒙版图形范围必须大于0');Object.assign(out,{x:shape.x,y:shape.y,w:shape.w,h:shape.h});}
      return out;
    });
    if(points>16384)throw Error('蒙版图形总顶点超出16384点预算');
    return {...mask,shapes};
  }
  function blocked(path,effect){return(effect?['mask']:roots).some(root=>path===root||path.startsWith(root+'.'));}
  function cleanValue(path,value,effect,counter){
    if(blocked(path,effect)){counter.count++;return SKIP;}
    if(!value||typeof value!=='object'||Array.isArray(value))return value;
    let changed=false;const out={};
    for(const [key,next]of Object.entries(value)){const clean=cleanValue(path?path+'.'+key:key,next,effect,counter);if(clean===SKIP){changed=true;continue;}out[key]=clean;changed=changed||clean!==next;}
    return changed?(Object.keys(out).length?out:SKIP):value;
  }
  function withoutTiming(track,effect=false){
    if(!track)return track;const prior=cache.get(track);if(prior&&prior.effect===effect)return prior.track;
    const counter={count:0},segments=(track.segments||[]).map(segment=>{
      const next={...segment};let changed=false;
      for(const slot of ['values','from','to'])if(segment[slot]){const clean={};for(const [path,value]of Object.entries(segment[slot])){const v=cleanValue(path,value,effect,counter);if(v!==SKIP){if(!effect&&['effects','particle'].includes(path)){if(v&&typeof v==='object'&&!Array.isArray(v))for(const [key,child]of Object.entries(v))clean[path+'.'+key]=child;changed=true;}else clean[path]=v;}if(v!==value)changed=true;}if(changed)next[slot]=clean;}
      if(Array.isArray(segment.linearKeys)){next.linearKeys=segment.linearKeys.filter(path=>!blocked(path,effect));changed=changed||next.linearKeys.length!==segment.linearKeys.length;}
      return changed?next:segment;
    });
    const changed=segments.some((s,i)=>s!==track.segments[i]),result=changed?{...track,segments}:track;
    cache.set(track,{effect,track:result,count:counter.count});return result;
  }
  function stripSceneTiming(scene){
    if(!scene?.timeline?.tracks)return 0;let count=0;
    for(const [key,track]of Object.entries(scene.timeline.tracks)){const clean=withoutTiming(track,key.startsWith('effect:'));if(clean!==track){scene.timeline.tracks[key]=clean;count++;}}
    return count;
  }
  function restoreBase(out,base,effect=false){
    if(out===base)return out;
    if(effect?out.mask===base.mask:out.effects?.mask===base.effects?.mask&&out.particle?.emissionRange===base.particle?.emissionRange&&out.particle?.motionRange===base.particle?.motionRange)return out;
    const result={...out};
    function restore(target,original,key){if(original&&Object.hasOwn(original,key))target[key]=original[key];else delete target[key];}
    if(effect)restore(result,base,'mask');
    else{
      if(out.effects||base.effects){result.effects={...out.effects};restore(result.effects,base.effects,'mask');}
      if(out.particle||base.particle){result.particle={...out.particle};for(const key of ['emissionRange','motionRange'])restore(result.particle,base.particle,key);}
    }
    return result;
  }
  function references(value,result=new Set()){
    if(!value||typeof value!=='object')return result;
    if(value.type==='element'&&value.targetId)result.add(String(value.targetId));
    // Path instances/endpoints and particle sprites can also close a render cycle.
    if(value.sourceId)result.add(String(value.sourceId));
    for(const child of Object.values(value))if(child&&typeof child==='object')references(child,result);
    return result;
  }
  function validateReferences(scene,extraMasks=[]){
    const entities=scene.entities||[],byId=new Map(entities.map(e=>[e.id,e])),edges=new Map(entities.map(e=>[e.id,new Set()]));
    function mask(mask,label){if(mask?.type==='shapes')normalizeShapes(mask);if(mask?.type==='element'){const source=byId.get(mask.targetId);if(!source)throw Error(label+'引用了不存在的蒙版来源：'+mask.targetId);if(source.type==='particle-emitter')throw Error('粒子发射器不能作为蒙版来源');if(!['alpha','luma',undefined].includes(mask.mode))throw Error('蒙版提取方式无效');}}
    for(const entity of entities){mask(entity.effects?.mask,entity.id);mask(entity.particle?.emissionRange,entity.id);mask(entity.particle?.motionRange,entity.id);const deps=references({effects:entity.effects,parts:entity.parts,particle:entity.particle,extensions:entity.extensions});for(const id of deps)if(byId.has(id))edges.get(entity.id).add(id);if(entity.type==='group')for(const child of entities)if(child.parentId===entity.id)edges.get(entity.id).add(child.id);}
    for(const stage of ['overlay','sample'])for(const config of Object.values(scene.sceneEffects?.[stage]||{}))mask(config?.mask,'场景滤镜');for(const m of extraMasks)mask(m,'蒙版');
    const active=new Set(),done=new Set();function visit(id){if(active.has(id))throw Error('蒙版／对象渲染存在循环引用：'+[...active,id].join(' → '));if(done.has(id))return;active.add(id);for(const next of edges.get(id)||[])visit(next);active.delete(id);done.add(id);}for(const id of edges.keys())visit(id);
    return true;
  }
  api.modules.maskContract=Object.freeze({version:1,timing:'No',roots,geometryTypes,normalizeShapes,channel,containsGeometry,withoutTiming,restoreBase,stripSceneTiming,validateReferences,references});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:49-mask-contract.js> */

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
  function placementMatrix(mask,owner,frame){
    const follow=followMatrix(mask,owner,frame);return mask&&Object.hasOwn(mask,'geometryMatrix')?multiply(follow,geometryMatrix(mask)):follow;
  }
  function geometryMatrix(mask){
    const m=mask.geometryMatrix;
    if(!Array.isArray(m)||m.length!==6||!m.every(v=>typeof v==='number'&&Number.isFinite(v))||Math.abs(m[0]*m[3]-m[1]*m[2])<.0000001)throw Error('蒙版几何矩阵无效或不可逆');
    return m;
  }
  function transform(ctx, matrix) { if (matrix !== IDENTITY) ctx.transform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]); }
  function appendGeometry(ctx,mask){
    if (mask.type === 'rect') ctx.rect(+mask.x || 0, +mask.y || 0, Math.max(0, +mask.w || 0), Math.max(0, +mask.h || 0));
    else if (mask.type === 'ellipse') {ctx.moveTo((+mask.x||0)+(+mask.w||0),(+mask.y||0)+(+mask.h||0)/2);ctx.ellipse((+mask.x || 0) + (+mask.w || 0) / 2, (+mask.y || 0) + (+mask.h || 0) / 2, Math.abs(+mask.w || 0) / 2, Math.abs(+mask.h || 0) / 2, 0, 0, Math.PI * 2);ctx.closePath();}
    else if (mask.type === 'poly' && Array.isArray(mask.points) && mask.points.length >= 3) {
      // All subpaths have the same winding: nonzero clipping is a union,
      // including polygons drawn in the opposite direction. No overlap holes.
      const area=mask.points.reduce((sum,p,i)=>{const q=mask.points[(i+1)%mask.points.length];return sum+p[0]*q[1]-q[0]*p[1];},0),points=area<0?mask.points.slice().reverse():mask.points;
      points.forEach((point, index) => index ? ctx.lineTo(+point[0] || 0, +point[1] || 0) : ctx.moveTo(+point[0] || 0, +point[1] || 0));
      ctx.closePath();
    } else return false;
    return true;
  }
  function clipPath(ctx, mask) {
    if (!mask || !mask.type || mask.type === 'none') return false;
    ctx.beginPath();
    if(mask.type==='shapes'){for(const shape of mask.shapes)appendGeometry(ctx,shape);return true;}
    return appendGeometry(ctx,mask);
  }
  function applyStatic(surface, mask, bounds, surfaces, owner, frame) {
    if (!mask || !['rect', 'ellipse', 'poly','shapes'].includes(mask.type)) return false;
    const ctx = surface && surface.getContext && surface.getContext('2d');
    if (!ctx || !clipPath) return false;
    // Canvas clipping constrains drawing but does not itself clear pixels outside
    // the path. Render through a temporary surface so the static mask is a real
    // crop rather than a no-op on browsers with optimized compositing.
    const clipped = surfaces.acquire(surface.width, surface.height), out = clipped.getContext('2d');
    out.clearRect(0, 0, clipped.width, clipped.height);
    const follow = placementMatrix(mask, owner, frame);
    if (mask.invert) {
      // Start from the complete object and punch its absolute-coordinate mask
      // out.  The temporary surface is local to `bounds`, hence the translation.
      out.drawImage(surface, 0, 0); out.save(); out.translate(-bounds.x, -bounds.y); transform(out, follow);
      if (!clipPath(out, mask)) { out.restore(); surfaces.release(clipped); return false; }
      // clip() belongs to the saved Canvas state, so do not restore here: it
      // would discard the clip. Reset only the transform, retaining the clip.
      out.clip(); out.setTransform(1, 0, 0, 1, 0, 0); out.clearRect(0, 0, clipped.width, clipped.height); out.restore();
    } else {
      // Establish the mask in world coordinates within this local capsule.
      out.save(); out.translate(-bounds.x, -bounds.y); transform(out, follow);
      if (!clipPath(out, mask)) { out.restore(); surfaces.release(clipped); return false; }
      // Same separation as the inverted branch: keep the clip, but cancel the
      // transform exactly before placing the pre-rendered object capsule.
      out.clip(); out.setTransform(1, 0, 0, 1, 0, 0); out.drawImage(surface, 0, 0); out.restore();
    }
    ctx.clearRect(0, 0, surface.width, surface.height); ctx.drawImage(clipped, 0, 0); surfaces.release(clipped);
    return true;
  }
  function compose(surface, alpha, invert) {
    const ctx = surface.getContext('2d'); ctx.save(); ctx.globalCompositeOperation = invert ? 'destination-out' : 'destination-in'; ctx.drawImage(alpha, 0, 0); ctx.restore();
  }
  function alphaAsset(scene, mask,frame) {
    return api.modules.content.assetFrame(scene,mask.assetId||mask.imageId,frame?.time||0,mask);
  }
  function applyAlpha(surface, mask, bounds, scene, surfaces, owner, frame) {
    const image = alphaAsset(scene, mask,frame); if (!image) throw new Error(`Alpha 蒙版缺少素材：${mask.assetId || mask.imageId || '(空)'}`);
    const alpha = surfaces.acquire(surface.width, surface.height), ctx = alpha.getContext('2d'), x = Number.isFinite(+mask.x) ? +mask.x : 0, y = Number.isFinite(+mask.y) ? +mask.y : 0, w = Math.max(1, +mask.w || scene.width), h = Math.max(1, +mask.h || scene.height);
    ctx.clearRect(0, 0, alpha.width, alpha.height); ctx.save(); ctx.translate(-bounds.x, -bounds.y); transform(ctx, placementMatrix(mask, owner, frame)); ctx.drawImage(image, x, y, w, h); ctx.restore();
    if (mask.mode === 'luma') {
      try { const pixels = ctx.getImageData(0, 0, alpha.width, alpha.height); for (let i = 0; i < pixels.data.length; i += 4) pixels.data[i + 3] = api.modules.maskContract.channel(pixels.data[i],pixels.data[i+1],pixels.data[i+2],pixels.data[i+3],'luma'); ctx.putImageData(pixels, 0, 0); }
      catch (error) { surfaces.release(alpha); throw new Error(`明度蒙版读取失败：${error.message || 'Canvas 可能被跨域素材污染'}`); }
    }
    compose(surface, alpha, !!mask.invert); surfaces.release(alpha); return true;
  }
  function applyElement(surface, mask, bounds, scene, frame, surfaces) {
    const capture=api.modules.maskSources.obtain(scene,frame,surfaces,mask.targetId,mask.mode||'alpha',Object.hasOwn(mask,'geometryMatrix')?geometryMatrix(mask):null,mask.sourceQuality),alpha=surfaces.acquire(surface.width,surface.height),ctx=alpha.getContext('2d');
    try{ctx.clearRect(0,0,alpha.width,alpha.height);ctx.save();try{ctx.translate(-bounds.x,-bounds.y);ctx.drawImage(capture.entry.canvas,capture.entry.bounds.x,capture.entry.bounds.y);}finally{ctx.restore();}compose(surface,alpha,!!mask.invert);return true;}finally{surfaces.release(alpha);capture.release();}
  }
  function apply(surface, mask, bounds, scene, frame, surfaces, owner) {
    if (!mask || !mask.type || mask.type === 'none') return false;
    if (['rect', 'ellipse', 'poly','shapes'].includes(mask.type)) return applyStatic(surface, mask, bounds, surfaces, owner, frame);
    if (mask.type === 'alpha') return applyAlpha(surface, mask, bounds, scene, surfaces, owner, frame);
    if (mask.type === 'element') return applyElement(surface, mask, bounds, scene, frame, surfaces);
    return false;
  }
  function maskOnlySources(scene,frame) {
    const ids = new Set(),shown=new Set();
    function include(id,set) { if(set.has(id))return;set.add(id); for (const child of scene.entities || []) if (child.parentId === id) include(child.id,set); }
    function inspect(mask) { if (mask && mask.type === 'element' && mask.targetId) include(mask.targetId,mask.showSource?shown:ids); }
    for (const owner of scene.entities || []) if(!owner.hidden&&(!frame||!frame.valuesFor(owner).parentHidden&&frame.valuesFor(owner).timelineVisible!==false)){inspect(owner.effects && owner.effects.mask);if(owner.type==='particle-emitter'){inspect(owner.particle?.emissionRange);inspect(owner.particle?.motionRange);}}
    const effects=scene.sceneEffects||{};
    for(const stage of ['overlay','sample'])for(const [id,config]of Object.entries(effects[stage]||{})){if(!config?.enabled)continue;const value=frame?.effectValuesFor?frame.effectValuesFor('scene',stage,id,config):config;if(value.enabled!==false)inspect(value.mask);}
    for(const id of shown)ids.delete(id);
    return ids;
  }
  api.modules.masks = Object.freeze({ affineGeometry:true,completeSources:1,shapeUnion:1,clipPath, apply, alphaAsset,maskOnlySources, followMatrix, placementMatrix });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:50-mask-resolver.js> */

/* <vnext:51-mask-sources.js> */
/* Complete isolated object captures for masks. Player-local, bounded caches. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,frames=new WeakMap(),qualities=new Set(['full','no-sample','no-decorate','base']);
  const now=()=>typeof performance!=='undefined'?performance.now():0;
  const keyFrame=frame=>frame?._maskSourceFrame||frame;
  function create(scene,surfaces){
    api.modules.maskContract.validateReferences(scene);
    const byId=new Map(scene.entities.map(e=>[e.id,e])),persistent=new Map(),staticMemo=new Map(),budget=8*1024*1024;
    let retained=0,current=null;
    function members(root){return root.type==='group'?scene.entities.filter(e=>e.type!=='group'&&ancestor(e,root.id)):[root];}
    function ancestor(entity,id){let parent=entity.parentId;while(parent){if(parent===id)return true;parent=byId.get(parent)?.parentId;}return false;}
    function changing(entity,seen=new Set()){
      if(!entity||seen.has(entity.id))return false;seen.add(entity.id);
      const trackKeys=Object.keys(scene.timeline?.tracks||{}),visibility=Object.keys(scene.timeline?.visibility||{});
      if(trackKeys.some(key=>key===entity.id||key==='entity:'+entity.id||key.includes(':object:'+entity.id+':'))||visibility.some(key=>key===entity.id||key.includes(':object:'+entity.id+':'))||entity.sceneVariants?.length||entity.type==='procedural'||entity.type==='particle-emitter')return true;
      if(entity.type==='builtin'&&api.modules.builtins.timeDependent(entity))return true;
      if(entity.type==='image'&&(scene.assets[entity.assetId]?.frames?.length>1||scene.assetRefs?.[entity.assetId]?.frames?.length>1))return true;
      if(entity.effects?.sample?.['offset-sampling']?.enabled&&entity.effects.sample['offset-sampling'].motion?.enabled!==false)return true;
      function generator(v){if(!v||typeof v!=='object')return false;if(v.definition?.format==='tosampool-pattern-generator/v1')return true;return Object.values(v).some(next=>next&&typeof next==='object'&&generator(next));}if(generator(entity.parts)||generator(entity.extensions)||generator(entity.recipe))return true;
      function dynamic(v){if(!v||typeof v!=='object')return false;if(v.anim&&Object.values(v.anim).some(Boolean))return true;if(v.motion===true||v.motion&&typeof v.motion==='object'&&v.motion.enabled!==false)return true;return Object.values(v).some(next=>next&&typeof next==='object'&&dynamic(next));}
      if(dynamic(entity))return true;
      if(entity.parentId&&changing(byId.get(entity.parentId),seen))return true;
      for(const id of api.modules.maskContract.references(entity))if(changing(byId.get(id),seen))return true;
      if(entity.type==='group')for(const child of members(entity))if(changing(child,seen))return true;
      return false;
    }
    function isStatic(entity){if(!staticMemo.has(entity.id))staticMemo.set(entity.id,!changing(entity));return staticMemo.get(entity.id);}
    function trimEntity(entity,quality){
      if(quality==='full'||!entity.effects)return entity;
      const effects={...entity.effects};if(quality==='no-sample'||quality==='base')effects.sample={};if(quality==='no-decorate'||quality==='base')effects.decorate={};return{...entity,effects};
    }
    function boundsFor(root,frame,quality,matrix){
      let bounds=null;
      for(const raw of members(root)){
        const e=trimEntity(raw,quality),v=frame.valuesFor(e),repeat=v.anim?.scroll?.repeat!==false&&v.anim?.scroll?.speed;
        const b=e.type==='particle-emitter'||repeat?{x:0,y:0,w:scene.width,h:scene.height}:api.modules.objects.capsuleBounds(scene,e,frame);
        if(!bounds)bounds={...b};else{const right=Math.max(bounds.x+bounds.w,b.x+b.w),bottom=Math.max(bounds.y+bounds.h,b.y+b.h);bounds.x=Math.min(bounds.x,b.x);bounds.y=Math.min(bounds.y,b.y);bounds.w=right-bounds.x;bounds.h=bottom-bounds.y;}
      }
      bounds=bounds||{x:0,y:0,w:1,h:1};if(matrix){const points=[[bounds.x,bounds.y],[bounds.x+bounds.w,bounds.y],[bounds.x,bounds.y+bounds.h],[bounds.x+bounds.w,bounds.y+bounds.h]].map(([x,y])=>[matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]]),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.floor(Math.min(...xs)),y=Math.floor(Math.min(...ys));bounds={x,y,w:Math.ceil(Math.max(...xs))-x,h:Math.ceil(Math.max(...ys))-y};}return bounds;
    }
    function evict(){while(retained>budget&&persistent.size){const [key,entry]=persistent.entries().next().value;persistent.delete(key);retained-=entry.canvas.width*entry.canvas.height;let holder=current;while(holder&&![...holder.entries.values()].includes(entry))holder=holder.previous;if(holder)holder.owned.add(entry.canvas);else surfaces.release(entry.canvas);}}
    function begin(frame,stats,options={}){
      const quality=options.maskSourceQuality||'full';if(!qualities.has(quality))throw Error('未知蒙版来源质量：'+quality);
      const state={frame,stats,quality,forceQuality:Object.hasOwn(options,'maskSourceQuality'),modes:new Set(),objectSession:options._maskSourceObjectSession,entries:new Map(),owned:new Set(),active:new Set(),depth:0,previous:current};frames.set(frame,state);current=state;
      stats.maskSourceQuality=quality;stats.maskSourceBuilds=0;stats.maskSourceHits=0;stats.maskSourceMs=0;stats.maskSourcePixels=0;
      stats.maskSourceDraws=0;stats.maskSourceRetainedPixels=retained;
      function end(){for(const canvas of state.owned)surfaces.release(canvas);state.owned.clear();frames.delete(frame);current=state.previous;}
      state.capture=(id,mode='alpha',matrix,quality=state.quality)=>capture(state,id,mode,matrix,quality);return{end};
    }
    function capture(state,id,mode,matrix,quality){
      if(!['alpha','luma'].includes(mode))throw Error('蒙版提取方式无效：'+mode);
      if(!qualities.has(quality))throw Error('未知蒙版来源质量：'+quality);state.modes.add(quality);state.stats.maskSourceQuality=state.modes.size>1?'mixed':quality;
      const source=byId.get(id);if(!source)throw Error('蒙版来源不存在：'+id);if(source.type==='particle-emitter')throw Error('粒子发射器不能作为蒙版来源');
      const stamp=id+'|'+quality+'|'+mode+'|'+(state.frame.preview?.pixelDivMultiplier||1)+'|'+(matrix?matrix.join(','):''),cached=state.entries.get(stamp)||persistent.get(stamp);
      if(cached){state.stats.maskSourceHits++;state.entries.set(stamp,cached);if(persistent.has(stamp)){persistent.delete(stamp);persistent.set(stamp,cached);}return cached;}
      if(state.active.has(id))throw Error('蒙版来源存在递归：'+[...state.active,id].join(' → '));
      state.active.add(id);const start=now(),outer=state.depth++===0;let canvas=null;
      try{
        const bounds=boundsFor(source,state.frame,quality,matrix);if(bounds.w>8192||bounds.h>8192||bounds.w*bounds.h>16777216)throw Error('蒙版来源超过离屏预算（8192边长／16MP），请缩小来源或明确降低来源效果');canvas=surfaces.acquire(bounds.w,bounds.h);const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;
        if(mode==='luma'){
          state.active.delete(id);const color=capture(state,id,'alpha',matrix,quality);state.active.add(id);ctx.drawImage(color.canvas,0,0);
          const image=ctx.getImageData(0,0,canvas.width,canvas.height),p=image.data;for(let i=0;i<p.length;i+=4)p[i+3]=api.modules.maskContract.channel(p[i],p[i+1],p[i+2],p[i+3],'luma');ctx.putImageData(image,0,0);surfaces.notePixels?.(canvas.width,canvas.height,1);
        }else{
          const rootId=source.id,original=state.frame,frame={...original,_maskSourceFrame:keyFrame(original),valuesFor:e=>{const values=original.valuesFor(e);return e.id===rootId?{...values,blend:'normal'}:values;}};
          const localScene=quality==='full'?scene:{...scene,entities:scene.entities.map(e=>trimEntity(e,quality))};
          const drawStats={directObjects:0,capsuleObjects:0,maskedObjects:0,particleEmitters:0,particlesDrawn:0,particleSpriteBuilds:0,unsupportedEffects:[]};
          ctx.save();try{ctx.translate(-bounds.x,-bounds.y);if(matrix)ctx.transform(...matrix);for(const raw of members(source)){const e=trimEntity(raw,quality);if(e.type==='particle-emitter')api.modules.particles.draw(ctx,localScene,e,frame,drawStats,surfaces);else api.modules.objects.draw(ctx,localScene,e,frame,drawStats,surfaces,state.objectSession);}}finally{ctx.restore();}
          state.stats.maskSourceDraws+=drawStats.directObjects+drawStats.capsuleObjects;
        }
        const entry={canvas,bounds,static:isStatic(source)};state.entries.set(stamp,entry);state.stats.maskSourceBuilds++;state.stats.maskSourcePixels+=canvas.width*canvas.height;
        if(isStatic(source)&&!state.frame.paletteCapture&&canvas.width*canvas.height<=budget){persistent.set(stamp,entry);retained+=canvas.width*canvas.height;evict();}else state.owned.add(canvas);
        state.stats.maskSourceRetainedPixels=retained;return entry;
      }catch(error){if(canvas)surfaces.release(canvas);throw error;}finally{state.active.delete(id);state.depth--;if(outer)state.stats.maskSourceMs+=now()-start;}
    }
    function clear(){if(current){for(const c of current.owned)surfaces.release(c);frames.delete(current.frame);current=null;}for(const entry of persistent.values())surfaces.release(entry.canvas);persistent.clear();retained=0;}
    return Object.freeze({begin,clear});
  }
  function obtain(scene,frame,surfaces,id,mode,matrix,quality){
    const state=frames.get(keyFrame(frame));if(state)return{entry:state.capture(id,mode,matrix,state.forceQuality?state.quality:quality||state.quality),release(){}};
    // Standalone mask users retain correct semantics, but no hidden global cache.
    const session=create(scene,surfaces),active=session.begin(frame,{},{});try{return{entry:frames.get(frame).capture(id,mode,matrix,quality||'full'),release(){active.end();session.clear();}};}catch(error){active.end();session.clear();throw error;}
  }
  api.modules.maskSources=Object.freeze({create,obtain});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:51-mask-sources.js> */

/* <vnext:52-mask-sampler.js> */
/* Point/gray consumers share the mask domain, placement, assets and captures. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,I=[1,0,0,1,0,0];
  const point=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
  function inverse(m){const d=m[0]*m[3]-m[1]*m[2];return Math.abs(d)<1e-10?null:[m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];}
  function box(mask){
    if(mask.type==='shapes'){const b=mask.shapes.map(box),x=Math.min(...b.map(v=>v.x)),y=Math.min(...b.map(v=>v.y));return{x,y,w:Math.max(...b.map(v=>v.x+v.w))-x,h:Math.max(...b.map(v=>v.y+v.h))-y};}
    if(mask.type==='poly'){const xs=mask.points.map(p=>p[0]),ys=mask.points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);return{x,y,w:Math.max(1,Math.max(...xs)-x),h:Math.max(1,Math.max(...ys)-y)};}
    return{x:mask.x,y:mask.y,w:mask.w,h:mask.h};
  }
  function create(scene,surfaces){
    let serial=0,bytes=0,weightBytes=0;const imageIds=new WeakMap(),images=new Map(),objects=new WeakMap(),weightIds=new WeakMap(),weights=new Map();
    const weightId=value=>{if(!weightIds.has(value))weightIds.set(value,++serial);return weightIds.get(value);};
    function distribution(key,build,stats){
      const cached=weights.get(key);if(cached){weights.delete(key);weights.set(key,cached);return cached;}
      const index=api.modules.weightedDistribution.create(build());stats.particleWeightBuilds=(stats.particleWeightBuilds||0)+1;
      if(index.field.data.length<=8388608){weights.set(key,index);weightBytes+=index.field.data.length;while(weightBytes>8388608){const [id,old]=weights.entries().next().value;weights.delete(id);weightBytes-=old.field.data.length;}}return index;
    }
    function gray(ctx,w,h,mode,stats){
      const rgba=ctx.getImageData(0,0,w,h).data,data=new Uint8Array(w*h);for(let i=0;i<data.length;i++)data[i]=api.modules.maskContract.channel(rgba[i*4],rgba[i*4+1],rgba[i*4+2],rgba[i*4+3],mode);
      stats.particleMaskReadbacks=(stats.particleMaskReadbacks||0)+1;stats.particleMaskPixels=(stats.particleMaskPixels||0)+w*h;return{data,w,h};
    }
    function imageGray(image,mode,stats){
      if(!imageIds.has(image))imageIds.set(image,++serial);const key=imageIds.get(image)+':'+mode,cached=images.get(key);if(cached){images.delete(key);images.set(key,cached);return cached;}
      const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;if(!(w>0&&h>0)||w*h>16777216)throw Error('粒子蒙版图片尺寸无效或超过16MP预算');
      const canvas=surfaces.acquire(w,h);let field;try{const c=canvas.getContext('2d',{willReadFrequently:true});c.clearRect(0,0,w,h);c.drawImage(image,0,0);field=gray(c,w,h,mode,stats);}finally{surfaces.release(canvas);}
      if(field.data.length<=8388608){images.set(key,field);bytes+=field.data.length;while(bytes>8388608){const [id,old]=images.entries().next().value;images.delete(id);bytes-=old.data.length;}}return field;
    }
    function value(field,x,y){const ix=Math.floor(x),iy=Math.floor(y);return ix<0||iy<0||ix>=field.w||iy>=field.h?0:field.data[iy*field.w+ix]/255;}
    function bilinear(field,x,y){
      const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,at=(px,py)=>field.data[Math.max(0,Math.min(field.h-1,py))*field.w+Math.max(0,Math.min(field.w-1,px))]/255;
      return(at(ix,iy)*(1-fx)+at(ix+1,iy)*fx)*(1-fy)+(at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx)*fy;
    }
    function prepare(mask,owner,frame,stats={},bulk=false){
      const values=frame.valuesFor(owner),emitterMatrix=values.worldMatrix||api.modules.frame.matrixFor(values),finite={x:0,y:0,w:values.w,h:values.h},finiteInverse=inverse(emitterMatrix);
      const finiteContains=(x,y)=>{if(!finiteInverse)return false;const p=point(finiteInverse,x,y);return p[0]>=0&&p[1]>=0&&p[0]<values.w&&p[1]<values.h;};
      const defaultPoint=(u,v)=>point(emitterMatrix,u*values.w,v*values.h);
      if(!mask||mask.type==='none')return{candidate:defaultPoint,at:()=>1,pick:finiteInverse?defaultPoint:()=>null,release(){}};
      const mode=mask.mode||'alpha';let candidate,read,release=()=>{},getField,fieldKey,directPick,valid=true,empty=false;
      if(mask.type==='element'){
        const capture=api.modules.maskSources.obtain(scene,frame,surfaces,mask.targetId,'alpha',mask.geometryMatrix||null,mask.sourceQuality),entry=capture.entry,b=entry.bounds,c=entry.canvas.getContext('2d');release=capture.release;
        try{
          candidate=(u,v)=>[b.x+u*b.w,b.y+v*b.h];let field;
          getField=()=>{let modes=objects.get(entry);if(!modes){modes={};objects.set(entry,modes);}return field||(field=modes[mode]||(modes[mode]=gray(c,entry.canvas.width,entry.canvas.height,mode,stats)));};
          if(bulk||entry.static)getField();fieldKey='object:'+weightId(entry)+':'+mode;
          read=(x,y)=>{x-=b.x;y-=b.y;if(x<0||y<0||x>=b.w||y>=b.h)return 0;if(field)return value(field,x,y);const p=c.getImageData(Math.floor(x),Math.floor(y),1,1).data;stats.particleMaskReadbacks=(stats.particleMaskReadbacks||0)+1;stats.particleMaskPixels=(stats.particleMaskPixels||0)+1;return api.modules.maskContract.channel(p[0],p[1],p[2],p[3],mode)/255;};
        }catch(error){release();throw error;}
      }else{
        const m=api.modules.masks.placementMatrix(mask,owner,frame),inv=inverse(m),b=box(mask);candidate=(u,v)=>point(m,b.x+u*b.w,b.y+v*b.h);valid=!!inv&&b.w>0&&b.h>0;
        if(mask.type==='alpha'){
          const image=api.modules.masks.alphaAsset(scene,mask,frame);if(!image)throw Error('粒子蒙版缺少图片素材：'+mask.assetId);const field=imageGray(image,mode,stats);
          getField=()=>field;fieldKey='image:'+weightId(field);
          read=(x,y)=>{if(!inv)return 0;const p=point(inv,x,y),u=(p[0]-b.x)/b.w,v=(p[1]-b.y)/b.h;return u<0||v<0||u>=1||v>=1?0:bilinear(field,u*field.w-.5,v*field.h-.5);};
        }else if(['rect','ellipse','poly','shapes'].includes(mask.type)){
          read=(x,y)=>{if(!inv)return 0;const p=point(inv,x,y);return api.modules.maskContract.containsGeometry(mask,p[0],p[1])?1:0;};
          if(mask.type==='rect')directPick=candidate;
          if(mask.type==='rect'&&mask.invert&&inv)empty=[[0,0],[1,0],[1,1],[0,1]].every(([u,v])=>{const p=point(inv,...defaultPoint(u,v));return api.modules.maskContract.containsGeometry(mask,...p);});
          if(mask.type==='ellipse')directPick=(u,v)=>{const r=Math.sqrt(u),a=v*Math.PI*2;return point(m,b.x+b.w/2+Math.cos(a)*r*b.w/2,b.y+b.h/2+Math.sin(a)*r*b.h/2);};
          fieldKey='geometry:'+weightId(mask);
          getField=()=>{const w=Math.max(1,Math.ceil(b.w)),h=Math.max(1,Math.ceil(b.h));if(w*h>16777216)throw Error('粒子权重区域超过16MP预算');const canvas=surfaces.acquire(w,h);try{const c=canvas.getContext('2d');c.clearRect(0,0,w,h);c.save();c.setTransform(w/b.w,0,0,h/b.h,-b.x*w/b.w,-b.y*h/b.h);api.modules.masks.clipPath(c,mask);c.clip();c.fillStyle='#fff';c.fillRect(b.x,b.y,b.w,b.h);c.restore();const field=gray(c,w,h,'alpha',stats);for(let i=0;i<field.data.length;i++)if(field.data[i]>0&&field.data[i]<255&&!api.modules.maskContract.containsGeometry(mask,b.x+(i%w+.5)/w*b.w,b.y+(Math.floor(i/w)+.5)/h*b.h))field.data[i]=0;return field;}finally{surfaces.release(canvas);}};
        }
        else throw Error('粒子范围尚未支持蒙版：'+mask.type);
      }
      const at=(x,y)=>mask.invert?(finiteContains(x,y)?1-read(x,y):0):read(x,y);
      if(mask.invert){
        directPick=null;const placement=mask.type==='element'?mask.geometryMatrix||I:api.modules.masks.placementMatrix(mask,owner,frame),relative=finiteInverse?api.modules.frame.multiply(finiteInverse,placement):I;
        fieldKey='inverse:'+weightId(mask)+':'+fieldKey+':'+values.w+','+values.h+':'+relative.join(',');
        getField=()=>{const w=Math.max(1,Math.ceil(values.w)),h=Math.max(1,Math.ceil(values.h)),b=api.modules.objects.boundsFor(values,0);if(w*h>16777216||b.w*b.h>16777216)throw Error('粒子权重区域超过16MP预算');const world=surfaces.acquire(b.w,b.h),local=surfaces.acquire(w,h);try{const c=world.getContext('2d');c.clearRect(0,0,b.w,b.h);c.fillStyle='#fff';c.fillRect(0,0,b.w,b.h);api.modules.masks.apply(world,mask,b,scene,frame,surfaces,owner);const out=local.getContext('2d');out.clearRect(0,0,w,h);out.save();out.transform(...finiteInverse);out.drawImage(world,b.x,b.y);out.restore();return gray(out,w,h,'alpha',stats);}finally{surfaces.release(world);surfaces.release(local);}};
      }
      function pick(u,v,jx=.5,jy=.5){
        if(empty||!valid||mask.invert&&!finiteInverse)return null;if(directPick&&!mask.invert)return directPick(u,v);
        const index=distribution(fieldKey,getField,stats),cell=index.pick(u,v);if(!cell)return null;
        const map=mask.invert?defaultPoint:candidate,p=map((cell.x+jx)/index.field.w,(cell.y+jy)/index.field.h);return at(...p)>0?p:map((cell.x+.5)/index.field.w,(cell.y+.5)/index.field.h);
      }
      return{candidate:mask.invert?defaultPoint:candidate,at,pick,release};
    }
    return Object.freeze({prepare,clear(){images.clear();weights.clear();bytes=0;weightBytes=0;}});
  }
  api.modules.maskSampler=Object.freeze({create,point,inverse,box});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:52-mask-sampler.js> */

/* <vnext:53-weighted-distribution.js> */
/* Compact row weights: no rejection loops and no full-sized float CDF. */
(function(global){
  'use strict';
  function create(field){
    const rows=new Float64Array(field.h);let total=0;
    for(let y=0;y<field.h;y++){for(let x=0;x<field.w;x++)total+=field.data[y*field.w+x];rows[y]=total;}
    return Object.freeze({field,total,pick(u,v){
      if(!total)return null;const target=Math.max(0,Math.min(1-Number.EPSILON,u))*total;let lo=0,hi=rows.length-1;
      while(lo<hi){const mid=(lo+hi)>>>1;if(rows[mid]>target)hi=mid;else lo=mid+1;}
      const y=lo,rowTotal=rows[y]-(y?rows[y-1]:0),column=Math.max(0,Math.min(1-Number.EPSILON,v))*rowTotal;let sum=0;
      for(let x=0;x<field.w;x++){sum+=field.data[y*field.w+x];if(sum>column)return{x,y};}return null;
    }});
  }
  global.ToSampoolRuntimeVNext.modules.weightedDistribution=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:53-weighted-distribution.js> */

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
    if(raw&&raw.type==='custom'){
      const next=Object.assign({},raw),width=Math.max(1,finite(raw.tileWidth,4)*finite(raw.tileScale,1)),height=Math.max(1,finite(raw.tileHeight,4)*finite(raw.tileScale,1)),tick=Math.floor(phase*steps)%steps,at=value=>((value%1)+1)%1;
      if(motion.type==='pattern-drift'){next.phaseX=at(finite(raw.phaseX,0)+tick/steps*finite(motion.cyclesX,1));next.phaseY=at(finite(raw.phaseY,0)+tick/steps*finite(motion.cyclesY,0));}
      else if(motion.type==='pattern-step'){next.phaseX=at(finite(raw.phaseX,0)+tick*finite(motion.stepX,1)/width);next.phaseY=at(finite(raw.phaseY,0)+tick*finite(motion.stepY,0)/height);}
      else if(motion.type==='pattern-random'){const seed=(Math.imul((Math.round(finite(motion.seed,1))+tick+1)|0,1103515245)+12345)>>>0;next.phaseX=at(finite(raw.phaseX,0)+((seed&65535)/65535*2-1)*finite(motion.rangeX,1));next.phaseY=at(finite(raw.phaseY,0)+(((seed>>>16)&65535)/65535*2-1)*finite(motion.rangeY,1));}
      return next;
    }
    const layer=raw&&Array.isArray(raw.layers)&&raw.layers[0],fallback=layer?finite(layer.spacing,finite(layer.width,1)+Math.max(0,finite(layer.gap,3))):4,type=motion.type==='texture-drift'?'pattern-drift':motion.type==='random-hold'?'pattern-random':motion.type,spacing=Math.max(1,finite(raw&&raw.spacing,finite(raw&&raw.cell,fallback))),next=Object.assign({},raw,{motion:Object.assign({},motion,{type})});
    if(type==='pattern-drift'){const steps=Math.max(1,Math.round(finite(motion.steps,16))),tick=Math.floor(phase*steps)%steps,progress=tick/steps;next.phaseX=finite(raw.phaseX,0)+progress*Math.round(finite(motion.cyclesX,1))*spacing;next.phaseY=finite(raw.phaseY,0)+progress*Math.round(finite(motion.cyclesY,0))*spacing;}
    else if(type==='pattern-step'){const steps=Math.max(1,Math.round(finite(motion.steps,8))),tick=Math.floor(phase*steps)%steps;next.phaseX=finite(raw.phaseX,0)+tick*Math.round(finite(motion.stepX,1));next.phaseY=finite(raw.phaseY,0)+tick*Math.round(finite(motion.stepY,0));}
    else if(type==='pattern-random'){const steps=Math.max(1,Math.round(finite(motion.steps,8))),tick=Math.floor(phase*steps)%steps,seed=(Math.imul((Math.round(finite(motion.seed,1))+tick+1)|0,1103515245)+12345)>>>0,rangeX=Math.max(0,finite(motion.rangeX,1))*spacing,rangeY=Math.max(0,finite(motion.rangeY,1))*spacing;next.phaseX=finite(raw.phaseX,0)+Math.round(((seed&65535)/65535*2-1)*rangeX);next.phaseY=finite(raw.phaseY,0)+Math.round((((seed>>>16)&65535)/65535*2-1)*rangeY);}
    else if(type==='pattern-pulse'){const steps=Math.max(2,Math.round(finite(motion.steps,6))),tick=Math.floor(phase*steps)%steps,wave=Math.sin(tick/steps*Math.PI*2),amount=clamp(finite(motion.amount,.35),0,1);if(Array.isArray(raw.layers)){next.layers=raw.layers.map(layer=>Object.assign({},layer,{width:Math.max(1,Math.round(finite(layer.width,1)*(1+wave*amount)))}));}else next.size=Math.max(1,Math.round(finite(raw.size,3)*(1+wave*amount)));}
    return next;
  }
  function canonical(raw,color){
    const source=raw||{},type=['lines','dots','checker','noise','custom'].includes(source.type)?source.type:'lines',result={type,color:source.color&&source.color!=='inherit'?source.color:(color||'#ffffff'),phaseX:finite(source.phaseX,0),phaseY:finite(source.phaseY,0)};
    if(type==='custom'){
      result.tileWidth=clamp(Math.round(finite(source.tileWidth,4)),1,64);result.tileHeight=clamp(Math.round(finite(source.tileHeight,4)),1,64);
      result.tileScale=clamp(Math.round(finite(source.tileScale,1)),1,128);result.tileScaleMode=source.tileScaleMode==='sampling'?'sampling':'pixel';
      const pixels=Array.isArray(source.tilePixels)?source.tilePixels:[];
      result.tilePixels=Array.from({length:result.tileWidth*result.tileHeight},(_,index)=>/^#[0-9a-f]{8}$/i.test(pixels[index]||'')?pixels[index].toLowerCase():'#00000000');return result;
    }
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
    if(pattern.type==='custom')return{pattern,width:pattern.tileWidth,height:pattern.tileHeight,kind:'custom'};
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
    if(spec.kind==='custom'){
      const cell=1;
      for(let y=0;y<pattern.tileHeight;y++)for(let x=0;x<pattern.tileWidth;x++){
        const hex=pattern.tilePixels[y*pattern.tileWidth+x],a=parseInt(hex.slice(7,9),16);if(!a)continue;
        ctx.fillStyle=hex.slice(0,7);ctx.globalAlpha=a/255;ctx.fillRect(x*cell,y*cell,cell,cell);
      }
      ctx.globalAlpha=1;return;
    }
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
    let brush=ctx.createPattern(tile,'repeat');if(!brush)return null;
    const pattern=spec.pattern,scale=pattern.type==='custom'?pattern.tileScale:1;
    if(scale>1){
      if(typeof brush.setTransform==='function'&&typeof global.DOMMatrix==='function'){brush.setTransform(new global.DOMMatrix().scale(scale));ctx.imageSmoothingEnabled=false;}
      else{const expanded=makeCanvas(spec.width*scale,spec.height*scale),expandedCtx=expanded&&expanded.getContext&&expanded.getContext('2d');if(!expandedCtx)return null;expandedCtx.imageSmoothingEnabled=false;expandedCtx.drawImage(tile,0,0,expanded.width,expanded.height);brush=ctx.createPattern(expanded,'repeat');if(!brush)return null;}
    }
    const dx=pattern.type==='custom'?Math.round(clamp(pattern.phaseX,0,1)*spec.width*scale):finite(pattern.phaseX,0),dy=pattern.type==='custom'?Math.round(clamp(pattern.phaseY,0,1)*spec.height*scale):finite(pattern.phaseY,0);ctx.save();ctx.translate(dx,dy);ctx.fillStyle=brush;ctx.fillRect(-dx,-dy,width,height);ctx.restore();return result;
  }
  function paint(ctx,width,height,raw,color){
    const pattern=canonical(raw,color),extent=Math.ceil(Math.hypot(width,height))+24;ctx.fillStyle=pattern.color;
    if(pattern.type==='custom'){const stamp=repeatingTexture(width,height,pattern,color);if(stamp)ctx.drawImage(stamp,0,0);return pattern;}
    if(pattern.type==='noise'){
      /* Screen noise is intentionally a dense, low-cost raster field rather
         than a few floating "dust" squares.  It uses a deterministic cap so
         Auto/Draft preview stays bounded even on a full-HD scene; occasional
         short horizontal runs give it the compact monitor / cassette texture
         rather than confetti-like particles. */
      const grain=Math.max(1,pattern.size),cells=Math.ceil(width/grain)*Math.ceil(height/grain),dots=Math.min(6000,Math.max(1,Math.round(cells*pattern.density*.18))),hash=(index,salt)=>{const value=Math.sin((index+1)*12.9898+(pattern.seed+1)*78.233+(pattern.noiseTick+1)*37.719+salt*19.17)*43758.5453;return value-Math.floor(value);};
      for(let index=0;index<dots;index++){const x=Math.floor(hash(index,1)*width/grain)*grain,y=Math.floor(hash(index,2)*height/grain)*grain,run=hash(index,3)>.78?2:1;ctx.fillRect(x,y,grain*run,grain);}
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
    if(style==='custom')return Object.assign(common,{type:'custom',tileWidth:value.tileWidth,tileHeight:value.tileHeight,tileScale:value.tileScaleMode==='sampling'?value._samplingSize||1:value.tileScale,tileScaleMode:value.tileScaleMode,tilePixels:value.tilePixels});
    if(style==='noise')return Object.assign(common,{type:'noise',density:clamp(finite(value.noiseDensity,.15),0,1),size:Math.max(1,Math.round(finite(value.noiseSize,1))),seed:Math.round(finite(value.noiseSeed,1))});
    if(style==='dots')return Object.assign(common,{type:'dots',size,spacing,cell:spacing,angle,phase:clamp(finite(value.rowPhase,.5),0,1),shape:value.shape||'circle',layout:value.layout==='stagger'?'stagger':'regular'});
    if(style==='checker')return Object.assign(common,{type:'checker',size:spacing,gap:0,cell:spacing,angle,phase:.5,layout:'checker'});
    const layers=[{angle,width:size,spacing}];if(style==='grid')layers.push({angle:angle+90,width:size,spacing});if(style==='lines-layers'){layers.push({angle:finite(value.layer2Angle,angle+90),width:Math.min(Math.max(1,finite(value.layer2Width,1)),Math.max(1,finite(value.layer2Spacing,spacing))),spacing:Math.max(1,finite(value.layer2Spacing,spacing))});layers.push({angle:finite(value.layer3Angle,angle+135),width:Math.min(Math.max(1,finite(value.layer3Width,1)),Math.max(1,finite(value.layer3Spacing,spacing))),spacing:Math.max(1,finite(value.layer3Spacing,spacing))});}return Object.assign(common,{type:'lines',layers});
  }
  function clear(){cache.clear();tileCache.clear();}
  function bayer(size){
    const n=[2,4,8].includes(+size)?+size:4;let rank=[[0,2],[3,1]];
    for(let side=2;side<n;side*=2){const next=Array.from({length:side*2},()=>Array(side*2));for(let y=0;y<side;y++)for(let x=0;x<side;x++){const base=rank[y][x]*4;next[y][x]=base;next[y][x+side]=base+2;next[y+side][x]=base+3;next[y+side][x+side]=base+1;}rank=next;}
    return{type:'custom',tileWidth:n,tileHeight:n,tileScale:1,tileScaleMode:'pixel',phaseX:0,phaseY:0,tilePixels:rank.flat().map(value=>{const tone=Math.round(255*(1-(value+.5)/(n*n))).toString(16).padStart(2,'0');return`#${tone}${tone}${tone}ff`;})};
  }
  api.modules.pattern=Object.freeze({ canonical, paint, texture, overlay, motionStep, bayer, clear });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:55-pattern-field.js> */

/* <vnext:56-grain-field.js> */
/* ToSampool Runtime vNext: bounded, deterministic grain frame bank. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const frames = new Map();
  const budget = 40 * 1024 * 1024;
  let bytes = 0, builds = 0;
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const positive = value => Math.max(1, Math.round(finite(value, 1)));
  function canvas(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
    if (global.document && global.document.createElement) {
      const result = global.document.createElement('canvas');
      result.width = width; result.height = height;
      return result;
    }
    return null;
  }
  function tick(config, time) {
    const motion = config && config.motion;
    if (!motion || !motion.enabled) return 0;
    const steps = Math.max(1, Math.min(120, Math.round(finite(motion.steps, 8))));
    return api.modules.motion.refresh({...motion,steps},time,{frames:8});
  }
  function build(width, height, seed, colorMode, frameTick) {
    const result = canvas(width, height);
    if (!result) return null;
    const ctx = result.getContext('2d');
    if (!ctx || typeof ctx.createImageData !== 'function') return null;
    const pixels = ctx.createImageData(width, height), data = pixels.data;
    let state = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(frameTick + 1, 0x85ebca6b) ^ 0xa341316c) >>> 0;
    if (!state) state = 1;
    const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return state >>> 0; };
    for (let i = 0; i < data.length; i += 4) {
      data[i] = random() & 255;
      data[i + 1] = colorMode === 'rgb' ? random() & 255 : data[i];
      data[i + 2] = colorMode === 'rgb' ? random() & 255 : data[i];
      data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    builds += 1;
    return result;
  }
  function frame(width, height, config, time) {
    const cell = Math.min(16, positive(config && config.size));
    const workWidth = Math.max(1, Math.ceil(width / cell)), workHeight = Math.max(1, Math.ceil(height / cell));
    const seed = Math.round(finite(config && config.seed, 1));
    const mode = config && config.colorMode === 'rgb' ? 'rgb' : 'mono';
    const frameTick = tick(config, time);
    const key = [workWidth, workHeight, seed, mode, frameTick].join(':');
    if (frames.has(key)) {
      const entry = frames.get(key);
      frames.delete(key); frames.set(key, entry);
      return entry.canvas;
    }
    const result = build(workWidth, workHeight, seed, mode, frameTick);
    if (!result) return null;
    const cost = workWidth * workHeight * 4;
    if (cost <= budget) {
      while (bytes + cost > budget && frames.size) {
        const oldest = frames.keys().next().value;
        bytes -= frames.get(oldest).bytes;
        frames.delete(oldest);
      }
      frames.set(key, { canvas: result, bytes: cost });
      bytes += cost;
    }
    return result;
  }
  function stats() { return { frames: frames.size, bytes, budget, builds }; }
  api.modules.grain = Object.freeze({ frame, tick, stats });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:56-grain-field.js> */

/* <vnext:57-hard-mix.js> */
/* ToSampool Runtime vNext: explicit Photoshop-style Hard Mix for texture overlays. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  function composite(base, layer, surfaces) {
    if (base.width !== layer.width || base.height !== layer.height) throw new Error('Hard Mix 需要尺寸一致的底色与纹理层');
    const output = surfaces.acquire(base.width, base.height);
    const ctx = output.getContext('2d');
    let background, foreground, result;
    try {
      background = base.getContext('2d').getImageData(0, 0, base.width, base.height).data;
      foreground = layer.getContext('2d').getImageData(0, 0, layer.width, layer.height).data;
      result = ctx.createImageData(base.width, base.height);
    } catch (error) {
      surfaces.release(output);
      throw new Error(`Hard Mix 读取失败：${error.message || 'Canvas 可能被跨域素材污染'}`);
    }
    const target = result.data;
    for (let i = 0; i < target.length; i += 4) {
      const baseByte = background[i + 3], layerByte = foreground[i + 3];
      if (layerByte === 0) {
        target[i] = background[i]; target[i + 1] = background[i + 1]; target[i + 2] = background[i + 2]; target[i + 3] = baseByte;
        continue;
      }
      if (baseByte === 255 && layerByte === 255) {
        target[i] = background[i] + foreground[i] >= 255 ? 255 : 0;
        target[i + 1] = background[i + 1] + foreground[i + 1] >= 255 ? 255 : 0;
        target[i + 2] = background[i + 2] + foreground[i + 2] >= 255 ? 255 : 0;
        target[i + 3] = 255;
        continue;
      }
      const baseAlpha = baseByte / 255, layerAlpha = layerByte / 255;
      const outputAlpha = layerAlpha + baseAlpha * (1 - layerAlpha);
      target[i + 3] = Math.round(outputAlpha * 255);
      if (outputAlpha <= 0) continue;
      for (let channel = 0; channel < 3; channel++) {
        const baseValue = background[i + channel], layerValue = foreground[i + channel];
        const hard = baseValue + layerValue >= 255 ? 255 : 0;
        target[i + channel] = Math.round((layerAlpha * ((1 - baseAlpha) * layerValue + baseAlpha * hard) + baseAlpha * (1 - layerAlpha) * baseValue) / outputAlpha);
      }
    }
    ctx.putImageData(result, 0, 0);
    if (surfaces.notePixels) surfaces.notePixels(base.width, base.height, 1);
    return output;
  }
  api.modules.hardMix = Object.freeze({ composite });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:57-hard-mix.js> */

/* <vnext:58-paint.js> */
/* Native Canvas paint styles shared by scene backgrounds and vector fills. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(+value)?+value:min));
  function rgba(color,alpha){
    const match=/^#([0-9a-f]{6})$/i.exec(String(color||''));
    if(!match)return `rgba(255,255,255,${clamp(alpha,0,1)})`;
    const n=parseInt(match[1],16);
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${clamp(alpha,0,1)})`;
  }
  function normalize(raw){
    if(!raw||!['linear','radial'].includes(raw.type))return null;
    const stops=(Array.isArray(raw.stops)?raw.stops:[]).slice(0,8)
      .map(stop=>({offset:clamp(stop&&stop.offset,0,1),color:/^#[0-9a-f]{6}$/i.test(stop&&stop.color||'')?stop.color:'#ffffff',alpha:clamp(stop&&stop.alpha==null?1:stop.alpha,0,1)}))
      .sort((a,b)=>a.offset-b.offset);
    if(stops.length<2)return null;
    return {type:raw.type,angle:Number.isFinite(+raw.angle)?+raw.angle:0,cx:clamp(raw.cx==null?.5:raw.cx,0,1),cy:clamp(raw.cy==null?.5:raw.cy,0,1),radius:clamp(raw.radius==null?.5:raw.radius,.01,2),stops};
  }
  function style(ctx,raw,box,fallback){
    const paint=normalize(raw);if(!paint)return fallback||'#ffffff';
    const x=+box.x||0,y=+box.y||0,w=Math.max(1,+box.w||1),h=Math.max(1,+box.h||1);
    let gradient;
    if(paint.type==='linear'){
      const angle=paint.angle*Math.PI/180,dx=Math.cos(angle),dy=Math.sin(angle),half=(Math.abs(dx)*w+Math.abs(dy)*h)/2,cx=x+w/2,cy=y+h/2;
      gradient=ctx.createLinearGradient(cx-dx*half,cy-dy*half,cx+dx*half,cy+dy*half);
    }else{
      const cx=x+w*paint.cx,cy=y+h*paint.cy,radius=Math.max(.001,Math.max(w,h)*paint.radius);
      gradient=ctx.createRadialGradient(cx,cy,0,cx,cy,radius);
    }
    for(const stop of paint.stops)gradient.addColorStop(stop.offset,rgba(stop.color,stop.alpha));
    return gradient;
  }
  // Non-spatial use of the same stops: luminance -> colour, cached by callers.
  // Straight sRGB interpolation matches the colour controls; Alpha stays separate.
  function ramp(raw){
    const paint=normalize(raw);if(!paint)return null;
    const stops=paint.stops.map(stop=>{const n=parseInt(stop.color.slice(1),16);return {...stop,rgb:[(n>>16)&255,(n>>8)&255,n&255]};}),lut=new Uint8ClampedArray(256*4);
    let index=0;
    for(let value=0;value<256;value++){
      const x=value/255;while(index<stops.length-1&&x>=stops[index+1].offset)index++;
      const a=stops[index],b=stops[Math.min(index+1,stops.length-1)],t=clamp((x-a.offset)/Math.max(.000001,b.offset-a.offset),0,1);
      for(let channel=0;channel<3;channel++)lut[value*4+channel]=a.rgb[channel]+(b.rgb[channel]-a.rgb[channel])*t;
      lut[value*4+3]=(a.alpha+(b.alpha-a.alpha)*t)*255;
    }
    return lut;
  }
  api.modules.paint=Object.freeze({normalize,style,ramp});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:58-paint.js> */

/* <vnext:59-text-reveal.js> */
/* Portable text reveal: percentage is continuous; visible graphemes are discrete. */
(function (global) {
  'use strict';
  const api = global.ToSampoolRuntimeVNext;
  const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity:'grapheme' }) : null;
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  function graphemes(text) {
    const value = String(text || '').replace(/\r\n?/g, '\n');
    return segmenter ? Array.from(segmenter.segment(value), item => item.segment) : Array.from(value);
  }
  function completion(values) { return Math.max(0, Math.min(100, finite(values.textCompletion, 100))); }
  function count(values) {
    return values.textLayout && Array.isArray(values.textLayout.glyphs)
      ? values.textLayout.glyphs.length : graphemes(values.text).filter(char => char !== '\n').length;
  }
  function visibleCount(values) { return Math.floor(count(values) * completion(values) / 100 + 1e-9); }
  function cursorVisible(values, time) {
    const cursor = values.textCursor || {}, period = Math.max(0, finite(cursor.period, 1));
    return !!cursor.enabled && completion(values) < 100 &&
      (!period || (((finite(time, 0) % period) + period) % period) < period / 2);
  }
  function drawCursor(ctx, values, position, bounds, time, layout) {
    if (!cursorVisible(values, time)) return;
    const cursor = values.textCursor || {}, sx = bounds.w / Math.max(1, layout.width),
      sy = bounds.h / Math.max(1, layout.height), size = Math.max(1, layout.fontSize),
      thickness = Math.max(1, Math.round(size * .08)), width = Math.max(thickness, size * .6);
    ctx.save();
    ctx.translate(bounds.x + position.x * sx, bounds.y + position.y * sy);
    ctx.scale(sx, sy);
    ctx.globalAlpha *= Math.max(0, Math.min(1, finite(values.fillAlpha, 1)));
    ctx.fillStyle = cursor.color || values.fill || '#ffffff';
    if (cursor.style === 'underline') ctx.fillRect(0, size - thickness, width, thickness);
    else if (cursor.style === 'block') ctx.fillRect(0, 0, width, size);
    else ctx.fillRect(0, 0, thickness, size);
    ctx.restore();
  }
  function draw(ctx, scene, values, frame, bounds, asset) {
    const progress = completion(values), layout = values.textLayout,
      raster = values.rasterAssetId && asset(scene, values.rasterAssetId),
      atlas = values.glyphAssetId && asset(scene, values.glyphAssetId), time = frame && frame.time || 0;
    if (progress === 100 && raster) {
      ctx.drawImage(raster, bounds.x, bounds.y, bounds.w, bounds.h);
      return;
    }
    const limit = visibleCount(values);
    if (layout && atlas && Array.isArray(layout.glyphs)) {
      const sx = bounds.w / Math.max(1, layout.width), sy = bounds.h / Math.max(1, layout.height);
      for (let index = 0; index < limit; index++) {
        const glyph = layout.glyphs[index];
        if (glyph.sw > 0 && glyph.sh > 0) ctx.drawImage(atlas, glyph.sx, glyph.sy, glyph.sw, glyph.sh,
          bounds.x + glyph.x * sx, bounds.y + glyph.y * sy, glyph.w * sx, glyph.h * sy);
      }
      drawCursor(ctx, values, layout.positions[Math.min(limit, layout.positions.length - 1)] || {x:0,y:0}, bounds, time, layout);
      return;
    }
    // Agent-authored native text can use the same semantics without an atlas.
    const size = Math.max(1, finite(values.fontSize, 16)), tracking = finite(values.letterSpacing, 0),
      lineHeight = Math.max(.5, finite(values.lineHeight, 1.25));
    ctx.save();
    ctx.font = `${size}px ${values.fontFamily || 'sans-serif'}`; ctx.textBaseline = 'top';
    ctx.globalAlpha *= Math.max(0, Math.min(1, finite(values.fillAlpha, 1)));
    ctx.fillStyle = api.modules.paint.style(ctx, values.fillPaint, bounds, values.fill);
    let x = 0, y = 0, index = 0;
    for (const char of graphemes(values.text)) {
      if (char === '\n') { x = 0; y += size * lineHeight; continue; }
      if (index >= limit) break;
      ctx.fillText(char, bounds.x + x, bounds.y + y);
      x += (ctx.measureText ? ctx.measureText(char).width : size * .6) + tracking; index++;
    }
    ctx.restore();
    drawCursor(ctx, values, {x,y}, bounds, time, {width:bounds.w,height:bounds.h,fontSize:size});
  }
  function cursorBounds(values) {
    if (!values.textCursor || !values.textCursor.enabled) return null;
    const layout = values.textLayout, size = Math.max(1, finite(values.fontSize, 16)),
      positions = layout && layout.positions || [{x:Math.max(1, +values.w || 1), y:Math.max(0, (+values.h || 1) - size)}],
      sx = (+values.w || 1) / Math.max(1, layout && layout.width || +values.w || 1),
      sy = (+values.h || 1) / Math.max(1, layout && layout.height || +values.h || 1);
    return {x:0,y:0,w:Math.max(...positions.map(point => (point.x + size * .6) * sx)),
      h:Math.max(...positions.map(point => (point.y + size) * sy))};
  }
  api.modules.textReveal = Object.freeze({graphemes,completion,count,visibleCount,cursorVisible,cursorBounds,draw});
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:59-text-reveal.js> */

/* <vnext:59a-path-stroke.js> */
/* Shared stroke geometry/styles. Authored points remain untouched by smoothing. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,cache=new WeakMap(),boundsCache=new WeakMap(),pointBoxes=new WeakMap(),lengthCache=new WeakMap();
  const finite=(value,fallback)=>Number.isFinite(+value)?+value:fallback;
  function normalize(value){
    const source=value||{},pencil=source.type==='stroke'||source.type==='pencil',dash=source.strokeDash||{};
    const result={strokeCap:['butt','round','square'].includes(source.strokeCap)?source.strokeCap:(pencil?'round':'butt'),
      strokeJoin:['miter','round','bevel'].includes(source.strokeJoin)?source.strokeJoin:(pencil?'round':'miter'),
      smoothing:Math.max(0,Math.min(100,finite(source.smoothing,0))),
      strokeDash:{enabled:!!dash.enabled,length:Math.max(.01,finite(dash.length,3)),gap:Math.max(0,finite(dash.gap,2)),
        offset:Math.max(0,Math.min(1,finite(dash.offset,0)))}};
    result.strokeCompletion=Math.max(0,Math.min(100,finite(source.strokeCompletion,100)));result.strokeReverse=!!source.strokeReverse;
    result.strokeTrimStart=Math.max(0,Math.min(100,finite(source.strokeTrimStart,0)));
    result.pathStart=Math.max(0,Math.min(1,finite(source.pathStart,0)));result.fillReveal=source.fillReveal==='center'?'center':'none';
    result.pathRevealEnabled=source.pathRevealEnabled==null?(result.strokeCompletion<100||result.strokeTrimStart>0||!!source.pathStart||!!source.strokeReverse||result.fillReveal==='center'||!!source.pathEndpoints?.enabled):!!source.pathRevealEnabled;
    result.strokeWave=api.modules.pathWave.normalize(source.strokeWave);
    result.pathEndpoints=api.modules.pathEndpoints.normalize(source);
    if(source.type==='poly'){result.polygonMode=source.polygonMode==='regular'?'regular':'free';result.sides=Math.max(3,Math.min(64,Math.round(finite(source.sides,3))));result.radius=Math.max(0,finite(source.radius,0));}
    return result;
  }
  function configure(ctx,value){
    const style=normalize(value),width=Math.max(0,finite(value.strokeWidth,1)),dash=style.strokeDash;
    ctx.lineWidth=width;ctx.lineCap=style.strokeCap;ctx.lineJoin=style.strokeJoin;ctx.miterLimit=4;
    if(ctx.setLineDash)ctx.setLineDash(dash.enabled?[dash.length*width,dash.gap*width]:[]);
    ctx.lineDashOffset=dash.enabled?-dash.offset*(dash.length+dash.gap)*width+finite(value._strokeDashAdvance,0):0;
    return style;
  }
  // Disabling reveal bypasses its rendering, never rewrites stored values/tracks.
  function progress(part){
    if(normalize(part).pathRevealEnabled)return part;
    return Object.assign({},part,{strokeCompletion:100,strokeTrimStart:0,pathStart:0,strokeReverse:false,fillReveal:'none',pathEndpoints:Object.assign({},part.pathEndpoints,{enabled:false})});
  }
  function trimInterval(part,closed){const start=Math.max(0,Math.min(100,finite(part.strokeTrimStart,0)))/100,end=Math.max(0,Math.min(100,finite(part.strokeCompletion,100)))/100;return{start,end,amount:closed&&end<start?1-start+end:Math.max(0,end-start)};}
  function smoothPoints(points,amount){
    if(!Array.isArray(points)||points.length<3||!(amount>0))return points||[];
    amount=Math.max(0,Math.min(100,finite(amount,0)));
    let entries=cache.get(points);if(entries&&entries.has(amount))return entries.get(amount);
    const distances=[0];let total=0,minX=points[0][0],maxX=minX,minY=points[0][1],maxY=minY;
    for(let index=1;index<points.length;index++){
      total+=Math.hypot(points[index][0]-points[index-1][0],points[index][1]-points[index-1][1]);distances.push(total);
      minX=Math.min(minX,points[index][0]);maxX=Math.max(maxX,points[index][0]);minY=Math.min(minY,points[index][1]);maxY=Math.max(maxY,points[index][1]);
    }
    if(!total)return points;
    // Distance-based sampling avoids giving slow mouse movement extra weight.
    // Very long paths bound their derived sample count; source points stay intact.
    const count=Math.min(8192,Math.max(2,Math.ceil(total))),step=total/count,samples=[];
    let segment=1;
    for(let index=0;index<=count;index++){
      const distance=index*step;while(segment<points.length-1&&distances[segment]<distance)segment++;
      const a=points[segment-1],b=points[segment],span=distances[segment]-distances[segment-1],t=span?(distance-distances[segment-1])/span:0;
      samples.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
    }
    // Scale with the authored stroke, never with canvas size, zoom or object scale.
    const strength=amount/100,extent=Math.hypot(maxX-minX,maxY-minY),
      radius=Math.min(Math.max(12,Math.min(256,extent*.02))*strength,total*.2),
      window=Math.max(1,Math.ceil(radius/step)),output=[],n=samples.length,
      px=new Float64Array(n+1),py=new Float64Array(n+1),mx=new Float64Array(n+1),my=new Float64Array(n+1),
      origin=samples[0];
    // Prefix sums and first moments evaluate the triangular kernel in O(1) per point.
    // Local coordinates reduce cancellation for strokes far from the origin.
    for(let index=0;index<n;index++){
      const x=samples[index][0]-origin[0],y=samples[index][1]-origin[1];
      px[index+1]=px[index]+x;py[index+1]=py[index]+y;mx[index+1]=mx[index]+index*x;my[index+1]=my[index]+index*y;
    }
    const weighted=(sum,moment,index,left,right)=>(window+1-index)*(sum[index+1]-sum[left])+(moment[index+1]-moment[left])+
      (window+1+index)*(sum[right+1]-sum[index+1])-(moment[right+1]-moment[index+1]);
    for(let index=0;index<samples.length;index++){
      if(index===0||index===count){output.push(points[index===0?0:points.length-1].slice());continue;}
      const left=Math.max(0,index-window),right=Math.min(count,index+window),l=index-left+1,r=right-index,
        weight=l*(window+1)-l*(l-1)/2+r*(window+1)-r*(r+1)/2,
        x=origin[0]+weighted(px,mx,index,left,right)/weight,y=origin[1]+weighted(py,my,index,left,right)/weight;
      const blend=strength*Math.min(1,index*step/Math.max(1,radius),(count-index)*step/Math.max(1,radius));
      output.push([samples[index][0]+(x-samples[index][0])*blend,samples[index][1]+(y-samples[index][1])*blend]);
    }
    // High smoothing also removes sub-tolerance neighbouring samples, in one pass.
    // This is bounded thinning, not a destructive rewrite or Bezier fitting.
    const tolerance=radius*.01*Math.max(0,(strength-.5)*2),derived=[];
    for(let index=0;index<output.length;index++){
      const point=output[index],last=derived[derived.length-1];
      if(!last||index===output.length-1||Math.hypot(point[0]-last[0],point[1]-last[1])>=tolerance)derived.push(point);
    }
    if(!entries){entries=new Map();cache.set(points,entries);}if(entries.size>=4)entries.delete(entries.keys().next().value);
    entries.set(amount,derived);return derived;
  }
  function pointsFor(part){
    if(part.type==='stroke')return smoothPoints(part.points,normalize(part).smoothing);
    if(part.type==='line')return [[finite(part.x,0),finite(part.y,0)],[finite(part.x2,1),finite(part.y2,1)]];
    const x=finite(part.x,0),y=finite(part.y,0),w=Math.max(1,finite(part.w,1)),h=Math.max(1,finite(part.h,1));
    if(part.type==='poly')return(part.points||[]).map(point=>[x+point[0]*w,y+point[1]*h]);
    return [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  }
  function pathLengths(points){
    if(lengthCache.has(points))return lengthCache.get(points);
    const distances=new Float64Array(points.length);let total=0;
    for(let index=1;index<points.length;index++){total+=Math.hypot(points[index][0]-points[index-1][0],points[index][1]-points[index-1][1]);distances[index]=total;}
    const result={distances,total};lengthCache.set(points,result);return result;
  }
  function lowerBound(values,target,inclusive){
    let left=0,right=values.length;
    while(left<right){const mid=(left+right)>>>1;if(values[mid]<target||(!inclusive&&values[mid]===target))left=mid+1;else right=mid;}
    return left;
  }
  function pointAt(points,distances,distance){
    if(distance<=0)return points[0];
    const index=Math.min(points.length-1,lowerBound(distances,distance,true)),a=points[Math.max(0,index-1)],b=points[index],
      span=distances[index]-distances[Math.max(0,index-1)],fraction=span?(distance-distances[Math.max(0,index-1)])/span:0;
    return[a[0]+(b[0]-a[0])*fraction,a[1]+(b[1]-a[1])*fraction];
  }
  function reveal(part){
    part=progress(part);
    const points=pointsFor(part),style=normalize(part),range=trimInterval(style,false);
    if(range.amount>=1)return{points,startDistance:0};
    if(range.amount<=0||points.length<2)return{points:[],startDistance:0};
    const {distances,total}=pathLengths(points);if(!total)return{points:[],startDistance:0};
    const start=total*(style.strokeReverse?1-range.end:range.start),end=total*(style.strokeReverse?1-range.start:range.end),
      first=lowerBound(distances,start,false),last=lowerBound(distances,end,true),
      result=[pointAt(points,distances,start),...points.slice(first,last),pointAt(points,distances,end)];
    // A reverse reveal draws an original-order suffix. Advancing the dash phase
    // by its omitted arc length leaves the original virtual pattern anchored.
    return{points:result,startDistance:start};
  }
  function calculateBounds(part){
    const geometry=api.modules.pathGeometry,points=geometry&&(part.strokeWave?.enabled||part.polygonMode==='regular')?geometry.full(part).stroke:pointsFor(part);if(!points.length)return{x:0,y:0,w:1,h:1};
    const style=normalize(part),half=part.stroke?Math.max(0,finite(part.strokeWidth,0))/2:0,
      closed=!['line','stroke'].includes(part.type),directions=[];
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    const add=(x,y)=>{minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);};
    for(const point of points)add(point[0],point[1]);
    for(let index=0;index<(closed?points.length:points.length-1);index++){
      const a=points[index],b=points[(index+1)%points.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=length?(b[0]-a[0])/length:0,dy=length?(b[1]-a[1])/length:0,nx=-dy,ny=dx;
      directions.push([dx,dy]);for(const point of[a,b]){add(point[0]+nx*half,point[1]+ny*half);add(point[0]-nx*half,point[1]-ny*half);}
      if((style.strokeDash.enabled||part.type==='stroke')&&style.strokeCap==='square')for(const [point,sign]of[[a,-1],[b,1]])for(const side of[-1,1])add(point[0]+sign*dx*half+side*nx*half,point[1]+sign*dy*half+side*ny*half);
    }
    for(let index=0;index<points.length;index++){
      const point=points[index],endpoint=!closed&&(index===0||index===points.length-1);
      if((endpoint&&style.strokeCap==='round')||(!endpoint&&style.strokeJoin==='round')||((style.strokeDash.enabled||part.type==='stroke')&&style.strokeCap==='round')){
        add(point[0]-half,point[1]-half);add(point[0]+half,point[1]+half);
      }
      if(endpoint&&style.strokeCap==='square'){
        const direction=directions[index===0?0:directions.length-1]||[0,0],sign=index===0?-1:1;
        for(const side of[-1,1])add(point[0]+sign*direction[0]*half-side*direction[1]*half,point[1]+sign*direction[1]*half+side*direction[0]*half);
      }
      if(!endpoint&&style.strokeJoin==='miter'&&part.type!=='ellipse'&&!(+part.radius)){
        const before=directions[(index-1+directions.length)%directions.length],after=directions[index%directions.length];
        if(!before||!after)continue;const mx=-before[1]-after[1],my=before[0]+after[0],len=Math.hypot(mx,my);
        if(!len)continue;const nx=mx/len,ny=my/len,dot=nx*(-after[1])+ny*after[0],reach=Math.abs(dot)>1e-6?half/dot:Infinity;
        if(Math.abs(reach)<=half*4){add(point[0]+nx*reach,point[1]+ny*reach);add(point[0]-nx*reach,point[1]-ny*reach);}
      }
    }
    return{x:minX,y:minY,w:Math.max(1,maxX-minX),h:Math.max(1,maxY-minY)};
  }
  function pointBox(points){
    if(!Array.isArray(points)||!points.length)return{x:0,y:0,w:1,h:1};
    if(pointBoxes.has(points))return pointBoxes.get(points);
    let x=Infinity,y=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const point of points){x=Math.min(x,point[0]);y=Math.min(y,point[1]);maxX=Math.max(maxX,point[0]);maxY=Math.max(maxY,point[1]);}
    const box={x,y,w:Math.max(1,maxX-x),h:Math.max(1,maxY-y)};pointBoxes.set(points,box);return box;
  }
  function bounds(part,context){
    if(part.type==='custom')return api.modules.customShapes.bounds(api.modules.customShapes.custom(part),{x:finite(part.x,0),y:finite(part.y,0),w:Math.max(1,finite(part.w,1)),h:Math.max(1,finite(part.h,1))});
    if(api.modules.pathExtensions?.active(part)||part.pathEndpoints?.enabled){
      const geometry=api.modules.pathGeometry.full(part),boxes=[calculateBounds(part),api.modules.pathExtensions.bounds(part,geometry),api.modules.pathInstances.bounds(part,geometry,context),api.modules.pathEndpoints.bounds(part,geometry)].filter(Boolean),
        x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
      return{x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x,h:Math.max(...boxes.map(b=>b.y+b.h))-y};
    }
    if(part.type!=='stroke'||!Array.isArray(part.points))return calculateBounds(part);
    const style=normalize(part),key=[style.smoothing,part.stroke?part.strokeWidth:0,style.strokeCap,style.strokeJoin,style.strokeDash.enabled,JSON.stringify(style.strokeWave)].join('|');
    let entries=boundsCache.get(part.points);if(entries&&entries.has(key))return entries.get(key);
    const result=calculateBounds(part);if(!entries){entries=new Map();boundsCache.set(part.points,entries);}
    if(entries.size>=4)entries.delete(entries.keys().next().value);entries.set(key,result);return result;
  }
  api.modules.pathStroke=Object.freeze({normalize,progress,trimInterval,configure,smoothPoints,pointsFor,bounds,pointBox,pathLengths,reveal});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:59a-path-stroke.js> */

/* <vnext:59c-path-wave.js> */
/* Periodic scalar rhythms. Compilation is independent of path size and time. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,cache=new Map();
  const types=Object.freeze(['sine','triangle','saw','square','digits','noise']);
  const finite=(value,fallback)=>Number.isFinite(+value)?+value:fallback;
  let builds=0;
  function digits(text){
    const value=String(text==null?'1595':text).replace(/[\s,，]+/g,'');
    if(!/^[1-9]+$/.test(value))throw new Error('数字节奏仅接受1～9；5表示原路径，可用空格或逗号分隔');
    if(value.length>128)throw new Error('数字节奏最多128位，请缩短一个周期');
    return value;
  }
  function normalize(source){
    const value=source||{},type=types.includes(value.type)?value.type:'sine';
    return {enabled:!!value.enabled,type,amplitude:Math.max(0,finite(value.amplitude,2)),wavelength:Math.max(.5,finite(value.wavelength,16)),
      phase:Math.max(0,Math.min(1,finite(value.phase,0))),fixEnds:value.fixEnds!==false,
      digits:type==='digits'?digits(value.digits):String(value.digits==null?'1595':value.digits),
      interpolation:['hold','linear','smooth'].includes(value.interpolation)?value.interpolation:'smooth',seed:Math.round(finite(value.seed,1))};
  }
  function coefficients(values){
    const n=values.length,slopes=new Float64Array(n),out=new Float64Array(n*4);
    for(let i=0;i<n;i++){
      const left=values[i]-values[(i+n-1)%n],right=values[(i+1)%n]-values[i];
      // Periodic, shape-preserving Hermite tangents: pass through monotone
      // anchors without stopping there; zero slope only at flats/extrema.
      slopes[i]=left*right>0?2*left*right/(left+right):0;
    }
    for(let i=0;i<n;i++){
      const a=values[i],b=values[(i+1)%n],m=slopes[i],next=slopes[(i+1)%n],at=i*4;
      out[at]=a;out[at+1]=m;out[at+2]=3*(b-a)-2*m-next;out[at+3]=2*(a-b)+m+next;
    }
    return out;
  }
  function compile(source){
    const wave=normalize(source),type=wave.type;
    const key=JSON.stringify([type,type==='digits'?wave.digits:null,type==='digits'?wave.interpolation:null,type==='noise'?wave.seed:null]);
    if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
    let values=null,table=null;
    if(type==='digits')values=Array.from(wave.digits,digit=>(+digit-5)/4);
    if(type==='noise')values=Array.from({length:8},(_,i)=>api.modules.sampling.hash(i,0,wave.seed,0)*2-1);
    if(values)table=coefficients(values);
    const interpolation=type==='noise'?'smooth':wave.interpolation;
    const sample=phase=>{
      const t=((phase%1)+1)%1;
      if(type==='sine')return Math.sin(t*Math.PI*2);
      if(type==='triangle')return 1-4*Math.abs(t-.5);
      if(type==='saw')return 2*t-1;
      if(type==='square')return t<.5?1:-1;
      const position=t*values.length,i=Math.min(values.length-1,Math.floor(position)),f=position-i,a=values[i];
      if(interpolation==='hold')return a;
      if(interpolation==='linear')return a+(values[(i+1)%values.length]-a)*f;
      const at=i*4;
      return Math.max(-1,Math.min(1,((table[at+3]*f+table[at+2])*f+table[at+1])*f+table[at]));
    };
    const result=Object.freeze({type,sample,anchors:values?Object.freeze(values):null,samplesPerCycle:values?Math.max(12,values.length*8):24});
    cache.set(key,result);builds++;if(cache.size>32)cache.delete(cache.keys().next().value);return result;
  }
  api.modules.pathWave=Object.freeze({types,digits,normalize,compile,stats:()=>Object.freeze({entries:cache.size,builds})});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:59c-path-wave.js> */

/* <vnext:59b-path-geometry.js> */
/* Canonical closed outlines and derived stroke paths. Source points are never edited. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,cache=new Map(),finite=(v,d)=>Number.isFinite(+v)?+v:d;
  const closed=p=>!['line','stroke','pencil'].includes(p.type);
  function regularPoints(sides){const n=Math.max(3,Math.min(64,Math.round(finite(sides,3))));return Array.from({length:n},(_,i)=>[.5+Math.sin(i/n*Math.PI*2)*.5,.5-Math.cos(i/n*Math.PI*2)*.5]);}
  function enhanced(p){return !p._pathGeometryApplied&&(p.pathEndpoints?.enabled||api.modules.pathExtensions?.active(p)||p.polygonMode==='regular'||p.type==='poly'&&+p.radius>0||p.type!=='stroke'&&(+p.strokeCompletion<100||+p.strokeTrimStart>0||+p.pathStart||p.strokeReverse||p.strokeDash?.enabled)||p.fillReveal==='center'||!!p.strokeWave?.enabled);}
  function trace(ctx,points,close){ctx.beginPath();for(let i=0;i<points.length;i++){const p=points[i];if(i)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);}if(close&&points.length)ctx.closePath();}
  function rounded(vertices,radius,maxSteps=64){
    if(!(radius>0))return vertices;
    const out=[];
    for(let i=0;i<vertices.length;i++){
      const a=vertices[(i-1+vertices.length)%vertices.length],b=vertices[i],c=vertices[(i+1)%vertices.length],la=Math.hypot(a[0]-b[0],a[1]-b[1]),lc=Math.hypot(c[0]-b[0],c[1]-b[1]);
      if(!la||!lc){out.push(b);continue;}
      const ux=(a[0]-b[0])/la,uy=(a[1]-b[1])/la,vx=(c[0]-b[0])/lc,vy=(c[1]-b[1])/lc,angle=Math.acos(Math.max(-1,Math.min(1,ux*vx+uy*vy))),d=Math.min(la/2,lc/2,radius/Math.max(.0001,Math.tan(angle/2))),start=[b[0]+ux*d,b[1]+uy*d],end=[b[0]+vx*d,b[1]+vy*d],steps=Math.min(maxSteps,Math.max(2,Math.ceil(d/2)*2));
      for(let j=0;j<=steps;j++){const t=j/steps,s=1-t;out.push([s*s*start[0]+2*s*t*b[0]+t*t*end[0],s*s*start[1]+2*s*t*b[1]+t*t*end[1]]);}
    }
    return out;
  }
  function slice(points,from,to){
    const {distances,total}=api.modules.pathStroke.pathLengths(points);if(!total)return [];
    const at=d=>{let i=1;while(i<distances.length-1&&distances[i]<d)i++;const a=points[i-1],b=points[i],span=distances[i]-distances[i-1],t=span?(d-distances[i-1])/span:0;return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];};
    const out=[at(from)];for(let i=1;i<points.length-1;i++)if(distances[i]>from&&distances[i]<to)out.push(points[i]);out.push(at(to));return out;
  }
  function waved(outline,wave,isClosed){
    const {distances,total}=api.modules.pathStroke.pathLengths(outline);
    if(!(total>0))return outline;
    if(!wave.amplitude)return outline;
    const rhythm=api.modules.pathWave.compile(wave);
    if(rhythm.anchors&&rhythm.anchors.every(value=>value===0))return outline;
    const cycles=isClosed?Math.max(1,Math.round(total/wave.wavelength)):total/wave.wavelength;
    const wavelength=isClosed?total/cycles:wave.wavelength;
    const count=Math.min(8192,Math.max(2,Math.ceil(total/Math.min(1,wavelength/rhythm.samplesPerCycle))));
    const window=Math.min(6,wavelength/8,total/16),stroke=[];
    const at=distance=>{
      const d=isClosed?((distance%total)+total)%total:Math.max(0,Math.min(total,distance));
      let lo=1,hi=distances.length-1;
      while(lo<hi){const mid=(lo+hi)>>>1;if(distances[mid]<d)lo=mid+1;else hi=mid;}
      const a=outline[lo-1],b=outline[lo],span=distances[lo]-distances[lo-1],t=span?(d-distances[lo-1])/span:0;
      return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
    };
    let segment=1;
    for(let i=0;i<=count;i++){
      const distance=total*i/count;
      while(segment<outline.length-1&&distances[segment]<distance)segment++;
      const a=outline[segment-1],b=outline[segment],span=distances[segment]-distances[segment-1],t=span?(distance-distances[segment-1])/span:0;
      const before=at(distance-window),after=at(distance+window);
      let dx=after[0]-before[0],dy=after[1]-before[1],length=Math.hypot(dx,dy);
      if(length<1e-8){dx=b[0]-a[0];dy=b[1]-a[1];length=Math.hypot(dx,dy)||1;}
      const envelope=!isClosed&&wave.fixEnds?Math.sin(Math.PI*i/count):1;
      const offset=wave.amplitude*rhythm.sample(distance/wavelength+wave.phase)*envelope;
      stroke.push([a[0]+(b[0]-a[0])*t-dy/length*offset,a[1]+(b[1]-a[1])*t+dx/length*offset]);
    }
    if(isClosed)stroke[stroke.length-1]=stroke[0].slice();
    return stroke;
  }
  function full(part,box){
    const x=box?box.x:finite(part.x,0),y=box?box.y:finite(part.y,0),w=Math.max(1,box?box.w:finite(part.w,1)),h=Math.max(1,box?box.h:finite(part.h,1)),isClosed=closed(part),wave=api.modules.pathWave.normalize(part.strokeWave);
    const key=JSON.stringify([part.type,x,y,w,h,part.x2,part.y2,part.points,part.polygonMode,part.sides,part.radius,part.smoothing,wave]);
    if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
    let outline;
    if(part.type==='stroke')outline=api.modules.pathStroke.smoothPoints(part.points||[],part.smoothing).map(p=>[p[0],p[1]]);
    else if(part.type==='line')outline=[[finite(part.x,x),finite(part.y,y)],[finite(part.x2,x+w),finite(part.y2,y+h)]];
    else if(part.type==='ellipse'){const n=Math.min(4096,Math.max(32,Math.ceil(Math.PI*(w+h)/2)));outline=Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return[x+w/2+Math.sin(a)*w/2,y+h/2-Math.cos(a)*h/2];});}
    else if(part.type==='poly'){
      outline=rounded((part.polygonMode==='regular'?regularPoints(part.sides):part.points||[]).map(p=>[x+p[0]*w,y+p[1]*h]),part.polygonMode==='regular'?Math.max(0,finite(part.radius,0)):0);
      if(part.polygonMode==='regular'&&outline.length){let first=0;for(let i=1;i<outline.length;i++)if(outline[i][1]<outline[first][1])first=i;outline=outline.slice(first).concat(outline.slice(0,first));}
    }
    else{const r=Math.min(w/2,h/2,Math.max(0,finite(part.radius,0)));outline=rounded([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],r);
      let best=0,right=Infinity;for(let i=0;i<outline.length;i++)if(Math.abs(outline[i][1]-y)<.00001&&outline[i][0]>=x+w/2-.00001&&outline[i][0]<right){right=outline[i][0];best=i;}
      if(!r)outline=[[x+w/2,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]];
      else{const start=[x+w/2,y];outline=[start,...outline.slice(best),...outline.slice(0,best)];}
    }
    if(isClosed&&outline.length)outline=outline.concat([outline[0]]);
    const stroke=wave.enabled&&outline.length>1?waved(outline,wave,isClosed):outline;
    const value={outline,stroke,closed:isClosed,box:{x,y,w,h}};cache.set(key,value);if(cache.size>64)cache.delete(cache.keys().next().value);return value;
  }
  function visible(part,points,isClosed){
    part=api.modules.pathStroke.progress(part);
    const total=api.modules.pathStroke.pathLengths(points).total,range=api.modules.pathStroke.trimInterval(part,isClosed);
    if(!total||!range.amount)return{points:[],startDistance:0};
    if(!isClosed){const from=total*(part.strokeReverse?1-range.end:range.start),to=total*(part.strokeReverse?1-range.start:range.end);return{points:slice(points,from,to),startDistance:from};}
    let start=((finite(part.pathStart,0)%1)+1)%1*total;
    if(part.strokeReverse){const reversed=points.slice().reverse();start=(total-start)%total;points=reversed;}
    start=(start+range.start*total)%total;
    const amount=total*range.amount,end=start+amount;
    return{points:end<=total?slice(points,start,end):slice(points,start,total).concat(slice(points,0,end-total).slice(1)),startDistance:part.strokeReverse?-start:start};
  }
  function paint(ctx,part,box,fill,context){
    part=api.modules.pathStroke.progress(part);
    const geometry=full(part,box),complete=api.modules.pathStroke.trimInterval(part,geometry.closed).amount*100,follow=part.fillReveal==='center'&&geometry.closed&&(part.type!=='poly'||part.polygonMode==='regular');
    const boundary=geometry.stroke;
    const extensions=api.modules.pathExtensions,extended=extensions&&extensions.active(part),sourceVisible=!extended||extensions.normalize(part).showSource;
    if(sourceVisible&&geometry.closed&&(!follow||complete>0)){
      ctx.save();
      if(follow&&complete<100){const edge=visible(part,boundary,true).points,center=[geometry.box.x+geometry.box.w/2,geometry.box.y+geometry.box.h/2];trace(ctx,[center,...edge,center],true);ctx.clip();}
      trace(ctx,boundary,true);fill(Object.assign({},part,{stroke:null,_pathGeometryApplied:true}));ctx.restore();
    }
    if(sourceVisible&&part.stroke&&+part.strokeWidth>0&&complete>0){const path=visible(part,geometry.stroke,geometry.closed);if(path.points.length>=2){trace(ctx,path.points,geometry.closed&&complete>=100);ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,finite(part.strokeAlpha,1)));ctx.strokeStyle=part.stroke;api.modules.pathStroke.configure(ctx,Object.assign({},part,{_strokeDashAdvance:path.startDistance}));ctx.stroke();ctx.restore();}}
    if(extended)extensions.paint(ctx,part,geometry,context);
    if(part.pathEndpoints?.enabled)api.modules.pathInstances.paint(ctx,part,geometry,context,'endpoints');
    api.modules.pathEndpoints.paint(ctx,part,geometry);
  }
  function inside(points,x,y){
    let winding=0;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[j],b=points[i],cross=(b[0]-a[0])*(y-a[1])-(x-a[0])*(b[1]-a[1]);
      if(a[1]<=y&&b[1]>y&&cross>0)winding++;else if(a[1]>y&&b[1]<=y&&cross<0)winding--;
    }
    return winding!==0;
  }
  function contains(part,box,x,y,tolerance,context){
    part=api.modules.pathStroke.progress(part);
    const g=full(part,box),path=visible(part,g.stroke,g.closed),complete=api.modules.pathStroke.trimInterval(part,g.closed).amount*100,follow=part.fillReveal==='center'&&g.closed&&(part.type!=='poly'||part.polygonMode==='regular');
    const extensions=api.modules.pathExtensions;
    if(part.pathEndpoints?.enabled&&(api.modules.pathEndpoints.contains(part,g,x,y,tolerance)||api.modules.pathInstances.contains(part,g,context,x,y)))return true;
    if(extensions?.active(part)){
      if(api.modules.pathInstances.contains(part,g,context,x,y))return true;
      if(extensions.contains(part,g,x,y,tolerance))return true;
      if(!extensions.normalize(part).showSource)return false;
    }
    if(g.closed&&(part.fill||part.fillPaint||part.fillPattern?.type&&part.fillPattern.type!=='none')&&(!follow||complete>0)&&inside(g.stroke,x,y)){
      if(!follow||complete>=100||inside([[g.box.x+g.box.w/2,g.box.y+g.box.h/2],...path.points],x,y))return true;
    }
    if(part.stroke&&+part.strokeWidth>0){const radius=Math.max(+part.strokeWidth/2,+tolerance||0);for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/length)):0;if(Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t)<=radius)return true;}}
    return false;
  }
  api.modules.pathGeometry=Object.freeze({regularPoints,rounded,enhanced,full,visible,trace,paint,closed,contains});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:59b-path-geometry.js> */

/* <vnext:59d-path-extensions.js> */
/* Declarative, non-recursive path extensions. No per-extension timing tracks. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,cache=new Map(),geometryIds=new WeakMap(),finite=(v,d)=>Number.isFinite(+v)?+v:d,
    clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),color=(v,d)=>/^#[\da-f]{3,8}$/i.test(v||'')?v:d;
  const LIMITS=Object.freeze({ticks:512,layers:64,instances:256,points:65536,cacheEntries:32,cachePoints:262144});
  let nextGeometryId=1,cachedPoints=0;
  function eligible(part){return ['rect','ellipse'].includes(part.type)||part.type==='poly'&&part.polygonMode==='regular';}
  function normalize(part){
    const raw=part.extensions||{},t=raw.ticks||{},n=raw.nested||{},e=raw.elements||{},v=t.variation||{},fallback=part.stroke||part.fill||'#ffffff';
    const generated=api.modules.pathGenerators,ids=generated?.definitions().filter(d=>generated.supports(d.id,part)&&(raw[d.id]||(raw.attached||[]).includes(d.id))).map(d=>d.id)||[],configs=Object.fromEntries(ids.map(id=>[id,generated.normalize(id,raw[id],part)]));
    const defaults=['corner-arrows','brackets','nested','ticks','elements',...ids];
    const attached=[...new Set(Array.isArray(raw.attached)?raw.attached:defaults.filter(id=>raw[id]?.enabled))].filter(id=>defaults.includes(id));
    return {version:1,attached,showSource:raw.showSource!==false,...configs,
      ticks:{id:'ticks',enabled:!!t.enabled,count:clamp(Math.round(finite(t.count,24)),1,LIMITS.ticks),offset:clamp(finite(t.offset,0),0,1),
        length:Math.max(0,finite(t.length,12)),start:finite(t.start,0),end:finite(t.end,1),width:Math.max(0,finite(t.width,1)),
        color:color(t.color,fallback),alpha:clamp(finite(t.alpha,1),0,1),orientation:t.orientation==='fixed'?'fixed':'path',angle:finite(t.angle,0),
        major:{enabled:!!t.major?.enabled,every:clamp(Math.round(finite(t.major?.every,5)),1,LIMITS.ticks),length:Math.max(0,finite(t.major?.length,1.5)),width:Math.max(0,finite(t.major?.width,1.5))},
        variation:{...api.modules.pathWave.normalize(v),enabled:!!v.enabled,target:v.target==='angle'?'angle':'length',cycles:Math.max(0,finite(v.cycles,1)),amplitude:finite(v.amplitude,.5)}},
      nested:{id:'nested',enabled:!!n.enabled&&eligible(part),method:n.method==='offset'?'offset':'scale',count:clamp(Math.round(finite(n.count,4)),1,LIMITS.layers),
        direction:n.direction==='out'?'out':'in',scaleStep:Math.max(.0001,finite(n.scaleStep,.1)),spacing:Math.max(.001,finite(n.spacing,6)),rotation:finite(n.rotation,0),
        pathStep:finite(n.pathStep,0),style:['fill','bands'].includes(n.style)?n.style:'stroke',width:Math.max(0,finite(n.width,part.strokeWidth||1)),
        color:color(n.color,fallback),alpha:clamp(finite(n.alpha,1),0,1)},
      elements:{id:'elements',enabled:!!e.enabled,sourceId:typeof e.sourceId==='string'?e.sourceId:'',count:clamp(Math.round(finite(e.count,12)),1,LIMITS.instances),
        offset:clamp(finite(e.offset,0),0,1),scale:Math.max(.001,finite(e.scale,1)),orientation:e.orientation==='fixed'?'fixed':'path',angle:finite(e.angle,0),
        along:finite(e.along,0),normal:finite(e.normal,0),keepSource:e.keepSource!==false},
      'corner-arrows':api.modules.customShapes.normalize(raw['corner-arrows'],part),
      brackets:api.modules.customShapes.normalizeBrackets(raw.brackets,part)};
  }
  function active(part){return !!(api.modules.pathGenerators?.active(part)||part.extensions?.ticks?.enabled||part.extensions?.nested?.enabled&&eligible(part)||part.extensions?.elements?.enabled||part.extensions?.['corner-arrows']?.enabled&&api.modules.customShapes.eligible(part)||part.extensions?.brackets?.enabled&&api.modules.bracketShapes.eligible(part));}
  function lengthTable(points){const table=api.modules.pathStroke.pathLengths(points);return table;}
  function pointAt(points,table,distance){
    const distances=table.distances,limit=table.total;distance=clamp(distance,0,limit);
    let a=1,b=points.length-1;while(a<b){const m=(a+b)>>1;if(distances[m]<distance)a=m+1;else b=m;}
    let i=a;while(i<points.length-1&&distances[i]-distances[i-1]<1e-9)i++;
    const p=points[i-1],q=points[i],span=distances[i]-distances[i-1],t=span?(distance-distances[i-1])/span:0;
    return {point:[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t],angle:Math.atan2(q[1]-p[1],q[0]-p[0])};
  }
  function wrap(v){return((v%1)+1)%1;}
  function visible(part,u,closed){
    part=api.modules.pathStroke.progress(part);
    const range=api.modules.pathStroke.trimInterval(part,closed);
    if(range.amount<=0)return false;if(range.amount>=1)return true;
    const start=closed?wrap(finite(part.pathStart,0)):0;
    const relative=closed?wrap(part.strokeReverse?start-u:u-start):(part.strokeReverse?1-u:u);
    return closed&&range.end<range.start?relative>=range.start-1e-9||relative<=range.end+1e-9:relative>=range.start-1e-9&&relative<=range.end+1e-9;
  }
  // Convex polygon parallel offset, including sampled convex curves. Stop before
  // inward collapse / curvature inversion; never silently substitute scaling.
  function offset(points,distance,cx,cy){
    const p=points.slice(0,-1),n=p.length;if(n<3)return null;
    let area=0;for(let i=0;i<n;i++){const a=p[i],b=p[(i+1)%n];area+=a[0]*b[1]-a[1]*b[0];}
    const sign=Math.sign(area);if(!sign)return null;
    const edges=[];
    for(let i=0;i<n;i++){
      const a=p[i],b=p[(i+1)%n],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<1e-8)return null;
      const nx=sign*dy/len,ny=-sign*dx/len;
      if(distance<0&&((cx-a[0])*nx+(cy-a[1])*ny)-distance>=-1e-7)return null;
      edges.push({a:[a[0]+nx*distance,a[1]+ny*distance],d:[dx,dy]});
    }
    const out=[];
    for(let i=0;i<n;i++){
      const a=edges[(i+n-1)%n],b=edges[i],cross=a.d[0]*b.d[1]-a.d[1]*b.d[0];
      if(Math.abs(cross)<1e-9){out.push(b.a);continue;}
      const dx=b.a[0]-a.a[0],dy=b.a[1]-a.a[1],t=(dx*b.d[1]-dy*b.d[0])/cross;
      out.push([a.a[0]+a.d[0]*t,a.a[1]+a.d[1]*t]);
    }
    for(let i=0;i<n;i++){
      const a=out[i],b=out[(i+1)%n],c=out[(i+2)%n],cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
      if(cross*sign < -1e-7||!a.every(Number.isFinite))return null;
    }
    out.push(out[0]);return out;
  }
  function build(part,geometry){
    const settings=normalize(part);let id=geometryIds.get(geometry);if(!id){id=nextGeometryId++;geometryIds.set(geometry,id);}
    const key=id+'|'+JSON.stringify([settings,part.stroke,part.strokeWidth,part.strokeAlpha,part.fill,part.fillPaint],(key,value)=>{if(key!=='definition')return value;let id=geometryIds.get(value);if(!id){id=nextGeometryId++;geometryIds.set(value,id);}return id;});
    if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
    const paths=[],instances=[],source=geometry.stroke,table=lengthTable(source),cx=geometry.box.x+geometry.box.w/2,cy=geometry.box.y+geometry.box.h/2;
    let remaining=LIMITS.points,status='';
    if(settings['corner-arrows'].enabled&&api.modules.customShapes.eligible(part)){
      const arrows=api.modules.customShapes.build(part,geometry.box,settings['corner-arrows']);status=arrows.status;
      for(const path of arrows.paths){const cost=path.points.length+path.outline.length;if(cost>remaining){status='已达到拓展路径点数预算。';break;}paths.push(path);remaining-=cost;}
    }
    if(settings.brackets.enabled&&api.modules.bracketShapes.eligible(part)){
      const brackets=api.modules.bracketShapes.build(part,geometry.box,settings.brackets);
      for(const path of brackets.paths){const cost=path.points.length+path.outline.length;if(cost>remaining){status='已达到拓展路径点数预算。';break;}paths.push(path);remaining-=cost;}
    }
    if(settings.nested.enabled){
      const n=settings.nested;
      if(n.method==='offset'&&part.strokeWave?.enabled)status='等距轮廓暂不支持带路径波形的轮廓，请使用中心缩放。';
      else for(let i=0;i<n.count;i++){
        if(source.length>remaining){status='已达到拓展路径点数预算。';break;}
        const sign=n.direction==='out'?1:-1,scale=1+sign*(i+1)*n.scaleStep;
        if(n.method==='scale'&&scale<=0)break;
        let points=n.method==='offset'?offset(source,sign*(i+1)*n.spacing,cx,cy):source.map(p=>[cx+(p[0]-cx)*scale,cy+(p[1]-cy)*scale]);
        if(!points){status='已在轮廓收缩或曲率反转前停止生成。';break;}
        const angle=(i+1)*n.rotation*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
        if(angle)points=points.map(([x,y])=>[cx+(x-cx)*cos-(y-cy)*sin,cy+(x-cx)*sin+(y-cy)*cos]);
        paths.push({kind:'nested',index:i,points,closed:true,width:n.width});remaining-=points.length;
      }
    }
    const nestedPaths=paths.filter(path=>path.kind==='nested');
    if(settings.nested.style==='stroke'&&nestedPaths.length){
      const baseWidth=Math.max(0,finite(part.strokeWidth,1)),baseColor=part.stroke||part.fill||'#ffffff',n=settings.nested;
      for(const [index,path]of nestedPaths.entries()){
        const t=(index+1)/nestedPaths.length;
        path.width=baseWidth+(n.width-baseWidth)*t;
        path.color=api.modules.timeline.colorAt(baseColor,n.color,t)||n.color;
      }
    }
    if(settings.nested.style==='bands'&&nestedPaths.length){
      // The ramp endpoint is the rightmost stop, not the spatial right edge.
      const paint=api.modules.paint.normalize(part.fillPaint),baseColor=paint?paint.stops.at(-1).color:part.fill||part.stroke||'#ffffff';
      for(const [index,path]of nestedPaths.entries())path.color=api.modules.timeline.colorAt(baseColor,settings.nested.color,(index+1)/nestedPaths.length)||settings.nested.color;
    }
    if(settings.ticks.enabled&&source.length>1&&table.total>0){
      const t=settings.ticks,v=t.variation,rhythm=v.enabled?api.modules.pathWave.compile(v):null;
      for(let i=0;i<t.count;i++){
        const progress=geometry.closed?i/t.count:t.count===1?.5:i/(t.count-1),raw=progress+t.offset,
          u=geometry.closed?wrap(raw):raw;if(u>1+1e-9)continue;
        const anchor=pointAt(source,table,u*table.total),major=t.major.enabled&&i%t.major.every===0,
          variation=rhythm?rhythm.sample(progress*v.cycles+v.phase)*v.amplitude:0,
          length=t.length*(major?t.major.length:1)*(v.enabled&&v.target==='length'?Math.max(0,1+variation):1),
          angle=(t.orientation==='path'?anchor.angle-Math.PI/2:0)+(t.angle+(v.enabled&&v.target==='angle'?variation:0))*Math.PI/180,
          dx=Math.cos(angle)*length,dy=Math.sin(angle)*length;
        if(remaining<2){status='已达到拓展路径点数预算。';break;}
        paths.push({kind:'ticks',index:i,u,points:[[anchor.point[0]+dx*t.start,anchor.point[1]+dy*t.start],[anchor.point[0]+dx*t.end,anchor.point[1]+dy*t.end]],closed:false,width:t.width*(major?t.major.width:1)});remaining-=2;
      }
    }
    const e=settings.elements;
    if(e.enabled&&source.length>1&&table.total>0)for(let i=0;i<e.count;i++){
      if(remaining<1){status='已达到拓展路径点数预算。';break;}
      const progress=geometry.closed?i/e.count:e.count===1?.5:i/(e.count-1),u=geometry.closed?wrap(progress+e.offset):progress+e.offset;
      if(u>1+1e-9)continue;const anchor=pointAt(source,table,u*table.total),tx=Math.cos(anchor.angle),ty=Math.sin(anchor.angle),nx=ty,ny=-tx;
      instances.push({index:i,u,anchor:anchor.point,tangent:[tx,ty],normal:[nx,ny],point:[anchor.point[0]+e.along*tx+e.normal*nx,anchor.point[1]+e.along*ty+e.normal*ny],angle:(e.orientation==='path'?anchor.angle:0)+(e.angle%360)*Math.PI/180,scale:e.scale});
      remaining--;
    }
    const result={settings,paths,instances,status,points:LIMITS.points-remaining};
    cache.set(key,result);cachedPoints+=result.points;
    while(cache.size>LIMITS.cacheEntries||cachedPoints>LIMITS.cachePoints){const oldest=cache.keys().next().value;cachedPoints-=cache.get(oldest).points;cache.delete(oldest);}
    return result;
  }
  function shown(part,geometry,path,settings){
    if(path.outline)return path.points;
    if(path.kind==='ticks')return visible(part,path.u,geometry.closed)?path.points:[];
    const n=(settings||normalize(part)).nested;
    if(n.style!=='stroke'&&part.fillReveal!=='center')return path.points;
    part=api.modules.pathStroke.progress(part);
    return api.modules.pathGeometry.visible(Object.assign({},part,{pathRevealEnabled:true,pathStart:finite(part.pathStart,0)+(path.index+1)*n.pathStep}),path.points,true).points;
  }
  function trace(ctx,points,closed,begin=true){if(begin)ctx.beginPath();for(let i=0;i<points.length;i++)i?ctx.lineTo(...points[i]):ctx.moveTo(...points[i]);if(closed)ctx.closePath();}
  function paint(ctx,part,geometry,context){
    part=api.modules.pathStroke.progress(part);
    const result=build(part,geometry),completion=api.modules.pathStroke.trimInterval(part,geometry.closed).amount*100;
    for(const id of result.settings.attached){
      if(!result.settings[id].enabled)continue;
      if(api.modules.pathGenerators?.definition(id)){api.modules.pathGenerators.paint(ctx,part,id,geometry,context);continue;}
      if(id==='elements'){api.modules.pathInstances.paint(ctx,part,geometry,context,'elements');continue;}
      if(id==='corner-arrows'||id==='brackets'){
        api.modules.customShapes.paint(ctx,{settings:result.settings[id],paths:result.paths.filter(p=>p.kind===id)});continue;
      }
    for(const path of result.paths){
      if(path.kind!==id||path.outline)continue;
      const config=result.settings[path.kind],points=shown(part,geometry,path,result.settings);if(points.length<2)continue;
      ctx.save();ctx.globalAlpha*=config.alpha;ctx.strokeStyle=ctx.fillStyle=path.color||config.color;ctx.lineWidth=path.width;ctx.lineJoin='round';ctx.lineCap='round';ctx.setLineDash([]);
      if(path.kind==='nested'&&config.style!=='stroke'){
        if(part.fillReveal==='center'&&completion<100){trace(ctx,[[geometry.box.x+geometry.box.w/2,geometry.box.y+geometry.box.h/2],...points],true);ctx.clip();}
        trace(ctx,path.points,true);
        if(config.style==='bands'){
          const previous=result.paths.find(p=>p.kind==='nested'&&p.index===path.index-1)?.points||geometry.stroke;
          trace(ctx,previous,true,false);ctx.fill('evenodd');
        }else ctx.fill();
      }else if(path.width>0){
        if(path.kind==='nested'){
          const reveal=api.modules.pathGeometry.visible(Object.assign({},part,{pathRevealEnabled:true,pathStart:finite(part.pathStart,0)+(path.index+1)*config.pathStep}),path.points,true);
          api.modules.pathStroke.configure(ctx,Object.assign({},part,{strokeWidth:path.width,strokeCap:'round',strokeJoin:'round',_strokeDashAdvance:reveal.startDistance}));
        }
        trace(ctx,points,path.closed&&completion>=100);ctx.stroke();
      }
      ctx.restore();
    }
    }
  }
  function bounds(part,geometry){
    if(api.modules.pathGenerators?.active(part)){const other=build(part,geometry).paths;if(!other.length)return geometry.box;}
    const result=build(part,geometry),paths=result.paths;if(!paths.length)return null;
    if(result.visualBounds)return result.visualBounds;
    let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;
    for(const path of paths){const n=result.settings.nested,pad=path.outline?0:path.kind!=='nested'||n.style==='stroke'?path.width/2:0;for(const [a,b]of path.outline||path.points){x=Math.min(x,a-pad);y=Math.min(y,b-pad);right=Math.max(right,a+pad);bottom=Math.max(bottom,b+pad);}}
    result.visualBounds={x,y,w:Math.max(1,right-x),h:Math.max(1,bottom-y)};return result.visualBounds;
  }
  function contains(part,geometry,x,y,tolerance){
    part=api.modules.pathStroke.progress(part);
    const result=build(part,geometry);
    if(api.modules.pathGenerators?.active(part)&&api.modules.customShapes.contains({settings:{alpha:1,width:1},paths:[{outline:geometry.stroke}]},x,y,tolerance))return true;
    if(api.modules.customShapes.contains({settings:result.settings['corner-arrows'],paths:result.paths.filter(p=>p.kind==='corner-arrows')},x,y,tolerance))return true;
    if(api.modules.customShapes.contains({settings:result.settings.brackets,paths:result.paths.filter(p=>p.kind==='brackets')},x,y,tolerance))return true;
    for(const path of result.paths){const config=result.settings[path.kind],points=shown(part,geometry,path,result.settings);if(!config.alpha||points.length<2)continue;
      if(path.outline)continue;
      if(path.kind==='nested'&&config.style!=='stroke'){
        const polygon=path.points;
        const inside=p=>{let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
        const previous=result.paths.find(p=>p.kind==='nested'&&p.index===path.index-1)?.points||geometry.stroke;
        if(part.fillReveal==='center'&&api.modules.pathStroke.trimInterval(part,geometry.closed).amount<1&&!inside([[geometry.box.x+geometry.box.w/2,geometry.box.y+geometry.box.h/2],...points]))continue;
        if(config.style==='bands'?inside(polygon)!==inside(previous):inside(polygon))return true;
      }else for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=l?clamp(((x-a[0])*dx+(y-a[1])*dy)/l,0,1):0;
        if(path.width>0&&Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<=Math.max(path.width/2,tolerance||0))return true;
      }
    }return false;
  }
  api.modules.pathExtensions=Object.freeze({normalize,active,eligible,build,paint,bounds,contains,visible,limits:LIMITS,stats:()=>({entries:cache.size,points:cachedPoints})});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:59d-path-extensions.js> */

/* <vnext:59e-path-instances.js> */
/* Shared frame-scoped object stamps. Never evaluate arbitrary code or make
   one effect capsule per placement. Scene identities remain frame-local. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,contexts=new WeakMap(),plans=new WeakMap(),LIMITS=Object.freeze({side:8192,pixels:16777216,framePixels:33554432});
  function references(entity){
    const refs=[];
    for(const part of [entity,...entity.parts||[]]){const config=part.extensions?.elements;if(config?.enabled&&config.sourceId)refs.push(config.sourceId);const marker=part.pathEndpoints;if(marker?.enabled&&marker.type==='object'&&marker.sourceId)refs.push(marker.sourceId);}
    const mask=entity.effects?.mask;if(mask?.type==='element'&&mask.targetId)refs.push(mask.targetId);
    if(entity.particle?.sourceId)refs.push(entity.particle.sourceId);return refs;
  }
  function canReference(scene,ownerId,sourceId){
    const byId=new Map((scene.entities||[]).map(e=>[e.id,e])),source=byId.get(sourceId);
    if(!source)return{ok:false,reason:sourceId?'引用对象已不存在':'请选择引用对象'};
    if(source.parentId)return{ok:false,reason:'组内对象请通过所属组引用'};
    const active=new Set(),done=new Set();let reason='';
    function visit(id){
      if(id===ownerId){reason='不能引用自身、所属组或间接引用自身的对象';return false;}
      if(active.has(id)){reason='引用链存在循环';return false;}if(done.has(id))return true;
      const value=byId.get(id);if(!value){reason='引用链缺少对象：'+id;return false;}
      if(value.type==='particle-emitter'){reason='本轮不支持粒子发射器或包含粒子的组作为来源';return false;}
      active.add(id);const ids=references(value);if(value.type==='group')for(const child of scene.entities||[])if(child.parentId===id)ids.push(child.id);
      for(const next of ids)if(!visit(next))return false;active.delete(id);done.add(id);return true;
    }
    return visit(sourceId)?{ok:true,source}:{ok:false,reason};
  }
  function choices(scene,ownerId){return(scene.entities||[]).filter(e=>!e.parentId&&!e.particleSourceOnly&&canReference(scene,ownerId,e.id).ok);}
  function leaves(scene,root){
    if(root.type!=='group')return[root];const ids=new Set([root.id]);let changed=true;
    while(changed){changed=false;for(const e of scene.entities||[])if(e.parentId&&ids.has(e.parentId)&&!ids.has(e.id)){ids.add(e.id);changed=true;}}
    return(scene.entities||[]).filter(e=>ids.has(e.id)&&e.type!=='group');
  }
  function plan(scene,frame,ownerId,sourceId){
    let map=plans.get(frame);if(!map){map=new Map();plans.set(frame,map);}const key=ownerId+'|'+sourceId;if(map.has(key))return map.get(key);
    const valid=canReference(scene,ownerId,sourceId);if(!valid.ok){const out={status:valid.reason};map.set(key,out);return out;}
    const root=valid.source,rootValues=frame.valuesFor(root),members=leaves(scene,root).filter(e=>{const v=frame.valuesFor(e);return!e.hidden&&!v.parentHidden&&v.timelineVisible!==false&&v.alpha>0&&v.parentAlpha>0;});
    if(root.hidden||rootValues.parentHidden||rootValues.timelineVisible===false||!members.length){const out={status:'',hidden:true};map.set(key,out);return out;}
    const boxes=members.map(entity=>api.modules.objects.capsuleBounds(scene,entity,frame));
    const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y)),right=Math.max(...boxes.map(b=>b.x+b.w)),bottom=Math.max(...boxes.map(b=>b.y+b.h)),bounds={x,y,w:Math.ceil(right-x),h:Math.ceil(bottom-y)};
    const out={root,members,bounds,anchor:[(+root.x||0)+(+root.w||1)/2,(+root.y||0)+(+root.h||1)/2],blend:rootValues.blend||'normal',status:''};
    if(![x,y,bounds.w,bounds.h].every(Number.isFinite)||bounds.w>LIMITS.side||bounds.h>LIMITS.side||bounds.w*bounds.h>LIMITS.pixels)out.status='来源渲染范围超过排布精灵预算，请减小来源或效果范围';
    map.set(key,out);return out;
  }
  function begin(scene,frame,stats,surfaces){
    const sprites=new Map();let pixels=0;
    const context={scene,frame,stats,surfaces,
      sprite(ownerId,sourceId){
        const p=plan(scene,frame,ownerId,sourceId);if(p.status||p.hidden)return null;
        if(sprites.has(sourceId))return sprites.get(sourceId);
        if(pixels+p.bounds.w*p.bounds.h>LIMITS.framePixels){stats.pathInstanceBudgetSkips=(stats.pathInstanceBudgetSkips||0)+1;return null;}
        const canvas=surfaces.acquire(p.bounds.w,p.bounds.h),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
        try{
          for(const entity of p.members){
            const values=frame.valuesFor(entity),sprite=api.modules.objects.createCapsule(scene,entity,frame,stats,surfaces);
            try{ctx.save();ctx.globalAlpha=values.alpha*values.parentAlpha;ctx.globalCompositeOperation=p.root.type==='group'?api.modules.blend.toCanvas(values.blend):'source-over';ctx.drawImage(sprite.capsule,sprite.bounds.x-p.bounds.x,sprite.bounds.y-p.bounds.y);ctx.restore();}finally{surfaces.release(sprite.capsule);}
          }
        }catch(error){surfaces.release(canvas);throw error;}
        const result={canvas,plan:p};sprites.set(sourceId,result);pixels+=canvas.width*canvas.height;stats.pathSpriteBuilds=(stats.pathSpriteBuilds||0)+1;stats.pathSpritePixels=pixels;return result;
      },
      release(){for(const sprite of sprites.values())surfaces.release(sprite.canvas);sprites.clear();contexts.delete(frame);}
    };
    contexts.set(frame,context);return context;
  }
  function each(part,geometry,context,callback){
    if(!context?.scene||!context?.frame)return;
    const e=api.modules.pathExtensions.normalize(part).elements,m=api.modules.pathEndpoints.normalize(part),sets=[];
    if(e.enabled&&e.sourceId)sets.push([e.sourceId,api.modules.pathExtensions.build(part,geometry).instances]);
    if(m.enabled&&m.type==='object'&&m.sourceId)sets.push([m.sourceId,api.modules.pathEndpoints.placements(part,geometry)]);
    for(const [sourceId,placements]of sets){const p=plan(context.scene,context.frame,context.ownerId,sourceId);if(p.status||p.hidden)continue;for(const placement of placements)callback(placement,p,{sourceId});}
  }
  function corners(placement,p){const {bounds:b,anchor:a}=p,cos=Math.cos(placement.angle),sin=Math.sin(placement.angle),s=placement.scale;return[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]].map(([x,y])=>{x=(x-a[0])*s;y=(y-a[1])*s;return[placement.point[0]+cos*x-sin*y,placement.point[1]+sin*x+cos*y];});}
  function bounds(part,geometry,context){
    let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;
    each(part,geometry,context,(placement,p)=>{for(const [a,b]of corners(placement,p)){x=Math.min(x,a);y=Math.min(y,b);right=Math.max(right,a);bottom=Math.max(bottom,b);}});
    return Number.isFinite(x)?{x,y,w:Math.max(1,right-x),h:Math.max(1,bottom-y)}:null;
  }
  function contains(part,geometry,context,x,y){
    let hit=false;each(part,geometry,context,(placement,p)=>{
      if(hit||!placement.endpoint&&!api.modules.pathExtensions.visible(part,placement.u,geometry.closed))return;
      const dx=(x-placement.point[0])/placement.scale,dy=(y-placement.point[1])/placement.scale,cos=Math.cos(placement.angle),sin=Math.sin(placement.angle),lx=cos*dx+sin*dy+p.anchor[0],ly=-sin*dx+cos*dy+p.anchor[1],b=p.bounds;
      hit=lx>=b.x&&ly>=b.y&&lx<=b.x+b.w&&ly<=b.y+b.h;
    });return hit;
  }
  function paint(ctx,part,geometry,context,kind){
    const rendering=context&&contexts.get(context.frame?._maskSourceFrame||context.frame);if(!rendering)return;
    each(part,geometry,context,(placement,p,e)=>{
      if(kind==='elements'&&placement.endpoint||kind==='endpoints'&&!placement.endpoint)return;
      if(!placement.endpoint&&!api.modules.pathExtensions.visible(part,placement.u,geometry.closed))return;
      const sprite=rendering.sprite(context.ownerId,e.sourceId);if(!sprite)return;
      // The source root's scene blend is not an intrinsic bitmap property.
      // Preserve the carrier part's blend; the owner composite still runs last.
      ctx.save();ctx.translate(...placement.point);ctx.rotate(placement.angle);ctx.scale(placement.scale,placement.scale);ctx.drawImage(sprite.canvas,sprite.plan.bounds.x-sprite.plan.anchor[0],sprite.plan.bounds.y-sprite.plan.anchor[1]);ctx.restore();
      rendering.stats.pathInstancesDrawn=(rendering.stats.pathInstancesDrawn||0)+1;
    });
  }
  function hiddenSources(scene){
    const ids=new Set();
    for(const owner of scene.entities||[])for(const part of [owner,...owner.parts||[]]){const e=part.extensions?.elements;if(!e?.enabled||e.keepSource!==false||!canReference(scene,owner.id,e.sourceId).ok)continue;ids.add(e.sourceId);for(const child of leaves(scene,(scene.entities||[]).find(v=>v.id===e.sourceId)))ids.add(child.id);}
    return ids;
  }
  api.modules.pathInstances=Object.freeze({begin,plan,choices,canReference,bounds,contains,paint,hiddenSources,corners,limits:LIMITS});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:59e-path-instances.js> */

/* <vnext:59f-path-endpoints.js> */
/* Completion markers share canonical path geometry and frame-scoped stamps. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,finite=(v,d)=>Number.isFinite(+v)?+v:d;
  function normalize(part){const s=part.pathEndpoints||{};return{enabled:!!s.enabled,type:['bar','object'].includes(s.type)?s.type:'circle',size:Math.max(0,finite(s.size,8)),width:Math.max(0,finite(s.width,12)),sourceId:typeof s.sourceId==='string'?s.sourceId:'',start:!!s.start,end:s.end!==false};}
  function placements(part,geometry){
    part=api.modules.pathStroke.progress(part);
    const config=normalize(part);if(!config.enabled||!(api.modules.pathStroke.trimInterval(part,geometry.closed).amount>0))return[];
    const path=api.modules.pathGeometry.visible(part,geometry.stroke,geometry.closed).points;if(path.length<2)return[];
    const reverse=!!part.strokeReverse&&!geometry.closed,points=reverse?path.slice().reverse():path,first=points[0],last=points[points.length-1],out=[];
    for(const [enabled,index,neighbor]of[[config.start,0,1],[config.end,points.length-1,points.length-2]]){
      if(!enabled)continue;const point=points[index];if(out.length&&Math.hypot(point[0]-first[0],point[1]-first[1])<1e-7)continue;
      let other=points[neighbor],dx=index===0?other[0]-point[0]:point[0]-other[0],dy=index===0?other[1]-point[1]:point[1]-other[1];
      if(Math.hypot(dx,dy)<1e-9){for(const p of points)if(Math.hypot(p[0]-point[0],p[1]-point[1])>1e-9){dx=p[0]-point[0];dy=p[1]-point[1];break;}}
      out.push({point,angle:Math.atan2(dy,dx),scale:1,endpoint:true});
    }
    return out;
  }
  function bounds(part,geometry){const s=normalize(part);if(s.type==='object')return null;const points=placements(part,geometry);if(!points.length)return null;
    const r=s.type==='circle'?s.size/2:s.width/2+Math.max(1,finite(part.strokeWidth,1))/2,
      x=Math.min(...points.map(p=>p.point[0]-r)),y=Math.min(...points.map(p=>p.point[1]-r));
    return{x,y,w:Math.max(...points.map(p=>p.point[0]+r))-x,h:Math.max(...points.map(p=>p.point[1]+r))-y};
  }
  function contains(part,geometry,x,y,tolerance){const s=normalize(part);if(s.type==='object')return false;
    return placements(part,geometry).some(p=>{const dx=x-p.point[0],dy=y-p.point[1],c=Math.cos(p.angle),n=Math.sin(p.angle),pad=Math.max(0,+tolerance||0);
      return s.type==='circle'?Math.hypot(dx,dy)<=s.size/2+pad:Math.abs(dx*c+dy*n)<=Math.max(1,finite(part.strokeWidth,1))/2+pad&&Math.abs(-dx*n+dy*c)<=s.width/2+pad;});
  }
  function paint(ctx,part,geometry){const s=normalize(part);if(s.type==='object')return;
    for(const p of placements(part,geometry)){ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,finite(part.stroke?part.strokeAlpha:part.fillAlpha,1)));ctx.fillStyle=part.stroke||part.fill||'#ffffff';ctx.translate(...p.point);ctx.rotate(p.angle);ctx.beginPath();
      if(s.type==='circle'){if(s.size>0)ctx.arc(0,0,s.size/2,0,Math.PI*2);}else{const thickness=Math.max(1,finite(part.strokeWidth,1));ctx.rect(-thickness/2,-s.width/2,thickness,s.width);}ctx.fill();ctx.restore();}
  }
  api.modules.pathEndpoints=Object.freeze({normalize,placements,bounds,contains,paint});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:59f-path-endpoints.js> */

/* <vnext:59g-custom-shapes.js> */
/* Registered, versioned declarative shapes. No code strings or arbitrary dispatch. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,cache=new Map(),finite=(v,d)=>Number.isFinite(+v)?+v:d,limit=Object.freeze({vertices:256,entries:32,points:65536});let cachedPoints=0;
  const definitions=Object.freeze([Object.freeze({id:'corner-arrows',version:1,name:'角点箭头',sourceTypes:Object.freeze(['rect','poly']),params:Object.freeze([
    Object.freeze({key:'size',label:'箭头大小',default:24,min:0}),Object.freeze({key:'length',label:'箭杆长度',default:36,min:0}),Object.freeze({key:'inset',label:'缩进',default:0}),Object.freeze({key:'direction',label:'方向',default:'out',options:Object.freeze(['out','in'])}),Object.freeze({key:'radius',label:'圆角',default:0,min:0}),
    Object.freeze({key:'shaftMode',label:'箭杆角度',default:'center',options:Object.freeze(['center','fixed'])}),Object.freeze({key:'shaftAngle',label:'角度',default:0}),Object.freeze({key:'shaftCap',label:'箭杆端头',default:'butt',options:Object.freeze(['butt','round','point'])})]),limits:limit}),
    Object.freeze({id:'brackets',version:1,name:'括号／角标',sourceTypes:Object.freeze(['rect','ellipse','poly']),params:Object.freeze([
      Object.freeze({key:'shape',label:'造型',default:'square',options:Object.freeze(['square','round'])}),Object.freeze({key:'layout',label:'布局',default:'full',options:Object.freeze(['full','corners'])}),
      Object.freeze({key:'side',label:'侧别',default:'both',options:Object.freeze(['both','left','right'])}),Object.freeze({key:'corners',label:'角标位置',default:'all',options:Object.freeze(['all','tl-br','bl-tr','tl','tr','bl','br'])}),
      Object.freeze({key:'armX',label:'横向长度',default:24,min:0}),Object.freeze({key:'armY',label:'纵向长度',default:24,min:0}),Object.freeze({key:'radius',label:'圆角',default:0,min:0}),
      Object.freeze({key:'offsetX',label:'水平偏移',default:0}),Object.freeze({key:'offsetY',label:'垂直偏移',default:0})]),limits:limit})]);
  const color=(v,d)=>/^#[\da-f]{3,8}$/i.test(v||'')?v:d;
  function eligible(part){return part.type==='rect'||part.type==='poly';}
  function normalize(raw,part){raw=raw||{};part=part||{};return{enabled:!!raw.enabled,size:Math.max(0,finite(raw.size,24)),length:Math.max(0,finite(raw.length,36)),inset:finite(raw.inset,0),direction:raw.direction==='in'?'in':'out',radius:Math.max(0,finite(raw.radius,0)),shaftMode:raw.shaftMode==='fixed'?'fixed':'center',shaftAngle:finite(raw.shaftAngle,0),shaftCap:['round','point'].includes(raw.shaftCap)?raw.shaftCap:'butt',width:Math.max(0,finite(raw.width,+part.strokeWidth>0?+part.strokeWidth:3)),color:color(raw.color,color(part.stroke,color(part.fill,'#ffd23f'))),alpha:Math.max(0,Math.min(1,finite(raw.alpha,finite(part.strokeAlpha,1))))};}
  function normalizeBrackets(raw,part){
    raw=raw||{};const style=normalize(raw,part);
    return{enabled:style.enabled,shape:raw.shape==='round'?'round':'square',layout:raw.layout==='corners'?'corners':'full',side:['left','right'].includes(raw.side)?raw.side:'both',
      corners:['tl-br','bl-tr','tl','tr','bl','br'].includes(raw.corners)?raw.corners:'all',armX:Math.max(0,finite(raw.armX,24)),armY:Math.max(0,finite(raw.armY,24)),radius:style.radius,offsetX:finite(raw.offsetX,0),offsetY:finite(raw.offsetY,0),width:style.width,color:style.color,alpha:style.alpha};
  }
  function normalizeRecipe(recipe){
    if(recipe?.definition)return api.modules.patternProviders.normalizeRecipe(recipe);
    if(!recipe||!definitions.some(d=>d.id===recipe.id&&d.version===recipe.version))throw Error('不支持的自定义图样或版本：'+(recipe?.id||'(空)'));
    if(recipe.params!=null&&(typeof recipe.params!=='object'||Array.isArray(recipe.params)))throw Error('自定义图样params必须为对象');
    if(recipe.id==='brackets'){const c=normalizeBrackets(recipe.params);return{id:'brackets',version:1,params:{shape:c.shape,layout:c.layout,side:c.side,corners:c.corners,armX:c.armX,armY:c.armY,radius:c.radius,offsetX:c.offsetX,offsetY:c.offsetY}};}
    const c=normalize(recipe.params);return{id:'corner-arrows',version:1,params:{size:c.size,length:c.length,inset:c.inset,direction:c.direction,radius:c.radius,shaftMode:c.shaftMode,shaftAngle:c.shaftAngle,shaftCap:c.shaftCap}};
  }
  function supports(recipe){if(recipe?.definition){api.modules.patternProviders.normalizeRecipe(recipe);return true;}return !!recipe&&definitions.some(d=>d.id===recipe.id&&d.version===recipe.version);}
  function normalizePartRecipe(part){
    if(supports(part.recipe))return normalizeRecipe(part.recipe);
    if(!part.geometrySnapshot)return normalizeRecipe(part.recipe);
    // Missing providers may only use an exact, bounded static outline binding.
    part.geometrySnapshot=api.modules.patternSnapshots.normalize(part.geometrySnapshot,part.recipe,part.strokeWidth);
    return JSON.parse(JSON.stringify(part.recipe));
  }
  function headOutline(points,width){
    const directions=points.slice(1).map((p,i)=>{const a=points[i],l=Math.hypot(p[0]-a[0],p[1]-a[1])||1;return[(p[0]-a[0])/l,(p[1]-a[1])/l];}),half=width/2;
    const side=sign=>points.map((p,i)=>{
      const a=directions[Math.max(0,i-1)],b=directions[Math.min(i,directions.length-1)],nx=-a[1]-b[1],ny=a[0]+b[0],len=Math.hypot(nx,ny),dot=len?(nx*-b[1]+ny*b[0])/len:0,reach=Math.abs(dot)>1e-6?half/dot:0;
      return Math.abs(reach)<=half*4&&len?[p[0]+sign*nx/len*reach,p[1]+sign*ny/len*reach]:[p[0]-sign*b[1]*half,p[1]+sign*b[0]*half];
    });return side(1).concat(side(-1).reverse());
  }
  function shaftOutline(start,end,width,cap){
    const dx=end[0]-start[0],dy=end[1]-start[1],length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length,nx=-uy,ny=ux,half=width/2,depth=Math.min(half,length),base=cap==='butt'?end:[end[0]-ux*depth,end[1]-uy*depth],
      out=[[start[0]+nx*half,start[1]+ny*half],[base[0]+nx*half,base[1]+ny*half]];
    if(cap==='point')out.push(end);
    if(cap==='round')for(let i=1;i<=12;i++){const angle=Math.PI*i/12;out.push([base[0]+nx*half*Math.cos(angle)+ux*depth*Math.sin(angle),base[1]+ny*half*Math.cos(angle)+uy*depth*Math.sin(angle)]);}
    else out.push([base[0]-nx*half,base[1]-ny*half]);
    out.push([start[0]-nx*half,start[1]-ny*half]);return out;
  }
  function finishOutline(points,radius){
    let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];}
    return api.modules.pathGeometry.rounded(area<0?points.slice().reverse():points,radius,8);
  }
  function shaftDirection(c,dx,dy,sign){
    if(c.shaftMode!=='fixed')return[sign*dx,sign*dy];
    // Fold one inclination into the corner's centroid-facing quadrant. Points
    // on a reflection axis must stay on it; tiny centroid errors are not sides.
    const angle=c.shaftAngle*Math.PI/180,side=v=>Math.abs(v)<1e-8?0:Math.sign(v),
      x=side(dx)*Math.abs(Math.cos(angle)),y=side(dy)*Math.abs(Math.sin(angle)),length=Math.hypot(x,y);
    return length>1e-8?[sign*x/length,sign*y/length]:[sign*dx,sign*dy];
  }
  function build(part,box,raw){
    const c=normalize(raw,part),b=box||{x:finite(part.x,0),y:finite(part.y,0),w:Math.max(1,finite(part.w,1)),h:Math.max(1,finite(part.h,1))},key=JSON.stringify([part.type,part.polygonMode,part.sides,part.points,b,c]);
    if(cache.has(key)){const result=cache.get(key);cache.delete(key);cache.set(key,result);return result;}
    let status='',vertices=[];
    if(part.type==='rect')vertices=[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]];
    else if(part.type==='poly'){
      const points=part.polygonMode==='regular'?api.modules.pathGeometry.regularPoints(part.sides):part.points||[];
      if(points.length>limit.vertices)status='角点箭头最多支持256个设计顶点';else vertices=points.map(p=>[b.x+p[0]*b.w,b.y+p[1]*b.h]);
    }else status='角点箭头需要矩形或多边形';
    vertices=vertices.filter((p,i)=>p.every(Number.isFinite)&&(!i||Math.hypot(p[0]-vertices[i-1][0],p[1]-vertices[i-1][1])>1e-8));
    if(vertices.length>1&&Math.hypot(vertices[0][0]-vertices.at(-1)[0],vertices[0][1]-vertices.at(-1)[1])<1e-8)vertices.pop();
    let area=0,cx=0,cy=0;const n=vertices.length;
    for(let i=0;i<n;i++){const a=vertices[i],b=vertices[(i+1)%n],cross=a[0]*b[1]-b[0]*a[1];area+=cross;cx+=(a[0]+b[0])*cross;cy+=(a[1]+b[1])*cross;}
    if(!status&&(n<3||Math.abs(area)<1e-8))status='角点箭头需要非退化的封闭多边形';
    const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    if(!status)for(let i=0;i<n&&!status;i++)for(let j=i+1;j<n;j++){
      if(j===i+1||i===0&&j===n-1)continue;const a=vertices[i],b=vertices[(i+1)%n],p=vertices[j],q=vertices[(j+1)%n];
      const on=(a,b,p)=>Math.abs(cross(a,b,p))<1e-8&&p[0]>=Math.min(a[0],b[0])-1e-8&&p[0]<=Math.max(a[0],b[0])+1e-8&&p[1]>=Math.min(a[1],b[1])-1e-8&&p[1]<=Math.max(a[1],b[1])+1e-8;
      if(cross(a,b,p)*cross(a,b,q)<-1e-8&&cross(p,q,a)*cross(p,q,b)<-1e-8||on(a,b,p)||on(a,b,q)||on(p,q,a)||on(p,q,b)){status='角点箭头暂不支持自交多边形';break;}
    }
    const paths=[],center=status?[b.x+b.w/2,b.y+b.h/2]:[cx/(3*area),cy/(3*area)];
    if(!status)for(let i=0;i<n;i++){
      const p=vertices[i],a=vertices[(i+n-1)%n],b=vertices[(i+1)%n],la=Math.hypot(a[0]-p[0],a[1]-p[1]),lb=Math.hypot(b[0]-p[0],b[1]-p[1]),l=Math.hypot(center[0]-p[0],center[1]-p[1]);if(!la||!lb||!l)continue;
      const u=[(a[0]-p[0])/la,(a[1]-p[1])/la],v=[(b[0]-p[0])/lb,(b[1]-p[1])/lb];if(u[0]*v[0]+u[1]*v[1]<-0.999999)continue;
      const dx=(center[0]-p[0])/l,dy=(center[1]-p[1])/l,tip=[p[0]+dx*c.inset,p[1]+dy*c.inset],sign=c.direction==='out'?1:-1;
      if(c.size>0){const head=[[tip[0]+sign*u[0]*c.size,tip[1]+sign*u[1]*c.size],tip,[tip[0]+sign*v[0]*c.size,tip[1]+sign*v[1]*c.size]];paths.push({kind:'corner-arrows',index:i,points:head,outline:finishOutline(headOutline(head,c.width),c.radius),closed:false,width:c.width});}
      const [sx,sy]=shaftDirection(c,dx,dy,sign),end=[tip[0]+sx*c.length,tip[1]+sy*c.length];
      if(c.length>0)paths.push({kind:'corner-arrows',index:i,points:[tip,end],outline:finishOutline(shaftOutline(tip,end,c.width,c.shaftCap),c.radius),closed:false,width:c.width});
    }
    const count=paths.reduce((sum,p)=>sum+p.points.length+p.outline.length,0),result={paths,vertices,center,status,settings:c,points:count};cache.set(key,result);cachedPoints+=count;
    while(cache.size>limit.entries||cachedPoints>limit.points){const old=cache.keys().next().value;cachedPoints-=cache.get(old).points;cache.delete(old);}return result;
  }
  function custom(part,time){if(part.recipe?.definition)return api.modules.patternProviders.build(part,time);if(!supports(part.recipe)){normalizePartRecipe(part);return api.modules.patternSnapshots.render(part);}const recipe=normalizeRecipe(part.recipe),raw={...recipe.params,enabled:true,width:part.strokeWidth,color:part.stroke||'#ffd23f',alpha:part.stroke===null?0:part.strokeAlpha};if(recipe.id==='brackets')return api.modules.bracketShapes.build(part,null,normalizeBrackets(raw,part));const config=normalize(raw,part);return build({...part,type:'rect'},null,config);}
  function paint(ctx,result){if(result.paintPlan){ctx.save();try{if(result.paintTransform){const a=result.paintTransform;ctx.translate(a.x,a.y);ctx.scale(a.sx,a.sy);ctx.translate(-result.paintPlan.bounds.x,-result.paintPlan.bounds.y);}api.modules.patternGenerators.paint(ctx,result.paintPlan);}finally{ctx.restore();}return;}const c=result.settings;if(!c.alpha||!c.width)return;ctx.save();ctx.globalAlpha*=c.alpha;ctx.fillStyle=c.color;ctx.beginPath();for(const path of result.paths){path.outline.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();}ctx.fill();ctx.restore();}
  function bounds(result,fallback){const points=result.paths.flatMap(p=>p.outline);if(!points.length)return fallback||{x:0,y:0,w:1,h:1};const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1]));return{x,y,w:Math.max(1,Math.max(...points.map(p=>p[0]))-x),h:Math.max(1,Math.max(...points.map(p=>p[1]))-y)};}
  function contains(result,x,y,tolerance){if(!result.settings.alpha||!result.settings.width)return false;for(const path of result.paths){let inside=false;const points=path.outline;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[j],b=points[i];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/l)):0;if(Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<=Math.max(0,tolerance||0))return true;}if(inside)return true;}return false;}
  api.modules.customShapes=Object.freeze({definitions,eligible,normalize,normalizeBrackets,normalizeRecipe,normalizePartRecipe,supports,build,custom,paint,bounds,contains,strokeOutline:headOutline,finishOutline,limits:limit,stats:()=>({entries:cache.size,points:cachedPoints})});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:59g-custom-shapes.js> */

/* <vnext:59h-bracket-shapes.js> */
/* Brackets and corner marks share one mirrored local frame, never font glyphs. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,cache=new Map(),limits=Object.freeze({entries:32,points:65536,arcSegments:128});let cachedPoints=0;
  const finite=(v,d)=>Number.isFinite(+v)?+v:d;
  function eligible(part){return ['rect','ellipse','poly'].includes(part.type);}
  function build(part,box,raw){
    const shapes=api.modules.customShapes,c=shapes.normalizeBrackets(raw,part),b=box||{x:finite(part.x,0),y:finite(part.y,0),w:Math.max(1,finite(part.w,1)),h:Math.max(1,finite(part.h,1))},key=JSON.stringify([b,c]);
    if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
    const width=Math.min(c.width,Math.max(0,Math.min(b.w,b.h)-.0001)),half=width/2,left=b.x+half,top=b.y+half,right=b.x+b.w-half,bottom=b.y+b.h-half,
      w=Math.max(0,right-left),h=Math.max(0,bottom-top),corners=c.corners==='all'?['tl','tr','bl','br']:c.corners.split('-'),
      pairX=c.layout==='full'?c.side==='both':corners.some(a=>corners.some(b=>a[0]===b[0]&&a[1]!==b[1])),
      pairY=c.layout==='corners'&&corners.some(a=>corners.some(b=>a[1]===b[1]&&a[0]!==b[0])),
      ax=Math.min(c.armX,pairX?Math.max(0,(w-width)/2):w),ay=Math.min(c.armY,pairY?Math.max(0,(h-width)/2):h),paths=[];
    function add(points,index){
      // Positive offsets expand symmetrically, never translate the whole set.
      const dx=(index==='left'||index.endsWith('l')?-1:1)*c.offsetX;
      points=points.map(([x,y])=>[x+dx,c.layout==='full'?(top+bottom)/2+(y-(top+bottom)/2)*Math.max(0,h+2*c.offsetY)/Math.max(.000001,h):y+(index.startsWith('t')?-1:1)*c.offsetY]);
      points=points.filter((p,i)=>!i||Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1])>1e-8);
      if(points.length<2||!width)return;
      const outline=shapes.finishOutline(shapes.strokeOutline(points,width),c.shape==='square'?c.radius:0);
      paths.push({kind:'brackets',index,points,outline,closed:false,width});
    }
    const mirror=(points,x,y)=>points.map(p=>[x?left+right-p[0]:p[0],y?top+bottom-p[1]:p[1]]);
    function arc(cx,cy,rx,ry,start,end){const count=Math.min(limits.arcSegments,Math.max(8,Math.ceil(Math.abs(end-start)*Math.max(rx,ry)/2)));return Array.from({length:count+1},(_,i)=>{const a=start+(end-start)*i/count;return[cx+rx*Math.cos(a),cy+ry*Math.sin(a)];});}
    if(c.layout==='full'){
      const points=c.shape==='round'?arc(left+ax,(top+bottom)/2,ax,h/2,Math.PI/2,Math.PI*1.5):[[left+ax,top],[left,top],[left,bottom],[left+ax,bottom]];
      if(c.side!=='right')add(points,'left');if(c.side!=='left')add(mirror(points,true,false),'right');
    }else{
      const points=c.shape==='round'?arc(left+ax,top+ay,ax,ay,Math.PI,Math.PI*1.5):[[left+ax,top],[left,top],[left,top+ay]];
      for(const corner of corners)add(mirror(points,corner.endsWith('r'),corner.startsWith('b')),corner);
    }
    const count=paths.reduce((sum,p)=>sum+p.points.length+p.outline.length,0),constrained=width<c.width-.001||ax<c.armX-.001||c.layout==='corners'&&ay<c.armY-.001,
      status=constrained?'受当前框定范围限制：实际粗细 '+Math.round(width*10)/10+'，横向长度 '+Math.round(ax*10)/10+(c.layout==='corners'?'，纵向长度 '+Math.round(ay*10)/10:''):'',
      result={settings:c,effective:{width,armX:ax,armY:ay},paths,status,points:count};
    cache.set(key,result);cachedPoints+=count;while(cache.size>limits.entries||cachedPoints>limits.points){const first=cache.keys().next().value;cachedPoints-=cache.get(first).points;cache.delete(first);}return result;
  }
  api.modules.bracketShapes=Object.freeze({eligible,build,limits,stats:()=>({entries:cache.size,points:cachedPoints})});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:59h-bracket-shapes.js> */

/* <vnext:59i-pattern-snapshot.js> */
/* Portable static outlines. A snapshot is data, never a generator or executable code. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,FORMAT='tosampool-pattern-geometry/v1';
  const limits=Object.freeze({paths:1024,points:8192,coordinate:1000000,parameterBytes:65536});
  const checked=new WeakSet(),rendered=new WeakMap();
  function ordered(value,depth){
    if(depth>24)throw Error('图样快照参数嵌套过深');
    if(value===null||['string','boolean'].includes(typeof value))return value;
    if(typeof value==='number'&&Number.isFinite(value))return value;
    if(Array.isArray(value))return value.map(item=>ordered(item,depth+1));
    if(value&&typeof value==='object'){
      const result={};for(const key of Object.keys(value).sort()){
        if(['__proto__','prototype','constructor'].includes(key))throw Error('图样快照包含不安全字段');
        if(value[key]!==undefined)result[key]=ordered(value[key],depth+1);
      }return result;
    }throw Error('图样快照只接受有限JSON数据');
  }
  function binding(recipe,width){
    if(!recipe||typeof recipe.id!=='string'||!recipe.id||!Number.isInteger(recipe.version)||recipe.version<1||recipe.params!=null&&(typeof recipe.params!=='object'||Array.isArray(recipe.params)))throw Error('图样快照缺少有效配方身份');
    const result=JSON.stringify(ordered({recipe:{id:recipe.id,version:recipe.version,params:recipe.params||{},...(recipe.providerKey?{providerKey:recipe.providerKey}:{})},strokeWidth:Math.max(0,Number.isFinite(+width)?+width:3)},0));
    if(result.length>limits.parameterBytes)throw Error('图样快照参数超出预算');return result;
  }
  function normalize(raw,recipe,width){
    const expected=binding(recipe,width);
    if(raw?.format!==FORMAT||raw.binding!==expected)throw Error('图样快照与配方／粗细不匹配');
    if(checked.has(raw))return raw;
    if(!Array.isArray(raw.paths)||raw.paths.length>limits.paths)throw Error('图样快照路径超出预算');
    let count=0;
    const paths=raw.paths.map(path=>{
      if(!Array.isArray(path)||path.length<3)throw Error('图样快照轮廓无效');
      count+=path.length;if(count>limits.points)throw Error('图样快照点数超出预算');
      return Object.freeze(path.map(point=>{
        if(!Array.isArray(point)||point.length!==2||point.some(n=>typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>limits.coordinate))throw Error('图样快照坐标无效');
        return Object.freeze(point.slice());
      }));
    });
    const paintPlan=raw.paintPlan?api.modules.patternGenerators.restorePlan(raw.paintPlan):null;
    if(paintPlan&&(paintPlan.id!==recipe.id||paintPlan.version!==recipe.version))throw Error('绘制快照身份不匹配');
    const result=Object.freeze({format:FORMAT,binding:expected,paths:Object.freeze(paths),...(paintPlan?{paintPlan}:{})});checked.add(result);return result;
  }
  function capture(part){
    const shapes=api.modules.customShapes;
    if(!shapes.supports(part.recipe))return normalize(part.geometrySnapshot,part.recipe,part.strokeWidth);
    const recipe=shapes.normalizeRecipe(part.recipe),result=shapes.custom(part);
    if(result.status)throw Error('图样几何未成功生成：'+result.status);
    const x=Number.isFinite(+part.x)?+part.x:0,y=Number.isFinite(+part.y)?+part.y:0,w=Math.max(1,+part.w||1),h=Math.max(1,+part.h||1);
    const paths=result.paths.map(path=>(path.outline||[]).map(point=>[(point[0]-x)/w,(point[1]-y)/h]));
    return normalize({format:FORMAT,binding:binding(recipe,part.strokeWidth),paths,...(result.paintPlan?{paintPlan:result.paintPlan}:{})},recipe,part.strokeWidth);
  }
  function render(part){
    const snapshot=normalize(part.geometrySnapshot,part.recipe,part.strokeWidth),x=+part.x||0,y=+part.y||0,w=Math.max(1,+part.w||1),h=Math.max(1,+part.h||1);
    const alpha=part.stroke===null?0:Math.max(0,Math.min(1,part.strokeAlpha==null?1:+part.strokeAlpha||0));
    const key=JSON.stringify([x,y,w,h,part.stroke,alpha,part.strokeWidth]),cached=rendered.get(snapshot);
    if(cached?.key===key)return cached.result;
    const result={snapshot:true,status:'生成器不可用，保留几何缓存',settings:{width:Math.max(0,part.strokeWidth==null?3:+part.strokeWidth||0)||(snapshot.paths.length?1:0),color:part.stroke||'#ffd23f',alpha},
      ...(snapshot.paintPlan?{paintPlan:snapshot.paintPlan,paintTransform:{x,y,sx:w/snapshot.paintPlan.bounds.w,sy:h/snapshot.paintPlan.bounds.h}}:{}),
      paths:snapshot.paths.map(outline=>({closed:true,points:[],outline:outline.map(p=>[x+p[0]*w,y+p[1]*h])}))};
    rendered.set(snapshot,{key,result});return result;
  }
  function prepareScene(scene){
    for(const entity of scene.entities||[])for(const part of entity.parts||[])if(part.type==='custom'){
      if(api.modules.customShapes.supports(part.recipe))part.recipe=api.modules.customShapes.normalizeRecipe(part.recipe);
      part.geometrySnapshot=capture(part);
    }
    for(const preset of Object.values(scene.patternResources||{})){
      if(preset.mode==='path')continue; // Path recipes are source declarations, not custom-outline snapshots.
      const part={type:'custom',x:0,y:0,w:160,h:100,strokeWidth:preset.style?.width??3,recipe:{id:preset.engineId,version:preset.engineVersion,params:preset.params||{},...(preset.definition?{definition:preset.definition}:{}),...(preset.providerKey?{providerKey:preset.providerKey}:{})},geometrySnapshot:preset.geometrySnapshot};
      preset.geometrySnapshot=capture(part);
    }
    return scene;
  }
  api.modules.patternSnapshots=Object.freeze({FORMAT,limits,binding,normalize,capture,render,prepareScene});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:59i-pattern-snapshot.js> */

/* <vnext:59j-pattern-provider.js> */
/* Bounded declarative path templates. No code, expressions, global installs or I/O. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,FORMAT='tosampool-pattern-definition/v1';
  const limits=Object.freeze({parameters:24,paths:32,designPoints:512,points:8192,entries:32,cachePoints:65536,coordinateSpan:64});
  const known=new WeakMap(),cache=new Map();let cachedPoints=0;
  const reserved=new Set(['corner-arrows','brackets']);
  const identifier=value=>typeof value==='string'&&/^[a-z][a-z0-9._-]{0,95}$/i.test(value)&&!['__proto__','constructor','prototype'].includes(value);
  function object(value){return value&&typeof value==='object'&&!Array.isArray(value);}
  function fields(value,allowed,label){if(!object(value)||Object.keys(value).some(key=>!allowed.includes(key)))throw Error(label+'包含未支持字段');}
  function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>1000000)throw Error(label+'必须是预算内有限数值');return value;}
  function canonical(value){if(Array.isArray(value))return value.map(canonical);if(object(value))return Object.fromEntries(Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>[key,canonical(value[key])]));return value;}
  function deepFreeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;}
  function normalizeParam(param,value){
    if(param.type==='color')return /^#[\da-f]{6}$/i.test(value||'')?value:param.default;
    if(param.type==='boolean')return typeof value==='boolean'?value:param.default;
    if(param.type==='select')return param.options.includes(value)?value:param.default;
    let number=Number.isFinite(+value)&&value!==null&&value!==''?+value:param.default;
    if(param.integer)number=Math.round(number);
    return Math.max(param.min??-1000000,Math.min(param.max??1000000,number));
  }
  function validate(raw){
    if(known.has(raw))return known.get(raw);
    if(raw?.format===api.modules.patternGenerators?.FORMAT){const definition=api.modules.patternGenerators.validateDefinition(raw),record=Object.freeze({definition,key:JSON.stringify(canonical(definition))});known.set(definition,record);return record;}
    fields(raw,['format','id','version','name','parameters','paths'],'图样定义');
    if(raw.format!==FORMAT||!identifier(raw.id)||reserved.has(raw.id)||!Number.isInteger(raw.version)||raw.version<1)throw Error('图样定义身份无效或占用原生ID');
    if(typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>100)throw Error('图样定义缺少名称');
    if(!Array.isArray(raw.parameters)||raw.parameters.length>limits.parameters||!Array.isArray(raw.paths)||!raw.paths.length||raw.paths.length>limits.paths)throw Error('图样定义声明超出预算');
    const names=new Map(),used=new Set();
    const parameters=raw.parameters.map(input=>{
      fields(input,['key','label','type','default','min','max','step','integer','options','timing','interpolation'],'图样参数');
      if(!identifier(input.key)||input.key.includes('.')||names.has(input.key)||!['number','boolean','select'].includes(input.type)||typeof input.label!=='string'||!input.label||input.label.length>80)throw Error('图样参数身份／类型无效');
      const p={key:input.key,label:input.label,type:input.type,default:input.default};
      if(input.timing!=null){const capability=api.modules.parameterTiming?.capability(input);if(!capability)throw Error('当前Runtime不支持参数时序声明');p.timing=capability.timing;if(input.interpolation)p.interpolation=capability.interpolation;}
      else if(input.interpolation!=null)throw Error('插值规则需要显式时序声明');
      if(p.type==='boolean'&&['min','max','step','integer','options'].some(k=>input[k]!==undefined)||p.type==='select'&&['min','max','step','integer'].some(k=>input[k]!==undefined)||p.type==='number'&&input.options!==undefined)throw Error('图样参数包含不适用的设置');
      if(p.type==='number'){
        finite(p.default,'参数默认值');for(const key of ['min','max','step'])if(input[key]!=null)p[key]=finite(input[key],key);
        p.integer=!!input.integer;if((p.min??-Infinity)>(p.max??Infinity)||p.step!=null&&p.step<=0||p.integer&&p.default!==Math.round(p.default)||normalizeParam(p,p.default)!==p.default)throw Error('图样参数范围无效');
      }else if(p.type==='boolean'){if(typeof p.default!=='boolean')throw Error('图样开关默认值无效');}
      else{if(!Array.isArray(input.options)||!input.options.length||input.options.length>16||input.options.some(v=>typeof v!=='string'||!v||v.length>80)||new Set(input.options).size!==input.options.length||!input.options.includes(p.default))throw Error('图样选项无效');p.options=input.options.slice();}
      names.set(p.key,p);return p;
    });
    function coordinate(value){
      if(typeof value==='number')return finite(value,'路径坐标');
      fields(value,['constant','w','h','params'],'路径坐标');
      const result={};for(const key of ['constant','w','h'])if(value[key]!=null)result[key]=finite(value[key],'坐标系数');
      if(value.params!=null){if(!object(value.params)||Object.keys(value.params).length>8)throw Error('坐标参数项超出预算');result.params={};for(const [key,n]of Object.entries(value.params)){if(names.get(key)?.type!=='number')throw Error('坐标引用未声明数值参数：'+key);result.params[key]=finite(n,'参数系数');if(n!==0)used.add(key);}}
      return result;
    }
    let points=0;
    const paths=raw.paths.map(path=>{
      fields(path,['points','mode','mirror','radius','when'],'模板路径');
      const mode=path.mode||'stroke',mirror=path.mirror||'none';
      if(!['stroke','fill'].includes(mode)||!['none','x','y','xy'].includes(mirror)||!Array.isArray(path.points)||path.points.length<(mode==='fill'?3:2))throw Error('模板路径类型／点数无效');
      points+=path.points.length;if(points>limits.designPoints)throw Error('模板设计点数超出预算');
      const result={mode,mirror,radius:coordinate(path.radius??0),points:path.points.map(point=>{if(!Array.isArray(point)||point.length!==2)throw Error('模板路径点必须是二维');return point.map(coordinate);})};
      if(path.when){fields(path.when,['key','equals'],'路径条件');const p=names.get(path.when.key);if(!p||normalizeParam(p,path.when.equals)!==path.when.equals)throw Error('路径条件引用无效');used.add(p.key);result.when={key:p.key,equals:path.when.equals};}
      return result;
    });
    if(parameters.some(param=>!used.has(param.key)))throw Error('图样声明了未被路径引用的参数');
    const definition=deepFreeze({format:FORMAT,id:raw.id,version:raw.version,name:raw.name,parameters,paths});
    const key=JSON.stringify(canonical(definition));if(key.length>32768)throw Error('图样定义超出32KB预算');
    const record=Object.freeze({definition,key});known.set(definition,record);return record;
  }
  function normalizeRecipe(recipe){
    const {definition,key}=validate(recipe.definition);
    if(recipe.id!==definition.id||recipe.version!==definition.version||recipe.providerKey!=null&&recipe.providerKey!==key)throw Error('图样配方与定义身份／内容不匹配');
    if(recipe.params!=null&&!object(recipe.params))throw Error('图样params必须是对象');
    const params={};for(const param of definition.parameters)params[param.key]=normalizeParam(param,recipe.params?.[param.key]);
    return{id:definition.id,version:definition.version,params,definition,providerKey:key};
  }
  function build(part,time){
    const recipe=normalizeRecipe(part.recipe),definition=recipe.definition;
    if(definition.format===api.modules.patternGenerators?.FORMAT){
      const box={x:+part.x||0,y:+part.y||0,w:Math.max(1,+part.w||1),h:Math.max(1,+part.h||1)},carrier=api.modules.patternGenerators.carrierFor(definition,recipe.params,part,box),geometry=api.modules.pathGeometry.full(carrier,box),path=geometry.stroke;
      const paintPlan=api.modules.patternGenerators.generateDefinition(definition,{carrierType:carrier.type,path,bounds:box,params:recipe.params,time:time||0,seed:1});
      return{paths:[{kind:'generator',closed:true,points:[],outline:path}],settings:{width:1,color:'#ffffff',alpha:1},status:'',provider:true,paintPlan};
    }
    const x=+part.x||0,y=+part.y||0,w=Math.max(1,+part.w||1),h=Math.max(1,+part.h||1),width=Math.max(0,part.strokeWidth==null?3:+part.strokeWidth||0),color=part.stroke||'#ffd23f',alpha=part.stroke===null?0:Math.max(0,Math.min(1,part.strokeAlpha??1));
    const key=JSON.stringify([recipe.providerKey,recipe.params,x,y,w,h,width,color,alpha]);
    if(cache.has(key)){const result=cache.get(key);cache.delete(key);cache.set(key,result);return result;}
    function evaluate(value){let n=value;if(typeof value!=='number'){n=(value.constant||0)+(value.w||0)*w+(value.h||0)*h;for(const [key,factor]of Object.entries(value.params||{}))n+=recipe.params[key]*factor;}if(!Number.isFinite(n)||Math.abs(n)>Math.min(10000000,limits.coordinateSpan*Math.max(w,h)))throw Error('模板生成坐标超出预算');return n;}
    const paths=[];let points=0;
    for(const path of definition.paths){
      if(path.when&&recipe.params[path.when.key]!==path.when.equals)continue;
      const source=path.points.map(p=>p.map(evaluate)).filter((p,i,all)=>!i||Math.hypot(p[0]-all[i-1][0],p[1]-all[i-1][1])>1e-8);
      if(source.length<(path.mode==='fill'?3:2)||path.mode==='stroke'&&!width)continue;
      const outline=api.modules.customShapes.finishOutline(path.mode==='fill'?source:api.modules.customShapes.strokeOutline(source,width),Math.max(0,evaluate(path.radius)));
      if(path.mode==='fill'){let area=0;outline.forEach((p,i)=>{const q=outline[(i+1)%outline.length];area+=p[0]*q[1]-q[0]*p[1];});if(Math.abs(area)<1e-8)continue;}
      const mirrors=path.mirror==='xy'?[[1,1],[-1,1],[1,-1],[-1,-1]]:path.mirror==='x'?[[1,1],[-1,1]]:path.mirror==='y'?[[1,1],[1,-1]]:[[1,1]];
      for(const [sx,sy]of mirrors){const polygon=outline.map(p=>[x+(sx===1?p[0]:w-p[0]),y+(sy===1?p[1]:h-p[1])]);if(sx*sy<0)polygon.reverse();points+=polygon.length;if(points>limits.points)throw Error('模板派生点数超出预算');paths.push({kind:'template',closed:true,points:[],outline:polygon});}
    }
    const result={paths,settings:{width:width||1,color,alpha},status:'',points,provider:true};cache.set(key,result);cachedPoints+=points;
    while(cache.size>limits.entries||cachedPoints>limits.cachePoints){const first=cache.keys().next().value;cachedPoints-=cache.get(first).points;cache.delete(first);}
    return result;
  }
  function validateScene(scene){
    const definitions=scene.patternDefinitions||{};
    const seen=new Map();
    for(const [id,raw]of Object.entries(definitions)){const {definition,key}=validate(raw);if(id!==definition.id+'@'+definition.version)throw Error('工程图样注册键不匹配');seen.set(id,key);}
    for(const e of scene.entities||[])for(const p of e.parts||[])if(p.recipe?.definition||p.recipe?.providerKey){const key=p.recipe.definition?validate(p.recipe.definition).key:p.recipe.providerKey,id=p.recipe.id+'@'+p.recipe.version;if(seen.has(id)&&seen.get(id)!==key)throw Error('工程内同身份图样定义冲突');seen.set(id,key);}
    return scene;
  }
  api.modules.patternProviders=Object.freeze({FORMAT,limits,validate,normalizeParam,normalizeRecipe,build,validateScene,stats:()=>({entries:cache.size,points:cachedPoints})});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:59j-pattern-provider.js> */

/* <vnext:59k-pattern-generators.js> */
/* Host-reviewed generators produce bounded paint plans. Registration is NOT a JS sandbox. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,records=new Map(),implementations=new Map(),resolved=new WeakMap(),plans=new WeakSet();
  const FORMAT='tosampool-pattern-generator/v1';
  const limits=Object.freeze({parameters:24,carrierPoints:8192,layers:256,commands:4096,number:1000000});
  const identifier=v=>typeof v==='string'&&/^[a-z][a-z0-9._-]{0,95}$/i.test(v)&&!['constructor','prototype','__proto__'].includes(v);
  const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const color=v=>typeof v==='string'&&/^#[a-f0-9]{6}$/i.test(v);
  const copy=v=>JSON.parse(JSON.stringify(v));
  function number(v,label){if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>limits.number)throw Error(label+'必须是预算内有限数');return v;}
  function fields(v,keys,label){if(!object(v)||Object.keys(v).some(k=>!keys.includes(k)))throw Error(label+'包含未支持字段');}
  function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
  function normalizeParam(p,v){
    if(p.type==='color')return color(v)?v:p.default;
    if(p.type==='boolean')return typeof v==='boolean'?v:p.default;
    if(p.type==='select')return p.options.includes(v)?v:p.default;
    let n=typeof v==='number'&&Number.isFinite(v)?v:p.default;
    if(p.integer)n=Math.round(n);return Math.max(p.min,Math.min(p.max,n));
  }
  function validate(raw){
    fields(raw,['format','id','version','name','implementation','carriers','parameters','controls','output','dependencies','budget'],'生成器声明');
    if(raw.format!==FORMAT||!identifier(raw.id)||!Number.isInteger(raw.version)||raw.version<1||!identifier(raw.implementation)||typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>100)throw Error('生成器身份无效');
    if(raw.output!=='carrier-clipped-paint'||!Array.isArray(raw.dependencies)||raw.dependencies.length)throw Error('本版仅支持无依赖的载体裁切绘制');
    if(!Array.isArray(raw.carriers)||!raw.carriers.length||new Set(raw.carriers).size!==raw.carriers.length||raw.carriers.some(v=>!['rect','ellipse','poly'].includes(v)))throw Error('生成器载体无效');
    if(!Array.isArray(raw.parameters)||raw.parameters.length>limits.parameters)throw Error('参数超出预算');
    const keys=new Set(),parameters=raw.parameters.map(input=>{
      fields(input,['key','label','type','default','min','max','step','integer','options','labels','timing','interpolation','when'],'生成器参数');
      if(!identifier(input.key)||input.key.includes('.')||keys.has(input.key)||typeof input.label!=='string'||!input.label||input.label.length>80||!['number','color','boolean','select'].includes(input.type)||!['No','Step','Linear'].includes(input.timing))throw Error('生成器参数声明无效');
      api.modules.parameterTiming.capability(input);
      const p=copy(input);keys.add(p.key);
      if(p.type==='number'){
        number(p.min,'最小值');number(p.max,'最大值');number(p.default,'默认值');
        if(p.min>p.max||p.step!=null&&number(p.step,'步长')<=0||p.integer!=null&&typeof p.integer!=='boolean'||p.options!==undefined)throw Error('参数范围无效');
      }else{
        if(['min','max','step','integer'].some(k=>p[k]!==undefined))throw Error('非数值参数不能声明数值范围');
        if(p.type==='select'){
          if(!Array.isArray(p.options)||!p.options.length||p.options.length>32||new Set(p.options).size!==p.options.length||p.options.some(v=>typeof v!=='string'||!v||v.length>80)||!p.options.includes(p.default))throw Error('参数选项无效');
        }else if(p.options!==undefined)throw Error('非选择参数不能声明选项');
        if(p.type==='color'&&!color(p.default)||p.type==='boolean'&&typeof p.default!=='boolean')throw Error('参数默认值无效');
      }
      if(normalizeParam(p,p.default)!==p.default)throw Error('参数默认值超出范围');
      if(p.labels!==undefined&&(p.type!=='select'||!Array.isArray(p.labels)||p.labels.length!==p.options.length||p.labels.some(v=>typeof v!=='string'||!v||v.length>80)))throw Error('参数选项名称无效');
      return p;
    });
    for(const p of parameters)if(p.when!=null&&(!keys.has(p.when)||parameters.find(v=>v.key===p.when).type!=='boolean'||p.when===p.key))throw Error('渐进参数需要引用开关');
    for(const p of parameters){const seen=new Set([p.key]);let next=p.when;while(next){if(seen.has(next))throw Error('渐进开关不可循环引用');seen.add(next);next=parameters.find(v=>v.key===next).when;}}
    const byKey=new Map(parameters.map(p=>[p.key,p])),claimed=new Set();
    if(!Array.isArray(raw.controls)||raw.controls.length>limits.parameters)throw Error('控件声明无效');
    const controls=raw.controls.map(c=>{
      fields(c,['component','key','alphaKey'],'组件绑定');
      const p=byKey.get(c.key);if(!p||claimed.has(c.key)||!['field','color-alpha'].includes(c.component))throw Error('组件绑定重复或无效');
      claimed.add(c.key);
      if(c.component==='color-alpha'){
        const a=byKey.get(c.alphaKey);
        if(p.type!=='color'||!a||a.type!=='number'||a.min!==0||a.max!==1||a.when!==p.when||claimed.has(a.key))throw Error('颜色组件必须绑定唯一的0–1透明度');
        claimed.add(a.key);
      }else if(c.alphaKey!==undefined||p.type==='color')throw Error('颜色需要共用颜色／透明度组件');
      return copy(c);
    });
    if(claimed.size!==keys.size)throw Error('参数未绑定组件');
    fields(raw.budget,['layers','commands'],'生成器预算');
    for(const k of ['layers','commands'])if(!Number.isInteger(raw.budget[k])||raw.budget[k]<1||raw.budget[k]>limits[k])throw Error('生成器预算无效');
    return freeze({...copy(raw),parameters,controls});
  }
  function register(manifest,generate,options){
    if(options?.trust!=='repository-reviewed')throw Error('生成器仅允许宿主登记已审阅实现');
    const m=validate(manifest),key=m.id+'@'+m.version;
    if(typeof generate!=='function'||records.has(key))throw Error('生成器实现缺失或身份重复');
    const implementationKey=m.id+':'+m.implementation;
    if(implementations.has(implementationKey))throw Error('生成器实现标识重复');
    const carrier=typeof options.carrier==='function'?options.carrier:null,source=String(generate)+'\n'+String(carrier);let hash=2166136261;for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619);}
    const record=Object.freeze({manifest:m,generate,carrier,fingerprint:(hash>>>0).toString(16)});records.set(key,record);implementations.set(implementationKey,record);return m;
  }
  function definition(id,version){const r=records.get(id+'@'+version);if(!r)throw Error('生成器未登记：'+id+'@'+version);return r.manifest;}
  function normalize(id,version,input){return Object.fromEntries(definition(id,version).parameters.map(p=>[p.key,normalizeParam(p,input?.[p.key])]));}
  function resolveDefinition(raw){
    if(resolved.has(raw))return resolved.get(raw);
    const m=validate(raw),r=implementations.get(m.id+':'+m.implementation);if(!r)throw Error('生成器实现未登记');
    // Metadata/default revisions may differ per document, never code or parameter semantics.
    const ordered=v=>Array.isArray(v)?v.map(ordered):object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])])):v;
    const signature=v=>JSON.stringify(ordered({...v,version:0,name:'',parameters:v.parameters.map(p=>({...p,label:'',default:null}))}));
    if(signature(m)!==signature(r.manifest))throw Error('生成器声明与已审阅实现不匹配');
    const result={manifest:m,record:r};resolved.set(m,result);return result;
  }
  function generateUsing(r,m,input){
    if(!object(input)||!m.carriers.includes(input.carrierType)||!Array.isArray(input.path)||input.path.length<3||input.path.length>limits.carrierPoints)throw Error('生成器需要有效的封闭载体路径');
    const path=input.path.map(p=>{if(!Array.isArray(p)||p.length!==2)throw Error('载体路径点无效');return [number(p[0],'路径X'),number(p[1],'路径Y')];});
    fields(input.bounds,['x','y','w','h'],'载体范围');const bounds={};for(const k of ['x','y','w','h'])bounds[k]=number(input.bounds[k],'载体范围');
    if(bounds.w<=0||bounds.h<=0||path.some(p=>p[0]<bounds.x-1e-7||p[0]>bounds.x+bounds.w+1e-7||p[1]<bounds.y-1e-7||p[1]>bounds.y+bounds.h+1e-7))throw Error('载体路径超出范围');
    const time=number(input.time??0,'时间'),seed=number(input.seed??1,'随机种子');
    const request=freeze({carrierType:input.carrierType,path,bounds,params:Object.fromEntries(m.parameters.map(p=>[p.key,normalizeParam(p,input.params?.[p.key])])),time,seed});
    const result=r.generate(request);
    return validatePlan({id:m.id,version:m.version,path,bounds,layers:result?.layers},m.budget,result);
  }
  function validatePlan(raw,budget,result){
    fields(result||{layers:raw.layers},['layers'],'生成器输出');
    const {id,version}=raw;
    if(!identifier(id)||!Number.isInteger(version)||version<1)throw Error('绘制计划身份无效');
    if(!Array.isArray(raw.path)||raw.path.length<3||raw.path.length>limits.carrierPoints)throw Error('绘制计划载体无效');
    const path=raw.path.map(p=>{if(!Array.isArray(p)||p.length!==2)throw Error('绘制计划路径无效');return p.map(v=>number(v,'路径坐标'));});
    fields(raw.bounds,['x','y','w','h'],'绘制计划范围');const bounds={};for(const k of ['x','y','w','h'])bounds[k]=number(raw.bounds[k],'范围');
    if(bounds.w<=0||bounds.h<=0||path.some(p=>p[0]<bounds.x-1e-7||p[0]>bounds.x+bounds.w+1e-7||p[1]<bounds.y-1e-7||p[1]>bounds.y+bounds.h+1e-7))throw Error('绘制计划范围无效');
    result=result||{layers:raw.layers};
    if(!Array.isArray(result.layers)||result.layers.length>budget.layers)throw Error('绘制层数超出预算');
    let count=0;
    const layers=result.layers.map((layer,index)=>{
      fields(layer,['color','alpha','commands','fillCarrier'],'绘制层');
      if(!color(layer.color)||typeof layer.alpha!=='number'||!Number.isFinite(layer.alpha)||layer.alpha<0||layer.alpha>1)throw Error('绘制层无效');
      // A single first-layer carrier fill reuses the separately bounded clip path.
      // Do not duplicate thousands of ellipse vertices in every generated plan.
      if(layer.fillCarrier===true){if(index!==0||layer.commands!==undefined)throw Error('载体底色只允许首层');return{color:layer.color,alpha:layer.alpha,fillCarrier:true};}
      if(layer.fillCarrier!==undefined||!Array.isArray(layer.commands)||!layer.commands.length)throw Error('绘制层无效');
      const commands=layer.commands.map(c=>{
        if(!Array.isArray(c)||!['M','L','A','Z'].includes(c[0])||c.length!==({M:3,L:3,A:6,Z:1})[c[0]])throw Error('绘制指令无效');
        if(++count>budget.commands)throw Error('绘制指令超出预算');
        c.slice(1).forEach(v=>number(v,'绘制坐标'));if(c[0]==='A'&&c[3]<0)throw Error('圆弧半径无效');
        return c.slice();
      });
      if(commands[0][0]!=='M')throw Error('绘制路径缺少起点');
      return {color:layer.color,alpha:layer.alpha,commands};
    });
    const value=freeze({format:FORMAT,id,version,path,bounds,layers,commands:count});plans.add(value);return value;
  }
  function generate(id,version,input){const r=records.get(id+'@'+version);if(!r)throw Error('生成器未登记');return generateUsing(r,r.manifest,input);}
  function generateDefinition(raw,input){const {record,manifest}=resolveDefinition(raw);return generateUsing(record,manifest,input);}
  function carrierFor(raw,params,part,box){const {record,manifest}=resolveDefinition(raw);return record.carrier?record.carrier(params,box,part):{...part,...box,type:manifest.carriers[0]};}
  function restorePlan(raw){fields(raw,['format','id','version','path','bounds','layers','commands'],'静态绘制计划');if(raw.format!==FORMAT)throw Error('静态绘制计划格式无效');return validatePlan(raw,limits);}
  function paint(ctx,value){
    if(!plans.has(value))throw Error('未验证的生成器绘制计划');
    ctx.save();try{
      ctx.beginPath();value.path.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.clip();
      const alpha=ctx.globalAlpha;
      for(const layer of value.layers){
        ctx.beginPath();if(layer.fillCarrier){value.path.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();}
        else for(const c of layer.commands){if(c[0]==='M')ctx.moveTo(c[1],c[2]);else if(c[0]==='L')ctx.lineTo(c[1],c[2]);else if(c[0]==='A')ctx.arc(c[1],c[2],c[3],c[4],c[5]);else ctx.closePath();}
        ctx.fillStyle=layer.color;ctx.globalAlpha=alpha*layer.alpha;ctx.fill();
      }
    }finally{ctx.restore();}
  }
  api.modules.patternGenerators=Object.freeze({FORMAT,limits,validate,register,definition,manifests:()=>Array.from(records.values(),r=>r.manifest),normalize,generate,generateDefinition,carrierFor,implementationFingerprint:raw=>resolveDefinition(raw).record.fingerprint,validateDefinition:raw=>resolveDefinition(raw).manifest,restorePlan,paint});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:59k-pattern-generators.js> */

/* <vnext:59l-dual-ray-pattern.js> */
/* The reviewed dual-ray algorithm, expressed as bounded Canvas paint commands. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,generators=api.modules.patternGenerators;
  const parameters=[
    {key:'carrier',label:'载体',type:'select',default:'rect',timing:'No',options:['rect','ellipse','regular','free'],labels:['矩形','椭圆','正多边形','自由多边形']},
    {key:'pairs',label:'色块对数',type:'number',default:12,min:2,max:128,step:1,integer:true,timing:'Step'},
    {key:'colorA',label:'颜色一',type:'color',default:'#e6dec8',timing:'Linear'},
    {key:'alphaA',label:'颜色一透明度',type:'number',default:1,min:0,max:1,step:.01,timing:'Linear'},
    {key:'colorB',label:'颜色二',type:'color',default:'#9c9888',timing:'Linear'},
    {key:'alphaB',label:'颜色二透明度',type:'number',default:1,min:0,max:1,step:.01,timing:'Linear'},
    {key:'centerX',label:'中心 X',type:'number',default:.62,min:-.5,max:1.5,step:.01,timing:'Linear'},
    {key:'centerY',label:'中心 Y',type:'number',default:.58,min:-.5,max:1.5,step:.01,timing:'Linear'},
    {key:'angle',label:'起始角度',type:'number',default:0,min:-720,max:720,step:.1,timing:'Linear',interpolation:'angle-direct'},
    {key:'ratio',label:'色块占比',type:'number',default:.5,min:.05,max:.95,step:.01,timing:'Linear'},
    {key:'motion',label:'动态 · 旋转',type:'boolean',default:true,timing:'Step'},
    {key:'period',label:'周期时间',type:'number',default:12,min:.25,max:120,step:.25,timing:'Step',when:'motion'},
    {key:'direction',label:'方向',type:'select',default:'clockwise',timing:'Step',options:['clockwise','counterclockwise'],labels:['顺时针','逆时针'],when:'motion'},
    {key:'curve',label:'运动节奏',type:'select',default:'linear',timing:'Step',options:['linear','smooth','ease-in','ease-out'],labels:['均匀','柔和','加速','减速'],when:'motion'},
    {key:'stepped',label:'逐帧',type:'boolean',default:false,timing:'Step',when:'motion'},
    {key:'periodFrames',label:'周期帧数',type:'number',default:8,min:1,max:10000,step:1,integer:true,timing:'Step',when:'stepped'}
  ];
  const controlsFor=list=>list.filter(p=>!['alphaA','alphaB'].includes(p.key)).map(p=>p.type==='color'?{component:'color-alpha',key:p.key,alphaKey:p.key==='colorA'?'alphaA':'alphaB'}:{component:'field',key:p.key});
  function generate(input){
    const p=input.params,box=input.bounds,cx=box.x+box.w*p.centerX,cy=box.y+box.h*p.centerY,
      r=Math.max(...[[box.x,box.y],[box.x+box.w,box.y],[box.x,box.y+box.h],[box.x+box.w,box.y+box.h]].map(([x,y])=>Math.hypot(x-cx,y-cy)))+2,
      cycle=Math.PI*2/p.pairs,phase=p.angle*Math.PI/180+(p.motion?api.modules.motion.progress(p,input.time)*Math.PI*2*(p.direction==='clockwise'?1:-1):0),layers=[],opaque=p.alphaA===1&&p.alphaB===1;
    // Preserve the approved opaque B base: it avoids gaps between adjacent wedges.
    if(opaque)layers.push({color:p.colorB,alpha:1,fillCarrier:true});
    const wedge=(from,to,color,alpha)=>layers.push({color,alpha,commands:[['M',cx,cy],['A',cx,cy,r,from,to],['Z']]});
    for(let i=0;i<p.pairs;i++){const a=phase+i*cycle,b=a+cycle*p.ratio;wedge(a,b,p.colorA,p.alphaA);if(!opaque)wedge(b,a+cycle,p.colorB,p.alphaB);}
    return{layers};
  }
  const legacyParameters=parameters.filter(p=>!['curve','stepped','periodFrames'].includes(p.key));
  const declare=(version,list)=>({format:generators.FORMAT,id:'proposal.dual-ray',version,name:'双色放射',implementation:'dual-ray-v'+version,carriers:['rect','ellipse','poly'],parameters:list,controls:controlsFor(list),output:'carrier-clipped-paint',dependencies:[],budget:{layers:256,commands:1024}});
  const legacyDefinition=generators.register(declare(1,legacyParameters),generate,{trust:'repository-reviewed',carrier});
  const definition=generators.register(declare(2,parameters),generate,{trust:'repository-reviewed',carrier});
  function carrier(params,box,part){
    const type=params.carrier==='regular'||params.carrier==='free'?'poly':params.carrier;
    const output={...part,...box,type,radius:Math.max(0,+part?.generatorRadius||0)};
    if(params.carrier==='regular'){output.polygonMode='regular';output.sides=part?.sides||5;}
    if(params.carrier==='free'){output.polygonMode='free';output.points=part?.points||[[0,.12],[.7,0],[1,.55],[.72,1],[.08,.85]];}
    return output;
  }
  api.modules.dualRayPattern=Object.freeze({definition,legacyDefinition,carrier});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:59l-dual-ray-pattern.js> */

/* <vnext:59m-path-generators.js> */
/* Paint generators are attachments to authored paths, never replacement part types. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext;
  function definitions(){const latest=new Map();for(const d of api.modules.patternGenerators?.manifests()||[])if(!latest.has(d.id)||latest.get(d.id).version<d.version)latest.set(d.id,d);return Array.from(latest.values());}
  function definition(id){return definitions().find(d=>d.id===id)||null;}
  function supports(id,part){return !!definition(id)?.carriers.includes(part.type);}
  function normalize(id,raw,part){
    const base=definition(id);if(!base||!supports(id,part))return null;
    const declared=api.modules.patternProviders.validate(raw?.definition||base).definition;
    if(declared.id!==id)throw Error('附着图样身份不匹配');
    const recipe=api.modules.patternProviders.normalizeRecipe({id,version:declared.version,definition:declared,params:raw?.params||{}});
    return{enabled:raw?.enabled===true,definition:recipe.definition,params:recipe.params};
  }
  function active(part){return (part.extensions?.attached||[]).some(id=>supports(id,part)&&part.extensions[id]?.enabled);}
  function paint(ctx,part,id,geometry,context){
    const config=normalize(id,part.extensions?.[id],part);if(!config?.enabled||!geometry.closed)return;
    const plan=api.modules.patternGenerators.generateDefinition(config.definition,{carrierType:part.type,path:geometry.stroke,bounds:geometry.box,params:config.params,time:context?.frame?.time||0,seed:1});
    if(ctx.globalAlpha<1&&context?.surfaces){const pool=context.surfaces,b=geometry.box,surface=pool.acquire(b.w,b.h),local=surface.getContext('2d');try{local.clearRect(0,0,surface.width,surface.height);local.save();try{local.translate(-b.x,-b.y);api.modules.patternGenerators.paint(local,plan);}finally{local.restore();}ctx.drawImage(surface,b.x,b.y);}finally{pool.release(surface);}}
    else api.modules.patternGenerators.paint(ctx,plan);
  }
  function prefix(id){return 'extensionsById.'+encodeURIComponent(id).replace(/\./g,'%2E')+'.params.';}
  api.modules.pathGenerators=Object.freeze({definitions,definition,supports,normalize,active,paint,prefix});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:59m-path-generators.js> */

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
    const fps = Math.max(.1, +(source && source.fps) || +raw.fps || 8), count = frames.length, explicit=source&&Number.isFinite(+source._assetFrame), index = explicit ? Math.max(0,Math.min(count-1,Math.round(+source._assetFrame))) : (source && source.frameLoop === false || raw.frameLoop === false ? Math.min(count - 1, Math.floor(Math.max(0, time) * fps)) : Math.floor(Math.max(0, time) * fps) % count);
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
  function shiftStroke(part,dx,dy){
    part.points=(part.points||[]).map(point=>[(+point[0]||0)+dx,(+point[1]||0)+dy]);
    for(const key of['_pathBox','_strokeVisualBounds'])if(part[key])part[key]=Object.assign({},part[key],{x:part[key].x+dx,y:part[key].y+dy});
  }
  function partMotion(part, time) {
    const out=Object.assign({},part),anim=part.anim||{},frame=api.modules.frame,curve=spec=>api.modules.motion.oscillate(spec,time);
    if(part.type==='stroke'&&!part.strokeWave?.enabled&&!part.pathEndpoints?.enabled&&!api.modules.pathExtensions.active(part)){
      const revealed=api.modules.pathStroke.reveal(part);
      out._pathBox=partBox(part);out._strokeVisualBounds=api.modules.pathStroke.bounds(part);
      out.points=revealed.points;out._strokeDashAdvance=revealed.startDistance;out._strokeRevealApplied=true;out.smoothing=0;
    }
    if(anim.bob&&Number.isFinite(+anim.bob.amount)){const offset=curve(anim.bob)*+anim.bob.amount,angle=(Number.isFinite(+anim.bob.angle)?+anim.bob.angle:90)*Math.PI/180,dx=Math.cos(angle)*offset,dy=Math.sin(angle)*offset;out.x=(+out.x||0)+dx;out.y=(+out.y||0)+dy;if(out.type==='line'){out.x2=(+out.x2||0)+dx;out.y2=(+out.y2||0)+dy;}else if(out.type==='stroke')shiftStroke(out,dx,dy);}
    if(anim.scroll&&Number.isFinite(+anim.scroll.speed)){const angle=(+anim.scroll.angle||0)*Math.PI/180,span=Math.max(0,+anim.scroll.span||0),repeating=anim.scroll.repeat!==false&&span>0,period=span/Math.abs(+anim.scroll.speed),raw=repeating&&Number.isFinite(period)?frame.travel(anim.scroll,time,period)*span*Math.sign(+anim.scroll.speed):time*+anim.scroll.speed,distance=repeating?((raw%span)+span)%span:raw,dx=Math.cos(angle)*distance,dy=Math.sin(angle)*distance;out.x=(+out.x||0)+dx;out.y=(+out.y||0)+dy;if(out.type==='line'){out.x2=(+out.x2||0)+dx;out.y2=(+out.y2||0)+dy;}else if(out.type==='stroke')shiftStroke(out,dx,dy);}
    if(anim.spin&&Number.isFinite(+anim.spin.speed)){const period=360/Math.abs(+anim.spin.speed);out.rot=(+out.rot||0)+(Number.isFinite(period)?frame.travel(anim.spin,time,period)*360*Math.sign(+anim.spin.speed):0);}
    if(anim.blink)out.alpha=(out.alpha==null?1:+out.alpha)*api.modules.frame.blinkAlpha(anim.blink,time);
    if(anim.pulse&&Number.isFinite(+anim.pulse.amount)){const scale=1+curve(anim.pulse)*+anim.pulse.amount;out.scaleX=(Number.isFinite(+out.scaleX)?+out.scaleX:1)*scale;out.scaleY=(Number.isFinite(+out.scaleY)?+out.scaleY:1)*scale;}
    if(anim.wave&&Number.isFinite(+anim.wave.amount))out.rot=(+out.rot||0)+curve(anim.wave)*+anim.wave.amount;
    return out;
  }
  function partBox(part){if(part._pathBox)return part._pathBox;if(part.type==='line'){const x=Math.min(+part.x||0,+part.x2||0),y=Math.min(+part.y||0,+part.y2||0);return{x,y,w:Math.max(1,Math.abs((+part.x2||0)-(+part.x||0))),h:Math.max(1,Math.abs((+part.y2||0)-(+part.y||0)))};}if(part.type==='stroke')return api.modules.pathStroke.pointBox(part.points);return{x:+part.x||0,y:+part.y||0,w:Math.max(1,+part.w||1),h:Math.max(1,+part.h||1)};}
  /* Parts deliberately remain in the owner's local pixel space. An image keeps
     its source layout w/h; this union describes every visible pixel that must
     survive selection and offscreen effect rendering. */
  function partVisualBounds(raw,time,context){const part=partMotion(raw,time||0),box=partBox(part),visual=part._strokeVisualBounds||api.modules.pathStroke.bounds(part,context),cx=box.x+box.w/2,cy=box.y+box.h/2,sx=Number.isFinite(+part.scaleX)?+part.scaleX:1,sy=Number.isFinite(+part.scaleY)?+part.scaleY:1,angle=(+part.rot||0)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),points=[[visual.x,visual.y],[visual.x+visual.w,visual.y],[visual.x+visual.w,visual.y+visual.h],[visual.x,visual.y+visual.h]].map(([x,y])=>{const dx=(x-cx)*sx,dy=(y-cy)*sy;return{x:cx+cos*dx-sin*dy,y:cy+sin*dx+cos*dy};}),xs=points.map(point=>point.x),ys=points.map(point=>point.y);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(1,Math.max(...xs)-Math.min(...xs)),h:Math.max(1,Math.max(...ys)-Math.min(...ys))};}
  function localBounds(entity,values,frame){
    const w=Math.max(1,+values.w||1),h=Math.max(1,+values.h||1),boxes=[{x:0,y:0,w,h}],
      parts=values&&Array.isArray(values.parts)?values.parts:entity&&entity.parts||[],time=frame&&frame.time||0;
    const context={scene:frame?.scene,frame,ownerId:entity.id};
    if(['rect','ellipse','poly','line'].includes(entity.type))boxes.push(api.modules.pathStroke.bounds(Object.assign({},values,{type:entity.type,x:0,y:0,x2:w,y2:h}),context));
    if(entity.type==='text'){const cursor=api.modules.textReveal.cursorBounds(values);if(cursor)boxes.push(cursor);}
    for(const part of parts)if(part&&!part.hidden)boxes.push(partVisualBounds(part,time,context));
    const minX=Math.min(...boxes.map(box=>box.x)),minY=Math.min(...boxes.map(box=>box.y)),
      maxX=Math.max(...boxes.map(box=>box.x+box.w)),maxY=Math.max(...boxes.map(box=>box.y+box.h));
    return{x:minX,y:minY,w:Math.max(1,maxX-minX),h:Math.max(1,maxY-minY)};
  }
  function paintPath(ctx, part, scene, origin, time, box) {
    if(api.modules.pathGeometry.enhanced(part))return api.modules.pathGeometry.paint(ctx,part,box,fill=>paintPath(ctx,fill,scene,origin,time,box),{scene,frame:origin?.extensionFrame,ownerId:origin?.extensionOwner,surfaces:origin?.surfaces});
    const pattern=part.fillPattern&&part.fillPattern.type&&part.fillPattern.type!=='none'?part.fillPattern:null,solid=(part.fill||part.fillPaint)&&(!pattern||pattern.mode!=='replace');
    if(solid&&part.type!=='line'&&part.type!=='stroke'){ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,part.fillAlpha==null?1:+part.fillAlpha));ctx.fillStyle=api.modules.paint.style(ctx,part.fillPaint,box||partBox(part),pattern&&pattern.mode==='overlay'?(pattern.baseColor||part.fill):part.fill);ctx.fill();ctx.restore();}
    if(pattern&&part.type!=='line'&&part.type!=='stroke'){const texture=patternTexture(scene,part,time);if(texture){ctx.save();ctx.clip();if(ctx.setTransform)ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha*=Math.max(0,Math.min(1,pattern.opacity==null?1:+pattern.opacity));ctx.drawImage(texture,-(origin&&origin.x||0),-(origin&&origin.y||0));ctx.restore();}}
    if(part.stroke&&Math.max(0,+part.strokeWidth||0)>0){ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,part.strokeAlpha==null?1:+part.strokeAlpha));ctx.strokeStyle=part.stroke;api.modules.pathStroke.configure(ctx,part);ctx.stroke();ctx.restore();}
  }
  function drawPart(ctx, raw, ownerW, ownerH, time, scene, origin) {
    if(!raw||raw.hidden)return;const part=partMotion(raw,time||0),box=partBox(part),cx=box.x+box.w/2,cy=box.y+box.h/2;
    if(part.type==='stroke'&&(!Array.isArray(part.points)||part.points.length<2))return;
    ctx.save();ctx.translate(-ownerW/2,-ownerH/2);ctx.globalAlpha*=Math.max(0,Math.min(1,part.alpha==null?1:+part.alpha));ctx.globalCompositeOperation=api.modules.blend.toCanvas(part.blend);ctx.translate(cx,cy);ctx.rotate((+part.rot||0)*Math.PI/180);ctx.scale(Number.isFinite(+part.scaleX)?+part.scaleX:1,Number.isFinite(+part.scaleY)?+part.scaleY:1);ctx.translate(-cx,-cy);ctx.beginPath();
    if(part.type==='custom'){
      try{
        const result=api.modules.customShapes.custom(part,time),pool=origin?.surfaces;
        if(result.paintPlan&&pool&&ctx.globalAlpha!==1&&ctx.globalAlpha>0){
          const surface=pool.acquire(box.w,box.h),local=surface.getContext('2d');
          try{local.clearRect(0,0,surface.width,surface.height);local.save();try{local.translate(-box.x,-box.y);api.modules.customShapes.paint(local,result);}finally{local.restore();}ctx.drawImage(surface,box.x,box.y);}
          finally{pool.release(surface);}
        }else if(ctx.globalAlpha>0)api.modules.customShapes.paint(ctx,result);
      }finally{ctx.restore();}return;
    }
    if(part.type==='ellipse')ctx.ellipse(box.x+box.w/2,box.y+box.h/2,box.w/2,box.h/2,0,0,Math.PI*2);
    else if(part.type==='line'){ctx.moveTo(+part.x||0,+part.y||0);ctx.lineTo(+part.x2||0,+part.y2||0);}
    else if(part.type==='stroke'&&Array.isArray(part.points)&&part.points.length>=2){part.points.forEach((point,index)=>{const x=+point[0]||0,y=+point[1]||0;if(index)ctx.lineTo(x,y);else ctx.moveTo(x,y);});}
    else if(part.type==='poly'&&Array.isArray(part.points)&&part.points.length>=3){part.points.forEach((point,index)=>{const x=box.x+(+point[0]||0)*box.w,y=box.y+(+point[1]||0)*box.h;if(index)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();}
    else {roundedRect(ctx,box.x,box.y,box.w,box.h,part.radius);ctx.closePath();}
    paintPath(ctx,part,scene,origin,time,box);ctx.restore();
  }
  function drawParts(ctx, entity, values, frame, scene, origin){for(const part of values&&Array.isArray(values.parts)?values.parts:entity.parts||[])drawPart(ctx,part,values.w,values.h,frame&&frame.time||0,scene,origin);}
  function draw(ctx, scene, entity, values, frame, origin) {
    if (entity.type === 'group') return;
    origin=Object.assign({},origin,{extensionFrame:frame,extensionOwner:entity.id});
    const w = values.w, h = values.h;
    ctx.save();
    if (values.parentMatrix && ctx.transform) ctx.transform(...values.parentMatrix);
    /* An effected object is built at full Alpha in a transparent capsule.
       Both its opacity and blend belong to the final scene composite, after
       mask/decorate/sample work; otherwise an outer decoration leaks through
       the object's own semi-transparent source. */
    const deferComposite=origin&&origin.deferComposite;
    ctx.globalAlpha *= deferComposite?1:(values.parentAlpha == null ? 1 : values.parentAlpha) * values.alpha;
    ctx.globalCompositeOperation = deferComposite ? 'source-over' : api.modules.blend.toCanvas(values.blend || entity.blend);
    const pivot=api.modules.frame.pivotFor(values);
    ctx.translate(values.x + pivot.x, values.y + pivot.y);
    ctx.rotate(values.rot * Math.PI / 180);
    ctx.scale(values.scaleX, values.scaleY);
    const skewX=Math.tan(Math.max(-80,Math.min(80,+values.skewX||0))*Math.PI/180),skewY=Math.tan(Math.max(-80,Math.min(80,+values.skewY||0))*Math.PI/180);
    if(skewX||skewY)ctx.transform(1+skewX*skewY,skewY,skewX,1,0,0);
    ctx.translate(w / 2 - pivot.x, h / 2 - pivot.y);
    ctx.fillStyle = values.fill || '#ffffff';
    ctx.strokeStyle = values.stroke || '#000000';
    ctx.lineWidth = Math.max(0, +values.strokeWidth || 0);
    if (entity.type === 'builtin') { api.modules.builtins.render(ctx, entity, values, frame); drawParts(ctx, entity, values, frame, scene, origin); }
    else if (entity.type === 'procedural') { api.modules.sceneModules.render(ctx, entity, values, frame, scene); drawParts(ctx, entity, values, frame, scene, origin); }
    else if (entity.type === 'vector') { drawParts(ctx, entity, values, frame, scene, origin); }
    else if (entity.type === 'ellipse') { ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); paintPath(ctx,Object.assign({},values,{type:'ellipse'}),scene,origin,frame&&frame.time||0,{x:-w/2,y:-h/2,w,h}); }
    else if (entity.type === 'poly') { ctx.beginPath(); (values.points||[]).forEach((point, index) => { const x = (+point[0] - .5) * w, y = (+point[1] - .5) * h; if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); paintPath(ctx,Object.assign({},values,{type:'poly'}),scene,origin,frame&&frame.time||0,{x:-w/2,y:-h/2,w,h}); }
    else if (entity.type === 'line') { ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); paintPath(ctx,Object.assign({},values,{type:'line',x:-w/2,y:-h/2,x2:w/2,y2:h/2}),scene,origin,frame&&frame.time||0,{x:-w/2,y:-h/2,w,h}); }
    else if (entity.type === 'text') {
      api.modules.textReveal.draw(ctx,scene,values,frame,{x:-w/2,y:-h/2,w,h},asset);
      drawParts(ctx, entity, values, frame, scene, origin);
    }
    else if(entity.type==='rect'&&api.modules.pathGeometry.enhanced(values)){ctx.beginPath();paintPath(ctx,Object.assign({},values,{type:'rect'}),scene,origin,frame&&frame.time||0,{x:-w/2,y:-h/2,w,h});drawParts(ctx,entity,values,frame,scene,origin);}
    else if (entity.type === 'image') {
      const image = assetFrame(scene, entity.assetId, frame && frame.time || 0, entity);
      if (!image) throw new Error(`图片实体「${entity.id}」缺少已解析素材：${entity.assetId || '(空)'}`);
      if (ctx.drawImage) ctx.drawImage(image, -w / 2, -h / 2, w, h);
      drawParts(ctx, entity, values, frame, scene, origin);
    }
    else if (entity.type === 'rect') { if(!values.fillPattern&&!+values.radius){if(values.fill||values.fillPaint){ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,values.fillAlpha==null?1:+values.fillAlpha));ctx.fillStyle=api.modules.paint.style(ctx,values.fillPaint,{x:-w/2,y:-h/2,w,h},values.fill);ctx.fillRect(-w/2,-h/2,w,h);ctx.restore();}if(values.stroke&&Math.max(0,+values.strokeWidth||0)>0){ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,values.strokeAlpha==null?1:+values.strokeAlpha));ctx.strokeStyle=values.stroke;api.modules.pathStroke.configure(ctx,values);ctx.strokeRect(-w/2,-h/2,w,h);ctx.restore();}}else{ctx.beginPath();roundedRect(ctx,-w/2,-h/2,w,h,values.radius);ctx.closePath();paintPath(ctx,Object.assign({},values,{type:'rect'}),scene,origin,frame&&frame.time||0,{x:-w/2,y:-h/2,w,h});}drawParts(ctx, entity, values, frame, scene, origin); }
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
  api.modules.content = Object.freeze({ draw, drawPart, drawParts, drawGroup, asset, assetFrame, drawBackground, partMotion, partBox, partVisualBounds, localBounds });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:60-content-renderer.js> */

/* <vnext:65-decorate-effects.js> */
/* ToSampool Runtime vNext source module: first object decorate primitives. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const active = (group, id) => group && group[id] && group[id].enabled ? group[id] : null;
  const alpha = value => Math.max(0, Math.min(1, Number.isFinite(+value) ? +value : 1));
  const blend = value => api.modules.blend.toCanvas(value);
  function animated(id,config,time){
    const motion=config&&config.motion;if(!motion||!motion.enabled)return config;const next=Object.assign({},config);
    if(id==='tint-overlay'&&(motion.type==='fade'||motion.type==='blink')){const amount=alpha(motion.amount),spec=motion.type==='blink'?{...motion,curve:'step'}:motion,wave=(api.modules.motion.oscillate(spec,time,{stepped:motion.type==='blink',frames:2})+1)/2;next.alpha=alpha((+config.alpha||0)*(1-amount*wave));}
    if(id==='texture-overlay'&&['pattern-drift','pattern-step','pattern-random','pattern-pulse','texture-drift','random-hold','noise-snow'].includes(motion.type))next._patternTime=time;
    if(id==='grain-overlay'&&motion.type==='grain-refresh')next._grainTime=time;
    return next;
  }
  function tintedSurface(source, surfaces, color, opacity, dx, dy) {
    const target = surfaces.acquire(source.width, source.height), ctx = target.getContext('2d');
    // Outline/sample outputs leave nearest-neighbour state on pooled surfaces.
    // Projection offsets can be fractional: restore the first-draw filtering
    // contract before copying alpha, independently of the previous pool user.
    ctx.imageSmoothingEnabled = true;
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
    ctx.globalCompositeOperation = blend(config.blend);
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
    const texture = textureAlpha(source, config, surfaces);
    if (config.blend === 'hard-mix') {
      const output = api.modules.hardMix.composite(source, texture, surfaces);
      surfaces.release(texture);
      return output;
    }
    const output = surfaces.acquire(source.width, source.height), ctx = output.getContext('2d');
    ctx.clearRect(0, 0, output.width, output.height); ctx.drawImage(source, 0, 0); ctx.globalCompositeOperation = blend(config.blend); ctx.drawImage(texture, 0, 0); ctx.globalCompositeOperation = 'source-over'; surfaces.release(texture); return output;
  }
  function grainOverlay(source, config, surfaces) {
    const amount = alpha(config.amount == null ? .15 : config.amount);
    if (amount <= 0) return source;
    const builds = api.modules.grain.stats().builds;
    const stamp = api.modules.grain.frame(source.width, source.height, config, config._grainTime == null ? 0 : config._grainTime);
    if (!stamp) return source;
    if (surfaces.notePixels && api.modules.grain.stats().builds !== builds) surfaces.notePixels(stamp.width, stamp.height, 1);
    const layer = surfaces.acquire(source.width, source.height), layerCtx = layer.getContext('2d');
    layerCtx.clearRect(0, 0, layer.width, layer.height);
    layerCtx.imageSmoothingEnabled = false;
    layerCtx.globalAlpha = amount;
    layerCtx.drawImage(stamp, 0, 0, layer.width, layer.height);
    layerCtx.globalAlpha = 1;
    layerCtx.globalCompositeOperation = 'destination-in';
    layerCtx.drawImage(source, 0, 0);
    layerCtx.globalCompositeOperation = 'source-over';
    const output = surfaces.acquire(source.width, source.height), ctx = output.getContext('2d');
    ctx.clearRect(0, 0, output.width, output.height);
    ctx.drawImage(source, 0, 0);
    ctx.globalCompositeOperation = blend(config.blend);
    ctx.drawImage(layer, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    surfaces.release(layer);
    return output;
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
  function composite(back, front, surfaces) {
    const output=surfaces.acquire(back.width,back.height),ctx=output.getContext('2d');
    ctx.clearRect(0,0,output.width,output.height);ctx.drawImage(back,0,0);ctx.drawImage(front,0,0);return output;
  }
  function apply(source, group, surfaces, frame, samplingSize) {
    let current = source;
    const handlers = { projection, outline, 'tint-overlay': tintOverlay, 'texture-overlay': textureOverlay, 'inner-light': innerLight, 'outer-light': outerLight, 'grain-overlay': grainOverlay };
    for (const id of ['projection', 'outline', 'tint-overlay', 'texture-overlay', 'inner-light', 'outer-light', 'grain-overlay']) {
      const config = active(group, id); if (!config) continue;
      const handler = handlers[id]; if (!handler) throw new Error(`Runtime vNext 尚未实现加样效果：${id}`);
      const resolved=animated(id,config,frame&&frame.time||0);
      if(id==='texture-overlay')resolved._samplingSize=Math.max(1,Math.round(+samplingSize||1));
      // By default the edge is derived from the object's own alpha, so a hard
      // projection remains behind it.  The explicit flag preserves the older
      // combined-alpha look for artwork that intentionally outlines its shadow.
      const outlinedSeparately=id==='outline'&&resolved.includeProjection!==true&&current!==source;
      const outlineLayer=outlinedSeparately?handler(source,resolved,surfaces):null;
      const next=outlinedSeparately?composite(current,outlineLayer,surfaces):handler(current,resolved,surfaces);
      if(outlineLayer)surfaces.release(outlineLayer);
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
  api.modules.decorate = Object.freeze({ apply, padding, animated });
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
  // Persist extracted palettes in the effect. RGB5 cells are only a fast-path:
  // ambiguous cells resolve the original RGB exactly instead of merging it.
  const colorMapCache = new Map(), COLOR_MAP_CACHE_LIMIT = 12, AUTO_PALETTE_SOURCE_LIMIT = 65536;
  const autoColorCount=value=>2**clamp(Math.round(Math.log2(Math.max(2,+value||16))),1,6);
  const rgb5 = (r, g, b) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
  const rgb5Color = code => [((code >> 10) & 31) * 8 + 4, ((code >> 5) & 31) * 8 + 4, (code & 31) * 8 + 4];
  function sourceFingerprint(data) {
    const pixels = data.length >>> 2, stride = Math.max(1, Math.floor(pixels / 4096)); let hash = 2166136261;
    for (let pixel = 0; pixel < pixels; pixel += stride) { const i = pixel * 4; hash = Math.imul(hash ^ data[i], 16777619); hash = Math.imul(hash ^ data[i + 1], 16777619); hash = Math.imul(hash ^ data[i + 2], 16777619); hash = Math.imul(hash ^ data[i + 3], 16777619); }
    return (hash >>> 0).toString(36);
  }
  function putColorMapCache(key, value) { colorMapCache.delete(key); colorMapCache.set(key, value); if (colorMapCache.size > COLOR_MAP_CACHE_LIMIT) colorMapCache.delete(colorMapCache.keys().next().value); return value; }
  function boxStats(items) { let minR=255,minG=255,minB=255,maxR=0,maxG=0,maxB=0,weight=0; for (const entry of items) { const {r,g,b}=entry; if(r<minR)minR=r;if(r>maxR)maxR=r;if(g<minG)minG=g;if(g>maxG)maxG=g;if(b<minB)minB=b;if(b>maxB)maxB=b;weight+=entry.count; } return { items, minR, minG, minB, maxR, maxG, maxB, weight }; }
  function autoPalette(data, count) {
    // Bound sample count, not the first colours encountered. Cover the whole
    // image uniformly; exact RGB and frequency are retained within the sample.
    const histogram = new Map();
    const pixels=data.length>>>2,samples=Math.min(pixels,AUTO_PALETTE_SOURCE_LIMIT);
    for (let sample=0;sample<samples;sample++) {
      const i=Math.floor((sample+.5)*pixels/samples)*4;
      if (data[i+3] < 128) continue;
      const code=(data[i]<<16)|(data[i+1]<<8)|data[i+2], known=histogram.get(code);
      if (known) known.count += 1;
      else histogram.set(code,{r:data[i],g:data[i+1],b:data[i+2],count:1});
    }
    const entries=Array.from(histogram.values()).sort((a,b)=>a.r-b.r||a.g-b.g||a.b-b.b);
    if (!entries.length) return [[0,0,0]];
    const boxes=[boxStats(entries)];
    while(boxes.length<count){
      let pick=-1,score=-1;
      for(let index=0;index<boxes.length;index++){const box=boxes[index],range=Math.max(box.maxR-box.minR,box.maxG-box.minG,box.maxB-box.minB),next=range*box.weight;if(box.items.length>1&&next>score){score=next;pick=index;}}
      if(pick<0)break;
      const box=boxes[pick],ranges=[box.maxR-box.minR,box.maxG-box.minG,box.maxB-box.minB],channel=ranges.indexOf(Math.max(...ranges)),items=box.items.slice().sort((a,b)=>(channel===0?a.r-b.r:channel===1?a.g-b.g:a.b-b.b)||a.r-b.r||a.g-b.g||a.b-b.b),half=box.weight/2;
      let cumulative=0,split=1; for(;split<items.length;split++){cumulative+=items[split-1].count;if(cumulative>=half)break;}
      split=Math.min(items.length-1,split); // A dominant last colour must not create an empty box.
      boxes.splice(pick,1,boxStats(items.slice(0,split)),boxStats(items.slice(split)));
    }
    return boxes.map(box=>{let r=0,g=0,b=0,total=0;for(const entry of box.items){r+=entry.r*entry.count;g+=entry.g*entry.count;b+=entry.b*entry.count;total+=entry.count;}return [Math.round(r/total),Math.round(g/total),Math.round(b/total)];});
  }
  function paletteLut(palette){return {palette,lut:new Uint8Array(32768),status:new Uint8Array(32768),exact:new Map()};}
  function paletteIndex(mapped,r,g,b){
    const {palette,lut,status,exact}=mapped,code=rgb5(r,g,b);
    if(!status[code]){
      const [cr,cg,cb]=rgb5Color(code);let best=0,distance=Infinity;
      for(let i=0;i<palette.length;i++){const p=palette[i],d=(cr-p[0])**2+(cg-p[1])**2+(cb-p[2])**2;if(d<distance){distance=d;best=i;}}
      const winner=palette[best];let safe=true;
      for(let i=0;i<palette.length;i++){if(i===best)continue;const p=palette[i],margin=(cr-p[0])**2+(cg-p[1])**2+(cb-p[2])**2-distance,variation=8*(Math.abs(p[0]-winner[0])+Math.abs(p[1]-winner[1])+Math.abs(p[2]-winner[2]));if(margin<=variation){safe=false;break;}}
      lut[code]=best;status[code]=safe?1:2;
    }
    if(status[code]===1)return lut[code];
    const rgb=(r<<16)|(g<<8)|b,known=exact.get(rgb);if(known!==undefined)return known;
    let best=0,distance=Infinity;for(let i=0;i<palette.length;i++){const p=palette[i],d=(r-p[0])**2+(g-p[1])**2+(b-p[2])**2;if(d<distance){distance=d;best=i;}}
    if(exact.size<4096)exact.set(rgb,best);return best;
  }
  function extractedPalette(config){
    const value=config.extracted,limit=autoColorCount(config.colors);
    if(!value||value.colors!==limit||!Array.isArray(value.entries)||!value.entries.length||value.entries.length>limit)return null;
    if(value.entries.some(p=>!Array.isArray(p)||p.length!==3||p.some(v=>!Number.isInteger(v)||v<0||v>255)))return null;
    return value.entries;
  }
  function mappedPalette(data, config) {
    const selected = config.palette === 'none' ? 'auto' : config.palette || 'auto', colors=autoColorCount(config.colors), named=Array.isArray(selected)?selected:PALETTES[selected];
    if (selected !== 'auto' && !named) throw new Error(`未知调色板：${selected}`);
    const fixed=selected==='auto'&&extractedPalette(config);
    const key = named ? `named:${Array.isArray(selected) ? JSON.stringify(selected) : selected}` : fixed?`fixed:${JSON.stringify(fixed)}`:`auto:${colors}:${sourceFingerprint(data)}`;
    const cached=colorMapCache.get(key); if(cached){colorMapCache.delete(key);colorMapCache.set(key,cached);return cached;}
    const palette=(named||fixed)?(named||fixed).map(entry=>entry.slice()):autoPalette(data,colors);
    return putColorMapCache(key,paletteLut(palette));
  }
  // Sampling grid is a real, visible nearest-neighbour resample pass.  It is
  // deliberately not merely a coordinate controller: this is the v4 form of
  // Legacy's pixelDiv contract and the common low-resolution work surface for
  // boil / halftone / uneven sampling.
  const gridSize = group => Math.max(1, Math.round(+((group && group.controllers && group.controllers['sampling-grid'] || {}).size || 1)));
  const gridAlphaMode = group => ((group && group.controllers && group.controllers['sampling-grid'] || {}).alphaMode || 'keep');
  const hasBaseGrid = group => gridSize(group) > 1 || gridAlphaMode(group) !== 'keep';
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
  function remapEdgeAlpha(data, mode) {
    if (mode !== 'remove' && mode !== 'boost') return data;
    for (let i = 3; i < data.length; i += 4) {
      const value = data[i];
      data[i] = mode === 'remove' ? (value >= 128 ? 255 : 0) : (value > 0 ? 255 : 0);
    }
    return data;
  }
  function edgeAlpha(source, group, surfaces) {
    const mode = gridAlphaMode(group);
    if (mode === 'keep') return source;
    return withPixels(source, surfaces, (from, to) => { to.set(from); remapEdgeAlpha(to, mode); });
  }
  function colorMap(source, config, surfaces, time, frame) {
    if(config.mode==='gradient'){
      const paint=api.modules.paint.normalize(config.gradient)||{type:'linear',stops:[{offset:0,color:'#000000',alpha:1},{offset:1,color:'#ffffff',alpha:1}]},key='ramp:'+JSON.stringify(paint.stops),lut=colorMapCache.get(key)||putColorMapCache(key,api.modules.paint.ramp(paint));
      return withPixels(source,surfaces,(from,to)=>{
        for(let i=0;i<from.length;i+=4){
          const at=Math.round(from[i]*.2126+from[i+1]*.7152+from[i+2]*.0722)*4;
          to[i]=lut[at];to[i+1]=lut[at+1];to[i+2]=lut[at+2];to[i+3]=from[i+3]*lut[at+3]/255;
        }
      });
    }
    // Every discrete count is a real reduction; no special original-colour bypass.
    return withPixels(source, surfaces, (from, to) => {
      const request=frame&&frame.paletteCapture,target=frame&&frame.paletteTarget,capture=request&&target&&request.scope===target.scope&&request.ownerId===target.ownerId;
      const mapped=capture?paletteLut(autoPalette(from,autoColorCount(config.colors))):mappedPalette(from,config),palette=mapped.palette;
      if(capture)request.receive({colors:autoColorCount(config.colors),entries:palette.map(p=>p.slice())});
      for (let i = 0; i < from.length; i += 4) {
        const best=palette[paletteIndex(mapped,from[i],from[i+1],from[i+2])];
        to[i] = best[0]; to[i + 1] = best[1]; to[i + 2] = best[2];
        to[i + 3] = from[i + 3];
      }
    });
  }
  function threshold(source, config, surfaces, time) {
    const dark = color(config.dark), light = color(config.light), motion = config.motion || {},pulse = motion.enabled ? (+motion.amount || 0) * api.modules.motion.oscillate(motion,time,{stepped:true,frames:12}) : 0;
    const pivot = clamp((config.threshold==null?.5:+config.threshold) + pulse, 0, 1) * 255;
    return withPixels(source, surfaces, (from, to) => {
      for (let i = 0; i < from.length; i += 4) { const luma = from[i] * .2126 + from[i + 1] * .7152 + from[i + 2] * .0722, pick = luma >= pivot ? light : dark; to[i] = pick[0]; to[i + 1] = pick[1]; to[i + 2] = pick[2]; to[i + 3] = from[i + 3]; }
    });
  }
  function noiseDither(source, config, surfaces, time) {
    const amount=clamp(+config.amount||0,0,100);
    if(!amount)return source;
    const size=Math.max(1,Math.min(16,Math.round(+config.size||1))),seed=Math.round(+config.seed||0),rgb=config.colorMode==='rgb',motion=config.motion||{},period=Math.max(.001,+motion.period||1),steps=Math.max(1,Math.min(120,Math.round(+motion.steps||12))),phase=((time/period)%1+1)%1,tick=motion.enabled&&motion.type==='noise-refresh'?Math.min(steps-1,Math.floor(phase*steps)):0,amplitude=amount*2.55;
    return withPixels(source,surfaces,(from,to,width,height)=>{
      const cells=Math.ceil(width/size),channels=rgb?3:1,row=new Uint8Array(cells*channels);
      let previous=-1;
      for(let y=0;y<height;y++){
        const cellY=Math.floor(y/size);
        if(cellY!==previous){
          previous=cellY;
          let state=(Math.imul(seed+1,0x9e3779b1)^Math.imul(tick+1,0x85ebca6b)^Math.imul(cellY+1,0xc2b2ae35))>>>0;
          if(!state)state=1;
          for(let i=0;i<row.length;i++){state^=state<<13;state^=state>>>17;state^=state<<5;row[i]=state&255;}
        }
        for(let x=0;x<width;x++){
          const at=(y*width+x)*4,cell=Math.floor(x/size)*channels;
          if(from[at+3]===0){to[at]=from[at];to[at+1]=from[at+1];to[at+2]=from[at+2];to[at+3]=0;continue;}
          const red=(row[cell]/127.5-1)*amplitude,green=rgb?(row[cell+1]/127.5-1)*amplitude:red,blue=rgb?(row[cell+2]/127.5-1)*amplitude:red;
          to[at]=clamp(from[at]+red,0,255);to[at+1]=clamp(from[at+1]+green,0,255);to[at+2]=clamp(from[at+2]+blue,0,255);to[at+3]=from[at+3];
        }
      }
    });
  }
  /* RGB channel separation belongs to the sampled image, not to the object
     transform.  It reads a small neighbourhood only around detected edges,
     letting transparent capsules gain a coloured fringe without turning the
     full object into three displaced copies. */
  function edgeDispersion(source, config, surfaces) {
    const distance=Math.max(0,Math.round(+config.distance||0)),strength=clamp(config.strength==null?1:+config.strength,0,1);
    if(!distance||!strength)return source;
    const radians=(+config.angle||0)*Math.PI/180,dx=Math.round(Math.cos(radians)*distance),dy=Math.round(Math.sin(radians)*distance);
    if(!dx&&!dy)return source;
    const mode=config.source||'auto',reach=Math.max(1,distance+Math.max(1,Math.round(+config.width||1))-1),order=config.order||'rgb';
    return withPixels(source,surfaces,(from,to,width,height)=>{
      const pixel=(x,y)=>x<0||y<0||x>=width||y>=height?null:(y*width+x)*4;
      const luma=index=>from[index]*.2126+from[index+1]*.7152+from[index+2]*.0722;
      const edgeAt=(x,y,index)=>{
        const alpha=from[index+3],lum=luma(index);let alphaEdge=false,contrastEdge=false;
        for(const [ox,oy] of [[-reach,0],[reach,0],[0,-reach],[0,reach]]){const next=pixel(x+ox,y+oy);const nextAlpha=next==null?0:from[next+3];if(Math.abs(alpha-nextAlpha)>8)alphaEdge=true;if(next!=null&&Math.abs(lum-luma(next))>24)contrastEdge=true;}
        return mode==='contour'?alphaEdge:mode==='contrast'?contrastEdge:alphaEdge||contrastEdge;
      };
      to.set(from);
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const at=(y*width+x)*4;if(!edgeAt(x,y,at))continue;
        const plus=pixel(x+dx,y+dy),minus=pixel(x-dx,y-dy),redAt=order==='bgr'?minus:plus,blueAt=order==='bgr'?plus:minus,baseAlpha=from[at+3],redAlpha=redAt==null?0:from[redAt+3],blueAlpha=blueAt==null?0:from[blueAt+3],red=redAlpha?from[redAt]:0,green=from[at+1],blue=blueAlpha?from[blueAt+2]:0,nextAlpha=Math.max(baseAlpha,redAlpha,blueAlpha);
        to[at]=Math.round(from[at]+(red-from[at])*strength);to[at+1]=green;to[at+2]=Math.round(from[at+2]+(blue-from[at+2])*strength);to[at+3]=Math.round(baseAlpha+(nextAlpha-baseAlpha)*strength);
      }
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
  function halftonePlan(width,height,cell,angle,rowOffset){
    const key=[width,height,cell,angle,rowOffset].join('|');if(halftonePlans.has(key))return halftonePlans.get(key);
    const cx=width/2,cy=height/2,rad=angle*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad),corners=[[0,0],[width,0],[width,height],[0,height]].map(([x,y])=>{const dx=x-cx,dy=y-cy;return[dx*cos+dy*sin,-dx*sin+dy*cos];}),xs=corners.map(point=>point[0]),ys=corners.map(point=>point[1]),minX=Math.floor(Math.min(...xs)/cell)*cell-cell,maxX=Math.ceil(Math.max(...xs)/cell)*cell+cell,minY=Math.floor(Math.min(...ys)/cell)*cell-cell,maxY=Math.ceil(Math.max(...ys)/cell)*cell+cell,points=[];
    // Keep lattice centers as floats. Rounding each rotated center created
    // alternating gaps at 45°, which nearest-neighbour enlargement exposed.
    for(let ly=minY;ly<=maxY;ly+=cell){
      const row=Math.round(ly/cell),shift=Math.abs(row%2)*rowOffset*cell;
      for(let lx=minX;lx<=maxX;lx+=cell){const localX=lx+shift,x=cx+localX*cos-ly*sin,y=cy+localX*sin+ly*cos;if(x>=-cell&&y>=-cell&&x<=width+cell&&y<=height+cell)points.push({x,y});}
    }
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
  function halftoneGradient(dark,light,luma){
    const t=Math.round(clamp(luma,0,1)*255)/255;
    return cssColour([0,1,2].map(channel=>Math.round(dark[channel]*(1-t)+light[channel]*t)));
  }
  function samplingPadding(group){const halftone=active(group,'halftone'),dispersion=active(group,'edge-dispersion'),grid=gridSize(group),halftonePad=halftone?Math.ceil(Math.max(1,Math.round(+halftone.size||4))*grid*.52)+2:0,dispersionPad=dispersion?Math.max(0,Math.round(+dispersion.distance||0))*grid+Math.max(1,Math.round(+dispersion.width||1)):0;return Math.max(halftonePad,dispersionPad);}
  function halftone(source, config, group, surfaces, time) {
    // Halftone Factory's useful division is preserved here: first make a
    // compact brightness grid, then stamp cached geometry.  We therefore do
    // not scan a full source rectangle for every mark.
    const cell=Math.max(1,Math.round(+config.size||4)),angle=+config.angle||0,output=surfaces.acquire(source.width,source.height),ctx=output.getContext('2d'),analysis=surfaces.acquire(Math.max(1,Math.ceil(source.width/cell)),Math.max(1,Math.ceil(source.height/cell))),analysisCtx=analysis.getContext('2d');let image,coverage;
    try{
      analysisCtx.clearRect(0,0,analysis.width,analysis.height);analysisCtx.imageSmoothingEnabled=true;analysisCtx.imageSmoothingQuality='high';analysisCtx.drawImage(source,0,0,analysis.width,analysis.height);image=analysisCtx.getImageData(0,0,analysis.width,analysis.height);
      // A second, nearest-neighbour alpha read decides whether the lattice
      // centre belongs to the object. Averaged alpha alone creates an extra
      // row of dots around a transparent capsule's bounding box.
      analysisCtx.clearRect(0,0,analysis.width,analysis.height);analysisCtx.imageSmoothingEnabled=false;analysisCtx.drawImage(source,0,0,analysis.width,analysis.height);coverage=analysisCtx.getImageData(0,0,analysis.width,analysis.height).data;
    }catch(error){surfaces.release(analysis);surfaces.release(output);throw new Error(`网点映射读取失败：${error.message||'Canvas 可能被跨域素材污染'}`);}
    if(surfaces.notePixels)surfaces.notePixels(analysis.width,analysis.height,2);
    const data=image.data,motion=config.motion||{},drift=motion.enabled&&motion.type==='dot-drift'?api.modules.motion.oscillate(motion,time,{period:2,stepped:true,frames:12})*clamp(+motion.amount||0,0,1):0,rowOffset=clamp(config.rowOffset==null?(config.layout==='stagger'?.5:0):+config.rowOffset,0,1),plan=halftonePlan(source.width,source.height,cell,angle,rowOffset),offsetX=clamp(+config.offsetX||0,0,1)+drift,offsetY=clamp(+config.offsetY||0,0,1),dx=(plan.cos*offsetX-plan.sin*offsetY)*cell,dy=(plan.sin*offsetX+plan.cos*offsetY)*cell,shape=config.shape||'circle',threshold=clamp(config.threshold==null?.65:+config.threshold,0,1),contrast=clamp(config.contrast==null?.75:+config.contrast,.25,2),colorMode=config.colorMode||(config.duotone?'legacy-duotone':'original'),single=cssColour(color(config.singleColor||'#111827')),dark=color(config.duotoneDark||'#111827'),light=color(config.duotoneLight||'#f2e8cf'),marks=[];
    for(const point of plan.points){
      const x=point.x+dx,y=point.y+dy;
      // The lattice includes guard cells for rotated patterns. Never extend
      // edge colours by clamping an off-canvas point to the nearest pixel.
      if(x<0||y<0||x>=source.width||y>=source.height)continue;
      const ix=Math.floor(x/cell),iy=Math.floor(y/cell),at=(iy*analysis.width+ix)*4;
      if(coverage[at+3]<128)continue;
      const luma=(data[at]*.2126+data[at+1]*.7152+data[at+2]*.0722)/255;
      const strength=clamp((.5-luma)*contrast+threshold,0,1);
      const colour=colorMode==='single'?single:colorMode==='gradient'?halftoneGradient(dark,light,luma):colorMode==='legacy-duotone'?cssColour(luma>=threshold?light:dark):halftoneColour(data[at],data[at+1],data[at+2]);
      marks.push({x,y,radius:strength*cell*.52,colour});
    }
    // Alpha participates only in point admission/size.  Complete marks are
    // intentionally not clipped back to the original contour: this matches
    // print halftone edges and is why object capsules reserve sample padding.
    ctx.clearRect(0,0,source.width,source.height);if(config.originalBackground)ctx.drawImage(source,0,0);paintHalftoneColourBatches(ctx,marks.filter(mark=>mark.radius>.15),shape,angle*Math.PI/180);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;surfaces.release(analysis);return output;
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
    const handlers = { 'color-map': colorMap, 'noise-dither': noiseDither, threshold, 'offset-sampling': offsetSampling, halftone, 'uneven-sampling': unevenSampling, 'edge-dispersion': edgeDispersion };
    // Edge dispersion is intentionally last inside sampling: it splits the
    // final sampled picture instead of being erased by a later quantise/grid.
    for (const id of ['color-map', 'noise-dither', 'threshold', 'offset-sampling', 'halftone', 'uneven-sampling', 'edge-dispersion']) {
      const config = active(group, id); if (!config) continue;
      const handler = handlers[id]; if (!handler) throw new Error(`Runtime vNext 尚未实现采样效果：${id}`);
      const next = id === 'offset-sampling' ? handler(current, config, controllers, surfaces, frame.time) : id === 'threshold' ? handler(current, config, surfaces, frame.time) : id === 'halftone' ? handler(current, config, group, surfaces, frame.time) : id === 'uneven-sampling' ? handler(current, config, controllers, surfaces, tide) : handler(current, config, surfaces, frame.time,frame);
      if (next !== current) { if (current !== source) surfaces.release(current); current = next; }
    }
    return current;
  }
  function applyBase(source,group,surfaces,frame){
    // Preview quality is an extra transient divisor; the scene's sampling
    // grid remains a persistent, visible stage in Full and Draft previews.
    const baseGrid=gridSize(group),previewDivisor=Math.max(1,Math.round(frame&&frame.preview&&frame.preview.pixelDivMultiplier||1)),divisor=Math.max(1,baseGrid*previewDivisor);
    if(divisor===1){const edged=edgeAlpha(source,group,surfaces),sampled=applyFull(edged,group,surfaces,frame);if(sampled!==edged&&edged!==source)surfaces.release(edged);return sampled;}
    const width=Math.max(1,Math.ceil(source.width/divisor)),height=Math.max(1,Math.ceil(source.height/divisor)),work=surfaces.acquire(width,height),ctx=work.getContext('2d');
    const offset=active(group,'offset-sampling'),boil=boilFrame(offset,group&&group.controllers,frame&&frame.time),breath=breathFrame(offset,group&&group.controllers,frame&&frame.time);
    let prepared=null;
    if(boil)prepared=boilWork(source,width,height,boil,surfaces);
    else if(breath)prepared=breathWork(source,width,height,breath,surfaces);
    ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
    if(prepared){ctx.drawImage(prepared,0,0);surfaces.release(prepared);}
    else ctx.drawImage(source,0,0,width,height);
    const edged=edgeAlpha(work,group,surfaces),sampled=applyFull(edged,group,surfaces,frame),output=surfaces.acquire(source.width,source.height),out=output.getContext('2d');
    out.clearRect(0,0,output.width,output.height);out.imageSmoothingEnabled=false;out.drawImage(sampled,0,0,source.width,source.height);
    if(sampled!==edged&&edged!==work)surfaces.release(edged);if(sampled!==work)surfaces.release(sampled);surfaces.release(work);return output;
  }
  function apply(source,group,surfaces,frame){
    const sampled=applyBase(source,group,surfaces,frame),ascii=active(group,'ascii-mapping');
    if(!ascii)return sampled;
    // Output mappings consume the full-sized sampled capsule. Running this in
    // applyFull would apply the grid multiplier twice and pixelate glyphs again.
    try{return api.modules.ascii.apply(sampled,ascii,surfaces,frame,gridSize(group));}
    finally{if(sampled!==source)surfaces.release(sampled);}
  }
  api.modules.sampling = Object.freeze({ apply, hash, colorMap, noiseDither, autoPalette, paletteLut, paletteIndex, extractedPalette, boilOffset, edgeDispersion, remapEdgeAlpha, palettes: PALETTES, gridSize, hasBaseGrid, padding:samplingPadding });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:68-sampling-effects.js> */

/* <vnext:68a-crt-screen.js> */
/* Scene-only CRT display sampling. The optional GPU pass has a Canvas 2D fallback. */
(function (global) {
  'use strict';
  const api = global.ToSampoolRuntimeVNext;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, +value || 0));
  const presets = Object.freeze({
    default: Object.freeze({curvature:.12,scanline:.28,scanlinePitch:3,phosphor:.22,rgbShift:1.3,glow:.18,vignette:.32,noise:.012,flicker:.018,sweep:.04,colorMode:'color',phosphorColor:'#b8ffc8'}),
    'monochrome-green': Object.freeze({curvature:.08,scanline:.18,scanlinePitch:3,phosphor:0,rgbShift:0,glow:.28,vignette:.3,noise:.01,flicker:.012,sweep:.025,colorMode:'mono',phosphorColor:'#70ff9a'}),
    'green-scanlines': Object.freeze({curvature:.1,scanline:.48,scanlinePitch:3,phosphor:0,rgbShift:0,glow:.25,vignette:.36,noise:.018,flicker:.025,sweep:.06,colorMode:'mono',phosphorColor:'#5eff8c'}),
    apple: Object.freeze({curvature:.16,scanline:.22,scanlinePitch:4,phosphor:0,rgbShift:0,glow:.26,vignette:.38,noise:.016,flicker:.018,sweep:.03,colorMode:'mono',phosphorColor:'#ffb860'}),
    vintage: Object.freeze({curvature:.2,scanline:.34,scanlinePitch:3,phosphor:.12,rgbShift:.8,glow:.22,vignette:.48,noise:.03,flicker:.03,sweep:.045,colorMode:'color',phosphorColor:'#ffe4ad'}),
    'ibm-3278': Object.freeze({curvature:.06,scanline:.13,scanlinePitch:3,phosphor:0,rgbShift:0,glow:.14,vignette:.2,noise:.006,flicker:.006,sweep:0,colorMode:'mono',phosphorColor:'#57e78b'}),
    futuristic: Object.freeze({curvature:.14,scanline:.24,scanlinePitch:2,phosphor:.32,rgbShift:2.2,glow:.4,vignette:.26,noise:.02,flicker:.022,sweep:.075,colorMode:'color',phosphorColor:'#8afff5'}),
  });
  const gpuBySurfaces = new WeakMap();
  let backend = 'auto',lastBackend = null;
  // Smallest centred uniform crop whose warped corners still sample the image.
  // For scale s=1/zoom: s + .48*curvature*s^3 = 1. No extra surface/pass.
  function fitScale(curvature,mask){
    if(mask&&mask.type&&mask.type!=='none')return 1;
    const curve=Math.max(0,+curvature||0);if(!curve)return 1;
    let lo=0,hi=1;for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(mid+.48*curve*mid**3>1)hi=mid;else lo=mid;}return lo;
  }
  function color(hex) {
    const raw=String(hex||'#ffffff').replace('#','');
    if(raw.length===3)return [0,1,2].map(index=>parseInt(raw[index]+raw[index],16)/255);
    if(!/^[0-9a-f]{6}$/i.test(raw))return [1,1,1];
    return [0,2,4].map(index=>parseInt(raw.slice(index,index+2),16)/255);
  }
  function options(config) {
    const preset=presets[config.theme]||presets.default;
    const motion=config.motion||{},enabled=motion.enabled===true,period=Math.max(.05,+motion.period||2),phase=enabled?((+config.time||0)/period%1+1)%1:0;
    return Object.assign({seed:1},preset,config,{fitScale:fitScale(config.curvature??preset.curvature,config.mask),scanlinePitch:Math.max(1,+config.scanlinePitch||preset.scanlinePitch),phosphorColor:color(config.phosphorColor||preset.phosphorColor),motionPhase:phase,motionTick:enabled?Math.floor(phase*Math.max(1,Math.round(+motion.steps||12))):0,scanlineDrift:enabled?Math.max(0,+motion.scanlineDrift||0):0});
  }
  const vertex='attribute vec2 aPosition; varying vec2 vUv; void main(){vUv=(aPosition+1.0)*0.5;gl_Position=vec4(aPosition,0.0,1.0);}';
  const fragment=`precision mediump float;
    varying vec2 vUv; uniform sampler2D uImage; uniform vec2 uSize; uniform vec3 uTint;
    uniform float uPhase,uTick,uLineTravel,uSeed,uCurve,uFit,uLines,uPitch,uMask,uShift,uGlow,uVignette,uNoise,uFlicker,uSweep,uMono;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+uSeed*17.13)*43758.5453);}
    void main(){
      vec2 center=vUv*2.0-1.0;vec2 sampleCenter=center*uFit;vec2 warped=0.5+sampleCenter*0.5+sampleCenter*dot(sampleCenter,sampleCenter)*uCurve*0.12;
      if(warped.x<0.0||warped.x>1.0||warped.y<0.0||warped.y>1.0){gl_FragColor=vec4(0.0);return;}
      vec2 offset=vec2(uShift/uSize.x,0.0);
      vec4 base=texture2D(uImage,warped);
      vec3 rgb=vec3(texture2D(uImage,warped+offset).r,base.g,texture2D(uImage,warped-offset).b);
      float lum=dot(rgb,vec3(0.2126,0.7152,0.0722));rgb=mix(rgb,lum*uTint,uMono);
      float light=(sin(warped.y*uSize.y*6.2831853/uPitch+uPhase*6.2831853*uLineTravel)+1.0)*0.5;
      rgb*=1.0-uLines*(1.0-light);
      float phase=mod(gl_FragCoord.x,3.0);vec3 grille=phase<1.0?vec3(1.0,.73,.73):(phase<2.0?vec3(.73,1.0,.73):vec3(.73,.73,1.0));
      rgb*=mix(vec3(1.0),grille,uMask*(1.0-uMono));
      vec2 d=vec2(1.5/uSize.x,1.5/uSize.y);
      vec3 bloom=(texture2D(uImage,warped+vec2(d.x,0.0)).rgb+texture2D(uImage,warped-vec2(d.x,0.0)).rgb+texture2D(uImage,warped+vec2(0.0,d.y)).rgb+texture2D(uImage,warped-vec2(0.0,d.y)).rgb)*0.25;
      rgb+=max(bloom-vec3(.25),vec3(0.0))*uGlow*.55;
      float edge=clamp((length(center)-.3)/1.1,0.0,1.0);rgb*=1.0-uVignette*edge*edge;
      float band=exp(-pow((fract(warped.y-uPhase)-.15)*18.0,2.0));rgb+=base.rgb*band*uSweep;
      float flick=1.0-uFlicker*(.5+.5*sin(uPhase*6.2831853));rgb*=flick;
      float grain=hash(floor(gl_FragCoord.xy)+uTick*vec2(19.0,31.0))-.5;rgb+=grain*uNoise;
      gl_FragColor=vec4(clamp(rgb,0.0,1.0),base.a);
    }`;
  function shader(gl,type,source){const value=gl.createShader(type);gl.shaderSource(value,source);gl.compileShader(value);if(!gl.getShaderParameter(value,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(value)||'CRT shader compilation failed');return value;}
  function gpuSurface(width,height){
    const canvas=typeof document!=='undefined'?document.createElement('canvas'):typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(width,height):null;
    if(!canvas)return null;canvas.width=width;canvas.height=height;
    const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true,depth:false});if(!gl)return null;
    const vert=shader(gl,gl.VERTEX_SHADER,vertex),frag=shader(gl,gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'CRT shader link failed');
    gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const location=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    return {canvas,gl,program,texture,width,height};
  }
  function renderGpu(source,out,opts,surfaces){
    let gpu=gpuBySurfaces.get(surfaces);
    if(!gpu||gpu.width!==source.width||gpu.height!==source.height){gpu=gpuSurface(source.width,source.height);if(!gpu)return false;gpuBySurfaces.set(surfaces,gpu);}
    const {gl,program,texture,canvas}=gpu;if(gl.isContextLost())return false;
    gl.viewport(0,0,source.width,source.height);gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    const uniform=(name,...values)=>{const location=gl.getUniformLocation(program,name);if(values.length===1)gl.uniform1f(location,values[0]);else if(values.length===2)gl.uniform2f(location,...values);else gl.uniform3f(location,...values);};
    gl.uniform1i(gl.getUniformLocation(program,'uImage'),0);uniform('uSize',source.width,source.height);uniform('uTint',...opts.phosphorColor);uniform('uPhase',opts.motionPhase);uniform('uTick',opts.motionTick);uniform('uLineTravel',opts.scanlineDrift);uniform('uSeed',opts.seed);uniform('uCurve',opts.curvature);uniform('uLines',opts.scanline);uniform('uPitch',opts.scanlinePitch);uniform('uMask',opts.phosphor);uniform('uShift',opts.rgbShift);uniform('uGlow',opts.glow);uniform('uVignette',opts.vignette);uniform('uNoise',opts.noise);uniform('uFlicker',opts.flicker);uniform('uSweep',opts.sweep);uniform('uMono',opts.colorMode==='mono'?1:0);
    uniform('uFit',opts.fitScale);
    gl.drawArrays(gl.TRIANGLES,0,3);const ctx=out.getContext('2d');ctx.clearRect(0,0,out.width,out.height);ctx.drawImage(canvas,0,0);return true;
  }
  function renderCpu(source,out,opts,surfaces){
    const width=source.width,height=source.height,from=source.getContext('2d').getImageData(0,0,width,height).data,ctx=out.getContext('2d'),image=ctx.createImageData(width,height),to=image.data,tint=opts.phosphorColor;
    const sample=(x,y,channel)=>{const sx=Math.max(0,Math.min(width-1,Math.round(x))),sy=Math.max(0,Math.min(height-1,Math.round(y)));return from[(sy*width+sx)*4+channel];};
    const tick=opts.motionTick,seed=opts.seed|0,phase=opts.motionPhase;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const cx=(x+.5)/width*2-1,cy=(y+.5)/height*2-1,radius=cx*cx+cy*cy,sx0=cx*opts.fitScale,sy0=cy*opts.fitScale,sampleRadius=sx0*sx0+sy0*sy0,wx=(.5+sx0*.5+sx0*sampleRadius*opts.curvature*.12)*width,wy=(.5+sy0*.5+sy0*sampleRadius*opts.curvature*.12)*height,index=(y*width+x)*4;
      if(wx<0||wx>=width||wy<0||wy>=height)continue;
      const sx=Math.max(0,Math.min(width-1,Math.round(wx))),sy=Math.max(0,Math.min(height-1,Math.round(wy))),origin=(sy*width+sx)*4,alpha=from[origin+3];if(!alpha)continue;
      let red=sample(wx+opts.rgbShift,wy,0),green=from[origin+1],blue=sample(wx-opts.rgbShift,wy,2);
      if(opts.colorMode==='mono'){const luminance=(red*.2126+green*.7152+blue*.0722);red=luminance*tint[0];green=luminance*tint[1];blue=luminance*tint[2];}
      const line=(Math.sin((wy/opts.scanlinePitch)*Math.PI*2+phase*Math.PI*2*opts.scanlineDrift)+1)*.5,dim=1-opts.scanline*(1-line),mask=opts.colorMode==='mono'?0:opts.phosphor,channel=x%3,grille=[channel===0?1:.73,channel===1?1:.73,channel===2?1:.73];
      const edge=Math.max(0,Math.min(1,(Math.sqrt(radius)-.3)/1.1)),flick=1-opts.flicker*(.5+.5*Math.sin(phase*Math.PI*2)),band=Math.exp(-Math.pow((((wy/height-phase)%1+1)%1)-.15,2)*324)*opts.sweep;
      const bloom=opts.glow?Math.max(0,((sample(wx+2,wy,0)+sample(wx-2,wy,0)+sample(wx,wy+2,0)+sample(wx,wy-2,0))*.25)-64)*opts.glow*.55:0;
      let hash=(x*374761393+y*668265263+tick*1442695041+seed*1274126177)|0;hash=Math.imul(hash^(hash>>>13),1274126177);const noise=(((hash^(hash>>>16))>>>0)/4294967295-.5)*opts.noise*255;
      const shade=dim*(1-opts.vignette*edge*edge)*flick;
      to[index]=Math.max(0,Math.min(255,red*shade*(1-mask+mask*grille[0])+bloom+red*band+noise));to[index+1]=Math.max(0,Math.min(255,green*shade*(1-mask+mask*grille[1])+bloom+green*band+noise));to[index+2]=Math.max(0,Math.min(255,blue*shade*(1-mask+mask*grille[2])+bloom+blue*band+noise));to[index+3]=alpha;
    }
    ctx.putImageData(image,0,0);surfaces.notePixels?.(width,height,1);
  }
  function apply(source,config,surfaces,frame){
    const opts=options(Object.assign({},config,{time:frame&&frame.time||0})),out=surfaces.acquire(source.width,source.height);
    try{if(backend!=='cpu'){try{if(renderGpu(source,out,opts,surfaces)){lastBackend='gpu';return out;}if(backend==='gpu')throw new Error('CRT WebGL 不可用');}catch(error){if(backend==='gpu')throw error;}}renderCpu(source,out,opts,surfaces);lastBackend='cpu';return out;}
    catch(error){surfaces.release(out);throw error;}
  }
  api.modules.crtScreen=Object.freeze({apply,presets,fitScale,setBackend(value){backend=['auto','cpu','gpu'].includes(value)?value:'auto';},getBackend(){return backend;},getLastBackend(){return lastBackend;}});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:68a-crt-screen.js> */

/* <vnext:68c-ascii-analysis.js> */
/* CPU ASCII analysis. One reusable working set per Player surface pool. */
(function (global) {
  'use strict';
  const api = global.ToSampoolRuntimeVNext;
  const pools = new WeakMap();
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const weights = sigma => Array.from({ length: 5 }, (_, i) => Math.exp(-((i - 2) ** 2) / (2 * sigma * sigma)));
  const w1 = weights(1), w2 = weights(1.6);
  const sum1 = w1.reduce((a, b) => a + b, 0), sum2 = w2.reduce((a, b) => a + b, 0);

  function stateFor(surfaces) {
    let state = pools.get(surfaces);
    if (!state) {
      state = { edge: null, cell: null, edgeAllocations: 0, cellAllocations: 0 };
      pools.set(surfaces, state);
      surfaces.onClear(() => pools.delete(surfaces));
    }
    return state;
  }

  function directions(pixels, width, height, columns, rows, config, validWidth, validHeight, surfaces) {
    const state = stateFor(surfaces);
    let work = state.edge;
    if (!work || work.width !== width || work.height !== height || work.columns !== columns || work.rows !== rows) {
      work = state.edge = {
        width, height, columns, rows,
        luma: new Float32Array(width * height),
        h1: new Float32Array(width * height), h2: new Float32Array(width * height),
        dog: new Uint8Array(width * height),
        votes: new Uint16Array(columns * rows * 4), result: new Int8Array(columns * rows)
      };
      state.edgeAllocations++;
    }
    const { luma, h1, h2, dog, votes, result } = work;
    const lastX = clamp(Math.floor(validWidth) - 1, 0, width - 1);
    const lastY = clamp(Math.floor(validHeight) - 1, 0, height - 1);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const p = (Math.min(y, lastY) * width + Math.min(x, lastX)) * 4;
      luma[y * width + x] = (.2126 * pixels[p] + .7152 * pixels[p + 1] + .0722 * pixels[p + 2]) / 255 * pixels[p + 3] / 255;
    }
    // Share source reads between the two Gaussian passes, preserving Float32 rounding.
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const base = y * width;
      const a = luma[base + Math.max(0, x - 2)], b = luma[base + Math.max(0, x - 1)], c = luma[base + x];
      const d = luma[base + Math.min(width - 1, x + 1)], e = luma[base + Math.min(width - 1, x + 2)];
      h1[base + x] = (a*w1[0] + b*w1[1] + c*w1[2] + d*w1[3] + e*w1[4]) / sum1;
      h2[base + x] = (a*w2[0] + b*w2[1] + c*w2[2] + d*w2[3] + e*w2[4]) / sum2;
    }
    const threshold = .001 + (1 - clamp(finite(config.edgeSensitivity, .75), 0, 1)) * .04;
    for (let y = 0; y < height; y++) {
      const a = Math.max(0, y - 2) * width, b = Math.max(0, y - 1) * width, c = y * width;
      const d = Math.min(height - 1, y + 1) * width, e = Math.min(height - 1, y + 2) * width;
      for (let x = 0; x < width; x++) {
        const narrow = Math.fround((h1[a+x]*w1[0] + h1[b+x]*w1[1] + h1[c+x]*w1[2] + h1[d+x]*w1[3] + h1[e+x]*w1[4]) / sum1);
        const wide = Math.fround((h2[a+x]*w2[0] + h2[b+x]*w2[1] + h2[c+x]*w2[2] + h2[d+x]*w2[3] + h2[e+x]*w2[4]) / sum2);
        dog[c + x] = narrow - wide >= threshold ? 1 : 0;
      }
    }
    votes.fill(0); result.fill(-1);
    const tangent = Math.SQRT2 - 1;
    for (let y = 0; y < height; y++) {
      const above = Math.max(0, y - 1) * width, center = y * width, below = Math.min(height - 1, y + 1) * width;
      const row = Math.floor(y / 4) * columns;
      for (let x = 0; x < width; x++) {
        const left = Math.max(0, x - 1), right = Math.min(width - 1, x + 1);
        const a = dog[above+left], b = dog[above+x], c = dog[above+right], d = dog[center+left];
        const e = dog[center+right], f = dog[below+left], g = dog[below+x], h = dog[below+right];
        const gx = c + 2*e + h - a - 2*d - f, gy = f + 2*g + h - a - 2*b - c;
        if (!gx && !gy) continue;
        // Equivalent four tangent sectors; integer Sobel gradients cannot hit the irrational boundary.
        const direction = Math.abs(gx) < Math.abs(gy)*tangent ? 0 : Math.abs(gy) < Math.abs(gx)*tangent ? 1 : gx*gy > 0 ? 2 : 3;
        votes[(row + Math.floor(x / 4))*4 + direction]++;
      }
    }
    const minimum = Math.max(1, Math.ceil(clamp(finite(config.edgeCoverage, .25), 0, 1) * 16));
    for (let i = 0; i < result.length; i++) {
      let best = 0;
      for (let d = 1; d < 4; d++) if (votes[i*4+d] > votes[i*4+best]) best = d;
      if (votes[i*4+best] >= minimum) result[i] = best;
    }
    return result;
  }

  function cells(pixels, alphaPixels, columns, rows, detail, glyphs, config, directionsByCell, surfaces) {
    const state = stateFor(surfaces);
    let work = state.cell;
    if (!work || work.columns !== columns || work.rows !== rows) {
      work = state.cell = { columns, rows, colors: new Uint8Array(columns*rows*4), indices: new Uint8Array(columns*rows*4) };
      state.cellAllocations++;
    }
    const { colors, indices } = work;
    colors.fill(0); indices.fill(0);
    const width = columns * detail, exposure = Math.max(0, finite(config.exposure, 1));
    const attenuation = Math.max(.01, finite(config.attenuation, 1)), inverse = !!config.invert;
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      let red = 0, green = 0, blue = 0, weight = 0;
      for (let y = 0; y < detail; y++) for (let x = 0; x < detail; x++) {
        const p = ((row*detail+y)*width + column*detail+x)*4, a = pixels[p+3] / 255;
        red += pixels[p]*a; green += pixels[p+1]*a; blue += pixels[p+2]*a; weight += a;
      }
      const p = (row * columns + column) * 4;
      // Keep partial final cells and representative Alpha independent from edge padding.
      if (!weight) {
        if (!alphaPixels[p+3]) continue;
        red = alphaPixels[p]; green = alphaPixels[p+1]; blue = alphaPixels[p+2]; weight = 1;
      }
      red /= weight; green /= weight; blue /= weight;
      let brightness = Math.pow(clamp((.2126*red + .7152*green + .0722*blue)/255*exposure, 0, 1), attenuation);
      if (inverse) brightness = 1 - brightness;
      const direction = directionsByCell && directionsByCell[row*columns+column];
      const glyph = direction != null && direction >= 0 && glyphs.edges[direction] >= 0 ? glyphs.edges[direction] : glyphs.lut[Math.round(brightness*255)];
      colors[p] = Math.round(red); colors[p+1] = Math.round(green); colors[p+2] = Math.round(blue); colors[p+3] = 255;
      indices[p] = glyph % 256; indices[p+1] = Math.floor(glyph / 256); indices[p+2] = alphaPixels[p+3]; indices[p+3] = 255;
    }
    // Borrowed views: valid until this pool's next ASCII apply; consumed synchronously.
    return work;
  }

  function statistics(surfaces) {
    const state = pools.get(surfaces), edge = state?.edge, cell = state?.cell;
    const bytes = values => values.reduce((sum, value) => sum + (value?.byteLength || 0), 0);
    return Object.freeze({
      edgeBytes: edge ? bytes([edge.luma, edge.h1, edge.h2, edge.dog, edge.votes, edge.result]) : 0,
      cellBytes: cell ? bytes([cell.colors, cell.indices]) : 0,
      edgeAllocations: state?.edgeAllocations || 0, cellAllocations: state?.cellAllocations || 0
    });
  }
  api.modules.asciiAnalysis = Object.freeze({ directions, cells, statistics });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:68c-ascii-analysis.js> */

/* <vnext:68d-ascii-gpu-analysis.js> */
/* Optional low-resolution ASCII edge analysis; shares the glyph renderer's GL.
 * Source/Alpha representatives remain CPU-owned. Votes never read back to CPU.
 */
(function (global) {
  'use strict';
  const api = global.ToSampoolRuntimeVNext;
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const vertex = 'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
  const header = 'precision highp float;uniform sampler2D inputTex;uniform vec2 size,validEnd;uniform float threshold;';
  const sample = 'vec4 at(vec2 p){return texture2D(inputTex,(clamp(p,vec2(0.),size-1.)+.5)/size);}';
  const horizontal = header + sample + `
    void main(){vec2 p=floor(gl_FragCoord.xy);vec2 sum=vec2(0.);
      for(int k=-2;k<=2;k++){vec2 q=min(clamp(p+vec2(float(k),0.),vec2(0.),size-1.),validEnd);vec4 c=at(q);
        float l=dot(c.rgb,vec3(.2126,.7152,.0722))*c.a;
        vec2 w=vec2(exp(-float(k*k)/2.),exp(-float(k*k)/(2.*1.6*1.6)));sum+=l*w;}
      gl_FragColor=vec4(sum/vec2(2.4837318858984925,3.5608218483405576),0.,1.);}`;
  const vertical = header + sample + `
    void main(){vec2 p=floor(gl_FragCoord.xy);vec2 sum=vec2(0.);
      for(int k=-2;k<=2;k++){vec2 c=at(p+vec2(0.,float(k))).rg;
        vec2 w=vec2(exp(-float(k*k)/2.),exp(-float(k*k)/(2.*1.6*1.6)));sum+=c*w;}
      vec2 value=sum/vec2(2.4837318858984925,3.5608218483405576);
      gl_FragColor=vec4(value.x-value.y>=threshold?1.:0.,0.,0.,1.);}`;
  const gradient = header + sample + `
    void main(){vec2 p=floor(gl_FragCoord.xy);
      float a=at(p+vec2(-1.,-1.)).r,b=at(p+vec2(0.,-1.)).r,c=at(p+vec2(1.,-1.)).r;
      float d=at(p+vec2(-1.,0.)).r,e=at(p+vec2(1.,0.)).r;
      float f=at(p+vec2(-1.,1.)).r,g=at(p+vec2(0.,1.)).r,h=at(p+vec2(1.,1.)).r;
      float gx=c+2.*e+h-a-2.*d-f,gy=f+2.*g+h-a-2.*b-c,code=0.;
      if(abs(gx)+abs(gy)>0.)code=abs(gx)<abs(gy)*.4142135623730951?1.:abs(gy)<abs(gx)*.4142135623730951?2.:gx*gy>0.?3.:4.;
      gl_FragColor=vec4(code/255.,0.,0.,1.);}`;
  const vote = header + sample + `uniform float coverage;
    void main(){vec2 cell=floor(gl_FragCoord.xy);vec4 buckets=vec4(0.);
      for(int y=0;y<4;y++)for(int x=0;x<4;x++){
        float code=floor(at(cell*4.+vec2(float(x),float(y))).r*255.+.5);
        if(code==1.)buckets.x+=1.;else if(code==2.)buckets.y+=1.;else if(code==3.)buckets.z+=1.;else if(code==4.)buckets.w+=1.;}
      float best=buckets.x,code=1.;
      if(buckets.y>best){best=buckets.y;code=2.;}if(buckets.z>best){best=buckets.z;code=3.;}if(buckets.w>best){best=buckets.w;code=4.;}
      gl_FragColor=vec4((best>=max(1.,ceil(coverage*16.))?code:0.)/255.,0.,0.,1.);}`;

  function destroy(gl, state) {
    if (!state) return;
    for (const item of state.programs) gl.deleteProgram(item.program);
    for (const texture of state.textures) gl.deleteTexture(texture);
    gl.deleteFramebuffer(state.framebuffer); gl.deleteBuffer(state.buffer);
  }
  function compile(gl, fragment) {
    const program = gl.createProgram(), shaders = [];
    try {
      for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
        const shader = gl.createShader(type); shaders.push(shader);
        gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        gl.attachShader(program, shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      return { program, locations: new Map(), position: gl.getAttribLocation(program, 'position') };
    } catch (error) { gl.deleteProgram(program); throw error; }
    finally { shaders.forEach(shader => gl.deleteShader(shader)); }
  }
  function create(gl, width, height, columns, rows) {
    const state = { width, height, columns, rows, programs: [], textures: [], framebuffer: null, buffer: null };
    try {
      for (const fragment of [horizontal, vertical, gradient, vote]) state.programs.push(compile(gl, fragment));
      // Only the paired horizontal blur needs RGBA32F. Other passes are RGBA8.
      for (let i = 0; i < 5; i++) {
        const texture = gl.createTexture(); state.textures.push(texture);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, key, gl.NEAREST);
        for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, key, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, i === 4 ? columns : width, i === 4 ? rows : height,
          0, gl.RGBA, i === 1 ? gl.FLOAT : gl.UNSIGNED_BYTE, null);
      }
      state.framebuffer = gl.createFramebuffer(); state.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      return state;
    } catch (error) { destroy(gl, state); throw error; }
  }
  function analyze(gpu, pixels, width, height, columns, rows, config, validWidth, validHeight) {
    if (!gpu || gpu.gl.isContextLost() || gpu.analysisFailure) return null;
    const gl = gpu.gl;
    try {
      if (!gpu.analysisChecked) {
        if (!gl.getExtension('OES_texture_float') || !gl.getExtension('WEBGL_color_buffer_float')) throw new Error('Float framebuffer unavailable');
        if (!gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision) throw new Error('Fragment highp unavailable');
        gpu.analysisChecked = true;
      }
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      // Always 4x4 analysis pixels per cell, irrespective of source/grid geometry.
      if (width !== columns*4 || height !== rows*4 || width > max || height > max) return null;
      let state = gpu.analysis;
      if (!state || state.width !== width || state.height !== height) {
        destroy(gl, state); gpu.analysis = null;
        state = gpu.analysis = create(gl, width, height, columns, rows);
      }
      gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, state.textures[0]);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const uniform = (item, name, ...values) => {
        if (!item.locations.has(name)) item.locations.set(name, gl.getUniformLocation(item.program, name));
        const location = item.locations.get(name);
        if (values.length === 2) gl.uniform2f(location, ...values); else gl.uniform1f(location, values[0]);
      };
      gl.bindFramebuffer(gl.FRAMEBUFFER, state.framebuffer);
      gl.disable(gl.BLEND); gl.disable(gl.SCISSOR_TEST); gl.disable(gl.DITHER);
      for (let pass = 0; pass < 4; pass++) {
        const item = state.programs[pass]; gl.useProgram(item.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer); gl.enableVertexAttribArray(item.position);
        gl.vertexAttribPointer(item.position, 2, gl.FLOAT, false, 0, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, state.textures[pass+1], 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Incomplete ASCII framebuffer');
        gl.viewport(0, 0, pass === 3 ? columns : width, pass === 3 ? rows : height);
        gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, state.textures[pass]);
        gl.uniform1i(gl.getUniformLocation(item.program, 'inputTex'), 4);
        uniform(item, 'size', width, height);
        uniform(item, 'validEnd', Math.max(0, Math.floor(validWidth)-1), Math.max(0, Math.floor(validHeight)-1));
        uniform(item, 'threshold', .001 + (1-clamp(finite(config.edgeSensitivity, .75), 0, 1))*.04);
        uniform(item, 'coverage', clamp(finite(config.edgeCoverage, .25), 0, 1));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      if (gl.getError() !== gl.NO_ERROR) throw new Error('ASCII GPU analysis failed');
      return state.textures[4];
    } catch (error) {
      destroy(gl, gpu.analysis); gpu.analysis = null;
      // Do not retry a known unsupported/broken path on every animation frame.
      gpu.analysisFailure = String(error.message || error); return null;
    } finally { gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
  }
  function dispose(gpu) { destroy(gpu.gl, gpu.analysis); gpu.analysis = null; }
  api.modules.asciiGpuAnalysis = Object.freeze({ analyze, dispose });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:68d-ascii-gpu-analysis.js> */

/* <vnext:68b-ascii-mapping.js> */
/* ASCII mapping: Acerola-inspired luminance fill + directional edge voting.
 * Independent Canvas2D implementation; no game depth/normal buffers or font
 * binaries. Cell geometry stays floating point; only raster backing is integer.
 */
(function (global) {
  'use strict';
  const api = global.ToSampoolRuntimeVNext;
  const DEFAULT_CHARS = ' .:-=+*#%@';
  const EDGE_CHARS = '—|/\\';
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
  const cache = new Map();
  const gpuCache = new WeakMap();
  const builtinFontFamilies = {builtin:null,'chill-16':null};
  let backend='auto',lastBackend=null,analysisBackend='auto',lastAnalysisBackend=null;
  const vertex='attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
  const fragment=`precision highp float;
    uniform sampler2D colors,indices,glyphs,edgeVotes;uniform float useEdgeVotes;uniform vec4 edgeGlyphs;
    uniform vec2 outputSize,cellSize,gridSize,glyphSize,drawSize,drawOffset;
    uniform float glyphCount,original;uniform vec4 foreground,background;
    void main(){vec2 p=vec2(gl_FragCoord.x,outputSize.y-gl_FragCoord.y),cell=floor(p/cellSize),uv=(cell+.5)/gridSize;
      vec4 id=texture2D(indices,uv);float index=floor(id.r*255.+.5)+floor(id.g*255.+.5)*256.;
      if(useEdgeVotes>.5){float code=floor(texture2D(edgeVotes,uv).r*255.+.5);
        float chosen=code<1.5?edgeGlyphs.x:code<2.5?edgeGlyphs.y:code<3.5?edgeGlyphs.z:edgeGlyphs.w;
        if(code>.5&&chosen>=0.)index=chosen;}
      vec2 local=(p-cell*cellSize-drawOffset)/drawSize;float mask=0.;
      if(local.x>=0.&&local.x<1.&&local.y>=0.&&local.y<1.){vec2 q=floor(local*glyphSize)+.5;
        mask=texture2D(glyphs,vec2((index*glyphSize.x+q.x)/(glyphSize.x*glyphCount),q.y/glyphSize.y)).a;}
      vec3 rgb=mix(foreground.rgb,texture2D(colors,uv).rgb,original);float fa=mask*foreground.a,ba=background.a*(1.-fa),a=fa+ba;
      gl_FragColor=vec4(a>0.?(rgb*fa+background.rgb*ba)/a:vec3(0.),a*id.b);
    }`;
  function gpuRenderer(surfaces) {
    if(gpuCache.has(surfaces))return gpuCache.get(surfaces);
    const target=canvas(1,1),gl=target.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true,depth:false});
    const unavailable=()=>{gpuCache.set(surfaces,null);surfaces.onClear?.(()=>gpuCache.delete(surfaces));return null;};
    if(!gl)return unavailable();
    const shaders=[],textures=[];let program=null,buffer=null;
    try{
      const compile=(type,source)=>{const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
      program=gl.createProgram();const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
      gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
      buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const location=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
      for(let i=0;i<3;i++){const texture=gl.createTexture();textures.push(texture);gl.bindTexture(gl.TEXTURE_2D,texture);for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.NEAREST);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);}
      const gpu={canvas:target,gl,program,textures,buffer,location,atlas:null,glyphTextures:new Map(),glyphTexture:textures[2]};gpuCache.set(surfaces,gpu);
      surfaces.onClear?.(()=>{api.modules.asciiGpuAnalysis.dispose(gpu);textures.forEach(texture=>gl.deleteTexture(texture));gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();gpuCache.delete(surfaces);});
      return gpu;
    }catch(error){
      textures.forEach(texture=>gl.deleteTexture(texture));if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();return unavailable();
    }finally{shaders.forEach(shader=>gl.deleteShader(shader));}
  }
  function paintGpu(output,surfaces,grid,colors,indices,glyphs,geometry,edgeVotes) {
    const gpu=gpuRenderer(surfaces);if(!gpu||gpu.gl.isContextLost())return false;
    const {gl,program,textures}=gpu;
    if(gpu.canvas.width!==output.width)gpu.canvas.width=output.width;if(gpu.canvas.height!==output.height)gpu.canvas.height=output.height;
    if(glyphs.width*glyphs.characters.length>gl.getParameter(gl.MAX_TEXTURE_SIZE))return false;
    gl.viewport(0,0,output.width,output.height);gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buffer);
    gl.enableVertexAttribArray(gpu.location);gl.vertexAttribPointer(gpu.location,2,gl.FLOAT,false,0,0);
    const upload=(unit,width,height,bytes)=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,unit===2?gpu.glyphTexture:textures[unit]);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,bytes);};
    upload(0,grid.columns,grid.rows,colors);upload(1,grid.columns,grid.rows,indices);
    gl.activeTexture(gl.TEXTURE2);
    let cached=gpu.glyphTextures.get(glyphs);
    if(cached){gpu.glyphTextures.delete(glyphs);gpu.glyphTextures.set(glyphs,cached);gpu.glyphTexture=cached.texture;}
    else{
      const bytes=glyphs.width*glyphs.height*glyphs.characters.length*4;
      const used=()=>Array.from(gpu.glyphTextures.values()).reduce((sum,item)=>sum+item.bytes,0);
      while(gpu.glyphTextures.size&&(gpu.glyphTextures.size>=4||used()+bytes>4*1024*1024)){
        const oldest=gpu.glyphTextures.keys().next().value,item=gpu.glyphTextures.get(oldest);gpu.glyphTextures.delete(oldest);
        if(item.texture!==textures[2]){gl.deleteTexture(item.texture);textures.splice(textures.indexOf(item.texture),1);}
      }
      if(!Array.from(gpu.glyphTextures.values()).some(item=>item.texture===textures[2]))gpu.glyphTexture=textures[2];
      else{gpu.glyphTexture=gl.createTexture();textures.push(gpu.glyphTexture);gl.bindTexture(gl.TEXTURE_2D,gpu.glyphTexture);for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.NEAREST);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);}
    }
    gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,gpu.glyphTexture);
    if(!cached){const width=glyphs.width*glyphs.characters.length,bytes=new Uint8Array(width*glyphs.height*4),area=glyphs.width*glyphs.height;
      glyphs.characters.forEach((char,index)=>{for(let y=0;y<glyphs.height;y++)for(let x=0;x<glyphs.width;x++){const p=(y*width+index*glyphs.width+x)*4;bytes[p]=bytes[p+1]=bytes[p+2]=255;bytes[p+3]=glyphs.bytes[index*area+y*glyphs.width+x];}});
      upload(2,width,glyphs.height,bytes);gpu.glyphTextures.set(glyphs,{texture:gpu.glyphTexture,bytes:bytes.length});
    }
    ['colors','indices','glyphs'].forEach((name,index)=>gl.uniform1i(gl.getUniformLocation(program,name),index));
    const uniform=(name,...values)=>{const location=gl.getUniformLocation(program,name);if(values.length===1)gl.uniform1f(location,values[0]);else if(values.length===2)gl.uniform2f(location,...values);else gl.uniform4f(location,...values);};
    uniform('outputSize',output.width,output.height);uniform('cellSize',grid.cell.width,grid.cell.height);uniform('gridSize',grid.columns,grid.rows);uniform('glyphSize',glyphs.width,glyphs.height);
    uniform('glyphCount',glyphs.characters.length);uniform('drawSize',geometry.dw,geometry.dh);uniform('drawOffset',geometry.ox,geometry.oy);uniform('original',geometry.original?1:0);
    const normalized=value=>[value[0]/255,value[1]/255,value[2]/255,value[3]];
    uniform('foreground',...normalized(geometry.foreground));uniform('background',...normalized(geometry.background));
    gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,edgeVotes||textures[1]);
    gl.uniform1i(gl.getUniformLocation(program,'edgeVotes'),3);
    uniform('useEdgeVotes',edgeVotes?1:0);uniform('edgeGlyphs',...glyphs.edges);
    gl.drawArrays(gl.TRIANGLES,0,3);if(gl.getError()!==gl.NO_ERROR)return false;
    const ctx=output.getContext('2d');ctx.clearRect(0,0,output.width,output.height);ctx.drawImage(gpu.canvas,0,0);return true;
  }
  // Original, small 5x7 masks in an 8x8 cell, not third-party font binaries.
  const bitmap = {
    ' ':['00000'], '.':['00000','00000','00000','00000','00000','00100','00100'],
    ':':['00000','00100','00100','00000','00100','00100','00000'],
    '-':['00000','00000','00000','11111'], '=':['00000','00000','11111','00000','11111'],
    '—':['00000000','00000000','00000000','11111111'],
    '+':['00000','00100','00100','11111','00100','00100'],
    '*':['00000','10101','01110','11111','01110','10101'],
    '#':['01010','01010','11111','01010','11111','01010','01010'],
    '%':['11001','11010','00100','00100','01000','10110','00110'],
    '@':['01110','10001','10111','10101','10111','10000','01111'],
    '|':['00100','00100','00100','00100','00100','00100','00100'],
    '/':['00001','00001','00010','00100','01000','10000','10000'],
    '\\':['10000','10000','01000','00100','00010','00001','00001'],
  };
  function chars(text) {
    const sequence = api.modules.textReveal.graphemes(String(text == null ? DEFAULT_CHARS : text));
    return Array.from(new Set(sequence.filter(char => !/[\r\n\t]/.test(char)))).slice(0, 128);
  }
  function edgeChars(config){const result=api.modules.textReveal.graphemes(config.edgeCharacters||EDGE_CHARS);if(result.length!==4)throw new Error('方向字符需要依次填写横、竖、右上斜、右下斜四个字形');return result;}
  function canvas(width, height) {
    const value = typeof document !== 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(width, height);
    value.width = width; value.height = height; return value;
  }
  function encode(bytes) {
    let text = ''; for (const byte of bytes) text += String.fromCharCode(byte);
    return global.btoa(text);
  }
  function decode(text) { return Uint8Array.from(global.atob(text), char => char.charCodeAt(0)); }
  function needsBuiltinFont(config) {
    return config.font==='chill-16' || (config.font || 'builtin') === 'builtin' &&
      [...chars(config.characters), ...edgeChars(config)].some(char => !Object.prototype.hasOwnProperty.call(bitmap, char));
  }
  function builtinAlpha(characters, id) {
    const size=id==='chill-16'?16:8,area=size*size;
    const alpha = new Uint8Array(characters.length * area);
    const extensions = [];
    characters.forEach((char, index) => {
      if (id==='chill-16'||!Object.prototype.hasOwnProperty.call(bitmap, char)) { extensions.push({char, index}); return; }
      bitmap[char].forEach((row, y) => {
        const offset = row.length === 8 ? 0 : 1;
        for (let x = 0; x < row.length; x++) if (row[x] === '1') {
          alpha[index*area + y*size + x + offset] = 255;
        }
      });
    });
    if (!extensions.length) return alpha;
    const family=builtinFontFamilies[id];
    if (!family) throw new Error('ASCII像素字体尚未载入；请在编辑器完成字形烘焙，或提供glyphAtlas');
    const scratch = canvas(size, size), ctx = scratch.getContext('2d');
    ctx.font = `${size}px "${family}"`; ctx.textAlign = id==='builtin'?'left':'center'; ctx.textBaseline = 'alphabetic';
    // Chromium's white-text contrast boost closes tiny counters at 8px.
    // Bake neutral black coverage; only Alpha is retained, never ink RGB.
    ctx.fillStyle = id==='builtin'?'#000000':'#ffffff';
    const metrics = ctx.measureText('国Ag');
    const ascent = finite(metrics.fontBoundingBoxAscent, size-2), descent = finite(metrics.fontBoundingBoxDescent, 2);
    const baseline = Math.round((size - ascent - descent)/2 + ascent);
    for (const {char, index} of extensions) {
      ctx.clearRect(0, 0, size, size);
      // Fit unusually long graphemes by their advance, never a tight ink box.
      const advance=ctx.measureText(char).width,scale = Math.min(1, size / Math.max(1, advance));
      ctx.save(); ctx.translate(id==='builtin'?Math.round((size-advance*scale)/2):size/2, size/2); ctx.scale(scale, scale); ctx.fillText(char, 0, baseline-size/2); ctx.restore();
      const pixels = ctx.getImageData(0, 0, size, size).data;
      // The 7px outlines have fractional contour edges. Snap coverage to the
      // native pixel grid rather than retaining browser antialias fringes.
      for (let i = 0; i < area; i++) alpha[index*area + i] = id==='builtin'?(pixels[i*4+3]>=128?255:0):pixels[i*4 + 3];
    }
    return alpha;
  }
  function prepare(config, family) {
    const characters = Array.from(new Set([...chars(config.characters), ...edgeChars(config)]));
    if (!characters.length) throw new Error('ASCII 至少需要一个可显示字符');
    const id=config.font||'builtin',builtin = id==='builtin'||id==='chill-16';
    let width = id==='chill-16'?16:8, height = width, alpha;
    if (builtin) {
      alpha = builtinAlpha(characters,id);
    } else {
      const measure = canvas(1, 1).getContext('2d');
      measure.font = `24px ${family || 'monospace'}`;
      width = Math.ceil(Math.max(1, ...characters.map(char => measure.measureText(char).width))) + 4;
      height = 32;
      const surface = canvas(width * characters.length, height), ctx = surface.getContext('2d');
      ctx.font = measure.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
      characters.forEach((char, index) => ctx.fillText(char, width * (index + .5), height * .5));
      const pixels = ctx.getImageData(0, 0, surface.width, height).data;
      alpha = new Uint8Array(width * height * characters.length);
      for (let index = 0; index < characters.length; index++) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++)
        alpha[(index * height + y) * width + x] = pixels[(y * surface.width + index * width + x) * 4 + 3];
    }
    return { version:1, font:config.font || 'builtin', characters, width, height, alpha:encode(alpha) };
  }
  function atlas(config) {
    const provided = config.glyphAtlas;
    const key = JSON.stringify([provided, config.font, config.characters, config.edgeCharacters]);
    if (cache.has(key)) return cache.get(key);
    const data = provided || prepare(config), bytes = decode(data.alpha);
    if (data.version !== 1 || !Number.isInteger(data.width) || !Number.isInteger(data.height) || data.width < 1 || data.height < 1 ||
      data.width > 128 || data.height > 128 || !Array.isArray(data.characters) || data.characters.length > 256 ||
      bytes.length !== data.width * data.height * data.characters.length) throw new Error('ASCII 字形图集无效');
    const fill = chars(config.characters), area = data.width * data.height;
    const entries = data.characters.map((char, index) => {
      let coverage = 0; for (let i = index * area; i < (index + 1) * area; i++) coverage += bytes[i];
      return { char, index, density:coverage / (255 * area) };
    });
    const ramp = entries.filter(entry => fill.includes(entry.char)).sort((a, b) => a.density - b.density);
    if (!ramp.length) throw new Error('ASCII 字形图集与字符集不匹配，请重新选择字体');
    const low = ramp[0].density, span = ramp[ramp.length - 1].density - low, lut = new Uint16Array(256);
    for (let level = 0; level < 256; level++) {
      const target = low + level / 255 * span;
      lut[level] = ramp.reduce((best, entry) => Math.abs(entry.density - target) < Math.abs(best.density - target) ? entry : best, ramp[0]).index;
    }
    const edges = edgeChars(config).map(char => entries.find(entry => entry.char === char)?.index ?? -1);
    const result = { ...data, bytes, ramp, lut, edges };
    cache.set(key, result); if (cache.size > 12) cache.delete(cache.keys().next().value);
    return result;
  }
  function geometry(config, grid, glyphs) {
    const width = Math.max(1, Math.round(finite(config.size, 8))) * Math.max(1, grid);
    const ratio = Math.max(.1, finite(config.glyphRatio, glyphs.width / glyphs.height));
    return { width, height:width / ratio };
  }
  function rgba(text, opacity) {
    let raw = String(text || '#ffffff').replace('#', '');
    if (raw.length === 3 || raw.length === 4) raw = [...raw].map(char => char + char).join('');
    if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(raw)) raw = 'ffffff';
    return [0, 2, 4].map(index => parseInt(raw.slice(index, index + 2), 16)).concat((raw.length === 8 ? parseInt(raw.slice(6), 16) / 255 : 1) * clamp(finite(opacity, 1), 0, 1));
  }
  function apply(source, config, surfaces, frame, grid) {
    const glyphs = atlas(config), cell = geometry(config, grid || 1, glyphs);
    const columns = Math.ceil(source.width / cell.width), rows = Math.ceil(source.height / cell.height);
    if (columns * rows > 1000000) throw new Error('ASCII 单元过密，请增大相对尺寸');
    const edge = config.edges === true, detail = edge ? 4 : 1, analysis = surfaces.acquire(columns * detail, rows * detail),alphaSurface=surfaces.acquire(columns,rows);
    const output = surfaces.acquire(source.width, source.height);
    // Shared by CPU and GPU: the glyph renderer stays background-independent.
    // Blend only the transparent character layer over the actual current input.
    const finish=()=>{
      if(!config.originalBackground)return output;
      const composite=surfaces.acquire(source.width,source.height),ctx=composite.getContext('2d');
      try{
        ctx.clearRect(0,0,composite.width,composite.height);ctx.drawImage(source,0,0);
        ctx.globalCompositeOperation=api.modules.blend.toCanvas(config.blend||'normal');
        ctx.drawImage(output,0,0);ctx.globalCompositeOperation='source-over';
        surfaces.release(output);return composite;
      }catch(error){ctx.globalCompositeOperation='source-over';surfaces.release(composite);throw error;}
    };
    try {
      const ctx = analysis.getContext('2d'); ctx.clearRect(0, 0, analysis.width, analysis.height); ctx.imageSmoothingEnabled = true;
      ctx.drawImage(source, 0, 0, source.width / cell.width * detail, source.height / cell.height * detail);
      const pixels = ctx.getImageData(0, 0, analysis.width, analysis.height).data;
      const alphaCtx=alphaSurface.getContext('2d');alphaCtx.clearRect(0,0,columns,rows);alphaCtx.imageSmoothingEnabled=false;alphaCtx.drawImage(source,0,0,columns,rows);
      const alphaPixels=alphaCtx.getImageData(0,0,columns,rows).data;
      let edgeVotes=null;
      if(edge&&backend!=='cpu'&&analysisBackend!=='cpu')try{
        const gpu=gpuRenderer(surfaces);
        edgeVotes=api.modules.asciiGpuAnalysis.analyze(gpu,pixels,analysis.width,analysis.height,columns,rows,config,source.width/cell.width*detail,source.height/cell.height*detail);
      }catch(error){/* Optional acceleration: keep the CPU output path available. */}
      let directionsByCell = edge&&!edgeVotes ? api.modules.asciiAnalysis.directions(pixels, analysis.width, analysis.height, columns, rows, config,source.width/cell.width*detail,source.height/cell.height*detail,surfaces) : null;
      lastAnalysisBackend=edge?(edgeVotes?'gpu':'cpu'):'none';
      const out = output.getContext('2d');
      const foreground = rgba(config.color || '#ffffff', config.colorAlpha), background = rgba(config.background || '#000000', config.originalBackground?0:config.backgroundAlpha);
      const stretch = config.stretch === true, scale = Math.min(cell.width / glyphs.width, cell.height / glyphs.height);
      const dw = stretch ? cell.width : glyphs.width * scale, dh = stretch ? cell.height : glyphs.height * scale;
      const ox = (cell.width - dw) / 2, oy = (cell.height - dh) / 2, area = glyphs.width * glyphs.height;
      let {colors,indices}=api.modules.asciiAnalysis.cells(pixels,alphaPixels,columns,rows,detail,glyphs,config,directionsByCell,surfaces);
      if(backend!=='cpu')try{if(paintGpu(output,surfaces,{columns,rows,cell},colors,indices,glyphs,{dw,dh,ox,oy,foreground,background,original:config.colorMode==='original'},edgeVotes)){lastBackend='gpu';surfaces.notePixels?.(analysis.width,analysis.height,1);surfaces.notePixels?.(columns,rows,1);return finish();}if(backend==='gpu')throw new Error('ASCII WebGL 不可用');}catch(error){if(backend==='gpu')throw error;}
      // A context may be lost after analysis succeeded. Rebuild CPU directions
      // before fallback, rather than drawing luminance-only glyphs for that frame.
      if(edgeVotes){
        directionsByCell=api.modules.asciiAnalysis.directions(pixels,analysis.width,analysis.height,columns,rows,config,source.width/cell.width*detail,source.height/cell.height*detail,surfaces);
        ({colors,indices}=api.modules.asciiAnalysis.cells(pixels,alphaPixels,columns,rows,detail,glyphs,config,directionsByCell,surfaces));lastAnalysisBackend='cpu';
      }
      lastBackend='cpu';const image=out.createImageData(source.width,source.height),to=image.data;
      for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
        const index=(row*columns+column)*4,alpha=indices[index+2]/255;if(!alpha)continue;
        const glyph=indices[index]+indices[index+1]*256,rgb=config.colorMode==='original'?colors.subarray(index,index+3):foreground;
        // Pixel centers determine membership in floating-point cells. Do not
        // round each cell boundary independently (that creates seams/drift).
        const x0 = Math.max(0, Math.ceil(column * cell.width - .5)), x1 = Math.min(source.width, Math.ceil((column + 1) * cell.width - .5));
        const y0 = Math.max(0, Math.ceil(row * cell.height - .5)), y1 = Math.min(source.height, Math.ceil((row + 1) * cell.height - .5));
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          const u = (x + .5 - column * cell.width - ox) / dw, v = (y + .5 - row * cell.height - oy) / dh;
          const mask = u >= 0 && u < 1 && v >= 0 && v < 1 ? glyphs.bytes[glyph * area + Math.floor(v * glyphs.height) * glyphs.width + Math.floor(u * glyphs.width)] / 255 : 0;
          const fa = mask * foreground[3], ba = background[3] * (1 - fa), a = fa + ba, p = (y * source.width + x) * 4;
          if (a) { to[p] = (rgb[0] * fa + background[0] * ba) / a; to[p+1] = (rgb[1] * fa + background[1] * ba) / a; to[p+2] = (rgb[2] * fa + background[2] * ba) / a; }
          to[p+3] = a * alpha * 255;
        }
      }
      out.putImageData(image, 0, 0); surfaces.notePixels?.(analysis.width, analysis.height, 1);surfaces.notePixels?.(columns,rows,1); surfaces.notePixels?.(source.width, source.height, 1);
      return finish();
    } catch (error) { surfaces.release(output); throw error; }
    finally { surfaces.release(analysis);surfaces.release(alphaSurface); }
  }
  api.modules.ascii = Object.freeze({ apply, prepare, atlas, geometry, chars, defaults:{characters:DEFAULT_CHARS, edgeCharacters:EDGE_CHARS},
    needsBuiltinFont,setBuiltinFont(family,id='builtin'){builtinFontFamilies[id]=family||null;},
    setBackend(value){backend=['auto','cpu','gpu'].includes(value)?value:'auto';},getLastBackend(){return lastBackend;},
    setAnalysisBackend(value){analysisBackend=value==='cpu'?'cpu':'auto';},getLastAnalysisBackend(){return lastAnalysisBackend;},
    analysisStatus(surfaces){const gpu=gpuCache.get(surfaces),state=gpu?.analysis;return Object.freeze({active:!!state,reason:gpu?.analysisFailure||null,contextLost:!!gpu?.gl.isContextLost(),textureBytes:state?state.width*state.height*28+state.columns*state.rows*4:0});}
  });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:68b-ascii-mapping.js> */

/* <vnext:69-scene-effects.js> */
/* ToSampool Runtime vNext source module: masked scene-level overlay and sampling stages. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
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
    const output=surfaces.acquire(source.width,source.height),out=output.getContext('2d');out.clearRect(0,0,output.width,output.height);out.drawImage(source,0,0);out.globalCompositeOperation=api.modules.blend.toCanvas(config.blend);out.drawImage(edge,0,0);out.globalCompositeOperation='source-over';surfaces.release(edge);return output;
  }
  function applyOne(source, id, config, scene, frame, surfaces, controllers, samplingSize) {
    let result;
    if (id === 'color-grade') result = colorGrade(source, config, surfaces,frame);
    else if (id === 'tint-overlay') result = api.modules.decorate.apply(source, { 'tint-overlay': config }, surfaces, frame);
    else if (id === 'texture-overlay') result = api.modules.decorate.apply(source, { 'texture-overlay': config }, surfaces, frame, samplingSize);
    else if (id === 'grain-overlay') result = api.modules.decorate.apply(source, { 'grain-overlay': config }, surfaces, frame);
    else if (id === 'masked-inner-light') return maskedInnerLight(source, config, scene, frame, surfaces);
    else if (id === 'crt-display') result = api.modules.crtScreen.apply(source,config,surfaces,frame);
    else if (id === 'ascii-mapping') result = api.modules.ascii.apply(source,config,surfaces,frame,samplingSize);
    else if (['color-map', 'noise-dither', 'threshold', 'offset-sampling', 'halftone', 'uneven-sampling', 'edge-dispersion'].includes(id)) result = api.modules.sampling.apply(source, Object.assign({ controllers: controllers || {} }, { [id]: config }), surfaces, frame.paletteCapture?Object.assign({},frame,{paletteTarget:{scope:'scene',ownerId:null}}):frame);
    else throw new Error(`Runtime vNext 尚未实现场景滤镜：${id}`);
    return compositeMasked(source, result, config.mask, scene, frame, surfaces);
  }
  function applyStage(source, stage, scene, frame, surfaces) {
    const group = stage === 'overlay' ? scene.sceneEffects.overlay : scene.sceneEffects.sample;
    const order = stage === 'overlay' ? ['color-grade', 'tint-overlay', 'texture-overlay', 'masked-inner-light', 'grain-overlay'] : ['color-map', 'noise-dither', 'threshold', 'offset-sampling', 'halftone', 'uneven-sampling', 'edge-dispersion', 'ascii-mapping', 'crt-display'];
    let current = source, count = 0, controllers = {};
    for (const [id, config] of Object.entries(group && group.controllers || {})) controllers[id] = frame.controllerValuesFor('scene', 'sample', id, config);
    // A scene-level sampling grid is independently visible.  With no other
    // sample effect it must still allocate a work surface and resample once.
    const hasTimedEffect=Object.entries(group||{}).some(([id,config])=>id!=='controllers'&&config&&config.enabled&&frame.effectValuesFor('scene',stage,id,config).enabled);
    const hasGridConsumer=Object.entries(group||{}).some(([id,config])=>!['controllers','crt-display','ascii-mapping'].includes(id)&&config&&config.enabled&&frame.effectValuesFor('scene',stage,id,config).enabled);
    if(stage==='sample'&&api.modules.sampling.hasBaseGrid({controllers})&&(!hasTimedEffect||!hasGridConsumer)){const next=api.modules.sampling.apply(current,{controllers},surfaces,frame);if(next!==current){if(current!==source)surfaces.release(current);current=next;}count+=1;}
    const sampleControllers=scene.sceneEffects&&scene.sceneEffects.sample&&scene.sceneEffects.sample.controllers||{},sampleGrid=sampleControllers['sampling-grid'],samplingSize=api.modules.sampling.gridSize({controllers:sampleGrid?{'sampling-grid':frame.controllerValuesFor('scene','sample','sampling-grid',sampleGrid)}:{}});
    for (const id of order) { const config = group && group[id]; if (!config || !config.enabled) continue; const timed = frame.effectValuesFor('scene', stage, id, config); if(!timed.enabled)continue; const next = applyOne(current, id, timed, scene, frame, surfaces, controllers, samplingSize); if (next !== current) { if (current !== source) surfaces.release(current); current = next; } count += 1; }
    return { surface: current, count };
  }
  function activeCount(scene,frame) {
    const effects = scene.sceneEffects || {};
    const count=(stage,group)=>Object.entries(group||{}).filter(([id,config])=>id!=='controllers'&&config&&config.enabled&&(!frame||frame.effectValuesFor('scene',stage,id,config).enabled)).length;
    return count('overlay',effects.overlay)+count('sample',effects.sample)+(api.modules.sampling.hasBaseGrid(effects.sample)?1:0);
  }
  api.modules.sceneEffects = Object.freeze({ applyStage, activeCount, colorGrade, maskedInnerLight });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:69-scene-effects.js> */

/* <vnext:69b-backend-capabilities.js> */
/* Host implementation evidence, not project data or a second effect registry. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext;
  const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
  const records=freeze({
    'sampling-grid':{conditions:['grid-alpha-keep'],evidence:['v4-gpu-player-lifecycle.mjs']},
    'tint-overlay':{conditions:['string-paint','blend-normal-screen-lighter'],evidence:['v4-gpu-player-tint.mjs'],cpuPreparation:['source-alpha-tint-table:1024-bytes-on-colour-or-alpha-change']},
    'noise-dither':{conditions:[],evidence:['v4-gpu-player-noise.mjs'],cpuPreparation:['integer-jump-table-on-initialize','rounding-table:65536-bytes-on-amount-change']},
    threshold:{conditions:[],evidence:['v4-gpu-player-threshold.mjs'],cpuPreparation:['js-luma-boundary-ties-on-threshold-change']},
    'uneven-sampling':{conditions:['field-wave-radial-or-supported-integer-noise','edge-protection-off'],evidence:['v4-gpu-player-lifecycle.mjs']},
    'edge-dispersion':{conditions:['reliable-integer-coordinate-range'],evidence:['v4-gpu-player-dispersion.mjs'],cpuPreparation:['luma-products:6144-bytes','rounding-table:65536-bytes-on-strength-change']}
  });
  const semantics=freeze({input:'canvas-rgba',workingAlpha:'premultiplied-rgba8',bounds:'scene-extent',mask:'existing-resolver-per-effect-upload',order:'scene-overlay-then-sample',output:'canvas2d',sourceGeneration:'canvas2d',explicitPixelReadback:false});
  const invalidation=freeze(['source-revision','evaluated-parameters','time','seed','size','preview-budget','context-generation']);
  // Shared shape for future host-reviewed effects/generators. Validation is
  // metadata validation only: it does not register code or grant GPU access.
  function declaration(value){
    if(!value||!['effect','controller','generator'].includes(value.target?.kind)||typeof value.target.id!=='string'||!value.target.id)throw new Error('Invalid backend capability target');
    if(!['canvas2d','webgl2-scene','webgl2-object','webgl2-path'].includes(value.backend))throw new Error('Invalid implementation backend');
    if(!Array.isArray(value.scopes)||!value.scopes.length||value.scopes.some(scope=>!['object','scene','path'].includes(scope)))throw new Error('Invalid capability scopes');
    if(!['experimental','verified','unverified'].includes(value.status))throw new Error('Invalid capability status');
    for(const key of ['conditions','invalidation','evidence'])if(!Array.isArray(value[key])||value[key].some(item=>typeof item!=='string'))throw new Error('Invalid capability '+key);
    if(!value.semantics||!value.cost||!value.acceptance)throw new Error('Missing capability semantics, cost or acceptance');
    if(value.status==='verified'&&!value.evidence.length)throw new Error('Verified capability requires evidence');
    return freeze(JSON.parse(JSON.stringify(value)));
  }
  function describe(id,scope){
    if(scope==='object'&&api.modules.objectGpu?.supported.includes(id))return freeze({
      target:{kind:'effect',id},implementation:'object-sampling-pilot/v2',backend:'webgl2-object',scope,status:'experimental',
      conditions:['explicit-object-pilot-policy','supported-complete-object-sampling-chain','effective-grid-one','alpha-keep','sample-last','canvas-projection-outline-prefix-only','no-color-grade-prefix','supported-raster-source-kind','no-repeat','no-scene-transition','no-scene-gpu-combination','no-palette-capture','host-frame-and-pixel-budget',...(records[id]?.conditions||[])],
      semantics:{input:'canvas-object-capsule',workingAlpha:'premultiplied-rgba8',bounds:'world-capsule-union',mask:'existing-canvas-prefix',order:'unchanged-pipeline-or-cpu-fallback',finalComposite:'existing-object-alpha-parent-alpha-blend',sourceGeneration:'canvas2d',explicitPixelReadback:false},
      invalidation,evidence:['tests/browser/v4-editor-object-gpu-pilot.mjs','tests/v4-object-gpu-pilot.mjs'],
      cpuPreparation:['existing-canvas-source-mask-projection-outline-in-authored-order','host-alpha-byte-calibration-on-first-use',...(records[id]?.cpuPreparation||[])],
      acceptance:{profile:'single-large-object-pilot',crossDevice:'unverified',editor:'targeted-fixture',export:'unverified',tauri:'unverified'},
      cost:{budget:api.modules.objectGpu.budget,workPixels:'actual-world-capsule',passes:'actual-plan-dependent',uploads:'source-per-attempt-plus-changed-numeric-tables',canvasOutputTransfers:1,explicitReadbackBytes:0,sourceVersionCache:false,gpuDeviceMs:null}
    });
    const record=records[id];
    if(!record||scope!=='scene')return null;
    return freeze({
      target:{kind:id==='sampling-grid'?'controller':'effect',id},implementation:'scene-gpu-executor/v1',backend:'webgl2-scene',scope,status:'experimental',
      conditions:[...record.conditions,'resample-extent-at-most-32768','device-max-texture-and-viewport','native-default-canvas-nearest-calibration'],semantics,invalidation,
      cpuPreparation:[...(record.cpuPreparation||[]),'native-nearest-coordinate-strips-on-context-or-size-change'],
      evidence:[...record.evidence,'v4-gpu-coordinate-probe.mjs','v4-gpu-native-nearest-lifecycle.mjs','v4-gpu-surface-lifecycle.mjs','v4-editor-gpu-performance.mjs'].map(file=>'tests/browser/'+file),
      acceptance:{profile:'existing-strict-alpha-and-byte-boundary-fixtures',crossDevice:'unverified',editor:'grid3-matrix-and-grid4-regression',nonDivisibleNearest:'calibrated-local-editor-fixtures',export:'unverified',tauri:'unverified'},
      cost:{workPixels:'source-and-per-effect-working-surfaces',passes:'actual-plan-dependent',uploads:'source-plus-each-range-plus-changed-numeric-tables',explicitReadbackBytes:0,calibrationReadback:'synthetic-numeric-axis-strips-on-initialize-not-artwork',canvasOutputTransfers:'one-per-output-side-unless-gpu-final-transition',explicitTextureBytes:'executor.stats().textureBytes',surfaceStrategy:'single-current-size-set-with-reusable-device',cpuPreparationMs:null,gpuDeviceMs:null}
    });
  }
  function diagnose(reason,context){
    const raw=String(reason||'unknown'),colon=raw.indexOf(':'),code=colon<0?raw:raw.slice(0,colon),detail=colon<0?null:raw.slice(colon+1),ctx=context||{};
    const semantic=code.startsWith('unsupported-'),idle=code==='no-supported-effect';
    return freeze({code,reason:raw,scope:ctx.scope||'scene',ownerId:ctx.ownerId||null,effectId:ctx.effectId||(code==='unsupported-effect'?detail:code.startsWith('unsupported-tint')?'tint-overlay':code.startsWith('unsupported-grid')?'sampling-grid':null),detail,category:idle?'idle':semantic?'unsupported-semantics':'device-or-execution',retryable:semantic||idle,recovery:semantic||idle?'reevaluate-next-frame':'clear-caches-or-recreate-player'});
  }
  function assess(scene,frame){
    // Actual executor remains the sole condition evaluator. No allocation or
    // WebGL availability probe is performed here; device state is unknown.
    const plan=api.modules.sceneGpu.plan(scene,frame);
    return freeze({requested:'gpu-experimental',decision:plan.reason?'cpu':'gpu-candidate',device:'unknown',diagnostic:plan.reason?diagnose(plan.reason):null,implementations:plan.reason?[]:plan.passes.map(pass=>describe(({tint:'tint-overlay',noise:'noise-dither',uneven:'uneven-sampling',dispersion:'edge-dispersion',grid:'sampling-grid'})[pass.kind]||pass.kind,'scene'))});
  }
  api.modules.backendCapabilities=Object.freeze({version:1,declaration,describe,diagnose,assess});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:69b-backend-capabilities.js> */

/* <vnext:69c-native-nearest.js> */
/* Numeric Canvas coordinate calibration. No artwork, project or frame cache. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext;
  function axis(from,to,vertical){
    const make=(w,h)=>{
      if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(w,h);
      if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
      throw new Error('native-nearest-calibration-unavailable');
    };
    const source=make(vertical?1:from,vertical?from:1),target=make(vertical?1:to,vertical?to:1);
    try{
      // Match surface-pool's default 2D contexts, not software/read-frequent ones.
      const input=source.getContext('2d'),output=target.getContext('2d');
      if(!input||!output)throw new Error('native-nearest-calibration-unavailable');
      const image=input.createImageData(source.width,source.height);
      for(let i=0;i<from;i++)image.data.set([i&255,i>>>8,0,255],i*4);
      input.putImageData(image,0,0);output.imageSmoothingEnabled=false;
      output.drawImage(source,0,0,target.width,target.height);
      const bytes=output.getImageData(0,0,target.width,target.height).data,map=new Uint32Array(to);
      let exceptions=0;
      for(let i=0;i<to;i++){
        const value=bytes[i*4]+bytes[i*4+1]*256;
        if(value>=from||bytes[i*4+2]!==0||bytes[i*4+3]!==255)throw new Error('native-nearest-calibration-invalid');
        map[i]=value;if(value!==Math.floor((2*i+1)*from/(2*to)))exceptions++;
      }
      return {map,exceptions};
    }finally{source.width=source.height=target.width=target.height=1;}
  }
  function create(width,height,lowWidth,lowHeight){
    for(const value of [width,height,lowWidth,lowHeight])if(!Number.isInteger(value)||value<1||value>32768)throw new Error('unsupported-resample-range');
    if(width===lowWidth&&height===lowHeight)return {data:null,exceptions:0,bytes:0};
    const rows=[axis(width,lowWidth,false),axis(height,lowHeight,true),axis(lowWidth,width,false),axis(lowHeight,height,true)];
    const exceptions=rows.reduce((n,row)=>n+row.exceptions,0),size=Math.max(width,height,lowWidth,lowHeight);
    if(!exceptions)return {data:null,exceptions:0,bytes:0};
    const data=new Uint32Array(size*4);rows.forEach((row,i)=>data.set(row.map,i*size));
    return {data,width:size,exceptions,bytes:data.byteLength};
  }
  api.modules.nativeNearest=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:69c-native-nearest.js> */

/* <vnext:69a-scene-gpu-executor.js> */
/* Opt-in scene GPU executor. Unsupported complete chains fall back before upload. */
(function (global) {
  'use strict';
  const api = global.ToSampoolRuntimeVNext;
  function fallback(reason) {
    const result={handled:false,reason};
    const capabilities=api.modules.backendCapabilities;
    if(capabilities)result.diagnostic=capabilities.diagnose(reason);
    return result;
  }
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const thresholdBoundaries=new Map();
  const tintTables=new Map();
  function tintTable(config){
    const opacity=clamp(Number.isFinite(+config.alpha)?+config.alpha:1,0,1),color=config.color||'#000000',key=JSON.stringify([color,opacity]);
    if(tintTables.has(key))return {key,data:tintTables.get(key)};
    // Source-in depends only on source Alpha. Preserve the host's CSS colour,
    // colour Alpha and globalAlpha rounding with a 256-pixel synthetic atlas.
    const atlas=canvas(256,1),ctx=atlas.getContext('2d'),image=ctx.createImageData(256,1);
    for(let a=0;a<256;a++)image.data.set([255,255,255,a],a*4);
    ctx.putImageData(image,0,0);ctx.globalCompositeOperation='source-in';ctx.globalAlpha=opacity;ctx.fillStyle=color;ctx.fillRect(0,0,256,1);
    const bytes=ctx.getImageData(0,0,256,1).data,data=new Uint8Array(1024);
    for(let a=0;a<256;a++){for(let k=0;k<3;k++)data[a*4+k]=Math.floor((bytes[a*4+k]*bytes[a*4+3]+127)/255);data[a*4+3]=bytes[a*4+3];}
    tintTables.set(key,data);if(tintTables.size>8)tintTables.delete(tintTables.keys().next().value);return {key,data};
  }
  let alphaDecodeBytes=null;
  let lumaProductBytes=null;
  function lumaProducts(){
    if(lumaProductBytes)return lumaProductBytes;
    // Store the actual JS-double products as unsigned integers in units of
    // 2^-56. GLSL then rounds each addition/subtraction to 53 significant bits.
    // This preserves the CPU's strict >24 contrast test, including grey ties.
    const data=new Uint32Array(256*3*2),weights=[.2126,.7152,.0722];
    for(let channel=0;channel<3;channel++)for(let c=0;c<256;c++){
      const value=BigInt((c*weights[channel])*2**56),at=(channel*256+c)*2;
      data[at]=Number(value&0xffffffffn);data[at+1]=Number(value>>32n);
    }
    lumaProductBytes=data;return data;
  }
  function alphaDecodeTable(){
    if(alphaDecodeBytes)return alphaDecodeBytes;
    // Calibrate Canvas's byte unpremultiplication once, without source images
    // or GPU readback. Half ties are host-dependent (round(c*255/a) is NOT
    // equivalent). Every valid premultiplied byte is represented in this atlas.
    const atlas=canvas(256,256),ctx=atlas.getContext('2d'),input=ctx.createImageData(256,256);
    for(let a=0;a<256;a++)for(let c=0;c<256;c++)input.data.set([c,c,c,a],(a*256+c)*4);
    ctx.putImageData(input,0,0);const output=ctx.getImageData(0,0,256,256).data,table=new Uint8Array(65536);
    for(let a=0;a<256;a++)for(let c=0;c<256;c++)table[a*256+Math.floor((c*a+127)/255)]=output[(a*256+c)*4];
    alphaDecodeBytes=table;return table;
  }
  function thresholdBoundary(config,time){
    const motion=config.motion||{},pulse=motion.enabled?(+motion.amount||0)*api.modules.motion.oscillate(motion,time,{stepped:true,frames:12}):0;
    const pivot=clamp((config.threshold==null?.5:+config.threshold)+pulse,0,1)*255,cutoff=Math.ceil(pivot*10000);
    const key=String(pivot);if(thresholdBoundaries.has(key))return thresholdBoundaries.get(key);
    const dark=[];
    // CPU uses JS doubles: at exact byte-luma ties its decimal additions can
    // fall just below the pivot. Enumerate ONLY those ties, not 16M colours.
    // 1063*r+3576*g+361*b=cutoff/2; inverse(3576 mod 361)=138.
    if(cutoff%2===0)for(let r=0;r<256;r++){
      const rhs=cutoff/2-1063*r,g=((rhs*138)%361+361)%361,b=(rhs-3576*g)/361;
      if(g<256&&b>=0&&b<256&&Number.isInteger(b)&&r*.2126+g*.7152+b*.0722<pivot)dark.push((r<<16)|(g<<8)|b);
    }
    const value={cutoff,dark},packed=new Int32Array(256).fill(-1);
    // At most one exact tie per red byte: a 1KB uniform table avoids a
    // per-pixel linear scan on large, flat fills at the threshold boundary.
    for(const code of dark)packed[code>>>16]=code;
    Object.defineProperty(value,'packed',{value:packed});thresholdBoundaries.set(key,value);
    if(thresholdBoundaries.size>16)thresholdBoundaries.delete(thresholdBoundaries.keys().next().value);return value;
  }
  function canvas(width, height) {
    if (typeof document !== 'undefined' && document.createElement) {
      const output = document.createElement('canvas'); output.width = width; output.height = height; return output;
    }
    return typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : null;
  }
  function plan(scene, frame) {
    let uneven = null, threshold = null, noiseDither = null, dispersion = null, tint = null;
    for (const stage of scene.sceneEffects.pipeline || ['overlay', 'sample']) {
      for (const [id, base] of Object.entries(scene.sceneEffects[stage] || {})) {
        if (id === 'controllers' || !base || !base.enabled) continue;
        const value = frame.effectValuesFor('scene', stage, id, base);
        if (!value.enabled) continue;
        if(stage==='overlay'&&id==='tint-overlay'){
          const mode=api.modules.blend.toCanvas(value.blend);
          if(!['source-over','screen','lighter'].includes(mode))return {reason:`unsupported-tint-blend:${value.blend}`};
          if(value.color!=null&&typeof value.color!=='string')return {reason:'unsupported-tint-paint'};
          tint=api.modules.decorate.animated(id,value,frame.time);continue;
        }
        if (stage !== 'sample' || !['noise-dither','threshold','uneven-sampling','edge-dispersion'].includes(id)) return { reason: `unsupported-effect:${id}` };
        if(id==='threshold')threshold=value;else if(id==='noise-dither')noiseDither=value;else if(id==='edge-dispersion')dispersion=value;else uneven=value;
      }
    }
    const raw = scene.sceneEffects.sample && scene.sceneEffects.sample.controllers || {};
    if (Object.keys(raw).some(id => id !== 'sampling-grid')) return { reason: 'unsupported-controller' };
    const gridConfig = raw['sampling-grid'] ? frame.controllerValuesFor('scene', 'sample', 'sampling-grid', raw['sampling-grid']) : {};
    if ((gridConfig.alphaMode || 'keep') !== 'keep') return { reason: 'unsupported-grid-alpha' };
    const grid = Math.max(1, Math.round(+gridConfig.size || 1)) * frame.preview.pixelDivMultiplier;
    if (!uneven && !threshold && !noiseDither && !dispersion && !tint && grid === 1) return { reason: 'no-supported-effect' };
    // (2*p+1)*from stays within signed highp int for extents <=32768.
    // This is a backend condition, never a restriction on product dimensions.
    if(scene.width>32768||scene.height>32768)return {reason:'unsupported-resample-range'};
    const field = uneven && uneven.field || {};
    if (uneven && !['wave', 'radial', 'noise'].includes(field.type || 'wave')) return { reason: 'unsupported-field' };
    const noiseScale=Math.max(4,+field.scale||48);
    if(field.type==='noise'&&(!Number.isInteger(noiseScale)||noiseScale>16777216))return {reason:'unsupported-noise-scale'};
    if (uneven && uneven.edge && (uneven.edge.mode || 'off') !== 'off') return { reason: 'unsupported-edge' };
    if(dispersion&&(!Number.isFinite(+dispersion.angle||0)||Math.max(+dispersion.distance||0,+dispersion.width||1)>16777216))return {reason:'unsupported-dispersion-range'};
    const boundary=threshold?thresholdBoundary(threshold,frame.time):null;
    // Match sceneEffects.applyStage's fixed order, not object insertion order.
    // Each card resamples and composites its OWN range before the next card.
    const passes=[];
    if(tint)passes.push({kind:'tint',config:tint});
    if(noiseDither)passes.push({kind:'noise',config:noiseDither});
    if(threshold)passes.push({kind:'threshold',config:threshold,boundary});
    if(uneven)passes.push({kind:'uneven',config:uneven});
    if(dispersion)passes.push({kind:'dispersion',config:dispersion});
    if(!passes.length||(tint&&passes.length===1&&grid>1))passes.push({kind:'grid',config:{}});
    return { grid, uneven, threshold, noiseDither, dispersion, tint, field, passes, count:passes.length };
  }
  const vertex = '#version 300 es\nin vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}';
  const alphaShader=`uniform highp usampler2D alphaBytes;
    ivec4 bytes(vec4 c){return ivec4(floor(c*255.0+.5));}
    ivec3 straight(ivec4 c){return ivec3(int(texelFetch(alphaBytes,ivec2(c.r,c.a),0).r),int(texelFetch(alphaBytes,ivec2(c.g,c.a),0).r),int(texelFetch(alphaBytes,ivec2(c.b,c.a),0).r));}
    vec4 premultiplied(ivec3 rgb,int a){return vec4(vec3((rgb*a+127)/255),float(a))/255.0;}`;
  const fieldFragment = `#version 300 es
    precision highp float;precision highp int;
    uniform sampler2D source;uniform vec2 size,center;uniform float scale,contrast,flow,amount,span,angle,waveSeed;
    uniform uint seed,tick;uniform int fieldType;out vec4 outputColor;
    uniform bool thresholding;uniform vec3 darkColor,lightColor;uniform int thresholdCutoff,tieCount;uniform ivec4 tieDarkByRed[64];
    ${alphaShader}
    float noise(uvec2 p){uint n=(p.x+1u)*374761393u^(p.y+1u)*668265263u^(seed+1u)*69069u^(tick+1u)*362437u;n=(n^(n>>13u))*1274126177u;return float(n^(n>>16u))/4294967296.0;}
    void main(){vec2 p=floor(vec2(gl_FragCoord.x,size.y-gl_FragCoord.y));float raw=.5;
      if(thresholding){ivec4 c=bytes(texture(source,vec2((p.x+.5)/size.x,1.0-(p.y+.5)/size.y)));ivec3 b=straight(c);int luma=b.r*2126+b.g*7152+b.b*722;bool bright=luma>=thresholdCutoff;if(luma==thresholdCutoff&&tieCount>0){int code=(b.r<<16)|(b.g<<8)|b.b;if(tieDarkByRed[b.r>>2][b.r&3]==code)bright=false;}outputColor=premultiplied(ivec3(floor((bright?lightColor:darkColor)*255.0+.5)),c.a);return;}
      if(fieldType==1)raw=.5+.5*sin(((p.x*cos(angle)+p.y*sin(angle))/scale-flow+waveSeed*.031)*6.28318530718);
      else if(fieldType==2)raw=.5+.5*sin((length(p-center)/scale-flow+waveSeed*.031)*6.28318530718);
      else if(fieldType==3)raw=noise(uvec2(ivec2(p)/int(scale)));
      int cell=1+int(floor(clamp(.5+(raw-.5)*contrast,0.0,1.0)*amount*span));vec2 q=vec2((ivec2(p)/cell)*cell);
      outputColor=texture(source,vec2((q.x+.5)/size.x,1.0-(q.y+.5)/size.y));}`;
  const nearestShader=`ivec2 nearestPixel(ivec2 p,ivec2 from,ivec2 to){return ((p*2+1)*from)/(to*2);}`;
  const mappedNearestShader=`uniform highp usampler2D nativeNearest;uniform ivec2 nearestLowExtent;
    ivec2 nearestPixel(ivec2 p,ivec2 from,ivec2 to){
      if(all(equal(from,to)))return p;
      int row=all(equal(to,nearestLowExtent))?0:2;
      return ivec2(int(texelFetch(nativeNearest,ivec2(p.x,row),0).r),int(texelFetch(nativeNearest,ivec2(p.y,row+1),0).r));
    }`;
  const resampleFragment = `#version 300 es
    precision highp float;precision highp int;
    uniform sampler2D source;uniform vec2 size;out vec4 outputColor;
    ${nearestShader}
    void main(){ivec2 from=textureSize(source,0);vec2 p=floor(vec2(gl_FragCoord.x,size.y-gl_FragCoord.y));ivec2 q=nearestPixel(ivec2(p),from,ivec2(size));outputColor=texelFetch(source,ivec2(q.x,from.y-1-q.y),0);}`;
  // A static GF(2) jump table maps a row's initial xorshift state directly to
  // byte N. It contains no random frames and is independent of seed/time.
  // Eight integer texture reads replace an O(x) sequential PRNG loop.
  const noiseFragment = `#version 300 es
    precision highp float;precision highp int;precision highp usampler2D;
    uniform sampler2D source;uniform usampler2D jumps,byteMap;uniform vec2 size;
    uniform uint seed,tick;uniform int grain,channels;uniform float amplitude;
    out vec4 outputColor;
    ${alphaShader}
    uint sampleByte(int x,int y,int channel){
      uint state=(seed+1u)*0x9e3779b1u^(tick+1u)*0x85ebca6bu^uint(y+1)*0xc2b2ae35u;
      if(state==0u)state=1u;uint value=0u;
      for(int block=0;block<8;block++){
        uvec4 basis=texelFetch(jumps,ivec2(x,channel*8+block),0);
        uint bits=(state>>uint(block*4))&15u;
        if((bits&1u)!=0u)value^=basis.x;if((bits&2u)!=0u)value^=basis.y;
        if((bits&4u)!=0u)value^=basis.z;if((bits&8u)!=0u)value^=basis.w;
      }return value&255u;
    }
    void main(){ivec2 p=ivec2(floor(vec2(gl_FragCoord.x,size.y-gl_FragCoord.y)));
      vec4 pixel=texelFetch(source,ivec2(p.x,int(size.y)-1-p.y),0);
      if(pixel.a==0.0||amplitude==0.0){outputColor=pixel;return;}
      ivec2 cell=p/grain;vec3 n=vec3(float(sampleByte(cell.x,cell.y,0)));
      if(channels==3){n.g=float(sampleByte(cell.x,cell.y,1));n.b=float(sampleByte(cell.x,cell.y,2));}
      ivec4 c=bytes(pixel);ivec3 b=straight(c);
      outputColor=premultiplied(ivec3(int(texelFetch(byteMap,ivec2(b.r,int(n.r)),0).r),int(texelFetch(byteMap,ivec2(b.g,int(n.g)),0).r),int(texelFetch(byteMap,ivec2(b.b,int(n.b)),0).r)),c.a);
    }`;
  const dispersionFragment=`#version 300 es
    precision highp float;precision highp int;precision highp usampler2D;
    uniform sampler2D source;uniform usampler2D lumaProducts,mixBytes;
    uniform ivec2 extent,delta;uniform int reach,edgeMode;uniform bool reverse,noOp;
    out vec4 outputColor;
    ${alphaShader}
    uvec2 add64(uvec2 a,uvec2 b){uint low=a.x+b.x;return uvec2(low,a.y+b.y+uint(low<a.x));}
    uvec2 rounded(uvec2 value){
      uint high=value.y;if(high==0u)return value;int top=0;
      if(high>=65536u){top+=16;high>>=16u;}if(high>=256u){top+=8;high>>=8u;}
      if(high>=16u){top+=4;high>>=4u;}if(high>=4u){top+=2;high>>=2u;}if(high>=2u)top++;
      int shift=top-20;if(shift<=0)return value;
      uint mask=(1u<<uint(shift))-1u,remainder=value.x&mask,midpoint=1u<<uint(shift-1);
      if(remainder>midpoint||(remainder==midpoint&&((value.x>>uint(shift))&1u)==1u))value=add64(value,uvec2(1u<<uint(shift),0u));
      value.x&=~mask;return value;
    }
    uvec2 luma(ivec3 c){uvec2 r=texelFetch(lumaProducts,ivec2(c.r,0),0).rg,g=texelFetch(lumaProducts,ivec2(c.g,1),0).rg,b=texelFetch(lumaProducts,ivec2(c.b,2),0).rg;return rounded(add64(rounded(add64(r,g)),b));}
    bool contrast(uvec2 a,uvec2 b){
      if(a.y<b.y||(a.y==b.y&&a.x<b.x)){uvec2 t=a;a=b;b=t;}
      uvec2 d=rounded(uvec2(a.x-b.x,a.y-b.y-uint(a.x<b.x)));
      return d.y>0x18000000u||(d.y==0x18000000u&&d.x>0u);
    }
    bool valid(ivec2 p){return p.x>=0&&p.y>=0&&p.x<extent.x&&p.y<extent.y;}
    ivec4 readAt(ivec2 p){return valid(p)?bytes(texelFetch(source,ivec2(p.x,extent.y-1-p.y),0)):ivec4(0);}
    int mixed(int a,int b){return int(texelFetch(mixBytes,ivec2(a,b),0).r);}
    void main(){
      ivec2 p=ivec2(floor(vec2(gl_FragCoord.x,float(extent.y)-gl_FragCoord.y)));ivec4 base=readAt(p);
      if(noOp){outputColor=vec4(base)/255.0;return;}
      ivec3 rgb=straight(base);uvec2 lum=edgeMode==1?uvec2(0u):luma(rgb);bool alphaEdge=false,contrastEdge=false;
      for(int i=0;i<4;i++){
        ivec2 q=p+(i==0?ivec2(-reach,0):i==1?ivec2(reach,0):i==2?ivec2(0,-reach):ivec2(0,reach));
        ivec4 next=readAt(q);if(abs(base.a-next.a)>8)alphaEdge=true;
        if(edgeMode!=1&&valid(q)&&contrast(lum,luma(straight(next))))contrastEdge=true;
      }
      bool edge=edgeMode==1?alphaEdge:edgeMode==2?contrastEdge:alphaEdge||contrastEdge;
      if(!edge){outputColor=vec4(base)/255.0;return;}
      ivec4 red=readAt(p+(reverse?-delta:delta)),blue=readAt(p+(reverse?delta:-delta));
      int r=red.a>0?straight(red).r:0,b=blue.a>0?straight(blue).b:0,a=mixed(base.a,max(base.a,max(red.a,blue.a)));
      outputColor=premultiplied(ivec3(mixed(rgb.r,r),rgb.g,mixed(rgb.b,b)),a);
    }`;
  const tintFragment=`#version 300 es
    precision highp float;precision highp int;precision highp usampler2D;
    uniform sampler2D source;uniform usampler2D tintBytes;uniform vec2 size;uniform bool tinting;out vec4 outputColor;
    void main(){vec4 c=texture(source,gl_FragCoord.xy/size);outputColor=tinting?vec4(texelFetch(tintBytes,ivec2(int(floor(c.a*255.0+.5)),0),0))/255.0:c;}`;
  const outputFragment = `#version 300 es
    precision highp float;precision highp int;uniform sampler2D base,result,rangeMask;uniform vec2 size;uniform bool masked,baseOnly;out vec4 outputColor;
    ${nearestShader}
    void main(){vec2 uv=gl_FragCoord.xy/size;if(baseOnly){outputColor=texture(base,uv);return;}ivec2 from=textureSize(result,0);vec2 p=floor(vec2(gl_FragCoord.x,size.y-gl_FragCoord.y));ivec2 q=nearestPixel(ivec2(p),from,ivec2(size));vec4 effect=texelFetch(result,ivec2(q.x,from.y-1-q.y),0);if(!masked){outputColor=effect;return;}
      ivec4 e=ivec4(floor(effect*255.0+.5));int m=int(floor(texture(rangeMask,uv).a*255.0+.5));
      outputColor=vec4((e*m+127)/255)/255.0;}`;
  // Match Canvas source-over, including transparent incoming/outgoing Scenes.
  const transitionFragment = `#version 300 es
    precision highp float;precision highp int;
    uniform sampler2D incoming,outgoing;uniform vec2 size;uniform float progress;
    uniform int mode,direction,cell;uniform uint seed;out vec4 outputColor;
    float hash(uvec2 p){uint n=(p.x+1u)*374761393u^(p.y+1u)*668265263u^(seed+1u)*69069u;n=(n^(n>>13u))*1274126177u;return float(n^(n>>16u))/4294967296.0;}
    void main(){vec2 uv=gl_FragCoord.xy/size,p=floor(vec2(gl_FragCoord.x,size.y-gl_FragCoord.y));float weight=1.0-progress;
      if(mode==1){if(direction==1)weight=p.x<ceil(size.x*(1.0-progress))?1.0:0.0;
        else if(direction==2)weight=p.y<ceil(size.y*(1.0-progress))?1.0:0.0;
        else if(direction==3)weight=p.y>=floor(size.y*progress)?1.0:0.0;
        else weight=p.x>=floor(size.x*progress)?1.0:0.0;}
      else if(mode==2)weight=hash(uvec2(ivec2(p)/cell))>progress?1.0:0.0;
      vec4 next=texture(incoming,uv),prev=texture(outgoing,uv)*weight;
      outputColor=prev+next*(1.0-prev.a);}`;
  function create() {
    let gpu = null, cachedKey = null, disabledReason = null;
    let contexts = 0, allocations = 0, disposals = 0, sourceUploads = 0, maskUploads = 0, hits = 0, noiseTableBuilds = 0, noiseByteMapBuilds = 0, surfaceRebuilds = 0;
    function dispose() {
      if (gpu) {
        for (const texture of gpu.textures) gpu.gl.deleteTexture(texture);
        for (const program of gpu.programs) gpu.gl.deleteProgram(program);
        gpu.gl.deleteBuffer(gpu.buffer); gpu.gl.deleteFramebuffer(gpu.fbo);
        gpu.gl.getExtension('WEBGL_lose_context')?.loseContext(); disposals += 1;
      }
      gpu = null; cachedKey = null; disabledReason = null;
    }
    function initialize(width, height) {
      const target = canvas(width, height), gl = target && target.getContext('webgl2', { alpha:true, antialias:false, premultipliedAlpha:true, preserveDrawingBuffer:true, depth:false });
      if (!gl || typeof gl.createShader !== 'function') throw new Error('webgl2-unavailable');
      const programs = [], textures = [];
      gpu = { canvas:target, gl, width:0, height:0, lowWidth:0, lowHeight:0, programs, textures, sizeTextures:new Set(), nearestPrograms:new Map(), validatedAttachments:new Set() };
      const compile = (type, text) => {
        const shader = gl.createShader(type); gl.shaderSource(shader, text); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const message = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(message); }
        return shader;
      };
      const program = fragment => {
        const shaders = [compile(gl.VERTEX_SHADER,vertex), compile(gl.FRAGMENT_SHADER,fragment)], result = gl.createProgram(); programs.push(result);
        for (const shader of shaders) gl.attachShader(result,shader); gl.linkProgram(result); for (const shader of shaders) gl.deleteShader(shader);
        if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result));
        return { program:result, uniforms:new Map() };
      };
      const texture = (w,h) => {
        const result = gl.createTexture(); textures.push(result); gpu.sizeTextures.add(result); gl.bindTexture(gl.TEXTURE_2D,result);
        for (const parameter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,parameter,gl.NEAREST);
        for (const parameter of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,parameter,gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null); allocations += 1; return result;
      };
      gpu.field = program(fieldFragment);
      gpu.makeTexture=texture;gpu.makeProgram=program;
      gpu.nearestProgram=(name,fragment)=>{
        const mapped=!!gpu.nativeNearest,key=name+(mapped?':mapped':':integer');
        if(!gpu.nearestPrograms.has(key))gpu.nearestPrograms.set(key,program(mapped?fragment.replace(nearestShader,mappedNearestShader):fragment));
        return gpu.nearestPrograms.get(key);
      };
      gpu.alphaBytes=gl.createTexture();textures.push(gpu.alphaBytes);allocations++;
      gl.bindTexture(gl.TEXTURE_2D,gpu.alphaBytes);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.R8UI,256,256,0,gl.RED_INTEGER,gl.UNSIGNED_BYTE,alphaDecodeTable());
      gpu.fbo = gl.createFramebuffer(); gpu.buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW); contexts += 1;
    }
    function resize(width,height,lowWidth,lowHeight){
      const {gl}=gpu,max=gl.getParameter(gl.MAX_TEXTURE_SIZE),viewport=gl.getParameter(gl.MAX_VIEWPORT_DIMS),bufferMax=gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
      if(width>max||height>max||lowWidth>max||lowHeight>max||width>viewport[0]||height>viewport[1]||width>bufferMax||height>bufferMax)throw new Error('webgl-surface-size-limit');
      const start=performance.now(),calibration=api.modules.nativeNearest.create(width,height,lowWidth,lowHeight),calibrationMs=performance.now()-start;
      if(calibration.data&&calibration.width>max)throw new Error('native-nearest-table-too-large');
      // Detach before deletion: an FBO attachment must not keep an old surface alive.
      gl.bindFramebuffer(gl.FRAMEBUFFER,gpu.fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,null,0);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      for(const texture of gpu.sizeTextures){gl.deleteTexture(texture);const index=gpu.textures.indexOf(texture);if(index>=0)gpu.textures.splice(index,1);}
      gpu.sizeTextures.clear();gpu.validatedAttachments.clear();cachedKey=null;
      for(const name of ['lowInput','lowOutput','base','mask','nativeNearest','incoming','outgoing','stageResult','stageResult2','tintWork','noiseJumps','resample'])delete gpu[name];
      gpu.noiseTableKey=null;gpu.noiseTableBytes=0;
      if(gpu.canvas.width!==width)gpu.canvas.width=width;if(gpu.canvas.height!==height)gpu.canvas.height=height;
      if(gl.drawingBufferWidth!==width||gl.drawingBufferHeight!==height)throw new Error('webgl-drawing-buffer-size-mismatch');
      Object.assign(gpu,{width,height,lowWidth,lowHeight,nearestBytes:calibration.bytes,nearestExceptions:calibration.exceptions,nearestPrepareMs:calibrationMs});
      gpu.lowInput=gpu.makeTexture(lowWidth,lowHeight);gpu.lowOutput=gpu.makeTexture(lowWidth,lowHeight);gpu.base=gpu.makeTexture(width,height);gpu.mask=gpu.makeTexture(width,height);
      if(calibration.data){
        gpu.nativeNearest=gl.createTexture();gpu.textures.push(gpu.nativeNearest);gpu.sizeTextures.add(gpu.nativeNearest);allocations++;
        gl.bindTexture(gl.TEXTURE_2D,gpu.nativeNearest);
        for(const parameter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.R32UI,calibration.width,4,0,gl.RED_INTEGER,gl.UNSIGNED_INT,calibration.data);
      }
      gpu.output=gpu.nearestProgram('output',outputFragment);gpu.surfacePrepareMs=performance.now()-start;surfaceRebuilds++;
    }
    function render(source, scene, frame, surfaces, targetCtx, options) {
      const profile=options&&options._sceneProfile;
      const now=()=>profile?performance.now():0;
      const record=(name,start)=>{if(profile)profile[name]=(profile[name]||0)+performance.now()-start;};
      let phaseStart=now();
      const selected = plan(scene,frame);
      if (selected.reason) return fallback(selected.reason);
      if (disabledReason) return fallback(disabledReason);
      const width=source.width,height=source.height,lowWidth=Math.ceil(width/selected.grid),lowHeight=Math.ceil(height/selected.grid);
      let work=null,range=null,initialized=false,surfacesRebuilt=false;
      try {
        if (!gpu) { initialize(width,height);initialized=true; }
        const { gl }=gpu;
        if (gl.isContextLost()) { disabledReason='webgl-context-lost'; return fallback(disabledReason); }
        if(gpu.width!==width||gpu.height!==height||gpu.lowWidth!==lowWidth||gpu.lowHeight!==lowHeight){resize(width,height,lowWidth,lowHeight);surfacesRebuilt=true;}
        const slot=options&&options._sceneGpuSlot;
        const key=!slot&&options && options.sceneSourceVersion!=null ? JSON.stringify([options.sceneSourceVersion,frame.time,width,height,selected,options.maskSourceQuality||'full']) : null;
        if (key!==null && key===cachedKey) {
          record('gpuPrepare',phaseStart);phaseStart=now();
          targetCtx.clearRect(0,0,width,height); targetCtx.drawImage(gpu.canvas,0,0); hits += 1;
          record('canvasOutput',phaseStart);
          return {handled:true,count:selected.count,cacheHit:true,uploads:0,passes:0,initialized:false,surfacesRebuilt:false};
        }
        const uniform=(entry,name)=>{if(!entry.uniforms.has(name))entry.uniforms.set(name,gl.getUniformLocation(entry.program,name));return entry.uniforms.get(name);};
        const bind=entry=>{gl.useProgram(entry.program);gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buffer);const at=gl.getAttribLocation(entry.program,'position');gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,2,gl.FLOAT,false,0,0);gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,gpu.alphaBytes);gl.uniform1i(uniform(entry,'alphaBytes'),5);};
        const bindNearest=entry=>{if(gpu.nativeNearest){gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,gpu.nativeNearest);gl.uniform1i(uniform(entry,'nativeNearest'),6);gl.uniform2i(uniform(entry,'nearestLowExtent'),gpu.lowWidth,gpu.lowHeight);}};
        const upload=(texture,image)=>{const start=now();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);record('gpuUpload',start);};
        record('gpuPrepare',phaseStart);phaseStart=now();
        const fixedRoles=options&&options.sceneSurfacePolicy==='fixed-roles';
        let input=source;
        if(selected.grid>1&&!selected.tint){work=fixedRoles?surfaces.acquireRole('gpu-work',lowWidth,lowHeight):surfaces.acquire(lowWidth,lowHeight);const ctx=work.getContext('2d');ctx.clearRect(0,0,lowWidth,lowHeight);ctx.imageSmoothingEnabled=false;ctx.drawImage(source,0,0,lowWidth,lowHeight);input=work;}
        record('sourceDownsample',phaseStart);
        upload(selected.tint?gpu.base:gpu.lowInput,input);sourceUploads += 1;let uploads=1+(initialized?1:0)+(surfacesRebuilt&&gpu.nativeNearest?1:0),passes=0,tick=0,samplingAmount=0;
        const attach=texture=>{
          if(!texture){gl.bindFramebuffer(gl.FRAMEBUFFER,null);return;}
          gl.bindFramebuffer(gl.FRAMEBUFFER,gpu.fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
          if(!gpu.validatedAttachments.has(texture)){
            if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('incomplete-framebuffer');
            gpu.validatedAttachments.add(texture);
          }
        };
        const colour=value=>{
          const hex=String(value||'#000000').replace('#',''),text=hex.length===3?hex.split('').map(c=>c+c).join(''):hex.padEnd(6,'0').slice(0,6);
          return [0,2,4].map(i=>(parseInt(text.slice(i,i+2),16)||0)/255);
        };
        let stageSource=gpu.base;
        for(let index=0;index<selected.passes.length;index++){
          const pass=selected.passes[index],config=pass.config,field=pass.kind==='uneven'?(config.field||{}):{},motion=config.motion||{};
          const mask=config.mask&&config.mask.type!=='none'?config.mask:null;
          phaseStart=now();
          if(index>0){
            // CPU applies the grid separately for every card. Keep the full
            // previous card result, then resample it, never fuse across a mask.
            if(!gpu.resample)gpu.resample=gpu.nearestProgram('resample',resampleFragment);
            attach(gpu.lowInput);gl.viewport(0,0,lowWidth,lowHeight);bind(gpu.resample);
            bindNearest(gpu.resample);
            gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,stageSource);
            gl.uniform1i(uniform(gpu.resample,'source'),0);gl.uniform2f(uniform(gpu.resample,'size'),lowWidth,lowHeight);gl.drawArrays(gl.TRIANGLES,0,3);passes++;
          }
          record('gpuSubmit',phaseStart);
          if(mask){
            phaseStart=now();
            if(!range)range=fixedRoles?surfaces.acquireRole('gpu-range',width,height):surfaces.acquire(width,height);
            const ctx=range.getContext('2d');ctx.clearRect(0,0,width,height);ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
            if(!api.modules.masks.apply(range,mask,{x:0,y:0,w:width,h:height},scene,frame,surfaces))throw new Error('unsupported-mask');
            record('maskPrepare',phaseStart);upload(gpu.mask,range);maskUploads++;uploads++;
            if(index===0&&!selected.tint){upload(gpu.base,source);sourceUploads++;uploads++;}
          }
          if(pass.kind==='tint'){
            if(!gpu.tint)gpu.tint=gpu.makeProgram(tintFragment);
            if(!gpu.tintWork)gpu.tintWork=gpu.makeTexture(width,height);
            const start=now(),table=tintTable(config);
            if(table.key!==gpu.tintTableKey){
              if(!gpu.tintBytes){gpu.tintBytes=gl.createTexture();gpu.textures.push(gpu.tintBytes);allocations++;}
              gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,gpu.tintBytes);
              for(const parameter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.NEAREST);
              gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8UI,256,1,0,gl.RGBA_INTEGER,gl.UNSIGNED_BYTE,table.data);gpu.tintTableKey=table.key;uploads++;
            }
            record('tintTablePrepare',start);phaseStart=now();
            attach(gpu.tintWork);gl.viewport(0,0,width,height);bind(gpu.tint);
            gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,stageSource);gl.uniform1i(uniform(gpu.tint,'source'),0);
            gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,gpu.tintBytes);gl.uniform1i(uniform(gpu.tint,'tintBytes'),3);gl.uniform2f(uniform(gpu.tint,'size'),width,height);
            gl.uniform1i(uniform(gpu.tint,'tinting'),0);gl.drawArrays(gl.TRIANGLES,0,3);passes++;
            gl.enable(gl.BLEND);const mode=api.modules.blend.toCanvas(config.blend);
            if(mode==='screen')gl.blendFuncSeparate(gl.ONE,gl.ONE_MINUS_SRC_COLOR,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
            else gl.blendFunc(gl.ONE,mode==='lighter'?gl.ONE:gl.ONE_MINUS_SRC_ALPHA);
            gl.uniform1i(uniform(gpu.tint,'tinting'),1);gl.drawArrays(gl.TRIANGLES,0,3);passes++;gl.disable(gl.BLEND);
          }else if(pass.kind==='noise'){
            if(!gpu.noise)gpu.noise=gpu.makeProgram(noiseFragment);
            const amplitude=clamp(+config.amount||0,0,100)*2.55;
            if(gpu.noiseAmplitude!==amplitude){
              // Preserve JS-double + Uint8ClampedArray rounding, including
              // near-half ties at amount=50 which a following threshold amplifies.
              // This 64KB arithmetic LUT contains no source pixels/noise frames.
              const start=now(),data=new Uint8ClampedArray(256*256);
              for(let n=0;n<256;n++)for(let value=0;value<256;value++)data[n*256+value]=clamp(value+(n/127.5-1)*amplitude,0,255);
              if(!gpu.noiseByteMap){gpu.noiseByteMap=gl.createTexture();gpu.textures.push(gpu.noiseByteMap);allocations++;}
              gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,gpu.noiseByteMap);
              for(const parameter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.NEAREST);
              gl.texImage2D(gl.TEXTURE_2D,0,gl.R8UI,256,256,0,gl.RED_INTEGER,gl.UNSIGNED_BYTE,data);
              gpu.noiseAmplitude=amplitude;uploads++;noiseByteMapBuilds++;record('noiseByteMapPrepare',start);
            }
            const grain=Math.max(1,Math.min(16,Math.round(+config.size||1))),channels=config.colorMode==='rgb'?3:1,cells=Math.ceil(lowWidth/grain),tableKey=`${cells}:${channels}`;
            if(gpu.noiseTableKey!==tableKey){
              const start=now(),data=new Uint8Array(cells*channels*32),basis=Uint32Array.from({length:32},(_,bit)=>(1<<bit)>>>0);
              for(let x=0;x<cells;x++)for(let channel=0;channel<channels;channel++)for(let bit=0;bit<32;bit++){
                let v=basis[bit];v^=v<<13;v^=v>>>17;v^=v<<5;basis[bit]=v>>>0;
                // Only the output byte is used; retain full states solely while
                // constructing later powers. RGBA8UI is one quarter of RGBA32UI.
                data[((channel*8+(bit>>2))*cells+x)*4+(bit&3)]=v&255;
              }
              if(!gpu.noiseJumps){gpu.noiseJumps=gl.createTexture();gpu.textures.push(gpu.noiseJumps);gpu.sizeTextures.add(gpu.noiseJumps);allocations++;}
              gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,gpu.noiseJumps);
              for(const parameter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.NEAREST);
              for(const parameter of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.CLAMP_TO_EDGE);
              gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8UI,cells,channels*8,0,gl.RGBA_INTEGER,gl.UNSIGNED_BYTE,data);
              gpu.noiseTableKey=tableKey;gpu.noiseTableBytes=data.byteLength;uploads++;noiseTableBuilds++;record('noiseJumpPrepare',start);
            }
            phaseStart=now();attach(gpu.lowOutput);gl.viewport(0,0,lowWidth,lowHeight);bind(gpu.noise);
            gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,gpu.lowInput);gl.uniform1i(uniform(gpu.noise,'source'),0);
            gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,gpu.noiseJumps);gl.uniform1i(uniform(gpu.noise,'jumps'),3);
            gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,gpu.noiseByteMap);gl.uniform1i(uniform(gpu.noise,'byteMap'),4);
            const period=Math.max(.001,+motion.period||1),steps=Math.max(1,Math.min(120,Math.round(+motion.steps||12))),phase=((frame.time/period)%1+1)%1;
            const noiseTick=motion.enabled&&motion.type==='noise-refresh'?Math.min(steps-1,Math.floor(phase*steps)):0;
            gl.uniform2f(uniform(gpu.noise,'size'),lowWidth,lowHeight);gl.uniform1i(uniform(gpu.noise,'grain'),grain);gl.uniform1i(uniform(gpu.noise,'channels'),channels);
            gl.uniform1ui(uniform(gpu.noise,'seed'),Math.round(+config.seed||0)>>>0);gl.uniform1ui(uniform(gpu.noise,'tick'),noiseTick>>>0);
            gl.uniform1f(uniform(gpu.noise,'amplitude'),amplitude);
            gl.drawArrays(gl.TRIANGLES,0,3);passes++;
          }else if(pass.kind==='dispersion'){
            if(!gpu.dispersion)gpu.dispersion=gpu.makeProgram(dispersionFragment);
            const integerTexture=(old,w,h,internal,format,type,data,unit)=>{
              const texture=old||gl.createTexture();if(!old){gpu.textures.push(texture);allocations++;}
              gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);
              for(const parameter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.NEAREST);
              for(const parameter of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.CLAMP_TO_EDGE);
              gl.texImage2D(gl.TEXTURE_2D,0,internal,w,h,0,format,type,data);uploads++;return texture;
            };
            phaseStart=now();
            if(!gpu.lumaProducts)gpu.lumaProducts=integerTexture(null,256,3,gl.RG32UI,gl.RG_INTEGER,gl.UNSIGNED_INT,lumaProducts(),3);
            const strength=clamp(config.strength==null?1:+config.strength,0,1);
            if(gpu.dispersionStrength!==strength){
              const data=new Uint8Array(65536);
              for(let b=0;b<256;b++)for(let a=0;a<256;a++)data[b*256+a]=Math.round(a+(b-a)*strength);
              gpu.dispersionMix=integerTexture(gpu.dispersionMix,256,256,gl.R8UI,gl.RED_INTEGER,gl.UNSIGNED_BYTE,data,4);gpu.dispersionStrength=strength;
            }
            record('dispersionTablePrepare',phaseStart);phaseStart=now();
            attach(gpu.lowOutput);gl.viewport(0,0,lowWidth,lowHeight);bind(gpu.dispersion);
            gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,gpu.lowInput);gl.uniform1i(uniform(gpu.dispersion,'source'),0);
            gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,gpu.lumaProducts);gl.uniform1i(uniform(gpu.dispersion,'lumaProducts'),3);
            gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,gpu.dispersionMix);gl.uniform1i(uniform(gpu.dispersion,'mixBytes'),4);
            const distance=Math.max(0,Math.round(+config.distance||0)),angle=(+config.angle||0)*Math.PI/180,dx=Math.round(Math.cos(angle)*distance),dy=Math.round(Math.sin(angle)*distance);
            gl.uniform2i(uniform(gpu.dispersion,'extent'),lowWidth,lowHeight);gl.uniform2i(uniform(gpu.dispersion,'delta'),dx,dy);
            gl.uniform1i(uniform(gpu.dispersion,'reach'),Math.max(1,distance+Math.max(1,Math.round(+config.width||1))-1));
            gl.uniform1i(uniform(gpu.dispersion,'edgeMode'),{contour:1,contrast:2}[config.source]||0);
            gl.uniform1i(uniform(gpu.dispersion,'reverse'),config.order==='bgr'?1:0);gl.uniform1i(uniform(gpu.dispersion,'noOp'),!distance||!strength||(!dx&&!dy)?1:0);
            gl.drawArrays(gl.TRIANGLES,0,3);passes++;
          }else{
          phaseStart=now();attach(gpu.lowOutput);gl.viewport(0,0,lowWidth,lowHeight);bind(gpu.field);
          gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,gpu.lowInput);gl.uniform1i(uniform(gpu.field,'source'),0);gl.uniform2f(uniform(gpu.field,'size'),lowWidth,lowHeight);
          const animated=pass.kind==='uneven'&&motion.enabled&&motion.type==='uneven-motion',steps=Math.max(1,Math.round(+motion.steps||24));
          tick=animated&&+motion.flowSpeed?Math.floor(frame.time/Math.max(.001,+motion.period||3)*steps):0;
          const tide=animated?1+Math.sin(frame.time/Math.max(.001,+motion.period||3)*Math.PI*2)*clamp(+motion.tideAmount||0,0,1):1;
          const values={scale:Math.max(4,+field.scale||48),contrast:clamp(field.contrast==null?.5:+field.contrast,0,1),flow:tick/steps*(+motion.flowSpeed||0),amount:field.enabled?clamp((+config.amount||0)*tide,0,1):0,span:Math.max(1,Math.max(2,Math.round(+config.coarseness||5))-1),angle:(+field.direction||0)*Math.PI/180,waveSeed:+field.seed||1};
          samplingAmount=values.amount;
          for(const [name,value] of Object.entries(values))gl.uniform1f(uniform(gpu.field,name),value);
          gl.uniform2f(uniform(gpu.field,'center'),clamp(field.centerX==null?.5:+field.centerX,0,1)*lowWidth,clamp(field.centerY==null?.5:+field.centerY,0,1)*lowHeight);
          gl.uniform1ui(uniform(gpu.field,'seed'),(+field.seed||1)>>>0);gl.uniform1ui(uniform(gpu.field,'tick'),tick>>>0);gl.uniform1i(uniform(gpu.field,'fieldType'),field.enabled?({wave:1,radial:2,noise:3}[field.type||'wave']):0);
          gl.uniform1i(uniform(gpu.field,'thresholding'),pass.kind==='threshold'?1:0);
          gl.uniform3f(uniform(gpu.field,'darkColor'),...colour(config.dark));gl.uniform3f(uniform(gpu.field,'lightColor'),...colour(config.light));
          const boundary=pass.boundary||{cutoff:0,dark:[]};
          gl.uniform1i(uniform(gpu.field,'thresholdCutoff'),boundary.cutoff);gl.uniform1i(uniform(gpu.field,'tieCount'),boundary.dark.length);
          if(boundary.dark.length)gl.uniform4iv(uniform(gpu.field,'tieDarkByRed[0]'),boundary.packed);
          gl.drawArrays(gl.TRIANGLES,0,3);passes++;
          }
          let destination=null;
          if(index<selected.passes.length-1){
            // Alternate full-size intermediates so the third card never reads
            // the texture currently attached as its output (feedback loop).
            const name=index%2?'stageResult2':'stageResult';
            if(!gpu[name])gpu[name]=gpu.makeTexture(width,height);destination=gpu[name];
          }else if(slot){
            if(!['incoming','outgoing'].includes(slot))throw new Error('invalid-transition-slot');
            if(!gpu[slot])gpu[slot]=gpu.makeTexture(width,height);destination=gpu[slot];
          }
          attach(destination);gl.viewport(0,0,width,height);bind(gpu.output);
          bindNearest(gpu.output);
          for(const [unit,texture,name] of [[0,pass.kind==='tint'?gpu.tintWork:gpu.lowOutput,'result'],[1,stageSource,'base'],[2,gpu.mask,'rangeMask']]){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(uniform(gpu.output,name),unit);}
          gl.uniform2f(uniform(gpu.output,'size'),width,height);gl.uniform1i(uniform(gpu.output,'masked'),mask?1:0);
          if(mask){
            gl.uniform1i(uniform(gpu.output,'baseOnly'),1);gl.drawArrays(gl.TRIANGLES,0,3);passes++;
            gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
          }
          gl.uniform1i(uniform(gpu.output,'baseOnly'),0);gl.drawArrays(gl.TRIANGLES,0,3);passes++;
          if(mask)gl.disable(gl.BLEND);
          stageSource=destination;record('gpuSubmit',phaseStart);
        }
        phaseStart=now();
        // Deferred transition textures are not visible yet. The optional final
        // check covers both sides before any Canvas output, preserving same-frame
        // CPU fallback without synchronizing between the two scene submissions.
        if(!(slot&&options.sceneGpuValidation==='frame-end')&&gl.getError()!==gl.NO_ERROR)throw new Error('webgl-render-error');
        record('gpuValidation',phaseStart);phaseStart=now();
        if(!slot){targetCtx.clearRect(0,0,width,height);targetCtx.drawImage(gpu.canvas,0,0);}cachedKey=key;
        record('canvasOutput',phaseStart);
        const result={handled:true,count:selected.count,cacheHit:false,uploads,passes,fieldTick:tick,samplingAmount,initialized,surfacesRebuilt,surfacePrepareMs:surfacesRebuilt?gpu.surfacePrepareMs:0,nearestCalibration:{bytes:gpu.nearestBytes,exceptions:gpu.nearestExceptions,prepareMs:surfacesRebuilt?gpu.nearestPrepareMs:0}};
        if(options&&options.sceneSurfaceTrace)result.surfaceTrace={source:surfaces.describe(source),work:surfaces.describe(work),range:surfaces.describe(range)};
        return result;
      } catch(error) {
        const reason=String(error.message||error);dispose();disabledReason=reason;return fallback(reason);
      } finally { if(work)surfaces.release(work);if(range)surfaces.release(range); }
    }
    function composeTransition(state,targetCtx,options){
      if(!gpu||!gpu.incoming||!gpu.outgoing||disabledReason)return false;
      const profile=options&&options._sceneProfile;
      const record=(name,start)=>{if(profile)profile[name]=(profile[name]||0)+performance.now()-start;};
      let phaseStart=profile?performance.now():0;
      try{
        const gl=gpu.gl;if(gl.isContextLost())throw new Error('webgl-context-lost');
        const entry=gpu.transition||(gpu.transition=gpu.makeProgram(transitionFragment));
        const uniform=name=>{if(!entry.uniforms.has(name))entry.uniforms.set(name,gl.getUniformLocation(entry.program,name));return entry.uniforms.get(name);};
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,gpu.width,gpu.height);gl.useProgram(entry.program);
        gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buffer);const at=gl.getAttribLocation(entry.program,'position');gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,2,gl.FLOAT,false,0,0);
        for(const [unit,name] of [[0,'incoming'],[1,'outgoing']]){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,gpu[name]);gl.uniform1i(uniform(name),unit);}
        gl.uniform2f(uniform('size'),gpu.width,gpu.height);gl.uniform1f(uniform('progress'),state.progress);
        gl.uniform1i(uniform('mode'),{fade:0,wipe:1,dissolve:2}[state.type]);gl.uniform1i(uniform('direction'),{right:0,left:1,up:2,down:3}[state.direction]||0);
        gl.uniform1i(uniform('cell'),Math.max(1,Math.round(+state.config.cell||Math.max(2,Math.min(gpu.width,gpu.height)/36))));gl.uniform1ui(uniform('seed'),Math.round(+state.config.seed||13)>>>0);
        gl.drawArrays(gl.TRIANGLES,0,3);record('gpuTransitionSubmit',phaseStart);phaseStart=profile?performance.now():0;
        if(gl.getError()!==gl.NO_ERROR)throw new Error('webgl-transition-error');
        record('gpuValidation',phaseStart);phaseStart=profile?performance.now():0;
        targetCtx.clearRect(0,0,gpu.width,gpu.height);targetCtx.drawImage(gpu.canvas,0,0);cachedKey=null;record('canvasOutput',phaseStart);return true;
      }catch(error){const reason=String(error.message||error);dispose();disabledReason=reason;return false;}
    }
    function stats(){
      return {contexts,allocations,disposals,surfaceRebuilds,sourceUploads,maskUploads,cacheHits:hits,noiseTableBuilds,noiseByteMapBuilds,
        liveTextures:gpu?gpu.textures.length:0,liveSurfaceTextures:gpu?gpu.sizeTextures.size:0,programCount:gpu?gpu.programs.length:0,
        nearestCalibrationBytes:gpu?gpu.nearestBytes:0,contextLost:!!(gpu&&gpu.gl.isContextLost()),
        textureBytes:gpu?4*(gpu.width*gpu.height*(2+(gpu.incoming?1:0)+(gpu.outgoing?1:0)+(gpu.stageResult?1:0)+(gpu.stageResult2?1:0)+(gpu.tintWork?1:0))+gpu.lowWidth*gpu.lowHeight*2)+(gpu.nearestBytes||0)+(gpu.noiseTableBytes||0)+(gpu.noiseByteMap?65536:0)+(gpu.lumaProducts?6144:0)+(gpu.dispersionMix?65536:0)+(gpu.tintBytes?1024:0)+65536:0};
    }
    function renderEvaluatedSample(source,group,frame,surfaces,targetCtx){
      const entries=Object.entries(group||{}).filter(([id,c])=>id!=='controllers'&&c?.enabled);
      // Host admission decides the supported object chain. The same scene
      // planner then preflights every pass before allocation/upload.
      if(entries.some(([,c])=>c.mask?.type&&c.mask.type!=='none'))return fallback('unsupported-object-card-mask');
      const carrier={width:source.width,height:source.height,sceneEffects:{overlay:{},sample:group}};
      const evaluated={time:frame.time,preview:frame.preview,effectValuesFor:(_scope,_owner,_id,value)=>value,controllerValuesFor:(_scope,_owner,_id,value)=>value};
      return render(source,carrier,evaluated,surfaces,targetCtx,{});
    }
    return Object.freeze({ render, renderEvaluatedSample, composeTransition, dispose, invalidateSource(){cachedKey=null;}, stats });
  }
  api.modules.sceneGpu = Object.freeze({create,plan});
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:69a-scene-gpu-executor.js> */

/* <vnext:69d-object-gpu-pilot.js> */
/* Host-only admission and session budget. Uses existing GPU kernels, no UI state. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext;
  const budget=Object.freeze({minPixels:131072,maxPixels:1048576,maxExtent:4096,maxObjects:1,maxTextureBytes:24*1024*1024});
  const supported=Object.freeze(['noise-dither','threshold','edge-dispersion']);
  function effectIds(group){return supported.filter(id=>group?.[id]?.enabled);}
  function assess(entity,group,frame,bounds,prefix){
    if(!['image','vector','rect','ellipse','poly'].includes(entity.type))return 'unsupported-object-kind';
    const stages=entity.effects?.pipeline||['mask','decorate','sample'];
    if(stages.indexOf('sample')!==stages.length-1)return 'unsupported-object-sample-order';
    // These stages still render on Canvas before the upload. Admit only the
    // prefixes covered by the actual editor comparisons, not all decoration.
    if(Object.entries(prefix?.decorate||entity.effects?.decorate||{}).some(([id,c])=>c?.enabled&&!['projection','outline'].includes(id)))return 'unsupported-object-decorate-prefix';
    const grade=(prefix?.formation||entity.effects?.formation||{})['color-grade'];
    if(grade?.enabled&&(+grade.hue||+grade.brightness||+grade.contrast||+grade.saturation))return 'unsupported-object-formation-prefix';
    if(frame.paletteCapture)return 'unsupported-object-palette-capture';
    const controllers=group.controllers||{};
    if(Object.keys(controllers).some(id=>id!=='sampling-grid'))return 'unsupported-object-controller';
    if(api.modules.sampling.gridSize(group)*frame.preview.pixelDivMultiplier!==1)return 'unsupported-object-pilot-grid';
    if((controllers['sampling-grid']?.alphaMode||'keep')!=='keep')return 'unsupported-object-grid-alpha';
    const active=Object.entries(group).filter(([id,c])=>id!=='controllers'&&c?.enabled);
    if(!active.length||active.some(([id])=>!supported.includes(id)))return 'unsupported-object-sampling-chain';
    if(active.some(([,c])=>c.mask?.type&&c.mask.type!=='none'))return 'unsupported-object-card-mask';
    const scroll=frame.valuesFor(entity).anim?.scroll;
    if(scroll?.repeat!==false&&Number.isFinite(+scroll?.speed)&&+scroll.speed!==0)return 'unsupported-object-repeat';
    const pixels=bounds.w*bounds.h;
    if(pixels<budget.minPixels)return 'object-budget-too-small';
    // Conservative bound: two intermediate full-size outputs plus numeric
    // tables (including RGB jump powers). Existing executor caches are bounded.
    const textureEstimate=(active.length>1?24:16)*pixels+524288+96*bounds.w;
    if(pixels>budget.maxPixels||bounds.w>budget.maxExtent||bounds.h>budget.maxExtent||textureEstimate>budget.maxTextureBytes)return 'object-budget-too-large';
    return null;
  }
  function create(){
    const executor=api.modules.sceneGpu.create();let used=false,blocked=null,report=null;
    function beginFrame(scene,frame,options){
      used=false;
      blocked=options?.sceneGpu?'unsupported-object-scene-gpu-combination':
        (scene.timeline?.scenes||[]).some(s=>s.transition?.type&&s.transition.type!=='none')?'unsupported-object-scene-transition':null;
      report={requested:'gpu-object-pilot',attempted:0,handled:0,cpu:0,sourcePixels:0,uploads:0,passes:0,initialized:false,surfacesRebuilt:false,surfacePrepareMs:0,rows:[],truncated:0};
    }
    function record(entity,reason,result,bounds,group){
      if(reason)report.cpu++;else report.handled++;
      const row={ownerId:entity.id,backend:reason?'cpu':'gpu-object-sampling',effects:effectIds(group),reason:reason||null};
      if(bounds){row.bounds={...bounds};if(!reason)report.sourcePixels+=bounds.w*bounds.h;}
      if(reason){row.diagnostic=api.modules.backendCapabilities?.diagnose(reason,{scope:'object',ownerId:entity.id,effectId:row.effects.length===1?row.effects[0]:null});if(reason.startsWith('object-'))row.diagnostic=Object.assign({},row.diagnostic,{category:'host-budget',retryable:true,recovery:'reevaluate-next-frame'});}
      if(report.rows.length<24)report.rows.push(row);else report.truncated++;
      if(result){report.uploads+=result.uploads||0;report.passes+=result.passes||0;report.initialized||=!!result.initialized;report.surfacesRebuilt||=!!result.surfacesRebuilt;report.surfacePrepareMs+=result.surfacePrepareMs||0;}
    }
    function sample(source,entity,group,frame,bounds,surfaces,prefix){
      const reason=blocked||assess(entity,group,frame,bounds,prefix)||(used?'object-frame-budget-used':null);
      if(reason){record(entity,reason,null,bounds,group);return null;}
      used=true;report.attempted++;
      const output=surfaces.acquire(source.width,source.height);
      try{
        // This adapter consumes already evaluated object parameters. It does not
        // reinterpret them as scene tracks or retain an object/source frame key.
        const result=executor.renderEvaluatedSample(source,group,frame,surfaces,output.getContext('2d'));
        if(!result.handled){record(entity,result.reason,result,bounds,group);surfaces.release(output);return null;}
        record(entity,null,result,bounds,group);return output;
      }catch(error){surfaces.release(output);throw error;}
    }
    return Object.freeze({beginFrame,sample,invalidateSource:()=>executor.invalidateSource(),dispose:()=>executor.dispose(),snapshot:()=>Object.assign({},executor.stats(),report,{budget,rows:report?report.rows.slice():[],reason:report?.handled?null:report?.rows[0]?.reason||'no-object-sampling-candidate'})});
  }
  api.modules.objectGpu=Object.freeze({budget,supported,effectIds,assess,create});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:69d-object-gpu-pilot.js> */

/* <vnext:70-object-composer.js> */
/* ToSampool Runtime vNext source module: fast path now; capsule path lands in R2. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const effectEntries = group => Object.entries(group || {}).filter(([key, value]) => key !== 'controllers' && value && value.enabled);
  const visibleFormationEntries = group => effectEntries(group).filter(([id, config]) => id !== 'color-grade' || !!(+config.hue || +config.brightness || +config.contrast || +config.saturation));
  function timedGroup(frame, entity, group) {
    const output = Object.assign({}, group || {});
    for (const [id, config] of Object.entries(group||{}))if(id!=='controllers'&&config)output[id]=config.enabled?frame.effectValuesFor('object',entity.id,id,config):config;
    if (group && group.controllers) {
      output.controllers = {};
      for (const [id, config] of Object.entries(group.controllers)) output.controllers[id] = frame.controllerValuesFor('object', entity.id, id, config);
    }
    return output;
  }
  function effectsEnabled(entity,frame,scene) {
    const effects = entity.effects;
    if (!effects) return false;
    const base=!!(effects.mask && effects.mask.type !== 'none' || visibleFormationEntries(effects.formation).length || effectEntries(effects.decorate).length || effectEntries(effects.sample).length || api.modules.sampling.hasBaseGrid(effects.sample));
    const tracks=scene&&scene.timeline&&scene.timeline.tracks;
    if(!frame||!tracks)return base;
    const timed=['formation','decorate','sample'].some(stage=>Object.keys(effects[stage]||{}).some(id=>id!=='controllers'&&tracks[`effect:object:${entity.id}:${id}`]));
    if(!timed)return base;
    const formation=timedGroup(frame,entity,effects.formation),decorate=timedGroup(frame,entity,effects.decorate),sample=timedGroup(frame,entity,effects.sample);
    return !!(effects.mask && effects.mask.type !== 'none' || visibleFormationEntries(formation).length || effectEntries(decorate).length || effectEntries(sample).length || api.modules.sampling.hasBaseGrid(sample));
  }
  function boundsFor(values, padding, localBounds) {
    const local=localBounds||{x:0,y:0,w:values.w,h:values.h},matrix = values.worldMatrix || api.modules.frame.matrixFor(values), points = [[local.x, local.y], [local.x+local.w, local.y], [local.x+local.w, local.y+local.h], [local.x, local.y+local.h]].map(([x, y]) => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]]), xs = points.map(point => point[0]), ys = points.map(point => point[1]), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
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
  function capsulePlan(scene, entity, frame) {
    const values = frame.valuesFor(entity), effects = entity.effects || {}, formation = timedGroup(frame, entity, effects.formation), decorate = timedGroup(frame, entity, effects.decorate), sample = timedGroup(frame, entity, effects.sample), localBounds=api.modules.content.localBounds(entity,values,frame), bounds = boundsFor(values, Math.max(api.modules.decorate.padding(decorate),api.modules.sampling.padding(sample)),localBounds);
    const ascii=sample['ascii-mapping'];
    if(ascii&&ascii.enabled){
      // Capsules already use axis-aligned world-space sampling. Keep that
      // contract, but anchor whole cells to the rounded object origin rather
      // than to a shadow/part-dependent capsule minimum.
      const matrix=values.worldMatrix||api.modules.frame.matrixFor(values),cell=api.modules.ascii.geometry(ascii,api.modules.sampling.gridSize(sample),ascii.glyphAtlas||{width:8,height:8});
      const anchorX=Math.floor(matrix[4]),anchorY=Math.floor(matrix[5]),right=bounds.x+bounds.w,bottom=bounds.y+bounds.h;
      // A cell larger than the whole object must not allocate cell-sized
      // empty padding (size is intentionally an extensible numeric input).
      if(cell.width<=bounds.w)bounds.x=Math.floor(anchorX+Math.floor((bounds.x-anchorX)/cell.width)*cell.width);
      if(cell.height<=bounds.h)bounds.y=Math.floor(anchorY+Math.floor((bounds.y-anchorY)/cell.height)*cell.height);
      bounds.w=Math.max(1,Math.ceil(right-bounds.x));bounds.h=Math.max(1,Math.ceil(bottom-bounds.y));
    }
    return {values,effects,formation,decorate,sample,bounds};
  }
  function createCapsule(scene, entity, frame, stats, surfaces, objectSession) {
    const {values,effects,formation,decorate,sample,bounds}=capsulePlan(scene,entity,frame);
    let capsule = surfaces.acquire(bounds.w, bounds.h), local = capsule.getContext('2d');
    if (!local) throw new Error('对象视觉胶囊没有 2D 上下文');
    // A recycled surface may previously have been a nearest-neighbour sample
    // output. Source content must match its first draw, not inherit that state.
    local.imageSmoothingEnabled = true;
    local.clearRect(0, 0, bounds.w, bounds.h);
    local.save(); local.translate(-bounds.x, -bounds.y);
    api.modules.content.draw(local, scene, entity, values, frame, { x:bounds.x, y:bounds.y, deferComposite:true, surfaces });
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
          const decorated = api.modules.decorate.apply(capsule, decorate, surfaces, frame, api.modules.sampling.gridSize(sample));
          if (decorated !== capsule) { surfaces.release(capsule); capsule = decorated; }
        }
      }
      if (stage === 'sample') {
          const entries = effectEntries(sample), hasGrid = api.modules.sampling.hasBaseGrid(sample);
        if (entries.length || hasGrid) {
          const accelerated=objectSession&&objectSession.sample(capsule,entity,sample,frame,bounds,surfaces,{formation,decorate});
          const sampled = accelerated||api.modules.sampling.apply(capsule, sample, surfaces, frame.paletteCapture?Object.assign({},frame,{paletteTarget:{scope:'object',ownerId:entity.id}}):frame); if (sampled !== capsule) { surfaces.release(capsule); capsule = sampled; }
        }
      }
    }
    return { capsule, bounds };
  }
  function drawCapsule(ctx, scene, entity, frame, stats, surfaces, objectSession) {
    const rendered = createCapsule(scene, entity, frame, stats, surfaces, objectSession);
    return drawCapsuleResult(ctx, rendered.capsule, rendered.bounds, stats, surfaces, frame.valuesFor(entity));
  }
  function drawCapsuleResult(ctx, capsule, bounds, stats, surfaces, values) {
    ctx.save();ctx.globalAlpha*=((values&&values.parentAlpha)==null?1:values.parentAlpha)*(values&&values.alpha==null?1:values.alpha);ctx.globalCompositeOperation=api.modules.blend.toCanvas(values&&values.blend);ctx.drawImage(capsule, bounds.x, bounds.y);ctx.restore(); surfaces.release(capsule); stats.capsuleObjects += 1;
  }
  function draw(ctx, scene, entity, frame, stats, surfaces, objectSession) {
    const values = frame.valuesFor(entity);
    if (entity.type === 'group' || entity.hidden || values.parentHidden || values.timelineVisible === false) return;
    const repeats = repeatOffsets(scene, entity, values);
    // A primitive resets its own Canvas composite mode while painting.  A
    // non-normal object blend therefore needs one isolated source image: all
    // parts are composed together first, then blended with the scene once.
    const objectBlend=api.modules.blend.toCanvas(values.blend);
    const layeredPattern=api.modules.pathGenerators?.active(values)||(values.parts||[]).some(p=>api.modules.pathGenerators?.active(p)||p.recipe?.definition?.format==='tosampool-pattern-generator/v1'||p.geometrySnapshot?.paintPlan),patternOpacity=layeredPattern&&((values.parentAlpha??1)*(values.alpha??1)!==1);
    if (effectsEnabled(entity,frame,scene) || objectBlend!=='source-over' || patternOpacity) {
      try {
        if (!repeats) drawCapsule(ctx, scene, entity, frame, stats, surfaces, objectSession);
        else { const rendered=createCapsule(scene, entity, frame, stats, surfaces, objectSession);ctx.save();ctx.globalAlpha*=((values.parentAlpha)==null?1:values.parentAlpha)*(values.alpha==null?1:values.alpha);ctx.globalCompositeOperation=api.modules.blend.toCanvas(values.blend);for(const offset of repeats){const world=worldOffset(values,offset);ctx.drawImage(rendered.capsule,rendered.bounds.x+world.x,rendered.bounds.y+world.y);}ctx.restore();surfaces.release(rendered.capsule);stats.capsuleObjects+=1; }
      }
      catch (error) { stats.unsupportedEffects.push(entity.id); throw error; }
      return;
    }
    if (!repeats) api.modules.content.draw(ctx, scene, entity, values, frame,{surfaces});
    else for (const offset of repeats) api.modules.content.draw(ctx, scene, entity, Object.assign({}, values, { x:(+values.x || 0)+offset.x, y:(+values.y || 0)+offset.y }), frame,{surfaces});
    stats.directObjects += 1;
  }
  api.modules.objects = Object.freeze({ draw, effectsEnabled, boundsFor, createCapsule, capsuleBounds:(scene,entity,frame)=>capsulePlan(scene,entity,frame).bounds });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:70-object-composer.js> */

/* <vnext:74-particle-births.js> */
/* Immutable birth lattices: Step count/life changes do not rewrite survivors. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext;
  function parameters(values){const p=values.particle||{};return{count:Math.max(0,Math.min(600,Math.round(+p.count||0))),life:Math.max(.001,+p.life||2)};}
  function motion(p,slot,seed,age,life,out={}){
    const hash=salt=>api.modules.sampling.hash(slot,salt,seed|0,0),angle=((+p.direction||0)+(hash(1)*2-1)*(+p.spread||0)/2)*Math.PI/180,speed=Math.max(0,+p.speed||0),sizeVar=Math.max(0,Math.min(1,+p.sizeVar||0));
    out.dx=Math.cos(angle)*speed*age+(+p.wind||0)*age*age/2;out.dy=Math.sin(angle)*speed*age+(+p.gravity||0)*age*age/2;
    out.scale=Math.max(.01,+p.size||1)*(1+(hash(4)*2-1)*sizeVar);out.opacity=Math.max(0,Math.min(1,p.alpha==null?1:+p.alpha))*(p.fade===false?1:1-age/life);
    out.spin=((+p.spin||0)+(+p.spinSpeed||0)*age+(hash(5)*2-1)*(+p.spinVar||0))*Math.PI/180;return out;
  }
  function create(scene,emitter){
    const track=scene.timeline?.tracks?.[emitter.id]||scene.timeline?.tracks?.['entity:'+emitter.id],cuts=new Set([0]);
    for(const segment of track?.segments||[])if(segment.type==='linear'){
      const affected=Object.entries({...segment.values,...segment.from,...segment.to}).some(([key,value])=>['particle.count','particle.life'].includes(key)||key==='particle'&&value&&('count'in value||'life'in value));
      if(affected&&(!Array.isArray(segment.linearKeys)||segment.linearKeys.some(key=>['particle.count','particle.life','particle'].includes(key))))throw Error('粒子数量和寿命仅支持Step，不能使用Linear出生时序');
    }
    for(const segment of [...track?.segments||[],...scene.timeline?.scenes||[]])for(const f of segment.f||[])if(f>=0&&f<1)cuts.add(f);
    const groups=new Map();for(const f of cuts){const p=parameters(api.modules.frame.create(scene,f*scene.loop).valuesFor(emitter));if(p.count)groups.set(p.count+':'+p.life,p);}
    function candidates(time){
      const out=[];
      for(const [key,p]of groups){const dt=p.life/p.count,start=Math.floor((time-p.life)/dt+1e-9)+1,end=Math.floor(time/dt+1e-9);
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end))throw Error('粒子出生时钟超出安全整数精度，请缩短周期或增大寿命');
        for(let n=start;n<=end;n++){out.push({id:key+':'+n,birthTime:n*dt,life:p.life,count:p.count,ordinal:n,slot:(n%p.count+p.count)%p.count});if(out.length>16384)throw Error('粒子出生批次超过16384候选预算，请减少数量／寿命时序组合');}
      }return out.sort((a,b)=>a.birthTime-b.birthTime||a.id.localeCompare(b.id));
    }
    return Object.freeze({candidates,parameters});
  }
  api.modules.particleBirths=Object.freeze({create,parameters,motion});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:74-particle-births.js> */

/* <vnext:74b-layer-fragments.js> */
/* Burst fragments: one isolated source snapshot, shared pixels and deterministic motion. */
(function(global){
 'use strict';
 const api=global.ToSampoolRuntimeVNext;
 function create(scene,surfaces,sources){
  const cache=new Map();let pixels=0,work=null;
  function clear(){for(const v of cache.values())surfaces.release(v.canvas);cache.clear();pixels=0;work=null;}
  function obtain(emitter,stats){
   if(cache.has(emitter.id))return cache.get(emitter.id);
   const p=emitter.particle,start=+p.startTime||0,frame=api.modules.frame.create(scene,start,{pixelDivMultiplier:1}),v=frame.valuesFor(emitter),params={...v.particle},size=Math.max(1,Math.round(+p.cellSize||32));let context,instances,capture,canvas;
   try{
    context=sources.begin(frame,stats,{});instances=api.modules.pathInstances.begin(scene,frame,stats,surfaces);
    capture=api.modules.maskSources.obtain(scene,frame,surfaces,p.sourceId,'alpha',null,'full');const entry=capture.entry,w=entry.canvas.width,h=entry.canvas.height;
    if(w*h>16777216)throw Error('图层切片来源超过16MP预算');
    canvas=surfaces.acquire(w,h);const c=canvas.getContext('2d',{willReadFrequently:true});c.clearRect(0,0,w,h);c.drawImage(entry.canvas,0,0);
    const rgba=c.getImageData(0,0,w,h).data,cells=[],seed=params.seed==null?1:+params.seed;
    for(let y=0,index=0;y<h;y+=size)for(let x=0;x<w;x+=size,index++){
     const cw=Math.min(size,w-x),ch=Math.min(size,h-y);let visible=false;
     for(let yy=y;yy<y+ch&&!visible;yy++)for(let xx=x;xx<x+cw;xx++)if(rgba[(yy*w+xx)*4+3]){visible=true;break;}
     if(!visible)continue;
     const m0=api.modules.particleBirths.motion(params,index,seed,0,1,{}),m1=api.modules.particleBirths.motion(params,index,seed,1,1,{});
     cells.push({x,y,w:cw,h:ch,vx:m1.dx-(+params.wind||0)/2,vy:m1.dy-(+params.gravity||0)/2,scale:m0.scale,spin:m0.spin});
     if(cells.length>16384)throw Error('图层切片超过16384，请增大切片尺寸');
    }
    while(pixels+w*h>16777216&&cache.size){const [key,old]=cache.entries().next().value;cache.delete(key);pixels-=old.canvas.width*old.canvas.height;surfaces.release(old.canvas);}
    const value={canvas,cells,bounds:entry.bounds,matrix:v.worldMatrix.slice(),params,start};cache.set(emitter.id,value);pixels+=w*h;canvas=null;stats.particleLayerBuilds=(stats.particleLayerBuilds||0)+1;return value;
   }finally{if(canvas)surfaces.release(canvas);capture?.release();instances?.release();context?.end();}
  }
  function draw(output,emitter,frame,stats,range){
   const layer=obtain(emitter,stats),p=layer.params,life=Math.max(.001,+p.life||2),age=Math.max(0,frame.time-layer.start);if(age>=life)return;
   const current=frame.valuesFor(emitter),M=layer.matrix,alpha=(current.parentAlpha??1)*current.alpha*(p.alpha??1)*(p.fade===false?1:1-age/life),ax=(+p.wind||0)*age*age/2,ay=(+p.gravity||0)*age*age/2,spinSpeed=(+p.spinSpeed||0)*Math.PI/180;
   // A dedicated CPU surface keeps overlapping translucent fragments stable
   // when the host Canvas changes acceleration after screenshots/readback.
   if(!work){if(scene.width*scene.height>16777216)throw Error('图层切片画布超过16MP预算');work=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(scene.width,scene.height):document.createElement('canvas');work.width=scene.width;work.height=scene.height;}
   const ctx=work.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,work.width,work.height);
   ctx.save();try{
    ctx.globalCompositeOperation='source-over';ctx.imageSmoothingEnabled=false;ctx.transform(...M);
    for(const cell of layer.cells){const dx=cell.vx*age+ax,dy=cell.vy*age+ay,x=layer.bounds.x+cell.x+dx,y=layer.bounds.y+cell.y+dy,cx=x+cell.w/2,cy=y+cell.h/2,opacity=alpha*range.at(M[0]*cx+M[2]*cy+M[4],M[1]*cx+M[3]*cy+M[5]);if(opacity<=0)continue;ctx.globalAlpha=opacity;const spin=cell.spin+spinSpeed*age;
     if(!spin&&cell.scale===1&&emitter.particle.fragmentShape!=='circle')ctx.drawImage(layer.canvas,cell.x,cell.y,cell.w,cell.h,Math.round(x),Math.round(y),cell.w,cell.h);
     else{ctx.save();ctx.translate(cx,cy);ctx.rotate(spin);ctx.scale(cell.scale,cell.scale);if(emitter.particle.fragmentShape==='circle'){ctx.beginPath();ctx.arc(0,0,Math.min(cell.w,cell.h)/2,0,Math.PI*2);ctx.clip();}ctx.drawImage(layer.canvas,cell.x,cell.y,cell.w,cell.h,-cell.w/2,-cell.h/2,cell.w,cell.h);ctx.restore();}stats.particlesDrawn++;
    }
    stats.particleLayerCells=layer.cells.length;
   }finally{ctx.restore();}
   output.save();try{output.globalCompositeOperation=api.modules.blend.toCanvas(current.blend);output.drawImage(work,0,0);}finally{output.restore();}
  }
  return Object.freeze({draw,clear});
 }
 api.modules.layerFragments=Object.freeze({version:2,create});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:74b-layer-fragments.js> */

/* <vnext:74c-layer-stream.js> */
/* Continuous local-image particles. One texture/distribution per birth-time batch. */
(function(global){
 'use strict';const api=global.ToSampoolRuntimeVNext;
 function create(scene,surfaces,sources,sampler){
  const batches=new Map(),staticSources=new Set();let pixels=0,work=null;
  const keyFor=(id,stamp)=>JSON.stringify([id,stamp]);
  function stampFor(config,time){const fps=Math.max(1,Math.min(30,+config.sourceFps||12));return config.sampleTime==='fixed'?(+config.startTime||0):Math.floor(time*fps+1e-9)/fps;}
  function retain(emitter,events){const needed=new Set(events.map(e=>keyFor(emitter.id,stampFor(emitter.particle,e.birthTime))));if(events.length&&staticSources.has(emitter.id))needed.add(keyFor(emitter.id,'static'));for(const [key,b]of batches)if(b.ownerId===emitter.id&&!needed.has(key)){batches.delete(key);pixels-=b.canvas.width*b.canvas.height;}}
  function clear(){batches.clear();staticSources.clear();pixels=0;work=null;}
  function batch(emitter,time,stats){
   const config=emitter.particle,stamp=stampFor(config,time);let key=keyFor(emitter.id,staticSources.has(emitter.id)?'static':stamp);
   if(batches.has(key)){const value=batches.get(key);batches.delete(key);batches.set(key,value);return value;}
   const frame=api.modules.frame.create(scene,stamp,{pixelDivMultiplier:1});let context,instances,capture,range,canvas;
   try{
    context=sources.begin(frame,stats,{});instances=api.modules.pathInstances.begin(scene,frame,stats,surfaces);
    capture=api.modules.maskSources.obtain(scene,frame,surfaces,config.sourceId,'alpha',null,'full');const e=capture.entry,w=e.canvas.width,h=e.canvas.height;
    // Animated masks/emitters can change a static image's allowed distribution.
    const hasRange=emitter.particle.emissionRange&&emitter.particle.emissionRange.type!=='none';
    if(e.static&&!hasRange){staticSources.add(emitter.id);key=keyFor(emitter.id,'static');}
    if(w*h>16777216)throw Error('图层取样来源超过16MP预算');
    if(pixels+w*h>16777216)throw Error('存活图层粒子的来源缓存超过16MP，请降低来源刷新率、缩小来源或选择固定时刻取样');
    // Set CPU residency on the first context request. A pooled Canvas may
    // already have a GPU context; re-requesting options cannot change it.
    canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):document.createElement('canvas');canvas.width=w;canvas.height=h;
    const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(e.canvas,0,0);
    const rgba=c.getImageData(0,0,w,h).data,data=new Uint8Array(w*h),mask=frame.valuesFor(emitter).particle?.emissionRange;
    if(mask&&mask.type!=='none')range=sampler.prepare(mask,emitter,frame,stats,true);
    for(let i=0;i<data.length;i++)data[i]=Math.round(rgba[i*4+3]*(range?range.at(e.bounds.x+i%w+.5,e.bounds.y+Math.floor(i/w)+.5):1));
    const value={ownerId:emitter.id,canvas,bounds:{...e.bounds},distribution:api.modules.weightedDistribution.create({w,h,data}),stamp};
    batches.set(key,value);pixels+=w*h;canvas=null;stats.particleTextureBatchBuilds=(stats.particleTextureBatchBuilds||0)+1;return value;
   }finally{range?.release();capture?.release();instances?.release();context?.end();}
  }
  function pick(emitter,time,u,v,stats){const b=batch(emitter,time,stats),cell=b.distribution.pick(u,v);return cell?{position:[b.bounds.x+cell.x+.5,b.bounds.y+cell.y+.5],sampleTime:b.stamp}:null;}
  function draw(output,emitter,frame,stats,particles,range){
   if(!particles.length)return;
   if(!work){if(scene.width*scene.height>16777216)throw Error('图层粒子画布超过16MP预算');work=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(scene.width,scene.height):document.createElement('canvas');work.width=scene.width;work.height=scene.height;}
   const c=work.getContext('2d',{willReadFrequently:true}),values=frame.valuesFor(emitter),alpha=(values.parentAlpha??1)*values.alpha,size=Math.max(1,Math.round(+emitter.particle.cellSize||32));c.clearRect(0,0,work.width,work.height);c.save();
   try{c.imageSmoothingEnabled=false;
    for(const p of particles){const opacity=p.opacity*range.at(p.x,p.y);if(opacity<=0)continue;const b=batch(emitter,p.sampleTime,stats),sx=Math.round(p.origin[0]-b.bounds.x-size/2),sy=Math.round(p.origin[1]-b.bounds.y-size/2);
     c.save();try{c.globalAlpha=opacity;c.translate(Math.round(p.x),Math.round(p.y));c.transform(p.matrix[0],p.matrix[1],p.matrix[2],p.matrix[3],0,0);c.rotate(p.spin);c.scale(p.scale,p.scale);if(emitter.particle.fragmentShape==='circle'){c.beginPath();c.arc(0,0,size/2,0,Math.PI*2);c.clip();}c.drawImage(b.canvas,sx,sy,size,size,-size/2,-size/2,size,size);}finally{c.restore();}stats.particlesDrawn++;
    }
   }finally{c.restore();}
   output.save();try{output.globalAlpha*=alpha;output.globalCompositeOperation=api.modules.blend.toCanvas(values.blend);output.drawImage(work,0,0);}finally{output.restore();}
  }
  return Object.freeze({pick,draw,clear,retain});
 }
 api.modules.layerStream=Object.freeze({version:1,create});
})(typeof window!=='undefined'?window:globalThis);
/* </vnext:74c-layer-stream.js> */

/* <vnext:75-particle-renderer.js> */
/* ToSampool Runtime vNext source module: deterministic shared-sprite particle emitters. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const hash = (index, salt, seed) => api.modules.sampling.hash(index, salt, seed | 0, 0);
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const positive = (value, fallback) => Math.max(1, finite(value, fallback));
  const sessions=new WeakMap(),keyFrame=frame=>frame?._maskSourceFrame||frame;
  function create(scene,surfaces,sourceSession){
    const ownedSources=!sourceSession,maskSources=sourceSession||api.modules.maskSources.create(scene,surfaces),sampler=api.modules.maskSampler.create(scene,surfaces),schedules=new Map(),births=new Map(),layers=api.modules.layerFragments.create(scene,surfaces,maskSources);
    const stream=api.modules.layerStream.create(scene,surfaces,maskSources,sampler);
    function remember(key,value){births.set(key,value);while(births.size>8192)births.delete(births.keys().next().value);return value;}
    function begin(frame,stats,options={}){const key=keyFrame(frame),previous=sessions.get(key);sessions.set(key,{evaluate:(emitter)=>evaluate(emitter,frame,stats,options),drawLayer:layers.draw,drawStream:stream.draw,display:(mask,emitter,current,drawStats)=>sampler.prepare(mask,emitter,current,drawStats,true)});return{end(){if(previous)sessions.set(key,previous);else sessions.delete(key);}};}
    function evaluate(emitter,frame,stats,options){
      let schedule=schedules.get(emitter.id);if(!schedule){schedule=api.modules.particleBirths.create(scene,emitter);schedules.set(emitter.id,schedule);}
      const time=frame.time,frames=new Map(),at=t=>{if(!frames.has(t))frames.set(t,api.modules.frame.create(scene,t,{pixelDivMultiplier:1}));return frames.get(t);},list=[];
      const events=schedule.candidates(time);if(emitter.particle.mode==='layer'&&emitter.particle.layerEmission==='continuous')stream.retain(emitter,events);
      for(const event of events){
        stats.particleBirthCandidates=(stats.particleBirthCandidates||0)+1;
        const key=emitter.id+'|'+event.id+'|'+(options.maskSourceQuality||'configured');let record;
        if(births.has(key)){record=births.get(key);stats.particleBirthHits=(stats.particleBirthHits||0)+1;}
        else{
          const birthFrame=at(event.birthTime),values=birthFrame.valuesFor(emitter),p=values.particle||emitter.particle||{},actual=api.modules.particleBirths.parameters(values);
          record=null;
          if(actual.count===event.count&&actual.life===event.life&&!values.parentHidden&&values.timelineVisible!==false){
            if(emitter.particle.mode==='layer'&&emitter.particle.layerEmission==='continuous'){
              const seed=Number.isFinite(+p.seed)?+p.seed:1,picked=stream.pick(emitter,event.birthTime,hash(event.slot,2,seed),hash(event.slot,3,seed),stats);
              if(picked)record={...event,...picked,matrix:values.worldMatrix.slice(0,4),particle:p,seed};
            }else{
            let sourceContext=null,instances=null,range=null;const subStats={};
            try{
              if(p.emissionRange?.type==='element'){sourceContext=maskSources.begin(birthFrame,subStats,{...options,_maskSourceObjectSession:null});instances=api.modules.pathInstances.begin(scene,birthFrame,subStats,surfaces);}
              range=sampler.prepare(p.emissionRange,emitter,birthFrame,stats);
              const seed=Number.isFinite(+p.seed)?+p.seed:1,position=range.pick(hash(event.slot,2,seed),hash(event.slot,3,seed),hash(event.slot,7,seed),hash(event.slot,8,seed));
              if(position)record={...event,position,matrix:values.worldMatrix.slice(0,4),particle:p,seed};
            }finally{
              range?.release();instances?.release();sourceContext?.end();
              for(const field of ['maskSourceBuilds','maskSourceHits','maskSourceMs','maskSourcePixels','maskSourceDraws'])if(subStats[field])stats[field]=(stats[field]||0)+subStats[field];
            }
            }
          }
          remember(key,record);stats.particleBirthBuilds=(stats.particleBirthBuilds||0)+1;
        }
        if(!record)continue;
        const age=time-record.birthTime,M=record.matrix,{dx,dy,scale,opacity,spin}=api.modules.particleBirths.motion(record.particle,record.slot,record.seed,age,record.life);
        const x=record.position[0]+M[0]*dx+M[2]*dy,y=record.position[1]+M[1]*dx+M[3]*dy;
        if(opacity>0&&age>=-1e-9&&age<record.life-1e-9)list.push({id:key,birthTime:record.birthTime,age,x,y,matrix:M,scale,opacity,spin,origin:record.position,sampleTime:record.sampleTime});
        if(list.length>4096)throw Error('存活粒子超过4096预算，请减少数量／寿命时序重叠');
      }
      return list;
    }
    return Object.freeze({begin,evaluate,drawLayer:layers.draw,drawStream:stream.draw,display:(mask,emitter,frame,stats)=>sampler.prepare(mask,emitter,frame,stats,true),clear(){stream.clear();layers.clear();births.clear();schedules.clear();sampler.clear();if(ownedSources)maskSources.clear();}});
  }
  function sourceFor(scene, emitter) {
    const id = emitter.particle && emitter.particle.sourceId;
    return scene.entities.find(entity => entity.id === id) || null;
  }
  function sourceFrames(scene, source, particle, frame, stats, surfaces) {
    const asset=source&&source.type==='image'&&scene.assets&&scene.assets[source.assetId],count=asset&&Array.isArray(asset.frames)&&asset.frames.length||0;
    if(!(count>1))return { frames:[api.modules.objects.createCapsule(scene,source,frame,stats,surfaces)], playback:'static', fps:0, loop:true };
    const playback=particle.playback==='particle-age'?'particle-age':'static',fps=Math.max(.1,+particle.frameFps||+source.fps||+asset.fps||8),loop=particle.frameLoop!==false&&source.frameLoop!==false&&asset.frameLoop!==false;
    if(playback==='static'){const index=Math.max(0,Math.min(count-1,Math.round(+particle.frame||0)));return { frames:[api.modules.objects.createCapsule(scene,Object.assign({},source,{_assetFrame:index}),frame,stats,surfaces)], playback, fps, loop, base:index };}
    return { frames:Array.from({length:count},(_,index)=>api.modules.objects.createCapsule(scene,Object.assign({},source,{_assetFrame:index}),frame,stats,surfaces)), playback, fps, loop };
  }
  function spriteIndex(source, age) { if(source.playback!=='particle-age')return 0;const raw=Math.floor(Math.max(0,age)*source.fps),count=source.frames.length;return source.loop?raw%count:Math.min(count-1,raw); }
  function draw(ctx, scene, emitter, frame, stats, surfaces) {
    if (emitter.hidden || frame.valuesFor(emitter).parentHidden || frame.valuesFor(emitter).timelineVisible === false) return;
    const values = frame.valuesFor(emitter), particle = values.particle || emitter.particle || {}, source = sourceFor(scene, Object.assign({}, emitter, { particle }));
    if (!source) throw new Error(`粒子发射器「${emitter.id}」找不到 sourceId`);
    const active=sessions.get(keyFrame(frame)),temporary=active?null:create(scene,surfaces),session=active||{evaluate:e=>temporary.evaluate(e,frame,stats,{})};
    let rendered=null,range=null;
    try{
      if(emitter.particle.mode==='layer'){
        const ownerSession=active||temporary;range=ownerSession.display(particle.motionRange,emitter,frame,stats);
        if(emitter.particle.layerEmission==='continuous')ownerSession.drawStream(ctx,emitter,frame,stats,session.evaluate(emitter),range);
        else ownerSession.drawLayer(ctx,emitter,frame,stats,range);
        stats.particleEmitters+=1;return;
      }
      const particles=session.evaluate(emitter);stats.particleEmitters+=1;if(!particles.length)return;
      rendered=sourceFrames(scene,source,particle,frame,stats,surfaces);
      const ownerSession=active||temporary;range=ownerSession.display(particle.motionRange,emitter,frame,stats);
      const sourceValues=frame.valuesFor(source),alpha=(values.parentAlpha==null?1:values.parentAlpha)*values.alpha*(sourceValues.parentAlpha==null?1:sourceValues.parentAlpha)*(sourceValues.alpha==null?1:sourceValues.alpha);
      ctx.save();try{
        ctx.globalAlpha*=alpha;
        for(const p of particles){const opacity=p.opacity*range.at(p.x,p.y);if(opacity<=0)continue;const sprite=rendered.frames[spriteIndex(rendered,p.age)]||rendered.frames[0];
          ctx.save();try{ctx.globalAlpha*=opacity;ctx.translate(p.x,p.y);ctx.transform(p.matrix[0],p.matrix[1],p.matrix[2],p.matrix[3],0,0);ctx.rotate(p.spin);ctx.scale(p.scale,p.scale);ctx.drawImage(sprite.capsule,-sprite.capsule.width/2,-sprite.capsule.height/2);}finally{ctx.restore();}stats.particlesDrawn++;
        }
      }finally{ctx.restore();}
      stats.particleSpriteBuilds+=1;stats.particleSpriteFrames=(stats.particleSpriteFrames||0)+rendered.frames.length;
    }finally{range?.release();if(rendered)for(const sprite of rendered.frames)surfaces.release(sprite.capsule);temporary?.clear();}
  }
  api.modules.particles = Object.freeze({ birthRanges:1,create,draw,sourceFor });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:75-particle-renderer.js> */

/* <vnext:80-scene-renderer.js> */
/* ToSampool Runtime vNext source module: deterministic fixed-time renderer. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  function sceneAt(scene,rel){const segments=scene.timeline&&Array.isArray(scene.timeline.scenes)&&scene.timeline.scenes.length?scene.timeline.scenes:[{f:[0,1]}];let index=segments.findIndex((segment,current)=>rel>=+(segment.f||[0,1])[0]-.000001&&(rel<+(segment.f||[0,1])[1]-.000001||current===segments.length-1&&rel<=+(segment.f||[0,1])[1]+.000001));if(index<0)index=Math.max(0,segments.length-1);return{index,segment:segments[index]};}
  function backgroundValues(scene,frame){
    const current=sceneAt(scene,frame.rel),segment=current.segment||{};
    return { current, values:Object.assign({color:'#000000',alpha:1},scene.background||{},segment.background||{}) };
  }
  function drawBackgroundFill(ctx,scene,frame){
    const background=backgroundValues(scene,frame).values,alpha=Math.max(0,Math.min(1,+background.alpha||0));
    if((background.color||background.fillPaint)&&alpha>0){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=api.modules.paint.style(ctx,background.fillPaint,{x:0,y:0,w:scene.width,h:scene.height},background.color);ctx.fillRect(0,0,scene.width,scene.height);ctx.restore();}
    const pattern=background.fillPattern;
    if(pattern&&pattern.type&&pattern.type!=='none'&&api.modules.pattern){ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,pattern.opacity==null?1:+pattern.opacity));api.modules.pattern.paint(ctx,scene.width,scene.height,pattern,pattern.color||background.color||'#ffffff');ctx.restore();}
    return background;
  }
  function transitionHash(x,y,seed){let value=(Math.imul(x+1,374761393)^Math.imul(y+1,668265263)^Math.imul(seed+1,69069))>>>0;value=Math.imul(value^value>>>13,1274126177);return((value^value>>>16)>>>0)/4294967296;}
  function transitionState(scene,frame){const current=sceneAt(scene,frame.rel),segment=current.segment||{},raw=segment.transition||{},legacyType=raw.type==='scan'?'wipe':raw.type||'none',type=['blackout','fade','wipe','dissolve'].includes(legacyType)?legacyType:'none';if(type==='none'||current.index<=0)return null;const range=segment.f||[0,1],sceneDuration=Math.max(.001,(+range[1]-+range[0])*scene.loop),duration=Math.max(.001,Math.min(sceneDuration,+raw.duration||.25)),localTime=Math.max(0,(frame.rel-+range[0])*scene.loop),progress=Math.max(0,Math.min(1,localTime/duration));if(progress>=1)return null;return{current,segment,config:raw,type,duration,progress,direction:raw.direction||((raw.type==='scan')?'down':'right')};}
  function outgoingTransitionTime(scene,state){if(!state)return 0;const previous=(scene.timeline&&scene.timeline.scenes||[])[state.current.index-1],end=Math.max(0,((previous&&previous.f&&previous.f[1])||0)*scene.loop),elapsed=Math.max(0,Math.min(state.duration,state.progress*state.duration));return Math.max(0,end-state.duration+elapsed);}
  // `next` is already on ctx. Fade / Wipe / Dissolve composite the previous
  // Scene where it has not been revealed. Blackout retains the Legacy black-
  // field language: a configurable colour cover fades away to the new Scene.
  function drawTransition(ctx,scene,frame,previous){const state=transitionState(scene,frame);if(!state)return false;const width=scene.width,height=scene.height,progress=state.progress;if(state.type!=='blackout'&&(!previous||!ctx.drawImage))return false;ctx.save();ctx.globalCompositeOperation='source-over';if(state.type==='blackout'){ctx.globalAlpha=1-progress;ctx.fillStyle=state.config.color||'#000000';ctx.fillRect(0,0,width,height);}else if(state.type==='fade'){ctx.globalAlpha=1-progress;ctx.drawImage(previous,0,0);}
    else if(state.type==='wipe'){ctx.beginPath();if(state.direction==='left')ctx.rect(0,0,Math.ceil(width*(1-progress)),height);else if(state.direction==='up')ctx.rect(0,0,width,Math.ceil(height*(1-progress)));else if(state.direction==='down')ctx.rect(0,Math.floor(height*progress),width,height);else ctx.rect(Math.floor(width*progress),0,width,height);ctx.clip();ctx.drawImage(previous,0,0);}
    else if(state.type==='dissolve'){const size=Math.max(1,Math.round(+state.config.cell||Math.max(2,Math.min(width,height)/36))),seed=Math.round(+state.config.seed||13);for(let y=0;y<height;y+=size)for(let x=0;x<width;x+=size)if(transitionHash((x/size)|0,(y/size)|0,seed)>progress)ctx.drawImage(previous,x,y,size,size,x,y,size,size);}
    ctx.restore();return true;}
  function createRuntime(input) {
    return createPlayer(api.modules.scene.normalize(input));
  }
  function createPlayer(scene) {
    const surfaces = api.modules.surfaces.create();
    const maskSources=api.modules.maskSources.create(scene,surfaces);
    const particleSession=api.modules.particles.create(scene,surfaces,maskSources);
    let lastStats = null, backingSizeWrites = 0, outgoingPlayer = null, gpuExecutor = null, objectGpuSession = null;
    // View-only diagnostic. The same mask evaluator, frame and source cache are
    // used as normal composition; no project fields or normal draw state change.
    function renderMaskTo(target,t,options){
      const requested=options.maskPreview,frame=api.modules.frame.create(scene,t||0,options);
      let owner=null,mask,bounds={x:0,y:0,w:scene.width,h:scene.height};
      if(requested.scope==='object'){
        owner=scene.entities.find(e=>e.id===requested.ownerId);mask=owner?.effects?.mask;
        if(owner&&mask)bounds=api.modules.objects.capsuleBounds(scene,owner,frame);
      }else if(requested.scope==='particle-emission'||requested.scope==='particle-motion'){
        owner=scene.entities.find(e=>e.id===requested.ownerId);mask=owner?.particle?.[requested.scope==='particle-emission'?'emissionRange':'motionRange'];
      }else if(requested.scope==='scene'){
        const config=scene.sceneEffects?.overlay?.[requested.effectId]||scene.sceneEffects?.sample?.[requested.effectId];
        mask=config?.mask;
      }else throw Error('当前范围尚不支持蒙版预览');
      if(!mask||mask.type==='none')throw Error('预览的蒙版不存在或已移除');
      if(bounds.w>8192||bounds.h>8192||bounds.w*bounds.h>16777216)throw Error('蒙版预览超过离屏预算（8192边长／16MP）');
      if(!target?.getContext)throw Error('蒙版预览需要目标 Canvas');
      if(target.width!==scene.width)target.width=scene.width;if(target.height!==scene.height)target.height=scene.height;
      const ctx=target.getContext('2d');if(!ctx)throw Error('蒙版预览没有2D上下文');
      surfaces.beginFrame();
      const stats={time:frame.time,maskPreview:true,maskPreviewScope:requested.scope,sceneEffects:0,directObjects:0,capsuleObjects:0,maskedObjects:0,particleEmitters:0,particlesDrawn:0,particleSpriteBuilds:0,unsupportedEffects:[]};
      const session=options.objectBackend==='gpu-threshold-pilot'?(options._objectGpuSession||(objectGpuSession||(objectGpuSession=api.modules.objectGpu.create()))):null;
      if(session)session.beginFrame(scene,frame,{sceneGpu:false});
      const capture=maskSources.begin(frame,stats,{...options,_maskSourceObjectSession:session}),particleFrame=particleSession.begin(frame,stats,options);let matte=null,instances=null;
      try{
        instances=api.modules.pathInstances.begin(scene,frame,stats,surfaces);
        matte=surfaces.acquire(bounds.w,bounds.h);const out=matte.getContext('2d');out.save();out.setTransform(1,0,0,1,0,0);out.globalAlpha=1;out.globalCompositeOperation='copy';out.fillStyle='#ffffff';out.fillRect(0,0,matte.width,matte.height);out.restore();
        if(requested.scope.startsWith('particle-')&&mask.invert){const v=frame.valuesFor(owner);out.clearRect(0,0,matte.width,matte.height);out.save();out.transform(...v.worldMatrix);out.fillStyle='#ffffff';out.fillRect(0,0,v.w,v.h);out.restore();}
        if(!api.modules.masks.apply(matte,mask,bounds,scene,frame,surfaces,owner))throw Error('该来源尚不支持蒙版预览');
        ctx.save();try{ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='copy';ctx.fillStyle='#000000';ctx.fillRect(0,0,scene.width,scene.height);ctx.globalCompositeOperation='source-over';ctx.drawImage(matte,bounds.x,bounds.y);}finally{ctx.restore();}
        stats.surfaces=surfaces.stats();stats.workPixels=stats.surfaces.workPixels;stats.pixelPasses=stats.surfaces.pixelPasses;
        return Object.freeze(stats);
      }finally{if(matte)surfaces.release(matte);instances?.release();particleFrame.end();capture.end();}
    }
    function renderTo(target, t, options) {
      if(options?.maskPreview)return renderMaskTo(target,t,options);
      const profile=options&&options.sceneProfile?(options._sceneProfile||{}):null;
      if(profile)options=Object.assign({},options,{_sceneProfile:profile});
      const now=()=>profile?performance.now():0;
      const record=(name,start)=>{if(profile)profile[name]=(profile[name]||0)+performance.now()-start;};
      let phaseStart=now();
      if (!target || !target.getContext) throw new Error('renderTo 需要目标 Canvas');
      let canvasResized = false;
      if (target.width !== scene.width) { target.width = scene.width; backingSizeWrites += 1; canvasResized = true; }
      if (target.height !== scene.height) { target.height = scene.height; backingSizeWrites += 1; canvasResized = true; }
      const targetCtx = target.getContext('2d');
      if (!targetCtx) throw new Error('目标 Canvas 无 2D 上下文');
      surfaces.beginFrame();const frame = api.modules.frame.create(scene, t || 0,options);
      const fixedRoles=options&&options.sceneBackend==='gpu-experimental'&&options.sceneSurfacePolicy==='fixed-roles';
      const sceneEffectCount = api.modules.sceneEffects.activeCount(scene,frame), base = sceneEffectCount ? (fixedRoles?surfaces.acquireRole('scene-source',scene.width,scene.height):surfaces.acquire(scene.width, scene.height)) : target, ctx = base.getContext('2d');
      if (!ctx) throw new Error('场景绘制层没有 2D 上下文');
      const stats = { time: frame.time, directObjects: 0, capsuleObjects: 0, maskedObjects: 0, particleEmitters: 0, particlesDrawn: 0, particleSpriteBuilds: 0, sceneEffects: 0, unsupportedEffects: [], canvasResized, backingSizeWrites };
      const objectSession=options?.objectBackend==='gpu-threshold-pilot'?(options._objectGpuSession||(objectGpuSession||(objectGpuSession=api.modules.objectGpu.create()))):null;
      if(objectSession)objectSession.beginFrame(scene,frame,{sceneGpu:options.sceneBackend==='gpu-experimental'});
      const maskFrame=maskSources.begin(frame,stats,{...options,_maskSourceObjectSession:objectSession}),particleFrame=particleSession.begin(frame,stats,options);let instances;
      try{
      instances=api.modules.pathInstances.begin(scene,frame,stats,surfaces);
      record('playerSetup',phaseStart);phaseStart=now();
      ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, scene.width, scene.height);
      drawBackgroundFill(ctx,scene,frame);
      api.modules.content.drawBackground(ctx, scene, frame);
      const maskOnly = api.modules.masks.maskOnlySources(scene,frame);
      const instanceOnly=api.modules.pathInstances.hiddenSources(scene);
      const layerConsumers=scene.entities.filter(e=>e.type==='particle-emitter'&&e.particle?.mode==='layer'&&!e.hidden&&!frame.valuesFor(e).parentHidden&&frame.valuesFor(e).timelineVisible!==false);
      const layerOnly=new Set(layerConsumers.filter(e=>e.particle.showSource===false&&!layerConsumers.some(other=>other.particle.sourceId===e.particle.sourceId&&other.particle.showSource!==false)).map(e=>e.particle.sourceId));
      for (const entity of scene.entities) {
        if (maskOnly.has(entity.id) || instanceOnly.has(entity.id) || layerOnly.has(entity.id) || entity.particleSourceOnly || entity.referenceSourceOnly === true) continue;
        if (entity.type === 'particle-emitter') api.modules.particles.draw(ctx, scene, entity, frame, stats, surfaces);
        else api.modules.objects.draw(ctx, scene, entity, frame, stats, surfaces, objectSession);
      }
      ctx.restore();
      if(objectSession){stats.objectGpu=objectSession.snapshot();stats.objectBackend=stats.objectGpu.handled?'gpu-object-sampling':'cpu';}
      record('sourceDraw',phaseStart);phaseStart=now();
      let current = base;
      const wantsGpu=options&&options.sceneBackend==='gpu-experimental';
      const executor=wantsGpu?(options._sceneGpuExecutor||(gpuExecutor||(gpuExecutor=api.modules.sceneGpu.create()))):null;
      const transition=(!options||!options._skipTransition)?transitionState(scene,frame):null;
      let gpuTransition=false;
      if(executor&&transition&&transition.type!=='blackout'&&options.sceneGpuTransitions===true){
        const previousFrame=api.modules.frame.create(scene,outgoingTransitionTime(scene,transition),options);
        const incomingPlan=api.modules.sceneGpu.plan(scene,frame),outgoingPlan=api.modules.sceneGpu.plan(scene,previousFrame);
        // Different work sizes would rebuild the executor and discard the first
        // texture. Keep the established Canvas transition in that case.
        gpuTransition=!incomingPlan.reason&&!outgoingPlan.reason&&incomingPlan.grid===outgoingPlan.grid;
      }
      const gpuOptions=gpuTransition?Object.assign({},options,{_sceneGpuSlot:'incoming'}):options;
      record('playerPlanning',phaseStart);
      const gpuResult=executor?executor.render(base,scene,frame,surfaces,targetCtx,gpuOptions):null;
      stats.sceneBackend=gpuResult&&gpuResult.handled?'gpu':'cpu';
      stats.frameGpuUploads=gpuResult&&gpuResult.handled?gpuResult.uploads:0;
      stats.frameGpuPasses=gpuResult&&gpuResult.handled?gpuResult.passes:0;
      if(gpuResult){stats.sceneGpu=Object.assign({},executor.stats(),gpuResult);delete stats.sceneGpu.surface;}
      if(gpuResult&&gpuResult.surfaceTrace)stats.sceneSurfaceTrace=gpuResult.surfaceTrace;
      if(gpuResult&&gpuResult.handled)stats.sceneEffects=gpuResult.count;
      else {phaseStart=now();for (const stage of scene.sceneEffects.pipeline || ['overlay', 'sample']) {
        if (stage !== 'overlay' && stage !== 'sample') continue;
        const applied = api.modules.sceneEffects.applyStage(current, stage, scene, frame, surfaces); if (applied.surface !== current) { if (current !== base) surfaces.release(current); current = applied.surface; } stats.sceneEffects += applied.count;
      }record('cpuSceneEffects',phaseStart);}
      phaseStart=now();
      if (base !== target) { if(!gpuResult||!gpuResult.handled){targetCtx.clearRect(0, 0, scene.width, scene.height); targetCtx.drawImage(current, 0, 0);if(current!==base)surfaces.release(current);}surfaces.release(base); }
      record('canvasCopy',phaseStart);
      // Both sides of an entry transition retain their own running clocks.
      // The outgoing Scene plays through its final `duration`, while the
      // incoming Scene plays through its first `duration`; only the composite
      // mask is frozen.  Rendering the preceding Scene at f[1] here made every
      // wipe and dissolve look like a still-frame transition in the editor.
      if(transition){
        if(transition.type==='blackout'){phaseStart=now();drawTransition(targetCtx,scene,frame,null);record('canvasTransition',phaseStart);stats.transitionCompositeBackend='cpu';}
        else{
          const previousTime=outgoingTransitionTime(scene,transition),previous=fixedRoles?surfaces.acquireRole('scene-previous',scene.width,scene.height):surfaces.acquire(scene.width,scene.height);
          if(options&&options.sceneSurfaceTrace)stats.transitionTargetTrace=surfaces.describe(previous);
          let retryCpu=false;
          try{
            if(!outgoingPlayer)outgoingPlayer=createPlayer(scene);
            const previousOptions=Object.assign({},options||{},{_skipTransition:true,_sceneGpuExecutor:executor});
            if(gpuTransition)previousOptions._sceneGpuSlot='outgoing';
            const previousStats=outgoingPlayer.renderTo(previous,previousTime,previousOptions);
            stats.transitionBackend=previousStats.sceneBackend;stats.transitionSurfaces=previousStats.surfaces;
            if(previousStats.sceneSurfaceTrace)stats.transitionSurfaceTrace=previousStats.sceneSurfaceTrace;
            stats.frameGpuUploads+=previousStats.frameGpuUploads;stats.frameGpuPasses+=previousStats.frameGpuPasses;
            if(gpuTransition){
              if(gpuResult?.handled&&previousStats.sceneBackend==='gpu'&&executor.composeTransition(transition,targetCtx,options)){
                stats.transitionCompositeBackend='gpu';stats.frameGpuPasses+=1;
                stats.sceneGpu=Object.assign({},stats.sceneGpu,executor.stats());
              }else retryCpu=true;
            }else{phaseStart=now();drawTransition(targetCtx,scene,frame,previous);record('canvasTransition',phaseStart);stats.transitionCompositeBackend='cpu';}
          }finally{surfaces.release(previous);}
          // A deferred side was never drawn to Canvas. On any error redraw the
          // entire frame through the proven CPU path, not stale GPU textures.
          if(retryCpu){const reason=executor.stats().contextLost?'webgl-context-lost':'gpu-transition-failed';const result=renderTo(target,t,Object.assign({},options,{sceneBackend:'cpu',_sceneGpuExecutor:null}));lastStats=Object.freeze(Object.assign({},result,{transitionGpuFallback:reason}));return lastStats;}
        }
      }
      if(profile)stats.sceneProfileMs=Object.freeze(Object.assign({},profile));
      stats.previewPixelDivMultiplier=frame.preview.pixelDivMultiplier;stats.surfaces = surfaces.stats();stats.workPixels=stats.surfaces.workPixels;stats.pixelPasses=stats.surfaces.pixelPasses;lastStats = Object.freeze(stats); return lastStats;
      }finally{instances?.release();particleFrame.end();maskFrame.end();}
    }
    function clearCaches(){particleSession.clear();maskSources.clear();surfaces.clear();if(gpuExecutor)gpuExecutor.dispose();gpuExecutor=null;if(objectGpuSession)objectGpuSession.dispose();objectGpuSession=null;if(outgoingPlayer)outgoingPlayer.clearCaches();outgoingPlayer=null;}
    return Object.freeze({ scene, renderTo, getLastFrameStats: () => lastStats, clearCaches, dispose:clearCaches });
  }
  api.modules.renderer = Object.freeze({ referenceSources:true,maskPreview:1,createRuntime,drawTransition,transitionState,outgoingTransitionTime,sceneAt,backgroundValues,drawBackgroundFill });
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:80-scene-renderer.js> */

/* <vnext:90-public-api.js> */
/* ToSampool Runtime vNext source module: public self-contained API. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  api.apiVersion = 1;
  api.capabilities = Object.freeze({ fixedTimeRender: 1, deterministicFrames: 1, vnextBase: 1, objectEffects: 1, objectDecorateBase: 1, objectSamplingBase: 1, samplingField: 1, halftone: 1, edgeDispersion: 1, crtDisplay: 1, namedPalettes: 1, textureOverlay: 1, lightEffects: 1, imageAssets: 1, backgroundLayers: 1, groupTransforms: 1, programMotion: 1, sceneTransitions: 1, sharedSpriteParticles: 1, registeredBuiltins: 1, sceneModules: 1, staticMasks: 1, alphaMasks: 1, elementMasks: 1, sceneEffects: 1 });
  api.createRuntime = api.modules.renderer.createRuntime;
  api.renderTo = function renderTo(target, scene, t, options) { const player=api.createRuntime(scene);try{return player.renderTo(target,t,options);}finally{player.dispose();} };
  Object.freeze(api.modules);
  Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis);
/* </vnext:90-public-api.js> */
