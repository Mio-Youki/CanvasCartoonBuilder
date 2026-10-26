/* Path recipes reuse patternResources and the authored element dependency closure. */
(function(global){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value)),engines=['ticks','nested','elements','corner-arrows','brackets'];
  function registry(){if(!global.EditorV4PatternRegistry)throw Error('当前Host缺少路径图样登记');return global.EditorV4PatternRegistry;}
  function elements(){if(!global.EditorV4ElementPresets)throw Error('当前Host缺少元素引用闭包');return global.EditorV4ElementPresets;}
  function carrier(id){const result=registry().carriers.find(c=>c.id===id);if(!result)throw Error('路径图样载体无效');return result;}
  function fromGeneratorPreset(input){
    if(input?.definition?.format!=='tosampool-pattern-generator/v1')return null;
    return normalize({mode:'path',name:input.name||input.definition.name,engineId:input.engineId,engineVersion:input.engineVersion,carrier:input.carrier||input.params?.carrier||'rect',params:input.params||{},definition:input.definition});
  }
  function restoreCarrier(part){
    const modules=global.ToSampoolRuntimeVNext.modules,recipe=part.recipe;if(part.type!=='custom'||recipe?.definition?.format!=='tosampool-pattern-generator/v1')return false;
    const source=modules.patternGenerators.carrierFor(recipe.definition,recipe.params||{},part,{x:part.x,y:part.y,w:part.w,h:part.h});
    part.type=source.type;if(source.points)part.points=copy(source.points);if(source.polygonMode)part.polygonMode=source.polygonMode;if(source.sides)part.sides=source.sides;if(source.radius)part.radius=source.radius;
    part.fill=null;part.stroke=null;delete part.recipe;delete part.geometrySnapshot;return true;
  }
  function normalize(input){
    const generated=global.ToSampoolRuntimeVNext.modules.pathGenerators,engine=generated?.definition(input?.engineId);
    if(input?.mode==='path'&&engine){
      if(Object.keys(input).some(k=>!['mode','name','engineId','engineVersion','carrier','params','definition'].includes(k)))throw Error('未知附着生成器字段');
      const shape=carrier(input.carrier),definition=global.ToSampoolRuntimeVNext.modules.patternProviders.validate(input.definition||engine).definition;
      if(input.engineVersion!==definition.version||definition.id!==engine.id||!engine.carriers.includes(shape.type))throw Error('附着生成器身份或载体不匹配');
      const config=generated.normalize(engine.id,{definition,params:input.params},shape);
      return{mode:'path',name:String(input.name||definition.name).slice(0,120),engineId:engine.id,engineVersion:definition.version,carrier:shape.id,params:config.params,definition};
    }
    if(input?.mode!=='path'||!engines.includes(input.engineId)||input.engineVersion!==1)throw Error('路径图样引擎身份或版本无效');
    if(Object.keys(input).some(k=>!['mode','name','engineId','engineVersion','carrier','params','source'].includes(k)))throw Error('未知路径图样字段');
    const shape=carrier(input.carrier),entry=registry().byId(input.engineId);
    if(!entry.supports(shape))throw Error('路径图样不支持此载体');
    if(input.params!=null&&(!input.params||Array.isArray(input.params)||typeof input.params!=='object'))throw Error('路径图样参数必须是对象');
    if(input.params?.sourceId)throw Error('路径图样不能保存场景sourceId，请捕获来源闭包');
    if(input.source&&input.engineId!=='elements')throw Error('此图样不接收对象来源');
    const part={...shape,w:160,h:100,stroke:'#ffd23f',strokeWidth:3,extensions:{[input.engineId]:{...input.params,enabled:true}}};
    const params=global.ToSampoolRuntimeVNext.modules.pathExtensions.normalize(part)[input.engineId];
    if(input.engineId==='elements')delete params.sourceId;
    const result={mode:'path',name:String(input.name||entry.name).slice(0,120),engineId:input.engineId,engineVersion:1,carrier:shape.id,params};
    if(input.source){
      result.source=elements().validate(input.source);
      if([result.source.root,...result.source.children||[],...result.source.sources||[]].some(e=>e.type==='particle-emitter'))throw Error('路径排布不支持粒子或包含粒子的来源');
    }
    if(new TextEncoder().encode(JSON.stringify(result)).length>524288)throw Error('路径图样预设超出512KB预算');return result;
  }
  function references(input){const value=normalize(input);return value.source?elements().references(value.source):[];}
  function remapAssets(input,mapping){const value=normalize(input);if(value.source)value.source=elements().remapAssets(value.source,mapping);return value;}
  function fromPart(scene,part,id,options){
    const entry=registry().byId(id);if(!entry||!entry.supports(part))throw Error('图样与当前路径不兼容');
    const selected=part.type==='poly'?(part.polygonMode==='regular'?'regular':'free'):part.type==='stroke'?'stroke':part.type;
    const configuration=global.ToSampoolRuntimeVNext.modules.pathExtensions.normalize(part)[id],generator=global.ToSampoolRuntimeVNext.modules.pathGenerators?.definition(id);
    if(generator)return normalize({mode:'path',name:options?.name||entry.name,engineId:id,engineVersion:configuration.definition.version,carrier:selected,params:copy(configuration.params),definition:configuration.definition});
    const params=copy(configuration),input={mode:'path',name:options?.name||entry.name,engineId:id,engineVersion:1,carrier:selected,params};
    if(id==='elements'&&params.sourceId){const valid=global.ToSampoolRuntimeVNext.modules.pathInstances.canReference(scene,options?.ownerId,params.sourceId);if(!valid.ok)throw Error(valid.reason);input.source=elements().capture(scene,params.sourceId);delete params.sourceId;}
    return normalize(input);
  }
  function apply(scene,input,part,options){
    const value=normalize(input),entry=registry().byId(value.engineId);if(!entry.supports(part))throw Error('图样与当前路径不兼容');
    if(registry().attached(part).includes(value.engineId)&&!options?.replace)return part;
    const settings=global.ToSampoolRuntimeVNext.modules.pathExtensions.normalize(part),config=copy(value.params);config.enabled=true;
    if(value.definition?.format==='tosampool-pattern-generator/v1'){settings[value.engineId]={enabled:true,definition:value.definition,params:copy(value.params)};registry().commit(part,settings,value.engineId);return part;}
    let prepared=null;
    if(value.source){
      const draft=copy(scene),map=draft.elementPresets||{},used=new Set((scene.entities||[]).map(e=>e.id));let id='__path_source__';while(Object.hasOwn(map,id))id+='-';
      draft.elementPresets={...map,[id]:value.source};
      const source=elements().instantiate(draft,id,{x:0,y:0});
      config.sourceId=source.id;config.keepSource=false;
      for(const item of draft.entities)if(!used.has(item.id)){item.referenceSourceOnly=true;delete item.resourceBindings;}
      prepared=draft.entities.filter(item=>!used.has(item.id));
    }else if(value.engineId==='elements')config.sourceId='';
    settings[value.engineId]=config;
    // Commit private entities only after all dependency/readiness checks passed.
    registry().commit(part,settings,value.engineId);if(prepared)scene.entities=[...(scene.entities||[]),...prepared];
    // A just-created carrier may not be inserted yet; do not collect other
    // staged carriers' closures before the drawing transaction commits them.
    if((scene.entities||[]).some(e=>e===part||e.parts?.includes(part)))global.EditorV4ElementReferences?.prunePrivate(scene);
    return part;
  }
  global.EditorV4PathPatternPresets=Object.freeze({normalize,references,remapAssets,fromPart,apply,carrier,fromGeneratorPreset,restoreCarrier});
})(typeof window!=='undefined'?window:globalThis);
