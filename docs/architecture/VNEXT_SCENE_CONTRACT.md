# ToSampool v4 Scene 合同

> 2026-09-24 入口更新：正式迁移候选 `img2asset-v4-classic.html` 普通打开即进入 V4；`?legacy=1` 仅供 parity 对照。本文后续“候选默认 Legacy”的旧阶段描述已被本条取代。

> 状态：隔离 Runtime 的持久化合同；尚未替换当前产品的 `canvas-cartoon-scene` 格式。

## 两份同名场景，不混用职责

```text
保存的 Scene JSON             Runtime 输入
──────────────────           ─────────────────────────
assets[id].locator      +    runtimeAssets[id] = CanvasImageSource
可 Git / 网页 / 桌面迁移        仅存在于当前浏览器或 Tauri 进程
```

工程文件永远不写入 `Image`、`Canvas`、`ImageBitmap`、缓存或文件权限对象。Host 根据 `assets[id].locator` 读取素材后，用同一个 id 注入 `runtimeAssets`。Runtime 从不直接访问磁盘、网络或 IndexedDB。

## 最小结构

```json
{
  "format": "tosampool-scene/v4",
  "width": 320,
  "height": 180,
  "loop": 4,
  "background": { "color": "#000000", "alpha": 1 },
  "assets": {
    "photo": {
      "locator": "assets/photo.png",
      "mime": "image/png",
      "recipe": { "width": 320, "height": 180, "pixelDiv": 2, "palette": "pico8", "quant": 0, "bgTolerance": 18 }
    }
  },
  "entities": [],
  "timeline": { "tracks": {} },
  "sceneEffects": {
    "pipeline": ["overlay", "sample"],
    "overlay": {},
    "sample": {}
  }
}
```

`editor/vnext-scene.js` 提供三项唯一入口：

- `blank()`：创建最小 Scene；
- `serialize()`：移除 `runtimeAssets` 和临时对象后输出 JSON；
- `hydrate(document, runtimeAssets)`：将持久 Scene 和 Host 已解析素材组合为 Runtime 输入。

## 实体关系

- 普通内容实体：`rect`、`ellipse`、`line`、`text`、`image`。
- 图片实体必须声明 `assetId`，且其 id 必须在持久 `assets` 中存在。
- `group` 是父级变换；成员在 `entities` 中以 `parentId` 关联，仍按原数组顺序绘制。
- 任意实体可声明 `hidden` 与 `locked`。`hidden` 同时影响 Runtime 与保存结果；`locked` 是持久的编辑权限，只阻止 Canvas 命中和直接变换，不隐藏或改变导出画面。“独显”不属于 Scene 字段，只能是编辑器临时预览状态。
- 任意实体可声明 `pivot:{mode:'custom',x,y}`；`x/y` 是对象局部宽高内的 0–1 归一化坐标。缺省中心为 `0.5/0.5`。Runtime 世界矩阵、实际绘制、对象效果包围盒、粒子发射器和 Canvas 命中必须共同解释该字段；它不是仅供编辑器显示的元数据。
- `particle-emitter.particle.sourceId` 必须指向普通实体；它每帧按固定时间烘焙一次来源视觉胶囊后复用，因此来源的图元动态、对象变换与对象处理会自然进入粒子外观。发射器自身的 `x/y/w/h` 是出生范围，不是来源实体边界。
- 粒子发射、运动与外观参数位于 `particle`：`count / life / speed / direction / spread / gravity / wind / size / sizeVar / alpha / fade / seed / spin / spinSpeed / spinVar`。图片来源可额外声明 `playback:'static'|'particle-age' / frame / frameFps / frameLoop`：后者按每颗粒子的寿命选择其多帧素材，普通对象自身仍按场景时间播放。它们只接受 Step 时序；轨道仍使用发射器 id，稀疏键写成 `particle.speed` 这类点号路径。
- 编辑器内置预设可创建 `particleSourceOnly:true` 的私有普通实体。它仍是可被 Runtime 烘焙的声明式实体，但不在主场景重复绘制，也不占用结构树；`particle.sourceOwned:true` 表示删除发射器时可在无人共享的前提下级联清理。普通“粒子化”只建立动态 `sourceId` 引用，不复制或冻结源对象。

### 受控内建组件

