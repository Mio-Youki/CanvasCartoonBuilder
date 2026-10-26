/* Host-only admission and session budget. Uses existing GPU kernels, no UI state. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext;
  const budget=Object.freeze({minPixels:131072,maxPixels:1048576,maxExtent:4096,maxObjects:1,maxTextureBytes:24*1024*1024});
  const supported=Object.freeze(['noise-dither','threshold','edge-dispersion']);
  function effectIds(group){return supported.filter(id=>group?.[id]?.enabled);}
  function assess(entity,group,frame,bounds,prefix){
    if(!['image','vector','rect','ellipse','poly'].includes(entity.type))return 'unsupported-object-kind';
    const stages=entity.effects?.pipeline||['mask','decorate','sample'];
    if(stages.indexOf('sample')!==stages.length-1)return 'unsupported-object-sample-order';
    // These stages still render on Canvas before the upload. Admit only the
    // prefixes covered by the actual editor comparisons, not all decoration.
    if(Object.entries(prefix?.decorate||entity.effects?.decorate||{}).some(([id,c])=>c?.enabled&&!['projection','outline'].includes(id)))return 'unsupported-object-decorate-prefix';
    const grade=(prefix?.formation||entity.effects?.formation||{})['color-grade'];
    if(grade?.enabled&&(+grade.hue||+grade.brightness||+grade.contrast||+grade.saturation))return 'unsupported-object-formation-prefix';
    if(frame.paletteCapture)return 'unsupported-object-palette-capture';
    const controllers=group.controllers||{};
    if(Object.keys(controllers).some(id=>id!=='sampling-grid'))return 'unsupported-object-controller';
    if(api.modules.sampling.gridSize(group)*frame.preview.pixelDivMultiplier!==1)return 'unsupported-object-pilot-grid';
    if((controllers['sampling-grid']?.alphaMode||'keep')!=='keep')return 'unsupported-object-grid-alpha';
    const active=Object.entries(group).filter(([id,c])=>id!=='controllers'&&c?.enabled);
    if(!active.length||active.some(([id])=>!supported.includes(id)))return 'unsupported-object-sampling-chain';
    if(active.some(([,c])=>c.mask?.type&&c.mask.type!=='none'))return 'unsupported-object-card-mask';
    const scroll=frame.valuesFor(entity).anim?.scroll;
    if(scroll?.repeat!==false&&Number.isFinite(+scroll?.speed)&&+scroll.speed!==0)return 'unsupported-object-repeat';
    const pixels=bounds.w*bounds.h;
    if(pixels<budget.minPixels)return 'object-budget-too-small';
    // Conservative bound: two intermediate full-size outputs plus numeric
    // tables (including RGB jump powers). Existing executor caches are bounded.
    const textureEstimate=(active.length>1?24:16)*pixels+524288+96*bounds.w;
    if(pixels>budget.maxPixels||bounds.w>budget.maxExtent||bounds.h>budget.maxExtent||textureEstimate>budget.maxTextureBytes)return 'object-budget-too-large';
    return null;
  }
  function create(){
    const executor=api.modules.sceneGpu.create();let used=false,blocked=null,report=null;
    function beginFrame(scene,frame,options){
      used=false;
      blocked=options?.sceneGpu?'unsupported-object-scene-gpu-combination':
        (scene.timeline?.scenes||[]).some(s=>s.transition?.type&&s.transition.type!=='none')?'unsupported-object-scene-transition':null;
      report={requested:'gpu-object-pilot',attempted:0,handled:0,cpu:0,sourcePixels:0,uploads:0,passes:0,initialized:false,surfacesRebuilt:false,surfacePrepareMs:0,rows:[],truncated:0};
    }
    function record(entity,reason,result,bounds,group){
      if(reason)report.cpu++;else report.handled++;
      const row={ownerId:entity.id,backend:reason?'cpu':'gpu-object-sampling',effects:effectIds(group),reason:reason||null};
      if(bounds){row.bounds={...bounds};if(!reason)report.sourcePixels+=bounds.w*bounds.h;}
      if(reason){row.diagnostic=api.modules.backendCapabilities?.diagnose(reason,{scope:'object',ownerId:entity.id,effectId:row.effects.length===1?row.effects[0]:null});if(reason.startsWith('object-'))row.diagnostic=Object.assign({},row.diagnostic,{category:'host-budget',retryable:true,recovery:'reevaluate-next-frame'});}
      if(report.rows.length<24)report.rows.push(row);else report.truncated++;
      if(result){report.uploads+=result.uploads||0;report.passes+=result.passes||0;report.initialized||=!!result.initialized;report.surfacesRebuilt||=!!result.surfacesRebuilt;report.surfacePrepareMs+=result.surfacePrepareMs||0;}
    }
    function sample(source,entity,group,frame,bounds,surfaces,prefix){
      const reason=blocked||assess(entity,group,frame,bounds,prefix)||(used?'object-frame-budget-used':null);
      if(reason){record(entity,reason,null,bounds,group);return null;}
      used=true;report.attempted++;
      const output=surfaces.acquire(source.width,source.height);
      try{
        // This adapter consumes already evaluated object parameters. It does not
        // reinterpret them as scene tracks or retain an object/source frame key.
        const result=executor.renderEvaluatedSample(source,group,frame,surfaces,output.getContext('2d'));
        if(!result.handled){record(entity,result.reason,result,bounds,group);surfaces.release(output);return null;}
        record(entity,null,result,bounds,group);return output;
      }catch(error){surfaces.release(output);throw error;}
    }
    return Object.freeze({beginFrame,sample,invalidateSource:()=>executor.invalidateSource(),dispose:()=>executor.dispose(),snapshot:()=>Object.assign({},executor.stats(),report,{budget,rows:report?report.rows.slice():[],reason:report?.handled?null:report?.rows[0]?.reason||'no-object-sampling-candidate'})});
  }
  api.modules.objectGpu=Object.freeze({budget,supported,effectIds,assess,create});
})(typeof window!=='undefined'?window:globalThis);
