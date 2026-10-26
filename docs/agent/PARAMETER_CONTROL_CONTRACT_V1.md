# 共用参数控件合同 v1

> 2026-10-26后续：[持续图层模式](../architecture/V4_CONTINUOUS_LAYER_PARTICLES_2026-10-26.md)新增发射方式、粒子形状、来源取样、来源刷新率和显示原对象，均No并渐进显示。持续模式恢复数量／发射范围；固定时刻显示取样时刻，否则显示来源刷新率。原图默认保留，取代首轮自动隐藏。继续复用既有运动／外观和统一蒙版组件。

> 2026-10-26：[图层切片接入](../architecture/V4_LAYER_PARTICLES_INTEGRATION_2026-10-26.md)新增实体方式sprite／layer、切片尺寸默认32及开始时间默认0，全No。layer隐藏普通数量／发射范围与序列播放控件，保留共用运动／外观和显示蒙版；读取开始段的批次参数，不把后段值重写到既有切片。覆盖下方“尚无正式字段”的历史说明。

> 2026-10-25后续：路径模块更名“路径截取”；`strokeTrimStart`为“截取起点”，`strokeCompletion`为“截取终点”，0～100，均Linear，复用所属对象轨。封闭图形`pathStart`仍是独立的“起点位置”(0～1)。开放路径终点小于起点为空，封闭路径跨原点截取，相等为空；关闭路径截取不删除存储值。普通粒子改为归一化权重分配，非空稀疏范围不再降低数量。图层切片仅为独立实验，不能生成不存在的正式Inspector字段。见[本批](../architecture/V4_WEIGHTED_PARTICLES_LAYER_PROBE_2026-10-25.md)。

> 蒙版U4：粒子发射／显示范围已接相同MaskState、来源／提取／跟随、图形编辑与临时预览；范围字段仍全No。UI“运动范围”改为“显示范围”，持久字段仍motionRange。粒子初始范围以本地坐标＋followMatrix=I进入统一变换链，解除跟随保持当前位置。数量／寿命Step切段保留旧批次，不瞬间重建。见[输入变化与前端同步](../architecture/V4_PARTICLE_MASK_U4_2026-10-25.md)。下方早期限制为历史状态。

> 蒙版第三批：共用预览按钮是View操作，不是工程参数，不分配No／Step／Linear时钟；目标由scope／ownerId／effectId确定。应复用View预览订阅和正式Runtime求值，保留pressed、返回与Esc行为，见[预览交接](../architecture/V4_MASK_PREVIEW_U3_2026-10-25.md)。后续粒子预览仍未开放。

> 蒙版第二批：对象／场景使用四类来源分组和多图形共用表单；新增子项选择／类型／增删复制／范围均No，shapeId只作稳定编辑身份，不建独立轨。新版Inspector应复用MaskState及renderMaskFields适配器，见[前端交接](../architecture/V4_MASK_SHAPES_U1_U3_2026-10-25.md)。下方首批未完成范围为当时状态。

> 蒙版以[统一蒙版合同](../architecture/V4_UNIFIED_MASK_CONTRACT.md)和[U0–U6计划](../architecture/V4_UNIFIED_MASK_EXECUTION_PLAN.md)为目标；[No／完整来源首批](../architecture/V4_MASK_SOURCE_U1_U2_2026-10-25.md)已实现。用户确认蒙版相关参数默认No，不新增时序按钮；来源对象自身动态／时序仍生效。多图形、预览及粒子新模型待后续，不能称全量统一完成。

> 第十批（2026-10-25）：逐帧往返改为端点起相，修复两帧均匀／柔和静止；提取共享[循环运动合同](MOTION_CONTRACT_V1.md)。阈值、染色、网点和双色放射接共享原语及节奏／逐帧控件，颗粒刷新接共享帧号；其余专用动态尚未全量迁入。下方第九批是当时状态。

更新：2026-10-25。状态：第九批补齐6种基础动态的32个参数绑定，以及17个内建组件字段和已加载Module的声明参数；第八批57字段中的20项No边界继续保留。此前注册效果152字段＋采样控制器2字段中，152个可编辑字段接通，另有2内部字段；17种效果动态模式的80个字段绑定接通。不是全部 Inspector 重写完成，也不是蒙版改版或 GPU 接线验收。

