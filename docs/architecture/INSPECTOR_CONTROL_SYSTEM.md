# Inspector 控件与效果注册合同

## 1. 目的

Inspector 是 Scene 的派生编辑界面，不拥有第二份业务数据。新增功能不应分别手写“启用、展开、撤销、刷新、默认值、保存”六套逻辑。

```text
效果注册表：名称 / 顺序 / 默认值 / 控件描述
                      ↓
Inspector 公共控件：启用 / 渐进披露 / 数值 / 选择 / 颜色
                      ↓
Scene Mutation：一次用户意图、一次撤销、统一失效
                      ↓
Scene Revision：让 Inspector / Tree / Timeline 重新派生
```

## 2. Scene Revision

`sceneRevision` 只存在于编辑器会话，不写入 Scene。每次成功的 Scene Mutation、Undo 或 Rollback 都递增。Inspector 的缓存键必须包含该修订号，不能只比较“同一对象、同一页签”。因此在同一页签中启用效果后，参数应在第一次点击后立即出现。

纯 UI 状态（选择、页签、面板高度）仍通过各自上下文键刷新，不递增 Scene Revision。

## 3. 渐进披露

所有“勾选启用后显示参数”的入口共用 `inspectorDisclosure`：

- `enabled()` 从 Scene 判断当前状态；
- `setEnabled(value)` 只描述 Scene 写入；
- 公共层负责 Scene Mutation 与 Inspector 重建；
- `render(grid)` 只在启用状态创建参数控件。

当前已接入普通动画、采样闪变、Sampling Motion，以及新版 Inspector 的全局 / 局部 FX 启用项。局部 FX 以 `0` 作为关闭强度，重新启用写入该效果的稳定默认值；全局 FX 保持既有布尔开关与独立参数字段。不得通过手动清空 `_inspectorCtxKey` 修复单个面板。

## 4. 效果注册表

`editor/effect-registry.js` 是 Sampling Motion 与新版全局 / 局部 FX 的 UI 元数据真相，当前保存：

- 固定处理顺序；
- 用户可见名称；
- 默认参数；
- 控件类型、范围、步长与选项。

局部 FX 额外声明分组、默认强度和旧字段别名；全局 FX 声明分组与固定顺序。Inspector 负责把注册定义绑定到当前 Scene / 时段值，Runtime 仍只读取保存后的 Scene 字段。

Runtime 算法仍由 Runtime 拥有；注册表不能包含绘制代码。新增原语必须同时完成：注册定义、Runtime 实现、Scene 校验、浏览器叠加测试和文档说明。

## 5. 公共参数组件

- 色板：`PALETTE_OPTIONS`、`fillPaletteSelect`、`createPaletteSelect` 是编辑器唯一选项源；素材预处理用空字符串表示无色板，Scene FX 用 `none`，组件负责适配。
- 颜色：`colorField` 是复合颜色 / Alpha 入口；`solidColorField` 复用同一色谱但隐藏 Alpha。只有 Runtime 已有独立 Alpha 路径时才能使用前者，不得把对象整体透明度冒充颜色 Alpha。
- 纹理：`textureControlField` 接收纹理对象、回退颜色和事务控制器；纹理弹层不再要求宿主一定是图元。它只编辑填充纹理参数，颜色与 Alpha 复用颜色组件。
- 蒙版、混合方式、时序开关后续也应各有一个组件和多种作用域绑定器。

“共用组件”不等于“共用数据”：全局、元素、局部 FX 仍写入各自 Scene 路径。

### 5.1 颜色字段语义

| 使用位置 | 颜色路径 | 独立 Alpha | 控件 |
|---|---|---:|---|
| 图元纯色 / 路径描线 | `fill` / `stroke` | `fillAlpha` / `strokeAlpha` | `colorField` |
| 文字填色 | `text.fill` | `text.fillAlpha` | `colorField` |
| 元素阴影 / 外描边 | `style.shadow.color` / `style.outline.color` | 各自 `.alpha` | `colorField` |
| 图元纹理 | `fillPattern.color` | `fillPattern.opacity` | `colorField` + 纹理弹层 |
| 场景底色 / 过渡 / 暗角 / 局部 FX 色块 | 各自既有颜色字段 | 无 | `solidColorField` |
| 程序元素 `editor.controls[type=color]` | 声明的 `path` | 仅在未来显式声明 `alphaPath` 后支持 | `solidColorField` |

顶部绘制工具的颜色是“新对象默认值”，不属于 Scene Inspector。未绑定局部 FX 也由结构树选择，并直接进入同一 Inspector 与下时间轴；它不再拥有独立控制器。

## 6. Legacy 边界

正常元素、组、图元、背景和未绑定局部 FX 均不再后台构造旧卡片。旧元素/粒子参数表单、旧局部 FX Controller、旧 FX 时间轴与隐藏分页已经删除；`buildLayerList` 现在只派生 Inspector 与结构树。`pushHistory` 只允许由 Scene Mutation 的提交适配器调用，业务控件不得直接建立历史快照。

未绑定局部 FX 的会话选择保存在 `state.selectedOrphanFxId`，但 Scene 真相仍是 `fx.layers[]`。同一选择同时驱动结构树高亮、Inspector 参数和 `timelineContextTarget()`；绑定到元素后，该效果转入目标元素的“局部效果”页，不复制数据。

## 7. 验收

1. 首次勾选后参数立即出现，无需切换页签。
2. 同一效果可启用、改参、撤销、保存、重开并保持一致。
3. 多个 Sampling Motion 原语能够叠加，顺序与注册表一致。
4. 正常 `buildLayerList` 不构造隐藏的旧元素卡片。
5. 新增原语不复制新的启用/刷新/撤销样板代码。
6. 阴影与外描边的颜色 Alpha 在编辑器预览、Runtime、测试页和离线导出中一致。
7. 未绑定局部 FX 的结构树选择、Inspector、下时间轴与撤销使用同一对象 id；绑定后上下文转移到目标元素。
