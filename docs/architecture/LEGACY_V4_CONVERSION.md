# Legacy → v4 转换合同

> 状态：转换核心保留为**编辑器外部工具**；v4 产品入口不加载它，也不接受 Legacy JS。逐项冻结确认界面若继续开发，应作为单独迁移工具，而非编辑器面板。

转换是外部工具显式触发的“创建 v4 副本”，不是打开文件时的隐式升级。它永远不覆盖原 JS；v4 编辑器只打开已经生成的 `.tosampool.json`。

## 四种结果

| 状态 | 含义 | 当前处理 |
|---|---|---|
| `converted` | 图片、背景图片、通用 parts 等声明式数据可直接表达 | 写入新的 v4 文档 |
| `builtin` | Legacy 项明确引用已注册 builtin | 写入 `type:"builtin"` 与稳定 id/version |
| `frozen` | 用户明确接受内部参数和动态损失 | 以提供的图片 locator 写入 v4；核心 API 已支持，UI 待做 |
| `blocked` | `program.code`、未知专用绘制、旧粒子结构 / FX 等无法无损表达 | 停止交付，导出报告，继续留在 Legacy |

`manual` 表示已保留一个安全基础值，但仍有需要用户处理的差异，例如 Legacy 多 Scene 底色数组在当前 v4 中只保留第一项。它不会伪装成无损转换。

## 安全边界

- 转换核心只接收 Legacy 会话已经解析出的数据对象，不读取或执行原始 JS 文本。
- Scene 中不得出现函数、`program.code` 或未知 builtin id。
- `fx.layers` 不会被误写成同 z 的对象效果。其绑定和排序无法无损表达时必须阻止。
- 报告格式为 `tosampool-legacy-conversion-report/1`，记录每个源项的状态、目标 id、原因和损失。

## 当前能力与待办

已完成：图片/图片背景、通用 parts、旧式 parts 填描字段、基础变换、按 Scene 数组的基础 Step 值、`show` 到 visibility、`train-beam` builtin、结构校验、真实 Edge 的工具栏转换。

未完成：逐项冻结预览与确认、旧粒子结构的转换向导、旧 `fx.layers` 的人工映射向导、所有 `home-scene.js` 专用绘制函数的 builtin/冻结决策。v4 Runtime 已支持图片源的 `particle-age` 播放语义，但这不等于旧粒子数据能被无损自动转换。因此当前首页列车样例仍会得到诚实的阻止报告，而不是一份缺层的伪成功文档。
