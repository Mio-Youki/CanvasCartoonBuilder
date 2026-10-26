/* ToSampool Runtime vNext source module: fast path now; capsule path lands in R2. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const effectEntries = group => Object.entries(group || {}).filter(([key, value]) => key !== 'controllers' && value && value.enabled);
  const visibleFormationEntries = group => effectEntries(group).filter(([id, config]) => id !== 'color-grade' || !!(+config.hue || +config.brightness || +config.contrast || +config.saturation));
  function timedGroup(frame, entity, group) {
    const output = Object.assign({}, group || {});
    for (const [id, config] of Object.entries(group||{}))if(id!=='controllers'&&config)output[id]=config.enabled?frame.effectValuesFor('object',entity.id,id,config):config;
    if (group && group.controllers) {
      output.controllers = {};
      for (const [id, config] of Object.entries(group.controllers)) output.controllers[id] = frame.controllerValuesFor('object', entity.id, id, config);
    }
    return output;
  }
  function effectsEnabled(entity,frame,scene) {
    const effects = entity.effects;
    if (!effects) return false;
    const base=!!(effects.mask && effects.mask.type !== 'none' || visibleFormationEntries(effects.formation).length || effectEntries(effects.decorate).length || effectEntries(effects.sample).length || api.modules.sampling.hasBaseGrid(effects.sample));
    const tracks=scene&&scene.timeline&&scene.timeline.tracks;
    if(!frame||!tracks)return base;
    const timed=['formation','decorate','sample'].some(stage=>Object.keys(effects[stage]||{}).some(id=>id!=='controllers'&&tracks[`effect:object:${entity.id}:${id}`]));
    if(!timed)return base;
    const formation=timedGroup(frame,entity,effects.formation),decorate=timedGroup(frame,entity,effects.decorate),sample=timedGroup(frame,entity,effects.sample);
    return !!(effects.mask && effects.mask.type !== 'none' || visibleFormationEntries(formation).length || effectEntries(decorate).length || effectEntries(sample).length || api.modules.sampling.hasBaseGrid(sample));
  }
  function boundsFor(values, padding, localBounds) {
    const local=localBounds||{x:0,y:0,w:values.w,h:values.h},matrix = values.worldMatrix || api.modules.frame.matrixFor(values), points = [[local.x, local.y], [local.x+local.w, local.y], [local.x+local.w, local.y+local.h], [local.x, local.y+local.h]].map(([x, y]) => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]]), xs = points.map(point => point[0]), ys = points.map(point => point[1]), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    return { x: Math.floor(minX - padding), y: Math.floor(minY - padding), w: Math.max(1, Math.ceil(maxX - minX + padding * 2)), h: Math.max(1, Math.ceil(maxY - minY + padding * 2)) };
  }
  /* Legacy scroll's “repeat” was a tiled stream, not merely a modulo applied
     to one object.  Keep that inexpensive semantic for every direct v4
     entity: build one effect capsule where needed, then place copies along
     the same local scroll axis. */
  function repeatOffsets(scene, entity, values) {
    const scroll = values && values.anim && values.anim.scroll || entity && entity.anim && entity.anim.scroll;
    // Match the legacy contract: repeat only has a visible meaning for an
    // actively moving scroll.  A disabled / zero-speed scroll remains one
    // object instead of unexpectedly filling the whole stage with copies.
    if (!scroll || scroll.repeat === false || !Number.isFinite(+scroll.speed) || !(+scroll.speed)) return null;
    const span = Math.max(1, +scroll.span || +values.w || 1), angle = (+scroll.angle || 0) * Math.PI / 180;
    // Keep the legacy tiled-stream semantics.  The preview scheduler, rather
    // than silently dropping visible tiles here, owns any future quality cap.
    const count = Math.ceil(Math.hypot(+scene.width || 1, +scene.height || 1) / span) + 2, result = [];
    for (let index = -count; index <= count; index++) result.push({ x:index * span * Math.cos(angle), y:index * span * Math.sin(angle) });
    return result;
  }
  function worldOffset(values, offset) { const matrix=values.parentMatrix || api.modules.frame.IDENTITY; return { x:matrix[0] * offset.x + matrix[2] * offset.y, y:matrix[1] * offset.x + matrix[3] * offset.y }; }
  function unsupported(entity, stage, entries) {
    const names = entries.map(([id]) => id).join(', ');
    throw new Error(`Runtime vNext 尚未实现实体「${entity.id}」在 ${stage} 阶段的效果：${names}`);
  }
  function capsulePlan(scene, entity, frame) {
    const values = frame.valuesFor(entity), effects = entity.effects || {}, formation = timedGroup(frame, entity, effects.formation), decorate = timedGroup(frame, entity, effects.decorate), sample = timedGroup(frame, entity, effects.sample), localBounds=api.modules.content.localBounds(entity,values,frame), bounds = boundsFor(values, Math.max(api.modules.decorate.padding(decorate),api.modules.sampling.padding(sample)),localBounds);
    const ascii=sample['ascii-mapping'];
    if(ascii&&ascii.enabled){
      // Capsules already use axis-aligned world-space sampling. Keep that
      // contract, but anchor whole cells to the rounded object origin rather
      // than to a shadow/part-dependent capsule minimum.
      const matrix=values.worldMatrix||api.modules.frame.matrixFor(values),cell=api.modules.ascii.geometry(ascii,api.modules.sampling.gridSize(sample),ascii.glyphAtlas||{width:8,height:8});
      const anchorX=Math.floor(matrix[4]),anchorY=Math.floor(matrix[5]),right=bounds.x+bounds.w,bottom=bounds.y+bounds.h;
      // A cell larger than the whole object must not allocate cell-sized
      // empty padding (size is intentionally an extensible numeric input).
      if(cell.width<=bounds.w)bounds.x=Math.floor(anchorX+Math.floor((bounds.x-anchorX)/cell.width)*cell.width);
      if(cell.height<=bounds.h)bounds.y=Math.floor(anchorY+Math.floor((bounds.y-anchorY)/cell.height)*cell.height);
      bounds.w=Math.max(1,Math.ceil(right-bounds.x));bounds.h=Math.max(1,Math.ceil(bottom-bounds.y));
    }
    return {values,effects,formation,decorate,sample,bounds};
  }
  function createCapsule(scene, entity, frame, stats, surfaces, objectSession) {
    const {values,effects,formation,decorate,sample,bounds}=capsulePlan(scene,entity,frame);
    let capsule = surfaces.acquire(bounds.w, bounds.h), local = capsule.getContext('2d');
    if (!local) throw new Error('对象视觉胶囊没有 2D 上下文');
    // A recycled surface may previously have been a nearest-neighbour sample
    // output. Source content must match its first draw, not inherit that state.
    local.imageSmoothingEnabled = true;
    local.clearRect(0, 0, bounds.w, bounds.h);
    local.save(); local.translate(-bounds.x, -bounds.y);
    api.modules.content.draw(local, scene, entity, values, frame, { x:bounds.x, y:bounds.y, deferComposite:true, surfaces });
    local.restore();
    const grade = formation && formation['color-grade'];
    if (grade && grade.enabled && (+grade.hue || +grade.brightness || +grade.contrast || +grade.saturation)) { const graded = api.modules.sceneEffects.colorGrade(capsule, grade, surfaces, frame); surfaces.release(capsule); capsule = graded; }
    const stages = Array.isArray(effects.pipeline) ? effects.pipeline : ['mask', 'decorate', 'sample'];
    for (const stage of stages) {
      if (stage === 'mask' && effects.mask) {
        if (!api.modules.masks.apply(capsule, effects.mask, bounds, scene, frame, surfaces, entity)) throw new Error(`Runtime vNext 尚未实现实体「${entity.id}」的 ${effects.mask.type || '未知'}蒙版`);
        stats.maskedObjects += 1;
      }
      if (stage === 'decorate') {
          const entries = effectEntries(decorate);
        if (entries.length) {
          const decorated = api.modules.decorate.apply(capsule, decorate, surfaces, frame, api.modules.sampling.gridSize(sample));
          if (decorated !== capsule) { surfaces.release(capsule); capsule = decorated; }
        }
      }
      if (stage === 'sample') {
          const entries = effectEntries(sample), hasGrid = api.modules.sampling.hasBaseGrid(sample);
        if (entries.length || hasGrid) {
          const accelerated=objectSession&&objectSession.sample(capsule,entity,sample,frame,bounds,surfaces,{formation,decorate});
          const sampled = accelerated||api.modules.sampling.apply(capsule, sample, surfaces, frame.paletteCapture?Object.assign({},frame,{paletteTarget:{scope:'object',ownerId:entity.id}}):frame); if (sampled !== capsule) { surfaces.release(capsule); capsule = sampled; }
        }
      }
    }
    return { capsule, bounds };
  }
  function drawCapsule(ctx, scene, entity, frame, stats, surfaces, objectSession) {
    const rendered = createCapsule(scene, entity, frame, stats, surfaces, objectSession);
    return drawCapsuleResult(ctx, rendered.capsule, rendered.bounds, stats, surfaces, frame.valuesFor(entity));
  }
  function drawCapsuleResult(ctx, capsule, bounds, stats, surfaces, values) {
    ctx.save();ctx.globalAlpha*=((values&&values.parentAlpha)==null?1:values.parentAlpha)*(values&&values.alpha==null?1:values.alpha);ctx.globalCompositeOperation=api.modules.blend.toCanvas(values&&values.blend);ctx.drawImage(capsule, bounds.x, bounds.y);ctx.restore(); surfaces.release(capsule); stats.capsuleObjects += 1;
  }
  function draw(ctx, scene, entity, frame, stats, surfaces, objectSession) {
    const values = frame.valuesFor(entity);
    if (entity.type === 'group' || entity.hidden || values.parentHidden || values.timelineVisible === false) return;
    const repeats = repeatOffsets(scene, entity, values);
    // A primitive resets its own Canvas composite mode while painting.  A
    // non-normal object blend therefore needs one isolated source image: all
    // parts are composed together first, then blended with the scene once.
    const objectBlend=api.modules.blend.toCanvas(values.blend);
    const layeredPattern=api.modules.pathGenerators?.active(values)||(values.parts||[]).some(p=>api.modules.pathGenerators?.active(p)||p.recipe?.definition?.format==='tosampool-pattern-generator/v1'||p.geometrySnapshot?.paintPlan),patternOpacity=layeredPattern&&((values.parentAlpha??1)*(values.alpha??1)!==1);
    if (effectsEnabled(entity,frame,scene) || objectBlend!=='source-over' || patternOpacity) {
      try {
        if (!repeats) drawCapsule(ctx, scene, entity, frame, stats, surfaces, objectSession);
        else { const rendered=createCapsule(scene, entity, frame, stats, surfaces, objectSession);ctx.save();ctx.globalAlpha*=((values.parentAlpha)==null?1:values.parentAlpha)*(values.alpha==null?1:values.alpha);ctx.globalCompositeOperation=api.modules.blend.toCanvas(values.blend);for(const offset of repeats){const world=worldOffset(values,offset);ctx.drawImage(rendered.capsule,rendered.bounds.x+world.x,rendered.bounds.y+world.y);}ctx.restore();surfaces.release(rendered.capsule);stats.capsuleObjects+=1; }
      }
      catch (error) { stats.unsupportedEffects.push(entity.id); throw error; }
      return;
    }
    if (!repeats) api.modules.content.draw(ctx, scene, entity, values, frame,{surfaces});
    else for (const offset of repeats) api.modules.content.draw(ctx, scene, entity, Object.assign({}, values, { x:(+values.x || 0)+offset.x, y:(+values.y || 0)+offset.y }), frame,{surfaces});
    stats.directObjects += 1;
  }
  api.modules.objects = Object.freeze({ draw, effectsEnabled, boundsFor, createCapsule, capsuleBounds:(scene,entity,frame)=>capsulePlan(scene,entity,frame).bounds });
})(typeof window !== 'undefined' ? window : globalThis);
