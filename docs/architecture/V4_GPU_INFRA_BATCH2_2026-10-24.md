# GPU 基础设施第 2 批：宿主释放与异步隔离

日期：2026-10-24。本批不修改 Shader、Inspector、效果参数或默认 CPU 策略，不启用正式编辑器 GPU 入口。

## 修改文件与实际覆盖

- `editor/vnext-workspace.js`：失效时释放旧 Player；新增 `releasePlayer()` 与 `dispose()`；素材解析按当前工程、资源键和代次校验，去重同一请求；过期解析不得写回缓存；过期 Player 创建结果释放；绘制前核对文档／Player 代次及宿主提交许可。
- `editor/classic-v4-view-controller.js`：提交前检查工程、revision、renderToken、活动／停止状态；隔离查看的临时 Player 在 finally 释放；过期预览静默丢弃，不把旧请求的错误显示为新工程失败；停止视图时取消待调度绘制并释放工作区 Player。
- `editor/vnext-runtime-adapter.js`：同步／解析后单次绘制在 finally 释放临时 Player，包含绘制异常。
- `tests/v4-workspace-lifecycle.mjs`：新异步与生命周期单元夹具。
- `tests/browser/v4-editor-player-lifecycle.mjs`：新正式编辑器生命周期夹具。
- `tests/vnext-runtime-adapter.mjs`：增加单次绘制成功／异常释放断言。
- `package.json`：单元生命周期纳入 `verify:gpu-contract`；增加 `verify:gpu-host-lifecycle`（单元＋浏览器）。

其它会话在共用文件上的已有修改保留，本批未更新 Runtime 生成包，因为没有改变 Runtime 源码。

## 接口与取消语义

`releasePlayer()` 仅释放预览资源并让当前待创建 Player 失效，不清除工程和素材缓存。`dispose()` 关闭工作区、释放资源并清除订阅；视图停止只使用前者，避免误删工程数据。

过期请求返回 `code: TOSAMPOOL_STALE_RENDER`。视图把它当作取消，而不是错误。直接调用工作区的宿主需同样区分此码。新的文档修改由原订阅／调度器触发下一次绘制，不再让旧请求自动递归使用新工程、旧时间完成绘制。

`workspace.renderTo(..., {preview, isCurrent})` 的可选 `isCurrent()` 是宿主提交许可，只在正式绘制前检查，不传给 GPU／参数求值层；它不依赖 DOM。当前 Runtime renderTo 是同步绘制，检查与实际绘制之间不会被其它 JS 操作穿插。若未来 Runtime 异步提交，需要另建输出表面和提交门禁，不把当前保护泛化为异步 GPU 完成提交机制。

素材描述未变的普通参数修改继续复用已解析素材，不因每次拖动重复解码。同一素材请求并发解析被去重；失败后可以重试。来源版本链仍未完全审计，**没有添加 sceneSourceVersion**。

## 实际验收

通过的定向测试：

- `node tests/v4-workspace-lifecycle.mjs`：A 后完成不覆盖 B；同请求去重；普通修改／替换释放；过期绘制取消；异步创建后失效释放；关闭幂等；解析失败重试。
- `node tests/vnext-workspace.mjs`：旧工作区合同通过。
- `node tests/vnext-runtime-adapter.mjs`：适配器合同及单次绘制成功／异常释放通过。
- `node tests/vnext-scene-mutation.mjs`：撤销／重做快照合同通过。
- `node tests/v4-backend-capabilities.mjs`、`node tests/runtime-vnext-smoke.mjs`：既有能力与 Runtime smoke 通过。
- `node tests/browser/v4-product-flow.mjs`：真实页面工具栏绘制与 Canvas 选择通过。
- `node tests/browser/v4-editor-player-lifecycle.mjs`：真实页面点击结构树“独”、退出隔离；实际变更控制器撤销／重做；修改尺寸及替换工程；测试中通过工作区显式请求 GPU 绘制，然后释放及停止视图。

最后一次浏览器生命周期结果：9 个受跟踪 Player 创建、9 个释放，无重复释放；撤销／重做 X 值为 5／23；四轮 GPU 阈值绘制各创建 5 张存活纹理，释放后均为 0，结束时存活纹理 0。默认页面预览仍是 CPU，GPU 请求仅来自夹具。

夹具的首轮因误用结构树选择器 `data-action` 超时，改为实际 `data-v4-action` 后重跑通过；没有因此改动产品 DOM。

这些是正确性和显式资源释放计数，不是性能／浏览器总内存基准。不声称 GL 上下文对象已经被垃圾回收，不声称 Canvas／驱动内存已测量，也不声称长时、休眠、跨设备或 Tauri 已通过。异步素材污染使用受控延迟单元测试，尚非真实文件导入的完整浏览器竞态测试。

## 未完成项与下一批

1. 正式编辑器显式 CPU／实验 GPU 入口、实际后端与回退原因展示。
2. 编辑器完整 render、素材／Player 准备、Runtime 调用、调度与设备计时口径分离。
3. 真实素材异步完成、完整 CPU/GPU 画质、故障恢复、连续资源与性能验收。
4. 能力预算估算器、具体生成器宿主声明登记；对象 GPU 试点仍未实施。
5. 导出、Tauri 和默认 Auto 均未改动、未验收。

无需另一会话同步 Inspector 参数。本批新增的是工作区资源接口与取消码；使用工作区单次绘制／异步解析的宿主，应处理过期取消，不能拿过期结果提交到新工程。
