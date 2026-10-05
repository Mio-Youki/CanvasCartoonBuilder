# v4 Agent 派生素材协议

状态：**派生素材与姿态序列的文件合同、计划卡、候选审阅与素材栏接受路径已定义；浏览器桥接尚未内置图像分割或生图服务。**

## 目的

单图动态化不能把“几个矩形裁切”误称为精确语义分层。需要人物、云层、树冠等不规则边界时，Agent 应把经授权的参考图转化为项目内的透明派生素材，再按普通 v4 图片对象使用。

这不是 Runtime 的新特效，也不是背景槽。Runtime 只读取普通 `scene.assets`；派生关系只服务于工程可追溯性、Agent 审阅和用户理解。

## 文件与 Scene 结构

```text
draft/
├─ assets/
│  ├─ karsten-source.jpg          # 用户原始/处理后冻结参考
│  ├─ karsten-sky.png             # 含透明 Alpha 的天空层
│  ├─ karsten-mountains.png       # 含透明 Alpha 的中景层
│  └─ karsten-hiker.png           # 含透明 Alpha 的人物与前景层
└─ project.tosampool.json
```

```json
{
  "assets": {
    "karsten-source": {
      "locator": "assets/karsten-source.jpg",
      "mime": "image/jpeg",
      "width": 640,
      "height": 960
    },
    "karsten-hiker": {
      "locator": "assets/karsten-hiker.png",
      "mime": "image/png",
      "width": 640,
      "height": 960,
      "sourceAssetId": "karsten-source",
      "derivation": {
        "kind": "semantic-cutout",
        "semantic": "red-jacket hiker and foreground ridge",
        "alpha": true
      }
    }
  }
}
```

- `sourceAssetId` 必须引用同一 Scene 的另一个素材，不能自引用；Draft 校验会验证这条关系。
- 原始参考与派生透明层均需实际位于 Draft Package，不能依赖外部本机路径。
- `derivation` 是面向人和 Agent 的说明，不参与 Runtime 计算；应写明语义、是否含 Alpha、所用处理方式和已知边缘限制。
- 透明层可以直接作为 `image` 实体，也可作为 Alpha 蒙版来源；不需要新的“分层图片”实体类型。

## 分割不是逐帧生成

“人物从照片中抠出”与“人物获得二帧走路动作”是两个独立步骤：

1. **语义切出（保真）**：`semantic-cutout` 只产生与原图同一姿态的透明层。它适合让人物、云、树冠分别移动、调色或加对象效果。
2. **姿态变体（生成）**：`pose-sequence` 才产生两帧或更多透明 PNG/WebP。每帧要共享同一画布大小、脚底锚点和视觉尺度；Runtime 把它当普通多帧素材播放。

因此，Karsten 案例可先保留徒步者的 `semantic-cutout`，再让一个获授权的图像 Agent 生成“左脚前 / 右脚前”两个透明姿态。人物在山脊上的位移仍应由对象的 X/Y 时序或滚动控制；不要把位置变化烘焙进帧图，否则人类无法独立修改“走多远”和“怎么走”。

```json
{
  "assets": {
    "karsten-source": { "locator": "assets/karsten-source.jpg", "mime": "image/jpeg", "width": 640, "height": 960 },
    "karsten-walker-poses": {
      "locator": "assets/walker/0000.png",
      "frames": [
        { "locator": "assets/walker/0000.png", "mime": "image/png" },
        { "locator": "assets/walker/0001.png", "mime": "image/png" }
      ],
      "fps": 2,
      "frameLoop": true,
      "width": 128,
      "height": 192,
      "sourceAssetId": "karsten-source",
      "derivation": {
        "kind": "pose-sequence",
        "semantic": "red-jacket hiker; alternating walk poses",
        "alpha": true,
        "method": "reference-guided pose generation",
        "anchor": { "x": 0.5, "y": 1 },
        "frameSemantics": ["left foot forward", "right foot forward"]
      }
    }
  }
}
```

- 可用 `derivation.kind`：`semantic-cutout`、`alpha-mask`、`pose-sequence`、`motion-sequence`、`generated-variant`。
- `pose-sequence` 与 `motion-sequence` 必须有有序 `frames[]`；`semantic-cutout`、`alpha-mask`、`pose-sequence` 必须声明 `alpha:true`。
- `anchor`、`frameSemantics` 和 `method` 只是工程/审阅元数据；v4 Runtime 仍只播放标准的 `frames[]`。这使最终 `scene.runtime.js` 无需携带分割器或模型依赖。

## 能力边界

只有当 Host/Agent 被明确授予图像处理或分割能力时，才可产生 `semantic-cutout`。只有获授权的图像生成/重绘能力才可产生 `pose-sequence`；分割器不能凭空推导人被遮挡的肢体或第二个姿态。当前纯浏览器 Context Pack 不自动提供这两项能力：没有它时，Agent 可以做矩形裁切、矢量遮罩或请求用户提供透明素材，但必须在载体报告中如实说明，不能承诺像素级轮廓或动作帧。

未来 Tauri Host 可将“派生素材”作为可审阅任务：冻结输入 → 显示生成的透明层缩略图与边缘说明 → 用户接受 → 将文件写进项目 Draft。模型 API、分割器和密钥都留在 Host；Scene Runtime 不接触它们。

## 当前桥接落点