## 分层与唯一来源

1. Runtime 定义稳定参数 ID、类型、默认值及 No／Step／Linear 能力。名称修订不改变 ID。
2. `editor/v4-parameter-controls.js` 编译控件绑定、渐进条件和显示／输入转换，不读取场景、不写历史、不做绘制。
3. 正式 Inspector 和审阅页使用相同规划器，但保留各自排版和状态适配器。正式编辑器负责工程事务、撤销和所属对象轨；审阅页负责试验轨与修订快照，不能直接替工程写入。
4. GPU／CPU 消费 Runtime 已求值数据，不依赖 DOM、控件位置或另建一套动态求值。

当前接入受控附着图样、原有限模板时序、所有已注册效果参数（含纹理内部编辑）、效果动态子面板、采样控制器，以及第八／九批原生成样、基础循环动态和程序构件暴露参数。文字样式／资源操作、粒子／蒙版仍须单独适配；不得称为全 Inspector 统一完成。

## 已实现 API

- `compile({parameters, controls})`：复制、冻结声明；验证唯一 ID、完整且不重复的控件覆盖、渐进开关／循环及 Runtime 时序能力。
- `plan(model, values, {exclude})`：按当前值生成可见绑定。载体参数可在正式图样编辑中隐藏，预览中保留，不从定义中删除。
- `configure(input, param, value)`／`read(input, param)`／`display(param, value)`：共用基本输入语义。拒绝空值、非法数值和小数整数参数。
- 当前组件为 `field` 与 `color-alpha`，基本类型 number／color／boolean／select。未知类型明确拒绝，不能静默变成数字输入。
- `color-alpha` 包含两个稳定 ID，但只产生一个绑定；Alpha 数据为0–1，用户侧为0–100。颜色与透明度可保留各自的时序能力及修订备注。

双色放射审阅候选直接引用已登记 Runtime 定义，不再维护第二份参数列表。控件标签、默认值、选项和渐进条件均由该定义派生。

## 颜色组件与时序的边界

两处调用相同 `EditorClassicV4ColorControl` 适配器，优先进入`EditorV4ColorPopover`。完整弹层实现及样式已从主HTML移出，位于`editor/v4-color-popover.js`和`.css`；主HTML的`colorField`仅保留兼容转接，不保留实现快照。静态审阅页及宿主生成的下一版审阅页均引用同一文件。原生输入只作为未加载模块的旧宿主降级，不是当前审阅入口。

`EditorV4ColorPopover.forDocument(document)`返回文档独立的实例：

- `field(color, alpha, change, label, options)`创建纯色或可选渐变控件，`options.paintEnabled/paint/ramp/alpha`沿用原调用含义。普通颜色参数不会因为换控件而获得未声明的渐变能力。
- `change(color, alpha, final)`持续预览及提交；渐变启用时为`change(color, alpha, paint, final)`。原`change.finish`用于关闭／切换后的事务收尾。组件不读工程、不直接写历史。
- `close()`提交收尾；`close('cancel')`与Escape恢复打开时快照，通过宿主回调写回并收尾。可用`options.cancel`接管恢复；不把取消伪装为在组件内部撤销工程历史。
- 控件`setPaint`更新外部求值结果；`setEditable({color,alpha})`分别控制颜色与透明度是否可写。对应两项参数的ID和时序能力仍独立，不能整组统一武断开启或关闭。
- `dispose()`收尾、移除弹层及监听并释放文档实例。异步屏幕取色结果只允许回写发起时仍有效的绑定，不能污染后来打开的另一颜色。
- 弹层打开后保持定位，不从Inspector重绘后已脱离文档的按钮读取零坐标。

审阅页允许分别试验颜色与Alpha的目标值，三段试验仍用现有 Runtime parameterTiming。正式附着图样在第三批加入相同状态组件的逐参数入口，同时保留顶部批量时序入口和所属对象轨，不建立独立图样轨。基础变换、所有专用效果和蒙版没有在本批批量套用新时钟。

