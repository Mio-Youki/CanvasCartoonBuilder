/* Bounded declarative path templates. No code, expressions, global installs or I/O. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,FORMAT='tosampool-pattern-definition/v1';
  const limits=Object.freeze({parameters:24,paths:32,designPoints:512,points:8192,entries:32,cachePoints:65536,coordinateSpan:64});
  const known=new WeakMap(),cache=new Map();let cachedPoints=0;
  const reserved=new Set(['corner-arrows','brackets']);
  const identifier=value=>typeof value==='string'&&/^[a-z][a-z0-9._-]{0,95}$/i.test(value)&&!['__proto__','constructor','prototype'].includes(value);
  function object(value){return value&&typeof value==='object'&&!Array.isArray(value);}
  function fields(value,allowed,label){if(!object(value)||Object.keys(value).some(key=>!allowed.includes(key)))throw Error(label+'包含未支持字段');}
  function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>1000000)throw Error(label+'必须是预算内有限数值');return value;}
  function canonical(value){if(Array.isArray(value))return value.map(canonical);if(object(value))return Object.fromEntries(Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>[key,canonical(value[key])]));return value;}
  function deepFreeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;}
  function normalizeParam(param,value){
    if(param.type==='color')return /^#[\da-f]{6}$/i.test(value||'')?value:param.default;
    if(param.type==='boolean')return typeof value==='boolean'?value:param.default;
    if(param.type==='select')return param.options.includes(value)?value:param.default;
    let number=Number.isFinite(+value)&&value!==null&&value!==''?+value:param.default;
    if(param.integer)number=Math.round(number);
    return Math.max(param.min??-1000000,Math.min(param.max??1000000,number));
  }
  function validate(raw){
    if(known.has(raw))return known.get(raw);
    if(raw?.format===api.modules.patternGenerators?.FORMAT){const definition=api.modules.patternGenerators.validateDefinition(raw),record=Object.freeze({definition,key:JSON.stringify(canonical(definition))});known.set(definition,record);return record;}
    fields(raw,['format','id','version','name','parameters','paths'],'图样定义');
    if(raw.format!==FORMAT||!identifier(raw.id)||reserved.has(raw.id)||!Number.isInteger(raw.version)||raw.version<1)throw Error('图样定义身份无效或占用原生ID');
    if(typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>100)throw Error('图样定义缺少名称');
    if(!Array.isArray(raw.parameters)||raw.parameters.length>limits.parameters||!Array.isArray(raw.paths)||!raw.paths.length||raw.paths.length>limits.paths)throw Error('图样定义声明超出预算');
    const names=new Map(),used=new Set();
    const parameters=raw.parameters.map(input=>{
      fields(input,['key','label','type','default','min','max','step','integer','options','timing','interpolation'],'图样参数');
      if(!identifier(input.key)||input.key.includes('.')||names.has(input.key)||!['number','boolean','select'].includes(input.type)||typeof input.label!=='string'||!input.label||input.label.length>80)throw Error('图样参数身份／类型无效');
      const p={key:input.key,label:input.label,type:input.type,default:input.default};
      if(input.timing!=null){const capability=api.modules.parameterTiming?.capability(input);if(!capability)throw Error('当前Runtime不支持参数时序声明');p.timing=capability.timing;if(input.interpolation)p.interpolation=capability.interpolation;}
      else if(input.interpolation!=null)throw Error('插值规则需要显式时序声明');
      if(p.type==='boolean'&&['min','max','step','integer','options'].some(k=>input[k]!==undefined)||p.type==='select'&&['min','max','step','integer'].some(k=>input[k]!==undefined)||p.type==='number'&&input.options!==undefined)throw Error('图样参数包含不适用的设置');
      if(p.type==='number'){
        finite(p.default,'参数默认值');for(const key of ['min','max','step'])if(input[key]!=null)p[key]=finite(input[key],key);
        p.integer=!!input.integer;if((p.min??-Infinity)>(p.max??Infinity)||p.step!=null&&p.step<=0||p.integer&&p.default!==Math.round(p.default)||normalizeParam(p,p.default)!==p.default)throw Error('图样参数范围无效');
      }else if(p.type==='boolean'){if(typeof p.default!=='boolean')throw Error('图样开关默认值无效');}
      else{if(!Array.isArray(input.options)||!input.options.length||input.options.length>16||input.options.some(v=>typeof v!=='string'||!v||v.length>80)||new Set(input.options).size!==input.options.length||!input.options.includes(p.default))throw Error('图样选项无效');p.options=input.options.slice();}
      names.set(p.key,p);return p;
    });
    function coordinate(value){
      if(typeof value==='number')return finite(value,'路径坐标');
      fields(value,['constant','w','h','params'],'路径坐标');
      const result={};for(const key of ['constant','w','h'])if(value[key]!=null)result[key]=finite(value[key],'坐标系数');
      if(value.params!=null){if(!object(value.params)||Object.keys(value.params).length>8)throw Error('坐标参数项超出预算');result.params={};for(const [key,n]of Object.entries(value.params)){if(names.get(key)?.type!=='number')throw Error('坐标引用未声明数值参数：'+key);result.params[key]=finite(n,'参数系数');if(n!==0)used.add(key);}}
      return result;
    }
    let points=0;
    const paths=raw.paths.map(path=>{
      fields(path,['points','mode','mirror','radius','when'],'模板路径');
      const mode=path.mode||'stroke',mirror=path.mirror||'none';
      if(!['stroke','fill'].includes(mode)||!['none','x','y','xy'].includes(mirror)||!Array.isArray(path.points)||path.points.length<(mode==='fill'?3:2))throw Error('模板路径类型／点数无效');
      points+=path.points.length;if(points>limits.designPoints)throw Error('模板设计点数超出预算');
      const result={mode,mirror,radius:coordinate(path.radius??0),points:path.points.map(point=>{if(!Array.isArray(point)||point.length!==2)throw Error('模板路径点必须是二维');return point.map(coordinate);})};
      if(path.when){fields(path.when,['key','equals'],'路径条件');const p=names.get(path.when.key);if(!p||normalizeParam(p,path.when.equals)!==path.when.equals)throw Error('路径条件引用无效');used.add(p.key);result.when={key:p.key,equals:path.when.equals};}
      return result;
    });
    if(parameters.some(param=>!used.has(param.key)))throw Error('图样声明了未被路径引用的参数');
    const definition=deepFreeze({format:FORMAT,id:raw.id,version:raw.version,name:raw.name,parameters,paths});
    const key=JSON.stringify(canonical(definition));if(key.length>32768)throw Error('图样定义超出32KB预算');
    const record=Object.freeze({definition,key});known.set(definition,record);return record;
  }
  function normalizeRecipe(recipe){
    const {definition,key}=validate(recipe.definition);
    if(recipe.id!==definition.id||recipe.version!==definition.version||recipe.providerKey!=null&&recipe.providerKey!==key)throw Error('图样配方与定义身份／内容不匹配');
    if(recipe.params!=null&&!object(recipe.params))throw Error('图样params必须是对象');
    const params={};for(const param of definition.parameters)params[param.key]=normalizeParam(param,recipe.params?.[param.key]);
    return{id:definition.id,version:definition.version,params,definition,providerKey:key};
  }
  function build(part,time){
    const recipe=normalizeRecipe(part.recipe),definition=recipe.definition;
    if(definition.format===api.modules.patternGenerators?.FORMAT){
      const box={x:+part.x||0,y:+part.y||0,w:Math.max(1,+part.w||1),h:Math.max(1,+part.h||1)},carrier=api.modules.patternGenerators.carrierFor(definition,recipe.params,part,box),geometry=api.modules.pathGeometry.full(carrier,box),path=geometry.stroke;
      const paintPlan=api.modules.patternGenerators.generateDefinition(definition,{carrierType:carrier.type,path,bounds:box,params:recipe.params,time:time||0,seed:1});
      return{paths:[{kind:'generator',closed:true,points:[],outline:path}],settings:{width:1,color:'#ffffff',alpha:1},status:'',provider:true,paintPlan};
    }
    const x=+part.x||0,y=+part.y||0,w=Math.max(1,+part.w||1),h=Math.max(1,+part.h||1),width=Math.max(0,part.strokeWidth==null?3:+part.strokeWidth||0),color=part.stroke||'#ffd23f',alpha=part.stroke===null?0:Math.max(0,Math.min(1,part.strokeAlpha??1));
    const key=JSON.stringify([recipe.providerKey,recipe.params,x,y,w,h,width,color,alpha]);
    if(cache.has(key)){const result=cache.get(key);cache.delete(key);cache.set(key,result);return result;}
    function evaluate(value){let n=value;if(typeof value!=='number'){n=(value.constant||0)+(value.w||0)*w+(value.h||0)*h;for(const [key,factor]of Object.entries(value.params||{}))n+=recipe.params[key]*factor;}if(!Number.isFinite(n)||Math.abs(n)>Math.min(10000000,limits.coordinateSpan*Math.max(w,h)))throw Error('模板生成坐标超出预算');return n;}
    const paths=[];let points=0;
    for(const path of definition.paths){
      if(path.when&&recipe.params[path.when.key]!==path.when.equals)continue;
      const source=path.points.map(p=>p.map(evaluate)).filter((p,i,all)=>!i||Math.hypot(p[0]-all[i-1][0],p[1]-all[i-1][1])>1e-8);
      if(source.length<(path.mode==='fill'?3:2)||path.mode==='stroke'&&!width)continue;
      const outline=api.modules.customShapes.finishOutline(path.mode==='fill'?source:api.modules.customShapes.strokeOutline(source,width),Math.max(0,evaluate(path.radius)));
      if(path.mode==='fill'){let area=0;outline.forEach((p,i)=>{const q=outline[(i+1)%outline.length];area+=p[0]*q[1]-q[0]*p[1];});if(Math.abs(area)<1e-8)continue;}
      const mirrors=path.mirror==='xy'?[[1,1],[-1,1],[1,-1],[-1,-1]]:path.mirror==='x'?[[1,1],[-1,1]]:path.mirror==='y'?[[1,1],[1,-1]]:[[1,1]];
      for(const [sx,sy]of mirrors){const polygon=outline.map(p=>[x+(sx===1?p[0]:w-p[0]),y+(sy===1?p[1]:h-p[1])]);if(sx*sy<0)polygon.reverse();points+=polygon.length;if(points>limits.points)throw Error('模板派生点数超出预算');paths.push({kind:'template',closed:true,points:[],outline:polygon});}
    }
    const result={paths,settings:{width:width||1,color,alpha},status:'',points,provider:true};cache.set(key,result);cachedPoints+=points;
    while(cache.size>limits.entries||cachedPoints>limits.cachePoints){const first=cache.keys().next().value;cachedPoints-=cache.get(first).points;cache.delete(first);}
    return result;
  }
  function validateScene(scene){
    const definitions=scene.patternDefinitions||{};
    const seen=new Map();
    for(const [id,raw]of Object.entries(definitions)){const {definition,key}=validate(raw);if(id!==definition.id+'@'+definition.version)throw Error('工程图样注册键不匹配');seen.set(id,key);}
    for(const e of scene.entities||[])for(const p of e.parts||[])if(p.recipe?.definition||p.recipe?.providerKey){const key=p.recipe.definition?validate(p.recipe.definition).key:p.recipe.providerKey,id=p.recipe.id+'@'+p.recipe.version;if(seen.has(id)&&seen.get(id)!==key)throw Error('工程内同身份图样定义冲突');seen.set(id,key);}
    return scene;
  }
  api.modules.patternProviders=Object.freeze({FORMAT,limits,validate,normalizeParam,normalizeRecipe,build,validateScene,stats:()=>({entries:cache.size,points:cachedPoints})});
})(typeof window!=='undefined'?window:globalThis);
