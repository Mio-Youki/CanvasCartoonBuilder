/* Shared resource identity/closure/copy layer. Importing never executes code. */
(function(global){
  'use strict';
  const FORMAT='tosampool-resource-package/v1',RECORD='tosampool-resource/v1',KINDS=['image','sequence','pattern','module','element'],limits=Object.freeze({entries:256,bytes:64*1024*1024}),copy=v=>JSON.parse(JSON.stringify(v));
  function elementAPI(){if(!global.EditorV4ElementPresets)throw Error('当前Host不支持元素预设');return global.EditorV4ElementPresets;}
  function pathAPI(){if(!global.EditorV4PathPatternPresets)throw Error('当前Host不支持路径图样预设');return global.EditorV4PathPatternPresets;}
  function id(value){const s=String(value||'');if(!s||s.length>200||['__proto__','prototype','constructor'].includes(s)||/[\x00-\x1f]/.test(s))throw Error('资源ID无效');return s;}
  function key(value){const family=['image','sequence','asset'].includes(value.kind)?'asset':value.kind;return family+':'+encodeURIComponent(id(value.id))+'@'+Math.max(1,+value.version||1);}
  function canonical(v){if(v===null||typeof v==='string'||typeof v==='boolean')return v;if(typeof v==='number'){if(!Number.isFinite(v))throw Error('资源包含非有限数值');return v;}if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object'){const out={};for(const k of Object.keys(v).sort()){if(['__proto__','prototype','constructor'].includes(k))throw Error('资源包含不安全字段');if(v[k]!==undefined)out[k]=canonical(v[k]);}return out;}throw Error('资源只能包含JSON数据');}
  async function digest(value){if(!global.crypto?.subtle)throw Error('当前Host缺少SHA-256能力');const bytes=new TextEncoder().encode(JSON.stringify(canonical(value))),result=await global.crypto.subtle.digest('SHA-256',bytes);return'sha256:'+Array.from(new Uint8Array(result),b=>b.toString(16).padStart(2,'0')).join('');}
  function body(r){return{kind:r.kind,id:r.id,version:r.version,payload:r.payload,dependencies:r.dependencies};}
  function validateRecord(r){
    if(r?.format!==RECORD||!KINDS.includes(r.kind)||!Number.isInteger(r.version)||r.version<1)throw Error('资源记录格式或版本无效');id(r.id);
    if(!r.payload||typeof r.payload!=='object'||Array.isArray(r.payload)||!Array.isArray(r.dependencies)||r.dependencies.some(v=>typeof v!=='string'))throw Error('资源内容或依赖无效');
    if(['image','sequence'].includes(r.kind)){
      const a=r.payload.asset,frames=a?.frames?.length?a.frames:[a];
      if(!a||frames.some(f=>!String(f?.locator||'').startsWith('data:')))throw Error('资源图片必须自包含');
      const inline=value=>{if(!value||typeof value!=='object')return;for(const [name,child]of Object.entries(value))if(name==='locator'&&typeof child==='string'){if(!child.startsWith('data:'))throw Error('资源图片附属素材必须自包含');}else inline(child);};inline(a);
      if(r.kind==='sequence'&&frames.length<2)throw Error('序列资源缺少多帧');
    }
    if(r.kind==='module'){const d=r.payload.descriptor,m=d?.manifest;if(m?.format!=='tosampool-scene-module/v1'||m.id!==r.id||+m.version!==r.version||!String(d.locator||'').startsWith('data:'))throw Error('程序资源Manifest或源码无效');}
    if(r.kind==='pattern'){const p=r.payload.preset;if(!p?.engineId||!Number.isInteger(p.engineVersion))throw Error('图样预设缺少原生引擎身份');if(p.mode==='path')pathAPI().normalize(p);else{const shapes=global.ToSampoolRuntimeVNext?.modules.customShapes;if(!shapes)throw Error('当前Host缺少图样校验器');shapes.normalizePartRecipe({recipe:{id:p.engineId,version:p.engineVersion,params:p.params,...(p.definition?{definition:p.definition}:{}),...(p.providerKey?{providerKey:p.providerKey}:{})},geometrySnapshot:p.geometrySnapshot,strokeWidth:p.style?.width??3});}}
    let elementRefs=[];if(r.kind==='element'){const api=elementAPI(),preset=api.validate(r.payload.preset);elementRefs=api.references(preset);}
    const expected=['image','sequence'].includes(r.kind)?[...assetRefs(r.payload.asset)].map(id=>key({kind:'asset',id})):r.kind==='module'?moduleAssets(r.payload.descriptor).map(id=>key({kind:'asset',id})):r.kind==='element'?elementRefs.map(key):r.kind==='pattern'&&r.payload.preset.mode==='path'?pathAPI().references(r.payload.preset).map(key):[];
    if(JSON.stringify([...new Set(expected)].sort())!==JSON.stringify([...new Set(r.dependencies)].sort()))throw Error('资源声明依赖与内容不一致：'+r.id);
  }
  async function seal(input){const r={format:RECORD,kind:input.kind,id:id(input.id),version:input.version||1,name:String(input.name||input.id),payload:copy(input.payload),dependencies:Array.from(new Set(input.dependencies||[])).sort()};validateRecord(r);r.hash=await digest(body(r));return r;}
  async function pack(roots,entries){const result={format:FORMAT,version:1,roots:[...new Set(roots)].sort(),entries:entries.slice().sort((a,b)=>key(a)<key(b)?-1:key(a)>key(b)?1:0)};result.hash=await digest({roots:result.roots,entries:result.entries.map(r=>[key(r),r.hash])});return verify(result);}
  async function verify(input){
    if(input?.format!==FORMAT||input.version!==1||!Array.isArray(input.entries)||!Array.isArray(input.roots)||!input.roots.length||input.entries.length>limits.entries)throw Error('资源包格式或数量无效');
    if(new TextEncoder().encode(JSON.stringify(input)).length>limits.bytes)throw Error('资源包超出64MB预算');const p=copy(input),byKey=new Map();
    for(const r of p.entries){validateRecord(r);const k=key(r);if(byKey.has(k))throw Error('资源包存在重复身份：'+k);if(r.hash!==await digest(body(r)))throw Error('资源内容哈希不匹配：'+k);byKey.set(k,r);}
    const visiting=new Set(),done=new Set();function visit(k){if(visiting.has(k))throw Error('资源依赖循环：'+k);if(done.has(k))return;const r=byKey.get(k);if(!r)throw Error('资源依赖缺失：'+k);visiting.add(k);r.dependencies.forEach(visit);visiting.delete(k);done.add(k);}
    p.roots.forEach(visit);if(done.size!==p.entries.length)throw Error('资源包包含闭包之外的记录');
    if(p.hash!==await digest({roots:p.roots,entries:p.entries.map(r=>[key(r),r.hash])}))throw Error('资源包索引哈希不匹配');return p;
  }
  function assetRefs(value){const ids=new Set();function walk(v){if(!v||typeof v!=='object')return;for(const [k,c]of Object.entries(v)){if(/assetid$/i.test(k)&&typeof c==='string'&&c)ids.add(c);else walk(c);}}walk(value);return ids;}
  function moduleAssets(d){return(d?.manifest?.assets||[]).map(v=>typeof v==='string'?v:v?.id).filter(Boolean);}
  async function portable(value,options,module){
    const result=copy(value),codec=global.EditorVNextProjectPackage;if(!module)delete result.libraryHidden;
    async function walk(v){if(!v||typeof v!=='object')return;for(const [k,c]of Object.entries(v)){
      if(k==='locator'&&typeof c==='string'&&!c.startsWith('data:')){const resolver=module?options.resolveModule:options.resolveAsset;if(typeof resolver!=='function')throw Error('资源包无法读取外部依赖：'+c);const data=await resolver(c,value);v[k]=module&&typeof data==='string'?codec.bytesDataUrl(new TextEncoder().encode(data),'text/javascript'):codec.bytesDataUrl(data.bytes,data.mime);}
      else if(k==='locator'&&typeof c==='string'&&c.startsWith('data:')){const data=codec.dataUrlBytes(c);if(!data)throw Error('无效的data URL');v[k]=codec.bytesDataUrl(data.bytes,data.mime);}
      else await walk(c);
    }}
    if(module){result.locator=result.source||result.locator;delete result.source;delete result.manifestLocator;}await walk(result);
    if(module)return{id:result.manifest.id,version:+result.manifest.version,manifest:result.manifest,locator:result.locator};
    const frames=result.frames?.length?result.frames:[result];for(const f of frames){const data=codec.dataUrlBytes(f.locator);f.mime=data.mime!=='application/octet-stream'?data.mime:f.mime||result.mime||data.mime;f.locator=codec.bytesDataUrl(data.bytes,f.mime);}
    result.locator=frames[0].locator;result.mime=frames[0].mime;
    if(frames.length>1)result.frames=frames.map(f=>({locator:f.locator,mime:f.mime}));else delete result.frames;return result;
  }
  async function capture(scene,selection,options){
    options=options||{};const entries=new Map(),active=new Set();
    async function visit(ref){const k=key(ref);if(active.has(k))throw Error('资源依赖循环：'+k);if(entries.has(k))return k;active.add(k);let kind=ref.kind,payload,deps=[],name=ref.id;
      if(['asset','image','sequence'].includes(kind)){const a=scene.assets?.[ref.id];if(!a)throw Error('素材缺失：'+ref.id);name=a.name||name;kind=a.frames?.length>1?'sequence':'image';for(const dep of assetRefs(a))deps.push(await visit({kind:'asset',id:dep}));payload={asset:await portable(a,options,false)};}
      else if(kind==='module'){const d=scene.modules?.[ref.id];if(!d)throw Error('程序模块缺失：'+ref.id);for(const dep of moduleAssets(d))deps.push(await visit({kind:'asset',id:dep}));payload={descriptor:await portable(d,options,true)};name=d.manifest?.title||name;ref={...ref,version:+d.manifest.version};}
      else if(kind==='pattern'){const p=scene.patternResources?.[ref.id];if(!p)throw Error('图样预设缺失：'+ref.id);payload={preset:portablePreset(p)};if(p.mode==='path')for(const dep of pathAPI().references(p))deps.push(await visit(dep));name=(p.name||name)+(p.providerKey?' · v'+p.engineVersion:'');}
      else if(kind==='element'){const api=elementAPI(),p=scene.elementPresets?.[ref.id];if(!p)throw Error('元素预设缺失：'+ref.id);api.validateScene({...scene,elementPresets:{[ref.id]:p}});for(const dep of api.references(p))deps.push(await visit(dep));payload={preset:api.withPatternNames(scene,p)};name=p.name;}
      else throw Error('尚未适配的资源类型：'+kind);
      const record=await seal({kind,id:ref.id,version:ref.version||1,name,payload,dependencies:deps});active.delete(k);entries.set(key(record),record);return key(record);
    }
    const roots=[];for(const ref of selection)roots.push(await visit(ref));return pack(roots,[...entries.values()]);
  }
  function unique(map,base){let n=2,value=base;while(Object.hasOwn(map,value))value=base+'-'+n++;return value;}
  function rewriteAssets(value,mapping){if(!value||typeof value!=='object')return;for(const [k,v]of Object.entries(value)){if(/assetid$/i.test(k)&&typeof v==='string'&&mapping[v])value[k]=mapping[v];else rewriteAssets(v,mapping);}}
  async function importInto(scene,input){
    const p=await verify(input),draft=copy(scene),mapping={},patterns={},modules={},elements={},withModule=p.entries.some(r=>r.kind==='module');draft.assets=draft.assets||{};draft.modules=draft.modules||{};draft.patternResources=draft.patternResources||{};
    for(const r of p.entries)if(r.kind==='pattern'&&r.payload.preset.definition&&r.payload.preset.mode!=='path'&&r.payload.preset.definition.format!=='tosampool-pattern-generator/v1'){if(!global.EditorV4PatternLifecycle)throw Error('当前Host缺少图样定义生命周期');global.EditorV4PatternLifecycle.install(draft,r.payload.preset.definition,{createPreset:false});}
    for(const r of p.entries)if(['image','sequence'].includes(r.kind)){
      const prior=draft.assets[r.id],same=prior&&await digest(await portable(prior,{},false))===await digest(r.payload.asset);if(prior&&!same&&withModule)throw Error('程序资源依赖同名冲突，不能自动改写源码：'+r.id);mapping[r.id]=prior&&!same&&!withModule?unique(draft.assets,r.id):r.id;if(!prior||!same)draft.assets[mapping[r.id]]=copy(r.payload.asset);
    }
    for(const r of p.entries)if(['image','sequence'].includes(r.kind))rewriteAssets(draft.assets[mapping[r.id]],mapping);
    for(const r of p.entries)if(['image','sequence'].includes(r.kind)){const target=mapping[r.id];if(p.roots.includes(key(r)))delete draft.assets[target].libraryHidden;else if(!Object.hasOwn(scene.assets||{},target))draft.assets[target].libraryHidden=true;}
    for(const r of p.entries)if(r.kind==='module'){
      const d=copy(r.payload.descriptor),prior=draft.modules[r.id];if(prior&&await digest(await portable(prior,{},true))!==await digest(d))throw Error('程序模块同名内容冲突：'+r.id);draft.modules[r.id]=d;modules[r.id]=r.id;
    }else if(r.kind==='pattern'){const native=r.payload.preset.definition?.format==='tosampool-pattern-generator/v1'?pathAPI().fromGeneratorPreset(r.payload.preset):null,preset=native|| (r.payload.preset.mode==='path'?pathAPI().remapAssets(r.payload.preset,mapping):copy(r.payload.preset)),existing=patternId(draft,preset),target=existing||unique(draft.patternResources,r.id);draft.patternResources[target]=preset;patterns[r.id]=target;}
    for(const r of p.entries)if(r.kind==='element'){
      const preset=elementAPI().remapAssets(r.payload.preset,mapping);
      draft.elementPresets=draft.elementPresets||{};const prior=draft.elementPresets[r.id],same=prior&&await digest(prior)===await digest(preset),target=prior&&!same?unique(draft.elementPresets,r.id):r.id;
      draft.elementPresets[target]=preset;elements[r.id]=target;
    }
    for(const target of Object.values(elements))collectElementPatterns(draft,draft.elementPresets[target]);
    if(draft.elementPresets)elementAPI().validateScene(draft);
    draft.resourceOrigins=Object.assign({},draft.resourceOrigins||{},Object.fromEntries(p.roots.map(k=>[k,{packageHash:p.hash}])));
    // Commit only after every record and conflict has passed. No code runs here.
    for(const name of['assets','modules','patternResources','elementPresets','resourceOrigins','patternDefinitions','entities'])if(Object.hasOwn(draft,name))scene[name]=draft[name];return{assets:mapping,patterns,modules,elements,packageHash:p.hash};
  }
  function portablePreset(input){
    if(input.definition?.format==='tosampool-pattern-generator/v1')return pathAPI().fromGeneratorPreset(input);
    if(input.mode==='path')return pathAPI().normalize(input);
    const preset=copy(input),part={type:'custom',x:0,y:0,w:160,h:100,strokeWidth:preset.style?.width??3,recipe:{id:preset.engineId,version:preset.engineVersion,params:preset.params||{},...(preset.definition?{definition:preset.definition}:{}),...(preset.providerKey?{providerKey:preset.providerKey}:{})},geometrySnapshot:preset.geometrySnapshot};
    const runtime=global.ToSampoolRuntimeVNext.modules;part.recipe=runtime.customShapes.normalizePartRecipe(part);
    preset.params=part.recipe.params;if(part.recipe.definition)preset.definition=part.recipe.definition;if(part.recipe.providerKey)preset.providerKey=part.recipe.providerKey;preset.geometrySnapshot=runtime.patternSnapshots.capture(part);return preset;
  }
  // One parameter clipboard per stable generator identity; names/versions are not identities.
  function patternIdentity(preset){return preset.definition?.id||preset.engineId;}
  function patternId(scene,preset){return Object.keys(scene.patternResources||{}).find(key=>patternIdentity(scene.patternResources[key])===patternIdentity(preset))||null;}
  function collectElementPatterns(scene,input){
    const preset=elementAPI().validate(input),nodes=[preset.root,...preset.children||[],...preset.sources||[]];
    const draft={...scene,patternResources:{...scene.patternResources},patternDefinitions:{...scene.patternDefinitions}},scratch={...draft,entities:nodes};
    const ids=[];
    for(const owner of nodes)for(const part of [owner,...owner.parts||[]]){
      for(const engine of global.EditorV4PatternRegistry?.attached(part)||[]){
        const p=pathAPI().fromPart(scratch,part,engine,{ownerId:owner.id,name:preset.patternNames?.[engine]});
        const existing=patternId(draft,p);ids.push(existing||addPattern(draft,{id:engine+'-preset',...p}));
      }
      if(part.type==='custom'&&part.recipe){
        const r=part.recipe,p={engineId:r.id,engineVersion:r.version,params:r.params,definition:r.definition,providerKey:r.providerKey,name:preset.patternNames?.[r.id]||part.name||r.definition?.name||r.id,
          style:{color:part.stroke,width:part.strokeWidth,alpha:part.strokeAlpha},geometrySnapshot:part.geometrySnapshot};
        if(r.definition)global.EditorV4PatternLifecycle.install(draft,r.definition,{createPreset:false});
        ids.push(patternId(draft,p)||addPattern(draft,{id:r.id+'-preset',...p}));
      }
    }
    if(ids.length){scene.patternResources=draft.patternResources;scene.patternDefinitions=draft.patternDefinitions;}
    return [...new Set(ids)];
  }
  function addPattern(scene,input){const name=id(input.id),preset=input.mode==='path'?portablePreset({mode:'path',name:input.name,engineId:input.engineId,engineVersion:input.engineVersion??1,params:input.params,carrier:input.carrier, ...(input.source?{source:input.source}:{}),...(input.definition?{definition:input.definition}:{})}):portablePreset({name:String(input.name||name),engineId:input.engineId,engineVersion:input.engineVersion||1,params:input.params||{},style:copy(input.style||{}),geometrySnapshot:input.geometrySnapshot,definition:input.definition,providerKey:input.providerKey});scene.patternResources=scene.patternResources||{};const target=patternId(scene,preset)||unique(scene.patternResources,name);scene.patternResources[target]=preset;return target;}
  function createPatternPart(scene,presetId,geometry){
    const preset=scene.patternResources?.[presetId];if(!preset)throw Error('图样预设缺失：'+presetId);
    if(preset.mode==='path'){
      const carrier=pathAPI().carrier(preset.carrier),p=Object.assign({type:carrier.type,name:preset.name,x:0,y:0,w:160,h:100,stroke:'#ffd23f',strokeWidth:3,fill:null,...(carrier.type==='line'?{x2:160,y2:0}:{}),...(carrier.type==='stroke'?{points:[[0,0],[160,100]]}:{}),...(carrier.polygonMode?{polygonMode:carrier.polygonMode,sides:carrier.sides,...(carrier.polygonMode==='free'?{points:[[0,1],[.5,0],[1,1]]}:{})}:{})},copy(geometry||{}));
      pathAPI().apply(scene,preset,p);if(['corner-arrows','brackets'].includes(preset.engineId))p.extensions.showSource=false;p.resourceBindings={...p.resourceBindings,pattern:presetId};return p;
    }
    const p=Object.assign({type:'custom',name:preset.name,x:0,y:0,w:160,h:100,stroke:'#ffd23f',strokeWidth:3,fill:null},copy(geometry||{}));
    p.name=preset.name||p.name||preset.engineId;
    p.type='custom';p.fill=null;delete p.fillPaint;delete p.fillPattern;delete p.radius;delete p.extensions;
    p.stroke=p.stroke||geometry?.fill||'#ffd23f';if(preset.style?.width==null)p.strokeWidth=Math.max(1,+p.strokeWidth||3);
    p.recipe={id:preset.engineId,version:preset.engineVersion,params:copy(preset.params||{}),...(preset.definition?{definition:copy(preset.definition)}:{}),...(preset.providerKey?{providerKey:preset.providerKey}:{})};
    if(preset.definition?.format==='tosampool-pattern-generator/v1'&&['rect','ellipse','poly'].includes(geometry?.type)){p.recipe.params.carrier=geometry.type==='poly'?(geometry.polygonMode==='regular'?'regular':'free'):geometry.type;p.generatorRadius=Math.max(0,+geometry.radius||0);}
    if(preset.style?.color)p.stroke=preset.style.color;if(preset.style?.width!=null)p.strokeWidth=preset.style.width;if(preset.style?.alpha!=null)p.strokeAlpha=preset.style.alpha;
    if(preset.geometrySnapshot)p.geometrySnapshot=copy(preset.geometrySnapshot);
    p.recipe=global.ToSampoolRuntimeVNext.modules.customShapes.normalizePartRecipe(p);p.resourceBindings={pattern:presetId};return p;
  }
  function inspect(scene){const issues=[];for(const id of assetRefs({entities:scene.entities,background:scene.background,sceneEffects:scene.sceneEffects,timeline:scene.timeline}))if(!scene.assets?.[id])issues.push({kind:'asset',id,reason:'missing'});for(const e of scene.entities||[]){if(e.type==='procedural'){const d=scene.modules?.[e.moduleId];if(!d)issues.push({kind:'module',id:e.moduleId,reason:'missing'});else{if(+d.manifest?.version!==+(e.moduleVersion||1))issues.push({kind:'module',id:e.moduleId,reason:'version'});for(const id of moduleAssets(d))if(!scene.assets?.[id])issues.push({kind:'asset',id,reason:'missing'});}}for(const p of e.parts||[])if(p.type==='custom')try{const shapes=global.ToSampoolRuntimeVNext?.modules.customShapes;if(!shapes)throw Error('缺少图样校验器');shapes.normalizePartRecipe({...p});if(!shapes.supports(p.recipe))issues.push({kind:'pattern',id:p.recipe.id,reason:'cached'});}catch(error){issues.push({kind:'pattern',id:p.recipe?.id,reason:'unsupported',detail:error.message});}}return issues;}
  async function index(scene,options){const refs=[...Object.keys(scene.assets||{}).map(id=>({kind:'asset',id})),...Object.entries(scene.modules||{}).map(([id,d])=>({kind:'module',id,version:+d.manifest?.version||1})),...Object.keys(scene.patternResources||{}).map(id=>({kind:'pattern',id})),...Object.keys(scene.elementPresets||{}).map(id=>({kind:'element',id}))];if(!refs.length)return[];const p=await capture(scene,refs,options);return p.entries.map(r=>({key:key(r),id:r.id,kind:r.kind,version:r.version,hash:r.hash,dependencies:r.dependencies}));}
  global.EditorV4Resources=Object.freeze({FORMAT,RECORD,limits,key,digest,seal,pack,verify,capture,importInto,patternIdentity,patternId,collectElementPatterns,addPattern,createPatternPart,inspect,index});
})(typeof window!=='undefined'?window:globalThis);
