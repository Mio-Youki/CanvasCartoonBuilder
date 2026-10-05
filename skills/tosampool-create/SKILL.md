---
name: tosampool-create
description: Create or revise a ToSampool scene from an idea, the current canvas, selected assets, and reference images, or derive reusable assets from source images. Route to scene authoring or asset derivation before producing output.
metadata:
  short-description: ToSampool Agent 创作路由
---

# ToSampool Create

从用户的一句话开始。先判断本轮要完成的是**场景创作**还是**素材派生**，再加载对应说明；不要在同一次执行中跨越两条流程。

## 路由

- **场景创作 / scene-author**：新建场景、使用已选素材编排，或在当前画布/当前选择上继续创作。读取 [references/scene-author.md](references/scene-author.md)。
- **素材派生 / asset-derive**：从图片拆出、补全或生成可复用素材。读取 [references/derive.md](references/derive.md)；若由 Codex 充当规划器，再读取 [references/codex-derived-plan.md](references/codex-derived-plan.md)。

若一句话同时包含拆素材和做场景，先完成派生；派生结果经用户确认后，另起场景创作阶段。只有结果类型确实不明确时，提出一个会改变输出类型的问题。

## 共享流程

1. 复述目标、必须保留内容、本轮输出边界，以及本次基于空白、已选素材、当前场景还是当前选择。
2. 冻结画布上下文和参考图角色。画布上下文是带 revision 的只读快照；参考图独立于项目素材，只有用户明确允许时才可作为作品素材。
3. 返回两到三张真正影响实现方式的方向卡。每张卡说明视觉策略、载体、可编辑部分、冻结部分、素材计划和成本。
4. 等待用户选择方向；确认前不生成图片、不改工程、不执行项目 Module。
5. 只加载所选分支、[工具与结果合同](references/tool-contracts.md) 和 [审阅门禁](references/review-gates.md)。
6. 在隔离 Draft 或派生任务中工作，完成结构验证、固定时间预览和相应分支门禁。
7. 展示可审阅结果。应用前校验项目 revision 和作用域；用户确认后才以单次可撤销变更写入当前项目或素材栏。

## 参考图

两个流程都可接收一张或多张参考图。每张必须声明用途：`source`、`style`、`composition`、`subject` 或 `motion`。

- `source` 是允许派生像素的源图；素材派生至少需要一张。
- 其他角色只提供视觉指导，不自动进入素材栏，不默认出现在最终画面。
- 若用户没有说明角色，先提出建议并让用户确认；不要把“看起来像”误读为“直接使用这张图”。

## 完成

完成标准不是“Agent 返回了内容”。必须满足所选流程的可观察交付条件、生成证据齐全，并停在用户确认边界。失败时指出是输入、上下文冲突、工具能力、Runtime、性能还是审阅门禁未通过，不以降低语义精度冒充完成。
