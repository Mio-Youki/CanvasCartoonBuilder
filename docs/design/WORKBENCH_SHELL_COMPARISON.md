# 外部机壳风格对照 · 2026-10-09

本轮是已确定布局的视觉方向比较。目标是给 ToSampool 的拼贴和采样工作台增加航天设备气质；用户在相同场景与控件状态下比较两种机壳，不改电子屏幕内部。采用 Oil UI Pro 的存量项目方法，从外部材质、键帽、面板接缝与铭牌形成差别。

- 基线：`prototypes/old-media-workbench.html`。
- NASA-punk：`prototypes/old-media-workbench-nasa-punk.html`。哑光浅灰白面板、黑白警示斜纹、细接缝、紧固件、四色任务色条。Agent 创作键使用红色作为主要动作；其余键帽保持黑白。铭牌使用系统等宽字体和 Arial/Helvetica 回退，不依赖商业字体或远程资源。仅一处轻微划痕和手写服务贴纸。
- Cassette Futurism：`prototypes/old-media-workbench-cassette-futurism.html`。军绿和炭灰分立模块、米色塑料机框、压字标签、琥珀／橙／铁锈条纹。键帽用短促步进反馈，亮起的工具键采用琥珀色。功能标签仍为中文，硬件铭牌采用全大写缩写。

所有屏幕内容、字体、颜色、扫描切换动效、工具参数、状态数显与时间轴数据保持基线实现。本轮没有加入荧光绿 CRT、换台雪花或 12 帧屏内动效，因为用户限定只改屏幕外部分。外部按钮的图标及尺寸继承现有原型。两份副本的 HTML 均复制自基线；追加样式由 `prototypes/workbench-shell-variants.css` 提供，只匹配机壳、实体控件和外部标识。

参考：NASA 官方 [1976 Graphics Standards Manual](https://www.nasa.gov/wp-content/uploads/2015/01/nasa_graphics_manual_nhb_1430-2_jan_1976.pdf)，并以用户提供的《星空》及卡带未来主义描述作为方向约束。未使用 NASA 官方标志，任务徽章为 ToSampool 自有文字标识。

本轮未删除已有功能文案。新增的 STOW / THIS SIDE UP / SYS / PWR 等只用在外部设备铭牌。没有进行独立评审或评分；视觉取证结果见本目录原型截图与相邻报告。

已核对副本：移除追加的机壳 CSS 引用、外部铭牌、页面标题与主题类后，屏幕 HTML、原始样式及交互脚本与原页逐字一致。已查看 NASA 1280×900、Cassette 1280×900 与 1600×1000 实际截图。初轮发现 NASA 警示带限制宽度导致状态数显偏左，已改成仅限制警示图案而保留原有弹性槽位；保持数显原来的右侧对齐。截图使用 Oil UI Pro 的独立临时浏览器，初次本机启动受限制，获准的本机运行后成功。

对照页：`prototypes/workbench-shell-comparison.html`，含原页与两份可操作副本。生成输入：`prototypes/workbench-shell-manifest.json`。证据：`prototypes/shell-shots-nasa/`、`prototypes/shell-shots-cassette/`、`prototypes/shell-shots-baseline/`，各目录包含截图和 `report.json`。
