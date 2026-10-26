# GPU 基础设施第13批：投影／描边前处理后的对象阈值

状态：显式对象阈值试点扩大一个经过验收的前处理范围；默认CPU不变。无新Shader，无Inspector参数或时序协议变化。

## 实际覆盖

```text
原Canvas对象内容
→ mask / decorate 按作品既定顺序执行
→ decorate仅允许投影／描边
→ 一次来源上传 → 原GPU阈值内核 → Canvas胶囊
→ 原对象Alpha×父组Alpha、混合与图层合成
```

`sample`仍需最后，有效格1、Alpha keep、一个阈值、每帧最多首个合格对象、现有像素／纹理预算。不是把投影／描边放到GPU；Registry不会返回它们的object GPU声明。其前处理成本已计入完整Runtime调用测量。其他激活加样与非零调色仍完整CPU回退；不支持的顺序不会被重新排列。

## 改动文件

- `runtime-src/vnext/69d-object-gpu-pilot.js`：由拒绝全部加样改为仅接受投影／描边的CPU前处理，其余预算不变。
- `runtime-src/vnext/69b-backend-capabilities.js`：沿用threshold对象声明，明确CPU准备与受限条件；不是新增效果目录。
- `editor/v4-preview-backend.js`：仅更新实际准入诊断文字，不改变控件位置。
- `tests/v4-object-gpu-pilot.mjs`：白名单、其他加样／调色拒绝及“CPU前处理≠GPU实现”断言。
- `tests/browser/v4-editor-object-gpu-pilot.mjs`：27组组合画面对照、前处理Step、带加样的修改／undo／redo及故障回退；补充含前处理的独立性能组。
- 标准Runtime生成物与本合同相关文档同步。

## 正确性与生命周期

证据：[最终真实编辑器结果](v4-editor-object-gpu-pilot-2026-10-25-decorate-final-result.json)。9种组合×3时刻（含往返seek）共27组：投影、描边、两者组合、包含投影的描边、宽16描边、加样先于蒙版、父透明度、screen／multiply、旋转斜切。最大预乘RGB和Alpha差均0；每组实际handled=1，不以CPU回退冒充GPU通过。

额外对照：父组multiply，阈值和投影参数Step，位置／旋转Linear及seek；修改后无新增上下文，撤销／重做释放并正确重绘。注入绘制失败、丢失上下文、无WebGL时，带前处理对象仍完整CPU回退且画面一致。

小／大对象、额外采样效果、顺序不符、过渡项目、内光效前处理、调色均拒绝；无新纹理分配。结束活动纹理0、页面错误0。

## 性能

Windows、Edge156.0.4314.42 headless、1600×1000视口，Intel UHD620／ANGLE D3D11。相同合成透明PNG，Full预览；每组4帧预热＋24测量，首次独列。未使用设备timer query，不把主线程调用当成GPU执行时间或播放调度间隔。

| 场景 | CPU Runtime P95 | 试点 Runtime P95 | CPU编辑器P95 | 试点编辑器P95 |
| --- | ---: | ---: | ---: | ---: |
| 单阈值 | 13.0ms | 3.0ms | 13.1ms | 3.1ms |
| 投影＋描边＋蒙版＋阈值 | 24.3ms | 6.1ms | 24.5ms | 6.3ms |

带加样首次Runtime：CPU22.9ms，试点33.0ms；含Player准备的首次编辑器绘制CPU32.6ms，试点46.0ms。热帧受益并不消除初始化成本。

组合胶囊来源262052像素，显式纹理4258368字节；热帧一次来源上传、两遍GPU处理，一个上下文。数值不包含CPU Canvas、浏览器／驱动隐式内存。单设备短测不承诺任意作品或设备的收益。

## 验收命令与同步

已通过：Runtime生成物检查、对象准入合同、预览策略测试、真实编辑器组合夹具、CPU逐阶段稳定性、Runtime smoke、`verify:gpu-contract`和所改代码的diff空白检查。未完成全产品、导出／Tauri和跨设备验证。

另一会话无需新增控件、参数或动画公式；保留显式后端选择与实际执行诊断。当前合同只扩大CPU前处理准入，不应给投影／描边或图样生成器标注“GPU加速”。No／Step／Linear仍来自统一frame求值。

下一步：优先在对象管线验证已有杂色／边缘色散内核及完整采样链准入，继续保持一次上传与整链回退；有效格>1的坐标校准和预算需独立验收。不能由本批推导所有加样／采样已支持。
