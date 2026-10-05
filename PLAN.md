# 工具路线图（tools/PLAN）

> 独立于游戏本体的 ROADMAP。按"低成本高确定性 → 体验升级 → 规模化"推进。

## 文档同步约定

- 目录归档、版本同步与双仓库提交边界以 [DOCUMENTATION_PROTOCOL.md](DOCUMENTATION_PROTOCOL.md) 为准。
- **README**：只描述用户已经可用的工作流、入口、格式与限制；用户可感知的能力变化必须同步。
- **SCENE_SPEC**：保存格式、字段语义、Agent 输入输出或兼容规则变化时必须同步。
- **PLAN**：开始规划时新增条目；完成后移入「已交付」，不把未实现能力写成现有能力。
- **CHANGELOG**：每个实际完成的版本记录用户可感知变化、兼容性与迁移提醒。
- 只改内部实现且不改变格式/行为：仅记 CHANGELOG（必要时）；改 Scene 格式或 Agent 协议：四份文档同时更新。

> Agent 生成试验的过程、共识与待决问题见 [AGENT_WORKFLOW_STATUS.md](docs/agent/AGENT_WORKFLOW_STATUS.md)。
> 蒙版与局部 FX 的已交付范围、运行顺序与明确非目标见 [MASK_AND_FX_STATUS.md](docs/architecture/MASK_AND_FX_STATUS.md)。

## Phase 9 已完成：处理管线与场景滤镜

- [x] Phase 9.0 合同校准：清理过期迁移状态，冻结 Step / Linear 参数规则，并让 `linear-safe` 颜色获得确定性 sRGB 插值。
- [x] 统一对象蒙版与场景滤镜范围的状态组件、校验、Runtime 解析和 Inspector；支持矩形 / 椭圆 / 多边形 / Alpha 素材 / 元素或组引用，并以 `sourceVisibility:'keep'|'mask-only'` 显式控制来源显示。元素引用、保存重开及真实 Edge 已验收。
- [x] 将统一蒙版接入 Legacy 同款绿色 Canvas 框选 / 点选编辑：矩形、椭圆与 Alpha 范围可重绘、移动、缩放，多边形可点选重绘、拖点、点边插点和删除顶点；对象与场景滤镜共用同一控制器。
- [x] 接入对象 `mask / decorate / sample` 大阶段排序与左侧效果容器；阶段内部继续使用 Registry 固定顺序。容器仅在 v4 会话显示，与素材库互斥展开；启用效果自动入列，卡片可定位 Inspector / 时间轴并统一停用，Pointer 拖动只改变三大阶段。
- [x] 将 v4 区域后处理的数据与 Runtime 统一为“场景滤镜 + 范围蒙版”，不再创建 `fx.layers[]` 或伪装继承对象 z；范围蒙版已复用对象蒙版组件并通过 Inspector / 保存往返验收。
- [x] 让效果容器、Inspector、上下文时间轴和 Canvas 预览严格同步，并覆盖撤销、清理、保存重开与自包含测试页。对象效果、共享控制器、对象蒙版与场景效果卡均已覆盖导航、对应轨道、统一清理和重开恢复；阶段调序、撤销及自包含固定时间画面沿用同一 v4 Scene 验收。
- [x] 完成 Phase 9 性能与真实 Edge parity：除 1920×1080 单静图 300 帧近零重绘门禁外，新增对象胶囊 + 场景滤镜 S/M/L 动态压力夹具；Draft 按工作量使用 2× / 4× / 8× 最近邻工作降采样，真实 Auto 会在持续超预算后切至对应 Draft 倍率，测试/导出仍固定 Full。重像素遍叠加时 Full 是保真压力基线而非实时承诺，其当前边界已写入性能合同；Legacy 局部 FX 保持冻结，旧工程转换留到 Phase 10。
- [x] 收掉 Phase 9 可见体验缺口：成样参数右侧恢复程序动态入口，支持对象/组/图元的漂浮、滚动、呼吸、旋转、摆动和闪烁；Registry 效果卡恢复自己的运动入口。场景成样页补齐可见底色、图片背景层和按 Scene 段保存的入口过渡，且由真实 Edge 覆盖 UI→Scene→Runtime 路径。

Phase 9 的关闭条件由 `npm run verify:phase9` 固定：快速合同、Legacy / v4 真实 Edge parity、静态 1920×1080 门禁及动态 S/M/L 压力预算必须连续通过。此后对效果管线或预览预算的修改不得只更新 Runtime，必须同步该组合门禁与 [预览性能合同](docs/architecture/V4_PREVIEW_PERFORMANCE_CONTRACT.md)。

## 当前迁移阶段：Phase 10（进行中）

