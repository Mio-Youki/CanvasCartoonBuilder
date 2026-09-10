# 场景工程与参数化脚本规范（SCENE_SPEC）

> **唯一数据合同**：供生成 Agent、改写 Agent 与编辑器共同遵循。按本规范生成的场景 js
> 可被 `tools/img2asset.html` 完整解析为可调图层（打开 → 图层栏调参 → 保存写回）。
> 新建作品应使用 `GENERIC_SCENE`；`HOME_SCENE` / `DEFAULT_HOME_SCENE` 仅用于已有项目脚本的兼容编辑。
> 工具只在打开 `GENERIC_SCENE` 时做「通用场景可编辑性诊断」（`checkGenericEditability`）；
> 它提示不能被编辑器完整继续编辑的结构，不评判兼容项目脚本的 Runtime 可运行性，也不阻止导出。

> **参考图生成顺序**：本规范只定义数据格式；参考图重绘的执行协议见
> [AGENT_GENERATE_SPEC.md](docs/agent/AGENT_GENERATE_SPEC.md)。生成应先交付不带动画的合法静态基底，
> 在同尺寸预览中完成视觉锁定和结构整理后，再增量写入 `anim`、`scroll`、particle、FX、转场及
> 多场景 `show`。静态基底优先采用参考图的原始宽高比，不能因套用默认画布而裁切构图。
> 外部 Agent 的读取、结构化 Patch 与验证动作见
> [AGENT_TOOL_PROTOCOL.md](docs/agent/AGENT_TOOL_PROTOCOL.md)；该协议不扩张本格式的字段集合。

## 一、顶层结构

```js
const GENERIC_SCENE = {
  format: 'canvas-cartoon-scene',
  formatVersion: 1,
  kind: 'generic',
  name: '未命名场景',
  w: 320,            // 画布宽
  h: 180,            // 画布高（当前默认工程）
  loop: 4,           // 循环周期（秒）
  bg: '#10131d',     // 默认先用常量；按场景颜色数组由工具按需生成
  transparent: false, // true=Canvas 保留透明背景（PNG/APNG/WebP；GIF 仅二值透明）
  scenes: ["夜原", "雾", "山口", "桥"],   // 场景段名（可选；声明后时间轴显示段划分、工具可增删/拖边界）
  // sceneBorders: [12, 24, 36],          // 可选：场景边界秒数（长度 = scenes 数 - 1）；缺省=等分
  // timeline: { sceneOverrides: { "stable-element-id": { 1: { x: 56, alpha: .65 } } }, tracks: { "stable-element-id": { 1: { segments:[{f:[0,.4],values:{x:20}},{f:[.4,.7],type:'linear'},{f:[.7,1],values:{x:80}}] } } } }, // 可选：属性时段与 Linear

  // —— 程序化元素：扁平键，每元素一个对象 ——
  sparkles: { z: 1, parts: [/* 图元 */] },
  rain: { z: 20, parts: [/* 图元实体 */], particle: {/* 粒子参数 */} },
  leaves: { z: 20, particle: { source: { type: 'image', imageId: 'leaf', playback: 'particle-age', fps: 8 } } },
  // …… 任意具名程序元素 ……

  images: [ /* 素材层（工具导入的图片元素，同一 schema） */ ],
  // 可选：仅编辑器组织数据，不是 Runtime 渲染层；父级变换会写回成员。
  groups: [{ id: 'group-trees', name: '前景树', memberIds: ['tree-a', 'tree-b'] }],
};
```

## 二、元素 schema（程序化元素与素材 images 通用）

```js
{
  z: 3,                 // 图层层级（越大越靠上；渲染按 z 排序）
  // —— 显示时间（可选；缺省 = 全程显示）——
  show: [null, [[0.2, 0.8]], null, [[0, 0.5], [0.7, 0.85]]],
  //       每场景一段：null=隐藏；[[f0,f1],…]=该场景一个或多个显示窗口（f 为场景内 0~1 比例）
  //       单窗口可简写 [f0,f1]（工具/渲染端自动归一为 [[f0,f1]]）
  // —— 矢量图元（可选；有 parts 时按 parts 绘制，否则走程序化绘制）——
  parts: [
    { type: 'rect',    x: -7, y: -7, w: 15, h: 15, radius: 3, fill: '#d5d8bb' },
    { type: 'line',    x: 0, y: 0, x2: 10, y2: 10, stroke: '#ffffff', strokeWidth: 1 },
    { type: 'ellipse', x: 20, y: 0, w: 12, h: 8, fill: null, stroke: '#ffd23f', strokeWidth: 1 },
    { type: 'poly',    points: [[0,0],[10,0],[5,8]], fill: '#7dff5f' },
  ],
  //       坐标相对元素原点 (x,y)+滚动偏移；fill/stroke 为颜色或 null；strokeWidth 为描边宽
  // —— 任意参数，值必须是以下类型之一 ——
}
```

> **Agent 只需生成常量参数**（见四.1）：按场景取值由工具按需生成（[s] 单场景编辑自动写数组）。
> `color + fill:boolean + width` 仅为旧场景兼容写法；新生成内容不得使用。

### 当前可执行子集（Agent 必须遵守）

