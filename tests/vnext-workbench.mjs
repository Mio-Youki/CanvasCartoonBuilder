#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..'),source=readFileSync(resolve(root,'vnext-workbench.html'),'utf8');
for(const token of ['id="new"','id="open"','id="import"','id="save"','id="undo"','id="redo"','id="preview"','EditorVNextWorkspace.create()','EditorVNextInspectorModel.create(','EditorVNextEffectState.enable(','EditorVNextEffectState.setParam(','EditorVNextEffectState.setController(','EditorVNextSceneMutation.create(','EditorVNextEntityState.set(','EditorVNextAssetState.addImage(','EditorHost.pickAssets(','changes.run(','workspace.renderTo(']) assert.ok(source.includes(token),`workbench 缺少 ${token}`);
assert.ok(!source.includes('img2asset-layout-v1.html'),'workbench 不得回退到 legacy 页面');
console.log('✓ vNext Workbench：独立工作区、Inspector 模型、效果状态与固定时间预览入口合同通过');
