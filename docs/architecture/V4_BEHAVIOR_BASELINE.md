# Legacy Behavior Baseline 1

> 2026-09-24 更新：候选页普通打开现为 V4；自动基线比较通过 `?legacy=1` 显式取得候选的 Legacy 壳。真实 V4 浏览器验收不再依赖 `v4vertical=1`，并新增场景/对象新页签及左侧效果索引的可见性断言。下方旧日期段落保留为当时证据，不代表当前入口条件。

> 冻结日期：2026-09-21。该基线是当前工作树的行为快照；仓库 HEAD 为 `2423acbe3db102d5a069606c975de8ae8544e31a`，但工作树已有尚未提交的产品修改，因此文件哈希而非 HEAD 是精确依据。

## 1. 冻结文件

| 文件 | SHA256 |
|---|---|
| `img2asset-layout-v1.html` | `4464B35E595F7CCE940C735FA4910C9550D778800D6B157FBA9FAE35F3AE45BA` |
| `img2asset-v4-classic.html`（初始副本） | `4464B35E595F7CCE940C735FA4910C9550D778800D6B157FBA9FAE35F3AE45BA` |
| `home-scene.js` | `53BC7BD47C3724F430F85408AD2AF0EB8BC786C76AD7F57C956DB731FA40FDD7` |
| `runtime-inline.js` | `748C6F3AC71073607AB8FFF8891A4B824F4764A931C26A56C5917D5478A4959E` |
| `editor/scene-mutation.js` | `28C535387D77608E7D92937123DEFCC276B875CC8A09C7FAF2B6ABEDA55DBDE4` |
| `editor/timeline-model.js` | `814F0CD088D01C348ED5028FFBE516C82DC3299B48657C849D51625600015ABB` |
| `editor/effect-registry.js` | `DFB99683D96EA6DFFBC348AAE42A56204E59532565ABD9F837BF0710494D1C3B` |

初始 Legacy 与 Classic Shell 均为 547,932 字节。任何基线升级必须同步新版本、哈希、CHANGELOG 与浏览器 parity。

Phase 3–7 开始后，候选页增加了获准的 Session Facade、Scene File Controller、Asset Controller、隔离 v4 Runtime、素材边界、Canvas/结构树投影、直接变换、多选/编组、基础 Inspector、矢量绘制、文字快照与字体连接、多帧拆分、对象内 Parts 与 Paint 接线；当前候选页 SHA256 为 `75926EF490DE9C820BE69F637EE9EFC5B2915C22555D6733C7BC53C3D4D7E619`、554,796 字节。浏览器测试会规范化这些已登记接线，再要求其余源码与 Legacy 完全相同；因此“架构开始迁移”不会被误报为界面差异。

## 2. 可观察行为域

基线不是“页面能打开”，而包括：顶部工作流和工具入口；左侧结构树与素材库；视口、高 DPI 辅助层和逐层选择；多选、组、调序、锁定/独显/隐藏；场景/组/元素/图元/粒子 Inspector；素材、多帧、背景与预处理；绘制、文字、颜色、纹理、阴影和描边；Scene/show/Step/Linear 时间轴；蒙版、旧区域 FX、全局效果、Sampling Motion、粒子；撤销、保存、测试页和帧/GIF 交付。

详细能力行由 [机器迁移矩阵](V4_MIGRATION_MATRIX.json) 管理。尚未建立浏览器操作夹具的行为仍是 `baseline-captured` 或 `unassessed`，不得推断为已迁移。

## 3. 已知基线语义：阴影与描边

Legacy 对对象先捕获一次透明实体，再从原始实体 Alpha 分别派生阴影和描边：

```text
shadow(original alpha) → outline(original alpha) → original
```

描边不应包住阴影。任何 v4 实现若对“阴影 + 原对象”的合成结果继续描边，即为回归，而非设计选择。

## 4. 浏览器环境

