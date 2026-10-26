# Remotion 官方效果 Canvas 适配实验

仅实验；没有接入正式Inspector、Registry、项目JSON或默认后端。依赖只安装在本目录，不更改tools主依赖。版本锁定于本目录package-lock。

在tools目录运行：

```powershell
npm ci --prefix tests/experiments/remotion-adapter --ignore-scripts --no-audit --no-fund
node tests/experiments/remotion-adapter/build.mjs
node tests/browser/v4-remotion-adapter-experiment.mjs
```

浏览器测试使用本机Edge和tools的playwright-core。构建需要本目录esbuild和平台二进制包；安装脚本关闭情况下本机已验证构建成功。

打开`dist/standalone.html`可离线调整三个官方效果；它自带实验所需Runtime和bundle。`index.html`则引用现有Runtime及本目录dist/trial.js。dist和node_modules均忽略，不作为产品分发或公开演示资产提交。

- `entry.js`：直接import官方brightness／blur／wave工厂；官方Internals链执行器、直接生命周期适配器，以及由官方schema生成的数字／布尔／枚举控件。
- `build.mjs`：标准生产压缩、依赖贡献、gzip体积和自包含技术演示；不修改产品Runtime。
- 浏览器夹具：ToSampool真实Canvas来源、两条执行方式的画面对照、零强度／停用、动态／seek、无WebGL错误、纹理释放、静态／变参性能及UI实时预览。

官方效果包当前package.json标记`UNLICENSED`。这里只做本地技术验证；未得出可纳入本项目MIT产品分发的许可结论。createEffect是公开接口，Internals.runEffectChain等内部入口不是已承诺稳定的第三方执行协议。后续采用前须分别确认许可和稳定调用边界。

报告：`tools/docs/architecture/V4_REMOTION_ADAPTER_TRIAL_2026-10-25.md`。