- [x] 完成粒子第一条纵向闭环：结构树标题入口可新建默认粒子或把当前普通对象粒子化；粒子使用单页 Inspector，复用雨 / 雪 / 火星 / 光尘预设并动态引用实体视觉；发射、运动与外观参数使用对象稳定 id 的 Step 轨。Runtime、保存重开、默认预设私有实体级联清理及真实 Edge 已通过。粒子 S/M/L 性能预算与 Legacy 的多帧粒子年龄播放仍待单独迁移，不在本项冒充完成。
- [x] 为粒子建立独立 S/M/L 动态性能夹具：覆盖 40 个矢量粒子、140 个图片粒子、2×400 个带对象处理的图片粒子，并锁定“每个发射器每帧只构建一次共享视觉胶囊”、私有来源不重复绘制、连续帧不重写 backing、Draft 只降低来源像素处理而不减少粒子数量等不变量。当前 L 档 Full / Draft P95 为约 37.2ms / 22.6ms；粒子数量的 blit 成本不会被工作降采样隐藏。
- [x] 建立受控 Builtin Registry 第一纵切片：`pixel-star / pixel-cloud / train-beam` 具有稳定 id/version、参数 schema、固定时间确定性绘制、时间依赖声明、Inspector、Step/Linear 白名单、保存重开、真实 Edge 与 Agent manifest；任意 `program.code` 仍不进入 v4 JSON。后续新增构件必须沿用同一注册合同与视觉基准，不能在 Scene 内携带函数。
- [ ] Legacy → v4 转换器已完成数据核心和无阻塞工具栏闭环：直接转换、builtin、图片冻结 API 与阻止项均进入版本化逐项报告，真实 Edge 验证不会覆盖原 JS；仍需补逐项冻结预览/确认 UI、旧粒子与 `fx.layers` 人工决策，所以本项尚不冒充完成。

## Phase 8 已完成：Scene 与时间轴

- [x] 将对象显示窗口从属性时序中分离为 `timeline.visibility`，默认全程可见且读取不落盘。
- [x] 固定时间 Runtime 支持对象显示时段，并让组的不可见状态传递到子对象。
- [x] 在 Classic Shell 复用原上下轴，完成对象显示时段的 Alt 切分、双击显隐、边界拖动、播放头与单历史闭环。
- [x] 迁移 v4 Scene 标签段及两端 / 内部插入、删除、改名、跳转和边界拖动。
- [x] 将对象属性 Step / Linear 接入同一上下文轨与 Inspector；Linear 端点由相邻 Step 动态解析。
- [x] 让单对象 Canvas 直接移动 / 缩放 / 旋转在当前参数时序中使用同一写入边界；多选暂保持基础变换语义。
- [x] 接入 Registry 对象 / 场景效果卡的独立时间轴、Step 覆层、Linear 字段白名单与停用清理。
- [x] 接入共享采样控制器的 Inspector / Step 时序、Runtime 固定时间求值与重置清理。
- [x] 统一保存重开 / 自包含测试页验收，并将 Preview Scheduler 接入 Classic Shell 正式播放路径；静态 Step 区间跳过无效重绘，Workspace 按修订复用 Runtime Player。

## 当前工程主线：v4 Classic Shell 迁移

- 权威计划为 [v4 Classic Shell 迁移总规范](docs/architecture/V4_MIGRATION_MASTER_SPEC.md)，机器状态只记录在 [V4_MIGRATION_MATRIX.json](docs/architecture/V4_MIGRATION_MATRIX.json)。
- `img2asset-layout-v1.html` 冻结为 Legacy 行为基线；`img2asset-v4-classic.html` 从其逐字节副本开始迁移；`img2asset-vnext.html` 仅保留为 schema / Runtime / 性能实验台。
- `img2asset-v4-classic.html` 现普通打开即进入 V4，`?legacy=1` 只用于 parity 对照；对象 Inspector 使用“成样 / 加样 / 采样”，场景 Inspector 使用“成样 / 叠加滤镜 / 采样滤镜”，左侧效果索引显示当前对象或场景已启用的 Registry 效果。Tauri 入口仍待全部 P0/P1 门禁通过后再切换。
- 除差异白名单中的 v4 Scene、`mask / decorate / sample` 管线、区域效果表达、builtin 与无感性能内部实现外，全部操作与视觉反馈必须继承 Legacy，不重新设计。
- 当前阶段只建立基线、真实浏览器 parity、Facade 与双会话边界；首个纵向闭环完成前冻结新增产品功能。Tauri 默认入口继续使用 Legacy，直到全部 P0/P1、视觉与性能门槛通过。
- Phase 7 当前已完成 v4 普通矢量实体创建、圆角 Runtime、基础外观 Inspector、可编辑文字 + 透明 PNG 播放回退、有序多帧入库/播放参数，以及对象内 Parts 的 Runtime / 纯状态 / 树 / Inspector / 命中 / 单图元青框变换首闭环；同父图元 Ctrl 多选、Ctrl+A、Esc 分层退出及联合移动/缩放/旋转/镜像已进入 Edge 验收，并通过两层旋转/非等比父组链、组合对象序列化重开像素一致性和多帧图片 + parts 绘制顺序用例。单图形与 part 已共用 Legacy 复合 Paint 面板，覆盖路径描线、纯色、独立 Alpha、1–3 层线纹、点纹、棋盘、纹理预览和画布锚定缓存。外部字体采用“Scene 只存连接、文字始终存透明 PNG 快照”的轻量边界，浏览器导入与 Tauri 字体白名单已验收。`npm run verify:phase7` 已把纯状态、Runtime、桌面合同与真实 Edge 合为一条门禁并通过；下一步只记录新桌面进程中的字体授权/重连边界，然后进入 Phase 8 时间轴。
- 多 `parts` 不以 group 子实体替代；其父对象局部坐标、稳定 part id、主体后覆盖、整体效果合成与分层编辑门槛已冻结在 [V4_PARTS_MIGRATION_CONTRACT.md](docs/architecture/V4_PARTS_MIGRATION_CONTRACT.md)。Runtime → Parts State → 树/Inspector → Canvas 逐层命中 → Edge Paint 验收已完成；接下来只沿该合同补齐复杂父组与字体资源边界。

