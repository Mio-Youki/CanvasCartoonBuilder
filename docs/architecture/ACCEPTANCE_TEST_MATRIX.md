# 验收测试矩阵

> “通过”必须附带层级。单元测试通过不能替代真实编辑器工作流。

Legacy → v4 的能力级状态、同页对照与性能门槛另由 [V4 Parity 测试计划](V4_PARITY_TEST_PLAN.md) 和 [机器迁移矩阵](V4_MIGRATION_MATRIX.json) 管理；本文件的 L/H 层级不替代迁移完成状态。

## 1. 测试层级

| 层级 | 证明什么 | 不能证明什么 |
|---|---|---|
| L0 静态 | 文件存在、语法、镜像、字段与加载顺序 | 点击和画面有效 |
| L1 Scene | schema、默认值、迁移、保存往返 | Runtime 视觉正确 |
| L2 Runtime | 固定 `t` 的像素结果与确定性 | 编辑器接线正确 |
| L3 编辑器集成 | UI 操作写入正确 Scene，当前预览改变 | 独立交付一致 |
| L4 交付闭环 | 保存重开、测试 HTML、PNG/GIF 与预览一致 | 主观视觉质量 |
| L5 性能 | 目标画布/效果组合下帧时间和内存预算 | 所有设备都相同 |

以后报告必须写成“L0/L1 通过”等明确口径；只有 L0–L4 均通过，才可称用户功能通过。

桌面 Host 额外增加 H 层，不用 L0 静态检查冒充原生闭环：

| 层级 | 证明什么 |
|---|---|
| H0 | JS invoke 与 Rust command 名称、参数、版本和分发白名单一致 |
| H1 | Rust 编译、Tauri capability 与主窗口启动通过 |
| H2 | 原生打开/保存/批量目录选择、取消语义与越界拒绝通过 |
| H3 | 引用 Scene 同目录图片的案例无需重连即可生成自包含测试页 |

当前 H0 自动验证通过；H1 已在 Windows 开发机以 Rust 1.98.1、Tauri CLI 2.11.4、Visual Studio Build Tools 17.14 完成 `cargo check`、release EXE 构建与进程存活烟雾测试。H2 的路径穿越、产物名、编码和旧示例前缀兼容已有 4 项 Rust 单元测试通过。2026-09-14 已在桌面版手动完成 H3：`karsten-cloud-drift.js` 的相对图片可直接载入，并能完成自包含测试场景交付。原生对话框的取消语义与批量目录交付仍保留为发布前 H2 人工检查项。

## 2. 新能力的最低用例

每项功能至少覆盖：

1. 默认关闭，无视觉变化。
2. 首次开启，数据创建、控件展开、当前帧变化。
3. 参数变化，数据和画面即时变化。
4. 与同级能力叠加，顺序符合合同。
5. 时间轴不同时间点求值正确，循环首尾闭合。
6. 撤销/重做、保存/重开不丢失。
7. 测试页面与固定时间导出一致。
8. 旧字段迁移与不支持 Runtime 的显式失败。

时间轴相关能力还必须覆盖非等分 `sceneBorders`、Scene 边界恰好命中后一段、普通时段边界恰好命中后一段，以及循环时间回绕。`editor/timeline-model.js` 是这些规则的可执行唯一实现；静态验证和浏览器夹具均应直接调用它，而不是复制算法。

## 3. Sampling Motion 矩阵

| 用例 | L1 | L2 | L3 | L4 |
|---|---:|---:|---:|---:|
| 像素沸腾独立启用 | 必须 | 必须 | 必须 | 必须 |
| 阈值呼吸独立启用 | 必须 | 必须 | 必须 | 必须 |
| 网点游移独立启用 | 必须 | 必须 | 必须 | 必须 |
| 颗粒潮汐独立启用、空间移动与循环闭合 | 必须 | 必须 | 必须 | 必须 |
| 不均采样内的采样场切换 wave / radial 并立即披露对应参数 | 必须 | 必须 | 必须 | 必须 |
| “轮廓稳定、内部翻涌”一次组合 uneven.field / uneven.edge / uneven.motion | 必须 | 必须 | 必须 | 必须 |
| 任意两项与四项叠加 | 必须 | 必须 | 必须 | 必须 |
| 共享 `show` 时段 | 必须 | 必须 | 必须 | 必须 |
| 修改采样格后的静态刷新 | 必须 | 必须 | 必须 | 必须 |
| 旧 `sampleJitter/imageFx.motion` 迁移 | 必须 | 必须 | 必须 | 必须 |

`tests/editor-e2e.html` 已提供无需第三方依赖的真实浏览器夹具：在隐藏编辑器中载入场景、经实际 Inspector 点击先独立启用颗粒潮汐、比较两个时间点的预览像素，再启用全部四项并切换 Draft，并执行序列化/重载。它也验证普通动画、全局 FX 与绑定局部 FX 在第一次勾选后立即披露参数；未绑定局部 FX 会同时成为结构树、统一 Inspector 与下时间轴的上下文，参数编辑和创建都可单步撤销。夹具同时断言预览质量状态没有泄漏进 Scene，覆盖 Sampling Motion 的代表性 L3 与部分 L4；测试 HTML 下载、PNG/GIF 文件内容仍待自动化。在覆盖完整前，不得把静态正则检查描述成端到端通过。

