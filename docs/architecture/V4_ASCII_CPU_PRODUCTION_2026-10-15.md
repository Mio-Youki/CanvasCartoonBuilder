# ASCII CPU 分析优化：正式落地与交接

## 本轮边界

后续更新：Windows测试进程已恢复，受控复测记录了Intel UHD620设备。独占CPU参考／优化对照P95分别为640p 73.1／20.2ms、720p 149.6／52.0ms、1080p 351.6／113.5ms（640p此处指640×360）。JSON已更新为这次带设备信息的数据。此后[可选GPU分析](V4_ASCII_GPU_PRODUCTION_2026-10-15.md)也已落地；下文“没有迁入GPU”描述的是CPU落地这一历史步骤，而非最新Runtime的完整状态。

执行边缘实验计划第1步：保真 CPU 分析与选字优化。没有迁入 GPU DoG／投票，没有采用全分辨率检测，没有改变参数、默认值、Step 轨道、处理顺序、Inspector 或字体协议。

正式路径：原 Canvas 分析／代表 Alpha → 优化 CPU DoG／方向／选字 → 既有 GPU 字形合成（不可用则既有 CPU 最终绘制）。因此“CPU分析优化”不等于强制整个效果仅用 CPU。

## 四层落点

| 层 | 修改 |
| --- | --- |
| Registry | 无；既有参数、Step、场景作用域保持 |
| Inspector | 无；无新增输入，另一 UI 分支无需同步控件 |
| Runtime | 新增 `runtime-src/vnext/68c-ascii-analysis.js`；构建顺序在 `68b-ascii-mapping.js` 前。后者调用独立分析／选字函数，最终字形绘制不变 |
| 验证 | 新增 `tests/browser/v4-ascii-cpu-parity.mjs`，接入根目录 `scripts/verify-v4.mjs`；旧算法冻结于 `tests/fixtures/ascii-reference-v1.js`，不进入产品构建 |

已生成 `home-scene-vnext.js` 和 `runtime-vnext-inline.js`，编辑器与导出使用同源实现。

## 算法与资源

- 高斯核只计算一次；两个尺度合并遍历，共享输入读取，保留原横／纵 Float32 舍入。
- 方向判定使用梯度比例替代 atan2，不改变四方向定义与多数票平局顺序。
- 复用亮度、两个水平结果、DoG、票数、方向、颜色与索引数组；DoG 使用二值 Uint8。
- 每个 SurfacePool／Player 仅保留一个边缘尺寸和一个选字尺寸，不建立无限尺寸缓存。尺寸改变替换旧工作集。
- `SurfacePool.clear()`／Player 清理移除缓存引用；再次调用会重新建立。函数返回的借用数组仅供同步 apply 消费。
- 新增只读 `asciiAnalysis.statistics(pool)`，报告数组字节与分配次数，不暴露可变缓存。不是浏览器实际堆内存或 GPU 显存统计。

## 已完成验证

1. 新对照夹具40组：照片／细线图形／文字／半透明素材，各5组参数，CPU和GPU最终字形绘制分别与冻结旧算法严格逐字节相等。覆盖边缘开关、灵敏度及阈值端值、浮点比例、采样格、反相、拉伸、颜色Alpha及烘焙自定义字形。
2. 重复8帧：edge／cell分配次数不增长；两个pool交错运行无污染；透明帧无旧单元残留；clear后字节和计数归零，再绘制各分配一次。
3. 原ASCII浏览器流程通过：Inspector、撤销、独立Step、内嵌字体、项目恢复、自包含HTML导出、透明末端单元、CRT与采样格。
4. 全量 `node scripts/verify-v4.mjs` 已全部通过，包含效果轨独立启停、蒙版、场景／Module与素材会话隔离等已有流程。

冻结参考仅存在测试目录。原六候选性能实验改为从该参考构建，避免依赖正式函数内部的旧字符串结构；本轮未重新运行全部六候选。

## 性能记录与不能宣称的事项

可选执行 `node tools/tests/browser/v4-ascii-cpu-parity.mjs --benchmark`：同一照片轻微运动、每尺寸预热12帧／采样60帧，输出后进行1像素读回同步。JSON记录在同目录 `v4-ascii-cpu-production-benchmark.json`。这不是完整编辑器／桌面呈现帧时间。

本轮首次记录（最终字形GPU，CPU分析）：

| 尺寸 | 冻结参考 P95 | 正式优化 P95 |
| --- | ---: | ---: |
| 640×360 | 64.6ms | 23.6ms |
| 1280×720 | 228.0ms | 67.0ms |
| 1920×1080 | 472.6ms | 130.0ms |

上述测量期间也启动了其他回归，且未记录GPU renderer；它显示同次测试的优化趋势，但不具备发布性能基准的环境控制，不能与前轮Intel UHD620实验直接比较。已给测试补充renderer记录，但随后Windows新进程启动失败（CreateProcessWithLogonW 1909），正常权限复测未完成。因此不能声称正式版本已达到27.2ms、稳定30fps或Tauri设备验收完成。首次JSON保留以便审计，不伪装成受控复测。

## 后续顺序

1. 恢复测试环境后，独占运行本轮benchmark，确认renderer并更新受控数据；检查实际编辑器动态P95。
2. 再推进低分辨率GPU分析，必须具备Float扩展检测、context lost回退优化CPU、共享资源释放及输出保真测试。
3. 扩大720p／1080p、字体、蒙版、CRT组合及多Player矩阵；最后做Tauri实际设备与导出验收。
4. 全分辨率边缘继续独立研究画质，不默认替换现有外观。
