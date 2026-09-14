(function (global) {
  'use strict';

  const samplingMotion = Object.freeze([
    Object.freeze({
      key: 'pixelBoil', name: '像素沸腾',
      defaults: Object.freeze({ rate: 4, amount: 1, mode: 'step', seed: 1 }),
      controls: Object.freeze([
        Object.freeze({ key: 'rate', label: '频率 / 秒', type: 'number', min: .05, step: .25 }),
        Object.freeze({ key: 'amount', label: '偏置 / px', type: 'number', min: 0, step: .25, maxFrom: 'pixelDivMinusOne' }),
        Object.freeze({ key: 'mode', label: '变化方式', type: 'select', options: Object.freeze([['step', '逐格跳变'], ['drift', '平滑漂移']]) }),
        Object.freeze({ key: 'seed', label: '随机种子', type: 'number', min: 0, step: 1, integer: true }),
      ]),
    }),
    Object.freeze({
      key: 'thresholdPulse', name: '阈值呼吸',
      defaults: Object.freeze({ threshold: 128, amount: 28, period: 2, steps: 12, dark: '#182033', light: '#e8dbc3' }),
      controls: Object.freeze([
        Object.freeze({ key: 'threshold', label: '阈值中心', type: 'number', min: 0, max: 255, step: 1, integer: true }),
        Object.freeze({ key: 'amount', label: '呼吸幅度', type: 'number', min: 0, max: 127, step: 1 }),
        Object.freeze({ key: 'period', label: '循环 / 秒', type: 'number', min: .1, step: .1 }),
        Object.freeze({ key: 'steps', label: '时间步数', type: 'number', min: 2, max: 60, step: 1, integer: true }),
        Object.freeze({ key: 'dark', label: '暗色', type: 'color' }),
        Object.freeze({ key: 'light', label: '亮色', type: 'color' }),
      ]),
    }),
    Object.freeze({
      key: 'ditherDrift', name: '网点游移',
      defaults: Object.freeze({ cell: 6, period: 2, steps: 12, direction: 'horizontal', dark: '#182033', light: '#e8dbc3' }),
      controls: Object.freeze([
        Object.freeze({ key: 'cell', label: '网点大小', type: 'number', min: 2, max: 32, step: 1, integer: true }),
        Object.freeze({ key: 'direction', label: '游移方向', type: 'select', options: Object.freeze([['horizontal', '横向'], ['vertical', '纵向'], ['diagonal', '斜向']]) }),
        Object.freeze({ key: 'period', label: '循环 / 秒', type: 'number', min: .1, step: .1 }),
        Object.freeze({ key: 'steps', label: '时间步数', type: 'number', min: 2, max: 60, step: 1, integer: true }),
        Object.freeze({ key: 'dark', label: '暗色', type: 'color' }),
        Object.freeze({ key: 'light', label: '亮色', type: 'color' }),
      ]),
    }),
    Object.freeze({
      key: 'grainTide', name: '颗粒潮汐',
      defaults: Object.freeze({ amount: .65, coarseness: 5, targets: 'combined' }),
      controls: Object.freeze([
        Object.freeze({ key: 'amount', label: '强度', type: 'number', min: 0, max: 1, step: .05 }),
        Object.freeze({ key: 'coarseness', label: '最大颗粒', type: 'number', min: 2, max: 12, step: 1, integer: true }),
        Object.freeze({ key: 'targets', label: '调制对象', type: 'select', options: Object.freeze([['combined', '采样 + 阈值 + 网点'], ['sampling', '只改变采样粗细'], ['threshold', '采样 + 阈值'], ['dots', '采样 + 网点']]) }),
      ]),
    }),
  ]);

  const samplingField = Object.freeze({
    defaults: Object.freeze({ type: 'wave', scale: 48, speed: 1, angle: 0, period: 4, steps: 24, seed: 1, centerX: .5, centerY: .5 }),
    controls: Object.freeze([
      Object.freeze({ key: 'type', label: '场类型', type: 'select', options: Object.freeze([['uniform', '统一呼吸'], ['wave', '方向波场'], ['radial', '径向扩散']]) }),
      Object.freeze({ key: 'scale', label: '空间尺度 / px', type: 'number', min: 8, max: 512, step: 4 }),
      Object.freeze({ key: 'speed', label: '流动速度', type: 'number', min: -4, max: 4, step: .1 }),
      Object.freeze({ key: 'angle', label: '方向', type: 'number', min: -180, max: 180, step: 5, visibleFor: Object.freeze(['wave']) }),
      Object.freeze({ key: 'centerX', label: '中心 X / %', type: 'number', min: 0, max: 1, step: .05, visibleFor: Object.freeze(['radial']) }),
      Object.freeze({ key: 'centerY', label: '中心 Y / %', type: 'number', min: 0, max: 1, step: .05, visibleFor: Object.freeze(['radial']) }),
      Object.freeze({ key: 'period', label: '循环 / 秒', type: 'number', min: .1, step: .1 }),
      Object.freeze({ key: 'steps', label: '时间步数', type: 'number', min: 2, max: 60, step: 1, integer: true }),
      Object.freeze({ key: 'seed', label: '空间种子', type: 'number', min: 0, step: 1, integer: true }),
    ]),
  });

  const samplingEdge = Object.freeze({
    defaults: Object.freeze({ mode: 'alpha', width: 3, strength: 1 }),
    controls: Object.freeze([
      Object.freeze({ key: 'mode', label: '识别来源', type: 'select', options: Object.freeze([['alpha', '透明轮廓']]) }),
      Object.freeze({ key: 'width', label: '保护宽度 / px', type: 'number', min: 1, max: 8, step: 1, integer: true }),
      Object.freeze({ key: 'strength', label: '保护强度', type: 'number', min: 0, max: 1, step: .05 }),
    ]),
  });

  const samplingPresets = Object.freeze([
    Object.freeze({ key: 'stableContour', name: '轮廓稳定、内部翻涌' }),
  ]);

  const localFx = Object.freeze([
    Object.freeze({ key: 'fog', name: '像素雾', group: 'graphic', defaultStrength: .3 }),
    Object.freeze({ key: 'glow', name: '光晕', group: 'graphic', defaultStrength: .35 }),
    Object.freeze({ key: 'scan', name: '扫描线', group: 'simulation', defaultStrength: .35 }),
    Object.freeze({ key: 'crt', name: 'CRT', group: 'simulation', defaultStrength: .35 }),
    Object.freeze({ key: 'vignette', name: '暗角', group: 'simulation', defaultStrength: .35 }),
    Object.freeze({ key: 'glitch', name: '故障', group: 'dynamic', defaultStrength: .25 }),
    Object.freeze({ key: 'noise', name: '噪点', group: 'dynamic', defaultStrength: .15, legacyKey: 'grain' }),
    Object.freeze({ key: 'flicker', name: '闪烁', group: 'dynamic', defaultStrength: .2 }),
  ]);

  const globalFx = Object.freeze([
    Object.freeze({ key: 'crt', name: 'CRT', group: 'simulation' }),
    Object.freeze({ key: 'vignette', name: '暗角', group: 'simulation' }),
    Object.freeze({ key: 'glitch', name: '故障', group: 'dynamic' }),
    Object.freeze({ key: 'noise', name: '噪点', group: 'dynamic' }),
  ]);

  const byKey = Object.freeze(Object.fromEntries(samplingMotion.map(item => [item.key, item])));
  global.EditorEffectRegistry = Object.freeze({
    samplingMotion,
    samplingField,
    samplingEdge,
    samplingPresets,
    samplingMotionByKey: byKey,
    samplingMotionKeys: Object.freeze(samplingMotion.map(item => item.key)),
    localFx,
    localFxByKey: Object.freeze(Object.fromEntries(localFx.map(item => [item.key, item]))),
    globalFx,
    globalFxByKey: Object.freeze(Object.fromEntries(globalFx.map(item => [item.key, item]))),
  });
})(typeof window !== 'undefined' ? window : globalThis);
