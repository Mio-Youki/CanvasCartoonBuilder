#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..'), page = readFileSync(resolve(root, 'img2asset-vnext.html'), 'utf8'), controller = readFileSync(resolve(root, 'editor/vnext-editor-page.js'), 'utf8'), structure = readFileSync(resolve(root, 'editor/vnext-structure-controller.js'), 'utf8'), geometry = readFileSync(resolve(root, 'editor/vnext-geometry-controller.js'), 'utf8'), ux = readFileSync(resolve(root, 'editor/vnext-editor-ux.js'), 'utf8');
for (const token of ['ToSampool · vNext 编辑器迁移副本','id="vnext-stage"','id="timeline-dock"','id="vnext-timeline"','id="structure-tree"','id="asset-pane"','id="inspector-context"','home-scene-vnext.js','editor/vnext-workspace.js','editor/vnext-scene-mutation.js','editor/vnext-entity-state.js','editor/vnext-effect-state.js','editor/vnext-mask-state.js','editor/vnext-asset-state.js','editor/vnext-asset-recipe.js','editor/vnext-structure-state.js','editor/vnext-canvas-hit.js','editor/vnext-timeline-state.js','editor/vnext-preview-scheduler.js','editor/vnext-editor-page.js','editor/vnext-structure-controller.js','editor/vnext-geometry-controller.js','editor/vnext-editor-ux.js']) assert.ok(page.includes(token), `vNext 迁移副本缺少 ${token}`);
assert.ok(!page.includes('vnext-workbench.html'), '迁移副本不得嵌入最小验证工作台');
for (const legacy of ['src="home-scene.js"','src="runtime-inline.js"','src="editor/command-registry.js"','src="editor/effect-registry.js"','src="editor/scene-mutation.js"']) assert.ok(!page.includes(legacy), `vNext 页面不得加载 legacy 依赖：${legacy}`);
assert.ok(!page.includes('data-legacy-source') && !page.includes('installVNextSessionShell'), 'vNext 页面不得保留 legacy 控制器源');
for (const token of ['EditorVNextWorkspace.create','EditorVNextPreviewScheduler.create','EditorVNextSceneMutation.create','EditorVNextEntityState.set','EditorVNextEffectState.setParam','EditorVNextTimelineState.setLinear','EditorVNextAssetState.addImage','document.body.classList.add(\'vnext-session\')']) assert.ok(controller.includes(token), `vNext 纯页面控制器缺少 ${token}`);
assert.ok(controller.includes('function frame(now)'), 'vNext 预览必须具有同步 RAF 热路径');
assert.ok(!controller.includes('async function frame(now)'), 'vNext RAF 热路径不得等待 Player/素材解析');
assert.ok(controller.includes('scheduler.shouldRender'), 'vNext 预览必须按静态/动态判定请求 Canvas 重绘');
assert.ok(controller.includes('previewMetrics'), 'vNext 页面必须暴露可复核的预览性能指标');
new vm.Script(controller, { filename: 'vnext-editor-page.js' });
new vm.Script(structure, { filename: 'vnext-structure-controller.js' });
new vm.Script(geometry, { filename: 'vnext-geometry-controller.js' });
new vm.Script(ux, { filename: 'vnext-editor-ux.js' });
assert.ok(!/<script>([\s\S]*?)<\/script>/.test(page), 'vNext 页面不得保留可执行内联 legacy 控制器');
console.log('✓ vNext Editor Shell：纯 v4 依赖、完整布局外壳与独立页面控制器合同通过');
