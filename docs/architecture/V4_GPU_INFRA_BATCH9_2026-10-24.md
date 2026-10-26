# GPU 基础设施第 9 批：对象阈值原型与源绘制状态修复

日期：2026-10-24。结论：**固定尺寸的对象阈值＋采样格原型值得继续；48组画质对照全0差异。但正式编辑器对象仍走CPU，不扩大默认GPU能力声明。**

## 1. 先报告的接线范围

先核对`70-object-composer.js`、`68-sampling-effects.js`与场景执行器，产出 `V4_GPU_OBJECT_PILOT_PLAN_2026-10-24.md`。关键差异：对象采样格对整条低分辨率链只应用一次，场景多卡则逐卡采样；蒙版坐标、阶段可调序、来源身份、最后整体Alpha／混合、尺寸生命周期均不同，不能直接把场景多卡路由套到对象。

首轮仅在测试中使用已有阈值内核，不复制Shader、不建立对象效果目录。测试适配接收真正对象frame求值后的效果／控制器数据，建立胶囊尺寸的临时纯数值载体，供现有执行器消费；不重复解释scene时序。

原CPU内容绘制与formation／mask／decorate保持；仅将末端单一threshold＋采样格替换为GPU处理，再按原透明度×父透明度／混合／位置合成。sample不在末端、含其他采样效果或非keep边缘Alpha时，在GPU分配前拒绝。拒绝只是原型预检，正式编辑器始终保留原CPU链，不是限制产品可选顺序。

## 2. 实验暴露的既有CPU问题

首轮48组中，图片及其变换／蒙版／装饰／父混合等用例首次绘制一致，但采样格大于1后的重复绘制偏差很大。来源是**复用Canvas的绘制状态**，不是GPU阈值公式：

```text
CPU采样输出Canvas：imageSmoothingEnabled=false
→ 归还通用池
→ 下一次用作对象源内容Canvas
→ 图片缩放继承false，首次绘制默认true
→ 两次相同时刻的源图片已经不同
```

控制证据：每帧新建CPU参考池修复了大部分差异，但GPU前处理的装饰表面也会被复用，剩余装饰用例仍不同；仅在测试适配器中为双方源绘制恢复true，则48/48通过。没有更改Shader、容差或效果参数。

正式最小修复：`70-object-composer.js`的`createCapsule`在源内容绘制前明确`local.imageSmoothingEnabled=true`，恢复与新表面首次绘制一致的状态。采样缩放本身仍显式false，算法和像素风格不变。其余已有未提交修改均保留；本批没有重写composer。

标准Runtime生成曾遇到UNKNOWN文件打开错误，随后在批准的环境重跑标准生成与--check成功。只使用成功重建后、不带测试重置开关的最终结果验收；没有手工维护另一份Runtime。失败基线和两条控制实验报告保留，不把旧构建的运行结果解释为修复后结果。

## 3. 文件变化

- `docs/architecture/V4_GPU_OBJECT_PILOT_PLAN_2026-10-24.md`：复用点、语义缺口、预计生产改动与前置门槛。
- `tests/browser/v4-gpu-object-threshold-prototype.mjs`：独立原型、CPU对照、已求值参数和真实跟随矩阵断言、两条状态控制实验、完整CPU Player往返seek、性能／释放记录。
- `runtime-src/vnext/70-object-composer.js`：仅新增源绘制平滑状态恢复及注释，不接GPU业务路由。
- `home-scene-vnext.js`／`runtime-vnext-inline.js`：标准构建同步。
- `package.json`：`verify:gpu-object-prototype`先检查Runtime镜像，再运行独立原型；未纳入全量verify:v4的默认产品能力声明。

无Inspector、Registry参数、作品格式、图样附着或Agent接口变更。现有`backendCapabilities.describe('threshold','object')`仍返回null，夹具明确断言这一点。

## 4. 实际验收

最终命令：

```text
node tests/browser/v4-gpu-object-threshold-prototype.mjs --write-report --report-tag=verified-follow-mask
node tests/browser/v4-object-effect-flow.mjs
node tests/browser/v4-editor-gpu-preview.mjs
```

最终报告：`v4-gpu-object-threshold-prototype-2026-10-24-verified-follow-mask-result.json`，含实际加载Runtime SHA256、设备与胶囊尺寸。Edge156.0.4314.42，Windows，Intel UHD620／ANGLE D3D11，headless。

