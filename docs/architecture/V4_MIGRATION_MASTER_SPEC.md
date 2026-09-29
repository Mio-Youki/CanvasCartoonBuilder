# v4 Classic Shell 迁移总规范

> 状态：**已批准，迁移实施的唯一总规范。**
> 基线：`Legacy Behavior Baseline 1`（2026-09-21）。
> 目标：在不改变未列入白名单的用户体验前提下，以 Legacy 体验壳承载隔离的 Legacy JS 与 v4 JSON 会话，并逐步用 v4 Core 替换内部机制。

## 1. 不可违背的目标

1. `img2asset-layout-v1.html` 是冻结的 Legacy 产品与行为基线。
2. `img2asset-v4-classic.html` 是正式迁移候选，初始内容必须与 Legacy 基线逐字节一致。
3. `img2asset-vnext.html` 只用于 schema / Runtime / 性能实验，不承担正式产品 UI 迁移。
4. 除 [差异白名单](V4_DIFFERENCE_ALLOWLIST.md) 外，布局、控件、快捷键、交互手感、跨面板同步、画面、历史、保存和导出结果都必须与 Legacy 一致。
5. 未涉及重构的机制第一次迁移必须复用 Legacy 行为；不得以“v4 设计”“代码更整洁”为理由重新设计。
6. 优化必须先提交提案并经产品负责人确认；缺少批准时只能修复相对 Legacy 的退化。
7. Tauri 默认入口在全部 P0/P1、视觉、性能和双会话验收通过前继续指向 Legacy。

## 2. 页面与会话职责

| 文件 | 职责 | 禁止事项 |
|---|---|---|
| `img2asset-layout-v1.html` | 可用 Legacy 产品、行为基线 | 承担 v4 新机制；为迁移方便而改变行为 |
| `img2asset-v4-classic.html` | Legacy 完整体验壳上的正式迁移候选 | 从 vNext 实验页反向拼接 UI；双写 Scene |
| `img2asset-vnext.html` | v4 Core 实验与合同验证台 | 成为产品入口；以补按钮方式冒充体验迁移 |

Classic Shell 支持两种严格隔离的会话：

```text
同一个 Shell / Controller
        ├─ LegacyFacade → HOME_SCENE → Legacy Runtime → JS 保存
        └─ V4Facade     → v4 Scene   → v4 Runtime     → .tosampool.json 保存
```

- 每次只允许一个会话和一个可写 Scene。
- Legacy JS 会话保留程序元素、专用绘制函数、旧 FX、旧保存与导出，不自动获得 v4 新字段。
- v4 JSON 会话只通过 `Workspace → SceneMutation → v4 Scene` 修改作品。
- View Model 只保存选择、树展开、滚动、缓存和辅助层状态，不得被保存或导出。
- Controller 不得直接判断底层格式；只调用当前会话的 Facade。

## 3. Facade 能力边界

| 能力族 | 必须覆盖的行为 |
|---|---|
| `session` | 新建、打开、保存、另存、格式、locator、脏状态、能力查询 |
| `scene` | 画布、背景、实体、组、素材、图元与效果的只读投影 |
| `selection` | 单选、多选、清选、逐层进入、锁定过滤、Canvas↔树定位 |
| `transform` | 移动、缩放、旋转、镜像、pivot、组联合变换 |
| `structure` | 编组、解组、排序、进入/移出组、重命名、隐藏、锁定、独显 |
| `assets` | 导入、多帧、recipe、预处理、素材卡、放置、背景 |
| `timeline` | 播放头、Scene 段、显示窗口、Step、Linear、上下文轨 |
| `effects` | Registry、启用、参数、处理阶段、蒙版、效果时序 |
| `history` | 单动作事务、撤销、重做、手势预览、提交与取消 |
| `preview` | 失效、固定时间渲染、质量档、缓存与性能指标 |
| `delivery` | 测试页、保存格式、帧、GIF、自包含资产 |

Canvas 手势统一遵循 `begin → preview → commit/cancel`，一次用户手势只产生一条历史。候选页禁止新增直接 `pushHistory()` 或 Controller 内直接字段写入。

## 4. 代码迁移原则

### 4.1 先复制，再替换

候选页先是 Legacy 的逐字节副本。每个切片按下列顺序实施：

```text
捕获 Legacy 行为
→ 建立真实浏览器测试
→ 抽出同一 UI / 手势 Controller
→ 接回 LegacyFacade，证明行为未变
→ 接入 V4Facade / schema / Runtime
→ 双页面 parity
→ 人工验收
→ 才允许清理候选页旧路径
```

不得先删除旧实现、再凭印象重写。未迁移能力可以使开发中的 v4 会话暂时不可用，但不能让正式 Legacy 产品退化，也不能提前切换默认入口。

### 4.2 不受重构影响的机制

视口、素材预处理、素材卡、选择框、多选、组、结构树、拖放、背景、多帧、文字、绘制、快捷键、时间轴手势、历史和交付入口，首次迁移均以 Legacy 的可观察结果为准。明显缺陷也先登记为基线缺陷，再单独修复并更新基线。

### 4.3 允许重构的机制

只有白名单中的 v4 Scene、处理管线、区域效果表达、builtin 与性能内部实现允许变化；允许变化不等于允许画面或体验退化。所有差异必须有稳定 ID、批准记录、测试遮罩和回滚方法。

## 5. 处理层合同

