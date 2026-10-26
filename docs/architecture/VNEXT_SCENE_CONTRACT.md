# ToSampool v4 Scene 合同

> 2026-10-18 G3：parts新增`type:'custom'`及`recipe:{id,version,params}`，首批corner-arrows/v1。直接新建保存为自定义图元；应用保存于原图元`extensions['corner-arrows']`，不改变原类型。无任意代码、载体切换或新增配方时序。字段、预算、校验及样例见[自定义图元合同](V4_CUSTOM_SHAPES_G3_2026-10-18.md)。

> 2026-10-18：路径图元新增`pathEndpoints`端点样式（circle/bar/object、起终点开关）；样式为基础配置，位置随已有完成度Linear变化。引用对象复用来源精灵及循环检查。见[端点合同](V4_PATH_ENDPOINTS_2026-10-18.md)。

> 2026-10-18：图元新增`extensions.version=1`，支持ticks刻度排布、nested规则轮廓嵌套和elements引用元素／组排布。配置仅为基础值，不新增Step／Linear或独立轨；随源路径和所属对象显示／变换。生成结果参与视觉边界和命中，不写入结构树对象列表。详见[图元拓展合同](V4_PATH_EXTENSIONS_2026-10-18.md)与[元素排布合同](V4_PATH_INSTANCES_2026-10-18.md)。粒子来源及MCP组合配方尚未实现。

> 2026-10-18：图元`strokeWave`新增type（sine/triangle/saw/square/digits/noise，默认sine）、digits（默认"1595"，规范化后1～9、最多128位）、interpolation（hold/linear/smooth，默认smooth）和seed（默认1），全部Step。数字字符串是一整个波长周期，5为原路径，不自动居中；平滑随机为固定seed的一维周期曲线。仍沿用对象partsById轨及默认填充随波形，不新增效果卡或自动动画。详见[路径节奏合同](V4_PATH_WAVE_RHYTHMS_2026-10-18.md)。

> 2026-10-14：`sceneEffects.sample['ascii-mapping']`保存浮点size/glyphRatio、字符集及可选Base64灰度glyphAtlas，全部Step；图集和字符集必须同批写入，播放不要求外部字体。细节见 [ASCII合同](V4_ASCII_MAPPING_2026-10-14.md)。仅默认内置字符或已烘焙图集保证字体无依赖。

> 2026-09-24 入口更新：正式迁移候选 `img2asset-v4-classic.html` 普通打开即进入 V4；`?legacy=1` 仅供 parity 对照。本文后续“候选默认 Legacy”的旧阶段描述已被本条取代。

