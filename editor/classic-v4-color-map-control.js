/* One-shot palette extraction through the real pipeline, never a screenshot. */
(function(global){
  'use strict';
  async function extract(options){
    const {workspace,scope,ownerId,values,time}=options,revision=workspace.revision;
    const snapshot=global.EditorVNextScene.normalize(workspace.current());snapshot._moduleScope=workspace.moduleScope;
    const target=scope==='scene'?snapshot:(snapshot.entities||[]).find(entity=>entity.id===ownerId);
    if(!target)throw new Error('取色对象已不存在');
    const container=scope==='scene'?(target.sceneEffects??={}):(target.effects??={});
    const sample=container.sample??={};sample['color-map']={...values,enabled:true,mode:'discrete',palette:'auto',extracted:null};
    // Values already contain the current segment's overrides. Remove only this
    // temporary track, so it cannot hide the probe or undo the requested count.
    if(snapshot.timeline?.tracks)delete snapshot.timeline.tracks[`effect:${scope}:${scope==='scene'?'sample':ownerId}:color-map`];
    const assets=await workspace.runtimeAssets();
    if(workspace.revision!==revision)throw new Error('工程已变化，请重新提取');
    let extracted=null;
    const player=global.EditorVNextRuntimeAdapter.create(snapshot,assets),canvas=document.createElement('canvas');
    try{player.renderTo(canvas,time,{pixelDivMultiplier:1,sceneBackend:'cpu',_skipTransition:true,paletteCapture:{scope,ownerId:scope==='scene'?null:ownerId,receive:value=>{if(!extracted)extracted=value;}}});}
    finally{player.dispose();canvas.width=canvas.height=1;}
    if(!extracted)throw new Error('当前对象未显示，移至其显示时段后再提取');
    return extracted;
  }
  global.EditorClassicV4ColorMapControl=Object.freeze({extract});
})(typeof window!=='undefined'?window:globalThis);
