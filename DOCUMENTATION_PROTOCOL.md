# 文档分类与版本同步协议

> 适用范围：`tools/` 独立仓库。游戏本体的产品、部署与前后端文档仍留在外层仓库的 `docs/`。

## 目录分类

| 位置 | 角色 | 文件 |
|---|---|---|
| 工具根目录 | 用户入口、格式合同、路线与版本记录；链接稳定，不随专题归档移动 | `README.md`、`SCENE_SPEC.md`、`PLAN.md`、`CHANGELOG.md`、本文件 |
| `docs/` 根目录 | 用户指南与贡献者文档导航 | `README.md`、`USER_GUIDE.md` |
| `docs/agent/` | Agent 生成、改写、工具协议、提示词与试验结论 | `AGENT_GENERATE_SPEC.md`、`AGENT_REWRITE_SPEC.md`、`AGENT_TOOL_PROTOCOL.md`、`AGENT_PROMPT_PLAYBOOK.md`、`AGENT_WORKFLOW_STATUS.md` |
| `docs/architecture/` | 已收口的 Runtime/编辑器/宿主架构说明、行为/命令/变更/Inspector 控件/运行合同、验收矩阵与设计计划 | `ARCHITECTURE_OVERVIEW.md`、`EDITOR_BEHAVIOR_SPEC.md`、`EDITOR_COMMANDS.md`、`SCENE_MUTATION.md`、`INSPECTOR_CONTROL_SYSTEM.md`（含颜色字段语义表）、`RUNTIME_CONTRACT.md`、`HOST_ADAPTER.md`、`TAURI_HOST.md`、`ASSET_RESOLVER.md`、`ARTIFACT_BUILDER.md`、`ACCEPTANCE_TEST_MATRIX.md`、`MASK_AND_FX_STATUS.md`、`RUNTIME_ADAPTER_PLAN.md` |
| `docs/history/` | 已完成的一次性审查、迁移和事故结论；只作追溯，不作为当前说明入口 | `VERSION_BASELINE_V3_1_REVIEW.md` |
| `docs/design/` | 产品视觉语言、信息架构、组件和交互动效规范 | `DESIGN_SYSTEM.md`、`UI_INFORMATION_ARCHITECTURE.md`、`COMPONENT_REGISTRY.md`、`INTERACTION_AND_MOTION.md`、`assets/` |
| `docs/product/` | 产品定位、发布叙事、案例与可验证承诺 | `PRODUCT_NARRATIVE.md` |
| `scripts/` / `tests/` | 只读静态验证、迁移、真实浏览器验收与性能基准；不是 Scene 合同本身 | `verify-editor.mjs`、`validate-scene.mjs`、`editor-e2e.html`、`runtime-performance.html` |
| `editor/` | 可执行的编辑器内核模块；不是文档 | 几何、Scene model、Runtime bridge、性能监测、Host Adapter、导出器 |
| `examples/` | 可导入场景、素材与验收样例；不是格式合同 | `*.js`、`assets/`、导出对照图 |

新增 Markdown 必须先判断其属于“稳定入口/合同”“用户指南”还是“专题说明”。产品入口与格式合同留根目录；用户操作说明进入 `docs/USER_GUIDE.md`；实现细节进入对应 `docs/` 子目录。临时调查记录在合并为结论后写入对应专题文档或删除，不长期堆放在根目录。

公开 README 保持短小，只回答产品是什么、如何开始、当前边界和去哪里继续阅读。完整操作不得重新堆回 README；架构专题也不得承担路线图或更新日志职责。

## 同步规则

| 改动类型 | 必须同步 | 视情况同步 |
|---|---|---|
| 用户可见工作流、入口或限制 | `README.md`、`CHANGELOG.md` | `PLAN.md` |
| Scene 字段、默认语义、Runtime 兼容行为 | `SCENE_SPEC.md`、相关 Agent 协议、`CHANGELOG.md` | `README.md`、样例、冒烟测试 |
| Scene 合同校验规则或 Agent 样例夹具 | `scripts/validate-scene.mjs`、`SCENE_SPEC.md`、`docs/agent/` | `scripts/verify-editor.mjs`、`examples/`、`PLAN.md` |
| Agent 输入/输出策略、验收或已知缺口 | `docs/agent/` 对应文件、`PLAN.md` | `SCENE_SPEC.md`、`README.md` |
| 产品定位、公开承诺、案例验证口径 | `docs/product/`、`README.md`、`PLAN.md` | `CHANGELOG.md`、设计文档 |
| 已完成的架构域（如蒙版/导出） | 对应 `docs/architecture/` 状态文档、`PLAN.md` | `README.md`、`CHANGELOG.md` |
| 编辑器行为、命令、Scene 变更、Runtime/Host capability、时间/序列化/素材解析/产物构建边界或验收口径 | `EDITOR_BEHAVIOR_SPEC.md`、`EDITOR_COMMANDS.md`、`SCENE_MUTATION.md`、`RUNTIME_CONTRACT.md`、`HOST_ADAPTER.md`、`ASSET_RESOLVER.md`、`ARTIFACT_BUILDER.md`、`ACCEPTANCE_TEST_MATRIX.md`、`editor/command-registry.js`、`editor/scene-mutation.js`、`editor/timeline-model.js`、`editor/scene-serializer.js`、`editor/asset-resolver.js`、`editor/artifact-builder.js`、`editor/host-adapter.js`、`editor/tauri-host-adapter.js` | `scripts/verify-editor.mjs`、`CHANGELOG.md` |
| UI 视觉、布局、组件或交互动效 | `docs/design/` 对应规范 | `README.md`、`PLAN.md`、`CHANGELOG.md` |
| 未实现方向或优先级变化 | `PLAN.md` | 架构计划、README 限制说明 |
| 仅内部重构且格式/行为不变 | 必要时 `CHANGELOG.md` | 无 |

发布版本号必须同步 `package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 与 CHANGELOG 发布标题。依赖版本不是产品版本；工具版本也不与游戏本体版本联动。

每次移动文件后，必须用全文搜索修复入链；根目录的 README 文档索引必须保持可点击。

## 版本与提交边界

本工作区有两个独立 Git 仓库，提交不可混合：

1. `tools/`：编辑器、工具 Runtime 镜像、工具文档、样例和工具测试；
2. 外层仓库：站点按需固定的 `public/home-scene.js` 消费端版本与站点侧测试。

`tools/home-scene.js` 是工具 Runtime 的唯一规范源，编辑器必须优先加载该同目录文件；`../public/home-scene.js` 只作为旧目录结构的兼容兜底。外层站点不是默认镜像，而是有意升级时才同步的消费端：工具 Runtime 行为变更只提交 `tools/`；只有站点明确采用该版本时，才复制到 `../public/home-scene.js`、运行站点测试并单独提交外层仓库。两者暂时不同不代表场景失去自包含能力，也不应阻塞工具仓库开发。除非明确要求，不因本地提交自动 push。

工具提交前最低检查：`node scripts/verify-editor.mjs` 与 `git diff --check`。消费端升级时，再显式运行 `node scripts/verify-editor.mjs img2asset-layout-v1.html home-scene.js ../public/home-scene.js`，并在外层运行 `node test/client-smoke.js`、`npm run typecheck`、`npm test`。如检查受环境限制，必须在 CHANGELOG 或提交说明中标明。

编辑器入口只指向 `img2asset-layout-v1.html`。`img2asset.html` 是冻结的历史备份：不得为保持“同步”而向其中复制新版 Inspector、Runtime、Scene Mutation 或 Host Adapter 修改，也不得把其中残留的直接 `pushHistory()` 计入当前产品架构债务。
