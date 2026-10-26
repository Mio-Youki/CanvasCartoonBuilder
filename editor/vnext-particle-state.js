/* Declarative v4 particle creation and parameter writes. */
(function (global) {
  'use strict';

  const defaults = Object.freeze({ count:40, life:2, speed:20, direction:90, spread:0, gravity:0, wind:0, size:1, sizeVar:0, alpha:1, fade:true, seed:1, spin:0, spinSpeed:0, spinVar:0, playback:'static', frame:0, frameFps:8, frameLoop:true });
  const numeric = new Set(['count','life','speed','direction','spread','gravity','wind','size','sizeVar','alpha','seed','spin','spinSpeed','spinVar','frame','frameFps','cellSize','startTime']);
  const boolean = new Set(['fade','usePresetSource','frameLoop','showSource']);
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  function unique(scene, base) { const used=new Set((scene.entities||[]).map(item=>item.id));let id=base,index=2;while(used.has(id))id=`${base}-${index++}`;return id; }
  function entity(scene,id){return(scene.entities||[]).find(item=>item&&item.id===id)||null;}
  function emitter(scene,id){const item=entity(scene,id);if(!item||item.type!=='particle-emitter')throw new Error(`找不到粒子发射器「${id||'(空)'}」`);return item;}
  function eligible(scene,id){const item=entity(scene,id);return!!(item&&item.type!=='group'&&item.type!=='particle-emitter'&&!item.particleSourceOnly);}
  function presets(){return(global.EditorParticleRegistry&&global.EditorParticleRegistry.presets||[]).map(item=>({id:item.id,name:item.name,parts:clone(item.parts),particle:clone(item.particle)}));}
  function preset(id){return presets().find(item=>item.id===id)||null;}
  function normalizedParticle(input){const raw=input||{},source=Object.assign({},defaults,raw);if(raw.dir!=null&&raw.direction==null)source.direction=raw.dir;delete source.dir;source.count=Math.max(0,Math.min(600,Math.round(finite(source.count,defaults.count))));source.life=Math.max(.001,finite(source.life,defaults.life));source.speed=Math.max(0,finite(source.speed,defaults.speed));source.direction=finite(source.direction,defaults.direction);source.spread=Math.max(0,finite(source.spread,defaults.spread));source.size=Math.max(.01,finite(source.size,defaults.size));source.sizeVar=Math.max(0,Math.min(1,finite(source.sizeVar,defaults.sizeVar)));source.alpha=Math.max(0,Math.min(1,finite(source.alpha,defaults.alpha)));source.seed=Math.round(finite(source.seed,defaults.seed));source.fade=source.fade!==false;source.playback=source.playback==='particle-age'?'particle-age':'static';source.frame=Math.max(0,Math.round(finite(source.frame,defaults.frame)));source.frameFps=Math.max(.1,Math.min(60,finite(source.frameFps,defaults.frameFps)));source.frameLoop=source.frameLoop!==false;return source;}
  function sourceFromPreset(scene,presetValue){const parts=clone(presetValue.parts||[]),boxes=parts.map(part=>part.type==='line'?{x:Math.min(+part.x||0,+part.x2||0),y:Math.min(+part.y||0,+part.y2||0),w:Math.max(1,Math.abs((+part.x2||0)-(+part.x||0))),h:Math.max(1,Math.abs((+part.y2||0)-(+part.y||0)))}:{x:+part.x||0,y:+part.y||0,w:Math.max(1,+part.w||1),h:Math.max(1,+part.h||1)}),minX=boxes.length?Math.min(...boxes.map(box=>box.x)):0,minY=boxes.length?Math.min(...boxes.map(box=>box.y)):0,maxX=boxes.length?Math.max(...boxes.map(box=>box.x+box.w)):2,maxY=boxes.length?Math.max(...boxes.map(box=>box.y+box.h)):2,w=Math.max(1,maxX-minX),h=Math.max(1,maxY-minY),used=new Set();for(let index=0;index<parts.length;index++){const part=parts[index];let id=String(part.id||`part-${index+1}`),suffix=2;while(used.has(id))id=`part-${index+1}-${suffix++}`;part.id=id;used.add(id);part.x=(+part.x||0)-minX;part.y=(+part.y||0)-minY;if(part.type==='line'){part.x2=(+part.x2||0)-minX;part.y2=(+part.y2||0)-minY;}}
    return{id:unique(scene,`particle-source-${presetValue.id}`),name:`${presetValue.name} · 粒子实体`,type:'vector',x:0,y:0,w,h,scaleX:1,scaleY:1,rot:0,alpha:1,parts,particleSourceOnly:true};
  }
  function discardOwnedSource(scene,target,nextSourceId){const particle=target&&target.particle||{},id=particle.sourceOwned&&particle.sourceId;if(!id||id===nextSourceId)return;const used=(scene.entities||[]).some(item=>item!==target&&item.type==='particle-emitter'&&item.particle&&item.particle.sourceId===id);if(!used)scene.entities=scene.entities.filter(item=>item.id!==id);}
  function create(scene,options){options=options||{};scene.entities=Array.isArray(scene.entities)?scene.entities:[];let source=options.sourceId&&entity(scene,options.sourceId),owned=false,presetValue=preset(options.presetId)||preset('snow')||presets()[0];if(source&&(source.type==='group'||source.type==='particle-emitter'))throw new Error('粒子实体必须是普通对象');if(!source){if(!presetValue)throw new Error('没有可用的粒子预设实体');source=sourceFromPreset(scene,presetValue);scene.entities.push(source);owned=true;}
    const particle=normalizedParticle(Object.assign({},presetValue&&presetValue.particle||{},options.particle||{},{sourceId:source.id,sourceOwned:owned,presetId:options.presetId||presetValue&&presetValue.id||'custom',usePresetSource:owned})),target={id:unique(scene,'particle'),name:options.name||(source.name||source.id)+' · 粒子',type:'particle-emitter',x:finite(options.x,0),y:finite(options.y,0),w:Math.max(1,finite(options.w,scene.width||320)),h:Math.max(1,finite(options.h,scene.height||180)),scaleX:1,scaleY:1,rot:0,alpha:1,particle};scene.entities.push(target);return target;
  }
  function setSource(scene,emitterId,sourceId){const target=emitter(scene,emitterId),source=entity(scene,sourceId);if(!source||source.type==='group'||source.type==='particle-emitter')throw new Error('粒子实体必须是普通对象');discardOwnedSource(scene,target,source.id);target.particle=Object.assign({},target.particle,{sourceId:source.id,sourceOwned:false,usePresetSource:false,presetId:'custom'});return target;}
  function applyPreset(scene,emitterId,presetId,usePresetSource){const target=emitter(scene,emitterId),presetValue=preset(presetId);if(!presetValue)throw new Error(`找不到粒子预设「${presetId}」`);let sourceId=target.particle&&target.particle.sourceId,owned=!!(target.particle&&target.particle.sourceOwned);if(usePresetSource){const source=sourceFromPreset(scene,presetValue);scene.entities.push(source);discardOwnedSource(scene,target,source.id);sourceId=source.id;owned=true;}target.particle=normalizedParticle(Object.assign({},target.particle,presetValue.particle,{sourceId,sourceOwned:owned,presetId,usePresetSource:!!usePresetSource}));return target;}
  function set(scene,emitterId,key,value){
    const target=emitter(scene,emitterId),particle=target.particle=Object.assign({},target.particle||{});
    if(key==='mode'){
      if(value==='layer'&&particle.mode!=='layer')Object.assign(particle,{size:1,sizeVar:0,spin:0,spinVar:0,alpha:1});
      particle.mode=value==='layer'?'layer':'sprite';
    }else if(key==='cellSize')particle.cellSize=Math.max(1,Math.round(finite(value,32)));
    else if(key==='sourceFps')particle.sourceFps=Math.max(1,Math.min(30,Math.round(finite(value,12))));
    else if(key==='layerEmission')particle.layerEmission=value==='continuous'?'continuous':'burst';
    else if(key==='fragmentShape')particle.fragmentShape=value==='circle'?'circle':'rect';
    else if(key==='sampleTime')particle.sampleTime=value==='fixed'?'fixed':'birth';
    else if(key==='startTime')particle.startTime=Math.max(0,Math.min(Math.max(0,scene.loop-.001),finite(value,0)));
    else if(numeric.has(key))particle[key]=finite(value,defaults[key]);
    else if(boolean.has(key))particle[key]=!!value;
    else if(key==='playback')particle.playback=value==='particle-age'?'particle-age':'static';
    else throw new Error(`不允许写入粒子字段「${key}」`);
    Object.assign(particle,normalizedParticle(particle));return particle[key];
  }
  global.EditorVNextParticleState=Object.freeze({defaults,presets,preset,entity,emitter,eligible,normalizedParticle,create,setSource,applyPreset,set});
})(typeof window!=='undefined'?window:globalThis);
