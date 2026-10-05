# ToSampool / 图森破：架构总览

> 本文是产品 Review 的技术地图。字段的唯一真相以 `../../SCENE_SPEC.md` 为准；路线与优先级以 `../../PLAN.md` 为准；它不替代二者。旧名称 Patcharium / 拼好景仅用于历史语境。文档总入口与提交边界见 [文档架构](../DOCUMENTATION_ARCHITECTURE.md)。

## 1. 产品策略：混合小景，而非全图元重绘

ToSampool / 图森破以“高细节素材 + 结构化动态层 + 可选项目 Scene Module”的混合场景为默认策略。图片或序列承载静态高密度内容；需要选择、重排和局部调整的区域进入普通 Scene 对象；作品专用的程序画面可作为受控渲染岛随项目交付。可编辑不等于每个像素都必须拆成图元。

Runtime 是轻量的 Canvas 2D 场景运行层，不是视频编辑器、WebGL 通用渲染器或任意 HTML/Shader 容器。其价值是确定性时间寻址、可移植的自包含场景、声明式局部修改和同一 Scene 在预览/导出中的一致运行。

> 当前产品候选采用 Classic 体验壳 + v4 Core；Legacy 页面仅用于行为、视觉与性能对照，不进入 v4 项目或交付物。迁移以 [v4 迁移总规范](V4_MIGRATION_MASTER_SPEC.md) 和 [机器迁移矩阵](V4_MIGRATION_MATRIX.json) 为执行依据。

## 2. 五层边界

```text
Scene 合同  ──>  Runtime  ──>  编辑器工作台  ──>  交付物
    │               │                 │                │
 Agent 协议          │                 │                ├─ 自包含 JS
    │               │                 │                ├─ 测试 HTML
  生成 / 改写         │                 │                └─ PNG / Sprite / PNG 序列 / GIF
                    └─────────────────┘
                 同一确定时间绘制路径

宿主适配层：Browser 下载/选择器 | Tauri 文件/项目/编码 command
桌面项目层（后置）：assets / 原图 / 处理配方 / 个人素材库
```

| 层 | 拥有的数据 / 责任 | 不应承担的责任 |
|---|---|---|
| Scene / Project | `tosampool-scene/v4`、素材索引、元素、组、图片、粒子、效果、时段；项目包可另带受信任 Module 源与 Manifest | DOM 状态、文件句柄、浏览器图片对象、Scene 内任意函数 |
| Runtime | 在确定 `t` 将 Scene 绘制到 Canvas；处理图层、动画、组变换、蒙版、粒子、FX、过渡 | 面板、选择、拖拽、文件选择、编码器常驻加载 |
| 编辑器 | 把 Scene 映射为结构树、舞台、Inspector、编排器；写回合法 Scene 字段 | 创建第二套渲染规则或保存不可运行的 UI 私有状态 |
| 交付 | 冻结 data URL、生成独立 JS / 测试 HTML / 帧产物 | 保存用户原图、处理配方或跨场景素材关系 |
| Agent / 桌面项目层 | Agent 负责生成/改写策略；桌面层未来负责可重连资源 | 改写 Runtime 约束、在浏览器版伪造项目持久化 |

浏览器与 Tauri 只通过 Host Adapter 提供文件、项目和编码能力；Scene、Runtime、Inspector 命令不得直接依赖 Tauri API。Tauri 不会自动提高 Canvas 帧率，性能优化仍应发生在 Runtime 的工作像素、缓存和离屏合成路径。

Tauri 第一层实现位于 `src-tauri/`：它通过与浏览器 Host 相同的六个操作提供原生文件选择、授权路径读取、相对素材解析和批量目录写入。`.tauri-dist/` 是由白名单脚本生成的最小前端闭包，不包含旧版入口或示例资产。桌面 Host 不进入 Runtime，详见 [TAURI_HOST.md](TAURI_HOST.md)。

编辑器内部的 Scene/时段边界统一由 `editor/timeline-model.js` 计算。元素属性、局部 FX 与全局 FX 只消费同一套“右开区间、末段闭合”的段索引规则，页面控制器不再分别解释播放头位于哪个 Scene 或时段。

Scene 的 JSON 边界统一由 `editor/scene-serializer.js` 管理：撤销历史可省略能够通过 `srcId` 重连的沉重 data URL，自包含保存必须保留图片源；运行缓存、已编译程序函数和字体二进制连接在两种输出中都不得泄漏。

Scene 的可撤销修改统一经过 `editor/scene-mutation.js`：事务先捕获修改前快照，再更新 Scene、失效缓存并同步四个 UI 表面；连续预览可以提交或回滚。主 Inspector、Canvas、结构树、编排器、绘制/文字及常用快捷操作已迁移。正常工作流不再后台构造旧卡片，Legacy 仅兜底历史未绑定 FX。

Inspector 通过会话级 `sceneRevision` 感知同一对象内部的数据结构变化；动画与 Sampling Motion 的启用/展开共用渐进披露控制器。`editor/effect-registry.js` 集中声明 Sampling Motion（含颗粒潮汐）、共享 `field`、共享 `edge` 与组合预设的 UI 元数据；`editor/sampling-motion-kernel.js` 是波场、Alpha 边缘保护、颗粒采样、阈值和网点像素算法的唯一手写源。编辑器直接加载该模块，`scripts/build-runtime-inline.mjs` 将同一源码机械嵌入 `home-scene.js`，兼顾共享实现与场景 JS 自包含。空间基底与 Alpha 距离衰减图由调用实体持有缓存，参数、尺寸或源帧变化时失效；预设只负责组合声明，不形成新的渲染分支。

