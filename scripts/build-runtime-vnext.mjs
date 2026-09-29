#!/usr/bin/env node
/** Build the self-contained experimental Runtime vNext distribution. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourceDir = resolve(root, 'runtime-src', 'vnext');
const modules = ['00-namespace.js', '15-builtin-registry.js', '10-scene-normalize.js', '20-timeline-evaluator.js', '30-frame-state.js', '40-surface-pool.js', '50-mask-resolver.js', '55-pattern-field.js', '60-content-renderer.js', '65-decorate-effects.js', '67-sampling-field.js', '68-sampling-effects.js', '69-scene-effects.js', '70-object-composer.js', '75-particle-renderer.js', '80-scene-renderer.js', '90-public-api.js'];
const output = modules.map(name => `/* <vnext:${name}> */\n${readFileSync(resolve(sourceDir, name), 'utf8').trim()}\n/* </vnext:${name}> */`).join('\n\n') + '\n';
const outputPath = resolve(root, 'home-scene-vnext.js');
if (process.argv.includes('--check')) {
  if (readFileSync(outputPath, 'utf8') !== output) throw new Error('home-scene-vnext.js 已过期；请运行 npm run runtime:vnext');
  console.log('Runtime vNext distribution is current');
} else {
  writeFileSync(outputPath, output, 'utf8');
  console.log(`Wrote ${outputPath}`);
}
