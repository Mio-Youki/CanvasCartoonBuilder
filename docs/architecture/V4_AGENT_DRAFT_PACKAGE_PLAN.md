# v4 Agent Draft Package 与实验执行计划

状态：**D0、D1 已完成；D3 正在完成 C1 的载体对照。**

本计划将两条容易混淆的工作线连接在一份可验证产物上：

```text
Agent Skill / 实验线                     产品内 Agent / Host 线
─────────────────                        ─────────────────────
隔离 Agent 生成候选                       编辑器提出 propose / build 请求
      │                                             │
      └──────────── Draft Package v1 ──────────────┘
                            │
                  校验、预览、预算、人工确认
                            │
          编辑器应用 / 导出 runtime.js 与 embed.html
```

Runtime 永远不调用模型、不读取 Agent 工作目录、不保存密钥。它只渲染已校验的 v4 Scene 与明确受信任的项目 Module。

相关输入协议：[Agent Context Pack](V4_AGENT_CONTEXT_PACK_PROTOCOL.md) 与 [创作方向](V4_AGENT_CREATIVE_DIRECTION_PROTOCOL.md)。前者冻结 Agent 能见的 Brief、载体地图、工程骨架与质量门槛；后者冻结构图不变量与视觉自检点。两者都不把完整编辑器状态或 Legacy 细节作为提示上下文。

## 1. 当前基线

已完成：

- 创作对话：一句话意图 → 一个结构性追问 → 方向卡；
- Browser Bridge：带 `requestId` 的 `propose / build` 宿主事件；
- 内存临时 Scene：摘要、预计变化、缩略图、确认应用、撤销；
- 编辑器已可接收 `Draft Package v1` 文件集合：先校验项目与载体报告，再还原为临时草稿；
- CLI 结构校验与浏览器 Runtime smoke 均有最小雪夜小木屋夹具；
- 三类实验的案例、控制组、评分与证据清单。

尚未完成：

- 隔离 Agent 生成的图片、字体、Module 源与 Scene 作为一个项目草稿交付；
- 隔离 Agent 对真实 run 目录的首次正式交付与人工审阅；
- Codex/CLI Runner 或 Tauri Host 的真实 Agent 调用；
- C1/C2/C3 的正式可复现实验。

## 2. Draft Package v1

一个草稿包是**完整项目的候选版本**，不是任意补丁，也不是导出的运行文件。

```text
draft/
├─ draft.manifest.json       # 草稿标题、摘要、预计变化、文件入口
├─ project.tosampool.json    # tosampool-project/v1；内含 v4 Scene
├─ assets.manifest.json      # 由项目包构建器写入
├─ assets/                   # 图片、序列、字体等项目副本
├─ modules/                  # 项目级 Module 源与 Manifest
├─ carrier-report.json       # 载体、公开参数、冻结内容、预算
├─ preview.png               # 可选；只用于审阅
└─ metrics.json              # 校验器写入；非 Agent 自报真相
```

`draft.manifest.json` 的格式为 `tosampool-agent-draft/v1`，必须包含：

- `draftId`、`title`、`summary`；
- `changes[]`：面向人的预计变化；
- `project`：固定为 `project.tosampool.json`；
- `carrierReport`：固定为 `carrier-report.json`；
- 可选 `preview`、`metrics`。

`carrier-report.json` 使用 `tosampool-carrier-report/v1`，至少声明 `objects[]`：每项有 `id / semantic / carrier / editable / frozen / budget`。它用于审阅，不替代 Scene 真相。

## 3. Tauri 前后的边界

| 能力 | 当前 Browser / Codex 阶段 | Tauri 后 |
| --- | --- | --- |
| 对话与方向卡 | Bridge + 测试宿主 | IPC + 正式 Agent Host |
| 草稿生成 | Codex/CLI 写到 `.local/agent-runs/<run-id>` | App Data 临时目录 |
| 项目草稿 | ZIP 或手动选择的目录 | 原生目录与原子写入 |
| 素材 / Module | 在包内读取、手动导入 | 自动复制、重连、清理 |
| 模型凭据 | 不保存于网页 | 系统安全存储 |
| 复用素材库 | 暂不作为实验前提 | Settings + 本地持久化库 |

因此，**Skill 质量实验不等待 Tauri**。Tauri 只替换 Host 的存储与权限实现；不改变 Draft Package、验证器、编辑器 UI 或 Agent 输出协议。

## 4. 分阶段执行与合并点

| 阶段 | 交付 | 是否依赖 Tauri | 合并条件 |
| --- | --- | --- | --- |
| D0 | Package 合同、静态验证、测试夹具 | 否 | 无路径穿越；Scene/报告入口有效 |
| D1 | CLI Draft Runner、静态/Runtime smoke、固定帧与 metrics | 否 | 一个草稿包可独立验证、导出并审阅 |
| D2 | 编辑器导入 Draft Package、预览、应用到当前项目/丢弃 | 否 | 应用前无项目变化；应用可撤销 |
| D3 | C1/C2/C3 正式 run 与 Skill 迭代 | 否 | 每例保留 prompt、包、指标、审阅 |
| D4 | Tauri Host：原生目录、素材复制、Module 信任、密钥 | 是 | 以同一包通过 D1/D2；无第二套格式 |
| D5 | 内置 Agent 与持久化素材库 | 是 | 失败恢复、权限、设置与项目隔离通过 |

