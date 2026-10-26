/* Paint generators are attachments to authored paths, never replacement part types. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext;
  function definitions(){const latest=new Map();for(const d of api.modules.patternGenerators?.manifests()||[])if(!latest.has(d.id)||latest.get(d.id).version<d.version)latest.set(d.id,d);return Array.from(latest.values());}
  function definition(id){return definitions().find(d=>d.id===id)||null;}
  function supports(id,part){return !!definition(id)?.carriers.includes(part.type);}
  function normalize(id,raw,part){
    const base=definition(id);if(!base||!supports(id,part))return null;
    const declared=api.modules.patternProviders.validate(raw?.definition||base).definition;
    if(declared.id!==id)throw Error('附着图样身份不匹配');
    const recipe=api.modules.patternProviders.normalizeRecipe({id,version:declared.version,definition:declared,params:raw?.params||{}});
    return{enabled:raw?.enabled===true,definition:recipe.definition,params:recipe.params};
  }
  function active(part){return (part.extensions?.attached||[]).some(id=>supports(id,part)&&part.extensions[id]?.enabled);}
  function paint(ctx,part,id,geometry,context){
    const config=normalize(id,part.extensions?.[id],part);if(!config?.enabled||!geometry.closed)return;
    const plan=api.modules.patternGenerators.generateDefinition(config.definition,{carrierType:part.type,path:geometry.stroke,bounds:geometry.box,params:config.params,time:context?.frame?.time||0,seed:1});
    if(ctx.globalAlpha<1&&context?.surfaces){const pool=context.surfaces,b=geometry.box,surface=pool.acquire(b.w,b.h),local=surface.getContext('2d');try{local.clearRect(0,0,surface.width,surface.height);local.save();try{local.translate(-b.x,-b.y);api.modules.patternGenerators.paint(local,plan);}finally{local.restore();}ctx.drawImage(surface,b.x,b.y);}finally{pool.release(surface);}}
    else api.modules.patternGenerators.paint(ctx,plan);
  }
  function prefix(id){return 'extensionsById.'+encodeURIComponent(id).replace(/\./g,'%2E')+'.params.';}
  api.modules.pathGenerators=Object.freeze({definitions,definition,supports,normalize,active,paint,prefix});
})(typeof window!=='undefined'?window:globalThis);
