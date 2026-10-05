/* Conversational creation surface for Classic v4. It does not own a model:
 * an optional Adapter returns structured reply/question/candidate envelopes. */
(function (global) {
  'use strict';

  function create(options) {
    options=options||{};
    const workspace=options.workspace,root=options.root||document,protocol=global.EditorVNextAgentCreativeProtocol;
    if(!workspace||typeof workspace.requireDocument!=='function')throw new Error('创作对话需要 v4 Workspace');
    if(!protocol)throw new Error('创作对话需要 Agent Creative Protocol');
    let mask=null,lastIntent=null,lastCandidates=[],selectedId=null,conversation=[],draft=null,references=[],base='current-scene',scopeMode='scene',buildBaseline=null,workflow='scene-author',deriveMode='layering',derivePlan=null,deriveRun=null,selectedDeriveId=null,derivedReview=null;
    const adapter=()=>options.adapter||global.ToSampoolV4AgentAdapter||null;
    const el=(tag,className,text)=>{const node=root.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=text;return node;};
    const selected=()=>lastCandidates.find(item=>item.id===selectedId)||null;
    // Creation Agents receive a frozen Scene snapshot, not a mutable workspace
    // reference. The revision is checked again immediately before apply.
    const view=()=>typeof options.view==='function'?options.view():options.view||null;
    const selection=()=>{const current=view(),ids=current&&Array.isArray(current.selectedIds)?current.selectedIds:[];return ids.filter(Boolean);};
    const selectedAssets=()=>typeof options.assetSelectionSource==='function'?(options.assetSelectionSource()||[]).filter(Boolean):[];
    const scope=()=>{const scene=workspace.requireDocument(),contextApi=global.EditorVNextAgentContextPack,selectedIds=selection(),assetIds=selectedAssets(),effectiveScope=scopeMode==='selection'&&selectedIds.length?'selection':'scene',preview=typeof options.canvasPreviewSource==='function'?options.canvasPreviewSource():null,canvas=contextApi?contextApi.freezeCanvas(scene,{base,scope:effectiveScope,selectedIds,assetIds,sceneRevision:workspace.revision,preview}):null;return {workflow,capabilities:protocol.capabilityManifest(options.capabilities),context:contextApi?contextApi.create({intent:lastIntent,baseline:'current-v4-workspace',references,canvasContext:canvas,workspace:{entityCount:(scene.entities||[]).length,sceneCount:scene.timeline&&Array.isArray(scene.timeline.scenes)?scene.timeline.scenes.length:0}}):null,workspace:{width:scene.width,height:scene.height,loop:scene.loop,entityCount:(scene.entities||[]).length,sceneCount:scene.timeline&&Array.isArray(scene.timeline.scenes)?scene.timeline.scenes.length:0,revision:workspace.revision},references:Object.freeze(references.slice()),canvas};};
    const close=()=>{if(mask){mask.remove();mask=null;}};
    function localEnvelope(intent,phase){
      if(phase==='intake')return {reply:'我会先把它组织成可循环的场景，而不是直接塞入一张完整画面。你之后最希望能改到哪一层？',question:{id:'control',label:'选择一个修改重点',choices:protocol.CONTROLS}};
      return {reply:'我整理了三种构成方向。它们都先是计划，不会改动当前项目；选择后才会进入临时 Scene 生成。',candidates:protocol.localDirections(intent)};
    }
    function message(kind,text){conversation.push(Object.freeze({kind,text:String(text||'')}));}
    function render(){
      if(!mask)return;const chat=mask.querySelector('.agent-creative-chat'),selectionSlot=mask.querySelector('.agent-creative-selection'),draftSlot=mask.querySelector('.agent-creative-draft'),deriveSlot=mask.querySelector('.agent-creative-derive'),referenceSlot=mask.querySelector('.agent-creative-reference'),contextSlot=mask.querySelector('.agent-creative-context');if(!chat)return;chat.innerHTML='';
      if(contextSlot){
        contextSlot.innerHTML='';
        contextSlot.append(el('span','', '工作流：'));
        for(const [value,label] of [['scene-author','起景 / 编排'],['asset-derive','派生素材']]){
          const button=el('button','small'+(workflow===value?' active':''),label);button.type='button';
          button.addEventListener('click',()=>{workflow=value;derivePlan=null;deriveRun=null;selectedDeriveId=null;derivedReview=null;if(workflow==='asset-derive')base='selected-assets';render();});
          contextSlot.append(button);
        }
        if(workflow==='scene-author'){
          contextSlot.append(el('span','agent-creative-context-separator','创作基底：'));
          for(const [value,label] of [['blank','新场景'],['selected-assets','所选素材'],['current-scene','当前画布']]){const button=el('button','small'+(base===value?' active':''),label);button.type='button';button.addEventListener('click',()=>{if(value==='selected-assets'&&!selectedAssets().length){message('system','请先在素材栏选中至少一个素材。');render();return;}base=value;if(base!=='current-scene')scopeMode='scene';render();});contextSlot.append(button);}
          if(base==='current-scene'){for(const [value,label] of [['scene','整个画布'],['selection','当前选择']]){const button=el('button','small'+(scopeMode===value?' active':''),label);button.type='button';button.disabled=value==='selection'&&!selection().length;button.addEventListener('click',()=>{scopeMode=value;render();});contextSlot.append(button);}}
        }else {
          contextSlot.append(el('span','agent-creative-context-separator','派生方式：'));
          for(const [value,label] of [['layering','素材分层'],['variant','变体生成']]){const button=el('button','small'+(deriveMode===value?' active':''),label);button.type='button';button.setAttribute('aria-pressed',deriveMode===value?'true':'false');button.addEventListener('click',()=>{if(deriveMode===value)return;deriveMode=value;derivePlan=null;deriveRun=null;selectedDeriveId=null;derivedReview=null;message('assistant',`已切换为“${label}”。请发送意图，Agent 会据此重新生成任务卡。`);render();});contextSlot.append(button);}
          contextSlot.append(el('small','', '先添加一张标为“源图”的素材参考；生成候选前不会改动场景或素材栏。'));
        }
      }
      if(referenceSlot){referenceSlot.innerHTML='';const title=el('span','',references.length?`参考图：${references.length} 张`:(workflow==='asset-derive'?'源图：必填':'参考图：可选')),role=root.createElement('select');for(const [value,label] of [['source','源图'],['style','风格'],['composition','构图'],['subject','主体'],['motion','运动']]){const option=root.createElement('option');option.value=value;option.textContent=label;role.append(option);}role.value=workflow==='asset-derive'?'source':'style';const fromCanvas=el('button','small','添加当前图片'),fromAsset=el('button','small','添加素材所选'),clear=el('button','small','清除全部');fromCanvas.type=fromAsset.type=clear.type='button';const choose=async mode=>{if(typeof options.referenceSource!=='function'){message('system','当前宿主尚未提供图片参考入口。');render();return;}try{fromCanvas.disabled=fromAsset.disabled=true;const frozen=await options.referenceSource(mode,{role:role.value}),entry=Object.freeze(Object.assign({},frozen,{role:role.value,useAsMaterial:false})),index=references.findIndex(item=>item.id===entry.id);if(index>=0)references.splice(index,1,entry);else references.push(entry);derivePlan=null;deriveRun=null;selectedDeriveId=null;derivedReview=null;message('assistant',`已冻结参考图「${entry.name}」，用途为“${role.options[role.selectedIndex].text}”。它默认不会成为作品素材。`);}catch(error){message('system',error&&error.message||String(error));}finally{fromCanvas.disabled=fromAsset.disabled=false;render();}};fromCanvas.addEventListener('click',()=>choose('canvas'));fromAsset.addEventListener('click',()=>choose('asset'));clear.addEventListener('click',()=>{references=[];derivePlan=null;deriveRun=null;selectedDeriveId=null;derivedReview=null;message('assistant','已移除本次全部参考图；素材库与当前项目没有改动。');render();});referenceSlot.append(title,role,fromCanvas,fromAsset,clear);for(const item of references)referenceSlot.append(el('small','',`${item.name} · ${item.role} · ${item.width}×${item.height}`));}
      for(const item of conversation){const bubble=el('div','agent-chat-bubble '+item.kind,item.text);chat.append(bubble);}
      const pending=mask._question;
      if(pending){const group=el('div','agent-chat-question'),caption=el('div','agent-chat-question-label',pending.label),choices=el('div','agent-chat-choices');for(const choice of pending.choices){const button=el('button','small',choice.label);button.type='button';button.addEventListener('click',()=>answer(pending.id,choice.value,choice.label));choices.append(button);}group.append(caption,choices);chat.append(group);}
      if(lastCandidates.length){const list=el('div','agent-creative-candidate-list');for(const item of lastCandidates){const card=el('button','agent-creative-candidate'+(item.id===selectedId?' selected':''),null);card.type='button';const title=el('strong','',item.title),carrier=el('span','agent-creative-carrier',item.carrier),summary=el('p','',item.summary),editable=el('small','',`可改：${item.editable.join('、')||'未声明'}`),frozen=el('small','agent-creative-frozen',item.frozen.length?`冻结：${item.frozen.join('、')}`:'冻结：无');card.append(title,carrier,summary,editable,frozen);card.addEventListener('click',()=>{selectedId=item.id;message('user','我选择「'+item.title+'」');render();});list.append(card);}chat.append(list);}
      const pick=selected();if(selectionSlot){selectionSlot.innerHTML='';selectionSlot.hidden=!pick;if(pick){selectionSlot.append(el('b','',`已选择：${pick.title}`),el('p','',`载体：${pick.carrier}。${pick.budget.reason}`));const next=el('button','small primary','用此方向继续');next.type='button';next.addEventListener('click',()=>build(pick,next));selectionSlot.append(next);}}
      if(draftSlot){draftSlot.innerHTML='';draftSlot.hidden=!draft;if(draft){draftSlot.append(el('b','',`临时结果：${draft.title}`),el('p','',draft.summary));if(draft.preview){const preview=root.createElement('img');preview.className='agent-creative-draft-preview';preview.src=draft.preview.url;preview.alt=draft.preview.alt;draftSlot.append(preview);}if(draft.carrier){const carriers=draft.carrier.objects.map(item=>`${item.semantic} · ${item.carrier}`).join('；');draftSlot.append(el('small','',`载体：${carriers||'未声明'}`));}if(draft.changes.length)draftSlot.append(el('small','',`预计变化：${draft.changes.join('；')}`));const actions=el('div','agent-creative-draft-actions'),apply=el('button','small primary','应用到当前项目'),discard=el('button','small','丢弃临时结果');apply.type=discard.type='button';apply.addEventListener('click',applyDraft);discard.addEventListener('click',()=>{draft=null;message('assistant','已丢弃临时 Scene；当前项目没有改动。');render();});actions.append(apply,discard);draftSlot.append(actions);}}
      renderDeriveSlot(deriveSlot);
      chat.scrollTop=chat.scrollHeight;
    }
    function selectedDerive(){return deriveRun&&deriveRun.cards.find(item=>item.id===selectedDeriveId)||null;}
    const deriveReferenceId=item=>String(item&&item.id||`reference-${item&&item.assetId||''}`).trim();
    function localDerivePlan(){
      const derived=global.EditorVNextDerivedAssetProtocol,source=references.find(item=>item.role==='source'&&item.assetId),sources=references.map(item=>({id:deriveReferenceId(item),assetId:item.assetId,name:item.name,role:item.role}));
      if(!derived||!source)throw new Error('请先添加一张标为“源图”的素材参考。');
      const semantic=lastIntent&&lastIntent.subject||'图中主体';
      const layering=deriveMode==='layering',input={title:layering?'素材分层计划':'变体生成计划',summary:layering?`先从「${source.name}」中规划「${semantic}」的可移动图层；请在任务卡确认目标、位置与遮挡补全。`:`先基于「${source.name}」规划「${semantic}」的受控变体；请在任务卡确认每项的目标与位置。`,sources,tasks:[{id:layering?'layer-subject':'variant-subject',title:layering?`分层 ${semantic}`:`变体 ${semantic}`,sourceReferenceId:deriveReferenceId(source),kind:layering?'semantic-cutout':'generated-variant',semantic,roi:layering?{x:.05,y:.05,w:.9,h:.9}:null,occlusionRepair:false,notes:layering?'本地规划器未识别具体位置；请在后续位置审阅中确认。':'本地规划器默认整图变体；可在后续位置审阅中限定区域。',risk:'候选仍须经过人工审阅。'}]};
      return derived.plan(input);
    }
    function createDeriveRun(plan){
      const runState=global.EditorVNextDerivedAssetRunState,source=references.find(item=>item.role==='source'&&item.assetId);
      if(!runState)throw new Error('编辑器尚未加载素材衍生 Run 状态模块');if(!source)throw new Error('请先添加一张标为“源图”的素材参考。');
      const cards=plan.tasks.map((task,index)=>({id:task.id,target:task.semantic,roi:task.roi,occlusionRepair:task.occlusionRepair,agentNotes:task.notes,order:index+1}));
      if(deriveMode==='layering'&&!cards.some(card=>card.kind==='residual-background'||card.target==='背景'))cards.push({id:'residual-background',kind:'residual-background',target:'背景',occlusionRepair:true,agentNotes:'由其他图层的第一轮 Alpha 残余得到。'});
      return runState.create({id:`derive-${Date.now().toString(36)}`,mode:deriveMode,source:{assetId:source.assetId,referenceId:deriveReferenceId(source),snapshotId:source.id},originalIntent:lastIntent&&lastIntent.subject,cards});
    }
    function taskForCard(card){
      const source=references.find(item=>item.role==='source'&&item.assetId),fromPlan=derivePlan&&derivePlan.tasks.find(item=>item.id===card.id);
      if(!source)throw new Error('当前 Run 缺少源图');
      return {id:card.id,title:card.target,sourceReferenceId:deriveReferenceId(source),kind:fromPlan&&fromPlan.kind||(deriveMode==='layering'?'semantic-cutout':'generated-variant'),semantic:card.target,roi:card.roi,occlusionRepair:card.occlusionRepair,frameCount:fromPlan&&fromPlan.frameCount||1,notes:card.agentNotes};
    }
    async function requestDerivePlan(){
      const source=references.find(item=>item.role==='source'&&item.assetId);
      if(!source){message('system','派生素材需要一张来自当前素材栏、并标为“源图”的参考。');render();return;}
      const derived=global.EditorVNextDerivedAssetProtocol,current=adapter();
      try{
        message('system','正在整理派生素材方案…');render();
        let raw=null;
        if(current&&typeof current.propose==='function')raw=await current.propose(Object.assign({phase:'derive-plan',workflow:'asset-derive',intent:lastIntent},scope()));
        if(raw&&(raw.format===derived.PLAN_FORMAT||raw.plan)){
          const proposal=raw.plan||raw,sources=references.map(item=>({id:deriveReferenceId(item),assetId:item.assetId,name:item.name,role:item.role}));
          derivePlan=derived.plan(Object.assign({},proposal,{sources}));
        }else derivePlan=localDerivePlan();
        deriveRun=createDeriveRun(derivePlan);selectedDeriveId=null;derivedReview=null;
        conversation=conversation.filter(item=>item.kind!=='system');message('assistant',derivePlan.summary);
      }catch(error){conversation=conversation.filter(item=>item.kind!=='system');message('system','无法生成派生方案：'+(error&&error.message||error));}
      render();
    }
    function reviewPreview(asset){return asset&&asset.locator||asset&&asset.frames&&asset.frames[0]&&asset.frames[0].locator||'';}
    async function requestDerivedReview(task,button){
      const source=references.find(item=>deriveReferenceId(item)===task.sourceReferenceId),controller=typeof options.derivedAssets==='function'?options.derivedAssets():options.derivedAssets;
      if(!source||!source.assetId){message('system','该任务缺少可冻结的素材源图。');render();return;}
      if(!controller||typeof controller.request!=='function'){message('system','当前编辑器未连接派生素材控制器。');render();return;}
      try{button.disabled=true;message('system','正在生成透明素材候选…');render();derivedReview=await controller.request({sourceMode:source.assetId,kind:task.kind,semantic:task.semantic,frameCount:task.frameCount,notes:task.notes});conversation=conversation.filter(item=>item.kind!=='system');message('assistant','透明候选已生成。请检查边缘和主体完整性，再决定是否加入素材栏。');}catch(error){conversation=conversation.filter(item=>item.kind!=='system');message('system','生成候选失败：'+(error&&error.message||error));}finally{button.disabled=false;render();}
    }
    function acceptDerivedReview(){
      const controller=typeof options.derivedAssets==='function'?options.derivedAssets():options.derivedAssets;
      try{if(!controller||typeof controller.accept!=='function')throw new Error('当前编辑器未连接派生素材控制器');const result=controller.accept(derivedReview);message('assistant',`已将「${result.asset.name}」作为可撤销变更加入素材栏。`);derivedReview=null;}catch(error){message('system','无法接受候选：'+(error&&error.message||error));}render();
    }
    function openPositionEditor(task){
      const source=references.find(item=>item.role==='source'&&item.assetId),runState=global.EditorVNextDerivedAssetRunState;
      if(!source||!source.dataUrl||!runState){message('system','当前位置审阅需要冻结的源图与 Run 状态。');render();return;}
      let value=Object.assign({},task.roi||{x:.1,y:.1,w:.8,h:.8}),gesture=null;const clamp=(number,min,max)=>Math.max(min,Math.min(max,number));
      const overlay=el('div','wizard-mask agent-roi-mask'),panel=el('section','wizard agent-roi-wizard'),head=el('div','agent-creative-head'),title=el('h2','',`位置 · ${task.target}`),close=el('button','agent-creative-close','×'),hint=el('p','agent-creative-intro','拖动框体移动位置；拖动四角改变范围。框选表示该任务可处理的图源区域。'),stage=el('div','agent-roi-stage'),image=root.createElement('img'),selectionBox=el('div','agent-roi-selection'),actions=el('div','agent-creative-draft-actions'),cancel=el('button','small','取消'),apply=el('button','small primary','应用位置');
      close.type=cancel.type=apply.type='button';image.src=source.dataUrl;image.alt=source.name;image.draggable=false;head.append(title,close);stage.append(image,selectionBox);actions.append(cancel,apply);panel.append(head,hint,stage,actions);overlay.append(panel);root.body.append(overlay);
      const renderBox=()=>{selectionBox.style.left=`${value.x*100}%`;selectionBox.style.top=`${value.y*100}%`;selectionBox.style.width=`${value.w*100}%`;selectionBox.style.height=`${value.h*100}%`;};
      for(const corner of ['nw','ne','se','sw']){const handle=el('span',`agent-roi-handle ${corner}`);handle.dataset.corner=corner;selectionBox.append(handle);handle.addEventListener('pointerdown',event=>start('resize',corner,event));}
      const point=event=>{const rect=stage.getBoundingClientRect();return{x:clamp((event.clientX-rect.left)/Math.max(1,rect.width),0,1),y:clamp((event.clientY-rect.top)/Math.max(1,rect.height),0,1)};};
      const start=(kind,corner,event)=>{event.preventDefault();event.stopPropagation();gesture={kind,corner,start:point(event),initial:Object.assign({},value)};stage.setPointerCapture&&stage.setPointerCapture(event.pointerId);};
      selectionBox.addEventListener('pointerdown',event=>{if(event.target===selectionBox)start('move','',event);});
      stage.addEventListener('pointerdown',event=>{if(event.target!==stage&&event.target!==image)return;const p=point(event);value={x:p.x,y:p.y,w:.01,h:.01};renderBox();start('resize','se',event);});
      stage.addEventListener('pointermove',event=>{if(!gesture)return;const p=point(event),dx=p.x-gesture.start.x,dy=p.y-gesture.start.y,initial=gesture.initial;if(gesture.kind==='move'){value.x=clamp(initial.x+dx,0,1-initial.w);value.y=clamp(initial.y+dy,0,1-initial.h);}else{let left=initial.x,top=initial.y,right=initial.x+initial.w,bottom=initial.y+initial.h;if(gesture.corner.includes('w'))left=clamp(p.x,0,right-.01);if(gesture.corner.includes('e'))right=clamp(p.x,left+.01,1);if(gesture.corner.includes('n'))top=clamp(p.y,0,bottom-.01);if(gesture.corner.includes('s'))bottom=clamp(p.y,top+.01,1);value={x:left,y:top,w:right-left,h:bottom-top};}renderBox();});
      stage.addEventListener('pointerup',()=>{gesture=null;});stage.addEventListener('pointercancel',()=>{gesture=null;});
      const dismiss=()=>overlay.remove();close.addEventListener('click',dismiss);cancel.addEventListener('click',dismiss);overlay.addEventListener('pointerdown',event=>{if(event.target===overlay)dismiss();});apply.addEventListener('click',()=>{deriveRun=runState.editCard(deriveRun,task.id,{roi:value});selectedDeriveId=task.id;derivedReview=null;dismiss();message('assistant',`已更新「${task.target}」的位置。`);render();});renderBox();
    }
    function renderDeriveSlot(slot){
      if(!slot)return;slot.innerHTML='';slot.hidden=workflow!=='asset-derive';if(slot.hidden)return;
      const runState=global.EditorVNextDerivedAssetRunState;
      if(derivePlan)slot.append(el('b','',deriveMode==='layering'?'素材分层':'变体生成'),el('p','',derivePlan.summary));
      if(deriveRun){
        const list=el('div','agent-creative-derive-task-list');
        for(const task of deriveRun.cards){
          const card=el('section','agent-creative-derive-task'+(task.id===selectedDeriveId?' selected':''),null),head=el('div','agent-creative-derive-task-head'),order=el('strong','',String(task.order).padStart(2,'0')),target=root.createElement('input'),location=el('button','small',task.roi?'位置：已定位':'位置：整图'),repair=root.createElement('label'),repairInput=root.createElement('input'),remove=el('button','small','×');
          target.value=task.target;target.setAttribute('aria-label',`任务 ${task.order} 的目标`);target.addEventListener('change',()=>{deriveRun=runState.editCard(deriveRun,task.id,{target:target.value});selectedDeriveId=task.id;derivedReview=null;render();});
          location.type='button';location.title='在源图上调整位置框';location.addEventListener('click',()=>{selectedDeriveId=task.id;openPositionEditor(task);});
          repairInput.type='checkbox';repairInput.checked=task.occlusionRepair;repair.append(repairInput,root.createTextNode(`遮挡补全：${task.occlusionRepair?'是':'否'}`));repairInput.addEventListener('change',()=>{deriveRun=runState.editCard(deriveRun,task.id,{occlusionRepair:repairInput.checked});selectedDeriveId=task.id;derivedReview=null;render();});
          remove.type='button';remove.title='删除任务';remove.addEventListener('click',()=>{deriveRun=runState.removeCard(deriveRun,task.id);if(selectedDeriveId===task.id)selectedDeriveId=null;derivedReview=null;render();});
          head.append(order,target,location);if(deriveMode==='layering')head.append(repair);head.append(remove);card.append(head);if(task.agentNotes)card.append(el('small','',task.agentNotes));card.addEventListener('click',()=>{if(selectedDeriveId!==task.id){selectedDeriveId=task.id;render();}});list.append(card);
        }
        slot.append(list);const add=el('button','small','+ 添加任务');add.type='button';add.addEventListener('click',()=>{const count=deriveRun.cards.length+1,kind=deriveMode==='layering'?'新图层':'新变体';deriveRun=runState.addCard(deriveRun,{id:`task-${count}`,target:kind,roi:deriveMode==='layering'?{x:.05,y:.05,w:.9,h:.9}:null,occlusionRepair:false});selectedDeriveId=`task-${count}`;derivedReview=null;render();});slot.append(add);
      }
      const task=selectedDerive();
      if(task&&task.kind!=='residual-background'&&!derivedReview){const make=el('button','small primary',deriveMode==='layering'?'生成第一轮 Alpha 候选':'生成候选');make.type='button';make.addEventListener('click',()=>requestDerivedReview(taskForCard(task),make));slot.append(make);}
      if(derivedReview&&derivedReview.asset){const asset=derivedReview.asset,previewUrl=reviewPreview(asset),review=el('div','agent-creative-draft');review.append(el('b','',`候选：${asset.name}`),el('p','',`${asset.width}×${asset.height}${asset.frames?` · ${asset.frames.length} 帧`:''}`));if(previewUrl){const image=root.createElement('img');image.className='agent-creative-draft-preview';image.src=previewUrl;image.alt=asset.name;review.append(image);}const actions=el('div','agent-creative-draft-actions'),accept=el('button','small primary','接受到素材栏'),discard=el('button','small','丢弃候选');accept.type=discard.type='button';accept.addEventListener('click',acceptDerivedReview);discard.addEventListener('click',()=>{derivedReview=null;message('assistant','已丢弃透明候选；素材栏没有改动。');render();});actions.append(accept,discard);review.append(actions);slot.append(review);}
    }
    function ingest(raw,phase){
      const response=protocol.response(raw,phase);if(response.reply)message('assistant',response.reply);if(response.phase==='directions'){lastCandidates=response.candidates.slice();selectedId=null;}mask._question=response.question;render();return response;
    }
    async function request(phase){
      if(!lastIntent)return;const current=adapter();if(!current||typeof current.propose!=='function'){ingest(localEnvelope(lastIntent,phase),phase);return;}
      message('system','正在等待 Agent 的创作判断…');render();try{const response=await current.propose(Object.assign({phase,intent:lastIntent},scope()));conversation=conversation.filter(item=>item.kind!=='system');ingest(response,phase);}catch(error){conversation=conversation.filter(item=>item.kind!=='system');message('system','Agent 暂时未响应：'+(error&&error.message||error));render();}
    }
    function answer(key,value,label){
      if(!lastIntent)return;lastIntent=protocol.normalizeIntent(Object.assign({},lastIntent,{[key]:value}));mask._question=null;message('user',label);request('directions');
    }
    async function draftFromBuild(result,requestScope){
      const canvas=requestScope&&requestScope.canvas||{},baseMeta={type:canvas.base||base,sceneRevision:canvas.sceneRevision},scopeMeta=canvas.scope||{type:'scene',ids:[]};
      if(result&&Array.isArray(result.files)){
        const packages=global.EditorVNextAgentDraftPackage,projects=global.EditorVNextProjectPackage;
        if(!packages||!projects)throw new Error('编辑器尚未加载 Draft Package 支持');
        const checked=packages.inspect(result.files),restored=await projects.restore(result.files),previewFile=checked.preview&&checked.files.get(checked.preview),preview=previewFile?{url:projects.bytesDataUrl(previewFile.data,previewFile.mime),alt:checked.title+' 预览'}:null;
        const value=protocol.build({format:protocol.BUILD_FORMAT,kind:'scene-draft',title:checked.title,summary:checked.summary,changes:checked.changes,scene:restored.scene,preview,base:baseMeta,scope:scopeMeta});
        return Object.freeze(Object.assign({},value,{package:checked,carrier:checked.carrier}));
      }
      return protocol.build(Object.assign({},result,{base:result&&result.base||baseMeta,scope:result&&result.scope||scopeMeta}));
    }
    async function build(candidate,button){
      const current=adapter();if(!current||typeof current.build!=='function'){message('assistant','方向已锁定。当前尚未连接可生成临时 Scene 的 Agent；接入后仍由你决定是否应用。');render();return;}
      button.disabled=true;message('system','Agent 正在生成临时 Scene…');render();try{const requestScope=scope();buildBaseline={revision:workspace.revision,scene:JSON.parse(JSON.stringify(workspace.requireDocument()))};const result=await current.build(Object.assign({intent:lastIntent,candidate},requestScope));draft=await draftFromBuild(result,requestScope);if(typeof options.onBuild==='function')await options.onBuild(draft,{intent:lastIntent,candidate});conversation=conversation.filter(item=>item.kind!=='system');message('assistant','临时 Scene Draft 已校验。请先检查预计变化和作用范围，再决定是否应用。');}catch(error){conversation=conversation.filter(item=>item.kind!=='system');message('system','生成失败：'+(error&&error.message||error));buildBaseline=null;}finally{button.disabled=false;render();}
    }
    function applyDraft(){
      if(!draft)return;try{protocol.assertApplicable(draft,workspace.revision);if(draft.scope.type==='selection')protocol.assertScopePreserved(draft,buildBaseline&&buildBaseline.scene);const next=JSON.parse(JSON.stringify(draft.scene)),apply=scene=>{Object.keys(scene).forEach(key=>delete scene[key]);Object.assign(scene,next);};if(options.changes&&typeof options.changes.run==='function')options.changes.run('应用 Agent Scene Draft',apply);else workspace.replace(next);message('assistant','已将 Scene Draft 作为一条可撤销变更应用到当前项目。');draft=null;buildBaseline=null;lastCandidates=[];selectedId=null;}catch(error){message('system','无法应用：'+(error&&error.message||error));}render();
    }
    function submit(text){
      const subject=String(text||'').trim();if(!subject)return false;lastIntent=protocol.normalizeIntent({subject,output:'recommend',control:'semantic',assetPolicy:'agent-ok',dimensions:{width:workspace.requireDocument().width,height:workspace.requireDocument().height},loop:workspace.requireDocument().loop});lastCandidates=[];selectedId=null;derivePlan=null;deriveRun=null;selectedDeriveId=null;derivedReview=null;conversation=[];message('user',subject);if(workflow==='asset-derive')requestDerivePlan();else request('intake');return true;
    }
    function open(){
      close();mask=el('div','wizard-mask agent-creative-mask');const box=el('section','wizard agent-creative-wizard'),head=el('div','agent-creative-head'),title=el('h2','', 'Agent 创作'),dismiss=el('button','agent-creative-close','×');dismiss.type='button';dismiss.title='关闭';dismiss.addEventListener('click',close);head.append(title,dismiss);const intro=el('p','agent-creative-intro','从一句话开始：起景 / 编排会生成可审阅的 Scene Draft；派生素材只会生成透明素材候选，接受后才进入素材栏。'),contextSlot=el('div','agent-creative-context'),referenceSlot=el('div','agent-creative-reference'),chat=el('div','agent-creative-chat'),composer=el('form','agent-creative-composer'),input=root.createElement('textarea'),send=el('button','primary','发送');input.name='prompt';input.rows=2;input.placeholder='例如：分离红衣徒步者，保留人物完整轮廓';send.type='submit';composer.append(input,send);composer.addEventListener('submit',event=>{event.preventDefault();if(submit(input.value)){input.value='';input.disabled=true;send.disabled=true;Promise.resolve().then(()=>{input.disabled=false;send.disabled=false;input.focus();});}});const selectionSlot=el('div','agent-creative-selection'),draftSlot=el('div','agent-creative-draft'),deriveSlot=el('div','agent-creative-derive');selectionSlot.hidden=true;draftSlot.hidden=true;deriveSlot.hidden=true;box.append(head,intro,contextSlot,referenceSlot,chat,composer,selectionSlot,draftSlot,deriveSlot);mask.append(box);mask.addEventListener('pointerdown',event=>{if(event.target===mask)close();});root.body.append(mask);message('assistant','告诉我你想新建、编排或派生什么；我会先给你一份可审阅的方案。');render();input.focus();return mask;
    }
    return Object.freeze({open,close,submit,ingest,get lastIntent(){return lastIntent;},get candidates(){return Object.freeze(lastCandidates.slice());},get selected(){return selected();}});
  }
  global.EditorClassicV4AgentCreativeController=Object.freeze({create});
})(typeof window !== 'undefined' ? window : globalThis);
