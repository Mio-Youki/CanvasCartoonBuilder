# Runtime 合同与宿主边界

## 1. 唯一 Runtime

`tools/home-scene.js` 是工具侧唯一规范 Runtime。编辑器必须优先加载同目录文件，测试页的 `runtime-inline.js` 只能由生成脚本机械同步；游戏/站点 `../public/home-scene.js` 是按版本升级的消费端和旧目录兜底。

Runtime 暴露：

```js
HomeScene.apiVersion
HomeScene.capabilities
HomeScene.createRuntime(scene)
HomeScene.renderTo(target, t, options)
```

编辑器启动时必须检查 `apiVersion` 和所需 capability。Scene 中出现某能力但 Runtime 未声明支持时，应阻止静默降级并给出错误。

## 2. 确定时间合同

- 输入由 Scene、资源、画布尺寸、`t` 和 seed 完整决定。
- 同一输入在预览、测试页、固定时间渲染和格式导出中应产生同一帧。
- 播放器只提供时钟；插值、动画、粒子、Sampling Motion、蒙版、FX 与过渡均由 Runtime 求值。`capabilities.samplingMotion=2` 表示 Runtime 支持共享 `field` 与 Alpha `edge`；编辑器不得把只声明 v1 的 Runtime 当作已支持新版控制器。
- 编码器只消费帧，不得改变场景时间语义。

## 3. 性能分级

Canvas 尺寸增大时，性能瓶颈不是 JS 文件大小，而是每帧处理像素数与离屏合成次数。效果必须标注成本类别：

| 等级 | 典型操作 | 原则 |
|---|---|---|
| A | `drawImage`、路径绘制、原生 transform/filter | 可每帧执行 |
| B | 局部离屏、缓存图块、蒙版包围盒处理 | 限定区域并复用画布 |
| C | `getImageData`、色板/阈值/半调、全屏多遍处理 | 降采样、量化时间步、缓存 |
| D | 多个全尺寸 C 级效果串联 | 预览降质或明确警告 |

统一计算工作像素：`workPixels = Σ(area / pixelDiv² × passes)`。后续性能面板应报告该估算值、实际帧时间、缓存命中与离屏画布峰值，而不是只报告场景分辨率。

## 4. 预览与导出质量分离

- Scene 保存创作参数，不保存“当前机器预览质量”。
- 预览 Adapter 可以通过 `setPreviewOptions({pixelDivMultiplier})` 临时降低 C 级像素处理中间缓冲区的工作分辨率或帧率，但不能改变循环时长、seed 和段边界；该选项不属于 Scene schema。
- 固定时间导出默认使用作品质量；允许用户显式选择快速预览导出。
- Sampling Motion、色板和阈值等 C 级效果应优先在缩小后的工作画布处理，再最近邻放大。

## 5. 浏览器与 Tauri Host Adapter

Tauri 不会自动加速 Canvas；它仍运行在系统 WebView 中。封装价值主要是稳定文件权限、项目目录、资源重连、后台任务和原生编码器。编辑器核心不得直接散落调用浏览器文件 API或 Tauri command，应经过宿主接口：

```ts
interface HostAdapter {
  kind: 'browser' | 'tauri';
  capabilities: HostCapabilities;
  openText(options): Promise<{ name: string; text: string } | null>;
  saveFile(options): Promise<{ mode: string; name: string } | null>;
  pickAssets(options): Promise<File[]>;
  readDataUrl(file: File): Promise<string>;
}
```

浏览器实现 `editor/host-adapter.js` 已接管场景打开/保存和素材选择；Tauri 可在加载前注入同合同的 `window.__PATCHARIUM_HOST__`。真实路径、`assets/`、原图处理配方、批量导出和按需编码仍是桌面实现范围，详见 [HOST_ADAPTER.md](HOST_ADAPTER.md)。Scene/Runtime 不依赖任一宿主实现。

## 6. 推荐性能演进

1. ✅ 已加入 Runtime 绘制 P95、目标帧率、实际像素遍数、Sampling Motion 帧缓存命中与最大单张离屏面积；后续再扩展到所有缓存及总离屏内存峰值。
2. 🚧 阈值与网点叠加已共享一次像素读取；全局与局部 C 级效果仍需继续收敛为可复用的降采样处理链。
3. 🚧 Sampling Motion 与静态粒子精灵已有独立缓存和实体级失效入口；仍需把脏标记扩展到全局纹理、蒙版与其他派生资源。
4. 局部效果严格按蒙版包围盒处理；缓存画布只扩容、不逐帧创建。
5. ✅ 预览 Adapter 已提供 Auto / Full / Draft 三档：Draft 对色板、阈值、网点与局部调色等 CPU 像素循环使用 2× 降级；`renderTo` 默认强制 1×，且设置不写入 Scene。
6. 数据与 UI 稳定后再接入 Worker + OffscreenCanvas；Tauri 可选原生编码器，但 Runtime 保持 Canvas2D 基线。
