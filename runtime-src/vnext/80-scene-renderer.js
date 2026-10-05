/* ToSampool Runtime vNext source module: deterministic fixed-time renderer. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  function sceneAt(scene,rel){const segments=scene.timeline&&Array.isArray(scene.timeline.scenes)&&scene.timeline.scenes.length?scene.timeline.scenes:[{f:[0,1]}];let index=segments.findIndex((segment,current)=>rel>=+(segment.f||[0,1])[0]-.000001&&(rel<+(segment.f||[0,1])[1]-.000001||current===segments.length-1&&rel<=+(segment.f||[0,1])[1]+.000001));if(index<0)index=Math.max(0,segments.length-1);return{index,segment:segments[index]};}
  function backgroundValues(scene,frame){
    const current=sceneAt(scene,frame.rel),segment=current.segment||{},range=segment.f||[0,1],local=Math.max(0,Math.min(1,(frame.rel-(+range[0]||0))/Math.max(.000001,(+range[1]||1)-(+range[0]||0)))),base=Object.assign({color:'#000000',alpha:1},scene.background||{},segment.background||{}),key=`scene-background:${segment.id||current.index}`,track=scene.timeline&&scene.timeline.tracks&&scene.timeline.tracks[key],timed=api.modules.timeline&&api.modules.timeline.segmentAt(track&&track.segments,local);
    return { current, local, values:api.modules.timeline&&api.modules.timeline.applyValues?api.modules.timeline.applyValues(base,timed,local,track&&track.segments):base };
  }
  function drawBackgroundFill(ctx,scene,frame){
    const background=backgroundValues(scene,frame).values,alpha=Math.max(0,Math.min(1,+background.alpha||0));
    if(background.color&&alpha>0){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=background.color;ctx.fillRect(0,0,scene.width,scene.height);ctx.restore();}
    const pattern=background.fillPattern;
    if(pattern&&pattern.type&&pattern.type!=='none'&&api.modules.pattern){ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,pattern.opacity==null?1:+pattern.opacity));api.modules.pattern.paint(ctx,scene.width,scene.height,pattern,pattern.color||background.color||'#ffffff');ctx.restore();}
    return background;
  }
  function transitionHash(x,y,seed){let value=(Math.imul(x+1,374761393)^Math.imul(y+1,668265263)^Math.imul(seed+1,69069))>>>0;value=Math.imul(value^value>>>13,1274126177);return((value^value>>>16)>>>0)/4294967296;}
  function transitionState(scene,frame){const current=sceneAt(scene,frame.rel),segment=current.segment||{},raw=segment.transition||{},legacyType=raw.type==='scan'?'wipe':raw.type||'none',type=['blackout','fade','wipe','dissolve'].includes(legacyType)?legacyType:'none';if(type==='none'||current.index<=0)return null;const range=segment.f||[0,1],sceneDuration=Math.max(.001,(+range[1]-+range[0])*scene.loop),duration=Math.max(.001,Math.min(sceneDuration,+raw.duration||.25)),localTime=Math.max(0,(frame.rel-+range[0])*scene.loop),progress=Math.max(0,Math.min(1,localTime/duration));if(progress>=1)return null;return{current,segment,config:raw,type,duration,progress,direction:raw.direction||((raw.type==='scan')?'down':'right')};}
  function outgoingTransitionTime(scene,state){if(!state)return 0;const previous=(scene.timeline&&scene.timeline.scenes||[])[state.current.index-1],end=Math.max(0,((previous&&previous.f&&previous.f[1])||0)*scene.loop),elapsed=Math.max(0,Math.min(state.duration,state.progress*state.duration));return Math.max(0,end-state.duration+elapsed);}
  // `next` is already on ctx. Fade / Wipe / Dissolve composite the previous
  // Scene where it has not been revealed. Blackout retains the Legacy black-
  // field language: a configurable colour cover fades away to the new Scene.
  function drawTransition(ctx,scene,frame,previous){const state=transitionState(scene,frame);if(!state)return false;const width=scene.width,height=scene.height,progress=state.progress;if(state.type!=='blackout'&&(!previous||!ctx.drawImage))return false;ctx.save();ctx.globalCompositeOperation='source-over';if(state.type==='blackout'){ctx.globalAlpha=1-progress;ctx.fillStyle=state.config.color||'#000000';ctx.fillRect(0,0,width,height);}else if(state.type==='fade'){ctx.globalAlpha=1-progress;ctx.drawImage(previous,0,0);}
    else if(state.type==='wipe'){ctx.beginPath();if(state.direction==='left')ctx.rect(0,0,Math.ceil(width*(1-progress)),height);else if(state.direction==='up')ctx.rect(0,0,width,Math.ceil(height*(1-progress)));else if(state.direction==='down')ctx.rect(0,Math.floor(height*progress),width,height);else ctx.rect(Math.floor(width*progress),0,width,height);ctx.clip();ctx.drawImage(previous,0,0);}
    else if(state.type==='dissolve'){const size=Math.max(1,Math.round(+state.config.cell||Math.max(2,Math.min(width,height)/36))),seed=Math.round(+state.config.seed||13);for(let y=0;y<height;y+=size)for(let x=0;x<width;x+=size)if(transitionHash((x/size)|0,(y/size)|0,seed)>progress)ctx.drawImage(previous,x,y,size,size,x,y,size,size);}
    ctx.restore();return true;}
  function createRuntime(input) {
    const scene = api.modules.scene.normalize(input);
    const surfaces = api.modules.surfaces.create();
    let lastStats = null, backingSizeWrites = 0;
    function renderTo(target, t, options) {
      if (!target || !target.getContext) throw new Error('renderTo 需要目标 Canvas');
      let canvasResized = false;
      if (target.width !== scene.width) { target.width = scene.width; backingSizeWrites += 1; canvasResized = true; }
      if (target.height !== scene.height) { target.height = scene.height; backingSizeWrites += 1; canvasResized = true; }
      const targetCtx = target.getContext('2d');
      if (!targetCtx) throw new Error('目标 Canvas 无 2D 上下文');
      surfaces.beginFrame();const frame = api.modules.frame.create(scene, t || 0,options);
      const sceneEffectCount = api.modules.sceneEffects.activeCount(scene), base = sceneEffectCount ? surfaces.acquire(scene.width, scene.height) : target, ctx = base.getContext('2d');
      if (!ctx) throw new Error('场景绘制层没有 2D 上下文');
      const stats = { time: frame.time, directObjects: 0, capsuleObjects: 0, maskedObjects: 0, particleEmitters: 0, particlesDrawn: 0, particleSpriteBuilds: 0, sceneEffects: 0, unsupportedEffects: [], canvasResized, backingSizeWrites };
      ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, scene.width, scene.height);
      drawBackgroundFill(ctx,scene,frame);
      api.modules.content.drawBackground(ctx, scene, frame);
      const maskOnly = api.modules.masks.maskOnlySources(scene);
      for (const entity of scene.entities) {
        if (maskOnly.has(entity.id) || entity.particleSourceOnly) continue;
        if (entity.type === 'particle-emitter') api.modules.particles.draw(ctx, scene, entity, frame, stats, surfaces);
        else api.modules.objects.draw(ctx, scene, entity, frame, stats, surfaces);
      }
      ctx.restore();
      let current = base;
      for (const stage of scene.sceneEffects.pipeline || ['overlay', 'sample']) {
        if (stage !== 'overlay' && stage !== 'sample') continue;
        const applied = api.modules.sceneEffects.applyStage(current, stage, scene, frame, surfaces); if (applied.surface !== current) { if (current !== base) surfaces.release(current); current = applied.surface; } stats.sceneEffects += applied.count;
      }
      if (base !== target) { targetCtx.clearRect(0, 0, scene.width, scene.height); targetCtx.drawImage(current, 0, 0); if (current !== base) surfaces.release(current); surfaces.release(base); }
      // Both sides of an entry transition retain their own running clocks.
      // The outgoing Scene plays through its final `duration`, while the
      // incoming Scene plays through its first `duration`; only the composite
      // mask is frozen.  Rendering the preceding Scene at f[1] here made every
      // wipe and dissolve look like a still-frame transition in the editor.
      if(!options||!options._skipTransition){const transition=transitionState(scene,frame);if(transition){if(transition.type==='blackout')drawTransition(targetCtx,scene,frame,null);else{const previousTime=outgoingTransitionTime(scene,transition),previous=surfaces.acquire(scene.width,scene.height);try{createRuntime(scene).renderTo(previous,previousTime,Object.assign({},options||{},{_skipTransition:true}));drawTransition(targetCtx,scene,frame,previous);}finally{surfaces.release(previous);}}}}
      stats.previewPixelDivMultiplier=frame.preview.pixelDivMultiplier;stats.surfaces = surfaces.stats();stats.workPixels=stats.surfaces.workPixels;stats.pixelPasses=stats.surfaces.pixelPasses;lastStats = Object.freeze(stats); return lastStats;
    }
    return Object.freeze({ scene, renderTo, getLastFrameStats: () => lastStats, clearCaches: () => surfaces.clear() });
  }
  api.modules.renderer = Object.freeze({ createRuntime,drawTransition,transitionState,outgoingTransitionTime,sceneAt,backgroundValues,drawBackgroundFill });
})(typeof window !== 'undefined' ? window : globalThis);