## 当前产品验证主线（Patcharium / 拼好景）

当前工作名称为 **Patcharium / 拼好景**；技术仓库名暂不迁移。发布首先是“作品展示优先、工具公开测试随后”，不把尚未验证的内置 Agent 作为现有卖点。完整叙事见 [PRODUCT_NARRATIVE.md](docs/product/PRODUCT_NARRATIVE.md)。

### P0 —— Agent 协作稳定性与三案例验证

目标是验证「参考/文字 → 结构化初稿 → 编辑器局部修正 → 自包含 JS / 测试页 / 帧导出」闭环，而非追求一次生成完美重绘。

1. **固定三类能力分支**：C1“从描述起景”输出完整 Scene Draft；C2“从图片拆素材”输出经审阅的派生素材包，不继续制作正式 Scene；C3“用素材拼场景”以用户选中的确认素材输出完整 Scene Draft。雪花球、Karsten 与粗糙波普只作为各分支的首批案例，不等同于能力定义。
2. **Agent Tool Protocol**：实现并验证读取 Scene、固定时间预览、对象定位、声明式 Scene Patch、保存前校验与可撤销修改；详见 [AGENT_TOOL_PROTOCOL.md](docs/agent/AGENT_TOOL_PROTOCOL.md)。
3. **生成质量门槛**：分别验收构图、层次、色板、可编辑项、Runtime 兼容、保存往返、导出一致性与性能；解析成功不等于视觉验收成功。
4. **视觉回归基础**：为固定时间帧建立参考图、差异/人工审稿记录与预算指标；不把截图对比误写为 Runtime 的一部分。
5. **Agent 创作 Skill**：已建立 `skills/tosampool-create/` Router 骨架，按需加载起景/派生/编排，并为三条分支提供共享参考图入口。下一步把单个 `reference` 升级为带角色的 `references[]`，把只接受完整 Scene 的 build 协议改为 `scene-draft / derived-asset-plan / derived-asset-review / derived-asset-bundle` 联合类型，再连接编辑器审阅 UI 与行为评测。
6. **已完成像素化语义收口**：对象再像素化、图片采样闪变、局部采样/色板和全局采样/色板拥有明确且不重叠的作用域；背景不再绕过对象采样，四层均与固定时间离线渲染共用 Runtime。
7. **已建立 Sampling Motion 公共控制层**：图片 Inspector 提供可叠加的像素沸腾、阈值呼吸、网点游移与颗粒潮汐；`field` 统一承载 uniform/wave/radial 空间运动，`edge` 首版以 Alpha 距离保护轮廓，“轮廓稳定、内部翻涌”作为组合预设复用既有原语。后续可在同一 field 接口增加噪声场与蒙版控制，无需继续增加平级效果类型。普通动态参数的任意关键帧不在本阶段引入。

P0 完成后才评估内置对话、桌面项目层与正式仓库改名；内置对话必须复用同一 Agent Tool Protocol，不得创建另一套编辑语义。

## ✅ 已交付（v1.0~v3.0，见 CHANGELOG.md）

### v3.0 —— 通用场景模式

- 启动即创建 `GENERIC_SCENE`（320×180、单场景、完整 Runtime），不再进入功能受限的空装配模式。
- 通用场景与项目脚本场景共用图元、图片、粒子、FX、转场、场景段和时间线；`HOME_SCENE` 仅保留为既有项目脚本的运行时兼容名称。
- 新增「新建场景」与「+ 粒子」入口；`GENERIC_SCENE` 可保存、再次打开并保持全部可编辑数据。
- 背景支持透明 alpha；粒子实体支持图元或图片素材（稳定 `imageId` 引用、静态 sprite 帧），共用离屏精灵缓存与确定性运动。
- 图片粒子支持 `particle-age`：每颗粒子独立按生命周期播放 sprite sheet（可设帧率与循环）。
- 素材处理增加输出尺寸与默认比例锁定；“由图片建立”可直接选择外部文件，并在独立处理弹窗完成处理与预览后建立背景层；背景层可独立排序，持久保存原状居中 / 拉伸 / 重复纹理三种画布自适应规则。
- 采样分辨率与输出尺寸解耦；背景层不可由画布选中，支持隐藏/显示，卡片顺序与画布叠放顺序一致。
- 多帧素材以内部 sprite sheet 存储、以单帧动画预览；多文件导入按选择顺序、第一帧尺寸统一规则处理，外部背景入口同样支持多选。
- 画布编辑控件按屏幕像素固定大小；缩放复位使用缩放徽标/`Alt + 双击`，普通双击仅用于元素编辑。
- 编辑控件使用独立高 DPI Overlay；时间轴场景名与刻度数字以 DOM 标签层置于轨道上/下方，Canvas 专注交互图形。
- 图片与 parts 采用统一的局部组合变换：四角缩放、镜像均保持相对布局；元素与 parts 均按画布前后顺序展示，使用同一插入式拖拽语义调序；选中图元会保持父卡片展开并可在顶部填充/描边栏直接改样式。
- 多选与父级组：图片、矢量和稳定 id 程序 parts 元素共用 Ctrl/Cmd 多选、Ctrl/Cmd+A、Esc/空白处退出；父级组以稳定成员 ID 保存、收纳成员卡片，Canvas 成员选择会定位卡片。静态组操作落回成员；组动画以逐成员矩阵实现，不增加 Runtime 图层。元素级硬边阴影/外描边也已作为轻量 Runtime 样式交付。
- 保留 `SCENE` 旧装配器格式与 `HOME_SCENE` / `DEFAULT_HOME_SCENE` 脚本导入，避免破坏既有作品。

