/* Persistent v4 image assets: a still or an ordered frame sequence, then ordinary image/background consumers. */
(function (global) {
  'use strict';
  function slug(value, fallback) { const text = String(value || '').replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); return text || fallback || 'asset'; }
  function unique(existing, base) { let id = base, index = 2; while (existing.has(id)) id = `${base}-${index++}`; return id; }
  function normalizeFrames(options) { const supplied = Array.isArray(options && options.frames) ? options.frames : []; const first = String(options && options.locator || supplied[0] && (supplied[0].locator || supplied[0]) || ''); if (!first) throw new Error('导入图片需要持久 locator 或 data URL'); const frames = supplied.length ? supplied.map(frame => ({ locator:String(frame && (frame.locator || frame) || ''), mime:frame && frame.mime || options && options.mime || '' })).filter(frame => frame.locator) : [{ locator:first, mime:options && options.mime || '' }]; if (!frames.length) throw new Error('多帧素材缺少有效 locator'); return frames; }
  function addAsset(scene, options) {
    if (!scene) throw new Error('导入图片需要场景'); scene.assets = Object.assign({}, scene.assets || {}); const frames = normalizeFrames(options), assetId = unique(new Set(Object.keys(scene.assets)), slug(options && options.name, 'image')), width = Math.max(1, Math.round(+(options && options.width) || 1)), height = Math.max(1, Math.round(+(options && options.height) || 1));
    const descriptor = Object.assign({ locator:frames[0].locator, width, height }, options && options.mime ? { mime:options.mime } : {}, options && options.recipe ? { recipe:Object.assign({}, options.recipe) } : {});
    if (frames.length > 1) { descriptor.frames = frames; descriptor.fps = Math.max(.1, +(options && options.fps) || 8); descriptor.frameLoop = options && options.frameLoop !== false; }
    scene.assets[assetId] = descriptor; return { assetId, width, height, frames:frames.length, fps:descriptor.fps || 0 };
  }
  function assetInfo(scene, assetId) {
    const descriptor = scene && scene.assets && scene.assets[assetId];
    if (!descriptor) throw new Error(`素材不存在：${assetId || '(空)'}`);
    const frames = Array.isArray(descriptor.frames) && descriptor.frames.length ? descriptor.frames.length : 1;
    return { descriptor, width:Math.max(1, Math.round(+descriptor.width || 1)), height:Math.max(1, Math.round(+descriptor.height || 1)), frames, fps:frames > 1 ? Math.max(.1, +descriptor.fps || 8) : 0 };
  }
  function placeImage(scene, assetId, options) {
    options = options || {}; const asset = assetInfo(scene, assetId); scene.entities = Array.isArray(scene.entities) ? scene.entities : [];
    const entityId = unique(new Set(scene.entities.map(entity => entity.id)), options.entityId || `image-${assetId}`);
    // Legacy parity: a newly placed image is never enlarged, and a large source
    // is fitted inside two thirds of the current artboard while preserving ratio.
    // This is placement-only; the library asset remains at its prepared size.
    const maxW=Math.max(1,(+scene.width||asset.width)*2/3),maxH=Math.max(1,(+scene.height||asset.height)*2/3),requestedW=+options.w||asset.width,requestedH=+options.h||asset.height,fit=options.w||options.h?1:Math.min(1,maxW/asset.width,maxH/asset.height),w=Math.max(1,Math.round(requestedW*fit)),h=Math.max(1,Math.round(requestedH*fit));
    scene.entities.push({ id:entityId, type:'image', assetId, x:Number.isFinite(+options.x) ? +options.x : Math.round(((+scene.width || w) - w) / 2), y:Number.isFinite(+options.y) ? +options.y : Math.round(((+scene.height || h) - h) / 2), w, h, alpha:options.alpha == null ? 1 : Math.max(0, Math.min(1, +options.alpha || 0)), frames:asset.frames > 1 ? asset.frames : undefined, fps:asset.frames > 1 ? asset.fps : undefined, frameLoop:asset.frames > 1, effects:{ pipeline:['mask','decorate','sample'], mask:null, decorate:{}, sample:{} } });
    return { assetId, width:asset.width, height:asset.height, frames:asset.frames, fps:asset.fps, entityId };
  }
  function placeBackground(scene, assetId, options) {
    options = options || {}; const asset = assetInfo(scene, assetId); scene.background = Object.assign({ color:'#000000', alpha:0, layers:[] }, scene.background || {}); scene.background.layers = Array.isArray(scene.background.layers) ? scene.background.layers : [];
    if (options.createScene || Number.isFinite(+options.canvasWidth)) scene.width = Math.max(1, Math.round(+options.canvasWidth || asset.width));
    if (options.createScene || Number.isFinite(+options.canvasHeight)) scene.height = Math.max(1, Math.round(+options.canvasHeight || asset.height));
    const layerId = unique(new Set(scene.background.layers.map(layer => layer.id)), options.layerId || `background-${assetId}`), layout = ['none','stretch','tile'].includes(options.layout) ? options.layout : 'none', w=Math.max(1, Math.round(+options.w || asset.width)), h=Math.max(1, Math.round(+options.h || asset.height));
    scene.background.layers.push({ id:layerId, assetId, x:Number.isFinite(+options.x) ? +options.x : Math.round(((+scene.width || w) - w) / 2), y:Number.isFinite(+options.y) ? +options.y : Math.round(((+scene.height || h) - h) / 2), w, h, alpha:options.alpha == null ? 1 : Math.max(0, Math.min(1, +options.alpha || 0)), layout, hidden:false, frames:asset.frames > 1 ? asset.frames : undefined, fps:asset.frames > 1 ? asset.fps : undefined, frameLoop:asset.frames > 1 });
    return { assetId, width:asset.width, height:asset.height, frames:asset.frames, fps:asset.fps, layerId };
  }
  function referenced(scene, assetId) {
    if ((scene.entities || []).some(entity => entity && entity.assetId === assetId)) return true;
    if ((scene.background && scene.background.layers || []).some(layer => layer && layer.assetId === assetId)) return true;
    return false;
  }
  function removeAsset(scene, assetId) { if (referenced(scene, assetId)) return false; if (!scene.assets || !scene.assets[assetId]) return false; delete scene.assets[assetId]; return true; }
  function addImage(scene, options) { const asset = addAsset(scene, options); return Object.assign(asset, placeImage(scene, asset.assetId, options)); }
  function addBackground(scene, options) { const asset = addAsset(scene, options); return Object.assign(asset, placeBackground(scene, asset.assetId, options)); }
  global.EditorVNextAssetState = Object.freeze({ slug, normalizeFrames, addAsset, assetInfo, placeImage, placeBackground, referenced, removeAsset, addImage, addBackground });
})(typeof window !== 'undefined' ? window : globalThis);
