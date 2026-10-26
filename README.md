# Patcharium / 拼好景

> **2026-10-26设备测试基线**：当前入口为`img2asset-v4-classic.html`。克隆后可通过本地静态服务器打开，无需示例照片；新增[浏览器设备对照页](examples/device-check/index.html)和[同版本／同画质对照说明](docs/architecture/DEVICE_TEST_BASELINE_2026-10-26.md)。下方历史阶段记录不等于当前默认行为，GPU仍以实际后端及验收合同为准。

> 图样页已统一为项目／共享卡片：共享包含只读自带及“我的”，导入回到项目，♡发布、♥悬停更新、×移出不改画布。保存预设、载体选择及绘制取消／撤销沿用同一入口，旧文字管理列表已移除。[P2c使用与边界](docs/architecture/V4_PATTERN_CARDS_P2C_2026-10-22.md)。下一步是树中覆盖排序，不是此项已完成。

> 图样P2b：[路径预设及样例](docs/architecture/V4_PATH_PATTERN_PRESETS_P2B_2026-10-22.md)。刻度／嵌套／元素排布／箭头／括号可通过路径预设保存，元素排布携带独立来源；现有管理入口可导入样例并绘制。项目／共享图样卡仍待P2c，不将内部数据闭环冒称最终面板完成。

> 图样收口开始：[RC5合同及批次](docs/design/PATTERN_RC5_DECISIONS_2026-10-22.md)。P1添加式拓展已接入：未添加时只有添加入口，停用保留参数，×移除可撤销。自定义本体参数保留。项目／共享图样卡、结构树排序和Agent新图样流水线仍在后续批次。

> **最新：素材RC4四项完成。** 组与粒子可作为单张元素卡入库；删除粒子来源不再冻结。收藏Tab移除；素材操作行增加导出画面，位图输出处理后PNG，序列／元素复用导出面板。保存工程包修复共享依赖索引，解压后可通过导入文件夹提取素材。[行为、样例及验证边界](docs/architecture/V4_RC4_MATERIAL_CLOSEOUT_2026-10-22.md)。下方分批记录中的旧待办由此替代。

> 素材卡左下▧可将普通／程序元素烘焙为位图或序列副本；支持取消、撤销，保留原素材。共享卡与项目卡同尺寸／按钮位置；项目♥悬停显示↥，点击更新共享。[行为与验收](docs/architecture/V4_MATERIAL_CARD_BAKING_2026-10-21.md)。下方记录以本批为准。

> 当前素材卡：程序资源包从“导入素材”进入后显示为元素卡，不再单列程序构件。♡共享、♥更新共享、→加入画布、×移出；取消共享只在共享页。位图选中后点击预览编辑。烘焙卡片入口仍待下一批；[本批边界](docs/architecture/V4_MATERIAL_CARDS_RC3_2026-10-21.md)。

素材操作更新：入库后来源对象的“库”变为↥更新，可将画布调整写回原素材；改名不断连，其他实例不变。移出项目素材不删除画布，工程仍保存所需图片／程序依赖。程序授权只在导入／取用时确认，使用时不反复弹窗。见[范围与限制](docs/architecture/V4_MATERIAL_UPDATE_REMOVE_IMPORT_2026-10-21.md)。

> RC3当前：项目／共享素材支持入库、显式发布与统一预览。旧素材包可显式迁入共享；图样管理已放在“图样”下，构件导入／新建与选中构件烘焙已放在“素材 → 项目”。“收藏”暂留完整包导出、混合包、移除恢复与缺失提示，不再承担日常图样／构件编辑。见[入口及边界](docs/architecture/V4_RESOURCE_ENTRY_PLACEMENT_RC3C2B_2026-10-21.md)，下方为此前分批状态。

素材操作行：左侧♡／♥切换项目／共享范围，右侧依次为文件夹、精灵图和素材导入图标；悬停显示名称。范围切换与素材卡内的共享发布是不同操作。

> RC3-b：素材栏新增“项目／共享”范围。选中项目素材可打开“共享”；素材本身变更后通过“更新共享”发布，画布实例不自动回写。共享取用先复制到项目，再独立放置；移出共享不删项目画面。完整缩略图／hover预览和旧收藏入口替换仍待RC3-c。见[边界与验收](docs/architecture/V4_MATERIAL_SHARING_RC3B_2026-10-21.md)。下方a记录为此前状态。

> RC3-a：选中普通／程序元素，点击结构树粒子按钮右侧“库”可收入项目素材库；元素卡“加入到画布”生成独立副本。三个导入按钮已移到素材／图样标题下独立一行。共享发布／更新及完整面板仍待下一批，组／粒子暂不支持。见[操作与边界](docs/architecture/V4_PROJECT_MATERIAL_PANEL_RC3A_2026-10-21.md)。下方旧分批记录以最新计划为准。

