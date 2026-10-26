# Remotion官方效果适配：独立技术实验

日期：2026-10-25。结论：**可以直接运行官方效果工厂，也能用schema生成参数；没有必须重新编写每项效果算法的技术障碍。尚不等于适合整包替代产品后端。**

## 1. 范围与隔离

- 官方npm包`@remotion/effects@4.0.538`，并非照着文档手写相似Shader。
- 选取`brightness()`（2d）、`blur()`（webgl2）、`wave()`（webgl2）。
- 使用正式ToSampool Runtime绘制半透明、不对称彩色图形，结果Canvas作为效果输入。
- 两条执行路线：官方`Internals.createEffectChainState/runEffectChain/cleanupEffectChainState`；直接调用官方descriptor的setup/apply/cleanup的最小宿主适配。
- 不运行Studio，不挂载React组件；构建仍实际带入Remotion、React、ReactDOM。
- 依赖只在`tests/experiments/remotion-adapter`安装；未把效果注册进产品、修改项目JSON、Inspector或默认后端。

## 2. 可以亲自打开的产物

本地`tests/experiments/remotion-adapter/dist/standalone.html`是单文件离线技术演示，内含实验所需Runtime和效果bundle。可以修改亮度、模糊半径、波浪幅度／方向／相位，以及逐项停用；源图和处理结果同时显示。

数字、布尔、枚举共11个控件来自官方schema；不是为三项效果手写11个专用输入控件。尚未覆盖全部schema类型、中文别名、ToSampool时序声明、颜色／透明度绑定、项目保存或Agent发布流程。不能将这个技术面板冒充正式Inspector接入。

dist与node_modules忽略，不作为本项目公开分发资产提交。重建与运行说明见实验目录README。

## 3. 验证结果

[完整数据](v4-remotion-adapter-2026-10-25-result.json)、[离线UI数据](v4-remotion-adapter-standalone-2026-10-25-result.json)、[截图](v4-remotion-adapter-2026-10-25.png)。

- 640×360固定帧：亮度、模糊、横／纵波浪、两种组合顺序、零强度组合和全部停用共8例。
- 最小宿主适配与官方链执行器：最大预乘RGB／Alpha差均0。
- 零强度与停用输出和原帧差0；非零效果确实改变输入。
- 不同相位产生不同输出，seek回原相位得到相同输出。
- 非法亮度／波长参数由官方工厂拒绝。
- 禁用WebGL2时，官方blur抛出上下文错误；**没有自动变成等价CPU模糊**。宿主必须提供替代实现或明确不支持，不能静默跳过效果冒充成功。
- 实验会话结束活动纹理0，页面错误0。累计上下文创建数是多用例、多尺寸和冷启动总数，不是同时活动数；本次未测全部驱动内存、长期运行或设备休眠恢复。
- 单文件HTML阻断HTTP／HTTPS后可启动，11控件可用，改参数后画面实际变化，无页面错误。

CPU／GPU措辞：两条路线都使用同一官方效果实现。它们的画面一致，证明“宿主适配正确”，**不是**将官方GPU效果与ToSampool等价CPU算法全面对照。不存在的本地模糊／波浪算法没有被伪造为CPU基线。

## 4. 依赖与体积

生产minify、tree-shaking、`NODE_ENV=production`，无source map。实测：

| 产物 | 原始字节 | gzip字节 |
| --- | ---: | ---: |
| 只引入官方brightness工厂 | 274422 | 86749 |
| 三效果＋两种执行适配＋实验参数UI | 291561 | 91456 |

三项包中主要贡献：Remotion核心259736字节、React7616、ReactDOM3342；官方blur7379、wave6028、brightness1512，实验entry3755。更多细节在build-result与完整报告中。

这不是“三项算法本身需要292KB”，而是该公开import路线的固定依赖成本很明显。也不能把只增加约5KB gzip的第二／第三效果解释为整套框架没有成本。未来可研究更窄入口或兼容适配，但尚未测定减包结果。

单文件演示另包含现有ToSampool Runtime，两套运行代码叠加，体积见报告build.standalone；它不是最终按需裁剪的scene.runtime.js。gzip数字是压缩体积，不是file://读取时必然获得的传输体积。

## 5. 性能方法与限制

Windows／Edge156.0.4314.42 headless、Intel UHD620／ANGLE D3D11；640×360和1280×720。每组4次预热＋24测量，首次单列。固定Canvas来源；静态参数与720p持续改变参数另列。ToSampool源绘制在计时外，测官方效果执行与写回输出Canvas。

这不是Remotion Studio整帧帧率，也不是GPU timer query，更不包含编辑器布局／绘制／播放调度。测试连续调用，不等同持续屏幕呈现。不得从低调用时间直接宣称60fps。

最终一轮720p变参调用P95：单波浪7.1ms；亮度→模糊→波浪23.5ms；模糊→亮度→波浪56.0ms。每组仍4预热＋24样本，初次成本单列于JSON。开发过程中不同轮次有明显宿主波动，这些只是该轮诊断数据，不是跨设备速度承诺。

官方brightness在此版本实际为CPU getImageData循环；blur／wave为WebGL2。原链`brightness→blur→wave`与混合链`blur→brightness→wave`分别覆盖CPU→GPU及GPU→CPU→GPU。后者额外使用官方异步ImageBitmap桥接，调用耗时明显更高，但本实验没有分项归因，不能把全部差值归咎于上传或回读。

原链热帧仍观察到两次Canvas来源上传；同后端分组不等于我们共享GPU上下文和纹理的执行器已被直接复用。冷启动开销及宿主负载波动保留在原始数据中；不据此得出官方实现／我们的执行器普遍更快的结论。

## 6. 真正还缺哪些接线

1. **稳定执行边界**：createEffect是公开接口，但此次原生链入口在Internals；版本已固定，未承诺长期兼容。最小生命周期路线证明不必运行Studio，仍需确认正式扩展协议。
2. **CPU回退**：WebGL-only效果不会自动有同语义CPU版本；继续服从产品完整回退规则。
3. **外扩与坐标**：固定尺寸图像效果不自动声明ToSampool的对象外扩边界、采样坐标、蒙版和最终Alpha／混合语义。
4. **时序与状态**：对接统一求值和缓存依赖，验证undo／redo、资产异步完成、项目切换；不能从独立相位复现推导这些流程已通过。
5. **打包交付**：决定是否接受固定依赖成本、如何按需裁剪，以及导出／Tauri的上下文、CSP、释放与离线行为。
6. **许可**：官方效果包package.json声明`UNLICENSED`，不据源码可读推导可直接纳入本项目MIT产品。需独立确认正式采用／分发条件；本次不发布第三方bundle。

## 7. 建议

保留“直接复用官方算法”的路线。不要因为现有代码已投入而拒绝成熟实现；也不要因为工厂调用成功，就把全部框架无条件接入默认Runtime。

下一步可针对一个真正缺失且高价值的能力（例如模糊）做稳定宿主适配、参数映射、边界与降级合同；同时评估更窄的依赖入口。现有已验证GPU内核不必为采用接口而重写。Agent组合已有效果与编写真正新算法仍分两条路径。

参考：[createEffect](https://www.remotion.dev/docs/create-effect)、[brightness](https://www.remotion.dev/docs/effects/brightness)、[blur](https://www.remotion.dev/docs/effects/blur)、[wave](https://www.remotion.dev/docs/effects/wave)。具体npm版本与完整依赖锁定在实验目录。
