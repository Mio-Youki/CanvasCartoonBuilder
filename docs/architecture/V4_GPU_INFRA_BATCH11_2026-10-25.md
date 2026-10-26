# GPU 基础设施第11批：真实编辑器对象阈值试点

状态：显式实验入口；默认CPU不变。不是全对象GPU，也不改变导出或Tauri策略。

## 实际改动

- `runtime-src/vnext/69a-scene-gpu-executor.js`：接受已求值的单一采样组，复用阈值内核，不复制Shader。
- `69d-object-gpu-pilot.js`：对象准入、每帧预算、原因诊断和会话生命周期；`69b-backend-capabilities.js`声明真实object作用域。
- `70-object-composer.js`仅在原采样阶段调用；不支持时完整原CPU链；`80-scene-renderer.js`借入／持有会话并返回对象后端统计。
- `editor/vnext-workspace.js`管理释放与失效；`editor/v4-preview-backend.js`提供实际后端、预算和回退诊断。
- `img2asset-v4-classic.html`仅增加舞台后端选项，不调整Inspector；构建脚本和两个Runtime分发同步。
- 新增对象纯合同与真实编辑器夹具；更新Workspace、预览策略测试及独立原型的能力断言。

## 如何复现

通过静态服务器打开正式经典编辑器，舞台“预览后端”选择“对象阈值试点”。导入较大图片，Full预览，有效采样格1，只启用阈值分色，采样阶段最后，无加样与调色前处理。实际世界胶囊需在131072～1048576像素、单边不超过4096；每帧最多首个合格对象。相邻诊断显示实际对象GPU或CPU原因，不以所请求的后端冒充实际结果。

细节与所有权以 [合同](V4_GPU_OBJECT_PILOT_CONTRACT_2026-10-25.md) 为准。作品JSON无后端字段；同一求值参数供CPU/GPU使用。

## 验收与性能

证据：[真实编辑器最终数据](v4-editor-object-gpu-pilot-2026-10-25-final-result.json)。Windows、Edge156.0.4314.42、headless、视口1600×1000、Intel UHD620／ANGLE D3D11；合成透明PNG，原对象640×360，实际胶囊644×364。Full，无设备timer query。

| 指标 | CPU | 对象阈值试点 |
| --- | ---: | ---: |
| 预热后Runtime调用P95 | 15.5ms | 3.5ms |
| 预热后编辑器绘制P95 | 15.7ms | 3.6ms |
| 首次Runtime调用 | 13.7ms | 27.1ms |
| 首次编辑器绘制（含Player准备） | 23.4ms | 37.9ms |

每策略4帧预热、24帧统计，冷启动独列。Runtime调用是主线程同步调用区间，不是GPU执行时间；不把目标帧率或播放调度间隔当成绘制时间。单设备短测不能承诺任意素材收益。

6个支持画面对照的预乘RGB与Alpha最大差均0，包含图元扩展、对象蒙版、父Alpha／multiply、阈值Step、位置和旋转Linear及往返seek。普通同尺寸位移无新上下文；undo／redo正确释放后重建。两对象仅首个合格者GPU，其余完整CPU。

预热帧一次来源上传、两遍GPU处理；一个上下文、两个程序、五张活动纹理，显式纹理3816192字节。此数不包含Canvas、浏览器和驱动隐式内存。测试结束活动纹理0、页面错误0。

采样格>1、额外采样效果、顺序不符、过小／过大、转场项目均分配前拒绝。无WebGL、上下文丢失和绘制失败完整CPU回退；最终画面对照一致。场景阈值和尺寸表面生命周期回归亦通过。

执行入口：`npm run verify:gpu-contract`、`npm run verify:gpu-object-pilot`；额外回归 `tests/browser/v4-gpu-surface-lifecycle.mjs` 与 `tests/browser/v4-gpu-player-threshold.mjs`。Runtime生成物校验通过。未运行全量产品测试。

## 已知阻塞与下一步

复杂“图片＋外扩图元＋椭圆蒙版＋投影＋描边＋阈值”组合，纯CPU新Player基准与持久编辑器CPU结果出现预乘RGB最大96／Alpha22差异；对象试点完整CPU回退与持久CPU结果差0。这不是已确认的Shader问题，也未证明具体表面池原因。保留控制实验，不放宽画质验收；所有加样／非零调色前处理暂不准入。见 [专项阻塞记录](V4_GPU_OBJECT_PREFIX_BLOCKER_2026-10-25.md)。下一批应先隔离该CPU问题，再扩效果覆盖。

未完成：更多对象效果、采样格>1、多GPU对象、文字／程序／粒子、复杂前处理、转场、对象与场景共用GPU设备链、导出、Tauri及跨设备验收。

## 另一会话同步

没有新增参数、Inspector结构、时序公式或作品字段。仅须保留舞台选择值 `cpu`、`gpu-experimental`、`gpu-object-pilot` 和实际后端诊断；Registry后端声明通过现有查询扩展，不创建独立效果目录。不能把场景或图样生成器标记为已自动获得对象GPU。
