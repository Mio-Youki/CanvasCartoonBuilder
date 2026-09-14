# Editor Commands 合同

## 1. 目的

Editor Commands 是界面、快捷键、未来桌面菜单与 Agent 工具之间的工作流入口。它解决“执行哪项编辑器操作”，不复制 Scene 字段、Runtime 绘制、文件权限或 Artifact 编码。

```text
Toolbar / Shortcut / Tauri Menu / Agent Tool
                     │
               Editor Command
                     │
       Scene model / Artifact / Host / UI workflow
```

无 DOM 的注册器位于 `editor/command-registry.js`；页面只负责注册当前编辑器实现。

## 2. 当前稳定命令

| ID | 作用 |
|---|---|
| `scene.new` | 打开新建场景工作流 |
| `scene.open` | 通过 Host 打开并载入场景 |
| `scene.save` | 构建、校验并交付当前 Scene Artifact |
| `scene.test` | 构建并交付自包含测试 HTML |
| `export.open` | 打开固定时间帧格式导出面板 |
| `selection.clear` | 清空 Canvas、结构树、Inspector 与时间轴的选择上下文；`mode:'escape'` 保留逐层退出语义 |
| `selection.delete` | 删除当前元素/图元/多选；组保持“解散但不删成员”的结构树语义 |
| `history.undo` | 恢复上一份 Scene 历史快照 |

命令通过 `EditorCommands.execute(id, payload, {source})` 执行。`source` 只用于诊断，可为 `toolbar / shortcut / tauri-menu / agent / api`，不能改变命令语义。

## 3. 生命周期

注册器发出 `registered / start / success / error` 事件。错误必须继续抛给调用者；UI 可以统一显示错误，自动化和 Agent 则据此判定失败，禁止内部吞错后发出 `success`。

命令支持 `enabled(payload)`，后续菜单、按钮和快捷键应读取同一可用状态。当前五个工作流命令保持原有按钮可用规则。

## 4. 与 Agent Patch 的边界

Editor Command 不是 Scene Patch schema：

- `scene.save`、`scene.test` 可以安全暴露给自动化；
- `element.setAlpha` 等未来编辑命令必须调用统一 Scene mutation，再进入历史记录与校验；
- Agent 不应注册任意 JavaScript 回调，也不应借命令层访问 DOM 坐标；
- `applyScenePatch` 的字段、引用和撤销规则仍由 Agent Tool Protocol 与 Scene Spec 规定。

清空选择、删除与撤销已经由 Canvas、结构树和快捷键共用。删除、方向键微调和 Inspector 基本参数已接入 [SCENE_MUTATION.md](SCENE_MUTATION.md) 的修改前快照边界。当前历史实现只有单向 `undoStack`，因此没有注册虚假的 `history.redo`；后续应先建立双栈历史模型，再暴露 redo。
