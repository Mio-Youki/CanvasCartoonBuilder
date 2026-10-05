/* Receives a reviewed host result and adds it as a normal v4 asset. This is
 * intentionally UI-free: the agent dialog and a later asset-panel workflow
 * can invoke the same derive() method without duplicating the safety path. */
(function (global) {
  'use strict';
  function create(options){
    options=options||{};const workspace=options.workspace,changes=options.changes,referenceSource=options.referenceSource;
    if(!workspace||typeof workspace.requireDocument!=='function'||!changes||typeof changes.run!=='function')throw new Error('派生素材控制器需要 v4 Workspace 与变更历史');
    const protocol=global.EditorVNextDerivedAssetProtocol,state=global.EditorVNextAssetState;if(!protocol||!state)throw new Error('派生素材控制器缺少协议或素材状态模块');
    const adapter=()=>options.adapter||global.ToSampoolV4DerivedAssetAdapter||null;
    async function request(input){
      input=input||{};if(typeof referenceSource!=='function')throw new Error('当前宿主没有可冻结的图片素材入口');
      const source=await referenceSource(input.sourceMode||'asset'),task=protocol.task(Object.assign({},input,{source})),host=adapter();
      if(!host||typeof host.derive!=='function')throw new Error('当前宿主尚未提供透明分层或姿态序列生成能力');
      const checked=protocol.result(await host.derive(task),task);
      return Object.freeze({format:'tosampool-derived-asset-review/v1',task,asset:checked.asset});
    }
    function accept(review){
      if(!review||review.format!=='tosampool-derived-asset-review/v1'||!review.task||!review.asset)throw new Error('需要有效的派生素材候选');
      const asset=review.asset;
      let added=null;changes.run(`导入派生素材 ${asset.name}`,scene=>{added=state.addAsset(scene,{assetId:asset.id,name:asset.name,locator:asset.locator,frames:asset.frames||undefined,mime:asset.mime,width:asset.width,height:asset.height,fps:asset.fps,frameLoop:asset.frameLoop,sourceAssetId:asset.sourceAssetId,derivation:asset.derivation});});
      return Object.freeze({task:review.task,assetId:added&&added.assetId,asset});
    }
    async function derive(input){return accept(await request(input));}
    return Object.freeze({request,accept,derive});
  }
  global.EditorClassicV4DerivedAssetController=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
