# Asset Vault Fixtures

这些不是用户素材，也不进入发布示例；它们只用于验证文件夹导入协议。

- `source-project/` 模拟可搬移项目的 `assets/` 内容：`asset.json` 是单项素材描述，帧文件与 recipe 都位于项目目录内。
- `loose-folder/` 模拟没有项目描述的普通图片文件夹。

运行 `npm run verify:asset-folder` 会验证两种文件夹都被复制到当前 V4 会话，而不是以外部路径引用。
