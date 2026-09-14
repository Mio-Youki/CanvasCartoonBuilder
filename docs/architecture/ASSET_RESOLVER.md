# Asset Resolver 合同

## 1. 目的

Asset Resolver 位于 Scene Serializer 与交付物生成之间，把 Scene 中的图片引用解析为可移植 data URL。它解决的是“从哪里取得素材字节”，不是“把产物写到哪里”；后者仍属于 Host Adapter。

```text
Scene Serializer → Asset Resolver / Freezer → Artifact Builder → Host Adapter
```

实现位于 `editor/asset-resolver.js`。保存自包含 JS 与测试场景已经共用该入口；帧导出直接消费 Runtime 已加载的像素，最终 Blob 统一交给 Artifact Builder。

## 2. 解析顺序

1. `data:` 引用直接返回；
2. 本轮用户已经重连的素材按完整引用或文件名命中；
3. 编辑器内已经成功加载且 Canvas 可读取的图片转为 PNG data URL；
4. 宿主实现了 `resolveAsset()` 时交给宿主；
5. 最后尝试以编辑器地址为基准进行同源 `fetch`；
6. 全部失败时抛出带 `ref` 的 `ASSET_NOT_READABLE`，由界面提供重连入口。

## 3. 浏览器与 Tauri

浏览器通过文件选择器打开一个 JS，并不会获得该文件同级目录的读取权限。`file://` 下相对图片既可能无法 fetch，也可能因 Canvas 来源限制无法读取。因此测试场景遇到缺失图片时允许用户一次选择同目录中的多张素材，并在当前会话按文件名重连；不会把这个临时关系伪装成持久项目。

Tauri Host 已实现 `resolveAsset({ref, sceneLocator})`：以已打开场景的真实路径为基准读取相对文件并返回 data URL。编辑器实时预览与自包含冻结共用这一入口；预览把结果放入实体的临时 `_asset` 槽，保留原始 `src`，序列化时再移除临时字段。Scene 与 Runtime 不接触绝对路径，也不直接依赖 Tauri API。

早期 `examples/` 内的 Scene 使用过 `examples/assets/...` 这种仓库根风格引用。桌面 Host 只在引用首段与 Scene 所在目录同名时剥离一层重复前缀；不会向上搜索，因此兼容旧案例但不扩大读取权限。

## 4. 明确边界

- 本轮重连只服务当前编辑会话与自包含冻结，不是个人素材库。
- 同名文件重连是浏览器的临时降级；桌面项目必须以规范化项目路径解析。
- Asset Resolver 不改变图片处理参数、不编码 GIF/视频，也不决定下载目录。
- 交付前仍必须把外部引用冻结，保证测试 HTML 与自包含 JS 离开原目录后可运行。
