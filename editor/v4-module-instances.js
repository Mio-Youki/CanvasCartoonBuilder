/* Resource-to-instance adapter. Creating an instance never loads executable code. */
(function (global) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])) : value;

  function definition(scene, id, scope) {
    const descriptor = scene.modules?.[id], manifest = descriptor?.manifest;
    if (!manifest || manifest.format !== 'tosampool-scene-module/v1' || manifest.id !== id || !Number.isInteger(+manifest.version) || +manifest.version < 1) {
      throw Error('程序构件描述无效：' + id);
    }
    for (const asset of manifest.assets || []) {
      const assetId = typeof asset === 'string' ? asset : asset?.id;
      if (!assetId || !scene.assets?.[assetId]) throw Error('程序构件缺少依赖素材：' + assetId);
    }
    const record = global.ToSampoolRuntimeVNext.modules.sceneModules.definition(id, manifest.version, {scope});
    if (JSON.stringify(ordered(record.manifest)) !== JSON.stringify(ordered(manifest))) throw Error('已加载程序与工程 Manifest 不一致；请重新打开并确认来源');
    return record;
  }

  function ready(scene, id, scope) {
    try { definition(scene, id, scope); return true; } catch (_) { return false; }
  }

  function create(scene, id, options) {
    options = options || {};
    const record = definition(scene, id, options.scope || scene._moduleScope);
    const registry = global.ToSampoolRuntimeVNext.modules.sceneModules;
    const normalized = registry.normalize({moduleId:id, moduleVersion:record.manifest.version, params:{}}, {scope:options.scope || scene._moduleScope});
    const cw = Math.max(1, finite(scene.width, 320)), ch = Math.max(1, finite(scene.height, 180));
    const preferred = record.manifest.recommendedCanvas || {};
    let w = Math.max(1, finite(preferred.width, cw * 2 / 3)), h = Math.max(1, finite(preferred.height, ch * 2 / 3));
    const scale = Math.min(1, cw * 2 / 3 / w, ch * 2 / 3 / h);
    w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale));
    const used = new Set((scene.entities || []).map(entity => entity.id));
    let serial = 1, entityId;
    do { entityId = 'module-' + serial++; } while (used.has(entityId));
    const entity = {
      id:entityId, name:record.manifest.title || id, type:'procedural',
      moduleId:id, moduleVersion:+normalized.moduleVersion, params:copy(normalized.params),
      x:Math.round((cw-w)/2), y:Math.round((ch-h)/2), w, h,
      scaleX:1, scaleY:1, rot:0, alpha:1
    };
    // No mutation until dependency validation, parameter normalization and geometry succeed.
    scene.entities = [...(scene.entities || []), entity];
    return entity;
  }

  global.EditorV4ModuleInstances = Object.freeze({ready, create});
})(typeof window !== 'undefined' ? window : globalThis);
