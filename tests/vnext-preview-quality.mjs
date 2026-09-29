#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..');
const sandbox={};
new vm.Script(readFileSync(resolve(root,'editor/performance-monitor.js'),'utf8'),{filename:'performance-monitor.js'}).runInNewContext(sandbox);
const monitor=sandbox.EditorPerformance.create();

let state=monitor.snapshot();
assert.equal(state.mode,'auto');assert.equal(state.effectiveMode,'full');assert.equal(state.pixelDivMultiplier,1);
monitor.setWorkload(1920*1080);for(let i=0;i<8;i++)monitor.record(80);
state=monitor.snapshot();
assert.equal(state.effectiveMode,'full','Auto 在持续超预算后必须保持所见即所得的 Full 采样');
assert.equal(state.interval,166);assert.equal(state.pixelDivMultiplier,1,'Auto 只能降刷新节奏，不得隐式放大场景采样格');assert.ok(state.switches>=1);
for(let i=0;i<100;i++)monitor.record(16);
state=monitor.snapshot();
assert.equal(state.effectiveMode,'full','Auto 必须在低负载窗口稳定后恢复 Full');
assert.equal(state.interval,82);assert.equal(state.pixelDivMultiplier,1);assert.ok(state.switches>=2,'Auto 升降级必须可观测');
monitor.setMode('draft');state=monitor.snapshot();assert.equal(state.effectiveMode,'draft');assert.equal(state.pixelDivMultiplier,8);assert.equal(state.targetFps,6);
monitor.setWorkload(960*540);state=monitor.snapshot();assert.equal(state.pixelDivMultiplier,4,'M 画布 Draft 使用 4× 工作降采样');
monitor.setWorkload(480*270);state=monitor.snapshot();assert.equal(state.pixelDivMultiplier,2,'S 画布 Draft 使用 2× 工作降采样');
monitor.setMode('full');state=monitor.snapshot();assert.equal(state.effectiveMode,'full');assert.equal(state.pixelDivMultiplier,1);assert.equal(state.targetFps,12);

console.log('✓ v4 预览质量：Full/Draft 固定预算与 Auto 迟滞升降级合同通过');
