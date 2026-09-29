# v4 Classic Shell 桥接协议（辅助说明）

> 2026-09-24 当前入口：`img2asset-v4-classic.html` 普通打开即创建并激活 V4；`?legacy=1` 只用于候选壳与冻结基线的 parity 对照。对象 Inspector 使用“成样 / 加样 / 采样”，场景 Inspector 使用“成样 / 叠加滤镜 / 采样滤镜”，左侧效果索引在普通 V4 会话可见。下文涉及 `e2e=1&v4vertical=1` 或“候选默认 Legacy”的描述仅记录旧迁移阶段，不再是当前行为。Tauri 入口仍保持 Legacy，直至全部 P0/P1 门禁完成。

> 状态：**辅助设计说明。** 迁移范围、顺序、门槛与差异审批统一以 [v4 Classic Shell 迁移总规范](V4_MIGRATION_MASTER_SPEC.md) 和 [机器迁移矩阵](V4_MIGRATION_MATRIX.json) 为准；本文只解释桥接结构。

## 1. 决策

正式 v4 编辑器采用“**Legacy 体验壳 + v4 Core**”路线：

```text
Legacy 可观察交互 / 布局 / Canvas 辅助层
                  ↓
           通用 Controller
                  ↓
             EditorFacade
                  ↓
  v4 Workspace → Scene Mutation → v4 Scene → v4 Runtime
                  ↓
         Preview / Save / Test / Export
```

- `img2asset-layout-v1.html` 继续是可用的 Legacy 编辑器和行为基线。
- `img2asset-vnext.html` 继续是隔离的 v4 schema / Runtime 验证台，不承担正式产品 UI 的持续补洞。
- 正式 v4 页面从 Legacy 页面复制体验壳；已解锁操作必须经 `EditorFacade` 写 v4 Scene，不能双写 Legacy Scene。

## 2. 单一事实来源

### 当前实施状态（2026-09-22）

`editor/session-facade.js` 已提供第一层无 DOM 会话路由：Legacy JS 与 v4 JSON 适配器共享固定领域表，支持能力查询、严格单活动会话、脏状态切换保护及状态订阅。`editor/scene-file-controller.js` 已接管候选页的新建/打开/保存命令：Legacy 继续调用原函数；v4 文件可被准确识别，但在完整纵向闭环完成前以 `V4_SESSION_NOT_READY` 明确阻止，且不会切换会话或修改 Workspace。`editor/asset-controller.js` 已接管候选页的文件/拖放/Host 导入、素材卡添加、选中素材添加和背景入口；Legacy 分支仍调用原预处理与放置实现。v4 侧已由 `vnext-asset-workflow.js` 贯通预处理描述、素材入库、图片/背景放置、固定时间预览、保存与重开，并作为 v4 `assets` 领域注册。真实 Edge 现通过仅供自动验收的 `e2e=1&v4vertical=1` 联合开关，复用 Legacy 预处理弹窗和背景放置面板完成入库、图片及背景放置，再执行 `.tosampool.json` 下载保存、重新打开和固定时间像素一致性验证。普通候选页仍默认激活 Legacy且不创建 v4 文档，桌面入口也不携带该联合开关。测试会话已通过 Workspace 订阅把 v4 固定时间画面和实体列表投影到 Classic Canvas/层级结构树，并验证树选中与 Canvas 命中同步。独立 `classic-v4-transform-controller.js` 现提供固定屏幕像素手柄、单选及多选联合框的移动、固定对角四角缩放、旋转、水平/垂直镜像、自定义 pivot 放置与 Esc 回滚；pivot 同时进入 Runtime 世界矩阵、内容绘制、粒子和命中，而不是编辑器私有数据。`classic-v4-view-controller.js` 以同一选择集驱动 Canvas 与结构树，支持 Ctrl/Cmd 多选、Ctrl/Cmd+A、Ctrl/Cmd+G、Ctrl/Cmd+Shift+G 与 Delete；真实组拥有成员包围盒和父级 TRS，身份编组不改变固定时间像素。结构树现沿用 Legacy 的 Pointer 阈值与前/后/中央落点，不进入 Edge 原生拖放；跨父级移动先换算世界矩阵以保持画面位置，组作为连续平铺块移动。锁定进入持久 Scene 并阻止 Canvas 命中，隐藏使用 Runtime `hidden`，独显只生成临时预览 Scene，不修改保存数据。pointer move 仅做预览，pointer up 才向 `SceneMutation` 提交一条历史，作品重绘按浏览器帧合并。嵌套组的不可表示剪切边界、全组合调序、自动滚动、完整视口手感和 Inspector 尚未迁移，因此相关能力继续保守标为 `schema-ready`，不能因该切片贯通而宣称完整 `controller-parity` / `browser-parity`。

当前补充状态：结构树已接入前/后/中央 Pointer 调序、边缘自动滚动、锁定/独显/隐藏；Inspector 已接入场景、对象、组、图元、多选、Registry 效果与共享采样控制器；Scene / 显示时段 / 对象属性 / 效果的 Step 与受限 Linear 已通过真实 Edge 验收。独显仍是临时预览。统一蒙版状态、Inspector、绿色 Canvas 编辑、校验、Runtime 与保存重开已接入；对象处理阶段排序与左侧效果索引也已接入，索引卡通过 Inspector API 同步上下文时间轴，停用沿 Effect State 清轨。下一阶段只补全各卡片种类与重开恢复的组合验收，不得回退到旧 `fx.layers` 双写。

