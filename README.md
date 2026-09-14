# Patcharium / 拼好景

> Lightweight Canvas loop-scene editor · 当前为 **Alpha 源码版本**

Patcharium 把图片、矢量图元、粒子、蒙版、效果和时间组织成可持续运行的小场景。作品可以保存为自包含 JavaScript，也可以导出 PNG、精灵图、PNG 序列和 GIF。

它不是视频剪辑器，也不要求把高细节图片完全重绘成代码。图片负责细节，Scene 结构负责值得编辑的运动、层级、调色和局部变化。

## 当前能力

- 结构树、Canvas 舞台、Inspector 与上下文时间轴；
- 图片、矢量图元、文字、组、粒子和程序元素；
- Scene/时段可见性、基础 Linear 变换与循环动画预设；
- 几何、Alpha、明度与实时元素蒙版；
- 局部/全局 FX、调色、色板与 Sampling Motion；
- 浏览器与 Tauri 共用同一 Scene、Runtime 和编辑器；
- 自包含 Scene JS、测试 HTML、PNG、Sprite PNG、PNG 序列和 GIF。

预览、测试页和逐帧导出共用同一确定时间 Canvas Runtime。桌面壳只负责文件权限和交付，不改变画面求值；Scene JS 可以脱离 Patcharium 放入普通网页。

## 快速开始

### 浏览器

直接打开 `img2asset-layout-v1.html`，或通过静态服务器访问。浏览器版无需安装依赖；受浏览器文件权限限制，相对图片在生成自包含产物时可能需要人工重连。

### Windows 桌面源码构建

需要 Node.js、Rust 1.77.2+ 和 Tauri 所需的 Windows 构建工具：

```powershell
npm install
npm run verify
npm run desktop:test
npm run desktop:dev
```

生成便携 release EXE：

```powershell
npm run desktop:build
```

当前尚未提供签名安装包或 GitHub Release 下载；桌面端属于已通过核心文件闭环验收的源码发行形态。

## 基本工作流

1. 新建空白场景、由图片建立场景，或打开现有 `GENERIC_SCENE` / 兼容脚本。
2. 从左侧素材区导入并预处理图片，或用舞台工具绘制图元和文字。
3. 在结构树调整选择、分组和顺序；在 Inspector 编辑属性、动态、局部效果与 Sampling Motion。
4. 在底部编排器设置 Scene、显示窗口、属性时段和 FX 时段。
5. 保存 Scene，生成自包含测试 HTML，或导出帧产物。

详细操作与格式差异见 [用户指南](docs/USER_GUIDE.md)。

## Scene 与 Agent

`SCENE_SPEC.md` 是 Scene 字段的唯一合同。高细节静态内容可以使用图片或受控 `program.code`；需要调整的部分应暴露稳定 id、边界、少量参数与编辑器 controls。可编辑不等于每个像素都必须拆成 `rect/poly`。

外部 Agent 工作流分为生成、兼容改写和审稿，不要求把全部编辑器能力一次写进提示词：

- [生成协议](docs/agent/AGENT_GENERATE_SPEC.md)
- [改写协议](docs/agent/AGENT_REWRITE_SPEC.md)
- [Agent Tool Protocol](docs/agent/AGENT_TOOL_PROTOCOL.md)
- [典型案例提示词](docs/agent/AGENT_PROMPT_PLAYBOOK.md)

Agent 协作仍是验证方向，不是“一次提示即可完美重绘”的发布承诺。

## 安全提示

当前 Scene 可以包含 `program.code`，兼容脚本配置也允许 JavaScript 表达式。只打开你自己创建、可信 Agent 生成或已经审查过的 Scene；不要把未知来源的 `.js` 当作无害图片文档。正式面向普通用户发布前，程序元素需要进入受限执行环境，兼容配置解析也需要从动态求值迁移为纯数据解析。

## 项目状态与边界

当前版本可作为开发者和早期测试者使用的完整源码产品：编辑、保存、独立运行和主要帧导出链路已经成立。但它还不是面向普通用户的正式发行版，发布前仍缺少：

- 正式图标、截图/GIF、签名安装包和 Release 流程；
- CONTRIBUTING 与安全报告流程；
- Project manifest、可重连 `assets/`、处理配方和个人素材库；
- UI 图标及 Inspector 信息层级的最终收口；
- APNG/WebP/WebM/MP4、通用关键帧曲线和 redo；
- 第三个粗糙拼贴案例及更完整的 L4 视觉回归。

当前优先级见 [PLAN](PLAN.md)，可验证边界见 [验收矩阵](docs/architecture/ACCEPTANCE_TEST_MATRIX.md)。

## 仓库地图

```text
img2asset-layout-v1.html   当前唯一编辑器入口
home-scene.js              Canvas Runtime 规范源
runtime-inline.js          由 Runtime 机械生成的测试页镜像
editor/                    编辑器内核模块
src-tauri/                 Tauri Host
examples/                  可导入 Scene；图片资产默认不提交
scripts/                   构建与只读校验
tests/                     浏览器、Runtime 与 Host 验收
docs/                      用户、产品、Agent、架构和设计文档
```

`img2asset.html` 是冻结的历史入口，不再同步新功能。

## 验证

```powershell
npm run verify
npm run desktop:test
```

自动检查覆盖 Runtime/内嵌镜像、Scene 合同、Sampling Motion、Host command、序列化与主要架构接线。自动测试不能替代主观视觉审稿；测试口径必须标明 L0–L5 / H0–H3 层级。

完整文档入口见 [docs/README.md](docs/README.md)。

代码与文档采用 [MIT License](LICENSE)。仓库未跟踪的本地参考图、用户素材和实验资产不因该许可证获得授权。
