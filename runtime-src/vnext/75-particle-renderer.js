/* ToSampool Runtime vNext source module: deterministic shared-sprite particle emitters. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const hash = (index, salt, seed) => api.modules.sampling.hash(index, salt, seed | 0, 0);
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const positive = (value, fallback) => Math.max(1, finite(value, fallback));
  function rangeBounds(range, width, height) {
    if (!range || !['rect','ellipse','poly'].includes(range.type)) return { x:0, y:0, w:width, h:height };
    if (range.type === 'poly' && Array.isArray(range.points) && range.points.length >= 3) {
      const xs=range.points.map(point=>finite(point[0],0)),ys=range.points.map(point=>finite(point[1],0));
      return { x:Math.min(...xs), y:Math.min(...ys), w:positive(Math.max(...xs)-Math.min(...xs),1), h:positive(Math.max(...ys)-Math.min(...ys),1) };
    }
    return { x:finite(range.x,0), y:finite(range.y,0), w:positive(range.w,width), h:positive(range.h,height) };
  }
  function polygonContains(points, x, y) {
    let inside=false;
    for(let index=0,previous=points.length-1;index<points.length;previous=index++){
      const a=points[index],b=points[previous],cross=(a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/Math.max(.000001,b[1]-a[1])+a[0];
      if(cross)inside=!inside;
    }
    return inside;
  }
  function rangeContains(range, x, y, width, height) {
    if (!range || !['rect','ellipse','poly'].includes(range.type)) return x>=0&&x<=width&&y>=0&&y<=height;
    let contained=false;
    if(range.type==='ellipse') { const b=rangeBounds(range,width,height),dx=(x-(b.x+b.w/2))/Math.max(.000001,b.w/2),dy=(y-(b.y+b.h/2))/Math.max(.000001,b.h/2);contained=dx*dx+dy*dy<=1; }
    else if(range.type==='poly'&&Array.isArray(range.points)&&range.points.length>=3)contained=polygonContains(range.points,x,y);
    else { const b=rangeBounds(range,width,height);contained=x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h; }
    return range.invert ? !contained : contained;
  }
  function sampleRange(range, index, seed, width, height) {
    const b=rangeBounds(range,width,height),raw=range||{type:'rect'}, attempts=raw.invert?12:10;
    for(let attempt=0;attempt<attempts;attempt++){
      const salt=attempt*17,ux=hash(index,2+salt,seed),uy=hash(index,3+salt,seed);let x,y;
      if(raw.type==='ellipse'&&!raw.invert){const radius=Math.sqrt(ux),theta=uy*Math.PI*2;x=b.x+b.w/2+Math.cos(theta)*radius*b.w/2;y=b.y+b.h/2+Math.sin(theta)*radius*b.h/2;}
      else { const base=raw.invert?{x:0,y:0,w:width,h:height}:b;x=base.x+ux*base.w;y=base.y+uy*base.h; }
      if(rangeContains(raw,x,y,width,height))return {x,y};
    }
    return {x:b.x+b.w/2,y:b.y+b.h/2};
  }
  function sourceFor(scene, emitter) {
    const id = emitter.particle && emitter.particle.sourceId;
    return scene.entities.find(entity => entity.id === id) || null;
  }
  function sourceFrames(scene, source, particle, frame, stats, surfaces) {
    const asset=source&&source.type==='image'&&scene.assets&&scene.assets[source.assetId],count=asset&&Array.isArray(asset.frames)&&asset.frames.length||0;
    if(!(count>1))return { frames:[api.modules.objects.createCapsule(scene,source,frame,stats,surfaces)], playback:'static', fps:0, loop:true };
    const playback=particle.playback==='particle-age'?'particle-age':'static',fps=Math.max(.1,+particle.frameFps||+source.fps||+asset.fps||8),loop=particle.frameLoop!==false&&source.frameLoop!==false&&asset.frameLoop!==false;
    if(playback==='static'){const index=Math.max(0,Math.min(count-1,Math.round(+particle.frame||0)));return { frames:[api.modules.objects.createCapsule(scene,Object.assign({},source,{_assetFrame:index}),frame,stats,surfaces)], playback, fps, loop, base:index };}
    return { frames:Array.from({length:count},(_,index)=>api.modules.objects.createCapsule(scene,Object.assign({},source,{_assetFrame:index}),frame,stats,surfaces)), playback, fps, loop };
  }
  function spriteIndex(source, age) { if(source.playback!=='particle-age')return 0;const raw=Math.floor(Math.max(0,age)*source.fps),count=source.frames.length;return source.loop?raw%count:Math.min(count-1,raw); }
  function draw(ctx, scene, emitter, frame, stats, surfaces) {
    if (emitter.hidden || frame.valuesFor(emitter).parentHidden || frame.valuesFor(emitter).timelineVisible === false) return;
    const values = frame.valuesFor(emitter), particle = values.particle || emitter.particle || {}, source = sourceFor(scene, Object.assign({}, emitter, { particle }));
    if (!source) throw new Error(`粒子发射器「${emitter.id}」找不到 sourceId`);
    const rendered = sourceFrames(scene, source, particle, frame, stats, surfaces);
    const count = clamp(Math.round(+particle.count || 0), 0, 600), life = Math.max(.001, +particle.life || 2), speed = Math.max(0, +particle.speed || 0), direction = (+particle.direction || 0) * Math.PI / 180, spread = Math.max(0, +particle.spread || 0) * Math.PI / 180, gravity = +particle.gravity || 0, wind = +particle.wind || 0, seed = +particle.seed || 1, scaleBase = Math.max(.01, +particle.size || 1), sizeVar = clamp(+particle.sizeVar || 0, 0, 1), baseAlpha = clamp(+particle.alpha || 0, 0, 1), emissionRange=particle.emissionRange, motionRange=particle.motionRange, time = frame.time;
    ctx.save();
    if (values.parentMatrix && ctx.transform) ctx.transform(...values.parentMatrix);
    ctx.globalAlpha *= (values.parentAlpha == null ? 1 : values.parentAlpha) * values.alpha;
    const pivot=api.modules.frame.pivotFor(values);ctx.translate(values.x + pivot.x, values.y + pivot.y); ctx.rotate(values.rot * Math.PI / 180); ctx.scale(values.scaleX, values.scaleY);ctx.translate(values.w / 2 - pivot.x, values.h / 2 - pivot.y);
    for (let index = 0; index < count; index++) {
      const age = (time + index / Math.max(1, count) * life) % life, angle = direction + (hash(index, 1, seed) * 2 - 1) * spread / 2, velocityX = Math.cos(angle) * speed, velocityY = Math.sin(angle) * speed, emission=sampleRange(emissionRange,index,seed,values.w,values.h), startX = emission.x-values.w/2, startY = emission.y-values.h/2, x = startX + velocityX * age + wind * age * age / 2, y = startY + velocityY * age + gravity * age * age / 2, scale = scaleBase * (1 + (hash(index, 4, seed) * 2 - 1) * sizeVar), opacity = baseAlpha * (particle.fade === false ? 1 : 1 - age / life), spin = ((+particle.spin || 0) + (+particle.spinSpeed || 0) * age + (hash(index, 5, seed) * 2 - 1) * (+particle.spinVar || 0)) * Math.PI / 180;
      if (opacity <= 0) continue;
      if (motionRange&&!rangeContains(motionRange,x+values.w/2,y+values.h/2,values.w,values.h)) continue;
      const sprite=rendered.frames[spriteIndex(rendered,age)]||rendered.frames[0];
      ctx.save(); ctx.globalAlpha *= opacity; ctx.translate(x, y); ctx.rotate(spin); ctx.scale(scale, scale); ctx.drawImage(sprite.capsule, -sprite.capsule.width / 2, -sprite.capsule.height / 2); ctx.restore(); stats.particlesDrawn += 1;
    }
    ctx.restore(); for(const sprite of rendered.frames)surfaces.release(sprite.capsule); stats.particleEmitters += 1; stats.particleSpriteBuilds += 1; stats.particleSpriteFrames=(stats.particleSpriteFrames||0)+rendered.frames.length;
  }
  api.modules.particles = Object.freeze({ draw, sourceFor });
})(typeof window !== 'undefined' ? window : globalThis);
