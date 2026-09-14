(function (global) {
  'use strict';

  function loopOf(scene) {
    return Math.max(.001, +(scene && scene.loop) || 48);
  }

  function sceneCount(scene, fallback) {
    return Math.max(1, scene && Array.isArray(scene.scenes) && scene.scenes.length || fallback || 4);
  }

  function equalBorders(scene, count) {
    const loop = loopOf(scene), n = Math.max(1, +count || sceneCount(scene));
    return Array.from({ length: Math.max(0, n - 1) }, (_, index) => loop * (index + 1) / n);
  }

  function sceneBorders(scene, fallback) {
    const n = sceneCount(scene, fallback), borders = scene && scene.sceneBorders;
    return Array.isArray(borders) && borders.length === n - 1 ? borders : equalBorders(scene, n);
  }

  function sceneAt(scene, time, enabled) {
    if (!enabled || !scene || !Array.isArray(scene.scenes) || !scene.scenes.length) return -1;
    const loop = loopOf(scene), t = ((+time || 0) % loop + loop) % loop;
    const borders = sceneBorders(scene);
    for (let index = 0; index < borders.length; index++) if (t < borders[index]) return index;
    return borders.length;
  }

  function sceneRange(scene, index, fallback) {
    const loop = loopOf(scene), n = sceneCount(scene, fallback), borders = sceneBorders(scene, fallback);
    const part = Math.max(0, Math.min(n - 1, Math.floor(+index || 0)));
    return [part === 0 ? 0 : borders[part - 1], part === n - 1 ? loop : borders[part]];
  }

  // All segment consumers use right-open intervals except for the final segment.
  function segmentIndexAt(segments, relativeTime) {
    const list = Array.isArray(segments) && segments.length ? segments : [{ f: [0, 1] }];
    const rel = Math.max(0, Math.min(1, Number(relativeTime) || 0));
    const index = list.findIndex((segment, i) => {
      const range = segment && segment.f || [0, 1];
      return rel >= range[0] - .0001 && (rel < range[1] - .0001 || (i === list.length - 1 && rel <= range[1] + .0001));
    });
    return index >= 0 ? index : Math.max(0, list.length - 1);
  }

  function relativeTime(scene, sceneIndex, time, fallback) {
    const range = sceneRange(scene, sceneIndex, fallback);
    return Math.max(0, Math.min(1, ((+time || 0) - range[0]) / Math.max(.001, range[1] - range[0])));
  }

  global.EditorTimelineModel = Object.freeze({ loopOf, sceneCount, equalBorders, sceneBorders, sceneAt, sceneRange, segmentIndexAt, relativeTime });
})(typeof window !== 'undefined' ? window : globalThis);
