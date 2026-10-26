# ASCII共享GPU分析：正式落地

## 执行范围

完成边缘实验计划第2项：将低分辨率GPU分析迁入正式Runtime，并保留优化CPU回退。没有新增Inspector参数，没有使用全分辨率检测，没有新增软件／模型依赖或网络请求。

现有流程：Canvas低分辨率分析／代表Alpha → GPU双高斯差／Sobel／4×4多数票 → 与既有GPU字形合成共享方向纹理。颜色和亮度选字仍用CPU独立小函数。GPU分析与最终字形只有一个上下文，不为每效果／对象建立上下文。

## 四层落点与合同

| 层 | 修改 |
| --- | --- |
| Registry | 无；全部原参数与Step语义保持 |
| Inspector | 无；不增加用户侧CPU/GPU复杂参数 |
| Runtime | 新`68d-ascii-gpu-analysis.js`负责着色器、复用纹理、尺寸失效及资源释放；`68b`负责选择路径、消费方向纹理、回退与状态诊断；构建源／内联导出同步 |
| 验证 | 新`tests/browser/v4-ascii-gpu-analysis.mjs`加入`verify-v4`；原CPU对照夹具固定CPU分析，避免其历史基准变成GPU测试 |

纯CPU分析、最终CPU字形绘制仍可独立运行。`setAnalysisBackend('cpu'|'auto')`与只读`getLastAnalysisBackend()`、`analysisStatus(pool)`仅供诊断／测试，不存工程、不改变用户输入协议。

## 能力检测与生命周期

- 需要`OES_texture_float`、`WEBGL_color_buffer_float`、片元highp及完整Float framebuffer；任一失败即回退CPU分析，最终字形可继续GPU。
- 分析永远每单元4×4，与来源像素、采样格和字形比例无关；不沿用实验的64×64全分辨率投票上限。
- 无WebGL、字形着色器创建失败或上下文丢失，使用既有最终CPU绘制。分析成功而最终合成失败时，重算CPU边缘／索引，防止该帧丢边缘。
- 已知不支持不逐帧重复探测。Pool仅保留当前尺寸工作集，尺寸改变立即删除旧纹理／程序／缓冲。clear／Player dispose删除5张分析纹理、3张字形纹理及程序／buffer／framebuffer，丢弃上下文与能力缓存。
- 上下文丢失期间保持CPU；清理／重建Player后重新探测，不宣称浏览器context restore后旧GPU对象自动恢复。
- 单个Float中间纹理，其余分析纹理RGBA8；理论分析纹理字节`width*height*28+columns*rows*4`。1080p、8×12单元约9.76MB。不代表浏览器总内存／显存峰值。

## 画质与精度验收

20组小图严格逐像素一致：照片、文字、细线、半透明素材×5组参数，涵盖自定义烘焙字形、灵敏度／阈值端值、小数字形比例、反相、拉伸、基础采样格。720p照片严格一致。

1080p照片：约829万通道中39个不同，平均绝对通道误差0.0005815/255，最大169，Alpha差异0。原因是GPU浮点运算与CPU累积舍入不同，极少DoG阈值边界可能翻转方向票／字形；不是每个通道都只相差1。因此不能声称GPU对所有图片逐位相同，不能用平均误差掩盖发生过字形变化。

扩展大图测试要求Alpha完全一致、平均误差≤0.002/255、变化通道≤总通道0.002%；任何超出都会失败。此上限是回归门槛，不是所有硬件的数学证明。要求精确参考输出时使用CPU分析；跨设备仍需验收。

验证的故障注入：缺Float只探测一次、无WebGL只探测一次、着色器失败、分析前丢失上下文、四次分析draw后在第五次最终draw丢失上下文，以及clear释放全部8张纹理。均检查实际输出而不只检查“没抛异常”。

本轮正式构建后，`node scripts/verify-v4.mjs` 全量通过：含40组冻结参考／CPU对照、新GPU精度与故障注入、原ASCII Inspector／撤销／Step／项目重开／HTML导出、独立效果轨／蒙版以及项目会话隔离。构建源与内联镜像均已重新生成；未进行git提交或推送。

## 性能实测

夹具：`node tools/tests/browser/v4-ascii-gpu-analysis.mjs --benchmark`，Intel UHD620／ANGLE D3D11／Edge155 headless，同一照片＋轻微移动白线，采样格1、相对尺寸8、字形比例2/3、原色、边缘开启。各尺寸预热12帧、采样60帧，RAF调度；最终Canvas读1像素以同步绘制。测量时未并跑其他自动回归。原始结果见[v4-ascii-gpu-production-benchmark.json](v4-ascii-gpu-production-benchmark.json)。

| 画面 | CPU分析＋GPU字形 中位／P95 | GPU分析＋GPU字形 中位／P95 | GPU路径最长 |
| --- | ---: | ---: | ---: |
| 640×360 | 21.6／23.3ms | 12.5／14.1ms | 16.0ms |
| 1280×720 | 62.2／66.6ms | 22.3／25.2ms | 33.5ms |
| 1920×1080 | 131.9／137.9ms | 39.1／44.6ms | 57.7ms |

1080p P95较同次CPU分析减少约68%。比上一轮隔离候选27.2ms慢，设备虽然相同，运行负载／时钟与夹具不同，不能把历史最优数字当成已部署能力。以上不是GPU query、完整Inspector开销、OS显示帧时间或Tauri验收；1080p不能承诺稳定30fps。

CPU参考对照环境也已恢复：冻结旧算法／优化CPU的P95为73.1／20.2ms、149.6／52.0ms、351.6／113.5ms（三种尺寸），记录于CPU报告JSON。它与本表属于不同运行，不交叉计算加速比。

## 下一步

进度更新：已完成[实际编辑器＋现有Tauri WebView定向冒烟](V4_ASCII_HOST_ACCEPTANCE_2026-10-15.md)，三组效果组合、Step／撤销、CPU回退、8轮项目切换和自包含HTML播放均通过。既有Tauri默认入口仍是Legacy；本轮采用隔离WebView临时加载最新v4，不能当作正式打包资源／原生文件路径验收。

计划第3／4项仍有剩余：扩大多帧精度与字体、场景蒙版、ASCII＋CRT组合、实际编辑器播放／导出性能、Tauri实际设备验收。完整verify-v4与现有ASCII编辑／导出流程用于行为回归，不能代替这些专项性能门槛。全分辨率检测继续独立研究，未改变默认外观。
