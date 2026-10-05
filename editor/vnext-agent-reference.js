/* Frozen, processed image input for a ToSampool Agent draft.
 * This is an editor/host boundary, never a Runtime dependency. */
(function (global) {
  'use strict';

  const FORMAT='tosampool-agent-reference/v2',ROLES=Object.freeze(['source','style','composition','subject','motion']),clean=value=>String(value==null?'':value).trim(),clone=value=>JSON.parse(JSON.stringify(value));
  function descriptor(scene,assetId){
    const id=clean(assetId),asset=scene&&scene.assets&&scene.assets[id];
    if(!id||!asset)throw new Error('请先选择一个已入库的图片素材');
    const frames=Array.isArray(asset.frames)&&asset.frames.length?asset.frames:[asset];
    if(frames.length!==1)throw new Error('C2 单图输入暂只支持静态图片；多帧素材请先作为普通场景素材使用');
    return Object.freeze({assetId:id,name:clean(asset.name)||id,width:Math.max(1,Math.round(+asset.width||1)),height:Math.max(1,Math.round(+asset.height||1)),mime:clean(asset.mime)||'image/png',recipe:asset.recipe?clone(asset.recipe):null,frames:1});
  }
  function validate(raw){
    raw=raw||{};const role=ROLES.includes(clean(raw.role))?clean(raw.role):'style';const value={format:clean(raw.format),version:+raw.version||2,id:clean(raw.id),assetId:clean(raw.assetId),name:clean(raw.name),role,useAsMaterial:raw.useAsMaterial===true,width:Math.max(1,Math.round(+raw.width||0)),height:Math.max(1,Math.round(+raw.height||0)),mime:clean(raw.mime)||'image/png',source:clean(raw.source),recipe:raw.recipe&&typeof raw.recipe==='object'?clone(raw.recipe):null,dataUrl:clean(raw.dataUrl)};
    if(value.format!==FORMAT||value.version!==2||!value.id||!value.name||!/^data:image\/(?:png|jpeg|webp);base64,/i.test(value.dataUrl))throw new Error('不是有效的冻结图片参考');
    return Object.freeze(value);
  }
  async function freeze(scene,assetId,options){
    options=options||{};const info=descriptor(scene,assetId),loader=options.loader||global.EditorVNextAssetLoader;
    if(!loader||typeof loader.resolve!=='function')throw new Error('图片参考需要素材加载器');
    const minimal={assets:{[info.assetId]:scene.assets[info.assetId]}},resolved=await loader.resolve(minimal,{host:options.host||global.EditorHost,sceneLocator:options.sceneLocator||null,baseUrl:options.baseUrl,loadImage:options.loadImage}),image=resolved[info.assetId]&&resolved[info.assetId].image;
    if(!image)throw new Error('图片参考无法加载');
    const doc=options.document||global.document;if(!doc||!doc.createElement)throw new Error('图片参考需要浏览器画布');
    const canvas=doc.createElement('canvas'),width=Math.max(1,Math.round(image.width||image.naturalWidth||info.width)),height=Math.max(1,Math.round(image.height||image.naturalHeight||info.height));canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,width,height);
    return validate({format:FORMAT,version:2,id:clean(options.id)||`reference-${info.assetId}`,assetId:info.assetId,name:info.name,role:options.role,useAsMaterial:options.useAsMaterial===true,width,height,mime:'image/png',source:'processed-asset',recipe:info.recipe,dataUrl:canvas.toDataURL('image/png')});
  }
  global.EditorVNextAgentReference=Object.freeze({FORMAT,ROLES,descriptor,validate,freeze});
})(typeof window!=='undefined'?window:globalThis);
