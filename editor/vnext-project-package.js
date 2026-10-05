/* Logical project-package core. Hosts decide whether files become ZIP entries or native files. */
(function (global) {
  'use strict';

  const FORMAT = 'tosampool-project/v1', ASSET_FORMAT = 'tosampool-asset/v1', MODULE_FORMAT = 'tosampool-scene-module/v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const textEncoder = () => new TextEncoder();
  const textDecoder = () => new TextDecoder();
  const mimeExtension = mime => ({
    'image/png':'png', 'image/jpeg':'jpg', 'image/webp':'webp', 'image/gif':'gif', 'image/svg+xml':'svg', 'font/woff2':'woff2', 'font/woff':'woff',
  })[String(mime || '').toLowerCase()] || 'bin';
  const safeName = value => String(value || 'asset').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'asset';
  const randomId = () => 'project-' + Math.random().toString(36).slice(2, 10);

  function dataUrlBytes(locator) {
    const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/is.exec(String(locator || ''));
    if (!match) return null;
    const mime = match[1] || 'application/octet-stream', encoded = match[3] || '';
    if (match[2]) {
      if (typeof global.atob === 'function') {
        const binary = global.atob(encoded), bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        return { mime, bytes };
      }
      if (typeof Buffer !== 'undefined') return { mime, bytes:new Uint8Array(Buffer.from(encoded, 'base64')) };
      throw new Error('当前环境不能解析 base64 素材');
    }
    return { mime, bytes:textEncoder().encode(decodeURIComponent(encoded)) };
  }
  function bytesDataUrl(bytes, mime) {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    let binary = ''; for (let index = 0; index < data.length; index += 1) binary += String.fromCharCode(data[index]);
    const encoded = typeof global.btoa === 'function' ? global.btoa(binary) : (typeof Buffer !== 'undefined' ? Buffer.from(data).toString('base64') : null);
    if (!encoded) throw new Error('当前环境不能编码素材');
    return `data:${mime || 'application/octet-stream'};base64,${encoded}`;
  }
  function normalizeFiles(files) {
    const map = new Map();
    for (const file of files || []) if (file && file.path) map.set(String(file.path).replace(/\\/g, '/'), file);
    return map;
  }
  async function resolveAsset(locator, context) {
    const inline = dataUrlBytes(locator); if (inline) return inline;
    if (context && typeof context.resolveAsset === 'function') {
      const result = await context.resolveAsset(locator);
      if (result && result.bytes) return { mime:result.mime || 'application/octet-stream', bytes:result.bytes instanceof Uint8Array ? result.bytes : new Uint8Array(result.bytes) };
    }
    throw new Error(`项目保存无法读取素材「${locator}」`);
  }
  function descriptorFrames(descriptor) {
    return Array.isArray(descriptor && descriptor.frames) && descriptor.frames.length ? descriptor.frames : [descriptor];
  }
  function references(scene) {
    const seen = new Set();
    const walk = (value, root) => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) { value.forEach(item => walk(item, false)); return; }
      if (typeof value.assetId === 'string') seen.add(value.assetId);
      Object.keys(value).forEach(key => {
        const child=value[key];
        if (key === 'runtimeAssets') return;
        if (key === 'assets' && root) return;
        if (key === 'assets' && Array.isArray(child)) { child.forEach(item => seen.add(typeof item === 'string' ? item : item && item.id)); return; }
        walk(child, false);
      });
    };
    walk(scene, true);
    seen.delete(undefined); seen.delete(null); seen.delete('');
    return seen;
  }
  function unused(scene) {
    const used = references(scene), assets = scene && scene.assets || {};
    return Object.keys(assets).filter(id => !used.has(id));
  }

  async function build(scene, options) {
    options = options || {};
    if (!global.EditorVNextScene || !scene || scene.format !== global.EditorVNextScene.FORMAT) throw new Error('项目包只接受 tosampool-scene/v4 Scene');
    const storedScene = JSON.parse(global.EditorVNextScene.serialize(scene, 0)), projectId = options.projectId || randomId(), displayName = String(options.displayName || 'Untitled').trim() || 'Untitled';
    const files = [], manifest = { format:FORMAT, version:1, projectId, displayName, assets:[], modules:[] };
    for (const [assetId, descriptor] of Object.entries(storedScene.assets || {})) {
      const asset = clone(descriptor), originalFrames = descriptorFrames(asset), storedFrames = [];
      for (let index = 0; index < originalFrames.length; index += 1) {
        const frame = originalFrames[index] || {}, resolved = await resolveAsset(frame.locator || asset.locator, options), mime = frame.mime || asset.mime || resolved.mime || 'application/octet-stream', ext = mimeExtension(mime), path = `assets/${safeName(assetId)}/source/${String(index).padStart(4, '0')}.${ext}`;
        files.push({ path, data:resolved.bytes, mime }); storedFrames.push({ path, mime });
      }
      asset.locator = storedFrames[0].path; asset.mime = storedFrames[0].mime;
      if (storedFrames.length > 1) asset.frames = storedFrames.map(frame => ({ locator:frame.path, mime:frame.mime })); else delete asset.frames;
      storedScene.assets[assetId] = asset;
      const assetRecord = { format:ASSET_FORMAT, version:1, id:assetId, kind:storedFrames.length > 1 ? 'sequence' : 'image', mime:asset.mime, width:asset.width, height:asset.height, fps:asset.fps, frameLoop:asset.frameLoop, recipe:asset.recipe || null, sourceAssetId:asset.sourceAssetId || undefined, derivation:asset.derivation || null, source:storedFrames.length === 1 ? storedFrames[0].path : undefined, frames:storedFrames.length > 1 ? storedFrames.map(frame => frame.path) : undefined };
      const assetPath = `assets/${safeName(assetId)}/asset.json`;
      files.push({ path:assetPath, data:JSON.stringify(assetRecord, null, 2), mime:'application/json' });
      manifest.assets.push({ id:assetId, path:assetPath, kind:assetRecord.kind, referenced:references(storedScene).has(assetId) });
    }
    const modules={};
    for (const [moduleId, input] of Object.entries(storedScene.modules || {})) {
      const descriptor=clone(input || {}), moduleManifest=descriptor.manifest;
      if (!moduleManifest || moduleManifest.format !== MODULE_FORMAT || String(moduleManifest.id || '') !== String(moduleId) || !Number.isInteger(+moduleManifest.version)) throw new Error(`项目模块「${moduleId}」缺少有效 Manifest`);
      const sourceRef=descriptor.source || descriptor.locator;
      let source;
      const inline=dataUrlBytes(sourceRef);
      if(inline) source=textDecoder().decode(inline.bytes);
      else if(options && typeof options.resolveModule === 'function') source=await options.resolveModule(sourceRef,descriptor);
      else throw new Error(`项目保存无法读取模块「${moduleId}」`);
      if(typeof source !== 'string' || !source.trim()) throw new Error(`项目模块「${moduleId}」源代码为空`);
      const base=safeName(moduleId), sourcePath=`modules/${base}.scene.module.js`, manifestPath=`modules/${base}.module.json`;
      files.push({path:sourcePath,data:source,mime:'text/javascript'});files.push({path:manifestPath,data:JSON.stringify(moduleManifest,null,2),mime:'application/json'});
      modules[moduleId]={id:moduleId,version:+moduleManifest.version,locator:sourcePath,manifestLocator:manifestPath,manifest:moduleManifest};
      manifest.modules.push({id:moduleId,version:+moduleManifest.version,source:sourcePath,manifest:manifestPath});
    }
    if(Object.keys(modules).length) storedScene.modules=modules; else delete storedScene.modules;
    const project = { format:FORMAT, version:1, projectId, displayName, scene:storedScene };
    files.unshift({ path:'assets.manifest.json', data:JSON.stringify(manifest, null, 2), mime:'application/json' });
    files.unshift({ path:'project.tosampool.json', data:JSON.stringify(project, null, 2), mime:'application/json' });
    return { project, manifest, files, unused:unused(storedScene) };
  }
  async function restore(files, options) {
    options = options || {}; const map = normalizeFiles(files), root = map.get('project.tosampool.json');
    if (!root) throw new Error('项目包缺少 project.tosampool.json');
    const text = typeof root.data === 'string' ? root.data : textDecoder().decode(root.data);
    const project = JSON.parse(text);
    if (!project || project.format !== FORMAT || !project.scene || !global.EditorVNextScene || project.scene.format !== global.EditorVNextScene.FORMAT) throw new Error('不是有效的 tosampool-project/v1 项目包');
    const scene = clone(project.scene);
    for (const descriptor of Object.values(scene.assets || {})) {
      const frames = descriptorFrames(descriptor), restored = [];
      for (const frame of frames) {
        const path = frame && frame.locator || descriptor.locator, file = map.get(path);
        if (!file) throw new Error(`项目包缺少素材文件「${path}」`);
        const bytes = typeof file.data === 'string' ? textEncoder().encode(file.data) : (file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data));
        restored.push({ locator:bytesDataUrl(bytes, frame.mime || descriptor.mime || file.mime), mime:frame.mime || descriptor.mime || file.mime });
      }
      descriptor.locator = restored[0].locator; descriptor.mime = restored[0].mime;
      if (restored.length > 1) descriptor.frames = restored; else delete descriptor.frames;
    }
    for (const [moduleId, descriptor] of Object.entries(scene.modules || {})) {
      const sourcePath=descriptor && descriptor.locator, sourceFile=map.get(sourcePath), manifestPath=descriptor && descriptor.manifestLocator, manifestFile=map.get(manifestPath);
      if(!sourceFile || !manifestFile) throw new Error(`项目包缺少模块文件「${moduleId}」`);
      const sourceBytes=typeof sourceFile.data === 'string' ? textEncoder().encode(sourceFile.data) : new Uint8Array(sourceFile.data);
      const manifestText=typeof manifestFile.data === 'string' ? manifestFile.data : textDecoder().decode(manifestFile.data);
      descriptor.locator=bytesDataUrl(sourceBytes,'text/javascript');descriptor.manifest=JSON.parse(manifestText);descriptor.manifestLocator=null;
    }
    return { project, scene, manifest:map.has('assets.manifest.json') ? JSON.parse(typeof map.get('assets.manifest.json').data === 'string' ? map.get('assets.manifest.json').data : textDecoder().decode(map.get('assets.manifest.json').data)) : null };
  }

  global.EditorVNextProjectPackage = Object.freeze({ FORMAT, ASSET_FORMAT, MODULE_FORMAT, build, restore, references, unused, dataUrlBytes, bytesDataUrl, mimeExtension });
})(typeof window !== 'undefined' ? window : globalThis);
