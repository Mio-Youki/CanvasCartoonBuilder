# ToSampool / 图森破：文档导航

README 只承担产品入口与快速开始；本页面向维护者和贡献者，按职责组织稳定文档。旧文档中的 Patcharium / 拼好景为历史名称；当前对外名称为 ToSampool / 图森破。

先读 [文档架构与提交边界](DOCUMENTATION_ARCHITECTURE.md)：它说明各类文档的权威范围、代码数据流，以及本轮 v4 基线为何分成四类提交。

## 使用与产品

- [用户指南](USER_GUIDE.md)：当前编辑器工作区、操作、保存与导出。
- [产品叙事](product/PRODUCT_NARRATIVE.md)：目标用户、公开承诺、人与 Agent 的分工。
- [路线图](../PLAN.md)：只记录未完成方向、优先级及已交付基线。
- [更新日志](../CHANGELOG.md)：按时间记录已完成变化。

## Scene 与 Agent

- [Agent 创作 Skill 架构](architecture/V4_AGENT_CREATIVE_SKILL_ARCHITECTURE.md)：以 `scene-author / asset-derive` 统一当前画布协作、参考图角色、结果类型与安全回写边界。
- [Agent 参考图输入协议](architecture/V4_AGENT_REFERENCE_INPUT_PROTOCOL.md)：三条创作分支共享的参考图入口与素材授权规则。
- [Scene Spec](../SCENE_SPEC.md)：字段与 Runtime 语义的唯一真相。
- [生成协议](agent/AGENT_GENERATE_SPEC.md)：自然语言/参考图到 Scene。
- [改写协议](agent/AGENT_REWRITE_SPEC.md)：既有脚本到可编辑 Scene。
- [Agent Tool Protocol](agent/AGENT_TOOL_PROTOCOL.md)：外部 Agent 的操作与验证边界。
- [提示词手册](agent/AGENT_PROMPT_PLAYBOOK.md)：三类案例提示词。
- [试验状态](agent/AGENT_WORKFLOW_STATUS.md)：已验证结论、失败方式和待解决问题。
- [Builtin Manifest](agent/BUILTIN_MANIFEST_V4.json)：Agent 可使用的受控内建构件、参数与时序白名单。
- [项目内 Skill](../skills/tosampool-create/SKILL.md)：可外部发布、也供编辑器显式调用的创作入口。

## 架构

先读 [架构总览](architecture/ARCHITECTURE_OVERVIEW.md)，再按问题进入专题：

- 编辑器：[行为合同](architecture/EDITOR_BEHAVIOR_SPEC.md)、[命令](architecture/EDITOR_COMMANDS.md)、[Scene Mutation](architecture/SCENE_MUTATION.md)、[Inspector 控件](architecture/INSPECTOR_CONTROL_SYSTEM.md)
- v4 正式迁移：[迁移总规范](architecture/V4_MIGRATION_MASTER_SPEC.md)、[机器迁移矩阵](architecture/V4_MIGRATION_MATRIX.json)、[Legacy 行为基线](architecture/V4_BEHAVIOR_BASELINE.md)、[差异白名单](architecture/V4_DIFFERENCE_ALLOWLIST.md)、[Parity 测试计划](architecture/V4_PARITY_TEST_PLAN.md)
- v4 能力收尾：[能力收尾台账](architecture/V4_CAPABILITY_CLOSEOUT.md)，它管理效果、粒子/Builtin 与 v4 交付；不替代纯 v4 产品化迁移。
- v4 后续总计划：[工程包、交付与 Agent 模块总计划](architecture/V4_EXECUTION_MASTER_PLAN.md)。其中 [项目包协议](architecture/V4_PROJECT_PACKAGE_PROTOCOL.md)、[交付产物协议](architecture/V4_DELIVERY_ARTIFACT_PROTOCOL.md)、[Agent 场景模块协议](architecture/V4_AGENT_SCENE_MODULE_PROTOCOL.md) 与 [设置面板台账](architecture/SETTINGS_PANEL_BACKLOG.md) 分别定义下一阶段的稳定边界。
- v4 支撑资料：[v4 Scene 合同](architecture/VNEXT_SCENE_CONTRACT.md)、[Legacy → v4 转换合同](architecture/LEGACY_V4_CONVERSION.md)、[外部转换实验](architecture/V4_LEGACY_CONVERSION_EXPERIMENT.md)、[Parts 迁移合同](architecture/V4_PARTS_MIGRATION_CONTRACT.md)、[效果系统](architecture/EFFECT_SYSTEM_VNEXT.md)、[Classic Shell 桥接说明](architecture/V4_CLASSIC_SHELL_MIGRATION.md)、[预览性能合同](architecture/V4_PREVIEW_PERFORMANCE_CONTRACT.md)、[历史差异盘点](architecture/VNEXT_PARITY_AUDIT.md)
- 运行：[Runtime 合同](architecture/RUNTIME_CONTRACT.md)、[Runtime Adapter 状态](architecture/RUNTIME_ADAPTER_PLAN.md)、[蒙版与 FX](architecture/MASK_AND_FX_STATUS.md)
- 文件与交付：[Host Adapter](architecture/HOST_ADAPTER.md)、[Tauri Host](architecture/TAURI_HOST.md)、[Asset Resolver](architecture/ASSET_RESOLVER.md)、[Artifact Builder](architecture/ARTIFACT_BUILDER.md)
- 质量：[验收测试矩阵](architecture/ACCEPTANCE_TEST_MATRIX.md)

历史基线审查已归档至 [docs/history](history/VERSION_BASELINE_V3_1_REVIEW.md)，不作为当前架构入口。

## 设计

- [Design System](design/DESIGN_SYSTEM.md)
- [UI 信息架构](design/UI_INFORMATION_ARCHITECTURE.md)
- [组件登记](design/COMPONENT_REGISTRY.md)
- [交互与动效](design/INTERACTION_AND_MOTION.md)
- [UI 重构蓝图](design/UI_RECONSTRUCTION_V1.md)

当前工作区骨架已经实施；图标、Inspector 渐进披露与视觉 token 尚未定稿。

## 维护规则

[文档同步协议](../DOCUMENTATION_PROTOCOL.md) 规定哪些修改必须同步 README、Scene Spec、Agent 协议、架构合同、PLAN 和 CHANGELOG。验证脚本只报告问题，不自动改写源码。