- 内建组件是普通实体：`type:"builtin"`，其声明只含 `builtin:{ id, version, params }`，仍复用 `x/y/w/h/scaleX/scaleY/rot/alpha`、对象动态、蒙版、加样、采样、图元覆盖与父组。
- 唯一实现源为 `runtime-src/vnext/15-builtin-registry.js`。当前注册 `pixel-star@1 / pixel-cloud@1 / train-beam@1`；未知 id 或版本在载入时立即拒绝。
- `params` 由 Registry 归一化。时序仍使用实体 id 轨道，稀疏键写成 `builtin.params.color`；只有参数 schema 标为 `linear-safe` 的键可进入 Linear，其余保持 Step。
- Builtin 绘制只接收 Canvas context、归一化对象值和固定时间，不得读取 DOM、网络或编辑器状态。Scene 永远不保存函数体、`program.code` 或动态脚本。
- Agent 使用 `docs/agent/BUILTIN_MANIFEST_V4.json` 选择构件；清单无法表达的画面应使用图片/图元，或先扩展 Registry 并完成测试，不能伪造 builtin id。
- `effects.mask` 的元素引用和 `parentId` 都不允许形成循环。

## 校验与边界

`scripts/validate-scene-vnext.mjs` 是无副作用的结构校验器，适合 Agent 生成后、保存前和 CI 中使用。它验证格式、尺寸、稳定 id、素材引用、组关系、发射器来源和基本蒙版引用；它不评价画面美术质量，也不读取任何素材。

这份合同不以“能解析 v4 JSON”代表编辑器迁移完成。每项正式能力仍必须同时完成 Registry / 状态控制器映射、Scene Mutation、固定时间预览、保存往返与真实浏览器验收；当前通过门禁的纵向切片记录在 `V4_MIGRATION_MATRIX.json`，未登记项不能只靠替换文件扩展名宣称可用。

`editor/vnext-runtime-adapter.js` 提供隔离预览入口：它先通过 `EditorRuntimeBridge.vNextRequirements` 检查能力，再调用 `hydrate()` 和 `ToSampoolRuntimeVNext.createRuntime()`。`img2asset-vnext.html` 的 v4 新建 / 打开会话已通过 Workspace 调用该入口；它不回落到 Legacy Runtime。

`editor/vnext-asset-loader.js` 是此入口的唯一素材接线：它逐项将 `assets[id].locator` 交给既有 `EditorAssetResolver` 与 Browser/Tauri Host，解码为临时图片对象，再调用 `EditorVNextRuntimeAdapter.createResolved()`。因此 Runtime 仍不获得文件权限；Classic 候选的新建、打开、保存重开、固定时间预览与自包含测试页已经共用该边界，测试页只接收冻结后的 data URL 副本。

`editor/vnext-workspace.js` 将 `blank / open / save / runtimeAssets / renderTo` 收束为独立工作区会话：它只接受 `.tosampool.json` 中的 v4 JSON，拒绝将 Legacy JavaScript 场景误读为新格式。它缓存未改变 locator 的临时素材、保留 Host 返回的场景 locator，并按 Scene 修订复用 Runtime Player；Scene 或素材失效时才重建 Player。它是 v4 新建 / 打开 / 保存 / 固定时间预览的唯一会话边界。

`img2asset-vnext.html` 只保留为 schema / Runtime / 性能实验台，`vnext-workbench.html` 是更小的合同夹具。正式迁移候选是从 Legacy 逐字节副本开始演进的 `img2asset-v4-classic.html`；它默认仍保持 Legacy，只有受控 v4 会话启用已通过迁移矩阵的纵向切片，未迁入能力不得暗中回落或伪装完成。

Classic 迁移副本已具备显式 v4 会话：格式感知的新建 / 打开 / 保存只让 `.tosampool.json` 进入 v4 Workspace，并在原舞台上绘制 v4 Runtime。结构树、素材栏、绘制 / 文字 / 多帧、Canvas 变换、Inspector、上下时间轴与 Registry 效果 / 采样格控制器均已按纵向切片接线，并全部通过 `EditorVNextSceneMutation` 形成可撤销事务；采样场与边缘保护属于不均采样本体。保存重开会比较持久数据与固定时间像素；“测试场景”会生成包含 Runtime 与冻结素材的独立 HTML；当前帧 PNG、Sprite PNG、多帧 PNG 与 GIF 均由 v4 导出器生成。未迁入的旧程序元素、旧 JS 转换与其他交付格式仍冻结。

