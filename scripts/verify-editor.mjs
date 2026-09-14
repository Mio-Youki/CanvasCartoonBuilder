#!/usr/bin/env node
/**
 * 只读编辑器基线校验。
 *
 * 不修改任何场景、HTML 或 Runtime 文件；用于提交前发现语法、镜像和
 * 自包含图片导出路径的回归。可选参数依次为：编辑器 HTML、工具 Runtime、站点 Runtime。
 * 站点 Runtime 只有在显式传入第三个参数时才比较；工具仓库不再默认绑定某个消费端。
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { validateSceneFile } from './validate-scene.mjs';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const htmlPath = resolve(args[0] || resolve(root, 'img2asset-layout-v1.html'));
const toolRuntime = resolve(args[1] || resolve(root, 'home-scene.js'));
const siteRuntime = args[2] ? resolve(args[2]) : null;
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
const site = siteRuntime ? source(siteRuntime, '站点 Runtime') : null;
const inlineRuntime = source(resolve(root, 'runtime-inline.js'), '测试页 Runtime 镜像');
const tauriHostAdapter = source(resolve(root, 'editor', 'tauri-host-adapter.js'), '编辑器 Tauri Host Adapter');
const hostAdapter = source(resolve(root, 'editor', 'host-adapter.js'), '编辑器 Host Adapter');
const commandRegistry = source(resolve(root, 'editor', 'command-registry.js'), '编辑器 Command Registry');
const runtimeBridge = source(resolve(root, 'editor', 'runtime-bridge.js'), '编辑器 Runtime Bridge');
const performanceMonitor = source(resolve(root, 'editor', 'performance-monitor.js'), '编辑器性能监测器');
const timelineModel = source(resolve(root, 'editor', 'timeline-model.js'), '编辑器 Timeline Model');
const sceneSerializer = source(resolve(root, 'editor', 'scene-serializer.js'), '编辑器 Scene Serializer');
const assetResolver = source(resolve(root, 'editor', 'asset-resolver.js'), '编辑器 Asset Resolver');
const artifactBuilder = source(resolve(root, 'editor', 'artifact-builder.js'), '编辑器 Artifact Builder');
const sceneMutation = source(resolve(root, 'editor', 'scene-mutation.js'), '编辑器 Scene Mutation');
const effectRegistry = source(resolve(root, 'editor', 'effect-registry.js'), '编辑器 Effect Registry');
const samplingKernel = source(resolve(root, 'editor', 'sampling-motion-kernel.js'), 'Sampling Motion Kernel');

if (runtime && compileScript(runtime, toolRuntime)) pass('工具 Runtime 语法通过');
if (samplingKernel && compileScript(samplingKernel, 'editor/sampling-motion-kernel.js')) {
  const sandbox = {}; new vm.Script(samplingKernel).runInNewContext(sandbox);
  const kernel = sandbox.SamplingMotionKernel;
  const api = ['phaseAt','fieldConfig','fieldTick','buildField','grainTide','applyGrain','applyThreshold','drawDither'];
  if (kernel?.version === 1 && api.every(key => typeof kernel[key] === 'function')) pass('Sampling Motion 共享像素内核合同通过');
  else fail('Sampling Motion 共享像素内核 API 不完整');
  const start = '/* <generated:sampling-motion-kernel> */', end = '/* </generated:sampling-motion-kernel> */';
  const embedded = runtime && runtime.includes(start) && runtime.includes(end) ? runtime.slice(runtime.indexOf(start) + start.length, runtime.indexOf(end)).trim() : '';
  if (embedded === samplingKernel.trim()) pass('自包含 Runtime 内嵌 Sampling Motion Kernel 与模块源一致');
  else fail('自包含 Runtime 的 Sampling Motion Kernel 已过期；请运行 scripts/build-runtime-inline.mjs');
}
if (effectRegistry && compileScript(effectRegistry, 'editor/effect-registry.js')) {
  const sandbox = {}; new vm.Script(effectRegistry).runInNewContext(sandbox);
  const registry = sandbox.EditorEffectRegistry;
  const samplingOk=registry&&registry.samplingMotionKeys.join(',')==='pixelBoil,thresholdPulse,ditherDrift,grainTide'&&registry.samplingMotion.every(item=>item.defaults&&item.controls.length)
    && registry.samplingMotionByKey.grainTide.defaults.targets==='combined'
    && registry.samplingField?.defaults?.type==='wave'&&registry.samplingField.controls.length
    && registry.samplingEdge?.defaults?.mode==='alpha'&&registry.samplingEdge.controls.length
    && registry.samplingPresets?.some(item=>item.key==='stableContour');
  const localOk=registry&&registry.localFx.map(item=>item.key).join(',')==='fog,glow,scan,crt,vignette,glitch,noise,flicker'&&registry.localFx.every(item=>item.group&&item.defaultStrength>0);
  const globalOk=registry&&registry.globalFx.map(item=>item.key).join(',')==='crt,vignette,glitch,noise'&&registry.globalFx.every(item=>item.group);
  if (samplingOk&&localOk&&globalOk) pass('Sampling Motion 与全局/局部 FX 注册表顺序、默认值和控件合同通过');
  else fail('效果注册表合同不完整');
}
if (tauriHostAdapter && compileScript(tauriHostAdapter, 'editor/tauri-host-adapter.js')) {
  const calls = [], sandbox = { Blob, Uint8Array };
  new vm.Script(tauriHostAdapter).runInNewContext(sandbox);
  const host = sandbox.EditorTauriHost && sandbox.EditorTauriHost.create({ invoke: async (command, payload) => {
    calls.push([command, payload]);
    if (command === 'patcharium_open_text') return { name: 'demo.js', text: 'scene', locator: 'project/demo.js' };
    if (command === 'patcharium_resolve_asset') return 'data:image/png;base64,AA==';
    if (command === 'patcharium_save_artifact') return { mode: 'direct', name: 'demo.js', locator: 'project/demo.js' };
    if (command === 'patcharium_save_artifacts') return [];
    return null;
  }});
  const opened = host && await host.openText({ accept: '.js' });
  const resolvedAsset = host && await host.resolveAsset({ ref: 'assets/a.png' });
  const savedArtifact = host && await host.saveFile({ kind: 'scene', name: 'demo.js', mime: 'text/javascript', ext: '.js', data: 'code' });
  if (opened && opened.locator === 'project/demo.js' && host.currentSceneLocator === 'project/demo.js' && /^data:image/.test(resolvedAsset) && savedArtifact && calls.some(([name]) => name === 'patcharium_save_artifact')) pass('Tauri Host 的场景 locator、素材解析与产物写入合同通过');
  else fail('Tauri Host Adapter 合同错误');
}
if (hostAdapter && compileScript(hostAdapter, 'editor/host-adapter.js')) pass('编辑器 Host Adapter 语法通过');
if (commandRegistry && compileScript(commandRegistry, 'editor/command-registry.js')) {
  const sandbox = {};
  new vm.Script(commandRegistry).runInNewContext(sandbox);
  const events = [], registry = sandbox.EditorCommandRegistry.create();
  registry.subscribe(event => events.push(event.phase));
  registry.register('test.sum', { title: 'Sum', execute: ({ payload }) => payload.a + payload.b });
  const value = await registry.execute('test.sum', { a: 2, b: 3 }, { source: 'verify' });
  if (value === 5 && registry.canExecute('test.sum') && events.includes('start') && events.includes('success')) pass('Command Registry 的注册、执行与生命周期事件通过');
  else fail('Command Registry 基础语义错误');
}
if (runtimeBridge && compileScript(runtimeBridge, 'editor/runtime-bridge.js')) pass('编辑器 Runtime Bridge 语法通过');
if (performanceMonitor && compileScript(performanceMonitor, 'editor/performance-monitor.js')) pass('编辑器性能监测器语法通过');
if (timelineModel && compileScript(timelineModel, 'editor/timeline-model.js')) {
  const sandbox = {};
  new vm.Script(timelineModel).runInNewContext(sandbox);
  const model = sandbox.EditorTimelineModel;
  const scene = { loop: 12, scenes: ['A', 'B', 'C'], sceneBorders: [2, 8] };
  const correct = model && model.sceneAt(scene, 1.5, true) === 0 && model.sceneAt(scene, 2, true) === 1
    && JSON.stringify(model.sceneRange(scene, 1)) === '[2,8]'
    && model.segmentIndexAt([{ f: [0, .5] }, { f: [.5, 1] }], .5) === 1;
  if (correct) pass('Timeline Model 的 Scene/时段边界语义通过');
  else fail('Timeline Model 的 Scene/时段边界语义错误');
}
if (sceneSerializer && compileScript(sceneSerializer, 'editor/scene-serializer.js')) {
  const sandbox = {};
  new vm.Script(sceneSerializer).runInNewContext(sandbox);
  const serializer = sandbox.EditorSceneSerializer;
  const sample = { srcId: 'asset-1', src: 'data:image/png;base64,AA==', _img: {}, font: { id: 'font_demo', source: 'data:font/woff;base64,AA==' } };
  const history = serializer && serializer.stringify(sample, { preserveLinkedDataUrls: false });
  const saved = serializer && serializer.stringify(sample, { preserveLinkedDataUrls: true });
  if (history && !history.includes('data:image') && !history.includes('_img') && saved.includes('data:image') && !saved.includes('data:font')) pass('Scene Serializer 的历史/自包含边界通过');
  else fail('Scene Serializer 未正确区分历史快照与自包含保存');
}
if (assetResolver && compileScript(assetResolver, 'editor/asset-resolver.js')) pass('编辑器 Asset Resolver 语法通过');
if (artifactBuilder && compileScript(artifactBuilder, 'editor/artifact-builder.js')) {
  const sandbox = {};
  new vm.Script(artifactBuilder).runInNewContext(sandbox);
  const builder = sandbox.EditorArtifactBuilder;
  const sceneArtifact = builder && builder.sceneFile({ name: 'demo.js', sourceText: 'A{}Z', start: 1, end: 3, serializedScene: '{"ok":true}' });
  const testArtifact = builder && builder.testHtml({ name: 'demo-test.html', script: 'window.x="</script>";', mode: 'home' });
  if (sceneArtifact && sceneArtifact.data === 'A{"ok":true}Z' && testArtifact && testArtifact.data.includes('id="home-scene"') && testArtifact.data.includes('<\\/script>')) pass('Artifact Builder 的场景替换与测试页封装通过');
  else fail('Artifact Builder 的纯构建语义错误');
}
if (sceneMutation && compileScript(sceneMutation, 'editor/scene-mutation.js')) {
  const sandbox = {};
  new vm.Script(sceneMutation).runInNewContext(sandbox);
  let value = 1;
  const commits = [];
  const mutation = sandbox.EditorSceneMutation.create({
    capture: () => String(value),
    commit: change => commits.push(change),
    restore: snapshot => { value = Number(snapshot); },
  });
  mutation.run('value.set', () => { value = 2; });
  mutation.run('value.noop', () => { value = 2; });
  const gesture = mutation.begin('value.drag'); value = 7; mutation.commit(gesture);
  const cancelled = mutation.begin('value.preview'); value = 11; mutation.rollback(cancelled);
  if (value === 7 && commits.length === 2 && commits[0].before === '1' && commits[0].after === '2' && commits[1].before === '2' && commits[1].after === '7') pass('Scene Mutation 的修改前快照、空操作过滤、手势提交与回滚通过');
  else fail('Scene Mutation 事务语义错误');
}
if (site && compileScript(site, siteRuntime)) pass('显式指定的消费端 Runtime 语法通过');

