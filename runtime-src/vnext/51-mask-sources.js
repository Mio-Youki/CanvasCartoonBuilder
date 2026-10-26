/* Complete isolated object captures for masks. Player-local, bounded caches. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,frames=new WeakMap(),qualities=new Set(['full','no-sample','no-decorate','base']);
  const now=()=>typeof performance!=='undefined'?performance.now():0;
  const keyFrame=frame=>frame?._maskSourceFrame||frame;
  function create(scene,surfaces){
    api.modules.maskContract.validateReferences(scene);
    const byId=new Map(scene.entities.map(e=>[e.id,e])),persistent=new Map(),staticMemo=new Map(),budget=8*1024*1024;
    let retained=0,current=null;
    function members(root){return root.type==='group'?scene.entities.filter(e=>e.type!=='group'&&ancestor(e,root.id)):[root];}
    function ancestor(entity,id){let parent=entity.parentId;while(parent){if(parent===id)return true;parent=byId.get(parent)?.parentId;}return false;}
    function changing(entity,seen=new Set()){
      if(!entity||seen.has(entity.id))return false;seen.add(entity.id);
      const trackKeys=Object.keys(scene.timeline?.tracks||{}),visibility=Object.keys(scene.timeline?.visibility||{});
      if(trackKeys.some(key=>key===entity.id||key==='entity:'+entity.id||key.includes(':object:'+entity.id+':'))||visibility.some(key=>key===entity.id||key.includes(':object:'+entity.id+':'))||entity.sceneVariants?.length||entity.type==='procedural'||entity.type==='particle-emitter')return true;
      if(entity.type==='builtin'&&api.modules.builtins.timeDependent(entity))return true;
      if(entity.type==='image'&&(scene.assets[entity.assetId]?.frames?.length>1||scene.assetRefs?.[entity.assetId]?.frames?.length>1))return true;
      if(entity.effects?.sample?.['offset-sampling']?.enabled&&entity.effects.sample['offset-sampling'].motion?.enabled!==false)return true;
      function generator(v){if(!v||typeof v!=='object')return false;if(v.definition?.format==='tosampool-pattern-generator/v1')return true;return Object.values(v).some(next=>next&&typeof next==='object'&&generator(next));}if(generator(entity.parts)||generator(entity.extensions)||generator(entity.recipe))return true;
      function dynamic(v){if(!v||typeof v!=='object')return false;if(v.anim&&Object.values(v.anim).some(Boolean))return true;if(v.motion===true||v.motion&&typeof v.motion==='object'&&v.motion.enabled!==false)return true;return Object.values(v).some(next=>next&&typeof next==='object'&&dynamic(next));}
      if(dynamic(entity))return true;
      if(entity.parentId&&changing(byId.get(entity.parentId),seen))return true;
      for(const id of api.modules.maskContract.references(entity))if(changing(byId.get(id),seen))return true;
      if(entity.type==='group')for(const child of members(entity))if(changing(child,seen))return true;
      return false;
    }
    function isStatic(entity){if(!staticMemo.has(entity.id))staticMemo.set(entity.id,!changing(entity));return staticMemo.get(entity.id);}
    function trimEntity(entity,quality){
      if(quality==='full'||!entity.effects)return entity;
      const effects={...entity.effects};if(quality==='no-sample'||quality==='base')effects.sample={};if(quality==='no-decorate'||quality==='base')effects.decorate={};return{...entity,effects};
    }
    function boundsFor(root,frame,quality,matrix){
      let bounds=null;
      for(const raw of members(root)){
        const e=trimEntity(raw,quality),v=frame.valuesFor(e),repeat=v.anim?.scroll?.repeat!==false&&v.anim?.scroll?.speed;
        const b=e.type==='particle-emitter'||repeat?{x:0,y:0,w:scene.width,h:scene.height}:api.modules.objects.capsuleBounds(scene,e,frame);
        if(!bounds)bounds={...b};else{const right=Math.max(bounds.x+bounds.w,b.x+b.w),bottom=Math.max(bounds.y+bounds.h,b.y+b.h);bounds.x=Math.min(bounds.x,b.x);bounds.y=Math.min(bounds.y,b.y);bounds.w=right-bounds.x;bounds.h=bottom-bounds.y;}
      }
      bounds=bounds||{x:0,y:0,w:1,h:1};if(matrix){const points=[[bounds.x,bounds.y],[bounds.x+bounds.w,bounds.y],[bounds.x,bounds.y+bounds.h],[bounds.x+bounds.w,bounds.y+bounds.h]].map(([x,y])=>[matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]]),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.floor(Math.min(...xs)),y=Math.floor(Math.min(...ys));bounds={x,y,w:Math.ceil(Math.max(...xs))-x,h:Math.ceil(Math.max(...ys))-y};}return bounds;
    }
    function evict(){while(retained>budget&&persistent.size){const [key,entry]=persistent.entries().next().value;persistent.delete(key);retained-=entry.canvas.width*entry.canvas.height;let holder=current;while(holder&&![...holder.entries.values()].includes(entry))holder=holder.previous;if(holder)holder.owned.add(entry.canvas);else surfaces.release(entry.canvas);}}
    function begin(frame,stats,options={}){
      const quality=options.maskSourceQuality||'full';if(!qualities.has(quality))throw Error('未知蒙版来源质量：'+quality);
      const state={frame,stats,quality,forceQuality:Object.hasOwn(options,'maskSourceQuality'),modes:new Set(),objectSession:options._maskSourceObjectSession,entries:new Map(),owned:new Set(),active:new Set(),depth:0,previous:current};frames.set(frame,state);current=state;
      stats.maskSourceQuality=quality;stats.maskSourceBuilds=0;stats.maskSourceHits=0;stats.maskSourceMs=0;stats.maskSourcePixels=0;
      stats.maskSourceDraws=0;stats.maskSourceRetainedPixels=retained;
      function end(){for(const canvas of state.owned)surfaces.release(canvas);state.owned.clear();frames.delete(frame);current=state.previous;}
      state.capture=(id,mode='alpha',matrix,quality=state.quality)=>capture(state,id,mode,matrix,quality);return{end};
    }
    function capture(state,id,mode,matrix,quality){
      if(!['alpha','luma'].includes(mode))throw Error('蒙版提取方式无效：'+mode);
      if(!qualities.has(quality))throw Error('未知蒙版来源质量：'+quality);state.modes.add(quality);state.stats.maskSourceQuality=state.modes.size>1?'mixed':quality;
      const source=byId.get(id);if(!source)throw Error('蒙版来源不存在：'+id);if(source.type==='particle-emitter')throw Error('粒子发射器不能作为蒙版来源');
      const stamp=id+'|'+quality+'|'+mode+'|'+(state.frame.preview?.pixelDivMultiplier||1)+'|'+(matrix?matrix.join(','):''),cached=state.entries.get(stamp)||persistent.get(stamp);
      if(cached){state.stats.maskSourceHits++;state.entries.set(stamp,cached);if(persistent.has(stamp)){persistent.delete(stamp);persistent.set(stamp,cached);}return cached;}
      if(state.active.has(id))throw Error('蒙版来源存在递归：'+[...state.active,id].join(' → '));
      state.active.add(id);const start=now(),outer=state.depth++===0;let canvas=null;
      try{
        const bounds=boundsFor(source,state.frame,quality,matrix);if(bounds.w>8192||bounds.h>8192||bounds.w*bounds.h>16777216)throw Error('蒙版来源超过离屏预算（8192边长／16MP），请缩小来源或明确降低来源效果');canvas=surfaces.acquire(bounds.w,bounds.h);const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;
        if(mode==='luma'){
          state.active.delete(id);const color=capture(state,id,'alpha',matrix,quality);state.active.add(id);ctx.drawImage(color.canvas,0,0);
          const image=ctx.getImageData(0,0,canvas.width,canvas.height),p=image.data;for(let i=0;i<p.length;i+=4)p[i+3]=api.modules.maskContract.channel(p[i],p[i+1],p[i+2],p[i+3],'luma');ctx.putImageData(image,0,0);surfaces.notePixels?.(canvas.width,canvas.height,1);
        }else{
          const rootId=source.id,original=state.frame,frame={...original,_maskSourceFrame:keyFrame(original),valuesFor:e=>{const values=original.valuesFor(e);return e.id===rootId?{...values,blend:'normal'}:values;}};
          const localScene=quality==='full'?scene:{...scene,entities:scene.entities.map(e=>trimEntity(e,quality))};
          const drawStats={directObjects:0,capsuleObjects:0,maskedObjects:0,particleEmitters:0,particlesDrawn:0,particleSpriteBuilds:0,unsupportedEffects:[]};
          ctx.save();try{ctx.translate(-bounds.x,-bounds.y);if(matrix)ctx.transform(...matrix);for(const raw of members(source)){const e=trimEntity(raw,quality);if(e.type==='particle-emitter')api.modules.particles.draw(ctx,localScene,e,frame,drawStats,surfaces);else api.modules.objects.draw(ctx,localScene,e,frame,drawStats,surfaces,state.objectSession);}}finally{ctx.restore();}
          state.stats.maskSourceDraws+=drawStats.directObjects+drawStats.capsuleObjects;
        }
        const entry={canvas,bounds,static:isStatic(source)};state.entries.set(stamp,entry);state.stats.maskSourceBuilds++;state.stats.maskSourcePixels+=canvas.width*canvas.height;
        if(isStatic(source)&&!state.frame.paletteCapture&&canvas.width*canvas.height<=budget){persistent.set(stamp,entry);retained+=canvas.width*canvas.height;evict();}else state.owned.add(canvas);
        state.stats.maskSourceRetainedPixels=retained;return entry;
      }catch(error){if(canvas)surfaces.release(canvas);throw error;}finally{state.active.delete(id);state.depth--;if(outer)state.stats.maskSourceMs+=now()-start;}
    }
    function clear(){if(current){for(const c of current.owned)surfaces.release(c);frames.delete(current.frame);current=null;}for(const entry of persistent.values())surfaces.release(entry.canvas);persistent.clear();retained=0;}
    return Object.freeze({begin,clear});
  }
  function obtain(scene,frame,surfaces,id,mode,matrix,quality){
    const state=frames.get(keyFrame(frame));if(state)return{entry:state.capture(id,mode,matrix,state.forceQuality?state.quality:quality||state.quality),release(){}};
    // Standalone mask users retain correct semantics, but no hidden global cache.
    const session=create(scene,surfaces),active=session.begin(frame,{},{});try{return{entry:frames.get(frame).capture(id,mode,matrix,quality||'full'),release(){active.end();session.clear();}};}catch(error){active.end();session.clear();throw error;}
  }
  api.modules.maskSources=Object.freeze({create,obtain});
})(typeof window!=='undefined'?window:globalThis);
