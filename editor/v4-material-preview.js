/* One visible animated card, isolated from the stage Player and project state. */
(function(global){
  'use strict';
  function create(options){
    const root=options?.root||document,pane=root.getElementById('asset-pane'),records=new Map(),pending=new Set();
    let active=null,timer=0,queue=Promise.resolve(),stopped=false,prepared=0,frames=0;
    function visible(record){const card=record.card,box=card.getBoundingClientRect();return record.visible&&card.isConnected&&!root.hidden&&pane.classList.contains('open')&&!card.closest('[hidden]')&&box.width>0&&box.height>0;}
    function dispose(record){record.session?.dispose?.();record.session=null;}
    function restore(record){if(record.first)record.canvas.getContext('2d').putImageData(record.first,0,0);}
    function stop(){clearTimeout(timer);timer=0;if(active){const prior=active;active=null;prior.card.removeAttribute('data-preview-playing');restore(prior);dispose(prior);}}
    function draw(record,time){record.session.draw(record.canvas,time);frames++;}
    function tick(){timer=0;if(!active)return;const record=active;if(!visible(record)||!record.session){stop();return;}
      try{draw(record,(performance.now()-record.started)/1000);timer=setTimeout(tick,Math.max(80,record.session.interval||1000/12));}catch(error){stop();record.error?.(error);}
    }
    function ready(record){if(active!==record||!record.session)return;if(!record.session.animated){stop();return;}record.started=performance.now();record.card.dataset.previewPlaying='true';clearTimeout(timer);timer=setTimeout(tick,Math.max(80,record.session.interval||1000/12));}
    function load(record){if(record.loading||!visible(record))return record.loading;
      const token=record.token;
      const task=queue.then(async()=>{
        if(stopped||!records.has(record.card)||token!==record.token||!visible(record))return;
        const session=await record.load();
        if(stopped||!records.has(record.card)||token!==record.token||!visible(record)){session.dispose?.();return;}
        prepared++;record.session=session;record.error?.(null);
        // The first frame is immutable for this binding. Re-preparing a
        // session must not replace it with a newly rasterized/rounded copy.
        if(!record.first){draw(record,0);record.first=record.canvas.getContext('2d').getImageData(0,0,record.canvas.width,record.canvas.height);}else restore(record);
        if(active===record)ready(record);else dispose(record);
      }).catch(error=>{if(records.has(record.card)&&token===record.token){if(active===record)stop();else dispose(record);record.error?.(error);}}).finally(()=>{record.loading=null;});
      record.loading=task;queue=task;pending.add(task);task.finally(()=>pending.delete(task));return task;
    }
    function play(record){if(!visible(record))return;if(active===record)return;stop();active=record;if(record.session)ready(record);else load(record);}
    function unbind(card){const record=records.get(card);if(!record)return;if(active===record)stop();record.token++;dispose(record);observer.unobserve(card);for(const [event,fn]of record.events)card.removeEventListener(event,fn);records.delete(card);}
    const observer=new IntersectionObserver(entries=>{for(const entry of entries){const record=records.get(entry.target);if(!record)continue;record.visible=entry.isIntersecting;if(!entry.isIntersecting){if(active===record)stop();dispose(record);}else if(visible(record)){if(!record.first)load(record);if(record.card.matches(':hover'))play(record);}}});
    function bind(config){unbind(config.card);const record={...config,visible:false,token:0,first:null,session:null,loading:null};records.set(record.card,record);record.card.tabIndex=record.card.tabIndex<0?0:record.card.tabIndex;record.card.title=(record.card.title?record.card.title+'；':'')+'悬停预览；聚焦后 P 播放／停止';
      const enter=()=>play(record),leave=()=>{if(active===record)stop();},key=event=>{if(event.target===record.card&&event.key.toLowerCase()==='p'){event.preventDefault();event.stopPropagation();active===record?stop():play(record);}},blur=event=>{if(!record.card.contains(event.relatedTarget))leave();};
      record.events=[['mouseenter',enter],['mouseleave',leave],['keydown',key],['focusout',blur]];for(const [event,fn]of record.events)record.card.addEventListener(event,fn);observer.observe(record.card);return()=>unbind(record.card);
    }
    const mutations=new MutationObserver(()=>{for(const record of records.values()){if(!record.card.isConnected)unbind(record.card);else if(active===record&&!visible(record))stop();}});mutations.observe(pane,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
    const visibility=()=>{if(root.hidden)stop();};root.addEventListener('visibilitychange',visibility);global.addEventListener('blur',stop);
    function clear(){stop();for(const card of [...records.keys()])unbind(card);}
    return Object.freeze({bind,stop,clear,unbind,settled:async()=>{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));await queue;},snapshot:()=>({bindings:records.size,active:active?1:0,liveSessions:[...records.values()].filter(r=>r.session).length,prepared,frames,pending:pending.size}),dispose(){stopped=true;clear();observer.disconnect();mutations.disconnect();root.removeEventListener('visibilitychange',visibility);global.removeEventListener('blur',stop);}});
  }
  function fit(canvas,image){const ctx=canvas.getContext('2d'),scale=Math.min(canvas.width/image.width,canvas.height/image.height);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(image,(canvas.width-image.width*scale)/2,(canvas.height-image.height*scale)/2,image.width*scale,image.height*scale);}
  async function asset(scene,id,options){
    const descriptor=scene.assets?.[id],count=descriptor?.frames?.length||1,estimated=Math.max(1,+descriptor?.width||1)*Math.max(1,+descriptor?.height||1)*count;
    if(count>128||estimated>16777216)throw Error('预览素材过大，仍可取用到项目');
    const temp={assets:scene.assets,entities:[{type:'image',id:'preview',assetId:id}]},decoded=await global.EditorVNextAssetLoader.resolve(temp,{...options,referencedOnly:true}),record=decoded[id];if(!record?.frames?.length)throw Error('素材预览缺少可用帧');
    return{animated:record.frames.length>1,interval:500,draw:(canvas,time)=>fit(canvas,record.frames[Math.floor(time*2)%record.frames.length])};
  }
  async function element(scene,id,options){
    const refs=global.EditorV4ElementPresets.references(scene.elementPresets[id]).filter(ref=>ref.kind==='module').map(ref=>ref.id);
    if(refs.some(moduleId=>!global.EditorV4ModuleInstances.ready(scene,moduleId,scene._moduleScope)))await global.EditorVNextModuleLoader.loadAuthorized(scene,refs,{scope:scene._moduleScope});
    const temp={format:scene.format,width:scene.width,height:scene.height,loop:scene.loop,_moduleScope:scene._moduleScope,assets:scene.assets,modules:scene.modules,patternDefinitions:scene.patternDefinitions,elementPresets:{[id]:scene.elementPresets[id]},entities:[],timeline:{tracks:{}},sceneEffects:{overlay:{},sample:{},pipeline:['overlay','sample']},background:{alpha:0}};
    const item=global.EditorV4ElementPresets.instantiate(temp,id,{x:0,y:0}),runtime=global.ToSampoolRuntimeVNext,frame=runtime.modules.frame.create(temp,0),bounds=global.EditorV4MaterialBaker?global.EditorV4MaterialBaker.bounds(temp,item,frame):runtime.modules.objects.capsuleBounds(temp,item,frame);
    if(bounds.w*bounds.h>1048576||bounds.w>4096||bounds.h>4096)throw Error('预览尺寸过大，仍可加入画布');
    if(global.EditorV4MaterialBaker?.work(temp,item)>1200)throw Error('预览实例过多，仍可加入画布');
    temp.runtimeAssets=await global.EditorVNextAssetLoader.resolve(temp,{...options,referencedOnly:true});
    const player=runtime.createRuntime(temp),resolved=player.scene,entity=resolved.entities.find(e=>e.id===item.id),surfaces=runtime.modules.surfaces.create(),margin=Math.max(2,Math.min(bounds.w,bounds.h)*.15),viewport={x:bounds.x-margin,y:bounds.y-margin,w:bounds.w+2*margin,h:bounds.h+2*margin};
    let animated;try{animated=global.EditorVNextPreviewScheduler.profile(temp,0).continuous;}catch(error){surfaces.clear();player.dispose();throw error;}
    return{animated,interval:1000/12,dispose(){surfaces.clear();player.dispose();},draw(canvas,time){
      const at=runtime.modules.frame.create(resolved,time),ctx=canvas.getContext('2d'),scale=Math.min(canvas.width/viewport.w,canvas.height/viewport.h),stats={directObjects:0,capsuleObjects:0,maskedObjects:0};surfaces.beginFrame();
      ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate((canvas.width-viewport.w*scale)/2,(canvas.height-viewport.h*scale)/2);ctx.scale(scale,scale);ctx.translate(-viewport.x,-viewport.y);
      const instances=runtime.modules.pathInstances.begin(resolved,at,stats,surfaces);try{if(global.EditorV4MaterialBaker)global.EditorV4MaterialBaker.draw(ctx,resolved,entity,at,stats,surfaces);else runtime.modules.objects.draw(ctx,resolved,entity,at,stats,surfaces);}finally{instances.release();ctx.restore();}
    }};
  }
  async function shared(current,bundle,options){
    const temp=global.EditorVNextScene.blank({width:current.width,height:current.height,loop:current.loop});temp._moduleScope=current._moduleScope;
    const result=await global.EditorV4Resources.importInto(temp,bundle),record=bundle.entries.find(r=>global.EditorV4Resources.key(r)===bundle.roots[0]);
    for(const [id,descriptor]of Object.entries(temp.modules||{}))if(!global.EditorV4ModuleInstances.ready(current,id,current._moduleScope)||JSON.stringify(current.modules?.[id])!==JSON.stringify(descriptor))throw Error('请先取用到项目并显式信任程序，再预览');
    return record.kind==='element'?element(temp,result.elements[record.id],options):asset(temp,result.assets[record.id],options);
  }
  global.EditorV4MaterialPreview=Object.freeze({create,asset,element,shared,fit});
})(typeof window!=='undefined'?window:globalThis);
