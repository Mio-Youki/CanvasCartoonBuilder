/* Sparse v4 track writer. Segment creation is explicit: value writes never auto-split. */
(function (global) {
  'use strict';

  const EPSILON = 0.000001;
  const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function tracks(scene) { return scene.timeline = Object.assign({ tracks: {} }, scene.timeline || {}), scene.timeline.tracks = Object.assign({}, scene.timeline.tracks || {}); }
  function visibilityMap(scene, create) {
    const timeline = scene && scene.timeline;
    if (!timeline) {
      if (!create) return null;
      scene.timeline = { tracks: {}, visibility: {} };
    }
    if (!scene.timeline.visibility) {
      if (!create) return null;
      scene.timeline.visibility = {};
    }
    return scene.timeline.visibility;
  }
  function sceneSegments(scene, create) {
    const timeline=scene&&scene.timeline;
    if(!timeline||!Array.isArray(timeline.scenes)||!timeline.scenes.length){
      if(!create)return[{id:'scene-1',name:'场景 1',f:[0,1]}];
      scene.timeline=Object.assign({tracks:{}},timeline||{});scene.timeline.scenes=[{id:'scene-1',name:'场景 1',f:[0,1]}];
    }
    return scene.timeline.scenes;
  }
  function uniqueSceneId(scene,base){const used=new Set(sceneSegments(scene,false).map(item=>item.id));let id=base||'scene',index=2;while(used.has(id))id=`${base||'scene'}-${index++}`;return id;}
  function sceneAt(scene,rel){const segments=sceneSegments(scene,false),found=at({segments},rel);return{index:found.index,segment:found.segment};}
  function renameScene(scene,index,name){const segments=sceneSegments(scene,true),segment=segments[index],value=String(name||'').trim();if(!segment||!value)return false;segment.name=value;return true;}
  function insertScene(scene,index,cut,name,placement){const segments=sceneSegments(scene,true),segment=segments[index];if(!segment)throw new Error('找不到要切分的 Scene');const start=+segment.f[0],end=+segment.f[1],position=finiteRel(cut);if(position<=start+EPSILON||position>=end-EPSILON)return false;const fresh={id:uniqueSceneId(scene,`scene-${segments.length+1}`),name:String(name||`场景 ${segments.length+1}`),f:placement==='after'?[position,end]:[start,position]};if(segment.background)fresh.background=copy(segment.background);if(placement==='after'){segment.f=[start,position];segments.splice(index+1,0,fresh);}else{segment.f=[position,end];segments.splice(index,0,fresh);}return fresh;}
  function moveSceneBoundary(scene,boundaryIndex,rel){const segments=sceneSegments(scene,true),left=segments[boundaryIndex],right=segments[boundaryIndex+1],position=finiteRel(rel);if(!left||!right)throw new Error('找不到要移动的 Scene 边界');if(position<=+left.f[0]+EPSILON||position>=+right.f[1]-EPSILON)return false;left.f[1]=position;right.f[0]=position;return true;}
  function removeScene(scene,index){const segments=sceneSegments(scene,true);if(segments.length<=1)return false;if(index<0||index>=segments.length)return false;const removed=segments[index];if(scene.timeline&&scene.timeline.tracks&&removed&&removed.id)delete scene.timeline.tracks[keyForSceneBackground(removed.id)];segments.splice(index,1);const count=segments.length;segments.forEach((segment,current)=>segment.f=[current/count,(current+1)/count]);return true;}
  function finiteRel(value) { const number = +value; if (!Number.isFinite(number) || number < -EPSILON || number > 1 + EPSILON) throw new Error('时段位置必须在 0 到 1 之间'); return Math.max(0, Math.min(1, number)); }
  function track(scene, key) {
    if (!key) throw new Error('时序轨道需要稳定键');
    const all = tracks(scene);
    if (!all[key]) all[key] = { segments: [{ f: [0, 1], values: {} }] };
    if (!Array.isArray(all[key].segments) || !all[key].segments.length) all[key].segments = [{ f: [0, 1], values: {} }];
    return all[key];
  }
  function at(input, rel) {
    const position = finiteRel(rel), segments = input && input.segments || [];
    const index = segments.findIndex((segment, current) => { const f = segment && segment.f || []; return position >= +f[0] - EPSILON && (position < +f[1] - EPSILON || current === segments.length - 1 && position <= +f[1] + EPSILON); });
    return { index: index < 0 ? Math.max(0, segments.length - 1) : index, segment: segments[index < 0 ? Math.max(0, segments.length - 1) : index] || null };
  }
  function split(scene, key, rel) {
    const input = track(scene, key), position = finiteRel(rel), found = at(input, position), segment = found.segment, f = segment && segment.f || [0, 1];
    if (!segment || position <= +f[0] + EPSILON || position >= +f[1] - EPSILON) return { index: found.index, created: false, segment };
    const left = copy(segment), right = copy(segment); left.f = [+f[0], position]; right.f = [position, +f[1]];
    input.segments.splice(found.index, 1, left, right); return { index: found.index + 1, created: true, segment: right };
  }
  function setStep(scene, key, index, values) {
    const input = track(scene, key), segment = input.segments[index];
    if (!segment) throw new Error('找不到要写入的时段');
    segment.type = 'step'; delete segment.from; delete segment.to; segment.values = Object.assign({}, segment.values || {}, copy(values || {})); return segment;
  }
  function setLinear(scene, key, index, options) {
    const input = track(scene, key), segment = input.segments[index];
    if (!segment) throw new Error('找不到要线性过渡的时段');
    segment.type = 'linear'; delete segment.values; delete segment.from; delete segment.to;
    if(options&&Array.isArray(options.linearKeys))segment.linearKeys=Array.from(new Set(options.linearKeys.map(String))).filter(Boolean);else delete segment.linearKeys;
    return segment;
  }
  /*
   * A parameter segment which has no values is semantically identical to the
   * document base value.  Keep only one contiguous base segment.  This is the
   * property-track counterpart of coalesceVisibility(): double-clicking a
   * timing segment should remove the cut when both sides now mean “base”.
   *
   * Do not merge populated step segments or linear segments: their boundary is
   * meaningful even when their current values happen to look alike.
   */
  function emptyStep(segment) {
    return !!segment && (!segment.type || segment.type === 'step') &&
      (!segment.values || !Object.keys(segment.values).length) &&
      !segment.from && !segment.to && !segment.linearKeys;
  }
  function coalesceTrack(input) {
    if (!input || !Array.isArray(input.segments)) return input;
    const merged = [];
    for (const raw of input.segments) {
      if (!raw || !Array.isArray(raw.f)) continue;
      const segment = copy(raw);
      segment.f = [finiteRel(raw.f[0]), finiteRel(raw.f[1])];
      if (segment.f[1] - segment.f[0] <= EPSILON) continue;
      const previous = merged[merged.length - 1];
      if (previous && emptyStep(previous) && emptyStep(segment) && Math.abs(previous.f[1] - segment.f[0]) <= EPSILON) previous.f[1] = segment.f[1];
      else merged.push(segment);
    }
    input.segments = merged.length ? merged : [{ f:[0, 1], values:{} }];
    return input;
  }
  function clearSegment(scene,key,index){const input=track(scene,key),segment=input.segments[index];if(!segment)return false;segment.type='step';segment.values={};delete segment.from;delete segment.to;delete segment.linearKeys;coalesceTrack(input);return true;}
  function moveBoundary(scene,key,boundaryIndex,rel){const input=track(scene,key),left=input.segments[boundaryIndex],right=input.segments[boundaryIndex+1],position=finiteRel(rel);if(!left||!right)throw new Error('找不到要移动的参数时段边界');if(position<=+left.f[0]+EPSILON||position>=+right.f[1]-EPSILON)return false;left.f[1]=position;right.f[0]=position;return true;}
  function clear(scene, key) { const all = tracks(scene); if (!all[key]) return false; delete all[key]; return true; }
  function visibility(scene, ownerId, create) {
    if (!ownerId) throw new Error('显示时段需要稳定实体 id');
    const map = visibilityMap(scene, !!create), key = String(ownerId);
    if (!map || !map[key]) {
      if (!create) return null;
      map[key] = { segments: [{ f:[0, 1], visible:true }] };
    }
    if (!Array.isArray(map[key].segments) || !map[key].segments.length) map[key].segments = [{ f:[0, 1], visible:true }];
    return map[key];
  }
  function visibilityAt(scene, ownerId, rel) {
    const input = visibility(scene, ownerId, false);
    if (!input) return true;
    const found = at(input, rel);
    return !found.segment || found.segment.visible !== false;
  }
  function splitVisibility(scene, ownerId, rel) {
    const input = visibility(scene, ownerId, true), position = finiteRel(rel), found = at(input, position), segment = found.segment, f = segment && segment.f || [0, 1];
    if (!segment || position <= +f[0] + EPSILON || position >= +f[1] - EPSILON) return { index:found.index, created:false, segment };
    const left = copy(segment), right = copy(segment); left.f = [+f[0], position]; right.f = [position, +f[1]];
    input.segments.splice(found.index, 1, left, right);
    return { index:found.index + 1, created:true, segment:right };
  }
  /* Property overlays are stored independently from visibility, but the editor
     projects them onto one lane.  Aligning before a write gives a timing value
     the same boundaries as the visible segment the user just selected. */
  function alignTrackToVisibility(scene, key, ownerId) {
    const visible = visibility(scene, ownerId, false), input = track(scene, key);
    if (!visible || !Array.isArray(visible.segments)) return input;
    for (const segment of visible.segments.slice(0, -1)) split(scene, key, segment.f[1]);
    return input;
  }
  function coalesceVisibility(input) {
    if (!input || !Array.isArray(input.segments)) return input;
    const merged = [];
    for (const raw of input.segments) {
      if (!raw || !Array.isArray(raw.f)) continue;
      const segment = { f:[finiteRel(raw.f[0]), finiteRel(raw.f[1])], visible:raw.visible !== false };
      if (segment.f[1] - segment.f[0] <= EPSILON) continue;
      const previous = merged[merged.length - 1];
      if (previous && previous.visible === segment.visible && Math.abs(previous.f[1] - segment.f[0]) <= EPSILON) previous.f[1] = segment.f[1];
      else merged.push(segment);
    }
    input.segments = merged.length ? merged : [{ f:[0, 1], visible:false }];
    return input;
  }
  function setVisibility(scene, ownerId, index, visibleValue) {
    const input = visibility(scene, ownerId, true), segment = input.segments[index];
    if (!segment) throw new Error('找不到要修改的显示时段');
    segment.visible = visibleValue !== false;
    return coalesceVisibility(input);
  }
  function toggleVisibility(scene, ownerId, rel) {
    const input = visibility(scene, ownerId, true), found = at(input, rel);
    if (!found.segment) throw new Error('找不到要切换的显示时段');
    found.segment.visible = found.segment.visible === false;
    coalesceVisibility(input);
    return found.segment.visible;
  }
  function moveVisibilityBoundary(scene, ownerId, boundaryIndex, rel) {
    const input = visibility(scene, ownerId, true), position = finiteRel(rel), left = input.segments[boundaryIndex], right = input.segments[boundaryIndex + 1];
    if (!left || !right) throw new Error('找不到要移动的显示时段边界');
    const min = +left.f[0] + EPSILON, max = +right.f[1] - EPSILON;
    if (position <= min || position >= max) return false;
    left.f[1] = position; right.f[0] = position; return true;
  }
  function clearVisibility(scene, ownerId) {
    const map = visibilityMap(scene, false), key = String(ownerId || '');
    if (!map || !map[key]) return false;
    delete map[key];
    if (!Object.keys(map).length) delete scene.timeline.visibility;
    return true;
  }
  function keyForEntity(id) { if (!id) throw new Error('实体时序需要稳定 id'); return String(id); }
  function keyForEffect(scope, ownerId, effectId) {
    if (!ownerId || !effectId) throw new Error('效果时序需要稳定宿主与效果 id');
    return scope === 'scene' ? `effect:scene:${ownerId}:${effectId}` : `effect:object:${ownerId}:${effectId}`;
  }
  function keyForController(scope, ownerId, controllerId) {
    if (!ownerId || !controllerId) throw new Error('共享采样控制器时序需要稳定宿主与控制器 id');
    return scope === 'scene' ? `controller:scene:${ownerId}:${controllerId}` : `controller:object:${ownerId}:${controllerId}`;
  }
  // A scene background is a local track: f:[0,1] always spans just its owning
  // top-level Scene.  Moving Scene boundaries therefore never invalidates a
  // background cut or changes its visual proportion.
  function keyForSceneBackground(sceneId) { if (!sceneId) throw new Error('场景背景时序需要稳定 Scene id'); return `scene-background:${sceneId}`; }
  global.EditorVNextTimelineState = Object.freeze({ EPSILON, sceneSegments, sceneAt, renameScene, insertScene, moveSceneBoundary, removeScene, track, at, split, setStep, setLinear, clearSegment, coalesceTrack, moveBoundary, clear, visibility, visibilityAt, splitVisibility, alignTrackToVisibility, setVisibility, toggleVisibility, moveVisibilityBoundary, clearVisibility, keyForEntity, keyForEffect, keyForController, keyForSceneBackground });
})(typeof window !== 'undefined' ? window : globalThis);
