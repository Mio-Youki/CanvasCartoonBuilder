/* Classic Shell session router. It owns no Scene and performs no DOM rendering. */
(function (global) {
  'use strict';

  const DOMAINS = Object.freeze([
    'session', 'scene', 'selection', 'transform', 'structure', 'assets',
    'timeline', 'effects', 'history', 'preview', 'delivery'
  ]);

  function freezeMap(value) { return Object.freeze(Object.assign({}, value || {})); }
  function createAdapter(options) {
    options = options || {};
    if (!options.id) throw new Error('Session adapter requires a stable id');
    if (!options.format) throw new Error(`Session adapter ${options.id} requires a format`);
    const domains = {};
    for (const name of DOMAINS) {
      const domain = options.domains && options.domains[name];
      if (domain != null && typeof domain !== 'object') throw new Error(`${options.id}.${name} must be an object`);
      domains[name] = Object.freeze(Object.assign({}, domain || {}));
    }
    return Object.freeze({
      id: String(options.id),
      format: String(options.format),
      capabilities: freezeMap(options.capabilities),
      domains: Object.freeze(domains),
      activate: typeof options.activate === 'function' ? options.activate : null,
      deactivate: typeof options.deactivate === 'function' ? options.deactivate : null
    });
  }

  function createRouter(options) {
    options = options || {};
    const adapters = new Map();
    for (const adapter of options.adapters || []) {
      if (!adapter || !adapter.id || !adapter.domains) throw new Error('Invalid session adapter');
      if (adapters.has(adapter.id)) throw new Error(`Duplicate session adapter ${adapter.id}`);
      adapters.set(adapter.id, adapter);
    }
    if (!adapters.size) throw new Error('Session router requires at least one adapter');
    let activeId = options.initial || adapters.keys().next().value;
    if (!adapters.has(activeId)) throw new Error(`Unknown initial session ${activeId}`);
    const listeners = new Set();
    const active = () => adapters.get(activeId);
    function call(domain, method, ...args) {
      if (!DOMAINS.includes(domain)) throw new Error(`Unknown facade domain ${domain}`);
      const fn = active().domains[domain][method];
      if (typeof fn !== 'function') throw new Error(`${activeId} does not support ${domain}.${method}`);
      return fn(...args);
    }
    function supports(domain, method) {
      return DOMAINS.includes(domain) && typeof active().domains[domain][method] === 'function';
    }
    function isDirty(adapter) {
      const fn = adapter.domains.session.isDirty;
      return typeof fn === 'function' && !!fn();
    }
    function activate(nextId, activateOptions) {
      if (nextId === activeId) return active();
      const next = adapters.get(nextId);
      if (!next) throw new Error(`Unknown session ${nextId}`);
      const current = active();
      if (isDirty(current) && !(activateOptions && activateOptions.force === true)) {
        throw new Error(`Session ${activeId} has unsaved changes`);
      }
      if (current.deactivate) current.deactivate();
      try {
        if (next.activate) next.activate();
      } catch (error) {
        if (current.activate) current.activate();
        throw error;
      }
      activeId = nextId;
      const state = snapshot();
      for (const listener of listeners) listener(state);
      return next;
    }
    function snapshot() {
      const adapter = active();
      return Object.freeze({ id: adapter.id, format: adapter.format, capabilities: adapter.capabilities });
    }
    function subscribe(listener) {
      if (typeof listener !== 'function') throw new Error('Session listener must be a function');
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
    return Object.freeze({
      activate, call, supports, snapshot, subscribe,
      get activeId() { return activeId; },
      get format() { return active().format; },
      get capabilities() { return active().capabilities; },
      list() { return Object.freeze([...adapters.values()].map(item => Object.freeze({ id:item.id, format:item.format, capabilities:item.capabilities }))); }
    });
  }

  function installClassicShell() {
    if (global.ToSampoolSession || !global.EditorVNextWorkspace || !global.EditorHost) return global.ToSampoolSession || null;
    const v4Workspace = global.EditorVNextWorkspace.create(global.EditorHost);
    const v4Assets = global.EditorVNextAssetWorkflow ? global.EditorVNextAssetWorkflow.create({ workspace:v4Workspace }) : null;
    const legacy = createAdapter({
      id: 'legacy',
      format: 'legacy-js',
      capabilities: { arbitraryProgramCode:true, registeredBuiltins:true, v4Effects:false, persistentJson:false },
      domains: {
        session: { isDirty:() => false, format:() => 'legacy-js' },
        scene: { current:() => global.HOME_SCENE || null }
      }
    });
    const v4 = createAdapter({
      id: 'v4',
      format: 'tosampool-scene/v4',
      capabilities: { arbitraryProgramCode:false, registeredBuiltins:true, v4Effects:true, persistentJson:true },
      domains: {
        session: { isDirty:() => false, format:() => 'tosampool-scene/v4', open:options => v4Workspace.open(options), save:options => v4Workspace.save(options) },
        scene: { current:() => v4Workspace.current(), create:options => v4Workspace.createBlank(options) },
        assets: v4Assets ? { importFiles:v4Assets.importFiles, addToScene:v4Assets.addToScene, addSelectedToScene:v4Assets.addSelectedToScene, openBackground:v4Assets.openBackground, removeSelected:v4Assets.removeSelected, list:v4Assets.list, selected:v4Assets.selected } : {},
        preview: { renderTo:(canvas,time,options) => v4Workspace.renderTo(canvas,time,options) }
      }
    });
    global.ToSampoolSession = createRouter({ adapters:[legacy,v4], initial:'legacy' });
    global.ToSampoolV4Workspace = v4Workspace;
    global.ToSampoolV4Assets = v4Assets;
    return global.ToSampoolSession;
  }

  const api = Object.freeze({ version:1, DOMAINS, createAdapter, createRouter, installClassicShell });
  global.EditorSessionFacade = api;
  if (global.document) installClassicShell();
})(typeof window !== 'undefined' ? window : globalThis);
