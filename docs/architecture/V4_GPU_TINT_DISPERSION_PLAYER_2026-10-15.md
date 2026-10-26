# 场景染色／边缘色散：真实GPU整链

状态：2026-10-15，显式`sceneBackend:'gpu-experimental'`；默认CPU、对象处理、Inspector、Registry和工程格式不变。不是全部场景效果已GPU化，也不是Tauri／导出默认后端验收。

## 四层落点及能力边界

| 层 | 染色叠加 | 边缘色散 |
|---|---|---|
| Registry | 既有颜色、颜色Alpha、透明度、混合方式、fade／blink、Step／Linear不变 | 既有距离、方向、强度、边缘来源、宽度、色序及Step不变 |
| Inspector | 无面板／输入修改 | 无面板／输入修改 |
| Runtime | `69a-scene-gpu-executor.js`全尺寸overlay；`65-decorate-effects.js`公开内部`animated`供CPU/GPU共用同一求值 | `69a`低分辨率sample末端，保留CPU全部邻域规则 |
| 测试 | `v4-gpu-player-tint.mjs`、五卡真实预算、旧回归 | `v4-gpu-player-dispersion.mjs`、严格亮度边界、Step及故障回退 |

染色GPU首轮支持`normal`／`screen`／`lighter`（正常／滤色／加法，**不是lighten变亮**）。其他混合方式仍可用，但在分配／上传前触发整条CPU链，原因`unsupported-tint-blend:<id>`，不先运行GPU再夹入CPU卡片。未增加任何Inspector限制，也不将近似shader替代未验收模式。非字符串Paint同样整体CPU回退。后续须补齐其余混合方式，不能称作染色全部GPU完成。

边缘来源`auto/contour/contrast`、正反色序、透明边缘扩张、强度与宽度均沿用CPU。方向偏移由JS使用相同Math.round求出，再以整数传入shader。超出GPU可靠坐标范围（距离／宽度>2^24或非有限方向）回退CPU，这是后端能力条件，不是产品输入上限。

## 固定顺序与全尺寸／采样尺寸

```text
Canvas对象合成来源
→ 全尺寸染色＋染色自身范围
→ GPU缩小
→ 杂色＋自身范围
→ 缩小→阈值＋自身范围
→ 缩小→不均采样＋自身范围
→ 缩小→边缘色散＋自身范围
→ 最终Canvas或同上下文双源转场
```

不能把染色混入采样格：CPU的overlay先在全尺寸处理，sample每卡才缩小／放大。存在染色时首次上传全尺寸来源，后续GPU缩小，不再先用CPU缩小后染色。仅启用染色但采样格>1时，仍追加独立采样格；格为1则不凭空增加卡片。顺序与JSON插入顺序无关，中间无Canvas回传。

原两张全尺寸中间纹理交替可继续承载四／五卡，不随卡数线性分配。染色新增一张全尺寸工作纹理和1KB整数表；色散新增6KB亮度乘积表和64KB强度映射表，均每上下文复用并随clear/dispose释放。

## 染色不是修改来源RGB后套一个Alpha

CPU先将指定颜色／颜色Alpha／globalAlpha用source-in裁入来源Alpha，再按混合方式叠回来源，最后合成该卡范围。GPU使用256像素的合成Canvas产生1KB“来源Alpha→预乘染色RGBA”表，然后原生正常／滤色／加法混合，保留宿主整数舍入。

表与素材无关；共享最多8项纯数值缓存，不持有Canvas／作品引用，GPU只保留一张可更新纹理。颜色或动画透明度改变时可能重建／上传，`frameGpuUploads`如实计入，`sceneProfile.tintTablePrepare`单列准备成本。此方案不是零CPU准备，不是全画面CPU处理，也不是缓存作品噪声帧。

动态求值复用CPU的`decorate.animated`，不维护第二套fade／blink公式。颜色、透明度Linear通过现有frame求值再进入该表；测试不仅比较CPU/GPU，还确认中段颜色与Alpha实际变化（例如.35→.65），防止两条路径同时未生效而误通过。

## 色散严格亮度边界

