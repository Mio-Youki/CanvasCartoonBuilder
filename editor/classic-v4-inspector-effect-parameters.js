(function (global) {
  'use strict';

  // Pure Inspector planning: no DOM, history, scene mutation, or Runtime work.
  // Keeping this declarative makes parameter visibility testable independently.
  function nested(value,path,fallback) {
    let current=value;
    for(const key of String(path||'').split('.')){
      if(!key)continue;
      if(!current||typeof current!=='object'||!(key in current))return fallback;
      current=current[key];
    }
    return current===undefined?fallback:current;
  }

  function visible(param,values) {
    if(param.visibleWhen)return Object.entries(param.visibleWhen).every(([key,allowed])=>{
      const accepted=Array.isArray(allowed)?allowed:[allowed];
      return accepted.includes(nested(values,key,undefined));
    });
    if(!param.visibleFor)return true;
    const accepted=Array.isArray(param.visibleFor)?param.visibleFor:[param.visibleFor];
    return accepted.includes(values.type)||accepted.includes(values.mode)||accepted.includes(values.texture);
  }

  function plan(card,definition,values) {
    const special=card.id==='uneven-sampling'?'uneven':card.id==='texture-overlay'?'texture':null;
    const params=(definition.params||[]).filter(param=>{
      if(param.internal)return false;
      if(!visible(param,values))return false;
      // Color controls own their alpha; do not show an accidental duplicate field.
      return !((definition.params||[]).some(entry=>entry.type==='color'&&visible(entry,values)&&(entry.alphaKey||'alpha')===param.key));
    });
    return Object.freeze({special,params:Object.freeze(params)});
  }

  function unevenPlan(definition,values,scope) {
    const byKey=Object.fromEntries((definition.params||[]).map(param=>[param.key,param]));
    const keys=['amount','coarseness','field.type','field.contrast','field.scale'];
    const type=nested(values,'field.type','wave');
    if(type==='wave')keys.push('field.direction');
    else if(type==='radial')keys.push('field.centerX','field.centerY');
    else if(type==='noise')keys.push('field.seed');
    if(scope==='object'){
      keys.push('edge.mode');
      if(nested(values,'edge.mode','off')!=='off')keys.push('edge.width');
    }
    return Object.freeze({params:Object.freeze(keys.map(key=>byKey[key]).filter(Boolean)),sceneNote:scope==='scene'?'边缘保护只在对象级可用：完整场景没有独立 Alpha 轮廓。':null});
  }

  global.EditorClassicV4EffectParameters=Object.freeze({nested,visible,plan,unevenPlan});
})(typeof window!=='undefined'?window:globalThis);
