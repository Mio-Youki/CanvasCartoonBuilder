# Agent Tool Protocol（草案）

> 目标：让外部 Agent 与 ToSampool / 图森破围绕同一 v4 项目合同协作，而不是让 Agent 直接操控不稳定的界面坐标或输出无法验证的任意 Canvas 代码。
>
> 字段真相仍以 [SCENE_SPEC.md](../../SCENE_SPEC.md) 为准；视觉生成步骤见 [AGENT_GENERATE_SPEC.md](AGENT_GENERATE_SPEC.md)。本文件只定义协作动作、输入输出与验收。

## 1. 设计原则

1. **项目内容是共同中间物**：声明式对象修改使用 Scene Patch；项目 Scene Module 作为独立、显式、可审阅的项目文件修改，不把源码塞进 Scene，也不修改共享 Runtime。
2. **先诊断，后变更**：每次修改先读取场景摘要和固定时间预览，再限定目标对象与影响范围。
3. **最小 Patch**：一次请求只改必要对象；保留稳定 `id`、命名和未涉及的层级。
4. **可验证、可撤销**：每次 Patch 都应有校验结果、固定时间预览点和可回退的前态。
5. **渐进披露**：初始生成只暴露基础 Scene 能力；用户提出局部时序、蒙版、FX 需求后，才向 Agent 提供对应高级字段。

编辑器内部的 `EditorCommands` 只提供稳定工作流入口，不等于 `applyScenePatch`。Agent 可以调用保存、测试、固定时间渲染等安全命令；对象字段修改仍必须提交声明式 Patch，经 Scene schema、引用关系和历史边界校验，不能通过模拟 UI 点击代替。

## 2. 最小动作集

| 动作 | 输入 | 输出 / 约束 |
|---|---|---|
| `readScene` | 场景文件 | Scene 摘要：画布、场景段、对象表、图片、组、FX、可编辑性诊断 |
| `renderFrame` | Scene + 确定 `t` | 预览图与运行告警；不得依赖编辑器 RAF 状态 |
| `locate` | `id` / 名称 / 语义 | 精确对象、父组、相关蒙版/FX/时段与包围盒 |
| `proposePlan` | 用户意图 + 参考材料 | 元素表、载体判断、修改范围、不可保真项；不直接伪造图片资源 |
| `applyScenePatch` | 声明式 Patch | 新 Scene、变更摘要、保留的稳定 id；不得注入函数或 `program.code`。程序对象只能引用已随项目提供并经信任的 Module id/version |
| `updateSceneModule` | 项目 Module 源 + Manifest | 独立文件变更、公开参数差异、素材依赖、固定时间验证和信任提示；不得绕过项目边界修改共享 Runtime |
| `validateScene` | Scene | Schema、引用循环、资源、保存往返和固定时间渲染结果 |
| `compareFrames` | 基准帧 + 新帧 | 差异摘要与人工审稿点；只辅助判断，不作为唯一视觉质量标准 |

## 3. Patch 形态

协议实现前可用 JSON 兼容的抽象 Patch；不得要求 Agent 输出整份无关 Scene。

```js
{
  intent: 'make-night',
  targetIds: ['sky', 'river', 'tree-foreground-01'],
  operations: [
    { op: 'set', path: 'elements.tree-foreground-01.style.shadow.color', value: '#18243a' },
    { op: 'add', collection: 'fx.layers', value: { id: 'night-fog', /* 合法 fx schema */ } }
  ],
  checks: [{ t: 0 }, { t: 12 }]
}
```

实际路径、合法字段与 `add` 对象必须由 Scene schema 校验。Patch 应报告新增/删除/修改的对象，删除带有其他引用的对象必须先显式说明影响。

## 4. 初始生成与局部修改的不同权限

| 阶段 | Agent 可见能力 | 必交付物 |
|---|---|---|
| 视觉规划 | 参考角色、画布、元素表、可编辑性预算 | 场景蓝图与载体判断 |
| 初始生成 | 普通对象、图片/序列、组、粒子、可选项目 Module、基础动画与场景段 | 合规 v4 Scene/Project、载体表、近似说明 |
| 局部修正 | 目标对象、当前预览、必要的蒙版/FX/时序字段 | 最小 Patch、前后预览点、验证结果 |
| 兼容迁移 | 既有 JS 与受支持字段 | 报告 v2、转换/混合/Module/冻结/人工/真正阻塞清单 |

不要在初始生成提示中强制讲解所有时序轨道、复杂蒙版或局部 FX；这会增加不必要的 schema 噪声。高级能力应由明确用户需求或工具诊断触发。

## 5. 三案例验收矩阵

| 案例 | 关键验证 | Agent 成功条件 |
|---|---|---|
| 微缩景观/雪花球 | 层次、粒子、光照/时段、持续循环 | 语义层次清楚；运动层可单独调整 |
| 静图转氛围场景 | 底图与结构层取舍、局部运动 | 不用低质量 parts 强行替代高密度静态细节 |
| 粗糙波普拼贴 | 快速装配、描边/纹理/效果、导出 | 用户能无需代码替换素材与调整风格 |

所有案例共同通过：可导入 → 可编辑 → 保存 → 再打开 → 独立测试页 → PNG/GIF。记录性能预算与人工修正次数；“文件能解析”不是成功标准。

## 6. 暂不承诺

- 单轮高保真参考图重绘；
- 任意网页、视频、WebGL 或自定义 Canvas 函数的无损迁移；
- 在未封装桌面项目层前，对原图路径和处理配方的长期持久化；
- 内置 Agent 聊天、远程模型服务或自动执行不可审阅修改。
