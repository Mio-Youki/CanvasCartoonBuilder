/* Capability directory. Entries are shipped implementations, never UI placeholders. */
(function(global){
  'use strict';
  const paths=['rect','ellipse','poly','line','stroke'];
  const carriers=Object.freeze([
    {id:'rect',name:'矩形',mode:'rect',type:'rect'},
    {id:'ellipse',name:'椭圆',mode:'ellipse',type:'ellipse'},
    {id:'regular',name:'正多边形',mode:'poly',type:'poly',polygonMode:'regular',sides:5},
    {id:'free',name:'自由多边形',mode:'poly',type:'poly',polygonMode:'free'},
    {id:'line',name:'直线',mode:'line',type:'line'},
    {id:'stroke',name:'像素笔触',mode:'pencil',type:'stroke'}
  ].map(Object.freeze));
  const entries=Object.freeze([
    {id:'ticks',name:'刻度排布',category:'attached',supports:p=>paths.includes(p.type)},
    {id:'nested',name:'轮廓嵌套',category:'attached',supports:p=>['rect','ellipse'].includes(p.type)||p.type==='poly'&&p.polygonMode==='regular'},
    {id:'elements',name:'元素排布',category:'attached',supports:p=>paths.includes(p.type)},
    {id:'corner-arrows',name:'角点箭头',category:'hybrid',createCarrier:'rect',supports:p=>global.ToSampoolRuntimeVNext.modules.customShapes.eligible(p)},
    {id:'brackets',name:'括号／角标',category:'hybrid',createCarrier:'rect',supports:p=>global.ToSampoolRuntimeVNext.modules.bracketShapes.eligible(p)}
  ].map(Object.freeze));
  function target(scene,selection){
    const ids=selection.selectedIds||[];if(ids.length!==1)return null;
    const owner=(scene.entities||[]).find(e=>e.id===ids[0]);if(!owner||['group','particle-emitter'].includes(owner.type))return null;
    const selected=(selection.selectedPartIds||[]).filter(id=>(owner.parts||[]).some(p=>p.id===id));if(selected.length>1)return null;
    const partId=selection.selectedPartId||selected[0];
    if(partId){const part=(owner.parts||[]).find(p=>p.id===partId);if(part)return [...paths,'custom'].includes(part.type)?{ownerId:owner.id,partId:part.id,part}:null;}
    if(paths.includes(owner.type)&&!(owner.parts||[]).length)return{ownerId:owner.id,partId:'@self',part:owner};
    if((owner.parts||[]).length!==1)return null;const part=owner.parts[0];return [...paths,'custom'].includes(part.type)?{ownerId:owner.id,partId:part.id,part}:null;
  }
  function byId(id){const entry=entries.find(e=>e.id===id);if(entry)return entry;const definition=global.ToSampoolRuntimeVNext.modules.pathGenerators?.definition(id);return definition?{id,name:definition.name,category:'attached',supports:p=>definition.carriers.includes(p.type)}:null;}
  function available(scene,selection){const current=target(scene,selection);return{target:current,entries:current?entries.filter(e=>e.supports(current.part)):entries.slice()};}
  function supportedCarriers(id){const entry=byId(id);return entry?carriers.filter(c=>entry.supports(c)):[];}
  // Membership is independent of enabled and of runtime-normalized defaults.
  function attached(part){
    const raw=part.extensions||{};
    const ids=Array.isArray(raw.attached)?raw.attached:['corner-arrows','brackets','nested','ticks','elements'].filter(id=>raw[id]?.enabled);
    return [...new Set(ids)].filter(id=>!!byId(id));
  }
  function commit(part,settings,group){
    const ids=attached(part);if(byId(group)&&!ids.includes(group))ids.push(group);
    part.extensions={...settings,attached:ids};return part.extensions;
  }
  function remove(part,id,scene){
    if(!byId(id))throw Error('图样尚未登记');
    const ids=attached(part).filter(value=>value!==id);
    if(!ids.length)delete part.extensions;
    else{const saved={...part.extensions,attached:ids};delete saved[id];part.extensions=saved;}
    if(scene)global.EditorV4ElementReferences?.prunePrivate(scene);return part;
  }
  function enable(part,id){const entry=byId(id);if(!entry||!entry.supports(part))throw Error('此图样不支持当前图元');const modules=global.ToSampoolRuntimeVNext.modules,api=modules.pathExtensions,saved=api.normalize(part);if(!saved[id]&&modules.pathGenerators?.definition(id))saved[id]=modules.pathGenerators.normalize(id,{},part);saved[id].enabled=true;commit(part,saved,id);return part;}
  function reorder(part,id,target,mode){
    const ids=attached(part);if(id===target||!ids.includes(id)||!ids.includes(target))return false;
    const order=ids.filter(value=>value!==id),pos=order.indexOf(target);
    // Storage is back-to-front; tree is front-to-back.
    order.splice(pos+(mode==='before'?1:0),0,id);part.extensions={...part.extensions,attached:order};return true;
  }
  function createPart(part,id){const entry=byId(id);if(!entry)throw Error('图样尚未登记');if(entry.category==='attached')return enable(part,id);
    part.type='custom';part.name=entry.name;part.recipe={id,version:1,params:{}};part.recipe=global.ToSampoolRuntimeVNext.modules.customShapes.normalizeRecipe(part.recipe);
    part.stroke=part.stroke||part.fill||'#ffd23f';part.strokeWidth=Math.max(1,+part.strokeWidth||3);part.fill=null;delete part.fillPaint;delete part.fillPattern;delete part.radius;delete part.extensions;return part;
  }
  global.EditorV4PatternRegistry=Object.freeze({version:1,entries,carriers,byId,target,available,supportedCarriers,attached,commit,remove,enable,reorder,createPart});
})(typeof window!=='undefined'?window:globalThis);
