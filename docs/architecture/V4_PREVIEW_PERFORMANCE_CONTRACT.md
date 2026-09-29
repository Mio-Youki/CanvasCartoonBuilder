# v4 编辑预览性能合同

> 状态：**Phase 9 基线已落地：P0 调度核心、页面读数、1920×1080 静态门禁、S/M/L 动态压力夹具及 Auto / Draft 预算均由真实 Edge 验证。**

适用范围是编辑器实时预览与播放头；不改变 Scene 持久格式，也不降低固定时间渲染、测试页或导出的完整质量。

## 1. 原则

v4 的 Runtime 分层不自动等于更快。编辑器必须将“播放时间变化”与“Canvas 像素需要重绘”分开：静态作品播放时，播放头移动，Canvas 不应因时间流逝重复绘制。

Tauri 不会天然提高 Canvas 帧率；优化首先发生在主线程热路径、工作像素、缓存与离屏合成。

## 2. 不变量

1. **尺寸稳定**：仅 Scene 宽/高实际变化时写 `canvas.width/height`；同尺寸的每帧渲染禁止重设 backing store。
   这同样适用于 Runtime 的离屏 Surface 池：复用同尺寸 Surface 时不得以赋相同 `width/height` 的方式清空、重分配。
2. **同步热路径**：素材解析并创建 Player 后，RAF 中只允许同步 `renderTo`；禁止每帧 `await`、创建 Player、解析 locator 或 hydrate Scene。
3. **静帧零重绘**：静态 Scene 首次画完后，Canvas 仅在明确失效时重绘；播放只更新播放头。
4. **受控失效**：仅 scene/asset/尺寸/质量变化、显式 seek 或时间相关内容才请求主作品重绘。Inspector DOM 更新不应无条件失效 Runtime。
5. **一条时钟**：编辑器拥有唯一播放时钟；Runtime 只做固定时间纯渲染，不启动自身 RAF。
6. **质量独立**：Auto / Full / Draft 是会话状态，不写入 Scene；测试与导出永远 Full。
7. **手势合帧**：Canvas 连续拖动可以多次更新临时 Scene，但主作品渲染请求必须由 `requestAnimationFrame` 合并；同一浏览器帧最多执行一次作品重绘，辅助框由独立 DOM/Overlay 更新。

## 3. 预览调度

```text
播放时钟（RAF）
 ├─ 每帧：更新时间、播放头 transform、轻量状态文本
 └─ 条件触发：PreviewScheduler.requestRender(reason)
                    ↓
          已缓存 Player + 已解析 runtimeAssets
                    ↓
             v4 Runtime.renderTo(canvas, t)
                    ↓
             性能样本 / 下一次调度
```

失效原因必须可记录：`scene-change`、`asset-ready`、`size-change`、`quality-change`、`time-dependent`、`selection-overlay`、`explicit-seek`。选择辅助层应尽可能绘制在独立 Overlay，不能强迫主作品 Canvas 重画。

## 4. 静态 / 动态判定

| 内容 | 连续重绘 |
|---|---|
| 单图、背景色、静态图元、静态对象/场景效果 | 否 |
| Step 时序且未跨段 | 否 |
| Step 跨段 | 仅段边界 |
| Linear、对象动画、动态纹理、粒子、多帧、Sampling Motion | 是 |
| 选中、树展开、Inspector 切页 | 否；仅 Overlay 或 DOM |

初版可保守地把“任一启用效果”视为动态，但必须由 Registry 标记并可观测，随后逐项收紧。

## 4.1 大图轮廓预算

像素外描边属于对象级加样；它不能用“半径 × 圆周方向”在原尺寸离屏画布上反复盖印。描边宽度 16 在 1920×1080 图片上仍必须是有界成本：轮廓 alpha 可按宽度降采样，盖印方向最多 24 次，最后叠回原图。这样保持像素边缘的粗粝感，同时避免千次全图 `drawImage`。

## 5. 质量与验收

| 模式 | Canvas 策略 | 允许降级 |
|---|---|---|
| Full | 时间相关 Scene 按目标节奏完整渲染 | 不降工作分辨率 |
| Draft | 降低高成本像素处理工作分辨率与刷新频率 | S / M / L 按工作量使用 2× / 4× / 8× 最近邻工作降采样；不改 Scene |
| Auto | 根据 Runtime P95 在 Full / Draft 节奏间切换 | 必须有迟滞 |

### P0：1920×1080 单静图回归

在无效果、无动画的 v4 Scene 上播放 300 个可见 RAF：

1. 主作品 Canvas 只允许初始或明确失效时渲染；
2. 不得重复写入相同 Canvas backing size；
3. 记录播放头 P95 帧间隔；高于 20ms 视为回归并附 profile；
4. 暂停/继续、seek、选择/清选、Inspector 切页不丢失播放状态。

S/M/L 动态验收还必须记录 Runtime 平均/P95、RAF P95、每秒 Canvas 重绘数、Player/素材解析/backing-size 写入次数、离屏峰值和工作像素。设备与浏览器记录规则沿用 [ACCEPTANCE_TEST_MATRIX.md](ACCEPTANCE_TEST_MATRIX.md)。

