# 场景GPU透明链：预乘字节与原生范围合成

状态：2026-10-15，定向严格画质门禁通过；不是全效果、跨设备、Tauri或默认后端验收。默认CPU及UI不变。

## 原因与证据

此前杂色→阈值→不均采样在透明来源出现少数整色错点。不是随机种子失效，也不是应当放宽阈值比较：在阈值开始之前，CPU与GPU输入颜色已经差1–2级。

CPU将杂色结果写入Canvas，经过8-bit预乘存储；getImageData反预乘、范围蒙版裁切及source-over再次量化。此前GPU保留直通RGB，采用连续浮点范围合成，跳过了这些中间字节步骤，后续二值阈值将微差放大。

诊断夹具直接记录各道中间值。独立枚举256×256颜色／Alpha组合：普通整数预乘公式匹配，但简单`round(p*255/a)`与本机Canvas反预乘有604个输入组合不一致。另一个具体source-over例子：底图预乘字节151、源Alpha217，数学式整数舍入给出23的底图贡献，Canvas实际混合贡献22。故“整数公式看起来正确”不等于宿主实际混合逐字节一致。

## 实现

- **来源、低分辨率与卡间纹理统一使用预乘RGBA8**，WebGL Canvas也声明premultipliedAlpha=true。Canvas上传保留预乘字节，不在每次上传时先反预乘。
- 需要颜色数值运算的杂色／阈值，在shader内通过64KB的Canvas反预乘字节表恢复与getImageData一致的颜色；结果再按整数规则编码为预乘字节。不均采样与最近邻复制直接保留预乘值。
- 表只用一张合成的256×256测试Canvas准备，不读取作品、不需要GPU读回；共享缓存只保留64KB数值，不保留Canvas／项目引用。每个GPU上下文持有一张R8UI纹理，随clear/dispose释放；第一次上传纳入frameGpuUploads。
- 范围合成改为先复制底图，再将裁切后的预乘效果交给GPU原生`ONE / ONE_MINUS_SRC_ALPHA`混合。不能继续用一个“数学等价”的shader结果替代Canvas实际混合舍入。每张带范围的卡片增加一次绘制，**不增加Canvas往返**。
- GPU最终转场在预乘表示下source-over；无范围时仍保留两道/卡，中间缩小一道/卡间。预检与完整CPU回退边界不变。

## 资源和计数

基础纹理由四张RGBA8加一张64KB反预乘R8UI组成。两卡另加一张全尺寸中间纹理；三卡加两张，杂色再有跳跃表和64KB强度舍入表。

| 组合 | GPU纹理数 | 绘制道数 |
|---|---:|---:|
| 单效果，无范围 | 5（杂色为7） | 2 |
| 阈值＋不均，无范围 | 6 | 5 |
| 杂色＋阈值＋不均，无范围 | 9 | 8 |
| 三卡均有范围 | 9 | 11 |
| 双Scene三卡范围＋GPU转场 | 11 | 23 |

带范围的每卡比无范围多一道原生合成。预热后三卡独立范围仍上传5次/Scene，双侧10次；首次多一个Alpha表上传，杂色两表首次也分别计入。尺寸重建每次重新分配上下文纹理，但CPU数值表跨Player复用。资源测试更新的是实际新增纹理/绘制，不放宽画质门槛。

## 严格测试

- `v4-gpu-player-noise.mjs`扩为96组透明／不透明照片：采样格1／3、单／彩色、颗粒1／4、单卡／三卡不同范围、三个seek时刻；本组全部逐像素一致。
- 0／0.1／50／100强度的8组字节边界、Step／seek／周期闭合／暂停、第三卡故障CPU回退继续通过。
- Alpha图片、明度反相Alpha、元素引用范围三组，平均Alpha差0，预乘通道最大分别1／2／0，无整色错点。
- 透明GPU fade平均RGB差0.4844/255、平均Alpha差0.0150/255，**逐像素最大Alpha和预乘通道差均1/255**；将同样GPU两侧结果改为Canvas最终合成后逐像素一致。此处保留最终转场量化差，不声称所有直通RGB逐位一致。
- 不再允许“少于0.3%的大错点”：新测试默认即要求预乘最大差≤3、异常像素为0、最大Alpha差≤1；`strictTransparentParity:true`覆盖全部照片矩阵及范围／转场，而不是只覆盖原来一组。
- 原阈值灰阶／彩色临界、透明蒙版与生命周期回归通过；无WebGL、上下文丢失、尺寸、独立Player、清缓存及转场失败完整CPU重绘保持原门禁。
- 四策略常驻Player短版交错回归另运行1024帧，每策略四段×64帧，资源计数稳定、画质及最终释放通过；仅短版正确性回归，未重跑此前7200帧长测，不混用其性能结论。
- `v4-gpu-noise-alpha-diagnostic.mjs`只在测试内开放模块包装并读回GPU中间字节，确认杂色低分辨率、范围后、阈值输入三处逐字节一致。**生产运行不使用这类读回**。

证据：[严格照片／范围／转场](v4-gpu-player-noise-result.json)、[逐道字节诊断](v4-gpu-noise-alpha-diagnostic-result.json)。这些结果来自本机Edge；仍需其他WebView／GPU覆盖。

## 修复后的真实预算

同机Intel UHD620／Edge／ANGLE D3D11，每尺寸预热8帧、记录64帧，三种负载；预热后无新增纹理／backing重设／GL错误。1080p完整调用P95，单位ms：

| 负载 | CPU | GPU | GPU RAF参数间隔P95 |
|---|---:|---:|---:|
| 三卡无范围 | 87.7 | 8.0 | 16.8 |
| 三卡独立范围 | 110.7 | 29.0 | 33.5 |
| 双Scene三卡范围＋GPU fade | 220.8 | 57.1 | 66.5 |

固定时刻1080p画质逐像素一致；显式纹理单/双Scene约33.58/49.40MiB，不含Canvas与驱动。双Scene最大调用180.1ms。此前直通RGB路径同类短测双Scene45.8ms，本轮57.1ms，**不能把画质修复宣称为提速**；不同轮CPU基线变化也明显，不能仅比较比例推导增量成本。新增原生混合道数是确定的成本，性能仍需平衡交错/长时验证。当前双Scene不稳定30fps，继续保持实验与默认CPU。

```text
node tests/browser/v4-gpu-player-noise.mjs --strict-transparent --write-report
node tests/browser/v4-gpu-noise-alpha-diagnostic.mjs --write-report
node tests/browser/v4-gpu-player-performance.mjs --with-threshold --with-noise --frame-end-validation --report-tag=premultiplied --write-report
```

性能证据：[原始预算](v4-gpu-player-performance-gpu-transition-frame-end-threshold-chain-noise-premultiplied-result.json)。下一步回到计划中的染色／边缘色散真实整链接线，保留这套透明字节门禁；不继续用单张不透明照片代表组合正确性。
