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

  async function resolve(document, options) {
    if (!global.EditorAssetResolver) throw new Error('vNext 素材加载需要 EditorAssetResolver');
    options = options || {};
    const result = {}, refs = document && document.assets || {};
    const loadImage = options.loadImage || imageFromDataUrl;
    for (const [id, asset] of Object.entries(refs)) {
      const descriptorFrames = Array.isArray(asset && asset.frames) && asset.frames.length ? asset.frames : [asset], locator = locatorOf(descriptorFrames[0]);
      if (!locator) throw new Error(`vNext 素材「${id}」缺少 locator`);
      const recipe = asset && asset.recipe, frames = [];
      for (const descriptor of descriptorFrames) {
        const frameLocator = locatorOf(descriptor); if (!frameLocator) throw new Error(`vNext 多帧素材「${id}」含有缺少 locator 的帧`);
        const dataUrl = await global.EditorAssetResolver.resolveToDataUrl(frameLocator, { host:options.host || global.EditorHost, sceneLocator:options.sceneLocator || null, baseUrl:options.baseUrl, relinks:options.relinks });
        const image = await loadImage(dataUrl); frames.push(recipe && global.EditorVNextAssetRecipe ? global.EditorVNextAssetRecipe.apply(image, recipe) : image);
      }
      result[id] = { image:frames[0], frames, locator, recipe:recipe || null, fps:Math.max(.1, +(asset && asset.fps) || 8), frameLoop:!asset || asset.frameLoop !== false };
    }
    return result;
  }

  global.EditorVNextAssetLoader = Object.freeze({ locatorOf, imageFromDataUrl, resolve });
})(typeof window !== 'undefined' ? window : globalThis);
