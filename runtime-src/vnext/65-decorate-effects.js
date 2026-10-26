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
