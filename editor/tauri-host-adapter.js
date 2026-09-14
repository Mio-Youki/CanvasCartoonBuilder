(function (global) {
  'use strict';

  function tauriInvokeBridge() {
    const supplied = global.__PATCHARIUM_TAURI_BRIDGE__;
    if (supplied && typeof supplied.invoke === 'function') return { invoke: supplied.invoke.bind(supplied) };
    const core = global.__TAURI__ && global.__TAURI__.core;
    if (core && typeof core.invoke === 'function') return { invoke: core.invoke.bind(core) };
    return null;
  }

  function dataUrlToBlob(dataUrl) {
    const parts = String(dataUrl || '').match(/^data:([^;,]*)(;base64)?,(.*)$/s);
    if (!parts) throw new Error('宿主返回的素材不是有效 data URL');
    const mime = parts[1] || 'application/octet-stream';
    const raw = parts[2] ? global.atob(parts[3]) : decodeURIComponent(parts[3]);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function blobToBase64(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return global.btoa(binary);
  }

  async function wireArtifact(artifact) {
    const binary = artifact.data instanceof Blob;
    return {
      kind: artifact.kind,
      name: artifact.name,
      mime: artifact.mime,
      description: artifact.description,
      ext: artifact.ext,
      meta: artifact.meta || {},
      encoding: binary ? 'base64' : 'utf8',
      data: binary ? await blobToBase64(artifact.data) : String(artifact.data == null ? '' : artifact.data),
    };
  }

  function create(bridge) {
    if (!bridge || typeof bridge.invoke !== 'function') throw new Error('Tauri invoke bridge is required');
    let sceneLocator = null;
    const invoke = (command, payload) => bridge.invoke(command, payload || {});
    return Object.freeze({
      kind: 'tauri',
      capabilities: Object.freeze({ directWrite: true, batchWrite: true, projectDirectory: true, persistentAssets: false, nativeEncoding: false }),
      get currentSceneLocator() { return sceneLocator; },
      async openText(options) {
        const opened = await invoke('patcharium_open_text', { options: options || {} });
        if (!opened) return null;
        sceneLocator = opened.locator || null;
        return { name: opened.name || 'scene.js', text: opened.text || '', locator: sceneLocator };
      },
      async saveFile(artifact) {
        const result = await invoke('patcharium_save_artifact', {
          artifact: await wireArtifact(artifact),
          sceneLocator,
          writeBack: artifact.kind === 'scene',
        });
        if (result && artifact.kind === 'scene' && result.locator) sceneLocator = result.locator;
        return result;
      },
      async saveBatch(options) {
        const artifacts = Array.isArray(options && options.artifacts) ? options.artifacts : [];
        return invoke('patcharium_save_artifacts', { artifacts: await Promise.all(artifacts.map(wireArtifact)), sceneLocator });
      },
      async pickAssets(options) {
        const picked = await invoke('patcharium_pick_assets', { options: options || {}, sceneLocator });
        if (!picked || !picked.length) return [];
        return Promise.all(picked.map(async item => {
          const dataUrl = item.dataUrl || await invoke('patcharium_read_asset', { locator: item.locator });
          const blob = dataUrlToBlob(dataUrl);
          const file = new File([blob], item.name || 'asset', { type: item.mime || blob.type });
          Object.defineProperty(file, '_patchariumLocator', { value: item.locator || null });
          return file;
        }));
      },
      async readDataUrl(file) {
        if (file && file._patchariumLocator) return invoke('patcharium_read_asset', { locator: file._patchariumLocator });
        if (!(file instanceof Blob)) throw new Error('无法读取所选素材');
        return 'data:' + (file.type || 'application/octet-stream') + ';base64,' + await blobToBase64(file);
      },
      async resolveAsset(options) {
        return invoke('patcharium_resolve_asset', { ref: options && options.ref, sceneLocator: options && options.sceneLocator || sceneLocator });
      },
    });
  }

  global.EditorTauriHost = Object.freeze({ create, wireArtifact });
  const bridge = tauriInvokeBridge();
  if (bridge && !global.__PATCHARIUM_HOST__) global.__PATCHARIUM_HOST__ = create(bridge);
})(typeof window !== 'undefined' ? window : globalThis);
