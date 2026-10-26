/* Prepare the same fixed-time export panel for one library material. */
(function(global){
  'use strict';
  async function prepare(source,selection,options){
    options=options||{};let scene,isStill=false,base,time=+options.time||0;
    if(selection.kind==='asset'){
      const asset=source.assets?.[selection.id];if(!asset||asset.libraryHidden)throw Error('素材已不存在');
      isStill=!(asset.frames?.length>1);base=asset.name||selection.id;scene=global.EditorVNextScene.blank({width:asset.width,height:asset.height,loop:isStill?1:asset.frames.length/(asset.fps||8)});scene.assets=source.assets;scene.background={alpha:0};scene.entities=[{id:'export-image',type:'image',assetId:selection.id,x:0,y:0,w:asset.width,h:asset.height}];time=0;
    }else{
      const id=selection.id,preset=source.elementPresets?.[id];if(!preset)throw Error('元素素材已不存在');base=preset.name;
      const ids=global.EditorV4ElementPresets.references(preset).filter(r=>r.kind==='module').map(r=>r.id);if(ids.some(id=>!global.EditorV4ModuleInstances.ready(source,id,source._moduleScope)))await global.EditorVNextModuleLoader.loadAuthorized(source,ids,{scope:source._moduleScope,assertCurrent:options.assertCurrent});
      const prepared=global.EditorV4MaterialBaker.prepare(source,id,{mode:'sequence',frames:Math.min(120,Math.max(2,Math.round(source.loop*12)))}),box=prepared.options.viewport;scene=prepared.scene;scene.width=box.w;scene.height=box.h;
      for(const entity of scene.entities){if(!entity.parentId){entity.x-=box.x;entity.y-=box.y;}if(entity.effects?.mask)entity.effects.mask=global.EditorVNextMaskState.translate(entity.effects.mask,-box.x,-box.y);}
    }
    scene._moduleScope=source._moduleScope;options.assertCurrent?.();const assets=await global.EditorVNextAssetLoader.resolve(scene,{sceneLocator:options.sceneLocator,referencedOnly:true});options.assertCurrent?.();return{scene,assets,isStill,base,time,assertCurrent:options.assertCurrent};
  }
  global.EditorV4MaterialExport=Object.freeze({prepare});
})(typeof window!=='undefined'?window:globalThis);
