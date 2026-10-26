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
    let document = null, locator = null, assets = null, assetKey = '', player = null, playerRevision = -1, playerPending = null, playerPendingRevision = -1, revision = 0, scopeSerial = 0, moduleScope = null;
    let playerGeneration = 0, assetGeneration = 0, assetPending = null;
    // Session-owned, borrowed by disposable Players. Never shared across projects.
    let sceneGpuExecutor = null, objectGpuSession = null;
    const listeners = new Set();
    /* These are deliberately document-session counters, not editor-lifetime
       counters.  A benchmark opened from the file picker must start at zero;
       otherwise a previous scene's edits make `Player` look like render cost. */
    const runtimeMetrics = { assetResolves:0, playerCreates:0, playerReuses:0 };
    function assertDocument(value) {
      if (!value || value.format !== global.EditorVNextScene.FORMAT) throw new Error(`此入口只接受 ${global.EditorVNextScene.FORMAT} 场景`);
      return value;
    }
    function staleRender() { const error=new Error('预览来源已失效');error.code='TOSAMPOOL_STALE_RENDER';return error; }
    function release(next) { if(typeof next?.dispose==='function')next.dispose();else if(typeof next?.clearCaches==='function')next.clearCaches(); }
    function invalidatePlayer() { const previous=player;player = null; playerRevision = -1; playerPending = null; playerPendingRevision = -1;playerGeneration += 1;release(previous); }
    function releaseGpu() { if(sceneGpuExecutor)sceneGpuExecutor.dispose();sceneGpuExecutor=null;if(objectGpuSession)objectGpuSession.dispose();objectGpuSession=null; }
    function releasePlayer() { invalidatePlayer();releaseGpu(); }
    function invalidateAssets() { assets = null; assetKey = '';assetPending=null;assetGeneration += 1;releasePlayer(); }
    function resetRuntimeMetrics() { runtimeMetrics.assetResolves = 0; runtimeMetrics.playerCreates = 0; runtimeMetrics.playerReuses = 0; }
    function notify(type, detail) { const event=Object.freeze({type,detail:detail||null,revision,document}); for(const listener of listeners) listener(event); }
    function nextModuleScope() { scopeSerial += 1; return `workspace-${scopeSerial}`; }
    function replace(next, nextLocator, options) { document = clone(assertDocument(next)); locator = nextLocator || null; moduleScope=String(options&&options.moduleScope||nextModuleScope()); document._moduleScope=moduleScope; revision += 1; invalidateAssets(); resetRuntimeMetrics(); notify('replace'); return document; }
    function current() { return document; }
    function requireDocument() { if (!document) throw new Error('vNext 工作区尚无场景'); return document; }
    function createBlank(options) { return replace(global.EditorVNextScene.blank(options), null, options); }
    function replaceDocument(next, options) {
      const hasLocator = !!(options && Object.prototype.hasOwnProperty.call(options, 'locator'));
      return replace(next, hasLocator ? options.locator : locator, options);
    }
    async function open(options) {
      const opened = await adapter.openText(Object.assign({ accept: '.tosampool.json,application/json' }, options || {}));
      if (!opened) return null;
      let parsed;
      try { parsed = JSON.parse(opened.text); } catch (_) { throw new Error('vNext 场景必须是有效 JSON'); }
      replace(parsed, opened.locator || opened.name || null, options); return document;
    }
    async function save(options) {
      const scene = requireDocument(), text = global.EditorVNextScene.serialize(scene, 2), result = await adapter.saveFile(Object.assign({ kind: 'scene', name: defaultName(locator), ext: EXT, mime: 'application/json', description: 'ToSampool v4 Scene', data: text }, options || {}));
      if (result && result.locator) locator = result.locator;
      return result;
    }
    function runtimeAssetKey(scene) {
      const loader=global.EditorVNextAssetLoader,ids=loader&&typeof loader.referencedAssetIds==='function'?Array.from(loader.referencedAssetIds(scene)).sort():[];
      // The descriptor data controls decoding; the referenced set controls
      // which decoded entries are needed.  Both are required for a safe cache.
      return JSON.stringify(scene.assets || {})+'|'+ids.join(',');
    }
    async function runtimeAssets(options) {
      const scene = requireDocument(), nextKey = runtimeAssetKey(scene),generation=assetGeneration;
      if(assets&&assetKey===nextKey)return assets;
      if(assetPending&&assetPending.key===nextKey&&assetPending.generation===generation)return assetPending.promise;
      runtimeMetrics.assetResolves += 1;
      const pending={key:nextKey,generation,promise:null};
      pending.promise=(async()=>{
        const resolved=await global.EditorVNextAssetLoader.resolve(scene,Object.assign({host:adapter,sceneLocator:locator,referencedOnly:true},options||{}));
        if(document!==scene||assetGeneration!==generation||runtimeAssetKey(scene)!==nextKey)throw staleRender();
        assets=resolved;assetKey=nextKey;return resolved;
      })();
      assetPending=pending;
      try{return await pending.promise;}finally{if(assetPending===pending)assetPending=null;}
    }
    async function createPlayer(options) {
      const targetRevision = revision,generation=playerGeneration;
      if (player && playerRevision === targetRevision) { runtimeMetrics.playerReuses += 1; return player; }
      if (playerPending && playerPendingRevision === targetRevision) { runtimeMetrics.playerReuses += 1; return playerPending; }
      const source = sceneOrCurrent();
      runtimeMetrics.playerCreates += 1;
      const pending = (async () => {
        const resolvedAssets = await runtimeAssets(options);
        /* Asset resolution is async.  Do not cache a Player for an older
           document revision if the user edited while it was resolving. */
        if (revision !== targetRevision||generation!==playerGeneration)throw staleRender();
        const next = await global.EditorVNextRuntimeAdapter.create(source, resolvedAssets);
        if(revision!==targetRevision||generation!==playerGeneration){release(next);throw staleRender();}
        if (playerPending === pending) { player = next; playerRevision = targetRevision; }
        return next;
      })();
      playerPending = pending; playerPendingRevision = targetRevision;
      try { return await pending; }
      finally {
        if (playerPending === pending && playerPendingRevision === targetRevision) { playerPending = null; playerPendingRevision = -1; }
      }
    }
    function sceneOrCurrent() { return requireDocument(); }
    async function renderTo(canvas, time, options) {
      const now=()=>global.performance?.now?global.performance.now():Date.now();
      const started=now(),previous=player,targetRevision=revision,generation=playerGeneration,next=await createPlayer(options&&options.assetOptions),prepared=now();
      if(revision!==targetRevision||generation!==playerGeneration||(options?.isCurrent&&!options.isCurrent()))throw staleRender();
      let preview=options&&options.preview;
      if(preview?.sceneBackend==='gpu-experimental'&&!preview._sceneGpuExecutor){
        const factory=global.ToSampoolRuntimeVNext?.modules?.sceneGpu;
        if(factory){if(!sceneGpuExecutor)sceneGpuExecutor=factory.create();preview=Object.assign({},preview,{_sceneGpuExecutor:sceneGpuExecutor});}
      }
      if(preview?.objectBackend==='gpu-threshold-pilot'&&!preview._objectGpuSession){
        const factory=global.ToSampoolRuntimeVNext?.modules?.objectGpu;
        if(factory){if(!objectGpuSession)objectGpuSession=factory.create();preview=Object.assign({},preview,{_objectGpuSession:objectGpuSession});}
      }
      const stats=next.renderTo(canvas,time||0,preview),finished=now();
      options?.onTiming?.({playerPrepareMs:prepared-started,runtimeCallMs:finished-prepared,playerCreated:previous!==next});
      return stats;
    }
    function dispose() { revision+=1;document=null;locator=null;moduleScope=null;invalidateAssets();listeners.clear(); }
    function mutate(operation) {
      const scene = requireDocument(), beforeAssets = JSON.stringify(scene.assets || {}),width=scene.width,height=scene.height,result = operation(scene);
      revision += 1; invalidatePlayer();
      if (beforeAssets !== JSON.stringify(scene.assets || {})) invalidateAssets();
      else if(width!==scene.width||height!==scene.height)releaseGpu();
      else if(sceneGpuExecutor){
        // Reuse only numerical/device resources, never a rendered source frame.
        if(typeof sceneGpuExecutor.invalidateSource==='function')sceneGpuExecutor.invalidateSource();else releaseGpu();
      }
      if(objectGpuSession)objectGpuSession.invalidateSource();
      notify('mutation', result);
      return result;
    }
    function subscribe(listener) { if(typeof listener!=='function')throw new Error('Workspace listener must be a function');listeners.add(listener);return()=>listeners.delete(listener); }
    return Object.freeze({ createBlank, replace: replaceDocument, open, save, current, requireDocument, runtimeAssets, createPlayer, renderTo, mutate, subscribe, dispose, releasePlayer, resetRuntimeMetrics, getRuntimeMetrics:() => Object.freeze(Object.assign({}, runtimeMetrics)), nextModuleScope, get moduleScope() { return moduleScope; }, get locator() { return locator; }, get revision() { return revision; }, get hasDocument() { return !!document; } });
  }
  global.EditorVNextWorkspace = Object.freeze({ EXT, create });
})(typeof window !== 'undefined' ? window : globalThis);
