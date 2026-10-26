# GPU 基础设施第 8 批：编辑时复用设备资源，不复用 Player／旧帧

日期：2026-10-24。状态：**正式编辑器显式实验GPU的同尺寸编辑复用已接通，本机流程与资源检查通过。CPU默认、作品协议、对象管线与导出策略不变。**

## 原因与方案

Workspace每次mutate都会释放Player。此行为保护了规范化对象、模块实例、CPU离屏池等状态的正确性；本批没有尝试原地修改Player或保留这些缓存。原来的GPU上下文、Shader和数值表也归Player所有，导致每次Inspector／Canvas参数编辑都重建它们。

现改为：Workspace在显式实验GPU绘制时惰性持有执行器，通过既有`_sceneGpuExecutor`借给临时Player。普通同尺寸编辑仍释放旧Player、重建规范化场景，但保留GPU设备资源；调用新增`executor.invalidateSource()`清除最后输出key，下次重新上传和处理来源。

这不是作品缓存，不依赖DOM、Inspector位置或时序按钮；CPU和GPU仍消费同一份求值参数。没有新增Agent参数或项目JSON字段。独立Runtime的默认Player所有权不变，外借执行器由宿主负责释放。

## 失效边界

| 操作 | Player | 工作区GPU执行器 |
| --- | --- | --- |
| 同尺寸普通参数／结构修改 | 释放并重建 | 保留设备资源；清最后输出缓存 |
| 根画布尺寸变化 | 释放并重建 | 销毁 |
| 素材描述变化 | 释放并重建 | 销毁，同时失效素材解析 |
| replace／打开／新建／撤销／重做 | 释放并重建 | 销毁，与新项目隔离 |
| 显式releasePlayer／dispose／当前后端策略切换 | 释放 | 销毁 |
| 工作尺寸／采样预算变化 | Player按既有规则处理 | Executor发现尺寸不符时重建 |

执行器的数值表仍按实际参数更新。新启用某项效果可能惰性增加对应Shader或有界工作纹理；不承诺任意效果组合的首次编辑零分配。停用效果或整链不支持时可能保留本会话已分配的GPU资源，直至明确释放边界，不是将每条效果反复释放／重建。

设备错误仍按执行器原合同记住并回退，避免每次编辑不断重试；显式释放／策略切换可重试。未新增来源版本推断；正式预览仍不传sceneSourceVersion。

## 改动文件与接口交接

- `editor/vnext-workspace.js`：会话级设备资源所有权；异步素材／Player代次防护保持，校验成功后才借出执行器。
- `runtime-src/vnext/69a-scene-gpu-executor.js`：新增`invalidateSource()`，仅清最后输出key，不销毁GL资源，不改变效果公式。
- `home-scene-vnext.js`、`runtime-vnext-inline.js`：标准生成脚本同步镜像。
- `tests/v4-workspace-lifecycle.mjs`：mock验证保留设备但释放Player，以及尺寸／素材／replace／release边界。
- `tests/browser/v4-editor-gpu-edit-reuse.mjs`：新增真实编辑器事务、预览、画面对照、资源及性能夹具。
- `tests/browser/v4-gpu-native-nearest-lifecycle.mjs`：补充固定来源版本的缓存控制组和真实invalidateSource恢复验证。
- `package.json`：`verify:gpu-host-lifecycle`纳入编辑复用夹具。
- `V4_SCENE_GPU_EXECUTOR_CONTRACT.md`：说明独立Player与Workspace借用的不同所有权。

另一会话无需改参数、图样合同或Inspector；若修改Workspace／适配器生命周期，不可把“释放Player”和“销毁会话GPU资源”重新混为一个隐式操作。

## 真实编辑器实验

复现：`node tests/browser/v4-editor-gpu-edit-reuse.mjs --write-report`。

环境：Windows，Edge156.0.4314.42，Intel UHD620／ANGLE D3D11，headless，1600×1000视口、DPR1。640×360、格3、两个半透明对象与场景阈值；非整除坐标表10240字节。经实际classicV4Changes事务／view.render／Workspace／Player路径，不是独立GL吞吐夹具。

两种模式各16次编辑：强制releasePlayer模拟旧设备重建路径；正常同尺寸事务使用会话资源。每次修改对象位置，隔次修改阈值。前4次编辑预热，余12次取P95；每次编辑结束后另行CPU画面对照，不将读取／参考绘制计入测量。固定顺序、单轮、小样本，不是跨设备或统计显著性结论。

| 指标 | 每次强制重建 | 会话复用 |
| --- | ---: | ---: |
| 16次编辑中新建GL上下文 | 16 | 0（安装夹具时已建1个） |
| Runtime同步调用P95 | 52.2ms | 10.5ms |
| Player准备P95 | 0.4ms | 0.4ms |
| 编辑器render P95 | 53.6ms | 21.5ms |
| 编辑期间存活纹理 | 6 | 6 |
| 显式释放后存活纹理 | 0 | 0 |

所有编辑均创建了新Player。复用模式16次的`initialized`均false、校准准备均0、分配计数不增长。32次编辑画面对照均预乘RGB／Alpha最大差异0。复用组有一次Runtime10.5ms／编辑器21.5ms长尾；不以平均值掩盖，也不将调用耗时称作GPU设备耗时。

随后撤销／重做、改宽至641、素材描述变化、项目replace，操作后的同步释放检查均0存活纹理；撤销／重做／改尺寸／替换后的CPU/GPU画面对照也全0差异。素材变化检查使用未引用描述，只验证释放边界；实际图片解码由既有异步素材夹具负责，未声称本测试覆盖全部素材格式。

报告：`v4-editor-gpu-edit-reuse-2026-10-24-result.json`。

## 其他回归

本轮通过：GPU合同／预览策略／Workspace异步生命周期；真实编辑器CPU默认、显式切换、上下文丢失、无WebGL、绘制失败、整链不支持、撤销／重做、replace／resize；9个Player创建与释放且无重复dispose；Runtime smoke；格3快速静态／动态组合8组画面对照全0、无纹理泄漏。

来源缓存专项：故意在相同sceneSourceVersion下修改对象，控制组命中旧输出；调用invalidateSource后不再命中，恢复画面与CPU全字节一致，证明该接口实际清掉来源输出，而不是只改变统计。

格3快速报告：`v4-editor-gpu-performance-2026-10-24-grid3-quick-workspace-reuse-regression-result.json`。本批未重跑第7批的三尺寸全矩阵，也未运行全量verify:v4。生成Runtime和inline的--check通过。

## 未完成

默认CPU不变；对象加样／采样／蒙版仍是原管线，本批没有将对象加速误报为已完成。导出、Tauri、跨设备和长时间多项目压力未新增验收。大型图片对象CPU采样仍可能卡顿。

下一步可先提交对象采样单效果试点的接线说明：哪些数值内核可复用、哪些对象边界／蒙版／顺序语义仍缺失、如何整对象回退及测量上传／回传成本，再实施对象管线变更；不以本次场景GPU的收益代替对象试点证据。
