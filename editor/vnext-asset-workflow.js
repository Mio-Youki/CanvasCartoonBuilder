/* v4 asset-library workflow. UI preprocessing supplies prepared descriptors; this layer owns only Scene mutations. */
(function (global) {
  'use strict';

  function create(options) {
    options = options || {};
    const workspace = options.workspace;
    const assetState = options.assetState || global.EditorVNextAssetState;
    const prepare = options.prepare;
    if (!workspace || typeof workspace.mutate !== 'function' || typeof workspace.requireDocument !== 'function') throw new Error('v4 素材工作流需要 Workspace');
    if (!assetState) throw new Error('v4 素材工作流需要 EditorVNextAssetState');
    let selectedAssetId = null;
    function document() { return workspace.requireDocument(); }
    function visible(descriptor) { return !!descriptor && !descriptor.libraryHidden && !descriptor.internal && descriptor.generated !== 'text-raster'; }
    function list() { return Object.entries(document().assets || {}).filter(([,descriptor]) => visible(descriptor)).map(([id, descriptor]) => Object.freeze({ id, descriptor })); }
    function selected() { const descriptor = document().assets && document().assets[selectedAssetId]; return visible(descriptor) ? Object.freeze({ id:selectedAssetId, descriptor }) : null; }
    function select(assetId) { selectedAssetId = visible(document().assets && document().assets[assetId]) ? assetId : null; return selected(); }
    function importPrepared(input) {
      const descriptors = Array.isArray(input) ? input : [input], results = [];
      workspace.mutate(scene => { for (const descriptor of descriptors) results.push(assetState.addAsset(scene, descriptor || {})); });
      selectedAssetId = results.length ? results[results.length - 1].assetId : selectedAssetId;
      return results;
    }
    async function importFiles(files, context) {
      const handler = context && context.prepare || prepare;
      if (typeof handler !== 'function') throw new Error('v4 文件导入必须先由共享预处理 UI 生成素材描述');
      const descriptors = [];
      for (let index = 0; index < files.length; index += 1) {
        const descriptor = await handler(files[index], index, files);
        if (Array.isArray(descriptor)) descriptors.push(...descriptor); else if (descriptor) descriptors.push(descriptor);
      }
      return importPrepared(descriptors);
    }
    function idOf(source) { return typeof source === 'string' ? source : source && (source.assetId || source.id) || selectedAssetId; }
    function addToScene(source, placement) { const assetId=idOf(source); if (!assetId || !visible(document().assets && document().assets[assetId])) throw new Error('请先选择素材'); let result; workspace.mutate(scene => { result=assetState.placeImage(scene, assetId, placement); }); selectedAssetId=assetId; return result; }
    function addSelectedToScene(placement) { return addToScene(selectedAssetId, placement); }
    function openBackground(placement) { const assetId=idOf(placement && placement.source); if (!assetId || !visible(document().assets && document().assets[assetId])) throw new Error('请先选择背景素材'); let result; workspace.mutate(scene => { result=assetState.placeBackground(scene, assetId, placement); }); selectedAssetId=assetId; return result; }
    function removeSelected() { if (!selectedAssetId) return false; let removed=false; workspace.mutate(scene => { removed=assetState.hideAsset(scene, selectedAssetId); }); if (removed) selectedAssetId=null; return removed; }
    return Object.freeze({ importFiles, importPrepared, addToScene, addSelectedToScene, openBackground, removeSelected, list, selected, select });
  }

  global.EditorVNextAssetWorkflow = Object.freeze({ version:1, create });
})(typeof window !== 'undefined' ? window : globalThis);
