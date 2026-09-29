# Runtime 合同与宿主边界

## 1. 唯一 Runtime

`tools/home-scene.js` 是工具侧唯一规范 Runtime。编辑器必须优先加载同目录文件，测试页的 `runtime-inline.js` 只能由生成脚本机械同步；游戏/站点 `../public/home-scene.js` 是按版本升级的消费端和旧目录兜底。

Runtime 暴露：

```js
HomeScene.apiVersion
HomeScene.capabilities
HomeScene.createRuntime(scene)
HomeScene.renderTo(target, t, options)
```

编辑器启动时必须检查 `apiVersion` 和所需 capability。Scene 中出现某能力但 Runtime 未声明支持时，应阻止静默降级并给出错误。

## 2. 确定时间合同

- 输入由 Scene、资源、画布尺寸、`t` 和 seed 完整决定。
- 同一输入在预览、测试页、固定时间渲染和格式导出中应产生同一帧。
- 播放器只提供时钟；插值、动画、粒子、Sampling Motion、蒙版、FX 与过渡均由 Runtime 求值。`capabilities.samplingMotion=2` 表示 Runtime 支持共享 `field` 与 Alpha `edge`；编辑器不得把只声明 v1 的 Runtime 当作已支持新版控制器。
- 编码器只消费帧，不得改变场景时间语义。

## 3. 性能分级

Canvas 尺寸增大时，性能瓶颈不是 JS 文件大小，而是每帧处理像素数与离屏合成次数。效果必须标注成本类别：

| 等级 | 典型操作 | 原则 |
|---|---|---|
| A | `drawImage`、路径绘制、原生 transform/filter | 可每帧执行 |
| B | 局部离屏、缓存图块、蒙版包围盒处理 | 限定区域并复用画布 |
| C | `getImageData`、色板/阈值/半调、全屏多遍处理 | 降采样、量化时间步、缓存 |
| D | 多个全尺寸 C 级效果串联 | 预览降质或明确警告 |

统一计算工作像素：`workPixels = Σ(area / pixelDiv² × passes)`。后续性能面板应报告该估算值、实际帧时间、缓存命中与离屏画布峰值，而不是只报告场景分辨率。

## 4. 预览与导出质量分离

- Scene 保存创作参数，不保存“当前机器预览质量”。
- 预览 Adapter 可以通过 `setPreviewOptions({pixelDivMultiplier})` 临时降低 C 级像素处理中间缓冲区的工作分辨率或帧率，但不能改变循环时长、seed 和段边界；Auto 只可降低刷新节奏，只有用户显式选择 Draft 才可降低预览分辨率；该选项不属于 Scene schema。
- 固定时间导出默认使用作品质量；允许用户显式选择快速预览导出。
- Sampling Motion、色板和阈值等 C 级效果应优先在缩小后的工作画布处理，再最近邻放大。

## 5. 浏览器与 Tauri Host Adapter

Tauri 不会自动加速 Canvas；它仍运行在系统 WebView 中。封装价值主要是稳定文件权限、项目目录、资源重连、后台任务和原生编码器。编辑器核心不得直接散落调用浏览器文件 API或 Tauri command，应经过宿主接口：

```ts
interface HostAdapter {
  kind: 'browser' | 'tauri';
  capabilities: HostCapabilities;
  openText(options): Promise<{ name: string; text: string } | null>;
  saveFile(options): Promise<{ mode: string; name: string } | null>;
  pickAssets(options): Promise<File[]>;
  readDataUrl(file: File): Promise<string>;
}
```

浏览器实现 `editor/host-adapter.js` 已接管场景打开/保存和素材选择；Tauri 可在加载前注入同合同的 `window.__PATCHARIUM_HOST__`。真实路径、`assets/`、原图处理配方、批量导出和按需编码仍是桌面实现范围，详见 [HOST_ADAPTER.md](HOST_ADAPTER.md)。Scene/Runtime 不依赖任一宿主实现。

## 6. 推荐性能演进

