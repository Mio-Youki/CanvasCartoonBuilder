/* Draft Package v1 boundary. Hosts may store these files in a temporary
 * directory, ZIP, or memory; the editor sees only a validated package. */
(function (global) {
  'use strict';

  const FORMAT='tosampool-agent-draft/v1', CARRIER_FORMAT='tosampool-carrier-report/v1', PROJECT_FORMAT='tosampool-project/v1', SCENE_FORMAT='tosampool-scene/v4';
  const encoder=new TextEncoder(),decoder=new TextDecoder();
  const ENTITY_TYPES=new Set(['rect','ellipse','line','poly','stroke','vector','text','image','group','builtin','procedural','particle-emitter']);
  const clean=value=>String(value==null?'':value).trim();
  const DERIVATION_KINDS=new Set(['semantic-cutout','alpha-mask','pose-sequence','motion-sequence','generated-variant']);
  const safePath=value=>{
    const path=clean(value).replace(/\\/g,'/').replace(/^\.\//,'');
    if(!path||path.startsWith('/')||path.split('/').some(part=>!part||part==='.'||part==='..'))throw new Error(`草稿包包含不安全路径「${value}」`);
    return path;
  };
  const asText=file=>typeof file.data==='string'?file.data:decoder.decode(file.data instanceof Uint8Array?file.data:new Uint8Array(file.data||[]));
  function indexFiles(files){
    const map=new Map();
    for(const input of files||[]){if(!input||!input.path)throw new Error('草稿包存在没有路径的文件');const path=safePath(input.path);if(map.has(path))throw new Error(`草稿包包含重复文件「${path}」`);map.set(path,Object.freeze({path,data:input.data,mime:clean(input.mime)||'application/octet-stream'}));}
    return map;
  }
  function readJson(map,path,label){
    const file=map.get(safePath(path));if(!file)throw new Error(`草稿包缺少${label}「${path}」`);try{return JSON.parse(asText(file));}catch(_){throw new Error(`${label}「${path}」不是有效 JSON`);}
  }
  function report(raw){
    raw=raw||{};const objects=Array.isArray(raw.objects)?raw.objects.map(item=>{
      const value={id:clean(item&&item.id),semantic:clean(item&&item.semantic),carrier:clean(item&&item.carrier),editable:Array.isArray(item&&item.editable)?item.editable.map(clean).filter(Boolean):[],frozen:Array.isArray(item&&item.frozen)?item.frozen.map(clean).filter(Boolean):[],budget:item&&item.budget&&typeof item.budget==='object'?Object.freeze(Object.assign({tier:'medium',reason:''},item.budget)):Object.freeze({tier:'medium',reason:''})};
      if(!value.id||!value.semantic||!value.carrier)throw new Error('载体报告中的对象必须包含 id、semantic 与 carrier');return Object.freeze(value);
    }):[];
    if(clean(raw.format)!==CARRIER_FORMAT)throw new Error('草稿包载体报告格式无效');
    if(!objects.length)throw new Error('载体报告至少要声明一个 objects[] 项');
    return Object.freeze({format:CARRIER_FORMAT,version:Number.isInteger(+raw.version)?+raw.version:1,objects:Object.freeze(objects),notes:clean(raw.notes)});
  }
  function validRange(value){return Array.isArray(value)&&value.length===2&&Number.isFinite(+value[0])&&Number.isFinite(+value[1])&&+value[0]>=0&&+value[1]<=1&&+value[1]>=+value[0];}
  function validateSceneTransport(scene,map){
    const entities=Array.isArray(scene&&scene.entities)?scene.entities:[];
    const assets=scene&&scene.assets&&typeof scene.assets==='object'?scene.assets:{};
    for(const [assetId,descriptor] of Object.entries(assets)){
      if(!descriptor||typeof descriptor!=='object')throw new Error(`草稿素材「${assetId}」必须是对象`);
      const sourceAssetId=clean(descriptor.sourceAssetId);
      if(sourceAssetId&&sourceAssetId===assetId)throw new Error(`派生素材「${assetId}」不能引用自身作为 sourceAssetId`);
      if(sourceAssetId&&!assets[sourceAssetId])throw new Error(`派生素材「${assetId}」引用不存在的源素材「${sourceAssetId}」`);
      const derivation=descriptor.derivation;
      if(sourceAssetId&&(!derivation||typeof derivation!=='object'))throw new Error(`派生素材「${assetId}」必须声明 derivation，说明它如何从源素材得到`);
      if(derivation&&typeof derivation==='object'){
        const kind=clean(derivation.kind),semantic=clean(derivation.semantic);
        if(!DERIVATION_KINDS.has(kind))throw new Error(`派生素材「${assetId}」使用未知 derivation.kind「${kind||'(空)'}」`);
        if(!semantic)throw new Error(`派生素材「${assetId}」必须声明 derivation.semantic`);
        if(['semantic-cutout','alpha-mask','pose-sequence'].includes(kind)&&derivation.alpha!==true)throw new Error(`派生素材「${assetId}」的 ${kind} 必须明确声明 alpha:true`);
        if(['pose-sequence','motion-sequence'].includes(kind)&&!Array.isArray(descriptor.frames))throw new Error(`派生素材「${assetId}」的 ${kind} 必须使用有序 frames[]`);
      }
      const locator=clean(descriptor.locator);
      if(!locator)throw new Error(`草稿素材「${assetId}」必须使用 locator；不要使用旧式 src`);
      if(!/^data:/i.test(locator)){
        const path=safePath(locator);
        if(!map.has(path))throw new Error(`草稿素材「${assetId}」缺少对应文件「${path}」`);
      }
      const frames=Array.isArray(descriptor.frames)?descriptor.frames:[];
      for(const [index,frame] of frames.entries()){
        const frameLocator=clean(frame&&frame.locator);
        if(!frameLocator)throw new Error(`草稿素材「${assetId}」的第 ${index+1} 帧必须使用 locator`);
        if(!/^data:/i.test(frameLocator)&&!map.has(safePath(frameLocator)))throw new Error(`草稿素材「${assetId}」缺少帧文件「${frameLocator}」`);
      }
    }
    const ids=new Set();
    for(const entity of entities){
      if(!entity||!clean(entity.id))throw new Error('草稿 Scene 的每个实体必须具有稳定 id');
      if(ids.has(entity.id))throw new Error(`草稿 Scene 包含重复实体 id「${entity.id}」`);ids.add(entity.id);
      if(!ENTITY_TYPES.has(clean(entity.type)))throw new Error(`草稿实体「${entity.id}」使用不支持的 type「${entity.type}」`);
    }
    for(const entity of entities){
      if(entity.type==='particle-emitter'){
        const particle=entity.particle;
        if(!particle||typeof particle!=='object'||!clean(particle.sourceId))throw new Error(`粒子发射器「${entity.id}」必须声明 particle.sourceId`);
        if(!ids.has(particle.sourceId))throw new Error(`粒子发射器「${entity.id}」引用不存在的 sourceId「${particle.sourceId}」`);
      }
      if(entity.type==='procedural'){
        const moduleId=clean(entity.moduleId),descriptor=scene.modules&&scene.modules[moduleId];
        if(!moduleId||!descriptor||typeof descriptor!=='object')throw new Error(`程序实体「${entity.id}」缺少对应项目 Module「${moduleId||'(空)'}」`);
      }
    }
    for(const [moduleId,descriptor] of Object.entries(scene.modules||{})){
      const locator=safePath(descriptor&&descriptor.locator),manifestLocator=safePath(descriptor&&descriptor.manifestLocator);
      if(!map.has(locator)||!map.has(manifestLocator))throw new Error(`项目 Module「${moduleId}」缺少源或 Manifest 文件`);
      let manifest;try{manifest=JSON.parse(asText(map.get(manifestLocator)));}catch(_){throw new Error(`项目 Module「${moduleId}」的 Manifest 不是有效 JSON`);}
      if(!manifest||clean(manifest.format)!=='tosampool-scene-module/v1'||clean(manifest.id)!==moduleId||!Number.isInteger(+manifest.version))throw new Error(`项目 Module「${moduleId}」的 Manifest 无效或与模块 id 不匹配`);
      for(const assetId of Array.isArray(manifest.assets)?manifest.assets:[])if(!assets[assetId])throw new Error(`项目 Module「${moduleId}」声明了不存在的素材「${assetId}」`);
      try{new Function(asText(map.get(locator)));}catch(error){throw new Error(`项目 Module「${moduleId}」源代码语法无效：${error&&error.message||error}`);}
    }
    const visibility=scene.timeline&&scene.timeline.visibility||{};
    for(const [id,track] of Object.entries(visibility)){
      if(!ids.has(id))throw new Error(`显示时段引用不存在的实体「${id}」`);
      const segments=track&&track.segments;if(!Array.isArray(segments))throw new Error(`实体「${id}」的显示时段必须为 segments 数组`);
      for(const segment of segments)if(!segment||typeof segment!=='object'||!validRange(segment.f)||typeof segment.visible!=='boolean')throw new Error(`实体「${id}」的显示时段必须使用 {f:[0..1],visible:boolean}`);
      const ordered=segments.slice().sort((a,b)=>+a.f[0]-+b.f[0]);
      if(ordered.length&&Math.abs(+ordered[0].f[0])>.000001||ordered.length&&Math.abs(+ordered[ordered.length-1].f[1]-1)>.000001)throw new Error(`实体「${id}」的显示时段必须显式覆盖完整 0..1 范围`);
      for(let index=1;index<ordered.length;index+=1)if(Math.abs(+ordered[index-1].f[1]-+ordered[index].f[0])>.000001)throw new Error(`实体「${id}」的显示时段不得留有隐式可见缺口`);
    }
  }
  function inspect(files){
    const map=indexFiles(files),manifest=readJson(map,'draft.manifest.json','草稿 Manifest');
    if(clean(manifest.format)!==FORMAT||+manifest.version!==1)throw new Error('不是有效的 Draft Package v1');
    const draftId=clean(manifest.draftId),title=clean(manifest.title),summary=clean(manifest.summary),projectPath=safePath(manifest.project||'project.tosampool.json'),carrierPath=safePath(manifest.carrierReport||'carrier-report.json');
    if(!draftId||!title||!summary)throw new Error('草稿 Manifest 必须包含 draftId、title 与 summary');
    const project=readJson(map,projectPath,'项目文件');
    if(!project||project.format!==PROJECT_FORMAT||!project.scene||project.scene.format!==SCENE_FORMAT)throw new Error('草稿项目必须包含有效的 v4 Scene');
    validateSceneTransport(project.scene,map);const carrier=report(readJson(map,carrierPath,'载体报告'));
    const entityIds=new Set((project.scene.entities||[]).map(entity=>clean(entity&&entity.id)).filter(Boolean));
    for(const item of carrier.objects)if(!entityIds.has(item.id))throw new Error(`载体报告引用不存在的 Scene 实体「${item.id}」`);
    const preview=manifest.preview?safePath(manifest.preview):null,metrics=manifest.metrics?safePath(manifest.metrics):null;
    if(preview&&!map.has(preview))throw new Error(`草稿 Manifest 指向的预览不存在「${preview}」`);
    if(metrics&&!map.has(metrics))throw new Error(`草稿 Manifest 指向的指标不存在「${metrics}」`);
    const changes=Array.isArray(manifest.changes)?manifest.changes.map(clean).filter(Boolean):[];
    return Object.freeze({format:FORMAT,version:1,draftId,title,summary,changes:Object.freeze(changes),projectPath,carrierPath,preview,metrics,project:Object.freeze(project),scene:Object.freeze(project.scene),carrier,files:map});
  }
  function manifest(input){
    input=input||{};const result={format:FORMAT,version:1,draftId:clean(input.draftId),title:clean(input.title),summary:clean(input.summary),changes:Array.isArray(input.changes)?input.changes.map(clean).filter(Boolean):[],project:safePath(input.project||'project.tosampool.json'),carrierReport:safePath(input.carrierReport||'carrier-report.json')};
    if(input.preview)result.preview=safePath(input.preview);if(input.metrics)result.metrics=safePath(input.metrics);
    if(!result.draftId||!result.title||!result.summary)throw new Error('草稿 Manifest 必须包含 draftId、title 与 summary');return Object.freeze(result);
  }
  function jsonFile(path,value){return Object.freeze({path:safePath(path),data:JSON.stringify(value,null,2),mime:'application/json'});}
  global.EditorVNextAgentDraftPackage=Object.freeze({FORMAT,CARRIER_FORMAT,PROJECT_FORMAT,SCENE_FORMAT,DERIVATION_KINDS,safePath,indexFiles,report,manifest,inspect,jsonFile});
})(typeof window!=='undefined'?window:globalThis);
