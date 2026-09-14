#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const source = readFileSync(resolve(import.meta.dirname, '..', 'editor', 'tauri-host-adapter.js'), 'utf8');
const calls = [];
const replies = {
  patcharium_open_text: { name: 'scene.js', text: 'window.HOME_SCENE={};', locator: 'authorized-scene' },
  patcharium_save_artifact: { mode: 'direct', name: 'scene.js', locator: 'authorized-scene' },
  patcharium_resolve_asset: 'data:image/png;base64,AA=='
};
const sandbox = {
  Blob,
  File,
  Uint8Array,
  atob,
  btoa,
  __PATCHARIUM_TAURI_BRIDGE__: {
    async invoke(command, payload) {
      calls.push({ command, payload });
      return replies[command] ?? null;
    }
  }
};
vm.runInNewContext(source, sandbox, { filename: 'tauri-host-adapter.js' });
const host = sandbox.__PATCHARIUM_HOST__;
if (!host || host.kind !== 'tauri') throw new Error('Tauri bridge 未安装 Host');

await host.openText({ accept: '.js' });
await host.resolveAsset({ ref: 'assets/picture.png' });
await host.saveFile({ kind: 'scene', name: 'scene.js', mime: 'text/javascript', data: 'ok' });

const resolveCall = calls.find(call => call.command === 'patcharium_resolve_asset');
const saveCall = calls.find(call => call.command === 'patcharium_save_artifact');
if (resolveCall?.payload?.sceneLocator !== 'authorized-scene') throw new Error('相对素材未携带当前 Scene locator');
if (saveCall?.payload?.sceneLocator !== 'authorized-scene' || saveCall?.payload?.writeBack !== true) throw new Error('Scene 原位保存合同错误');
if (saveCall?.payload?.artifact?.encoding !== 'utf8') throw new Error('文本 Artifact 编码合同错误');

console.log('✓ Tauri Host Adapter：locator、相对素材与 Scene 原位保存合同通过');