像素化管线（缩放/减色/去背景）、场景画布拖拽装配、滚动/闪烁/脉动、自包含导出（保留于装配保存，导出 UI 已移除）、场景层预览（home-scene 叠底）与尺寸跟随、**打开/保存 js（页面内修改闭环）**、**home-scene.js 参数化**（元素参数 + `images` 素材层 + `show` 显示条件 + z 图层 + 多帧）、**PS 式图层列表**（收起/展开/拖拽排序/内部滚动）、**时间轴**（点击/拖动跳转 + show 时段色块 + 超采样清晰渲染）、**多帧素材（sprite sheet）**、**v1.4 界面重构**（全局设置上移顶部工具栏单行带字段名 / 播放键靠右 / 右侧纯图层栏占满页面 / 保存 js 移至图层栏右上角 / 素材参数卡片展开中文说明表单 / 画布点击自动定位卡片 / 卡片隐藏·删除按钮（z 与箭头移左）/ 删导出区 / 时间轴通用化 + 保留 SCENE 划分）、**v1.5 参数轨道 + 场景内建**（常量↔按场景数组参数模型 + `val()` 统一取值、场景栏增删改名 / 时间轴边界拖拽 / loop 联动 / 数组自动同步、按场景数组逐场景编辑 + [S]/[常量] 按钮、SCENE_SPEC.md 生成规范 + 打开 js 规范自检、拖拽重排同步卡片顺序）、**v1.6 跟随时间轴 + 单值编辑 + 显示时间弹窗**（图层栏随播放头场景显示单值、每行小 [s] 开关（关=常量/开=单场景槽，导入数组自动激活）、show 统一为按场景窗口数组 `[null|[[f0,f1],…]]`（场景内 0~1 比例，可多段）+ legacy 自动迁移、卡片头 [S] 逐场景显隐 + **场景内多段窗口条**（PS 渐变条式：加段/移动/缩放/删除，显示秒数存比例）、场景 chip 点击=切编辑场景+跳播放头、[隐藏] 独立调试层（不碰 scene 可见性，导出写 hidden:true）、暂停态编辑即时生效（refreshStage）、SCENE_SPEC v2 常量优先生成）、**v2.0 图元层 + 矢量绘制**（黄框双击进编辑 / 四角缩放 / 旋转手柄 → `part.rot` / Ctrl 多选 / AI 式描边填充 / 图元坐标拖拽 / 程序元素叠加 / 单编辑锁定 / 热键系统 / 撤销 5 步 / 包围盒归一化 / 修复见 CHANGELOG）、**v2.1 选中框统一**（黄框旋转手柄修复（先于框内命中）+ 图片元素旋转/翻转 `e.rot`/`e.flipH`/`e.flipV`、镜像新语义 = 翻转参数 + rot 取反（图元级/元素级/图片统一）、选中框 `[|]`/`[一]` 镜像按钮（7×7，旋转 ● 上方/中心右侧）、[编辑] 面板镜像按钮移除、统一选中框 drawSelBox 一套绘制逻辑（图片/程序/矢量/子图元共用，子图元仅颜色不同））。

## P1 —— 第二版（体验升级）

### ToSampool 效果系统重构（v4 迁移中）

> 语义合同见 [EFFECT_SYSTEM_VNEXT.md](docs/architecture/EFFECT_SYSTEM_VNEXT.md)；Inspector 与左侧容器蓝图见 [INSPECTOR_EFFECTS_VNEXT.md](docs/design/INSPECTOR_EFFECTS_VNEXT.md) / [EFFECTS_PANEL_VNEXT.md](docs/design/EFFECTS_PANEL_VNEXT.md)。`editor/effect-registry-vnext.js` 与派生 [EFFECT_MANIFEST_VNEXT.json](docs/agent/EFFECT_MANIFEST_VNEXT.json) 是 v4 唯一效果元数据源。v4 Runtime、效果卡、时序与统一蒙版已进入 Classic Shell 纵向迁移；Legacy 产品入口和旧 Scene 格式保持冻结，不与 v4 双写。

