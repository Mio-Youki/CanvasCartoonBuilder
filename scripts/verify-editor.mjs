#!/usr/bin/env node
/**
 * 只读编辑器基线校验。
 *
 * 不修改任何场景、HTML 或 Runtime 文件；用于提交前发现语法、镜像和
 * 自包含图片导出路径的回归。可选参数依次为：编辑器 HTML、工具 Runtime、站点 Runtime。
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { validateSceneFile } from './validate-scene.mjs';

const root = resolve(import.meta.dirname, '..');
const [htmlPath = resolve(root, 'img2asset-layout-v1.html'), toolRuntime = resolve(root, 'home-scene.js'), siteRuntime = resolve(root, '..', 'public', 'home-scene.js')] = process.argv.slice(2).map((path) => resolve(path));
let failed = false;

function fail(message) {
  failed = true;
  console.error(`✗ ${message}`);
}

function pass(message) {
  console.log(`✓ ${message}`);
}

function source(path, label) {
  if (!existsSync(path)) {
    fail(`${label} 不存在：${path}`);
    return null;
  }
  return readFileSync(path, 'utf8');
}

function compileScript(code, filename) {
  try {
    new vm.Script(code, { filename });
    return true;
  } catch (error) {
    fail(`${filename} 语法错误：${error.message}`);
    return false;
  }
}

const html = source(htmlPath, '编辑器 HTML');
const runtime = source(toolRuntime, '工具 Runtime');
const site = source(siteRuntime, '站点 Runtime');
const inlineRuntime = source(resolve(root, 'runtime-inline.js'), '测试页 Runtime 镜像');

if (runtime && compileScript(runtime, toolRuntime)) pass('工具 Runtime 语法通过');
if (site && compileScript(site, siteRuntime)) pass('站点 Runtime 语法通过');

if (runtime && site) {
  const digest = (value) => createHash('sha256').update(value).digest('hex');
  if (digest(runtime) === digest(site)) pass('工具与站点 Runtime SHA256 一致');
  else fail('工具与站点 Runtime 不一致；请同步 home-scene.js 镜像');
}

if (runtime && inlineRuntime) {
  const match = inlineRuntime.match(/window\.__PATCHARIUM_RUNTIME_SOURCE__\s*=\s*([\s\S]*);\s*$/);
  try {
    const embedded = match && new vm.Script(match[1], { filename: 'runtime-inline.js payload' }).runInNewContext({});
    if (embedded === runtime) pass('测试页 Runtime 镜像与工具 Runtime 一致');
    else fail('测试页 Runtime 镜像已过期；请运行 scripts/build-runtime-inline.mjs');
  } catch (error) { fail(`测试页 Runtime 镜像无法解析：${error.message}`); }
}

if (html) {
  let inlineCount = 0;
  const scripts = html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi);
  for (const match of scripts) {
    if (/\bsrc\s*=/i.test(match[1])) continue;
    inlineCount += 1;
    compileScript(match[2], `${htmlPath} <script #${inlineCount}>`);
  }
  if (inlineCount) pass(`编辑器 ${inlineCount} 段内联脚本语法通过`);
  else fail('未在编辑器 HTML 中找到可校验的内联脚本');

  // 这不是导出执行测试，而是防止 2026-08-31 的关键保护被误删：
  // 带 srcId 的图片在“保存/测试场景”序列化期间仍必须保留 data: URL。
  const hasGuard = /serializingSceneFile/.test(html);
  const hasDataUrlGuard = /indexOf\(['"]data:['"]\)\s*===\s*0/.test(html);
  if (hasGuard && hasDataUrlGuard) pass('自包含图片导出保护存在');
  else fail('未检测到自包含图片导出保护；请检查场景保存/测试路径');

  // 通用场景本身只有 GENERIC_SCENE 数据：测试页必须补入 Runtime，并冻结开发期相对图片。
  const genericTestRuntime = /function\s+runtimeSourceForGenericTest\s*\(/.test(html)
    && /function\s+freezeLinkedTestAssets\s*\(/.test(html)
    && /imageAsDataUrlForSceneTest/.test(html)
    && /extractObj\(fileText,\s*'GENERIC_SCENE'\)/.test(html)
    && /window\.HOME_SCENE\s*=\s*['"]\s*\+\s*JSON\.stringify/.test(html);
  if (genericTestRuntime) pass('通用场景测试页 Runtime 与相对素材内嵌路径存在');
  else fail('未检测到通用场景测试页的 Runtime / 相对素材内嵌路径');

  const inspectorBackgroundLayers = /renderBackgroundLayers\(cfg,\s*panel\)/.test(html);
  if (inspectorBackgroundLayers) pass('场景 Inspector 图片背景层入口存在');
  else fail('场景 Inspector 未挂载图片背景层');

  const samplingScopes = /appendSampleJitterInspector/.test(html)
    && /全局采样/.test(html) && /局部采样/.test(html) && /再像素化/.test(html);
  if (samplingScopes && runtime && /function\s+sampleJitterAt\s*\(/.test(runtime)) pass('四层采样作用域与采样闪变入口存在');
  else fail('采样作用域或 sampleJitter Runtime / Inspector 入口缺失');
}

// Agent 合同样例是稳定 Scene 子集的回归夹具；不拿兼容 HOME_SCENE 做此校验。
for (const fixture of ['agent-contract-minimal.js', 'agent-contract-effects.js', 'karsten-cloud-drift.js']) {
  const path = resolve(root, 'examples', fixture);
  try {
    const result = validateSceneFile(path);
    result.warnings.forEach((message) => console.warn(`△ ${fixture}：${message}`));
    if (result.errors.length) result.errors.forEach((message) => fail(`${fixture}：${message}`));
    else pass(`${fixture} Scene 合同通过`);
  } catch (error) {
    fail(`${fixture}：${error.message}`);
  }
}

process.exitCode = failed ? 1 : 0;
