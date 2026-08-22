# 文档分类与版本同步协议

> 适用范围：`tools/` 独立仓库。游戏本体的产品、部署与前后端文档仍留在外层仓库的 `docs/`。

## 目录分类

| 位置 | 角色 | 文件 |
|---|---|---|
| 工具根目录 | 用户入口、格式合同、路线与版本记录；链接稳定，不随专题归档移动 | `README.md`、`SCENE_SPEC.md`、`PLAN.md`、`CHANGELOG.md`、本文件 |
| `docs/agent/` | Agent 生成、改写与试验结论 | `AGENT_GENERATE_SPEC.md`、`AGENT_REWRITE_SPEC.md`、`AGENT_WORKFLOW_STATUS.md` |
| `docs/architecture/` | 已收口的 Runtime/编辑器架构说明与设计计划 | `MASK_AND_FX_STATUS.md`、`RUNTIME_ADAPTER_PLAN.md` |
| `docs/design/` | 产品视觉语言、信息架构、组件和交互动效规范 | `DESIGN_SYSTEM.md`、`UI_INFORMATION_ARCHITECTURE.md`、`COMPONENT_REGISTRY.md`、`INTERACTION_AND_MOTION.md`、`assets/` |
| `editor/` | 可执行的编辑器内核模块；不是文档 | 几何、Scene model、导出器 |
| `examples/` | 可导入场景、素材与验收样例；不是格式合同 | `*.js`、`assets/`、导出对照图 |

新增 Markdown 必须先判断其属于“稳定入口/合同”还是“专题说明”。前者留根目录；后者进入上述 `docs/` 子目录。临时调查记录在合并为结论后写入对应专题文档或删除，不长期堆放在根目录。

## 同步规则

| 改动类型 | 必须同步 | 视情况同步 |
|---|---|---|
| 用户可见工作流、入口或限制 | `README.md`、`CHANGELOG.md` | `PLAN.md` |
| Scene 字段、默认语义、Runtime 兼容行为 | `SCENE_SPEC.md`、相关 Agent 协议、`CHANGELOG.md` | `README.md`、样例、冒烟测试 |
| Agent 输入/输出策略、验收或已知缺口 | `docs/agent/` 对应文件、`PLAN.md` | `SCENE_SPEC.md`、`README.md` |
| 已完成的架构域（如蒙版/导出） | 对应 `docs/architecture/` 状态文档、`PLAN.md` | `README.md`、`CHANGELOG.md` |
| UI 视觉、布局、组件或交互动效 | `docs/design/` 对应规范 | `README.md`、`PLAN.md`、`CHANGELOG.md` |
| 未实现方向或优先级变化 | `PLAN.md` | 架构计划、README 限制说明 |
| 仅内部重构且格式/行为不变 | 必要时 `CHANGELOG.md` | 无 |

每次移动文件后，必须用全文搜索修复入链；根目录的 README 文档索引必须保持可点击。

## 版本与提交边界

本工作区有两个独立 Git 仓库，提交不可混合：

1. `tools/`：编辑器、工具 Runtime 镜像、工具文档、样例和工具测试；
2. 外层仓库：`public/home-scene.js`（站点运行时镜像）与站点侧测试。

一次 Runtime 行为变更需先确认 `tools/home-scene.js` 与 `../public/home-scene.js` 的 SHA256 相同；随后分别提交两个仓库。工具提交信息描述能力/文档，外层提交信息描述站点 Runtime 同步。除非明确要求，不因本地提交自动 push。

提交前最低检查：运行时语法检查、编辑器脚本解析、`node test/client-smoke.js`、`npm run typecheck`、`npm test`（变更影响运行时或站点时）、两仓库 `git diff --check`。如检查受环境限制，必须在 CHANGELOG 或提交说明中标明。
