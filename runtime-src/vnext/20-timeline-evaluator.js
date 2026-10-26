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