1. **冻结与验证元数据**：维持 vNext registry → manifest 的确定性派生和 `npm run verify` 过期检查；为 ID 唯一性、参数类型、阶段/作用域、性能等级与配方引用增加静态合同测试。
2. **统一蒙版 schema**：先重做对象蒙版与场景滤镜范围的共用组件、运行时解析和 `sourceVisibility:'keep'|'mask-only'`，消除旧“引用即隐藏”的隐式规则。
3. **引入新 Scene 效果声明与序列化器**：为 vNext `effects` / `pipeline` 建立新建场景格式、validator、serializer 和 capability 版本；不长期维护旧 `fx.layers` 的双语义，迁移前冻结样例并提供一次性工具或明确新建入口。
4. **Runtime 管线适配**：先实现对象离屏胶囊、`mask → decorate → sample` 默认流水线、三个阶段整体调序与场景 `overlay → sample`；把纹理、投影、描边、内外光效收敛为共享原语。
5. **采样原语重做**：按 `color-map → threshold/noise → offset-sampling → halftone → uneven-sampling` 接入；`offset-sampling.boil` 必须是真正的格子级确定性微偏移，`bands` 是条带坐标重取样，不能退化为对象整体 bob。
6. **Inspector 与左侧效果容器迁移**：从 registry 生成启用/渐进披露/颜色/纹理/蒙版控件；接入“效果”容器、阶段排序、卡片 → Inspector → 编排器的严格同步，并移除旧属性/局部 FX/采样运动的重复入口。
7. **时间与运动收口**：效果卡拥有稀疏时段覆层和程序运动开关；Linear 只允许 registry 明示的字段，调色四轴和采样控制器保持 Step。补全撤销、删除效果时的覆层清理与保存往返测试。
8. **粒子、性能与 Agent 验收**：Phase 9 已完成对象胶囊 + 场景滤镜的 S/M/L 管线压力预算；Phase 10 继续实现共享帧视觉胶囊继承和粒子场景预算。随后让 Agent protocol 读取 manifest、选择 recipe、受预算约束地产出 Scene，再以三案例做视觉与结构验收。

### v4 Classic Shell 迁移基线（先于新增 v4 功能）

> v4 继续作为新的 Scene / Runtime / Effect Core；正式编辑器不再从 `img2asset-vnext.html` 局部缝补，而从 Legacy 体验壳迁移。合同见 [V4_CLASSIC_SHELL_MIGRATION.md](docs/architecture/V4_CLASSIC_SHELL_MIGRATION.md) 与 [V4_PREVIEW_PERFORMANCE_CONTRACT.md](docs/architecture/V4_PREVIEW_PERFORMANCE_CONTRACT.md)。

1. **性能闸门**：已修 v4 静态大图播放时重复 resize、每帧 async Player 与无效 Canvas 重绘；真实 Edge 已覆盖 1920×1080 静态近零重绘、Legacy 对照、对象胶囊 + 场景滤镜 S/M/L 动态压力及 Auto / Draft 实际切换。后续性能工作只由普通作品回归或 Phase 10 粒子预算触发，不再重复建立同一基线。
2. **Facade 边界**：实现 session / scene / selection / transform / structure / assets / timeline / effects / history / preview 的受控入口；新页面不得双写 Legacy Scene。
3. **首个体验闭环**：已从 Legacy 复用工具栏、视口、舞台、结构树、Inspector 与上下时间轴外壳，贯通“导入图片 → 放置 → 选择/变换 → Inspector / 时序 → 保存/重开 → 自包含测试页”的 v4 闭环；继续迁移时仍按纵向切片验收，不在实验页补洞。
4. **新增语义位置**：Step / Linear、v4 Scene 段与新效果只在 v4 实现；Legacy 仅修复既有缺陷，继续作为旧作品入口和体验基线。

实施顺序不可倒置：Inspector 只消费已由 Runtime/serializer 支持的 registry 项；任何新效果必须同时完成 registry、Runtime、Scene 校验、固定帧测试、保存重载和文档同步，不能再只在面板中“看起来启用了”。

- 🚧 **Runtime vNext R0/R29–R42**：隔离实验页只承担 schema / Runtime / 性能试验；正式 Classic 候选只逐项启用通过 parity 的纵向切片。当前 Classic 已贯通图片与多帧预处理、素材库、图片背景、Parts / 绘制 / 文字、Canvas 与结构树同步、多选与组、Scene / 显示时段、对象属性及 Registry 效果 / 共享控制器时序、保存重开和自包含测试页。所有持久写入经 `EditorVNextSceneMutation` 进入 `.tosampool.json`；独显、树展开与 Inspector 焦点仍是临时编辑状态。
- 🚧 **v4 体验等价回归**：v4 不再以“页面出现同名入口”计作迁移完成，正式以 `docs/architecture/VNEXT_PARITY_AUDIT.md` 的闭环验收。Phase 5–9 已进入真实 Edge 连续回归；下一阶段按迁移矩阵处理粒子、Builtin / 旧 JS 转换和导出，不新增未经 Runtime、保存往返与浏览器测试共同证明的表面功能。
- 🚧 **Runtime vNext R0/R32**：`img2asset-vnext.html` 已从“同页 v4 会话”变为纯 v4 页面：保留布局外壳，移除旧 Runtime/场景/控制器依赖与进入/退出切换；对象、效果、素材和时序只写 v4 Scene。Legacy 编辑器继续由 `img2asset-layout-v1.html` 独立承担。下一项是制作独立 `home-scene-v4.tosampool.json` 样例，或设计显式旧 JS 转换向导；不能把现有 `home-scene.js` 直接交给 v4 Runtime。