交付链不再复用 Legacy 的 `SceneExporter`：`editor/vnext-exporter.js` 只接受 `tosampool-scene/v4`，以 `ToSampoolRuntimeVNext.createRuntime()` 在固定时间输出当前帧 PNG、Sprite PNG、多帧 PNG 和 GIF。它接收 Workspace 已解析的临时 `runtimeAssets`，但不会把该临时素材槽、预览质量或 DOM 选择状态写回持久 Scene。

`editor/vnext-scene-mutation.js` 将所有可见编辑包装为带标签的快照事务；它只依赖 Workspace 的 `mutate / replace / requireDocument`，因此撤销与重做不触碰 Host、文件或 Runtime。新建与打开是会话边界，会主动清空历史；普通编辑若没有改变序列化结果，也不会制造空历史项。

`editor/vnext-asset-state.js` 是 v4 新增图片素材的唯一写入器。它写入持久 `assets[id].locator`、可选 `recipe` 与普通 `image` 实体；浏览器导入时 locator 是 data URL，桌面 Host 返回授权 locator 时优先保留该链接。图片解码、文件选择和任何读取仍停留在 Host/Asset Loader 边界，Runtime 只接收已注入的临时图片对象。

### 素材预处理配方

`assets[id].recipe` 是可选的、纯数据的确定性预处理声明：`width`、`height`、`pixelDiv`、`palette`（`none / pico8 / nes / gb / vga`）、`quant` 与 `bgTolerance`。它保留原始 locator，而不是把处理后的位图再编码回 Scene；因此导入预览、保存后重新打开与 Runtime 注入都使用同一条 `EditorVNextAssetRecipe.apply()` 链路。配方不包含浏览器 Canvas、文件句柄、缓存或时间状态。多帧素材与图片背景已使用同一配方；新增预处理字段仍须先补确定性 Runtime / 保存往返测试。

### 多帧素材与 Scene 背景

静态素材仍使用 `assets[id].locator`。有序帧序列在同一资产下附加 `frames:[{locator,mime}]`、`fps` 与 `frameLoop`；每一帧使用同一 `recipe`，Runtime 按固定时间选择帧，不要求合成为横向雪碧图。普通图片实体可声明 `frames/fps/frameLoop` 覆盖资产播放设置。

图片、多帧图片与其布局都应作为普通 `image` 实体存在于 Scene 结构树中；它们可被分层、遮罩、处理和时序化，不再由 Scene Inspector 提供另一套“图片背景层”模型。历史 `background.layers` 仍由 Runtime 读取，以便已保存 v4 草稿不丢画面，但新编辑操作不再写入它。

`background` 是 Scene 的基础填充：`color / alpha / fillPattern?`。顶层 `timeline.scenes[]` 的每一个段可在自身 `background` 覆盖基础值；当前 Scene 内的稀疏背景轨道使用稳定键 `scene-background:<sceneId>`，其 `f:[0,1]` 是**该 Scene 内部**的相对坐标，不随顶层 Scene 边界拖动而重算。例如：

```json
{
  "timeline": {
    "scenes": [{ "id":"scene-summer", "f":[0.4,0.7], "background":{"color":"#335577","alpha":1} }],
    "tracks": {
      "scene-background:scene-summer": {
        "segments": [
          { "f":[0,0.5], "type":"step", "values":{"color":"#446688"} },
          { "f":[0.5,1], "type":"step", "values":{"color":"#102030"} }
        ]
      }
    }
  }
}
```

Scene 内背景轨只支持显式切分与 Step 覆层；顶层 Scene 的可见范围不能删除，且其边界始终由上方 Scene 轴控制。`fillPattern` 使用与图元填充相同的 Pattern Field 数据，颜色和 Alpha 仍各自独立。

新建 Scene 的底色默认 `alpha:1`，保证颜色控件的结果可见。透明作品必须显式写 `alpha:0`；Runtime 不会把显式透明自动改回不透明。

### 程序动态与 Scene 过渡

对象、组和图元可在 `anim` 中使用 `bob / scroll / pulse / spin / wave / blink`。它们都是确定性固定时间调制，叠加在基础变换之后，不生成时间轴关键帧，也不反写静态值。支持运动的效果把配置写入该效果的 `motion`，`type` 必须来自 Effect Registry 的 `motion` 白名单；周期、幅度、阶数与速度仍是纯数据。

