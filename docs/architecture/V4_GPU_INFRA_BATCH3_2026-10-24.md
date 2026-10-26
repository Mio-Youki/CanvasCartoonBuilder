# GPU 基础设施第 3 批：正式编辑器显式实验预览

日期：2026-10-24。默认 CPU 不变；本批是入口、观察口径与故障接线，不扩大 GPU 效果白名单。

## 用户入口与复现

打开 `img2asset-v4-classic.html`，舞台预览行新增“场景后端”：

1. 默认“CPU 基准”；选择“实验 GPU”只改变当前宿主会话。
2. 旁边按钮显示**实际场景后端**。请求 GPU 但整链不支持时显示 CPU／回退；没有需要后处理的效果时显示“无需处理”。
3. 点击按钮展开诊断：请求后端、当前／上一场景与最终转场后端、原因码、对象仍走的管线、调用计时、GPU 上传／遍数／显式纹理字节。
4. 添加受支持场景阈值滤镜可验证实际 GPU；再添加纹理叠加可验证整链 CPU 回退。对象阈值本身并未因此加速。
5. 公平比较请先选 Full，并使用同一画布、时间、素材与参数。Auto 预算的历史适应状态可能影响工作量，不能只比较自动模式切换前后的一帧时间。

后端不进入作品 JSON，不改变保存、测试场景或导出的策略。切换后端释放旧 Player、清除当前显示统计并令调度失效；切换工程清除诊断采样，保留会话选择。未添加 sceneSourceVersion，继续保守刷新来源。

没有隐式开启 GPU 最终转场、frame-end 检查或 fixed-roles 等其它实验。场景效果仍整链预检，不逐卡 CPU／GPU 往返。CPU 基准指新共享场景管线的基准，既有 CRT／ASCII 独立后端行为不变。

## 改动文件

- 新 `editor/v4-preview-backend.js`：纯宿主策略／观察模型，不依赖 DOM、Inspector 或参数求值。`setPolicy / previewOptions / observeFrame / snapshot / description / reset / dispose`。
- `img2asset-v4-classic.html`：舞台行最小入口及诊断 popover；初始化模型、传递 render options 和接收帧观察；没有重排 Inspector。
- `editor/vnext-workspace.js`：可选 onTiming 回调，在 Player 准备后单独计量同步 Runtime 调用。
- `editor/classic-v4-view-controller.js`：普通与临时 Player 路径均报告准备／Runtime 调用／完整视图 render 计时；结束选择框绘制计入 render；新增 resetPerformance，切换工程重置视图统计。
- `runtime-src/vnext/69a-scene-gpu-executor.js`：只增加 `initialized` 统计位，区分资源初始化帧与复用帧；没有修改 Shader 或画面算法。
- `home-scene-vnext.js / runtime-vnext-inline.js`：由原构建脚本生成，包含上述统计字段。
- 新 `tests/v4-preview-backend.mjs` 和 `tests/browser/v4-editor-gpu-preview.mjs`；`package.json` 纳入单元合同入口，并新增 `verify:gpu-editor-preview`。

## 计时含义

| 名称 | 当前测量内容／限制 |
|---|---|
| 编辑器 render | 视图 render 内的准备、场景绘制、选择框；不含函数外的播放调度等待，也不含测量完成后的诊断文本刷新 |
| Player 准备 | 等待素材／创建或复用 Player 的区间；不是纯解码时长 |
| Runtime 调用 | 同步 player.renderTo 调用；包括其内部 CPU 与提交／同步等待，不是 GPU 执行时长 |
| 新建／初始化组 | 新 Player 首次调用或本帧 GPU 资源重建的调用，单独采样 |
| 复用组 | 复用 Player 且本帧未重建 GPU；不声称浏览器所有缓存已预热 |
| 播放调度 | 保留原 HUD 的回调间隔口径，明确不是绘制耗时或实际输出帧率 |
| 设备 GPU 时间 | **未采集**，返回 null；不拿 GL 提交时间冒充设备执行时间 |

模型保留最近最多 300 个样本。初始化／复用各自 P95 只用于当前会话诊断，不能替代隔离的正式性能基准。当前不新增 timer query，不插入 gl.finish 或同步 readPixels。

## 实际验证

定向单元：CPU 默认、策略只作用于宿主、实际后端区别于请求、回退原因保留、初始化与复用样本分组、设备计时缺失语义、项目重置与释放。

正式页面浏览器夹具 `v4-editor-gpu-preview.mjs`（本机无界面 Edge 156.0.4314.42）：

- 333×187、透明矩形、采样格 3、场景阈值，CPU／GPU 全 RGBA 最大差 0。
- UI 选择后端并点击实际后端诊断，popover 可展开，明确显示设备时间未采集。
- 纹理叠加触发 `unsupported-effect:texture-overlay`，按钮显示 CPU 回退；真实变更控制器 undo／redo 恢复对应后端。
- 使用 WEBGL_lose_context 注入上下文丢失，实际 CPU 输出与基准逐字节一致；重建 Player 后恢复 GPU。
- 注入 drawArrays 失败，当帧 CPU 输出与基准逐字节一致。
- 模拟 getContext 无 WebGL2，显示 `webgl2-unavailable`；解除模拟并重建后恢复。
- 替换工程并改宽度为 399，预览尺寸与实际 GPU 状态更新；清除场景效果时显示无需处理。
- 工程 JSON 不包含 sceneBackend；无 pageerror。

还重跑第 2 批正式编辑器 Player／纹理释放夹具及原工具栏绘制／Canvas 选择流程。单元工作区、Runtime smoke、Runtime adapter 通过；生成镜像由脚本维护。

**未做本批性能基准**。夹具最后一帧的毫秒值只验证字段可测，不作为 P95 成绩；本批不宣称帧率改善、稳定30fps、跨设备或 Tauri 已通过。没有运行全量 verify:v4。

## 与另一会话的交接

- 新增功能入口仅在舞台预览行及独立诊断浮层；未来 UI 重排时保留 `preview-backend / preview-backend-status / preview-backend-details / preview-backend-report` 接口或同步更新宿主绑定。
- 参数组件、时序、图样生成与资源合同均未修改。GPU 模型不依赖 Inspector；CPU/GPU 继续消费同一已求值 frame 参数。
- `recordRender` 新增第三参数 timing，旧只接收 ms 的回调仍可用；workspace.renderTo 可选 onTiming 不进入作品和 GPU 参数。
- Runtime 新统计 initialized 仅为资源生命周期观察，不是作品字段。

## 下一批验收边界

1. 正式编辑器无效果／单效果／组合、静态／持续动态的隔离性能基准；记录初次初始化、预热、样本数、设备与浏览器、尺寸、质量预算、P95 和长尾。
2. 增加真实图片、场景蒙版、Step／Linear／seek、异步素材完成与连续资源稳定性；不能用本批矩形用例替代全部覆盖。
3. 对象阈值＋采样格仍只是待审原型路线；不在本批实现对象 GPU。
4. 能力估算器／生成器能力登记、导出、Tauri、跨设备、休眠／恢复仍未完成。