v4 的图案相关能力以 [PATTERN_FIELD_SPEC.md](PATTERN_FIELD_SPEC.md) 为边界：路径纹理填充、对象/场景纹理叠加与亮度网点映射共享格、图元、相位和缓存语义，但各自保留路径裁切、Alpha 合成或颜色采样适配器，避免将高成本映射误实现为普通纹理。

## 3. 当前核心数据关系

- **实体层**：普通图形、文字、图片、粒子、Builtin 与 `procedural` 对象统一按 Scene 顺序绘制。`procedural` 只引用项目 Module 的稳定 id/version/params；模块源和 Manifest 独立存于项目包，不写进 Scene JSON。
- **组**：`groups[]` 仅保存成员关系与共享变换，不建立离屏合成容器；成员保持自身相对顺序和单独编辑能力。
- **时序**：`show` 负责可见窗口；`timeline.sceneOverrides` / `timeline.tracks` 负责稀疏参数覆层与 Linear 插值；编辑器临时选择状态不写入 Scene。
- **区域 FX**：当前所谓“局部 FX”保持独立的 `fx.layers[]` 与排序。绑定只让范围跟随目标或裁入目标 Alpha，不赋予目标的 `z`；它仍在全部实体之后执行，因此不能被描述为 `element.localFx` 或对象自身样式。
- **对象处理**：阴影、外描边、对象调色/采样、Sampling Motion 与对象蒙版只处理目标自身像素，语义上随对象 `z` 合成。后续 Inspector 应将它们与区域后处理明确分开，不因为 UI 上都叫“效果”而合并 Runtime 阶段。
- **蒙版**：实体与局部 FX 共用 `rect / ellipse / poly / alpha / element`。元素蒙版引用场景元素或组的实时 Alpha，来源派生隐藏但仍参与每帧捕获。

## 4. 运行顺序

```text
背景 → 实体 / 图片 / 图元 / 粒子（含组变换与实体蒙版）
     → 区域 FX（旧称局部 FX；含范围蒙版与元素绑定，但不继承目标 z）
     → 全局采样、调色、色板与全局叠加
     → 场景过渡
```

若未来让任意效果真正进入目标图层顺序，必须先把目标绘制到独立离屏表面、处理后再按 `z` 回贴，并处理动态包围盒、蒙版、组、粒子和程序元素边界。该能力会显著增加 Alpha 捕获与像素处理成本；当前版本不伪装支持。优先把效果按“对象处理 / 区域处理”分类，再决定哪些效果值得付出这项成本。

预览、固定时间渲染、PNG / Sprite / 多帧 PNG / GIF 与测试场景均应调用同一 Runtime 绘制语义。格式编码是交付层的可选能力，不能反向侵入编辑预览。

全局 FX 分为两类性能路径：色相 / 亮度 / 对比度 / 饱和度在未启用色板和像素再采样时使用 Canvas 原生滤镜；色板量化与像素采样必须读取像素缓冲，属于与画布面积成正比的高成本效果。实景大图优先使用前者；需要后者时应提高 `pixelDiv`，让处理发生在缩小后的缓存画布上。

行为、命令、变更事务、Inspector 控件、运行、宿主、素材解析、产物构建与验收合同分别见 [EDITOR_BEHAVIOR_SPEC.md](EDITOR_BEHAVIOR_SPEC.md)、[EDITOR_COMMANDS.md](EDITOR_COMMANDS.md)、[SCENE_MUTATION.md](SCENE_MUTATION.md)、[INSPECTOR_CONTROL_SYSTEM.md](INSPECTOR_CONTROL_SYSTEM.md)、[RUNTIME_CONTRACT.md](RUNTIME_CONTRACT.md)、[HOST_ADAPTER.md](HOST_ADAPTER.md)、[TAURI_HOST.md](TAURI_HOST.md)、[ASSET_RESOLVER.md](ASSET_RESOLVER.md)、[ARTIFACT_BUILDER.md](ARTIFACT_BUILDER.md) 和 [ACCEPTANCE_TEST_MATRIX.md](ACCEPTANCE_TEST_MATRIX.md)。

浏览器版的自包含测试页另有一个 `runtime-inline.js` 镜像：它由 `scripts/build-runtime-inline.mjs` 从 `home-scene.js` 机械生成。原因不是 Runtime 需要第二份逻辑，而是部分浏览器允许 `file://` 执行外部脚本、却禁止页面以 fetch/XHR 再读取同一脚本或相对图片。编辑器从已执行的镜像取得 Runtime 文本、从已加载的图片对象取得 PNG 快照；校验器要求镜像与 Runtime 字节一致。

## 5. Review 时应验证的边界

1. 编辑器预览、保存后的 JS、测试 HTML 和帧导出是否对同一 Scene 保真。
2. 一个用户动作是否只写入一处 Scene 合同，而非隐式依赖编辑器状态。
3. Scene 是否仍可在无编辑器、无字体、无外部资源的网页中运行。
4. 新功能是否能归入现有五层；不能归入时，先定义边界，再实现界面。

## 6. 明确后置

- 桌面项目格式：`project / scene / runtime / export`、`assets/`、原图与处理配方；
- APNG / WebP / WebM / MP4 等按需编码；
- 通用关键帧曲线、蒙版形状插值、嵌套合成与羽化；
- 参考图对比、视觉回归与 Agent 质量评估闭环。
