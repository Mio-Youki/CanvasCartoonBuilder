/* Host-reviewed generators produce bounded paint plans. Registration is NOT a JS sandbox. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,records=new Map(),implementations=new Map(),resolved=new WeakMap(),plans=new WeakSet();
  const FORMAT='tosampool-pattern-generator/v1';
  const limits=Object.freeze({parameters:24,carrierPoints:8192,layers:256,commands:4096,number:1000000});
  const identifier=v=>typeof v==='string'&&/^[a-z][a-z0-9._-]{0,95}$/i.test(v)&&!['constructor','prototype','__proto__'].includes(v);
  const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const color=v=>typeof v==='string'&&/^#[a-f0-9]{6}$/i.test(v);
  const copy=v=>JSON.parse(JSON.stringify(v));
  function number(v,label){if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>limits.number)throw Error(label+'必须是预算内有限数');return v;}
  function fields(v,keys,label){if(!object(v)||Object.keys(v).some(k=>!keys.includes(k)))throw Error(label+'包含未支持字段');}
  function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
  function normalizeParam(p,v){
    if(p.type==='color')return color(v)?v:p.default;
    if(p.type==='boolean')return typeof v==='boolean'?v:p.default;
    if(p.type==='select')return p.options.includes(v)?v:p.default;
    let n=typeof v==='number'&&Number.isFinite(v)?v:p.default;
    if(p.integer)n=Math.round(n);return Math.max(p.min,Math.min(p.max,n));
  }
  function validate(raw){
    fields(raw,['format','id','version','name','implementation','carriers','parameters','controls','output','dependencies','budget'],'生成器声明');
    if(raw.format!==FORMAT||!identifier(raw.id)||!Number.isInteger(raw.version)||raw.version<1||!identifier(raw.implementation)||typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>100)throw Error('生成器身份无效');
    if(raw.output!=='carrier-clipped-paint'||!Array.isArray(raw.dependencies)||raw.dependencies.length)throw Error('本版仅支持无依赖的载体裁切绘制');
    if(!Array.isArray(raw.carriers)||!raw.carriers.length||new Set(raw.carriers).size!==raw.carriers.length||raw.carriers.some(v=>!['rect','ellipse','poly'].includes(v)))throw Error('生成器载体无效');
    if(!Array.isArray(raw.parameters)||raw.parameters.length>limits.parameters)throw Error('参数超出预算');
    const keys=new Set(),parameters=raw.parameters.map(input=>{
      fields(input,['key','label','type','default','min','max','step','integer','options','labels','timing','interpolation','when'],'生成器参数');
      if(!identifier(input.key)||input.key.includes('.')||keys.has(input.key)||typeof input.label!=='string'||!input.label||input.label.length>80||!['number','color','boolean','select'].includes(input.type)||!['No','Step','Linear'].includes(input.timing))throw Error('生成器参数声明无效');
      api.modules.parameterTiming.capability(input);
      const p=copy(input);keys.add(p.key);
      if(p.type==='number'){
        number(p.min,'最小值');number(p.max,'最大值');number(p.default,'默认值');
        if(p.min>p.max||p.step!=null&&number(p.step,'步长')<=0||p.integer!=null&&typeof p.integer!=='boolean'||p.options!==undefined)throw Error('参数范围无效');
      }else{
        if(['min','max','step','integer'].some(k=>p[k]!==undefined))throw Error('非数值参数不能声明数值范围');
        if(p.type==='select'){
          if(!Array.isArray(p.options)||!p.options.length||p.options.length>32||new Set(p.options).size!==p.options.length||p.options.some(v=>typeof v!=='string'||!v||v.length>80)||!p.options.includes(p.default))throw Error('参数选项无效');
        }else if(p.options!==undefined)throw Error('非选择参数不能声明选项');
        if(p.type==='color'&&!color(p.default)||p.type==='boolean'&&typeof p.default!=='boolean')throw Error('参数默认值无效');
      }
      if(normalizeParam(p,p.default)!==p.default)throw Error('参数默认值超出范围');
      if(p.labels!==undefined&&(p.type!=='select'||!Array.isArray(p.labels)||p.labels.length!==p.options.length||p.labels.some(v=>typeof v!=='string'||!v||v.length>80)))throw Error('参数选项名称无效');
      return p;
    });
    for(const p of parameters)if(p.when!=null&&(!keys.has(p.when)||parameters.find(v=>v.key===p.when).type!=='boolean'||p.when===p.key))throw Error('渐进参数需要引用开关');
    for(const p of parameters){const seen=new Set([p.key]);let next=p.when;while(next){if(seen.has(next))throw Error('渐进开关不可循环引用');seen.add(next);next=parameters.find(v=>v.key===next).when;}}
    const byKey=new Map(parameters.map(p=>[p.key,p])),claimed=new Set();
    if(!Array.isArray(raw.controls)||raw.controls.length>limits.parameters)throw Error('控件声明无效');
    const controls=raw.controls.map(c=>{
      fields(c,['component','key','alphaKey'],'组件绑定');
      const p=byKey.get(c.key);if(!p||claimed.has(c.key)||!['field','color-alpha'].includes(c.component))throw Error('组件绑定重复或无效');
      claimed.add(c.key);
      if(c.component==='color-alpha'){
        const a=byKey.get(c.alphaKey);
        if(p.type!=='color'||!a||a.type!=='number'||a.min!==0||a.max!==1||a.when!==p.when||claimed.has(a.key))throw Error('颜色组件必须绑定唯一的0–1透明度');
        claimed.add(a.key);
      }else if(c.alphaKey!==undefined||p.type==='color')throw Error('颜色需要共用颜色／透明度组件');
      return copy(c);
    });
    if(claimed.size!==keys.size)throw Error('参数未绑定组件');
    fields(raw.budget,['layers','commands'],'生成器预算');
    for(const k of ['layers','commands'])if(!Number.isInteger(raw.budget[k])||raw.budget[k]<1||raw.budget[k]>limits[k])throw Error('生成器预算无效');
    return freeze({...copy(raw),parameters,controls});
  }
  function register(manifest,generate,options){
    if(options?.trust!=='repository-reviewed')throw Error('生成器仅允许宿主登记已审阅实现');
    const m=validate(manifest),key=m.id+'@'+m.version;
    if(typeof generate!=='function'||records.has(key))throw Error('生成器实现缺失或身份重复');
    const implementationKey=m.id+':'+m.implementation;
    if(implementations.has(implementationKey))throw Error('生成器实现标识重复');
    const carrier=typeof options.carrier==='function'?options.carrier:null,source=String(generate)+'\n'+String(carrier);let hash=2166136261;for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619);}
    const record=Object.freeze({manifest:m,generate,carrier,fingerprint:(hash>>>0).toString(16)});records.set(key,record);implementations.set(implementationKey,record);return m;
  }
  function definition(id,version){const r=records.get(id+'@'+version);if(!r)throw Error('生成器未登记：'+id+'@'+version);return r.manifest;}
  function normalize(id,version,input){return Object.fromEntries(definition(id,version).parameters.map(p=>[p.key,normalizeParam(p,input?.[p.key])]));}
  function resolveDefinition(raw){
    if(resolved.has(raw))return resolved.get(raw);
    const m=validate(raw),r=implementations.get(m.id+':'+m.implementation);if(!r)throw Error('生成器实现未登记');
    // Metadata/default revisions may differ per document, never code or parameter semantics.
    const ordered=v=>Array.isArray(v)?v.map(ordered):object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])])):v;
    const signature=v=>JSON.stringify(ordered({...v,version:0,name:'',parameters:v.parameters.map(p=>({...p,label:'',default:null}))}));
    if(signature(m)!==signature(r.manifest))throw Error('生成器声明与已审阅实现不匹配');
    const result={manifest:m,record:r};resolved.set(m,result);return result;
  }
  function generateUsing(r,m,input){
    if(!object(input)||!m.carriers.includes(input.carrierType)||!Array.isArray(input.path)||input.path.length<3||input.path.length>limits.carrierPoints)throw Error('生成器需要有效的封闭载体路径');
    const path=input.path.map(p=>{if(!Array.isArray(p)||p.length!==2)throw Error('载体路径点无效');return [number(p[0],'路径X'),number(p[1],'路径Y')];});
    fields(input.bounds,['x','y','w','h'],'载体范围');const bounds={};for(const k of ['x','y','w','h'])bounds[k]=number(input.bounds[k],'载体范围');
    if(bounds.w<=0||bounds.h<=0||path.some(p=>p[0]<bounds.x-1e-7||p[0]>bounds.x+bounds.w+1e-7||p[1]<bounds.y-1e-7||p[1]>bounds.y+bounds.h+1e-7))throw Error('载体路径超出范围');
    const time=number(input.time??0,'时间'),seed=number(input.seed??1,'随机种子');
    const request=freeze({carrierType:input.carrierType,path,bounds,params:Object.fromEntries(m.parameters.map(p=>[p.key,normalizeParam(p,input.params?.[p.key])])),time,seed});
    const result=r.generate(request);
    return validatePlan({id:m.id,version:m.version,path,bounds,layers:result?.layers},m.budget,result);
  }
  function validatePlan(raw,budget,result){
    fields(result||{layers:raw.layers},['layers'],'生成器输出');
    const {id,version}=raw;
    if(!identifier(id)||!Number.isInteger(version)||version<1)throw Error('绘制计划身份无效');
    if(!Array.isArray(raw.path)||raw.path.length<3||raw.path.length>limits.carrierPoints)throw Error('绘制计划载体无效');
    const path=raw.path.map(p=>{if(!Array.isArray(p)||p.length!==2)throw Error('绘制计划路径无效');return p.map(v=>number(v,'路径坐标'));});
    fields(raw.bounds,['x','y','w','h'],'绘制计划范围');const bounds={};for(const k of ['x','y','w','h'])bounds[k]=number(raw.bounds[k],'范围');
    if(bounds.w<=0||bounds.h<=0||path.some(p=>p[0]<bounds.x-1e-7||p[0]>bounds.x+bounds.w+1e-7||p[1]<bounds.y-1e-7||p[1]>bounds.y+bounds.h+1e-7))throw Error('绘制计划范围无效');
    result=result||{layers:raw.layers};
    if(!Array.isArray(result.layers)||result.layers.length>budget.layers)throw Error('绘制层数超出预算');
    let count=0;
    const layers=result.layers.map((layer,index)=>{
      fields(layer,['color','alpha','commands','fillCarrier'],'绘制层');
      if(!color(layer.color)||typeof layer.alpha!=='number'||!Number.isFinite(layer.alpha)||layer.alpha<0||layer.alpha>1)throw Error('绘制层无效');
      // A single first-layer carrier fill reuses the separately bounded clip path.
      // Do not duplicate thousands of ellipse vertices in every generated plan.
      if(layer.fillCarrier===true){if(index!==0||layer.commands!==undefined)throw Error('载体底色只允许首层');return{color:layer.color,alpha:layer.alpha,fillCarrier:true};}
      if(layer.fillCarrier!==undefined||!Array.isArray(layer.commands)||!layer.commands.length)throw Error('绘制层无效');
      const commands=layer.commands.map(c=>{
        if(!Array.isArray(c)||!['M','L','A','Z'].includes(c[0])||c.length!==({M:3,L:3,A:6,Z:1})[c[0]])throw Error('绘制指令无效');
        if(++count>budget.commands)throw Error('绘制指令超出预算');
        c.slice(1).forEach(v=>number(v,'绘制坐标'));if(c[0]==='A'&&c[3]<0)throw Error('圆弧半径无效');
        return c.slice();
      });
      if(commands[0][0]!=='M')throw Error('绘制路径缺少起点');
      return {color:layer.color,alpha:layer.alpha,commands};
    });
    const value=freeze({format:FORMAT,id,version,path,bounds,layers,commands:count});plans.add(value);return value;
  }
  function generate(id,version,input){const r=records.get(id+'@'+version);if(!r)throw Error('生成器未登记');return generateUsing(r,r.manifest,input);}
  function generateDefinition(raw,input){const {record,manifest}=resolveDefinition(raw);return generateUsing(record,manifest,input);}
  function carrierFor(raw,params,part,box){const {record,manifest}=resolveDefinition(raw);return record.carrier?record.carrier(params,box,part):{...part,...box,type:manifest.carriers[0]};}
  function restorePlan(raw){fields(raw,['format','id','version','path','bounds','layers','commands'],'静态绘制计划');if(raw.format!==FORMAT)throw Error('静态绘制计划格式无效');return validatePlan(raw,limits);}
  function paint(ctx,value){
    if(!plans.has(value))throw Error('未验证的生成器绘制计划');
    ctx.save();try{
      ctx.beginPath();value.path.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.clip();
      const alpha=ctx.globalAlpha;
      for(const layer of value.layers){
        ctx.beginPath();if(layer.fillCarrier){value.path.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();}
        else for(const c of layer.commands){if(c[0]==='M')ctx.moveTo(c[1],c[2]);else if(c[0]==='L')ctx.lineTo(c[1],c[2]);else if(c[0]==='A')ctx.arc(c[1],c[2],c[3],c[4],c[5]);else ctx.closePath();}
        ctx.fillStyle=layer.color;ctx.globalAlpha=alpha*layer.alpha;ctx.fill();
      }
    }finally{ctx.restore();}
  }
  api.modules.patternGenerators=Object.freeze({FORMAT,limits,validate,register,definition,manifests:()=>Array.from(records.values(),r=>r.manifest),normalize,generate,generateDefinition,carrierFor,implementationFingerprint:raw=>resolveDefinition(raw).record.fingerprint,validateDefinition:raw=>resolveDefinition(raw).manifest,restorePlan,paint});
})(typeof window!=='undefined'?window:globalThis);