`timeline.scenes[]` 的每个标签段可含 `transition:{type,duration,color?,direction?,cell?,seed?}`。`type` 为 `none / blackout / fade / wipe / dissolve`；它描述该段开头的入口过渡，`duration` 使用秒。`blackout` 是可自定义 `color`（默认黑色）的黑场转场，覆盖色按透明度渐隐以露出当前 Scene；`fade` 以透明度交叉淡化前一 Scene 与当前 Scene；`wipe` 按 `direction: right / left / down / up` 擦除前一 Scene 的实际画面；`dissolve` 以 `cell / seed` 决定确定性颗粒，在前后 Scene 实际画面之间溶解。历史 `scan` 被解释为 `wipe + direction:'down'`。过渡位于对象与场景效果之后，因此编辑器预览、自包含测试页和固定时间导出不会出现两套实现。预览调度必须把任意非 `none` 过渡视为时间相关，不能因场景内容静态而复用上一帧。

场景没有独立 `output-grain` 段。颗粒是 `sceneEffects.overlay['texture-overlay']` 的 `texture:'noise'` 变体；它使用与其他纹理相同的颜色、透明度、叠加方式、范围蒙版和效果时序路径，附加 `noiseDensity`、`noiseSize`、`noiseSeed` 及噪点雪花运动参数。

## 稀疏时序轨道

实体基础值继续使用 `timeline.tracks[entityId]`（或兼容键 `entity:${entityId}`）。效果卡拥有独立稳定键，不复制整份效果配置：

```text
effect:object:<entityId>:<effectId>
effect:scene:<stage>:<effectId>
```

每条轨道的 `segments` 共用同一格式：Step 段使用 `{ f:[0,1], type:'step', values }`；Linear 段只声明 `{ f:[0,1], type:'linear' }`，求值时动态查找左右最近的 Step 状态，不持久化容易陈旧的 `from/to` 快照。值只覆盖当前 Step 段中实际修改的字段；点号参数（例如 `boil.bias`）会安全写回对应嵌套对象。对象效果和场景效果都在固定时间帧内求值，因此效果卡的时段、测试页和离线导出共享同一结果。历史 Scene 中的 `from/to` 可作为兼容覆层被读取，新文件不再生成它们。

`editor/vnext-timeline-state.js` 是该结构的唯一编辑写入器：分段只能显式 `split()`，参数写入不会为了“看起来有动画”自动切出新段；`setStep()` 和 `setLinear()` 只写已经选定的段。这样 UI 可把“切段”和“改值”做成两次明确操作，避免旧实现中不同时间写值彼此覆盖的歧义。

对象显示窗口不复用属性轨，而使用 `timeline.visibility[entityId].segments`；每段只声明 `f` 与 `visible`。缺省轨道表示全程可见，读取缺省值不得写入 Scene。详细交互、组继承和迁移边界见 [v4 Classic 时间轴迁移合同](V4_TIMELINE_MIGRATION_CONTRACT.md)。

正式迁移副本现在已将该内核接入 Classic Shell 底部编排器：对象可在“显示时段”与“属性时序”之间切换；Inspector 的“时序”只武装当前已有段，首次参数修改才写入 Step，不会自动切段。普通段中央的 `---` 可把已有段改为 Linear，端点由相邻 Step 动态解析。轨道展示为纯读取，不会因为渲染 UI 而创建空数据。单对象 Canvas 变换与 Inspector 共用同一写入边界；Registry 中已启用的对象 / 场景效果卡也可成为下轴上下文并写入独立稀疏轨。效果 Linear 段通过可选 `linearKeys` 只插值 Registry 标记为 `linear-safe` 的字段，其余字段保持 Step。采样格使用独立 `controller:*` 稳定轨道且只接受 Step；不均采样的场、边缘与潮汐随该效果共用效果轨，打开 Inspector 不得写入默认配置。

## 页面入口边界

`img2asset-vnext.html` 是纯 v4 实验页：打开即创建或读取 `tosampool-scene/v4` JSON，页面只运行 v4 Runtime 与控制器；它不再承担产品迁移完成度。`img2asset-v4-classic.html` 是正式候选，必须保持未迁移表面的 Legacy 行为等价，并只在活动 v4 Session 中把已验收领域路由到 v4 Workspace。

`img2asset-layout-v1.html` 保留为独立 legacy 工具。旧 `home-scene.js` 同时携带默认画面、专用绘制函数、旧 Runtime 与浏览器生命周期，不能被当作 v4 Scene。未来若提供“导入旧 JS”，必须是明确的转换向导：基础图元/图片可转换；任意程序代码必须保留在 legacy、映射为已注册 builtin，或由用户选择冻结为素材，不能静默执行。
