/* Preview only validated declarative definitions through the shipped path generator. */
(function(global){
  'use strict';
  function create(input){
    const providers=global.ToSampoolRuntimeVNext.modules.patternProviders,definition=providers.validate(input).definition;
    const defaults=()=>Object.fromEntries(definition.parameters.map(p=>[p.key,p.default]));
    function normalize(values){return providers.normalizeRecipe({id:definition.id,version:definition.version,definition,params:values||{}}).params;}
    function paint(ctx,values,time,box){const part={type:'custom',...box,strokeWidth:3,recipe:{id:definition.id,version:definition.version,definition,params:normalize(values)}};
      const modules=global.ToSampoolRuntimeVNext.modules;if(definition.format===modules.patternGenerators.FORMAT){const carrier=modules.patternGenerators.carrierFor(definition,part.recipe.params,part,box);carrier.extensions={attached:[definition.id],showSource:false,[definition.id]:{enabled:true,definition,params:part.recipe.params}};modules.pathGenerators.paint(ctx,carrier,definition.id,modules.pathGeometry.full(carrier,box),{frame:{time}});return;}
      const shapes=global.ToSampoolRuntimeVNext.modules.customShapes,built=shapes.custom(part,time);shapes.paint(ctx,built);}
    const generators=global.ToSampoolRuntimeVNext.modules.patternGenerators,reviewSource=definition.format===generators.FORMAT?{definition,implementation:generators.implementationFingerprint(definition)}:definition;
    return Object.freeze({id:definition.id,version:definition.version,name:definition.name,parameters:definition.parameters,controls:definition.controls,defaults,normalize,paint,reviewSource});
  }
  global.ToSampoolProviderReviewCandidate=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