> 当前RC2数据范围已收口：[父组蒙版坐标](docs/architecture/V4_ELEMENT_PARENT_MASK_SPACE_RC2C2B_2026-10-21.md)补齐元素脱离父组时的几何／跟随转换，44组浏览器、画布拖动及交付验证通过。以下分批记录中的待办以该合同及总计划为准；组／粒子素材及新素材面板仍未开放。

> RC2-c1增量：[统一蒙版适配与预设重定位](docs/architecture/V4_ELEMENT_PRESET_MASKS_RC2C1_2026-10-21.md)已验证静态／图片蒙版、跟随与反相。未来蒙版扩展共用声明及测试；对象来源、排布／端点和父组坐标仍待c2，无新素材面板。

> 2026-10-21开发状态：[RC2-a独立元素预设](docs/architecture/V4_ELEMENT_PRESETS_RC2A_2026-10-21.md)及[RC2-b资源依赖](docs/architecture/V4_ELEMENT_PRESET_DEPENDENCIES_RC2B_2026-10-21.md)已验证数据API、跨工程复制、保存重开和正式导出；尚无新素材面板入口，蒙版／排布等外部对象来源待RC2-c。

> 2026-10-19：程序构件资源可在“收藏”导入后“新建”，显式确认来源后建立独立参数实例；选中构件后可“冻结当前帧／烘焙序列”生成独立素材，不替换原对象。可试用[雨幕资源包](examples/resources/rain-curtain.tosampool-resource.json)；[R4边界与预算](docs/architecture/V4_MODULE_RESOURCES_R4_2026-10-19.md)。

> 开发状态补充（2026-10-18）：[统一资源合同](docs/architecture/V4_RESOURCE_PACKAGE_CONTRACT_2026-10-18.md)已实现收藏、跨工程取用、静态几何缺失保护及声明式图样的热安装／显式版本应用／停用。试用：左下“收藏”→“导入图样/资源”选择[折线框标](examples/resources/folded-frame.tosampool-pattern.json)。任意代码图样插件、动态程序冻结与自动项目重开不在已交付范围。

> Lightweight Canvas loop-scene editor · 当前为 **Alpha 源码版本**

Patcharium 把图片、矢量图元、粒子、蒙版、效果和时间组织成可持续运行的小场景。作品可以保存为自包含 JavaScript，也可以导出 PNG、精灵图、PNG 序列和 GIF。

它不是视频剪辑器，也不要求把高细节图片完全重绘成代码。图片负责细节，Scene 结构负责值得编辑的运动、层级、调色和局部变化。

## 当前能力

- V4“括号／角标”图样：统一直角／圆弧、左右括号／四角／对角／单角，独立尺寸、粗细与水平／垂直偏移，支持新建和兼容应用。[可直接打开的六例工程](examples/agent-brackets-g4/project.tosampool.json)。

- V4 顶栏“图样”目录：刻度、轮廓嵌套、元素排布支持选载体新建／兼容应用；角点箭头可直接新建自定义图元，或应用到矩形／多边形并保留原类型。
- 普通图元“路径显现”渐进配置完成度及端点，关闭不删除设置；角点箭头支持几何中心／固定角度，以及平头／圆头／尖头。[合同与用法](docs/architecture/V4_PATH_REVEAL_AND_ARROW_SHAFT_2026-10-18.md)。

- 结构树、Canvas 舞台、Inspector 与上下文时间轴；
- 图片、矢量图元、文字、组、粒子和程序元素；
- Scene/时段可见性、基础 Linear 变换与循环动画预设；
- 几何、Alpha、明度与实时元素蒙版；
- 局部/全局 FX、调色、色板与 Sampling Motion；
- 浏览器与 Tauri 共用同一 Scene、Runtime 和编辑器；
- 自包含 Scene JS、测试 HTML、PNG、Sprite PNG、PNG 序列和 GIF。

预览、测试页和逐帧导出共用同一确定时间 Canvas Runtime。桌面壳只负责文件权限和交付，不改变画面求值；Scene JS 可以脱离 Patcharium 放入普通网页。

## 快速开始

### 浏览器

当前有两个明确入口：

- `img2asset-v4-classic.html`：V4 正式迁移候选，普通打开即进入 V4；Inspector 使用“成样 / 加样 / 采样”，左侧提供对象/场景效果索引。Phase 10 已接入粒子单页 Inspector、四类预设、实体动态引用、Step 时序与独立粒子压力预算；受控 Builtin Registry 首批提供 `pixel-star / pixel-cloud / train-beam`，以声明参数替代任意代码执行。
- `img2asset-layout-v1.html`：冻结的 Legacy 产品与行为基线，仅用于现有作品、对照和迁移验收。

