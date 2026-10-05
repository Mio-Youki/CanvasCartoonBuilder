/* Persistent / runtime handoff for the isolated ToSampool v4 Scene format. */
(function (global) {
  'use strict';

  const FORMAT = 'tosampool-scene/v4';
  const transient = new Set(['runtimeAssets', '_runtime', '_image', '_canvas', '_bitmap', '_moduleScope']);
  const copy = value => value == null ? value : JSON.parse(JSON.stringify(value, (key, item) => transient.has(key) ? undefined : item));
  /* v4.1: the field and Alpha edge policy are not shared controllers.  They
     are meaningful only while uneven sampling is enabled, so persist them
     beneath that effect.  This adapter deliberately accepts the short-lived
     v4.0 shape at the file boundary, but all subsequently saved scenes use
     the nested declaration. */
  function normalizeSample(sample) {
    if (!sample || typeof sample !== 'object') return sample || {};
    const group = sample, controllers = Object.assign({}, group.controllers || {}), uneven = group['uneven-sampling'];
    const halftone = group.halftone;
    // v4.2 gives halftone one unambiguous scale: sampling-grid × size.
    // Earlier drafts stored a raw point radius plus a separate spacing; the
    // spacing is the closest equivalent of the new unit multiplier.
    if (halftone && typeof halftone === 'object' && halftone.spacing != null) {
      halftone.size = Math.max(1, Math.round(+halftone.spacing || 4));
      delete halftone.spacing;
    }
    if (uneven && typeof uneven === 'object') {
      const legacyField = controllers['sampling-field'] || {}, legacyEdge = controllers['edge-rule'] || {}, legacyMotion = uneven.motion || {}, legacyFieldMotion = legacyField.motion || {};
      const field = Object.assign({}, legacyField, uneven.field || {}), edge = Object.assign({}, legacyEdge, uneven.edge || {});
      delete field.motion;
      const legacyAnimated=!!legacyFieldMotion.enabled||!!(legacyMotion.enabled&&legacyMotion.type==='sampling-tide')||legacyMotion.fieldFlow===true||legacyMotion.tide===true;
      const motion=legacyMotion.type==='uneven-motion'?Object.assign({},legacyMotion):Object.assign({enabled:legacyAnimated,type:'uneven-motion',period:legacyMotion.period == null ? (legacyFieldMotion.period == null ? 3 : legacyFieldMotion.period) : legacyMotion.period,steps:legacyMotion.steps == null ? (legacyFieldMotion.steps == null ? 24 : legacyFieldMotion.steps) : legacyMotion.steps,flowSpeed:legacyFieldMotion.speed == null ? 1 : legacyFieldMotion.speed,tideAmount:legacyMotion.amount == null ? .35 : legacyMotion.amount},legacyMotion.type==='sampling-tide'?{enabled:true,type:'uneven-motion'}:{});
      if (legacyField.type === 'uniform' && !uneven.field) field.enabled = false;
      else if (Object.keys(field).length) field.enabled = field.enabled !== false;
      if (field.strength != null && field.contrast == null) field.contrast = field.strength;
      if (field.angle != null && field.direction == null) field.direction = field.angle;
      delete field.strength; delete field.angle;
      if (edge.mode === 'alpha-lock') edge.mode = 'contour'; else if (edge.mode === 'edge-only') edge.mode = 'interior'; else if (edge.mode === 'inside-only') edge.mode = 'off';
      group['uneven-sampling'] = Object.assign({}, uneven, { field:Object.assign({ enabled:true, type:'wave', contrast:.5, scale:48, seed:1, direction:0, centerX:.5, centerY:.5 }, field), edge:Object.assign({ mode:'off', width:2 }, edge), motion });
      delete group['uneven-sampling'].targets;
    }
    delete controllers['sampling-field']; delete controllers['edge-rule'];
    if (Object.keys(controllers).length) group.controllers = controllers; else delete group.controllers;
    return group;
  }
  function normalize(document) {
    const scene = copy(document) || blank();
    for (const entity of scene.entities || []) if (entity && entity.effects && entity.effects.sample) normalizeSample(entity.effects.sample);
    if (scene.sceneEffects && scene.sceneEffects.sample) {
      normalizeSample(scene.sceneEffects.sample);
      const uneven = scene.sceneEffects.sample['uneven-sampling'];
      // A composed scene is normally opaque.  Treating its canvas border as
      // an object contour would be misleading, so edge protection is object-only.
      if (uneven && uneven.edge) uneven.edge = Object.assign({}, uneven.edge, { mode:'off' });
    }
    return scene;
  }
  function blank(options) {
    options = options || {};
    return { format: FORMAT, width: Math.max(1, +options.width || 320), height: Math.max(1, +options.height || 180), loop: Math.max(.001, +options.loop || 4), background: { color: '#ffffff', alpha: 1, layers: [] }, assets: {}, entities: [], timeline: { tracks: {} }, sceneEffects: { pipeline: ['overlay', 'sample'], overlay: {}, sample: {} } };
  }
  function serialize(scene, space) { const document = normalize(scene); document.format = FORMAT; delete document.runtimeAssets; return JSON.stringify(document, null, space == null ? 2 : space); }
  function hydrate(document, runtimeAssets) {
    const scene = normalize(document);
    // `_moduleScope` is deliberately transient: it must never be written to a
    // project file, but it has to survive the editor → Runtime handoff so two
    // open projects may register an identical Module id without colliding.
    scene._moduleScope = String(document && (document._moduleScope || document.moduleScope) || 'global');
    scene.format = FORMAT;
    scene.runtimeAssets = runtimeAssets || {};
    return scene;
  }
  function assetRef(locator, extra) { return Object.assign({ locator: String(locator || '') }, extra || {}); }
  global.EditorVNextScene = Object.freeze({ FORMAT, blank, serialize, hydrate, normalize, normalizeSample, assetRef });
})(typeof window !== 'undefined' ? window : globalThis);
