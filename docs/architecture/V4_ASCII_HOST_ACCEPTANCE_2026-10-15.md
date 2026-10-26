# ASCII：实际编辑器与现有Tauri宿主定向验收

## 本轮范围与结论

在真实v4编辑器中，验证ASCII／滤镜蒙版／CRT／Step组合；同一套夹具在Edge和现有Tauri.exe内的WebView2各执行一次。两边功能断言通过。没有修改Runtime、Inspector或正式桌面入口，没有编译新安装包，也没有增加新的永久调试接口。

这完成“桌面宿主的定向冒烟”，不等于完成正式桌面产品／安装包验收。

## 真实桌面测试怎么进行

检查发现当前`src-tauri/tauri.conf.json`仍指向`img2asset-layout-v1.html`，前端准备脚本也是Legacy白名单。它不会自动包含本次v4更新。

本轮没有把这个事实隐藏成“默认桌面版已经升级”。测试启动现有`src-tauri/target/release/patcharium.exe`（2026-09-14构建），使用单独WebView用户目录、仅127.0.0.1的临时调试端口，通过WebView调试协议临时导航到当前v4页面。原生窗口、WebView2、GPU驱动真实存在；页面报告`__TAURI_INTERNALS__`为真。测试结束只关闭本轮创建的宿主进程与本机服务，不操作用户已有窗口。

它验证：**现有Rust壳／WebView2能否运行最新前端**。不验证：正式打包资源是否齐全、安装路径、原生打开／保存对话框、受信来源权限、本地素材路径及安装升级。这些仍需在正式切换入口时单独验收。本轮未改变CSP／capability或系统设置。

测试生成的独立WebView profile位于忽略目录`.local/ascii-webview-*`；不是用户原有素材或应用配置。两份JSON记录二进制指纹／修改日期、前端Runtime指纹、WebView版本和GPU设备，便于后续追溯。

## 自动断言

共用夹具：`tests/fixtures/ascii-editor-acceptance.js`。

1. ASCII、ASCII＋椭圆范围、ASCII＋范围＋CRT三种组合实际画面均有变化；范围之外的画布角落保持原底色。
2. 同时间反复绘制像素hash相同；输入bob随时间运动；效果轨当前Step段取值分别为6与9，而非仅用不同时间画面不同来推断Step生效。
3. 修改当前Step段后画面改变；撤销后画面hash恢复，不仅选择框或Inspector恢复。
4. 三种组合均执行完整CPU路径；切回GPU后恢复之前GPU输出，防止后端切换污染。CPU与GPU组合整体hash不要求相同，CRT等后端精度差异不在此伪装成零。
5. 8轮空项目／组合项目切换后画面仍可复现；项目打包／恢复后输出一致。
6. 自包含HTML在同一宿主iframe内就绪，Canvas尺寸正确，输出包含多种非透明颜色，而非只断言“文件生成”或“没有报错”。
7. 点击实际播放／暂停按钮，播放头前进、重绘计数增长、最终暂停状态同步。当前为3.2秒冒烟，不是数小时稳定性／内存泄漏证明。

两个宿主都没有pageerror。同宿主内部hash作精确复现断言；不据两宿主hash值直接承诺跨WebView／字体／Canvas输出逐位相等。

## 实际编辑器开销

Intel UHD620／ANGLE D3D11；Edge155与WebView2 155。640×360、1280×720、1920×1080；固定程序渐变／图形图片对象＋bob，ASCII原色／边缘＋椭圆范围＋CRT扫描线／荧光，ASCII相对尺寸6、采样尺寸1。

测试调用真实`classicV4View.render()`，包含编辑器投影、Workspace、Runtime及绘制选择框路径。各档预热6帧、记录30帧，顺序执行，无其他自动性能任务并跑。下表为本轮一次记录，后续自动重跑JSON可能更新。

| 画面 | Edge中位／P95 | 现有桌面WebView中位／P95 |
| --- | ---: | ---: |
| 640×360 | 15.7／19.2ms | 12.1／13.8ms |
| 1280×720 | 38.7／43.5ms | 32.7／37.5ms |
| 1920×1080 | 80.4／94.4ms | 67.2／71.7ms |

这是组合效果的编辑器墙钟，不可与之前“单ASCII、尺寸8、固定照片”的Runtime P95直接计算增幅或加速比。它不包含OS呈现延迟；本轮也没有进行原生鼠标逐项操作／人工视觉美感验收。1080p组合不能承诺30fps。

360p实际播放3.2秒：Edge重绘31次，桌面32次；配置目标12fps。RAF／页面调度可以比实际重绘频繁，不能将rollingFrameP95≈32ms解释为场景已达30fps。

JSON里的`editor.renderP95`／质量统计包含前面的冷启动、撤销、项目重建和不同分辨率历史样本；对应本表的数值是每档独立30样本的顶层`p95`。`lastRender.sceneBackend=cpu`描述通用场景组合执行器，不等于ASCII或CRT未用GPU；功能报告另记录ASCII分析后端。

原始记录：

- [Edge编辑器](v4-ascii-edge-editor-acceptance.json)
- [Tauri WebView](v4-ascii-tauri-webview-acceptance.json)

## 复现与后续工作流

```text
node tools/tests/browser/v4-ascii-host-acceptance.mjs
node tools/tests/browser/v4-ascii-host-acceptance.mjs --tauri
```

普通浏览器组合流程已加入根目录`node scripts/verify-v4.mjs`。桌面命令按需单独运行，不让每次修改参数／面板都启动桌面窗口；需要本机现有exe／WebView2。

接入后已重新执行全量`node scripts/verify-v4.mjs`，全部通过。桌面定向命令也已独立通过；没有将原生验收混成普通浏览器测试。

剩余门槛：

- 正式Tauri入口与v4前端资源白名单切换；这属于产品交付变更，不能拿本轮临时导航替代。
- 切换后原生项目打开／保存、素材相对路径、HTML／图片导出路径验收。
- 代表场景、真实照片和更多字体／分辨率的长期播放、内存趋势、普通用户的交互观感。
- 发布候选时重新构建当前Rust源码并进行正式资源打包验收；现有9月exe不代表新安装包已验证。

后续建议保持三级节奏：小改跑针对性浏览器；GPU／本地宿主边界变更增加桌面定向冒烟；阶段收尾与发布才进行完整桌面回归。本轮未进行git提交／推送。