- 文件必须只含一个静态对象声明：`const GENERIC_SCENE = { ... };`。不得使用 `import`、函数、变量计算、外部脚本或自定义 Canvas 绘制代码。
- 顶层元素分三类：**通用元素**必须带稳定唯一 `id`，以及 `parts` 或 `particle`；**不透明素材**放入 `images[]`（仅编辑位置、尺寸、透明度等外层参数）；**内建锁定元素**可写 `kind:'builtin'` + 已注册的 `builtin` 名称。当前注册表仅有 `train-beam`，可编辑其 `x/y/beam/beamLen/beamOrigin/beamSpread/show`，但不可编辑其绘制算法。未知 builtin 不执行并会被自检提示。稳定 `id` 用于 FX 绑定、素材引用和后续 Agent 定位，禁止依赖对象键名或数组下标。
- `images[]` 的图片元素必须有稳定 `id`、`src`、`x/y/w/h`；纯矢量元素可放在 `images[]`，但必须带 `parts`。
- 复杂且无法拆分的视觉内容应由用户导入为图片/sprite；当前浏览器版不允许 Agent 伪造尚不存在的 `data:` 图像内容。
- 每个 Runtime 图层可带 `mask` 裁剪蒙版；它限制最终可见区域，适用于 parts、图片、粒子、builtin 与兼容项目元素。支持 `rect`、`ellipse`、`poly`，坐标为画布绝对坐标；也支持 `alpha`：`{ type:'alpha', imageId, x,y,w,h, frame?, mode?:'alpha'|'luma', invert? }`，以 `images[]` 内图片的透明度或明度在该画布范围内裁剪。`mode:'luma'` 为黑透明、白不透明，且继续乘原图 alpha；`invert` 在映射后反相。`imageId` 是稳定素材引用，不能内嵌副本。`element`：`{type:'element',targetId,invert?}` 引用场景内具有稳定 `id` 的元素或组；其实际 Runtime Alpha（含自身动画、时序、Linear、组变换与自身蒙版）每帧作为蒙版，来源在正常场景合成中自动隐藏。禁止循环引用。当前仍不支持羽化。
- `parts[].type:'rect'` 可选 `radius`（整数像素，0 为直角；Runtime 自动钳制到短边的一半）。
- `timeline.sceneOverrides` 是可选的稀疏 Scene 参数覆盖：键为稳定元素 `id`，第二层键为 Scene 索引，最内层只保存该 Scene 实际修改过的基础字段，如 `{ "tree": { 1:{x:56,alpha:.65} } }`。Runtime 取值顺序为“该 Scene 覆盖 → 元素自身常量/按场景数组”；缺失字段始终继承基础值。它暂只用于非结构性元素字段，`show` 仍沿用自身窗口格式。
- `timeline.tracks` 是可选的**属性时段附着数据**：`tracks[elementId][scene] = {segments:[{f:[0..1,0..1], values?:{任意可编辑字段}}, ...]}`。元素下轴 `show` 是唯一的时段来源：Inspector 写值绝不隐式切段；用户通过时间轴切分、拖动或删除 show 段时，属性段同步跟随其边界，删除 show 段会同时清除对应 `values` / Linear，避免幽灵覆层。普通段的 `values` 表示该段持续状态；新建 `type:'linear'` 段不冻结端点，而是在 `x/y/w/h/rot/rotation/alpha/scaleX/scaleY` 上实时读取左右最近的普通段（会跳过连续 Linear）并插值，因此两侧参数更新会立刻反映到过渡。历史 `from/to` 快照会安全忽略；未来若加入“锁定端点”才另行启用。编辑器仅在左右相邻显示段至少一侧有实质覆层时允许创建 Linear。取值优先级为“当前属性时段 → Scene 覆盖 → 元素基础值”。
- 每个可见元素都可选 `scaleX` / `scaleY`（默认均为 `1`）：编辑器以 `100%` 显示并保存数值比例。图片最终尺寸为 `w/h × scaleX/scaleY`；`parts` 则绕整体包围盒中心非破坏式缩放，局部几何不被改写。两者均可写入 `timeline.tracks[].segments[].values`，并与 pulse 动画相乘。
- 面形图元（`rect` / `ellipse` / `poly`）可选 `fillPattern`，在**画布坐标**中生成纹理后按图元路径裁剪：`{type:'lines'|'dots'|'checker', mode?:'replace'|'overlay', color?:'inherit'|颜色, baseColor?:颜色, opacity?:0..1}`。`replace` 仅显示纹理、`overlay` 在 `baseColor`（缺省回退 `fill`）实底上叠加；纹理颜色缺省继承 `fill`。`lines.layers` 最多 3 项，每项为 `{angle,width,gap}`。`dots` 使用 `{sides:3|4|5,roundness:0..1,size,gap,phase:0..1,angle,layout:'regular'|'stagger'}`；`checker` 是方点交替预设，复用 `size/gap/phase/angle`，不是独立渲染算法。
- 可编辑文字是 `images[]` 的一种图片元素：`text:{value,font:{id,name,family},size,tracking,lineHeight,fill,stroke,strokeOn,strokeWidth}` 保存工程编辑信息，`value` 可含 `\n` 换行；`lineHeight` 是行距倍率，缺省为 `1.25`。`src` 同时保存由该文字栅格化得到的内嵌 PNG。通用 Runtime 只读取 `src`，所以独立网页不依赖字体环境且文件体积接近普通图片。导入字体仅作为当前编辑会话缓存；保存时绝不写入完整字体二进制。重新打开工程时，编辑器会尝试按 `font.family/name` 使用已安装字体；缺失时保持现有 PNG，用户再次修改文字会以默认无衬线字体重新栅格化。
- 顶层元素与图元都可使用 `alpha` 与 `blend:'normal'|'screen'|'multiply'|'lighter'`。元素 alpha 会与元素 blink 相乘；图元 alpha 再与元素 alpha 相乘，图元声明的 blend 优先于元素 blend。`groups` 仅是编辑器成员关系，不是 Runtime 合成容器，因此不支持 alpha 或 blend。
- 当前禁止输出 `keyframes`、`project`、`assetRef`、自定义 `fx` 函数等规划字段；工具会保留未知字段，但不会把它们作为可编辑动画执行。Agent 不得输出任意函数、`eval` 或未注册 builtin。
- `groups` 是可选的父级组：`{id, name?, memberIds:[...至少两个稳定图片/矢量元素 id], transform?:{rot?,alpha?,pivot?:{mode:'custom',x,y},anim}}`。它不产生新的 Runtime 图层、不支持嵌套；结构树将成员视为连续图层块并保持成员的相对 z。静态组操作（移动、缩放、镜像）直接写入成员；组 `rot/alpha/pivot/anim` 则由 Runtime 在逐成员绘制前叠加同一父级矩阵，可用于刚体式 bob/spin/wave/pulse/blink，且不改变成员的单独编辑能力。
- 元素可选样式为 `style:{shadow?:{color,distance,angle}, outline?:{color,width}, imageFx?:{mode:'threshold'|'halftone',threshold?:0..255,dark?:颜色,light?:颜色,cell?:2..32}, bandWave?:{amp?:0..48,period?:秒,band?:2..96,cycles?:数}, sampleJitter?:{rate?:每秒变化次数,amount?:采样格内源像素偏置,mode?:'step'|'drift',seed?:整数}}`；阴影无模糊，`angle` 0° 向右、90° 向下，`distance` 0–16，外描边 `width` 1–4。`imageFx` 只作用于图片帧，参数变化时缓存生成双色阈值或半调点阵，不能替代语义分层；`bandWave` 仅对未旋转、未镜像的图片做水平带状位移，适合被蒙版限制的云/水/热浪区域，不是通用液化。`sampleJitter` 只作用于图片（含图片背景）的再像素化采样格，要求 `pixelDiv>1`，`amount` 限制为 `0..pixelDiv-1`；`step` 逐格跳变、`drift` 在确定性采样位置间平滑移动，相同 `t/seed` 必须得到相同帧。效果基于图片与 parts 合成后的 Alpha 轮廓，在元素自身蒙版内合成；它与 `parts[].stroke`（几何描边）及局部 FX 光晕不同。粒子层同样支持阴影/外描边字段：样式先作用于粒子实体精灵，再按粒子运动绘制。图片与 parts 都可设置层级 `pixelDiv`（≥1，无 UI 人工上限；Runtime 以画布短边作为自然上限）和 `alphaMode:'keep'|'remove'|'boost'`；Runtime 会在绘制该层时执行最近邻降采样及边缘 Alpha 处理，素材库不承担这些风格参数。