共用`EditorV4ParameterControls.timingState/timingButton`已用于审阅时钟和正式编辑器原有模板参数时钟：统一No／Step／Linear门控、只读、激活和无障碍状态，读写由宿主回调提供。此接线不是向全部正式参数增加时钟，也未更改原对象轨与试验轨的意义。共享组件不含任何主编辑器或审阅页专属的段落写入逻辑。

### 第三批：受控附着图样逐参数入口

- 使用`timingTarget`统一判断本参数是修改基础值，还是写当前对象轨段。当前段存在本参数值或已点亮本参数时钟时写段；其他参数有覆层不能隐式启用本参数。顶部明确开启的批量时序仍可将下一次修改写入当前段。
- 点亮尚无覆层的时钟只是待写入，不创建空的工程值或撤销记录；多个参数可同时待写入。已存在值时再点击，只删除当前参数的键，不清空其他参数、不合并或删除切分、不改显示时段。
- No不提供时序按钮；Step不进入Linear插值；过渡段只读，提示到两侧设置目标。沿用Runtime现有插值和对象轨，不另写动态公式。
- 颜色与Alpha各有自己的键和按钮，但仍共用一个取色弹层。颜色回调只写真实改变的通道，不能将当前时段的Alpha顺带复制到基础参数。
- 正式路径使用稳定图元ID及图样ID编码，例如`partsById.part%2Ea.extensionsById.proposal%2Edual-ray.params.angle`；两个图样同名参数互不影响。
- 待写入状态仅为Inspector UI状态，按项目作用域、对象、段索引和参数路径区分；项目替换／撤销重开、选中目标变化时清理，不序列化进工程。
- 修复“值已写入但动态开关／参数仍显示旧值”：Inspector按Workspace revision建立求值视图，为可变工程轨提供新的浅层轨对象身份；同一版本继续复用，不逐帧序列化工程或复制素材。Runtime的不可变Player缓存和绘制算法不变。验收同时检查真实输入值、开关状态和Runtime结果，不能只断言JSON写入成功。
- 原有限模板入口保留其原轨道规则，本批只统一其按钮和多参数待写入状态，未扩大为任意类型图样时序。

验证入口：`tests/browser/v4-path-generator-parameter-timing.mjs`，覆盖真实输入、逐通道时序、删除单项、Ctrl+Z、两个图样隔离、动态开关Step、只读过渡、Runtime求值和保存重开；`v4-path-generator`继续验证顶部入口兼容、真实图样绘制与排序。

### 第四批：常规效果参数

明确迁入：投影、描边、染色叠加、内光效、外光效、颗粒叠加、杂色抖动、阈值分色、边缘色散和蒙版内缘光／暗角的普通参数。名称沿Registry，ID依次为`projection/outline/tint-overlay/inner-light/outer-light/grain-overlay/noise-dither/threshold/edge-dispersion/masked-inner-light`。

- `editor/classic-v4-effect-parameter-timing.js`仅负责本批接入白名单、Registry时序能力归一化和基础／当前段写入规划。未在本文件复制效果参数表或Runtime算法。
- 参数未单独声明timing时继承效果声明，例如阈值和边缘色散为Step。颜色Alpha仍在同一弹层，`alphaKey:strength`同样保留独立键，不把它改成另一个强度输入。
- 正式控制器提供当前工程／效果轨／段以及待写入状态；时钟复用共用按钮。UI状态按项目作用域、轨道、段和参数ID隔离，替换工程、选中目标变化和停止控制器时清理。
- 单参数模式：已存在本参数覆层或明确点亮本参数时钟时写当前效果段，否则修改基础值；其他参数有覆层不触发本参数。清除只删本键，不删除切点或同段其他参数。
- 顶部整段模式继续兼容：明确由顶部开启后，同一效果段内连续修改仍写当前段；点击任一单参数时钟、切换焦点／对象或离开该段后不借此污染其他轨。顶部原有清除整段行为不改。
- 效果卡启用开关保持全局，和左侧效果卡同步；它不是参数时钟，不会被`partition`当成普通可定时参数。
- 过渡段参数只读，颜色和Alpha按自身能力分别控制；不在Linear中直接写目标。Step和Linear仍按原效果轨及`linearKeys`求值。
- 颜色回调只提交实际改变的通道，避免在时段Alpha为40%时，仅改基础颜色却把基础Alpha一并改为40%。
- `data-effect-parameter`、`data-effect-parameter-clock`和`data-effect-track`是前端同步的稳定入口；不要用中文标签定位后再重复实现时序路由。

