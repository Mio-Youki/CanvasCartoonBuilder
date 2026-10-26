/* Registry-derived Inspector data model for the v4 migration. No DOM ownership. */
(function (global) {
  'use strict';

  function registry() {
    if (!global.EditorEffectRegistryVNext) throw new Error('vNext Inspector 需要 EditorEffectRegistryVNext');
    return global.EditorEffectRegistryVNext;
  }
  function pageFor(effect, scope) {
    if (scope === 'scene') return effect.family === 'sample' ? 'sample' : 'overlay';
    if (effect.family === 'formation') return 'compose';
    return effect.family === 'decorate' ? 'decorate' : 'sample';
  }
  function storageFor(effect, scope) {
    if (scope === 'scene') return pageFor(effect, scope);
    if (effect.family === 'formation') return 'formation';
    return effect.family === 'decorate' ? 'decorate' : 'sample';
  }
  function card(effect, scope, owner) {
    const support = registry().runtimeSupport[effect.id][scope], storage = storageFor(effect, scope), bucket = scope === 'scene' ? owner.sceneEffects?.[storage] : owner.effects?.[storage], value = bucket && bucket[effect.id] || null;
    return Object.freeze({ id: effect.id, name: effect.name, aliases: effect.aliases || [], page: pageFor(effect, scope), storage, present:!!value, enabled: !!(value && value.enabled), availability: support, editable: support === 'ready', purpose: effect.purpose, params: effect.params, motion: effect.motion, timing: effect.timing, mask: effect.mask });
  }
  function create(scope, owner) {
    const validScope = scope === 'scene' ? 'scene' : 'object', root = owner || {};
    if (validScope === 'object' && root.type === 'group') return Object.freeze({ scope:validScope, pages:Object.freeze(['compose']), controllers:Object.freeze([]), cards:Object.freeze([]), cardsFor:() => [] });
    const cards = registry().effects.filter(effect => effect.scopes.includes(validScope)).map(effect => card(effect, validScope, root));
    const pages = validScope === 'scene' ? ['compose', 'overlay', 'sample'] : ['compose', 'decorate', 'sample'];
    const controllers = validScope === 'scene' || validScope === 'object' ? registry().controllers.filter(controller => controller.scopes.includes(validScope)) : [];
    return Object.freeze({ scope: validScope, pages: Object.freeze(pages), controllers: Object.freeze(controllers), cards: Object.freeze(cards), cardsFor: page => cards.filter(item => item.page === page) });
  }
  function path(scope, effect) { const storage = storageFor(effect, scope); return scope === 'scene' ? ['sceneEffects', storage, effect.id] : ['effects', storage, effect.id]; }
  function trackKey(scope, ownerId, effect) { return scope === 'scene' ? `effect:scene:${ownerId}:${effect.id}` : `effect:object:${ownerId}:${effect.id}`; }
  function controllerTrackKey(scope, ownerId, controller) { return scope === 'scene' ? `controller:scene:${ownerId}:${controller.id}` : `controller:object:${ownerId}:${controller.id}`; }
  global.EditorVNextInspectorModel = Object.freeze({ create, pageFor, storageFor, path, trackKey, controllerTrackKey });
})(typeof window !== 'undefined' ? window : globalThis);