### 程序元素（黑盒内部、白盒外壳）

- 顶层非保留键可声明为程序元素：`{id,name?,z?,x,y,w,h,show?,alpha?,blend?,mask?,anim?,params?,editor?,program:{code}}`。`program.code` 是本地可信 Scene 的自包含 Canvas 代码字符串；Runtime 用 `render(ctx,t,el,scene,helpers)` 语境执行，`helpers` 只提供 `clamp / lerp / rgba / noise`。它必须确定性地依据 `t` 绘制，不能依赖编辑器 DOM、网络或外部资源。
- 程序元素内部不要求拆成 parts；`id + x/y/w/h` 是编辑器选择、时间轴、组、蒙版、局部 FX 与外部补丁的最低外壳。`params` 保存可调参数；`editor.controls:[{path,label,min?,max?,step?,type?}]` 决定 Inspector 暴露哪些字段，未声明的内部细节保持黑盒。
- 普通图片/矢量/粒子层可以按 z 叠在程序元素上作为“创可贴”覆盖。自动跟随内部锚点仍属后续能力；当前可通过共享组、整体变换或手动定位实现外壳级覆盖。
- 程序元素不是安全沙箱：只应加载用户信任或经审阅的本地 Scene。导入前校验器检查其代码语法、稳定 id 与边界，运行时单元素错误会被隔离，不能中断其它图层；它不保证阻止恶意 JS 的副作用。

### 粒子图片实体

粒子默认以元素自身 `parts` 为实体；也可引用 `images` 中一个稳定 `id`：

```js
petals: {
  z: 30,
  particle: {
    source: { type: 'image', imageId: 'petal-sprite', frame: 0 },
    count: 36, life: 2, speed: 24, dir: 90, spread: 35, fade: true
  }
}
```

`imageId` 必须指向 `images` 内的素材元素。`playback: 'static'`（默认）配合 `frame` 选择固定帧；`playback: 'particle-age'` 让每颗粒子从第 0 帧按 `fps` 独立播放，可加 `loop:true` 循环。不要内嵌图片副本或对象引用。

多文件导入时，工具按用户选择顺序生成横向 sprite sheet：第 1 张图定义单帧宽高，其余帧最近邻缩放到同一尺寸（不裁切、不补边）。`images[].w/h` 对多帧图片表示**单帧**显示尺寸，`frames` 表示横向帧数；预览不得把整张 sheet 当作一张静态图片显示。

`images[].src` 保存处理后的 data URL 快照，因此单个 js 可独立运行。浏览器版本暂不保存原图及处理配方；可重连素材与项目目录将在桌面应用封装后加入。

参考图混合样例可以在开发阶段以相对路径 `src` 链接同目录图片，便于替换和审阅；这类文件**不是**独立交付物。正式保存/导出前应通过工具导入对应图片并保存为 data URL 快照，才能满足单 js 自包含要求。高密度静态像素画区域适合作为 `role:'background'` 底图；其上只叠加有编辑收益的局部程序动效。无裁剪/遮罩能力时，动态层必须布置在不会越界的安全区域。

### 图片背景层

图片元素可标为语义背景层；`layout` 是持久规则，运行时会按当前画布尺寸重新布局：

```js
{
  id: 'bg-forest', role: 'background',
  src: 'data:image/png;base64,...',
  w: 160, h: 90, alpha: 1, z: -100,
  layout: 'none', // 'none'=原尺寸居中；'stretch'=拉伸至画布；'tile'=重复填满画布
  anchor: 'center',
  show: null
}
```

