/* Project-local template lifecycle. All mutations are prepared on a clone. */
(function(global){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  function runtime(){return global.ToSampoolRuntimeVNext.modules;}
  function registryKey(definition){return definition.id+'@'+definition.version;}
  function recipeFor(preset){return{id:preset.engineId,version:preset.engineVersion,params:preset.params||{},...(preset.definition?{definition:preset.definition}:{}),...(preset.providerKey?{providerKey:preset.providerKey}:{})};}
  function presetPart(preset){return{type:'custom',x:0,y:0,w:160,h:100,stroke:preset.style?.color||'#ffd23f',strokeWidth:preset.style?.width??3,strokeAlpha:preset.style?.alpha??1,recipe:recipeFor(preset),geometrySnapshot:preset.geometrySnapshot};}
  function refreshPreset(preset){const p=presetPart(preset);p.recipe=runtime().customShapes.normalizePartRecipe(p);preset.params=p.recipe.params;preset.geometrySnapshot=runtime().patternSnapshots.capture(p);return preset;}
  function bindPart(part,record){part.recipe=runtime().patternProviders.normalizeRecipe({id:record.definition.id,version:record.definition.version,params:part.recipe.params||{},definition:record.definition,providerKey:record.key});part.geometrySnapshot=runtime().patternSnapshots.capture(part);}
  function bindPreset(preset,record){preset.engineId=record.definition.id;preset.engineVersion=record.definition.version;preset.definition=record.definition;preset.providerKey=record.key;return refreshPreset(preset);}
  function transaction(scene,operation){const draft=copy(scene),result=operation(draft);runtime().patternProviders.validateScene(draft);for(const key of ['entities','patternResources','patternDefinitions'])if(Object.hasOwn(draft,key))scene[key]=draft[key];return result;}
  function install(scene,raw,options){
    const record=runtime().patternProviders.validate(raw),key=registryKey(record.definition);
    return transaction(scene,draft=>{
      draft.patternDefinitions=draft.patternDefinitions||{};draft.patternResources=draft.patternResources||{};
      const prior=draft.patternDefinitions[key];if(prior&&runtime().patternProviders.validate(prior).key!==record.key)throw Error('同ID／版本的图样定义冲突，请发布新版本');
      const probe=bindPreset({name:record.definition.name,params:{},style:{color:'#ffd23f',width:3,alpha:1}},record);
      if(!probe.geometrySnapshot.paths.length)throw Error('图样默认状态没有有效轮廓');
      let restored=0;
      for(const e of draft.entities||[])for(const p of e.parts||[])if(p.type==='custom'&&p.recipe?.id===record.definition.id&&p.recipe.version===record.definition.version){
        if(p.recipe.providerKey&&p.recipe.providerKey!==record.key)throw Error('工程实例已绑定另一份同版本定义');
        if(p.recipe.providerKey===record.key){bindPart(p,record);restored++;}
      }
      for(const p of Object.values(draft.patternResources))if(p.engineId===record.definition.id&&p.engineVersion===record.definition.version){
        if(p.providerKey&&p.providerKey!==record.key)throw Error('工程预设已绑定另一份同版本定义');
        if(p.providerKey===record.key)bindPreset(p,record);
      }
      draft.patternDefinitions[key]=record.definition;
      let presetId=Object.entries(draft.patternResources).find(([,p])=>p.engineId===record.definition.id)?.[0];
      if(options?.createPreset!==false&&!presetId){const base=record.definition.id+'-v'+record.definition.version;let n=2;presetId=base;while(Object.hasOwn(draft.patternResources,presetId))presetId=base+'-'+n++;draft.patternResources[presetId]=probe;}
      return{key,presetId,restored};
    });
  }
  function upgrade(scene,key){
    const raw=scene.patternDefinitions?.[key];if(!raw)throw Error('图样定义尚未安装');const record=runtime().patternProviders.validate(raw);
    return transaction(scene,draft=>{let changed=0;
      for(const e of draft.entities||[])for(const p of e.parts||[])if(p.type==='custom'&&p.recipe?.id===record.definition.id){bindPart(p,record);changed++;}
      for(const p of Object.values(draft.patternResources||{}))if(p.engineId===record.definition.id)bindPreset(p,record);
      return{changed,key};
    });
  }
  function remove(scene,key){
    const raw=scene.patternDefinitions?.[key];if(!raw)throw Error('图样定义尚未安装');const record=runtime().patternProviders.validate(raw);
    return transaction(scene,draft=>{let frozen=0;
      for(const e of draft.entities||[])for(const p of e.parts||[])if(p.type==='custom'&&p.recipe?.providerKey===record.key){
        p.geometrySnapshot=runtime().patternSnapshots.capture(p);delete p.recipe.definition;frozen++;
      }
      for(const p of Object.values(draft.patternResources||{}))if(p.providerKey===record.key){refreshPreset(p);delete p.definition;}
      delete draft.patternDefinitions[key];return{frozen,key};
    });
  }
  global.EditorV4PatternLifecycle=Object.freeze({install,upgrade,remove,recipeFor,refreshPreset});
})(typeof window!=='undefined'?window:globalThis);