### 编辑器内核拆分（导出与关键帧的前置工作）

- 设计基线见 [RUNTIME_ADAPTER_PLAN.md](docs/architecture/RUNTIME_ADAPTER_PLAN.md)：先固定时间渲染并让预览/离线帧共用 Adapter，再导出 PNG 序列、按需接入编码器，最后才加入关键帧 schema 与轨道 UI。该顺序保证 Runtime 无重量级依赖。
- 🚧 **架构合同化第一阶段**：已新增编辑器行为、Runtime/宿主边界与 L0–L5 验收矩阵；Runtime 暴露 `apiVersion/capabilities`，编辑器启动时握手，避免新版 Inspector 被旧 Runtime 静默忽略。Sampling Motion 已有自运行浏览器夹具覆盖实际勾选、预览像素变化与保存重载；下一步扩展测试 HTML 与帧文件的 L4 自动验收，再继续拆分控制器。
- 🚧 **性能与桌面产品化**：单一编辑器时钟、Runtime P95/工作像素观测、Auto/Full/Draft、静态大图门禁及对象胶囊 + 场景滤镜 S/M/L 压力预算已落地；Draft 会按工作量以 2× / 4× / 8× 降低高成本像素处理中间分辨率，离线 `renderTo` 强制恢复完整质量。阈值/网点共享像素读取，全局/局部调色共享 CPU 内核；编辑器与 Runtime 缓存槽已隔离。Browser/Tauri Host、Timeline Model、Scene Serializer、Asset Resolver 与 Artifact Builder 已完成第一层接线。下一阶段先处理粒子、Builtin 与旧场景迁移；Worker / OffscreenCanvas 只在普通作品或粒子夹具越过预算时立项，桌面壳本身不承担 Canvas 加速。
- ✅ **Editor Commands / Scene Mutation 主写入收口**：顶部工作流及清选/删除/撤销已由稳定命令 ID 接管；Canvas、编排器上下轴、Scene 操作、结构树、编组/剪贴快捷操作、绘制/文字、粒子创建及主 Inspector 均已接入统一 Scene Mutation。旧元素/粒子卡片、旧局部 FX Controller 和旧 FX 时间轴已删除，业务代码不再直接调用 `pushHistory`。连续颜色/纹理/滑杆和文字输入拥有提交/回滚边界。`redo` 必须等待双栈历史模型，当前不伪装支持。
- ✅ **Inspector 控件与效果注册收束**：Scene Mutation/Undo/Rollback 驱动会话级 `sceneRevision`；普通动画、采样闪变、Sampling Motion 与新版全局 / 局部 FX 共用渐进披露入口。未绑定局部 FX 已迁入结构树 → Inspector → 下时间轴的唯一链路，Legacy Controller 正式退役。色板、颜色与纹理绑定入口已统一；效果顺序、分组、默认值和控件元数据集中在 `editor/effect-registry.js`。“颗粒潮汐”已作为验证原语加入，没有新增专用撤销、刷新或页签控制器。
- ✅ **Sampling Motion 渲染内核去重与一级缓存**：`editor/sampling-motion-kernel.js` 统一波场、边缘保护、颗粒、阈值与网点算法；编辑器预览不再维护 `*Tool` 像素副本。构建脚本将内核原样嵌入 `home-scene.js` 与测试页 Runtime 镜像，保持独立 JS 场景无外部依赖。空间基底与 Alpha 距离衰减图按实体、源帧、尺寸和参数缓存，时间步变化只重算场值；Phase 9 已记录 S/M/L 管线压力基线并验证工作量降采样，Worker / OffscreenCanvas 暂不进入主线。
- ✅ **Tauri Host 第一层**：`src-tauri/` 已实现打开 Scene、原位/另存 Artifact、批量目录写入、素材选择/读取及 Scene 同目录相对素材解析；只接受用户授权路径并拒绝目录穿越。预览与测试冻结共用 Asset Resolver，宿主读取结果通过临时 `_asset` 注入 Runtime，且兼容旧示例的重复 `examples/` 前缀。`scripts/prepare-tauri-frontend.mjs` 以确定性白名单生成最小前端闭包。2026-09-14 已手动通过 `karsten` 相对图片预览与自包含测试场景 H3 验收；发布前只需补齐安装包、图标/签名策略及原生取消/批量交付检查。
- ✅ 第一层：`editor/geometry.js` 承担纯几何变换；`editor/scene-model.js` 承担 parts 归一化与局部包围盒规则。页面仍以 classic script 入口加载，保持 `file://` 双击运行与现有体验。
- ✅ 固定时间离线渲染：`HomeScene` 已提供 `createRuntime(scene)`；它以指定 `t` 向任意 Canvas 渲染而不启动 RAF，也不改预览的 `window.HOME_SCENE`。预览与离线帧已共用 `renderFrame` 绘制核心；通用 Scene 独立 Canvas 冒烟测试已加入。
- ✅ 诊断职责拆分：`GENERIC_SCENE` 的可编辑性诊断、Runtime 兼容性与导出资源提示独立；兼容项目脚本和已注册锁定 builtin 不会因“不符合通用图元合同”而被阻止导出。
- ✅ 帧导出面板：当前帧 PNG、Sprite PNG、多帧 PNG、GIF 共用帧率 + 场景时段采样；提供上限反馈、逐张 PNG 下载与带时间标注的时间采样拼图。拼图仅用于审阅，不能替代将来 `{t,v,ease}` 关键帧轨道。
- ✅ 蒙版与局部合成收口：Runtime 图层与局部 FX 统一支持矩形 / 椭圆 / 多边形 / Alpha / 明度蒙版；粒子发射范围保持独立出生语义。绿色编辑态、Alpha 隐藏素材生命周期、预览/离线导出一致性、绑定元素的 anchor/clip 变换已完成，详见 [MASK_AND_FX_STATUS.md](docs/architecture/MASK_AND_FX_STATUS.md)。羽化、通用模糊、嵌套合成组、布尔蒙版和关键帧蒙版仍为后续能力。
- ✅ 局部 FX 图层化交互：右栏分为“图层元素 / 局部效果”；FX 卡片拥有自身合成排序、隐藏、`[S]` 时段与蒙版编辑，但仍固定在实体层之后、全局调色与场景过渡之前，以保持 Runtime 管线清晰。
- ✅ 局部 FX 统一阶段：所有 `fx.layers` 固定在实体之后、全局采样/调色/色板/CRT/转场之前合成；历史 `phase` 字段由 Runtime 忽略，编辑器打开卡片时清理，避免局部效果走两条不同的后处理路径。
- ✅ 轻量局部覆盖效果：局部 FX 新增不铺底色、硬边分圈像素光晕、局部暗角、确定性噪点与扫描线；均只绘制蒙版范围，不读取整帧像素，也不引入通用模糊。
- ✅ 像素雾与局部像素处理：局部 FX 增加确定性雾带/雾块漂移（不使用通用模糊），并可对蒙版包围盒独立执行最近邻采样、色板 LUT、色相/亮度/对比度/饱和度；复用全局 B 档算法与单张离屏 Canvas，最终仍按局部蒙版和不透明度合成。边缘羽化、通用模糊仍作为后续能力。
- ✅ FX 绑定元素：`fx.layers[].bind` 以稳定 `targetId` 关联顶层元素；anchor 与 clip 都将 FX 自身蒙版相对绑定时刻同步到目标的 scroll/bob/spin/wave/pulse/旋转/缩放，clip 再按目标真实 Alpha 与自身 mask 裁入。仅按需使用目标 Alpha 与 FX 内容两张离屏画布，不改变元素图层数据或 FX 的独立排序/时段能力。通用程序元素合同已强制稳定 `id`。
- ✅ 自包含测试场景：保存按钮旁可下载 HTML 测试页；带 `HomeScene` Runtime 的当前 JS 会连同冻结后的配置/素材内嵌，装配模式使用自身零依赖导出脚本，以检验离开编辑器后的实际运行。
- ✅ Alpha / 明度 / 元素蒙版：`mask.type:'alpha'` 可按 `imageId` 引用素材库图片，在指定画布范围按原 Alpha 或黑透明白不透明的明度裁剪；`mask.type:'element'` 可引用稳定元素或组 id，每帧复用其实际 Alpha、动画与时序作为蒙版，并将来源派生为隐藏。实体图层与局部 FX 共享 Runtime 路径；未来再评估局部包围盒缓存与羽化。
- ✅ 组合粒子与角速度动画：删除“复制为图片粒子”，统一为“复制为粒子”；图片元素自动引用图片，带 parts 的图片自动生成图片 + parts 组合精灵，仍通过每帧离屏缓存复用。`anim.spin:{speed}` 作为稳定的持续角速度原语，与静态 `rot`、wave、pulse 等既有动画叠加，不改变场景层级。
- ✅ 精确画布编辑收口：绘制预览、蒙版提示和选择框统一高 DPI Overlay；Alpha 蒙版首次拖拽放置、场景图片位置继承、Shift 正方/正圆、黄/蓝/绿选择对象的方向键微移（1px / Shift 10px）与元素静态旋转复位已完成。
- 下一层：继续从 7k 行页面控制器抽出选择、结构树、Inspector 与时间轴编排模块，并补测试 HTML、PNG/GIF 内容级 L4 回归；不再复制 Runtime 或改变 Scene 合同。
- ✅ Agent 合同化：`SCENE_SPEC` 收敛为当前可执行子集；生成与改写分别使用独立协议，复用同一 schema；参考图生成固定为「静态基底 → 视觉锁定 → 结构整理 → 动画覆盖」，并以 3:2 河谷静态基底和两幕样例进行验收。
- ✅ 混合参考图路径：高密度静态笔触可由同构图的日/夜图片背景承接，程序层只承担安全区域内的局部动效；链接素材样例在正式交付前通过导入保存冻结为 data URL。基础蒙版已交付；嵌套裁剪组仍列为后续能力。

