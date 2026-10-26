/* Registry-driven parameter paths and timing. No effect-ID rollout whitelist. */
(function(global){
  'use strict';
  const controls=Object.freeze({number:'standard',color:'standard',boolean:'standard',select:'standard',text:'ascii-text',font:'ascii-font',gradient:'gradient','tile-pixels':'texture-tile','extracted-palette':'palette-extraction'});
  function supports(definition){return !!definition&&Array.isArray(definition.params);}
  function parameter(definition,key){
    let value=(definition?.params||[]).find(p=>p.key===key);
    if(!value&&key.startsWith('motion.')&&definition?.motion?.length){
      const suffix=key.slice(7),registry=global.EditorEffectRegistryVNext;
      if(suffix==='enabled')value={key,label:'动态',type:'boolean',default:definition.id==='offset-sampling',timing:'step'};
      else if(suffix==='type')value={key,label:'动态方式',type:'select',default:definition.motion[0],options:definition.motion,timing:'step'};
      else{const p=definition.motion.flatMap(id=>registry.motionById[id]?.params||[]).find(p=>p.key===suffix);if(p)value={...p,key};}
    }
    if(!value)return null;
    if(!controls[value.type])throw Error('效果参数缺少控件适配器：'+definition.id+'.'+key+' ('+value.type+')');
    const timing=value.timing??(typeof definition.timing==='object'?definition.timing[key]:definition.timing)??'No',param={...value,timing};
    global.ToSampoolRuntimeVNext.modules.parameterTiming.capability(param);return param;
  }
  function binding(definition,key){
    const param=parameter(definition,key);if(!param)return null;
    const inline=definition.id==='texture-overlay'&&!['color','alpha','blend'].includes(key);
    return Object.freeze({param,path:key,control:param.internal?'internal':inline?'texture-editor':controls[param.type],timing:global.ToSampoolRuntimeVNext.modules.parameterTiming.capability(param).timing});
  }
  function coverage(registry){return registry.effects.flatMap(definition=>definition.params.map(p=>Object.freeze({effectId:definition.id,...binding(definition,p.key)})));}
  function motionCoverage(registry){return registry.effects.flatMap(definition=>(definition.motion||[]).flatMap(id=>['motion.enabled','motion.type',...(registry.motionById[id]?.params||[]).map(p=>'motion.'+p.key)].map(key=>Object.freeze({effectId:definition.id,motionId:id,...binding(definition,key)}))));}
  function group(definition,key){return definition.id==='texture-overlay'&&['tileWidth','tileHeight','tilePixels'].includes(key)?['tileWidth','tileHeight','tilePixels']:[key];}
  function partition(definition,patch,context){
    if(!supports(definition))return null;
    const base={},timed={},targets={};
    for(const [key,value]of Object.entries(patch||{})){
      const param=parameter(definition,key);if(!param)throw Error('效果参数尚未接入逐参数时序：'+key);
      const keys=group(definition,key),armed=keys.some(name=>context.armed(name)||Object.hasOwn(context.segment?.values||{},name));
      const status=global.EditorV4ParameterControls.timingTarget(param,{segment:context.segment,path:key,armed,wholeSegment:context.wholeSegment});
      if(status.readOnly)throw Error('过渡段只读，请在两侧时段设置参数');
      targets[key]=status.target;
    }
    if(context.atomicKey){
      if(!Object.hasOwn(targets,context.atomicKey))throw Error('复合操作缺少主参数：'+context.atomicKey);
      for(const key of Object.keys(targets))if(global.ToSampoolRuntimeVNext.modules.parameterTiming.capability(parameter(definition,key)).timing!=='No')targets[key]=targets[context.atomicKey];
    }
    // Extraction follows its trigger atomically; it is not a separate UI knob.
    if(Object.hasOwn(patch,'extracted')){
      const triggers=['colors','palette','mode'].filter(key=>Object.hasOwn(patch,key));
      const target=triggers.length?(triggers.some(key=>targets[key]==='segment')?'segment':'base'):global.EditorV4ParameterControls.timingTarget(parameter(definition,'extracted'),{segment:context.segment,path:'extracted',armed:context.armed('colors')||context.armed('palette')||context.armed('mode'),wholeSegment:context.wholeSegment}).target;
      targets.extracted=target;for(const key of triggers)targets[key]=target;
    }
    for(const [key,value]of Object.entries(patch||{}))(targets[key]==='segment'?timed:base)[key]=value;
    return {base,timed};
  }
  global.EditorClassicV4EffectParameterTiming=Object.freeze({supports,parameter,binding,coverage,motionCoverage,partition,group});
})(typeof window!=='undefined'?window:globalThis);
