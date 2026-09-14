# Runtime Adapter：轻量渲染内核计划

> 本文件记录当前轻量渲染内核的已交付事实与下一层边界。它是导出增强和动画轨道继续演进的设计依据，
> 不把已完成能力重新描述为规划。

## 已有成果

- 通用 `GENERIC_SCENE` 已可创建、打开、修改、保存并再次打开；图元、图片、背景、sprite、粒子、
  FX、转场、场景段和 `show` 均使用同一 Scene 数据。
- 编辑器有高 DPI 预览、图层/parts 双向选中、局部组合变换、插入式排序、时间轴与场景段编辑。
- 图片可经过采样、减色、去背景和尺寸处理后成为自包含 data URL；背景可保留居中、拉伸、平铺规则。
- Agent 合同已分为数据格式、生成协议、改写协议；混合参考图路径允许以背景底图承接高密度静态像素画，
  程序层只承担有编辑价值的局部动态。
- `editor/geometry.js` 与 `editor/scene-model.js` 已从页面脚本抽出，是内核拆分第一层。
- `editor/timeline-model.js` 已集中 Scene 边界、相对时间和时段命中；元素属性、局部 FX、全局 FX 不再各自解释边界。
- `editor/scene-serializer.js` 已统一撤销快照与自包含保存的字段过滤规则，宿主只负责写入字节，不再决定 Scene 中应保留什么。
- `editor/host-adapter.js` 已隔离浏览器打开、保存与素材选择；Tauri 已通过注入同一合同接管原生文件能力。
- ✅ **固定时间渲染基础**：`HomeScene` 已抽出 `renderFrame` 纯绘制核心；现有预览仍经原有 RAF/seek
  包装调用它，`HomeScene.createRuntime(scene)` 则可在不启动 RAF、不改 `window.HOME_SCENE` 的条件下，
  向任意 Canvas 按指定 `t` 渲染一帧。通用 Scene 的独立 Canvas 冒烟测试已覆盖该入口。
- ✅ **局部 FX 轻量管线**：`fx.layers` 已在 Runtime 中按固定的全局前阶段、蒙版与合成顺序渲染；
  像素雾、光晕、CRT、故障及局部采样/色板/调色共享相同固定时间路径。局部像素处理只复用蒙版包围盒
  离屏 Canvas 与全局色板 LUT，不成为常驻视频滤镜。
- ✅ **像素采样作用域**：图片/背景对象级再像素化、Sampling Motion（像素沸腾 / 颗粒潮汐 / 网点游移 / 阈值呼吸）、局部 FX 采样/色板与全局采样/色板
  均由固定时间 Runtime 求值。采样运动只改变图片采样格、半调网点相位或阈值，并由 `t + seed/period` 确定；它们拥有独立 `show` 作用窗口，因此实时预览、
  测试页和离线帧不会各自随机；采样除数没有 4 倍硬限制，仅受画布短边自然约束。
- ✅ **元素绑定 FX**：FX 仍作为独立合成层，仅以 `bind.targetId` 引用元素；`anchor` 跟随目标位移，
  `clip` 复用目标 Alpha 和 FX 内容两张临时画布实现“FX 蒙版 ∩ 元素轮廓 ∩ 元素 mask”。因此预览、
  固定时间导出和未来编码不需要理解另一套嵌套图层格式。
- ✅ **帧产物与 GIF**：当前帧 PNG、Sprite PNG、多帧 PNG、时间采样拼图与 GIF 已由固定时间 Runtime 采样；
  透明背景、场景时段与帧率均在同一导出面板选择。保存 JS 与测试 HTML 会冻结图片 data URL，避免依赖编辑器素材会话。
- ✅ **元素实时蒙版**：`mask.type:'element'` 可引用稳定元素或组的实时 Alpha；来源在正常合成中派生隐藏，
  但仍以当前动画、时序、Linear 与组变换参与离屏捕获。实体和局部 FX 使用相同路径。

## 当前问题清单

### 渲染与导出

1. `renderFrame` / `createRuntime(scene)` 已可固定时间渲染，预览已使用单一编辑器时钟驱动 Runtime；页面控制器仍较大，下一步继续抽离命令与选择/时间轴控制器，而非复制一套绘制器。
2. PNG 序列与 GIF 已交付；APNG / WebP / WebM / MP4 尚无按需编码策略、体积预设或降级提示。
3. 缺少导出后的自动视觉回归：应比较预览、测试 HTML 与固定时间帧，而不是只验证文件可下载。

### 动画与时间轴

1. 已有 `timeline.sceneOverrides`、稀疏 `timeline.tracks` 与基础变换的 Linear 插值；尚未形成通用 `{t,v,ease}` 曲线、关键帧编辑器或曲线视图。
2. 时间轴可编辑场景、显示窗口、属性时段、全局 / 局部 FX 分段；动态参数、复杂属性与多对象比较仍需明确产品边界。
3. 后续关键帧必须继续由 Runtime 在任意 `t` 求值，不能把插值逻辑留在 DOM 事件中。

