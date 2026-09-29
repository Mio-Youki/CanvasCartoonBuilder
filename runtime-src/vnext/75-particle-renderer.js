/* ToSampool Runtime vNext source module: deterministic shared-sprite particle emitters. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const hash = (index, salt, seed) => api.modules.sampling.hash(index, salt, seed | 0, 0);
  function sourceFor(scene, emitter) {
    const id = emitter.particle && emitter.particle.sourceId;
    return scene.entities.find(entity => entity.id === id) || null;
  }
  function draw(ctx, scene, emitter, frame, stats, surfaces) {
    if (emitter.hidden || frame.valuesFor(emitter).parentHidden || frame.valuesFor(emitter).timelineVisible === false) return;
    const values = frame.valuesFor(emitter), particle = values.particle || emitter.particle || {}, source = sourceFor(scene, Object.assign({}, emitter, { particle }));
    if (!source) throw new Error(`粒子发射器「${emitter.id}」找不到 sourceId`);
    const rendered = api.modules.objects.createCapsule(scene, source, frame, stats, surfaces), sprite = rendered.capsule;
    const count = clamp(Math.round(+particle.count || 0), 0, 600), life = Math.max(.001, +particle.life || 2), speed = Math.max(0, +particle.speed || 0), direction = (+particle.direction || 0) * Math.PI / 180, spread = Math.max(0, +particle.spread || 0) * Math.PI / 180, gravity = +particle.gravity || 0, wind = +particle.wind || 0, seed = +particle.seed || 1, scaleBase = Math.max(.01, +particle.size || 1), sizeVar = clamp(+particle.sizeVar || 0, 0, 1), baseAlpha = clamp(+particle.alpha || 0, 0, 1), time = frame.time;
    ctx.save();
    if (values.parentMatrix && ctx.transform) ctx.transform(...values.parentMatrix);
    ctx.globalAlpha *= (values.parentAlpha == null ? 1 : values.parentAlpha) * values.alpha;
    const pivot=api.modules.frame.pivotFor(values);ctx.translate(values.x + pivot.x, values.y + pivot.y); ctx.rotate(values.rot * Math.PI / 180); ctx.scale(values.scaleX, values.scaleY);ctx.translate(values.w / 2 - pivot.x, values.h / 2 - pivot.y);
    for (let index = 0; index < count; index++) {
      const age = (time + index / Math.max(1, count) * life) % life, angle = direction + (hash(index, 1, seed) * 2 - 1) * spread / 2, velocityX = Math.cos(angle) * speed, velocityY = Math.sin(angle) * speed, startX = hash(index, 2, seed) * values.w - values.w / 2, startY = hash(index, 3, seed) * values.h - values.h / 2, x = startX + velocityX * age + wind * age * age / 2, y = startY + velocityY * age + gravity * age * age / 2, scale = scaleBase * (1 + (hash(index, 4, seed) * 2 - 1) * sizeVar), opacity = baseAlpha * (particle.fade === false ? 1 : 1 - age / life), spin = ((+particle.spin || 0) + (+particle.spinSpeed || 0) * age + (hash(index, 5, seed) * 2 - 1) * (+particle.spinVar || 0)) * Math.PI / 180;
      if (opacity <= 0) continue;
      ctx.save(); ctx.globalAlpha *= opacity; ctx.translate(x, y); ctx.rotate(spin); ctx.scale(scale, scale); ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2); ctx.restore(); stats.particlesDrawn += 1;
    }
    ctx.restore(); surfaces.release(sprite); stats.particleEmitters += 1; stats.particleSpriteBuilds += 1;
  }
  api.modules.particles = Object.freeze({ draw, sourceFor });
})(typeof window !== 'undefined' ? window : globalThis);
