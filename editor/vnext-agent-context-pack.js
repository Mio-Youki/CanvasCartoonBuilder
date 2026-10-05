/* Frozen, Runtime-free authoring context for an external ToSampool Agent.
 * This is an affordance map, not a whitelist of visual outcomes. */
(function (global) {
  'use strict';

  const FORMAT='tosampool-agent-context/v2',REFERENCE_FORMAT='tosampool-agent-reference/v2',CANVAS_FORMAT='tosampool-agent-canvas-context/v1',REFERENCE_ROLES=Object.freeze(['source','style','composition','subject','motion']),BASES=Object.freeze(['blank','selected-assets','current-scene']),clean=value=>String(value==null?'':value).trim(),clone=value=>JSON.parse(JSON.stringify(value));
  const CARRIERS=Object.freeze([
    Object.freeze({id:'native',title:'语义对象与图元',useWhen:'主体、前景、可选择层或需要直接重排的内容。',avoidWhen:'高密度静态细节需要拆成大量无意义图元。',editable:['位置','尺寸','旋转','透明度','蒙版','加样','采样','显示时段'],delivery:'scene.entities'}),
    Object.freeze({id:'particle',title:'确定性粒子',useWhen:'雪、雨、气泡、落叶、火星等大量重复的短生命周期现象。',avoidWhen:'必须逐颗编辑或需以粒子代替主要构图。',editable:['数量','速度','方向','范围','随机种子','显示时段'],delivery:'scene.entities[type=particle-emitter]'}),
    Object.freeze({id:'image-layer',title:'图片对象',useWhen:'用户许可的照片、拼贴素材或保真底图。',avoidWhen:'把完整场景图伪装成可编辑结构。',editable:['裁切','蒙版','对象效果','采样','显示时段'],delivery:'scene.assets + image entity'}),
    Object.freeze({id:'scene-module',title:'项目 Scene Module',useWhen:'作品独有的程序细节、像素绘制或有机形态；内部不值得逐图元编辑。',avoidWhen:'只为逃避普通对象编辑，或跨项目承诺复用的通用能力。',editable:['外层变换','蒙版','对象效果','显示时段','Manifest 公开参数'],delivery:'scene.modules + procedural entities',requires:['deterministic render','manifest','public parameters','declared asset dependencies']}),
    Object.freeze({id:'hybrid',title:'混合结构',useWhen:'高细节主景与独立前景/粒子/文字需共同编辑。',avoidWhen:'没有说明各部分边界与冻结内容。',editable:['按各载体分别声明'],delivery:'scene + optional project module'})
  ]);
  const CREATIVE_FAMILIES=Object.freeze([
    Object.freeze({id:'formation',title:'成样',intent:'构图、变换、填充、文字、对象调色与基础动态。'}),
    Object.freeze({id:'mask',title:'蒙版',intent:'限定对象或场景效果的作用范围；可使用静态形状、Alpha 或引用对象。'}),
    Object.freeze({id:'decorate',title:'加样',intent:'投影、描边、颜色/纹理叠加、内外光效等附着式处理。'}),
    Object.freeze({id:'sample',title:'采样',intent:'像素、颜色映射、阈值、网点、不均采样与采样运动。'}),
    Object.freeze({id:'timeline',title:'时序',intent:'显示时段、Step 参数覆层与允许的 Linear 变换；不是逐帧动画要求。'})
  ]);
  const QUALITY_GATES=Object.freeze([
    '先交付载体计划：每个主要语义对象须写明 carrier、可编辑项、冻结项与选择理由。',
    '不得把整张完成画面作为图片对象后仍宣称主要场景可编辑。',
    'Module 必须是项目级、确定性、带 Manifest 的受信任候选；不得依赖网络、宿主或任意 Scene 写入。',
    '所有结果必须是完整 Draft Package；不得直接修改当前项目。',
    '必须通过结构校验、固定时间 Runtime 渲染，并对循环边界与 Scene 转场给出说明。',
    '生成后只依据预览和验证结果迭代；Runtime 缺口另开 run，不在作品 run 中暗改。'
  ]);

  function brief(input){
    input=input||{};const intent=input.intent||{},dimensions=intent.dimensions||input.dimensions||{};
    const value={subject:clean(intent.subject||input.subject),mustKeep:clean(intent.mustKeep||input.mustKeep),notes:clean(intent.notes||input.notes),control:clean(intent.control||input.control)||'semantic',assetPolicy:clean(intent.assetPolicy||input.assetPolicy)||'agent-ok',dimensions:{width:Math.max(1,Math.round(+dimensions.width||1920)),height:Math.max(1,Math.round(+dimensions.height||1080))},loop:Math.max(.001,+intent.loop||+input.loop||12),beats:Array.isArray(input.beats)?input.beats.map(item=>({id:clean(item&&item.id),from:+(item&&item.from)||0,to:+(item&&item.to)||0,summary:clean(item&&item.summary)})).filter(item=>item.id&&item.summary):[]};
    if(!value.subject)throw new Error('Context Pack 必须包含用户的场景意图。');return Object.freeze(value);
  }
  function creativeDirection(input){
    const raw=input&&input.creativeDirection||{},list=value=>Array.isArray(value)?value.map(clean).filter(Boolean):[],beats=Array.isArray(raw.seasonBeats)?raw.seasonBeats.map(item=>({sceneId:clean(item&&item.sceneId),focus:clean(item&&item.focus)})).filter(item=>item.sceneId&&item.focus):[];
    return Object.freeze({format:'tosampool-creative-direction/v1',version:1,title:clean(raw.title),visualAnchor:clean(raw.visualAnchor),composition:list(raw.composition),seasonBeats:Object.freeze(beats),motion:list(raw.motion),avoid:list(raw.avoid),selfReview:list(raw.selfReview)});
  }
  function reference(raw){
    raw=raw||{};const path=clean(raw.path).replace(/\\/g,'/').replace(/^\.\//,''),dataUrl=clean(raw.dataUrl),role=REFERENCE_ROLES.includes(clean(raw.role))?clean(raw.role):'style';
    if(path&&!/^input\/(?:references\/)?[A-Za-z0-9._-]+$/.test(path))throw new Error('Context Pack 的参考图必须位于 run/input/ 或 run/input/references/ 中');
    if(dataUrl&&!/^data:image\/(?:png|jpeg|webp);base64,/i.test(dataUrl))throw new Error('Context Pack 的浏览器参考图必须是冻结图片数据');
    const value={format:clean(raw.format)||REFERENCE_FORMAT,version:+raw.version||2,id:clean(raw.id),assetId:clean(raw.assetId),name:clean(raw.name),role,useAsMaterial:raw.useAsMaterial===true,path:path||null,dataUrl:dataUrl||null,mime:clean(raw.mime)||'image/png',width:Math.max(1,Math.round(+raw.width||0)),height:Math.max(1,Math.round(+raw.height||0)),source:clean(raw.source)||'user-supplied'};
    if(value.format!==REFERENCE_FORMAT||value.version!==2||!value.id||!value.name||(!value.path&&!value.dataUrl))throw new Error('参考图必须声明稳定 id、名称、角色和冻结输入');return Object.freeze(value);
  }
  function references(input){
    const raw=input&&Array.isArray(input.references)?input.references:input&&input.reference?[input.reference]:[],values=raw.map(reference),seen=new Set();
    for(const item of values){if(seen.has(item.id))throw new Error(`参考图 id 重复：${item.id}`);seen.add(item.id);}return Object.freeze(values);
  }
  function canvasContext(input){
    const raw=input&&input.canvasContext;if(!raw)return null;const base=BASES.includes(clean(raw.base))?clean(raw.base):'current-scene',scope=raw.scope&&raw.scope.type==='selection'?'selection':'scene',ids=scope==='selection'&&Array.isArray(raw.scope.ids)?raw.scope.ids.map(clean).filter(Boolean):[];
    const revision=Math.max(0,Math.round(+raw.sceneRevision||0)),scene=raw.sceneSnapshot&&typeof raw.sceneSnapshot==='object'?clone(raw.sceneSnapshot):null,preview=raw.preview&&typeof raw.preview==='object'?clone(raw.preview):null;
    if(base==='current-scene'&&!scene)throw new Error('当前画布上下文必须包含冻结 Scene 快照');
    if(scope==='selection'&&!ids.length)throw new Error('选择作用域必须包含稳定对象 id');
    if(preview&&preview.url&&!/^data:image\/(?:png|jpeg|webp);base64,/i.test(clean(preview.url)))throw new Error('画布预览必须是冻结图片数据');
    return Object.freeze({format:CANVAS_FORMAT,version:1,base,sceneRevision:revision,scope:Object.freeze({type:scope,ids:Object.freeze(ids)}),summary:raw.summary&&typeof raw.summary==='object'?Object.freeze(clone(raw.summary)):Object.freeze({}),hierarchy:Object.freeze(Array.isArray(raw.hierarchy)?clone(raw.hierarchy):[]),assets:Object.freeze(Array.isArray(raw.assets)?clone(raw.assets):[]),selectedAssetSnapshot:raw.selectedAssetSnapshot&&typeof raw.selectedAssetSnapshot==='object'?Object.freeze(clone(raw.selectedAssetSnapshot)):Object.freeze({}),sceneSnapshot:scene?Object.freeze(scene):null,preview:preview?Object.freeze(preview):null});
  }
  function freezeCanvas(scene,options){
    options=options||{};if(!scene||scene.format!=='tosampool-scene/v4')throw new Error('画布上下文需要有效的 v4 Scene');
    const base=BASES.includes(clean(options.base))?clean(options.base):'current-scene',selectedIds=Array.isArray(options.selectedIds)?options.selectedIds.map(clean).filter(Boolean):[],scopeType=options.scope==='selection'&&selectedIds.length?'selection':'scene',snapshot=clone(scene);delete snapshot._moduleScope;for(const asset of Object.values(snapshot.assets||{}))if(asset&&typeof asset==='object')delete asset._asset;
    const entities=Array.isArray(scene.entities)?scene.entities:[],assetIds=Array.isArray(options.assetIds)?options.assetIds.map(clean).filter(Boolean):[];
    const hierarchy=entities.map(item=>({id:clean(item&&item.id),name:clean(item&&item.name)||clean(item&&item.id),type:clean(item&&item.type)||'object',parentId:clean(item&&item.parentId)||null,partCount:Array.isArray(item&&item.parts)?item.parts.length:0,selected:selectedIds.includes(clean(item&&item.id))})).filter(item=>item.id);
    const assets=Object.entries(scene.assets||{}).map(([id,item])=>({id,name:clean(item&&item.name)||id,kind:Array.isArray(item&&item.frames)&&item.frames.length>1?'sequence':'image',width:Math.max(1,Math.round(+item.width||1)),height:Math.max(1,Math.round(+item.height||1)),selected:assetIds.includes(id)})),selectedAssetSnapshot={};for(const id of assetIds)if(snapshot.assets&&snapshot.assets[id])selectedAssetSnapshot[id]=snapshot.assets[id];
    return canvasContext({canvasContext:{base,sceneRevision:options.sceneRevision,scope:{type:scopeType,ids:selectedIds},summary:{width:Math.max(1,Math.round(+scene.width||1)),height:Math.max(1,Math.round(+scene.height||1)),loop:Math.max(.001,+scene.loop||1),entityCount:entities.length,sceneCount:scene.timeline&&Array.isArray(scene.timeline.scenes)?scene.timeline.scenes.length:0,selectedCount:selectedIds.length,selectedAssetCount:assetIds.length},hierarchy,assets,selectedAssetSnapshot,sceneSnapshot:base==='current-scene'?snapshot:null,preview:options.preview||null}});
  }
  function moduleContract(){return Object.freeze({format:'tosampool-scene-module/v1',required:['id','version','title','parameters','timeDependent','performance tier','render()'],publicParameterRule:'只公开人类会实际修改的语义参数；不要将内部几何、随机中间量或代码细节伪装为可编辑能力。',coordinateSystem:'render() 的局部原点在对象中心：可见范围为 x=-width/2..width/2、y=-height/2..height/2；不得把项目画布的绝对坐标直接用于 Module。',sceneObjectCoordinateSystem:'Scene 顶层实体的 x/y 是未变换包围盒左上角，不是中心点。若视觉中心为 (cx,cy)，宽高为 (w,h)，必须写 x=cx-w/2、y=cy-h/2。',safety:'模块源只在项目级受信任加载后执行；不允许网络、文件、DOM、宿主或全局 Scene 写入。'});}
  function availableCarriers(assetPolicy){
    return Object.freeze(CARRIERS.filter(item=>assetPolicy!=='code-only'||item.id!=='image-layer').map(item=>{
      const copy=clone(item);if(assetPolicy==='code-only'&&copy.id==='hybrid')copy.note='此实验禁止外部图片；混合结构仅可组合普通对象、粒子与项目 Module。';return Object.freeze(copy);
    }));
  }
  function outputTemplates(inputBrief){
    const source=brief(inputBrief),moduleId='example-scene-module',manifest={format:'tosampool-scene-module/v1',id:moduleId,version:1,title:'示例程序构件',purpose:'将作品专属的高细节绘制保留在项目 Module 内。',timeDependent:true,performance:'medium',recommendedCanvas:{width:source.dimensions.width,height:source.dimensions.height},parameters:[{key:'palette',label:'主配色',type:'select',default:'default',options:['default','warm','cool'],timing:'step'},{key:'motion',label:'运动强度',type:'number',default:.5,min:0,max:1,step:.05,timing:'step'}],assets:[]};
    const beats=source.beats.length?source.beats:[{id:'main',from:0,to:source.loop,summary:'主场景'}];
    const scene={format:'tosampool-scene/v4',version:4,width:source.dimensions.width,height:source.dimensions.height,loop:source.loop,background:{color:'#10151d',alpha:1},assets:{},modules:{[moduleId]:{id:moduleId,version:1,locator:`modules/${moduleId}.js`,manifestLocator:`modules/${moduleId}.manifest.json`,manifest}},entities:[
      {id:'main-module',name:'可编辑主景',type:'procedural',moduleId,moduleVersion:1,params:{palette:'default',motion:.5},x:0,y:0,w:source.dimensions.width,h:source.dimensions.height,scaleX:1,scaleY:1,rot:0,alpha:1},
      {id:'particle-source',name:'粒子实体',type:'ellipse',x:0,y:0,w:6,h:6,fill:'#ffffff',alpha:.9,particleSourceOnly:true},
      {id:'particle-emitter',name:'环境粒子',type:'particle-emitter',x:Math.round(source.dimensions.width*.2),y:Math.round(source.dimensions.height*.1),w:Math.round(source.dimensions.width*.6),h:Math.round(source.dimensions.height*.7),scaleX:1,scaleY:1,rot:0,alpha:1,particle:{sourceId:'particle-source',sourceOwned:true,count:48,life:3,speed:36,direction:90,spread:24,gravity:4,wind:0,size:1,sizeVar:.35,alpha:.82,fade:.3,seed:13}},
      {id:'foreground-frame',name:'前景容器',type:'ellipse',x:Math.round(source.dimensions.width*.17),y:Math.round(source.dimensions.height*.08),w:Math.round(source.dimensions.width*.66),h:Math.round(source.dimensions.height*.76),fill:'#ffffff',alpha:.04,effects:{pipeline:['decorate'],decorate:{outline:{enabled:true,color:'#d9f3ff',alpha:.72,width:6}}}}
    ],timeline:{scenes:beats.map(item=>({id:item.id,name:item.summary,f:[item.from/source.loop,item.to/source.loop]})),tracks:{},visibility:{}},sceneEffects:{pipeline:['overlay','sample'],overlay:{},sample:{}}};
    const project={format:'tosampool-project/v1',version:1,projectId:'replace-with-stable-project-id',displayName:'替换为作品名',scene};
    const draftManifest={format:'tosampool-agent-draft/v1',version:1,draftId:'replace-with-stable-draft-id',title:'替换为草稿标题',summary:'替换为面向人的摘要',changes:['替换为预计变化'],project:'project.tosampool.json',carrierReport:'carrier-report.json'};
    const carrier={format:'tosampool-carrier-report/v1',version:1,objects:[{id:'main-module',semantic:'替换为主景语义',carrier:'项目 Scene Module',editable:['位置','尺寸','主配色','运动强度'],frozen:['Module 内部像素细节'],budget:{tier:'medium',reason:'替换为性能与编辑性理由'}},{id:'particle-emitter',semantic:'替换为环境粒子语义',carrier:'确定性粒子',editable:['数量','速度','范围','随机种子'],frozen:['单颗粒子轨迹'],budget:{tier:'low',reason:'共享粒子实体，避免重复绘制'}}]};
    // This is deliberately a runnable, not merely illustrative, module. Agents can
    // replace render() but must retain the transport contract exactly as emitted.
    const moduleSource=`(function(global){\n  'use strict';\n  const manifest=${JSON.stringify(manifest)};\n  function render({ctx,time,width,height,params,random,sceneIndex,sceneProgress}){\n    // Replace this deterministic placeholder with project-specific drawing.\n    // Coordinates are LOCAL and CENTERED: left=-width/2, top=-height/2.\n    // Draw only into this local Canvas: no DOM, network, file or global Scene access.\n    const palette=params&&params.palette==='warm'?['#55331f','#e9b75a']:params&&params.palette==='cool'?['#173f56','#8ed7ea']:['#24344a','#d5eff6'];\n    const motion=Number(params&&params.motion)||0,left=-width/2,top=-height/2;\n    ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle=palette[0];ctx.fillRect(left,top,width,height);\n    ctx.fillStyle=palette[1];const r=Math.max(2,Math.round(Math.min(width,height)*.012));\n    for(let i=0;i<36;i++){const phase=(i*37+sceneIndex*19)%97;const x=left+(phase/97)*width;const y=top+(((i*53)%89)/89)*height+Math.sin(time*2+i)*motion*r;ctx.fillRect(Math.round(x/r)*r,Math.round(y/r)*r,r,r);}\n    ctx.restore();\n  }\n  global.ToSampoolRuntimeVNext.modules.sceneModules.register({manifest,render,timeDependent:()=>true});\n})(typeof window!=='undefined'?window:globalThis);`;
    return Object.freeze({files:Object.freeze(['draft.manifest.json','project.tosampool.json','carrier-report.json',`modules/${moduleId}.manifest.json`,`modules/${moduleId}.js`]),draftManifest:Object.freeze(draftManifest),project:Object.freeze(project),carrierReport:Object.freeze(carrier),moduleManifest:Object.freeze(manifest),moduleSource,notes:Object.freeze(['复制此骨架后替换所有 replace-with-* 值。','scene.modules 必须是以 moduleId 为键的对象，不是数组。','普通 Scene 实体的 x/y 是包围盒左上角；如需把宽 w、高 h 的对象居中在 (cx,cy)，须写 x=cx-w/2、y=cy-h/2。','Module render() 使用对象中心为 (0,0) 的局部坐标，不可直接复用项目画布绝对坐标；它与普通实体的左上角坐标规则不同。','绘制形状使用 type: rect / ellipse / line / poly / stroke；不要发明 type: shape。','粒子必须使用 particle-emitter 的 particle.sourceId，并保留一个 particleSourceOnly 的图元实体。','可见时段写入 timeline.visibility[entityId].segments，形状为 {f:[0,1],visible:boolean}；若对象不是始终可见，segments 必须完整覆盖 0..1，显式写出 false 段。','参数时序写入 timeline.tracks[entityId].segments。','载体报告必须使用 carrier-report.json 的 objects[]，并逐项列出实际 Scene entity id；不要改名为 carrierPlan。','若 Context Pack 含 references，Agent 只能读取其冻结副本；需要保留的素材须复制进 draft/assets/，并以 scene.assets.<id>.locator="assets/..." 引用。','若 Context Pack 含 canvas，必须遵守 base、scope 与 sceneRevision；不得改写作用域外对象。','若获得派生素材能力，应保留原图素材，并将透明语义层写成独立 PNG/WebP；每个派生素材以 sourceAssetId 指向原素材，并用 derivation 说明 semantic-cutout / alpha-mask 等来源。没有分割能力时必须声明限制，不得把矩形裁切称为精确轮廓。','场景转场写在 timeline.scenes[] 的 transition 上，不创建假的“扫描条”元素。','Module 源文件和 Manifest 文件均须存在于 Draft Package。'])});
  }
  function create(input){
    input=input||{};const value={format:FORMAT,version:2,brief:brief(input),references:references(input),canvas:canvasContext(input),creativeDirection:creativeDirection(input),carriers:null,creativeFamilies:CREATIVE_FAMILIES,moduleContract:moduleContract(),qualityGates:QUALITY_GATES,output:{format:'tosampool-agent-draft/v1',resultType:'scene-draft',requiredFiles:['draft.manifest.json','project.tosampool.json','carrier-report.json'],agentWriteBoundary:'仅写入分配的 draft/ 目录。'},outputTemplates:null,examples:Array.isArray(input.examples)?clone(input.examples):[],experiment:{caseId:clean(input.caseId),runId:clean(input.runId),baseline:clean(input.baseline)}};
    value.carriers=availableCarriers(value.brief.assetPolicy);
    value.outputTemplates=outputTemplates(value.brief);
    return Object.freeze(value);
  }
  function validate(value){
    if(!value||value.format!==FORMAT||+value.version!==2)throw new Error('不是有效的 Agent Context Pack v2');
    const checked=brief(value.brief),inputReferences=references({references:value.references}),canvas=canvasContext({canvasContext:value.canvas}),direction=creativeDirection({creativeDirection:value.creativeDirection});if(!Array.isArray(value.carriers)||!value.carriers.some(item=>item&&item.id==='scene-module'))throw new Error('Context Pack 必须声明 Scene Module 载体，而非把图元当作唯一方案。');
    if(!value.output||value.output.format!=='tosampool-agent-draft/v1')throw new Error('Context Pack 必须明确 Draft Package 输出格式。');
    return Object.freeze(Object.assign({},value,{brief:checked,references:inputReferences,canvas,creativeDirection:direction}));
  }
  global.EditorVNextAgentContextPack=Object.freeze({FORMAT,REFERENCE_FORMAT,CANVAS_FORMAT,REFERENCE_ROLES,BASES,CARRIERS,CREATIVE_FAMILIES,QUALITY_GATES,brief,reference,references,canvasContext,freezeCanvas,creativeDirection,moduleContract,availableCarriers,outputTemplates,create,validate});
})(typeof window!=='undefined'?window:globalThis);
