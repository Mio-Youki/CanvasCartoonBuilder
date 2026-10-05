# ToSampool v4 交付产物协议

状态：**P2 已实现并通过浏览器夹具。** “测试场景”输出 `scene.embed.html`；正式项目包同时携带 `render/scene.runtime.js`。两者都裁剪真实引用的素材与项目 Scene Module。

## 三类结果

| 结果 | 目的 | 是否可编辑 | 是否独立运行 |
| --- | --- | --- | --- |
| 项目包 | 继续创作 | 是 | 否，需要编辑器/Host |
| `scene.runtime.js` | 网站部署 | 否 | 依赖宿主已加载 v4 Player |
| `scene.embed.html` | 测试、分享、复制嵌入 | 否 | 是，`file://` 可运行 |

PNG、GIF、Sprite、帧序列是像素交付，不属于可播放 Scene。

## `scene.runtime.js`

它包含裁剪后的冻结 Scene、被引用的项目 Module 源与启动逻辑；素材通过相对 URL 或网站资产管线读取。当前项目包将其写至 `render/scene.runtime.js`，所以对包内 `assets/` 使用 `../` 相对路径。网页先加载一次公共 Player，多个场景复用它，因此传输、解析、内存和浏览器缓存成本最低。它不依赖编辑器，也不要求 Module 进入共享 Player；项目 Module 会在该场景启动前注册。

最小部署结构如下：

```html
<div class="tosampool-scene" data-tosampool-scene="snowglobe"><canvas></canvas></div>
<script src="/tosampool-player.min.js"></script>
<script src="/scenes/snowglobe/scene.runtime.js" data-tosampool-target="snowglobe"></script>
```

## `scene.embed.html`

它是一个可直接粘贴到任意 HTML `<body>` 的容器片段：受作用域约束的容器、Canvas、完整 Player、项目模块和已冻结素材位于同一文件。双击该文件也必须能播放。当前实现只冻结真实引用的素材；静态场景只绘制一次，时间相关场景才启动刷新循环。

构建器必须：

1. 从 Scene、蒙版、粒子、背景和模块 Manifest 递归计算真实依赖，只内嵌被引用素材；
2. 移除 history、recipe、未使用素材、编辑选择和预览质量字段；
3. 静态 Scene 只绘制首帧，存在时间依赖才启动 `requestAnimationFrame`；
4. 使用发布版最小 Player；优先保留可用压缩素材，必须烘焙时才转换格式；
5. 以固定 `time + seed` 证明它与编辑器/导出器同帧一致。

## P2 验收

- 独立文件、复制进空白 HTML、网站公共 Player 三种环境均可运行；
- 输出不包含未引用资产；
- Canvas 尺寸、透明度、循环、模块和效果保真；
- 产物不暴露编辑器 UI、Host API 或工程路径。

## 可选 `scene.bundle.js`

如果未来需要“只插一条 `<script>` 且不依赖公共 Player”的网页交付，可增加 `scene.bundle.js`：它会把 Player、项目 Module、Scene 和素材启动逻辑打成一个 JS 文件。它比 `scene.runtime.js` 大，也失去多个场景共享 Player 的缓存优势；当前不实现，不能替代主路径。网站发布仍以共享 Player + `scene.runtime.js` 为默认，测试/复制仍使用 `scene.embed.html`。
