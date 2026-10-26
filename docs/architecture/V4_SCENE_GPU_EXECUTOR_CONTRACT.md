# V4 场景 GPU 执行器接线合同

2026-10-25 第14批：对象显式试点已扩大为杂色／阈值／边缘色散的限定整链，来源上传一次、GPU内部保留中间表面，再输出Canvas；这不改变本场景后处理合同或默认后端。当前对象范围以 [对象合同](V4_GPU_OBJECT_PILOT_CONTRACT_2026-10-25.md) 和 [第14批验收](V4_GPU_INFRA_BATCH14_2026-10-25.md) 为准，下方第13批为此前范围记录。

2026-10-25 对象范围补充：正式编辑器新增独立的显式“对象阈值试点”，复用本文执行器内核，但不代表场景 GPU 请求自动加速对象。仅单一阈值、有效采样格1及有界像素预算准入；第13批允许CPU投影／描边前处理，其他加样／非零调色仍回退。默认CPU、导出与Tauri策略不变。实际范围、生命周期与回退见 [对象试点合同](V4_GPU_OBJECT_PILOT_CONTRACT_2026-10-25.md)，最新验收见 [第13批](V4_GPU_INFRA_BATCH13_2026-10-25.md)。

状态：2026-10-15 已接独立采样格、场景染色（部分混合方式）、杂色、阈值、不均采样和边缘色散，透明链使用统一预乘字节。默认编辑器／导出仍使用CPU场景管线，既有CRT／ASCII自有GPU路径维持原行为。本文约束新的共享场景执行器。

2026-10-24 补充：正式编辑器已接**显式** CPU／实验GPU选择，默认仍CPU，导出策略未变。第5批使用整数坐标避免浮点选格误差；第7批再用本机原生 Canvas 数字编号条校准共享缩小／放大的选格差异，本机格3正式编辑器24组与格4快速回归8组对照均无差异。**不能据此宣称跨设备、任意尺寸或发生backing变化后仍保证等画质。** 源／工作维度超过32768仍整链回退。见 [第7批记录](V4_GPU_INFRA_BATCH7_2026-10-24.md)。

坐标表属于宿主后端初始化数据，不属于作品。它与Executor上下文和全尺寸／工作尺寸绑定，不全局缓存；校准仅读取不透明数字条，不读取作品。存在选格例外时增加一张R32UI四行表（16×最大轴尺寸字节）；否则保留整数Shader。上传、显式字节与准备耗时分别计入`uploads`、`nearestCalibrationBytes`／`textureBytes`、`nearestCalibration.prepareMs`。初始化失败提供明确原因并整链CPU回退。当前校准匹配surface-pool默认2D上下文；若后续改变Canvas类型、上下文属性或复用策略，必须同步重验，不可独立修改这一前提。

## 入口与责任

```js
const player = ToSampoolRuntimeVNext.createRuntime(scene);
player.renderTo(canvas, time, {
  sceneBackend: 'gpu-experimental',
  sceneGpuTransitions: true, // optional experiment; omitted keeps Canvas transition
  sceneSourceVersion: revision
});
player.dispose();
```

`sceneBackend` 是绘制选项，不能写入项目 JSON。未指定时走既有场景 CPU 路径。GPU 执行器在 `runtime-src/vnext/69a-scene-gpu-executor.js`，真实接线在 `80-scene-renderer.js`；对象、文字、图元、程序构件、粒子及其效果仍先由原 Canvas2D 对象管线合成。

`sceneSourceVersion` 可省略。提供时，调用方承诺所有可能改变来源画面的修改都会推进版本，包括对象／图元／组、背景、素材内容与解析完成、字体、程序参数、蒙版引用和撤销／重做。相同版本、相同时刻、尺寸与已求值效果配置才允许复用执行器的最后输出。版本缺失时每次上传来源；禁止仅凭播放头未动判定画面未变。此缓存只避免 GPU 重新上传／处理，源对象的 Canvas2D 绘制仍会发生；它不是编辑器完整帧缓存。

## 当前能力范围

执行器在分配／上传前读取 `frame.effectValuesFor` 与 `controllerValuesFor`，预检当前时段的完整场景效果链。场景实际顺序维持 **overlay → sample**；不借用之前隔离夹具的 sample → overlay 顺序。