## 4. 性能基线场景

保留三档固定夹具并记录浏览器、设备和时间：

- S：320×180，8 个元素，1 个局部效果；
- M：960×540，20 个元素，2 个局部效果；
- L：1920×1080，30 个元素，Sampling Motion + 蒙版 + 全局调色。

分别记录平均帧时间、P95 帧时间、主线程长任务、工作像素估算和导出每帧耗时。首次测量用于建立基线，不在无数据时承诺固定 FPS。

当前舞台状态栏已提供 Runtime P95、目标预览帧率与工作像素估算。工作像素采用 `Σ(area / effectivePixelDiv² × passes)`，属于成本提示而非浏览器计时。Phase 9 已由 `tests/browser/v4-preview-performance.mjs` 建立对象胶囊 + 场景滤镜 S/M/L 管线压力基线；上述 8 / 20 / 30 元素的完整产品负载仍保留为粒子与代表作品进入后使用的容量验收，不是 Phase 9 的重复门禁。

v4 编辑预览已先通过 [V4_PREVIEW_PERFORMANCE_CONTRACT.md](V4_PREVIEW_PERFORMANCE_CONTRACT.md) 的 P0 静态 1920×1080 回归：播放头移动不等于主 Canvas 每帧重绘。`tests/vnext-preview-scheduler.mjs` 覆盖静态跳绘、Step 段边界和 Linear / 粒子 / 多帧连续重绘的纯调度合同；真实浏览器夹具同时记录 Player、Canvas backing-size、Surface、每秒重绘、工作像素与 RAF P95，以区分 Runtime 算法成本和编辑器调度回归。

Phase 9 的正式组合入口为 `npm run verify:phase9`。其中动态压力夹具必须证明 Draft 快于 Full、工作像素至少下降 65%、输出 Canvas 尺寸不变、预览状态不进入 Scene，并让 Auto 在真实超预算场景中实际切换；绝对毫秒只用于同机回归。

`tests/runtime-performance.html` 提供可重复的像素压力子基准：M（960×540）与 L（1920×1080）各自运行 Full / Draft，并报告 P95、平均绘制时间、Runtime 实际工作像素、Sampling Motion 帧缓存命中和最大单张离屏面积。它有意使用单张满画布图片隔离像素处理成本，不替代上面的完整 S/M/L 场景夹具。结果必须记录设备/浏览器，不能跨设备直接比较。

2026-09-14 当前 Windows 开发机、Edge 153.0.4234.32：M Full P95 22.2ms / Draft 9.6ms；L Full 21.8ms / Draft 10.9ms。该次运行包含四项 Sampling Motion、共享 wave field、Alpha edge、全局色板与新增空间/距离图缓存，只作为本机后续回归基线。

## 5. 显式场景 GPU 实验接线

`tests/browser/v4-gpu-player-lifecycle.mjs` 覆盖真实 Player 的白名单画面、范围蒙版、Step 控制器／效果参数、暂停来源版本缓存、修改／撤销失效、seek、尺寸重建、独立 Player 隔离、无 WebGL／上下文丢失／不支持完整链的 CPU 回退、清缓存恢复、双 Scene 离屏与上下文复用，以及一次性绘制资源释放。默认场景后端不自动切换。它是正确性与生命周期验收；隔离 GPU timer query、真实 Player 全帧预算、宿主版本／释放、Tauri 和导出自动后端均不能由此代替，详见 [接线合同](V4_SCENE_GPU_EXECUTOR_CONTRACT.md)。

`tests/browser/v4-gpu-player-performance.mjs --write-report` 首轮测真实 Player 的 640×360／1920×1080 单 Scene、动态引用范围、双 Scene 动态范围淡入淡出；分别记录完整调用主线程时间、RAF 节奏、同 WebGL 上下文 query、资源复用和固定时刻画质。断言保证实际走 GPU、两侧上传计数完整、无新增纹理／backing 写入／GL 错误及画质阈值；不以短测性能作为跨设备闸门，不替代长时、整链、编辑器 UI、Tauri 与导出验收。结果及读数限制见 GPU 验证记录。

该基准现在可用 `--canvas-transition` 与显式 GPU 最终转场对照，保存各自报告不覆盖首轮数据。生命周期夹具另覆盖透明四向 wipe／fade／dissolve、转场前后 seek、模拟最终合成失败完整 CPU 重绘、不同工作尺寸及黑场回退。透明画质同时限制直通平均误差与预乘通道最大误差，阈值和原因见 GPU 验证记录；GPU 最终转场默认关闭，正确性通过不等于性能优于 Canvas。

`--profile`／`--profile-api` 增加不重叠主线程阶段／嵌套 GL API 诊断；`--report-tag=...` 保留前后独立报告。基准逐帧断言阶段总和不超过完整调用时间，API 计时不再加入总和。生命周期另断言普通绘制无诊断字段、开启计时画面不变、固定资源不重复完整性查询、不完整 framebuffer 首次使用完整回退 CPU。诊断计时不能代替 GPU 分阶段设备耗时。

