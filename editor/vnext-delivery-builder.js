/* V4 delivery artifacts: a host-cached runtime script and a portable embed fragment. */
(function (global) {
  'use strict';

  const FORMAT = 'tosampool-scene/v4';
  const clone = value => JSON.parse(JSON.stringify(value));
  const safeName = value => String(value || 'scene').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'scene';
  const safeScript = value => String(value || '').replace(/<\/script/gi, '<\\/script');

  function assetIds(scene) {
    const ids = new Set();
    const walk = value => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) { value.forEach(walk); return; }
      for (const [key, child] of Object.entries(value)) {
        if (key === 'assets' || key === 'runtimeAssets') continue;
        if (/assetid$/i.test(key) && typeof child === 'string' && child) ids.add(child);
        walk(child);
      }
    };
    walk(scene);
    return ids;
  }

  function pruneScene(input) {
    if (!input || input.format !== FORMAT) throw new Error('交付物只接受 tosampool-scene/v4 Scene');
    const scene = clone(input), keep = assetIds(scene), assets = {};
    for (const [id, descriptor] of Object.entries(scene.assets || {})) if (keep.has(id)) assets[id] = descriptor;
    scene.assets = assets;
    delete scene.runtimeAssets;
    delete scene._moduleScope;
    delete scene.moduleScope;
    delete scene.history;
    delete scene.editor;
    return scene;
  }

  function hasEnabledMotion(value) {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) return value.some(hasEnabledMotion);
    if (value.enabled === true && (value.type || value.period != null || value.speed != null || value.steps != null)) return true;
    return Object.values(value).some(hasEnabledMotion);
  }

  function isTimeDependent(scene) {
    if (Object.values(scene.assets || {}).some(asset => Array.isArray(asset && asset.frames) && asset.frames.length > 1)) return true;
    if ((scene.timeline && scene.timeline.tracks && Object.keys(scene.timeline.tracks).length) || (scene.timeline && Array.isArray(scene.timeline.scenes) && scene.timeline.scenes.some(segment => segment.transition && segment.transition.type && segment.transition.type !== 'none'))) return true;
    if ((scene.entities || []).some(entity => entity && entity.type === 'procedural')) return true; // Module source is loaded after this static builder; default to the safe continuous path.
    return hasEnabledMotion({ entities:scene.entities || [], sceneEffects:scene.sceneEffects || {} });
  }

  function bootstrap(scene, options) {
    options = options || {};
    const sceneJson = safeScript(JSON.stringify(scene));
    const instance = safeName(options.instance || options.name || 'scene');
    const assetBase = String(options.assetBase || '');
    const dynamic = isTimeDependent(scene), moduleSources=options.moduleSources || {}, moduleCode=[], scope=`delivery:${instance}`;
    for(const moduleId of Object.keys(scene.modules || {})) { if(typeof moduleSources[moduleId] !== 'string') throw new Error(`交付物缺少程序构件「${moduleId}」源码`); moduleCode.push(safeScript(moduleSources[moduleId])); }
    const modulePrelude=moduleCode.length?`(function(){const registry=window.ToSampoolRuntimeVNext&&window.ToSampoolRuntimeVNext.modules&&window.ToSampoolRuntimeVNext.modules.sceneModules;if(!registry||!registry.withScope)throw new Error('ToSampool Player 缺少项目 Module 作用域');registry.withScope(${JSON.stringify(scope)},()=>{${moduleCode.join('\n')}});})();\n`:'';
    return modulePrelude + `(function(){
  const scene=${sceneJson};
  scene._moduleScope=${JSON.stringify(scope)};
  const script=document.currentScript;
  const instance=${JSON.stringify(instance)};
  const root=(script&&script.dataset&&script.dataset.tosampoolTarget&&document.querySelector('[data-tosampool-scene="'+script.dataset.tosampoolTarget+'"]'))||document.querySelector('[data-tosampool-scene="'+instance+'"]')||(script&&script.previousElementSibling);
  const canvas=root&&root.querySelector&&root.querySelector('canvas');
  const fail=error=>{if(root)root.dataset.tosampoolError=error&&error.message||String(error);throw error;};
  if(!root||!canvas)return fail(new Error('找不到 ToSampool 场景容器或 Canvas'));
  const base=${JSON.stringify(assetBase)};
  const resolve=locator=>new URL(base+String(locator||''),script&&script.src||document.baseURI).href;
  const load=src=>new Promise((resolveImage,reject)=>{const image=new Image();image.onload=()=>resolveImage(image);image.onerror=()=>reject(new Error('素材解码失败：'+src));image.src=src;});
  (async()=>{
    if(!window.ToSampoolRuntimeVNext||!window.ToSampoolRuntimeVNext.createRuntime)throw new Error('未加载 ToSampool Player');
    const runtimeAssets={};
    for(const [id,asset] of Object.entries(scene.assets||{})){
      const descriptors=Array.isArray(asset.frames)&&asset.frames.length?asset.frames:[asset],frames=[];
      for(const descriptor of descriptors)frames.push(await load(resolve(descriptor.locator||descriptor.src)));
      runtimeAssets[id]={image:frames[0],frames,fps:Math.max(.1,+asset.fps||8),frameLoop:asset.frameLoop!==false};
    }
    const player=window.ToSampoolRuntimeVNext.createRuntime(Object.assign({},scene,{runtimeAssets}));
    canvas.width=scene.width;canvas.height=scene.height;
    const start=performance.now(),render=time=>player.renderTo(canvas,time);
    render(0); root.dataset.tosampoolReady='1';
    if(${dynamic ? 'true' : 'false'}){const frame=now=>{render((now-start)/1000);requestAnimationFrame(frame);};requestAnimationFrame(frame);}
  })().catch(error=>{if(root)root.dataset.tosampoolError=error&&error.message||String(error);console.error(error);});
})();`;
  }

  function runtimeScript(options) {
    options = options || {};
    const scene = pruneScene(options.scene), name = safeName(options.name || 'scene');
    return { name:`${name}.runtime.js`, mime:'text/javascript', data:bootstrap(scene, { name, instance:options.instance, assetBase:options.assetBase, moduleSources:options.moduleSources }), meta:{ format:'scene.runtime.js', dynamic:isTimeDependent(scene), assets:Object.keys(scene.assets || {}), modules:Object.keys(scene.modules || {}) } };
  }

  function embedHtml(options) {
    options = options || {};
    if (typeof options.runtimeSource !== 'string' || !options.runtimeSource) throw new Error('scene.embed.html 缺少 Runtime 源码');
    const scene = pruneScene(options.scene), name = safeName(options.name || 'scene'), runtime = safeScript(options.runtimeSource), boot = bootstrap(scene, { name, instance:name, moduleSources:options.moduleSources });
    const html = `<div class="tosampool-scene" data-tosampool-scene="${name}"><canvas aria-label="ToSampool scene"></canvas></div>\n<style>.tosampool-scene{display:grid;place-items:center;max-width:100%;background:transparent}.tosampool-scene canvas{display:block;max-width:100%;height:auto;image-rendering:pixelated;image-rendering:crisp-edges}</style>\n<script>${runtime}\n${boot}</script>\n`;
    return { name:`${name}.embed.html`, mime:'text/html', data:html, meta:{ format:'scene.embed.html', dynamic:isTimeDependent(scene), assets:Object.keys(scene.assets || {}) } };
  }

  global.EditorVNextDeliveryBuilder = Object.freeze({ FORMAT, assetIds, pruneScene, isTimeDependent, runtimeScript, embedHtml });
})(typeof window !== 'undefined' ? window : globalThis);
