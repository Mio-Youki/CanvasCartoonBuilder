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
