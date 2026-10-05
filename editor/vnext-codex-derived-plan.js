/*
 * Contract at the boundary between ToSampool and a planning Agent such as
 * Codex.  It deliberately stops before pixels: the Agent may describe what
 * to derive, but the editor still owns task review and the Host owns any
 * segmentation, repair, or image-generation call.
 */
(function (global) {
  'use strict';

  const FORMAT='tosampool-codex-derived-plan/v1';
  const clean=value=>String(value==null?'':value).trim();
  const clone=value=>JSON.parse(JSON.stringify(value));
  const sourceId=item=>clean(item&&item.id)||`reference-${clean(item&&item.assetId)}`;

  function request(input){
    input=input||{};
    if(clean(input.phase)!=='derive-plan'||clean(input.workflow)!=='asset-derive')throw new Error('Codex 派生规划器只接受素材派生的 derive-plan 请求');
    const intent=clean(input.intent&&input.intent.subject||input.intent&&input.intent.text||input.intent);
    const refs=Array.isArray(input.references)?input.references:[];
    const sources=refs.filter(item=>item&&item.role==='source'&&clean(item.assetId)).map(item=>Object.freeze({
      id:sourceId(item),assetId:clean(item.assetId),name:clean(item.name)||'未命名源图',width:Math.max(1,Math.round(+item.width||1)),height:Math.max(1,Math.round(+item.height||1))
    }));
    if(!intent)throw new Error('派生规划需要用户意图');
    if(!sources.length)throw new Error('派生规划需要至少一张冻结的源图');
    return Object.freeze({format:FORMAT,version:1,mode:clean(input.mode)==='variant'?'variant':'layering',intent,sources:Object.freeze(sources),rules:Object.freeze([
      '只返回可编辑的计划，不生成像素、不写入项目或素材栏。',
      '每张任务卡必须引用 sourceReferenceId，并给出保守的归一化位置框。',
      '素材分层按前景到背景排序；不要生成 residual-background，编辑器会补上该卡。',
      'occlusionRepair 只表达是否需要修补，不替代用户审阅。',
      '无法可靠定位时，缩小计划并在 notes/risk 说明不确定性。'
    ])});
  }

  function prompt(input){
    const value=request(input),tasks=value.mode==='layering'
      ? 'semantic-cutout 或 alpha-mask；按前景到背景排序。'
      : 'generated-variant、pose-sequence 或 motion-sequence；仅在用户明确需要动作时使用 sequence。';
    return [
      '你是 ToSampool 的素材派生规划器。你只能输出 JSON，不生成图片、不调用工具、不改工程。',
      `模式：${value.mode==='layering'?'素材分层':'变体生成'}`,
      `用户意图：${value.intent}`,
      `源图：${value.sources.map(item=>`${item.id}（${item.name}，${item.width}×${item.height}）`).join('；')}`,
      `任务类型：${tasks}`,
      '输出形状：{"plan":{"format":"tosampool-derived-asset-plan/v1","version":1,"title":"...","summary":"...","tasks":[{"id":"...","title":"...","sourceReferenceId":"...","kind":"...","semantic":"...","roi":{"x":0,"y":0,"w":1,"h":1},"occlusionRepair":false,"preserve":"...","notes":"...","risk":"..."}]}}',
      ...value.rules
    ].join('\n');
  }

  function response(raw,input){
    const protocol=global.EditorVNextDerivedAssetProtocol;
    if(!protocol)throw new Error('Codex 派生规划器需要 Derived Asset Protocol');
    const base=request(input),candidate=raw&&raw.plan||raw||{};
    const plan=protocol.plan(Object.assign({},clone(candidate),{sources:base.sources}));
    return Object.freeze({format:FORMAT,version:1,plan});
  }

  global.EditorVNextCodexDerivedPlan=Object.freeze({FORMAT,request,prompt,response});
})(typeof window!=='undefined'?window:globalThis);
