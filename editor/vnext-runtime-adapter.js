/* Isolated Editor → ToSampool Runtime vNext handoff. Does not switch the current editor UI. */
(function (global) {
  'use strict';

  function runtime() { return global.ToSampoolRuntimeVNext || null; }
  function issue() {
    const bridge = global.EditorRuntimeBridge, candidate = runtime();
    if (bridge) return bridge.compatibilityIssue(candidate, bridge.vNextRequirements);
    if (!candidate) return 'ToSampoolRuntimeVNext 未加载';
    if (+candidate.apiVersion !== 1) return `Runtime apiVersion 不兼容（需要 1，收到 ${candidate.apiVersion}）`;
    const required = { fixedTimeRender: 1, deterministicFrames: 1, vnextBase: 1, sceneEffects: 1, imageAssets: 1, groupTransforms: 1, sharedSpriteParticles: 1 };
    for (const [name, level] of Object.entries(required)) if (!(candidate.capabilities && +candidate.capabilities[name] >= level)) return `Runtime 缺少能力 ${name}@${level}`;
    return null;
  }
  function create(document, runtimeAssets) {
    const problem = issue();
    if (problem) throw new Error(`无法创建 vNext 预览：${problem}`);
    if (!global.EditorVNextScene) throw new Error('无法创建 vNext 预览：EditorVNextScene 未加载');
    return runtime().createRuntime(global.EditorVNextScene.hydrate(document, runtimeAssets));
  }
  function renderTo(canvas, document, runtimeAssets, time, options) { return create(document, runtimeAssets).renderTo(canvas, time || 0,options); }
  async function createResolved(document, options) {
    if (!global.EditorVNextAssetLoader) throw new Error('无法创建 vNext 预览：EditorVNextAssetLoader 未加载');
    return create(document, await global.EditorVNextAssetLoader.resolve(document, options));
  }
  async function renderResolvedTo(canvas, document, options, time, preview) { return (await createResolved(document, options)).renderTo(canvas, time || 0,preview); }
  global.EditorVNextRuntimeAdapter = Object.freeze({ issue, create, renderTo, createResolved, renderResolvedTo });
})(typeof window !== 'undefined' ? window : globalThis);