48组：8种对象条件 × 2种基础格配置 × 3次时间采样（.2→5→.2）。条件为图片、包含越界图元的矢量、旋转＋双向斜切、反相蒙版、带真实followMatrix的跟随蒙版、投影＋描边、父组透明度＋multiply、对象效果／控制器Step。动态阈值沿用原有breathing公式；时序用例断言实际采样格3→4→3、阈值.2→.8→.2，不以两边都未求值作为通过。跟随蒙版也断言矩阵确实发生位移。

**胶囊与最终合成两处，预乘RGB／Alpha最大误差均0。** 阶段顺序不支持／额外效果／不支持Alpha模式共3个拒绝用例，分配均0。20次资源释放检查显式纹理均0，固定尺寸热样本无额外纹理分配。

完整CPU Player另测图片、带装饰图片的.2→5→.2，首次与返回帧均全0差异，防止只在原型适配器中掩盖原有问题。

正式编辑器回归通过：对象四项排序／蒙版位置／动态时段流程；场景GPU显式切换、CPU默认、整链不支持、撤销／重做、上下文丢失、无WebGL、绘制失败、replace／resize。Runtime smoke和生成镜像检查通过。**这些不是正式编辑器对象GPU验收，后者尚未接通。**

文字、程序构件、序列帧、粒子、对象重复滚动、对象参数Linear、对象时段启用开关、多尺寸同时绘制均未在本轮原型矩阵完整验收。

## 5. 性能观察与口径

阈值原型，采样格1；CPU与GPU都包含真正对象内容绘制及胶囊处理。GPU包括来源上传、阈值、返回Canvas胶囊；不包括最后放置到整场景、Inspector、播放调度或设备GPU时间。

每项4次预热＋24次样本，单机单轮、CPU先于GPU。另有对照轮表现有波动，不据此拟合所有尺寸或承诺产品帧率。

| 元素布局尺寸 | 实际胶囊 | CPU调用P95 | GPU调用P95 | GPU首次调用 | 显式GPU纹理 |
| --- | --- | ---: | ---: | ---: | ---: |
| 640×360 | 644×364，234416像素 | 17.4ms | 2.4ms | 29.0ms | 3816192字节 |
| 1280×720 | 1284×724，929616像素 | 52.3ms | 2.8ms | 32.3ms | 14939392字节 |

实际胶囊含现有两侧留白，不用元素W/H冒充工作像素。显式GPU作品回读为0；Canvas输出仍存在传输／同步边界，不能称为零成本，也不能直接认定浏览器一定读回CPU。CPU基线确实使用getImageData，本轮未逐项计数，报告为null而非0。Canvas／驱动隐式内存不含在显式纹理字节内。

## 6. 下一步决策

结论为继续，但先做**设备／表面生命周期拆分**，不是立刻在`70`启用GPU：

1. 保留一个上下文和已编译内核；胶囊尺寸变化时只替换尺寸相关纹理／坐标表。现有nearest Shader内嵌工作尺寸，需改为宿主尺寸uniform并做场景回归。
2. 采用有界表面策略，不逐对象长期持有一个GL上下文，不按每个旋转角度无限积累纹理。
3. 先测不同尺寸交错与动态尺寸、资源回落、错误释放；再把单效果试点接到正式对象sample阶段。
4. 正式路由必须返回object级实际后端、拒绝原因和成本，与scene后端分开。保留最终Alpha／混合及可调顺序；其他顺序暂回退而非重排。
5. 对象多效果需独立的已求值采样计划，不能套用场景逐卡重采样。再按证据扩展，不以本次阈值成绩覆盖网点等其他效果。

需要另一会话同步：对象源绘制现在明确恢复默认平滑状态；不得因组件或图样接入依赖表面池中的偶然残留值。下一批预计改`69a`资源管理／坐标uniform与测试，不涉及Inspector输入或图样参数。对象GPU正式接线、导出、Tauri、跨设备仍未完成。

历史报告分别为无后缀失败基线、`-fresh-reference`控制、`-reset-source-smoothing`控制、`-source-state-fix`与`-verified-source-state`中间回归。最终能力与性能以`-verified-follow-mask`为本批限定证据，不把原型通过描述为产品默认可用。