### 当前推荐顺序（2026-09）

1. **发布基线**：MIT 许可证已补齐；提交当前独立工具仓库，继续补充贡献/安全说明、截图/GIF、Windows 构建与安装/便携发行方式，并完成原生取消/批量交付检查。正式面向普通用户前，必须把兼容 Scene 的动态对象求值改为纯数据解析，并将 `program.code` 放入受限 Worker/沙箱或迁移为已注册 builtin，避免未知 Scene 在主 WebView 执行代码。
2. **P0 Agent 协作稳定性与三案例验证**：证明外部 Agent 能交付可修正的结构化初稿，并让预览、保存、自包含运行与导出一致；第三个粗糙拼贴案例尚未开始。
3. **UI 信息架构与视觉系统收口**：继续梳理 Inspector 渐进披露、图标与交互细节，不改变 Scene / Runtime 合同。
4. **桌面项目层**：在 Scene 与 UI 工作流稳定后增加 Project manifest、可重连 `assets/`、处理配方和个人素材库，不采用 IndexedDB 冒充项目系统。

Agent 验证与 UI 设计可以并行；项目层必须建立在当前 Host/Asset 合同之上，不能回到页面内散落文件路径。

#### UI 信息架构 v1（骨架已实施，细节待收口）

- 以 [UI_RECONSTRUCTION_V1.md](docs/design/UI_RECONSTRUCTION_V1.md) 为实施合同：左侧“场景结构 + 可收起素材库”、中央“工具 + 固定舞台”、右侧“属性 / 动态 / 效果 Inspector”、下方“场景与上下文编排时间轴”。
- ✅ 时间轴 Dock 第一阶段：固定于 Canvas + Inspector 下方、可调高度；上轴为全局刻度/播放头，Scene 标签段承载定位、改名与删除；下轴按 Inspector 上下文派生元素 `show`、局部 FX `show`（以元素有效范围为底带）或 `fx.segs`，继续复用原有 Runtime 格式。
- ✅ 元素 Inspector 顶部的“时序模式”首版：时序是单一写入开关；关闭时会清除播放头所在时段的额外覆层并回归基础值，开启后首次修改才建立独立的 `timeline.tracks[elementId][scene].segments` 属性时段。已有时序数据以常亮按钮、时间轴 `!` 标示；普通段可稀疏覆盖属性，`linear` 段仅对基础数值变换在前后状态间插值；编辑器与独立 Runtime 均优先读取它。单元素画布移动/缩放/旋转已与 Inspector 使用同一写入入口；所有可见元素统一以 `scaleX/scaleY`（UI 为百分比）记录整体缩放。后续扩展至动态与效果参数，并补充关键段操作、值曲线与 Marker；Marker 使用独立 `markers:[{id,t,label,color}]`，不参与 Runtime 绘制。
- 首轮从既有 `elements`、`groups`、`parts`、背景、`show`、`fx.layers`、`fx.segs` 派生结构树与轨道；局部 FX 只在视觉上成为绑定元素子项，不迁移为 `element.localFx`。
- 前置抽离编辑器临时 UI 状态（Inspector / 时间轴焦点、树展开状态），保证既有 JS 场景打开、保存与独立 Runtime 结果不变；`locked` 与时间标签 `markers` 均为后续小增量，不阻塞第一版。

