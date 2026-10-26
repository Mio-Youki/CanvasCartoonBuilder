# GPU 基础设施第12批：修复对象CPU前处理稳定性

本批不增加GPU效果、扩大准入或修改默认后端。先解决第11批扩大对象覆盖的CPU基准阻塞。

## 根因与改动范围

首次CPU与重复CPU的规范化文档、解析素材、时间相同。新增独立浏览器测试借由测试专用模块替换钩子，在内容、蒙版、加样、采样后复制到独立Canvas再读取；不直接读取工作Canvas，不向产品增加诊断DOM或状态。

半透明图片＋外扩图元＋椭圆蒙版＋30°投影＋描边＋阈值的组合：内容／蒙版无差，加样输出最大预乘RGB差27、Alpha77，最终RGB96／Alpha22。单独投影、单独描边和0°投影组合无差。

`outline`遗留近邻采样状态；下一帧`tintedSurface`从池中取得该画布后，没有明确设置滤波方式。其小数投影复制因而不同于新画布首次绘制。修复仅在`tintedSurface`复制前设置`imageSmoothingEnabled=true`，恢复首次绘制语义；无整池重建、无效果近似、无参数范围变化。

文件：

- `runtime-src/vnext/65-decorate-effects.js`，及标准生成的两个Runtime分发。
- `tests/browser/v4-object-prefix-stability.mjs`：4组合×4同刻绘制，逐阶段稳定性；测试钩子断言真实安装且5个阶段均被采集，避免空断言。
- `tests/browser/v4-editor-object-gpu-pilot.mjs`：新增真实编辑器CPU首帧／持续帧必须完全一致的断言。
- `package.json`：将稳定性测试纳入`verify:gpu-object-pilot`。
- 本记录及原阻塞状态说明。

## 验收证据

- [修复前逐阶段控制](v4-object-prefix-stability-2026-10-25-result.json)：原始差异可重复。
- [修复后逐阶段结果](v4-object-prefix-stability-2026-10-25-fixed-result.json)：全部阶段最大预乘RGB／Alpha差0。
- [修复后真实编辑器](v4-editor-object-gpu-pilot-2026-10-25-prefix-fixed-result.json)：CPU新Player／持续Player差0；试点完整CPU回退／持续CPU差0。支持的GPU阈值画面、时序seek、撤销重做、故障回退均通过；释放后纹理0，页面错误0。

Windows／Edge156.0.4314.42，本地单设备。该专项是确定性测试，不以本批短测重新宣称性能收益。第11批性能数字仍只描述当时单设备、限定负载。

最终检查通过：`npm run verify:gpu-object-pilot`（含新增CPU逐阶段与真实编辑器断言）、`npm run verify:gpu-contract`、`tests/runtime-vnext-smoke.mjs`、Runtime生成物校验与改动文件语法检查。未运行全量产品测试。

## 合同与下一步

Registry、Inspector、时序声明、JSON、图样合同均无修改；另一会话只需避免回退此复制入口的显式滤波设置。默认CPU、导出、Tauri行为保持原样。

修复CPU基准不等于复杂前处理的GPU链已验收；第11批`unsupported-object-decorate-prefix`／调色拒绝仍保留。下一批先针对投影＋描边＋阈值做GPU实际处理（而非回退）对照，包含半透明、边界、不同顺序与失败释放，再考虑按已测试组合逐步放行。其他采样效果、多对象GPU、转场及跨设备尚未完成。
