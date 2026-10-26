# 编辑器操作服务、MCP入口与Harness边界

日期：2026-10-23。执行上一轮确认的方向：暂停继续扩张一次性CLI接线；先统一操作服务、外部Agent工具入口和会话执行器边界，再完成双色放射正式图样交付。本批不调用真实外部模型、不修改用户MCP配置。

## 目标结构

```text
审阅页／编辑器 ── HTTP（当前）／invoke（未来Tauri）── 编辑器操作服务
外部Agent ── MCP／WebMCP ────────────────────────┘
                              ↓
                       持久化任务与结果
                              ↓
                        Harness适配器
                CLI验证入口／App Server／ACP／SDK
```

操作服务管理“做什么”；协议层管理“怎样访问”；Harness负责“谁执行、会话怎样继续”。MCP并非排除项，也不替代持久化任务、模型授权、会话管理和资源交付。

## 本批真实实现

- `host/editor-operation-service.mjs`统一capabilities、任务列表／读取／提交／回答／重试、正式交付读取和浏览器共享回执。现有HTTP接口改为调用该服务，不再把业务定义在HTTP路由里。
- `host/harness-registry.mjs`统一登记、能力报告、执行、关闭；只列出真实登记的适配器。CLI保留作验证入口，不再视作最终持续会话架构。
- `host/editor-mcp-read-adapter.mjs`与`scripts/serve-editor-mcp.mjs`实现真实MCP stdio只读入口，协议固定2025-06-18，UTF-8逐行JSON-RPC。代理连接已授权的本机宿主，复用相同操作服务，不创建第二份任务库。
- 公开四项工具：`tosampool_capabilities`、`tosampool_list_reviews`、`tosampool_read_review`、`tosampool_read_delivery`。它们没有安装、覆盖、发布或启动会话的副作用。
- capabilities明确声明当前Canvas读取／选择读取／场景修改为false；MCP不能发布、不能主动启动当前聊天。不能把接口可用写成已实现完整Remotion式控制。
- 未实现WebMCP浏览器工具注册、App Server、ACP、OpenCode或DeepSeek适配器；未伪造跨Harness配置支持。

## 使用与权限

先启动`node scripts/serve-effect-review.mjs`（默认8780），再让MCP客户端启动：

- command：本机Node可执行文件。
- args：`E:/ProjectDSH/CIEL/tools/scripts/serve-editor-mcp.mjs`。
- 可选env：`TOSAMPOOL_REVIEW_HOST=http://127.0.0.1:8780/`。

脚本只接受127.0.0.1的HTTP本机地址，不接受远程主机、凭据URL或任意路径。授权令牌通过本机引导接口获得，仅用于进程内请求，不写入工具描述或stdout。stdout仅协议消息。当前没有自动注册到Codex，需在客户端受控配置；协议回环测试不等于已经获得用户工具权限。

已启动的旧Node服务没有热重载；代码变更后须重启该服务才有新工具后端，不隐式终止用户正在使用的旧进程。本轮协议测试使用独立临时服务，未改用户现有浏览器／MCP配置。

## 后续按顺序执行

| 阶段 | 工作及退出条件 | 当前状态 |
| --- | --- | --- |
| B0 | 收口操作服务、Harness边界、只读MCP；同一任务跨HTTP／stdio读回一致 | 本批完成定向测试 |
| B1 | 冻结受控图样生成器合同；区分有限路径模板与可信绘制模块，组件绑定、资源闭包、时间和预算统一 | 首版受控绘制计划已实现；无外部模块加载器，资源闭包／正式面板接线归B2 |
| B2 | 将双色放射现有绘制函数接入正式图样；预览也走正式管线；控件复用／命中／蒙版／层序／保存重开／导出／性能验收 | 原custom归属结论已撤回；现按附着图样修正并定向验收，见2026-10-24修正报告；GPU及全量验收未完成 |
| B3 | MCP写操作（新预览／受限参数修改／交付建议）使用同一事务、版本检查与用户授权；WebMCP可复用操作名 | 待完成，不先给假工具 |
| B4 | 选择并接入持续会话Harness：优先评估Codex App Server或ACP，再选OpenCode等；询问、取消、断线及进度事件进入面板 | 待选型／真实授权测试 |
| B5 | Tauri用invoke/event及应用目录替换HTTP与Node任务宿主，保持协议及存储合同 | 未实施 |

每一阶段验收完再继续；不以基础层完成冒充端到端产品可用。无需为使用MCP先重写Runtime，也不应为每个新图样重复造一套传输。

## 生成器合同应解决什么

当前v1模板仅有有限路径与线性坐标绑定，适合框标，但不能表达任意动态图样。新的受控生成器至少需要：

1. 稳定身份、版本、实现摘要、载体范围；来源与执行信任分开。
2. 唯一参数声明及No／Step／Linear；颜色／透明度等通过既有组件绑定，不从字段数量直接生成重复控件。
3. 输入为实际载体路径、求值后参数、时间、确定随机源；输出为有层次的几何／绘制，而非只把bounding box当载体。
4. 明确几何生成与绘制型输出的能力差异，保留双色与动态；不得为迁移方便把同一算法改成大量静态图元。
5. bounds、快照与缓存失效、蒙版／处理顺序、依赖闭包、保存及共享、runtime／embed导出合同。
6. 点数／命令数／离屏尺寸、时间及内存预算；外部代码的隔离与授权不能用“给一个ctx对象”或Node vm冒充安全沙箱。

暂不在本批放开任意JS自动安装。首个正式接入复用已审阅的仓库绘制函数，不再创造另一套相似但不同的放射实现。图元拓展与独立程序元素仍保持不同产品归属，实验性程序包装不作为正式图样交付。

## 测试

生成器首版合同、四层落点和明确限制见[Pattern Generator v1](../agent/PATTERN_GENERATOR_CONTRACT_V1.md)。2026-10-24已连接首个正式双色放射图样：[B2接线、证据和前端交接](DUAL_RAY_B2_DELIVERY_2026-10-24.md)。外部任意代码安装、真实模型授权、MCP写操作与Tauri仍未完成。

- `tests/editor-operation-boundaries.mjs`：操作／Harness登记、真实能力声明、MCP只读工具及非法写入口拒绝。
- `tests/editor-mcp-stdio.mjs`：真实stdio子进程→本机HTTP→同一任务存储，initialize／tools/list／tools/call；不调用模型、不注册用户配置。
- `tests/effect-review-host.mjs`及原自动交付浏览器回归：确保拆分不破坏原链路。
- 性能隔离实验见[双色放射Runtime对照](DUAL_RAY_RUNTIME_COST_2026-10-23.md)，不因此标记B2已完成。

协议参考：[MCP stdio](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)、[MCP tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)。本批为固定子集实现，未做跨客户端完整兼容认证。
