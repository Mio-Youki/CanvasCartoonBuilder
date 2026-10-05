# v4 Legacy 外部转换实验

状态：**P5 状态模型已修正。** 这是边界测量工具，不是 v4 编辑器功能，也不是 `home-scene.js` 的永久兼容层。

## 输入与安全边界

```text
可信 Legacy 文件
  └─ 静态提取对象字面量（不执行文件）
       └─ legacy-snapshot.json
            └─ 外部转换器
                 ├─ *.v4-candidate.tosampool.json
                 └─ *.conversion-report.json
```

转换器不执行任意 Legacy `.js`。已知场景逻辑可由外部语义适配器展开为普通 v4 对象；未知或不可安全解析的逻辑才标记为 `module-required`，由人工或 Agent 在外部适配为受信任项目 Scene Module。

## 输出语义

- **candidate**：结构有效的 v4 审计候选，不等于完整画面。
- **report v2**：逐项标明 `converted / builtin / native-mappable / hybrid / module-required / freeze-optional / frozen / manual / blocked`。
- **saveable: true**：所有迁移项已解决且候选结构有效；仍需视觉、性能与可编辑性审阅。
- **saveable: false**：仍有待适配 Module、冻结或人工映射的项目。

## `home-scene` 首次审计（2026-10-02）

已静态读取 `DEFAULT_HOME_SCENE`，未执行 `home-scene.js`。本机报告位于忽略目录 `.local/p5-home-scene/`。

| 结果 | 数量 | 结论 |
| --- | ---: | --- |
| `converted` | 2 | 月亮 parts 与四段背景底色已写入候选；仍需固定时间视觉验证 |
| `builtin` | 0 | 不为项目特例制造共享 Builtin |
| `native-mappable` | 11 | 列车、信号及其余景层可由图元、tile、scroll/repeat、Step 和显示段表达，待语义适配器展开 |
| `hybrid` | 0 | 不以“已有 parts”自动推断仍需 Module |
| `module-required` | 0 | 当前已知 `home-scene` 静态逻辑未发现必须 Module 的项 |
| `frozen` | 0 | 第一轮不冻结背景 |
| `manual` | 0 | 多 Scene 背景色已写入 v4 Scene 段背景 |
| `blocked` | 0 | 当前静态数据未证明存在真正不可移植依赖 |

通用候选通过结构校验但 `saveable:false`，原因是 11 项 `native-mappable` 尚未由**通用**转换器展开，不是因为它们必须 Module。现在已有独立的 `scripts/adapt-home-scene-native-v4.mjs`：它只接收抽取后的 JSON 快照，展开 12 个已知图层映射为普通 v4 `vector + parts + scroll/repeat + Scene timeline`，输出 `saveable:true`，不执行旧脚本、不引入 Builtin / Scene Module。原生候选把同一语义的四段 Scene 变化收纳在一个 `sceneVariants` 对象内，避免为四个互斥对象重复计算帧状态；Scene 1 的图元仍留在普通 `parts` 内供现有 Inspector 查看。`tests/home-scene-native-adapter.mjs` 在 0 / 12 / 24 / 36 / 47.9 秒做固定时间 Runtime smoke。

另有两条 Module 对照：`examples/modules/home-scene-full-module.js` 是一整个场景的保真/体积下界；`examples/modules/home-scene-layered-module.js` 与 `scripts/build-home-scene-layered-module.mjs` 则生成天空、月亮、云、树林、列车、雾等 12 个可独立选择、变换、蒙版和加效果的语义对象。月亮的四段 X/Y 与第二段隐藏显示时段直接写入 v4 时间轴，作为“程序绘制但外部可编排”的示例。后者不把细节降解成图元，也不为每一层制造永久 Builtin；它是“可编辑性接近原生、运行成本接近完整 Module”的中间基线。

## 三类 Agent 质量夹具

每个案例保存：视觉目标、载体选择表、外部素材、公开参数、固定时间截图、预览帧耗时、交付体积和人工补丁次数。

1. **文本雪花球**：验证自然语言到普通对象、素材和可选 Module 的选择能力。
2. **单图氛围动态化**：验证保真底图、语义分层、蒙版和局部运动，而非只加装饰边框。
3. **粗糙波普拼贴**：验证多素材、蒙版、加样与采样组合。

三例共同通过：v4 结构校验、固定时间确定性、编辑器与交付同帧、公开参数可被 Inspector 调整，以及载体选择有明确理由。