1. ✅ 已加入 Runtime 绘制 P95、目标帧率、实际像素遍数、Sampling Motion 帧缓存命中与最大单张离屏面积；后续再扩展到所有缓存及总离屏内存峰值。
2. 🚧 阈值与网点叠加已共享一次像素读取；全局与局部 C 级效果仍需继续收敛为可复用的降采样处理链。
3. 🚧 Sampling Motion 与静态粒子精灵已有独立缓存和实体级失效入口；仍需把脏标记扩展到全局纹理、蒙版与其他派生资源。
4. 局部效果严格按蒙版包围盒处理；缓存画布只扩容、不逐帧创建。
5. ✅ 预览 Adapter 已提供 Auto / Full / Draft 三档：Draft 对色板、阈值、网点、对象/场景调色等 CPU 像素循环按画布工作量使用 2× / 4× / 8× 降级；Auto 由真实 Runtime P95 带迟滞调节刷新间隔，但始终保持 1×，避免用户误以为场景的采样格被编辑。`renderTo` 未传预览选项时保持 1×，且设置不写入 Scene。
6. 数据与 UI 稳定后再接入 Worker + OffscreenCanvas；Tauri 可选原生编码器，但 Runtime 保持 Canvas2D 基线。

## 7. vNext 隔离 Runtime

`runtime-src/vnext/` 与构建产物 `home-scene-vnext.js` 是效果系统重构期间的实验 Runtime；它只接受 `format:'tosampool-scene/v4'`，不由当前编辑器加载，也不替换本文件前述的唯一产品 Runtime `home-scene.js`。当前已验证对象局部视觉胶囊、静态/Alpha/元素引用蒙版及 `mask-only` 来源隐藏、投影/描边/染色叠加，以及共享采样格、内嵌于不均采样的采样场/边缘保护、取色数/阈值/噪点/偏移/网点/不均采样。

R7/R8 已验证场景级 `overlay → sample`：若没有启用场景滤镜则保持直绘；有启用项时才建立全画布离屏层。调色四轴、染色叠加、程序纹理叠加及现有采样项可各自使用统一范围蒙版；对象端也已支持程序纹理与内外硬边光效。其目的是先验证“局部视觉胶囊 → 阶段化效果 → 场景后处理”的新管线，再一次性完成 Scene、Inspector 和 Runtime 的切换，而不是在正式 Runtime 中长期维护两套 FX 语义。

R9 确立图片输入边界：Scene 可序列化素材 locator，但 Runtime 只接收由浏览器 / Tauri Host 解析完成的临时 `assets` 映射；值可为 `CanvasImageSource` 或 `{ image | canvas | bitmap }`。Runtime 不负责直接读磁盘或网络，避免把权限、缓存与渲染混进同一层。

R10 确立组边界：`group` 是平铺 `entities` 中的变换父级；成员用 `parentId` 关联并保留自身在原数组中的 z 顺序。组只向成员传递位置、旋转、缩放与透明度乘算，不产生新的渲染容器；因此成员对象胶囊、引用蒙版和后续粒子缓存仍可独立处理。

R11 确立粒子边界：`particle-emitter` 的 `particle.sourceId` 必须引用普通实体。每个发射器每帧通过该来源建立一次完整视觉胶囊，再由所有粒子复用该精灵；粒子只额外计算确定性的出生位置、速度、重力、风、尺度、旋转和淡出。这样来源对象的视觉修改会在下一帧自动继承，而像素处理不会按粒子数倍增。

R12 确立 v4 的持久化边界：详见 [VNEXT_SCENE_CONTRACT.md](VNEXT_SCENE_CONTRACT.md)。结构校验、JSON 序列化、Host 解析和 Runtime 输入各自独立；当前编辑器尚未切换至该格式。

R13 提供 `EditorVNextRuntimeAdapter`：先检查 Runtime capability，再将持久 v4 Scene 与运行时素材注入结合为隔离预览。它被当前页面加载但没有任何自动切换或回退逻辑；切换必须在完整编辑工作流验收后显式发生。

R14 将 Registry 的 `runtimeSupport`、Inspector 页、存储路径和禁用状态统一收敛为 `EditorVNextInspectorModel`。模型只描述 v4 Scene 的可编辑能力，当前正式 Inspector 尚未消费它，因而不能把旧 `fx.layers` 直接写成新格式。

R15 收口场景范围效果的蒙版基础：静态矩形、椭圆与多边形先在独立离屏面上真实裁切，再与未处理场景合成，避免“只设 clip、外部像素仍残留”的浏览器差异。稳定 id `masked-inner-light` 的用户语义已收束为“蒙版暗角”：复用同一范围蒙版限制轻量径向暗角（中心保留、边缘范围、颜色、强度），不是通用模糊或真实光学羽化。输出颗粒、Host 资产实际解析、v4 Inspector/保存/测试页/导出切换仍未接入正式编辑工作流。

