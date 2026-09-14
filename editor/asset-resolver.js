(function (global) {
  'use strict';

  class MissingAssetError extends Error {
    constructor(ref, cause) {
      super('无法读取素材「' + ref + '」' + (cause && cause.message ? '：' + cause.message : ''));
      this.name = 'MissingAssetError';
      this.code = 'ASSET_NOT_READABLE';
      this.ref = ref;
      this.cause = cause || null;
    }
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('素材读取失败'));
      reader.readAsDataURL(blob);
    });
  }

  function waitForImage(image) {
    return new Promise((resolve, reject) => {
      if (!image) { reject(new Error('图片对象不存在')); return; }
      if (image.complete && (image.naturalWidth || image.width)) { resolve(image); return; }
      const cleanup = () => { image.removeEventListener('load', done); image.removeEventListener('error', fail); };
      const done = () => { cleanup(); resolve(image); };
      const fail = () => { cleanup(); reject(new Error('图片载入失败')); };
      image.addEventListener('load', done, { once: true });
      image.addEventListener('error', fail, { once: true });
    });
  }

  async function imageToDataUrl(image) {
    image = await waitForImage(image);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return canvas.toDataURL('image/png');
  }

  async function fetchedDataUrl(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return blobToDataUrl(await response.blob());
  }

  async function hostDataUrl(host, ref, context) {
    if (!host || typeof host.resolveAsset !== 'function') return null;
    const value = await host.resolveAsset({ ref, sceneLocator: context && context.sceneLocator || null });
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value.dataUrl) return value.dataUrl;
    if (value.blob instanceof Blob) return blobToDataUrl(value.blob);
    if (value.data instanceof Blob) return blobToDataUrl(value.data);
    return null;
  }

  async function resolveToDataUrl(ref, options) {
    options = options || {};
    if (!ref) throw new MissingAssetError(ref || '未命名素材');
    if (/^data:/i.test(ref)) return ref;
    let fileName = String(ref).split(/[\\/]/).pop().split(/[?#]/)[0];
    try { fileName = decodeURIComponent(fileName); } catch (_) {}
    const relinked = options.relinks && (options.relinks.get(ref) || options.relinks.get('name:' + fileName));
    if (relinked) return relinked;
    let lastError = null;
    if (options.liveImage) {
      try { return await imageToDataUrl(options.liveImage); }
      catch (error) { lastError = error; }
    }
    try {
      const resolved = await hostDataUrl(options.host || global.EditorHost, ref, options);
      if (resolved) return resolved;
    } catch (error) { lastError = error; }
    try { return await fetchedDataUrl(new URL(ref, options.baseUrl || global.location.href).href); }
    catch (error) { lastError = error; }
    throw new MissingAssetError(ref, lastError);
  }

  async function freezeScene(scene, options) {
    options = options || {};
    const clone = JSON.parse(JSON.stringify(scene));
    const liveById = options.liveById || new Map();
    for (let index = 0; index < (clone.images || []).length; index++) {
      const image = clone.images[index];
      if (!image || !image.src || /^data:/i.test(image.src)) continue;
      // Stable ids are authoritative. Index fallback is only for legacy scenes.
      const live = image.id ? liveById.get(image.id) : options.liveImages && options.liveImages[index];
      image.src = await resolveToDataUrl(image.src, Object.assign({}, options, { liveImage: live && live._img || live }));
    }
    return clone;
  }

  global.EditorAssetResolver = Object.freeze({ MissingAssetError, blobToDataUrl, waitForImage, imageToDataUrl, resolveToDataUrl, freezeScene });
})(typeof window !== 'undefined' ? window : globalThis);
