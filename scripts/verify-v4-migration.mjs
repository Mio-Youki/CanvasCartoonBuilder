#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractLegacyDefaultSnapshot } from './extract-legacy-default-snapshot.mjs';
import { adaptHomeSceneSnapshot } from './adapt-home-scene-native-v4.mjs';
import { buildHomeSceneModuleBaseline } from './build-home-scene-module-baseline.mjs';
import { buildHomeSceneLayeredModule } from './build-home-scene-layered-module.mjs';

const root = resolve(import.meta.dirname, '..');
const matrixPath = resolve(root, 'docs/architecture/V4_MIGRATION_MATRIX.json');
const matrix = JSON.parse(readFileSync(matrixPath, 'utf8'));
const allowed = new Set(matrix.allowedStatuses || []);
const requiredDocs = [
  'docs/architecture/V4_MIGRATION_MASTER_SPEC.md',
  'docs/architecture/V4_BEHAVIOR_BASELINE.md',
  'docs/architecture/V4_DIFFERENCE_ALLOWLIST.md',
  'docs/architecture/V4_PARITY_TEST_PLAN.md'
];

assert.equal(matrix.schema, 'tosampool-v4-migration-matrix/1', 'unexpected migration matrix schema');
assert.equal(matrix.candidate, 'img2asset-v4-classic.html', 'formal candidate must be the Classic Shell copy');
assert.notEqual(matrix.candidate, 'img2asset-vnext.html', 'vNext lab must never become the formal candidate');
assert.ok(existsSync(resolve(root, matrix.candidate)), `missing candidate ${matrix.candidate}`);
for (const file of requiredDocs) assert.ok(existsSync(resolve(root, file)), `missing migration contract ${file}`);

const ids = new Set();
for (const capability of matrix.capabilities || []) {
  assert.ok(capability.id && !ids.has(capability.id), `duplicate or missing capability id ${capability.id || '(empty)'}`);
  ids.add(capability.id);
  assert.ok(allowed.has(capability.status), `${capability.id} has invalid status ${capability.status}`);
  assert.ok(['P0', 'P1', 'P2'].includes(capability.priority), `${capability.id} has invalid priority`);
  assert.ok(Number.isInteger(capability.phase) && capability.phase >= 1 && capability.phase <= 12, `${capability.id} has invalid phase`);
  assert.ok(Array.isArray(capability.tests), `${capability.id} tests must be an array`);
  if (['browser-parity', 'complete'].includes(capability.status)) {
    assert.ok(capability.tests.length, `${capability.id} cannot be ${capability.status} without tests`);
  }
  for (const test of capability.tests) assert.ok(existsSync(resolve(root, test)), `${capability.id} references missing test ${test}`);
  if (capability.status === 'blocked') assert.ok(capability.blockedBy, `${capability.id} is blocked without blockedBy`);
}

const tauri = matrix.capabilities.find(item => item.id === 'tauri-product-entry');
assert.ok(tauri && tauri.status === 'blocked', 'Tauri entry must remain blocked during migration baseline');
const homeSnapshot=extractLegacyDefaultSnapshot(readFileSync(resolve(root,'home-scene.js'),'utf8')),homeNative=adaptHomeSceneSnapshot(homeSnapshot);
assert.equal(homeNative.saveable,true,'已知 home-scene 语义必须经外部适配器完整落入 v4，而非回落 Module');
assert.equal(homeNative.report.summary.converted,12);
const homeModule=buildHomeSceneModuleBaseline(homeSnapshot);
assert.equal(homeModule.saveable,true,'完整 Module 基线必须始终生成有效 v4 项目描述');
assert.equal(homeModule.candidate.entities[0].moduleId,'home-scene-full');
const homeLayeredModule=buildHomeSceneLayeredModule(homeSnapshot);
assert.equal(homeLayeredModule.saveable,true,'语义分层 Module 基线必须始终生成有效 v4 项目描述');
assert.equal(homeLayeredModule.candidate.entities.length,12,'语义 Module 必须保持有限、可理解的对象粒度，并将月亮保留为独立可编排对象');
console.log(`v4 migration matrix OK (${ids.size} capabilities; candidate ${matrix.candidate})`);
