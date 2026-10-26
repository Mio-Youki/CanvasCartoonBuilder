(function(global){
  'use strict';
  async function importShared(bundle,library){
    const core=global.EditorV4Resources,value=await core.verify(bundle);
    if(value.roots.length!==1||value.entries.length!==1||value.entries[0].kind!=='pattern'||!value.entries[0].payload.preset.definition)throw Error('自动交付仅接收自包含声明式图样');
    const entry=value.entries[0],definition=entry.payload.preset.definition;
    global.ToSampoolRuntimeVNext.modules.patternProviders.validate(definition);
    const id='agent-pattern:'+definition.id+':v'+definition.version,prior=await library.publication(id);
    if(prior){
      if(prior.hash===value.hash)return prior;
      const old=await library.sharedBundle(id),before=old?.bundle?.entries?.length===1&&old.bundle.entries[0].payload.preset,after=entry.payload.preset;
      const repairsOldShape=after.mode==='path'&&before&&before.mode!=='path'&&before.engineId===after.engineId&&before.engineVersion===after.engineVersion&&before.definition?.format==='tosampool-pattern-generator/v1'&&before.definition.implementation===definition.implementation;
      if(repairsOldShape)return library.publish(value,{id,name:after.name,expectedRevision:prior.revision});
      throw Error('共享库已有不同内容；请明确更新版本，自动交付未覆盖');
    }
    try{return await library.publish(value,{id,name:entry.payload.preset.name,expectedRevision:null});}
    catch(error){const concurrent=await library.publication(id);if(concurrent?.hash===value.hash)return concurrent;throw error;}
  }
  global.ToSampoolEffectReviewDelivery=Object.freeze({importShared});
})(typeof window!=='undefined'?window:globalThis);