背景仍是 `images[]` 的一个图层，因而可使用 `show` 控制场景可见性。`none` 和 `tile` 使用保存时的处理后尺寸；`stretch` 始终填满当前画布。
编辑器会将 `role:'background'` 的图片独立放在图层栏底部，且不允许从画布选中；仅编辑 `layout`、`alpha`、多帧 `fps`/`frameLoop`、`show`、`hidden` 与替换/删除。背景之间以保留给背景的 `z` 区间（`-1000` 起）排序，可在背景区拖拽重排，不影响普通图层顺序；卡片从上到下与画布叠放从上到下相同。`frameLoop:false` 会在最后一帧停住，缺省为循环。

## 三、参数类型（工具表单按类型自动生成编辑控件）

| 类型 | 示例 | 工具表现 |
|---|---|---|
| 数值（常量） | `speed: -5` | 数字输入；多场景时带小 [s] 开关 |
| 按场景数值数组 | `speed: [-5,-13,-5,-5]` | 工具显示**当前场景单值**，[s] 开时只改当前场景槽（自动生成/维持数组） |
| 十六进制颜色 | `color: "#182b4c"` | 取色器；同上支持 [s] |
| 按场景颜色数组 | `color: ["#182b4c","#33445c",…]` | 工具显示当前场景色，[s] 开时改当前场景槽 |
| 颜色串（rgba 等） | `beam: "rgba(255,222,125,.14)"` | 文本输入 |
| 布尔 | `hidden: true`（legacy） | 已并入 show（见四.3） |
| 结构数组（只读） | `points: [[23,13],…]` | 仅展示（不生成编辑控件；可编辑性诊断会提示） |

## 四、约定（Agent 必须遵守）

1. **参数优先用常量**：所有数值/颜色参数默认写常量（作用于所有场景）；**按场景数组由工具按需生成**
   （图层栏每行小 [s] 开关：关=写常量，开=只写当前场景槽）。Agent 不需要预写数组；
   若预写了，长度必须 = 场景数。
2. **消灭按场景散键**：**禁止** `x / x3 / y2` 这类散键——同一参数不同场景取值用数组表达。
   渲染端统一取值 `val(e, key, t)` 自动按场景取数。
   - 反例：`moon: { x: 253, x3: 68, y: 17, y2: 23 }`
   - 正例：`moon: { x: [253,253,253,68], y: [17,17,23,17] }`
3. **声明 scenes**：只要配置里用到 `show` 窗口数组或按场景数组，就必须声明 `scenes: ["段名",…]`
   （否则分段语义按 4 段兜底，可编辑性诊断会提示）。
4. **显示时间 = show 窗口数组**：`show: [win0, win1, …]`（长度=场景数），
   win = `null`（该场景隐藏）| `[f0,f1]`（单窗口）| `[[f0,f1],…]`（多窗口，如 `[[0,0.5],[0.7,0.85]]`），
   f 为**场景内 0~1 比例**（场景边界调整不影响显示）。**连续窗口（v2.9）**：相邻场景窗口首尾相接
   （本场景窗口 f0==0 且上一场景有 f1==1 的窗口）视为**同一连续窗口**——滚动相位跨场景不重置、
   一次性爆发（burst）只在连续链起点触发一次（不跨循环回绕）。**legacy 格式** `{scenes:[..]}` / `[t0,t1]` / `hidden` 布尔
仍被渲染端与工具解析（打开旧 js 自动迁移为窗口数组）。
5. **裁剪蒙版与粒子发射范围分离**：`mask` 决定图层最后“在哪里可见”；粒子元素的顶层 `x/y/w/h` 是“从哪里出生”的发射范围，留空为全画布。两者可同时存在并共用编辑器的矩形框选交互，不能互相替代。
   ```js
   riverGlint: { particle: { count: 24, life: 1.5 }, mask: { type: 'poly', points: [[12,84],[290,80],[306,112],[8,114]] } }
   windowGlow: { parts: [/* … */], mask: { type: 'ellipse', x: 72, y: 28, w: 42, h: 20 } }
   ```
6. **动态效果只使用当前 Runtime 能力**：通用场景可使用 `anim`、`scroll`、particle、内建 FX、transition 与图片多帧。
   不得附加自定义 Canvas/fx 代码；复杂效果应拆为上述能力，或转为图片/sprite。§七中“动态覆盖”仅适用于已有项目脚本
   `HOME_SCENE` 的兼容改写，不属于新建 `GENERIC_SCENE`。
7. **形状几何即代码**：矩形/多边形是代码硬编码的图元组合（`fillRect`/`path`），只有**显式参数**可调。
   需要用户自由改形状的元素，应改用 **images 素材层**（图片 + 位置/缩放/动画全参数化）。
8. **颜色统一 hex（#rrggbb 或 #rgb）**：透明度类用 rgba 字符串（按场景数组时仍为字符串数组）。
9. **z 排序**：渲染按 z 升序；素材 images 缺省 99。工具拖拽排序会自动重排 z 与卡片顺序。
10. **保存往返**：工具的「保存 js」会序列化 `window.HOME_SCENE` 写回文件——所有元素参数必须
   存在于配置对象里；不要依赖「只在代码里写死的数值」作为可调参数。

## 七、动态元素 parts 化（多帧/动画元素的拆解模式）

> 适用：静态几何可拆、但含**时间动画**（闪烁/震动/光束/状态切换）的元素（如 train 列车、signal 信号灯）。
> **拆解原则：静态几何 → parts（坐标相对元素原点）；时间动画 → 保留为代码动态覆盖（fx），
> 渲染顺序 = drawParts（静态）→ fx（动态覆盖）**。像素级验证保证：拆解前后视觉完全一致。

