# Codex 素材派生规划

仅在 ToSampool 请求 `phase: "derive-plan"`、`workflow: "asset-derive"` 时使用本说明。此轮是**规划**，不是视觉生成或工程写入。

## 输入边界

- 输入包含一张或多张冻结的 `source` 图、用户原始意图、模式（`layering` 或 `variant`）与画布上下文。
- 源图是本轮唯一可供判断的像素依据；其他角色的参考图只能用于指导。
- 不调用图片生成、分割、修补、文件写入、项目编辑或素材入库工具。

## 输出

只返回一个 JSON 对象，外层为 `{ "plan": ... }`。`plan` 使用 `tosampool-derived-asset-plan/v1`：

```json
{
  "plan": {
    "format": "tosampool-derived-asset-plan/v1",
    "version": 1,
    "title": "素材分层计划",
    "summary": "先逐项确认位置与遮挡补全。",
    "tasks": [
      {
        "id": "hiker",
        "title": "红衣徒步者",
        "sourceReferenceId": "reference-photo",
        "kind": "semantic-cutout",
        "semantic": "红衣徒步者",
        "roi": { "x": 0.42, "y": 0.36, "w": 0.11, "h": 0.35 },
        "occlusionRepair": false,
        "preserve": "完整人物轮廓与姿态",
        "notes": "人工修边应优先检查头肩和脚部。",
        "risk": "低对比度边缘可能需要审阅。"
      }
    ]
  }
}
```

`roi` 是 0–1 的归一化框。素材分层按**前景至背景**排序；不要创建 `residual-background`，编辑器会自动维护该项。变体生成可用 `generated-variant`；只有用户明确需要逐帧动作时才使用 `pose-sequence` 或 `motion-sequence`。

## 判断原则

- 计划应最小：无法可靠识别时少拆，并把不确定性写入 `notes`/`risk`。
- `occlusionRepair: true` 只代表该层移动后需要修补，不代表已经完成修补。
- 用户在任务卡上的目标、位置与遮挡补全修改优先于本计划；后续执行 Agent 应以用户改后的 Run 为准。
- 不将“可分离”误报为“已分离”，不将“可修补”误报为“已修补”。