R16 补齐 v4 的 Host→Runtime 素材接线：`EditorVNextAssetLoader` 通过已有 `EditorAssetResolver` 解析持久 locator，再由 `createResolved()` 临时注入 Runtime。它不改变当前编辑器的打开/保存流程，也不让 Runtime 读取路径；正式入口仍需显式切换至这条异步链路。

R17（已替代）：场景管线现为 `overlay → sample`。噪点不再存于独立 `sceneEffects.outputGrain`，而是 `texture-overlay` 的 `noise` 图案类型，以稀疏点绘制复用叠加语义、范围蒙版和混合方式。

R18 让 v4 效果卡使用与实体相同的稀疏 Step/Linear 求值器。对象轨道键为 `effect:object:<entityId>:<effectId>`，场景轨道键为 `effect:scene:<stage>:<effectId>`；只有注册表允许的字段应由未来 Inspector 写入。Runtime 在固定时间内覆写当前效果配置，不改变保存的基础值。

R19 提供 `EditorVNextEffectState` 作为未来 Inspector 的唯一效果写入边界。它以 Registry 推导默认值和存储路径，并在移除效果时一并清除其轨道；当前页面只加载该模块，尚未切换到 v4 编辑工作流。

R20 提供 `EditorVNextWorkspace`：新建、打开、保存、素材解析和隔离 Runtime 预览共用同一 v4 会话，且没有 legacy 格式回退。UI 仍须以明确的新建/打开入口选择这条路径，不能默默替换正在编辑的旧 Scene。

R21 新增 `vnext-workbench.html`，作为首个实际消费 v4 工作区、Registry Inspector Model、效果状态写入器和固定时间 Runtime 的隔离入口。它不是正式编辑器替换，也不导入 legacy JS；其目的只是先验收 v4 工作流闭环。

R22 新增 `EditorVNextSceneMutation`，作为 v4 编辑行为唯一的可撤销变更边界。工作台的新建/打开会清空历史；每个效果启停则以语义标签、序列化前后快照进入撤销/重做栈。后续成样、效果参数和时段编辑必须通过此入口写入，不能重新直接修改工作区 Scene。

R23 新增 `EditorVNextEntityState` 的成样字段白名单，并让 Workbench 以 Registry 参数定义生成已启用效果卡的基础输入。对象的变换、透明度和填色，以及效果参数，均经 Scene Mutation 写入；UI 不再自行猜测效果路径或默认值。当前输入仍是提交式，尚未接入拖拽手势、实时颜色预览或时序编辑。

R24 只将采样格接入共享控制器，它存储在对象 `effects.sample.controllers` 或场景 `sceneEffects.sample.controllers`，固定显示在采样 Inspector 顶部；它独立执行一次最近邻降采样/放大，并作为偏移、网点和不均采样的共同低分辨率工作面。采样场与边缘保护改为 `uneven-sampling` 的嵌套声明，只参与不均采样，不再作为全局控制器。

R25 新增 `EditorVNextTimelineState`：轨道切分、Step、Linear 与清除均由显式 API 完成。该层尚未接入 Workbench 的时间轴，但已固定“改值绝不暗中切段”的数据语义，供成样与效果时间轴共用。

R26 将 Workbench 的“导入图片”接到 Host → Asset State → Workspace → Asset Loader 的完整边界：浏览器保留 data URL，桌面端保留授权 locator；两种情况都会创建稳定素材 id 与居中的 image 实体，且作为一次可撤销变更。该入口尚未成为正式产品素材库。

R27 新增 `img2asset-vnext.html`：它是当前正式编辑器的完整隔离副本，而非新写的简化页面。初始只更换标题、增加迁移模块预加载与合同测试，仍保持旧 Scene/Runtime 的成熟交互；之后所有 v4 接线先在这里逐块替换。`vnext-workbench.html` 仅保留为轻量合同夹具，不再被视为产品界面路线。

R28 在完整迁移副本中接入 v4 会话的第一条垂直路径：`新建 v4 / 打开 v4 / 保存 v4` 经 Workspace，原舞台上的独立 v4 Canvas 经 Runtime Adapter 预览，撤销边界已存在。v4 会话期间 legacy Inspector、编排器、导出和测试页显式冻结，绝不让它们写入另一份旧 Scene；这些 UI 要在后续各自迁移完成后再解冻。