性能边界补充：Classic v4 View 已提供 300 帧滚动 P95、绘制/跳过、Runtime backing / Surface、工作像素与 Player 读数。1920×1080 单静图真实 Edge 门禁已证明播放期间不重复画主 Canvas；对象胶囊 + 场景滤镜的动态 S/M/L 压力夹具也已验证 2× / 4× / 8× Draft 与真实 Auto 切换。多遍 M/L Full 仍是保真成本边界，不宣称实时；测试页和导出继续保持完整质量。

迁移期间不得存在两个可被 UI 修改的 Scene：

| 数据 | 允许用途 | 禁止用途 |
|---|---|---|
| Legacy `HOME_SCENE` | 旧页面、旧作品、行为对照 | 作为新页面的后台可写镜像 |
| v4 `tosampool-scene/v4` | 新页面、保存、Runtime、未来导出 | 回写为旧数组 / `fx.layers` 以驱动新 UI |
| 临时 View Model | 选择框、树展开、缩略图、命中缓存 | 保存、导出或第二份作品数据 |

Controller 可以从 v4 Scene 派生 Legacy 习惯的卡片或轨道，但所有编辑最终只调用 v4 Mutation；不得用“先改旧数据、再同步 v4”的双向镜像换取短期复用。

## 3. EditorFacade 最小边界

体验壳不得直接读写实体内部字段，只依赖以下能力族：

| 能力 | 责任 |
|---|---|
| `session` | 新建、打开、保存、locator、脏状态 |
| `scene` | 画布、背景、实体、组、素材的只读派生 |
| `selection` | 单选、多选、清选、锁定过滤、上下文对象 |
| `transform` | 移动、缩放、旋转、镜像、枢轴、组联合变换 |
| `structure` | 编组、解组、排序、隐藏、锁定、独显 |
| `assets` | 导入、recipe、素材卡、放置、背景 |
| `timeline` | 播放头、Scene 段、显示窗口、Step / Linear、上下文轨 |
| `effects` | Registry 派生、启用、参数、阶段排序、范围蒙版 |
| `history` | 单手势事务、撤销、重做、取消手势 |
| `preview` | 失效、固定时间渲染、质量档、性能指标 |

所有作品修改必须形成一条 `SceneMutation`。Canvas 拖拽遵守 `begin → preview → commit/cancel`，不得在 pointer move 中持续创建历史。

## 4. Legacy 代码的迁移分类

| 类别 | 例子 | 处理 |
|---|---|---|
| A：无作品数据的体验代码 | 高 DPI Overlay、视口缩放/平移、按键、滚动定位、DOM 布局 | 原样或轻改复用 |
| B：可映射交互 | 图片放置、选择框、结构树排序、预处理、时间轴手势 | 复用交互，替换为 Facade 写入 |
| C：需先补 v4 schema / Runtime | Scene 段、图元、复杂多帧、pivot、可编辑路径 | 字段/Runtime 就绪前不解锁 |
| D：旧格式特有 | `program.code`、专用绘制函数、`fx.layers`、旧 `show` | 不复用执行逻辑；转换为 builtin、素材冻结或保留 Legacy |

## 5. 迁移切片与完成定义

每个切片必须形成：

```text
Legacy 行为基线
→ v4 Scene 字段 / validator
→ Runtime 固定时间响应
→ Facade Mutation
→ Canvas / 树 / Inspector / 时间轴一致
→ 单手势历史
→ 浏览器连续操作验收
```

首个切片固定为：

```text
新建 v4 Scene → 导入单张图片（含 recipe）→ 放置到画布
→ 选择、移动、缩放、旋转 → Inspector 同步
→ 静态预览不卡顿地播放时间轴 → 保存并重新打开
```

结构树与组、Scene 段时间轴、图元/文字/多帧及 Step / Linear 基础设施已经通过迁移门禁。后续依次完成：统一蒙版与成样/加样/采样管线 → 场景滤镜 → 粒子/builtin → 导出 → 旧 JS 转换向导。

当前结构/组切片只承诺可由平移、旋转、缩放表达的 TRS。非均匀缩放的父组与已旋转子项组合后可能产生剪切，而 v4 Scene 尚无 `skew` 字段；解组不能假称能无损保存这种不可表示矩阵。正式开放嵌套组前，必须选择限制该组合、保留父组，或扩展明确的矩阵/剪切合同。

## 6. 禁止回退

- v4 页面不加载 `home-scene.js`，不运行 `program.code`，不读写 `fx.layers`。
- 未接线能力必须禁用或标明“迁移中”，不得以同名 Legacy 控件暗中生效。
- Step / Linear、v4 Scene 段与新效果只在 v4 落地；Legacy 仅修既有缺陷。

## 7. 关联合同

- [VNEXT_SCENE_CONTRACT.md](VNEXT_SCENE_CONTRACT.md)
- [EFFECT_SYSTEM_VNEXT.md](EFFECT_SYSTEM_VNEXT.md)
- [EDITOR_BEHAVIOR_SPEC.md](EDITOR_BEHAVIOR_SPEC.md)
- [VNEXT_PARITY_AUDIT.md](VNEXT_PARITY_AUDIT.md)
- [V4_PREVIEW_PERFORMANCE_CONTRACT.md](V4_PREVIEW_PERFORMANCE_CONTRACT.md)
