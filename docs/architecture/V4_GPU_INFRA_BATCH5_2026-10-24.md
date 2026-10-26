# GPU 基础设施第 5 批：共享坐标修复与读取方式纠正

日期：2026-10-24。状态：**1080p组合差异已修；格4矩阵通过；非整除尺寸仍未完成。默认CPU不变。**

## 1. 分离出两个问题

### A. 产品中的共享重采样坐标误差

新增阶段诊断，分别使用原生“照片＋半透明椭圆”和预先冻结的RGBA图片，累积启用染色、杂色、阈值、不均采样、色散。

1080p格4下，重复自身输出稳定；首次CPU/GPU分歧在染色＋采样格。染色强度为0仍失败，格为1则通过。诊断夹具中读出中间缓冲后确认：

- CPU染色输入与GPU染色输出预乘字节完全相同。
- GPU全尺寸复制也相同。
- CPU缩小符合预期最近邻坐标，GPU缩小缓冲不符合；后续小尺寸处理只是保留／传播此前的差异。

直接输出Shader坐标的编号探针：1920→480时，旧浮点乘除再floor在本机输出1、5、9…，期望为2、6、10…，共129600个目标像素错误；整数公式为0错误。只增加精度声明未解决，未保留该无效尝试。此结论是实际坐标输出对照，不是凭画面猜测、也不是“GPU并行天然不精确”。

修复：共享缩小与输出Shader使用同一整数公式：

```text
q = ((2*p + 1) * from) / (2*to)
```

坐标为非负整数，避免浮点除法在floor临界位置偏到前一格。源／目标维度不超过32768时，最坏中间乘积2147450880仍在有符号32位范围；超出时在计划阶段以 `unsupported-resample-range` 整链CPU回退。设备自身纹理上限与分配失败仍按既有规则回退。这不是产品画布尺寸限制。

没有改染色／杂色／阈值／不均采样／色散公式，不增加逐帧CPU图像处理、纹理上传、回读、处理道数或离屏表面。

### B. 测试直接读取持久Canvas造成的干预

修复A后，原直接读取版矩阵22/24组画面对照通过，剩余两组是无效果场景，双方实际均CPU。独立新页面CPU控制组则完全一致。

将测试从反复 `getImageData` 读取持久预览Canvas，改为复制到独立、声明willReadFrequently的快照Canvas后读取；不修改产品Canvas、Runtime或效果语义。同一Runtime哈希下，格4矩阵24/24组完全一致。

这构成“读取方式干预测试结果”的控制证据。浏览器可能因读取持久Canvas调整内部backing策略，但本轮未追踪Chromium内部决策，不把具体迁移算法当作已证明事实。

直接读取模式仍可用 `--direct-readback` 复现，不删除失败证据。快照读取在性能样本采集结束后进行，不计入Runtime／编辑器render耗时；它也不是产品增加的GPU回读。

## 2. 文件改动

| 文件 | 本批改动 |
|---|---|
| `runtime-src/vnext/69a-scene-gpu-executor.js` | 共享nearestShader整数坐标；缩小／输出共用；溢出安全范围预检 |
| `runtime-src/vnext/69b-backend-capabilities.js` | 范围条件、坐标探针证据、明确editor仅整除格夹具覆盖及非整除known-failing |
| `editor/v4-preview-backend.js` | 诊断文本补充未完成的非整除画质边界；无Inspector参数变动 |
| `home-scene-vnext.js / runtime-vnext-inline.js` | 标准脚本生成镜像 |
| `tests/browser/v4-editor-gpu-stage-diagnostic.mjs` | 新分段、固定RGBA、零强度、格1、隔离读取诊断；可选中间缓冲trace和严格assert |
| `tests/browser/v4-gpu-coordinate-probe.mjs` | 新旧浮点／当前整数坐标对照，抽取真实共享Shader，不另建效果实现 |
| `tests/browser/v4-gpu-resampling-diagnostic.mjs` | 增加1080p整除维度控制组 |
| `tests/browser/v4-editor-gpu-performance.mjs` | 独立快照读取；保留直接读取；报告tag避免覆盖旧数据 |
| `tests/v4-backend-capabilities.mjs / package.json` | 溢出范围及能力状态断言；新增verify:gpu-resampling定向入口 |
| 架构文档 | 更新场景执行器合同及历史阻塞状态，新增本文 |

`80-scene-renderer.js`、Inspector、图样附着、参数时序和另一会话的共享修改未被本批重写。

两次标准镜像生成遇到文件打开UNKNOWN错误，后经同一生成脚本重试成功并通过--check；没有使用PowerShell整文件读写，也不据此推断具体文件锁来源。

