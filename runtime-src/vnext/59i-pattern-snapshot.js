/* Portable static outlines. A snapshot is data, never a generator or executable code. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,FORMAT='tosampool-pattern-geometry/v1';
  const limits=Object.freeze({paths:1024,points:8192,coordinate:1000000,parameterBytes:65536});
  const checked=new WeakSet(),rendered=new WeakMap();
  function ordered(value,depth){
    if(depth>24)throw Error('图样快照参数嵌套过深');
    if(value===null||['string','boolean'].includes(typeof value))return value;
    if(typeof value==='number'&&Number.isFinite(value))return value;
    if(Array.isArray(value))return value.map(item=>ordered(item,depth+1));
    if(value&&typeof value==='object'){
      const result={};for(const key of Object.keys(value).sort()){
        if(['__proto__','prototype','constructor'].includes(key))throw Error('图样快照包含不安全字段');
        if(value[key]!==undefined)result[key]=ordered(value[key],depth+1);
      }return result;
    }throw Error('图样快照只接受有限JSON数据');
  }
  function binding(recipe,width){
    if(!recipe||typeof recipe.id!=='string'||!recipe.id||!Number.isInteger(recipe.version)||recipe.version<1||recipe.params!=null&&(typeof recipe.params!=='object'||Array.isArray(recipe.params)))throw Error('图样快照缺少有效配方身份');
    const result=JSON.stringify(ordered({recipe:{id:recipe.id,version:recipe.version,params:recipe.params||{},...(recipe.providerKey?{providerKey:recipe.providerKey}:{})},strokeWidth:Math.max(0,Number.isFinite(+width)?+width:3)},0));
    if(result.length>limits.parameterBytes)throw Error('图样快照参数超出预算');return result;
  }
  function normalize(raw,recipe,width){
    const expected=binding(recipe,width);
    if(raw?.format!==FORMAT||raw.binding!==expected)throw Error('图样快照与配方／粗细不匹配');
    if(checked.has(raw))return raw;
    if(!Array.isArray(raw.paths)||raw.paths.length>limits.paths)throw Error('图样快照路径超出预算');
    let count=0;
    const paths=raw.paths.map(path=>{
      if(!Array.isArray(path)||path.length<3)throw Error('图样快照轮廓无效');
      count+=path.length;if(count>limits.points)throw Error('图样快照点数超出预算');
      return Object.freeze(path.map(point=>{
        if(!Array.isArray(point)||point.length!==2||point.some(n=>typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>limits.coordinate))throw Error('图样快照坐标无效');
        return Object.freeze(point.slice());
      }));
    });
    const paintPlan=raw.paintPlan?api.modules.patternGenerators.restorePlan(raw.paintPlan):null;
    if(paintPlan&&(paintPlan.id!==recipe.id||paintPlan.version!==recipe.version))throw Error('绘制快照身份不匹配');
    const result=Object.freeze({format:FORMAT,binding:expected,paths:Object.freeze(paths),...(paintPlan?{paintPlan}:{})});checked.add(result);return result;
  }
  function capture(part){
    const shapes=api.modules.customShapes;
    if(!shapes.supports(part.recipe))return normalize(part.geometrySnapshot,part.recipe,part.strokeWidth);
    const recipe=shapes.normalizeRecipe(part.recipe),result=shapes.custom(part);
    if(result.status)throw Error('图样几何未成功生成：'+result.status);
    const x=Number.isFinite(+part.x)?+part.x:0,y=Number.isFinite(+part.y)?+part.y:0,w=Math.max(1,+part.w||1),h=Math.max(1,+part.h||1);
    const paths=result.paths.map(path=>(path.outline||[]).map(point=>[(point[0]-x)/w,(point[1]-y)/h]));
    return normalize({format:FORMAT,binding:binding(recipe,part.strokeWidth),paths,...(result.paintPlan?{paintPlan:result.paintPlan}:{})},recipe,part.strokeWidth);
  }
  function render(part){
    const snapshot=normalize(part.geometrySnapshot,part.recipe,part.strokeWidth),x=+part.x||0,y=+part.y||0,w=Math.max(1,+part.w||1),h=Math.max(1,+part.h||1);
    const alpha=part.stroke===null?0:Math.max(0,Math.min(1,part.strokeAlpha==null?1:+part.strokeAlpha||0));
    const key=JSON.stringify([x,y,w,h,part.stroke,alpha,part.strokeWidth]),cached=rendered.get(snapshot);
    if(cached?.key===key)return cached.result;
    const result={snapshot:true,status:'生成器不可用，保留几何缓存',settings:{width:Math.max(0,part.strokeWidth==null?3:+part.strokeWidth||0)||(snapshot.paths.length?1:0),color:part.stroke||'#ffd23f',alpha},
      ...(snapshot.paintPlan?{paintPlan:snapshot.paintPlan,paintTransform:{x,y,sx:w/snapshot.paintPlan.bounds.w,sy:h/snapshot.paintPlan.bounds.h}}:{}),
      paths:snapshot.paths.map(outline=>({closed:true,points:[],outline:outline.map(p=>[x+p[0]*w,y+p[1]*h])}))};
    rendered.set(snapshot,{key,result});return result;
  }
  function prepareScene(scene){
    for(const entity of scene.entities||[])for(const part of entity.parts||[])if(part.type==='custom'){
      if(api.modules.customShapes.supports(part.recipe))part.recipe=api.modules.customShapes.normalizeRecipe(part.recipe);
      part.geometrySnapshot=capture(part);
    }
    for(const preset of Object.values(scene.patternResources||{})){
      if(preset.mode==='path')continue; // Path recipes are source declarations, not custom-outline snapshots.
      const part={type:'custom',x:0,y:0,w:160,h:100,strokeWidth:preset.style?.width??3,recipe:{id:preset.engineId,version:preset.engineVersion,params:preset.params||{},...(preset.definition?{definition:preset.definition}:{}),...(preset.providerKey?{providerKey:preset.providerKey}:{})},geometrySnapshot:preset.geometrySnapshot};
      preset.geometrySnapshot=capture(part);
    }
    return scene;
  }
  api.modules.patternSnapshots=Object.freeze({FORMAT,limits,binding,normalize,capture,render,prepareScene});
})(typeof window!=='undefined'?window:globalThis);
