#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
console.log(`v4 migration matrix OK (${ids.size} capabilities; candidate ${matrix.candidate})`);
