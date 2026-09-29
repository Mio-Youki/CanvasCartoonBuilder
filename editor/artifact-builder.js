(function (global) {
  'use strict';

  const formats = Object.freeze({
    scene: Object.freeze({ mime: 'text/javascript', description: 'JavaScript Scene', ext: '.js' }),
    test: Object.freeze({ mime: 'text/html', description: 'Self-contained Scene Test', ext: '.html' }),
    png: Object.freeze({ mime: 'image/png', description: 'PNG Image', ext: '.png' }),
    gif: Object.freeze({ mime: 'image/gif', description: 'GIF Animation', ext: '.gif' }),
  });

  function cleanName(name, fallback) {
    const value = String(name || fallback || 'artifact').replace(/[\\/:*?"<>|]+/g, '-').trim();
    return value || fallback || 'artifact';
  }

  function create(kind, name, data, options) {
    options = options || {};
    const format = formats[kind] || {};
    if (data == null) throw new Error('Artifact data is required');
    return Object.freeze({
      kind: kind || 'file',
      name: cleanName(name, 'artifact' + (options.ext || format.ext || '')),
      data,
      mime: options.mime || format.mime || 'application/octet-stream',
      description: options.description || format.description || 'File',
      ext: options.ext || format.ext || '',
      meta: Object.freeze(Object.assign({}, options.meta)),
    });
  }

  function replaceRange(sourceText, start, end, replacement) {
    if (typeof sourceText !== 'string') throw new Error('Source text is required');
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > sourceText.length) {
      throw new Error('Invalid scene source range');
    }
    return sourceText.slice(0, start) + replacement + sourceText.slice(end);
  }

  function sceneFile(options) {
    options = options || {};
    const data = options.sourceText != null
      ? replaceRange(options.sourceText, options.start, options.end, options.serializedScene)
      : options.script;
    if (typeof data !== 'string' || !data) throw new Error('Scene script is empty');
    return create('scene', options.name || 'scene.js', data);
  }

  function runtimeScript(serializedScene, runtimeSource, globalName) {
    if (typeof serializedScene !== 'string' || !serializedScene) throw new Error('Serialized scene is required');
    if (typeof runtimeSource !== 'string' || !runtimeSource) throw new Error('Runtime source is required');
    const target = globalName || 'HOME_SCENE';
    return 'window.' + target + ' = ' + serializedScene + ';\n' + runtimeSource;
  }

  function testHtml(options) {
    options = options || {};
    if (typeof options.script !== 'string' || !options.script) throw new Error('Test script is empty');
    const safeScript = options.script.replace(/<\/script/gi, '<\\/script');
    const canvasId = options.mode === 'home' ? 'home-scene' : 'scene-canvas';
    const title = String(options.title || 'Canvas Scene Test').replace(/[&<>]/g, '');
    const html = '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title><style>html,body{height:100%;margin:0;background:#10131d;color:#dce8ff;font:14px system-ui;display:grid;place-items:center}main{display:grid;gap:12px;justify-items:center}canvas{image-rendering:pixelated;image-rendering:crisp-edges;max-width:min(96vw,960px);max-height:78vh;width:auto;height:auto;border:1px solid #506687;background:transparent;box-shadow:0 12px 40px #0008}.tip{opacity:.7}</style></head><body><main><canvas id="' + canvasId + '"></canvas><div class="tip">自包含场景测试 · 直接在浏览器打开即可运行</div></main><script>' + safeScript + '<\/script></body></html>\n';
    return create('test', options.name || 'scene-test.html', html);
  }

  function v4TestHtml(options) {
    options = options || {};
    if (!options.scene || options.scene.format !== 'tosampool-scene/v4') throw new Error('v4 测试页需要 tosampool-scene/v4 Scene');
    if (typeof options.runtimeSource !== 'string' || !options.runtimeSource) throw new Error('v4 测试页缺少 Runtime 源码镜像');
    const serialized = JSON.stringify(options.scene).replace(/<\/script/gi, '<\\/script'), bootstrap = `
(async function(){
  const scene=${serialized}, runtimeAssets={};
  const load=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('素材解码失败'));image.src=src;});
  for(const [id,asset] of Object.entries(scene.assets||{})){
    const descriptors=Array.isArray(asset.frames)&&asset.frames.length?asset.frames:[asset],frames=[];
    for(const descriptor of descriptors)frames.push(await load(descriptor.locator||descriptor.src));
    runtimeAssets[id]={image:frames[0],frames,fps:Math.max(.1,+asset.fps||8),frameLoop:asset.frameLoop!==false};
  }
  const hydrated=Object.assign({},scene,{runtimeAssets}),player=ToSampoolRuntimeVNext.createRuntime(hydrated),canvas=document.getElementById('scene-canvas');
  canvas.width=scene.width;canvas.height=scene.height;let start=performance.now();
  player.renderTo(canvas,0);document.documentElement.dataset.runtimeReady='1';
  function frame(now){player.renderTo(canvas,(now-start)/1000);requestAnimationFrame(frame);}requestAnimationFrame(frame);
})().catch(error=>{document.documentElement.dataset.runtimeError=error&&error.message||String(error);document.querySelector('.tip').textContent='测试场景失败：'+document.documentElement.dataset.runtimeError;});`;
    return testHtml({ name:options.name || 'scene-test.html', title:options.title || 'ToSampool v4 Scene Test', mode:'v4', script:options.runtimeSource + bootstrap });
  }

  function png(name, blob, meta) { return create('png', name, blob, { meta }); }
  function gif(name, blob, meta) { return create('gif', name, blob, { meta }); }

  global.EditorArtifactBuilder = Object.freeze({ formats, cleanName, create, replaceRange, sceneFile, runtimeScript, testHtml, v4TestHtml, png, gif });
})(typeof window !== 'undefined' ? window : globalThis);