浏览器编辑器现在已具备不带模型的完整接收路径：

```text
Agent 创作 / 派生素材（source 参考）
  → `tosampool-derived-asset-plan/v1` 计划卡
  → 用户选择一项
  → 冻结处理后像素并请求候选（类型、主体、帧数、锚点）
  → 宿主返回透明 PNG/WebP 帧
  → 合同校验与透明候选预览
  → 用户接受后，作为普通 v4 素材写入一条撤销历史
```

- `editor/vnext-derived-asset-protocol.js`：冻结输入和返回帧的稳定格式。
- `editor/vnext-derived-asset-bridge.js`：浏览器向宿主派发 `tosampool-derived-asset-request` 事件，并接收同一请求 ID 的结果；不含 API Key 或模型调用。
- `editor/classic-v4-derived-asset-controller.js`：`request(...)` 只返回经校验的候选，`accept(...)` 才通过既有素材状态与撤销历史写入 Scene；`derive(...)` 是兼容旧调用的一步式组合。

浏览器版不把没有宿主能力的按钮伪装成已可用的“自动抠图”。“Agent 创作”会在没有适配器时停在计划卡，并明确报出缺少透明分层能力；素材卡片现已提供 `α` 入口，可在不依赖模型的前提下完成透明边缘人工修边。Tauri Host 只需实现候选桥接，不必改写素材栏接受与撤销路径。

### Codex 规划桥（已接通合同，未内置模型）

`editor/vnext-codex-derived-plan.js` 把“由 Codex 判断哪些部分值得派生”固定为一个更窄的宿主合同：

```text
冻结 source 图 + 用户意图
  → `tosampool-codex-derived-plan/v1` 规划请求
  → Codex / Host 返回 `tosampool-derived-asset-plan/v1`
  → 编辑器校验源图、任务类型、归一化 ROI 与修补标记
  → 可编辑任务卡 + 自动 residual-background
```

此桥只处理**计划**，不会生成像素、分割图片、调用图像模型或写入项目。浏览器通过既有 `tosampool-agent-creative-request` / `response` 事件向宿主请求计划；Tauri 或未来 API Adapter 只需监听同一事件，并使用 `EditorVNextCodexDerivedPlan.request(...)` / `response(...)` 规范输入输出。

`tests/browser/v4-agent-codex-derived-plan-flow.mjs` 以模拟 Codex 宿主验证了端到端路径：同一张源图返回“红衣徒步者 / 近景山脊 / 天空”三项，编辑器实际采用它们而非本地兜底，并补上背景残余卡。当前桌面聊天不能被网页直接持久调用；要接入真实模型仍需 Tauri Host、MCP 服务或受控 API Adapter。密钥、网络权限和图像能力始终留在宿主侧，编辑器与 Runtime 仍无模型依赖。

“派生素材”的完整交互状态、四字段分层任务卡、两轮 Alpha/修补处理与三候选重制规则，见 [素材衍生 Run 协议](V4_AGENT_DERIVED_ASSET_RUN_PROTOCOL.md)。它在候选接受之前不触碰永久素材库。

## 素材级 Alpha 修边（编辑器工作流）

`semantic-cutout` / `alpha-mask` 的自动结果不能直接写入素材库。v4 的编辑器工作流为：

```text
源素材（唯一 RGB 基底） + 当前导入预处理
  → 可选视觉适配器给出粗 Alpha 候选
  → 中央舞台预览：擦除 / 恢复 / 多边形 / 反相 / 羽化
  → 应用
  → 原图引用 + 无去背景的预处理快照 + 可编辑 Alpha 遮罩 + sourceAssetId + derivation
```

右侧 Inspector 只承载工具和确认；画笔操作在中央舞台完成，避免出现缩在面板内的第二块画布。首次应用会新增普通 v4 派生素材，原素材不覆盖；再次编辑该派生素材时只原地更新其 Alpha 遮罩，不再复制底图或改变素材 ID。派生素材固定引用原始 RGB，并在创建时冻结一份**不含去背景的尺寸预处理快照**：恢复被擦掉区域时可重新露出真实原色，而不是透明区留下的黑色；之后重新编辑原素材的导入预处理，也不会意外改动既有派生版本。没有安装视觉适配器时，人工修边仍可完整工作，且不能把矩形裁切宣传为“语义分割”。

浏览器 Alpha 候选是可选能力而非 Runtime 依赖：模型、缓存、许可证与网络策略由宿主适配器声明；`scene.runtime.js` 和导出结果只读取普通图片素材及其 Alpha 遮罩，不接触候选模型。

### 与“生成场景”面板的协作

生成场景的 Agent 不应直接把一个未经审阅的透明层塞进项目。它应先返回可读的**派生素材计划卡**，例如“保留红衣徒步者”“分离天空区域”，每张卡包含源素材、目标语义、建议类型与风险说明。用户接受某张卡后：

1. 面板通过宿主请求可选的 Alpha 候选；没有适配器时明确提示只能进入人工修边。
2. 候选打开同一个 `素材 · Alpha 修边` 舞台，而不是另造一套生成器画布。
3. 用户修边并应用后，得到稳定的派生素材 ID；Agent 的后续场景草稿才可引用该 ID 来放置、动画或加效果。

这样 Agent 负责“建议什么值得分层”，视觉适配器负责“给出候选”，人负责“确认实际边界”；三者都不进入 Runtime。
