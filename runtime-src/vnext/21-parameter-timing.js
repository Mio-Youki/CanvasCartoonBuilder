/* Parameter capability gate. Uses the one Runtime Step/Linear evaluator. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,copy=v=>JSON.parse(JSON.stringify(v)),cache=new WeakMap();
  const modes=Object.freeze({No:'No',Step:'Step',Linear:'Linear',none:'No',step:'Step','linear-safe':'Linear',linear:'Linear'});
  function capability(param){
    const timing=modes[param.timing??'No'];if(!timing)throw Error('未知参数时序能力');
    if(timing==='Linear'&&(param.type!=='number'&&param.type!=='color'||param.integer))throw Error('该参数类型不能声明Linear');
    const interpolation=param.interpolation||(param.type==='color'?'color':'number');
    if(timing==='Linear'&&!['number','color','angle-direct'].includes(interpolation))throw Error('未知插值规则');
    if(timing==='Linear'&&(interpolation==='color')!==(param.type==='color'))throw Error('插值规则与参数类型不一致');
    return{timing,interpolation};
  }
  function filterTrack(track,parameters,options){
    const rules=new Map(parameters.map(p=>[p.path||p.key,capability(p)])),prefixes=options?.prefixes||[],strict=options?.strict!==false;
    const policy=key=>rules.get(key)||((strict||prefixes.some(p=>key.startsWith(p)))?{timing:'No'}:{timing:'Linear'});
    const segments=(track?.segments||[]).map(segment=>{
      const out={...segment};for(const key of ['values','from','to'])if(out[key])out[key]=Object.fromEntries(Object.entries(out[key]).filter(([path])=>policy(path).timing!=='No'));
      return out;
    });
    const keys=[...new Set(segments.flatMap(s=>['values','from','to'].flatMap(k=>Object.keys(s[k]||{}))))];
    for(const segment of segments)if(segment.type==='linear')segment.linearKeys=keys.filter(key=>policy(key).timing==='Linear'&&(!Array.isArray(segment.linearKeys)||segment.linearKeys.includes(key)));
    return{...track,segments};
  }
  function evaluate(base,track,rel,parameters){const filtered=filterTrack(track,parameters);return api.modules.timeline.applyValues(base,api.modules.timeline.segmentAt(filtered.segments,rel),rel,filtered.segments);}
  function threeSegments(base,target,armed,parameters,transition){
    const selected=new Set(armed),values={};
    for(const p of parameters)if(selected.has(p.key)&&capability(p).timing!=='No'&&Object.hasOwn(target,p.key))values[p.key]=copy(target[p.key]);
    const linearKeys=parameters.filter(p=>capability(p).timing==='Linear').map(p=>p.key);
    return{segments:[{f:[0,1/3],type:'step',values:{}},transition?{f:[1/3,2/3],type:'linear',linearKeys}:{f:[1/3,2/3],type:'step',values:{}},{f:[2/3,1],type:'step',values}]};
  }
  function forRecipes(base,track){
    if(!track||!base.recipe?.definition&&!(base.parts||[]).some(part=>part.recipe?.definition))return track;
    if(!track?.segments?.some(s=>['values','from','to'].some(k=>Object.keys(s[k]||{}).some(key=>key.startsWith('recipe.params.')||key.includes('.recipe.params.')))))return track;
    const providers=[base,...base.parts||[]].filter(part=>part.recipe?.definition),sign=providers.flatMap(part=>[part.id,part.recipe.definition,part===base?-1:base.parts.indexOf(part)]),prior=cache.get(track);
    if(prior&&sign.length===prior.signature.length&&sign.every((value,i)=>value===prior.signature[i]))return prior.track;
    const parameters=[],prefixes=[];
    for(const part of providers){
      const prefix=part===base?'recipe.params.':'partsById.'+encodeURIComponent(part.id).replace(/\./g,'%2E')+'.recipe.params.';
      prefixes.push(prefix);
      for(const param of part.recipe.definition.parameters)parameters.push({...param,path:prefix+param.key});
      if(part!==base){const indexPrefix='parts.'+base.parts.indexOf(part)+'.recipe.params.';prefixes.push(indexPrefix);for(const param of part.recipe.definition.parameters)parameters.push({...param,path:indexPrefix+param.key});}
    }
    if(!prefixes.length)return track;
    const filtered=filterTrack(track,parameters,{strict:false,prefixes});cache.set(track,{signature:sign,track:filtered});return filtered;
  }
  const attachedCache=new WeakMap(),programCache=new WeakMap(),particleCache=new WeakMap();
  function forProgram(base,track,scene){
    if(!track||!['builtin','procedural'].includes(base.type))return track;
    let definition,parameters,prefix;
    try{if(base.type==='builtin'){definition=api.modules.builtins.definition(base.builtin.id,base.builtin.version);parameters=definition.params;prefix='builtin.params.';}else{definition=api.modules.sceneModules.definition(base.moduleId,base.moduleVersion,{scope:scene?.moduleScope||scene?._moduleScope});parameters=definition.manifest.parameters||definition.manifest.params||[];prefix='params.';}}catch{return track;}
    const prior=programCache.get(track);if(prior?.definition===definition&&prior.prefix===prefix)return prior.track;
    const result=filterTrack(track,parameters.map(p=>({...p,path:prefix+p.key})),{strict:false,prefixes:[prefix]});programCache.set(track,{definition,prefix,track:result});return result;
  }
  function forEntity(base,track,scene){
    if(base.type==='particle-emitter'&&track){
      if(!particleCache.has(track)){const keys=['particle.mode','particle.cellSize','particle.startTime','particle.sourceId','particle.layerEmission','particle.fragmentShape','particle.sampleTime','particle.sourceFps','particle.showSource'];particleCache.set(track,filterTrack(track,keys.map(key=>({key,type:'number',timing:'No'})),{strict:false,prefixes:keys}));}track=particleCache.get(track);
    }
    const filtered=forRecipes(base,forProgram(base,track,scene));if(!filtered)return filtered;
    const bindings=[];for(const part of [base,...base.parts||[]])for(const id of part.extensions?.attached||[]){const config=part.extensions[id];if(config?.definition?.format==='tosampool-pattern-generator/v1')bindings.push({part,id,definition:config.definition});}
    if(!bindings.length)return filtered;const signature=bindings.flatMap(b=>[b.part.id,b.id,b.definition,b.part===base?-1:base.parts.indexOf(b.part)]),prior=attachedCache.get(filtered);
    if(prior&&signature.length===prior.signature.length&&signature.every((v,i)=>v===prior.signature[i]))return prior.track;
    const parameters=[],prefixes=[];for(const {part,id,definition}of bindings){const group='extensionsById.'+encodeURIComponent(id).replace(/\./g,'%2E')+'.',roots=part===base?['']:[`partsById.${encodeURIComponent(part.id).replace(/\./g,'%2E')}.`,`parts.${base.parts.indexOf(part)}.`];for(const root of roots){parameters.push({key:root+group+'enabled',type:'boolean',timing:'Step'});prefixes.push(root+group+'params.');for(const p of definition.parameters)parameters.push({...p,path:root+group+'params.'+p.key});}}
    const result=filterTrack(filtered,parameters,{strict:false,prefixes});attachedCache.set(filtered,{signature,track:result});return result;
  }
  api.modules.parameterTiming=Object.freeze({capability,filterTrack,evaluate,threeSegments,forEntity});
})(typeof window!=='undefined'?window:globalThis);