CPU颜色边缘的条件是四方向邻域亮度差**严格大于24**，轮廓条件是Alpha差>8；邻域越界仅参与轮廓，不参与颜色边缘。直接GLSL浮点或理想整数亮度会在临界值改变边缘集合。

为保留CPU行为，CPU一次准备每通道256个实际JS-double乘积，用2^-56为单位拆成两个uint32，表共6KB。GPU以两个uint32完成加减、进位及53位有效位舍入，复现原亮度求和和差值，不要求硬件FP64。它仅精确实现这条既有亮度表达式，不是通用double计算器。单纯轮廓模式不做亮度判断。

通道与Alpha强度混合另用64KB字节表，保留JS Math.round，而非GPU近似浮点；仅强度变化重建。所有表纯数值、无源图／帧引用，首次与改参上传计入帧统计，准备为`dispersionTablePrepare`。后续优化不能用大量平均相近像素掩盖少量选边错误。

## 正确性与回退

- 色散24组照片：格1／3、三类边缘、单卡／四卡、透明／不透明，本组逐像素一致。
- 232组相差恰好24的灰阶对、四种强度和两种色序，共8张临界测试输出逐像素一致；Step改距离／方向／强度／色序／边缘来源再停用、seek回原段，三组一致。
- 第四卡色散绘制注入错误，完整CPU重绘逐像素一致。
- 染色48组照片：格1／3、三种原生混合、单卡／五卡、透明／不透明、两个fade时刻，本组逐像素一致。
- 染色Step／Linear／seek五组及短HEX／RGBA／CSS命名色配合blink八组逐像素一致；实际颜色与透明度求值变化另有断言。四种未支持混合模式预检零分配、CPU画面一致。
- 原杂色96组严格透明门禁、阈值灰阶／彩色边界和旧Player生命周期回归通过。不改变原最大误差／CPU回退标准。

证据：[染色](v4-gpu-player-tint-result.json)、[色散](v4-gpu-player-dispersion-result.json)。未由本组定向流程代替整个编辑器UI、全部宿主／GPU驱动、长时／休眠恢复验收。

## 五卡真实预算

Intel UHD620／Edge／ANGLE D3D11，640×360／1920×1080，各组预热8帧后采样64帧。对象与范围仍由Canvas2D准备；染色为静态颜色／透明度，杂色与不均采样持续变化。**本基准没有测连续颜色Linear／fade导致的每帧染色表重建成本**，其画质已测、持续性能仍待测。

1080p五卡完整调用P95，单位ms：

| 负载 | CPU | GPU | GPU RAF参数间隔P95 |
|---|---:|---:|---:|
| 无范围单Scene | 168.0 | 18.7 | 16.9 |
| 五卡各自范围 | 198.0 | 43.5 | 50.0 |
| 双Scene五卡范围＋GPU fade | 403.8 | 81.6 | 83.3 |

五卡无范围15道，有范围20道，双侧范围加转场41道；预热上传分别1／6／12次。一个上下文，预热后零新增纹理／backing重设／GL错误；显式纹理单Scene约41.56MiB、双Scene57.38MiB，不含Canvas／驱动。1080p固定时刻画质逐像素一致，360p最大平均RGB差0.0677/255，Alpha差0。双Scene最大调用360.2ms，不能称稳定30fps或无长帧。

这是完整五卡组合，不将相对CPU快等同于流畅，也不与上一轮三卡比值直接推导效果单项成本。性能query覆盖完整上下文，非单shader时间；不支持将多卡与旧`--gpu-stages`标签混用。

```text
node tests/browser/v4-gpu-player-dispersion.mjs --write-report
node tests/browser/v4-gpu-player-tint.mjs --write-report
node tests/browser/v4-gpu-player-performance.mjs --with-threshold --with-noise --with-tint --with-dispersion --frame-end-validation --write-report
```

证据：[五卡原始预算](v4-gpu-player-performance-gpu-transition-frame-end-threshold-chain-noise-tint-dispersion-result.json)。

下一步优先补染色其余混合方式及动态颜色／透明度持续预算，再扩展纹理／颗粒／暗角／Hard Mix。保留整链预检、严格透明门禁与默认CPU；宿主版本／释放、Tauri与导出Auto仍在后续。