当前白名单：独立采样格（边缘透明度为保留）、场景杂色抖动（单色／彩色、颗粒尺寸、随机种子、刷新与Step）、阈值分色（含阈值呼吸／Step）以及不均采样。固定顺序为杂色→阈值→不均采样，和 JSON 键插入顺序无关；每卡保留自己的范围合成。场类型可为波场／径向／整数尺寸噪声场，含动态流动、潮汐和 Step 参数。场景不均采样的边缘保护按既有规范关闭。噪声场的非整数尺度暂不走此 GPU 路线，保留 CPU 表现；这是执行器能力条件，不是新的 Inspector 输入限制。矩形、椭圆、Alpha 图片、引用元素／组和反相范围蒙版仍由正式 mask resolver 生成，然后上传参与 GPU 合成。引用来源隐藏规则共用原 Runtime。

另已接场景染色（normal／screen／lighter，非lighten）与边缘色散。染色在全尺寸overlay执行，再在GPU缩小进入sample；色散在sample最后。其他染色混合方式／非字符串Paint在上传前整体CPU回退，不修改Inspector可选项。任一启用效果不在白名单（例如纹理、颗粒、网点或CRT），或控制器／Alpha规则不支持时，**整个场景效果链**按既有CPU顺序执行，不夹用逐卡CPU往返。不能将有限白名单接通表述为全部场景滤镜GPU化。

染色复用CPU的`decorate.animated`求值，1KB合成Canvas数值表保留颜色Alpha与globalAlpha舍入；颜色／透明度变化可能重建和上传，非零CPU准备。色散的6KB实际JS亮度乘积表配合两个uint32加减及53位舍入，保留严格亮度差>24；另有64KB强度字节表。每上下文复用，首次／改参上传计数，清缓存／释放销毁；纯数值CPU缓存不持有作品。色散过大坐标（>2^24）或非有限方向整体CPU回退，不新增产品输入上限。

当前固定链为**全尺寸染色→杂色→阈值→不均采样→边缘色散**，每卡范围独立。五卡无范围15道，五卡范围20道，双侧范围GPU转场41道；预热静态染色上传1／6／12次。新增资源为染色全尺寸工作纹理＋1KB表、色散6KB＋64KB表，原两张全尺寸中间纹理继续交替，不随卡数线性增长。染色单卡／五卡48组、色散单卡／四卡24组及边界／时序通过；其他混合、动态连续染色预算和宿主仍有未完成项，详见[染色／色散接线](V4_GPU_TINT_DISPERSION_PLAYER_2026-10-15.md)。

无范围每张采样卡两道：低分辨率处理 → 最近邻放大。有范围时先复制底图，再原生预乘source-over，故每卡多一道；卡间另外缩小一道。全尺寸中间纹理保留上一卡范围合成，不跨蒙版融合、不回传Canvas。未启用染色时首卡缩小用Canvas2D；启用染色则先全尺寸GPU处理，再GPU缩小。两卡一张中间纹理，三卡以上两张交替。原杂色／阈值／不均三卡无范围八道、各有范围十一道、双侧范围转场二十三道；五卡数字见上文。放大与缩小显式左上角最近邻，阈值匹配CPU字节亮度及JS double临界行为，不改CPU基线。

杂色使用GPU uint xorshift与静态GF(2)跳跃表，不使用CPU生成／缓存的噪声帧。CPU准备与时间／种子无关的RGBA8UI变换表（每行单元每通道32字节），另准备64KB字节舍入表，后者仅在强度变化时重建。首次／改参上传计入`frameGpuUploads`，构建次数为`noiseTableBuilds/noiseByteMapBuilds`。另有所有场景GPU路径共享语义的64KB反预乘字节表：由纯合成Canvas一次校准、每上下文一个纹理，首次上传也计入。它不是“零CPU准备”。杂色单卡七张纹理，三卡单Scene九张、双侧GPU转场十一张；预热后无范围上传1次/Scene，三张独立范围5次，双侧10次。详见[透明字节修复](V4_GPU_ALPHA_BYTES_2026-10-15.md)。

**透明整链本机定向严格画质已通过**：来源／低分辨率／卡间统一预乘RGBA8，需要运算RGB时按Canvas字节表反预乘，再整数预乘写回；范围使用GPU原生混合，不能用数学近似替代实际舍入。96组照片含透明来源逐像素一致，Alpha／明度反相／引用范围最大预乘差≤2；最终透明GPU转场最大Alpha与预乘差均1/255，无整色错点。新测试默认即限制异常像素为0，不再仅用平均值。此结论不替代跨设备、Tauri、全效果／长稳验收，默认CPU不变。

