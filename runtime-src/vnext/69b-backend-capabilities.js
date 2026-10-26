/* Host implementation evidence, not project data or a second effect registry. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext;
  const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
  const records=freeze({
    'sampling-grid':{conditions:['grid-alpha-keep'],evidence:['v4-gpu-player-lifecycle.mjs']},
    'tint-overlay':{conditions:['string-paint','blend-normal-screen-lighter'],evidence:['v4-gpu-player-tint.mjs'],cpuPreparation:['source-alpha-tint-table:1024-bytes-on-colour-or-alpha-change']},
    'noise-dither':{conditions:[],evidence:['v4-gpu-player-noise.mjs'],cpuPreparation:['integer-jump-table-on-initialize','rounding-table:65536-bytes-on-amount-change']},
    threshold:{conditions:[],evidence:['v4-gpu-player-threshold.mjs'],cpuPreparation:['js-luma-boundary-ties-on-threshold-change']},
    'uneven-sampling':{conditions:['field-wave-radial-or-supported-integer-noise','edge-protection-off'],evidence:['v4-gpu-player-lifecycle.mjs']},
    'edge-dispersion':{conditions:['reliable-integer-coordinate-range'],evidence:['v4-gpu-player-dispersion.mjs'],cpuPreparation:['luma-products:6144-bytes','rounding-table:65536-bytes-on-strength-change']}
  });
  const semantics=freeze({input:'canvas-rgba',workingAlpha:'premultiplied-rgba8',bounds:'scene-extent',mask:'existing-resolver-per-effect-upload',order:'scene-overlay-then-sample',output:'canvas2d',sourceGeneration:'canvas2d',explicitPixelReadback:false});
  const invalidation=freeze(['source-revision','evaluated-parameters','time','seed','size','preview-budget','context-generation']);
  // Shared shape for future host-reviewed effects/generators. Validation is
  // metadata validation only: it does not register code or grant GPU access.
  function declaration(value){
    if(!value||!['effect','controller','generator'].includes(value.target?.kind)||typeof value.target.id!=='string'||!value.target.id)throw new Error('Invalid backend capability target');
    if(!['canvas2d','webgl2-scene','webgl2-object','webgl2-path'].includes(value.backend))throw new Error('Invalid implementation backend');
    if(!Array.isArray(value.scopes)||!value.scopes.length||value.scopes.some(scope=>!['object','scene','path'].includes(scope)))throw new Error('Invalid capability scopes');
    if(!['experimental','verified','unverified'].includes(value.status))throw new Error('Invalid capability status');
    for(const key of ['conditions','invalidation','evidence'])if(!Array.isArray(value[key])||value[key].some(item=>typeof item!=='string'))throw new Error('Invalid capability '+key);
    if(!value.semantics||!value.cost||!value.acceptance)throw new Error('Missing capability semantics, cost or acceptance');
    if(value.status==='verified'&&!value.evidence.length)throw new Error('Verified capability requires evidence');
    return freeze(JSON.parse(JSON.stringify(value)));
  }
  function describe(id,scope){
    if(scope==='object'&&api.modules.objectGpu?.supported.includes(id))return freeze({
      target:{kind:'effect',id},implementation:'object-sampling-pilot/v2',backend:'webgl2-object',scope,status:'experimental',
      conditions:['explicit-object-pilot-policy','supported-complete-object-sampling-chain','effective-grid-one','alpha-keep','sample-last','canvas-projection-outline-prefix-only','no-color-grade-prefix','supported-raster-source-kind','no-repeat','no-scene-transition','no-scene-gpu-combination','no-palette-capture','host-frame-and-pixel-budget',...(records[id]?.conditions||[])],
      semantics:{input:'canvas-object-capsule',workingAlpha:'premultiplied-rgba8',bounds:'world-capsule-union',mask:'existing-canvas-prefix',order:'unchanged-pipeline-or-cpu-fallback',finalComposite:'existing-object-alpha-parent-alpha-blend',sourceGeneration:'canvas2d',explicitPixelReadback:false},
      invalidation,evidence:['tests/browser/v4-editor-object-gpu-pilot.mjs','tests/v4-object-gpu-pilot.mjs'],
      cpuPreparation:['existing-canvas-source-mask-projection-outline-in-authored-order','host-alpha-byte-calibration-on-first-use',...(records[id]?.cpuPreparation||[])],
      acceptance:{profile:'single-large-object-pilot',crossDevice:'unverified',editor:'targeted-fixture',export:'unverified',tauri:'unverified'},
      cost:{budget:api.modules.objectGpu.budget,workPixels:'actual-world-capsule',passes:'actual-plan-dependent',uploads:'source-per-attempt-plus-changed-numeric-tables',canvasOutputTransfers:1,explicitReadbackBytes:0,sourceVersionCache:false,gpuDeviceMs:null}
    });
    const record=records[id];
    if(!record||scope!=='scene')return null;
    return freeze({
      target:{kind:id==='sampling-grid'?'controller':'effect',id},implementation:'scene-gpu-executor/v1',backend:'webgl2-scene',scope,status:'experimental',
      conditions:[...record.conditions,'resample-extent-at-most-32768','device-max-texture-and-viewport','native-default-canvas-nearest-calibration'],semantics,invalidation,
      cpuPreparation:[...(record.cpuPreparation||[]),'native-nearest-coordinate-strips-on-context-or-size-change'],
      evidence:[...record.evidence,'v4-gpu-coordinate-probe.mjs','v4-gpu-native-nearest-lifecycle.mjs','v4-gpu-surface-lifecycle.mjs','v4-editor-gpu-performance.mjs'].map(file=>'tests/browser/'+file),
      acceptance:{profile:'existing-strict-alpha-and-byte-boundary-fixtures',crossDevice:'unverified',editor:'grid3-matrix-and-grid4-regression',nonDivisibleNearest:'calibrated-local-editor-fixtures',export:'unverified',tauri:'unverified'},
      cost:{workPixels:'source-and-per-effect-working-surfaces',passes:'actual-plan-dependent',uploads:'source-plus-each-range-plus-changed-numeric-tables',explicitReadbackBytes:0,calibrationReadback:'synthetic-numeric-axis-strips-on-initialize-not-artwork',canvasOutputTransfers:'one-per-output-side-unless-gpu-final-transition',explicitTextureBytes:'executor.stats().textureBytes',surfaceStrategy:'single-current-size-set-with-reusable-device',cpuPreparationMs:null,gpuDeviceMs:null}
    });
  }
  function diagnose(reason,context){
    const raw=String(reason||'unknown'),colon=raw.indexOf(':'),code=colon<0?raw:raw.slice(0,colon),detail=colon<0?null:raw.slice(colon+1),ctx=context||{};
    const semantic=code.startsWith('unsupported-'),idle=code==='no-supported-effect';
    return freeze({code,reason:raw,scope:ctx.scope||'scene',ownerId:ctx.ownerId||null,effectId:ctx.effectId||(code==='unsupported-effect'?detail:code.startsWith('unsupported-tint')?'tint-overlay':code.startsWith('unsupported-grid')?'sampling-grid':null),detail,category:idle?'idle':semantic?'unsupported-semantics':'device-or-execution',retryable:semantic||idle,recovery:semantic||idle?'reevaluate-next-frame':'clear-caches-or-recreate-player'});
  }
  function assess(scene,frame){
    // Actual executor remains the sole condition evaluator. No allocation or
    // WebGL availability probe is performed here; device state is unknown.
    const plan=api.modules.sceneGpu.plan(scene,frame);
    return freeze({requested:'gpu-experimental',decision:plan.reason?'cpu':'gpu-candidate',device:'unknown',diagnostic:plan.reason?diagnose(plan.reason):null,implementations:plan.reason?[]:plan.passes.map(pass=>describe(({tint:'tint-overlay',noise:'noise-dither',uneven:'uneven-sampling',dispersion:'edge-dispersion',grid:'sampling-grid'})[pass.kind]||pass.kind,'scene'))});
  }
  api.modules.backendCapabilities=Object.freeze({version:1,declaration,describe,diagnose,assess});
})(typeof window!=='undefined'?window:globalThis);
