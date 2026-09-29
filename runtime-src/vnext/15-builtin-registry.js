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
