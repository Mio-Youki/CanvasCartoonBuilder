#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..'),sandbox={Buffer,TextEncoder,TextDecoder};
new vm.Script(readFileSync(resolve(root,'home-scene-vnext.js'),'utf8'),{filename:'home-scene-vnext.js'}).runInNewContext(sandbox);
new vm.Script(readFileSync(resolve(root,'editor/vnext-module-loader.js'),'utf8'),{filename:'editor/vnext-module-loader.js'}).runInNewContext(sandbox);
const manifest={format:'tosampool-scene-module/v1',id:'trusted-test',version:1,parameters:[]},source=`globalThis.ToSampoolRuntimeVNext.modules.sceneModules.register({manifest:${JSON.stringify(manifest)},render(){}});`,scene={modules:{'trusted-test':{id:'trusted-test',version:1,manifest,locator:'data:text/javascript;base64,'+Buffer.from(source).toString('base64')}}};
assert.equal(sandbox.EditorVNextModuleLoader.inspect(scene)[0].id,'trusted-test');assert.deepEqual([...await sandbox.EditorVNextModuleLoader.trustAndLoad(scene,[])],[],'未明确授权不得运行任何模块');
assert.deepEqual([...await sandbox.EditorVNextModuleLoader.trustAndLoad(scene,['trusted-test'])],['trusted-test']);assert.ok(sandbox.ToSampoolRuntimeVNext.modules.sceneModules.definition('trusted-test',1));
const sharedManifest={format:'tosampool-scene-module/v1',id:'shared-module',version:1,parameters:[]},makeScene=color=>({modules:{'shared-module':{id:'shared-module',version:1,manifest:sharedManifest,locator:'data:text/javascript;base64,'+Buffer.from(`globalThis.ToSampoolRuntimeVNext.modules.sceneModules.register({manifest:${JSON.stringify(sharedManifest)},render(){return ${JSON.stringify(color)};}});`).toString('base64')}}});
await sandbox.EditorVNextModuleLoader.trustAndLoad(makeScene('#a00'),['shared-module'],{scope:'project:a'});
await sandbox.EditorVNextModuleLoader.trustAndLoad(makeScene('#00a'),['shared-module'],{scope:'project:b'});
assert.notEqual(sandbox.ToSampoolRuntimeVNext.modules.sceneModules.definition('shared-module',1,{scope:'project:a'}).render,sandbox.ToSampoolRuntimeVNext.modules.sceneModules.definition('shared-module',1,{scope:'project:b'}).render,'Loader 必须允许两个项目安全加载同名 Module');
console.log('✓ v4 Module Loader：项目打开不执行、仅显式信任后注册模块通过');
