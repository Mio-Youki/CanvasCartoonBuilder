/* Legacy timeline surface projected from the isolated v4 Scene. */
(function (global) {
  'use strict';

  function create(options) {
    options=options||{};
    const workspace=options.workspace,view=options.view,changes=options.changes,state=global.EditorVNextTimelineState,root=options.root||document,active=options.active||(()=>true);
    if(!workspace||!view||!changes||!state)throw new Error('Classic v4 Timeline Controller dependencies are incomplete');
    const top=root.getElementById('tl'),context=root.getElementById('tl-context'),labels=root.getElementById('tl-label-top'),sceneBar=root.getElementById('scene-bar'),note=root.getElementById('tl-context-note'),play=root.getElementById('tl-play'),linear=root.getElementById('tl-linear-toggle');
    if(!top||!context||!sceneBar)throw new Error('Classic v4 Timeline Controller cannot find the Legacy timeline surface');
    let dragging=null,stopped=false,mode='visibility',trackKey=null,trackLabel='',trackOptions=null,visibilityKey=null,visibilityLabel='';
    const scene=()=>workspace.requireDocument(),loop=()=>Math.max(.001,+scene().loop||4),time=()=>Math.max(0,Math.min(loop(),+(options.time&&options.time())||0)),rel=()=>time()/loop();
    function selected(){return (scene().entities||[]).find(item=>item.id===view.selectedId)||null;}
    function setup(canvas,height){const scale=Math.max(2,global.devicePixelRatio||1),width=canvas.clientWidth||320,w=Math.max(2,Math.round(width*scale)),h=Math.max(2,Math.round(height*scale));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const ctx=canvas.getContext('2d');ctx.setTransform(scale,0,0,scale,0,0);ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,width,height);return{ctx,width,height};}
    function drawPlayhead(ctx,width,height){ctx.fillStyle='#e5484d';ctx.fillRect(Math.round(rel()*width),0,1,height);}
    function renderLabels(){if(!labels)return;labels.innerHTML='';const duration=loop(),step=Math.max(1,Math.round(duration/8));for(let second=0;second<=duration+.0001;second+=step){const label=root.createElement('span');label.className='timeline-label '+(second===0?'tick edge-left':second+step>duration?'tick edge-right':'tick');label.textContent=Math.round(second*10)/10+'s';label.style.left=Math.max(0,Math.min(100,second/duration*100))+'%';labels.append(label);}}
    function addScene(index,placement){const segments=state.sceneSegments(scene(),false),segment=segments[index],start=segment.f[0],end=segment.f[1],cut=placement==='after'?start+(end-start)*.65:start+(end-start)*.35;changes.run('新增 Scene',value=>state.insertScene(value,index,cut,`场景 ${segments.length+1}`,placement));seek((placement==='after'?cut:start)*loop()+.0001);}
    function renderSceneBar(){sceneBar.innerHTML='';const segments=state.sceneSegments(scene(),false),current=state.sceneAt(scene(),rel()).index;segments.forEach((segment,index)=>{const chip=root.createElement('button'),f=segment.f||[0,1];chip.className='scene-chip'+(current===index?' active':'');chip.style.left=f[0]*100+'%';chip.style.width=(f[1]-f[0])*100+'%';chip.innerHTML='<span class="scene-label"></span><span class="scene-actions"><span class="scene-scope on"></span><span class="x">×</span></span>';chip.querySelector('.scene-label').textContent=segment.name||`场景 ${index+1}`;chip.title='点击切换 · 双击改名 · × 删除';chip.onclick=event=>{event.preventDefault();event.stopPropagation();if(event.target.classList.contains('x')){if(segments.length>1)changes.run('删除 Scene',value=>state.removeScene(value,index));seek(Math.min(f[0],.999999)*loop());}else seek(f[0]*loop()+.0001);};chip.ondblclick=event=>{event.preventDefault();event.stopPropagation();if(event.target.classList.contains('x'))return;const name=global.prompt&&global.prompt('Scene 名称：',segment.name||`场景 ${index+1}`);if(name&&name.trim())changes.run('重命名 Scene',value=>state.renameScene(value,index,name));};sceneBar.append(chip);if(index<segments.length-1){const add=root.createElement('button');add.className='scene-add scene-add-boundary';add.textContent='+';add.title='在此边界插入 Scene';add.style.left=f[1]*100+'%';add.onpointerdown=event=>{event.preventDefault();event.stopPropagation();};add.onclick=event=>{event.preventDefault();event.stopPropagation();addScene(index+1,'before');};sceneBar.append(add);}});const edge=(side)=>{const add=root.createElement('button');add.className='scene-add '+(side==='start'?'edge-start':'edge-end');add.textContent='+';add.title=side==='start'?'在开头插入 Scene':'在末尾插入 Scene';add.style.left=side==='start'?'0%':'100%';add.onpointerdown=event=>{event.preventDefault();event.stopPropagation();};add.onclick=event=>{event.preventDefault();event.stopPropagation();addScene(side==='start'?0:segments.length-1,side==='start'?'before':'after');};sceneBar.append(add);};edge('start');edge('end');}
    function renderTop(){const {ctx,width,height}=setup(top,20),duration=loop(),step=Math.max(1,Math.round(duration/8)),segments=state.sceneSegments(scene(),false),colors=['#e5484d','#3d9bf2','#2fbf6a','#e6a23c','#9b59d0','#00b8a0'];ctx.fillStyle='#f2f3f8';ctx.fillRect(0,0,width,height);for(let second=0;second<=duration+.0001;second+=step){const x=Math.round(second/duration*width);ctx.fillStyle='#c3c9d8';ctx.fillRect(x,0,1,height);}segments.forEach((segment,index)=>{const x=Math.round(segment.f[0]*width),w=Math.max(1,Math.round((segment.f[1]-segment.f[0])*width));ctx.fillStyle=colors[index%colors.length];ctx.globalAlpha=.1;ctx.fillRect(x,0,w,height);ctx.globalAlpha=1;if(index<segments.length-1){const boundary=Math.round(segment.f[1]*width);ctx.fillStyle='#9aa3b8';ctx.fillRect(boundary,0,1,height);ctx.fillStyle='#4a5266';ctx.beginPath();ctx.moveTo(boundary-3,0);ctx.lineTo(boundary+3,0);ctx.lineTo(boundary,4);ctx.closePath();ctx.fill();}});drawPlayhead(ctx,width,height);renderLabels();}
    function sceneTrackRange(){const id=trackOptions&&trackOptions.sceneSegmentId;if(!id)return null;const segment=state.sceneSegments(scene(),false).find(item=>item.id===id);return segment&&segment.f||null;}
    function sceneTrack(){return!!sceneTrackRange();}
    function project(position){const range=sceneTrackRange();return range?(+range[0]+(+position||0)*(+range[1]-+range[0])):(+position||0);}
    function unproject(position){const range=sceneTrackRange();return range?Math.max(0,Math.min(1,((+position||0)-(+range[0]))/Math.max(.000001,(+range[1])-(+range[0])))):(+position||0);}
    function snapSceneBoundary(position,canvas){
      const range=sceneTrackRange(),width=Math.max(1,canvas.getBoundingClientRect().width),limit=8/width;
      let nearest=position,distance=limit;
      for(const segment of state.sceneSegments(scene(),false).slice(0,-1)){
        const boundary=range?unproject(segment.f[1]):segment.f[1],delta=Math.abs(position-boundary);
        if(delta<=distance){nearest=boundary;distance=delta;}
      }
      return nearest;
    }
    function currentTrackKey(){const owner=selected();return mode==='property'?(trackKey||owner&&owner.id):(visibilityKey||owner&&owner.id);}
    function track(){const key=currentTrackKey();if(!key)return null;return mode==='property'?(scene().timeline&&scene().timeline.tracks&&scene().timeline.tracks[key]||null):state.visibility(scene(),key,false);}
    function currentVisibilityKey(){const owner=selected();return visibilityKey||owner&&owner.id||null;}
    function visibilityTrack(){const key=currentVisibilityKey();return key&&state.visibility(scene(),key,false)||null;}
    function propertySegmentRelevant(segment,key){
      if(!segment)return false;
      const prefix=trackOptions&&trackOptions.valuePrefix;
      if(segment.type==='linear'&&!prefix)return true;
      return Object.keys(segment.values||{}).some(name=>prefix?name===prefix||name.startsWith(prefix+'.'):key===currentVisibilityKey()?!name.startsWith('anim.'):true);
    }
    function propertySignature(segment,key){
      const prefix=trackOptions&&trackOptions.valuePrefix,base=key===currentVisibilityKey(),entries=Object.entries(segment.values||{}).filter(([name])=>prefix?name===prefix||name.startsWith(prefix+'.'):base?!name.startsWith('anim.'):true).sort(([a],[b])=>a.localeCompare(b));
      return JSON.stringify([segment.type||'step',entries,segment.type==='linear'&&!prefix?segment.from:null,segment.type==='linear'&&!prefix?segment.to:null]);
    }
    function projectedPropertySegments(input,key){
      const source=input&&input.segments||[];
      if(/^(effect|controller):/.test(key||''))return source;
      const projected=[];
      for(const segment of source){
        const signature=propertySignature(segment,key),previous=projected[projected.length-1];
        if(previous&&previous.signature===signature&&Math.abs(previous.segment.f[1]-segment.f[0])<.000001)previous.segment.f[1]=segment.f[1];
        else projected.push({signature,segment:Object.assign({},segment,{f:segment.f.slice()})});
      }
      return projected.map(entry=>entry.segment);
    }
    function propertyBoundaryAt(position,canvas){
      const input=track(),key=currentTrackKey();if(!input||!Array.isArray(input.segments))return-1;
      const tolerance=6/Math.max(1,canvas.getBoundingClientRect().width),always=/^(effect|controller):/.test(key||'');
      for(let index=0;index<input.segments.length-1;index++)if(Math.abs(position-input.segments[index].f[1])<=tolerance&&(always||propertySignature(input.segments[index],key)!==propertySignature(input.segments[index+1],key)))return index;
      return-1;
    }
    function renderContext(){
      const {ctx,width,height}=setup(context,27);
      if(mode==='scene-background'){
        ctx.fillStyle='#171d27';ctx.fillRect(0,0,width,height);
        for(const segment of state.sceneSegments(scene(),false)){
          const f=segment.f||[0,1],x=Math.round(f[0]*width),w=Math.max(1,Math.round((f[1]-f[0])*width));
          ctx.fillStyle='#56c8f0';ctx.globalAlpha=.65;ctx.fillRect(x,6,w,15);ctx.globalAlpha=1;
          ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.strokeRect(x+.5,6.5,Math.max(0,w-1),14);
        }
        if(note)note.textContent='场景背景 · 跟随 Scene 分段';
        if(linear)linear.style.display='none';
        drawPlayhead(ctx,width,height);
        return;
      }
      const owner=selected(),key=currentTrackKey(),visibleKey=currentVisibilityKey(),input=track(),visibleInput=visibilityTrack();
      const segments=sceneTrack()?[{f:[0,1],visible:true}]:(visibleInput&&visibleInput.segments||[{f:[0,1],visible:true}]);
      const position=rel(),hasContext=!!(mode==='property'?key:visibleKey);
      ctx.fillStyle='#171d27';ctx.fillRect(0,0,width,height);
      ctx.fillStyle='rgba(255,255,255,.22)';for(const segment of state.sceneSegments(scene(),false).slice(0,-1)){const x=Math.round(segment.f[1]*width);ctx.fillRect(x,1,1,height-2);}
      if(note)note.textContent=mode==='property'&&key?(trackLabel||owner&&owner.name||key)+(sceneTrack()?' · 场景分段与参数覆层':' · 显示时段与参数覆层'):visibleKey?(visibilityLabel||owner&&owner.name||visibleKey)+' · 显示时段':'全局导航';
      if(linear)linear.style.display='none';
      if(hasContext){
        for(const segment of segments){
          const f=segment.f||[0,1],x=Math.round(project(f[0])*width),w=Math.max(1,Math.round((project(f[1])-project(f[0]))*width));
          ctx.fillStyle=segment.visible===false?'#26303d':'#56c8f0';ctx.globalAlpha=trackOptions&&trackOptions.readOnlyVisibility?(segment.visible===false?.12:.24):(segment.visible===false?.45:.9);ctx.fillRect(x,6,w,15);ctx.globalAlpha=1;if(!trackOptions?.readOnlyVisibility){ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.strokeRect(x+.5,6.5,Math.max(0,w-1),14);}
        }
        if(mode==='property'&&input)for(const segment of projectedPropertySegments(input,key)){
          const f=segment.f||[0,1],x=Math.round(project(f[0])*width),w=Math.max(1,Math.round((project(f[1])-project(f[0]))*width));
          const timed=propertySegmentRelevant(segment,key),showCut=timed||/^(effect|controller):/.test(key||'');
          // Motion parameters share the owner's data track, but cuts belonging
          // to another motion must not appear on this motion or the base lane.
          if(!showCut)continue;
          ctx.strokeStyle='rgba(255,255,255,.88)';ctx.lineWidth=1;ctx.strokeRect(x+.5,6.5,Math.max(0,w-1),14);
          if(!timed)continue;
          const disabled=segment.values&&segment.values.enabled===false;ctx.fillStyle=disabled?'#637083':segment.type==='linear'?'#d7dbe4':'#ffd23f';ctx.globalAlpha=segment.type==='linear'?.78:.92;ctx.fillRect(x,7,w,13);
          if(segment.type==='linear'){ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=1;for(let stripe=x-20;stripe<x+w+20;stripe+=8){ctx.beginPath();ctx.moveTo(stripe,20);ctx.lineTo(stripe+14,7);ctx.stroke();}}
          ctx.globalAlpha=1;ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.setLineDash(segment.type==='linear'?[4,3]:[]);ctx.strokeRect(x+.5,7.5,Math.max(0,w-1),12);ctx.setLineDash([]);
        }
        if(position>=0){ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.strokeRect(Math.max(0,Math.round(position*width)-1),7,2,13);}
      }
      drawPlayhead(ctx,width,height);
    }
    function setMode(next){mode=next==='property'?'property':'visibility';if(mode==='property'&&!trackKey){const owner=selected();trackKey=owner&&owner.id||null;trackLabel=owner&&owner.name||'';trackOptions=null;}if(mode==='visibility'){trackKey=null;trackLabel='';trackOptions=null;visibilityKey=null;visibilityLabel='';}render();return mode;}
    function setTrack(key,label,options){mode='property';trackKey=key||null;trackLabel=label||String(key||'');trackOptions=options||null;if(options&&options.sceneSegmentId){visibilityKey=null;visibilityLabel='';}else if(options&&options.visibilityKey){visibilityKey=options.visibilityKey;visibilityLabel=options.visibilityLabel||visibilityLabel;}else{const owner=selected();visibilityKey=owner&&owner.id||null;visibilityLabel=owner&&owner.name||'';}render();return trackKey;}
    function setSceneTrack(key,label,sceneSegmentId,options){return setTrack(key,label,Object.assign({},options||{},{sceneSegmentId,linearKeys:[]}));}
    function setVisibilityTrack(key,label){mode='visibility';trackKey=null;trackLabel='';trackOptions=null;visibilityKey=key||null;visibilityLabel=label||String(key||'');render();return visibilityKey;}
    function setSceneBackgroundTrack(){mode='scene-background';trackKey=null;trackLabel='';trackOptions=null;visibilityKey=null;visibilityLabel='';render();}
    function render(){if(stopped||!active())return;renderSceneBar();renderTop();renderContext();if(play){const playing=!!(options.playing&&options.playing());play.textContent=playing?'❚❚':'▶';play.title=playing?'暂停':'播放';play.classList.toggle('active',playing);}}
    function seek(next){const value=Math.max(0,Math.min(loop(),+next||0));if(options.seek)options.seek(value);render();view.scheduleRender();return value;}
    function fraction(event,canvas){const rect=canvas.getBoundingClientRect();return Math.max(0,Math.min(1,(event.clientX-rect.left)/Math.max(1,rect.width)));}
    function boundaryAt(input,position,canvas){if(!input||!Array.isArray(input.segments))return-1;const tolerance=6/Math.max(1,canvas.getBoundingClientRect().width);for(let index=0;index<input.segments.length-1;index++)if(Math.abs(position-input.segments[index].f[1])<=tolerance)return index;return-1;}
    function stopLegacy(event){if(!active())return false;event.preventDefault();event.stopImmediatePropagation();return true;}
    function topDown(event){if(!stopLegacy(event))return;const position=fraction(event,top),segments=state.sceneSegments(scene(),false),boundary=boundaryAt({segments},position,top);if(boundary>=0){dragging={kind:'scene-boundary',pointerId:event.pointerId,boundary,token:changes.begin('调整 Scene 边界')};top.setPointerCapture?.(event.pointerId);return;}dragging={kind:'seek-top',pointerId:event.pointerId};top.setPointerCapture?.(event.pointerId);seek(position*loop());}
    function contextDown(event){if(!stopLegacy(event))return;const key=currentTrackKey(),visibleKey=currentVisibilityKey(),globalPosition=fraction(event,context),position=unproject(globalPosition),range=sceneTrackRange(),readOnlyVisibility=mode==='property'&&!!trackOptions?.readOnlyVisibility;if(mode==='scene-background'){seek(globalPosition*loop());return;}if(range&&(globalPosition<range[0]||globalPosition>range[1])){seek(globalPosition*loop());return;}if(!(mode==='property'?key:visibleKey)){seek(globalPosition*loop());return;}const propertyBoundary=mode==='property'?propertyBoundaryAt(position,context):-1,visibilityBoundary=sceneTrack()||!visibleKey||readOnlyVisibility?-1:boundaryAt(visibilityTrack(),position,context);if(propertyBoundary>=0){dragging={kind:'property-boundary',pointerId:event.pointerId,ownerId:key,boundary:propertyBoundary,token:changes.begin('调整参数时段边界')};context.setPointerCapture?.(event.pointerId);return;}if(visibilityBoundary>=0){dragging={kind:'boundary',pointerId:event.pointerId,ownerId:visibleKey,boundary:visibilityBoundary,token:changes.begin('调整显示时段边界')};context.setPointerCapture?.(event.pointerId);return;}if(event.altKey){const cut=snapSceneBoundary(position,context);changes.run(mode==='property'?'切分当前参数时段':'切分显示时段',value=>{if(mode==='property'&&key)state.split(value,key,cut);if(visibleKey&&!readOnlyVisibility)state.splitVisibility(value,visibleKey,cut);});render();return;}dragging={kind:'seek-context',pointerId:event.pointerId};context.setPointerCapture?.(event.pointerId);seek(globalPosition*loop());}
    function pointerMove(event){if(!dragging||event.pointerId!==dragging.pointerId||!active())return;event.preventDefault();event.stopImmediatePropagation();if(dragging.kind==='seek-top')seek(fraction(event,top)*loop());else if(dragging.kind==='seek-context')seek(fraction(event,context)*loop());else if(dragging.kind==='boundary'){workspace.mutate(value=>state.moveVisibilityBoundary(value,dragging.ownerId,dragging.boundary,snapSceneBoundary(unproject(fraction(event,context)),context)));render();}else if(dragging.kind==='property-boundary'){workspace.mutate(value=>state.moveBoundary(value,dragging.ownerId,dragging.boundary,snapSceneBoundary(unproject(fraction(event,context)),context)));render();}else if(dragging.kind==='scene-boundary'){workspace.mutate(value=>state.moveSceneBoundary(value,dragging.boundary,fraction(event,top)));render();}}
    function pointerUp(event){if(!dragging||event.pointerId!==dragging.pointerId)return;if(['boundary','property-boundary','scene-boundary'].includes(dragging.kind))changes.commit(dragging.token);const target=dragging.kind==='seek-top'||dragging.kind==='scene-boundary'?top:context;if(target.hasPointerCapture?.(event.pointerId))target.releasePointerCapture(event.pointerId);dragging=null;event.preventDefault();event.stopImmediatePropagation();}
    function contextDouble(event){
      if(!stopLegacy(event)||mode==='scene-background')return;
      const key=currentTrackKey(),visibleKey=currentVisibilityKey(),globalPosition=fraction(event,context),range=sceneTrackRange(),position=unproject(globalPosition);
      const readOnlyVisibility=mode==='property'&&!!trackOptions?.readOnlyVisibility,effectTrack=mode==='property'&&/^effect:(object|scene):/.test(key||''),baseTrack=mode==='property'&&key===visibleKey;
      if(range&&(globalPosition<range[0]||globalPosition>range[1]))return;
      if(!(mode==='property'?key:visibleKey))return;
      changes.run(effectTrack?'清除或停用当前效果时段':'切换当前时段',value=>{
        const input=mode==='property'&&value.timeline&&value.timeline.tracks&&value.timeline.tracks[key],found=input&&state.at(input,position),timed=found&&propertySegmentRelevant(found.segment,key);
        if(timed){
          if(trackOptions?.valuePrefix)return state.clearSegmentPrefix(value,key,found.index,trackOptions.valuePrefix);
          if(baseTrack)return state.clearSegmentBase(value,key,found.index);
          return state.clearSegment(value,key,found.index,{preserveCut:effectTrack&&input.segments.length>1&&found.segment.values?.enabled!==false});
        }
        if(effectTrack&&input?.segments.length>1)return state.setStep(value,key,found.index,{enabled:false});
        if(mode==='property'&&(readOnlyVisibility||!visibleKey))return state.clearSegment(value,key,found?.index??0);
        if(!sceneTrack())return state.toggleVisibility(value,visibleKey,position);
      });
      render();view.scheduleRender();
    }
    function linearHover(event){if(!active())return;event.stopImmediatePropagation();const key=currentTrackKey();if(mode!=='property'||!key||!linear||trackOptions&&Array.isArray(trackOptions.linearKeys)&&!trackOptions.linearKeys.length){if(linear)linear.style.display='none';return;}const input=track(),position=fraction(event,context),found=input&&state.at(input,position),segment=found&&found.segment;if(!segment){linear.style.display='none';return;}const before=input.segments[found.index-1],after=input.segments[found.index+1],hasValues=item=>propertySegmentRelevant(item,key);if(segment.type!=='linear'&&!hasValues(before)&&!hasValues(after)){linear.style.display='none';return;}const rect=context.getBoundingClientRect(),mid=(segment.f[0]+segment.f[1])/2;linear.style.display='block';linear.style.left=rect.left+mid*rect.width+'px';linear.style.top=rect.top+rect.height/2+'px';linear.textContent=segment.type==='linear'?'…':'---';linear.title=segment.type==='linear'?'恢复普通时段':'设为 Linear';linear._v4={ownerId:key,index:found.index,linearKeys:trackOptions&&trackOptions.linearKeys||null};}
    function linearClick(event){if(!stopLegacy(event)||!linear._v4)return;const ref=linear._v4;changes.run('切换 Linear',value=>{const input=state.track(value,ref.ownerId),segment=input.segments[ref.index];return segment&&segment.type==='linear'?state.clearSegment(value,ref.ownerId,ref.index):state.setLinear(value,ref.ownerId,ref.index,ref.linearKeys?{linearKeys:ref.linearKeys}:null);});linear.style.display='none';linear._v4=null;render();view.scheduleRender();}
    function playClick(event){if(!stopLegacy(event))return;if(options.togglePlay)options.togglePlay();render();}
    const unsubscribeWorkspace=workspace.subscribe(()=>render()),unsubscribeSelection=view.subscribeSelection(()=>{mode='visibility';trackKey=null;trackLabel='';trackOptions=null;visibilityKey=null;visibilityLabel='';render();});
    function start(){stopped=false;top.addEventListener('pointerdown',topDown,true);context.addEventListener('pointerdown',contextDown,true);context.addEventListener('dblclick',contextDouble,true);context.addEventListener('pointermove',linearHover,true);global.addEventListener('pointermove',pointerMove,true);global.addEventListener('pointerup',pointerUp,true);if(play)play.addEventListener('click',playClick,true);if(linear)linear.addEventListener('click',linearClick,true);render();return api;}
    function stop(){stopped=true;top.removeEventListener('pointerdown',topDown,true);context.removeEventListener('pointerdown',contextDown,true);context.removeEventListener('dblclick',contextDouble,true);context.removeEventListener('pointermove',linearHover,true);global.removeEventListener('pointermove',pointerMove,true);global.removeEventListener('pointerup',pointerUp,true);if(play)play.removeEventListener('click',playClick,true);if(linear)linear.removeEventListener('click',linearClick,true);unsubscribeWorkspace();unsubscribeSelection();}
    const api=Object.freeze({start,stop,render,renderSceneBar,seek,setMode,setTrack,setSceneTrack,setSceneBackgroundTrack,setVisibilityTrack,get mode(){return mode;},get trackKey(){return trackKey;},get visibilityKey(){return visibilityKey;},get selectedId(){return view.selectedId;}});
    return api;
  }
  global.EditorClassicV4TimelineController=Object.freeze({version:1,create});
})(typeof window!=='undefined'?window:globalThis);