`--gpu-stages` 以互不嵌套的 query 计时每次上传／draw，再逐帧合计同类阶段；每类断言 64 有效样本及完整 query 数，整帧 query 在该模式关闭。`--frame-end-validation` 对照两侧与最终合成在 Canvas 输出前检查一次。生命周期验证检查调用数为 1、逐侧／合并策略画面逐像素一致、GL 错误注入后当帧 CPU 重绘，并沿用透明四向转场矩阵。此实验并非真正异步错误验证，不改变默认入口。

`tests/browser/v4-gpu-source-transport.mjs --bitmap-alpha --write-report` 独立对照 7 种来源／Alpha／静态复用方式，640×360 和 1920×1080、每组 64 帧、正反顺序两轮共 28 组。断言上传／draw 有效样本数、query 数、无 GL 错误／disjoint及固定画质。基础模式 6 路线共 24 组独立保留。该夹具不加载 Player，不能代替对象、蒙版、效果链、表面池或 Tauri 验收；准备位图成本单列，不能声称动态快照免成本。

真实 Player 基准 `--trace-surfaces --repetitions=2` 与 `--fixed-surfaces --repetitions=2` 对照通用池／固定角色策略；记录每角色不同身份、来源／上一目标复用次数、固定角色像素和播放新增分配。固定角色断言稳定身份、零复用别名及零播放角色分配；通用池如实记录而非预设稳定结论。生命周期夹具覆盖固定角色不进入 free 池、角色间隔离、尺寸替换不累积、clear 后重建、Step 采样尺寸变化和透明四向转场；默认池路径仍分别验收。短测无明显提速不视为性能通过。

`v4-gpu-player-interleaved-playback.mjs --block-frames=450 --write-report` 同页常驻四个 Player，平衡交错16段、共7200帧，分开记录启动初始化、最初60帧、后续帧、片段恢复帧、RAF 参数间隔与实际回调到达间隔；原始样本随报告保存。逐帧断言 GPU 两侧及最终合成、预热后零新增纹理／角色和零 backing 重设，最终CPU视觉对照及全部上下文释放。该夹具共享短测的 `fixtures/v4-gpu-player-fixture.js`，属于重复转场压力，不替代自然播放、呈现帧率、Tauri、完整整链、休眠恢复或内存峰值验收。

`v4-gpu-player-threshold.mjs --write-report` 验证场景阈值单卡／不均采样两卡，采样格1／3／4、奇偶尺寸、阈值呼吸、Step／seek、独立矩形／椭圆／Alpha／明度／引用及反相范围、透明转场、缓存／修改／撤销、第二卡故障完整CPU回退与非白名单预检。8-bit灰阶及独立穷举的精确彩色亮度临界点逐像素对照，普通结果同时限制平均误差与预乘最大误差，透明最终转场单独隔离量化。真实预算入口增加 `--with-threshold`；多卡阶段query标签尚未扩展，禁止与 `--gpu-stages` 合用，防止误报阶段。

`v4-gpu-player-noise.mjs --write-report`验证真实杂色单卡／三卡链、动态／Step／seek、周期闭合、暂停缓存、查表复用及第三卡故障CPU回退。预乘修复后透明／不透明照片96组逐像素一致，另有算术边界8组、Alpha／明度反相／引用范围；默认即限制预乘最大差≤3、异常点为0、最大Alpha差≤1，`strictTransparentParity:true`覆盖全部矩阵而非原单例。透明GPU最终转场单独记录最多1/255量化差，不放宽旧阈值门禁。`v4-gpu-noise-alpha-diagnostic.mjs`断言杂色、范围后、阈值输入字节一致；仅测试诊断读回，非性能或生产路径。真实预算加`--with-noise --with-threshold`，检查无范围三卡8道、有范围11道／双侧转场23道，预热后范围上传5／10次；首次／Step查表和额外混合成本须记录。四Player短版交错1024帧通过，不替代长稳。详情见[透明字节修复](V4_GPU_ALPHA_BYTES_2026-10-15.md)。

`v4-gpu-player-dispersion.mjs`覆盖格1／3、三类边缘、单／四卡、透明／不透明共24组，严格亮度差24的灰阶图八组、Step／seek与第四卡注错CPU回退。`v4-gpu-player-tint.mjs`覆盖三种原生混合、格1／3、单／五卡、透明／不透明／fade共48组，另有CSS／blink、Step／Linear／seek；实际frame颜色／Alpha变化另断言，未支持混合预检零分配CPU画面一致。均保留最大预乘差≤3、最大Alpha≤1门禁，不以均值掩盖错点。真实预算`--with-tint --with-dispersion --with-noise --with-threshold`统计五卡15／20道及双侧41道、上传1／6／12次；染色按全尺寸overlay而非采样格处理。多卡禁止旧gpu-stages标签，默认后端不改，详见[五卡接线](V4_GPU_TINT_DISPERSION_PLAYER_2026-10-15.md)。
