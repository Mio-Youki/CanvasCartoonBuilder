# 既有 JS → ToSampool v4 迁移协议（改写 Agent）

> Scene 字段以 [VNEXT_SCENE_CONTRACT.md](../architecture/VNEXT_SCENE_CONTRACT.md) 为准；状态模型以 [LEGACY_V4_CONVERSION.md](../architecture/LEGACY_V4_CONVERSION.md) 为准。

## 目标

把既有 Canvas/参数化场景迁移为 v4 项目内容，不声称任意代码都能自动声明式参数化，也不因无法自动降级就判定不可迁移。v4 编辑器不读取旧 JS；提取、审计和 Module 适配都在编辑器外进行。

## 迁移状态

| 状态 | 处理 |
|---|---|
| `converted` | 静态几何、图片、基础变换和可表达时序直接写入 Scene |
| `builtin` | 明确映射到已有共享 Builtin |
| `native-mappable` | 已知绘制语义可由现有 v4 图元、tile、滚动与时序展开，等待专用适配器 |
| `hybrid` | 先保存可声明基底，专用绘制仍需项目 Scene Module |
| `module-required` | 将作品专用绘制适配为独立 Module + Manifest |
| `freeze-optional` / `frozen` | 用户可选择冻结为素材，并明确内部可编辑性损失 |
| `manual` | 旧粒子、FX、背景时序等需要人工语义映射 |
| `blocked` | 仅用于真正依赖 DOM、网络、外部全局状态或无法安全携带的逻辑 |

## 输出要求

1. v4 候选 Scene 与 `conversion-report/2`。
2. 源视觉语义 → 目标对象/Module → 状态 → 损失的映射表。
3. 选择 Module 时，提供独立源文件与 Manifest：稳定 id/version、bounds、公开参数、素材白名单、时间/seed 和性能等级。
4. Scene JSON 不含函数、`program.code`、外部 URL 或未知 builtin。
5. 报告仍有 `native-mappable / hybrid / module-required / freeze-optional / manual / blocked` 时，候选不得标记为完成迁移。

## 禁止事项

- 不在 v4 编辑器或转换器中执行 Legacy 文件。
- 不把复杂专用画面强拆成大量低质量图元以伪造“完全可编辑”。
- 不为单个作品特例扩充永久 Builtin；作品专用代码随项目作为 Scene Module 交付。
- 不把项目 Module 注入共享 Player；它必须通过项目包和交付构建器显式携带。
