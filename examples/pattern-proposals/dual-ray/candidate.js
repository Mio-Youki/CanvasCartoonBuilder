/* Review adapter. Painting uses the same shipped provider as the editor. */
(function(global){
  'use strict';
  const modules=global.ToSampoolRuntimeVNext.modules,definition=modules.dualRayPattern.definition,parameters=definition.parameters;
  const defaults=()=>Object.fromEntries(parameters.map(p=>[p.key,p.default]));
  function normalize(input){
    const out={};for(const p of parameters){let value=input?.[p.key]??p.default;
      if(p.type==='number'){value=Number.isFinite(+value)?+value:p.default;value=Math.max(p.min,Math.min(p.max,value));if(p.integer)value=Math.round(value);}
      else if(p.type==='color')value=/^#[\da-f]{6}$/i.test(value)?value:p.default;
      else if(p.type==='boolean')value=!!value;else if(!p.options.includes(value))value=p.default;out[p.key]=value;
    }return out;
  }
  function carrier(params,box){const part={id:'carrier',type:params.carrier==='regular'||params.carrier==='free'?'poly':params.carrier,...box};
    if(params.carrier==='regular'){part.polygonMode='regular';part.sides=5;}
    if(params.carrier==='free'){part.polygonMode='free';part.points=[[0,.12],[.7,0],[1,.55],[.72,1],[.08,.85]];}
    return part;
  }
  function paint(ctx,input,time,box){
    const modules=global.ToSampoolRuntimeVNext.modules,p=normalize(input),definition=modules.dualRayPattern.definition;
    const part=modules.dualRayPattern.carrier(p,box);part.extensions={attached:[definition.id],showSource:false,[definition.id]:{enabled:true,definition,params:p}};
    modules.pathGenerators.paint(ctx,part,definition.id,modules.pathGeometry.full(part,box),{frame:{time}});return{sectors:p.pairs*2,readbacks:0,offscreenSurfaces:0};
  }
  global.ToSampoolDualRayProposal=Object.freeze({id:definition.id,version:definition.version,name:definition.name,parameters,controls:definition.controls,defaults,normalize,paint,reviewSource:{definition,implementation:modules.patternGenerators.implementationFingerprint(definition)}});
})(typeof window!=='undefined'?window:globalThis);