R29 开始迁移完整副本内真正的编辑表面：v4 会话重用原页面的结构树、素材栏与右侧 Inspector，但其内容由 `EditorVNextWorkspace → SceneMutation → EntityState / EffectState / AssetState` 受控写入。当前已可在树中选择对象或场景、修改对象成样字段、启停并调整 Registry 已声明的对象/场景效果与共享采样控制器，以及从 Host 导入图片；画布点击仅做基础轴对齐命中。旧版时间轴、绘制/文字工具、旧 JS 测试/导出仍冻结，不能被误认为已迁移或可写入 v4。

R30 解冻 v4 会话底部编排器的首个切片：它由 `EditorVNextTimelineState` 直接显示当前对象或用户点选效果的轨道，支持播放头定位、显式切分、把当前基础快照写为 Step，以及清除整条覆层。渲染轨道时不会隐式创建数据；只有操作按钮经过 Mutation 写入。Linear 因尚无 Inspector 的端点编辑入口而故意不提供操作按钮，旧版时间轴仍不参与 v4。

R31 将 v4 Inspector 接入时序写入模式：`base / step / linear-from / linear-to` 是同一批输入的写入目的地，而不是第二套属性面板。对象数值字段可写 Step 或 Linear 两端，填色只能写基础或 Step；效果字段按 Registry 的 `timing` 声明限制 Linear，其余只允许 Step。所有时序写入必须先通过现有目标段，不自动切段；读取时 Inspector 按当前播放头显示相应覆层或端点。

R32 完成 v4 页面纯化：`img2asset-vnext.html` 只保留成熟页面的布局、CSS 与静态 DOM 外壳，实际只加载 v4 Runtime、Host、Registry、Asset Loader、Scene、Mutation 与纯 v4 页面控制器。它不加载 `home-scene.js`、旧 Runtime 镜像、旧命令/Mutation/Registry，也不保留“进入/退出 v4 会话”。旧 `img2asset-layout-v1.html` 是唯一可执行 legacy 页面。未迁移的测试/导出入口在 v4 页面必须禁用并标注，而不是回退执行 legacy 代码。

R33 补回素材导入的首个可用切片：v4 页面在导入单张图片后先显示预处理预览，确认后把原 locator 与确定性 `assets[id].recipe` 同时保存。配方当前涵盖尺寸、最近邻采样格、PICO-8/NES/GB/VGA 色板、均匀量化与基于左上角颜色的去背景容差；`EditorVNextAssetLoader` 在 Host 解析素材后、注入 Runtime 前统一执行它。这样预处理不会变成刷新即丢的临时 Canvas，也不把文件访问交给 Runtime。多帧处理、背景建立与已入库素材再次编辑仍未迁移。

R34 解锁 v4 工具栏中有既定 Runtime 语义的创建工具：矩形、直线、椭圆与多边形以拖拽写入普通实体，文字以点击写入可编辑 `text/fontSize/fontFamily` 实体，图片仍统一进入素材预处理后再成为 image 实体。多边形首版建立默认三角路径；精细点编辑将留给 Geometry Controller 的后续阶段。贝塞尔钢笔保持禁用，不能把它伪装为多边形。

R35 引入 v4 Geometry Controller 的首个手势边界：选择框、拖移、四角缩放和旋转只持有临时手势状态；手势过程中通过 Workspace 刷新 Runtime 预览，松开后才由 `SceneMutation.commit()` 生成一条撤销记录，Esc 则回滚开始快照。首版四角缩放统一写 `scaleX/scaleY`；R39 随后把旋转中心从固定中心扩展为持久 pivot。多选联合框、精确多边形顶点与组层级直操仍未迁移。

R38 确立 v4 结构树语义：`entities` 始终是唯一绘制与 z 顺序数组，`group` 仅通过成员 `parentId` 成为变换父级。编组、解组、删除、前后插入、拖入组内及拖到普通对象中央自动建组，都由 `EditorVNextStructureState` 经一次 `SceneMutation` 完成。删除组等价于解组，保留成员；这避免因为组织操作意外删除画面内容。

R36 扩展 v4 素材输入：`assets[id]` 可声明有序 frame locator 列表、`fps` 与循环规则，Asset Loader 将每帧以相同 Recipe 解析并注入 Runtime；对象与背景均以固定时间选帧。`background.layers` 在底色后、实体前依序绘制，可保存保持原状 / 拉伸 / 平铺布局；背景不是实体，不参与选择和对象效果。由图片建立场景只用处理后尺寸更新画布并创建背景层。多帧不会被强制拼接为雪碧图，因而保留逐帧原始引用与后续桌面项目重连的空间。