## 6. 页面内验证读数

v4 舞台状态栏直接显示：`绘制 / 跳过`、`backing` 写入次数、滚动 300 帧的 `P95` 与 Player 创建数。静态 Scene 播放约 5 秒时，正确表现是播放头持续移动、`跳过` 增长、`绘制` 和 `backing` 保持不变；这使浏览器验收不依赖开发者工具。

脚本亦可读取 `window.ToSampoolVNextEditor.previewMetrics()`；它只暴露只读诊断数据，不改变 Scene 或播放状态。

## 7. 实施闸门

隔离 v4 页已实现条件 Canvas resize、缓存 Player/Assets 和静态 Scene 跳绘；Classic v4 View 现在保留滚动 300 帧的 RAF / Runtime 绘制样本，并把 P95、绘制/跳过、backing、离屏峰值和 Player 数显示在舞台状态栏。`tests/vnext-preview-scheduler.mjs` 与 Runtime smoke test覆盖静态/Step/Linear/粒子/多帧判定及同尺寸 Canvas 不重复写入。

2026-09-24 当前主机的 Edge headless 基线（1600×1000 浏览器视口，1920×1080 单静图，300 个可见 RAF）连续两次记录为：RAF P95 `17.20–18.30ms`、播放期间新增主画布绘制 `0`、静态跳过 `303`。一次性首帧 / 尺寸切换所在滚动窗口的 Runtime 绘制 P95 为 `57.80–77.60ms`；它不属于持续播放开销，也不能作为复杂动态效果已经达标的证据。真实浏览器自动验收硬性检查 300 帧窗口、静态近零重绘、Player 复用与可观测读数；机器相关耗时只记录并在超过 `20ms` 时要求 profile，不以单次本机数值写成跨设备固定断言。

### Phase 9 动态压力基线

`npm run verify:performance` 在真实 Edge 中生成对象胶囊，并叠加对象阈值 / 偏移采样、场景调色 / 阈值滤镜。它不是“常见轻量场景”，而是刻意制造 4–6 次 CPU 像素遍的压力档。2026-09-24 当前开发机一次记录如下；耗时只用于同机回归，确定性门禁是倍率、工作像素降幅、输出尺寸、backing 写入和 Auto 实际切换：

| 档位 | Full P95 | Draft 倍率 / P95 | 工作像素 Full → Draft | 像素遍数 |
|---|---:|---:|---:|---:|
| S · 480×270 · 1 对象 | 28.5ms | 2× / 15.8ms | 325,344 → 81,336 | 4 |
| M · 960×540 · 2 对象 | 134.2ms | 4× / 35.6ms | 1,536,912 → 96,416 | 6 |
| L · 1920×1080 · 2 对象 | 315.0ms | 8× / 51.1ms | 6,088,392 → 95,700 | 6 |

本机 Draft 回归预算为 S ≤50ms、M ≤90ms、L ≤120ms，并且必须快于对应 Full、至少降低 65% 工作像素。该绝对毫秒值不跨设备宣称；跨设备必须保留完整输出再比较相对变化。M 档真实 Auto 连续绘制后已从 Full 切至 Draft 4× / 6fps，且 `previewQuality` / `previewPixelDivMultiplier` 未进入序列化 Scene。

这组数据也冻结了边界：多次全画布 CPU 像素处理下，M/L Full 目前不是实时模式。Full 是测试、导出和保真检查基线；编辑交互默认依赖 Auto，Draft 负责维持可操作性。Phase 9 因此完成的是“成本可观测、自动降级可验证、输出不受污染”，而不是宣称复杂 Full 已达到 33ms。若产品要让 L 档多遍效果仍保持 Full 实时，必须另立优化任务（减少像素遍、局部脏区或后台渲染），不能偷偷降低导出质量。

### Phase 10 粒子压力基线

`npm run verify:particles` 单独测量粒子，不与全画布滤镜混算。粒子成本分成两部分：来源视觉胶囊的构建成本，以及每颗粒子的 `drawImage` 成本。Runtime 必须保证每个发射器每帧只构建一次来源胶囊；粒子数增加不得线性增加来源对象的蒙版、加样或采样次数。

2026-09-24 当前开发机 Edge headless 记录：

| 档位 | 来源 / 数量 | Full P95 | Draft 倍率 / P95 | 来源工作像素 Full → Draft |
|---|---|---:|---:|---:|
| S · 480×270 | 矢量 / 40 | 2.9ms | 2× / 1.5ms | 0 → 0 |
| M · 960×540 | 图片 / 140 | 4.5ms | 4× / 3.5ms | 0 → 0 |
| L · 1920×1080 | 2 个带对象处理的图片来源 / 2×400 | 37.2ms | 8× / 22.6ms | 46,656 → 784 |

无像素处理的粒子来源不会产生 `workPixels`，Draft 对它的主要收益来自较低刷新频率，而不是降低粒子数量。带对象处理的来源可以降低胶囊处理分辨率，但 800 次 blit 仍然完整执行；因此不能用 Draft 掩盖超大粒子数。夹具还要求 220 粒子的 Full / Draft 连续播放分别遵循 12fps / 6fps 调度，并保证预览状态不进入序列化 Scene。
