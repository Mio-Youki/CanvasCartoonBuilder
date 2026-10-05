# ToSampool v4 Agent 参考图输入协议

状态：**v2 / 两流程共享合同已确认；编辑器已接入多参考结构的第一层。**

## 目标

参考图是本次 Agent 请求的只读视觉输入，不等同于项目素材。`scene-author` 与 `asset-derive` 共用独立参考图入口；每张图必须说明用途，只有用户明确允许时才可进入素材栏或最终 Scene。

```text
当前图片 / 素材库所选 / 文件选择
  → 冻结处理后像素
  → 指定参考角色
  → Agent 方向卡与执行
  → 默认只作参考
       └─ 用户确认 useAsMaterial → 项目素材
```

## 参考角色

| role | 语义 | 是否默认成为素材 |
| --- | --- | --- |
| `source` | 允许进行语义派生、Alpha、补全或变体生成的源图 | 否；派生结果经确认后入库 |
| `style` | 色彩、材质、像素密度和粗糙度 | 否 |
| `composition` | 空间关系、构图和层级 | 否 |
| `subject` | 主体外观与辨识要求 | 否 |
| `motion` | 姿态、动作或循环节奏 | 否 |

`asset-derive` 至少需要一张 `source`；`scene-author` 可没有参考图。用户只上传而没有说明角色时，Agent 先提出角色建议并等待确认，不自行决定。

## 编辑器交互

“Agent 创作”对话顶部提供共享的“参考图”入口：

1. **用当前图片**：画布或结构树中选中的图片对象。
2. **用素材库所选**：素材库中选中的已完成预处理静态图片。
3. **选择文件**：冻结为本次运行输入，不自动入库。
4. **设置用途**：选择 `source / style / composition / subject / motion`。
5. **作为素材使用**：单独确认；默认关闭。
6. **移除**：只移除本次请求的参考，不删除素材或改变 Scene。

多张参考按稳定 ID 进入 `references[]`。当前仍只接受静态图片；多帧动作参考须另立序列合同，不能静默取第一帧。

## 桥接格式

```json
{
  "references": [
    {
      "format": "tosampool-agent-reference/v2",
      "id": "reference-photo",
      "assetId": "optional-existing-asset",
      "name": "处理后参考图",
      "role": "style",
      "width": 1280,
      "height": 720,
      "source": "processed-asset",
      "useAsMaterial": false,
      "dataUrl": "data:image/png;base64,..."
    }
  ]
}
```

浏览器桥接使用内存数据；未来 Tauri Host 将其写入 run 的 `input/references/`。若 `useAsMaterial:true`，Agent 仍须把使用到的素材复制进 Draft Package 并通过稳定 `assetId` 引用，不能依赖宿主绝对路径。

## 流程边界

- `scene-author`：参考图辅助风格、构图、主体或运动判断；不限制程序/图片/混合载体选择。`base=selected-assets` 时，正式主要素材仍只来自用户所选集合和获准生成的补件。
- `asset-derive`：`source` 是派生基底；交付经审阅的素材包和原位校验，不继续做正式 Scene。

参考图不进入 Runtime。派生素材的来源、审阅和 `sourceAssetId` 遵循 [派生素材协议](V4_AGENT_DERIVED_ASSET_PROTOCOL.md)。
