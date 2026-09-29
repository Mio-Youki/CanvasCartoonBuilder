# V4 效果改动测试合同

这份清单用于 Registry、Inspector、Runtime 同时涉及的效果改动。它不是发布说明，而是每次修改前后的最小验收标准。

## 三层合同

1. **声明层**：`editor/effect-registry-vnext.js` 只定义稳定 ID、默认值、参数范围、显示名称、阶段和运行时支持度。
2. **编辑层**：Inspector 必须把声明层的值准确写入工程；共用控件不能为同一语义建立第二套字段。
3. **渲染层**：`home-scene-vnext.js` 必须在固定时间渲染中使用这些字段，且不依赖编辑器 DOM 状态。

## 每次跨层改动的必跑项

```text
node --check tools/editor/effect-registry-vnext.js
node --check tools/editor/classic-v4-inspector-controller.js
node --check tools/home-scene-vnext.js
node tools/tests/vnext-effect-state.mjs
node tools/tests/vnext-runtime-adapter.mjs
node tools/tests/runtime-vnext-smoke.mjs
node tools/tests/v4-pattern-ui-contract.mjs
node tools/tests/browser/v4-object-effect-flow.mjs
```

## 图样回归重点

- 纹理填充与纹理叠加共享：类型、图样大小、格距、排列、错列偏移、起始偏移、旋转和颜色语义。
- 点形在 `circle / triangle / square / pentagon / hexagon` 间切换后，不能回退为矩形。
- `起始偏移 X/Y` 始终为 0–1 的单元比例；动态图样内部可转为像素位移，但不能改变存档字段语义。
- 不展示没有完整渲染与时序路径的入口；“图案运动”重新开放前，必须先增加浏览器可视夹具。

## 修改原则

一次功能改动应同时提交：Registry 声明、Inspector 写入、Runtime 读取、至少一个失败案例的回归断言。若只能完成其中一层，应显示“未接通”，不能作为可用控件公开。
