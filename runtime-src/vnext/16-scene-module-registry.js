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
