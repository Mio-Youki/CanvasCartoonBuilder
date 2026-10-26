# 对象前处理一致性待办：新建 CPU 参考与持续 CPU 预览不同

日期：2026-10-25。状态：**已定位并修复CPU采样状态泄漏；第13批已验收并放行Canvas投影／描边前处理＋GPU末端阈值。其他加样和调色仍回退。** 下文保留发现时的证据与排查计划；当前准入以对象试点合同为准。

## 第12批修复结论

逐阶段快照表明内容和蒙版均一致，首次差异发生于decorate输出（预乘RGB27、Alpha77），最后被阈值放大。`outline`会将池内画布的`imageSmoothingEnabled`设为false；`tintedSurface`复用该画布，执行小数位移投影时没有恢复默认true。因而绘制结果取决于上一位池使用者。它与第9批内容绘制入口的状态泄漏发生在不同位置。

最小修复：`65-decorate-effects.js`的`tintedSurface`在复制源Alpha前显式设置`imageSmoothingEnabled=true`，保留首次绘制语义，不修改投影偏移、描边算法、池结构或GPU内核。

修复后4种组合各4次同刻绘制，各阶段差0；真实编辑器新建CPU参考与持续CPU差0（此前96／22），试点完整CPU回退与CPU差0。前后报告、测试方式与未完成项见 [第12批](V4_GPU_INFRA_BATCH12_2026-10-25.md)。原第11批报告作为历史证据保留，不覆盖。

## 可重复证据

执行 `node tests/browser/v4-editor-object-gpu-pilot.mjs --write-report --report-tag=prefix-investigation`。夹具代码内的`decorated`场景使用自生成PNG：半透明渐变椭圆、图片外附加椭圆图元、对象椭圆蒙版、投影与描边、最后阈值。数据无外部图片或服务器依赖。

相同文档与时刻下：

- 以`EditorVNextRuntimeAdapter.create`新建CPU参考、单次绘制，对持续CPU编辑器预览：最大预乘RGB差96，Alpha差22。
- 在编辑器切回CPU仍有该差异，所以不能解释为GPU阈值计算误差。
- 将对象试点完整回退为原CPU链后，与持续CPU编辑器本身对照：差0。
- 不含该加样前处理的图片、图元＋蒙版、父组混合、Step／Linear用例未出现本轮差异。

这证明“新建参考与持续预览不一致”，但尚不能仅凭此断言具体是哪一处Canvas状态、表面复用、归一化或预览缓存导致。不要把第9批已修的imageSmoothing状态泄漏直接当成本问题的根因。

证据报告：`v4-editor-object-gpu-pilot-2026-10-25-prefix-control-result.json`保存首次控制；最终收窄报告的`prefixControl`继续保留控制读数。测试没有把96／22纳入允许误差，也没有将它算作GPU成功用例。

## 本轮保护与下一步

对象试点只接受无激活加样、无非零调色四轴的前处理；拒绝原因分别为`unsupported-object-decorate-prefix`与`unsupported-object-formation-prefix`。正式CPU链、效果参数与操作顺序不变。

后续独立定位应：

1. 对持续CPU Player与新建CPU Player使用完全一致的已解析素材和规范化文档，记录文档修订及规范化值，而非只比较画面。
2. 逐阶段捕获源内容→蒙版→投影→描边→阈值的独立快照，比较首次与重复绘制；不得直接反复读取持久产品Canvas并改变其backing行为。
3. 核对离屏池借出／归还、上下文状态与源／目标别名，再决定最小修复；避免为通过测试每帧重建全部Canvas。
4. 修复后同时验收CPU稳定性和GPU一致性，才能放开该对象试点条件。

这是对象GPU扩大覆盖的阻塞项，不是全部对象阈值试点或既有场景GPU的失败。另一个会话若改动蒙版／加样组件或渲染入口，请保留此夹具，不以组件重排掩盖运行差异。
