# ToSampool v4 Agent 场景模块协议

状态：**P3 / P4 完成。** Runtime 已提供 Manifest 注册、参数归一化、声明素材白名单、确定性随机入口及普通对象管线复用。项目包会保留模块源与 Manifest；打开项目时会列出模块并要求显式信任，确认后才执行。Module 注册键为“项目作用域 + moduleId + version”：同一页面可同时保留两个同名但不同源码的项目 Module，互不覆盖。程序构件在结构树中仍是普通对象，Inspector 只从当前项目已信任 Manifest 生成参数控件，并使用对象共用的时序轨道。

## 定位

场景模块适用于某作品独有、无需逐个图元编辑、但需要暴露少量控制参数的程序绘制。它不是 Legacy 兼容层，也不是复杂场景的强制格式；它是 Agent 和作者可选择的正式创作载体。Builtin 是产品长期维护的跨项目能力，模块则随项目交付。

```text
普通实体：人直接编辑
Builtin：共享雨、粒子、采样、蒙版等基础能力
Scene Module：Agent/作者专用画面，例如小木屋、山林、列车
```

载体判断遵循以下顺序：

| 画面需求 | 首选载体 | 理由 |
|---|---|---|
| 需要逐对象选择、重排和局部编辑 | 普通实体 / 图元 | 人类编辑收益最高 |
| 高细节静态内容、照片、已有素材 | 图片 / 序列素材 | 保真且运行成本稳定 |
| 作品独有、程序生成、内部细节无需逐项编辑 | 项目 Scene Module | 保留绘制自由，只暴露有意义参数 |
| 多项目稳定复用、产品承诺长期维护 | Builtin | 进入共享 Registry 和测试矩阵 |

模块应是一个“渲染岛”：内部可以高密度绘制，外部仍服从对象位置、尺寸、透明度、蒙版、加样、采样、父组和时间轴。不要为了 schema 纯度强行把一个有机画面拆成数百个图元，也不要把整个场景无理由塞入一个模块。

## Scene 引用

```json
{
  "id": "cabin-01",
  "type": "procedural",
  "moduleId": "cabin",
  "moduleVersion": 1,
  "params": { "windowLight": "#ffd48a", "snowfall": 0.65 }
}
```

它仍拥有普通元素的 x/y/w/h、缩放、旋转、透明度、组、蒙版、加样、采样和显示时段。Runtime 在外层统一处理这些能力；模块只绘制自己的局部内容。

## Manifest 与受控入口

每个模块具有 `tosampool-scene-module/v1` Manifest，至少声明：稳定 id/版本、标题、参数 schema、素材依赖、局部 bounds、循环/seed、性能等级和推荐画布预算。参数 schema 说明类型、范围、默认值、Inspector 分组及是否允许 Step 时序。

模块只注册一个确定性入口：

```js
render({ ctx, time, width, height, params, assets, random })
```

- `random` 必须由 `seed + time` 决定；禁止裸用 `Math.random()`。
- 不提供 DOM、网络、文件、宿主、编辑器状态或任意全局 Scene 写入能力。
- Manifest 声明的 assetId 是交付构建器裁剪素材的唯一依据。
- 静态扫描不是安全沙箱；首次打开含未知模块的工程必须有明确“信任并执行”确认。真正隔离执行留待后续安全阶段。

当前 Runtime 注册方式：

```js
window.ToSampoolRuntimeVNext.modules.sceneModules.register({
  manifest: {
    format: 'tosampool-scene-module/v1', id: 'cabin', version: 1,
    parameters: [{ key: 'windowLight', type: 'color', default: '#ffd48a' }],
    assets: ['wood-texture'], timeDependent: false
  },
  render({ ctx, width, height, params, assets, random }) {
    // 坐标原点在构件中心；只使用声明素材与传入参数。
  }
});
```

这不是沙箱：当前阶段只允许由项目作者明确加载的模块源运行；编辑器不会自动执行未知模块。`EditorVNextModuleLoader.trustAndLoad(scene, [moduleId])` 是唯一执行入口，项目打开流程已经以明确确认框调用它。未来可把确认框扩展成更完整的 Manifest 信息面板，但这不改变执行边界。

## 编辑器与 Agent 边界

结构树显示程序构件；Inspector 仅由 Manifest 自动生成已声明的 `number / color / select / boolean / text` 参数，不提供内置代码编辑器。Manifest 参数可标记 `internal:true`（结构身份、自动选择策略等不显示），也可用 `appliesTo` 按对象参数过滤（如 `windowLight` 只对 `layer:"train"` 显示）。标记为 `linear-safe` 的数值参数与对象的 X/Y/宽高/旋转共用参数覆层；`step` 参数同样可写入对象时段，但不插值。人类可用图元、图片、蒙版和效果在其上补丁式修改；Agent/开发者在外部改模块源后重新载入。

Agent 初次生成项目时，应先给出载体选择表，至少包含：`id / 语义 / 载体 / 选择理由 / 局部边界 / 公开参数 / 是否依赖时间 / 性能等级`。只有确实选择 Module 的对象才附带源文件与 Manifest；普通对象和图片不需要 Module 包装。参数标题应面向创作意图（如“窗灯暖度”“树影密度”），底层键保持稳定、简短且可验证。

## home-scene 实验

`home-scene.js` 不进入编辑器、不成为永久 Builtin。完整 Module 基线位于 `examples/modules/home-scene-full-module.js`，并由 `scripts/build-home-scene-module-baseline.mjs` 外部生成项目描述；它将整套列车画面适配成**一个项目级 Scene Module**。它用于验证：旧专用绘制能否在共享 Player 上保真运行、Manifest 能否只暴露少量有效参数、项目交付能否携带模块而不污染 Runtime。

`examples/modules/home-scene-layered-module.js` 是第二条、推荐用于比较编辑性的 Module 基线：它注册一个项目 Module，却实例化为 12 个普通 `procedural` 实体。每个语义层仍可独立变换、蒙版、加样、采样和进入时序；高密度像素细节仍留在 Module 内，而不是拆成永久 Builtin 或低层图元。月亮是一个独立程序对象：转换器为其预写四段 Step 的 X/Y 参数覆层，以及第二 Scene 的隐藏显示段，因而载入即能从现有时间轴继续改写。`layer / scene` 是内部声明，不会污染 Inspector；列车只公开窗灯、雾层只公开雾浓度。Runtime 将顶部时间轴的 `sceneIndex / sceneProgress` 传给 Module，因而 Module 的自动场景变化跟随项目 Scene 分段；公开参数仍使用对象共用 Step / Linear 轨道。它与 `scripts/adapt-home-scene-native-v4.mjs` 的原生图元候选、完整 Module 候选构成三向实验，不构成 Legacy 编辑器内兼容层，也不规定未来 Agent 场景必须模块化。
