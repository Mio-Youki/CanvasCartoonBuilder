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
    return 1-Math.max(0,Math.min(1,+spec.amount))*((curve(time/period,spec.curve)+1)/2);
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
      const variant=sceneVariant(entity,currentSceneIndex),base=variant?Object.assign({},entity,variant):entity;
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
    return Object.freeze({ time, rel, sceneIndex:currentSceneIndex, sceneProgress, preview:quality, valuesFor: entity => byId.get(entity.id) || entity, effectValuesFor: (scope, ownerId, effectId, base) => api.modules.timeline.effectValuesFor(scene, scope, ownerId, effectId, base, rel), controllerValuesFor: (scope, ownerId, controllerId, base) => api.modules.timeline.controllerValuesFor(scene, scope, ownerId, controllerId, base, rel) });
  }

  api.modules.frame = Object.freeze({ create, matrixFor, multiply, pivotFor, curve, blinkAlpha, snapGeometry, sceneSegmentAt, sceneIndexAt, IDENTITY });
})(typeof window !== 'undefined' ? window : globalThis);