> 状态：隔离 Runtime 的持久化合同。当前单文件 `.tosampool.json` 是工作区 Scene 快照；正式的“项目保存”将以 [项目包协议](V4_PROJECT_PACKAGE_PROTOCOL.md) 的 `tosampool-project/v1` 包裹它。网页部署与自包含测试页的边界见 [交付产物协议](V4_DELIVERY_ARTIFACT_PROTOCOL.md)，Agent 专用程序绘制见 [场景模块协议](V4_AGENT_SCENE_MODULE_PROTOCOL.md)。

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
- 通用路径描线样式为 `strokeCap:'butt'|'round'|'square'`（平头／圆头／方头）、`strokeJoin:'miter'|'round'|'bevel'`（尖角／圆角／斜角）、`strokeDash:{enabled,length,gap,offset}`。虚线长度与间隔是线宽倍数，默认3／2；起始偏移0…1表示一个重复周期，关闭虚线保留已填写参数。直线、矩形、椭圆、多边形和笔触共用 Runtime 与 Inspector 控件。开放路径显示端点；闭合路径启用虚线后也显示端点以控制每段虚线。尖角连接固定 miterLimit=4。
- `stroke` 图元另有 `smoothing:0…100`，默认0。原始整数 `points` 保留；派生路径按弧长等距取样并进行局部加权平滑，端点固定，派生坐标不再强制取整。Runtime 缓存派生路径与描线边界，原始点数组变化或相关参数变化后失效；非常长的路径最多生成8193个派生点，原始点不删减。平滑后仍是声明式笔触图元，独立绘制时置于单笔触 vector 对象，默认圆头／圆角；其他图形默认平头／尖角。沿路径的宽度变化尚未实现。
- 新描线样式／平滑度的 Step 覆层写入所属对象轨，键为 `partsById.<encodedPartId>.<field>`，直接改变该图元的求值结果，不在父对象上复制属性，不创建图元独立轨。ID使用URL编码，点号额外编码为 `%2E`；Runtime 按ID解析，调序不会错指，删除后该目标无效。现有 `parts.<index>.anim.*` 路径仍可读取，存量动态索引的完整迁移不属于本轮。除笔触完成度外，新描线字段均保持 Step。
- 笔触 `strokeCompletion:0…100` 默认100，支持 Step/Linear；`strokeReverse` 默认false、只支持Step。显现比例基于平滑后局部路径的累计长度，末段插值笔尖，不按点数量截取；0%完全不绘制端点，100%与完整笔触一致。反向显现取原路径的后缀并补偿虚线相位，完整状态不改变既有虚线图案。原始点、完整尺寸、旋转中心与选框不随完成度缩小。沿用所属对象轨：多条笔触的数值按ID独立，但共享分段边界与时序开关；选中笔触时下轴与「时序」仍指向所属对象。新建Linear段的 `linearKeys` 包含该对象各笔触的稳定ID完成度路径，无需手动注册实例别名。长度缓存只在原始路径或平滑度变化后重建，播放时二分查找笔尖并描线；显现内容随后进入对象蒙版／加样／采样。
- 矩形／椭圆／多边形／直线同样支持strokeCompletion及strokeReverse，完成度沿用所属对象轨Linear，不新增图元轨。封闭路径增加pathStart=0（0～1周长位置，Step）；填充默认完整，fillReveal=center才按中心扫掠显现（仅矩形、椭圆、正多边形）。poly支持polygonMode=free/regular、sides=3～64及正多边形radius。路径可启用strokeWave（enabled/amplitude/wavelength/phase/fixEnds，均Step），封闭路径的填充和描线默认共用波形边界，无独立跟随开关；开放路径只改变描线。这是静态几何派生，不是自动动画。详细字段、默认起点与8192段预算见[V4_SHAPE_PATH_GEOMETRY_2026-10-17.md](V4_SHAPE_PATH_GEOMETRY_2026-10-17.md)。
- `text.textCompletion` 为 `0…100`，默认 `100`，支持对象参数轨 Step / Linear。按完整 Unicode 字形簇显现，空格计入输入节拍，换行不计入节拍；完整排版和对象 `w/h` 不随完成度改变。`textCursor:{enabled,style:'bar'|'underline'|'block',period,color}` 为可选光标，默认关闭；周期时间单位秒，默认 1，0 为常亮，完成度小于 100 时显示，100 时隐藏。颜色缺省或 null 时跟随文字颜色与填充透明度；光标配置为 Step。光标与正文一起进入后续对象蒙版／加样／采样。
- 编辑文字时生成两份 `internal:true` 的 PNG：`rasterAssetId` 指向完整文字快照，`glyphAssetId` 指向独立字形图集；`textLayout` 保存原排版尺寸、字形图集矩形和输入位置。完整状态走一张 PNG 的快路径，未完成状态只画已显现字形；播放／Linear 求值不重新栅格化、不嵌入字体文件，导出无需原字体。字形图集也不会出现在用户素材库。文字复制时可共用只读图集，后续编辑按新对象 id 生成独立内部资源。
- 图片实体必须声明 `assetId`，且其 id 必须在持久 `assets` 中存在。
- `group` 是父级变换；成员在 `entities` 中以 `parentId` 关联，仍按原数组顺序绘制。
- 任意实体可声明 `hidden` 与 `locked`。`hidden` 同时影响 Runtime 与保存结果；`locked` 是持久的编辑权限，只阻止 Canvas 命中和直接变换，不隐藏或改变导出画面。“独显”不属于 Scene 字段，只能是编辑器临时预览状态。
- 任意实体可声明 `pivot:{mode:'custom',x,y}`；`x/y` 是对象局部宽高内的 0–1 归一化坐标。缺省中心为 `0.5/0.5`。Runtime 世界矩阵、实际绘制、对象效果包围盒、粒子发射器和 Canvas 命中必须共同解释该字段；它不是仅供编辑器显示的元数据。
- 可选 `sceneVariants` 是同一语义实体在不同顶层 Scene 的离散替代值数组。Runtime 只选择当前 Scene 的一项，再应用对象时序、父级变换和效果；它适合 Scene 边界上的图元/颜色/滚动布局替换，不是连续形变。Scene 1 的基底值仍写在实体自身，后续 Scene 才写覆盖项；当前 Inspector 不逐项编辑变体，Agent/外部转换器应仅在“拆成互斥实体明显浪费”时使用它。
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

