# GPU 基础设施第 7 批：共享重采样接入原生坐标表

日期：2026-10-24。状态：**本机格3正式编辑器矩阵24/24与格4快速回归8/8通过；默认仍CPU；对象／导出／Tauri未扩展。**

## 改动与覆盖

- 新增 `runtime-src/vnext/69c-native-nearest.js`：只用不透明像素编号条测量本机默认 Canvas 的四个轴向映射（down-X/Y、up-X/Y），不读取作品，不建立全局项目／图像缓存。
- `69a-scene-gpu-executor.js`：共享 resample/output Shader 消费同一张校准表。没有例外时保留整数Shader；有例外才分配R32UI四行坐标表。全尺寸复制保持恒等映射；没有改变六项既有效果的公式、范围蒙版、原生混合或处理顺序。
- `69b-backend-capabilities.js`：补充校准初始化条件、CPU准备与合成数字条读取说明，验收从known-failing改为本机已测夹具，不代表跨设备支持。
- `editor/v4-preview-backend.js`：仅调整现有诊断文字，增加坐标表显式字节和本次CPU准备耗时；不修改Inspector或参数声明。
- `scripts/build-runtime-vnext.mjs`、生成的 `home-scene-vnext.js`／`runtime-vnext-inline.js`：注册新数值模块并同步镜像。
- 新增 `tests/browser/v4-gpu-native-nearest-lifecycle.mjs`；原坐标校准夹具增加与真正Runtime模块的独立交叉检查；原Player生命周期断言显式计入有条件坐标纹理，没有放宽泄漏或画质门禁。
- `package.json`：现有GPU合同／重采样测试入口包含新模块语法和校准／生命周期夹具。

## 成本、失效与回退

校准与Executor上下文、全尺寸和工作尺寸绑定；新Player／改尺寸／清缓存会重新校准，不跨项目保留Canvas或坐标表。临时CPU数组上传后不持久保存。显式GPU内存为最大轴尺寸×16字节：例如640宽为10240字节；没有例外时0字节。新增初始化上传至多一次；热帧不增加坐标上传、不重新校准，也不增加效果处理道数。

`nearestCalibrationBytes`计入`textureBytes`；帧结果的`nearestCalibration`含`bytes/exceptions/prepareMs`。准备时间是CPU同步调用时间，不是设备GPU计时。若校准读取失败、表超出纹理上限或GL失败，释放资源并按原策略整链CPU回退；有明确`native-nearest-calibration-*`／`native-nearest-table-too-large`原因，不限制产品输入范围。

校准依赖surface-pool当前默认2D上下文。第6批已证明willReadFrequently模式不同，不能把校准表按尺寸全局共享。浏览器运行中隐式backing迁移、跨设备仍未全面验证；后续改变表面创建策略必须同步重验。

## 验收与复现

真实编辑器：Edge156.0.4314.42，Windows，Intel UHD620／ANGLE D3D11，headless、DPR1、1600×1000视口；Full预览，无来源版本缓存，最终转场默认Canvas。

```text
node tests/browser/v4-editor-gpu-performance.mjs --grid=3 --write-report --report-tag=native-map-full
node tests/browser/v4-editor-gpu-performance.mjs --quick --grid=4 --write-report --report-tag=native-map-grid4-regression
node tests/browser/v4-gpu-native-nearest-calibration.mjs --write-report
node tests/browser/v4-gpu-native-nearest-lifecycle.mjs
```

格3：640×360／1280×720／1920×1080 × 无效果／阈值／五效果／五效果带范围蒙版 × 静态／动态，共48条后端样本行、24组固定时刻画面对照。每行预热8次、采样32次；全部画面对照预乘RGB和Alpha最大误差0，资源／页面错误门禁通过，结束存活纹理0。动态采样不等于逐帧全画面对照。

格4快速回归：640×360，预热4次、采样16次；8组画面对照均0差异、无资源泄漏。格4三尺寸全矩阵是第5批的历史证据，本批未重跑全部三尺寸。

160组独立二维校准对照继续通过，并加入Runtime表与独立编号条的交叉检查。

新生命周期夹具：640×360格3分配6张纹理（含10240字节坐标表），第二帧分配不变、上传由3降至1、准备时间为0；dispose后显式纹理和坐标表均0。注入编号条读取失败得到CPU后端、`native-nearest-calibration-invalid`和0显式纹理。

既有回归通过：Runtime smoke、能力合同、预览策略、真实编辑器撤销／重做／替换／改尺寸／无WebGL／丢失上下文／绘制失败回退、真实编辑器9个Player创建与释放、Player生命周期与共享转场、染色／阈值／杂色／色散严格夹具。

### 本机性能观察（毫秒）

五效果动态组合，无范围蒙版；数值为Runtime同步调用P95，不是GPU设备执行时间。

| 画布 | CPU | GPU | GPU首次调用 |
| --- | ---: | ---: | ---: |
| 640×360 | 72.9 | 15.7 | 219.2 |
| 1280×720 | 309.4 | 31.1 | 342.6 |
| 1920×1080 | 275.1 | 39.9 | 1053.2 |

首次调用含Player／Canvas／GL／Shader／校准等，不能全部归因于坐标表。独立生命周期夹具的640宽校准准备一次为86.5ms，热帧为0；只是单次观察，不是准备耗时P95。带蒙版的1280动态GPU P95为217.1ms，有明显长尾，不能宣称所有组合均流畅。CPU不同尺寸间非单调也表明本机单轮波动较大，不用于拟合扩展曲线。

原生播放调度另测约2.5秒：CPU13帧、GPU25帧；目标为12fps。GPU Runtime调用P95为11.2ms、到达间隔P95为101.9ms。这不是设备耗时，也不代表支持稳定30fps。

报告文件：

- `v4-editor-gpu-performance-2026-10-24-grid3-native-map-full-result.json`
- `v4-editor-gpu-performance-2026-10-24-grid4-quick-native-map-grid4-regression-result.json`
- `v4-editor-gpu-performance-2026-10-24-grid3-threshold-640-native-map-threshold-result.json`
- `v4-gpu-native-nearest-calibration-2026-10-24-result.json`

性能报告沿用旧夹具生成时的limitations常量，其中“non-divisible known blocker”属于旧状态；本批以实际gates与画面对照及本文限定范围为准。保留原报告，不事后改写测试数据。

## 未完成与交接

没有对象GPU加速，也没有迁入更多效果；没有改变默认导出／Tauri后端或宣称跨设备验收。未运行全量verify:v4。正式编辑操作仍可能重建Player，导致反复初始化；后续应先优化宿主生命周期，再考虑扩大对象覆盖。不能仅以热帧P95宣布交互成本已解决。

另一会话只需知道新增Runtime构建依赖`69c-native-nearest.js`和后端诊断字段；作品JSON、Registry参数、图样附着、Inspector时序均无变化。下一批建议先验证保守复用Player／校准的失效边界和初始化成本，再启动对象高收益单效果试点（需先单独报告接线范围）。
