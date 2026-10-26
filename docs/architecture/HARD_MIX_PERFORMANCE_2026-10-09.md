# Hard Mix 首轮性能实测（2026-10-09）

实现范围：仅 `texture-overlay.blend:'hard-mix'`。依据 Adobe Photoshop 的定义，每个通道以底色值与混合色值之和是否达到 255 得到 0/255，再按图层 Alpha 合成。实现位置为 `runtime-src/vnext/57-hard-mix.js`；其它混合方式继续走 Canvas 2D 原生合成。

测试：Windows 本机 Microsoft Edge headless，脚本 `tests/browser/v4-hard-mix.mjs --benchmark`。用全幅不透明底色与纹理色，比较原生 `screen` 与 CPU Hard Mix；每档各预热 3 次、测 12 次。每个样本都读取完整输出帧，强制 Canvas 完成渲染。表中毫秒数只代表混合步骤及读回，不包含图案生成、其它对象或导出编码；不能直接当作最终编辑器 FPS。

| 画布 | 原生 Screen P50 / P95 | Hard Mix P50 / P95 |
|---|---:|---:|
| 640×360 | 4.7 / 12.5 ms | 14.5 / 25.0 ms |
| 1280×720 | 11.0 / 34.4 ms | 43.1 / 94.9 ms |
| 1920×1080 | 20.5 / 60.1 ms | 94.0 / 169.3 ms |

结论：Hard Mix 在 1080p 全幅连续重绘时仅这一混合步骤的 P50 就超过 12 FPS 的 83.3 ms 帧预算，P95 更明显超标；不宜作为大画布实时默认模式。小对象、静态效果或低帧率输出仍可用。Preview 的 Auto/Draft 可以减小编辑期工作面，但 Full 测试、导出和最终网页运行仍付出全尺寸成本。先保留为明确的实验性选项，不扩展到所有混合入口；若未来要全幅实时使用，需另做 Canvas 原生近似/专用加速路径并进行视觉一致性验证。

来源：[Adobe Photoshop 混合模式定义](https://helpx.adobe.com/uk/photoshop/desktop/repair-retouch/adjust-light-tone/blending-mode-descriptions.html)。
