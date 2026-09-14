# Host Adapter 合同

## 1. 目的

Host Adapter 隔离浏览器与 Tauri 的系统能力。Scene、Runtime、Inspector、时间轴和 Agent Patch 不得直接依赖 `showOpenFilePicker`、下载链接或 Tauri command。

当前浏览器实现位于 `editor/host-adapter.js`。宿主可在编辑器脚本加载前注入 `window.__PATCHARIUM_HOST__`；只要实现相同方法，编辑器就会采用该宿主而不是浏览器默认实现。Tauri Rust 实现位于 `src-tauri/src/lib.rs`，构建与安全边界见 [TAURI_HOST.md](TAURI_HOST.md)。

Tauri WebView 前置适配器位于 `editor/tauri-host-adapter.js`，加载顺序早于浏览器 Host。它只在检测到 `__PATCHARIUM_TAURI_BRIDGE__.invoke` 或 Tauri v2 的 `__TAURI__.core.invoke` 时安装，不会改变普通网页模式。

图片引用如何解析由 [ASSET_RESOLVER.md](ASSET_RESOLVER.md) 规定。Tauri 已实现 `resolveAsset({ref, sceneLocator})`；这是桌面宿主能力，不进入 Scene 或 Runtime。

## 2. 当前最小接口

```js
{
  kind: 'browser' | 'tauri',
  capabilities: {
    directWrite: boolean,
    projectDirectory: boolean,
    persistentAssets: boolean,
    nativeEncoding: boolean
  },
  openText(options): Promise<{ name, text, file? } | null>,
  saveFile({ name, data, mime, description, ext }): Promise<{ mode, name } | null>,
  saveBatch({ artifacts }): Promise<Array<{ mode, name }>>,
  pickAssets({ accept, multiple }): Promise<File[]>,
  readDataUrl(file): Promise<string>,
  resolveAsset?({ ref, sceneLocator }): Promise<string | Blob | { dataUrl?: string, blob?: Blob } | null>
}
```

`null` 表示用户取消，不是错误。方法抛错才显示失败信息。

`resolveAsset` 是桌面宿主的可选能力：浏览器实现可以省略，Asset Resolver 会继续尝试已载入图片、同源读取与人工重连；Tauri 实现可用场景文件位置解析相对路径。

## 3. 已接线与未接线范围

已接线：

- 打开 JS/JSON 场景；
- 保存场景与自包含测试 HTML；
- 从素材库入口选择图片。

暂未接线：

- 字体选择；
- 项目目录、`assets/` 重连与处理配方；
- 原生 APNG/WebP/WebM/MP4 编码。

多帧 PNG 等现有多 Artifact 导出已由 Tauri 批量写入所选目录；GIF 本身是单 Artifact。项目目录和持久素材库仍未实现，不能把“当前 Scene 相对路径解析”称为 Project 层。

多帧导出已经使用 `saveBatch()`：浏览器实现逐项下载，Tauri 实现写入用户所选目录。若后续加入 ZIP、WebM/MP4 或后台进度，再扩展 `exportJob()`，不要让编码任务进入 Scene/Runtime。

## 4. Tauri 实现原则

- Rust/Tauri 只提供文件权限、项目目录、批量写入和编码等宿主能力，不复制 Scene 求值或 Canvas Runtime。
- 所有路径只存在于 Project/Host 层；可移植 Scene 仍使用 data URL 或打包后的相对资产引用。
- `capabilities` 决定 UI 是否显示项目目录、持久素材库和原生编码选项，禁止通过 `window.__TAURI__` 散落判断。
- 浏览器实现始终保留，作为轻量版本与回归基线。
- Rust 只读取用户经原生对话框授权的路径；相对素材必须位于已打开 Scene 的同级目录树内，拒绝绝对路径与 `..` 越界。

## 5. Tauri command 合同

| Command | 输入重点 | 返回值 |
|---|---|---|
| `patcharium_open_text` | `{options}` | `{name,text,locator}` 或 `null` |
| `patcharium_save_artifact` | `{artifact,sceneLocator,writeBack}` | `{mode:'direct',name,locator?}` 或 `null` |
| `patcharium_save_artifacts` | `{artifacts,sceneLocator}` | 写出结果数组 |
| `patcharium_pick_assets` | `{options,sceneLocator}` | `[{name,mime,locator,dataUrl?}]` |
| `patcharium_read_asset` | `{locator}` | data URL |
| `patcharium_resolve_asset` | `{ref,sceneLocator}` | data URL、`{dataUrl}` 或 `null` |

`locator` 是 Host 私有的不透明字符串，不得进入 Scene。JS 适配器会在打开场景后保存它；保存 Scene 时允许 Rust 写回原文件，测试 HTML 和图片/GIF 默认另选目标。二进制 Artifact 当前通过 base64 过 IPC，只发生在导出阶段；若大批量视频编码测得成为瓶颈，再替换为 Tauri 的原始字节/临时文件通道，不改变 Artifact Builder。