## 生命周期与转场

- 每个 Player 惰性拥有一个执行器；常规四张RGBA8纹理（低分辨率输入／输出、全尺寸来源／范围）加一张64KB R8UI反预乘表。同尺寸连续绘制复用；GPU转场再增加两张全尺寸纹理，至清缓存／释放或重建才释放。
- 第8批宿主例外：正式编辑器的显式实验GPU由Workspace惰性持有执行器，以既有`_sceneGpuExecutor`借给逐次重建的Player；Player仍按每次编辑释放，不复用规范化对象或帧。普通同尺寸修改调用`executor.invalidateSource()`清除最后输出key，但保留数值表／GL资源；素材描述、根尺寸、项目替换（含撤销／重做）、显式`workspace.releasePlayer()`／dispose均释放宿主执行器。不改变独立Runtime的默认所有权。外借执行器必须由宿主释放；不能假定借用Player的clearCaches会释放宿主资源。
- 阈值＋不均采样另保留一张全尺寸卡间纹理：单Scene六张、GPU双侧八张；重复播放不新增。阈值边界为纯数值、最多16项共享缓存，不存场景／素材引用；反预乘表也只共享数值不共享GPU纹理。每上下文资源独立释放。
- 第10批：来源或工作尺寸变化时，只释放当前尺寸相关纹理、坐标表与FBO验证引用；保留上下文、顶点缓冲、程序及固定数值表。nearest程序只有整数／校准两个有界版本，工作尺寸改由uniform传入，不按尺寸编译。仅保留当前一套尺寸表面，非无限尺寸缓存；尺寸相关noise jump表也随表面释放。`surfaceRebuilds`／`surfacesRebuilt`与`initialized`分开，`surfacePrepareMs`是同步重建调用时间，不是设备GPU时间。
- Scene 根尺寸仍不可变；正式编辑器根画布改尺寸依旧创建新Player并销毁Workspace设备边界，不能直接赋值给冻结的`player.scene.width`。本次设备复用用于同一执行会话的工作尺寸变化或外借执行器交错绘制，不改变项目／素材／撤销等释放边界。
- 两个独立 Player 默认各自拥有资源，内容与缓存不共享；释放 B 不能破坏 A。
- 上一 Scene 使用一个缓存的内部 Player，和当前 Player 共享同一份规范化 Scene，保证后续修改不会留下旧副本；其 Canvas2D 离屏池可以跨转场帧复用。
- 转场的两侧仍按各自运行时钟绘制，分别执行场景效果；实验入口让内部上一 Scene 借用当前执行器，因此这组双源绘制只创建一个 GPU 上下文。借用者不释放拥有者的资源。
- 默认转场最终合成仍调用正式 Canvas2D `drawTransition`，各自输出两侧 GPU 结果到 Canvas 后转场。显式 `sceneGpuTransitions:true` 才尝试下文的 GPU 双纹理最终合成；两条路线和旧隔离夹具的性能不可混称。
- `clearCaches()` 与新增 `dispose()` 都释放拥有的 GPU 资源、内部上一 Scene Player 和离屏池；释放后可再次绘制并重新初始化。宿主在替换／关闭项目或切换尺寸时负责调用。
- 一次性 `ToSampoolRuntimeVNext.renderTo(target,scene,time,options)` 在绘制后自动释放它临时创建的 Player。持续播放应保留 `createRuntime` 返回的实例，避免每帧初始化上下文。

## 回退与诊断

### 实验 GPU 最终转场（2026-10-14）

仅当绘制选项同时指定 `sceneBackend:'gpu-experimental'` 和 `sceneGpuTransitions:true`，两侧完整效果链均在白名单且采样工作尺寸一致时，fade／四向 wipe／dissolve 直接在同一上下文合成，再输出一次到 Canvas。两侧仍按各自时钟运行，不冻结帧。黑场、不同采样尺寸、白名单外效果继续既有 Canvas 最终转场；两侧效果分别按原预检规则决定 GPU／CPU。不新增 Inspector 参数或项目 JSON 字段。

shader 使用预乘source-over而非直接混合直通RGB，溶解用正式uint32哈希，擦除遵守floor／ceil边界。任一延迟输出或最终合成失败，当帧完整CPU重绘两侧与转场，不用旧纹理补画。`transitionCompositeBackend`区分最终与两侧后端，`transitionGpuFallback`记录失败重绘。预热后单卡无范围双侧上传2次／绘制5道，单卡两侧均有范围上传6次／绘制7道；首次另计Alpha表上传，多卡另按上文计数。