明确未迁入：纹理／自定义tile、色板提取、ASCII字体与字形图集、CRT主题、不均采样专用编辑器、采样格控制器、基础变换及蒙版字段。既有效果的渐进动态专用编辑器也未被本批统一为逐参数时钟。它们保留原入口，后续逐项接入，不能自动给所有输入框添加时钟。

测试入口：`tests/v4-effect-parameter-timing-contract.mjs`及`tests/browser/v4-effect-parameter-timing.mjs`，已加入`verify-v4`。浏览器覆盖真实Canvas像素变化、颜色／Alpha独立、单项清除、Ctrl+Z、不同对象及场景隔离、Step、只读Linear、顶部连续颜色编辑、全局开关及保存重开。浮点分段边界的颜色插值允许单通道1字节舍入差，不用浮点中点的理想Hex精确相等代替画质判断。

### 第五批：时序入口呈现（2026-10-24）

意图：沿用现有设计语言整理共用控件，不改Runtime、数据格式或插值算法。普通参数行右端预留24px入口；未设置时平时隐藏，整行hover、键盘focus-within和触屏时显示，不造成输入框位移。

- `editor/v4-parameter-controls.css`为唯一基础样式，由两处均已引用的`v4-color-popover.css`导入。不能只引用JS而漏掉样式，或再次用宿主通用small按钮替代状态呈现。
- 共用状态：`off/armed/set/partial/elsewhere`。待写入为空心强调，已有值为实色强调，组合部分激活用半填充；其他段有值而当前无值也保留低强调标记。不支持时序的参数不提供入口。
- 第五批曾按当前轨段显示阶梯／斜线；用户反馈后由第六批修正：图标现在表达Registry参数能力。激活状态与当前轨段类型不再共用一个含义，不新增持续转动图标。
- `placeTiming(control,button)`负责参数行落位和颜色聚合。颜色行只提供一个组合入口：未全激活时补充激活剩余通道，全激活时清除两通道；弹层内仍可单独控制。一次组合清除只产生一条撤销记录。弹层中的独立按钮使用相同状态实现，不引入另一套时序求值。
- 取色控件新增`setTiming(clocks)`，在原完整弹层内显示颜色／透明度的独立入口。关闭弹层会归还原按钮；弹层按钮重新读取宿主当前状态，不能捕获打开前的旧has/armed值。取色器可以为“启用时序”而打开，即使审阅目标段两个通道尚未armed；只读过渡段仍不可编辑。
- 主编辑器的受控附着图样、已接入的十项常规效果及审阅工作台同步采用以上规则。尚未迁入的基础变换、蒙版及专用效果不冒充已统一。
- 稳定外观标记：`data-timing-state`、`data-timing-kind`、`data-color-timing`；保留原参数ID及轨道标记。颜色／透明度的单项按钮现在位于取色弹层，不再是Inspector行内两个按钮。

定向验收：共用参数状态合同，常规效果与图样的真实浏览器时序测试、共享取色器测试；覆盖显隐与布局稳定、组合激活和部分激活、跨段标记、独立通道、一次组合撤销、保存重开与只读过渡。实际截图位于`tests/artifacts/effect-parameter-timing/`。只做局部自检，未独立视觉评审，未运行全量或Tauri验收。

审阅页视觉取证位于`tests/artifacts/timing-presentation-review/page.png`，已实际查看。截图工具报favicon 404及其临时目录清理EPERM，因此不把工具整体退出码称为通过；页面主要依赖正常、定向浏览器功能验收另行通过，没有为消除取证工具警告修改宿主服务。

### 第六批：Registry全量效果接线与覆盖审计（2026-10-24）

修正依据：用户要区分的是“此参数支持Step还是Linear”，不是当前光标位于何种轨段。`timingState.kind`现在只依据归一化参数能力；Linear参数在普通段仍画连续线，Step参数在过渡段仍画阶梯线。激活状态继续由`off/armed/set/partial/elsewhere`表达；过渡段只读仍由宿主决定，Runtime插值不变。