### 项目 Scene Module

- 作品专用程序绘制使用普通实体 `type:"procedural"`，以稳定的 `moduleId / moduleVersion / params` 引用项目 Module。
- 持久 Scene JSON 仍不保存函数体。模块源、`tosampool-scene-module/v1` Manifest 与依赖素材属于 `tosampool-project/v1` 的独立项目内容；网页交付构建器会把被引用模块带入 `scene.runtime.js` 或 `scene.embed.html`。
- Module 不是 Builtin，也不要求进入共享 Runtime。Host 只在用户明确信任后加载项目模块；Runtime 仅向其传入局部 Canvas、固定时间、顶部 Scene 的 `sceneIndex / sceneProgress`、尺寸、已声明参数/素材和确定性随机入口。自动 Scene 行为必须读取这组上下文，而不能暗中假定固定循环长度。Module 注册还必须带项目会话作用域；`moduleId / version` 只在该作用域内唯一，避免同页或 Tauri 连续打开的项目互相覆盖。
- 普通对象、图片、Module、Builtin 都是可选载体。Agent 必须按编辑收益、保真、复用范围和性能选择，不得因画面复杂就一律模块化，也不得为了声明式纯度牺牲画面。

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

`background` 是 Scene 的基础填充：`color / alpha / fillPattern?`。顶层 `timeline.scenes[]` 的每一个段可在自身 `background` 覆盖基础值。背景只跟随 Scene 边界，不再建立 Scene 内参数轨。例如：

```json
{
  "timeline": {
    "scenes": [{ "id":"scene-summer", "f":[0.4,0.7], "background":{"color":"#335577","alpha":1} }]
  }
}
```

背景基础轨只展示 Scene 分段并支持定位；Alt 切分和双击显隐均不作用于它。顶层 Scene 的可见范围不能删除，边界始终由上方 Scene 轴控制。旧草稿中的 `scene-background:*` 轨保留原数据以避免静默改写文件，但编辑器与 Runtime 均不再读取它；需要 Scene 内变化时，应由普通对象承载。`fillPattern` 使用与图元填充相同的 Pattern Field 数据，颜色和 Alpha 仍各自独立。

新建 Scene 的底色默认 `alpha:1`，保证颜色控件的结果可见。透明作品必须显式写 `alpha:0`；Runtime 不会把显式透明自动改回不透明。

### 程序动态与 Scene 过渡

对象、组和图元可在 `anim` 中使用 `bob / scroll / pulse / spin / wave / blink`。它们都是确定性固定时间调制，叠加在基础变换之后，不生成时间轴关键帧，也不反写静态值。支持运动的效果把配置写入该效果的 `motion`，`type` 必须来自 Effect Registry 的 `motion` 白名单；周期、幅度、阶数与速度仍是纯数据。

