/* ToSampool Runtime vNext source module: deterministic shared-sprite particle emitters. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const hash = (index, salt, seed) => api.modules.sampling.hash(index, salt, seed | 0, 0);
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const positive = (value, fallback) => Math.max(1, finite(value, fallback));
  const sessions=new WeakMap(),keyFrame=frame=>frame?._maskSourceFrame||frame;
  function create(scene,surfaces,sourceSession){
    const ownedSources=!sourceSession,maskSources=sourceSession||api.modules.maskSources.create(scene,surfaces),sampler=api.modules.maskSampler.create(scene,surfaces),schedules=new Map(),births=new Map(),layers=api.modules.layerFragments.create(scene,surfaces,maskSources);
    const stream=api.modules.layerStream.create(scene,surfaces,maskSources,sampler);
    function remember(key,value){births.set(key,value);while(births.size>8192)births.delete(births.keys().next().value);return value;}
    function begin(frame,stats,options={}){const key=keyFrame(frame),previous=sessions.get(key);sessions.set(key,{evaluate:(emitter)=>evaluate(emitter,frame,stats,options),drawLayer:layers.draw,drawStream:stream.draw,display:(mask,emitter,current,drawStats)=>sampler.prepare(mask,emitter,current,drawStats,true)});return{end(){if(previous)sessions.set(key,previous);else sessions.delete(key);}};}
    function evaluate(emitter,frame,stats,options){
      let schedule=schedules.get(emitter.id);if(!schedule){schedule=api.modules.particleBirths.create(scene,emitter);schedules.set(emitter.id,schedule);}
      const time=frame.time,frames=new Map(),at=t=>{if(!frames.has(t))frames.set(t,api.modules.frame.create(scene,t,{pixelDivMultiplier:1}));return frames.get(t);},list=[];
      const events=schedule.candidates(time);if(emitter.particle.mode==='layer'&&emitter.particle.layerEmission==='continuous')stream.retain(emitter,events);
      for(const event of events){
        stats.particleBirthCandidates=(stats.particleBirthCandidates||0)+1;
        const key=emitter.id+'|'+event.id+'|'+(options.maskSourceQuality||'configured');let record;
        if(births.has(key)){record=births.get(key);stats.particleBirthHits=(stats.particleBirthHits||0)+1;}
        else{
          const birthFrame=at(event.birthTime),values=birthFrame.valuesFor(emitter),p=values.particle||emitter.particle||{},actual=api.modules.particleBirths.parameters(values);
          record=null;
          if(actual.count===event.count&&actual.life===event.life&&!values.parentHidden&&values.timelineVisible!==false){
            if(emitter.particle.mode==='layer'&&emitter.particle.layerEmission==='continuous'){
              const seed=Number.isFinite(+p.seed)?+p.seed:1,picked=stream.pick(emitter,event.birthTime,hash(event.slot,2,seed),hash(event.slot,3,seed),stats);
              if(picked)record={...event,...picked,matrix:values.worldMatrix.slice(0,4),particle:p,seed};
            }else{
            let sourceContext=null,instances=null,range=null;const subStats={};
            try{
              if(p.emissionRange?.type==='element'){sourceContext=maskSources.begin(birthFrame,subStats,{...options,_maskSourceObjectSession:null});instances=api.modules.pathInstances.begin(scene,birthFrame,subStats,surfaces);}
              range=sampler.prepare(p.emissionRange,emitter,birthFrame,stats);
              const seed=Number.isFinite(+p.seed)?+p.seed:1,position=range.pick(hash(event.slot,2,seed),hash(event.slot,3,seed),hash(event.slot,7,seed),hash(event.slot,8,seed));
              if(position)record={...event,position,matrix:values.worldMatrix.slice(0,4),particle:p,seed};
            }finally{
              range?.release();instances?.release();sourceContext?.end();
              for(const field of ['maskSourceBuilds','maskSourceHits','maskSourceMs','maskSourcePixels','maskSourceDraws'])if(subStats[field])stats[field]=(stats[field]||0)+subStats[field];
            }
            }
          }
          remember(key,record);stats.particleBirthBuilds=(stats.particleBirthBuilds||0)+1;
        }
        if(!record)continue;
        const age=time-record.birthTime,M=record.matrix,{dx,dy,scale,opacity,spin}=api.modules.particleBirths.motion(record.particle,record.slot,record.seed,age,record.life);
        const x=record.position[0]+M[0]*dx+M[2]*dy,y=record.position[1]+M[1]*dx+M[3]*dy;
        if(opacity>0&&age>=-1e-9&&age<record.life-1e-9)list.push({id:key,birthTime:record.birthTime,age,x,y,matrix:M,scale,opacity,spin,origin:record.position,sampleTime:record.sampleTime});
        if(list.length>4096)throw Error('存活粒子超过4096预算，请减少数量／寿命时序重叠');
      }
      return list;
    }
    return Object.freeze({begin,evaluate,drawLayer:layers.draw,drawStream:stream.draw,display:(mask,emitter,frame,stats)=>sampler.prepare(mask,emitter,frame,stats,true),clear(){stream.clear();layers.clear();births.clear();schedules.clear();sampler.clear();if(ownedSources)maskSources.clear();}});
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
    const active=sessions.get(keyFrame(frame)),temporary=active?null:create(scene,surfaces),session=active||{evaluate:e=>temporary.evaluate(e,frame,stats,{})};
    let rendered=null,range=null;
    try{
      if(emitter.particle.mode==='layer'){
        const ownerSession=active||temporary;range=ownerSession.display(particle.motionRange,emitter,frame,stats);
        if(emitter.particle.layerEmission==='continuous')ownerSession.drawStream(ctx,emitter,frame,stats,session.evaluate(emitter),range);
        else ownerSession.drawLayer(ctx,emitter,frame,stats,range);
        stats.particleEmitters+=1;return;
      }
      const particles=session.evaluate(emitter);stats.particleEmitters+=1;if(!particles.length)return;
      rendered=sourceFrames(scene,source,particle,frame,stats,surfaces);
      const ownerSession=active||temporary;range=ownerSession.display(particle.motionRange,emitter,frame,stats);
      const sourceValues=frame.valuesFor(source),alpha=(values.parentAlpha==null?1:values.parentAlpha)*values.alpha*(sourceValues.parentAlpha==null?1:sourceValues.parentAlpha)*(sourceValues.alpha==null?1:sourceValues.alpha);
      ctx.save();try{
        ctx.globalAlpha*=alpha;
        for(const p of particles){const opacity=p.opacity*range.at(p.x,p.y);if(opacity<=0)continue;const sprite=rendered.frames[spriteIndex(rendered,p.age)]||rendered.frames[0];
          ctx.save();try{ctx.globalAlpha*=opacity;ctx.translate(p.x,p.y);ctx.transform(p.matrix[0],p.matrix[1],p.matrix[2],p.matrix[3],0,0);ctx.rotate(p.spin);ctx.scale(p.scale,p.scale);ctx.drawImage(sprite.capsule,-sprite.capsule.width/2,-sprite.capsule.height/2);}finally{ctx.restore();}stats.particlesDrawn++;
        }
      }finally{ctx.restore();}
      stats.particleSpriteBuilds+=1;stats.particleSpriteFrames=(stats.particleSpriteFrames||0)+rendered.frames.length;
    }finally{range?.release();if(rendered)for(const sprite of rendered.frames)surfaces.release(sprite.capsule);temporary?.clear();}
  }
  api.modules.particles = Object.freeze({ birthRanges:1,create,draw,sourceFor });
})(typeof window !== 'undefined' ? window : globalThis);
