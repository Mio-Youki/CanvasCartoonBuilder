# 场景 ASCII 映射：第一版合同与验收

> 2026-10-15补充：保真 CPU 优化及可选低分辨率 GPU 分析均已迁入。见[CPU落地](V4_ASCII_CPU_PRODUCTION_2026-10-15.md)与[GPU落地／性能与精度边界](V4_ASCII_GPU_PRODUCTION_2026-10-15.md)。GPU能力不足时回退CPU；历史实验27.2ms不是正式版本性能承诺。

## 定位与依据

稳定 ID `ascii-mapping`，支持对象「采样」及场景「采样滤镜」。固定位置为边缘色散之后、场景CRT之前；对象可整体调序mask/decorate/sample，ASCII在sample末端。对象接线、格锚点及透明边界见[对象合同](V4_ASCII_OBJECT_2026-10-17.md)。参考 [AcerolaFX_ASCII.fx](https://github.com/GarrettGunnell/AcerolaFX/blob/main/Shaders/AcerolaFX_ASCII.fx) 的亮度填充、方向边缘和单元多数票思路；代码为独立 Canvas/WebGL 实现，不引入 ReShade、Compute Shader、游戏深度或法线缓冲。

## 参数与时间轴

| 参数 | 数据／默认值 | 语义 |
| --- | --- | --- |
| 相对尺寸 | size=8，整数，最小1、步长1 | 单元宽度=场景采样尺寸×size；字形比例仍让单元高度保留小数，不逐单元取整 |
| 字形比例 | glyphRatio=1，宽／高 | 单元高度=宽度/glyphRatio；更换字体时初始化为字体统一格比例，之后可手调 |
| 拉伸字符 | stretch=false | 关闭：整套字形等比例适配、居中，余白由背景颜色/Alpha决定；开启：统一字形格拉伸到单元。绝不逐字紧包围框撑满 |
| 字符集 | characters=` .:-=+*#%@` | 字素拆分、去重，按实际Alpha覆盖率建立亮度LUT，不按字符码或输入顺序排序 |
| 字体 | font=builtin | 默认8×8混合格：保留原内置符号，扩展使用寒蝉7px原生点阵。可选chill-16整套使用寒蝉16px；两份字体独立懒加载。其他字体仍整套栅格化；输出只带实际字形 |
| 亮度／对比 | exposure=1 / attenuation=1 | `clamp(pow(clamp(luma*exposure),attenuation))`；本轮仅按用户确认改名，exposure仍是亮度乘数，对比仍是指数映射，不是围绕中灰的线性对比 |
| 反相 | invert=false | 反转亮度与字形疏密映射 |
| 字符色彩 | colorMode=mono/original，默认mono | 单色固定字符色；原色每单元一份Alpha加权代表RGB，一个字符内部不会混色 |
| 字符／背景颜色 | color=#ffffff / background=#000000 | colorAlpha/backgroundAlpha默认1，共用颜色/透明度组件；原色时透明度独立显示0…100 |
| 原图背景 | originalBackground=false | 开启后保留进入ASCII前的当前动态输入，叠加透明字符层；背景颜色和背景透明度不参与处理并隐藏，但保留其值 |
| 混合模式 | blend=normal | 仅原图背景开启时显示，共用12项Canvas原生混合；只影响字符层与ASCII输入的合成，不替代场景／对象最终混合 |
| 边缘强化 | edges=false | 渐进显示灵敏度、占比、方向字符 |
| 检测灵敏度／显示阈值 | edgeSensitivity=.75 / edgeCoverage=.25 | 前者调低DoG门槛以接纳较弱细节；后者决定主要方向的最低证据占比，调高会减少边缘字符 |
| 方向字符 | edgeCharacters=`—|/\\` | 四个字素，依次横、竖、右上斜、右下斜；允许重复，不按疏密排序。长横线内置8×8格横贯8像素，短横线保留5像素 |

全部Step，共用效果独立轨、显示时段和蒙版。没有独立ASCII动态开关：输入画面随当前播放时刻重映射。不新增字符对象或素材卡片。

## 绘制、资源与边界

- 小数单元按像素中心归属划分；整数backing不意味着整数单元。画布末端不足整格时不因额外留白而降低原不透明输入的Alpha。
- 方向检测将不足整格的分析留白钳制到最后有效输入样本，避免生成画布伪边线。输出Alpha另取小尺寸最近邻代表样本，不由边缘分析的平均覆盖率决定；边缘开关不改变均匀色画面的透明度。
- 字符集／字体编辑一次烘焙`glyphAtlas:{version,font,characters,width,height,alpha}`，alpha是灰度掩码Base64。保存和导出携带字形而非字体二进制；无播放时网络请求。图集和字符集同批写入Step当前段，避免错配。
- 默认字符由Runtime内置掩码保证。Agent直接写自定义Unicode或外部字体时应提供glyphAtlas，保证跨环境一致；未载入内置扩展字体时拒绝无图集扩展，不静默使用系统回退。
- 当前字体合同见[默认8px与可选16px](V4_ASCII_PIXEL_FONT_OPTIONS_2026-10-15.md)。此前16px混合与系统回退8px仅作历史阶段。格不随最大字符扩大；按最终Alpha统一排序，不自动归一化视觉重量。旧图集不静默改写，改字符／切换字体后重建。
- 覆盖率排序用统一格而不是逐字紧框；近似密度字符无法创造丰富明暗。LUT归一化可用密度范围。
- 最多128个填充字形；100万单元为安全拒绝阈值，不是实时性能承诺。
- 边缘使用每单元4×4分析面、半径2分离高斯差、Sobel方向多数票。它是轻量2D近似，不等价于Acerola全分辨率8×8统计及深度/法线版本。
- 能力允许时，在已有字形合成上下文内执行低分辨率DoG／Sobel／4×4投票；方向纹理直接参与最终字形绘制，不读回CPU。代表色、代表Alpha与亮度选字仍由优化CPU路径完成。Float framebuffer／片元highp不可用时仅分析回退CPU；WebGL不可用或丢失时最终绘制也回退CPU。无用户侧GPU必需设置。
- CPU优化对冻结参考逐像素一致。GPU沿用相同公式，但浮点阈值边界可能改变少量字形：扩展1080p照片夹具39个通道不同、Alpha完全一致。不能把小图最大通道误差≤2推广为所有GPU画面的逐像素保证；扩展测试另设平均误差／变化通道比例门槛，详见GPU落地报告。
- GPU资源按Surface Pool隔离，Player dispose/clearCaches时释放；CPU字形缓存最多12项，GPU近期图集LRU最多4项／4MiB（超预算单张例外）。没有每单元/对象GPU上下文。

## CRT与采样格修复

仅启用CRT或ASCII＋CRT时，旧逻辑因“有采样效果”跳过基础格，而输出型效果又不消费采样控制。现在无其他采样格消费者时先应用基础采样格；存在其他采样效果时保持原路径，不额外重采样。

## 四层落点与验收

1. Registry：`editor/effect-registry-vnext.js`，作用域、Step、默认参数、别名和性能声明。
2. Inspector：`classic-v4-ascii-control.js`＋既有效果卡／参数控制器；字体、颜色复用，自动排序预览。
3. Runtime：`runtime-src/vnext/68b-ascii-mapping.js`＋`68c-ascii-analysis.js`＋`68d-ascii-gpu-analysis.js`＋scene-effects；正式构建和内联导出共用。
4. 测试：`tests/browser/v4-ascii-mapping.mjs`，已接入verify-v4。实际像素验证浮点网格／边界Alpha／无画布伪轮廓／图集／原色／拉伸／CPU-GPU最大通道误差≤2／动态输入／效果轨Step；Inspector渐进展开、撤销、项目恢复、导出，以及CRT采样格。

运行`node tools/tests/browser/v4-ascii-mapping.mjs --capture`生成 [实际渲染对照](v4-ascii-first-pass.png)。

首轮测量：本机Edge/硬件WebGL，旧size=8.5、比例2/3，完整Runtime renderTo墙钟耗时（预热4帧、11次采样；**不是GPU query，也不是全编辑器FPS保证**）。当前相对尺寸已整数化，同测试输入会规范为9，历史数据不代表当前9的精确测值：

| 画布 | 边缘强化 | 中位／P95 |
| --- | --- | --- |
| 640×360 | 关 | 4.9 / 5.8ms |
| 640×360 | 开 | 17.9 / 30.9ms |
| 1920×1080 | 关 | 13.2 / 13.9ms |
| 1920×1080 | 开 | 67.9 / 90.3ms |

前期纯CPU输出1080p约160…200ms，故默认尝试GPU合成，CPU为保真回退。1080p边缘开启目前**不满足30fps**，建议增大单元或降低预览尺寸。测试是合成图＋动态矩形，不替代真实复杂场景；GPU边缘分析需另立试验，不在本轮悄悄更改外观。

## Acerola预处理核对（2026-10-14）

用户补充的 [Post-Processing/Assets/Edge Detection](https://github.com/GarrettGunnell/Post-Processing/tree/main/Assets/Edge%20Detection) 同时包含DoG、ExtendedDoG和深度描边，不能认为目录内所有滤镜都被ASCII串联。实际ASCII处理顺序应核对 [ASCII.cs](https://github.com/GarrettGunnell/Post-Processing/blob/main/Assets/ASCII/ASCII.cs) 和 [ASCII.shader](https://github.com/GarrettGunnell/Post-Processing/blob/main/Assets/ASCII/ASCII.shader)：

`亮度 → 横向双高斯 → 纵向双高斯及差分 → 阈值化 → 两道方向梯度 → 8×8方向统计 → 字形`。

DoG为`G_sigma - tau*G_(sigma*k)`；默认sigma=2、k=1.6、tau=1，门槛.005。它是尺度选择的带通响应，不是保留所有高频：最细噪声和缓慢的亮度变化均可被抑制。源码把后续梯度称为Sobel，但3/10权重更接近Scharr型；本版使用常规3×3 Sobel、固定sigma=1/1.6、tau=1。

当前Runtime**已经有DoG预处理**，本轮不重复添加。主要取舍是先缩成每单元4×4后检测，还是在全画面检测后归并单元：前者较便宜但会丢掉缩图之前的细线；后者保真潜力更高，需要另做GPU/CPU实际画质和完整帧预算对照。默认8×8单元时，本版分析像素约为全画面1/4；改成每格8×8时约增至4倍分析量，不能外推为整帧恰好4倍耗时。

性能测量包含DoG、方向统计、颜色分析、字形合成和Runtime绘制；不能把边缘开关前后的全部差额声称为DoG单独耗时。后续先做分析阶段独立计时／两路径视觉夹具，再考虑共享GPU分析，不因参数改名就直接扩大检测分辨率。
