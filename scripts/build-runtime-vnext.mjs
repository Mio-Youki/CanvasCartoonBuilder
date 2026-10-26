#!/usr/bin/env node
/** Build the self-contained experimental Runtime vNext distribution. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourceDir = resolve(root, 'runtime-src', 'vnext');
const modules = ['00-namespace.js', '15-builtin-registry.js', '16-scene-module-registry.js', '10-scene-normalize.js', '20-timeline-evaluator.js', '30-frame-state.js', '40-surface-pool.js', '50-mask-resolver.js', '55-pattern-field.js', '56-grain-field.js', '57-hard-mix.js', '58-paint.js', '59-text-reveal.js', '59a-path-stroke.js', '60-content-renderer.js', '65-decorate-effects.js', '67-sampling-field.js', '68-sampling-effects.js', '68a-crt-screen.js', '68c-ascii-analysis.js', '68d-ascii-gpu-analysis.js', '68b-ascii-mapping.js', '69-scene-effects.js', '69a-scene-gpu-executor.js', '70-object-composer.js', '75-particle-renderer.js', '80-scene-renderer.js', '90-public-api.js'];
modules.splice(modules.indexOf('30-frame-state.js'),0,'21-parameter-timing.js','29-motion.js');
modules.splice(modules.indexOf('50-mask-resolver.js'),0,'49-mask-contract.js');
modules.splice(modules.indexOf('55-pattern-field.js'),0,'51-mask-sources.js');
modules.splice(modules.indexOf('55-pattern-field.js'),0,'52-mask-sampler.js');
modules.splice(modules.indexOf('55-pattern-field.js'),0,'53-weighted-distribution.js');
modules.splice(modules.indexOf('75-particle-renderer.js'),0,'74-particle-births.js');
modules.splice(modules.indexOf('75-particle-renderer.js'),0,'74b-layer-fragments.js');
modules.splice(modules.indexOf('75-particle-renderer.js'),0,'74c-layer-stream.js');
modules.splice(modules.indexOf('69a-scene-gpu-executor.js'),0,'69b-backend-capabilities.js','69c-native-nearest.js');
modules.splice(modules.indexOf('70-object-composer.js'),0,'69d-object-gpu-pilot.js');
modules.splice(modules.indexOf('60-content-renderer.js'),0,'59c-path-wave.js','59b-path-geometry.js','59d-path-extensions.js','59e-path-instances.js','59f-path-endpoints.js','59g-custom-shapes.js','59h-bracket-shapes.js','59i-pattern-snapshot.js','59j-pattern-provider.js');
modules.splice(modules.indexOf('60-content-renderer.js'),0,'59k-pattern-generators.js','59l-dual-ray-pattern.js','59m-path-generators.js');
const output = modules.map(name => `/* <vnext:${name}> */\n${readFileSync(resolve(sourceDir, name), 'utf8').trim()}\n/* </vnext:${name}> */`).join('\n\n') + '\n';
const outputPath = resolve(root, 'home-scene-vnext.js');
if (process.argv.includes('--check')) {
  if (readFileSync(outputPath, 'utf8') !== output) throw new Error('home-scene-vnext.js 已过期；请运行 npm run runtime:vnext');
  console.log('Runtime vNext distribution is current');
} else {
  writeFileSync(outputPath, output, 'utf8');
  console.log(`Wrote ${outputPath}`);
}