```js
train: {
  z: 8, x: 211, y: 75,
  // …… 原有可调参数（body/cab/…/beam/beamLen 等）全部保留 ……
  anim: 'bob',            // 元素级动画：1px 垂直轻震（与 fx 同步；当前支持 blink/pulse/bob）
  parts: [                // 静态车身：坐标相对元素原点 (x,y)
    { "type": "rect", "x": 0,  "y": 0,  "w": 110, "h": 24, "fill": "#12283b" },
    { "type": "rect", "x": 8,  "y": -6, "w": 38,  "h": 30, "fill": "#17334a" },
    // …… 车厢/轮子/车窗/车头/车尾全部 rect ……
  ],
  // 时间动画保留在渲染端代码（home-scene trainFx/signalFx）：
  //   - 车窗灯闪烁（lampLit/lampDim 覆盖 6 个窗位）
  //   - 车头灯（beam 三角，长度按场景 beamLen）
  //   - 信号灯绿/红切换（signalFx 覆盖灯位）
},
```

**Agent 生成规则**：
- 元素有 `parts` 且非 `partsMode:'overlay'` 时，渲染 = `drawParts` + 元素动画原语（见下）；Agent 只需保证
  **静态几何 parts 与代码原静态绘制逐像素一致**。
- **复杂关键帧/逐帧动画**（状态机、逐帧变换）不建议 parts 化——用 **images 多帧素材**
  （工具可逐帧绘制合成 sheet：`frames` + `fps` 全参数化）。

### 动画原语（元素级与 parts 级共用；skill 暴露给生成 agent 的能力）

`anim` 字段挂在**元素或任意 part** 上（像标签一样，可叠加多个）：

```js
// 字符串简写（= 默认参数，旧配置兼容）
anim: 'bob'
// 单动画对象
anim: { type: 'blink', period: 700, duty: 0.75, phase: 0.25, on: 1, off: 0 }
// 多动画叠加（标签式，互不冲突）
anim: { bob: { amp: 1, period: 1/6 }, blink: { period: 2333, duty: 6/7, phase: 1/7, on: 1, off: 0 } }
```

| 原语 | 参数（默认） | 效果 | 应用 |
|---|---|---|---|
| `bob` | `amp:1, period:1/6`（秒/翻转）, `angle:0`（度，0=垂直，90=水平） | 平移轻震（可斜向；偏移 = 相位 × amp，方向由 angle 分解） | 元素/part |
| `spin` | `speed:30`（度/秒，负数反向） | 持续匀速旋转 | 元素/part |
| `wave` | `amp:10`（度）, `period:1`（秒/周期） | 旋转摆动（绕中心来回摆动，非单向旋转） | 元素/part |
| `blink` | `on:1, off:0.25, period:700`（毫秒/周期）, `duty:0.5`（亮占比）, `phase:0`（on 起点，周期比例） | 透明度方波（on/off 交替，可非对称占空） | 元素/part |
| `pulse` | `amp:0.15, period:0.7`（秒/周期） | 缩放脉动 | 元素级 |

**作用顺序（文档化）**：`bob`（平移）→ `spin`（匀速旋转）→ `wave`（旋转摆动）→ `pulse`（缩放）→ `blink`（透明度）——各原语作用维度独立，可安全叠加。`spin` 与 `wave` 均累加到 `rot`，因此可让元素一边持续旋转、一边摆动。
**wave 层级语义**：元素级 = **绕元素包围盒中心**摆动；part 级 = 叠加到该 part 的 `rot`（绕自身中心）。
**元素静态旋转 `e.rot`**（度，工具黄框旋转手柄写入）：渲染端 `totalRot = e.rot（静态）+ wave（动态）`，**绕元素包围盒中心整体旋转**（包裹全部 parts；图片元素同语义）；默认无该字段 = 0，视觉不变。part 级 `rot` 仍为绕自身中心。
**滚动（scroll）——统一语义（v2.6补四）**：素材 `scroll` 对象 = `{speed, span, angle, repeat}`——
- `speed`（像素/秒）+ `span`（副本间距 = 相位周期）→ **平铺移动**：本体 + 间隔 span 的副本，整串沿 `angle` 方向平移；
- **只填 speed 不填 span** → 单本体沿 `angle` 往返（周期 = 元素宽 `e.w`）；
- `angle`（度，**完整定义滚动方向**：0=右，90=下（坠落），180=左，270=上；旧 `dir` 字段仅兼容：无 angle 时 left→180°、right→0°）——位移向量 `{x: off×cos(angle), y: off×sin(angle)}`，**本体位移与副本排列沿同一方向**（连成直线，无 y 轴对称）；
- `repeat: false` → **不生成副本**（单本体沿 angle 往返，span = 往返距离）；默认/无该字段 = 开；
- **相位窗口归零**：`off = wrap((t - t0) × speed, span)`，t0 = 元素**当前 show 窗口起点**——元素在**每个显示窗口的最初以配置坐标 (x,y) 出现**（相位=0），随后沿 angle 运动；无 show 元素 t0=0（从全局 t=0 起算，行为不变）。