- `classic-v4-effect-parameter-timing.js`移除十项效果ID白名单。所有已声明效果按参数类型、稳定路径、继承后的timing和控件适配器分类。新增效果无需再修改白名单；新增未知字段类型则立即报错，不默认为数字输入。
- 不均采样、偏移采样、网点映射、成样调色、ASCII和CRT的普通字段接入相同入口；纹理外层颜色／Alpha／混合方式同样接入，采样格的两个参数接独立controller轨。
- 字体／字符仍先准备字形图集；准备成功后主参数与glyphAtlas原子写入同一目标，支持对象及场景，不硬编码到场景采样桶。自动取色及extracted由触发的颜色数／色板／模式决定目标，不受无关参数覆层污染。CRT主题及主题参数跟随theme原子写入，不能出现主题在时段、实际参数却修改全局。
- 线性字段清单也来自相同能力归一化，避免对象形式的timing声明或效果级继承被遗漏。

#### 可重复审计

`node tools/scripts/audit-v4-parameter-controls.mjs --json`只读取当前定义并输出完整清单；不保存另一份手工参数表。`--summary`输出精简统计。已纳入统一verify-v4入口。

| 范围 | 数量／状态 |
| --- | --- |
| 注册效果参数 | 152字段，全部有明确归属 |
| 采样控制器 | 2字段，独立轨道接通 |
| 已接通的可编辑字段 | 129字段；含专用字体／字符／渐变适配入口 |
| 纹理内部编辑待接逐字段时序 | 23字段，详见下列路径及审计JSON |
| 自动提取结果 | extracted，派生内部字段，不单独展示开关 |
| 采样场启用字段 | field.enabled，现行产品语义下固定启用，不单独展示 |

纹理待适配路径：`texture/spacing/size/shape/layout/rowPhase/phaseX/phaseY/angle/layer2Angle/layer2Width/layer2Spacing/layer3Angle/layer3Width/layer3Spacing/noiseDensity/noiseSize/noiseSeed/tileWidth/tileHeight/tileScale/tileScaleMode/tilePixels`。它们仍通过图样编辑器的结构化recipe和codec批量写回，不允许直接加图标就宣称逐字段完成。下一批需为codec的转换、联动尺寸和tile重排定义原子写入组，再给其内部字段提供共用入口。

效果的`motion.enabled/type`及各motion参数也在审计`pending`中逐项列出（按效果、运动模式和路径），现行动态子编辑器保留，尚未接逐字段入口。基础变换、图元固有属性、粒子和蒙版不在152效果字段统计中，不能用这个统计替代全Inspector覆盖率。

#### 本批验证

- 参数合同：全注册表覆盖、继承能力、合成新效果无需白名单、未知类型拒绝、色板和主题的原子路由。
- 浏览器`v4-effect-parameter-coverage`：40种作用域／模式／渐进状态，238个可见参数入口；实际编辑新增Step参数、ASCII字符＋字形图集、颜色数＋提取色板、CRT主题联动，以及controller独立轨。
- 回归`v4-effect-parameter-timing`、`v4-path-generator-parameter-timing`、`v4-shared-color-popover`及`v4-object-effect-flow`。只运行定向验证，不声称全量verify或Tauri通过。
- 图标对照截图：`tests/artifacts/effect-parameter-coverage/capability-icons.png`；已实际查看。没有重新设计面板，也没有修改CPU／GPU绘制算法。

### 第七批：纹理编辑与效果动态子面板（2026-10-24）

本节覆盖并取代第六批的“23纹理字段及动态子面板待适配”状态；第六批保留为历史实施记录。

#### 纹理编辑适配