初始探针已证明 `playwright-core` 可驱动本机 Microsoft Edge。固定验收环境记录在 [Parity 测试计划](V4_PARITY_TEST_PLAN.md)；基线测试不得依赖 Codex 桌面 UI 自动化服务。

2026-09-22 已再次通过 `tests/browser/classic-shell-baseline.mjs`：在 1600×1000、DPR 1、固定 `t=0` 下，Legacy 与 Classic Shell 候选仍保持 DOM/关键区域几何、按钮状态、Canvas 像素哈希和整页截图完全一致；真实点击“新建场景”后弹窗一致，并使用仓库内测试生成的 PNG 完整对照了导入、预处理确认、素材库卡片、添加到场景及背景向导。另一个只在 `e2e=1&v4vertical=1` 同时存在时启用的受控测试会话，会复用同一预处理弹窗和背景放置面板完成 v4 入库、图片放置及 tile 背景；v4 Workspace 变更通过订阅驱动主 Canvas 和层级结构树投影，并验证树点击与 Canvas 命中双向同步。该会话还真实验证了单对象与多选联合框的移动、四角缩放、旋转、镜像，自定义 pivot 放置，Ctrl/Cmd+G 编组、组级 Canvas 变换、Ctrl/Cmd+Shift+G 解组、Delete，以及非 HTML5 的 Pointer 调序、树边缘自动滚动、锁定后 Canvas 命中过滤、持久隐藏和不写入作品的独显预览；身份编组前后固定时间画面像素必须一致，每次手势或结构操作只产生一条历史，Esc 恢复开始快照。基础 Inspector 也已验证对象字段写入/撤销、清选回到场景上下文及编组上下文同步。随后通过浏览器下载保存、重新打开并比较固定时间像素和 pivot 数据。普通页面与桌面入口均无法启用该会话。Phase 6 仍标记为 `schema-ready`，因为嵌套组极端变换、组块跨层调序的完整组合，以及动态/效果/时序 Inspector 尚未达到 Legacy 等价。动态性能文字、CSS 动画、输入光标与随机对象 ID 在比较前被确定性归一；这属于批准的测试遮罩，不改变默认页面行为。

Phase 7 受控夹具还会真实拖出带圆角和路径描线的矩形、Shift 正圆及点选多边形，并检查单手势历史、归一化顶点和 Runtime 圆角路径；文字夹具会原位输入多行内容，确认参数仍可编辑且场景只保存透明 PNG 回退、不嵌入字体二进制。外部字体夹具进一步验证浏览器字体只在当前会话载入，Scene 保存稳定 `fontId / family / fileName / locator` 连接与文字 PNG 快照，不保存完整字体 data URL；Tauri 选择器按 `accept` 切换字体白名单。最新夹具还把单矩形原子提升为 `vector.parts`，验证树展开、图元选中、图元 Inspector、青框移动、Delete 仅删除 part、撤销，以及 Runtime 的 vector/image parts 直接路径与统一效果胶囊；同父图元的 Ctrl/Cmd 追加、Ctrl/Cmd+A、联合移动/缩放/旋转/镜像和 Esc 分层退出也已进入真实 Edge。联合移动、缩放、旋转和镜像还会置于两层旋转/非等比父组链下执行，撤销必须恢复固定时间像素；组合对象经 v4 序列化并重开后，part id、顺序、Paint 与固定时间像素必须一致。Paint 验收覆盖单图形与 part 共用的描线/纯色/纹理三开关、复合取色器、独立颜色 Alpha、1–3 层线纹、点纹、棋盘、纹理预览、画布锚定缓存，以及 Inspector 启用或改型后固定时间画面即时改变；Runtime 较慢时结构树必须先于异步 Canvas 重绘同步。该验收仍不代表多帧图片 + parts 组合、桌面重启后的字体 locator 自动恢复或 Phase 7 全域回归已经完整迁移。