**后处理与局部合成 FX（全局 `CFG.fx`，默认无字段 = 全关零开销）**：
- **segs 模型（v2.7补三）**：`CFG.fx.segs[scene] = [{f:[f0,f1], crt, glitch, vignette, noise, palette, hue, brightness, contrast, saturation, pixelDiv, crtOpacity, crtSpacing, noiseAlpha, noiseFrames, vignetteStrength, vignetteColor}, …]`——**每个时段段独立存全套 A+B 参数**（f 为场景内 0~1 比例，段按 f 排序覆盖 [0,1]；`vignetteColor` v2.9 起为暗角末端色 hex，默认 #000000）；渲染按 t 找当前段读配置；旧模型（顶层按项：常量/按场景数组/窗口数组）向后兼容；
- **A 档叠加层（段内字段）**：`crt`（CRT 扫描线，`crtOpacity`/`crtSpacing` 可调）、`vignette`（径向暗角，`vignetteStrength` 可调）、`noise`（**N 帧噪点轮换**，`noiseAlpha`/`noiseFrames` 可调）——纹理预生成缓存；`glitch`（确定性随机水平位移条）；
- **B 档像素滤镜（段内字段，管线：降采样 → 调色 → 色板 → 放大）**：`palette: 'pico8'|'nes'|'vga'|'gb'`（与素材减色**共用色板定义** + 通用 LUT 查表）、`hue`（色相偏移度）、`brightness`（-100~100）/`contrast`（0~3）/`saturation`（0~2）——**调色与色相级联合并单 3×3 矩阵**（每像素 9 次乘加，零额外开销）；`pixelDiv`（整数 ≥1，整帧降采样颗粒感，调色开销 ÷ div²）；
- **场景过渡（场景级，按场景独立，同一场景的分段共享）**：`transition`（**none 无过渡** / fade 暗场 / scan 扫描 / wipe 擦除 / **dissolve 溶解——旧场景帧直接溶解为新场景，不经过暗场**）+ `transitionColor`（覆盖色 hex，fade/scan/wipe 用，默认 #03060f 深蓝；白场填 #ffffff）+ `transitionDur`（秒，默认 0.25，范围 0.05~1）支持常量或**按场景数组**——替换原硬编码"每场景段开头 0.25s 暗场"；Agent 生成配置即可选用；scan/wipe/dissolve 过渡期间**旧场景活帧渲染**（时间映射 tAlt：旧场景窗口/显隐判定回到旧场景时间域，条带前旧场景仍在运动且 show 元素可见，条带后新场景）；fade 保持暗场；
- **局部合成层（`fx.layers`，按数组顺序）**：每项为 `{id?, name?, hidden?, show?, mask, bind?:{targetId,mode?:'anchor'|'clip',at?}, color?, colorOn?, alpha, blend, pixelDiv?, palette?, hue?, brightness?, contrast?, saturation?, fog?, fogColor?, fogBands?, fogScale?, fogDrift?, glow?, glowColor?, glowBands?, glowRadius?, vignette?, vignetteColor?, noise?, noiseSize?, scan?, scanSpacing?, crt?, crtSpacing?, glitch?, flicker?}`。局部 FX **固定在全局处理之前**合成；历史 `phase` 字段会被忽略。`mask` 使用与元素相同的 rect / ellipse / poly / alpha / element；它只限制**效果**的作用区，不裁掉任何场景图层；`blend` 仅可为 `normal | screen | multiply | lighter`；强度均为 0~1（`pixelDiv` ≥1、自然上限为画布短边；`fogBands` 2~18、`fogScale` 4~96、`fogDrift` -80~80、`glowBands` 2~8、`glowRadius` 0.1~1.5、`noiseSize` 1~4、`scanSpacing` / `crtSpacing` 2~16）。`colorOn:false` 时不铺底色，仅保留其他效果。`bind.targetId` 可引用具有稳定 `id` 的顶层图片或通用元素：无论 `anchor`（默认）还是 `clip`，FX 自身蒙版都相对 `at` 时刻跟随目标的 scroll、bob、spin、wave、pulse、静态旋转与缩放变换；Alpha 蒙版也适用。`clip` 进一步将最终作用范围限制为 **跟随后的 FX 蒙版 ∩ 目标实际 Alpha ∩ 目标自身 mask**，目标的镜像和 blink 同样由同一元素渲染器重绘取得。clip 只在实际绑定时复用两张画布大小的临时 Canvas，目标隐藏、不在显示时段或缺失时 FX 不绘制；**删除绑定目标时，编辑器会连带删除其绑定的局部 FX 层**。局部 `pixelDiv`、`palette`、`hue`、`brightness`、`contrast`、`saturation` 复用全局 B 档的最近邻采样、调色矩阵和色板 LUT，但只读取/写回蒙版包围盒的一张复用离屏 Canvas，最终仍受本层 `alpha` 与蒙版限制。`fog` 是低不透明度、确定性缓慢漂移的像素雾带与雾块，不使用高斯模糊；`glow` 是少量硬边同心椭圆的像素光晕，不是高斯模糊；`vignette` 为蒙版内部的局部暗角；`noise` 为确定性像素噪点（旧 `grain` 兼容读取）；`crt` 是局部扫描黑线加稀疏 RGB 荧光栅格；`glitch` 复制当前帧并以确定性水平条带错位回贴，启用时会使用一张画布大小的临时采样层。所有局部效果随后统一经过全局降采样、调色矩阵、LUT 色板、CRT / glitch / noise / vignette 与转场；数组顺序直接决定覆盖关系。Alpha 与元素蒙版都只在实际使用时复用一张画布大小的临时 Canvas；当前仍不支持羽化、通用模糊、嵌套合成组或任意自定义 fx 函数。
- **局部 FX 参数时段**：`layer.show` 仅决定效果是否可见；可选 `layer.segs[scene]=[{f:[0..1,0..1], ...效果字段覆盖}]` 决定该 Scene 内哪一段采用哪些局部 FX 参数。Runtime 取“当前 seg 覆盖 → layer 基础字段”，最终有效范围为宿主元素 `show ∩ layer.show ∩ 当前 seg`。`id/name/hidden/show/mask/bind` 属于结构字段，不进入 seg 覆盖。
- **Alpha 素材生命周期**：从素材库选中图片作为蒙版时，编辑器写入一个 `images[]` 的 `{ role:'mask', hidden:true, src:dataUrl }` 素材，并把其 `id` 写到目标 `mask.imageId`；保存时 `srcId` 被冻结/去除，只保留 data URL 与引用。该素材不会作为普通图层或新的候选蒙版显示。把 `mask.type` 改为无/其他类型、删除引用元素或删除 FX 后，若没有其他 `mask.imageId` 引用它，编辑器自动删除该 `role:'mask'` 素材。
- **固定渲染阶段**：实体图层 / 粒子 → 全部局部 FX 合成 → 全局降采样、调色矩阵、LUT 色板 → 全局 CRT / glitch / noise / vignette → 场景过渡；装配模式不渲染 fx。

