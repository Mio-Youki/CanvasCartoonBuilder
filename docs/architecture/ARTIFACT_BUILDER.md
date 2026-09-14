# Artifact Builder 合同

## 1. 目的

Artifact Builder 把已经确定的 Scene、Runtime 文本或离线渲染 Blob 组装成统一产物，但不决定文件写到哪里。

```text
Scene Serializer → Asset Resolver → Artifact Builder → Host Adapter
                                         │
                                         ├─ Scene JS
                                         ├─ 自包含测试 HTML
                                         ├─ PNG / Sprite PNG / PNG 序列
                                         └─ GIF
```

实现位于 `editor/artifact-builder.js`。所有产物采用相同描述：

```js
{ kind, name, data, mime, description, ext, meta }
```

其中 `data` 是字符串或 Blob，`meta` 只记录 `t / fps / frame` 等交付元数据，不参与 Runtime 渲染。

## 2. 当前职责

- 在原脚本的 Scene 范围内替换序列化配置，保留兼容脚本外围的专用绘制函数与 Runtime；
- 把 `GENERIC_SCENE` 与 Runtime 文本组合成可独立运行的脚本；
- 生成自包含测试 HTML，并安全处理脚本结束标签；
- 为 PNG、Sprite、逐帧 PNG、时间采样拼图和 GIF 建立统一产物描述；
- 把单文件交给 `HostAdapter.saveFile()`，把多文件交给 `HostAdapter.saveBatch()`。

## 3. 不承担的职责

- 不解释 Scene 字段，也不执行 Canvas 绘制；
- 不读取相对图片或项目路径；素材字节由 Asset Resolver 提供；
- 不弹文件选择器、不创建下载链接、不调用 Tauri command；
- 不把预览 Draft 质量写入最终产物；
- 不负责 APNG/WebP/WebM/MP4 编码。未来编码器只需输出 Blob，再包装为相同 Artifact。

## 4. Browser 与 Tauri

浏览器 Host 的 `saveBatch()` 使用多文件下载，仍可能受到浏览器“允许多个下载”的策略限制。Tauri Host 已把同一批 Artifact 写入用户选择的目录；项目导出和原生编码可扩展为 `exportJob()`，但不得绕过 Artifact 描述直接依赖编辑器 DOM。

因此桌面封装不会复制“保存 JS / 测试页 / GIF”逻辑，只替换最后一步的交付能力。
