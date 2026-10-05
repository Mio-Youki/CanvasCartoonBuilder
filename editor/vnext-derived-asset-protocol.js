/* Runtime-free contract for host-produced transparent cutouts and motion
 * sequences. It deliberately transfers pixels as data URLs, never a local
 * path, model key, or a mutable Scene reference. */
(function (global) {
  'use strict';

  const FORMAT='tosampool-derived-asset/v1',PLAN_FORMAT='tosampool-derived-asset-plan/v1';
  const REQUEST_FORMAT='tosampool-derived-asset-request/v1';
  const KINDS=Object.freeze(['semantic-cutout','alpha-mask','pose-sequence','motion-sequence','generated-variant']);
  const SEQUENCE_KINDS=new Set(['pose-sequence','motion-sequence']);
  const ALPHA_KINDS=new Set(['semantic-cutout','alpha-mask','pose-sequence']);
  const clean=value=>String(value==null?'':value).trim();
  const imageData=value=>/^data:image\/(?:png|webp);base64,/i.test(clean(value));
  const safeId=value=>clean(value).toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');
  const clone=value=>JSON.parse(JSON.stringify(value));
  function normalizedRoi(raw){
    if(raw==null)return null;raw=raw||{};const x=+raw.x,y=+raw.y,w=+raw.w,h=+raw.h;
    if(![x,y,w,h].every(Number.isFinite)||x<0||y<0||w<=0||h<=0||x+w>1.00001||y+h>1.00001)throw new Error('派生计划的位置必须是图源内的归一化框选');
    return Object.freeze({x,y,w,h});
  }

  function plan(input){
    input=input||{};const sources=Array.isArray(input.sources)?input.sources:[],sourceIds=new Set(sources.map(source=>clean(source&&source.id)).filter(Boolean));
    const tasks=(Array.isArray(input.tasks)?input.tasks:[]).map((raw,index)=>{raw=raw||{};const kind=KINDS.includes(clean(raw.kind))?clean(raw.kind):'';const sourceReferenceId=clean(raw.sourceReferenceId),semantic=clean(raw.semantic),id=safeId(raw.id)||`derive-${index+1}`;
      if(!kind||!semantic||!sourceReferenceId||!sourceIds.has(sourceReferenceId))throw new Error('派生计划的每项必须引用一张 source 参考图，并说明类型与主体');
      return Object.freeze({id,title:clean(raw.title)||semantic,sourceReferenceId,kind,semantic,roi:normalizedRoi(raw.roi),occlusionRepair:raw.occlusionRepair===true,preserve:clean(raw.preserve),frameCount:SEQUENCE_KINDS.has(kind)?Math.max(2,Math.min(24,Math.round(+raw.frameCount||2))):1,notes:clean(raw.notes),risk:clean(raw.risk)});
    });
    const value={format:clean(input.format)||PLAN_FORMAT,version:+input.version||1,title:clean(input.title)||'派生素材计划',summary:clean(input.summary),tasks:Object.freeze(tasks)};
    if(value.format!==PLAN_FORMAT||!value.summary||!value.tasks.length)throw new Error('派生计划必须说明目标并至少包含一项任务');return Object.freeze(value);
  }

  function task(input) {
    input=input||{};const kind=KINDS.includes(clean(input.kind))?clean(input.kind):'';
    const source=input.source&&typeof input.source==='object'?clone(input.source):null;
    const frameCount=SEQUENCE_KINDS.has(kind)?Math.max(2,Math.min(24,Math.round(+input.frameCount||2))):1;
    const value={format:REQUEST_FORMAT,version:1,id:safeId(input.id)||`derive-${Date.now().toString(36)}`,kind,semantic:clean(input.semantic),source,frameCount,notes:clean(input.notes),anchor:input.anchor&&Number.isFinite(+input.anchor.x)&&Number.isFinite(+input.anchor.y)?Object.freeze({x:+input.anchor.x,y:+input.anchor.y}):Object.freeze({x:.5,y:1})};
    if(!kind)throw new Error('派生素材任务必须选择有效类型');
    if(!value.semantic)throw new Error('派生素材任务必须说明要保留的主体');
    if(!source||!imageData(source.dataUrl)||!clean(source.assetId))throw new Error('派生素材任务必须使用冻结的图片参考');
    return Object.freeze(value);
  }
  function result(input, expected) {
    input=input||{};const taskValue=expected&&expected.format===REQUEST_FORMAT?expected:task(expected);
    if(clean(input.format)!==FORMAT||clean(input.taskId)!==taskValue.id)throw new Error('派生素材结果不属于当前任务');
    const raw=input.asset&&typeof input.asset==='object'?input.asset:{};
    const frames=(Array.isArray(raw.frames)?raw.frames:[]).map(frame=>({locator:clean(frame&&frame.locator),mime:clean(frame&&frame.mime)||'image/png'}));
    if(frames.length!==taskValue.frameCount)throw new Error(`派生素材应返回 ${taskValue.frameCount} 帧，实际为 ${frames.length} 帧`);
    for(const frame of frames)if(!imageData(frame.locator))throw new Error('派生素材帧必须是内嵌 PNG 或 WebP 数据');
    const width=Math.max(1,Math.round(+raw.width||0)),height=Math.max(1,Math.round(+raw.height||0));
    if(!width||!height)throw new Error('派生素材必须声明统一帧尺寸');
    const derivation=raw.derivation&&typeof raw.derivation==='object'?clone(raw.derivation):{};
    if(clean(derivation.kind)!==taskValue.kind||clean(derivation.semantic)!==taskValue.semantic)throw new Error('派生素材的 derivation 必须与任务类型和主体一致');
    if(ALPHA_KINDS.has(taskValue.kind)&&derivation.alpha!==true)throw new Error('该派生素材必须显式声明透明 Alpha');
    derivation.anchor=derivation.anchor&&Number.isFinite(+derivation.anchor.x)&&Number.isFinite(+derivation.anchor.y)?{x:+derivation.anchor.x,y:+derivation.anchor.y}:clone(taskValue.anchor);
    derivation.method=clean(derivation.method)||'host-derived';
    if(taskValue.frameCount>1){derivation.frameSemantics=Array.isArray(derivation.frameSemantics)?derivation.frameSemantics.map(clean).filter(Boolean):[];if(derivation.frameSemantics.length!==taskValue.frameCount)throw new Error('姿态/动作序列必须为每一帧声明语义');}
    const assetId=safeId(raw.id)||safeId(`${taskValue.source.assetId}-${taskValue.kind}`);
    return Object.freeze({format:FORMAT,version:1,taskId:taskValue.id,asset:Object.freeze({id:assetId,name:clean(raw.name)||assetId,width,height,mime:clean(raw.mime)||frames[0].mime,locator:frames[0].locator,frames:frames.length>1?Object.freeze(frames):null,fps:frames.length>1?Math.max(.1,Math.min(60,+raw.fps||2)):0,frameLoop:raw.frameLoop!==false,sourceAssetId:taskValue.source.assetId,derivation:Object.freeze(derivation)})});
  }
  global.EditorVNextDerivedAssetProtocol=Object.freeze({FORMAT,PLAN_FORMAT,REQUEST_FORMAT,KINDS,plan,task,result});
})(typeof window!=='undefined'?window:globalThis);
