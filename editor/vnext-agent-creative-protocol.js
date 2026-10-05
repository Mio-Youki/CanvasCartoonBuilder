/* Stable, Runtime-free contract between a ToSampool creation UI and an optional
 * external or in-app Agent.  This file never calls a model or mutates a Scene. */
(function (global) {
  'use strict';

  const FORMAT = 'tosampool-agent-creative/v1';
  const BUILD_FORMAT = 'tosampool-agent-build/v2';
  const BASES = Object.freeze(['blank','selected-assets','current-scene']);
  const OUTPUTS = Object.freeze([
    Object.freeze({ value:'recommend', label:'由 Agent 推荐' }),
    Object.freeze({ value:'dynamic-asset', label:'动态素材' }),
    Object.freeze({ value:'loop-scene', label:'循环画面' }),
    Object.freeze({ value:'editable-scene', label:'可继续拼装的场景' }),
  ]);
  const CONTROLS = Object.freeze([
    Object.freeze({ value:'light', label:'只改颜色与速度' }),
    Object.freeze({ value:'semantic', label:'可改主体与布景' }),
    Object.freeze({ value:'structural', label:'可继续重组结构' }),
  ]);
  const ASSET_POLICIES = Object.freeze([
    Object.freeze({ value:'agent-ok', label:'允许 Agent 生成补充素材' }),
    Object.freeze({ value:'supplied-only', label:'只使用我提供的素材' }),
    Object.freeze({ value:'code-only', label:'仅程序 / 图元绘制' }),
  ]);

  const clean = value => String(value == null ? '' : value).trim();
  const member = (value, list, fallback) => list.some(item => item.value === value) ? value : fallback;
  const words = value => clean(value).split(/\s+/).filter(Boolean);

  function normalizeIntent(input) {
    input = input || {};
    const subject=clean(input.subject), mustKeep=clean(input.mustKeep), notes=clean(input.notes);
    return Object.freeze({
      format:FORMAT,
      subject,
      output:member(input.output,OUTPUTS,'recommend'),
      control:member(input.control,CONTROLS,'semantic'),
      assetPolicy:member(input.assetPolicy,ASSET_POLICIES,'agent-ok'),
      mustKeep,
      notes,
      dimensions:input.dimensions && Number.isFinite(+input.dimensions.width) && Number.isFinite(+input.dimensions.height) ? Object.freeze({ width:Math.max(1,Math.round(+input.dimensions.width)), height:Math.max(1,Math.round(+input.dimensions.height)) }) : null,
      loop:Number.isFinite(+input.loop) ? Math.max(.001,+input.loop) : null,
    });
  }

  function validateIntent(intent) {
    const normalized=normalizeIntent(intent), issues=[];
    if (!normalized.subject) issues.push('请描述想看见的主体、地点或发生的事情。');
    if (words(normalized.subject).length > 180) issues.push('场景描述请先控制在 180 个词以内；细节可写在补充说明。');
    return Object.freeze({ valid:issues.length===0, issues:Object.freeze(issues), value:normalized });
  }

  function candidate(input) {
    input=input||{};
    const value={
      id:clean(input.id), title:clean(input.title), summary:clean(input.summary),
      carrier:clean(input.carrier), editable:Array.isArray(input.editable)?input.editable.map(clean).filter(Boolean):[],
      frozen:Array.isArray(input.frozen)?input.frozen.map(clean).filter(Boolean):[],
      assetPlan:clean(input.assetPlan), budget:Object.freeze(Object.assign({ tier:'medium', reason:'' },input.budget||{})),
      status:input.status === 'ready' ? 'ready' : 'plan', preview:input.preview && typeof input.preview==='object' ? Object.freeze(Object.assign({},input.preview)) : null,
    };
    if (!value.id || !value.title || !value.summary || !value.carrier) throw new Error('方向卡必须包含 id、title、summary 与 carrier');
    return Object.freeze(value);
  }

  /* A transparent fallback for when no Agent Adapter is installed. It gives
     the user useful carrier choices but never pretends to be generated art. */
  function localDirections(rawIntent) {
    const intent=normalizeIntent(rawIntent), subject=intent.subject || '你的场景';
    const structural=intent.control === 'structural', light=intent.control === 'light';
    const direction=[];
    direction.push(candidate({
      id:'semantic-objects', title:'结构优先', carrier:'语义对象 + 图元',
      summary:`把“${subject}”拆成少量可单独选择的主体、环境和前景对象；适合后续改色、改位置与改运动。`,
      editable:light?['主色','位置','速度']:['主体','环境','主色','运动','局部效果'],
      frozen:[], assetPlan:intent.assetPolicy==='agent-ok'?'可为少量必要细节生成补充素材':'不生成额外素材',
      budget:{tier:structural?'medium':'low',reason:'对象数量受控，优先保留可接手修改的结构。'},
      preview:{kind:'plan',label:'对象结构草图'},
    }));
    direction.push(candidate({
      id:'semantic-module', title:'细节优先', carrier:'语义对象 + 项目 Scene Module',
      summary:`把“${subject}”中静态、高细节的部分交给一个项目 Module 绘制，仍保留主体、颜色、运动和范围等公开参数。`,
      editable:['公开颜色','强度','位置','尺寸','运动节奏'],
      frozen:['Module 内部笔触/像素细节'], assetPlan:intent.assetPolicy==='code-only'?'只使用程序绘制':'允许用素材补充可见细节',
      budget:{tier:'low',reason:'高细节集中在一个受控绘制入口，避免大量零散图元。'},
      preview:{kind:'plan',label:'语义 Module 草图'},
    }));
    direction.push(candidate({
      id:'sample-collage', title:'采样拼贴', carrier:'图片对象 + 遮罩 + 图样/采样效果',
      summary:`以“${subject}”的色彩、材质和切片关系建立粗糙、可替换的拼贴循环；适合强调采样感与作者化处理。`,
      editable:['每个素材','裁切与遮罩','图样','颜色映射','循环节奏'],
      frozen:['单张素材内部细节'], assetPlan:intent.assetPolicy==='code-only'?'该方向需要改为程序纹理，视觉细节会降低':'素材可来自用户输入或 Agent 补充',
      budget:{tier:'medium',reason:'效果主要局限于对象局部，避免全画布高成本处理。'},
      preview:{kind:'plan',label:'拼贴结构草图'},
    }));
    return Object.freeze(direction);
  }

  function capabilityManifest(options) {
    options=options||{};const derived=options.derivedAssets||{};
    const derivedAssets=Object.freeze({semanticCutout:derived.semanticCutout===true,poseSequence:derived.poseSequence===true,notes:clean(derived.notes)});
    return Object.freeze({
      format:FORMAT,
      version:1,
      outputs:OUTPUTS,
      controls:CONTROLS,
      assetPolicies:ASSET_POLICIES,
      derivedAssets,
      rules:Object.freeze([
        'Agent 不得直接改写当前项目；必须先返回方向卡或临时 Scene。',
        '图片、Module 与普通对象均属于场景结构对象，不存在独立背景图入口。',
        '候选必须声明 carrier、可编辑内容、冻结内容与性能预算。',
        'intake 阶段只可复述与提出一个会改变结构选择的问题；directions 阶段才返回方向卡。',
        '未授予 derivedAssets.semanticCutout 时不得声称精确透明分层；未授予 derivedAssets.poseSequence 时不得声称可生成姿态动作帧。',
      ]),
    });
  }

  function response(raw, phase) {
    raw=raw||{};phase=phase==='directions'?'directions':'intake';
    const question=raw.question&&typeof raw.question==='object'?{id:clean(raw.question.id)||'control',label:clean(raw.question.label)||'请选择',choices:Array.isArray(raw.question.choices)?raw.question.choices.map(item=>({value:clean(item&&item.value),label:clean(item&&item.label)||clean(item&&item.value)})).filter(item=>item.value):[]}:null;
    const candidates=(Array.isArray(raw.candidates)?raw.candidates:[]).map(candidate);
    if(phase==='intake')return Object.freeze({phase,reply:clean(raw.reply),question:question&&question.choices.length?Object.freeze(question):null,candidates:Object.freeze([])});
    return Object.freeze({phase,reply:clean(raw.reply),question:null,candidates:Object.freeze(candidates)});
  }

  const json=value=>JSON.stringify(value==null?null:value);
  function sceneBase(raw) {
    raw=raw||{};const type=BASES.includes(clean(raw.type))?clean(raw.type):'current-scene';
    return Object.freeze({type,sceneRevision:Number.isFinite(+raw.sceneRevision)?Math.max(0,Math.round(+raw.sceneRevision)):null});
  }
  function sceneScope(raw) {
    raw=raw||{};const type=raw.type==='selection'?'selection':'scene',ids=type==='selection'&&Array.isArray(raw.ids)?raw.ids.map(clean).filter(Boolean):[];
    if(type==='selection'&&!ids.length)throw new Error('选择作用域必须包含稳定对象 id');
    return Object.freeze({type,ids:Object.freeze(ids)});
  }
  /* A scene build is always a complete, detached v4 Scene draft. A general-purpose
     JSON patch would make intent review opaque and weaken undo safety. */
  function build(raw) {
    raw=raw||{};
    const scene=raw.scene&&typeof raw.scene==='object'?raw.scene:null;
    const previewInput=raw.preview&&typeof raw.preview==='object'?raw.preview:null,previewUrl=clean(previewInput&&previewInput.url);
    if(previewUrl&&(!/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(previewUrl)||previewUrl.length>3*1024*1024))throw new Error('临时 Scene 预览必须是小于 3MB 的安全图片数据');
    const value={
      format:clean(raw.format)||BUILD_FORMAT,kind:clean(raw.kind)||'scene-draft',title:clean(raw.title)||'临时 Scene',summary:clean(raw.summary),base:sceneBase(raw.base),scope:sceneScope(raw.scope),
      changes:Array.isArray(raw.changes)?raw.changes.map(clean).filter(Boolean):[],scene,preview:previewUrl?Object.freeze({url:previewUrl,alt:clean(previewInput.alt)||'临时 Scene 预览'}):null,
    };
    if(value.format!==BUILD_FORMAT)throw new Error('临时 Scene 使用了未知的 Agent build 格式');
    if(value.kind!=='scene-draft'||!scene||scene.format!=='tosampool-scene/v4')throw new Error('Agent build 必须交付完整的 v4 Scene Draft');
    if(!value.summary)throw new Error('Agent build 必须说明临时 Scene 的内容');
    return Object.freeze(Object.assign(value,{changes:Object.freeze(value.changes),scene:Object.freeze(JSON.parse(JSON.stringify(scene)))}));
  }

  function assertApplicable(draft,currentRevision){
    const value=draft&&draft.format===BUILD_FORMAT?draft:build(draft),revision=Math.max(0,Math.round(+currentRevision||0));
    if(value.base.sceneRevision!=null&&value.base.sceneRevision!==revision)throw new Error(`当前工程已从 revision ${value.base.sceneRevision} 变为 ${revision}；请基于最新画布重新生成或显式重基线。`);
    return value;
  }

  function assertScopePreserved(draft,baseline){
    const value=draft&&draft.format===BUILD_FORMAT?draft:build(draft);if(value.scope.type!=='selection')return value;
    if(!baseline||baseline.format!=='tosampool-scene/v4')throw new Error('选择作用域验收需要冻结的基线 Scene');
    const before=Array.isArray(baseline.entities)?baseline.entities:[],after=Array.isArray(value.scene.entities)?value.scene.entities:[],byBefore=new Map(before.map(item=>[item.id,item])),byAfter=new Map(after.map(item=>[item.id,item])),allowed=new Set(value.scope.ids);
    let changed=true;while(changed){changed=false;for(const item of before)if(item&&item.parentId&&allowed.has(item.parentId)&&!allowed.has(item.id)){allowed.add(item.id);changed=true;}}
    for(const item of before){if(allowed.has(item.id))continue;const next=byAfter.get(item.id);if(!next||json(next)!==json(item))throw new Error(`Scene Draft 改写了选择范围外对象：${item.id}`);}
    for(const item of after){if(byBefore.has(item.id))continue;if(!item.parentId||!allowed.has(item.parentId))throw new Error(`Scene Draft 在选择范围外新增了对象：${item.id}`);allowed.add(item.id);}
    for(const key of ['width','height','loop','background','sceneEffects'])if(json(value.scene[key])!==json(baseline[key]))throw new Error(`选择作用域不得改写 Scene ${key}`);
    const beforeScenes=baseline.timeline&&baseline.timeline.scenes||[],afterScenes=value.scene.timeline&&value.scene.timeline.scenes||[];if(json(afterScenes)!==json(beforeScenes))throw new Error('选择作用域不得改写 Scene 分段');
    return value;
  }

  global.EditorVNextAgentCreativeProtocol=Object.freeze({ FORMAT, BUILD_FORMAT, BASES, OUTPUTS, CONTROLS, ASSET_POLICIES, normalizeIntent, validateIntent, candidate, response, sceneBase, sceneScope, build, assertApplicable, assertScopePreserved, localDirections, capabilityManifest });
})(typeof window !== 'undefined' ? window : globalThis);