**粒子系统（v2.8 工具配套，程序元素变体）**：任何顶层元素带 `particle` 字段即成为**粒子系统**——
实体 = 元素自身 `parts`（每粒按粒子参数运动绘制，part 级 anim 如 blink 仍生效）；
`x/y/w/h` 兼任**发射区**（缺省 = 全画布 → 全局雨/雪）；含 `particle` 字段的元素不再画静态本体（忽略元素级 anim/scroll）。生成规则：

```js
rain: {                          // 名字任意（①-track：元素名无意义，工具/渲染端按 particle 字段识别）
  z: 15,                         // 与元素同层按 z 排序，在 fx 后处理之前绘制（glitch/色板/降采样对粒子同样生效）
  show: [...],                   // 显示窗口同普通元素（按场景显隐）
  // x, y, w, h,                // 发射区（可选；缺省 = 全画布）——局部火星/喷泉：给个小区域
  parts: [{ type: 'line', x: 0, y: 0, x2: 0, y2: 5, stroke: '#8fb8e8', strokeWidth: 1 }], // 实体：小图元（雨=短线、雪=2×2 点、火星=2×2 圆/点）
  pixelDiv: 1,          // 可选：粒子精灵像素化除数（1=平滑；2/4=颗粒感；精灵缓存实现，成本≈0）
  particle: {
    count: 60,        // 同时粒子数上限（性能上限 600）
    rate: 60,         // 连续补给速率（个/秒）；0 = 只发 burst
    burst: false,     // true = 在每个 [S] 显示窗口段起点一次性爆发（多段窗口 → 每段进入各爆发一次；无 [S] → 每循环起点）
    life: 1.2,        // 每粒存活秒数（淡出时长跟随）
    speed: 160,       // 速度（像素/秒）
    dir: 90,          // 发射方向（度，与滚动角度同语义：0=右 90=下 180=左 270=上）
    spread: 0,        // 方向扩散锥（度；360 = 全向喷发）
    gravity: 260,     // 垂直向下加速度（像素/秒²）
    wind: 30,         // 水平加速度（像素/秒²，漂移/斜雨）
    spin: 0,          // 出生自旋（度）
    spinSpeed: 0,     // 自旋角速度（度/秒，雪花打转）
    sizeVar: 0.3,     // 每粒尺寸全幅抖动：[1-a, 1+a] 均匀随机（0=同尺寸）
    colorJitter: 0,   // 每粒颜色确定性抖动幅度（0~1）
    colorJitterDim: 'hue', // 抖动维度（其一）：hue 色相±cJ×40° / brightness 亮度±cJ×30 / saturation 饱和度±cJ×0.3 / contrast 对比度±cJ×0.2（8 档量化）
    alpha: 0.7,       // 出生透明度（1=不透明）
    fade: true,       // 寿命末端渐隐（默认开）
    seed: 0,          // 确定性随机种子（缺省按元素名哈希）；同种子同 t 渲染结果完全一致（可像素回归）
  },
},
```

- **确定性**：粒子运动为种子随机（每粒 `rnd(i, salt)`）——同 (元素, 种子, t) 渲染稳定，支持暂停/恢复一致与像素回归测试。
- **渲染成本**：粒子走**精灵缓存**——每帧每元素把 parts 渲染一次到离屏（应用 `pixelDiv`/`alphaMode`，part 级 anim 生效），粒子只 blit；精灵尺寸下限 1px（纯竖线/水平线实体不会不可见）；元素级 `anim`/`scroll` **不参与粒子**（粒子运动归粒子参数；单粒闪烁把 blink 挂在实体 part 上即可）。
- **工具内建**：粒子以独立顶层图层存在，Inspector 按实体 / 发射 / 运动 / 外观组织；运动页保留与普通元素完全相同的 `mask` 工作流。结构树“粒子化”一键从现有元素新建粒子层，原元素不改变；程序元素取 parts，纯图片取图片引用，图片 + parts 取组合实体（先图片、后 parts，**继承 pixelDiv/alphaMode/style/mask/show**）。`particle.source` 仍为 `{type:'image',imageId,...}`；组合模式额外声明 `compose:'image+parts'`，parts 坐标与源图片同属局部坐标，精灵包围盒自动容纳越界图元；
  发射区 = 元素 x/y/w/h（卡片发射区组或画布框选，缺省全画布）。
- **预设（三层解耦：运动/实体/发射区）**：内置 雨 / 雪 / 火星 / 光尘 四类——默认**仅载入运动方式（particle）**，实体 parts 与发射区保持不变；勾选 [同时载入元素] 才覆盖 parts；`window.PARTICLE_PRESETS` 可注入
  `{name, parts, particle}` 数组扩展；应用含 burst 的预设自动跳播放头到当前窗口起点（立即可见）。
- **粒子雾** = 雾粒实体 + 慢漂移 + 低透明度（如 `dust` 示例）；**溶解过渡**已交付（见下）。

