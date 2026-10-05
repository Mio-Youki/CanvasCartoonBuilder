# v4 项目会话隔离

状态：已实现浏览器会话隔离；持久素材库仍暂缓。

## 目标

同一个网页（以及未来一个长期运行的 Tauri 窗口）依次打开项目 A、项目 B 时，B 不得沿用 A 的 Player、Module 定义、已解析图片、预览缩略图或选择状态。两个仍存活的 Player 也可在同页分别绘制同 ID 的不同 Module。

## 运行时边界

```text
Project A ─ scope project:<projectId> ─ Module id "tree" → A 的绘制函数
Project B ─ scope project:<projectId> ─ Module id "tree" → B 的绘制函数
```

- Module Registry 的键为 `scope + moduleId + version`，不再只有全局 ID。
- `_moduleScope` 仅在工作区和 Runtime 之间传递；保存 Scene、项目包、网页交付物时均会移除。
- 打开松散 Scene 时生成 `workspace-N` 作用域；打开项目包时使用稳定的 `project:<projectId>`；交付脚本生成 `delivery:<instance>`。
- `Workspace.replace()` 会递增 revision、丢弃 Player 与已解析素材缓存，并重置运行度量；异步素材解析若返回旧 revision，不会把旧 Player 写回新项目。

## 素材栏边界

- 当前 Scene 的 `assets` 是**项目拥有**的素材清单。打开 / 新建项目会用新文档重建左侧素材栏，因此 A 的 `a/b/c` 不会出现在 B。
- `state.sources` 只是 Classic Shell 的预处理与缩略图内存缓存，不是持久素材库。它会在 `Workspace.replace` 后完全由当前 `scene.assets` 重建。
- 当前浏览器项目包保存全部已确认入库的项目素材（包括暂未上画布者）；不会自动清理。未来“清理未使用素材”是设置面板中的显式、可恢复操作。
- IndexedDB/Vault 和跨项目复用仍属于后续素材库阶段。届时只能通过明确的“复制到当前项目 / 创建变体”导入，绝不自动把别的项目素材混入当前项目。

## 验收

`tools/tests/vnext-project-module-isolation.mjs`：同页同时创建两个 Player，二者使用同 ID Module 仍分别正确绘制；在 B 渲染后再渲染 A 也不受影响。

`tools/tests/browser/v4-project-session-isolation.mjs`：浏览器中连续打开两个含同 ID Module 的项目，验证 B 的像素、Module scope、素材卡片都替换为 B，且不出现 A 的素材卡片。

## 不在本阶段

这不是“全局素材库”实现。现有项目还没有 IndexedDB 自动恢复、默认项目目录、跨项目素材浏览或共享素材去重；这些能力必须在素材持久化阶段按项目复制语义实现。