R39 确立自定义旋转中心合同：实体可保存 `pivot:{mode:'custom',x,y}`，坐标按对象局部宽高归一化并限制在 0–1；缺省仍为中心。`frame.matrixFor()` 是变换真值源，内容绘制、组父级、效果胶囊包围盒、粒子发射器与 Canvas 命中均复用同一矩阵语义。Classic v4 控制器通过显式画布放置模式写入 pivot，右键中心按钮恢复缺省；保存重开不得丢失该字段。

R40 把 Classic v4 的多选与父级组接入同一世界矩阵合同：选择集先去除已被选中祖先覆盖的后代，联合框以所选根实体的世界包围盒计算；移动、缩放、旋转和镜像生成一次世界空间增量，再相对各自父级分解回实体 TRS。编组以成员真实包围盒建立父组并把成员坐标改写为组局部坐标，身份编组必须保持固定时间像素不变；组本身不绘制，成员仍按平铺 `entities` 顺序各绘制一次。解组只承诺可由 TRS 表达的结果，非均匀父缩放与旋转子项造成的剪切必须在后续合同中显式限制或建模，不能静默近似为“无损”。

R41 固定 Classic v4 结构树的可见性与调序边界：`hidden` 是 Runtime 与保存均读取的持久字段，`locked` 是保存的编辑权限字段并由 Canvas 命中和直接变换共同过滤；“独显”只是 View Controller 生成的临时预览 Scene，不向 Workspace 写入隐藏值。结构树沿用 Pointer 阈值和前/后/中央落点，禁止 HTML5 原生拖放。跨父级调序必须用世界矩阵换算新局部 TRS，拖动组必须移动平铺 `entities` 中的完整后代块，而非只移动不绘制的 group 条目；一次放置只生成一条 Scene Mutation。

R42 建立 Classic v4 的基础 Inspector 上下文：它只消费 View Controller 的同一 `selectedIds`，清选显示场景，单选显示对象/组，多选显示联合上下文；不得另建 Inspector 私有选择状态。画布尺寸、循环、背景底色/透明度和对象/组基础 TRS 由 `classic-v4-inspector-controller.js` 经共享 Scene Mutation 写入，Workspace 变更反向刷新字段。尚未接入的动态、效果、采样和时序页必须禁用，不能回落写 Legacy Scene。

R43 建立 Classic v4 的矢量创建边界：矩形、椭圆、直线和多边形继续使用 Legacy 工具栏与 Canvas 手势，但由 `classic-v4-drawing-controller.js` 在捕获阶段独占绘制会话并只写 v4 `entities`。拖动期间只更新高 DPI 预览，提交后才产生一条 Scene Mutation；Shift 约束正方形/正圆，多边形点在提交前可见并以 Enter/双击闭合。圆角矩形的 `radius` 是 Scene/Runtime 字段而非编辑器装饰，Runtime 固定时间渲染必须走相同圆角路径。v4 一个基础图形对应一个普通实体；Legacy 的一个元素内多 `parts` 编辑尚未迁移，不能据此宣称 Phase 7 完整等价。

R44 建立 v4 可编辑文字与便携回退边界：文字实体保存 `text / fontSize / fontFamily / letterSpacing / lineHeight / fill`，Canvas 点击后以原位多行输入编辑；一次编辑会话从开始快照到失焦或 Ctrl/Cmd+Enter 只提交一条历史，Esc 回滚。`EditorVNextTextState` 同时生成透明 PNG 小快照并以 `rasterAssetId` 引用，Runtime 优先绘制该快照，缺失时才按文字参数现场排版；因此保存作品不嵌入整套字体文件，也不依赖播放环境恰好安装原字体。Inspector 修改文字参数必须经同一 Text State 同步刷新快照。外部字体选择、授权 locator 与重连仍未迁移，不得把当前禁用的 `+` 入口计作完成。

R45 收口 Classic v4 多帧素材的持久语义：Legacy 预处理 UI 可以继续用横向 sheet 做当前会话的编辑缓存，但进入 v4 Workspace 时必须拆回有序 `assets[id].frames[]` locator，不得把整张拼接图误写成单帧。每帧在入库前应用同一尺寸与预处理规则；对象和背景用同一 `fps / frameLoop` 固定时间选帧。对象 Inspector 只修改实例播放方式，不重排素材帧。浏览器受控验收必须覆盖多文件导入、动画预览源、帧数组、对象放置、帧率撤销和素材清理；Runtime 与保存重开继续由已有多帧合同覆盖。