- `classic-v4-pattern-field.js`仍是填充和叠加共用的图样编辑器；新增可选领域适配回调`parameterTiming(input,key)`、`readOnly(key)`、`captureContext()/sameContext(stamp)`。没有提供这些回调的成样填充调用方保持原行为，不能据此宣称填充自身已新增时序。
- 所有23个纹理内部字段提供稳定键，不使用中文标签猜测路径。控件通过`data-pattern-parameter`识别，并复用右端时序入口；未登记的字段在接线时明确报错。
- `write(label,pattern,{key,before})`第三个参数描述本次发起字段及操作前recipe；旧调用方可忽略第三参。codec的`editPatch`只比较操作前后并写入变化项，不再把整个纹理快照全部塞入当前段。
- 线宽增大造成格距联动、纹理类型转换、预设／旋转／导入等操作，由发起参数决定同批变化的写入目标；仍保留一次操作一次撤销。不相关的起始偏移等参数不会因其他字段已有时序而自动写入时段。
- `tileWidth/tileHeight/tilePixels`为最小结构组：宽高重排和像素数组必须一起写入、一起呈现激活状态、一起清除。点击组内任意一个时序入口管理同一组，防止单独清除宽度后留下错位像素数组。普通字段继续单键清除。
- tile绘制在本地拖动时预览，指针结束后提交一次；差量比较只在编辑操作时执行，不进入逐帧Runtime。过渡段参数与canvas均只读，预设／旋转／镜像同样受保护。
- PNG读取捕获工程revision与时间，且检查原面板仍在；解码迟到、工程改变或时段改变后不回写到新上下文。

#### 动态子面板适配

- `motion.enabled/type`及各模式参数从既有Registry的`motions`派生稳定路径，由同一参数政策处理，全部Step，不复制另一份参数列表或新增Runtime求值器。
- 模式切换会携带该模式全部默认参数，即使某个数值和前一模式恰好相同，也不能遗漏目标时段的独立值。开关和类型变更仍是单次历史操作。
- 单独修改动态参数只修改该字段，不再隐式将动态启用，也不把当前时段的启用状态拷回全局。需要启用时应操作动态开关；模式切换的参数初始化保留原语义。
- 子面板开关、参数及标题状态读取当前时序求值，而不是仅查看基础motion。效果卡总启用仍为全局；动态启用是效果内的参数，两者不混用。
- 同一对象不同效果、对象与场景之间保持轨道隔离；只读过渡、顶部整段模式、撤销、序列化与重开沿用现有合同。

#### 审计和验收

- 审计范围内154个效果／controller字段：152个可编辑字段接通，`extracted`和固定的`field.enabled`为内部字段。
- 17种效果动态模式，共80个模式字段绑定；单一模式的type由系统管理，多模式时提供选择入口。此计数是模式绑定数，不冒充80个互不重复的参数。
- `audit-v4-parameter-controls.mjs`输出普通字段及`motionFields`，本范围`pending`为空；基础变换、图元固有属性、粒子、蒙版不在该统计中。
- 新浏览器夹具`tests/browser/v4-texture-motion-parameter-timing.mjs`已加入verify-v4，检查23个实际纹理字段入口、17种模式、结构组写入／清除、差量隔离、动态开关和模式Step、真实Runtime像素变化、撤销、两类保存重开、过渡只读及迟到PNG隔离。
- 回归全效果参数覆盖（40种作用域／渐进状态、238个普通参数入口）、普通效果时序和对象效果流程；静态合同覆盖codec差量／结构组、虚拟motion声明及未知字段拒绝。未运行全量verify-v4或Tauri验收。
- 实际查看的截图：`tests/artifacts/texture-motion-timing/tile-timing.png`和`motion-timing.png`。本轮未重新设计面板，未修改CPU／GPU绘制算法。

## 蒙版后续更新

蒙版属于结构化领域值，不应把矩形／椭圆／Alpha图片等当前字段硬编码进通用数字／颜色控件。后续增加亮度遮罩、绘制或新的引用方式，需要更新的是统一蒙版组件、数据求值和资源引用链，而非每项效果的参数渲染代码。

预留设计边界（本批未实现新 mask 组件）：

- 蒙版适配器负责参数规划、写回、画布编辑状态和类型特有的渐进字段。
- Runtime mask resolver 负责 Alpha／亮度含义、坐标空间、跟随和反相；不由 Inspector 推导遮罩像素。
- 资源依赖收集／ID重映射与求值共用统一蒙版数据入口，不能每个效果自行遍历当前字段。
- 新的来源、坐标或通道含义变更必须先定义版本／迁移或明确拒绝规则，不能只换 UI 标签。
- 不承诺“蒙版怎么改都不影响合同”：新增复合控件可扩展控件协议；更改蒙版数据语义会影响 Runtime、持久化和 GPU 支持条件，必须各自验收。仅重排参数或增加已有语义的操作入口，不应改变基础参数合同。

