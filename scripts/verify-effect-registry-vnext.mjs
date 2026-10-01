#!/usr/bin/env node
/** Static contract check for the experimental ToSampool effect registry. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const sourcePath = resolve(root, 'editor', 'effect-registry-vnext.js');
const sandbox = {};
new vm.Script(readFileSync(sourcePath, 'utf8'), { filename: sourcePath }).runInNewContext(sandbox);
const registry = sandbox.EditorEffectRegistryVNext;

const fail = message => { throw new Error(`effect-registry-vnext: ${message}`); };
if (!registry || registry.version !== 1 || registry.lifecycle !== 'classic-shell-connected') fail('missing connected v1 contract');

const ids = new Set();
const validScopes = new Set(['object', 'scene']);
const validCosts = new Set(['A', 'B', 'C']);
const validTiming = new Set(['step', 'linear-safe']);
const validStages = new Set(['formation-color', 'decorate-back', 'decorate-edge', 'decorate-inside', 'compose-grade', 'sample-color', 'sample-output', 'sample-coordinate', 'sample-pattern', 'scene-overlay']);

for (const item of [...registry.controllers, ...registry.effects]) {
  if (!item.id || ids.has(item.id)) fail(`duplicate or missing id ${item.id || '(empty)'}`);
  ids.add(item.id);
  if (!item.name || !Array.isArray(item.scopes) || !item.scopes.length || item.scopes.some(scope => !validScopes.has(scope))) fail(`${item.id} has invalid scopes`);
  if (item.timing && typeof item.timing === 'string' && !validTiming.has(item.timing)) fail(`${item.id} has invalid timing ${item.timing}`);
  if (item.timing && typeof item.timing === 'object' && Object.values(item.timing).some(timing => !validTiming.has(timing))) fail(`${item.id} has invalid parameter timing map`);
  if (item.cost && typeof item.cost === 'string' && !validCosts.has(item.cost)) fail(`${item.id} has invalid cost ${item.cost}`);
  if (item.cost && typeof item.cost === 'object' && Object.values(item.cost).some(cost => !validCosts.has(cost))) fail(`${item.id} has invalid scoped cost`);
  for (const parameter of item.params || []) {
    if (!parameter.key || !parameter.label || !parameter.type || !Object.hasOwn(parameter, 'default')) fail(`${item.id} has incomplete parameter metadata`);
    if (parameter.timing && !validTiming.has(parameter.timing)) fail(`${item.id}.${parameter.key} has invalid timing ${parameter.timing}`);
    if (parameter.timing === 'linear-safe' && !['number', 'color'].includes(parameter.type)) fail(`${item.id}.${parameter.key} cannot use Linear with ${parameter.type}`);
  }
}

for (const effect of registry.effects) {
  if (!validStages.has(effect.stage)) fail(`${effect.id} has invalid stage ${effect.stage}`);
  if (effect.family === 'formation' ? effect.card !== false : effect.card !== true) fail(`${effect.id} has an invalid card policy`);
  const support = registry.runtimeSupport && registry.runtimeSupport[effect.id];
  if (!support || effect.scopes.some(scope => !['ready', 'planned'].includes(support[scope]))) fail(`${effect.id} lacks runtime support declaration`);
}

if (registry.pipelines.object.defaultOrder.join(',') !== 'mask,decorate,sample') fail('object default pipeline must be mask → decorate → sample');
if (registry.pipelines.scene.order.join(',') !== 'overlay,sample') fail('scene pipeline order is invalid');

for (const recipe of registry.recipes) {
  if (!recipe.id || !recipe.name || !Array.isArray(recipe.uses)) fail('incomplete recipe metadata');
  for (const id of recipe.uses) if (!registry.effectById[id]) fail(`recipe ${recipe.id} references unknown effect ${id}`);
}

console.log(`Effect registry vNext contract OK (${registry.effects.length} effects, ${registry.controllers.length} controllers)`);
