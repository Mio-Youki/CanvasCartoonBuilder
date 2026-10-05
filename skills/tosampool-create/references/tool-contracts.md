# 工具与结果合同

## 边界

- 编辑器 UI 负责收集一句话、参考图、素材选择和用户确认。
- Skill 负责路由、方向、载体判断、执行次序与完成条件。
- Host/Bridge 负责冻结图片、运行可选视觉服务、写隔离目录、渲染和验证。
- Runtime 只播放确定的 Scene、素材和项目 Module，不调用模型。

## Context Pack

每次运行由当前工程生成 Context Pack。它是 Runtime/Registry/Scene 能力的权威快照；Skill 不复制完整字段表。至少包含：

- 用户 Brief 与所选流程；
- 参考图列表及角色；
- 允许使用的素材集合和授权；
- 当前画布摘要、稳定 ID、选择作用域、视觉预览与 `sceneRevision`；
- 当前载体、效果、时序和 Module 合同；
- 输出边界与性能预算；
- Skill、协议、Registry 和编辑器版本。

## 结果联合类型

- `scene-draft`：场景创作产生的完整隔离 Scene Draft，包含 `base`、`scope`、`sceneRevision` 和 `changes`。
- `derived-asset-plan`：派生分支等待用户批准的语义拆分计划。
- `derived-asset-review`：等待 Alpha/补全审阅的候选素材。
- `derived-asset-bundle`：用户确认、可进入素材栏的派生素材包。

不同类型必须由不同验证器验收。`derived-asset-*` 不要求也不允许伪造完整 Scene。

`scene-draft` 即使只修改当前选择，也必须交付完整 Scene；应用器负责检查作用域外对象保持不变，并把确认后的结果作为一条撤销记录写入。工程 revision 不一致时不得静默覆盖。

## 参考图合同

参考图字段使用 `references[]`，每项包含稳定 ID、冻结副本、尺寸、来源和一个角色：`source / style / composition / subject / motion`。`useAsMaterial` 默认为 `false`；只有用户确认后才可变为项目素材。
