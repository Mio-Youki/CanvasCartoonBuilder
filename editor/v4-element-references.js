/* Typed authored object closure. It never samples a frame or executes a module. */
(function(global){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value)),limits=Object.freeze({sources:32});
  function masks(){if(!global.EditorVNextMaskState)throw Error('对象引用需要共享蒙版模块');return global.EditorVNextMaskState;}
  function references(entity){
    const refs=[];
    if(entity.type==='particle-emitter'){if(!entity.particle?.sourceId)throw Error('粒子实体来源缺失');refs.push({kind:'entity',id:entity.particle.sourceId});for(const name of ['emissionRange','motionRange'])if(entity.particle[name])refs.push(...masks().references(entity.particle[name]).filter(ref=>ref.kind==='entity'));}
    if(entity.parts!=null&&!Array.isArray(entity.parts))throw Error('图元列表无效');
    if(entity.effects?.mask)refs.push(...masks().references(entity.effects.mask).filter(ref=>ref.kind==='entity'));
    for(const part of [entity,...entity.parts||[]]){
      const placement=part.extensions?.elements,endpoint=part.pathEndpoints;
      if(placement?.enabled&&!placement.sourceId)throw Error('元素排布缺少来源');
      if(endpoint?.enabled&&endpoint.type==='object'&&!endpoint.sourceId)throw Error('路径端点缺少来源');
      for(const config of [placement,endpoint])if(config?.sourceId){
        if(typeof config.sourceId!=='string')throw Error('对象引用身份无效');
        refs.push({kind:'entity',id:config.sourceId});
      }
    }
    return refs;
  }
  function remap(input,mapping){
    const entity=copy(input);
    if(entity.parentId){if(!mapping[entity.parentId])throw Error('组父级映射缺失');entity.parentId=mapping[entity.parentId];}
    if(entity.type==='particle-emitter'){if(!mapping[entity.particle?.sourceId])throw Error('粒子来源映射缺失');entity.particle.sourceId=mapping[entity.particle.sourceId];entity.particle.sourceOwned=true;}
    if(entity.particle)for(const name of ['emissionRange','motionRange'])if(entity.particle[name])entity.particle[name]=masks().remapReferences(entity.particle[name],{entity:mapping});
    if(entity.effects?.mask)entity.effects.mask=masks().remapReferences(entity.effects.mask,{entity:mapping});
    for(const part of [entity,...entity.parts||[]])for(const config of [part.extensions?.elements,part.pathEndpoints])if(config?.sourceId){
      if(!Object.hasOwn(mapping,config.sourceId))throw Error('对象引用映射缺失：'+config.sourceId);
      config.sourceId=mapping[config.sourceId];
    }
    return entity;
  }
  function validate(root,sources,children){
    children=children||[];
    if(!Array.isArray(sources)||sources.length>limits.sources)throw Error('元素来源数量超出32个预算或列表无效');
    const list=[root,...children,...sources],byId=new Map();
    for(const entity of list){if(typeof entity?.id!=='string'||!entity.id||['__proto__','prototype','constructor'].includes(entity.id)||byId.has(entity.id))throw Error('元素来源身份无效或重复');byId.set(entity.id,entity);}
    const active=new Set(),done=new Set();
    function visit(id){
      if(active.has(id))throw Error('元素对象引用存在循环：'+id);if(done.has(id))return;
      const entity=byId.get(id);if(!entity)throw Error('元素对象来源缺失：'+id);
      active.add(id);for(const child of list)if(child.parentId===id)visit(child.id);for(const ref of references(entity))visit(ref.id);active.delete(id);done.add(id);
    }
    visit(root.id);if(done.size!==list.length)throw Error('元素预设包含引用闭包以外的对象');
    for(const child of list)if(child!==root&&child.parentId&&byId.get(child.parentId)?.type!=='group')throw Error('组子元素父级无效');
    for(const child of children)if(!child.parentId)throw Error('组子元素父级无效');
  }
  function capture(scene,rootId,prepare){
    const byId=new Map(),order=[],active=new Set(),done=new Set();
    for(const entity of scene.entities||[]){if(byId.has(entity.id))throw Error('场景对象身份重复：'+entity.id);byId.set(entity.id,entity);}
    function visit(id){
      if(active.has(id))throw Error('元素对象引用存在循环：'+id);if(done.has(id))return;
      const entity=byId.get(id);if(!entity)throw Error('元素对象来源缺失：'+id);
      if(id!==rootId&&entity.parentId&&!owned.has(id)&&!order.includes(entity.parentId)&&!(scene.entities||[]).some(e=>e.type==='particle-emitter'&&e.particle?.sourceId===id&&order.includes(e.id)))throw Error('不支持带外部父级的引用来源：'+id);
      active.add(id);order.push(id);if(order.length>limits.sources+257)throw Error('元素引用与子元素数量超出预算');
      for(const ref of references(entity))visit(ref.id);
      if(entity.type==='group')for(const child of scene.entities||[])if(child.parentId===id)visit(child.id);
      active.delete(id);done.add(id);
    }
    const owned=new Set();function own(id){if(owned.has(id))throw Error('组父级存在循环');owned.add(id);for(const child of scene.entities||[])if(child.parentId===id)own(child.id);}own(rootId);
    visit(rootId);
    const ordered=[rootId,...(scene.entities||[]).filter(e=>e.id!==rootId&&owned.has(e.id)).map(e=>e.id),...order.filter(id=>!owned.has(id))];order.splice(0,order.length,...ordered);
    const mapping=Object.fromEntries(order.map((id,index)=>[id,index?'source-'+index:'root']));
    const nodes=order.map((id,index)=>{const original=byId.get(id),node=remap(prepare(original,index===0,index!==0&&!!mapping[original.parentId]),mapping);node.id=mapping[id];return node;}),children=nodes.filter((node,index)=>index&&owned.has(order[index])),sources=nodes.filter((node,index)=>index&&!owned.has(order[index]));
    validate(nodes[0],sources,children);return{root:nodes[0],sources,children};
  }
  function prunePrivate(scene,extraRoots){
    const list=scene.entities||[];if(!list.some(e=>e.referenceSourceOnly||e.particleSourceOnly))return [];
    const byId=new Map(list.map(e=>[e.id,e])),children=new Map(),owned=new Set(),keep=new Set();
    for(const e of list){if(e.parentId){if(!children.has(e.parentId))children.set(e.parentId,[]);children.get(e.parentId).push(e.id);}if(e.referenceSourceOnly||e.particleSourceOnly)owned.add(e.id);}
    const mark=id=>{if(owned.has(id)&&!mark.seen.has(id)){mark.seen.add(id);for(const child of children.get(id)||[]){owned.add(child);mark(child);}}};mark.seen=new Set();[...owned].forEach(mark);
    function scan(value){if(!value||typeof value!=='object')return;for(const [key,child]of Object.entries(value))if((key==='sourceId'||key==='targetId')&&typeof child==='string')visit(child);else if(child&&typeof child==='object')scan(child);}
    function visit(id){if(keep.has(id)||!byId.has(id))return;keep.add(id);const e=byId.get(id);if(e.parentId)visit(e.parentId);for(const child of children.get(id)||[])visit(child);scan(e);}
    for(const e of list)if(!owned.has(e.id))visit(e.id);
    scan(scene.sceneEffects);scan(scene.timeline);scan(scene.background);for(const root of extraRoots||[])scan(root);
    const removed=[...owned].filter(id=>!keep.has(id));if(!removed.length)return removed;
    const deleted=new Set(removed);scene.entities=list.filter(e=>!deleted.has(e.id));
    for(const e of scene.entities)if(e.resourceBindings?.sources)e.resourceBindings.sources=e.resourceBindings.sources.filter(id=>!deleted.has(id));
    for(const id of removed){if(scene.timeline?.visibility)delete scene.timeline.visibility[id];for(const key of [id,'entity:'+id])if(scene.timeline?.tracks)delete scene.timeline.tracks[key];}
    return removed;
  }
  global.EditorV4ElementReferences=Object.freeze({limits,references,remap,validate,capture,prunePrivate});
})(typeof window!=='undefined'?window:globalThis);
