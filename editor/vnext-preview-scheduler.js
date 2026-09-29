/* v4 editor preview scheduling: clock movement is not automatically a Canvas redraw. */
(function (global) {
  'use strict';

  const own = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
  const finite = value => Number.isFinite(+value);

  function hasEnabledMotion(value, seen) {
    if (!value || typeof value !== 'object') return false;
    seen = seen || new WeakSet(); if (seen.has(value)) return false; seen.add(value);
    if (value.motion && value.motion.enabled) return true;
    if (value.anim && value.anim !== 'none') return true;
    for (const child of Object.values(value)) if (child && typeof child === 'object' && hasEnabledMotion(child, seen)) return true;
    return false;
  }

  function segmentIndex(segments, rel) {
    const list = Array.isArray(segments) && segments.length ? segments : [{ f:[0, 1] }];
    for (let index = 0; index < list.length; index++) {
      const f = list[index].f || [0, 1], start = +f[0] || 0, end = f[1] == null ? 1 : +f[1];
      if (rel >= start - .000001 && (rel < end - .000001 || index === list.length - 1 && rel <= end + .000001)) return index;
    }
    return list.length - 1;
  }

  // A `scene-background:<scene-id>` track is local to one top-level Scene.
  // Its f range is always 0..1 inside that Scene, not inside the whole loop.
  // Treating it as a global track made a newly inserted late Scene reuse the
  // first canvas frame until another invalidation happened.
  function sceneSegmentAt(scene, rel) {
    const list = scene && scene.timeline && Array.isArray(scene.timeline.scenes) && scene.timeline.scenes.length
      ? scene.timeline.scenes : [{ id:'scene-0', f:[0,1] }];
    const index = segmentIndex(list, rel), segment = list[index] || { f:[0,1] }, f = segment.f || [0,1];
    const start = +f[0] || 0, end = f[1] == null ? 1 : +f[1];
    return { index, segment, local:Math.max(0, Math.min(1, (rel - start) / Math.max(.000001, end - start))) };
  }

  function trackPosition(scene, key, rel) {
    if (!String(key || '').startsWith('scene-background:')) return rel;
    const current = sceneSegmentAt(scene, rel), id = String(key).slice('scene-background:'.length);
    // A track belonging to another Scene must still contribute a stable
    // signature, but it must never decide the current Scene's frame.
    return current.segment && String(current.segment.id || current.index) === id ? current.local : -1;
  }

  function profile(scene, time) {
    const value = scene || {}, loop = Math.max(.001, +value.loop || 4), local = ((+time || 0) % loop + loop) % loop, rel = local / loop;
    const activeScene = sceneSegmentAt(value, rel);
    let continuous = false;
    const assets = value.assets || {}, assetIsAnimated = id => {
      const asset = assets[id] || {}, frames = asset.frames;
      return Array.isArray(frames) && frames.length > 1 && +asset.fps > 0;
    };
    for (const entity of value.entities || []) {
      const builtins=global.ToSampoolRuntimeVNext&&global.ToSampoolRuntimeVNext.modules&&global.ToSampoolRuntimeVNext.modules.builtins;
      if (entity.type === 'builtin' && builtins && builtins.timeDependent(entity)) { continuous = true; break; }
      if (entity.type === 'particle-emitter' || hasEnabledMotion(entity)) { continuous = true; break; }
      if (entity.type === 'image' && ((+entity.frames > 1 && +entity.fps > 0) || assetIsAnimated(entity.assetId))) { continuous = true; break; }
    }
    if (!continuous) {
      for (const layer of value.background && value.background.layers || []) {
        if ((+layer.frames > 1 && +layer.fps > 0) || assetIsAnimated(layer.assetId)) { continuous = true; break; }
      }
    }
    if (!continuous && (hasEnabledMotion(value.sceneEffects) || hasEnabledMotion(value.effects))) continuous = true;
    // Scene transitions are evaluated from the playhead even if every object is
    // static.  Without this, the editor reuses its last Canvas frame while an
    // exported fixed-time render correctly advances through the transition.
    if (!continuous && (value.timeline && value.timeline.scenes || []).some(segment => segment && segment.transition && segment.transition.type && segment.transition.type !== 'none')) continuous = true;
    // Top-level Scene selection is itself a Step value.  In particular, a
    // newly inserted Scene can have only a different base background and no
    // local background track yet; it must still redraw immediately on seek.
    const signatures = [`scene:${activeScene.segment && (activeScene.segment.id || activeScene.index)}`];
    for (const [key, track] of Object.entries(value.timeline && value.timeline.tracks || {})) {
      const segments = track && track.segments || [];
      const position = trackPosition(value, key, rel), index = position < 0 ? -1 : segmentIndex(segments, position), segment = index < 0 ? {} : segments[index] || {};
      if (segment.type === 'linear') continuous = true;
      signatures.push(`${key}:${index}`);
    }
    signatures.sort();
    return { continuous, signature:signatures.join('|') || 'base' };
  }

  function create() {
    let dirty = true, lastSignature = null, reason = 'initial';
    const metrics = { requests:0, renders:0, staticSkips:0, budgetSkips:0, lastReason:'initial' };
    function invalidate(nextReason) { dirty = true; reason = nextReason || 'scene-change'; metrics.requests += 1; metrics.lastReason = reason; }
    function shouldRender(scene, time) {
      const state = profile(scene, time);
      if (dirty || state.continuous || state.signature !== lastSignature) return { render:true, state, reason };
      metrics.staticSkips += 1; return { render:false, state, reason:'static-cache' };
    }
    function rendered(state) { dirty = false; lastSignature = state.signature; metrics.renders += 1; }
    function deferred(){metrics.budgetSkips+=1;}
    function snapshot() { return Object.freeze(Object.assign({}, metrics, { dirty, lastSignature, reason })); }
    return Object.freeze({ invalidate, shouldRender, rendered, deferred, snapshot, profile });
  }

  global.EditorVNextPreviewScheduler = Object.freeze({ create, profile, segmentIndex, sceneSegmentAt, trackPosition, hasEnabledMotion });
})(typeof window !== 'undefined' ? window : globalThis);
