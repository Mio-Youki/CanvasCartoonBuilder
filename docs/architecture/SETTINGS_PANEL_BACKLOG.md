# 设置面板需求台账

状态：**只记录已确认需求与接口，不实现 UI。** 设置面板属于 Tauri 产品化阶段；当前不得把设置散落进 Inspector 或 Scene Runtime。

## 已确认设置

| 类别 | 设置 | 默认/安全语义 | 阶段 |
| --- | --- | --- | --- |
| 项目 | 默认项目保存位置 | 首次询问；浏览器不伪造本地路径 | P7 |
| 导出 | 默认导出位置、命名规则 | 每次交付可覆盖 | P7 |
| 素材 | 保留原素材 | 默认保留，支持再次预处理 | P1/P7 |
| 素材 | 清理未使用素材 | 先 dry-run，再可恢复移动；永久删除二次确认 | P1/P7 |
| 素材 | 跨项目导入策略 | 默认复制字节与 recipe，不隐式外链 | P1/P7 |
| 浏览器 | 最近项目 / 自动重开 | 仅 IndexedDB 授权后启用 | P6 |
| 预览 | Auto/Draft 预算 | 属于本地偏好，不写入 Scene | 后续 UI 收口 |

## 预留接口

编辑器只调用抽象接口，不直接决定磁盘路径：

```text
ProjectStorageAdapter
  saveProject(package)
  openProject()
  inspectUnused(project)
  cleanUnused(project, { dryRun, policy })

DeliveryAdapter
  buildRuntime(scene)
  buildEmbed(scene)
```

Browser 以 ZIP/文件选择器实现；Tauri 以原生目录、回收区和路径偏好实现。项目内可复现的数据写入项目包；机器专属路径、最近项目、预览偏好写入宿主设置，绝不进入 Scene。

