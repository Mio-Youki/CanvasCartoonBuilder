# Tauri Desktop Host

## 1. 定位

Tauri 是 Patcharium 的系统能力外壳，不是第二套编辑器，也不是新的 Runtime。`img2asset-layout-v1.html`、Scene Model、Sampling Motion 和 Canvas Runtime 在浏览器与桌面端完全共用；Rust 只实现浏览器无法稳定提供的文件能力。

```text
同一编辑器 / Scene / Runtime
          │
   Host Adapter 合同
      ┌───┴────┐
 Browser Host  Tauri Host
 下载/临时重连  原生路径/批量写入
```

因此桌面封装不会让导出的 Scene 依赖 Tauri。保存自包含 JS 或测试 HTML 时，Asset Resolver 仍会冻结素材；作品可以放在公网或其他 HTML 页面运行。

## 2. 当前桌面能力

- 用原生对话框打开 UTF-8 的 `.js` / `.json` Scene；
- 记录不进入 Scene 的不透明 `locator`，允许 Scene 原位保存；
- 选择图片并按需读取为 data URL；
- 从已授权 Scene 的目录解析相对素材，打开后立即以临时 data URL 注入预览 Runtime，解决 WebView / `file://` 无法读取图片的问题；
- 兼容早期示例在 `examples/` 场景内仍写成 `examples/assets/...` 的重复目录前缀；兼容只剥离与 Scene 目录同名的一层，不搜索父目录；
- 单 Artifact 原生另存；
- 多帧 PNG 等多 Artifact 选择目录后批量写入。

未实现：项目清单、持久 `assets/`、素材处理配方、个人素材库、后台原生视频编码。这些必须继续通过 Host/Project 层扩展，不得进入 Scene Runtime。

## 3. 文件与安全规则

1. 只有用户通过原生对话框选择的文件会进入会话授权集。
2. `patcharium_read_asset` 只能读取授权集中的精确路径。
3. `patcharium_resolve_asset` 只接受相对路径，拒绝绝对路径与父目录穿越；解析结果必须仍位于已打开 Scene 的同级目录树。
4. 产物名称只能是单个文件名，批量写入不能携带子目录或 `..`。
5. 写入先落同目录临时文件，再替换目标；失败时清理临时文件。
6. 绝对路径只保存在 Host 内存中，不序列化进 Scene。

## 4. 目录与构建

```text
package.json                         Tauri CLI 与开发命令
scripts/prepare-tauri-frontend.mjs  确定性增量生成最小前端闭包
.tauri-dist/                         生成物，不提交
src-tauri/
  Cargo.toml
  tauri.conf.json
  capabilities/default.json
  src/lib.rs                         六个 Host command
```

开发流程：

```powershell
npm install
npm run verify
npm run desktop:test
npm run desktop:dev
```

正式构建使用 `npm run desktop:build`。当前 `bundle.active` 为 `false`，先验收开发壳和文件闭环；配置应用图标、签名与安装包后再开启 bundle。Tauri 官方插件要求 Rust 1.77.2+。

准备脚本仅在源内容改变时写入 `.tauri-dist/`，manifest 不带构建时间戳，避免由生成时间本身制造前端资源变更；白名单之外的旧文件会从生成目录移除。Tauri 的 release 命令仍可能重新编译/链接主 crate，日常迭代使用 `desktop:dev`，`desktop:build` 留给里程碑验收。

## 5. 验收门槛

- `npm run desktop:prepare` 生成的闭包不含 `img2asset.html` 与 `examples/assets/`；
- 六个 JS invoke 名与 Rust command 名一致；
- 打开一个引用同目录图片的 Scene 后，无需人工重连即可生成自包含测试页；
- Scene 原位保存，其他 Artifact 必须弹出目标选择；
- 多帧导出只弹一次目录选择；
- 相对引用越界、未授权 locator 和不安全产物名均被拒绝；
- 同一固定时间在浏览器与 Tauri 的 Runtime 像素结果一致。

当前开发机已使用 Rust 1.98.1、Tauri CLI 2.11.4 与 Visual Studio Build Tools 17.14 完成 Rust `cargo check`、4 项 Host 安全单元测试、release EXE 构建和启动烟雾测试。原生对话框验收曾暴露并修复“重复 `examples/` 前缀”和“解析结果未进入实时预览”两处接线缺口；2026-09-14 已手动确认 `karsten-cloud-drift.js` 能直接载入相对图片并完成自包含测试场景交付。发布前仍需复查取消操作与批量目录选择。