浏览器版无需安装依赖；受浏览器文件权限限制，相对图片在生成自包含产物时可能需要人工重连。Tauri 在全部 P0/P1 迁移门禁完成前仍指向 Legacy，不因候选页可直接打开而提前切换。

### Windows 桌面源码构建

需要 Node.js、Rust 1.77.2+ 和 Tauri 所需的 Windows 构建工具：

```powershell
npm install
npm run verify
npm run desktop:test
npm run desktop:dev
```

生成便携 release EXE：

```powershell
npm run desktop:build
```

当前尚未提供签名安装包或 GitHub Release 下载；桌面端属于已通过核心文件闭环验收的源码发行形态。

## 基本工作流

1. 新建空白场景、由图片建立场景，或打开现有 `GENERIC_SCENE` / 兼容脚本。
2. 从左侧素材区导入并预处理图片，或用舞台工具绘制图元和文字。
3. 在结构树调整选择、分组和顺序；V4 候选页在 Inspector 的“成样 / 加样 / 采样”中编辑对象，并由左侧效果索引定位已启用效果。Legacy 入口仍保留原“属性 / 动态 / 局部效果 / Sampling Motion”。
4. 在底部编排器设置 Scene、显示窗口、属性时段和 FX 时段。
5. 保存 Scene，生成自包含测试 HTML，或导出帧产物。

详细操作与格式差异见 [用户指南](docs/USER_GUIDE.md)。

## Scene 与 Agent

`SCENE_SPEC.md` 是 Scene 字段的唯一合同。高细节静态内容可以使用图片或受控 `program.code`；需要调整的部分应暴露稳定 id、边界、少量参数与编辑器 controls。可编辑不等于每个像素都必须拆成 `rect/poly`。

外部 Agent 工作流分为生成、兼容改写和审稿，不要求把全部编辑器能力一次写进提示词：

- [生成协议](docs/agent/AGENT_GENERATE_SPEC.md)
- [改写协议](docs/agent/AGENT_REWRITE_SPEC.md)
- [Agent Tool Protocol](docs/agent/AGENT_TOOL_PROTOCOL.md)
- [典型案例提示词](docs/agent/AGENT_PROMPT_PLAYBOOK.md)

Agent 协作仍是验证方向，不是“一次提示即可完美重绘”的发布承诺。

## 安全提示

当前 Scene 可以包含 `program.code`，兼容脚本配置也允许 JavaScript 表达式。只打开你自己创建、可信 Agent 生成或已经审查过的 Scene；不要把未知来源的 `.js` 当作无害图片文档。正式面向普通用户发布前，程序元素需要进入受限执行环境，兼容配置解析也需要从动态求值迁移为纯数据解析。

## 项目状态与边界

当前版本可作为开发者和早期测试者使用的完整源码产品：编辑、保存、独立运行和主要帧导出链路已经成立。但它还不是面向普通用户的正式发行版，发布前仍缺少：

- 正式图标、截图/GIF、签名安装包和 Release 流程；
- CONTRIBUTING 与安全报告流程；
- Project manifest、可重连 `assets/`、处理配方和个人素材库；
- UI 图标及 Inspector 信息层级的最终收口；
- APNG/WebP/WebM/MP4、通用关键帧曲线和 redo；
- 第三个粗糙拼贴案例及更完整的 L4 视觉回归。

当前优先级见 [PLAN](PLAN.md)，可验证边界见 [验收矩阵](docs/architecture/ACCEPTANCE_TEST_MATRIX.md)。

## 仓库地图

```text
img2asset-v4-classic.html  V4 正式迁移候选；普通打开即进入 V4
img2asset-layout-v1.html   冻结的 Legacy 产品与行为基线
home-scene.js              Canvas Runtime 规范源
runtime-inline.js          由 Runtime 机械生成的测试页镜像
editor/                    编辑器内核模块
src-tauri/                 Tauri Host
examples/                  可导入 Scene；图片资产默认不提交
scripts/                   构建与只读校验
tests/                     浏览器、Runtime 与 Host 验收
docs/                      用户、产品、Agent、架构和设计文档
```

`img2asset.html` 是冻结的历史入口，不再同步新功能。

## 验证

```powershell
npm run verify
npm run desktop:test
```

自动检查覆盖 Runtime/内嵌镜像、Scene 合同、Sampling Motion、Host command、序列化与主要架构接线。自动测试不能替代主观视觉审稿；测试口径必须标明 L0–L5 / H0–H3 层级。

完整文档入口见 [docs/README.md](docs/README.md)。

代码与文档采用 [MIT License](LICENSE)。仓库未跟踪的本地参考图、用户素材和实验资产不因该许可证获得授权。
