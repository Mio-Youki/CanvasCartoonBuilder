# V4 效果四层落点台账

本台账防止一个效果只停留在 Inspector，或只存在于 Runtime。新增效果必须先补一条记录；四层都完成并通过 `npm run verify:v4` 后，才可从“实验”变为“可用”。

| 效果 ID | Registry | Inspector | Runtime | 测试 |
| --- | --- | --- | --- | --- |
| `projection` | `effect-registry-vnext.js` | 成样 / 加样卡片 | `runtime-src/vnext/65-decorate-effects.js`（构建为 `home-scene-vnext.js`） | 状态合同、Runtime smoke |
| `outline` | 同上 | 成样 / 加样卡片 | Runtime decorate-back；默认不纳入投影 Alpha，可由 `包含投影` Step 开关恢复合成轮廓 | 状态合同、Runtime smoke |
| `tint-overlay` | 同上 | 加样 / 场景叠加卡片 | Runtime decorate | 状态合同、Runtime smoke |
| `texture-overlay` | 同上 | 加样 / 场景叠加 + 图样字段 | Runtime pattern 模块 | 图样 UI 合同、Runtime smoke |
| `inner-light` | 同上 | 加样卡片 | Runtime decorate-inside | 状态合同、Runtime smoke |
| `outer-light` | 同上 | 加样卡片 | Runtime decorate-back | 状态合同、Runtime smoke |
| `color-grade` | 同上 | 成样 / 场景叠加参数 | Runtime formation-color | 状态合同、Runtime smoke |
| `color-map` | 同上 | 采样卡片 | Runtime sample-color | 状态合同、Runtime smoke |
| `threshold` | 同上 | 采样卡片 | Runtime sample-color | 状态合同、Runtime smoke |
| `offset-sampling` | 同上 | 采样卡片 | Runtime sample-coordinate | 状态合同、Runtime smoke、浏览器对象流 |
| `halftone` | 同上 | 采样卡片 | Runtime sample-pattern | 状态合同、Runtime smoke、图样 UI 合同 |
| `uneven-sampling` | 同上 | 采样卡片 | Runtime sample-coordinate | 状态合同、Runtime smoke |
| `masked-inner-light` | 同上 | 场景叠加卡片 | Runtime scene-overlay | 状态合同、Runtime smoke |

## 新效果记录模板

```md
## `<stable-id>` / 用户可见名称

- [ ] Registry：作用域、阶段、默认管线位置、参数范围、Step / Linear、成本等级、别名。
- [ ] Inspector：接入效果卡；复用颜色 / 图样 / 蒙版控件；首次启用即时展开；支持撤销。
- [ ] Runtime：固定时间、编辑器预览、导出走同一个声明式实现；说明与蒙版、透明度、混合方式的顺序。
- [ ] 测试：Registry 边界、Inspector 首次启用和删除、固定帧、浏览器流程；把本次缺陷写为回归断言。

性能预算：A / B / C
禁用或降级条件：
与已有效果的兼容方式：
```

## 共享 UI 模块

- `classic-v4-color-control.js`：颜色与颜色透明度控件。
- `classic-v4-pattern-field.js`：纹理填充和图样设置。
- `classic-v4-inspector-effect-card.js`：效果卡片外壳、启用开关、焦点标记与动态折叠按钮。
- `classic-v4-inspector-effect-parameters.js`：参数可见性、专用编辑器选择与颜色透明度去重规则。
- `classic-v4-overlay-pattern-codec.js`：纹理叠加效果参数与通用图样数据的双向转换。

新的 Inspector 代码不得再复制颜色、图样或效果卡片状态的 DOM 结构；应优先扩展以上共享模块。
