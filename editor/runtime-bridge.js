(function (global) {
  'use strict';

  const requirements = Object.freeze({
    apiVersion: 1,
    capabilities: Object.freeze({
      fixedTimeRender: 1,
      deterministicFrames: 1,
      samplingMotion: 2,
    }),
  });

  function compatibilityIssue(runtime, expected) {
    expected = expected || requirements;
    if (!runtime) return 'Runtime 未加载';
    if ((+runtime.apiVersion || 0) < expected.apiVersion) return 'Runtime API 版本过旧';
    const caps = runtime.capabilities || {};
    const missing = Object.keys(expected.capabilities || {}).filter(key => (+caps[key] || 0) < expected.capabilities[key]);
    return missing.length ? 'Runtime 缺少能力：' + missing.join(', ') : '';
  }

  function report(runtime, target, expected) {
    const issue = compatibilityIssue(runtime, expected);
    if (!issue) return true;
    if (target) target.textContent = '⚠ ' + issue + '；编辑器不会假定未声明的渲染能力可用。';
    return false;
  }

  global.EditorRuntimeBridge = Object.freeze({ requirements, compatibilityIssue, report });
})(typeof window !== 'undefined' ? window : globalThis);
