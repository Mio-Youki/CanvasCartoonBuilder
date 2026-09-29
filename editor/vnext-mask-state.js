/* Unified v4 object mask and scene-effect range-mask mutations. */
(function (global) {
  'use strict';

  const TYPES = Object.freeze(['rect', 'ellipse', 'poly', 'alpha', 'element']);
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const positive = (value, fallback) => Math.max(1, finite(value, fallback));
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function entity(scene, id) {
    const found = (scene && scene.entities || []).find(item => item && item.id === id);
    if (!found) throw new Error(`找不到蒙版对象「${id || '(空)'}」`);
    return found;
  }
  function effectDefinition(id) {
    const registry = global.EditorEffectRegistryVNext, definition = registry && registry.effectById && registry.effectById[id];
    if (!definition || !definition.scopes.includes('scene')) throw new Error(`找不到场景滤镜「${id || '(空)'}」`);
    return definition;
  }
  function sceneEffect(scene, effectId, create) {
    const definition = effectDefinition(effectId), model = global.EditorVNextInspectorModel;
    if (!model) throw new Error('统一蒙版需要 vNext Inspector Model');
    const path = model.path('scene', definition); let cursor = scene;
    for (let index = 0; index < path.length - 1; index++) {
      if (!cursor[path[index]]) { if (!create) return null; cursor[path[index]] = {}; }
      cursor = cursor[path[index]];
    }
    if (!cursor[path.at(-1)] && create) {
      if (!global.EditorVNextEffectState) throw new Error('统一蒙版需要 vNext Effect State');
      global.EditorVNextEffectState.enable(scene, { scope:'scene', effectId });
      return sceneEffect(scene, effectId, false);
    }
    return cursor[path.at(-1)] || null;
  }
  function target(scene, options, create) {
    if (options && options.scope === 'scene') return sceneEffect(scene, options.effectId, create);
    const owner = entity(scene, options && options.ownerId);
    if (!owner.effects) { if (!create) return null; owner.effects={ pipeline:['mask','decorate','sample'], mask:null, decorate:{}, sample:{} }; }
    else if(create)owner.effects=Object.assign({pipeline:['mask','decorate','sample'],mask:null,decorate:{},sample:{}},owner.effects);
    return owner.effects;
  }
  function current(scene, options) {
    const slot = target(scene, options, false);
    return clone(options && options.scope === 'scene' ? slot && slot.mask : slot && slot.mask);
  }
  function defaults(scene, options, type) {
    const owner = options && options.scope === 'scene' ? null : entity(scene, options && options.ownerId), x = owner ? finite(owner.x, 0) : 0, y = owner ? finite(owner.y, 0) : 0, w = owner ? positive(owner.w, 1) : positive(scene.width, 1), h = owner ? positive(owner.h, 1) : positive(scene.height, 1);
    if (type === 'poly') return { type, points:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]], invert:false, follow:false };
    if (type === 'alpha') return { type, assetId:'', x, y, w, h, mode:'alpha', invert:false, follow:false };
    if (type === 'element') return { type, targetId:'', sourceVisibility:'keep', invert:false };
    return { type, x, y, w, h, invert:false, follow:false };
  }
  function normalize(scene, options, input) {
    const type = String(input && input.type || '');
    if (!TYPES.includes(type)) throw new Error(`不支持的蒙版类型「${type || '(空)'}」`);
    const base = defaults(scene, options, type), mask = Object.assign(base, clone(input) || {}, { type, invert:!!(input && input.invert) });
    if (type !== 'element') {
      mask.follow = !!(input && input.follow);
      if (mask.follow && (!Array.isArray(mask.followMatrix) || mask.followMatrix.length !== 6 || !mask.followMatrix.every(value => Number.isFinite(+value)))) mask.followMatrix = [1,0,0,1,0,0];
      if (!mask.follow) delete mask.followMatrix;
    }
    if (type === 'rect' || type === 'ellipse') { mask.x=finite(mask.x,base.x);mask.y=finite(mask.y,base.y);mask.w=positive(mask.w,base.w);mask.h=positive(mask.h,base.h); }
    if (type === 'poly') {
      if (!Array.isArray(mask.points) || mask.points.length < 3) throw new Error('多边形蒙版至少需要三个点');
      mask.points = mask.points.map(point => { if (!Array.isArray(point) || point.length < 2) throw new Error('多边形蒙版点无效'); return [finite(point[0],0), finite(point[1],0)]; });
    }
    if (type === 'alpha') {
      mask.assetId=String(mask.assetId||mask.imageId||'');delete mask.imageId;
      if (!mask.assetId || !scene.assets || !scene.assets[mask.assetId]) throw new Error(`Alpha 蒙版素材不存在：${mask.assetId || '(空)'}`);
      mask.x=finite(mask.x,base.x);mask.y=finite(mask.y,base.y);mask.w=positive(mask.w,base.w);mask.h=positive(mask.h,base.h);mask.mode=mask.mode==='luma'?'luma':'alpha';
    }
    if (type === 'element') {
      mask.targetId=String(mask.targetId||'');const source=entity(scene,mask.targetId);
      if (options && options.scope !== 'scene' && source.id===options.ownerId) throw new Error('对象不能引用自身作为蒙版');
      if (source.type==='particle-emitter') throw new Error('粒子发射器不能作为蒙版引用源');
      mask.sourceVisibility=mask.sourceVisibility==='mask-only'?'mask-only':'keep';
    }
    return mask;
  }
  function set(scene, options, input) {
    const mask = normalize(scene, options || {}, input), slot = target(scene, options || {}, true);
    slot.mask = mask; return clone(mask);
  }
  function clear(scene, options) {
    const slot = target(scene, options || {}, false);
    if (!slot || !slot.mask) return false;
    slot.mask = null; return true;
  }
  function setSourceVisibility(scene, options, value) {
    const slot=target(scene,options||{},false),mask=slot&&slot.mask;
    if(!mask||mask.type!=='element')throw new Error('只有元素引用蒙版支持来源显示方式');
    mask.sourceVisibility=value==='mask-only'?'mask-only':'keep';return mask.sourceVisibility;
  }

  function bounds(mask) {
    if (!mask) return null;
    if (['rect', 'ellipse', 'alpha'].includes(mask.type)) return { x:finite(mask.x,0), y:finite(mask.y,0), w:positive(mask.w,1), h:positive(mask.h,1) };
    if (mask.type === 'poly' && Array.isArray(mask.points) && mask.points.length) {
      const xs=mask.points.map(point=>finite(point[0],0)), ys=mask.points.map(point=>finite(point[1],0));
      return { x:Math.min(...xs), y:Math.min(...ys), w:Math.max(1,Math.max(...xs)-Math.min(...xs)), h:Math.max(1,Math.max(...ys)-Math.min(...ys)) };
    }
    return null;
  }
  function setBounds(scene, options, next) {
    const mask=current(scene,options), before=bounds(mask); if(!mask||!before) throw new Error('当前蒙版没有可编辑范围');
    const target={x:finite(next&&next.x,before.x),y:finite(next&&next.y,before.y),w:positive(next&&next.w,before.w),h:positive(next&&next.h,before.h)};
    if(mask.type==='poly'){
      const sx=target.w/before.w,sy=target.h/before.h;
      mask.points=mask.points.map(point=>[target.x+(finite(point[0],before.x)-before.x)*sx,target.y+(finite(point[1],before.y)-before.y)*sy]);
    }else Object.assign(mask,target);
    return set(scene,options,mask);
  }
  function setFollow(scene, options, enabled, matrix) {
    const mask=current(scene,options); if(!mask||mask.type==='element') throw new Error('当前蒙版不支持跟随');
    mask.follow=!!enabled;
    if(mask.follow) mask.followMatrix=Array.isArray(matrix)&&matrix.length===6&&matrix.every(value=>Number.isFinite(+value))?matrix.map(Number):[1,0,0,1,0,0];
    else delete mask.followMatrix;
    return set(scene,options,mask);
  }

  global.EditorVNextMaskState = Object.freeze({ TYPES, current, defaults, normalize, set, clear, setSourceVisibility, bounds, setBounds, setFollow });
})(typeof window !== 'undefined' ? window : globalThis);
