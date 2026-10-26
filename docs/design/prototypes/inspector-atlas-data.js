/* Atlas scenarios follow the current Inspector's progressive branches. */
(function (global) {
  'use strict';
  const registry = global.EditorEffectRegistryVNext;
  const planner = global.EditorClassicV4EffectParameters;
  const toggleRows = { invert: '蒙版', follow: '蒙版', loop: '播放', frameLoop: '播放', repeat: '动态', fade: '生命周期', usePreset: '预设' };
  const f = (key, label, type, extra = {}) => ({ key, label, type, ...(type === 'number' && /周期时间|^周期$|持续时间|^寿命$/.test(label) ? { unit: 'S' } : {}), ...(type === 'toggle' ? { rowLabel: toggleRows[key.split('.').pop()] || '设置' } : {}), ...extra });
  const row = (...fields) => ({ layout: fields.length === 2 ? 'pair' : 'single', fields });
  const nested = (...rows) => rows.map(item => ({ ...item, nested: true }));
  const section = (title, rows, extra = {}) => ({ title, rows, ...extra });
  const maskTypes = (particle, required = false, defaultRect = false) => [{ value: 'none', label: defaultRect ? '默认（完整范围）' : required ? '未设置（必需）' : '无' }, { value: 'rect', label: '矩形' }, { value: 'ellipse', label: '椭圆' }, { value: 'poly', label: '多边形' }, ...particle ? [] : [{ value: 'alpha', label: 'Alpha 图片' }, { value: 'element', label: '元素 / 组' }]];
  const opts = entries => entries.map(([value, label]) => ({ value, label, kind: ['sky', 'sequence', 'ridge', 'flake', 'light'].includes(value) ? 'image' : ['dome', 'group'].includes(value) ? 'group' : 'element' }));
  const blend = opts([['normal', '正常'], ['screen', '滤色'], ['multiply', '正片叠底'], ['lighter', '加亮']]);
  const pattern = (key = 'pattern') => f(key, '图样设置', 'pattern');
  const maskRows = (key, state, particle = false, required = false) => {
    const mask = state[key], rows = [row(f(`${key}.type`, particle ? key === 'emissionMask' ? '发射范围' : '运动范围' : '蒙版类型', 'select', { options: maskTypes(particle, required, key === 'emissionMask') }))];
    if (mask.type === 'none') {
      if (particle && key === 'emissionMask') rows.push(...nested(row(f(`${key}.edit`, '画布范围', 'spatial', { action: '编辑' }))));
      return rows;
    }
    rows.push(row(f(`${key}.invert`, '反相', 'toggle')));
    if (!particle && key === 'objectMask') rows.push(row(f(`${key}.follow`, '跟随对象', 'toggle')));
    if (mask.type === 'alpha') rows.push(row(f(`${key}.asset`, 'Alpha 素材', 'reference', { options: opts([['ridge', '山脊蒙版'], ['sky', '天空 Alpha']]) })), row(f(`${key}.mode`, '映射方式', 'select', { options: opts([['alpha', '原 Alpha'], ['luma', '明度映射']]) })));
    if (mask.type === 'element') rows.push(row(f(`${key}.target`, '引用对象', 'reference', { options: opts([['trees', '前景松林'], ['house', '冬季 · 木屋']]) })));
    if (mask.type !== 'element') {
      rows.push(row(f(`${key}.edit`, '画布范围', 'spatial', { action: mask.edit === 'editing' ? '完成' : '编辑' })));
      if (mask.edit === 'editing') rows.push(row(f(`${key}.xy`, '位置', 'pair', { parts: ['X', 'Y'] })), row(f(`${key}.wh`, '范围', 'pair', { parts: ['W', 'H'], min: 1 })));
    }
    return rows.map((item, index) => index ? { ...item, nested: true } : item);
  };
  const base = [
    { id: 'scene-background', scope: 'scene', name: 'Scene · 画布与背景', stage: 'compose', tab: '成样', state: { size: [320, 180], loop: 36, color: '#172329', alpha: 1, textureOn: false, pattern: { type: 'lines-horizontal', color: '#80cec3', opacity: .7 } }, sections: s => [section('画布', [row(f('size', '画布尺寸', 'pair', { parts: ['W', 'H'] })), row(f('loop', '周期时间', 'number', { min: .01, step: .1 }))]), section('背景', [row(f('color', '颜色', 'color', { alphaKey: 'alpha' })), row(f('textureOn', '纹理填充', 'toggle', { rowLabel: '叠加', progressive: true })), ...s.textureOn ? nested(row(pattern())) : []], { timed: true })] },
    { id: 'scene-transition', scope: 'scene', name: 'Scene · 过渡', stage: 'compose', tab: '成样', state: { type: 'none', duration: .6, color: '#000000', direction: 'right', cell: 6, seed: 1 }, sections: s => [section('场景过渡', [row(f('type', '场景切换', 'select', { options: opts([['none', '无过渡'], ['blackout', '黑场转场'], ['fade', '淡入淡出'], ['wipe', '扫描擦除'], ['dissolve', '溶解']]) })), row(f('duration', '持续时间', 'number', { min: .01, step: .05 })), ...s.type === 'blackout' ? [row(f('color', '转场颜色', 'color'))] : [], ...s.type === 'wipe' ? [row(f('direction', '方向', 'select', { options: opts([['right', '向右'], ['left', '向左'], ['down', '向下'], ['up', '向上']]) }))] : [], ...s.type === 'dissolve' ? [row(f('cell', '溶解颗粒', 'number', { min: 1, max: 128 })), row(f('seed', '随机种子', 'number', { min: 0 }))] : []], { note: '当前编辑器：扫描方向仍为四向离散选项。连续角度属于 R01 待迁移项。' })] },
    { id: 'scene-mask', scope: 'scene', name: 'Scene · 范围蒙版', stage: 'decor', tab: '加样', state: { sceneMask: { type: 'none', invert: false, asset: 'ridge', mode: 'alpha', target: 'trees', visibility: 'keep', xy: [0, 0], wh: [160, 90] } }, sections: s => [section('范围蒙版', maskRows('sceneMask', s))] },
    { id: 'entity-basic', scope: 'element', name: '元素 · 基本', stage: 'compose', tab: '成样', state: { position: [273, 181], size: [190, 126], scale: [100, 100], skew: [0, 0], rot: 0, pivot: 'center', blend: 'normal', alpha: 1 }, sections: () => [section('变换', [row(f('position', '位置', 'pair', { parts: ['X', 'Y'] })), row(f('size', '尺寸', 'pair', { parts: ['W', 'H'], lock: true, min: 1 })), row(f('scale', '比例', 'pair', { parts: ['X', 'Y'], unit: '%' })), row(f('skew', '斜切', 'pair', { parts: ['水平', '垂直'], step: .1, min: -80, max: 80 })), row(f('rot', '旋转', 'angle'), f('pivot', '旋转中心', 'spatial')), row(f('blend', '混合方式', 'select', { options: blend }), f('alpha', '透明度', 'number', { min: 0, max: 100, unit: '%', scale: 100 }))], { timed: true })] },
    { id: 'group-basic', scope: 'group', name: '组 · 基本', stage: 'compose', tab: '成样', state: { position: [80, 64], scale: [100, 100], skew: [0, 0], rot: 0, pivot: 'center', blend: 'normal', alpha: 1 }, sections: () => [section('变换', [row(f('position', '位置', 'pair', { parts: ['X', 'Y'] })), row(f('scale', '比例', 'pair', { parts: ['X', 'Y'], unit: '%' })), row(f('skew', '斜切', 'pair', { parts: ['水平', '垂直'], step: .1, min: -80, max: 80 })), row(f('rot', '旋转', 'angle'), f('pivot', '旋转中心', 'spatial')), row(f('blend', '混合方式', 'select', { options: blend }), f('alpha', '透明度', 'number', { min: 0, max: 100, unit: '%', scale: 100 }))], { timed: true })] },
    { id: 'entity-mask', scope: 'element', name: '元素 · 蒙版', stage: 'compose', tab: '成样', state: { objectMask: { type: 'none', invert: false, follow: true, asset: 'ridge', mode: 'alpha', target: 'trees', visibility: 'keep', xy: [0, 0], wh: [160, 90] } }, sections: s => [section('蒙版', maskRows('objectMask', s))] },
    { id: 'entity-grade', scope: 'element', name: '元素 · 调色', stage: 'compose', tab: '成样', state: { hue: 0, brightness: 0, contrast: 0, saturation: 0 }, sections: () => [section('调色', [row(f('hue', '色相', 'range', { min: -180, max: 180 })), row(f('brightness', '亮度', 'range', { min: -100, max: 100 })), row(f('contrast', '对比度', 'range', { min: -100, max: 100 })), row(f('saturation', '饱和度', 'range', { min: -100, max: 100 }))], { timed: true })] },
    { id: 'primitive-appearance', scope: 'primitive', name: '图元 · 外观', stage: 'compose', tab: '成样', state: { stroke: true, strokeColor: '#d66b60', strokeAlpha: 1, strokeWidth: 2, fill: true, fillColor: '#e3ad4e', fillAlpha: 1, texture: false, pattern: { type: 'dots', color: '#81c9bd', opacity: .72 } }, sections: s => [section('外观', [row(f('stroke', '路径描线', 'toggle', { rowLabel: '描线', progressive: true })), ...s.stroke ? nested(row(f('strokeColor', '描线颜色', 'color', { alphaKey: 'strokeAlpha' })), row(f('strokeWidth', '描线宽度', 'number', { min: 0 }))) : [], row(f('fill', '纯色填充', 'toggle', { rowLabel: '填色', progressive: true })), ...s.fill ? nested(row(f('fillColor', '填色', 'color', { alphaKey: 'fillAlpha' }))) : [], row(f('texture', '纹理填充', 'toggle', { rowLabel: '图样', progressive: true })), ...s.texture ? nested(row(pattern())) : []])] },
    { id: 'text-primitive', scope: 'primitive', name: '图元 · 位图文字', stage: 'compose', tab: '成样', state: { content: '下一站，秋天。', fontSize: 16, spacing: 1, lineHeight: 1.25, font: 'system', color: '#e3ad4e' }, sections: () => [section('文字', [row(f('content', '内容', 'text')), row(f('fontSize', '字号', 'number', { min: 1 }), f('spacing', '字距', 'number')), row(f('lineHeight', '行高', 'number', { step: .05 })), row(f('font', '字体连接', 'reference', { options: opts([['system', '系统字体'], ['bitmap', '位图字体']]) })), row(f('color', '填色', 'color'))])] },
    { id: 'image-sequence', scope: 'image', name: '图片／多帧', stage: 'compose', tab: '成样', state: { asset: 'sky', frameCount: 1, playback: 'static', frame: 0, fps: 2, loop: true }, sections: s => [section('图片素材', [row(f('asset', '引用素材', 'reference', { options: opts([['sky', '冬季天空'], ['sequence', '窗光 · 2帧']]) })), ...s.asset === 'sequence' ? [row(f('playback', '播放方式', 'select', { options: opts([['static', '静态帧'], ['particle-age', '按寿命播放']]) })), ...s.playback === 'static' ? [row(f('frame', '帧序号', 'number', { min: 0, max: 1 }))] : [row(f('fps', '帧率', 'number', { min: .1, max: 60, step: .1 })), row(f('loop', '循环', 'toggle'))]] : []])] },
    { id: 'particle-source', scope: 'particle', name: '粒子 · 实体', stage: 'compose', tab: '成样', state: { preset: 'custom', usePreset: false, source: 'flake', frames: 2, playback: 'static', frame: 0, frameFps: 2, frameLoop: true }, sections: s => [section('预设', [row(f('preset', '预设', 'select', { options: opts([['custom', '当前自定义'], ['snow', '雪花']]) })), row(f('usePreset', '使用预设实体', 'toggle'))]), section('实体', [row(f('source', '粒子实体', 'reference', { options: opts([['flake', '雪花 · 2帧'], ['light', '光点']]) })), ...s.source === 'flake' ? [row(f('playback', '播放方式', 'select', { options: opts([['static', '静态帧'], ['particle-age', '按粒子寿命播放']]) })), ...s.playback === 'static' ? [row(f('frame', '帧序号', 'number', { min: 0, max: 1 }))] : [row(f('frameFps', '帧率', 'number', { min: .1, max: 60, step: .1 })), row(f('frameLoop', '循环', 'toggle'))]] : []])] },
    { id: 'particle-emission', scope: 'particle', name: '粒子 · 发射', stage: 'compose', tab: '成样', state: { count: 48, seed: 7, emissionMask: { type: 'none', invert: false, xy: [0, 0], wh: [160, 70] } }, sections: s => [section('发射', [row(f('count', '数量', 'number', { min: 0, max: 600 })), row(f('seed', '随机种子', 'number')), ...maskRows('emissionMask', s, true)])] },
    { id: 'particle-motion', scope: 'particle', name: '粒子 · 运动与外观', stage: 'compose', tab: '成样', state: { life: 3, speed: 18, direction: 90, spread: 25, gravity: .5, wind: 2, spin: 0, spinSpeed: 12, spinVar: 5, motionMask: { type: 'none', invert: false, xy: [0, 0], wh: [160, 70] }, size: 6, sizeVar: .3, alpha: .85, fade: true }, sections: s => [section('运动', [row(f('life', '寿命', 'number', { min: .001, step: .1 }), f('speed', '速度', 'number', { min: 0 })), row(f('direction', '方向', 'angle'), f('spread', '扩散角', 'angle')), row(f('gravity', '重力', 'number', { step: .1 }), f('wind', '风力', 'number')), row(f('spin', '初始旋转', 'angle'), f('spinSpeed', '旋转速度', 'number')), row(f('spinVar', '旋转差异', 'number', { min: 0 })), ...maskRows('motionMask', s, true)]), section('外观', [row(f('size', '粒子尺寸', 'number', { min: .01, step: .05 }), f('sizeVar', '尺寸差异', 'number', { min: 0, max: 100, unit: '%', scale: 100 })), row(f('alpha', '透明度', 'number', { min: 0, max: 100, unit: '%', scale: 100 })), row(f('fade', '随寿命淡出', 'toggle', { rowLabel: '生命周期' }))])] },
    { id: 'sampling-grid', scope: 'sample', name: '采样格 · 控制器', stage: 'sample', tab: '采样', state: { size: 1 }, sections: () => [section('采样格', [row(f('size', '采样尺寸', 'number', { min: 1, max: 128 }))])] },
    { id: 'scene-grade', scope: 'scene', name: 'Scene · 调色四轴', stage: 'decor', tab: '加样', state: { hue: 0, brightness: 0, contrast: 0, saturation: 0 }, sections: () => [section('调色四轴', [row(f('hue', '色相', 'range', { min: -180, max: 180 })), row(f('brightness', '亮度', 'range', { min: -100, max: 100 })), row(f('contrast', '对比度', 'range', { min: -100, max: 100 })), row(f('saturation', '饱和度', 'range', { min: -100, max: 100 }))], { timed: true })] },
    { id: 'entity-motion', scope: 'element', name: '元素 · 动态效果', stage: 'compose', tab: '成样', state: { selected: 'bob', bob: { enabled: false, amount: 8, period: 2, angle: 90, curve: 'smooth' }, scroll: { enabled: false, speed: 20, span: 320, angle: 0, repeat: true }, pulse: { enabled: false, amount: .1, period: 2, curve: 'smooth' }, spin: { enabled: false, speed: 30 }, wave: { enabled: false, amount: 12, period: 2 }, blink: { enabled: false, amount: .5, period: 1, curve: 'smooth' } }, sections: s => {
      const choices = opts([['bob', '漂浮'], ['scroll', '循环滚动'], ['pulse', '呼吸缩放'], ['spin', '持续旋转'], ['wave', '摆动'], ['blink', '闪烁']]);
      const name = choices.find(item => item.value === s.selected)?.label || '漂浮'; const value = s[s.selected];
      const curve = opts([['smooth', '平滑往返'], ['linear', '匀速往返'], ['ease-in', '先慢后快'], ['ease-out', '先快后慢'], ['ease-in-out', '缓入缓出'], ['step', '闪现/保持']]);
      const rows = [];
      if (value.enabled) {
        if (['bob', 'pulse', 'wave', 'blink'].includes(s.selected)) rows.push(row(f(`${s.selected}.amount`, '幅度', 'number', { min: 0 }), f(`${s.selected}.period`, '周期时间', 'number', { min: .05, step: .05 })));
        if (s.selected === 'scroll') rows.push(row(f('scroll.speed', '速度', 'number'), f('scroll.span', '循环距离', 'number', { min: 0 })), row(f('scroll.repeat', '重复', 'toggle')));
        if (s.selected === 'spin') rows.push(row(f('spin.speed', '角速度', 'number', { step: 5 })));
        if (['bob', 'scroll'].includes(s.selected)) rows.push(row(f(`${s.selected}.angle`, '方向', 'angle')));
        if (['bob', 'pulse', 'blink'].includes(s.selected)) rows.push(row(f(`${s.selected}.curve`, '运动方式', 'select', { options: curve })));
      }
      return [section(name, rows.map(item => ({ ...item, nested: true })), { timed: true, gallery: choices, selectedKey: 'selected', note: '六项动态共用对象轨，但各自有独立的选中、启用与时序参数入口。' })];
    } },
    { id: 'primitive-geometry', scope: 'primitive', name: '图元 · 几何分支', stage: 'compose', tab: '成样', state: { type: 'rect', xy: [0, 0], end: [80, 45], wh: [64, 48], scale: [100, 100], rot: 0, alpha: 1, strokePoints: 8 }, sections: s => [section('基本', [row(f('type', '图元类型', 'select', { options: opts([['rect', '矩形'], ['line', '线段'], ['stroke', '像素笔触']]) })), row(f('xy', '位置', 'pair', { parts: ['X', 'Y'] })), ...s.type === 'line' ? [row(f('end', '终点', 'pair', { parts: ['X', 'Y'] }))] : s.type === 'rect' ? [row(f('wh', '宽 / 高', 'pair', { parts: ['W', 'H'], min: 1, lock: true }))] : [], row(f('scale', '宽 / 高比例', 'pair', { parts: ['W', 'H'], unit: '%' })), row(f('rot', '旋转', 'angle'), f('alpha', '透明度', 'number', { min: 0, max: 100, unit: '%', scale: 100 }))], { note: s.type === 'stroke' ? `${s.strokePoints} 个路径点；画布选框承担整体移动、缩放与旋转。` : '' })] },
    { id: 'builtin-params', scope: 'element', name: 'Builtin · Manifest 参数', stage: 'compose', tab: '成样', state: { intensity: .7, color: '#ffe5a3', size: 1, enabled: true, mode: 'normal' }, sections: () => [section('内建组件 · 示例 Manifest', [row(f('intensity', '强度', 'range', { min: 0, max: 1, step: .01 })), row(f('color', '颜色', 'color')), row(f('size', '尺寸比例', 'number', { min: .1, step: .01 })), row(f('enabled', '启用', 'toggle')), row(f('mode', '模式', 'select', { options: blend }))], { note: '字段只取自模块 Manifest；此卡展示输入协议，不代表所有 Builtin 共用这五项参数。' })] }
  ];
  const optionNames = { normal: '正常', screen: '滤色', multiply: '正片叠底', lighter: '加亮', horizontal: '水平', vertical: '垂直', combined: '整体', rgb: 'RGB' };
  function paramField(param) {
    const options = (param.options || []).map(value => ({ value, label: param.optionLabels?.[value] || optionNames[value] || value }));
    const type = param.type === 'boolean' ? 'toggle' : param.type === 'select' ? 'select' : param.type === 'color' ? 'color' : /角度|方向/.test(param.label) || param.key === 'angle' ? 'angle' : param.type === 'number' && param.min != null && param.max != null && /强度|阈值|幅度|对比|密度/.test(param.label) ? 'range' : 'number';
    const percent = param.key === 'alpha' && param.min === 0 && param.max === 1;
    return f(param.key, param.label, type, { options, min: percent ? 0 : param.min, max: percent ? 100 : param.max, step: percent ? 1 : param.step, integer: !!param.integer, scale: percent ? 100 : null, unit: percent ? '%' : null });
  }
  const setDefault = (target, key, value) => { const parts = key.split('.'); let node = target; while (parts.length > 1) { const part = parts.shift(); node = node[part] || (node[part] = {}); } node[parts[0]] = value; };
  for (const effect of registry.effects.filter(item => item.card)) {
    const state = { enabled: true, motion: { enabled: false, expanded: false, type: effect.motion?.[0] || '' }, mask: { type: 'none', invert: false, asset: 'ridge', target: 'trees', mode: 'alpha', visibility: 'keep', xy: [0, 0], wh: [100, 70] } };
    for (const param of effect.params) setDefault(state, param.key, param.default);
    if (effect.id === 'texture-overlay') state.pattern = { type: state.texture, color: state.color, opacity: state.alpha, spacing: state.spacing, size: state.size, phaseX: state.phaseX, phaseY: state.phaseY, layout: state.layout, rowPhase: state.rowPhase, noiseDensity: state.noiseDensity, noiseSize: state.noiseSize, noiseSeed: state.noiseSeed };
    const stage = effect.family === 'sample' ? 'sample' : 'decor';
    base.push({ id: `effect-${effect.id}`, scope: effect.scopes.includes('scene') && !effect.scopes.includes('object') ? 'scene' : stage, name: effect.name, stage, tab: stage === 'sample' ? '采样' : '加样', registryId: effect.id, state, sections: s => {
      const rows = [];
      if (s.enabled) {
        const plan = effect.id === 'uneven-sampling' ? planner.unevenPlan(effect, s, 'object') : planner.plan(effect, effect, s);
        if (effect.id === 'texture-overlay') rows.push(row(pattern()), row(paramField(effect.params.find(param => param.key === 'blend'))));
        else {
          const params = plan.params.filter(param => param.key !== 'field.enabled');
          const consumed = new Set();
          for (const param of params) {
            if (consumed.has(param.key)) continue;
            const paired = { offsetX: 'offsetY', phaseX: 'phaseY', 'field.centerX': 'field.centerY', duotoneDark: 'duotoneLight' }[param.key];
            if (paired && params.some(item => item.key === paired)) { const other = params.find(item => item.key === paired); const line = row(paramField(param), paramField(other)); line.nested = !!(param.visibleWhen || param.visibleFor || other.visibleWhen || other.visibleFor); rows.push(line); consumed.add(paired); }
            else {
              const field = paramField(param);
              if (field.type === 'color' && effect.params.some(item => item.key === 'alpha')) field.alphaKey = 'alpha';
              const line = row(field); line.nested = !!(param.visibleWhen || param.visibleFor); rows.push(line);
            }
          }
        }
        if (effect.motion?.length) {
          const types = effect.id === 'texture-overlay' ? effect.motion.filter(id => s.pattern.type === 'noise' ? ['noise-snow', 'random-hold'].includes(id) : !['noise-snow', 'random-hold'].includes(id)) : effect.motion;
          rows.push(row(f('motion.enabled', effect.id === 'texture-overlay' ? '图案运动' : '动态', 'toggle', { rowLabel: '运动' })));
          if (s.motion.enabled) rows.push(row(f('motion.expanded', '展开参数', 'disclosure', { action: '参数', rowLabel: '动态参数' })));
          if (s.motion.expanded) {
            if (!types.includes(s.motion.type)) s.motion.type = types[0];
            rows.push(...nested(row(f('motion.type', '动态方式', 'select', { options: types.map(id => ({ value: id, label: registry.motionById[id].name })) }))));
            const motion = registry.motionById[s.motion.type];
            for (const param of motion.params) { if (s.motion[param.key] === undefined) s.motion[param.key] = param.default; const field = paramField(param); field.key = `motion.${param.key}`; rows.push(...nested(row(field))); }
          }
        }
        if (effect.mask !== 'object' && effect.scopes.includes('scene') && !effect.scopes.includes('object')) rows.push(...maskRows('mask', s, false, effect.mask === 'required'));
      }
      return [section(effect.name, rows, { timed: true, powerKey: 'enabled', note: effect.id === 'uneven-sampling' ? '不均采样内置采样场；对象级才显示边缘保护。' : '' })];
    } });
  }
  global.InspectorAtlasData = Object.freeze({ modules: base, maskRows, paramField });
})(window);
