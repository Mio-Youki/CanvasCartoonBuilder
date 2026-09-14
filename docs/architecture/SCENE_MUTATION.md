# Scene Mutation 合同

## 1. 目的

Scene Mutation 是 Inspector、Canvas、结构树、时间轴与未来 Agent Patch 修改当前 Scene 的共同事务边界。它不定义字段、不负责绘制、也不直接处理文件。

```text
用户 / Agent 意图
       ↓
Editor Command （可选，工作流级）
       ↓
Scene Mutation：capture before → mutate → compare → commit
       ├─ history
       ├─ cache invalidation
       └─ Inspector / Canvas / Tree / Timeline refresh
```

## 2. 事务规则

- 历史必须保存用户操作之前的 Scene 快照；禁止在改动完成后才调用 `pushHistory()`。
- 快照未变化时不新增撤销步骤。
- 一个用户意图只产生一个事务。按键连续重复和 Canvas 连续拖拽不应每帧入历史。
- 改动成功后才进行缓存失效和 UI 刷新；改动抛错时恢复修改前快照。
- 连续预览允许以 `begin` 开始、以 `commit` 落盘；用户取消时必须调用 `rollback` 恢复开始前 Scene。`abandon` 只适用于确认没有写入的空手势。
- 预览质量、选中、面板分页等纯 UI 状态不进入 Scene Mutation。
- Agent Patch 后续必须调用同一入口，不能直接绕过历史、验证和缓存失效。

## 3. 当前迁移范围

已经过 `editor/scene-mutation.js`：

- `selection.delete`：元素、图元、多选和组解散；
- 方向键微调：元素、图元、蒙版和多选；
- 元素 Inspector 的基本字段：`x / y / w / h / scaleX / scaleY / rotation / alpha / blend / alphaMode`。
- Canvas 元素/图元的移动、缩放、旋转、圆角拖拽，以及蒙版拖拽：按下开始、松手或离开画布时提交为一步。
- 编排器下轴：时段边界拖动为一个手势事务；Alt 切分、双击合并/删除与 Linear 切换为原子事务。
- 编排器上轴与 Scene 标签：Scene 边界拖动、边界/端点 `+` 插入、改名、新增、删除和激活切换。
- Inspector 的画布/背景、动画、Sampling Motion、滚动、局部/全局 FX、粒子参数、文字排版、组变换/同步、实体/FX 蒙版，以及图元填充、纹理、阴影和外描边。
- 复合颜色、纹理、图片风格、波带位移和全局 FX 滑杆使用手势事务：`input` 只实时预览，`change` 或关闭浮层时提交一次。
- 结构树的重排、拖入/拖出组、中央投放自动成组、锁定、显隐和重命名；结构投放的数据语义由 `applyStructureDrop` 集中解释，Pointer Events 只负责命中与反馈。
- 编组、解组、复制组、组参数同步，以及剪切、粘贴、图元新增/删除/排序和旋转复位等快捷操作。
- 绘制创建、粒子创建/粒子化、程序元素删除、旋转中心和即时镜像；新建图形在写入前捕获历史，不再保存“已经创建”的错误快照。
- 文字工具以一次编辑会话为事务：实时栅格化只用于预览，失焦提交，Esc 通过 `rollback` 恢复编辑前文本；创建文字和修改文字是两个可解释的撤销步骤。

当前产品主路径（Inspector、Canvas、结构树、编排器、绘制/文字和常用快捷操作）已完成迁移。尚未迁移的直接写入主要集中在旧兼容参数卡片、旧背景卡片和旧 FX 图层面板；后续先将其隔离为 Legacy Controller，再逐项迁移或删除。最终才建立 redo 双栈，避免在两套写入路径并存时放大历史不一致。

## 4. 验收

- `scripts/verify-editor.mjs` 验证修改前快照、空操作过滤和首批接线。
- `tests/editor-e2e.html` 在真实编辑器中验证 Inspector 改值、删除与 `history.undo` 恢复。
- 浏览器 E2E 同时验证 Canvas 拖动、上下时间轴边界拖动、Scene 插入、动画、Sampling Motion、局部 FX、蒙版、全局 FX 以及颜色/纹理连续预览都只生成一步撤销。
- 结构树 E2E 直接调用与 Pointer 拖放相同的 `applyStructureDrop`，验证普通排序、中央投放成组及一步撤销；不是另造测试专用的数据写入实现。
- 绘制/文字 E2E 验证图形创建可一步撤销，文字实时输入后按 Esc 会真正恢复编辑前 Scene，再撤销才删除新建文字。
