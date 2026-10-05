# ToSampool v4 Agent Context Pack 协议

状态：**v2 已落地；同时服务隔离 Agent Run 与编辑器内当前画布协作。**

## 目的

Context Pack 解决的不是“怎样把所有 Inspector 参数塞进提示词”，而是让 Agent 在不读取完整编辑器历史的情况下，仍能做出正确的载体选择。

它是冻结的、只读的输入文件；Agent 只能读取它并向分配的 `draft/` 目录交付 Draft Package。Runtime 不读取它，导出物也不携带它。

```text
用户一句话 → 简短访谈 → Context Pack
                              │
                  隔离 Agent 选择载体并构建草稿
                              │
                   Draft Package → 验证器 → 人工审阅
```

## 渐进暴露的信息

1. **Brief**：尺寸、循环、用户必须保留的主体、控制度、素材政策、节拍。
2. **参考列表**：每张冻结图的角色与素材授权。
3. **画布上下文**：`base / scope / sceneRevision`、当前选择、层级与素材摘要；`current-scene` 执行时附带完整冻结 Scene 和视觉预览。
4. **载体地图**：普通对象、粒子、图片对象、项目 Module、混合结构的适用与不适用情形。
5. **创作能力族**：成样、蒙版、加样、采样、时序；不复制冗长的 Inspector 字段表。
6. **质量门槛与脚手架**：载体报告、可编辑性、确定性、性能、Draft Package 与 Module 最小文件形状。

它**不**暴露 Legacy 格式、撤销历史、宿主绝对路径、任意文件写入权限或 Runtime 私有实现。当前选择会以稳定 ID 暴露，但编辑器瞬时控件状态、拖拽手势和活 Scene 引用不会进入 Context Pack。

### 当前画布不是一句摘要

编辑器协作使用 `tosampool-agent-canvas-context/v1`。它把结构化 Scene 和当前播放头预览同时冻结：视觉快照用于理解“现在看起来怎样”，Scene 快照用于保留对象 ID、效果、素材与时间轴。应用器再以 `sceneRevision` 防止 Agent 等待期间覆盖用户的新修改。

`scope=selection` 时，Agent 仍交付完整 Scene Draft，但作用域外对象和 Scene 级设置必须逐项保持；该门禁由应用器验证，不依赖提示词自觉。

规范脚手架不是视觉模板：它只消除格式猜测（例如 `scene.modules` 应为对象而不是数组），不替 Agent 决定构图、色彩、Module 绘制或对象数量。C1-B 第一轮因缺少这一层而输出了无效的自创格式；该失败保留为对照，不在原 run 中修补。

### 坐标合同必须区分两层

- 普通 Scene 实体的 `x / y` 是未变换包围盒的**左上角**。若要把 `w × h` 对象放在视觉中心 `(cx, cy)`，写入 `x=cx-w/2`、`y=cy-h/2`。
- Module `render()` 的局部原点则在对象中心，范围是 `-width/2..width/2` 与 `-height/2..height/2`。

两者不能互相套用。C1 的质量轮已经验证：Module 使用项目绝对坐标会让内景越界；普通实体误把 `x / y` 当中心点，则会让球体、底座和玻璃高光彼此错位。Context Pack 必须同时给出这两条规则。

`carrier-report.json` 也不是可选说明：`objects[]` 至少要有一项，且每个 `id` 必须对应实际 Scene entity id。空数组、自行改名为 `carrierPlan` 或报告不存在的对象，都会在静态校验中失败，避免“运行了但无法审阅可编辑性”的假通过。

## 不是视觉能力白名单

`scene-module` 是明确允许的项目级载体，不代表 Agent 只能从预设 Builtin 中选择。Agent 可为具体作品创建专用绘制函数，只要：

- 该 Module 随 Draft Package 项目交付；
- 有确定性 Manifest 与少量语义公开参数；
- 外层仍可变换、蒙版、加样、采样和进入时序；
- 载体报告诚实标出内部冻结细节；
- 未经用户信任不会在编辑器内执行。

## C1-A 与 C1-B

| Run | 允许载体 | 用途 |
| --- | --- | --- |
| C1-A | 图元、粒子 | 证明严格原生图元基线的下限；不代表产品质量。 |
| C1-B | 图元、粒子、项目 Scene Module | 相同 Brief 下验证“高细节 + 有限语义参数 + 人类可接手”是否可行。 |

两者使用相同 1920×1080、36 秒、三季叙事和性能采集方式；唯一主变量是 Skill/Context Pack 是否允许并指导 Module 载体。
