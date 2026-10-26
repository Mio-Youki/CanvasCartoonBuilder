# GPU 基础设施第 10 批：设备与尺寸相关表面分离

日期：2026-10-24。状态：**交错尺寸不再重建GL上下文或按尺寸编译Shader；场景与独立对象原型回归通过。正式对象GPU仍未接线，默认CPU不变。**

## 1. 资源结构与实际修改

`69a-scene-gpu-executor.js`将生命周期拆成两层：

| 资源层 | 持有与失效 |
| --- | --- |
| 设备级 | 一个上下文、顶点缓冲／FBO、固定数值纹理和已编译程序；dispose／故障时释放 |
| 当前尺寸级 | 全尺寸与低分辨率RGBA工作纹理、卡间／转场表面、native坐标表、宽度相关noise jump表；换尺寸时先释放，再分配当前一套 |

不建立无限的尺寸缓存，不逐对象建立上下文池。FBO附件先解绑再删除纹理，同时清除验证引用与最后输出key；小尺寸不会继续持有上一个大尺寸的工作纹理。固定数值表（Alpha、杂色幅度、染色等）保留，依照各自参数更新。

最近邻Shader的工作尺寸改为uniform。每类重采样程序只保留integer／mapped两个版本；未命中坐标例外时仍用整数路径，不强制上传占位坐标纹理。首次遇到新版本会编译，之后不同尺寸共用；没有修改效果计算公式或时序求值。

新增设备尺寸检查覆盖纹理、viewport与renderbuffer上限，并核对实际drawingBuffer尺寸。设备超限或异常时回退完整CPU链，不缩小产品参数／画布输入范围，不显示截断画面。

Workspace第8批边界仍保持：项目、素材描述、撤销／重做和根画布尺寸变化会销毁宿主设备；本次复用用于同一执行会话的工作尺寸变化及显式借用的交错绘制。没有悄悄放宽跨项目缓存边界。

## 2. 文件与接口

- `runtime-src/vnext/69a-scene-gpu-executor.js`：设备initialize／表面resize分离、尺寸uniform、尺寸资源清理与统计。
- `runtime-src/vnext/69b-backend-capabilities.js`：沿用现有Registry关联，增加设备条件、单套尺寸表面策略与新夹具证据；object查询仍不声明GPU支持。
- `editor/v4-preview-backend.js`：现有诊断增加表面重建信息；初始化与表面重建均不计入热帧。没有Inspector布局／参数变化。
- `tests/browser/v4-gpu-surface-lifecycle.mjs`：新增交错尺寸、内存回落、程序复用、错误与设备上限回退夹具。
- `tests/browser/v4-editor-gpu-edit-reuse.mjs`：补充真实编辑器采样格4→3→1→3以及独立报告标签、Runtime哈希。
- `tests/browser/v4-gpu-player-lifecycle.mjs`：原来期望换尺寸新建上下文的断言改为复用设备，仍精确检查分配与画质。
- `tests/v4-backend-capabilities.mjs`、`tests/v4-preview-backend.mjs`：合同与冷／热分类断言。
- `package.json`：增加`verify:gpu-surfaces`入口。
- 标准Runtime／inline构建产物与主合同同步。未修改`70`正式对象GPU路由、图样资源或另一会话的参数组件。

新增诊断字段：

- `initialized`：本帧是否创建设备；不再把尺寸变化也算作新设备。
- `surfacesRebuilt`、`surfaceRebuilds`：本帧重建与累计成功重建次数。
- `surfacePrepareMs`：本帧同步表面重建调用时间，包含数值准备、GL分配、必要程序首次编译等；不是设备GPU执行时间。
- `liveTextures`、`liveSurfaceTextures`、`programCount`：当前显式存活资源。
- `nearestCalibration.prepareMs`仍仅表示数字坐标校准同步调用；它是表面准备的一部分，不能重复相加计算总时间。

调用方／另一会话不得再用`initialized===false`单独判定热帧，应同时排除`surfacesRebuilt`与新Player。项目JSON、效果ID和参数协议无变化。

## 3. 交错尺寸验收

复现：`node tests/browser/v4-gpu-surface-lifecycle.mjs --write-report`。

环境：Windows、Edge156.0.4314.42、Intel UHD620／ANGLE D3D11，headless。真实Player，同一个外借执行器。透明渐变来源、screen染色、彩色动态杂色、带椭圆范围的动态阈值组合。

几何序列：320×180格4 → 333×187格3 → 640×360格3 → 480×270格1 → 320×180格4 → 333×187格3，重复3轮，共18帧。

