# ToSampool Agent 创作 Skill 架构

状态：**v2 / 两流程路由、当前画布上下文、revision 门禁与素材候选审阅已接入第一层代码。**

## 目标

“Agent 创作”不是只从零生成场景的表单，而是一套可版本化、可测试、能读取当前作品并安全回写的协作 Skill。编辑器按钮显式调用它；未来独立 Codex Skill 与内置 API Adapter 共用同一流程和结果合同。

## 两条主流程

```text
Agent 创作
├─ scene-author   场景创作 / 修改
│  ├─ base: blank             从描述建立新场景
│  ├─ base: selected-assets   使用所选素材编排
│  └─ base: current-scene     在当前画布或当前选择上继续
└─ asset-derive   图片语义派生、Alpha、补全与可选变体
```

“起景”和“编排”不再是永久分支。它们输出相同的完整 `scene-draft`，执行顺序和审阅门禁也相同，差别只是创作基底。C1、C3 继续存在，但只是 `scene-author` 的评测配置：

- C1：`base=blank`；
- C3：`base=selected-assets`；
- 人机协作修订：`base=current-scene`，`scope=scene|selection`。

C2 保持为 `asset-derive`，完成于经审阅的素材包，不跨入场景编排。

## 当前画布上下文

Agent 必须同时看到“结构”和“画面”，不能只得到一句提示词：

```text
tosampool-agent-canvas-context/v1
├─ base / scope / stable ids
├─ sceneRevision
├─ 画布、循环、Scene 段与对象层级摘要
├─ 当前选择与所选素材
├─ 完整冻结 Scene（仅 current-scene）
└─ 当前播放头视觉预览
```

方向阶段优先使用摘要；执行阶段才读取完整冻结 Scene。视觉预览帮助 Agent 理解构图和当前结果，结构快照帮助它保留 ID、属性、效果与时间轴。它们都只读，不是活工程引用。

后续 Host 可扩展固定时间帧与按需读取单个对象/轨道的工具，但不能取消 revision 和作用域约束。

## Scene Draft 回写

`scene-draft` 始终交付完整 v4 Scene，而不是不透明 JSON Patch：

```json
{
  "format": "tosampool-agent-build/v2",
  "kind": "scene-draft",
  "base": { "type": "current-scene", "sceneRevision": 42 },
  "scope": { "type": "selection", "ids": ["clouds"] },
  "changes": ["让云层缓慢流动"],
  "scene": { "format": "tosampool-scene/v4" }
}
```

应用前必须：

1. 当前 `workspace.revision` 仍等于 Draft 的 `sceneRevision`；
2. `scope=selection` 时，作用域外既有对象、Scene 尺寸/背景/全局效果和 Scene 分段未被改写；
3. 用户确认；
4. 整份 Draft 作为一条撤销记录写入。

revision 冲突时停止应用，要求基于最新画布重新生成或显式重基线；不能静默覆盖用户在等待 Agent 时完成的修改。

## 参考图

两个流程都使用 `references[]`。每张图声明 `source / style / composition / subject / motion`，默认 `useAsMaterial:false`。参考图是指导，不是自动进入作品的素材；作为素材使用需要单独授权。

## 分层事实源

- Skill：路由、方向、载体判断、完成条件。
- Context Pack：当前 Runtime / Registry / Scene 能力和冻结画布。
- UI：一句话输入、上下文选择、方向卡与确认状态。
- Host / Bridge：图片冻结、模型调用、隔离执行、渲染与打包。
- Runtime：只播放确定的 Scene、素材和项目 Module，不接触 Agent 或密钥。

## 结果联合类型

- `scene-draft`：`scene-author`。
- `derived-asset-plan`：派生计划。
- `derived-asset-review`：待审阅候选。
- `derived-asset-bundle`：已确认、可进入素材栏的派生素材包。

其中 `asset-derive` 的多任务执行状态不塞进 Scene Draft；它由 [素材衍生 Run 协议](V4_AGENT_DERIVED_ASSET_RUN_PROTOCOL.md) 的独立临时 Run 保存，涵盖素材分层的两轮 Alpha/补全处理、变体生成与三候选重制。

每种结果有独立验证器和 UI 去向。`derived-asset-*` 不生成伪 Scene，`scene-draft` 不绕过应用确认。

## 落地状态与下一步

已完成：

- Skill 由三分支收敛为 `scene-author / asset-derive`；
- 参考输入升级为带角色的 `references[]`；
- Context Pack v2 能冻结当前 Scene、选择、素材摘要、预览和 revision；
- Agent build v2 带 `base/scope/revision`；
- 应用前执行 revision 与选择作用域门禁；
- 编辑器“生成场景”面板改为“Agent 创作”，可选新场景、所选素材、当前画布或当前选择。
- 同一面板可切换到“派生素材”：必须先冻结一张 `source` 素材参考，Agent 返回计划卡；透明候选不会提前写入，只有“接受到素材栏”才产生一条可撤销变更。
- `asset-derive` 的 Codex 规划桥已有稳定合同与浏览器端到端夹具：Host 只能返回可编辑任务卡，不能绕过候选审阅、修边或素材栏接受。

下一步：

1. 为 Scene Draft 增加固定时间预览组和可视化变更摘要；
2. 建立协作修订评测：以人类已完成一半的 Scene 为输入，要求 Agent 只修改指定对象；
3. 将 Alpha 候选衔接到既有“素材 · Alpha 修边”舞台，避免候选审核和人工修边分裂为两套交互；
4. 在 Tauri Host 或受控 API Adapter 中实现真实 Codex 规划调用；它只替换规划桥宿主，不改变编辑器协议与审阅边界；
5. C1/C3 作为同一 `scene-author` 的输入配置复测，不再复制两套提示与完成条件。
