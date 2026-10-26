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