- 18帧CPU/GPU预乘RGB／Alpha最大差异均0。
- 始终1个上下文。首次整数版本共5个程序，首次校准版本补齐为7个，此后不继续编译。该数量针对本夹具组合，不是所有效果的固定程序数。
- 当前尺寸表面为8张，加可选坐标纹理1张；固定数值纹理3张，总数11／12，与外部WebGL创建／删除追踪一致，不随轮数增长。
- 从640×360返回320×180，显式纹理字节由4966048降至1316736；不是保留最大尺寸作为常驻内存。
- 同尺寸追加帧不分配纹理、不重建表面。
- 注入尺寸纹理分配失败：完整CPU画面0差异、原因`injected-surface-allocation`，纹理与程序均释放。显式重置后恢复GPU。
- 上下文丢失：完整CPU画面0差异、原因`webgl-context-lost`；最终dispose资源归零。
- 注入设备renderbuffer上限：完整CPU画面0差异、原因`webgl-surface-size-limit`，无残留纹理／程序。此限制属于设备能力，不写入作品或UI输入上限。

报告：`v4-gpu-surface-lifecycle-2026-10-24-result.json`。内存统计仅显式GL纹理，不等于Canvas／驱动物理内存；分配累计次数会随替换增长，应结合当前存活资源判断，不将累计次数误判为泄漏。

## 4. 真实编辑器与其他回归

`v4-editor-gpu-edit-reuse.mjs --write-report --report-tag=surface-life`验证实际事务／view／Workspace链：采样格4→3→1→3均0画面差异、不新增上下文，程序数3（field＋两个输出版本）；各次正确标记表面重建。已有普通参数修改、撤销／重做、根改尺寸、素材变化与项目replace的释放检查仍通过。

本轮新增独立报告`v4-editor-gpu-edit-reuse-2026-10-24-surface-life-result.json`。旧无标签edit-reuse报告也被本轮回归重跑更新；第8批文档中的数值是其当时运行记录，不应将其当成当前无标签报告的最新数值。以后跨批性能记录使用独立标签。

1080p真实编辑器格4五效果静态组合另测：CPU/GPU画面对照0差异，释放后0存活纹理。8次预热＋32次样本，Runtime同步调用P95为CPU152.7ms／GPU33.9ms，GPU首次调用2193.2ms，首次成本仍显著；不是设备GPU时间或动态播放帧率。该报告是本机单轮回归，不用作与上一批的受控速度比较。

报告：`v4-editor-gpu-performance-2026-10-24-grid4-chain-1920-surface-split-1080-result.json`。其limitations仍含旧夹具的非整除历史说明，不代表本轮新失败；以gates与本文限定范围为准。

其他通过：真实编辑器CPU默认、显式后端选择、无WebGL、上下文／绘制失败、整链不支持、项目替换；9个Player完整释放；已有Player生命周期／共享转场／Step与seek；染色、阈值、杂色、色散严格夹具；独立对象阈值原型48组；Runtime smoke与能力合同。

对象原型报告：`v4-gpu-object-threshold-prototype-2026-10-24-surface-reuse-result.json`。对象控制器尺寸往返不再重建上下文，但仍只是原型，不是正式编辑器对象GPU。

## 5. 仍有成本，不能扩大宣称

排除首轮6帧后的12个交错尺寸样本，本机同步调用P95为42.3ms，表面准备29.8ms，其中数字坐标校准26.7ms。组合包含CPU内容／范围准备、GPU上传与输出边界，且尺寸混合，不是同尺寸稳态吞吐基准。

本批没有尺寸表面或坐标LRU缓存：每次几何变化仍会分配并校准。优点是内存有界、失效清楚；代价是频繁切尺寸仍昂贵。尤其不能据此把任意多个不同尺寸对象全交给GPU。

## 6. 下一步与未完成

可以开始**显式、预算受限的单个大对象阈值试点**，先利用默认采样格1／稳定尺寸的高收益路径；其他条件保守CPU回退。正式接线前仍需列清选取预算、对象身份、整链预检与统计，不依赖Inspector选中态。

多对象或连续尺寸变化需要进一步验证有界表面／数值坐标复用策略，不能通过扩大质量误差、缩小产品参数或无限显存换取表面流畅。对象mask／decorate／sample可调序和最后整体Alpha／混合仍须保持。

本轮未开启对象GPU、未修改默认CPU、未接默认导出／Tauri、未做跨设备／长时压力验收，也未重跑全量verify:v4或三尺寸完整性能矩阵。另一个会话仅需同步新增诊断字段及冷／热分类，不涉及Inspector参数或图样合同迁移。