## 3. 实际验收

通过：

- 坐标探针：当前整数计算0错误；旧浮点在本机重现129600错误。其它设备旧公式可能不失败，因此测试不要求旧公式必须失败，只要求新公式正确。
- 1080p格4，原生／冻结输入，0到5效果前缀共12组，CPU/GPU预乘与Alpha差0，自身重复也差0。
- 原Player染色48组、颜色语法、Step／Linear／seek和四种不支持混合回退。
- 原Player阈值、杂色、色散及生命周期夹具；逐项检查退出码，不能由后项成功掩盖前项失败。
- 正式编辑器后端切换、纹理整链回退、undo／redo、无WebGL、上下文丢失、绘制失败、改尺寸与重建恢复。
- 正式编辑器Player／纹理释放：9创建9释放，四轮5张纹理释放后归零。
- Runtime smoke、GPU合同、镜像一致性及定向语法检查。

没有以这些定向通过替代全量verify:v4、跨设备或Tauri验收。

## 4. 修复后的完整矩阵

原三档、静态／动态、无效果／单卡／五卡／每卡范围、CPU／GPU，共48组执行与24组画面对照；每组8次预热＋32次样本，Full、格4、无来源输出版本缓存。全部24组画面RGBA／预乘最大差0；预热后无新增纹理，释放后归零。

环境仍为本机Edge156、Intel UHD620／ANGLE D3D11、1600×1000、DPR1、无界面。动态无范围五卡的编辑器render P95（ms）：

| 画布 | CPU | GPU |
|---|---:|---:|
| 640×360 | 46.2 | 13.2 |
| 1280×720 | 88.4 | 19.2 |
| 1920×1080 | 203.6 | 49.6 |

对应Runtime同步调用P95为46.1／13.0、88.3／19.1、203.5／49.0ms；不是GPU设备执行时间。显式GPU纹理约4.71／18.24／40.78MiB，没有因本次公式修改增加。

GPU新Player首次调用分别108.0／112.5／150.9ms，初始化仍明显，不能用复用帧预算宣称参数拖动交互已经流畅。当前编辑器修改文档仍会重建Player；共享设备跨修改复用、连续拖动预算另待评估。

原播放调度1280五卡动态短窗口：CPU13帧、GPU25帧，约2.5秒，目标都12fps。GPU Runtime调用P95 13.1ms、绘制到达间隔P95 101.4ms；不能把12fps当作调用耗时，或据此宣称实际30fps。CPU该窗口有509ms回调长尾，短窗口不可作稳定性结论。

这是单机单轮配对数据。与上批数据的绝对变化包含运行状态、读取方式和代码变化，不能仅凭跨轮差值推算整数除法成本；也没有测设备timer query。

报告保留三份，不覆盖：

- [原始失败](v4-editor-gpu-performance-2026-10-24-grid4-result.json)。
- [整数修复＋直接读取，仍有CPU控制组差异](v4-editor-gpu-performance-2026-10-24-grid4-integer-fix-result.json)。
- [整数修复＋隔离读取，全部通过](v4-editor-gpu-performance-2026-10-24-grid4-integer-isolated-result.json)。

后两者的Runtime哈希相同，差别在夹具读取方式。

## 5. 复现与下一步

```text
npm run verify:gpu-contract
npm run verify:gpu-resampling
node tests/browser/v4-editor-gpu-performance.mjs --grid=4 --write-report --report-tag=integer-isolated
```

尚未解决：非整除尺寸的Canvas原生选格偏差，例如214→640的x=158／478。整数公式只解决GPU浮点误取整，**并不自动等同于所有Canvas比例下的舍入行为**。该项在能力描述为known-failing，诊断面板明确提示；本批没有宣称默认或全面GPU可用。

下一批建议先验证与素材无关的原生Canvas坐标校准／映射，不读回逐帧作品图像；通过奇数、非整除、X/Y轴、透明与范围夹具后才接共享执行器。无法保证时明确整链回退，而不是添加拍脑袋epsilon。

对象GPU、生成器具体能力登记／预算估算器、完整编辑器Step／Linear与过渡矩阵、长稳／休眠、导出、Tauri仍未完成。默认CPU不变。

## 6. 另一会话同步项

- 无Inspector参数、控件样式、附着图样或作品JSON变更。
- 后端新增范围回退码，能力acceptance细化为 `editor:aligned-grid-fixtures-only`、`nonDivisibleNearest:known-failing`；不能把它转成产品参数输入上限。
- 图样仍可Canvas生成后进入受支持GPU场景链，不需要Agent为它另写Shader。
