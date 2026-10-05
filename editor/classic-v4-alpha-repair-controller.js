/* Asset-level Alpha repair.  This is deliberately an editor-side workflow:
 * the Runtime receives an ordinary derived PNG and never needs a matte model.
 * An optional host may provide a coarse candidate; the user always reviews it
 * on the central stage before it is committed. */
(function (global) {
  'use strict';

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const copy=data=>new Uint8ClampedArray(data);

  function create(options){
    options=options||{};
    const workspace=options.workspace,changes=options.changes,view=options.view,root=options.root||document,referenceSource=options.referenceSource;
    if(!workspace||!changes||!view||typeof referenceSource!=='function')throw new Error('Alpha 修边需要 Workspace、变更历史、舞台与素材参考入口');
    const wrap=root.getElementById('stage-wrap'),status=root.getElementById('m-stage');
    if(!wrap)throw new Error('Alpha 修边找不到中央舞台');
    let session=null,listeners=new Set(),canvas=null,ctx=null,gesture=null;

    function emit(){for(const listener of listeners)try{listener(session);}catch(_){}}
    function asset(assetId){return workspace.requireDocument().assets&&workspace.requireDocument().assets[assetId]||null;}
    function rootSource(assetId){const scene=workspace.requireDocument();let id=assetId,descriptor=asset(id),guard=0;while(descriptor&&descriptor.sourceAssetId&&scene.assets&&scene.assets[descriptor.sourceAssetId]&&guard++<24){id=descriptor.sourceAssetId;descriptor=scene.assets[id];}return{id,descriptor};}
    function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
    function locatorOf(descriptor){return global.EditorVNextAssetLoader&&global.EditorVNextAssetLoader.locatorOf?global.EditorVNextAssetLoader.locatorOf(descriptor):String(descriptor&&descriptor.locator||'');}
    /* Alpha repair is deliberately a separate, non-destructive layer.  The
       editable RGB buffer must never come from an already alpha-composited
       preview: transparent pixels there have lost their original colour and
       would restore as black.  Keep resize but turn background extraction off
       for the frozen RGB snapshot; the current visible alpha is captured
       separately from referenceSource(). */
    function rgbRecipe(input){
      if(!global.EditorVNextAssetRecipe||typeof global.EditorVNextAssetRecipe.normalize!=='function')return clone(input)||null;
      const recipe=global.EditorVNextAssetRecipe.normalize(input||{});
      recipe.backgroundRemoval.enabled=false;recipe.backgroundRemoval.tolerance=0;recipe.backgroundRemoval.feather=0;
      return recipe;
    }
    async function sourcePixels(locator,recipe,width,height){
      if(!locator||!global.EditorAssetResolver)throw new Error('Alpha 修边找不到原始 RGB 素材');
      const dataUrl=await global.EditorAssetResolver.resolveToDataUrl(locator,{host:global.EditorHost,sceneLocator:workspace.locator||null,baseUrl:global.location&&global.location.href});
      const image=await new Promise((resolve,reject)=>{const value=new Image();value.onload=()=>resolve(value);value.onerror=()=>reject(new Error('无法读取原始 RGB 素材'));value.src=dataUrl;});
      const prepared=recipe&&global.EditorVNextAssetRecipe?global.EditorVNextAssetRecipe.apply(image,recipe):image;
      const source=root.createElement('canvas');source.width=width;source.height=height;const sourceCtx=source.getContext('2d',{willReadFrequently:true});sourceCtx.imageSmoothingEnabled=false;sourceCtx.drawImage(prepared,0,0,width,height);return sourceCtx.getImageData(0,0,width,height).data;
    }
    function active(){return !!session;}
    function checker(context,width,height){
      const unit=12;
      for(let y=0;y<height;y+=unit)for(let x=0;x<width;x+=unit){context.fillStyle=((x/unit+y/unit)&1)?'#27303a':'#171d25';context.fillRect(x,y,unit,unit);}
    }
    function stagePoint(event){
      const rect=canvas.getBoundingClientRect();
      return {x:clamp((event.clientX-rect.left)/Math.max(1,rect.width)*session.width,0,session.width-1),y:clamp((event.clientY-rect.top)/Math.max(1,rect.height)*session.height,0,session.height-1)};
    }
    function previewImage(){
      const output=new ImageData(copy(session.pixels),session.width,session.height);
      for(let index=3,pixel=0;index<output.data.length;index+=4,pixel++)output.data[index]=session.alpha[pixel];
      return output;
    }
    function drawPolygonGuide(){
      const points=session&&session.polygon||[];
      if(!points.length)return;
      ctx.save();ctx.strokeStyle=session.tool==='poly-add'?'#52e5a0':'#ff7b8b';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=Math.max(1,session.width/320);ctx.beginPath();points.forEach((point,index)=>index?ctx.lineTo(point.x,point.y):ctx.moveTo(point.x,point.y));ctx.stroke();for(const point of points){ctx.beginPath();ctx.arc(point.x,point.y,Math.max(2,session.width/220),0,Math.PI*2);ctx.fill();}ctx.restore();
    }
    function render(){
      if(!session||!ctx)return;
      canvas.width=session.width;canvas.height=session.height;ctx.imageSmoothingEnabled=false;checker(ctx,session.width,session.height);ctx.putImageData(previewImage(),0,0);drawPolygonGuide();
    }
    function reflow(){
      if(!session||!canvas)return;
      const pad=28,availableW=Math.max(1,(wrap.clientWidth||session.width)-pad*2),availableH=Math.max(1,(wrap.clientHeight||session.height)-pad*2),scale=Math.min(availableW/session.width,availableH/session.height,1.5),width=Math.max(1,Math.round(session.width*scale)),height=Math.max(1,Math.round(session.height*scale));
      Object.assign(canvas.style,{width:width+'px',height:height+'px',left:Math.round(((wrap.clientWidth||width)-width)/2)+'px',top:Math.round(((wrap.clientHeight||height)-height)/2)+'px'});
    }
    function brush(point,last){
      const radius=Math.max(.5,+session.size||12)/2,feather=clamp(+session.feather||0,0,radius),target=session.tool==='restore'?255:0,from=last||point,steps=Math.max(1,Math.ceil(Math.hypot(point.x-from.x,point.y-from.y)/Math.max(1,radius*.3)));
      for(let step=0;step<=steps;step++){
        const cx=from.x+(point.x-from.x)*step/steps,cy=from.y+(point.y-from.y)*step/steps,left=Math.max(0,Math.floor(cx-radius)),right=Math.min(session.width-1,Math.ceil(cx+radius)),top=Math.max(0,Math.floor(cy-radius)),bottom=Math.min(session.height-1,Math.ceil(cy+radius));
        for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
          const distance=Math.hypot(x-cx,y-cy);if(distance>radius)continue;
          const strength=!feather||distance<=radius-feather?1:clamp((radius-distance)/Math.max(.001,feather),0,1),index=y*session.width+x,previous=session.alpha[index];session.alpha[index]=Math.round(previous+(target-previous)*strength);
        }
      }
    }
    function rasterizePolygon(){
      const points=session.polygon;if(points.length<3)return false;
      const mask=root.createElement('canvas');mask.width=session.width;mask.height=session.height;const maskCtx=mask.getContext('2d',{willReadFrequently:true});maskCtx.beginPath();points.forEach((point,index)=>index?maskCtx.lineTo(point.x,point.y):maskCtx.moveTo(point.x,point.y));maskCtx.closePath();maskCtx.fillStyle='#fff';maskCtx.fill();const data=maskCtx.getImageData(0,0,session.width,session.height).data,target=session.tool==='poly-add'?255:0;
      for(let index=0,pixel=0;index<data.length;index+=4,pixel++)if(data[index+3])session.alpha[pixel]=target;
      session.polygon=[];return true;
    }
    function finishPolygon(){if(!session||!rasterizePolygon())return false;render();emit();return true;}
    function pointerDown(event){
      if(!session||event.button!==0)return;const point=stagePoint(event);
      if(session.tool==='poly-add'||session.tool==='poly-subtract'){
        if(event.detail>1){finishPolygon();return;}session.polygon.push(point);render();emit();event.preventDefault();return;
      }
      gesture={pointer:event.pointerId,last:point};canvas.setPointerCapture(event.pointerId);brush(point);render();event.preventDefault();
    }
    function pointerMove(event){if(!session||!gesture||event.pointerId!==gesture.pointer)return;const point=stagePoint(event);brush(point,gesture.last);gesture.last=point;render();event.preventDefault();}
    function pointerEnd(event){if(!gesture||event.pointerId!==gesture.pointer)return;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);gesture=null;emit();}
    function onKeyDown(event){if(!session)return;if(event.key==='Enter'&&(session.tool==='poly-add'||session.tool==='poly-subtract')){if(finishPolygon()){event.preventDefault();event.stopImmediatePropagation();}}else if(event.key==='Escape'){if(session.polygon.length){session.polygon=[];render();emit();event.preventDefault();event.stopImmediatePropagation();}else close(false);}}
    function installCanvas(){
      if(canvas)return;canvas=root.createElement('canvas');canvas.id='v4-alpha-repair-stage';canvas.className='v4-alpha-repair-stage';canvas.title='Alpha 修边：画笔擦除／恢复；多边形双击或 Enter 闭合';Object.assign(canvas.style,{position:'absolute',zIndex:'12',pointerEvents:'auto',imageRendering:'pixelated',boxShadow:'0 0 0 1px #516172'});wrap.append(canvas);ctx=canvas.getContext('2d',{willReadFrequently:true});canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',pointerEnd);window.addEventListener('resize',reflow);window.addEventListener('keydown',onKeyDown,true);
    }
    function removeCanvas(){
      if(!canvas)return;canvas.remove();window.removeEventListener('resize',reflow);window.removeEventListener('keydown',onKeyDown,true);canvas=null;ctx=null;gesture=null;
    }
    async function open(assetId){
      const descriptor=asset(assetId);if(!descriptor)throw new Error('请选择要修边的素材');const frames=Array.isArray(descriptor.frames)&&descriptor.frames.length?descriptor.frames:[descriptor];if(frames.length!==1)throw new Error('Alpha 修边当前先支持单张图片；多帧素材应逐帧生成候选后再作为序列导入');
      const frozen=await referenceSource(assetId),image=await new Promise((resolve,reject)=>{const value=new Image();value.onload=()=>resolve(value);value.onerror=()=>reject(new Error('无法读取素材像素'));value.src=frozen.dataUrl;});
      const visible=root.createElement('canvas');visible.width=frozen.width;visible.height=frozen.height;const visibleCtx=visible.getContext('2d',{willReadFrequently:true});visibleCtx.drawImage(image,0,0,visible.width,visible.height);const visiblePixels=visibleCtx.getImageData(0,0,visible.width,visible.height).data,alpha=new Uint8ClampedArray(visible.width*visible.height);for(let index=3,pixel=0;index<visiblePixels.length;index+=4,pixel++)alpha[pixel]=visiblePixels[index];
      if(session)close(false);const base=rootSource(assetId),baseLocator=locatorOf(base.descriptor);if(!base.descriptor||!baseLocator)throw new Error('Alpha 修边的原素材已不存在');const recipe=rgbRecipe(descriptor.recipe),pixels=await sourcePixels(baseLocator,recipe,visible.width,visible.height),instances=(workspace.requireDocument().entities||[]).filter(item=>item&&item.type==='image'&&item.assetId===assetId).map(item=>item.id),editingAssetId=descriptor.derivation&&descriptor.derivation.kind==='alpha-mask'&&descriptor.alphaMask?assetId:null;session={assetId,baseAssetId:base.id,baseLocator,baseMime:base.descriptor.mime||'image/png',baseRecipe:recipe,editingAssetId,width:visible.width,height:visible.height,name:descriptor.name||assetId,pixels:copy(pixels),originalAlpha:copy(alpha),alpha,tool:'erase',size:18,feather:0,polygon:[],replaceInstances:instances,status:editingAssetId?'编辑既有 Alpha 遮罩':'手动修边'};installCanvas();view.canvas.style.visibility='hidden';reflow();render();if(status)status.textContent=`素材 · Alpha 修边：${session.name}。候选仅作草稿，确认后才会生成派生透明素材。`;emit();return session;
    }
    function close(applied){
      if(!session)return false;removeCanvas();view.canvas.style.visibility='';session=null;if(status)status.textContent=applied?'已生成 Alpha 派生素材；原素材保持不变。':'已取消 Alpha 修边；原素材未改动。';emit();return true;
    }
    function setTool(tool){if(!session)return;session.tool=tool;session.polygon=[];render();emit();}
    function setNumber(key,value){if(!session)return;session[key]=key==='size'?clamp(Math.round(+value||1),1,512):clamp(Math.round(+value||0),0,256);emit();}
    function invert(){if(!session)return;for(let index=0;index<session.alpha.length;index++)session.alpha[index]=255-session.alpha[index];render();emit();}
    function reset(){if(!session)return;session.alpha=copy(session.originalAlpha);session.polygon=[];render();emit();}
    async function propose(){
      if(!session)return;const adapter=options.adapter||global.ToSampoolV4AlphaCandidateAdapter;if(!adapter||typeof adapter.propose!=='function')throw new Error('当前未启用浏览器 Alpha 候选适配器。可先用擦除、恢复和多边形完成修边。');
      const result=await adapter.propose({assetId:session.assetId,name:session.name,width:session.width,height:session.height,dataUrl:toDataUrl(),kind:'alpha-mask'}),locator=result&&(result.maskDataUrl||result.locator);if(!/^data:image\//i.test(String(locator||'')))throw new Error('Alpha 候选适配器没有返回有效的遮罩图片');const image=await new Promise((resolve,reject)=>{const value=new Image();value.onload=()=>resolve(value);value.onerror=()=>reject(new Error('候选遮罩无法读取'));value.src=locator;});const candidate=root.createElement('canvas');candidate.width=session.width;candidate.height=session.height;const candidateCtx=candidate.getContext('2d',{willReadFrequently:true});candidateCtx.drawImage(image,0,0,candidate.width,candidate.height);const data=candidateCtx.getImageData(0,0,candidate.width,candidate.height).data;for(let index=0,pixel=0;index<data.length;index+=4,pixel++)session.alpha[pixel]=data[index+3]||data[index];session.status='自动候选（待修边）';render();emit();
    }
    function toDataUrl(){const output=root.createElement('canvas');output.width=session.width;output.height=session.height;output.getContext('2d').putImageData(previewImage(),0,0);return output.toDataURL('image/png');}
    function maskDataUrl(){const output=root.createElement('canvas');output.width=session.width;output.height=session.height;const data=output.getContext('2d',{willReadFrequently:true}).createImageData(session.width,session.height);for(let index=0,pixel=0;index<data.data.length;index+=4,pixel++){data.data[index]=255;data.data[index+1]=255;data.data[index+2]=255;data.data[index+3]=session.alpha[pixel];}output.getContext('2d').putImageData(data,0,0);return output.toDataURL('image/png');}
    function apply(){
      if(!session)return null;const sourceName=session.name,replaceIds=session.replaceInstances.slice(),mask={locator:maskDataUrl(),width:session.width,height:session.height,mode:'replace-alpha'},derivation={kind:'alpha-mask',semantic:'reviewed alpha repair',alpha:true,method:session.status==='自动候选（待修边）'?'browser alpha candidate + manual repair':'manual brush / polygon repair',notes:'原始 RGB 与预处理快照固定；只保存可再次编辑的 Alpha 遮罩。'};let added=null;changes.run(`应用 Alpha 修边 · ${sourceName}`,scene=>{const root=scene.assets&&scene.assets[session.baseAssetId];if(!root)throw new Error('Alpha 修边的原素材已不存在');if(session.editingAssetId){const target=scene.assets[session.editingAssetId];target.locator=session.baseLocator;target.mime=session.baseMime;target.width=session.width;target.height=session.height;target.recipe=clone(session.baseRecipe);target.sourceAssetId=session.baseAssetId;target.alphaMask=mask;target.alphaMaskRevision=Math.max(0,+target.alphaMaskRevision||0)+1;target.derivation=derivation;added={assetId:session.editingAssetId,width:session.width,height:session.height};}else{added=global.EditorVNextAssetState.addAsset(scene,{name:`${sourceName} Alpha`,locator:session.baseLocator,mime:session.baseMime,width:session.width,height:session.height,recipe:clone(session.baseRecipe),sourceAssetId:session.baseAssetId,alphaMask:mask,derivation});scene.assets[added.assetId].alphaMaskRevision=1;for(const item of scene.entities||[])if(replaceIds.includes(item.id))item.assetId=added.assetId;}});const result=added;close(true);if(result&&global.ToSampoolV4Assets)global.ToSampoolV4Assets.select(result.assetId);return result;
    }
    function renderInspector(host){
      if(!session)return false;host.innerHTML='';const heading=root.createElement('div');heading.className='inspector-kicker';heading.textContent='素材 · Alpha 修边';const name=root.createElement('div');name.className='inspector-name';name.textContent=session.name;const note=root.createElement('div');note.className='inspector-note';note.textContent='中央舞台显示透明预览。自动候选永远需要人工检查；应用后创建新素材，不覆盖原图。';host.append(heading,name,note);
      const section=(title,content)=>{const box=root.createElement('section');box.className='global-section';const label=root.createElement('div');label.className='global-section-title';label.textContent=title;box.append(label,content);host.append(box);};
      const auto=root.createElement('div');auto.className='props-actions';const candidate=root.createElement('button');candidate.type='button';candidate.textContent='自动 Alpha 候选';candidate.title='需要可选的浏览器 Alpha 适配器；结果仍需人工修边';candidate.onclick=()=>propose().catch(error=>{session.status=error.message;emit();});const candidateStatus=root.createElement('span');candidateStatus.className='global-note';candidateStatus.textContent=session.status;auto.append(candidate,candidateStatus);section('候选',auto);
      const tools=root.createElement('div');tools.className='global-grid';const modes=[['erase','擦除'],['restore','恢复'],['poly-add','多边形保留'],['poly-subtract','多边形擦除']];for(const [id,label] of modes){const button=root.createElement('button');button.type='button';button.className='small'+(session.tool===id?' active':'');button.textContent=label;button.onclick=()=>setTool(id);tools.append(button);}if(session.tool==='poly-add'||session.tool==='poly-subtract'){const complete=root.createElement('button');complete.type='button';complete.className='small primary';complete.textContent='完成多边形';complete.title='也可双击最后一个点或按 Enter';complete.onclick=finishPolygon;tools.append(complete);}const number=(label,key,min,max)=>{const row=root.createElement('label');row.className='global-field';const text=root.createElement('span');text.textContent=label;const input=root.createElement('input');input.type='number';input.min=min;input.max=max;input.step=1;input.value=session[key];input.onchange=()=>setNumber(key,input.value);row.append(text,input);tools.append(row);};number('画笔大小','size',1,512);number('羽化','feather',0,256);section('修边工具',tools);
      if(session.replaceInstances.length){const replace=root.createElement('label');replace.className='global-field wide';const text=root.createElement('span');text.textContent=`替换场景中 ${session.replaceInstances.length} 个源对象`;const toggle=root.createElement('input');toggle.type='checkbox';toggle.checked=true;toggle.onchange=()=>{session.replaceInstances=toggle.checked?(workspace.requireDocument().entities||[]).filter(item=>item&&item.type==='image'&&item.assetId===session.assetId).map(item=>item.id):[];emit();};replace.append(text,toggle);host.append(replace);}
      const actions=root.createElement('div');actions.className='props-actions';const invertButton=root.createElement('button');invertButton.type='button';invertButton.textContent='反相';invertButton.onclick=invert;const resetButton=root.createElement('button');resetButton.type='button';resetButton.textContent='重置';resetButton.onclick=reset;const cancel=root.createElement('button');cancel.type='button';cancel.textContent='取消';cancel.onclick=()=>close(false);const applyButton=root.createElement('button');applyButton.type='button';applyButton.className='primary';applyButton.textContent='应用为派生素材';applyButton.onclick=apply;actions.append(invertButton,resetButton,cancel,applyButton);section('确认',actions);return true;
    }
    return Object.freeze({open,close,active,setTool,setNumber,invert,reset,finishPolygon,apply,propose,renderInspector,reflow,subscribe(listener){if(typeof listener!=='function')throw new Error('Alpha 修边订阅者必须是函数');listeners.add(listener);return()=>listeners.delete(listener);},get session(){return session&&Object.freeze({assetId:session.assetId,name:session.name,width:session.width,height:session.height,tool:session.tool,size:session.size,feather:session.feather,status:session.status});}});
  }
  global.EditorClassicV4AlphaRepairController=Object.freeze({version:1,create});
})(typeof window!=='undefined'?window:globalThis);
