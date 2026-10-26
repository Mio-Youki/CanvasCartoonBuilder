# GPU 基础设施第 1 批：能力查询与回退诊断

日期：2026-10-24。范围：能力合同的首个可运行切片，不是正式编辑器 GPU 接线完成。

## 本批改动

- 新增 `runtime-src/vnext/69b-backend-capabilities.js`：不依赖 DOM 的能力查询、宿主声明结构校验、实际执行计划评估、结构化原因。
- `editor/effect-registry-vnext.js`：仅增加 `backendCapability(id, scope)` 查询，既有效果目录、参数和 `runtimeSupport` 含义不变。该文件其它未提交修改不属于本批。
- `runtime-src/vnext/69a-scene-gpu-executor.js`：原回退返回值增加 `diagnostic`，保留 `handled` 和 `reason`；不改 Shader、支持条件、效果顺序和缓存键。
- `scripts/build-runtime-vnext.mjs`：加载能力模块；由既有命令生成 `home-scene-vnext.js` 与 `runtime-vnext-inline.js`，不手工维护镜像。
- 新增 `tests/v4-backend-capabilities.mjs`；`package.json` 增加 `verify:gpu-contract`，并置于 `verify:v4` 入口最前。本批未运行整个 verify:v4。

## 接口

`ToSampoolRuntimeVNext.modules.backendCapabilities`：

- `describe(id, scope)`：返回已登记实现证据；未知 ID 或未覆盖作用域返回 null。null 不代表功能本身不可用，更不代表允许 GPU。
- `assess(scene, frame)`：直接调用现有 `sceneGpu.plan`，不复制支持条件判定。返回 gpu-candidate／cpu、device:unknown 及原因。候选不是实际 GPU 成功；设备状态仍由执行阶段确定。
- `diagnose(reason, context)`：生成稳定 code、原始 reason、作用域／对象／效果标识、类别、恢复策略；原始字符串兼容保留。
- `declaration(value)`：校验并冻结未来宿主提供的 effect／controller／generator 能力记录。接受 CPU-only 生成器；它只校验元数据，不安装实现、不授权代码、不证明能力属实、不改变项目 manifest。

当前 describe 登记仅包括场景采样格、有限条件下染色、杂色、阈值、不均采样、边缘色散。对象／路径 GPU 不登记为已实现，CRT／ASCII 独立实现也不冒充共享场景执行器支持。

声明包含 Alpha／边界／蒙版／顺序、失效依赖、CPU 准备、遍数／上传／输出／显式内存的计数口径和证据。预算目前是模型说明与已有执行器计数来源，**还没有实现逐计划精确预算估算器**；CPU 准备耗时与设备时间未知为 null。证据存在校验不等于重新验证所有历史报告。

## 本次实际测试

通过：

1. `npm run verify:gpu-contract`：Registry 延迟加载、安全作用域、证据路径、不可变声明、未知实现保守处理；实际 plan 不支持链零分配回退；评估不写入作品 JSON；CPU-only 生成器元数据不授予 GPU。
2. `node scripts/verify-effect-registry-vnext.mjs`：18 效果、1 控制器合同。
3. `node tests/runtime-vnext-smoke.mjs`。
4. `node tests/vnext-runtime-adapter.mjs`。
5. `node tests/v4-path-generator-contract.mjs`：附着载体、多图样与顺序、Step／Linear／No、项目／交付合同未破坏。
6. `node scripts/build-effect-manifest.mjs --check`：现有 Agent 效果 manifest 未因增加后端查询而漂移。
7. `node tests/browser/v4-gpu-player-tint.mjs`：本机无界面 Edge，48 组矩阵最大平均 RGB 差 0；5 个实际 Step／Linear／seek 时刻 RGB／Alpha／预乘最大差均 0；颜色语法与 blink 组最大平均 RGB 差 0；4 种不支持混合均 CPU 回退、分配数 0，CPU 对照差 0。

最后一项是已有 Player 正确性夹具，不是正式编辑器操作测试。本批没有性能基准：没有新增 P95、设备耗时或内存稳定性结论，也不复用历史数字充当本批成绩。没有跑全量 verify:v4 或 Tauri。

## 回退边界

沿用实际 plan：不支持效果／控制器／Alpha 规则／参数范围先整链 CPU；设备初始化、上下文丢失和绘制失败沿用既有完整 CPU 回退，新增结构化原因。设备故障在执行器内记忆，清缓存／重建后再试；语义不支持下一帧重新评估。未改变默认后端和最终转场策略。

## 需要另一会话同步

只读查询可使用 Registry 的 `backendCapability`，但 Inspector 不应据此禁止合法产品参数。宿主提供的能力声明不能作为项目对 GPU 的承诺，也不要在项目 JSON 写入后端选择。

图样生成器仍按其现有 Canvas／附着图样合同运行。后续要为具体生成器登记 CPU 成本和缓存条件，应由双方确认宿主注册接口后接入；本批未修改生成器 manifest、参数、审阅流程或 Inspector。

## 后续批次

1. 能力层余项：逐计划预算估算、具体生成器宿主能力登记、更多结构化条件细节，后续与真实执行计数对照后补齐，不能称全合同完成。
2. 优先修复 Workspace／临时 Player 释放及异步素材会话隔离，再接显式实验预览。仍不传不完整的 source version。
3. 正式编辑器画质、撤销／重做、改尺寸、素材完成、项目切换及资源测试之后，才进入对象试点。
4. 导出、Tauri、跨设备和对象 GPU 均未完成；默认 CPU 不变。
