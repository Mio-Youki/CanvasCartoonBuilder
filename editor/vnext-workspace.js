/* Isolated v4 document session. It deliberately has no legacy Scene fallback. */
(function (global) {
  'use strict';

  const EXT = '.tosampool.json';
  function requireV4() {
    if (!global.EditorVNextScene || !global.EditorVNextRuntimeAdapter || !global.EditorVNextAssetLoader) throw new Error('vNext 工作区依赖尚未加载');
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function defaultName(locator) {
    const file = String(locator || 'untitled').split(/[\\/]/).pop();
    if (file.toLowerCase().endsWith(EXT)) return file;
    const base = file.replace(/\.[^.]+$/, '');
    return `${base || 'untitled'}${EXT}`;
  }
  function create(host) {
    requireV4();
    const adapter = host || global.EditorHost;
    if (!adapter || typeof adapter.openText !== 'function' || typeof adapter.saveFile !== 'function') throw new Error('vNext 工作区需要 Host 的打开与保存能力');
    let document = null, locator = null, assets = null, assetKey = '', player = null, playerRevision = -1, revision = 0;
    const listeners = new Set();
    const runtimeMetrics = { assetResolves:0, playerCreates:0 };
    function assertDocument(value) {
      if (!value || value.format !== global.EditorVNextScene.FORMAT) throw new Error(`此入口只接受 ${global.EditorVNextScene.FORMAT} 场景`);
      return value;
    }
    function invalidatePlayer() { player = null; playerRevision = -1; }
    function invalidateAssets() { assets = null; assetKey = ''; invalidatePlayer(); }
    function notify(type, detail) { const event=Object.freeze({type,detail:detail||null,revision,document}); for(const listener of listeners) listener(event); }
    function replace(next, nextLocator) { document = clone(assertDocument(next)); locator = nextLocator || null; revision += 1; invalidateAssets(); notify('replace'); return document; }
    function current() { return document; }
    function requireDocument() { if (!document) throw new Error('vNext 工作区尚无场景'); return document; }
    function createBlank(options) { return replace(global.EditorVNextScene.blank(options), null); }
    function replaceDocument(next, options) {
      const hasLocator = !!(options && Object.prototype.hasOwnProperty.call(options, 'locator'));
      return replace(next, hasLocator ? options.locator : locator);
    }
    async function open(options) {
      const opened = await adapter.openText(Object.assign({ accept: '.tosampool.json,application/json' }, options || {}));
      if (!opened) return null;
      let parsed;
      try { parsed = JSON.parse(opened.text); } catch (_) { throw new Error('vNext 场景必须是有效 JSON'); }
      replace(parsed, opened.locator || opened.name || null); return document;
    }
    async function save(options) {
      const scene = requireDocument(), text = global.EditorVNextScene.serialize(scene, 2), result = await adapter.saveFile(Object.assign({ kind: 'scene', name: defaultName(locator), ext: EXT, mime: 'application/json', description: 'ToSampool v4 Scene', data: text }, options || {}));
      if (result && result.locator) locator = result.locator;
      return result;
    }
    async function runtimeAssets(options) {
      const scene = requireDocument(), nextKey = JSON.stringify(scene.assets || {});
      if (!assets || assetKey !== nextKey) { runtimeMetrics.assetResolves += 1; assets = await global.EditorVNextAssetLoader.resolve(scene, Object.assign({ host: adapter, sceneLocator: locator }, options || {})); assetKey = nextKey; }
      return assets;
    }
    async function createPlayer(options) {
      if (player && playerRevision === revision) return player;
      runtimeMetrics.playerCreates += 1; player = global.EditorVNextRuntimeAdapter.create(sceneOrCurrent(), await runtimeAssets(options)); playerRevision = revision; return player;
    }
    function sceneOrCurrent() { return requireDocument(); }
    async function renderTo(canvas, time, options) { return (await createPlayer(options&&options.assetOptions)).renderTo(canvas, time || 0,options&&options.preview); }
    function mutate(operation) {
      const scene = requireDocument(), beforeAssets = JSON.stringify(scene.assets || {}), result = operation(scene);
      revision += 1; invalidatePlayer();
      if (beforeAssets !== JSON.stringify(scene.assets || {})) invalidateAssets();
      notify('mutation', result);
      return result;
    }
    function subscribe(listener) { if(typeof listener!=='function')throw new Error('Workspace listener must be a function');listeners.add(listener);return()=>listeners.delete(listener); }
    return Object.freeze({ createBlank, replace: replaceDocument, open, save, current, requireDocument, runtimeAssets, createPlayer, renderTo, mutate, subscribe, getRuntimeMetrics:() => Object.freeze(Object.assign({}, runtimeMetrics)), get locator() { return locator; }, get revision() { return revision; }, get hasDocument() { return !!document; } });
  }
  global.EditorVNextWorkspace = Object.freeze({ EXT, create });
})(typeof window !== 'undefined' ? window : globalThis);