## 四层落点与测试

| 层 | 本批落点 |
| --- | --- |
| 定义 | 已登记生成器 parameters／controls；候选直接引用 |
| Inspector | 共用规划器，颜色Alpha合并绑定，正式面板保留原时序和事务入口 |
| Runtime | 不修改绘制与插值算法；继续使用正式 attached 图样及 parameterTiming |
| 测试 | 参数合同、审阅渐进显示、颜色Alpha与三段试验、正式创建／附着／调序／撤销、宿主动态预览依赖 |

新增效果需登记以上四处，并说明控制器如何预览、提交、取消与结束事务；不能只提供一个能绘制的预览页面。

本批针对性验收通过：`v4-parameter-controls-contract`、既有效果参数规划合同、附着图样合同、审阅状态合同；浏览器的`v4-pattern-proposal-timing`（包含Alpha中段百分比／渐进开关）、`v4-path-generator`、`v4-effect-review`、`v4-effect-review-auto-delivery`以及宿主回传合同。回传中的Agent仍为受控测试替身，没有调用真实模型；未运行全量verify-v4或Tauri验收。

### 前端会话同步

新增依赖`editor/v4-parameter-controls.js`须在图样拓展控件和审阅工作台之前加载；`v4-color-popover.js/.css`须在使用完整颜色控件前加载。正式HTML、静态预览和宿主生成预览已接入。`candidate.parameters`／`controls`直接引用正式定义。原`generator|ID|parameter`写入键、`$paint`颜色批量写入、所属对象轨和事务入口不变。未来改版应保留这些数据适配器，只替换控件呈现；不要复制参数表或把审阅试验轨直接搬入工程。

## 后续顺序

1. 已完成：完整颜色弹层及生命周期提取，两处引用同一实现。新增`v4-shared-color-popover`浏览器夹具覆盖实时预览、确认／取消、颜色／Alpha独立时序、正式渐变与撤销、定位和文档释放。
2. 已完成时序按钮基础组件、原有模板、受控附着图样、注册效果参数（含纹理内部）、效果动态子面板、采样控制器和第八／九批原生成样、基础循环动态、程序构件暴露参数。后续分别适配粒子及蒙版；文字资源操作不默认增加时序。不得绕过写入规则直接添加按钮。
3. 通过全新图样复测生成→审阅→发布→正式编辑器，不仅复用双色放射自测。
4. GPU能力合同由GPU会话维护；本模块只声明参数与控件，不写后端策略或更改默认CPU。

## 第八批：原生成样参数

唯一字段策略位于`editor/classic-v4-formation-parameters.js`，Inspector负责当前对象轨、历史及求值视图，路径样式组件只提供可选绑定回调。57项声明包含20项明确的No边界；No也纳入审计，但不显示时序按钮，不算新增时序能力。

- 对象／组：XYWH、宽高比例、旋转、透明度沿既有Linear；混合模式为Step。斜切保持No及一位小数，不扩展原能力。像素位置输入继续取整，透明度与比例仍按百分数显示，不改底层数值单位。
- 图元：沿用所属对象轨，不新增独立轨。局部几何变换、圆角和端点样式保持No；已有路径完成度／起点继续使用现有Linear，平滑度、过程开关、方向、虚线、路径波形等沿既有Step。路径起点的Linear来自当前实现，并非本批新加。
- 路径参数使用稳定编码ID，如`partsById.p%2Ea.strokeCompletion`，不是数组下标；改名或调序不改变绑定。正多边形改自由多边形时，模式和生成的点作为结构组一起写入／清除。
- 文字完成度沿既有Linear；光标开关、样式、周期和颜色为Step。文字内容、字体、排版和素材处理不因此获得新时序能力。
- 单字段有值或明确待写入时才写当前段；无关字段已有覆层不会连带开启时序。明确顶部整段模式仍保留。清除只删本字段／声明的结构组，保留其他参数和切点，支持撤销；Linear过渡只读。No字段即使在整段模式下也只改基础值。
- Runtime绘制／插值、GPU后端不修改；继续消费正式Frame。基础bob／scroll／spin等旧动态子面板、builtin／Module参数适配、粒子和蒙版不计入本批完成。