`timeline.scenes[]` 的每个标签段可含 `transition:{type,duration,color?,direction?,cell?,seed?}`。`type` 为 `none / blackout / fade / wipe / dissolve`；它描述该段开头的入口过渡，`duration` 使用秒。`blackout` 是可自定义 `color`（默认黑色）的黑场转场，覆盖色按透明度渐隐以露出当前 Scene；`fade` 以透明度交叉淡化前一 Scene 与当前 Scene；`wipe` 按 `direction: right / left / down / up` 擦除前一 Scene 的实际画面；`dissolve` 以 `cell / seed` 决定确定性颗粒，在前后 Scene 实际画面之间溶解。历史 `scan` 被解释为 `wipe + direction:'down'`。过渡位于对象与场景效果之后，因此编辑器预览、自包含测试页和固定时间导出不会出现两套实现。预览调度必须把任意非 `none` 过渡视为时间相关，不能因场景内容静态而复用上一帧。

场景没有独立 `output-grain` 段。新建颗粒写入 `sceneEffects.overlay['grain-overlay']`（对象则写入 `effects.decorate['grain-overlay']`）：`amount` 0–1 控制整层不透明度，`colorMode:'mono'|'rgb'`、`size`、`seed` 决定颗粒帧；可选 `motion:{enabled:true,type:'grain-refresh',period,steps}` 以确定性周期节拍刷新。Runtime 用单次 ImageData 生成并有界缓存帧，合成时裁入对象 Alpha 或场景滤镜蒙版，强度 1 可得到全覆盖雪花屏。既有 `texture-overlay` 的 `texture:'noise'` 仅作为旧 Scene 读取路径保留。

杂色抖动写入 `effects.sample['noise-dither']` 或 `sceneEffects.sample['noise-dither']`，参数为 `amount:0..100`、`colorMode:'mono'|'rgb'`、`size:1..16`、`seed`，可选 `motion:{enabled:true,type:'noise-refresh',period,steps}`。它在当前采样工作面内以随机值扰动已有 RGB，不覆盖新颜色层，不改变 Alpha；固定顺序为颜色映射 → 杂色抖动 → 阈值分色。动态关闭时任意时间输出相同，开启时在周期内离散刷新并首尾闭合。对象与场景均沿用原有采样预览预算和效果 Step 时序。

`texture-overlay` 另支持 `texture:'custom'`：`tileWidth / tileHeight` 为 1–64 格，`tilePixels` 是逐行排列的 `#RRGGBBAA` 数组，透明格不覆盖源图；手动 `tileScale` 为 1–16 画布像素，或用 `tileScaleMode:'sampling'` 跟随同宿主的采样尺寸（最高 128）；`phaseX / phaseY` 为 0–1 的重复图案起始偏移。tile 直接保存在 Scene 中，不依赖外部图片或单一纹理颜色。Inspector 可逐格绘制、导入 PNG、旋转 90°、镜像，或用 Bayer 2×2 / 4×4 / 8×8 预设生成不透明灰阶 tile；生成后仍是普通可编辑格子。Runtime 只缓存原始小 tile，并对重复图案作整数倍率变换，不为采样尺寸 128 展开一张巨大的图案缓存。编辑器与测试页使用同一 Runtime。Bayer 预设只是图案来源，不自行施加阈值量化。现已在纹理叠加的混合方式提供 `blend:'hard-mix'`：逐通道判断底色值与纹理色值之和是否达到 255，再按纹理 Alpha 合成；它允许 Bayer 灰阶 tile 充当规则阈值，但由于需要逐像素读写，仅适合小面积或静态/低帧率效果，不能把整个采样管线称为“完整 Bayer 量化”。

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

`img2asset-layout-v1.html` 保留为独立 legacy 工具。旧 `home-scene.js` 同时携带默认画面、专用绘制函数、旧 Runtime 与浏览器生命周期，不能被当作 v4 Scene。外部转换器可提取声明式数据；已知绘制逻辑应先标为 `native-mappable` 并由外部语义适配器展开为普通 v4 对象，未知或不可安全解析的逻辑才标为 `module-required`，也可由用户选择冻结为素材。v4 编辑器本身不导入或执行旧 JS。
