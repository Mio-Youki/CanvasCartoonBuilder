# Legacy → v4 转换合同

> 状态：转换核心是**编辑器外部工具**。v4 产品入口不加载 Legacy JS，也不把 Legacy 兼容层带入 Runtime。

转换是显式创建 v4 副本，不是打开旧文件时的隐式升级。它永远不覆盖原文件；编辑器只打开已经形成的 v4 Scene / Project。

## 报告状态

| 状态 | 含义 | 是否已解决 |
|---|---|---:|
| `converted` | 图片、背景、通用 parts 等可直接表达 | 是 |
| `builtin` | 源项明确映射到已注册共享 Builtin | 是 |
| `native-mappable` | 已知绘制语义可由 v4 图元、tile、滚动、时序和动画表达，尚待专用适配器展开 | 否 |
| `hybrid` | 已生成部分 v4 基底，但剩余部分仍待在原生映射、Module 或冻结间作决定 | 否 |
| `module-required` | 未知或不可安全解析的程序绘制，应适配为项目 Scene Module | 否 |
| `freeze-optional` | 可继续写 Module，也可由用户选择冻结为素材 | 否 |
| `frozen` | 用户明确接受冻结与内部可编辑性损失 | 是 |
| `manual` | 需要人工映射，例如旧粒子、局部 FX 或多 Scene 背景 | 否 |
| `blocked` | 经审计确认依赖 DOM、网络、外部全局状态等，无法安全携带 | 否 |

`blocked` 只表示真正不可移植或不安全；“无法自动降级为声明式对象”不等同于“无法迁移”，而“尚未由通用转换器展开”也不等同于“必须使用 Module”。报告为 `tosampool-legacy-conversion-report/2`。只有不存在 `native-mappable / hybrid / module-required / freeze-optional / manual / blocked` 且结构校验通过时，候选才是 `saveable:true`。

## 安全边界

- 静态提取器只读取可信文件中的对象字面量；转换器只处理 JSON 数据，不 `import`、`eval` 或执行 Legacy 源码。
- 持久 Scene JSON 不保存函数体、`program.code` 或未知 builtin id。
- `program.code` 和专用绘制可在**编辑器外部**被人工适配为受信任项目 Scene Module；转换报告只声明这项工作，不执行原代码。
- `fx.layers` 不会冒充同 z 的 v4 效果；它进入 `manual`，由人决定映射到对象效果、场景滤镜或 Module 内部。
- `native-mappable` 与 `hybrid` 候选只用于审计，不能被宣传为保真迁移结果。

## 当前能力与下一步

已完成：图片/背景、通用 parts、旧式填描字段、基础变换、按 Scene 数组的 Step 值、`show` 到 visibility、受控 builtin、冻结入口、候选校验和报告 v2。

`home-scene` 将有两条互不替代的实验路径：原生映射版把已知 tile、滚动、场景时序和图元动画展开为普通 v4 对象，用来测量编辑性；完整项目 Scene Module 版保留原绘制结构，用来建立保真与交付基线。两者都不是永久兼容层，也不要求未来 Agent 场景默认模块化。