验证：`tests/v4-formation-parameter-contract.mjs`及真实浏览器`tests/browser/v4-formation-parameter-timing.mjs`覆盖对象／组独立写入、显示单位、No边界、稳定图元ID、文字／光标、过渡只读、撤销、保存重开及真实像素变化。既有效果时序、纹理／动态时序、文字显现、路径端点定向回归通过。像素夹具曾因白色描线叠白色背景误判，改用对比色重测；未为该误判修改Runtime。未运行全量verify-v4或Tauri验收。

## 第九批：基础循环动态与程序构件（2026-10-25）

### 参数与控件

- 基础动态参数定义集中在`classic-v4-formation-parameters.js`的`motions`，6种动态共32个参数绑定；对象和图元共用定义与字段渲染，不再各自维护长单行表单。所有动态配置为Step，不对周期／速度做Linear，运动本身仍按时间连续求值。
- “运动方式”简化为“运动节奏”：均匀／柔和／加速／减速。摆动wave接入同一往返函数；持续旋转spin及重复滚动scroll使用单向周期进度。往返两程端点连续，切换标准节奏都以静态位置为零相位；不再有旧半周期公式跳变。
- “逐帧”默认关闭。打开后显示整数“周期帧数”（默认8，最小1），量化运动时间而非提高播放器帧率。漂浮／比例／摆动／闪烁用周期时间；旋转以一圈为周期；重复滚动以循环距离／速度绝对值为周期。非重复滚动隐藏节奏和逐帧；零速度不执行逐帧。每个运动自身周期闭合不等于任意场景长度都自动无缝。
- 单参数时钟复用No／Step／Linear门控、右端样式、待写入、清除和只读规则；明确的动态整段入口继续支持批量写入。动态开关仍用原`anim.ID`对象／null结构；替换该结构时原子移除同段旧子字段，防止关闭后被子字段复活。清除开关覆层与设置关闭不同，不改显示时段或场景切点。
- 图元动态以`partsById.编码ID.anim.*`绑定所属对象轨；显示时通过求值后的parts数组按ID读取，不用数组序号，也不新增图元独立轨。
- 内建组件17个参数及Module公开参数从各自定义／Manifest读取，不复制为另一份参数表。`none/step/linear-safe`归一为No／Step／Linear；未声明timing默认No。保留internal和appliesTo筛选、原参数范围与归一化。颜色仍走共用取色弹层；No仅改基础值，Linear过渡只读。

### Runtime与交付

- `30-frame-state.js`提供共用节奏、逐帧时间及单向周期进度，`60-content-renderer.js`的图元复用；不新增像素遍历、画布缓存或GPU后端。
- `21-parameter-timing.js`按内建定义／项目作用域Module声明过滤参数轨，确保No不被手写轨绕过，Step不被Linear插值。策略按不可变轨和定义身份缓存，不逐帧序列化Manifest；编辑器沿既有revision浅层轨身份失效。
- 分发`home-scene-vnext.js`和导出内联镜像均重新构建；正式预览和导出使用同一算法。未接入新GPU能力，未做性能基准或Tauri验收。
- 四层落点：定义（动态schema与构件Manifest）→ Inspector（共用字段／轨道适配）→ Runtime（共享节奏及构件时序门控）→ 测试（合同、浏览器与资源实例）。新增字段不能只加控件而漏掉后三层。

验证：新增`v4-basic-motion-program-contract`和浏览器`v4-basic-motion-program-timing`；覆盖连续交界、对象／图元一致、逐帧保持／更新、负向运动、独立写入、开关停用、内建／Module能力、稳定ID、撤销／保存重开、过渡只读和真实Runtime像素。既有Runtime smoke、参数时序合同、成样逐参数、动态时间轴、Module资源实例回归通过。新夹具在重开时需按新项目作用域重新登记受控模块；不能通过复用全局注册绕过工程隔离。