**过渡样式（v2.8补二/三）**：`fx.transition` 支持 4 种——`fade`（暗场渐隐）/ `scan`（上向下扫描）/ `wipe`（左向右擦除）/ `dissolve`（**旧场景帧 → 新场景帧直接溶解**：边界处捕获上一场景最后一帧，过渡期间逐像素确定性 hash 混合——`hash >= p` 保留旧帧、否则新帧，p: 0→1 旧场景逐渐被新场景替换，**全程无黑屏帧**）；`transitionDur` 按场景数组；均为配置驱动——Agent 生成 `fx.transition = ['dissolve','fade',…]` 即可选用（无 dissolve 配置零开销，不捕获快照）。

**典型组合（示例）**：
- **两态颜色切换**（如信号灯绿/红）：两个重叠 part + 互补 blink（`green: {period:4000, duty:3/4, phase:1/4, on:1, off:0}` + `red: {period:4000, duty:1/4, phase:0, on:1, off:0}`）
- **周期点亮**（如列车车窗灯 6/7 亮）：静态暗 part + 亮 part blink（`{period:2333, duty:6/7, phase:1/7, on:1, off:0}`，on 时完全覆盖）
- **轻震 + 闪烁叠加**：`anim: { bob: {...}, blink: {...} }`

**几何实体参数化（非动画，待关键帧）**：光束类"长度随场景变化"的几何（如列车车头灯）——
元素声明 `beam`（颜色数组）+ `beamLen`（长度数组）+ `beamOrigin`/`beamSpread`（几何，相对元素原点），
渲染端通用 `drawBeam` 绘制（非动画原语，多关键帧范畴待后续关键帧系统）。

**平铺元素 → partsBand 拆解（生成/改写 Agent 规则）**：滚动平铺元素（rail/poles/fog/foreground/bridge 等）
几何单元固定、沿 x 循环平移——可拆为 parts：
- 单元几何提取为 parts（坐标相对**瓦片原点**），元素置 `partsBand:true`（speed/span 顶层或 scroll 对象）
- **几何变体约定**：单元内若含多形状循环（如 farForest 的 `i%4` 树高、clouds 的 `i&1` 双行错位、
  mountains 的 `peak` 三角），partsBand 只能表达**单一单元**——要么接受单一形状（变体丢失），
  要么改用 **images 多帧素材**（每帧一个变体，`frames`+`fps` 循环）
- 变体拆解示例：`rail`（c1 轨面 + c2 枕木 + tie）= 一个瓦片 3 parts；`fog`（a1/a2/a3 三团）= 一个瓦片 3 parts

**工具内建**：左侧栏「动画调整」面板（与「素材导入」双状态切换）——选中元素/图元后编辑
bob/spin/wave/blink/pulse 五原语参数（开关 + 数值，bob 含角度；spin 为角速度），参数进配置随保存写回；选中图元时其图层卡片对应部分高亮；
素材卡片「滚动角度」（scroll.angle）输入。

## 五、工具内建能力（Agent 无需生成）

- **场景编辑**：`scenes` 声明后，工具支持场景**增/删/改名**（点击 chip 切编辑场景 + 跳播放头）、
  时间轴**边界拖拽**（写 `sceneBorders`）、loop 调整；场景数变化时自动补齐/截断所有按场景数组
  （`sceneBorders` 除外——增删场景时按新场景数**等分重算**，边界数恒为 scenes 数-1；载入时若边界数不符则自愈删去走等分）。
- **图层栏跟随时间轴**：显示当前场景（播放头所在段）的参数值；每行小 [s] 开关切换
  「全部场景 / 单场景」编辑。
- **显示时间弹窗**：卡片头 [S] —— 逐场景显隐开关（亮=显示 / 暗=隐藏）；场景内窗口 bar 为下一阶段。
- **时间轴**：显示 show 窗口色块 + 场景段划分；点击/拖动跳转。
- **通用场景可编辑性诊断**：只对 `GENERIC_SCENE` 自动检查散键/只读数组/scenes 缺失、未注册 builtin 等问题并提示。它不评判 `HOME_SCENE` 兼容脚本的 Runtime 可运行性，也不是导出门槛。
- **图元层编辑**（v2+）：parts 元素可打开 [编辑] 面板——矢量绘制（矩形/直线/椭圆/多边形）、
  逐图元颜色/描边/坐标、四角缩放/旋转 ●/镜像按钮、`pixelDiv`（元素级重采样 1/2/1/4）、
  `alphaMode`（边缘透明像素 保留/消除/增强）。
  `parts[]` 的数组顺序为**底 → 顶**（后项后绘制）；编辑器以**顶 → 底**显示，通过插入线拖拽调序。普通图层也以顶→底显示，编辑器重排其 `z`，无需新增格式字段。图片加 parts 时，parts 始终使用图片元素的局部坐标；任意角缩放或元素镜像会同步保持图片与 parts 的相对布局。

## 六、通用场景可编辑性诊断 ↔ 本规范对照

这份表只服务于新建 `GENERIC_SCENE` 的“能否被本编辑器完整理解和继续编辑”。它与另外两类判断分离：

- **Runtime 兼容性**：`HomeScene` 是否有对应的绘制实现；兼容项目脚本可由专用绘制函数运行。
- **导出可行性**：固定时间 Runtime 能否画出帧、图片链接是否可访问；可运行但锁定/不可编辑的元素仍可导出。

| 自检提示 | 对应条款 |
|---|---|
| 「key.xxx」疑似按场景散键 | 四.2 |
| 「key.xxx」为数值数组（仅展示） | 三（结构数组只读）+ 四.1 |
| 使用了 show:{scenes} 但未声明 scenes | 四.3 |
| 「key.mask.type」不是 rect / ellipse / poly，或 mask 几何无效 | 四.5 |