| 项 | 说明 | 预估 |
|---|---|---|
| GIF / 序列帧解码 | 直接导入 GIF 文件逐帧（渲染层已兼容 frames/fps，只需解码环节） | 1~2 天 |
| 动图导出 | ✅ GIF；待接入 APNG / WebP，提供透明表情包与 README 预设 | 2~3 天 |
| 关键帧动画 | 透明度/大小/位移随时间曲线（keyframes），替换简单 blink/pulse（含 home-scene 动态效果参数化） | 1~2 天 |
| 时间轴增强 | 关键帧编辑、素材时段拖拽调整（时间轴上直接拉长/缩短色块） | 1 天 |
| 导出增强 | 可选的场景层快照背景、代码体积压缩、单文件打包 | 半天 |

## P2 —— 中期（规模化）

| 项 | 说明 |
|---|---|
| 桌面应用后的素材与项目持久化 | 在 UI 信息架构与 Agent 合同验收稳定后推进。封装桌面应用后实现项目目录（`scene.js + assets/`）、原图与处理配方可重连、跨场景个人素材库；不采用浏览器 IndexedDB 作为产品方案。 |
| 更多色板与滤镜 | ✅ **v2.7 已交付**：色板统一 PICO-8/NES/VGA/GB（素材减色与 FX 共用 LUT）、故障 glitch/CRT/暗角/噪点（叠加层，强度可调）、色相偏移 + 亮度/对比度/饱和度（单矩阵）、场景过渡（fade/scan/wipe）、降采样 pixelDiv、场景内时段编辑；✅ **v2.8 粒子系统已交付**（元素变体：实体 parts + 运动参数化 + 种子随机确定性渲染；粒子雾 = 雾粒实体可直接实现）；✅ **v2.8补二 dissolve 溶解过渡已交付**（像素噪点溶解显现，配置驱动）；**擦除 wipe 类新过渡与过渡自定义（Agent 注入函数）列为二期** |
| 交互元素 | 点击/悬停反馈（页面落地动画的交互层） |
| 独立分发 | 工具自身打包为可分发单页（可选独立仓库/站点） |
