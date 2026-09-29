/* Session-aware asset workflow router. Processing and rendering remain adapter-owned. */
(function (global) {
  'use strict';

  function blockedError() {
    const error = new Error('v4 素材闭环尚未开放；当前素材和场景没有被修改');
    error.code = 'V4_ASSET_WORKFLOW_NOT_READY';
    return error;
  }
  function create(options) {
    options = options || {};
    const router = options.router, legacy = options.legacy || {}, v4 = options.v4 || {};
    if (!router || !router.activeId) throw new Error('Asset Controller requires a session router');
    const v4Ready = () => typeof options.v4Ready === 'function' && options.v4Ready() === true;
    function adapter() { return router.activeId === 'v4' ? v4 : legacy; }
    function requireAction(name) {
      if (router.activeId === 'v4' && !v4Ready()) throw blockedError();
      const action = adapter()[name];
      if (typeof action !== 'function') throw new Error(`${router.activeId} asset workflow does not support ${name}`);
      return action;
    }
    function importFiles(files, context) {
      const list = files ? [...files] : [];
      if (!list.length) return null;
      return requireAction('importFiles')(list, context || {});
    }
    function addToScene(source, options) { return requireAction('addToScene')(source, options || {}); }
    function addSelectedToScene(options) { return requireAction('addSelectedToScene')(options || {}); }
    function openBackground(options) { return requireAction('openBackground')(options || {}); }
    function removeSelected(options) { return requireAction('removeSelected')(options || {}); }
    function list() { const action = adapter().list; return typeof action === 'function' ? action() : []; }
    function selected() { const action = adapter().selected; return typeof action === 'function' ? action() : null; }
    return Object.freeze({ importFiles, addToScene, addSelectedToScene, openBackground, removeSelected, list, selected });
  }
  global.EditorAssetController = Object.freeze({ version:1, create });
})(typeof window !== 'undefined' ? window : globalThis);
