/*
 * ToSampool 效果系统 vNext 声明。
 *
 * v4 Classic Shell 已使用本注册表驱动 Inspector、左侧效果容器、Agent manifest 与校验器。
 * 它只描述声明式 v4 Scene；Legacy 会话仍保留自己的 Runtime 与旧字段，不能反向把本表当成 Legacy 格式说明。
 */
(function (global) {
  'use strict';

  const param = (key, label, type, defaultValue, extra) => Object.assign({ key, label, type, default: defaultValue }, extra || {});
  const step = 'step';
  const linear = 'linear-safe';
  const blendOptions = Object.freeze(['normal', 'multiply', 'darken', 'screen', 'lighten', 'overlay', 'soft-light', 'difference', 'luminosity', 'saturation', 'hue', 'color']);
  const blendLabels = Object.freeze({ normal:'正常', multiply:'正片叠底', darken:'变暗', screen:'滤色', lighten:'变亮', overlay:'叠加', 'soft-light':'柔光', difference:'差值', luminosity:'明度', saturation:'饱和度', hue:'色相', color:'颜色' });
  const blendParam = defaultValue => param('blend', '叠加方式', 'select', defaultValue, { options: blendOptions, optionLabels: blendLabels, timing: step });
  const textureBlendParam = defaultValue => param('blend', '叠加方式', 'select', defaultValue, { options: Object.freeze([...blendOptions, 'hard-mix']), optionLabels: Object.freeze({ ...blendLabels, 'hard-mix': '实色混合' }), timing: step });

  // Motion is a progressive disclosure attached to an existing static
  // property/effect.  The registry owns labels and parameter bounds so the
  // Inspector, Agent manifest and Runtime never invent separate dialects.
  const motionParam = (key, label, defaultValue, extra) => Object.assign({ key, label, type:'number', default:defaultValue, timing:step }, extra || {});
  const rhythmParams = stepped => [
    motionParam('curve','运动节奏','smooth',{type:'select',options:Object.freeze(['linear','smooth','ease-in','ease-out']),optionLabels:Object.freeze({linear:'均匀',smooth:'柔和','ease-in':'加速','ease-out':'减速'})}),
    motionParam('stepped','逐帧',stepped,{type:'boolean'}),
    motionParam('steps','周期帧数',12,{min:1,max:120,integer:true,when:'stepped'})
  ];
  const motions = Object.freeze([
    Object.freeze({ id:'fade', primitive:'oscillate', name:'淡入淡出', params:Object.freeze([motionParam('amount','幅度',.5,{min:0,max:1,step:.05}),motionParam('period','周期时间',2,{min:.05,step:.05}),...rhythmParams(false)]) }),
    Object.freeze({ id:'blink', primitive:'oscillate', name:'闪烁', params:Object.freeze([motionParam('amount','幅度',.7,{min:0,max:1,step:.05}),motionParam('period','周期时间',1,{min:.05,step:.05}),motionParam('steps','周期帧数',2,{min:2,max:60,integer:true})]) }),
    Object.freeze({ id:'texture-drift', name:'纹理运动', params:Object.freeze([motionParam('speedX','横向速度',8,{step:1}),motionParam('speedY','纵向速度',0,{step:1})]) }),
    Object.freeze({ id:'random-hold', name:'随机保持', params:Object.freeze([motionParam('period','周期时间',1,{min:.05,step:.05}),motionParam('steps','周期帧数',12,{min:1,max:120,integer:true})]) }),
    Object.freeze({ id:'sampling-step', name:'采样跳变', params:Object.freeze([motionParam('frequency','跳变频率',4,{min:.05,max:60,step:.05})]) }),
    Object.freeze({ id:'sampling-drift', name:'采样漂移', params:Object.freeze([motionParam('frequency','漂移频率',4,{min:.05,max:60,step:.05})]) }),
    Object.freeze({ id:'uneven-motion', name:'采样运动', params:Object.freeze([motionParam('period','周期时间',3,{min:.05,step:.05}), motionParam('flowSpeed','流动速度',1,{min:-4,max:4,step:.1}), motionParam('steps','周期帧数',24,{min:1,max:120,integer:true}), motionParam('tideAmount','起伏幅度',.35,{min:0,max:1,step:.05})]) }),
    Object.freeze({ id:'pattern-drift', name:'图样漂移', params:Object.freeze([motionParam('period','周期时间',2,{min:.05,step:.05}),motionParam('steps','周期帧数',16,{min:1,max:120,integer:true}),motionParam('cyclesX','横向循环格数',1,{min:-32,max:32,integer:true}),motionParam('cyclesY','纵向循环格数',0,{min:-32,max:32,integer:true})]) }),
    Object.freeze({ id:'pattern-step', name:'像素跳格', params:Object.freeze([motionParam('period','周期时间',2,{min:.05,step:.05}),motionParam('steps','周期帧数',8,{min:1,max:120,integer:true}),motionParam('stepX','横向跳距（像素）',1,{min:-128,max:128,integer:true}),motionParam('stepY','纵向跳距（像素）',0,{min:-128,max:128,integer:true})]) }),
    Object.freeze({ id:'pattern-random', name:'随机印刷', params:Object.freeze([motionParam('period','周期时间',2,{min:.05,step:.05}),motionParam('steps','周期帧数',8,{min:1,max:120,integer:true}),motionParam('rangeX','横向范围（格）',1,{min:0,max:32,step:1}),motionParam('rangeY','纵向范围（格）',1,{min:0,max:32,step:1}),motionParam('seed','随机种子',1,{min:0,integer:true})]) }),
    Object.freeze({ id:'pattern-pulse', name:'图样呼吸', params:Object.freeze([motionParam('period','周期时间',2,{min:.05,step:.05}),motionParam('steps','周期帧数',6,{min:2,max:60,integer:true}),motionParam('amount','大小幅度',.35,{min:0,max:1,step:.05})]) }),
    Object.freeze({ id:'threshold-pulse', primitive:'oscillate', name:'阈值呼吸', params:Object.freeze([motionParam('amount','幅度',.08,{min:0,max:.5,step:.01}),motionParam('period','周期时间',2,{min:.05,step:.05}),...rhythmParams(true)]) }),
    Object.freeze({ id:'noise-snow', name:'噪点雪花', params:Object.freeze([motionParam('period','周期时间',1,{min:.05,step:.05}),motionParam('steps','周期帧数',12,{min:1,max:120,integer:true})]) }),
    Object.freeze({ id:'grain-refresh', primitive:'refresh', name:'颗粒刷新', params:Object.freeze([motionParam('period','周期时间',1,{min:.05,step:.05}),motionParam('steps','周期帧数',8,{min:1,max:120,integer:true})]) }),
    Object.freeze({ id:'noise-refresh', name:'杂色刷新', params:Object.freeze([motionParam('period','周期时间',1,{min:.05,step:.05}),motionParam('steps','周期帧数',12,{min:1,max:120,integer:true})]) }),
    Object.freeze({ id:'crt-motion', name:'屏幕运动', params:Object.freeze([motionParam('period','周期时间',2,{min:.05,step:.05}),motionParam('steps','周期帧数',12,{min:1,max:120,integer:true}),motionParam('scanlineDrift','扫描线漂移',1,{min:0,max:4,step:.05})]) }),
    Object.freeze({ id:'drift', name:'偏移漂移', params:Object.freeze([motionParam('period','周期时间',2,{min:.05,step:.05}),motionParam('steps','周期帧数',24,{min:1,max:120,integer:true})]) }),
    Object.freeze({ id:'dot-drift', primitive:'oscillate', name:'网点震荡', params:Object.freeze([motionParam('amount','震荡幅度',.35,{min:0,max:1,step:.05}),motionParam('period','周期时间',2,{min:.05,step:.05}),...rhythmParams(true)]) }),
    Object.freeze({ id:'dot-move', name:'网点移动', params:Object.freeze([motionParam('speed','速度',.35,{min:-8,max:8,step:.05}),motionParam('angle','方向',0,{min:-180,max:180,step:5})]) }),
  ]);
  const motionById = Object.freeze(Object.fromEntries(motions.map(item => [item.id, item])));

  const pipelines = Object.freeze({
    object: Object.freeze({
      compose: 'compose',
      defaultOrder: Object.freeze(['mask', 'decorate', 'sample']),
      movableStages: Object.freeze(['mask', 'decorate', 'sample']),
      stages: Object.freeze({
        compose: '成样',
        mask: '蒙版',
        decorate: '加样',
        sample: '采样',
      }),
      summary: '成样固定在首位；蒙版、加样、采样可整体调序，组内效果顺序固定。',
    }),
    scene: Object.freeze({
      order: Object.freeze(['overlay', 'sample']),
      stages: Object.freeze({ overlay: '场景叠加滤镜', sample: '场景采样滤镜' }),
      summary: '所有对象合成后依次进行场景叠加与场景采样；颗粒叠加属于叠加滤镜，不另设输出阶段。',
    }),
  });

  const controllers = Object.freeze([
    Object.freeze({
      id: 'sampling-grid', name: '采样格', family: 'sample-controller', scopes: Object.freeze(['object', 'scene']), card: false,
      purpose: '当前对象或场景的独立最近邻再采样；同时为偏移、网点与不均采样提供共同的低分辨率工作面。',
      timing: step, particleBake: 'shared-frame', cost: 'A',
      params: Object.freeze([
        param('size', '采样尺寸', 'number', 1, { min: 1, max: 128, integer: true }),
        param('alphaMode', '边缘透明度', 'select', 'keep', { options: Object.freeze(['keep', 'remove', 'boost']), optionLabels: Object.freeze({ keep: '保留', remove: '二值化', boost: '填满' }), timing: step }),
      ]),
    }),
  ]);

  const effects = Object.freeze([
    Object.freeze({
      id: 'projection', name: '投影', aliases: Object.freeze(['硬阴影', '长投影']), family: 'decorate', stage: 'decorate-back', scopes: Object.freeze(['object']), card: true,
      purpose: '从对象最终 Alpha 生成硬边投影，保持对象 z 内的前后关系。', avoidWhen: Object.freeze(['需要羽化模糊阴影']),
      timing: linear, motion: null, particleBake: 'shared-frame', mask: 'object', cost: 'B',
      params: Object.freeze([param('color', '颜色', 'color', '#000000', { timing: linear }), param('alpha', '透明度', 'number', .5, { min: 0, max: 1, step: .05, timing: linear }), param('distance', '距离', 'number', 3, { min: 0, max: 96, step: 1, timing: linear }), param('angle', '角度', 'number', 45, { min: -180, max: 180, step: 5, timing: linear }), blendParam('normal')]),
    }),
    Object.freeze({
      id: 'outline', name: '描边', aliases: Object.freeze(['外描边', '硬边']), family: 'decorate', stage: 'decorate-edge', scopes: Object.freeze(['object']), card: true,
      purpose: '从对象最终 Alpha 向外扩张得到硬边轮廓；不等同于矢量路径描线。', avoidWhen: Object.freeze(['只需要单个图元路径描线']),
      timing: linear, motion: null, particleBake: 'shared-frame', mask: 'object', cost: 'B',
      params: Object.freeze([param('color', '颜色', 'color', '#000000', { timing: linear }), param('alpha', '透明度', 'number', 1, { min: 0, max: 1, step: .05, timing: linear }), param('width', '宽度', 'number', 1, { min: 1, max: 16, step: 1, timing: linear }), blendParam('normal'), param('includeProjection', '包含投影', 'boolean', false, { timing: step })]),
    }),
    Object.freeze({
      id: 'tint-overlay', name: '染色叠加', aliases: Object.freeze(['色膜', '颜色叠加', '染色']), family: 'decorate', stage: 'decorate-inside', scopes: Object.freeze(['object', 'scene']), card: true,
      purpose: '用统一颜色和混合方式覆盖已有像素；适合淡入、灯光染色和低成本场景气氛变化。', avoidWhen: Object.freeze(['需要精确的四轴调色']),
      timing: Object.freeze({ color: linear, alpha: linear, blend: step }), motion: Object.freeze(['fade', 'blink']), particleBake: 'shared-frame', mask: 'optional', cost: Object.freeze({ object: 'A', scene: 'B' }),
      params: Object.freeze([param('color', '颜色', 'color', '#ffffff', { timing: linear }), param('alpha', '透明度', 'number', 0, { min: 0, max: 1, step: .05, timing: linear }), blendParam('screen')]),
    }),
    Object.freeze({
      id: 'texture-overlay', name: '纹理叠加', aliases: Object.freeze(['扫描线', 'CRT 纹理', '纸纹', '网格']), family: 'decorate', stage: 'decorate-inside', scopes: Object.freeze(['object', 'scene']), card: true,
      purpose: '将几何图案或自定义 tile 裁入对象或场景范围；实色混合可把底色与纹理逐通道压成黑/白，适合 Bayer 风格试验。', avoidWhen: Object.freeze(['需要随机颗粒；改用颗粒叠加']),
      timing: Object.freeze({ color: linear, alpha: linear, texture: step, blend: step, motion: step }), motion: Object.freeze(['pattern-drift', 'pattern-step', 'pattern-random', 'pattern-pulse', 'noise-snow', 'random-hold']), particleBake: 'shared-frame', mask: 'optional', cost: Object.freeze({ object: 'B', scene: 'B' }), variantCosts: Object.freeze({ 'hard-mix': Object.freeze({ object: 'C', scene: 'D' }) }),
      params: Object.freeze([
        param('texture', '图案', 'select', 'lines-horizontal', { options: Object.freeze(['lines-horizontal', 'grid', 'lines-layers', 'dots', 'custom']), optionLabels: Object.freeze({'lines-horizontal':'单线',grid:'网格','lines-layers':'叠线',dots:'点阵',custom:'自定义纹理'}), timing: step }),
        param('color', '颜色', 'color', '#ffffff', { timing: linear }),
        param('alpha', '透明度', 'number', .2, { min: 0, max: 1, step: .05, timing: linear }),
        param('spacing', '格距', 'number', 4, { min: 1, max: 256, step: 1, timing: step, visibleFor: Object.freeze(['lines-horizontal','grid','lines-layers','dots']) }),
        param('size', '图样大小 / 线宽', 'number', 1, { min: 1, max: 256, step: 1, timing: step, visibleFor: Object.freeze(['lines-horizontal','grid','lines-layers','dots']) }),
        param('shape', '点形', 'select', 'circle', { options: Object.freeze(['circle', 'triangle', 'square', 'pentagon', 'hexagon']), optionLabels: Object.freeze({circle:'圆点',triangle:'三角',square:'矩形',pentagon:'五边形',hexagon:'六边形'}), timing: step, visibleFor: 'dots' }),
        param('layout', '排列', 'select', 'regular', { options: Object.freeze(['regular', 'stagger']), optionLabels: Object.freeze({regular:'整齐',stagger:'错列'}), timing: step, visibleFor: 'dots' }),
        param('rowPhase', '错列偏移', 'number', .5, { min: 0, max: 1, step: .05, timing: step, visibleWhen: Object.freeze({texture:'dots',layout:'stagger'}) }),
        param('phaseX', '起始偏移 X', 'number', 0, { min: 0, max: 1, step: .05, timing: step, visibleFor: Object.freeze(['lines-horizontal','grid','lines-layers','dots']) }),
        param('phaseY', '起始偏移 Y', 'number', 0, { min: 0, max: 1, step: .05, timing: step, visibleFor: Object.freeze(['lines-horizontal','grid','lines-layers','dots']) }),
        param('angle', '整体旋转', 'number', 0, { min: -180, max: 180, step: 5, timing: linear, visibleFor: Object.freeze(['lines-horizontal','grid','lines-layers','dots']) }),
        param('layer2Angle', '线 2 角度', 'number', 90, { min: -180, max: 180, step: 5, timing: step, visibleFor: 'lines-layers' }),
        param('layer2Width', '线 2 线宽', 'number', 1, { min: 1, max: 256, step: 1, timing: step, visibleFor: 'lines-layers' }),
        param('layer2Spacing', '线 2 格距', 'number', 4, { min: 1, max: 256, step: 1, timing: step, visibleFor: 'lines-layers' }),
        param('layer3Angle', '线 3 角度', 'number', 135, { min: -180, max: 180, step: 5, timing: step, visibleFor: 'lines-layers' }),
        param('layer3Width', '线 3 线宽', 'number', 1, { min: 1, max: 256, step: 1, timing: step, visibleFor: 'lines-layers' }),
        param('layer3Spacing', '线 3 格距', 'number', 4, { min: 1, max: 256, step: 1, timing: step, visibleFor: 'lines-layers' }),
        param('noiseDensity', '噪点强度', 'number', .18, { min: 0, max: 1, step: .01, timing: step, visibleFor: 'noise' }),
        param('noiseSize', '颗粒大小', 'number', 1, { min: 1, max: 16, integer:true, timing: step, visibleFor: 'noise' }),
        param('noiseSeed', '颗粒种子', 'number', 1, { min: 0, integer:true, timing: step, visibleFor: 'noise' }),
        param('tileWidth', '图样宽度', 'number', 4, { min: 1, max: 64, integer:true, timing: step, visibleFor: 'custom' }),
        param('tileHeight', '图样高度', 'number', 4, { min: 1, max: 64, integer:true, timing: step, visibleFor: 'custom' }),
        param('tileScale', '单格大小', 'number', 1, { min: 1, max: 16, integer:true, timing: step, visibleFor: 'custom' }),
        param('tileScaleMode', '单格单位', 'select', 'pixel', { options: Object.freeze(['pixel','sampling']), optionLabels: Object.freeze({pixel:'画布像素',sampling:'跟随采样尺寸'}), timing: step, visibleFor: 'custom' }),
        param('tilePixels', '图样像素', 'tile-pixels', Object.freeze(Array(16).fill('#00000000')), { timing: step, visibleFor: 'custom' }),
        textureBlendParam('screen')
      ]),
    }),
    Object.freeze({
      id: 'inner-light', name: '内光效', aliases: Object.freeze(['内发光', '内阴影']), family: 'decorate', stage: 'decorate-inside', scopes: Object.freeze(['object']), card: true,
      purpose: '沿对象 Alpha 内缘向内发光或压暗。', avoidWhen: Object.freeze(['没有可见 Alpha 轮廓']),
      timing: linear, motion: null, particleBake: 'shared-frame', mask: 'object', cost: 'B',
      params: Object.freeze([param('color', '颜色', 'color', '#ffffff', { timing: linear }), param('alpha', '透明度', 'number', .4, { min: 0, max: 1, step: .05, timing: linear }), param('size', '光效范围', 'number', 3, { min: 1, max: 64, step: 1, timing: linear }), param('layers', '退晕层数', 'number', 2, { min: 1, max: 6, integer:true, timing: step }), blendParam('screen')]),
    }),
    Object.freeze({
      id: 'outer-light', name: '外光效', aliases: Object.freeze(['外发光', '光晕']), family: 'decorate', stage: 'decorate-back', scopes: Object.freeze(['object']), card: true,
      purpose: '从对象 Alpha 向外扩张的硬边光效，替代旧“光晕”独立效果。', avoidWhen: Object.freeze(['需要真实高斯模糊']),
      timing: linear, motion: null, particleBake: 'shared-frame', mask: 'object', cost: 'B',
      params: Object.freeze([param('color', '颜色', 'color', '#ffffff', { timing: linear }), param('alpha', '透明度', 'number', .35, { min: 0, max: 1, step: .05, timing: linear }), param('size', '光效范围', 'number', 3, { min: 1, max: 64, step: 1, timing: linear }), param('layers', '退晕层数', 'number', 2, { min: 1, max: 6, integer:true, timing: step }), blendParam('screen')]),
    }),
    Object.freeze({
      id: 'grain-overlay', name: '颗粒叠加', aliases: Object.freeze(['胶片颗粒', '电视雪花', '屏幕雪花']), family: 'decorate', stage: 'decorate-inside', scopes: Object.freeze(['object', 'scene']), card: true,
      purpose: '完整覆盖作用范围的确定性颗粒场；低强度呈细颗粒，高强度呈雪花屏。刷新帧经缓存复用。', avoidWhen: Object.freeze(['要改变原图像素值；改用采样中的杂色抖动']),
      timing: Object.freeze({ amount: linear, size: step, colorMode: step, seed: step, blend: step, motion: step }), motion: Object.freeze(['grain-refresh']), particleBake: 'shared-frame', mask: 'optional', cost: Object.freeze({ object: 'B', scene: 'B' }),
      params: Object.freeze([
        param('amount', '强度', 'number', .15, { min: 0, max: 1, step: .01, timing: linear }),
        param('colorMode', '类型', 'select', 'mono', { options: Object.freeze(['mono', 'rgb']), optionLabels: Object.freeze({ mono: '单色', rgb: '彩色' }), timing: step }),
        param('size', '颗粒尺寸', 'number', 1, { min: 1, max: 16, integer: true, timing: step }),
        param('seed', '随机种子', 'number', 1, { min: 0, integer: true, timing: step }),
        blendParam('normal')
      ]),
    }),
    Object.freeze({
      id: 'color-grade', name: '调色四轴', aliases: Object.freeze(['色相', '亮度', '对比度', '饱和度']), family: 'formation', stage: 'formation-color', scopes: Object.freeze(['object', 'scene']), card: false,
      purpose: '对象在成样阶段、场景在叠加阶段进行基础调色。统一以 Step 处理，避免高分辨率连续像素重算。', avoidWhen: Object.freeze(['需要平滑灯光淡入；优先用染色叠加']),
      timing: step, motion: null, particleBake: 'shared-frame', mask: 'optional', cost: Object.freeze({ object: 'B', scene: 'C' }),
      params: Object.freeze([param('hue', '色相', 'number', 0, { min: -180, max: 180, step: 5 }), param('brightness', '亮度', 'number', 0, { min: -100, max: 100, step: 1 }), param('contrast', '对比度', 'number', 0, { min: -100, max: 100, step: 1 }), param('saturation', '饱和度', 'number', 0, { min: -100, max: 100, step: 1 })]),
    }),
    Object.freeze({
      id: 'color-map', name: '颜色映射', aliases: Object.freeze(['减色', '色板', '取色数']), family: 'sample', stage: 'sample-color', scopes: Object.freeze(['object', 'scene']), card: true,
      purpose: '离散色板以自动提取或命名色板减色；渐变映射按像素亮度查找色标，保留明暗层次。', avoidWhen: Object.freeze(['需要原样保留摄影色彩']),
      timing: step, motion: Object.freeze([]), particleBake: 'shared-frame', mask: 'optional', cost: Object.freeze({ object: 'B', scene: 'C' }),
      params: Object.freeze([
        param('mode','映射方式','select','discrete',{options:Object.freeze(['gradient','discrete']),optionLabels:Object.freeze({gradient:'渐变映射',discrete:'离散色板'}),control:'segmented'}),
        param('palette', '调色板', 'select', 'auto', { options: Object.freeze(['auto', 'pico8', 'gb', 'nes', 'vga']), optionLabels: Object.freeze({ auto: '自动提取', pico8: 'PICO-8', gb: 'Game Boy', nes: 'NES', vga: 'VGA' }), overrides: 'colors',visibleWhen:Object.freeze({mode:'discrete'}) }),
        param('colors', '最大颜色数', 'number', 16, { min: 2, max: 64, integer: true,options:Object.freeze([2,4,8,16,32,64]),visibleWhen: Object.freeze({ mode:'discrete',palette: 'auto' }) }),
        param('gradient','渐变色标','gradient',Object.freeze({type:'linear',stops:Object.freeze([Object.freeze({offset:0,color:'#000000',alpha:1}),Object.freeze({offset:1,color:'#ffffff',alpha:1})])}),{visibleWhen:Object.freeze({mode:'gradient'})}),
        param('extracted','提取色板数据','extracted-palette',null,{internal:true})
      ]),
    }),
    Object.freeze({
      id: 'noise-dither', name: '杂色抖动', aliases: Object.freeze(['添加杂色', '像素值扰动', '彩色杂色']), family: 'sample', stage: 'sample-color', scopes: Object.freeze(['object', 'scene']), card: true,
      purpose: '对已有像素的 RGB 值作有界随机扰动，不改变 Alpha；与阈值分色组合可形成随机抖动。', avoidWhen: Object.freeze(['只想覆盖独立颗粒而保留原像素值；改用颗粒叠加']),
      timing: step, motion: Object.freeze(['noise-refresh']), particleBake: 'shared-frame', mask: 'optional', cost: Object.freeze({ object: 'B', scene: 'C' }),
      params: Object.freeze([
        param('amount', '强度', 'number', 12, { min: 0, max: 100, step: 1, timing: step }),
        param('colorMode', '类型', 'select', 'mono', { options: Object.freeze(['mono', 'rgb']), optionLabels: Object.freeze({ mono: '单色', rgb: '彩色' }), timing: step }),
        param('size', '颗粒尺寸', 'number', 1, { min: 1, max: 16, integer: true, timing: step }),
        param('seed', '随机种子', 'number', 1, { min: 0, integer: true, timing: step })
      ]),
    }),
    Object.freeze({
      id: 'threshold', name: '阈值分色', aliases: Object.freeze(['双色阈值', '阈值呼吸']), family: 'sample', stage: 'sample-color', scopes: Object.freeze(['object', 'scene']), card: true,
      purpose: '将明暗压成两种颜色；动态模式可让阈值在确定周期内呼吸。', avoidWhen: Object.freeze(['必须保留细腻照片层次']),
      timing: step, motion: Object.freeze(['threshold-pulse']), particleBake: 'shared-frame', mask: 'optional', cost: Object.freeze({ object: 'B', scene: 'C' }),
      params: Object.freeze([param('threshold', '阈值', 'number', .5, { min: 0, max: 1, step: .01 }), param('dark', '暗色', 'color', '#182033'), param('light', '亮色', 'color', '#e8dbc3')]),
    }),
    Object.freeze({
      id: 'edge-dispersion', name: '边缘色散', aliases: Object.freeze(['RGB 色散', '色差', '色边', '彩边']), family: 'sample', stage: 'sample-output', scopes: Object.freeze(['object', 'scene']), card: true,
      purpose: '只在轮廓或颜色边缘分离红、绿、蓝通道，形成旧屏幕与印刷错位感；不会复制整条故障条带。', avoidWhen: Object.freeze(['需要严格保持边缘颜色与像素范围']),
      timing: step, motion: null, particleBake: 'shared-frame', mask: 'optional', cost: Object.freeze({ object: 'B', scene: 'C' }),
      params: Object.freeze([
        param('distance', '色散距离', 'number', 2, { min: 0, max: 32, integer:true }),
        param('angle', '方向', 'number', 0, { min: -180, max: 180, step: 5 }),
        param('strength', '强度', 'number', 1, { min: 0, max: 1, step: .05 }),
        param('source', '作用边缘', 'select', 'auto', { options:Object.freeze(['auto','contour','contrast']), optionLabels:Object.freeze({auto:'自动',contour:'仅轮廓',contrast:'仅颜色边缘'}) }),
        param('width', '边缘宽度', 'number', 1, { min: 1, max: 6, integer:true }),
        param('order', '色序', 'select', 'rgb', { options:Object.freeze(['rgb','bgr']), optionLabels:Object.freeze({rgb:'红 → 蓝',bgr:'蓝 → 红'}) }),
      ]),
    }),
    Object.freeze({
      id: 'ascii-mapping', name: 'ASCII 映射', aliases: Object.freeze(['字符画', '终端字符', '文字采样']), family: 'sample', stage: 'sample-output', scopes: Object.freeze(['object','scene']), card: true,
      purpose: '按单元亮度选择自动疏密排序的字符；可按边缘方向选择线条字符。字符单元保留小数尺寸，位于 CRT 之前。', avoidWhen: Object.freeze(['需要保留小于字符单元的细节']),
      timing: step, motion: null, particleBake: 'shared-frame', mask: 'optional', cost: Object.freeze({ object:'C',scene:'C' }),
      params: Object.freeze([
        param('size','相对尺寸','number',8,{min:1,step:1,integer:true}),
        param('glyphRatio','字形比例','number',1,{min:.1,max:8,step:.05}),
        param('stretch','拉伸字符','boolean',false),
        param('characters','字符集','text',' .:-=+*#%@'),
        param('font','字体','font','builtin'),
        param('exposure','亮度','number',1,{min:0,max:5,step:.05}),
        param('attenuation','对比','number',1,{min:.05,max:5,step:.05}),
        param('invert','反相','boolean',false),
        param('colorMode','字符色彩','select','mono',{options:Object.freeze(['mono','original']),optionLabels:Object.freeze({mono:'单色',original:'原色'})}),
        param('color','字符颜色','color','#ffffff',{alphaKey:'colorAlpha',visibleWhen:Object.freeze({colorMode:'mono'})}),
        param('colorAlpha','透明度','number',1,{min:0,max:1,step:.05}),
        param('originalBackground','原图背景','boolean',false),
        param('blend','混合模式','select','normal',{options:blendOptions,optionLabels:blendLabels,visibleWhen:Object.freeze({originalBackground:true})}),
        param('background','背景颜色','color','#000000',{alphaKey:'backgroundAlpha',visibleWhen:Object.freeze({originalBackground:false})}),
        param('backgroundAlpha','背景透明度','number',1,{min:0,max:1,step:.05,visibleWhen:Object.freeze({originalBackground:false})}),
        param('edges','边缘强化','boolean',false),
        param('edgeSensitivity','检测灵敏度','number',.75,{min:0,max:1,step:.01,visibleWhen:Object.freeze({edges:true})}),
        param('edgeCoverage','显示阈值','number',.25,{min:0,max:1,step:.01,visibleWhen:Object.freeze({edges:true})}),
        param('edgeCharacters','方向字符','text','—|/\\',{visibleWhen:Object.freeze({edges:true})}),
      ]),
    }),
    Object.freeze({
      id: 'crt-display', name: 'CRT 显示', aliases: Object.freeze(['阴极射线管', '旧显示器', '荧光屏']), family: 'sample', stage: 'sample-output', scopes: Object.freeze(['scene']), card: true,
      purpose: '对场景最终合成画面进行曲面取样、扫描线、荧光栅格、色散和时间扰动；主题是可继续修改的参数预设。', avoidWhen: Object.freeze(['只需要水平线纹理', '需要保持严格像素边界']),
      timing: step, motion: Object.freeze(['crt-motion']), particleBake: 'none', mask: 'optional', cost: Object.freeze({ scene: 'C' }),
      params: Object.freeze([
        param('theme','CRT 主题','select','default',{options:Object.freeze(['default','monochrome-green','green-scanlines','apple','vintage','ibm-3278','futuristic']),optionLabels:Object.freeze({default:'经典彩色','monochrome-green':'单色绿屏','green-scanlines':'绿屏扫描线',apple:'Apple 风格',vintage:'怀旧电视','ibm-3278':'IBM 3278 风格',futuristic:'未来屏幕'})}),
        param('curvature','屏幕曲率','number',.12,{min:0,max:1,step:.01}),
        param('scanline','扫描线强度','number',.28,{min:0,max:1,step:.01}),
        param('scanlinePitch','扫描线间距','number',3,{min:1,max:12,step:1,integer:true}),
        param('phosphor','荧光栅格','number',.22,{min:0,max:1,step:.01}),
        param('rgbShift','RGB 错位','number',1.3,{min:0,max:12,step:.1}),
        param('glow','光晕','number',.18,{min:0,max:1,step:.01}),
        param('vignette','暗角','number',.32,{min:0,max:1,step:.01}),
        param('colorMode','显示色彩','select','color',{options:Object.freeze(['color','mono']),optionLabels:Object.freeze({color:'彩色',mono:'单色'})}),
        param('phosphorColor','荧光色','color','#b8ffc8',{visibleWhen:Object.freeze({colorMode:'mono'})}),
        param('noise','屏幕噪声','number',.012,{min:0,max:.25,step:.005}),
        param('flicker','闪烁','number',.018,{min:0,max:.25,step:.005}),
        param('sweep','滚动亮带','number',.04,{min:0,max:.25,step:.005}),
        param('seed','随机种子','number',1,{min:0,integer:true}),
      ]),
    }),
    Object.freeze({
      id: 'offset-sampling', name: '偏移采样', aliases: Object.freeze(['像素沸腾', '像素呼吸', '像素抖动', '条带故障', '横向撕裂', 'RGB 故障']), family: 'sample', stage: 'sample-coordinate', scopes: Object.freeze(['object', 'scene']), card: true,
      purpose: '沸腾从高分辨率对象胶囊生成候选采样面，只让部分采样格翻涌；像素呼吸让整张对象共用微小取样窗；故障只复制少量完整条带。三者都不是对象平移。', avoidWhen: Object.freeze(['只需要对象整体移动；请使用 bob 或 scroll']),
      timing: step, motion: Object.freeze(['sampling-step', 'sampling-drift']), particleBake: 'shared-frame', mask: 'optional', cost: Object.freeze({ object: 'B', scene: 'C' }),
      params: Object.freeze([
        param('type', '类型', 'select', 'boil', { options: Object.freeze(['boil', 'breath', 'bands']), optionLabels:Object.freeze({boil:'像素沸腾',breath:'像素呼吸',bands:'条带故障'}), timing: step }),
        param('seed', '随机种子', 'number', 1, { min: 0, integer: true }),
        param('boil.bias', '偏置', 'number', 1, { min: 0, max: 64, integer:true, visibleFor: 'boil', requires: 'sampling-grid.size>=2' }),
        param('boil.coverage', '沸腾密度', 'number', .3, { min: 0, max: 1, step:.05, visibleFor:'boil' }),
        param('edge.mode', '边缘规则', 'select', 'off', { options:Object.freeze(['off','contour','interior']), optionLabels:Object.freeze({off:'关闭',contour:'锁定轮廓',interior:'保护内部'}), visibleFor:'boil' }),
        param('edge.width', '保护宽度', 'number', 1, { min: 1, max: 8, integer:true, visibleWhen:Object.freeze({type:'boil','edge.mode':['contour','interior']}) }),
        param('breath.bias', '呼吸幅度', 'number', .1, { min:0, max:64, step:.05, visibleFor:'breath', requires:'sampling-grid.size>=2' }),
        param('breath.edge.mode', '边缘规则', 'select', 'off', { options:Object.freeze(['off','contour']), optionLabels:Object.freeze({off:'关闭',contour:'锁定轮廓'}), visibleFor:'breath' }),
        param('bands.orientation', '条带方向', 'select', 'horizontal', { options: Object.freeze(['horizontal', 'vertical']), visibleFor: 'bands' }),
        param('bands.count', '条带数', 'number', 6, { min: 1, max: 64, integer: true, visibleFor: 'bands' }),
        param('bands.thickness', '条带厚度', 'number', 3, { min: 1, max: 128, integer: true, visibleFor: 'bands' }),
        param('bands.offset', '最大位移', 'number', 12, { min: 0, max: 256, integer: true, visibleFor: 'bands' }),
        param('bands.channels', '通道', 'select', 'combined', { options: Object.freeze(['combined', 'rgb']), visibleFor: 'bands' })
      ]),
    }),
    Object.freeze({
      id: 'halftone', name: '网点映射', aliases: Object.freeze(['半调', '波点', '印刷网点', '网点震荡', '网点移动']), family: 'sample', stage: 'sample-pattern', scopes: Object.freeze(['object', 'scene']), card: true,
      purpose: '将明暗映射为规则网点；可保留原色、使用单色或在暗色与亮色间渐变。', avoidWhen: Object.freeze(['对象过小而网点不可辨认']),
      timing: step, motion: Object.freeze(['dot-drift', 'dot-move']), particleBake: 'shared-frame', mask: 'optional', cost: Object.freeze({ object: 'B', scene: 'C' }),
      params: Object.freeze([
        param('shape', '点形', 'select', 'circle', { options: Object.freeze(['circle', 'triangle', 'square', 'pentagon', 'hexagon']), optionLabels:Object.freeze({circle:'圆点',triangle:'三角',square:'矩形',pentagon:'五边形',hexagon:'六边形'}) }),
        param('size', '相对尺寸', 'number', 4, { min: 1, max: 32, integer: true }),
        param('angle', '网格旋转', 'number', 0, { min: -180, max: 180, step: 5 }),
        param('offsetX', '起始偏移 X', 'number', 0, { min: 0, max: 1, step: .05 }),
        param('offsetY', '起始偏移 Y', 'number', 0, { min: 0, max: 1, step: .05 }),
        param('rowOffset', '错列偏移', 'number', 0, { min: 0, max: 1, step: .05 }),
        param('threshold', '阈值', 'number', .65, { min: 0, max: 1, step: .05 }),
        param('contrast', '对比', 'number', .75, { min: .25, max: 2, step: .05 }),
        param('colorMode', '色彩', 'select', 'original', { options: Object.freeze(['original','single','gradient']), optionLabels:Object.freeze({original:'原色',single:'单色',gradient:'双色渐变'}) }),
        param('singleColor', '网点颜色', 'color', '#111827', { visibleWhen:Object.freeze({colorMode:'single'}) }),
        param('originalBackground', '原图背景', 'boolean', false),
        param('duotoneDark', '暗色', 'color', '#111827', { visibleWhen:Object.freeze({colorMode:'gradient'}) }),
        param('duotoneLight', '亮色', 'color', '#f2e8cf', { visibleWhen:Object.freeze({colorMode:'gradient'}) })
      ]),
    }),
    Object.freeze({
      id: 'uneven-sampling', name: '不均采样', aliases: Object.freeze(['采样潮汐', '颗粒潮汐', '轮廓稳定内部翻涌']), family: 'sample', stage: 'sample-coordinate', scopes: Object.freeze(['object', 'scene']), card: true,
      purpose: '在对象或场景内部建立粗细不一的像素块；采样场与边缘保护只服务于这一效果。', avoidWhen: Object.freeze(['需要可控的单一平面颜色']),
      timing: step, motion: Object.freeze(['uneven-motion']), particleBake: 'shared-frame', mask: 'optional', cost: Object.freeze({ object: 'B', scene: 'C' }),
      params: Object.freeze([
        param('amount', '粗细幅度', 'number', .5, { min: 0, max: 1, step: .05 }),
        param('coarseness', '最大采样', 'number', 5, { min: 1, max: 32, integer: true }),
        param('field.enabled', '启用采样场', 'boolean', true),
        param('field.type', '场类型', 'select', 'wave', { options: Object.freeze(['wave', 'radial', 'noise']), optionLabels:Object.freeze({wave:'波场',radial:'径向',noise:'噪声'}) }),
        param('field.contrast', '空间对比', 'number', .5, { min: 0, max: 1, step: .05 }),
        param('field.scale', '图样尺度', 'number', 48, { min: 4, max: 1024, step: 4 }),
        param('field.seed', '随机种子', 'number', 1, { min: 0, integer: true }),
        param('field.direction', '方向', 'number', 0, { min: -180, max: 180, step: 5 }),
        param('field.centerX', '中心 X', 'number', .5, { min: 0, max: 1, step: .05 }),
        param('field.centerY', '中心 Y', 'number', .5, { min: 0, max: 1, step: .05 }),
        param('edge.mode', '边缘保护', 'select', 'off', { options: Object.freeze(['off', 'contour', 'interior']), optionLabels:Object.freeze({off:'关闭',contour:'保护轮廓',interior:'保护内部'}) }),
        param('edge.width', '保护宽度', 'number', 2, { min: 1, max: 16, integer: true }),
      ]),
    }),
    Object.freeze({
      id: 'masked-inner-light', name: '蒙版暗角', aliases: Object.freeze(['场景内光', '场景暗角', '边缘压暗', '蒙版内缘光']), family: 'scene-overlay', stage: 'scene-overlay', scopes: Object.freeze(['scene']), card: true,
      purpose: '沿画面或可选范围的边缘压暗；默认复用 Legacy 暗角的径向渐变。', avoidWhen: Object.freeze(['不需要明暗引导']),
      timing: linear, motion: null, particleBake: 'none', mask: 'optional', cost: 'A',
      params: Object.freeze([param('color', '颜色', 'color', '#000000', { timing: linear, alphaKey: 'strength' }), param('strength', '透明度', 'number', .38, { min: 0, max: 1, step: .05, timing: linear }), param('inner', '中心保留', 'number', .35, { min: 0, max: 1, step: .05, timing: linear }), param('outer', '边缘范围', 'number', .72, { min: .05, max: 1.5, step: .05, timing: linear }), blendParam('normal')]),
    }),
  ]);

  const recipes = Object.freeze([
    Object.freeze({ id: 'scanlines', name: '扫描线', uses: Object.freeze(['texture-overlay']), note: '使用水平线纹理；不是独立基础效果。' }),
    Object.freeze({ id: 'crt-screen', name: '旧显示器', uses: Object.freeze(['crt-display']), note: '场景采样末端的独立 CRT 显示效果。' }),
    Object.freeze({ id: 'stable-contour', name: '轮廓稳定、内部翻涌', uses: Object.freeze(['uneven-sampling', 'offset-sampling']), note: '采样场 + Alpha 锁轮廓 + 采样潮汐。' }),
    Object.freeze({ id: 'rough-xerox', name: '粗糙复印', uses: Object.freeze(['threshold', 'grain-overlay', 'offset-sampling', 'outline']), note: '阈值、颗粒、微偏移与硬边组合。' }),
  ]);

  const removed = Object.freeze([
    Object.freeze({ id: 'wave-displacement', name: '波带位移', status: 'removed', replacement: '未来作为对象形变重新设计；当前实现不保留。' }),
    Object.freeze({ id: 'scan', name: '扫描线 FX', status: 'folded', replacement: 'texture-overlay / scanlines 配方。' }),
    Object.freeze({ id: 'crt', name: '旧 CRT FX', status: 'replaced', replacement: '场景采样滤镜 crt-display。' }),
    Object.freeze({ id: 'fog', name: '像素雾', status: 'removed', replacement: '不保留；真实粒状运动使用粒子或不均采样。' }),
    Object.freeze({ id: 'glow', name: '光晕 FX', status: 'folded', replacement: 'outer-light / inner-light / masked-inner-light。' }),
    Object.freeze({ id: 'local-fx', name: '局部 FX', status: 'replaced', replacement: '场景滤镜 + 统一范围蒙版。' }),
  ]);

  const effectById = Object.freeze(Object.fromEntries(effects.map(item => [item.id, item])));
  const controllerById = Object.freeze(Object.fromEntries(controllers.map(item => [item.id, item])));
  // Runtime 支持度也必须由 registry 声明，避免 UI 把“计划卡片”误当成可运行效果。
  const runtimeSupport = Object.freeze({
    projection: Object.freeze({ object: 'ready' }), outline: Object.freeze({ object: 'ready' }),
    'tint-overlay': Object.freeze({ object: 'ready', scene: 'ready' }), 'texture-overlay': Object.freeze({ object: 'ready', scene: 'ready' }), 'grain-overlay': Object.freeze({ object: 'ready', scene: 'ready' }),
    'inner-light': Object.freeze({ object: 'ready' }), 'outer-light': Object.freeze({ object: 'ready' }),
    'color-grade': Object.freeze({ object: 'ready', scene: 'ready' }), 'color-map': Object.freeze({ object: 'ready', scene: 'ready' }), 'noise-dither': Object.freeze({ object: 'ready', scene: 'ready' }),
    threshold: Object.freeze({ object: 'ready', scene: 'ready' }),
    'edge-dispersion': Object.freeze({ object: 'ready', scene: 'ready' }), 'ascii-mapping': Object.freeze({ object:'ready',scene: 'ready' }), 'crt-display': Object.freeze({ scene: 'ready' }), 'offset-sampling': Object.freeze({ object: 'ready', scene: 'ready' }), halftone: Object.freeze({ object: 'ready', scene: 'ready' }),
    'uneven-sampling': Object.freeze({ object: 'ready', scene: 'ready' }), 'masked-inner-light': Object.freeze({ scene: 'ready' }),
  });
  global.EditorEffectRegistryVNext = Object.freeze({
    version: 1,
    lifecycle: 'classic-shell-connected',
    pipelines,
    controllers,
    effects,
    effectById,
    controllerById,
    motions,
    motionById,
    runtimeSupport,
    // Runtime evidence is host-owned. Missing metadata never implies GPU support.
    backendCapability(id,scope) { return global.ToSampoolRuntimeVNext?.modules.backendCapabilities?.describe(id,scope)||null; },
    recipes,
    removed,
    blendOptions,
    blendLabels,
  });
})(typeof window !== 'undefined' ? window : globalThis);
