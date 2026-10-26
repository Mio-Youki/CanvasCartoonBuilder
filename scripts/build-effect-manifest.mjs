#!/usr/bin/env node
/** Build the deterministic Agent-facing subset of effect-registry-vnext.js. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const sourcePath = resolve(root, 'editor', 'effect-registry-vnext.js');
const outputPath = resolve(root, 'docs', 'agent', 'EFFECT_MANIFEST_VNEXT.json');
const source = readFileSync(sourcePath, 'utf8');
const sandbox = {};
new vm.Script(source, { filename: sourcePath }).runInNewContext(sandbox);
const registry = sandbox.EditorEffectRegistryVNext;
if (!registry || registry.version !== 1) throw new Error('Effect Registry vNext contract unavailable');

const expose = item => ({
  id: item.id,
  name: item.name,
  aliases: item.aliases || [],
  family: item.family,
  stage: item.stage,
  scopes: item.scopes,
  purpose: item.purpose,
  avoidWhen: item.avoidWhen || [],
  timing: item.timing,
  motion: item.motion,
  particleBake: item.particleBake,
  mask: item.mask,
  cost: item.cost,
  variantCosts: item.variantCosts,
  parameters: (item.params || []).map(param => ({ key: param.key, label: param.label, type: param.type, default: param.default, min: param.min, max: param.max, options: param.options, requires: param.requires, visibleFor: param.visibleFor })),
});
const exposeMotion = item => ({
  id:item.id,
  name:item.name,
  primitive:item.primitive || 'effect-specific',
  parameters:(item.params || []).map(param=>({ key:param.key, label:param.label, type:param.type, default:param.default, min:param.min, max:param.max, step:param.step, integer:param.integer, timing:param.timing, options:param.options, optionLabels:param.optionLabels, when:param.when })),
});

const manifest = {
  format: 'tosampool-agent-effect-manifest',
  version: 1,
  lifecycle: registry.lifecycle,
  source: 'editor/effect-registry-vnext.js',
  motionContract: 'MOTION_CONTRACT_V1.md',
  pipelines: registry.pipelines,
  controllers: registry.controllers.map(expose),
  effects: registry.effects.map(expose),
  motions: (registry.motions || []).map(exposeMotion),
  runtimeSupport: registry.runtimeSupport,
  recipes: registry.recipes,
  removed: registry.removed,
  agentRules: [
    '先从用户目标选择 effect/recipe，再填写参数；不要从字段名猜效果。',
    '对象效果随对象 z 合成；场景效果只处理已合成画面，范围蒙版不改变对象 z。',
    '采样格是唯一共享采样控制器；采样场与边缘保护只写入 uneven-sampling，不得暗中调制其它采样效果。',
    '时序只写被实际修改的稀疏参数；Step 与 Linear 能力以 effect registry 声明为准。',
    '粒子继承可 particleBake: shared-frame 的对象视觉胶囊，不继承场景效果、z、位置、scroll 或显示时段。',
  ],
};

const rendered = JSON.stringify(manifest, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== rendered) {
    throw new Error('EFFECT_MANIFEST_VNEXT.json is stale; run npm run effect-manifest');
  }
  console.log('Effect manifest is current');
} else {
  writeFileSync(outputPath, rendered, 'utf8');
  console.log(`Wrote ${outputPath}`);
}
