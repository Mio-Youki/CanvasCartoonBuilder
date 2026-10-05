# ToSampool v4 项目包协议

状态：**已确认，P1 进行中。** 浏览器端已能生成/打开 store-only `.tosampool.zip`；内容哈希、真实像素往返验收及 Tauri 原生目录仍未完成。当前单 JSON 保存不等于本协议中的项目保存。

项目切换的 Runtime 与素材栏隔离规则见 [v4 项目会话隔离](V4_PROJECT_SESSION_ISOLATION.md)。它不等同于素材持久化库：当前项目素材只属于当前打开的 Scene。

## 目的

项目包保存可编辑 Scene、已确认入库的素材、预处理配方与外部场景模块；它不承担网页播放，也不写入 Runtime 缓存、撤销历史、DOM 状态或文件权限对象。

## 规范目录

```text
<project-directory>/
├─ project.tosampool.json
├─ assets.manifest.json
├─ render/
│  └─ scene.runtime.js         # 可选：依赖公共 Player 的网站部署入口
├─ assets/
│  └─ <asset-id>/
│     ├─ asset.json
│     ├─ source/              # 可选：原图/原始序列，供再次预处理
│     └─ render/              # 可选：已处理像素缓存
└─ modules/
   ├─ <module-id>.scene.module.js
   └─ <module-id>.module.json
```

- 目录名是用户可见的项目名称；`projectId` 是不可变身份；`displayName` 是可改显示名。
- `assets.manifest.json` 是快速索引，可由 `assets/*/asset.json` 重建，不是唯一真相。
- Scene 只通过稳定 `assetId`、`moduleId` 引用资源，不保存绝对路径。
- 顶层 `render/scene.runtime.js` 是从项目 Scene 生成的交付副本，不参与编辑真相；当前浏览器项目包已写入该文件。
- 普通预处理素材默认保留 `source/` 与 recipe；当前 Runtime 从 source 应用 recipe，保证再次编辑。`render/` 是未来可重建的性能缓存，不是唯一真相。精灵图确认切帧后不保留原图集和切分规则，得到的源序列即为可再次预处理的素材。

## 核心文件职责

`project.tosampool.json`：`format:'tosampool-project/v1'`，含 `projectId`、`displayName`、`scene`（`tosampool-scene/v4`）和协议版本；不得内嵌大图 data URL。

`asset.json`：`format:'tosampool-asset/v1'`，含 id、kind（`image|sequence|font`）、mime、尺寸、fps、`recipe`、source/render 相对路径、内容哈希与可选来源说明。

## 保存与清理语义

1. 已确认入库的素材都会保存，即使当前没有画布引用。
2. 取消预处理、未确认导入的临时素材不进入工程包。
3. 保存不会隐式清理、移动或重写无引用素材。
4. “清理未使用素材”先计算引用图并显示列表；默认移动到项目内可恢复回收区，永久删除必须二次确认。
5. 跨项目导入永远复制字节与 recipe；不建立不可见外链。

## 浏览器与 Tauri 载体

逻辑目录结构保持相同：浏览器 P1 下载/选择 `.tosampool.zip`；Tauri P7 直接操作原生项目目录。浏览器 P1 必须支持用户显式选择项目包恢复，但不记录上次打开项目；这项自动记忆属于 P6。

## P1 验收

保存项目包 → 清空工作区 → 用户选择项目包 → 恢复素材栏、sequence、recipe、Scene、模块声明 → 在固定时间对比画布像素。未使用素材也必须仍可在素材栏找到。
