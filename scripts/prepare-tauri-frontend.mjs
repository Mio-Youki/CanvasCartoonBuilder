#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, '.tauri-dist');
const files = [
  'img2asset-layout-v1.html',
  'home-scene.js',
  'runtime-inline.js',
  'editor/artifact-builder.js',
  'editor/asset-resolver.js',
  'editor/command-registry.js',
  'editor/effect-registry.js',
  'editor/geometry.js',
  'editor/host-adapter.js',
  'editor/performance-monitor.js',
  'editor/runtime-bridge.js',
  'editor/sampling-motion-kernel.js',
  'editor/scene-model.js',
  'editor/scene-mutation.js',
  'editor/scene-serializer.js',
  'editor/tauri-host-adapter.js',
  'editor/timeline-model.js',
  'editor/exporter.js'
];

function writeIfChanged(target, content) {
  if (existsSync(target) && Buffer.compare(readFileSync(target), content) === 0) return false;
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  return true;
}

mkdirSync(out, { recursive: true });
let changed = 0;
for (const file of files) {
  const source = resolve(root, file);
  const target = resolve(out, file);
  if (writeIfChanged(target, readFileSync(source))) changed++;
}

const htmlPath = resolve(out, 'img2asset-layout-v1.html');
const html = readFileSync(htmlPath, 'utf8');
const missing = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)]
  .map(match => match[1])
  .filter(src => !/^([a-z]+:|\/\/)/i.test(src))
  .filter(src => !files.includes(src.replace(/^\.\//, '')));
if (missing.length) throw new Error(`Tauri 前端缺少脚本：${missing.join(', ')}`);

const manifest = Buffer.from(JSON.stringify({
  formatVersion: 1,
  entry: 'img2asset-layout-v1.html',
  files: files.slice().sort()
}, null, 2) + '\n', 'utf8');
if (writeIfChanged(resolve(out, 'build-manifest.json'), manifest)) changed++;

const allowed = new Set([...files, 'build-manifest.json'].map(file => file.replace(/\\/g, '/')));
function prune(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      prune(path);
      if (readdirSync(path).length === 0) rmSync(path, { recursive: false });
    } else if (!allowed.has(relative(out, path).replace(/\\/g, '/'))) {
      rmSync(path);
      changed++;
    }
  }
}
prune(out);

console.log(`Tauri 前端已就绪：${relative(root, out)}（${files.length} 个文件，更新 ${changed} 项）`);
