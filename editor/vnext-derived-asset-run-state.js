/*
 * Review-first state for Agent material derivation. This module never holds
 * image pixels or calls a model: it records the user-approved execution plan
 * between the frozen source, a Host adapter, and the eventual asset accept.
 */
(function (global) {
  'use strict';

  const FORMAT='tosampool-derived-asset-run/v1';
  const MODES=Object.freeze(['layering','variant']);
  const PHASES=Object.freeze(['planning','edge-review','repair-review','complete','cancelled']);
  const CARD_STATUSES=new Set(['planned','mask-ready','mask-approved','mask-revise']);
  const clean=value=>String(value==null?'':value).trim();
  const clone=value=>JSON.parse(JSON.stringify(value));
  const safeId=value=>clean(value).toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');
  const freeze=value=>Object.freeze(value);

  function roi(raw,required){
    if(raw==null){if(required)throw new Error('素材分层任务必须指定位置');return null;}
    raw=raw||{};const x=+raw.x,y=+raw.y,w=+raw.w,h=+raw.h;
    if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0||x<0||y<0||x+w>1.00001||y+h>1.00001)throw new Error('位置必须是图源范围内的归一化框选');
    return freeze({x,y,w,h});
  }
  function source(raw){
    raw=raw||{};const assetId=clean(raw.assetId),referenceId=clean(raw.referenceId),snapshotId=clean(raw.snapshotId);
    if(!assetId||!referenceId)throw new Error('派生 Run 必须绑定一个冻结的图源');
    return freeze({assetId,referenceId,snapshotId});
  }
  function card(raw,index,mode){
    raw=raw||{};const target=clean(raw.target),id=safeId(raw.id)||`task-${index+1}`;
    if(!target)throw new Error('每张任务卡必须说明分离目标或变体目标');
    const kind=mode==='layering'?(raw.kind==='residual-background'?'residual-background':'layer'):'variant';
    return freeze({
      id,
      order:Number.isInteger(+raw.order)?Math.max(1,Math.round(+raw.order)):index+1,
      kind,
      target,
      roi:roi(raw.roi,mode==='layering'&&kind!=='residual-background'),
      occlusionRepair:mode==='layering'&&raw.occlusionRepair===true,
      status:CARD_STATUSES.has(clean(raw.status))?clean(raw.status):'planned',
      userEdited:raw.userEdited===true,
      agentNotes:clean(raw.agentNotes)
    });
  }
  function normalCards(raw,mode){
    const list=Array.isArray(raw)?raw:[];
    if(!list.length)throw new Error('派生 Run 至少需要一张任务卡');
    const values=list.map((item,index)=>card(item,index,mode)),ids=new Set();
    for(const value of values){if(ids.has(value.id))throw new Error('任务卡 ID 不可重复');ids.add(value.id);}
    return values.sort((a,b)=>a.order-b.order).map((value,index)=>freeze(Object.assign({},value,{order:index+1})));
  }
  function snapshot(value){return freeze(clone(value));}
  function validate(raw){
    raw=raw||{};const mode=MODES.includes(clean(raw.mode))?clean(raw.mode):'';
    if(!mode)throw new Error('派生 Run 必须选择“素材分层”或“变体生成”');
    const phase=PHASES.includes(clean(raw.phase))?clean(raw.phase):'planning';
    const value={format:clean(raw.format)||FORMAT,version:+raw.version||1,id:safeId(raw.id)||`derive-run-${Date.now().toString(36)}`,mode,source:source(raw.source),originalIntent:clean(raw.originalIntent),phase,cards:normalCards(raw.cards,mode),candidateGroups:raw.candidateGroups&&typeof raw.candidateGroups==='object'?clone(raw.candidateGroups):{},revision:Math.max(1,Math.round(+raw.revision||1))};
    if(value.format!==FORMAT||!value.originalIntent)throw new Error('派生 Run 必须保留用户原始意图');
    return snapshot(value);
  }
  function create(input){return validate(input);}
  function replace(run,patch){return validate(Object.assign({},clone(run),patch,{revision:Math.max(1,Math.round(+(run&&run.revision)||1))+1}));}
  function editCard(run,id,patch){
    const before=validate(run),key=clean(id),cards=before.cards.map(item=>{
      if(item.id!==key)return item;
      const next=Object.assign({},item,patch||{}, {id:item.id,userEdited:true,status:'planned'});
      if(before.mode==='layering'&&item.kind==='residual-background')next.roi=null;
      return next;
    });
    if(!cards.some(item=>item.id===key))throw new Error('找不到需要修改的任务卡');
    return replace(before,{cards,candidateGroups:{},phase:'planning'});
  }
  function addCard(run,raw){const before=validate(run),cards=before.cards.concat([Object.assign({},raw||{},{order:before.cards.length+1,userEdited:true})]);return replace(before,{cards,candidateGroups:{},phase:'planning'});}
  function removeCard(run,id){const before=validate(run),key=clean(id),cards=before.cards.filter(item=>item.id!==key);if(cards.length===before.cards.length)throw new Error('找不到需要删除的任务卡');return replace(before,{cards,candidateGroups:{},phase:'planning'});}
  function reorder(run,ids){
    const before=validate(run),order=Array.isArray(ids)?ids.map(clean).filter(Boolean):[];
    if(order.length!==before.cards.length||new Set(order).size!==before.cards.length||order.some(id=>!before.cards.some(card=>card.id===id)))throw new Error('重排必须包含每张任务卡且仅一次');
    const map=new Map(before.cards.map(card=>[card.id,card]));return replace(before,{cards:order.map((id,index)=>Object.assign({},map.get(id),{order:index+1,userEdited:true})),candidateGroups:{},phase:'planning'});
  }
  function markEdge(run,id,status){
    const before=validate(run);if(before.mode!=='layering')throw new Error('只有素材分层存在第一轮边缘审阅');
    if(!['mask-ready','mask-approved','mask-revise'].includes(clean(status)))throw new Error('不是有效的边缘审阅状态');
    const cards=before.cards.map(card=>card.id===clean(id)?Object.assign({},card,{status:clean(status)}):card);
    if(!cards.some(card=>card.id===clean(id)))throw new Error('找不到任务卡');
    const allApproved=cards.every(card=>card.kind==='residual-background'||card.status==='mask-approved');
    return replace(before,{cards,phase:allApproved?'repair-review':'edge-review'});
  }
  function canRepair(run){const value=validate(run);return value.mode==='layering'&&value.cards.filter(card=>card.kind!=='residual-background').every(card=>card.status==='mask-approved');}
  function candidateSet(run,id,candidates){
    const before=validate(run),key=clean(id),task=before.cards.find(card=>card.id===key);
    if(!task)throw new Error('找不到任务卡');
    const values=(Array.isArray(candidates)?candidates:[]).slice(0,3).map((raw,index)=>{raw=raw||{};const candidateId=safeId(raw.id)||`${key}-candidate-${index+1}`;return freeze({id:candidateId,preview:clean(raw.preview),label:clean(raw.label)||`候选 ${index+1}`,meta:raw.meta&&typeof raw.meta==='object'?clone(raw.meta):{}});});
    if(!values.length||values.length>3)throw new Error('候选组必须包含 1 至 3 项');
    const groups=clone(before.candidateGroups);groups[key]={selectedId:values[0].id,values};
    return replace(before,{candidateGroups:groups,phase:before.mode==='layering'?'repair-review':'edge-review'});
  }
  function chooseCandidate(run,taskId,candidateId){
    const before=validate(run),key=clean(taskId),group=before.candidateGroups[key];
    if(!group||!group.values.some(item=>item.id===clean(candidateId)))throw new Error('该任务不存在此候选');
    const groups=clone(before.candidateGroups);groups[key].selectedId=clean(candidateId);return replace(before,{candidateGroups:groups});
  }
  function cancel(run){const before=validate(run);return replace(before,{phase:'cancelled'});}
  function complete(run){const before=validate(run);const cards=before.cards.filter(card=>card.kind!=='residual-background');if(cards.some(card=>!before.candidateGroups[card.id]))throw new Error('所有输出任务均需有已审阅的候选');return replace(before,{phase:'complete'});}
  global.EditorVNextDerivedAssetRunState=freeze({FORMAT,MODES,PHASES,create,validate,editCard,addCard,removeCard,reorder,markEdge,canRepair,candidateSet,chooseCandidate,cancel,complete});
})(typeof window!=='undefined'?window:globalThis);
