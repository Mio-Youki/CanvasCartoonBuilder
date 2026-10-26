/* Independent authored presets; dependencies stay in the existing resource graph. */
(function(global){
  'use strict';
  const FORMAT='tosampool-element-preset/v1',types=new Set(['rect','ellipse','poly','line','vector','builtin','procedural','image','text','group','particle-emitter']);
  const excluded=['parentId','sceneVariants','timeline','editor','history','solo','locked','selected','particleSourceOnly','referenceSourceOnly','resourceBindings','worldMatrix','parentMatrix','parentAlpha','parentHidden','timelineVisible','_moduleScope','_runtime','runtimeAssets','_image','_canvas','_bitmap','_assetFrame'];
  const limits=Object.freeze({presets:128,parts:256,bytes:262144});
  const copy=v=>JSON.parse(JSON.stringify(v));
  function json(value){
    if(value===null||['string','boolean'].includes(typeof value))return;
    if(typeof value==='number'&&Number.isFinite(value))return;
    if(Array.isArray(value)){value.forEach(json);return;}
    if(value&&typeof value==='object'){for(const [key,child]of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(key))throw Error('元素预设含不安全字段');json(child);}return;}
    throw Error('元素预设只能包含有限JSON数据');
  }
  function clean(value){const out=copy(value);for(const key of excluded)delete out[key];return out;}
  function masks(){if(!global.EditorVNextMaskState?.portable)throw Error('RC2元素预设需要统一蒙版适配器');return global.EditorVNextMaskState;}
  function graph(){if(!global.EditorV4ElementReferences)throw Error('RC2元素预设需要对象引用适配器');return global.EditorV4ElementReferences;}
  function nodes(preset){return[preset.root,...preset.children||[],...preset.sources||[]];}
  function independent(root){
    if(!types.has(root.type))throw Error('RC2暂不支持此元素类型：'+root.type+'；组／粒子需后续批次');
    if(root.type==='image'&&(typeof root.assetId!=='string'||!root.assetId))throw Error('图片元素缺少素材身份');
    if(root.type==='text'&&(!root.rasterAssetId||!root.glyphAssetId||!root.textLayout||!Array.isArray(root.textLayout.glyphs)||!Array.isArray(root.textLayout.positions)||!root.textLayout.positions.length))throw Error('文字元素需先生成文字栅格／字形图集与布局；不能用系统字体替代可移植外观');
    if(root.effects?.mask&&root.effects.mask.type!=='none'){
      root.effects.mask=masks().portable(root.effects.mask);
    }
    const registry=global.EditorEffectRegistryVNext;
    for(const key of Object.keys(root.effects||{}))if(!['pipeline','mask','formation','decorate','sample'].includes(key))throw Error('未知元素处理字段：'+key);
    for(const stage of ['formation','decorate','sample'])for(const [id,config]of Object.entries(root.effects?.[stage]||{})){
      if(id==='controllers'){for(const key of Object.keys(config||{}))if(!registry?.controllerById[key])throw Error('未知控制器：'+key);}
      else if(config&&(registry?.runtimeSupport[id]?.object!=='ready'||registry?.effectById[id]?.family!==stage))throw Error('未知或不支持对象阶段的效果：'+id);
    }
    if(root.effects?.pipeline&&(!Array.isArray(root.effects.pipeline)||root.effects.pipeline.length!==3||new Set(root.effects.pipeline).size!==3||root.effects.pipeline.some(v=>!['mask','decorate','sample'].includes(v))))throw Error('元素处理顺序无效');
    for(const part of [root,...root.parts||[]]){
      if(part!==root&&!['rect','ellipse','poly','line','stroke','custom'].includes(part.type))throw Error('RC2暂不支持此图元类型：'+part.type);
      for(const key of Object.keys(part.extensions||{}))if(!['version','showSource','attached','ticks','nested','elements','corner-arrows','brackets'].includes(key))throw Error('未知图元拓展：'+key);
      if(part.extensions?.attached!=null&&(!Array.isArray(part.extensions.attached)||part.extensions.attached.length>5||new Set(part.extensions.attached).size!==part.extensions.attached.length||part.extensions.attached.some(id=>!['ticks','nested','elements','corner-arrows','brackets'].includes(id))))throw Error('已添加图样身份无效');
      if(part.type==='custom'){
        const shapes=global.ToSampoolRuntimeVNext?.modules.customShapes;
        if(!shapes)throw Error('当前Host缺少图样校验器');
        shapes.normalizePartRecipe(copy(part));
      }else if(part.recipe)throw Error('非自定义图元不能携带图样配方');
      // Only typed root image/text references are supported in this batch.
      const scan=(value,path)=>{if(!value||typeof value!=='object')return;for(const [key,child]of Object.entries(value)){
        if(/(?:assetId|imageId|locator|sourceId|targetId)$/i.test(key)&&typeof child==='string'&&child){
          const known=part===root&&!path&&(key==='assetId'&&root.type==='image'||['rasterAssetId','glyphAssetId'].includes(key)&&root.type==='text');
          if(!known)throw Error('RC2暂不支持资源引用位置：'+(path?path+'.':'')+key);
        }
        scan(child,path?path+'.'+key:key);
      }};
      const shape={...part};delete shape.params;delete shape.parts;
      if(shape.particle){shape.particle={...shape.particle};delete shape.particle.sourceId;for(const key of ['emissionRange','motionRange'])delete shape.particle[key];}
      if(shape.effects){shape.effects={...shape.effects};delete shape.effects.mask;}
      if(shape.extensions?.elements){shape.extensions={...shape.extensions,elements:{...shape.extensions.elements}};delete shape.extensions.elements.sourceId;}
      if(shape.pathEndpoints){shape.pathEndpoints={...shape.pathEndpoints};delete shape.pathEndpoints.sourceId;}
      scan(shape);
    }
  }
  function validate(input){
    json(input);
    if(input?.format!==FORMAT||input.version!==1||!input.root||typeof input.name!=='string')throw Error('元素预设格式无效');
    if(Object.keys(input).some(k=>!['format','version','name','root','sources','children','patternNames'].includes(k)))throw Error('未知元素预设字段');
    const output=copy(input),root=output.root;
    if(output.patternNames!=null){
      const names=output.patternNames;if(typeof names!=='object'||Array.isArray(names)||Object.keys(names).length>128)throw Error('图样名称元数据无效');
      const used=new Set();for(const owner of nodes(output))for(const part of [owner,...owner.parts||[]]){for(const id of global.EditorV4PatternRegistry?.attached(part)||[])used.add(id);if(part.recipe?.id)used.add(part.recipe.id);}
      for(const [id,name]of Object.entries(names))if(!used.has(id)||typeof name!=='string'||!name.trim()||name.length>120||/[\x00-\x1f]/.test(name))throw Error('图样名称元数据无效');
    }
    if(Object.hasOwn(output,'sources')&&!Array.isArray(output.sources))throw Error('元素来源列表无效');
    if(root.id!=='root'||root.x!==0||root.y!==0||excluded.some(key=>Object.hasOwn(root,key)))throw Error('元素预设必须是无父级、无时序的局部根');
    if(output.children!=null&&(!Array.isArray(output.children)||output.children.length>256))throw Error('组子元素列表无效或超出预算');
    graph().validate(root,output.sources||[],output.children||[]);
    for(const node of nodes(output)){
      const child=node!==root&&!!node.parentId;if(excluded.some(key=>(key!=='parentId'||!child)&&Object.hasOwn(node,key))||!Number.isFinite(node.x)||!Number.isFinite(node.y))throw Error('元素来源不能携带外部父级、时序或临时字段，位置必须有效');
      for(const key of ['w','h'])if(!Number.isFinite(+node[key])||+node[key]<=0)throw Error('元素预设宽高无效');
      if(node.parts!=null&&!Array.isArray(node.parts))throw Error('图元列表无效');
      if((node.parts||[]).length>limits.parts)throw Error('元素图元数量超出预算');
      const ids=new Set();for(const part of node.parts||[]){if(typeof part.id!=='string'||!part.id||ids.has(part.id)||excluded.some(k=>Object.hasOwn(part,k)))throw Error('图元身份或临时字段无效');ids.add(part.id);}
      independent(node);
      if(node.type==='particle-emitter'){const source=nodes(output).find(e=>e.id===node.particle?.sourceId);if(!source||['group','particle-emitter'].includes(source.type))throw Error('粒子实体必须是普通元素');}
      if(node.type==='procedural'&&(!node.moduleId||!Number.isInteger(node.moduleVersion)||node.moduleVersion<1))throw Error('程序元素缺少精确实现身份');
      if(node.type==='builtin')global.ToSampoolRuntimeVNext.modules.builtins.normalize(node.builtin);
    }
    if(new TextEncoder().encode(JSON.stringify(input)).length>limits.bytes)throw Error('元素预设超出256KB预算');
    return output;
  }
  function validateScene(scene){
    if(scene.elementPresets&&(typeof scene.elementPresets!=='object'||Array.isArray(scene.elementPresets)))throw Error('元素预设集合必须是对象');
    const entries=Object.entries(scene.elementPresets||{});if(entries.length>limits.presets)throw Error('元素预设数量超出预算');
    for(const [id,preset]of entries){if(!id||['__proto__','constructor','prototype'].includes(id))throw Error('元素预设ID无效');validate(preset);validateDependencies(scene,preset);}
    if(entries.length)global.ToSampoolRuntimeVNext?.modules.patternProviders?.validateScene({...scene,entities:[...(scene.entities||[]),...entries.flatMap(([,p])=>nodes(p))]});
  }
  function moduleRef(preset){return preset.root.type==='procedural'?{kind:'module',id:preset.root.moduleId,version:preset.root.moduleVersion}:null;}
  function moduleDescriptor(scene,preset){
    const ref=moduleRef(preset);if(!ref)return null;
    const descriptor=scene.modules?.[ref.id],manifest=descriptor?.manifest;
    if(manifest?.format!=='tosampool-scene-module/v1'||manifest.id!==ref.id||+manifest.version!==ref.version)throw Error('元素预设缺少匹配程序描述：'+ref.id);
    return descriptor;
  }
  function references(preset){
    const refs=[];
    for(const root of nodes(preset)){
      for(const key of ['assetId','rasterAssetId','glyphAssetId'])if(root[key])refs.push({kind:'asset',id:root[key],version:1});
      if(root.effects?.mask&&root.effects.mask.type!=='none')refs.push(...masks().references(root.effects.mask).filter(ref=>ref.kind==='asset'));
      if(root.particle)for(const name of ['emissionRange','motionRange'])if(root.particle[name])refs.push(...masks().references(root.particle[name]).filter(ref=>ref.kind==='asset'));
      const module=moduleRef({root});if(module)refs.push(module);
    }
    return [...new Map(refs.map(ref=>[ref.kind+':'+ref.id+'@'+ref.version,ref])).values()];
  }
  function remapAssets(input,mapping){
    const preset=validate(input);
    for(const root of nodes(preset)){
      for(const key of ['assetId','rasterAssetId','glyphAssetId'])if(typeof root[key]==='string'&&Object.hasOwn(mapping,root[key]))root[key]=mapping[root[key]];
      if(root.effects?.mask&&root.effects.mask.type!=='none')root.effects.mask=masks().remapReferences(root.effects.mask,{asset:mapping});
      if(root.particle)for(const name of ['emissionRange','motionRange'])if(root.particle[name])root.particle[name]=masks().remapReferences(root.particle[name],{asset:mapping});
    }
    return validate(preset);
  }
  function validateDependencies(scene,preset){
    const pending=references(preset).filter(ref=>ref.kind==='asset').map(ref=>ref.id),done=new Set(),active=new Set();
    for(const root of nodes(preset))for(const ref of moduleDescriptor(scene,{root})?.manifest?.assets||[])pending.push(typeof ref==='string'?ref:ref?.id);
    function visit(id){
      if(typeof id!=='string'||!id||!scene.assets?.[id])throw Error('元素预设素材依赖缺失：'+id);
      if(active.has(id))throw Error('元素预设素材依赖循环：'+id);if(done.has(id))return;
      active.add(id);
      const scan=value=>{if(!value||typeof value!=='object')return;for(const [key,child]of Object.entries(value))if(/assetid$/i.test(key)&&typeof child==='string'&&child)visit(child);else scan(child);};
      scan(scene.assets[id]);active.delete(id);done.add(id);
    }
    pending.forEach(visit);
  }
  function preparePart(scene,part){
    const out=clean(part);if(out.type!=='custom')return out;
    const runtime=global.ToSampoolRuntimeVNext?.modules,recipe=out.recipe;
    if(recipe?.providerKey&&!recipe.definition){
      const definition=scene.patternDefinitions?.[recipe.id+'@'+recipe.version];
      if(definition)out.recipe={...recipe,definition:copy(definition)};
    }
    out.recipe=runtime.customShapes.normalizePartRecipe(out);
    if(runtime.customShapes.supports(out.recipe))out.geometrySnapshot=runtime.patternSnapshots.capture(out);
    return out;
  }
  function capture(scene,entityId,options){
    const source=(scene.entities||[]).find(e=>e.id===entityId);if(!source)throw Error('找不到入库元素：'+entityId);
    const origin={x:+source.x||0,y:+source.y||0};
    const captured=graph().capture(scene,entityId,(original,isRoot,isChild)=>{
      const root=clean(original);root.x=(+original.x||0)-(isChild?0:origin.x);root.y=(+original.y||0)-(isChild?0:origin.y);if(isChild)root.parentId=original.parentId;root.w=+(original.w??1);root.h=+(original.h??1);if(isRoot)root.hidden=false;
      if(root.type==='line'){if(root.x2!=null)root.x2=+root.x2-origin.x;if(root.y2!=null)root.y2=+root.y2-origin.y;}
      if(root.parts)root.parts=root.parts.map(part=>preparePart(scene,part));
      if(root.effects?.mask&&root.effects.mask.type!=='none'){
        root.effects.mask=masks().detach(root.effects.mask,scene,isChild?{parentId:source.parentId}:original,origin);
      }
      if(root.particle)for(const range of ['emissionRange','motionRange'])if(root.particle[range])root.particle[range]=masks().detach(root.particle[range],scene,isChild?{parentId:source.parentId}:original,origin);
      if(root.type==='procedural')root.moduleVersion=+(root.moduleVersion||1);return root;
    });
    const preset=withPatternNames(scene,validate({format:FORMAT,version:1,name:String(options?.name||source.name||source.id),root:captured.root,...(captured.children.length?{children:captured.children}:{}),...(captured.sources.length?{sources:captured.sources}:{})}));validateDependencies(scene,preset);return preset;
  }
  function withPatternNames(scene,input){
    const preset=validate(input),names={...preset.patternNames};
    for(const owner of nodes(preset))for(const part of [owner,...owner.parts||[]]){
      const ids=[...(global.EditorV4PatternRegistry?.attached(part)||[]),...(part.recipe?.id?[part.recipe.id]:[])];
      for(const id of ids){const resource=Object.values(scene.patternResources||{}).find(p=>p.engineId===id);if(resource?.name){const fallback=global.EditorV4PatternRegistry?.byId(id)?.name||part.name||part.recipe?.definition?.name||id;if(resource.name!==fallback)names[id]=resource.name;else delete names[id];}}
    }
    if(Object.keys(names).length)preset.patternNames=names;else delete preset.patternNames;return validate(preset);
  }
  function add(scene,entityId,options){
    const preset=capture(scene,entityId,options),map=scene.elementPresets||{};
    const base=String(options?.id||entityId+'-preset');if(['__proto__','constructor','prototype'].includes(base))throw Error('元素预设ID无效');
    let id=base,n=2;while(Object.hasOwn(map,id))id=base+'-'+n++;
    const next={...map,[id]:preset};validateScene({...scene,elementPresets:next});scene.elementPresets=next;return id;
  }
  function linked(scene,entityId){const item=scene.entities?.find(e=>e.id===entityId),id=item?.resourceBindings?.element;return id&&Object.hasOwn(scene.elementPresets||{},id)?id:null;}
  // A definition import becomes an ordinary element preset without executing it
  // or manufacturing a temporary Canvas instance.
  function fromModule(scene,moduleId){
    const manifest=scene.modules?.[moduleId]?.manifest,registry=global.ToSampoolRuntimeVNext.modules.sceneModules;
    if(manifest?.id!==moduleId||manifest.format!=='tosampool-scene-module/v1')throw Error('程序素材描述无效：'+moduleId);
    const params=Object.fromEntries(registry.parameters(manifest).map(param=>[param.key,registry.normalizeParam(param,undefined)]));
    const cw=+scene.width||320,ch=+scene.height||180,preferred=manifest.recommendedCanvas||{};
    const w=Math.max(1,+preferred.width||cw*2/3),h=Math.max(1,+preferred.height||ch*2/3),scale=Math.min(1,cw*2/3/w,ch*2/3/h);
    const preset=validate({format:FORMAT,version:1,name:manifest.title||moduleId,root:{id:'root',type:'procedural',moduleId,moduleVersion:+manifest.version,params,x:0,y:0,w:Math.max(1,Math.round(w*scale)),h:Math.max(1,Math.round(h*scale)),scaleX:1,scaleY:1,rot:0,alpha:1}});
    validateDependencies(scene,preset);
    for(const [id,existing]of Object.entries(scene.elementPresets||{}))if(JSON.stringify(existing)===JSON.stringify(preset))return id;
    const map=scene.elementPresets||{},base='module-'+moduleId+'-preset';let id=base,n=2;while(Object.hasOwn(map,id))id=base+'-'+n++;
    const next={...map,[id]:preset};validateScene({...scene,elementPresets:next});scene.elementPresets=next;return id;
  }
  function store(scene,entityId){
    const existing=linked(scene,entityId);let id=existing;
    if(existing){const preset=capture(scene,entityId);preset.name=scene.elementPresets[existing].name;const next={...scene.elementPresets,[existing]:preset};validateScene({...scene,elementPresets:next});scene.elementPresets=next;}
    else id=add(scene,entityId);
    global.EditorV4Resources?.collectElementPatterns(scene,scene.elementPresets[id]);
    const item=scene.entities.find(e=>e.id===entityId);item.resourceBindings={...item.resourceBindings,element:id};return{id,updated:!!existing};
  }
  function remove(scene,id){
    if(!Object.hasOwn(scene.elementPresets||{},id))return false;
    scene.elementPresets={...scene.elementPresets};delete scene.elementPresets[id];
    for(const item of scene.entities||[])if(item.resourceBindings?.element===id){delete item.resourceBindings.element;if(!Object.keys(item.resourceBindings).length)delete item.resourceBindings;}
    if(scene.materialShares)delete scene.materialShares['element:'+encodeURIComponent(id)+'@1'];return true;
  }
  function instantiate(scene,presetId,options){
    options=options||{};const raw=scene.elementPresets?.[presetId];if(!raw)throw Error('元素预设不存在：'+presetId);
    const preset=validate(raw);validateDependencies(scene,preset);
    for(const ref of references(preset).filter(ref=>ref.kind==='module'))if(!global.EditorV4ModuleInstances?.ready(scene,ref.id,scene._moduleScope))throw Error('程序元素尚未在当前工程显式信任／加载：'+ref.id);
    global.EditorV4Resources?.collectElementPatterns(scene,preset);
    const used=new Set((scene.entities||[]).map(e=>e.id)),mapping={};let serial=1;
    for(const node of nodes(preset)){while(used.has('element-'+serial))serial++;mapping[node.id]='element-'+serial++;used.add(mapping[node.id]);}
    const position={};for(const key of ['x','y']){const fallback=((+scene[key==='x'?'width':'height']||1)-+preset.root[key==='x'?'w':'h'])/2,value=options[key]==null?fallback:+options[key];if(!Number.isFinite(value))throw Error('放置坐标无效');position[key]=Math.round(value);}
    const created=nodes(preset).map((node,index)=>{
      const out=graph().remap(node,mapping);out.id=mapping[node.id];if(!out.parentId){out.x+=position.x;out.y+=position.y;}
      if(out.effects?.mask&&out.effects.mask.type!=='none')out.effects.mask=masks().translate(out.effects.mask,position.x,position.y);
      if(out.particle)for(const range of ['emissionRange','motionRange'])if(out.particle[range])out.particle[range]=masks().translate(out.particle[range],position.x,position.y);
      if(index&&!(preset.children||[]).includes(node))out.referenceSourceOnly=true;return out;
    });
    for(const emitter of created)if(emitter.type==='particle-emitter'){const source=created.find(e=>e.id===emitter.particle.sourceId);emitter.particle.sourceOwned=!!source?.referenceSourceOnly;if(source?.referenceSourceOnly)source.particleSourceOnly=true;}
    const root=created[0],sources=(preset.sources||[]).map(node=>mapping[node.id]);root.name=preset.name;root.resourceBindings={element:presetId,...(sources.length?{sources}:{})};scene.entities=[...(scene.entities||[]),...created];return root;
  }
  global.EditorV4ElementPresets=Object.freeze({FORMAT,limits,validate,validateScene,moduleRef,references,remapAssets,capture,withPatternNames,add,store,linked,remove,instantiate,fromModule});
})(typeof window!=='undefined'?window:globalThis);