对象默认管线是 `mask → decorate → sample`，三个大阶段允许整体调序。

```text
stageSource
 ├─ mask：按所在位置裁切当前输入
 ├─ decorate：每个加样效果独立派生自同一 stageSource，再合成
 └─ sample：像素变换按 Registry 固定顺序串行执行
```

`decorate` 内阴影、描边、颜色叠加、纹理、内外光效不得无意级联。以 Legacy 阴影/描边为例：

```text
shadow  = shift(alpha(stageSource))
outline = expand(alpha(stageSource))
result  = shadow → outline → stageSource
```

禁止先得到“阴影 + 本体”再对整体描边。若用户把 `mask` 放到 `decorate` 后，蒙版才允许裁掉阴影和描边；这属于明确的大阶段顺序，而非隐藏副作用。

旧 `fx.layers[]` 只在 Legacy 会话运行。转换到 v4 时，它作为位于对象之后的场景效果处理：范围成为效果蒙版，绑定仅表示范围/蒙版跟随，不伪装继承对象 z。不能无损表达时必须阻止无损转换并报告。

## 6. Legacy 转换与 builtin

“转换为 v4”必须由用户主动触发，创建新的 `.tosampool.json`，不覆盖原 JS，并生成逐项报告。

转换顺序：

1. 声明式且无损的字段自动转换；
2. 程序元素有稳定 builtin 时转成 builtin；
3. 没有 builtin 时默认阻止完整转换；
4. 用户可逐项选择冻结为图片，并明确接受动态/参数损失；
5. 用户可取消转换并继续 Legacy 会话；
6. 不允许把任意 `program.code` 写入 v4 JSON。

每个 builtin 必须有稳定 id/版本、参数 schema、包围盒与 pivot、明确可动画参数、固定时间确定性渲染、无 DOM/网络依赖、按需自包含打包、视觉基准及 Agent manifest。

## 7. 迁移顺序

1. 冻结 Legacy 基线，建立 Playwright parity 工具；
2. 创建逐字节 Classic Shell 副本并证明相同；
3. 建立双会话壳与 Facade；
4. v4 素材闭环：导入、预处理、素材库、放置、背景、保存重开；
5. Canvas 闭环：选择、变换、快捷键、树同步；
6. 结构闭环：多选、组、调序、锁定、隐藏、独显；
7. 图元、绘制、文字、多帧；
8. Scene 段、显示时段、Step、Linear、上下文时间轴；
9. 新处理管线、效果卡与场景滤镜；
10. 粒子、builtin、Legacy 转换器；
11. 测试页、帧/GIF 与自包含交付；
12. Tauri 完整验收并决定切换入口。

Phase 10 按纵向闭环继续，不并行铺开三类风险。粒子首切片及 S/M/L 独立性能预算已经通过；受控 Builtin Registry 的第一纵切片也已完成 Runtime、Inspector、时序白名单、保存重开、真实 Edge 与 Agent manifest。下一步才允许 Legacy 转换器依赖该已验证边界；转换器不能重新引入任意代码执行。

首个完整纵向闭环必须达到：导入/预处理图片 → 素材库 → 放置 → Canvas 变换 → Inspector → 时间轴播放 → 保存/重开 → 测试页。完成前冻结新增产品功能。

## 8. 迁移状态与完成定义

机器矩阵只允许：`unassessed`、`baseline-captured`、`schema-ready`、`runtime-parity`、`controller-parity`、`browser-parity`、`complete`、`blocked`。

一个能力标记 `complete` 必须同时满足：

1. Legacy 基线操作与预期已记录；
2. v4 持久 schema 与验证器稳定；
3. Runtime 固定时间结果响应正确；
4. Canvas、树、Inspector、时间轴严格同步；
5. 一次动作只有一条可撤销 Mutation；
6. 保存、重新打开和交付结果一致；
7. Edge 浏览器连续操作与视觉回归通过；
8. 性能达到 [Parity 测试计划](V4_PARITY_TEST_PLAN.md)；
9. 差异均在白名单内；
10. 产品负责人完成集中人工验收。

不得以同名按钮存在、状态单测通过或一次人工试用替代上述条件。

## 9. 优化与基线升级

优化提案必须包含 Legacy 行为、问题、可观察差异、数据影响、性能数据、视觉对照、已有文件影响和回滚方案；经明确批准后才能实现。

Legacy 若需修复：先加复现测试 → 修改 Legacy → 更新 Baseline 版本/校验值 → 同步候选 → 重跑 parity → 记录 CHANGELOG。候选页不得单独“顺手优化”。

## 10. 发布闸门

Tauri 或 GitHub 默认入口只有在 P0/P1 全部完成、双会话保存重开通过、代表场景视觉回归通过、1920×1080 性能不低于 Legacy、所有差异获批后才能切换。切换本身必须是独立、可回退的提交。

## 11. 关联文件

- [机器迁移矩阵](V4_MIGRATION_MATRIX.json)
- [Legacy 行为基线](V4_BEHAVIOR_BASELINE.md)
- [差异白名单](V4_DIFFERENCE_ALLOWLIST.md)
- [Parity 测试计划](V4_PARITY_TEST_PLAN.md)
- [v4 Scene 合同](VNEXT_SCENE_CONTRACT.md)
- [v4 Classic 时间轴迁移合同](V4_TIMELINE_MIGRATION_CONTRACT.md)
- [效果系统](EFFECT_SYSTEM_VNEXT.md)
