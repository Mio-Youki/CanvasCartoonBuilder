/* Explicit, bounded object-to-image derivation. Never executes or repairs missing code. */
(function (global) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const limits = Object.freeze({frames:120, framePixels:4194304, sampledPixels:96000000, encodedBytes:48*1024*1024});
  function source(scene, id, options) {
    const entity = (scene.entities || []).find(item => item.id === id);
    if (!entity || (entity.type !== 'procedural' && !(options?.material && ['rect','ellipse','poly','line','vector','builtin','image','text','group','particle-emitter'].includes(entity.type)))) throw Error('请选中一个可烘焙元素');
    for(const item of options?.material?scene.entities:[entity])if(item.type==='procedural'&&!global.EditorV4ModuleInstances.ready(scene,item.moduleId,scene._moduleScope)) throw Error('构件未加载、未被信任或依赖缺失；请先恢复依赖，不能自动冻结');
    return entity;
  }
  function plan(scene, id, options) {
    options = options || {}; source(scene, id, options);
    const width = +(options.viewport?.w??scene.width), height = +(options.viewport?.h??scene.height), loop = +scene.loop;
    if(options.viewport&&![options.viewport.x,options.viewport.y].every(Number.isFinite))throw Error('烘焙范围无效');
    if (![width,height].every(n => Number.isSafeInteger(n) && n > 0) || !(loop > 0 && Number.isFinite(loop))) throw Error('烘焙需要有效画布与周期时间');
    const pixels = width * height;
    if (pixels > limits.framePixels) throw Error('单帧超出烘焙像素预算，请缩小画布后重试');
    const capacity = Math.min(limits.frames, Math.floor(limits.sampledPixels / pixels));
    const mode = options.mode || 'freeze';
    if (!['freeze','sequence'].includes(mode)) throw Error('未知烘焙方式');
    const count = mode === 'freeze' ? 1 : options.frames == null ? Math.max(2, Math.min(capacity, Math.round(loop*12))) : +options.frames;
    if (!Number.isInteger(count) || count < (mode === 'freeze' ? 1 : 2) || count > capacity) throw Error('周期帧数超出预算（最多 '+capacity+' 帧）');
    const time = options.time == null ? 0 : +options.time;
    if (!Number.isFinite(time) || time < 0) throw Error('冻结时间无效');
    const times = mode === 'freeze' ? [time % loop] : Array.from({length:count}, (_,i) => i * loop / count);
    return Object.freeze({mode,width,height,loop,count,capacity,fps:mode==='sequence'?count/loop:0,times:Object.freeze(times),sampledPixels:pixels*count});
  }
  function abortError() { const error=Error('已取消，未添加素材'); error.name='AbortError'; return error; }
  function check(options) { if (options.signal?.aborted) throw abortError(); options.assertCurrent?.(); }
  function encode(canvas) {
    return new Promise((resolve,reject) => canvas.toBlob(blob => {
      if (!blob) { reject(Error('PNG 编码失败')); return; }
      const reader = new FileReader();reader.onerror=()=>reject(Error('PNG 读取失败'));reader.onload=()=>resolve({locator:reader.result,bytes:blob.size});reader.readAsDataURL(blob);
    }, 'image/png'));
  }
  async function render(scene, id, options) {
    options = options || {}; const config=plan(scene,id,options), original=source(scene,id,options), snapshot=copy(scene);
    check(options);
    // Resolve only declared/referenced artwork, not every unused library image.
    const refs=global.EditorVNextAssetLoader.referencedAssetIds({entities:snapshot.entities});
    for(const descriptor of Object.values(snapshot.modules||{}))for(const asset of descriptor.manifest?.assets||[])refs.add(typeof asset==='string'?asset:asset.id);
    const hydration={...snapshot,assets:Object.fromEntries([...refs].filter(key=>snapshot.assets?.[key]).map(key=>[key,snapshot.assets[key]]))};
    const runtimeAssets=options.runtimeAssets || await (options.resolveAssets || (document=>global.EditorVNextAssetLoader.resolve(document,{...(options.assetOptions||{}),referencedOnly:false})))(hydration);
    check(options);
    const api=global.ToSampoolRuntimeVNext.modules, normalized=api.scene.normalize({...snapshot,runtimeAssets}), entity=normalized.entities.find(item=>item.id===id);
    const canvas=(options.createCanvas || (()=>document.createElement('canvas')))();canvas.width=config.width;canvas.height=config.height;
    const ctx=canvas.getContext('2d'),surfaces=api.surfaces.create(),frames=[];let bytes=0,encoded=0;
    if(!ctx)throw Error('烘焙画布不可用');
    try {
      for(let index=0;index<config.count;index++) {
        check(options);surfaces.beginFrame();
        const frame=api.frame.create(normalized,config.times[index],{pixelDivMultiplier:1}),stats={directObjects:0,capsuleObjects:0,maskedObjects:0,unsupportedEffects:[]};
        const instances=api.pathInstances.begin(normalized,frame,stats,surfaces);
        try {
          const bounds=options.material?global.EditorV4MaterialBaker.bounds(normalized,entity,frame):api.objects.capsuleBounds(normalized,entity,frame);
          if(bounds.w*bounds.h>limits.framePixels)throw Error('对象效果范围超出单帧预算，请减小尺寸或光效范围');
          ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();
          if(options.viewport)ctx.translate(-options.viewport.x,-options.viewport.y);
          try { if(options.material)global.EditorV4MaterialBaker.draw(ctx,normalized,entity,frame,stats,surfaces);else api.objects.draw(ctx,normalized,entity,frame,stats,surfaces); } finally { ctx.restore(); }
        } finally { instances.release(); }
        const png=await (options.encode || encode)(canvas);check(options);
        bytes+=png.bytes;encoded+=png.locator.length;
        if(bytes>limits.encodedBytes||encoded>limits.encodedBytes)throw Error('烘焙素材超出48MB编码预算，请减少周期帧数');
        frames.push({locator:png.locator,mime:'image/png'});
        options.onProgress?.({completed:index+1,total:config.count,bytes});
        // Animated bounds can produce a different capsule size each frame.
        // Do not retain a whole cycle of size-keyed Canvas caches while baking.
        surfaces.clear();
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      check(options);
      return {format:'tosampool-module-bake-result/v1',name:(original.name||original.moduleId||'元素')+(config.mode==='freeze'?' · 冻结':' · 序列'),
        width:config.width,height:config.height,frames,fps:config.fps,bytes,
        provenance:{format:'tosampool-module-bake/v1',mode:config.mode,...(original.moduleId?{moduleId:original.moduleId,moduleVersion:original.moduleVersion||1}:{}),entityId:id,
          paramsJson:JSON.stringify(original.params||{}),times:[...config.times],loop:config.loop,width:config.width,height:config.height,
          scope:options.material?'element-preset':'object-artboard',...(options.viewport?{viewport:copy(options.viewport)}:{}),includes:['transform','parts','object-effects','parent-transform'],excludes:['background','scene-effects','scene-transitions','other-objects']}};
    } finally { surfaces.clear();canvas.width=1;canvas.height=1; }
  }
  function add(scene, result) {
    if(result?.format!=='tosampool-module-bake-result/v1'||!result.frames?.length)throw Error('需要完整的构件烘焙结果');
    const added=global.EditorVNextAssetState.addAsset(scene,{name:result.name,width:result.width,height:result.height,frames:result.frames,fps:result.fps,mime:'image/png',frameLoop:true});
    scene.assets[added.assetId].name=result.name;scene.assets[added.assetId].moduleBake=copy(result.provenance);return added;
  }
  global.EditorV4ModuleBaker=Object.freeze({limits,plan,render,add});
})(typeof window!=='undefined'?window:globalThis);