固定画面对照、透明背景、seek 和模拟合成失败回退通过；透明预乘通道最大差 2/255，有去除中间 Canvas 量化导致的微差。首轮真实 1080p 双场景动态范围 P95 主线程 GPU 最终转场 27.6 ms、Canvas 最终转场 27.5 ms，未体现完整帧收益，显式纹理却增至 33.40 MiB。因此此选项默认关闭；不是“更纯 GPU 必然更快”的生产结论。

WebGL2 不可用、编译／资源／绘制错误或上下文丢失，都保留原画并完整执行 CPU 场景链；不显示空画面。设备故障在当前执行器中记住，避免逐帧重新申请失败上下文；`clearCaches()` 后可以再试。已知不支持的效果只按帧回退，不将执行器永久禁用，之后可再次绘制白名单场景。

`renderTo` 的统计增加 `sceneBackend`、`sceneGpu`，报告实际执行结果、回退原因、上下文／纹理分配数、上传数、缓存命中、场 tick 和采样强度；转场增加 `transitionBackend`、上一 Scene 的离屏复用统计。`frameGpuUploads`／`frameGpuPasses` 汇总当帧当前与上一 Scene 的上传／处理次数，不仅记录转场一侧。GPU 计数不是 GPU timer query，不能从调用返回时间推导设备执行耗时。

## 验收与下一步

### 可选主线程分项诊断（2026-10-15）

绘制选项 `sceneProfile:true` 在帧统计返回 `sceneProfileMs`，默认不计时、不进入项目 JSON。覆盖 Player 准备、对象来源绘制、预检、Canvas 缩小、蒙版准备、上传 API、GL 提交、GL 错误检查、Canvas 输出及 CPU 最终转场。内部上一 Scene 共用同一收集器，父帧合计两侧；各分项不重叠，但各分项 P95 不能相加。它测的是主线程调用区间，不是 GPU 分阶段运算时间。

基准 `--profile-api` 进一步包围少量 WebGL API；这些时间嵌套在上述阶段内，不能再次累加。首轮观察 framebuffer 状态查询处有长等待；把不变附件完整性验证缓存到首次使用后，等待主要移到 `getError`，没有证明完整帧提速。纹理存储／尺寸在执行器内不变，附件首次使用和资源重建仍验证；上下文丢失及逐帧 GL 错误检查继续保留。不同尺寸／不完整附件回退均由生命周期夹具覆盖。

下一轮须区分来源／上传依赖、shader 执行与同步查询强制等待；不能仅凭等待发生在某个 API 上，就认定该 API 的计算成本或删除错误检查。正常后端与最终转场默认策略不变。

### 设备阶段与当帧合并验证实验（2026-10-15）

浏览器基准 `--gpu-stages` 用互不嵌套的 timer query 包围来源／蒙版上传、低分辨率 field draw、全尺寸输出和最终转场；逐帧合计两侧同类阶段，断言每类有效样本 64，无 disjoint／GL 错误。此模式不再套整个 Player 的 query；未覆盖 Canvas2D 工作、驱动 CPU 转换和查询区间之间的等待，因此阶段总和不能替代完整帧设备时间。计时包装仅存在于夹具，Runtime 不创建这些 query。

在显式 GPU 最终转场中，可再指定 `sceneGpuValidation:'frame-end'`，暂缓两侧离屏输出后的 `getError`，最终转场绘制后、任何 GPU 画面写入 Canvas 前检查一次。覆盖此前两侧及最终合成的 GL 错误，错误仍在当帧完整重绘 CPU；上下文丢失／附件验证不省略。这是同帧批量提交，不是异步放过错误。单 Scene、Canvas 最终转场、黑场或不支持的两侧仍采用原逐侧验证。默认不使用此实验选项。

逐侧／合并检查画面直接对照逐像素一致，注入 GL 错误完整当帧 CPU 重绘逐像素一致。首轮 1080p 双 Scene P95 完整调用 29.7→26.8 ms，但 RAF P95 33.5→33.6 ms，尾帧最大 99.9 ms；短测尚未证明稳定或跨设备改善。后续应隔离 Canvas 来源跨上下文传递／转换和提交调度，并重复／长时验收，不继续仅削减 shader 指令。

