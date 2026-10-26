/* Shared frame-scoped object stamps. Never evaluate arbitrary code or make
   one effect capsule per placement. Scene identities remain frame-local. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,contexts=new WeakMap(),plans=new WeakMap(),LIMITS=Object.freeze({side:8192,pixels:16777216,framePixels:33554432});
  function references(entity){
    const refs=[];
    for(const part of [entity,...entity.parts||[]]){const config=part.extensions?.elements;if(config?.enabled&&config.sourceId)refs.push(config.sourceId);const marker=part.pathEndpoints;if(marker?.enabled&&marker.type==='object'&&marker.sourceId)refs.push(marker.sourceId);}
    const mask=entity.effects?.mask;if(mask?.type==='element'&&mask.targetId)refs.push(mask.targetId);
    if(entity.particle?.sourceId)refs.push(entity.particle.sourceId);return refs;
  }
  function canReference(scene,ownerId,sourceId){
    const byId=new Map((scene.entities||[]).map(e=>[e.id,e])),source=byId.get(sourceId);
    if(!source)return{ok:false,reason:sourceId?'引用对象已不存在':'请选择引用对象'};
    if(source.parentId)return{ok:false,reason:'组内对象请通过所属组引用'};
    const active=new Set(),done=new Set();let reason='';
    function visit(id){
      if(id===ownerId){reason='不能引用自身、所属组或间接引用自身的对象';return false;}
      if(active.has(id)){reason='引用链存在循环';return false;}if(done.has(id))return true;
      const value=byId.get(id);if(!value){reason='引用链缺少对象：'+id;return false;}
      if(value.type==='particle-emitter'){reason='本轮不支持粒子发射器或包含粒子的组作为来源';return false;}
      active.add(id);const ids=references(value);if(value.type==='group')for(const child of scene.entities||[])if(child.parentId===id)ids.push(child.id);
      for(const next of ids)if(!visit(next))return false;active.delete(id);done.add(id);return true;
    }
    return visit(sourceId)?{ok:true,source}:{ok:false,reason};
  }
  function choices(scene,ownerId){return(scene.entities||[]).filter(e=>!e.parentId&&!e.particleSourceOnly&&canReference(scene,ownerId,e.id).ok);}
  function leaves(scene,root){
    if(root.type!=='group')return[root];const ids=new Set([root.id]);let changed=true;
    while(changed){changed=false;for(const e of scene.entities||[])if(e.parentId&&ids.has(e.parentId)&&!ids.has(e.id)){ids.add(e.id);changed=true;}}
    return(scene.entities||[]).filter(e=>ids.has(e.id)&&e.type!=='group');
  }
  function plan(scene,frame,ownerId,sourceId){
    let map=plans.get(frame);if(!map){map=new Map();plans.set(frame,map);}const key=ownerId+'|'+sourceId;if(map.has(key))return map.get(key);
    const valid=canReference(scene,ownerId,sourceId);if(!valid.ok){const out={status:valid.reason};map.set(key,out);return out;}
    const root=valid.source,rootValues=frame.valuesFor(root),members=leaves(scene,root).filter(e=>{const v=frame.valuesFor(e);return!e.hidden&&!v.parentHidden&&v.timelineVisible!==false&&v.alpha>0&&v.parentAlpha>0;});
    if(root.hidden||rootValues.parentHidden||rootValues.timelineVisible===false||!members.length){const out={status:'',hidden:true};map.set(key,out);return out;}
    const boxes=members.map(entity=>api.modules.objects.capsuleBounds(scene,entity,frame));
    const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y)),right=Math.max(...boxes.map(b=>b.x+b.w)),bottom=Math.max(...boxes.map(b=>b.y+b.h)),bounds={x,y,w:Math.ceil(right-x),h:Math.ceil(bottom-y)};
    const out={root,members,bounds,anchor:[(+root.x||0)+(+root.w||1)/2,(+root.y||0)+(+root.h||1)/2],blend:rootValues.blend||'normal',status:''};
    if(![x,y,bounds.w,bounds.h].every(Number.isFinite)||bounds.w>LIMITS.side||bounds.h>LIMITS.side||bounds.w*bounds.h>LIMITS.pixels)out.status='来源渲染范围超过排布精灵预算，请减小来源或效果范围';
    map.set(key,out);return out;
  }
  function begin(scene,frame,stats,surfaces){
    const sprites=new Map();let pixels=0;
    const context={scene,frame,stats,surfaces,
      sprite(ownerId,sourceId){
        const p=plan(scene,frame,ownerId,sourceId);if(p.status||p.hidden)return null;
        if(sprites.has(sourceId))return sprites.get(sourceId);
        if(pixels+p.bounds.w*p.bounds.h>LIMITS.framePixels){stats.pathInstanceBudgetSkips=(stats.pathInstanceBudgetSkips||0)+1;return null;}
        const canvas=surfaces.acquire(p.bounds.w,p.bounds.h),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
        try{
          for(const entity of p.members){
            const values=frame.valuesFor(entity),sprite=api.modules.objects.createCapsule(scene,entity,frame,stats,surfaces);
            try{ctx.save();ctx.globalAlpha=values.alpha*values.parentAlpha;ctx.globalCompositeOperation=p.root.type==='group'?api.modules.blend.toCanvas(values.blend):'source-over';ctx.drawImage(sprite.capsule,sprite.bounds.x-p.bounds.x,sprite.bounds.y-p.bounds.y);ctx.restore();}finally{surfaces.release(sprite.capsule);}
          }
        }catch(error){surfaces.release(canvas);throw error;}
        const result={canvas,plan:p};sprites.set(sourceId,result);pixels+=canvas.width*canvas.height;stats.pathSpriteBuilds=(stats.pathSpriteBuilds||0)+1;stats.pathSpritePixels=pixels;return result;
      },
      release(){for(const sprite of sprites.values())surfaces.release(sprite.canvas);sprites.clear();contexts.delete(frame);}
    };
    contexts.set(frame,context);return context;
  }
  function each(part,geometry,context,callback){
    if(!context?.scene||!context?.frame)return;
    const e=api.modules.pathExtensions.normalize(part).elements,m=api.modules.pathEndpoints.normalize(part),sets=[];
    if(e.enabled&&e.sourceId)sets.push([e.sourceId,api.modules.pathExtensions.build(part,geometry).instances]);
    if(m.enabled&&m.type==='object'&&m.sourceId)sets.push([m.sourceId,api.modules.pathEndpoints.placements(part,geometry)]);
    for(const [sourceId,placements]of sets){const p=plan(context.scene,context.frame,context.ownerId,sourceId);if(p.status||p.hidden)continue;for(const placement of placements)callback(placement,p,{sourceId});}
  }
  function corners(placement,p){const {bounds:b,anchor:a}=p,cos=Math.cos(placement.angle),sin=Math.sin(placement.angle),s=placement.scale;return[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]].map(([x,y])=>{x=(x-a[0])*s;y=(y-a[1])*s;return[placement.point[0]+cos*x-sin*y,placement.point[1]+sin*x+cos*y];});}
  function bounds(part,geometry,context){
    let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;
    each(part,geometry,context,(placement,p)=>{for(const [a,b]of corners(placement,p)){x=Math.min(x,a);y=Math.min(y,b);right=Math.max(right,a);bottom=Math.max(bottom,b);}});
    return Number.isFinite(x)?{x,y,w:Math.max(1,right-x),h:Math.max(1,bottom-y)}:null;
  }
  function contains(part,geometry,context,x,y){
    let hit=false;each(part,geometry,context,(placement,p)=>{
      if(hit||!placement.endpoint&&!api.modules.pathExtensions.visible(part,placement.u,geometry.closed))return;
      const dx=(x-placement.point[0])/placement.scale,dy=(y-placement.point[1])/placement.scale,cos=Math.cos(placement.angle),sin=Math.sin(placement.angle),lx=cos*dx+sin*dy+p.anchor[0],ly=-sin*dx+cos*dy+p.anchor[1],b=p.bounds;
      hit=lx>=b.x&&ly>=b.y&&lx<=b.x+b.w&&ly<=b.y+b.h;
    });return hit;
  }
  function paint(ctx,part,geometry,context,kind){
    const rendering=context&&contexts.get(context.frame?._maskSourceFrame||context.frame);if(!rendering)return;
    each(part,geometry,context,(placement,p,e)=>{
      if(kind==='elements'&&placement.endpoint||kind==='endpoints'&&!placement.endpoint)return;
      if(!placement.endpoint&&!api.modules.pathExtensions.visible(part,placement.u,geometry.closed))return;
      const sprite=rendering.sprite(context.ownerId,e.sourceId);if(!sprite)return;
      // The source root's scene blend is not an intrinsic bitmap property.
      // Preserve the carrier part's blend; the owner composite still runs last.
      ctx.save();ctx.translate(...placement.point);ctx.rotate(placement.angle);ctx.scale(placement.scale,placement.scale);ctx.drawImage(sprite.canvas,sprite.plan.bounds.x-sprite.plan.anchor[0],sprite.plan.bounds.y-sprite.plan.anchor[1]);ctx.restore();
      rendering.stats.pathInstancesDrawn=(rendering.stats.pathInstancesDrawn||0)+1;
    });
  }
  function hiddenSources(scene){
    const ids=new Set();
    for(const owner of scene.entities||[])for(const part of [owner,...owner.parts||[]]){const e=part.extensions?.elements;if(!e?.enabled||e.keepSource!==false||!canReference(scene,owner.id,e.sourceId).ok)continue;ids.add(e.sourceId);for(const child of leaves(scene,(scene.entities||[]).find(v=>v.id===e.sourceId)))ids.add(child.id);}
    return ids;
  }
  api.modules.pathInstances=Object.freeze({begin,plan,choices,canReference,bounds,contains,paint,hiddenSources,corners,limits:LIMITS});
})(typeof window!=='undefined'?window:globalThis);
