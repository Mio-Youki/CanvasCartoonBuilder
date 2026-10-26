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