### 素材与项目

1. 浏览器版保存的是 data URL 快照，不保存原图、处理配方和跨场景素材库。
2. 混合底图样例的相对路径图片只用于开发审阅；正式交付仍需冻结为 data URL。
3. 桌面应用后需要 `project / scene / runtime / export` 四层，以及 `assets/`、原图连接和处理配方；
   该工作暂缓，不能以 IndexedDB 替代正式产品方案。

### 视觉与编辑边界

1. 高密度参考图不能无限拆为 `parts`，否则还原度和可编辑性都会下降；需要持续由用户/Agent 做
   “底图、图片层、sprite、图元”的编辑价值判断。
2. 已有几何、Alpha / 明度和元素实时蒙版，但没有羽化、布尔运算、嵌套裁剪组或蒙版形状插值；树冠摆动、雾、
   沿不规则河岸的特效仍需要预留安全区域或额外 Alpha 素材。
3. 缺少参考图叠加、差异预览和固定时间视觉回归，Agent 迭代仍难量化画面偏差。

## 已落地：Runtime Adapter 合同

### 责任边界

Adapter 只负责“给定 Scene 和确定时间，画出一帧”。它不得管理页面、按钮、图层卡片、RAF、文件选择或
编码器。建议最小契约为：

```js
const runtime = createSceneRuntime(scene);
await runtime.ready();                 // 图片/精灵资源准备完成
runtime.render(ctx, { t, width, height, clear: true });
runtime.dispose();
```

- `t` 是循环内秒数；相同 Scene、尺寸和 `t` 必须得到同一帧。
- Adapter 内部统一处理 scene 边界、`show`、按场景参数、动画原语、粒子 seed、图片帧、背景布局、FX、
  转场和透明背景。
- 预览层仅提供 RAF 时钟和目标 Canvas；离线导出层仅以 `t = frame / fps` 循环调用 `render`。
- 旧 `HOME_SCENE` 保留兼容适配器，`GENERIC_SCENE` 为新内核的第一目标；不在首轮重写全部旧场景逻辑。

### 不做什么

- 不引入 Remotion、完整视频编辑器、服务器渲染、时间线框架或常驻编码依赖。
- 不把 Scene 改成项目工程格式，也不在此阶段引入关键帧 schema。
- 不要求 OffscreenCanvas：普通 Canvas2D 是基线，OffscreenCanvas 仅在浏览器支持时作为加速路径。

## 轻量化实施状态与后续顺序

1. ✅ **固定时间渲染探针**：已抽出 `renderFrame`，建立 `createRuntime(scene).render(canvas,{t})` 冒烟测试；
   预览行为保持原样。
2. **Adapter 接入预览**：✅ 预览已停用第二套 Runtime RAF，以单一编辑器时钟调用固定时间绘制；Auto / Full / Draft 只改变预览预算。下一步继续拆分编辑器命令与控制器，不改变 Scene 合同。
3. **PNG 序列导出**：✅ 已支持按选定场景时段与 fps 输出逐张 PNG、Sprite PNG 与时间采样拼图，验证透明、场景过渡、图片资源与帧确定性；它不需要引入视频编码器，是最低风险的验收层。时间采样拼图只是视觉审阅产物，不是关键帧数据。
4. **编码器按需加载**：GIF 已交付；WebM 优先走浏览器原生 WebCodecs/MediaRecorder，APNG/WebP 使用按需加载的小型编码器，不进入 Runtime、不开机加载。每种格式独立降级提示。
5. **关键帧数据模型与求值器**：定义小型 `{t, v, ease}` 轨道并由 Adapter 在 `t` 求值；确认求值正确后，
   才增加时间轴关键帧 UI。

## 验收门槛

- 同一 Scene 在预览与离线 `t=0 / 边界前后 / loop 末尾` 的像素结果一致。
- 图片/多帧 sprite/粒子/FX/转场/透明背景均能在离屏画布完成，且没有 DOM 依赖。
- 导出帧率只影响采样数量，不改变动画速度、粒子随机序列或场景时长。
- Adapter 核心不新增第三方运行时依赖；编码器不参与普通编辑预览的下载与初始化。
- 现有 js 的打开、保存、图层编辑和 `file://` 启动体验不回归。

## 后续依赖关系

```text
Scene 数据 ──> Runtime Adapter ──> 预览 / 固定时间帧 / PNG 序列
                                      ├── 按需编码 GIF · APNG · WebP · WebM
                                      └── 关键帧求值器 ──> 关键帧时间轴 UI

桌面项目层（assets / 原图 / 配方）──> Scene 引用解析 ──> Runtime Adapter
```
