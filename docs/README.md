# Patcharium 文档导航

README 只承担产品入口与快速开始；本页面向维护者和贡献者，按职责组织稳定文档。

## 使用与产品

- [用户指南](USER_GUIDE.md)：当前编辑器工作区、操作、保存与导出。
- [产品叙事](product/PRODUCT_NARRATIVE.md)：目标用户、公开承诺、人与 Agent 的分工。
- [路线图](../PLAN.md)：只记录未完成方向、优先级及已交付基线。
- [更新日志](../CHANGELOG.md)：按时间记录已完成变化。

## Scene 与 Agent

- [Scene Spec](../SCENE_SPEC.md)：字段与 Runtime 语义的唯一真相。
- [生成协议](agent/AGENT_GENERATE_SPEC.md)：自然语言/参考图到 Scene。
- [改写协议](agent/AGENT_REWRITE_SPEC.md)：既有脚本到可编辑 Scene。
- [Agent Tool Protocol](agent/AGENT_TOOL_PROTOCOL.md)：外部 Agent 的操作与验证边界。
- [提示词手册](agent/AGENT_PROMPT_PLAYBOOK.md)：三类案例提示词。
- [试验状态](agent/AGENT_WORKFLOW_STATUS.md)：已验证结论、失败方式和待解决问题。

## 架构

先读 [架构总览](architecture/ARCHITECTURE_OVERVIEW.md)，再按问题进入专题：

- 编辑器：[行为合同](architecture/EDITOR_BEHAVIOR_SPEC.md)、[命令](architecture/EDITOR_COMMANDS.md)、[Scene Mutation](architecture/SCENE_MUTATION.md)、[Inspector 控件](architecture/INSPECTOR_CONTROL_SYSTEM.md)
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