if (runtime && site) {
  const digest = (value) => createHash('sha256').update(value).digest('hex');
  if (digest(runtime) === digest(site)) pass('工具与显式指定的消费端 Runtime SHA256 一致');
  else fail('工具与显式指定的消费端 Runtime 不一致；请确认是否执行消费端版本升级');
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
  const localRuntimeTag = /<script\s+src=["']home-scene\.js["']/i;
  const legacyFallback = /fb\.src\s*=\s*["']\.\.\/public\/home-scene\.js["']/;
  if (localRuntimeTag.test(html) && legacyFallback.test(html)) pass('编辑器优先加载工具 Runtime，旧 public Runtime 仅作兜底');
  else fail('编辑器 Runtime 加载顺序错误；工具 Runtime 必须先于旧 public 兼容副本');
  const samplingKernelBoundary = /editor\/sampling-motion-kernel\.js/.test(html)
    && /const samplingKernelTool=window\.SamplingMotionKernel/.test(html)
    && !/function samplingFieldConfigTool\(/.test(html)
    && !/function applyGrainTideSamplingTool\(/.test(html);
  if (samplingKernelBoundary) pass('编辑器预览与 Runtime 共用 Sampling Motion Kernel');
  else fail('编辑器仍保留 Sampling Motion 像素算法副本');
  const capabilityHandshake = /editor\/runtime-bridge\.js/.test(html) && /reportRuntimeCompatibility/.test(html)
    && runtimeBridge && /compatibilityIssue/.test(runtimeBridge) && /samplingMotion:\s*2/.test(runtimeBridge)
    && runtime && /apiVersion\s*=\s*1/.test(runtime) && /samplingMotion:\s*2/.test(runtime);
  if (capabilityHandshake) pass('编辑器与 Runtime 能力握手存在');
  else fail('编辑器与 Runtime 缺少能力握手');
  const hostBoundary = /editor\/tauri-host-adapter\.js/.test(html) && /editor\/host-adapter\.js/.test(html) && /EditorHost\.openText/.test(html) && /EditorHost\.saveFile/.test(html) && /EditorHost\.pickAssets/.test(html)
    && tauriHostAdapter && /patcharium_resolve_asset/.test(tauriHostAdapter) && /patcharium_save_artifacts/.test(tauriHostAdapter)
    && hostAdapter && /__PATCHARIUM_HOST__/.test(hostAdapter) && /persistentAssets/.test(hostAdapter);
  if (hostBoundary) pass('Browser / Tauri Host Adapter 边界存在');
  else fail('编辑器仍缺少统一 Host Adapter 接线');
  const commandBoundary = /editor\/command-registry\.js/.test(html) && /EditorCommands\.register/.test(html) && /runEditorCommand\(commandId/.test(html)
    && /['"]selection\.clear['"]/.test(html) && /['"]selection\.delete['"]/.test(html) && /['"]history\.undo['"]/.test(html)
    && /runEditorCommand\(['"]selection\.delete['"]/.test(html) && /runEditorCommand\(['"]history\.undo['"]/.test(html)
    && commandRegistry && /function register\(id, definition\)/.test(commandRegistry) && /function execute\(id, payload, options\)/.test(commandRegistry);
  if (commandBoundary) pass('顶部工作流入口共用 Editor Commands');
  else fail('顶部工作流仍直接绑定分散控制器');
  const mutationBoundary = /editor\/scene-mutation\.js/.test(html) && /EditorSceneMutation\.create/.test(html)
    && /runSceneMutation\(['"]selection\.nudge['"]/.test(html)
    && /runSceneMutation\(\s*['"]selection\.delete['"]/.test(html)
    && /runSceneMutation\(['"]element\.set\./.test(html)
    && /sceneMutations\.begin\(['"]canvas\.drag['"]/.test(html)
    && /sceneMutations\.commit\(stageGesture\)/.test(html)
    && /sceneMutations\.begin\(['"]timeline\.boundary\.drag['"]/.test(html)
    && /sceneMutations\.begin\(['"]timeline\.scene-border\.drag['"]/.test(html)
    && /runSceneMutation\(['"]timeline\.segment\.split['"]/.test(html)
    && /runSceneMutation\(['"]timeline\.linear\.toggle['"]/.test(html)
    && /runSceneMutation\(['"]scene\.insert-boundary['"]/.test(html)
    && /runSceneMutation\(['"]scene\.insert-edge['"]/.test(html)
    && /function liveInspectorChange\(/.test(html)
    && /function inspectorTextureControl\(/.test(html)
    && /mutateInspector\(['"]mask\.type['"]/.test(html)
    && /sceneMutations\.begin\(['"]inspector\.global-fx\.live['"]/.test(html)
    && /runSceneMutation\(['"]structure\.reorder['"]/.test(html)
    && /runSceneMutation\(['"]structure\.visibility['"]/.test(html)
    && /runSceneMutation\(['"]structure\.rename\./.test(html)
    && /runSceneMutation\(['"]group\.create['"]/.test(html);
  if (mutationBoundary) pass('核心编辑、时间轴与 Inspector 首批参数共用 Scene Mutation');
  else fail('首批场景变更入口未统一经过 Scene Mutation');
  const inspectorControls = /function inspectorDisclosure\(/.test(html)
    && /function solidColorField\(/.test(html)
    && /function textureControlField\(/.test(html)
    && /EditorEffectRegistry\.globalFx\.forEach/.test(html)
    && /EditorEffectRegistry\.localFx\.forEach/.test(html)
    && /background\.reorder/.test(html)
    && /background\.layout/.test(html);
  if (inspectorControls) pass('背景、颜色与全局/局部 FX 共用 Inspector 控件和 Scene Mutation');
  else fail('Inspector 控件收束合同不完整');
  const directHistoryCalls = html.match(/\bpushHistory\s*\(/g) || [];
  const legacyControllersGone = directHistoryCalls.length === 2
    && !/function\s+(?:walkForm|imgForm|particleForm|renderLocalFxLayers|renderFxTrack)\s*\(/.test(html)
    && !/legacyInspectorPolicy|\bfxLayerOpen\b|\brightPane\b/.test(html)
    && /selectedOrphanFxId/.test(html)
    && /renderOrphanFxInspector/.test(html);
  if (legacyControllersGone) pass('旧卡片/FX Controller 已删除，业务历史写入只经过 Scene Mutation');
  else fail('仍存在旧卡片/FX Controller 或业务代码直接调用 pushHistory');
  if (/editor\/timeline-model\.js/.test(html) && /EditorTimelineModel\.sceneAt/.test(html) && /EditorTimelineModel\.segmentIndexAt/.test(html)) pass('元素与 FX 共用 Timeline Model');
  else fail('时间轴边界仍散落在页面控制器');
  if (/editor\/scene-serializer\.js/.test(html) && /EditorSceneSerializer\.stringify/.test(html) && /EditorSceneSerializer\.createReplacer/.test(html)) pass('历史与保存共用 Scene Serializer');
  else fail('Scene 序列化规则仍散落在页面控制器');
  const assetResolutionBoundary = /editor\/asset-resolver\.js/.test(html)
    && /EditorAssetResolver\.freezeScene/.test(html)
    && /relinkMissingTestAsset/.test(html)
    && /EditorAssetResolver\.resolveToDataUrl\(ref/.test(html)
    && /if\s*\(!e\.srcId\)\s*e\._asset\s*=\s*loaded\s*\?\s*im\s*:\s*null/.test(html);
  if (assetResolutionBoundary) pass('编辑预览与测试场景共用 Asset Resolver，宿主图片注入 Runtime 临时素材槽');
  else fail('编辑预览或测试场景未完整接入统一素材解析');
  const artifactBoundary = /editor\/artifact-builder\.js/.test(html) && /EditorArtifactBuilder\.sceneFile/.test(html) && /EditorArtifactBuilder\.testHtml/.test(html)
    && /EditorArtifactBuilder\.png/.test(html) && /EditorArtifactBuilder\.gif/.test(html) && /EditorHost\.saveBatch/.test(html)
    && hostAdapter && /async saveBatch\(options\)/.test(hostAdapter);
  if (artifactBoundary) pass('保存、测试页与帧格式共用 Artifact Builder / Host 交付边界');
  else fail('导出产物仍绕过 Artifact Builder 或 Host Adapter');
  const singleClock = /runtimePaintAt/.test(html) && !/HomeScene\.start\s*\(/.test(html) && /HomeScene\.seek\(state\.t\)/.test(html);
  if (singleClock) pass('编辑器播放使用单时钟并按预算驱动 Runtime');
  else fail('编辑器仍可能启动第二个 Runtime RAF 时钟');
  const previewBudget = /editor\/performance-monitor\.js/.test(html) && /id=["']preview-quality["']/.test(html) && /previewPerformance\.interval\(\)/.test(html)
    && /setPreviewOptions/.test(html) && performanceMonitor && /function estimate\(/.test(performanceMonitor)
    && runtime && /previewPixelDivMultiplier/.test(runtime) && /options\.previewPixelDivMultiplier/.test(runtime)
    && /getLastFrameStats/.test(runtime) && /cacheHits/.test(runtime) && /invalidateEntity/.test(runtime)
    && /_editorImageFxCache/.test(html);
  if (previewBudget) pass('Auto / Full / Draft 预览预算入口存在');
  else fail('编辑器缺少预览性能预算入口');
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
  const hasGuard = /EditorSceneSerializer\.stringify\(cfg,\s*\{\s*preserveLinkedDataUrls:\s*true/.test(html);
  const hasDataUrlGuard = sceneSerializer && /preserveLinkedDataUrls/.test(sceneSerializer) && /indexOf\(['"]data:['"]\)\s*===\s*0/.test(sceneSerializer);
  if (hasGuard && hasDataUrlGuard) pass('自包含图片导出保护存在');
  else fail('未检测到自包含图片导出保护；请检查场景保存/测试路径');

  // 通用场景本身只有 GENERIC_SCENE 数据：测试页必须补入 Runtime，并冻结开发期相对图片。
  const genericTestRuntime = /function\s+runtimeSourceForGenericTest\s*\(/.test(html)
    && /function\s+freezeLinkedTestAssets\s*\(/.test(html)
    && /EditorAssetResolver\.freezeScene/.test(html)
    && /extractObj\(fileText,\s*'GENERIC_SCENE'\)/.test(html)
    && /EditorArtifactBuilder\.runtimeScript\(serialized,\s*runtime\)/.test(html);
  if (genericTestRuntime) pass('通用场景测试页 Runtime 与相对素材内嵌路径存在');
  else fail('未检测到通用场景测试页的 Runtime / 相对素材内嵌路径');

  const inspectorBackgroundLayers = /renderBackgroundLayers\(cfg,\s*panel\)/.test(html);
  if (inspectorBackgroundLayers) pass('场景 Inspector 图片背景层入口存在');
  else fail('场景 Inspector 未挂载图片背景层');

  const samplingScopes = /appendSampleJitterInspector/.test(html)
    && /renderSamplingMotionInspector/.test(html) && /EditorEffectRegistry\.samplingMotion/.test(html)
    && /像素沸腾/.test(effectRegistry) && /网点游移/.test(effectRegistry) && /阈值呼吸/.test(effectRegistry)
    && /全局采样/.test(html) && /局部采样/.test(html) && /再像素化/.test(html);
  if (samplingScopes && runtime && /function\s+sampleJitterAt\s*\(/.test(runtime) && /threshold-pulse/.test(runtime) && /dither-drift/.test(runtime)) pass('四层采样作用域与 Sampling Motion 入口存在');
  else fail('采样作用域或 Sampling Motion Runtime / Inspector 入口缺失');
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
