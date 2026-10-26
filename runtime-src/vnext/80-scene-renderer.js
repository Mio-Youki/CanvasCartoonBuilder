/* ToSampool Runtime vNext source module: deterministic fixed-time renderer. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  function sceneAt(scene,rel){const segments=scene.timeline&&Array.isArray(scene.timeline.scenes)&&scene.timeline.scenes.length?scene.timeline.scenes:[{f:[0,1]}];let index=segments.findIndex((segment,current)=>rel>=+(segment.f||[0,1])[0]-.000001&&(rel<+(segment.f||[0,1])[1]-.000001||current===segments.length-1&&rel<=+(segment.f||[0,1])[1]+.000001));if(index<0)index=Math.max(0,segments.length-1);return{index,segment:segments[index]};}
  function backgroundValues(scene,frame){
    const current=sceneAt(scene,frame.rel),segment=current.segment||{};
    return { current, values:Object.assign({color:'#000000',alpha:1},scene.background||{},segment.background||{}) };
  }
  function drawBackgroundFill(ctx,scene,frame){
    const background=backgroundValues(scene,frame).values,alpha=Math.max(0,Math.min(1,+background.alpha||0));
    if((background.color||background.fillPaint)&&alpha>0){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=api.modules.paint.style(ctx,background.fillPaint,{x:0,y:0,w:scene.width,h:scene.height},background.color);ctx.fillRect(0,0,scene.width,scene.height);ctx.restore();}
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
    return createPlayer(api.modules.scene.normalize(input));
  }
  function createPlayer(scene) {
    const surfaces = api.modules.surfaces.create();
    const maskSources=api.modules.maskSources.create(scene,surfaces);
    const particleSession=api.modules.particles.create(scene,surfaces,maskSources);
    let lastStats = null, backingSizeWrites = 0, outgoingPlayer = null, gpuExecutor = null, objectGpuSession = null;
    // View-only diagnostic. The same mask evaluator, frame and source cache are
    // used as normal composition; no project fields or normal draw state change.
    function renderMaskTo(target,t,options){
      const requested=options.maskPreview,frame=api.modules.frame.create(scene,t||0,options);
      let owner=null,mask,bounds={x:0,y:0,w:scene.width,h:scene.height};
      if(requested.scope==='object'){
        owner=scene.entities.find(e=>e.id===requested.ownerId);mask=owner?.effects?.mask;
        if(owner&&mask)bounds=api.modules.objects.capsuleBounds(scene,owner,frame);
      }else if(requested.scope==='particle-emission'||requested.scope==='particle-motion'){
        owner=scene.entities.find(e=>e.id===requested.ownerId);mask=owner?.particle?.[requested.scope==='particle-emission'?'emissionRange':'motionRange'];
      }else if(requested.scope==='scene'){
        const config=scene.sceneEffects?.overlay?.[requested.effectId]||scene.sceneEffects?.sample?.[requested.effectId];
        mask=config?.mask;
      }else throw Error('当前范围尚不支持蒙版预览');
      if(!mask||mask.type==='none')throw Error('预览的蒙版不存在或已移除');
      if(bounds.w>8192||bounds.h>8192||bounds.w*bounds.h>16777216)throw Error('蒙版预览超过离屏预算（8192边长／16MP）');
      if(!target?.getContext)throw Error('蒙版预览需要目标 Canvas');
      if(target.width!==scene.width)target.width=scene.width;if(target.height!==scene.height)target.height=scene.height;
      const ctx=target.getContext('2d');if(!ctx)throw Error('蒙版预览没有2D上下文');
      surfaces.beginFrame();
      const stats={time:frame.time,maskPreview:true,maskPreviewScope:requested.scope,sceneEffects:0,directObjects:0,capsuleObjects:0,maskedObjects:0,particleEmitters:0,particlesDrawn:0,particleSpriteBuilds:0,unsupportedEffects:[]};
      const session=options.objectBackend==='gpu-threshold-pilot'?(options._objectGpuSession||(objectGpuSession||(objectGpuSession=api.modules.objectGpu.create()))):null;
      if(session)session.beginFrame(scene,frame,{sceneGpu:false});
      const capture=maskSources.begin(frame,stats,{...options,_maskSourceObjectSession:session}),particleFrame=particleSession.begin(frame,stats,options);let matte=null,instances=null;
      try{
        instances=api.modules.pathInstances.begin(scene,frame,stats,surfaces);
        matte=surfaces.acquire(bounds.w,bounds.h);const out=matte.getContext('2d');out.save();out.setTransform(1,0,0,1,0,0);out.globalAlpha=1;out.globalCompositeOperation='copy';out.fillStyle='#ffffff';out.fillRect(0,0,matte.width,matte.height);out.restore();
        if(requested.scope.startsWith('particle-')&&mask.invert){const v=frame.valuesFor(owner);out.clearRect(0,0,matte.width,matte.height);out.save();out.transform(...v.worldMatrix);out.fillStyle='#ffffff';out.fillRect(0,0,v.w,v.h);out.restore();}
        if(!api.modules.masks.apply(matte,mask,bounds,scene,frame,surfaces,owner))throw Error('该来源尚不支持蒙版预览');
        ctx.save();try{ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='copy';ctx.fillStyle='#000000';ctx.fillRect(0,0,scene.width,scene.height);ctx.globalCompositeOperation='source-over';ctx.drawImage(matte,bounds.x,bounds.y);}finally{ctx.restore();}
        stats.surfaces=surfaces.stats();stats.workPixels=stats.surfaces.workPixels;stats.pixelPasses=stats.surfaces.pixelPasses;
        return Object.freeze(stats);
      }finally{if(matte)surfaces.release(matte);instances?.release();particleFrame.end();capture.end();}
    }
    function renderTo(target, t, options) {
      if(options?.maskPreview)return renderMaskTo(target,t,options);
      const profile=options&&options.sceneProfile?(options._sceneProfile||{}):null;
      if(profile)options=Object.assign({},options,{_sceneProfile:profile});
      const now=()=>profile?performance.now():0;
      const record=(name,start)=>{if(profile)profile[name]=(profile[name]||0)+performance.now()-start;};
      let phaseStart=now();
      if (!target || !target.getContext) throw new Error('renderTo 需要目标 Canvas');
      let canvasResized = false;
      if (target.width !== scene.width) { target.width = scene.width; backingSizeWrites += 1; canvasResized = true; }
      if (target.height !== scene.height) { target.height = scene.height; backingSizeWrites += 1; canvasResized = true; }
      const targetCtx = target.getContext('2d');
      if (!targetCtx) throw new Error('目标 Canvas 无 2D 上下文');
      surfaces.beginFrame();const frame = api.modules.frame.create(scene, t || 0,options);
      const fixedRoles=options&&options.sceneBackend==='gpu-experimental'&&options.sceneSurfacePolicy==='fixed-roles';
      const sceneEffectCount = api.modules.sceneEffects.activeCount(scene,frame), base = sceneEffectCount ? (fixedRoles?surfaces.acquireRole('scene-source',scene.width,scene.height):surfaces.acquire(scene.width, scene.height)) : target, ctx = base.getContext('2d');
      if (!ctx) throw new Error('场景绘制层没有 2D 上下文');
      const stats = { time: frame.time, directObjects: 0, capsuleObjects: 0, maskedObjects: 0, particleEmitters: 0, particlesDrawn: 0, particleSpriteBuilds: 0, sceneEffects: 0, unsupportedEffects: [], canvasResized, backingSizeWrites };
      const objectSession=options?.objectBackend==='gpu-threshold-pilot'?(options._objectGpuSession||(objectGpuSession||(objectGpuSession=api.modules.objectGpu.create()))):null;
      if(objectSession)objectSession.beginFrame(scene,frame,{sceneGpu:options.sceneBackend==='gpu-experimental'});
      const maskFrame=maskSources.begin(frame,stats,{...options,_maskSourceObjectSession:objectSession}),particleFrame=particleSession.begin(frame,stats,options);let instances;
      try{
      instances=api.modules.pathInstances.begin(scene,frame,stats,surfaces);
      record('playerSetup',phaseStart);phaseStart=now();
      ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, scene.width, scene.height);
      drawBackgroundFill(ctx,scene,frame);
      api.modules.content.drawBackground(ctx, scene, frame);
      const maskOnly = api.modules.masks.maskOnlySources(scene,frame);
      const instanceOnly=api.modules.pathInstances.hiddenSources(scene);
      const layerConsumers=scene.entities.filter(e=>e.type==='particle-emitter'&&e.particle?.mode==='layer'&&!e.hidden&&!frame.valuesFor(e).parentHidden&&frame.valuesFor(e).timelineVisible!==false);
      const layerOnly=new Set(layerConsumers.filter(e=>e.particle.showSource===false&&!layerConsumers.some(other=>other.particle.sourceId===e.particle.sourceId&&other.particle.showSource!==false)).map(e=>e.particle.sourceId));
      for (const entity of scene.entities) {
        if (maskOnly.has(entity.id) || instanceOnly.has(entity.id) || layerOnly.has(entity.id) || entity.particleSourceOnly || entity.referenceSourceOnly === true) continue;
        if (entity.type === 'particle-emitter') api.modules.particles.draw(ctx, scene, entity, frame, stats, surfaces);
        else api.modules.objects.draw(ctx, scene, entity, frame, stats, surfaces, objectSession);
      }
      ctx.restore();
      if(objectSession){stats.objectGpu=objectSession.snapshot();stats.objectBackend=stats.objectGpu.handled?'gpu-object-sampling':'cpu';}
      record('sourceDraw',phaseStart);phaseStart=now();
      let current = base;
      const wantsGpu=options&&options.sceneBackend==='gpu-experimental';
      const executor=wantsGpu?(options._sceneGpuExecutor||(gpuExecutor||(gpuExecutor=api.modules.sceneGpu.create()))):null;
      const transition=(!options||!options._skipTransition)?transitionState(scene,frame):null;
      let gpuTransition=false;
      if(executor&&transition&&transition.type!=='blackout'&&options.sceneGpuTransitions===true){
        const previousFrame=api.modules.frame.create(scene,outgoingTransitionTime(scene,transition),options);
        const incomingPlan=api.modules.sceneGpu.plan(scene,frame),outgoingPlan=api.modules.sceneGpu.plan(scene,previousFrame);
        // Different work sizes would rebuild the executor and discard the first
        // texture. Keep the established Canvas transition in that case.
        gpuTransition=!incomingPlan.reason&&!outgoingPlan.reason&&incomingPlan.grid===outgoingPlan.grid;
      }
      const gpuOptions=gpuTransition?Object.assign({},options,{_sceneGpuSlot:'incoming'}):options;
      record('playerPlanning',phaseStart);
      const gpuResult=executor?executor.render(base,scene,frame,surfaces,targetCtx,gpuOptions):null;
      stats.sceneBackend=gpuResult&&gpuResult.handled?'gpu':'cpu';
      stats.frameGpuUploads=gpuResult&&gpuResult.handled?gpuResult.uploads:0;
      stats.frameGpuPasses=gpuResult&&gpuResult.handled?gpuResult.passes:0;
      if(gpuResult){stats.sceneGpu=Object.assign({},executor.stats(),gpuResult);delete stats.sceneGpu.surface;}
      if(gpuResult&&gpuResult.surfaceTrace)stats.sceneSurfaceTrace=gpuResult.surfaceTrace;
      if(gpuResult&&gpuResult.handled)stats.sceneEffects=gpuResult.count;
      else {phaseStart=now();for (const stage of scene.sceneEffects.pipeline || ['overlay', 'sample']) {
        if (stage !== 'overlay' && stage !== 'sample') continue;
        const applied = api.modules.sceneEffects.applyStage(current, stage, scene, frame, surfaces); if (applied.surface !== current) { if (current !== base) surfaces.release(current); current = applied.surface; } stats.sceneEffects += applied.count;
      }record('cpuSceneEffects',phaseStart);}
      phaseStart=now();
      if (base !== target) { if(!gpuResult||!gpuResult.handled){targetCtx.clearRect(0, 0, scene.width, scene.height); targetCtx.drawImage(current, 0, 0);if(current!==base)surfaces.release(current);}surfaces.release(base); }
      record('canvasCopy',phaseStart);
      // Both sides of an entry transition retain their own running clocks.
      // The outgoing Scene plays through its final `duration`, while the
      // incoming Scene plays through its first `duration`; only the composite
      // mask is frozen.  Rendering the preceding Scene at f[1] here made every
      // wipe and dissolve look like a still-frame transition in the editor.
      if(transition){
        if(transition.type==='blackout'){phaseStart=now();drawTransition(targetCtx,scene,frame,null);record('canvasTransition',phaseStart);stats.transitionCompositeBackend='cpu';}
        else{
          const previousTime=outgoingTransitionTime(scene,transition),previous=fixedRoles?surfaces.acquireRole('scene-previous',scene.width,scene.height):surfaces.acquire(scene.width,scene.height);
          if(options&&options.sceneSurfaceTrace)stats.transitionTargetTrace=surfaces.describe(previous);
          let retryCpu=false;
          try{
            if(!outgoingPlayer)outgoingPlayer=createPlayer(scene);
            const previousOptions=Object.assign({},options||{},{_skipTransition:true,_sceneGpuExecutor:executor});
            if(gpuTransition)previousOptions._sceneGpuSlot='outgoing';
            const previousStats=outgoingPlayer.renderTo(previous,previousTime,previousOptions);
            stats.transitionBackend=previousStats.sceneBackend;stats.transitionSurfaces=previousStats.surfaces;
            if(previousStats.sceneSurfaceTrace)stats.transitionSurfaceTrace=previousStats.sceneSurfaceTrace;
            stats.frameGpuUploads+=previousStats.frameGpuUploads;stats.frameGpuPasses+=previousStats.frameGpuPasses;
            if(gpuTransition){
              if(gpuResult?.handled&&previousStats.sceneBackend==='gpu'&&executor.composeTransition(transition,targetCtx,options)){
                stats.transitionCompositeBackend='gpu';stats.frameGpuPasses+=1;
                stats.sceneGpu=Object.assign({},stats.sceneGpu,executor.stats());
              }else retryCpu=true;
            }else{phaseStart=now();drawTransition(targetCtx,scene,frame,previous);record('canvasTransition',phaseStart);stats.transitionCompositeBackend='cpu';}
          }finally{surfaces.release(previous);}
          // A deferred side was never drawn to Canvas. On any error redraw the
          // entire frame through the proven CPU path, not stale GPU textures.
          if(retryCpu){const reason=executor.stats().contextLost?'webgl-context-lost':'gpu-transition-failed';const result=renderTo(target,t,Object.assign({},options,{sceneBackend:'cpu',_sceneGpuExecutor:null}));lastStats=Object.freeze(Object.assign({},result,{transitionGpuFallback:reason}));return lastStats;}
        }
      }
      if(profile)stats.sceneProfileMs=Object.freeze(Object.assign({},profile));
      stats.previewPixelDivMultiplier=frame.preview.pixelDivMultiplier;stats.surfaces = surfaces.stats();stats.workPixels=stats.surfaces.workPixels;stats.pixelPasses=stats.surfaces.pixelPasses;lastStats = Object.freeze(stats); return lastStats;
      }finally{instances?.release();particleFrame.end();maskFrame.end();}
    }
    function clearCaches(){particleSession.clear();maskSources.clear();surfaces.clear();if(gpuExecutor)gpuExecutor.dispose();gpuExecutor=null;if(objectGpuSession)objectGpuSession.dispose();objectGpuSession=null;if(outgoingPlayer)outgoingPlayer.clearCaches();outgoingPlayer=null;}
    return Object.freeze({ scene, renderTo, getLastFrameStats: () => lastStats, clearCaches, dispose:clearCaches });
  }
  api.modules.renderer = Object.freeze({ referenceSources:true,maskPreview:1,createRuntime,drawTransition,transitionState,outgoingTransitionTime,sceneAt,backgroundValues,drawBackgroundFill });
})(typeof window !== 'undefined' ? window : globalThis);
