/* v4 Scene asset hydration. Host/file access stays outside Runtime. */
(function (global) {
  'use strict';

  function locatorOf(asset) {
    if (typeof asset === 'string') return asset;
    return asset && (asset.locator || asset.src) || '';
  }

  function imageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('素材图片解码失败'));
      image.src = dataUrl;
    });
  }
  async function applyAlphaMask(image, mask, options) {
    if (!mask || !mask.locator) return image;
    const width=Math.max(1,Math.round(image.width||image.naturalWidth||mask.width||1)),height=Math.max(1,Math.round(image.height||image.naturalHeight||mask.height||1)),dataUrl=await global.EditorAssetResolver.resolveToDataUrl(mask.locator,{host:options.host||global.EditorHost,sceneLocator:options.sceneLocator||null,baseUrl:options.baseUrl,relinks:options.relinks}),maskImage=await (options.loadImage||imageFromDataUrl)(dataUrl),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{willReadFrequently:true});context.imageSmoothingEnabled=false;context.drawImage(image,0,0,width,height);const output=context.getImageData(0,0,width,height),maskCanvas=document.createElement('canvas');maskCanvas.width=width;maskCanvas.height=height;const maskContext=maskCanvas.getContext('2d',{willReadFrequently:true});maskContext.imageSmoothingEnabled=false;maskContext.drawImage(maskImage,0,0,width,height);const matte=maskContext.getImageData(0,0,width,height).data;
    for(let index=0;index<output.data.length;index+=4){const alpha=matte[index+3]||matte[index];output.data[index+3]=mask.mode==='multiply'?Math.round(output.data[index+3]*alpha/255):alpha;}
    context.putImageData(output,0,0);return canvas;
  }

  /* Project assets may include source material retained only for provenance
     (for example an Alpha-repair source beneath its derived PNG).  Runtime
     must decode only assets actually referenced by Scene state; keeping the
     source in the project must not turn into a per-Player memory cost. */
  function referencedAssetIds(document) {
    const ids=new Set(),seen=new Set();
    function visit(value,key) {
      if (!value || typeof value!=='object') return;
      if (seen.has(value)) return; seen.add(value);
      if (key==='assetId' && typeof value==='string') ids.add(value);
      if (Array.isArray(value)) { for (const item of value) visit(item,''); return; }
      for (const [childKey,child] of Object.entries(value)) {
        if (['sourceAssetId','assets','runtimeAssets','modules','elementPresets','patternResources','patternDefinitions','resourceOrigins','resourcePins'].includes(childKey)) continue;
        if (/assetid$/i.test(childKey) && typeof child==='string') { ids.add(child); continue; }
        visit(child,childKey);
      }
    }
    visit(document,'');
    const modules=new Set((document.entities||[]).filter(e=>e.type==='procedural').map(e=>e.moduleId));
    for(const id of modules)for(const ref of document.modules?.[id]?.manifest?.assets||[]){const assetId=typeof ref==='string'?ref:ref?.id;if(assetId)ids.add(assetId);}
    return ids;
  }

  async function resolve(document, options) {
    if (!global.EditorAssetResolver) throw new Error('vNext 素材加载需要 EditorAssetResolver');
    options = options || {};
    const result = {}, refs = document && document.assets || {}, needed=options.referencedOnly?referencedAssetIds(document):null;
    const loadImage = options.loadImage || imageFromDataUrl;
    for (const [id, asset] of Object.entries(refs)) {
      if (needed&&!needed.has(id)) continue;
      const descriptorFrames = Array.isArray(asset && asset.frames) && asset.frames.length ? asset.frames : [asset], locator = locatorOf(descriptorFrames[0]);
      if (!locator) throw new Error(`vNext 素材「${id}」缺少 locator`);
      const recipe = asset && asset.recipe, frames = [];
      for (const descriptor of descriptorFrames) {
        const frameLocator = locatorOf(descriptor); if (!frameLocator) throw new Error(`vNext 多帧素材「${id}」含有缺少 locator 的帧`);
        const dataUrl = await global.EditorAssetResolver.resolveToDataUrl(frameLocator, { host:options.host || global.EditorHost, sceneLocator:options.sceneLocator || null, baseUrl:options.baseUrl, relinks:options.relinks });
        const image = await loadImage(dataUrl),prepared=recipe && global.EditorVNextAssetRecipe ? global.EditorVNextAssetRecipe.apply(image, recipe) : image; frames.push(asset&&asset.alphaMask?await applyAlphaMask(prepared,asset.alphaMask,options):prepared);
      }
      result[id] = { image:frames[0], frames, locator, recipe:recipe || null, fps:Math.max(.1, +(asset && asset.fps) || 8), frameLoop:!asset || asset.frameLoop !== false };
    }
    return result;
  }

  global.EditorVNextAssetLoader = Object.freeze({ locatorOf, imageFromDataUrl, applyAlphaMask, referencedAssetIds, resolve });
})(typeof window !== 'undefined' ? window : globalThis);
