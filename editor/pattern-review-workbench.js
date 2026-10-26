/* Interactive review shell. No project mutation, installation or publication. */
(function(global){
  'use strict';
  function create(host,candidate){
    const timing=global.ToSampoolRuntimeVNext.modules.parameterTiming,shared=global.EditorV4ParameterControls,model=shared.compile(candidate),parameters=model.parameters;
    parameters.forEach(p=>timing.capability(p));
    const root=host.ownerDocument,make=(tag,cls,text)=>{const n=root.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
    const state={base:candidate.defaults(),target:candidate.defaults(),armed:new Set(),experiment:false,transition:true,edit:'start',duration:12,time:0,playing:!global.matchMedia('(prefers-reduced-motion: reduce)').matches};
    let storage;try{storage=global.localStorage;}catch{}
    const review=global.ToSampoolEffectReviewState.create(candidate,storage);
    const restored=review.preview;
    if(restored){state.base=candidate.normalize(restored.base);state.target=candidate.normalize(restored.target);state.armed=new Set((restored.armed||[]).filter(key=>parameters.some(p=>p.key===key)));state.experiment=!!restored.experiment;state.transition=restored.transition!==false;state.duration=Math.max(.5,Math.min(120,+restored.duration||12));}
    const header=make('header'),heading=make('div'),title=make('input','review-title review-name'),actions=make('div','header-actions');
    title.value=review.data.name;title.setAttribute('aria-label','图样名称');title.dataset.reviewName='';title.maxLength=80;
    heading.append(title);header.append(heading,actions);
    const layout=make('div','review-layout'),stage=make('section','review-stage'),aside=make('aside'),top=make('div','review-topline'),resolution=make('select'),stats=make('span');
    for(const [value,label]of [['960','960 × 540'],['1920','1920 × 1080']]){const o=make('option','',label);o.value=value;resolution.append(o);}top.append(resolution,stats);
    const wrap=make('div','review-canvas-wrap'),canvas=make('canvas');canvas.width=960;canvas.height=540;canvas.dataset.reviewCanvas='';wrap.append(canvas);const ctx=canvas.getContext('2d');
    const controls=make('div','review-controls'),play=make('button'),seek=make('input'),time=make('span','review-time');seek.type='range';seek.min='0';seek.max='12';seek.step='.01';seek.value='0';seek.setAttribute('aria-label','预览时间');controls.append(play,seek,time);
    const segmentRow=make('div','review-segments'),segmentButtons=[];for(const [id,label]of [['start','起始段'],['change','变化段'],['target','目标段']]){
      const b=make('button','',label);b.dataset.reviewSegment=id;b.onclick=()=>{state.edit=id;state.time=state.duration*({start:1/6,change:1/2,target:5/6}[id]);state.playing=false;renderFields();draw();};segmentButtons.push(b);segmentRow.append(b);
    }
    const testOptions=make('div','review-test-options'),transition=make('select'),duration=make('input');
    for(const [value,label]of [['linear','中段过渡'],['hold','中段保持']]){const o=make('option','',label);o.value=value;transition.append(o);}transition.setAttribute('aria-label','中间段方式');
    duration.type='number';duration.min='.5';duration.max='120';duration.step='.5';duration.value='12';duration.className='review-duration';duration.setAttribute('aria-label','预览周期时间');
    testOptions.append(transition,make('span','review-note','周期时间'),duration);stage.append(top,wrap,controls,segmentRow,testOptions);
    const toolbar=make('div','review-toolbar'),reference=make('button','','参考构图'),center=make('button','','居中放射');toolbar.append(reference,center);
    toolbar.hidden=!parameters.some(p=>p.key==='centerX')||!parameters.some(p=>p.key==='centerY');
    const testLabel=make('label','review-field review-experiment'),testName=make('span','','时序试验'),testToggle=make('input');testToggle.type='checkbox';testToggle.dataset.reviewExperiment='';testLabel.append(testName,testToggle);
    const fields=make('div'),paintFields=new Map(),colorPopover=global.EditorV4ColorPopover.forDocument(root);
    testToggle.title='起始段编辑基础值；目标段点击 ◷ 设置目标；变化段只读。';
    const parameterHeader=make('div','review-parameter-header'),parameterReset=make('button','','重置');parameterReset.dataset.parameterReset='';parameterHeader.append(make('h2','','图样参数'),parameterReset);
    const noteBlock=make('section','review-feedback'),generalNote=make('textarea'),adopt=make('button','','采用当前基础值为默认值');generalNote.placeholder='修订备注';generalNote.setAttribute('aria-label','修订备注');generalNote.value=review.data.note;generalNote.maxLength=4000;adopt.dataset.reviewAdopt='';noteBlock.append(adopt,generalNote);
    aside.append(parameterHeader,testLabel,toolbar,fields,noteBlock);layout.append(stage,aside);host.append(header,layout);
    const status=make('span','review-save-status');status.setAttribute('role','status');actions.append(status);
    const jobPanel=make('section','review-job-panel');jobPanel.hidden=true;jobPanel.setAttribute('aria-label','Agent处理结果');aside.append(jobPanel);
    let transport=null,transportMessage='',jobId=null,jobTimer=null,jobSignature='',sharing=false;
    const receiptKey=review.key+':host-job';
    function snapshot(){return{base:{...state.base},target:{...state.target},armed:[...state.armed],duration:state.duration,experiment:state.experiment,transition:state.transition};}
    function updateReview(){confirm.textContent=review.changed()?'确认本轮修订':'确认本轮通过';status.textContent=review.error?'保存失败':transportMessage||(review.data.confirmation?'本轮已确认 · 未回传':'草稿已保存');status.title=review.error||'处理以已确认快照为准；继续编辑不会修改已提交任务';status.classList.toggle('error',!!review.error);title.classList.toggle('revised',review.data.name!==candidate.name);adopt.textContent=review.data.defaults?'更新建议默认值':'采用当前基础值为默认值';}
    async function acceptJob(job){
      jobId=job.id;try{storage?.setItem(receiptKey,JSON.stringify({id:jobId}));}catch{}
      const names={queued:'宿主已接收',running:'Agent处理中','needs-input':'等待你的回答','preview-ready':'新版预览已就绪',packaged:'正式包已就绪',shared:'已加入共享图样',blocked:'处理受阻',failed:'处理失败',interrupted:'处理已中断'};
      transportMessage=names[job.status]||job.status;updateReview();
      const signature=JSON.stringify(job);if(signature!==jobSignature){jobSignature=signature;jobPanel.hidden=false;jobPanel.replaceChildren();jobPanel.append(make('h3','',transportMessage),make('p','',job.result?.summary||job.message||''));
        if(job.result?.reason)jobPanel.append(make('p','',job.result.reason));
        if(job.result?.parameters){const list=make('dl');for(const p of job.result.parameters){list.append(make('dt','',p.label),make('dd','',String(p.default)));}jobPanel.append(make('strong','',job.result.name),list);}
        if(job.status==='needs-input'){const answers=[];for(const q of job.result.questions){const label=make('label','review-question',q.question),input=make('textarea');input.maxLength=2000;input.setAttribute('aria-label',q.question);label.append(input);jobPanel.append(label);answers.push({id:q.id,input});}
          const send=make('button','','回答并继续');send.onclick=async()=>{send.disabled=true;try{if(answers.some(a=>!a.input.value.trim()))throw Error('请回答全部问题');await acceptJob(await transport.answer(jobId,answers.map(a=>({id:a.id,answer:a.input.value}))));}catch(e){transportMessage=e.message;updateReview();}finally{send.disabled=false;}};jobPanel.append(send);
        }
        if(job.status==='preview-ready'){const link=make('a','','打开下一版预览');link.href=job.result.previewUrl;jobPanel.append(link);}
        if(['packaged','shared'].includes(job.status)){const download=make('button','','下载正式资源包');download.onclick=()=>transport.download(job.id).catch(e=>{transportMessage=e.message;updateReview();});const editor=make('a','','打开编辑器共享库');editor.href='/img2asset-v4-classic.html?effectShared=1';editor.target='_blank';editor.rel='noopener';jobPanel.append(download,editor);}
        if(['failed','interrupted','blocked'].includes(job.status)){const retry=make('button','','重试');retry.onclick=()=>transport.retry(job.id).then(acceptJob).catch(e=>{transportMessage=e.message;updateReview();});jobPanel.append(retry);}
      }
      if(job.status==='packaged'&&!sharing){sharing=true;try{const library=global.EditorV4ResourceLibrary.create();let pub;try{pub=await global.ToSampoolEffectReviewDelivery.importShared(job.result.bundle,library);}finally{await library.close();}if(typeof BroadcastChannel==='function'){const channel=new BroadcastChannel('tosampool-effect-delivery');channel.postMessage({kind:'effect-shared',id:pub.id});channel.close();}await acceptJob(await transport.shared(job.id,{publicationId:pub.id,bundleHash:pub.hash}));}catch(e){transportMessage='共享入库失败：'+e.message;updateReview();if(!jobPanel.querySelector('[data-retry-share]')){const retry=make('button','','重试入库');retry.dataset.retryShare='';retry.onclick=()=>acceptJob(job);jobPanel.append(retry);}}finally{sharing=false;}}
      clearTimeout(jobTimer);if(['queued','running'].includes(job.status))jobTimer=setTimeout(pollJob,1200);
    }
    async function pollJob(){if(stopped||!transport||!jobId)return;try{await acceptJob(await transport.get(jobId));}catch(e){transportMessage='回传连接中断：'+e.message;updateReview();jobTimer=setTimeout(pollJob,5000);}}
    function savePreview(){review.setPreview(snapshot());updateReview();}
    title.oninput=()=>{review.setName(title.value);updateReview();};title.onblur=()=>{if(!title.value.trim()){title.value=candidate.name;review.setName(title.value);updateReview();}};
    generalNote.oninput=()=>{review.setNote(null,generalNote.value);updateReview();};adopt.onclick=()=>{review.adoptDefaults(state.base);updateReview();adopt.textContent='已记录默认值';};
    let stopped=false,raf=0,last=performance.now(),lastPaint=0,drawCount=0;const samples=[];
    function values(){if(!state.experiment)return candidate.normalize(state.base);const track=timing.threeSegments(state.base,state.target,state.armed,parameters,state.transition);return candidate.normalize(timing.evaluate(state.base,track,Math.max(0,Math.min(1,state.time/state.duration)),parameters));}
    function draw(){
      const start=performance.now();ctx.clearRect(0,0,canvas.width,canvas.height);const evaluated=values();candidate.paint(ctx,evaluated,state.time,{x:24,y:24,w:canvas.width-48,h:canvas.height-48});
      if(state.experiment&&state.edit==='change')for(const p of parameters){const input=fields.querySelector('[data-review-param="'+p.key+'"]');if(!input||!['INPUT','SELECT'].includes(input.tagName))continue;if(p.type==='boolean')input.checked=evaluated[p.key];else input.value=shared.display(p,evaluated[p.key]);}
      for(const {control,param,alpha}of paintFields.values()){control.setPaint(evaluated[param.key],evaluated[alpha.key],null);control.setEditable({color:editable(param),alpha:editable(alpha)});}
      samples.push(performance.now()-start);if(samples.length>120)samples.shift();drawCount++;const sorted=samples.slice().sort((a,b)=>a-b),p95=sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)];
      stats.textContent='30fps · 提交 P95 '+p95.toFixed(2)+'ms';stats.title='Canvas命令提交耗时，包含预热样本；不代表完整显示合成';play.textContent=state.playing?'❚❚ 暂停':'▶ 播放';play.classList.toggle('active',state.playing);seek.max=String(state.duration);seek.value=String(state.time);time.textContent=state.time.toFixed(2)+' / '+state.duration.toFixed(1)+'s';
      segmentRow.hidden=testOptions.hidden=!state.experiment;for(const b of segmentButtons)b.classList.toggle('active',b.dataset.reviewSegment===state.edit);
    }
    function renderFields(){
      colorPopover.close();paintFields.clear();fields.replaceChildren();testToggle.checked=state.experiment;
      const current=state.edit==='target'&&state.experiment?{...state.base,...Object.fromEntries([...state.armed].map(key=>[key,state.target[key]]))}:state.edit==='change'&&state.experiment?values():state.base;
      function annotation(p,input){
        const label=make('span'),name=make('input','review-name'),badge=make('small','capability',timing.capability(p).timing);
        name.value=review.data.labels[p.key]??p.label;name.maxLength=60;name.dataset.reviewLabel=p.key;name.setAttribute('aria-label',p.label+'名称');name.classList.toggle('revised',name.value!==p.label);name.oninput=()=>{review.setLabel(p.key,name.value);name.classList.toggle('revised',name.value!==p.label);updateReview();};name.onblur=()=>{if(!name.value.trim()){name.value=p.label;review.setLabel(p.key,p.label);updateReview();}};
        const annotate=make('button','review-note-button','✎');annotate.type='button';annotate.setAttribute('aria-label',p.label+'修订备注');annotate.dataset.reviewAnnotate=p.key;const note=make('textarea','review-param-note');note.value=review.data.notes[p.key]||'';note.placeholder='修订备注';note.maxLength=2000;note.setAttribute('aria-label',p.label+'备注');note.hidden=!note.value;annotate.classList.toggle('active',!!note.value);annotate.setAttribute('aria-expanded',String(!note.hidden));annotate.onclick=()=>{note.hidden=!note.hidden;annotate.setAttribute('aria-expanded',String(!note.hidden));if(!note.hidden)note.focus();};note.oninput=()=>{review.setNote(p.key,note.value);annotate.classList.toggle('active',!!note.value);updateReview();};
        label.append(name,badge,annotate);input.dataset.reviewParam=p.key;input.setAttribute('aria-label',p.label);
        if(state.experiment&&state.edit!=='start'&&timing.capability(p).timing!=='No'){
          const clock=shared.timingButton({root,param:p,read:()=>({active:state.armed.has(p.key),has:state.armed.has(p.key),editable:editable(p),segmentType:state.edit==='change'&&state.transition?'linear':'step',readOnly:state.edit==='change',title:'目标段 · '+timing.capability(p).timing}),change:active=>{if(active)state.armed.add(p.key);else state.armed.delete(p.key);state.target[p.key]=state.base[p.key];input.disabled=state.edit==='change'||!state.armed.has(p.key);if(input.tagName==='INPUT'){if(p.type==='boolean')input.checked=state.base[p.key];else input.value=shared.display(p,state.base[p.key]);}savePreview();draw();}});clock.dataset.reviewClock=p.key;clock.dataset.channelLabel=p.label;clock.dataset.colorTimingChannel=p.type==='color'?'color':'alpha';label.append(clock);
          input.disabled=state.edit==='change'||!state.armed.has(p.key)||timing.capability(p).timing==='No';
        }
        return {label,note};
      }
      function write(p,value){
        if(state.experiment&&state.edit==='target'){
          if(!state.armed.has(p.key)||timing.capability(p).timing==='No')return;
          state.target[p.key]=value;
        }else if(state.experiment&&state.edit==='change')return;
        else{state.base[p.key]=value;if(!state.armed.has(p.key))state.target[p.key]=value;}
      }
      const conditions=new Set(parameters.map(p=>p.when).filter(Boolean));
      function changed(key){savePreview();if(conditions.has(key))renderFields();draw();}
      for(const binding of shared.plan(model,current)){
        const p=binding.param,row=make('div','review-field');row.dataset.parameterControl=p.key;
        if(binding.component==='color-alpha'){
          row.dataset.colorAlpha=p.key;
          const alpha={...binding.alpha,percent:true},change=(color,opacity)=>{
            write(p,color);write(alpha,opacity);changed(p.key);
          };
          const nodes=global.EditorClassicV4ColorControl.controls({root,value:current[p.key],alpha:current[alpha.key],change,label:p.label,allowAlpha:true});
          const control=nodes[0],labels=make('div','review-paint-labels'),opacity=control.querySelector('.color-alpha'),colorMeta=annotation(p,control),alphaMeta=annotation(alpha,opacity);
          labels.append(colorMeta.label,alphaMeta.label);row.append(labels,control,colorMeta.note,alphaMeta.note);
          for(const clock of labels.querySelectorAll('[data-review-clock]'))shared.placeTiming(control,clock);
          paintFields.set(p.key,{control,param:p,alpha});
        }else{
          const input=shared.configure(make(p.type==='select'?'select':'input'),p,current[p.key]),meta=annotation(p,input);
          input.oninput=()=>{let value;try{value=shared.read(input,p);}catch{return;}write(p,value);changed(p.key);};
          row.append(meta.label,input,meta.note);const clock=meta.label.querySelector('[data-review-clock]');if(clock)shared.placeTiming(input,clock);
        }
        fields.append(row);
      }
    }
    function editable(param){return !state.experiment||state.edit==='start'||state.edit==='target'&&state.armed.has(param.key)&&timing.capability(param).timing!=='No';}
    function preset(cx,cy){state.base.centerX=cx;state.base.centerY=cy;for(const key of ['centerX','centerY'])if(!state.armed.has(key))state.target[key]=state.base[key];savePreview();renderFields();draw();}
    reference.onclick=()=>preset(.62,.58);center.onclick=()=>preset(.5,.5);
    play.onclick=()=>{state.playing=!state.playing;last=performance.now();draw();};seek.oninput=()=>{state.time=+seek.value;state.playing=false;draw();};resolution.onchange=()=>{canvas.width=+resolution.value;canvas.height=+resolution.value*9/16;samples.length=0;draw();};
    testToggle.onchange=()=>{state.experiment=testToggle.checked;state.edit='start';savePreview();renderFields();draw();};transition.onchange=()=>{state.transition=transition.value==='linear';savePreview();draw();};
    duration.value=String(state.duration);transition.value=state.transition?'linear':'hold';
    duration.onchange=()=>{if(!duration.validity.valid)return;state.duration=+duration.value;state.time=Math.min(state.time,state.duration);savePreview();draw();};
    const reset=make('button','','修订重置'),confirm=make('button','review-confirm');reset.dataset.reviewReset='';confirm.dataset.reviewConfirm='';actions.append(reset,confirm);
    reset.onclick=()=>{review.reset();title.value=candidate.name;generalNote.value='';adopt.textContent='采用当前基础值为默认值';renderFields();updateReview();};
    parameterReset.onclick=()=>{state.base=candidate.defaults();state.target=candidate.defaults();state.armed.clear();state.experiment=false;state.edit='start';state.time=0;state.playing=false;savePreview();renderFields();draw();};
    confirm.onclick=async()=>{confirm.disabled=true;try{if(document.querySelector('meta[name="tosampool-effect-review-host"]')&&!transport)throw Error('宿主尚未连接，请刷新后重试；本轮未提交');review.setPreview(snapshot());const result=review.confirm();updateReview();global.dispatchEvent(new CustomEvent('tosampool:effect-review-confirmed',{detail:result}));if(transport)await acceptJob(await transport.submit(result));}catch(e){status.textContent=e.message;status.classList.add('error');}finally{confirm.disabled=false;}};
    function proposal(){return{format:'tosampool-pattern-proposal/v1',status:'awaiting-visual-review',id:candidate.id,version:candidate.version,name:candidate.name,parameters,base:{...state.base},target:{...state.target},armed:[...state.armed],duration:state.duration,experiment:state.experiment,track:timing.threeSegments(state.base,state.target,state.armed,parameters,state.transition)};}
    // Accumulate elapsed time at the render cadence, not at the RAF cadence.
    function run(now){if(stopped)return;const delta=(now-last)/1000;last=now;if(state.playing){state.time=(state.time+delta)%state.duration;if(now-lastPaint>=1000/30){lastPaint=now;draw();}}raf=requestAnimationFrame(run);}
    review.flush();renderFields();updateReview();draw();raf=requestAnimationFrame(run);
    const hostExpected=!!document.querySelector('meta[name="tosampool-effect-review-host"]');confirm.disabled=hostExpected;
    global.ToSampoolEffectReviewTransport?.connect().then(value=>{transport=value;confirm.disabled=false;if(!transport)return;try{jobId=JSON.parse(storage?.getItem(receiptKey)||'null')?.id||null;}catch{}if(jobId)void pollJob();}).catch(e=>{confirm.disabled=false;transportMessage='宿主未连接：'+e.message;updateReview();});
    return Object.freeze({state,values,draw,proposal,review:()=>review.record(),performance:()=>({drawCount,samples:samples.slice()}),stop(){stopped=true;colorPopover.close();clearTimeout(jobTimer);cancelAnimationFrame(raf);}});
  }
  global.ToSampoolPatternReview=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
