/* Format-aware New/Open/Save controller shared by the Classic Shell sessions. */
(function (global) {
  'use strict';

  const V4_FORMAT = 'tosampool-scene/v4';
  function parseJson(text) { try { return JSON.parse(text); } catch (_) { return null; } }
  function classify(opened) {
    const name = String(opened && opened.name || '').toLowerCase();
    const parsed = parseJson(String(opened && opened.text || ''));
    if (parsed && parsed.format === V4_FORMAT) return Object.freeze({ kind:'v4', document:parsed });
    return Object.freeze({ kind:'legacy', document:null, json:name.endsWith('.json') && !!parsed });
  }
  function blockedError() {
    const error = new Error('v4 场景已识别，但完整编辑闭环尚未迁移；文件没有被载入或改写');
    error.code = 'V4_SESSION_NOT_READY';
    return error;
  }
  function create(options) {
    options = options || {};
    const router = options.router, host = options.host, legacy = options.legacy || {}, v4 = options.v4 || {}, v4Only=options.v4Only===true;
    if (!router || typeof router.activate !== 'function') throw new Error('Scene File Controller requires a session router');
    if (!host || typeof host.openText !== 'function') throw new Error('Scene File Controller requires a Host adapter');
    const v4Ready = () => typeof options.v4Ready === 'function' && options.v4Ready() === true;
    async function activateAndRun(id, operation) {
      const previous = router.activeId;
      router.activate(id);
      try { return await operation(); }
      catch (error) { if (router.activeId !== previous) router.activate(previous, { force:true }); throw error; }
    }
    async function newDocument(payload) {
      if (v4Only || router.activeId === 'v4') {
        if (!v4Ready() || typeof v4.newDocument !== 'function') throw blockedError();
        return v4.newDocument(payload || {});
      }
      if (typeof legacy.newDocument !== 'function') throw new Error('Legacy new-scene workflow is unavailable');
      return legacy.newDocument(payload || {});
    }
    async function open(openOptions) {
      const opened = await host.openText(Object.assign({
        accept: v4Only ? '.json,.tosampool.json,application/json' : '.js,.json,.tosampool.json,text/javascript,application/json',
        types: [v4Only ? { description:'ToSampool v4 Scene', accept:{ 'application/json':['.json'] } } : { description:'Scene', accept:{ 'text/javascript':['.js'], 'application/json':['.json'] } }]
      }, openOptions || {}));
      if (!opened) return null;
      const detected = classify(opened);
      if (detected.kind === 'v4') {
        if (!v4Ready() || typeof v4.openDocument !== 'function') throw blockedError();
        return activateAndRun('v4', () => v4.openDocument(opened, detected.document));
      }
      if (v4Only) {
        const error=new Error('此编辑器只打开 ToSampool v4 场景（.tosampool.json）；Legacy JS 请使用外部转换工具');
        error.code='V4_ONLY_LEGACY_BLOCKED';
        throw error;
      }
      if (typeof legacy.openDocument !== 'function') throw new Error('Legacy open-scene workflow is unavailable');
      return activateAndRun('legacy', () => legacy.openDocument(opened));
    }
    async function save(saveOptions) {
      if (v4Only || router.activeId === 'v4') {
        if (!v4Ready() || typeof v4.saveDocument !== 'function') throw blockedError();
        return v4.saveDocument(saveOptions || {});
      }
      if (typeof legacy.saveDocument !== 'function') throw new Error('Legacy save-scene workflow is unavailable');
      return legacy.saveDocument(saveOptions || {});
    }
    return Object.freeze({ classify, newDocument, open, save, get activeFormat() { return router.format; } });
  }
  global.EditorSceneFileController = Object.freeze({ version:1, V4_FORMAT, classify, create });
})(typeof window !== 'undefined' ? window : globalThis);
