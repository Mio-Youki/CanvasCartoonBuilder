/* Mask domain v1: base-only parameters and render dependency validation. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,cache=new WeakMap(),SKIP=Symbol('mask-No');
  const roots=Object.freeze(['effects.mask','particle.emissionRange','particle.motionRange']);
  const geometryTypes=Object.freeze(['rect','ellipse','poly']);
  function channel(r,g,b,a,mode){return mode==='luma'?Math.round((r*.2126+g*.7152+b*.0722)*a/255):a;}
  function containsGeometry(shape,x,y){
    if(shape.type==='shapes')return shape.shapes.some(s=>containsGeometry(s,x,y));
    if(shape.type==='rect')return shape.w>0&&shape.h>0&&x>=shape.x&&x<=shape.x+shape.w&&y>=shape.y&&y<=shape.y+shape.h;
    if(shape.type==='ellipse'){const dx=(x-shape.x-shape.w/2)/(shape.w/2),dy=(y-shape.y-shape.h/2)/(shape.h/2);return dx*dx+dy*dy<=1;}
    if(shape.type==='poly'){
      let winding=0;const points=shape.points||[];
      for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],cross=(b[0]-a[0])*(y-a[1])-(x-a[0])*(b[1]-a[1]);if(a[1]<=y&&b[1]>y&&cross>0)winding++;else if(a[1]>y&&b[1]<=y&&cross<0)winding--;}
      return winding!==0;
    }return false;
  }
  function normalizeShapes(mask){
    if(mask?.type!=='shapes')return mask;
    if(mask.version!==1||!Array.isArray(mask.shapes)||mask.shapes.length<1||mask.shapes.length>64)throw Error('图形蒙版需要版本1及1到64个图形');
    const ids=new Set();let points=0;
    const shapes=mask.shapes.map(shape=>{
      if(!shape||typeof shape.id!=='string'||!shape.id||ids.has(shape.id))throw Error('蒙版图形ID缺失或重复');ids.add(shape.id);
      if(!geometryTypes.includes(shape.type))throw Error('蒙版图形仅支持矩形、椭圆和多边形');
      if(Object.keys(shape).some(key=>!['id','name','type','x','y','w','h','points'].includes(key)))throw Error('蒙版图形含未声明字段；跟随和反相应设置在合并层');
      const out={id:shape.id,type:shape.type};if(shape.name!=null)out.name=String(shape.name);
      if(shape.type==='poly'){
        if(!Array.isArray(shape.points)||shape.points.length<3||shape.points.length>4096||shape.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>typeof v!=='number'||!Number.isFinite(v))))throw Error('蒙版图形路径无效或超出4096点预算');
        points+=shape.points.length;out.points=shape.points.map(p=>p.slice());
      }else{for(const key of ['x','y','w','h'])if(typeof shape[key]!=='number'||!Number.isFinite(shape[key]))throw Error('蒙版图形范围无效');if(shape.w<=0||shape.h<=0)throw Error('蒙版图形范围必须大于0');Object.assign(out,{x:shape.x,y:shape.y,w:shape.w,h:shape.h});}
      return out;
    });
    if(points>16384)throw Error('蒙版图形总顶点超出16384点预算');
    return {...mask,shapes};
  }
  function blocked(path,effect){return(effect?['mask']:roots).some(root=>path===root||path.startsWith(root+'.'));}
  function cleanValue(path,value,effect,counter){
    if(blocked(path,effect)){counter.count++;return SKIP;}
    if(!value||typeof value!=='object'||Array.isArray(value))return value;
    let changed=false;const out={};
    for(const [key,next]of Object.entries(value)){const clean=cleanValue(path?path+'.'+key:key,next,effect,counter);if(clean===SKIP){changed=true;continue;}out[key]=clean;changed=changed||clean!==next;}
    return changed?(Object.keys(out).length?out:SKIP):value;
  }
  function withoutTiming(track,effect=false){
    if(!track)return track;const prior=cache.get(track);if(prior&&prior.effect===effect)return prior.track;
    const counter={count:0},segments=(track.segments||[]).map(segment=>{
      const next={...segment};let changed=false;
      for(const slot of ['values','from','to'])if(segment[slot]){const clean={};for(const [path,value]of Object.entries(segment[slot])){const v=cleanValue(path,value,effect,counter);if(v!==SKIP){if(!effect&&['effects','particle'].includes(path)){if(v&&typeof v==='object'&&!Array.isArray(v))for(const [key,child]of Object.entries(v))clean[path+'.'+key]=child;changed=true;}else clean[path]=v;}if(v!==value)changed=true;}if(changed)next[slot]=clean;}
      if(Array.isArray(segment.linearKeys)){next.linearKeys=segment.linearKeys.filter(path=>!blocked(path,effect));changed=changed||next.linearKeys.length!==segment.linearKeys.length;}
      return changed?next:segment;
    });
    const changed=segments.some((s,i)=>s!==track.segments[i]),result=changed?{...track,segments}:track;
    cache.set(track,{effect,track:result,count:counter.count});return result;
  }
  function stripSceneTiming(scene){
    if(!scene?.timeline?.tracks)return 0;let count=0;
    for(const [key,track]of Object.entries(scene.timeline.tracks)){const clean=withoutTiming(track,key.startsWith('effect:'));if(clean!==track){scene.timeline.tracks[key]=clean;count++;}}
    return count;
  }
  function restoreBase(out,base,effect=false){
    if(out===base)return out;
    if(effect?out.mask===base.mask:out.effects?.mask===base.effects?.mask&&out.particle?.emissionRange===base.particle?.emissionRange&&out.particle?.motionRange===base.particle?.motionRange)return out;
    const result={...out};
    function restore(target,original,key){if(original&&Object.hasOwn(original,key))target[key]=original[key];else delete target[key];}
    if(effect)restore(result,base,'mask');
    else{
      if(out.effects||base.effects){result.effects={...out.effects};restore(result.effects,base.effects,'mask');}
      if(out.particle||base.particle){result.particle={...out.particle};for(const key of ['emissionRange','motionRange'])restore(result.particle,base.particle,key);}
    }
    return result;
  }
  function references(value,result=new Set()){
    if(!value||typeof value!=='object')return result;
    if(value.type==='element'&&value.targetId)result.add(String(value.targetId));
    // Path instances/endpoints and particle sprites can also close a render cycle.
    if(value.sourceId)result.add(String(value.sourceId));
    for(const child of Object.values(value))if(child&&typeof child==='object')references(child,result);
    return result;
  }
  function validateReferences(scene,extraMasks=[]){
    const entities=scene.entities||[],byId=new Map(entities.map(e=>[e.id,e])),edges=new Map(entities.map(e=>[e.id,new Set()]));
    function mask(mask,label){if(mask?.type==='shapes')normalizeShapes(mask);if(mask?.type==='element'){const source=byId.get(mask.targetId);if(!source)throw Error(label+'引用了不存在的蒙版来源：'+mask.targetId);if(source.type==='particle-emitter')throw Error('粒子发射器不能作为蒙版来源');if(!['alpha','luma',undefined].includes(mask.mode))throw Error('蒙版提取方式无效');}}
    for(const entity of entities){mask(entity.effects?.mask,entity.id);mask(entity.particle?.emissionRange,entity.id);mask(entity.particle?.motionRange,entity.id);const deps=references({effects:entity.effects,parts:entity.parts,particle:entity.particle,extensions:entity.extensions});for(const id of deps)if(byId.has(id))edges.get(entity.id).add(id);if(entity.type==='group')for(const child of entities)if(child.parentId===entity.id)edges.get(entity.id).add(child.id);}
    for(const stage of ['overlay','sample'])for(const config of Object.values(scene.sceneEffects?.[stage]||{}))mask(config?.mask,'场景滤镜');for(const m of extraMasks)mask(m,'蒙版');
    const active=new Set(),done=new Set();function visit(id){if(active.has(id))throw Error('蒙版／对象渲染存在循环引用：'+[...active,id].join(' → '));if(done.has(id))return;active.add(id);for(const next of edges.get(id)||[])visit(next);active.delete(id);done.add(id);}for(const id of edges.keys())visit(id);
    return true;
  }
  api.modules.maskContract=Object.freeze({version:1,timing:'No',roots,geometryTypes,normalizeShapes,channel,containsGeometry,withoutTiming,restoreBase,stripSceneTiming,validateReferences,references});
})(typeof window!=='undefined'?window:globalThis);
