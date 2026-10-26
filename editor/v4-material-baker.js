/* Element-preset baking uses the existing bounded Full object renderer. */
(function(global){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  function members(scene,root){const owned=new Set([root.id]);let changed=true;while(changed){changed=false;for(const e of scene.entities)if(e.parentId&&owned.has(e.parentId)&&!owned.has(e.id)){owned.add(e.id);changed=true;}}return scene.entities.filter(e=>owned.has(e.id)&&e.type!=='group'&&!e.referenceSourceOnly&&!e.particleSourceOnly);}
  function work(scene,root){return members(scene,root).reduce((sum,e)=>sum+(e.type==='particle-emitter'?Math.max(0,Math.min(600,+e.particle?.count||40)):1),0);}
  function bounds(scene,root,frame){const api=global.ToSampoolRuntimeVNext.modules,list=members(scene,root);if(list.some(e=>e.type==='particle-emitter'))return{x:0,y:0,w:scene.width,h:scene.height};const boxes=list.map(e=>api.objects.capsuleBounds(scene,e,frame));if(!boxes.length)return{x:0,y:0,w:1,h:1};const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));return{x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x,h:Math.max(...boxes.map(b=>b.y+b.h))-y};}
  function draw(ctx,scene,root,frame,stats,surfaces){const api=global.ToSampoolRuntimeVNext.modules,hidden=api.masks.maskOnlySources(scene),instances=api.pathInstances.hiddenSources(scene);stats.particleEmitters=stats.particleEmitters||0;stats.particlesDrawn=stats.particlesDrawn||0;stats.particleSpriteBuilds=stats.particleSpriteBuilds||0;for(const entity of members(scene,root))if(!hidden.has(entity.id)&&!instances.has(entity.id)){if(entity.type==='particle-emitter')api.particles.draw(ctx,scene,entity,frame,stats,surfaces);else api.objects.draw(ctx,scene,entity,frame,stats,surfaces);}}
  function prepare(scene,presetId,options){
    options=options||{};const presets=global.EditorV4ElementPresets,baker=global.EditorV4ModuleBaker;
    const preset=scene.elementPresets?.[presetId];if(!preset)throw Error('元素素材已不存在');
    const refs=presets.references(preset),modules=Object.fromEntries(refs.filter(ref=>ref.kind==='module').map(ref=>[ref.id,scene.modules[ref.id]]));
    const temp={format:scene.format,width:scene.width,height:scene.height,loop:scene.loop,_moduleScope:scene._moduleScope,assets:copy(scene.assets||{}),patternDefinitions:copy(scene.patternDefinitions||{}),modules:copy(modules),entities:[],elementPresets:{[presetId]:copy(preset)},timeline:{tracks:{}},sceneEffects:{},background:{alpha:0}};
    const item=presets.instantiate(temp,presetId,{x:0,y:0});
    const initial={x:0,y:0,w:Math.max(1,Math.ceil(item.w)),h:Math.max(1,Math.ceil(item.h))},config={...options,material:true};
    const schedule=baker.plan(temp,item.id,{...config,viewport:initial});
    const instances=work(temp,item);if(instances>4000||instances*schedule.count>120000)throw Error('素材烘焙实例数量超出预算，请减少粒子数量或周期帧数');
    const api=global.ToSampoolRuntimeVNext.modules;let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
    for(const time of schedule.times){const frame=api.frame.create(temp,time),box=bounds(temp,item,frame);left=Math.min(left,box.x);top=Math.min(top,box.y);right=Math.max(right,box.x+box.w);bottom=Math.max(bottom,box.y+box.h);}
    const viewport={x:Math.floor(left),y:Math.floor(top),w:Math.max(1,Math.ceil(right)-Math.floor(left)),h:Math.max(1,Math.ceil(bottom)-Math.floor(top))};
    const plan=baker.plan(temp,item.id,{...config,viewport});return{scene:temp,id:item.id,options:{...config,viewport},plan,presetId};
  }
  async function render(prepared,options){
    const result=await global.EditorV4ModuleBaker.render(prepared.scene,prepared.id,{...prepared.options,...options,material:true,viewport:prepared.options.viewport});
    result.provenance.presetId=prepared.presetId;return result;
  }
  global.EditorV4MaterialBaker=Object.freeze({prepare,render,bounds,draw,members,work,add:(scene,result)=>global.EditorV4ModuleBaker.add(scene,result)});
})(typeof window!=='undefined'?window:globalThis);