来源独立对照已记录于 [V4_GPU_SOURCE_TRANSPORT_2026-10-15.md](V4_GPU_SOURCE_TRANSPORT_2026-10-15.md)：普通 Canvas 传递没有复现完整 Player 长等待；ImageBitmap 的预乘与非预乘路径成本差异显著。该夹具仅复制纹理，不具备正式表面池、多来源与效果链，不能直接据此切换 Runtime 的来源类型或 Alpha 表示；下一步回到真实 Player 对照表面角色和读写依赖。

### 固定角色表面对照（2026-10-15）

显式实验选项 `sceneSurfacePolicy:'fixed-roles'` 仅在实验 GPU 后端为当前 Player 固定 `scene-source`／`gpu-work`／`gpu-range`／`scene-previous` Canvas，各 Player 独立持有。蒙版 resolver 的中间图和对象胶囊仍使用通用池，不改变效果语义。固定 Canvas 不进入通用 free bucket；尺寸变化替换同角色而非累积版本，`clearCaches/dispose` 清除角色引用。工作图仍每次重绘，**不是跳过动画更新的画面缓存**。角色 API 是持久租用而非支持同角色并发 acquire；同一 Player 绘制仍同步顺序执行。

`sceneSurfaceTrace:true` 仅诊断时记录来源／工作／范围和上一 Scene 接收目标的身份；ID 属于各 Player 表面池，两个 Player 的 ID 相同不表示同一个 Canvas。默认不分配身份记录。统计 `roleSurfaceCount/roleAllocations/rolePixels` 只描述固定角色，不能当作全部 Canvas／驱动内存。通用池的角色计数为 0 不表示没有 Canvas。

真实 Player 两轮 1080p 双 Scene 对照：通用池来源／工作／范围每角色均保持单一身份，但 64 帧转场目标均复用当前来源；固定角色消除该复用关系。完整调用 P95 为池 22.7／24.2 ms、固定角色 23.6／23.8 ms，RAF P95 都约 33 ms，**未显示明显收益**，不把既有复用认定为 bug。此选项默认不启用。

同页四策略交错持续压力已完成，每策略1800帧、合计7200帧。记录 `renderTo`、RAF 参数时间戳、实际回调到达和时间戳滞后：约一秒的首个 RAF 参数极端间隔不等于一秒实际绘制／回调停顿；后续仍有22–24ms绘制P95及少量真实长帧。资源计数／释放与画质通过，固定角色优势不稳定，保持默认通用池。完整方法与纠正见 [交错连续验收](V4_GPU_INTERLEAVED_PLAYBACK_2026-10-15.md)。来源／表面细分诊断至此收束，下一步优先真实效果整链与宿主生命周期，不继续把微小短测差值作为上线依据。

`tests/browser/v4-gpu-player-lifecycle.mjs` 使用真实 `createRuntime/renderTo` 验证：固定时刻 CPU/GPU 画面、三类场、不同采样格／非整除画布、范围蒙版、Step 同时改变效果与控制器、暂停命中、修改／撤销失效、拖动播放头、缺少版本保守刷新、尺寸资源重建、多 Player 隔离、上下文丢失／无 WebGL／不支持整链的 CPU 回退，以及双 Scene 时钟与离屏复用。它是正确性和生命周期测试，不是完整播放器性能基准。

下一步顺序：

1. 首轮 640×360／1920×1080 真实 Player 单 Scene、动态范围、双 Scene 全帧预算已完成，见 GPU 验证记录及 `v4-gpu-player-performance-result.json`。继续扩大整链与长时覆盖；1080p 双 Scene 的主线程 P95 26 ms／RAF P95 33.3 ms，尾帧预算仍需优化，不能据本轮直接默认启用。
2. 在宿主预览／导出会话接好 Player 释放和明确的素材／文档版本；版本尚未接好时保持无版本的保守刷新。
3. 按实际 overlay → sample 顺序扩大整链白名单，逐卡保留自己的蒙版与时序。不支持整链时仍整体回退。
4. 同上下文两侧输出和 GPU 最终转场已作为显式实验选项接通；首轮完整帧收益未出现，先分项测来源／蒙版准备、上传和输出，再决定是否推广。其他场景整链、Tauri WebView 与导出一致性仍待测。
5. 完整链、回退、恢复和宿主生命周期通过后，才讨论默认 Auto 后端及 UI 状态。当前不自动切换编辑器默认入口。
