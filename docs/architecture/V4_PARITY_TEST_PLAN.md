# v4 Classic Shell Parity 测试计划

> 当前入口口径：`img2asset-v4-classic.html` 普通打开即进入 V4；`?legacy=1` 只用于候选壳与冻结 Legacy 的结构/截图比较。浏览器纵向验收必须直接验证普通 V4 入口，而不是通过隐藏测试开关制造另一套页面状态。

## 1. 目标

自动测试负责证明没有意外退化；人工验收负责批准差异、手感和产品取舍。二者不能互相替代。

浏览器测试使用 `playwright-core` 驱动系统已安装的 Microsoft Edge，不随 Tauri 打包浏览器。快速 `npm run verify` 保留；完整迁移验收使用 `npm run verify:parity`。

## 2. 证据层

| 层 | 证据 |
|---|---|
| Scene | 保存字段、schema、往返和重新打开 |
| Runtime | 固定时间 RGBA、对象统计、缓存与错误 |
| Controller | 同一操作、选择、焦点、滚动、展开、历史条数 |
| UI | DOM 几何、启用状态、Inspector/树/时间轴联动、截图 |
| 交付 | 测试页、帧/GIF、资产自包含 |
| 性能 | RAF、Runtime、输入到画面、长任务、Player/素材/Surface 指标 |

## 3. 视觉标准

- 自生成 Canvas 夹具固定时间输出要求 RGBA 完全相同。
- 批准的处理层差异只能使用登记过的局部差异遮罩；不允许全图宽松容差。
- UI 跨机器以 DOM 结构、几何（±1px）、状态与焦点为主；同一 Edge/机器可追加截图差异。
- 字体抗锯齿的跨平台差异不能掩盖作品 Canvas 差异。

## 4. 性能标准

同设备、同 Edge、同素材、同操作序列：v4 P95 不得比 Legacy 慢超过 10%；静态播放头 P95 ≤20ms；选择、树同步与 Overlay 拖拽 P95 ≤20ms；正常动态 Full 预览目标 P95 ≤33ms；参数实时预览不得出现 >100ms 主线程长任务。Draft/Auto 只影响编辑预览，测试页与导出始终 Full。刻意叠加 4–6 次全画布 CPU 像素遍的 S/M/L 压力夹具不冒充正常 Full 实时场景：其 Full 记录保真成本，交互门禁由 Auto/Draft、工作像素、输出不变量和页面 RAF 共同判断，具体见 [V4_PREVIEW_PERFORMANCE_CONTRACT.md](V4_PREVIEW_PERFORMANCE_CONTRACT.md)。

若 Legacy 本身未达到绝对底线，登记共同性能缺陷；不能用更差的 Legacy 数字替 v4 开脱。

## 5. 固定夹具

夹具全部由仓库脚本生成，不提交私人或受限素材：1920×1080 单图；透明图片+阴影+1/4/16px 描边；图片+图元；矢量/纹理；组/多选/调序；五类蒙版；多帧与背景布局；Scene/show/Step/Linear；粒子/Sampling Motion；程序元素兼容；保存、重开和交付。

## 6. 每个切片的最低浏览器流程

1. 在 Legacy 执行操作并记录初态/终态；
2. 在 Classic 候选执行同一操作；
3. 比较 Canvas、DOM、Scene、历史和性能；
4. 未登记差异立即失败；
5. 自动通过后进行一次集中人工验收；
6. 将矩阵状态推进到 `browser-parity` 或 `complete`。

## 7. 浏览器可用性探针

2026-09-21 已使用临时 `playwright-core` 成功启动 `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`。Legacy 与 vNext 均可通过 `file://` 加载、读取 DOM、捕获截图和页面异常。项目级探针进入 `tests/browser/`；输出写入临时目录或被忽略的测试产物目录，不提交运行截图。

当前首个入口为 `npm run verify:parity`。它先剥离已批准的 Session Facade、Scene File Controller、Asset Controller、隔离 v4 Runtime 与素材边界接线并验证其余候选源码与 Legacy 字节一致，再分别打开两个页面、固定播放时间、比较结构/几何/控件状态、Canvas 像素与整页截图。测试还使用仓库内即时生成的 PNG，在两页连续执行导入、预处理确认、素材卡添加、场景放置和背景向导，避免把“控制器函数存在”误当成“用户工作流可用”。随后以仅限 e2e 的 v4 单活动会话复用同一预处理弹窗和背景放置面板，检查 v4 recipe、素材、图片实体与 tile 背景写入、固定时间渲染、浏览器下载保存及重新打开后的像素一致性；该证据不替代尚未迁移的可见 Canvas/树/Inspector 验收。后续切片继续通过受控差异清单扩大允许的内部接线；其余浏览器证据保留并随能力切片扩展。