R46 建立 v4 对象内图元的首个闭环：`vector.parts` 与 `image.parts` 是对象局部内容，不得提升为场景实体或以 group 冒充。part 使用父对象左上角为原点的局部像素坐标、父内稳定唯一 id 和数组绘制顺序；图片先绘制主体再绘制 parts，纯 vector 只绘制 parts。无对象效果时两者必须留在直接绘制路径；已有蒙版、加样或采样时，主体与所有 parts 进入同一个既有对象胶囊。`EditorVNextPartsState` 是单图形提升、追加、删除、调序和包围盒归一化的唯一纯状态入口；结构树、Inspector、Delete、逐层 Canvas 命中和独立青色变换控制器共同消费 View Controller 的 `selectedPartId / selectedPartIds`，不能建立第二份选择状态。Ctrl/Cmd 点击与 Ctrl/Cmd+A 只在同一父对象内形成 part 选择集，Esc 先退回父对象；联合青框的移动、缩放、旋转和镜像继续使用父对象局部坐标，并在手势结束后才归一化 vector 边界，一次手势只提交一条 Scene Mutation。真实 Edge 已覆盖追加选择、Ctrl/Cmd+A、Esc 分层退出，以及联合移动、缩放、旋转、镜像与逐项撤销；复杂父组下这些变换的全部组合及 Legacy 纹理完整等价尚未验收，因此 `parts-drawing` 仍保持 `schema-ready`。

R47 建立 v4 part Paint 首切片：路径描线、纯色填充、纹理填充是三个独立能力，颜色 Alpha 分别保存为 `strokeAlpha / fillAlpha / fillPattern.opacity`，不得写入对象或 part 的整体 `alpha`。`EditorVNextPartsState` 负责把 `lines / dots / checker` 纹理参数归一到确定范围；Runtime 以场景尺寸和纹理参数建立最多 12 项的画布锚定离屏缓存，绘制时只按当前 part 路径裁剪贴图，禁止每帧逐点重建。对象效果胶囊必须传入其场景原点，使直接路径与胶囊路径保持同一纹理相位。Inspector 启停或改型必须经 Scene Mutation 立即刷新画面；View Controller 要先同步选择与结构树，再等待异步 Runtime 重绘，Canvas 成本不能阻塞编辑器结构反馈。多层线纹及 Legacy 复合弹层仍未完成，因此本条不把 `parts-drawing` 升级为 `browser-parity`。

R48 重置偏移采样的 Runtime 合同：`offset-sampling.type='boil'` 不再为图片保留特殊源路径。对象或场景完成高分辨率胶囊栅格化后，Runtime 以中心、左、右、上、下五个微移取样窗生成低分辨率候选面，并按 `boil.bias / boil.coverage / motion.enabled / motion.type(sampling-step|sampling-drift) / motion.frequency / seed` 为每个采样格确定性选取候选；候选选择不混色，也不形成单一方向的整面平移。默认仅 30% 格离开中心候选。偏置为不超过采样格减一的中心对称整数；关闭动态后固定于 seed 对应的静态采样相位。最外一圈采样格始终保护；`edge.mode='contour'` 还固定 Alpha 轮廓及邻域，`'interior'` 还固定不透明内部。`type='breath'` 则使用一个整张对象共享的**小数**采样窗：`origin ∈ [0, breath.bias]`、`sourceSize = 原尺寸 - breath.bias`。这条路径保留旧导出页的格点相位游移；对象级 `breath.edge.mode='contour'` 会回填 Alpha 轮廓，而 `off` 不读写额外像素、保持旧版视觉；不提供“保护内部”。三条路径都在整个对象内容完成栅格化后、最近邻放大前运行，所以文字、图元集合、内建组件与图片具有一致语义。`type='bands'` 则是独立的采样后处理：用有限条完整水平／垂直条带进行复制位移，参数为数量、厚度、位移、通道和 seed；禁止逐像素按条带 hash 重采样。固定时间测试需验证沸腾相邻 tick 改变候选格、格为 1 时无效、图片与矢量都能进入同一采样路径、外缘保持稳定，以及条带故障不影响未选中的区域。

每次修改 vNext 源模块后必须运行 `npm run runtime:vnext` 更新分发文件；`npm run verify` 会检查分发未过期并执行基础固定时间冒烟测试。等 vNext 获得完整对象、粒子、场景、素材和导出验收后，才可以修改本合同的“唯一 Runtime”定义。