当前已完成 **D0** 与 **D1**：Browser Bridge 和单 Scene 草稿已先行验证；`EditorVNextAgentDraftPackage` 已校验草稿 Manifest、项目入口、载体报告、重复文件与路径穿越；编辑器可接收通过校验的文件集合；CLI 结构检查、固定帧 Runtime smoke、预热后的稳态 P95 指标，以及真实 run 的完整性验证均已有夹具。

D3 的 C1 目前有两条有意保留的对照：

- `c1-snowglobe-semantic`：原生图元/粒子下限。工程通过，但细节与构图尚不足以成为创作质量样例。
- `c1-snowglobe-module`：第一轮 Module 协议试验。它因 Agent 自创了 Draft/Project 格式而**结构失败**；不允许手工修补为成功案例。
- `c1-snowglobe-module-scaffold`：加入 Module 文件骨架后的第二轮。Draft 文件合同已通过，但 Agent 仍自创了 `shape` 与粒子简写；新的静态 Scene 传输校验在 Runtime 前明确拦截它。

这两次失败暴露的是 Agent 输入缺少机器可执行的工程脚手架，而不是 Scene Module 或 Runtime 的缺口。因此下一轮 Context Pack 提供一份经浏览器 Runtime 实测的五文件 Module 草稿骨架，且包含原生图元、粒子 source、可见时段、Scene 转场和 Module 注册范式；其余 Brief、尺寸、时长、素材政策与质量门槛不变。这样下一轮的唯一变量是“有无**完整**的可执行 Scene 脚手架”。

当前可用命令：

```text
node scripts/verify-agent-draft-package.mjs --input <draft-directory>
node scripts/render-agent-draft-package.mjs --input <draft-directory>
node scripts/render-agent-draft-package.mjs --input <draft-directory> --write
node scripts/create-agent-run.mjs --id <run-id> --case <case-id>
node scripts/create-agent-context-pack.mjs --run <agent-run-directory> --subject <intent>
node scripts/verify-agent-run.mjs --input <agent-run-directory>
node scripts/package-agent-draft.mjs --input <draft-directory>
```

第三条会在草稿目录写入 `frames/t0000.png` 至 `t0003.png` 与由 Runtime 生成的 `metrics.json`。`--output <evidence-directory>` 可把这些证据写到独立目录，便于夹具测试而不污染输入草稿。

正式 run 的目录固定如下，运行目录默认留在 `tools/.local/agent-runs/`，不作为产品或 Runtime 输入：

```text
<run-id>/
├─ run.manifest.json  # case、冻结 Skill/模型与状态
├─ prompt.md          # 原始用户意图与必要澄清
├─ context.json       # 可选；冻结的能力地图与 Agent 可见输入
├─ draft/             # Agent 唯一允许写入的 Draft Package
├─ evidence/          # 验证器写入的 metrics 与固定时间帧
└─ review.md          # 人工可读的视觉、可编辑性、预算结论
```

`create-agent-run.mjs` 只创建这个信封，绝不代替 Agent 生成 Scene；`verify-agent-run.mjs` 要求 prompt、草稿、Runtime 证据与审阅文件同时存在。它只有在 `review.md` 写入“结论：通过 / 拒绝 / 需修改”后才报告 `reviewed`；其余情况只报告 `evidence-ready`，防止“只留一个好看的截图”被误当成已完成的可复现实验。

`create-agent-context-pack.mjs` 为实验生成 `context.json`，并把它登记到 run Manifest。新运行使用 `tosampool-agent-context/v2`，其中可包含带角色的参考图列表和冻结画布上下文；历史 v1 run 只作为既有实验记录保留。完整性验证把 Agent 所见的能力地图作为实验输入，而不是口头约定。

### 在编辑器中打开草稿

先在 `draft/` 内选择 **`project.tosampool.json`**，不要选择外层 run 目录。Classic v4 会把 `tosampool-project/v1` 自动识别为单文件项目包，并恢复其内含的 v4 Scene。若需要 ZIP，使用 `package-agent-draft.mjs`，不要用系统的“压缩文件夹”把额外的 `draft/` 父目录包进去；后者会使 `project.tosampool.json` 不在 ZIP 根目录而无法识别。正式项目 ZIP 则由“保存场景”生成。

## 5. Agent 输出回到编辑器

```text
1. 编辑器发 build(requestId, intent, candidate, capabilityManifest)
2. Host 创建 run 目录，不触碰当前项目
3. 隔离 Agent 只在 run 目录写 Draft Package
4. 验证器检查结构、素材引用、Module Manifest、预算、Runtime smoke
5. Host 只回传 draftId、摘要、变化、预览、校验结果
6. 用户点击应用后，编辑器读取通过校验的包并进入撤销历史
```

大素材不应经网页事件重复 base64 往返。Browser/Codex 试验可用 ZIP 或短期 data URL；Tauri 则以 `draftId` 从临时目录读取。未知 Module 在预览或应用前仍须遵守既有“信任并执行”规则。

## 6. 实验纪律

- D1 起，Agent 只写临时 run 目录；不得写当前项目、Runtime 源或编辑器文件；
- 验证器写入 `metrics.json`，Agent 可提供预算但不能伪造结果；
- 第一轮默认“应用为新项目”，不做通用的 Scene 合并；当前项目替换仅用于用户明确确认的草稿；
- 每次正式 run 冻结 Skill、模型、提示、素材、预览档位、固定采样时间；
- Runtime 缺口单列修复并重跑，不在同一实验 run 中临场补代码。
