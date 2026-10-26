# 加样／采样参数与 Runtime 交接审计（2026-10-08）

## 2026-10-23 P5：声明式图样参数时序与候选预览（需同步前端副本）

- 路径模板参数可显式声明No／Step／Linear，缺省No；只有已声明可时序字段出现`[data-parameter-timing]`◷。该按钮写所属对象原轨，清除只删该字段；过渡段只读。正式图样仍无独立轨道。
- `classic-v4-path-extension-control`提供parameterTiming插槽，Inspector展示正式求值后的参数而非永久基础值。参数路径稳定partsById，Linear字段加入对象原轨白名单；模板定义／运行时／内联导出同核。
- `pattern-review-workbench`是独立候选审阅壳，不是编辑器新面板。双色放射候选尚未正式注册或共享发布；不得把预览的颜色与扇区参数能力直接宣称所有旧图样已支持。详见[P5合同](../architecture/V4_PATTERN_PARAMETER_TIMING_P5_2026-10-23.md)。

## 2026-10-23 RC5-P4：资源名称与元素携带图样（需同步前端副本）

- 新增共享名称绑定`classic-v4-resource-name.js`：素材／图样项目和“我的”共享卡片名称双击编辑；保留首击选中及Inspector定位，跨DOM重建仍有效。`data-resource-rename`标识绑定范围。自带图样只读，不新增按钮或面板。
- 项目改name走历史；共享改名持久修改发布元数据，不改ID／root／hash，版本CAS递增；显式更新共享才回传项目name。图样标题从patternResources读取别名，不改变参数键。
- 元素预设可选patternNames仅携带图样展示别名；入库／导入／取用补齐项目图样目录，不覆盖已有预设。私有来源按可达性清理，具体见[P4合同](../architecture/V4_PATTERN_ELEMENT_LIFECYCLE_P4_2026-10-23.md)。无新增Runtime效果参数。

## 2026-10-22 RC5-P3：预设回写与已应用图样排序（需同步前端副本）

- 项目同图样唯一；卡片`data-pattern-applied`／名称active随选中图元enabled变化，点击定位；`data-pattern-action=apply`覆盖当前实例参数。项目卡左下`writeback`回写同ID，不自动更新共享。原保存入口也不再产生同图样副本。
- 树中新增`data-v4-pattern-id`／`data-v4-pattern-owner`／`data-v4-pattern-part`条目：定位、隐（停用保值）、×（移除）、同宿主拖序；图元图标可折叠子项。未增加场景结构顶部按钮，未改变新建／应用条件。
- `extensions.attached`从成员列表扩展为从下到上绘制顺序，树反向显示；元素排布也参与，不固定在顶层。没有新效果参数、独立时间轴或额外像素处理。详见[完整合同](../architecture/V4_PATTERN_WRITEBACK_ORDER_P3_2026-10-22.md)。

## 2026-10-22 RC5-P2c：图样卡片接管（需同步前端副本）

- 删除旧目录render和图样管理文字列表，`ClassicV4PatternLibrary`只保留栏壳体，`ClassicV4PatternCards`唯一管理图样UI；ResourceEntryController组合卡片与旧构件烘焙，不双写两份目录。
- 图样标题下项目／共享切换`[data-pattern-scope-switch]`，右侧保存预设、文件夹导入、图样导入；文件输入`[data-pattern-import]`与`[data-pattern-folder]`。多个附着图样保存时使用同行下方选择器，无新Runtime参数。
- 卡片共用lib-item／asset-card-action样式，5:3预览及24px图标；`data-pattern-key`区分builtin／project／shared，`data-pattern-resource-id`为预设或发布ID；右下create／apply，左上publish／update，右上remove／remove-shared。共享样式继续用`data-share-action=update`实现♥→↥。
- 自带只读，不写入用户共享库；项目导入／取用后选中，卡片不是当前图元启用状态。旧版本操作放`[data-pattern-maintenance]`，不再按旧data-entry选择器定位。三范围与元素素材使用同一存储底座。
- 新建先准备pendingScene，绘制时合并资源与载体／来源，单次历史；过期时取消，Esc不写入。源预设Module按导入确认，静态卡片不自动执行程序来源预览。
- 原生路径箭头／括号新建隐藏源外观；已有路径应用不隐藏，旧custom本体仍可操作。修复custom预览document参数、未声明描线样式时的零线宽；显式0保持。Runtime算法无新增，其他参数入口不改。
- [四层落点及验收](../architecture/V4_PATTERN_CARDS_P2C_2026-10-22.md)。后续P3覆盖排序、P4目录闭包／私有来源清理、P5生产流水线不能提前宣称已完成。

## 2026-10-22 RC5-P2b：路径预设数据／取用

- 新增`EditorV4PathPatternPresets.normalize/fromPart/references/remapAssets/apply`，先加载登记，源码位于editor/v4-path-pattern-presets.js。五项复用patternResources、kind=pattern；mode=path＋carrier＋params，元素排布可嵌source元素闭包，不存旧sourceId。
- ResourceCore收集source依赖，导入重写图片引用；createPatternPart路径分支保留原几何、配置extensions及私有来源。旧custom分支继续使用本体参数，不改控件命名。
- drawing.configure移入changes.run，完整图元和来源同一历史；beginPreset按保存载体绘制，程序source使用已有导入授权，首次使用loadAuthorized，无重复确认。无新参数输入，无新卡片；P2c再接管目录／管理列表。
- Runtime的patternSnapshots.prepareScene跳过path源声明；正式Runtime及inline镜像已同步。所有实际生成／共享精灵绘制算法不变。[验收、样例及边界](../architecture/V4_PATH_PATTERN_PRESETS_P2B_2026-10-22.md)。

## 2026-10-22 RC5-P2a：图样共享服务准备

- `EditorV4MaterialSharing`的ref／link／publish／take支持kind=pattern，复用`materialShares`的pattern key、已有publication库与版本CAS。take返回selection.kind=pattern，不创建画布，也不自动共享。
- 素材共享页过滤仅image／sequence／element，避免新增图样publication误入素材卡。当前图样UI未替换，P2c再统一卡片，不提前将服务API当作可用按钮。
- 元素预设允许并校验`extensions.attached`，解决P1添加图样后无法入库的遗漏。Runtime绘制不变。
- 下一步P2b先补附着预设（尤其元素排布来源闭包），再做项目／共享、自带／我的卡片；不复制资源存储体系。合同与浏览器落点见[RC5实施表](PATTERN_RC5_DECISIONS_2026-10-22.md)。

## 2026-10-22 RC5-P1：添加式图样Inspector

- 定义与分批以[P0～P5合同](PATTERN_RC5_DECISIONS_2026-10-22.md)为准；P2目录卡片尚未改造，不要把旧“图样管理”当最终设计。
- Registry新增`attached/commit/remove`。`extensions.attached`仅表示添加身份，不是排序；参数写入保留此列表，默认归一化配置不自动成为卡片。
- 拓展空页`[data-add-pattern]`打开既有图样目录；已添加卡`[data-attached-pattern]`，移除`[data-remove-pattern]`。开关停用保值，移除可撤销；custom本体参数不显示移除附着按钮。
- 复用原global-section／small控件，未另建视觉系统或改变Runtime算法。新增浏览器`v4-pattern-additive`及Registry合同，原图样绘制回归通过；后续P2再替换文字管理列表与统一素材卡样式。

## 2026-10-22 RC4：供前端副本同步

- 素材行新增`#btn-export-material`，在`#btn-import-folder`左侧；其余导入顺序不变。未选项目素材时禁用；位图直接处理后PNG，序列／元素调用共用导出对话框，不新增可编辑包按钮。
- 删除收藏Tab与迁入入口；图样管理、缺失依赖提示留在各自上下文。项目／共享卡样式及♥更新语义不改。
- `EditorV4ProjectMaterialTransfer.read`识别工程文件夹，仅导入素材根与必要依赖；同身份同内容复用。普通图片文件夹走原流程。
- 组／粒子沿用元素卡与成样Inspector，不加面板。元素预设可选`children`及私有`sources`；共用蒙版引用适配，实例身份重映射。来源删除保护在结构状态命令内完成，不通过UI隐藏错误。
- 导出入口允许传入隔离素材上下文`scene/assets/time/base/assertCurrent`；不改场景导出的默认行为。预览／烘焙复用Runtime，粒子以工程画布作为输出范围。详见[验收及限制](../architecture/V4_RC4_MATERIAL_CLOSEOUT_2026-10-22.md)。

## 素材回存／移出／导入授权（本轮2／5／6）

ElementPresets新增store／linked／remove；MaterialController首次入库与回存同命令，#btn-store-element的data-material-command在store／update之间变化，更新显示↥。增加元素卡移除图标；图片卡改走同一历史／确认语义，assets[id].libraryHidden使Workflow及HTML投影隐藏而非删除数据，HTML素材签名同步加入该标记。Project保留、Resources portable与Delivery剥离。ModuleLoader新增authorizeImport／loadAuthorized，资源导入与共享取用先确认，后续预览／放置／新建只加载许可内容，不弹窗。Runtime算法不变。前端副本应同步状态API、数据校验和入口接线，不能只复制图标。此批未完成整张卡图标布局、项目页单向共享或独立构件栏移除；见[V4_MATERIAL_UPDATE_REMOVE_IMPORT](../architecture/V4_MATERIAL_UPDATE_REMOVE_IMPORT_2026-10-21.md)。

## 2026-10-21 RC3-c2b图样／构件／烘焙归位（无Inspector参数变化）

新增classic-v4-resource-entry-controller.js，在Resources、Materials及Sharing初始化后接入。PatternLibrary拆出catalogue和稳定managementHost，目录重绘不能清掉管理区。新控制器把图样管理挂在图样下，程序构件及选中构件烘焙挂在素材项目区；Shared的setScope统一隐藏data-material-project-only节点。ResourceController继续负责所有写命令、信任、预算和包导出，新增importFile根类型预检、状态／库变更／卸载订阅与原烘焙DOM挂载；正式页旧重复定义／保存／烘焙入口不再显示，但完整包归档留旧收藏。前端副本须同步脚本顺序、挂载位、范围状态及清理，不能只复制新按钮。Runtime／ModuleBaker／Scene／存储协议未变。详情及未覆盖范围见[V4_RESOURCE_ENTRY_PLACEMENT_RC3C2B](../architecture/V4_RESOURCE_ENTRY_PLACEMENT_RC3C2B_2026-10-21.md)。

## 2026-10-21 素材操作行（无Inspector参数／Runtime变化）

用户更新D3：标题下独立行左侧为项目／共享♡／♥单按钮，右侧三个导入SVG图标。HTML保留btn-import-folder／btn-import-sprite／btn-import的id与原流程，新增asset-import-buttons；SharingController将范围按钮挂到asset-import-actions而非side-import。CSS同步同排左右对齐、28px图标按钮与focus-visible，不能只移HTML。范围按钮aria-pressed表示共享态；data-material-scope-current为当前，data-material-scope为下一点击目标。导入的项目复位直接绑定按钮以避开stopPropagation；切工程复位同时更新内容可见性与预览。V4 ShortcutController及HTML残余监听中，聚焦原生按钮的空格交给按钮，不启动播放。旧收藏剩余迁移及RC4不变，详见RC3_MATERIAL_PANEL_DECISIONS。

## 2026-10-21 RC3-c2a旧素材迁入（无Inspector参数变化）

ResourceLibrary新增migrateMaterials，数据库v3新增legacy-material-migrations；保留v1/v2的三个既有store。同事务写入发布／内容／迁入关系，重复及并发不覆盖共享更新，移出后不复活。ResourceController旧包动作区只对位图／序列／元素根提供“迁入共享”；多根包拆完整闭包，其他根保留旧入口，原包不删除，当前工程不改。前端副本需同步library和controller，不仅复制按钮；无新脚本顺序、Runtime或Scene字段变化。详情与余项见[RC3-c2a](../architecture/V4_LEGACY_MATERIAL_MIGRATION_RC3C2A_2026-10-21.md)。

## 2026-10-21 RC3-c1素材统一预览（无Inspector参数变化）

新增v4-material-preview.js；HTML在两个素材控制器前创建唯一classicV4MaterialPreviews并传入previews。v4的renderLib停止旧活跃预览，位图／序列不再跑持续RAF，改绑同一管理器；项目元素及共享卡分别调用element／shared适配。卡片预览5:3及透明棋盘共用样式；悬停／P键单卡播放、离开首帧复位，隐藏／失焦／项目切换释放。首帧存ImageData，不能恢复为反复source-over叠加。syncClassicV4AssetShelf的失败路径改为名称＋错误占位，禁用添加／Alpha，不能继续静默丢卡。

前端副本需同步模块、init顺序、选中行为及清理，不只复制canvas。Runtime和Scene字段不变，不授信、不写回主画布；上游项目图像准备仍沿原管线。旧收藏图样／Module／烘焙还未迁完，不能删入口。验收与迁移清单见[RC3-c1](../architecture/V4_MATERIAL_PREVIEW_RC3C1_2026-10-21.md)。

## 2026-10-21 RC3-b素材共享（无Inspector参数变化）

HTML新增v4-material-sharing.js及classic-v4-material-sharing-controller.js，在MaterialController初始化后接入SharingController；renderLib结束同步renderProject。side-import内部显示项目／共享范围，选中项目卡提供共享开关／按需更新，共享卡提供取用与确认移出。三导入按钮的标题下独立行不变，不能重新收成菜单。复用Resources闭包，Project metadata新增materialShares，交付删除；v4-resource-library数据库升级v2但保留旧packages。Runtime无改动，不迁移或删除旧收藏的图样／Module入口。前端副本需同步CSS、选中卡状态、异步guard及实际授信边界；不能仅复制checkbox样式。见[字段／失败域／验收合同](../architecture/V4_MATERIAL_SHARING_RC3B_2026-10-21.md)。

## 2026-10-21 RC3-a项目素材入口（无Inspector参数变化）

新`classic-v4-material-controller.js`复用elementPresets，结构树粒子按钮右侧“库”提供入库，`renderLib`结束调用renderElements附加元素卡与三类标识；初始化在pattern／resource控制器之后。导入按钮移出asset-head，成为asset-pane直接子行，pattern-library从pane而非head查询。前端副本需同步HTML接线、resource-library.css及三个导入按钮原id，不另建素材真相源；位图预处理保持原入口。Runtime无改动，共享／烘焙／统一hover预览暂未接通，旧收藏不提前删。详见[RC3-a](../architecture/V4_PROJECT_MATERIAL_PANEL_RC3A_2026-10-21.md)。

## 2026-10-21 RC2-c2b父组蒙版坐标（无新控件）

蒙版新增内部geometryMatrix；前端副本须同步MaskState的detach／rebase／translate、Runtime的placementMatrix和classic-v4-mask-controller的绿色轮廓／命中／拖动。不能只移动编辑框或把椭圆换为包围矩形。多边形重绘保留几何基，矩阵不暴露为参数；对象预设只调用共享适配，未来亮度来源／绘制同沿该模块修改。Runtime源码及两份分发镜像同步；正式交付保留字段并检查masks.affineGeometry。无新UI／组入库入口。验证及边界见[RC2-c2b合同](../architecture/V4_ELEMENT_PARENT_MASK_SPACE_RC2C2B_2026-10-21.md)。

## 2026-10-21 RC2-c2a对象来源（投影同步，无新参数）

正式HTML需在element-presets前加载`v4-element-references.js`。预设新增可选sources，实际实例的内部来源有`referenceSourceOnly:true`；Runtime跳过独立绘制，View普通树／框选与CanvasHit跳过顶层选取，但引用渲染仍读取它。前端副本须同步这些角色投影，不能改成hidden或只隐藏树条目。根resourceBindings.sources为后续复制／删除／来源编辑的身份清单，不是全局可见图层；RC3／4尚未接入完整用户流程。资源／程序授信跨整条闭包，交付剥离绑定但保留角色；公共Player需更新到支持该角色的分发版本。无Inspector输入变化，蒙版继续共用MaskState。见[数据／四层落点／边界](../architecture/V4_ELEMENT_REFERENCE_CLOSURE_RC2C2A_2026-10-21.md)。

## 2026-10-21 RC2-c1蒙版同步落点（无新控件）

统一蒙版模块`vnext-mask-state.js`新增PORTABLE声明及portable／references／remapReferences／translate；alpha通道名单由该声明共用。元素预设及资源内核仅调用共享适配，避免另建素材蒙版配置；本批无输入、面板或Runtime算法变化。未来非图片亮度／绘制应更新共享类型／通道、几何／引用与对应Runtime／画布编辑测试，不能只改Inspector。元素引用、排布／端点及父组蒙版坐标仍待c2。正式HTML移除一条重复的element-presets脚本引用。详见[共享更新清单](../architecture/V4_ELEMENT_PRESET_MASKS_RC2C1_2026-10-21.md)。

## 2026-10-21 RC2-b资源依赖（仍无新控件）

`v4-element-presets.js`扩展图片／序列、文字双图集／布局、原生／声明式图样配方、Module素材闭包。未用预设不参与Runtime素材解码；Alpha侧图保存时脱离外部路径。无Inspector输入／卡片变化，不迁移现有素材面板，RC3再接入收入库／项目共享入口。文字未准备缓存时明确拒绝；保存字体名不等于携带字体文件。前端副本应同步数据模块、资源内核、素材加载器和项目包，而不是手写另一份依赖扫描。见[RC2-b四层落点及验收](../architecture/V4_ELEMENT_PRESET_DEPENDENCIES_RC2B_2026-10-21.md)。

## 2026-10-21 RC2-a元素预设（无新控件）

新增编辑器数据API `v4-element-presets.js`，正式页面需保留其脚本引用；资源导入提交字段包含`elementPresets`。不新增或移动Inspector输入／卡片，不改变Runtime渲染及普通复制保留时序的行为。定义捕获保留基础循环动态，排除时序和父组影响；新实例使用普通实体。后续RC3才接入收入素材库／项目共享入口，前端副本不要提前创建按钮。完整范围见[RC2-a合同](../architecture/V4_ELEMENT_PRESETS_RC2A_2026-10-21.md)。

## 2026-10-20 自动提取稳定性续批

详见[固定色板合同](../architecture/V4_AUTO_PALETTE_STABILITY_2026-10-20.md)。颜色映射的“最大颜色数”右侧增加同排小按钮“重新提取”，只在离散／自动提取时显示。首次启用、更改色数、切回自动提取时重新采样并固定，原命名色板／渐变布局不改。

新增内部数据 `extracted={colors:16,entries:[[r,g,b],...]}`，默认null、不生成输入框；字段可写Step，刷新遵循当前效果轨，启用开关仍为全局。该数据随工程／交付保存，不能改成仅前端临时缓存。旧工程无该字段时，需显式点一次“重新提取”才固定，普通打开／绘制不回写工程。

Runtime改为整幅图有界统计，修复主色占比过高造成空分组／NaN；RGB5表只加速可证明安全的格，边界用完整RGB精算，避免相近颜色的档位全部合并。提取异步预检、一次提交及失败提示由共享 `classic-v4-color-map-control.js`／Inspector接入；前端副本不要用Canvas截图或每次参数input重新取色。

## 2026-10-20 色带／颜色映射／CRT交接

当前实现见[10-20合同](../architecture/V4_COLOR_MAP_CRT_BANDS_2026-10-20.md)，覆盖下方10-19的对应待确认项：

| 项 | 输入／排版变更 | 数据与执行 |
| --- | --- | --- |
| 轮廓嵌套：层间色带 | 颜色标签为“末层颜色”；实心填充面板不变 | `nested.color`为终值，从图元fill插值；有效渐变fillPaint取最大offset色标的RGB，不继承其Alpha；缓存随fillPaint变化 |
| 颜色映射 | 同卡“渐变映射／离散色板”双态，默认离散；模式整行展示 | `mode=gradient/discrete`，Step；切换保留各自配置，不新增动态 |
| 离散色板 | 原调色板下拉保留；自动提取“最大颜色数”改六档单选2/4/8/16/32/64，默认16 | `colors`仍存数字；超出值按最近二次幂限至64；不再有256原图直通。命名色板覆盖该字段 |
| 渐变映射 | `gradient`共用原有paintField色标面板，ramp用法隐藏模式/空间几何/整体透明度，只保留色标自己的透明度 | `gradient={type:'linear',stops:[{offset,color,alpha}]}`，2～8色标；Step；256项亮度LUT同一像素遍，非空间填充 |
| CRT | 无新增输入 | 未设置范围蒙版时CPU/GPU同样最小居中缩放裁切；有蒙版时不缩放；透明来源不强制填实 |

共用组件增加 `paintField(..., options={ramp:true})`，常规填充继续默认纯色／线性／径向用法；不要在前端副本复制色标编辑器。Registry、Inspector、Runtime和测试四层均见上述合同。效果读取补默认值，但不回写作品；`gradient`默认数据深拷贝，避免卡片间污染。

## 2026-10-19 图样／采样调整交接

明细与待确认方案见[本批合同](../architecture/V4_EFFECT_ADJUSTMENTS_2026-10-19.md)。括号offsetX/Y由整体平移改为对称外扩／内收（字段不变）；闭合图元pathStart加入所属对象轨Linear；nested描线color/width变为末层终值，控件标签改“末层颜色／末层宽度”，移除宽度步差widthStep，基准描线样式插值。实心与层间色带仍保持原语义。

threshold-pulse增加 `motion.steps`“周期帧数”，默认12、整数1～120；CPU／实验GPU量化相位一致。color-map移除动态入口与palette-flash，保留取色数／调色板；旧motion不再执行。halftone增加 `originalBackground`“原图背景”，boolean、默认false、Step，不新增混合控件，背景为进入网点前的画面。双色渐变暂保留。

CRT边界策略、颜色映射中的连续渐变映射、网点双色渐变是否移除，以及嵌套填充是否也做终值插值均未实现，需下一轮确认。不要在前端副本中提前显示未接入的渐变映射或CRT补边入口。

## 2026-10-18 R3b声明式图样交接

新增Scene字段`patternDefinitions`，custom recipe及预设支持`definition/providerKey`；源码格式`tosampool-pattern-definition/v1`。模板的`parameters`通过原有拓展field生成number／boolean／select控件，输入key为`provider.<参数key>`，颜色／粗细继续共用图元外观，不在模板中复制。仅开放声明参数，坐标公式和路径节点不是Inspector用户输入。

左下原导入按钮文案为“导入图样/资源”，自动识别源定义或资源包。工程定义行显示版本与“应用此版本／停用”；导入新版不自动升级。停用保留匹配快照并锁定内部参数，重装精确内容恢复；界面动作均走现有SceneMutation，失败不部分写入。图样目录的原五项不改，外部模板首版从收藏中的工程预设“新建”拖拽。

新增`59j-pattern-provider.js`与`v4-pattern-lifecycle.js`，没有模板JS执行通道。`embedHtml`复用已有Player，防止多份片段重复初始化冻结的Runtime；共享Player过旧时明确报模板能力不足，不覆盖既有实例。跨工程粘贴预检模板身份冲突并携带注册数据。详见[R3b合同与证据](../architecture/V4_PATTERN_PROVIDERS_R3B_2026-10-18.md)。

## 2026-10-18 R3a静态图样快照交接

本批不新增图样参数或重排面板。custom增加可选`geometrySnapshot`，共享Runtime／Parts／工程／资源包／导出均读取。前端须通过`customShapes.supports(part.recipe)`判定精确实现是否存在，缺失但有匹配缓存时不渲染内部外观和拓展输入，保留基础变换及动态。设置器同样拒绝修改缓存内部参数，不能只把控件视觉置灰。收藏栏将此状态显示为“生成器缺失，使用缓存”，可继续取用／拖拽创建静态缓存。详情与预算见[合同](../architecture/V4_PATTERN_SNAPSHOT_R3A_2026-10-18.md)。没有新增生成器安装按钮，R3b尚未实现。

## 2026-10-18 统一资源R2入口交接

新增左下第三分页“收藏”，样式单独位于`classic-v4-resource-library.css`，控制器为`classic-v4-resource-controller.js`。原图样栏通过`registerShelf`挂接，不在Inspector新增控件、不改参数。drawing的`beginPattern`增加可选`presetId`，绘制预览／提交统一读取工程内`patternResources`。当前仅角点箭头／括号custom支持收藏所选参数；附着拓展预设未支持。取用使用SceneMutation一次提交，收藏移除的撤销单独处理。供并行UI会话沿用字段与入口，勿再另造收藏状态或复制参数控件。

## 2026-10-18 统一资源R1交接（不修改前端输入）

R1批次没有新增Inspector控件或参数，不改变括号／箭头的字段与面板排布。新增`EditorV4Resources`与`EditorV4ResourceLibrary`并由classic加载；当时尚无用户入口，现已由上方R2接入。Scene新增可选`patternResources/resourcePins/resourceOrigins`，工程保存校验资源闭包，交付剥离库元数据。资源导入只复制，不创建对象、不执行模块；UI接入须经过现有命令／撤销边界，不能直接把API调用当成完整用户操作。详见[资源合同](../architecture/V4_RESOURCE_PACKAGE_CONTRACT_2026-10-18.md)。

状态：**边缘透明度、12 项原生混合模式已接入；颜色透明度统一与纯色／线性／径向共用弹层已落地，具体范围见第七节。参数软／硬范围仍是已确认的交互方向，尚未实现。** 本文供并行调整前端组件样式、Inspector 排布的会话逐项同步。另一会话正在修改既有设计文档与输入组件，本次使用此交接文件记录跨层事实；代码位置实施前应重新检索。

## 一、Legacy「边缘处理」到底是什么

Legacy 的「保留／边缘消除／边缘增强」对应 `alphaMode = keep / remove / boost`。它处理的是**重采样工作面的 Alpha 通道**，不是检测几何轮廓，也不是当前偏移采样／不均采样的「边缘保护」。具体为：

| 模式 | Alpha 变换 | 视觉意图 |
| --- | --- | --- |
| `keep` | 原值不变 | 保留软边及半透明 |
| `remove` | `a < 128 → 0`，`a ≥ 128 → 255` | 消除半透明边，硬化轮廓 |
| `boost` | `a > 0 → 255` | 加强所有非零边缘像素 |

依据：`img2asset-layout-v1.html:5173-5174`、`:4110-4119`；具体 Alpha 变换见该文件 `:928-930`、`:1284` 和 `home-scene.js` 的 `alphaMode` 路径。V4 `editor/effect-registry-vnext.js:61-67` 的通用采样格仅声明 `size`；`runtime-src/vnext/68-sampling-effects.js:342-357` 只建立低分辨率工作面并放大，没有同等的通用 Alpha 处理。**这是遗漏的能力，而不是把一个已有控件藏在别处。**

建议：在「采样格」的渐进参数内恢复一个语义更清楚的 `边缘透明度` 选择：`保留 / 二值化 / 填满`，内部稳定值可继续用 `keep / remove / boost`。默认 `keep`。它应作用于通用采样工作面、在最近邻放大之前；`keep` 不做像素遍历。采样尺寸为 1 时若用户显式选择后二项，也应有效。不要与「偏移采样／不均采样」的轮廓保护合并或同名。需要专门测试图片、文字、多图元、半透明素材及场景采样；如果对网点／色散造成意外硬边，需确定 Alpha 处理位于具体采样效果之前还是之后，不能仅改 Inspector。

四层落点：Registry `sampling-grid.alphaMode` 已新增；现有 Inspector 根据 Registry 自动生成采样格选择器，另一会话可调整视觉呈现但须保留三个稳定值；Runtime 在通用采样工作面上处理 Alpha，且尺寸为 1 时仍触发对象／场景采样；状态、Runtime smoke 和真实浏览器 Canvas 夹具 `tests/browser/v4-sampling-alpha-edge.mjs` 已断言三种映射。**尚待 Full／Draft／导出一致性及含多效果场景的性能测试。** 场景级多个采样效果目前会分别调用采样管线，Alpha 二值化虽幂等但可能重复像素遍历；后续性能整合应同时审计这一已有路径。

## 二、混合方式：`darker` 不是 Canvas 指令

本轮扩展前仅有 `normal / screen / multiply / lighter` 四项。`normal` 应映射为 `source-over`；`lighter` 是相加型混合，**不是** `darken` 的反义配对。Canvas 2D 有 `darken`（逐通道保留较暗值）和 `lighten`（逐通道保留较亮值），没有 `darker`。Photoshop 的 `Darker Color` 又不同于逐通道 `Darken`，不能直接用一个 Canvas 操作同义替代。参考：[MDN Canvas 2D 合成模式](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation)、[Adobe 混合模式说明](https://helpx.adobe.com/photoshop/desktop/repair-retouch/adjust-light-tone/blending-mode-descriptions.html)。

当时四项足够覆盖普通覆盖、压暗、提亮和加色，但对 ToSampool 的拼贴、复印、色膜用途**不算完整**。用户随后确认下方 12 项原生模式。`multiply` 会整体乘暗，`darken` 则只选择较暗通道，效果可辨。旧 `lighter` 仍由 Runtime 读取，但不作为新下拉选项。

### 用户提出的 13 项候选：12 项原生模式已接入，Dissolve 未纳入

原提案排列：`Normal / Dissolve / Multiply / Darken / Screen / Lighten / Overlay / Soft Light / Difference / Luminosity / Saturation / Hue / Color`。确认后的下拉顺序去除 `Dissolve`。其余 Canvas 2D `globalCompositeOperation` **已有对应原生模式**；`Normal` 的实际指令是 `source-over`，`Soft Light` 的值是 `soft-light`。这些模式一般只改变已有一次合成的运算，不要求每帧 JS `getImageData`，因此扩大菜单本身几乎没有额外帧开销；但实际成本应以目标浏览器／Tauri WebView 的 GPU／CPU 合成表现和对象胶囊数量测定。每个效果仍要有自己的离屏工作面，不能把“模式原生”误读为整个效果零成本。

`Dissolve` 不是原生 Canvas 混合模式。按 Photoshop 语义，它根据透明度在基色与混合色之间做逐像素的随机取舍，而非通常的透明度插值。若实现，需选定稳定的散点分布、随机种子、时间相位、Alpha／组混合语义及边缘行为。精确逐像素方案通常需要读回／写回，场景全幅代价明显；若只根据**整体透明度**使用可缓存的二值噪点蒙版，可降低成本但不等价于逐像素 Alpha 溶解。它也会与本产品已有的屏幕噪点、阈值、纹理形成重叠。**建议先不把 Dissolve 混入通用 blend 下拉**；可独立论证为带参数的效果，或只对有限面积对象开放。参考 [Adobe 对 Dissolve 的定义](https://helpx.adobe.com/photoshop/desktop/repair-retouch/adjust-light-tone/blending-mode-descriptions.html)。

对拟议列表的语义提醒：`Hue / Saturation / Color / Luminosity` 属于非分离的颜色分量混合，与调色四轴的对象内调整不同；背景色、叠加色及 Alpha 都影响结果。要分别测试加样内部、对象最终混合和场景滤镜，而不是看一张无透明度的对照图。建议实现批次为：先统一原生 12 项的映射与清单，修好 `normal` 的内部值；再单独评估 `Dissolve`，不要让它延误原生模式。

同步风险：`effect-registry-vnext.js` 多张加样卡及场景效果各自重复列出四项；对象「成样」的混合方式也单独列出；Runtime 在 `60-content-renderer.js`、`65-decorate-effects.js`、`69-scene-effects.js`、`70-object-composer.js` 分别映射。需一次统一 Registry、Inspector、项目值校验、Runtime、测试，不能仅增加下拉选项。目前 `65-decorate-effects.js:56,68` 和 `69-scene-effects.js:52` 将合法的产品值 `normal` 原样写给 `globalCompositeOperation`；Canvas 实际值应明确映射为 `source-over`，扩充模式前应先收敛这一点。

**比模式数量更先要核对的语义：**投影与描边的当前实现先把着色层画到透明胶囊，再绘制对象原图（`65-decorate-effects.js:23-50`）。其 blend 没有必然可混合的既有底色，因此部分选项可能视觉相同；这与「染色／纹理叠加」先画原图再混合不同。若希望投影／描边的混合方式与场景下层发生作用，需要延后为独立层参与对象外部合成，不能仅扩大菜单；也可能选择只在有明确混合底图的效果上提供全套模式。实施前应用彩色底层、半透明对象、含投影与描边的样例逐项验收。

## 三、V4 效果参数上限清单及依据

`editor/vnext-effect-state.js:36-42` 会按 Registry 的 `min/max` **实际截断写入值**。因此这些不是单纯滑杆范围；只改 UI `max` 没用。以下只盘点效果 Registry，工具栏、素材预处理、画布尺寸等需另行审计。

| 类别 | 当前代表上限 | 性质与建议 |
| --- | --- | --- |
| 透明度、阈值、密度、相位、归一化位置 | 多为 `0…1` | 数学／数据定义域，保留；前端可用百分比呈现。 |
| 角度、色相 | 多为 `-180…180` | 周期等价范围，保留并可归一化；不是创作幅度上限。 |
| 自动颜色映射 | 取色数 `2…256` | 产品算法与性能策略；256 并非所有图片「原色」的数学保证。保留但需清楚标注算法行为。 |
| 采样格 | 尺寸 `1…128` | 固定产品上限；极大值对小对象无意义。建议按对象／画布实际尺寸和最低工作面计算有效上限，而非盲目解除。 |
| 投影／描边 | 距离 `0…96`；宽度 `1…16` | 与离屏胶囊 padding、绘制质量／成本相关的工程上限，不是语义上限。投影「最大 9」**不是当前 Registry 值**，若 UI 显示 9 需排查另一输入路径。优先给数值输入更大范围前，验证扩张后的离屏像素与描边轮廓质量。 |
| 内／外光效 | 范围 `1…64`；退晕层数 `1…6` | 范围受离屏像素和扩张绘制成本影响；层数 6 同时写入 Runtime `lightHalo` 硬上限，需同步变更。不是无成本可放开的控件。 |
| 纹理图案 | 格距、图样大小、多组线宽与格距 `1…256`；噪点颗粒 `1…16` | 前者超过对象尺寸时通常失去意义，建议按对象尺度与 tile 预算定有效范围；后者是当前噪点实现／风格限制。 |
| 边缘色散 | 距离 `0…32`；边缘宽度 `1…6` | 样本邻域与像素遍历成本／语义上限；应随画面尺度与预览预算验证。 |
| 偏移采样 | 沸腾偏置 `0…64`、呼吸幅度 `0…64`；保护宽度 `1…8`；故障条带数 `1…64`、厚度 `1…128`、最大位移 `0…256` | 沸腾实际还受采样格 `size-1` 限制；Registry 64 并不是最终有效值。条带数量会提高工作量；位移和厚度宜受目标边界约束。 |
| 网点／不均采样 | 网点相对尺寸 `1…32`、对比 `0.1…3`；最大采样 `1…32`；场图样尺度 `4…1024`；保护宽度 `1…16` | 有算法质量和工作面尺度约束；比固定上限更适合用最终可见单元数量／对象尺寸解释。 |
| 动态参数 | 周期帧数常为 `≤60` 或 `≤120`；采样频率 `≤60`；流动速度 `±4`、网点移动 `±8` 等 | 多为 UX／可验证预算，非每帧循环次数上限；应按周期与帧率定义离散上限，允许合理的文本输入扩展前须核对循环闭合。 |

上限的成本不只在单个数值运算。投影／描边／外光效的 padding 参与 `runtime-src/vnext/70-object-composer.js:49` 的胶囊尺寸，来自 `65-decorate-effects.js:127-132`。内存与处理面近似随 `(宽+2p)×(高+2p)` 增长；超大距离甚至会分配大量透明像素。描边已有有界角度戳算法（`:29-49`），源码注释记录旧算法在宽度 16、1920 像素图上约需 1600 次整图复制；**旧数值限制不能机械当成新算法的性能结论，但也不能只删 `max` 而不验证外观**。外部软件通常允许较宽的参数操作范围，同时承担预览与缓存成本；例如 GIMP 的投影 X/Y 偏移允许负值且会处理图层尺寸扩展，[文档](https://docs.gimp.org/3.0/en/script-fu-drop-shadow.html) 并未将这里的 96 当成通用标准。

建议统一规则：

1. 保留真实定义域（透明度、相位、角度）和明确的算法预算（层数、条带数）；删除「因为当初 UI 好画」而留下的固定小上限。
2. 对距离／宽度／光效范围采用**适用范围 + 性能预算**：滑杆提供舒适的常用区间，数值输入可超出滑杆，但由基于目标尺寸、离屏像素量和预览预算的真实硬限制兜底；超限必须说明，禁止无提示截断。
   - 交接给输入组件会话的控件合同：`softMax` 仅控制滑杆的常用行程，不写入项目；超过软范围的合法数值保存在同一参数中，输入框显示原值而非回弹。若滑杆还可继续拖动，应随当前值扩展行程或显式显示「超出滑杆范围」，不能把旋钮停在 100% 却暗示数值等于 `softMax`。
   - `hardMax`（或基于对象大小／离屏像素预算计算的有效上限）才用于真实校验。当前 Registry 的 `max` 由状态写入直接裁剪，迁移到新合同前不得简单将 `max` 当作滑杆上限。
3. 实施顺序：先统一单一参数规格和 Runtime 保护，再开放 Inspector 输入，再做极值与导出一致性测试。不能先让 UI 输入无限大，因为 Renderer 仍可能截断、裁切或分配超大胶囊。
4. 记录决策：具体动态硬阈值与产品允许范围尚未确定；下一步应选 320×180、1920×1080、含大图对象三组夹具测 P95、离屏峰值、边缘画质后定量。本文不替其他会话预设这些数值。

## 四、交接动作（待确认，不应被当作已完成）

- **边缘 Alpha**：确定名称和作用阶段；另建 Registry／Runtime／测试条目；输入组件会话复用同一 `keep/remove/boost` 值。
- **混合模式**：用户已确认仅使用 `Normal / Multiply / Darken / Screen / Lighten / Overlay / Soft Light / Difference / Luminosity / Saturation / Hue / Color`，不引入*混合模式* `Dissolve`（已有的场景溶解转场不受影响）。Registry 各效果共用 12 项，Runtime 统一 `normal→source-over`，原有 `lighter` 仅保留为旧 V4 数据的读取路径。`tests/browser/v4-native-blend-modes.mjs` 已验证真实浏览器 Canvas 接受全部 12 项，对象级关键模式的输出可区分；**尚需逐效果层验收“模式有作用”**，尤其投影／描边的透明胶囊语义。
- **上限**：先解决用户遇到的投影「9」来源；按上表将硬限分成数学、算法、内存、临时 UI 四类。UI 会话不要独自扩大 `max`，Runtime 会话不要独自截断新输入。
- **2026-10-08 更正**：用户确认当前投影控件实际上显示 `96`，不存在 `9` 的 UI 故障，无需继续排查该项。用户确认采用「滑杆常用范围＋可扩展数值输入」。具体上限数值与容量策略尚未批准；在 Registry、状态写入的硬裁剪和 Runtime 离屏预算统一前，另一会话只能先实现控件结构，不能声称输入已可越过 96／16。
- **版本与并行安全**：其他会话正在改 Inspector 样式和输入。任何本文件的新参数或范围都必须同步其输入规格，并配 Registry → Inspector → Runtime → 测试四层清单，避免两处定义漂移。

## 五、颜色—透明度入口审计（V4；2026-10-08 已按第七节实施）

原则：颜色自身的 Alpha、对象整体透明度、效果强度、蒙版覆盖率不是同一参数。面板可复用**同一取色器组件**，但须由调用方声明其 Alpha 绑定字段或明确禁用。UI 一律以百分比显示；工程存值可仍为 `0…1`。不能因为一个字段叫 `strength` 就自动视为颜色 Alpha。

| 入口 | 当前颜色／Alpha 数据 | 建议 |
| --- | --- | --- |
| 场景底色、场景纹理颜色 | `background.color + background.alpha`；`fillPattern.color + opacity`。Inspector 已接共享取色器及 Alpha。 | 保留；与场景／对象整体透明度分开。 |
| 图元和基础形状的填色／路径描线／纹理 | `fill + fillAlpha`、`stroke + strokeAlpha`、`fillPattern.color + opacity`。Inspector 已接。 | 保留；渐变仅应首先接入「填色」，路径描线的渐变另议。 |
| 投影、描边、染色、纹理叠加、内／外光效 | Registry 均为 `color + alpha`，Inspector 可通过 `effectColorControl` 绑定。 | 保留，统一显示为颜色＋透明度；不要与对象最终 `alpha` 混淆。 |
| 蒙版暗角 | `color + strength`；Runtime `69-scene-effects.js` 用 `strength` 乘整层渐变 Alpha。现共享取色器只自动寻找名为 `alpha` 的参数，所以此项**没有**取色器透明度联动，仍单列「强度」。 | 这项在当前算法中等价于光层透明度。建议取色器 Alpha 显示「透明度」，内部绑定到现有 `strength`；移除重复的独立强度输入，避免两处操作同一个量。若将来新增真实“强度”（非 Alpha），再另设字段。 |
| 工具栏新建形状／路径描线 | 工具栏原生 `<input type=color>` 仅存颜色；创建图元数据已支持 `fillAlpha / strokeAlpha`，默认均为 1。 | 应复用取色器并提供透明度，把值写入新图元；预览画笔与实际提交必须一致。 |
| 工具栏文字、文字 Inspector | 工具栏仅有 `text-fillc`；文字 Inspector 现在走无 Alpha 的 `color()`；`vnext-text-state.js` 的透明 PNG 生成也未使用 `fillAlpha`。 | 应接入填色透明度，但**必须同时**把 Alpha 写进文字栅格化及重生成流程；不能只加 UI，否则文字快照／导出不会变。对象整体透明度仍独立。 |
| 阈值分色的暗／亮色、网点双色的暗／亮色 | 只是两种目标色值；像素 Alpha 应继承源图／网点覆盖。 | **不默认附加独立 Alpha**。否则会改变对象轮廓与采样结果，破坏“双色”语义。未来若明确要透明色板，作为另一种有意的输出模式。 |
| 黑场转场颜色 | 转场随进度计算覆盖程度；当前颜色默认不透明。 | **不在颜色面板增加独立 Alpha**；否则与转场进度出现双重透明度，应另设计“最大遮蔽”才可开放。 |
| 素材预处理的去背景取样色 | 色键判定用 RGB＋容差，不是输出填色。 | 不接 Alpha。 |
| Agent Module 暴露的任意颜色、粒子预设内部颜色 | Module 控件未必声明配套透明度；粒子整体已有独立 `alpha`，源图元可能另有填色 Alpha。 | 不推断自动配对；Module manifest 必须显式声明 `alphaKey` 才复用取色器 Alpha。 |

共享组件合同建议：`ColorBinding = { colorKey, alphaKey?: string, alphaMeaning?: 'paint-opacity'|'effect-opacity', alphaEnabled }`。调用方只负责读写与预览事务，取色器负责 HSV／HEX／取色／Alpha 的统一交互；颜色变化时画布实时预览、提交时合并一次历史记录。不要把 Alpha 永久编码进 `#RRGGBBAA` 同时又保留独立字段，避免双重乘算。

## 六、渐变填充可行性（立项时的论证；实际实现见第七节）

**低成本起点：只做局部坐标的线性渐变填色。** Canvas 2D 原生 `createLinearGradient` 可直接作为 `fillStyle`；对矩形、椭圆、多边形及图元路径，不需要 JS 逐像素处理。初版两色标、可调整起止位置／角度与整体透明度；色标应调用同一取色器。渐变先进入对象成样，然后让现有纹理填充、加样、采样正常接在后面。采样格大于 1 时渐变会随现有最近邻管线像素化。参考：[MDN 线性渐变](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createLinearGradient)。

**成本边界：**在矢量路径上，原生渐变通常只增加渐变着色成本，不需要新增全幅离屏层；每帧重新构造渐变或大量动态色标才会显著增加 CPU 工作。对已有图片、程序绘制结果做“渐变叠加”是另一种效果，需要对象 Alpha 裁剪／额外合成层，不应混作「填充」。文字当前保存透明 PNG 快照；若允许文字渐变，需要重栅格化快照并检验未安装字体时的回放。场景背景可原生填充全幅渐变，但在 1920×1080 下仍需测预览 P95；不建议一开始同时开放径向／多色标／逐帧运动。

**立项建议与最终差异：**同一个颜色弹层顶部切换填充模式；纯色保留 HSV／HEX／Alpha；渐变页提供预览条和色标。实际实现增加径向模式，保留 `fill: '#rrggbb'` 作为纯色回退，以可选 `fillPaint` 存储渐变；具体见第七节。

## 七、颜色控件与渐变填充的实施合同（2026-10-08）

设计意图是**在已有填充控件里顺手选择颜色或渐变**，沿用当前 Classic V4 面板的深色、密度与操作节奏，不另造设置页。参考 Illustrator 的 Gradient 面板：颜色类型、渐变条、色标位置／不透明度、线性角度、径向中心与范围可以在一处调整。V4 暂不复制画布上的 Gradient Annotator、Freeform Gradient 或路径描线渐变；这不是遗漏的隐藏入口。参考：[Adobe Gradient 类型与 Annotator](https://helpx.adobe.com/illustrator/desktop/paint-and-fill/create-and-edit-gradients/gradients-overview.html)、[Adobe Gradient 工具](https://helpx.adobe.com/illustrator/using/tool-techniques/gradient-tool.html)。

### 1. 数据与含义

`fill` 仍为 `#RRGGBB` 纯色回退；新 `fillPaint` 为可选结构，应用于对象、图元、文字及 `background.fillPaint`：

```json
{"type":"linear","angle":0,"cx":0.5,"cy":0.5,"radius":0.5,"stops":[{"offset":0,"color":"#ff0000","alpha":1},{"offset":1,"color":"#ffffff","alpha":1}]}
```

- `type` 为 `linear | radial`。`angle=0` 表示由左到右，顺时针为正。线性端点由局部绘制边界推导，不在场景文件额外存绝对像素坐标。
- `cx/cy` 是径向中心的 0…1 比例，`radius` 是相对较长边的比例（默认 0.5；编辑器显示百分比）。色标 `offset` 为 0…1，`alpha` 为单个色标透明度，色标最多 8 个。
- 原有 `fillAlpha`／`background.alpha` 是**整层填充透明度**；渐变色标 Alpha 与其乘算，不能用对象最终 `alpha` 代替。工具栏新建的图元及文字快照写入相同数据。
- 切回纯色时 `fillPaint=null`，而 `fill` 保留原纯色。切换线性／径向时复用色标和整体透明度。当前不保留“切回纯色前的上一份渐变”作为隐藏工程数据；再次启用渐变以当前纯色为第一个色标重新建立。

### 2. 四层落点与交给并行 UI 会话的约束

| 层 | 已实施 | 后续视觉改造不得破坏 |
| --- | --- | --- |
| 声明／Scene 数据 | `fillPaint` 为填充的局部 Paint 数据；效果 Registry 的 `masked-inner-light.color.alphaKey='strength'` 将原「强度」归并为取色器「透明度」而不改旧数据键。 | 不要把 `fill` 字符串改造成对象，也不要将颜色 Alpha 和对象整体 `alpha` 混用；阈值双色、转场色与去背景取样色保持无 Alpha。 |
| Inspector／工具栏 | `img2asset-v4-classic.html` 的共享颜色弹层新增 `纯色｜线性｜径向` 标签；图元、单图形对象、文字、场景底色的填充入口共用此弹层；其他颜色继续共用原取色器。工具栏新建图形、路径描线及文字现在有同款取色与透明度；填充另支持渐变。素材预处理的去背景取样色也复用取色器，但明确不提供 Alpha。色标可点击增加／删除、拖动或输入位置，沿用现有 HSV／HEX／取色器编辑所选色标。 | 每个颜色入口都要显式声明是否绑定 Alpha；单独装饰效果的颜色透明度不能额外重复一行；调整时保持画布实时预览，并在结束操作时合并历史。渐变仅属于填充，不自动扩展到「纹理叠加」「染色叠加」或已有图片。 |
| Runtime／导出 | `runtime-src/vnext/58-paint.js` 用原生 Canvas `createLinearGradient/createRadialGradient`；`60-content-renderer.js`、`80-scene-renderer.js` 共享。文字在 `vnext-text-state.js` 栅格化时也使用同一画刷并保留 Alpha；`home-scene-vnext.js` 已重建，导出 Runtime 与编辑器一致。 | 渐变相对各自局部边界，不额外分配一张全幅工作面；纹理填充的 `replace/overlay` 顺序和对象加样／采样阶段保持原状。 |
| 测试 | `tests/browser/v4-paint-gradient.mjs` 验证矩形、图元、背景的固定像素、文字透明度、Inspector 色标／几何参数、工具栏新建图元。`tests/v4-effect-parameter-plan-contract.mjs` 验证蒙版暗角不重复显示强度；接入 `scripts/verify-v4.mjs`。 | 后续 UI 改版至少保留这批行为回归；含大图、高倍采样和 8 色标渐变的 P95／内存预算仍待单独压测。 |

性能判断：矢量路径、文字栅格与背景使用浏览器原生渐变画刷，**没有新 JS 像素遍历或渐变专用离屏层**；已有对象胶囊、采样和装饰仍按原路径执行。当前每次绘制会创建一个 CanvasGradient，较单色 fill 有一定着色与对象分配成本；若日后大量对象、每帧变化色标或 1920×1080 全幅径向渐变造成 P95 回退，再按上下文、尺寸与 Paint 参数建立缓存。此处不先引入缓存，以免失效条件与跨 Canvas 上下文错误抵消收益。

## 八、矢量对象混合方式修复（2026-10-08）

`成样 > 混合 > 模式` 属于**对象整体**与下方场景的合成，而非逐图元各自与场景合成。此前无效果的矢量对象走直接绘制路径；`content.draw` 先设置对象混合方式，随后每个 `drawPart` 再将 Canvas 合成方式重置为图元自身 `part.blend`（缺省 normal），使对象混合方式看似无效。对象启用效果后走胶囊路径，才意外恢复正常。

现在 `70-object-composer.js` 对任何非 normal 的对象混合方式使用已有对象胶囊：先在透明背景上组合内部图元，再一次性以对象 `blend` 合成到场景。normal 仍保留原直接绘制快路径；图元自身 `part.blend` 继续只负责对象内部的图元间合成。未增加新的混合模式或工程字段。`tests/browser/v4-vector-blend.mjs` 覆盖 Inspector 写入、正常／正片叠底／滤色的实际像素，以及启用对象效果后的同一语义；已加入 `verify-v4`。

## 九、纹理叠加的实色混合（2026-10-09；已实现）

仅 `texture-overlay.blend` 增加 `hard-mix`，通用对象／图元混合方式和其他加样效果仍使用 12 项浏览器原生模式，不能在共享下拉菜单里误露出不可用选项。Runtime 的 `57-hard-mix.js` 按 RGB 通道分别计算 `base + blend >= 255 ? 255 : 0`，再按两层 Alpha 做 source-over 合成；纹理叠加在 `65-decorate-effects.js` 遇到此模式时调用逐像素路径。Agent Manifest 已暴露该模式的额外性能等级，Inspector 会提示大画布播放成本。

专项浏览器夹具 `tests/browser/v4-hard-mix.mjs` 验证像素、透明度、UI 与无原生模式回退。含完整画布回读的隔离性能记录见 [Hard Mix 性能报告](../architecture/HARD_MIX_PERFORMANCE_2026-10-09.md)：1920×1080 的 Hard Mix P50/P95 为 94.0/169.3 ms，不适合作为全屏连续动画的默认效果。后续视觉 UI 会话只可改控件外观和布局；若要扩大此混合方式的适用范围，必须先补对应 Runtime、性能预算及浏览器测试。

## 十、网点映射参数与边界（2026-10-09；已实现）

| 层 | 当前合同 | 后续 UI 会话注意 |
| --- | --- | --- |
| Registry／存储 | `colorMode` 为 `original`（默认）／`single`／`gradient`；单色使用 `singleColor`，渐变使用 `duotoneDark` 与 `duotoneLight`。新建参数不再含旧 `duotone` 双态开关，但 Runtime 只读回退仍保留旧二值效果。`rowOffset` 直接取 `0…1`，默认 `0` 等同整齐，`.5` 等同半格错列；新建参数不再有 `layout`，旧 `layout=stagger` 在缺失 `rowOffset` 时仍按半格读入。`threshold` 默认 `.65`、范围 `0…1`；`contrast` 默认 `.75`、范围 `.25…2`。 | 不要复活独立“整齐／错列”选择或“双色”开关。色彩下拉改变后必须立即渐进显示对应颜色；色彩字段没有独立 Alpha。 |
| Inspector | 网点映射使用普通 Registry 控件；切换 `colorMode` 会立即重新规划可见字段。起始偏移 X/Y 与错列偏移都用于实际格点位置。 | 标签“阈值”表示网点覆盖基准而非双色切断值；“对比”表示明暗对网点半径的影响，不是像素颜色的 RGB 对比。若未来改名，Registry／Inspector／文档／测试同时变更。 |
| Runtime | 每分析格取一份代表 RGB；原色按原 RGB 量化分批绘制，单色仅换网点色、仍按亮度改变大小；渐变按代表亮度在暗／亮两色间连续插值。半径强度为 `clamp((0.5 - luma) × contrast + threshold, 0, 1)`。格点排布读取 `rowOffset` 和起始偏移；额外的小尺寸最近邻 Alpha 读数判断格点中心是否属于对象，避免透明胶囊留白生成整行点。已经生成的边缘网点仍保持完整，不沿原对象 Alpha 裁断。 | 透明边界内一个网点的半径仍可越过原几何框半格左右；这与“完整印刷网点”合同一致。不要通过最后裁剪整个网点图来消除，除非产品决定改变边缘视觉语义。 |
| 测试 | `tests/browser/v4-halftone-mapping.mjs` 验证三种色彩、错列位置、阈值／对比的独立影响、透明对象外无额外网点中心；已接入 `verify-v4`。 | 未来改图样格与 Alpha 策略时，应保留矩形边界夹具。 |

性能变化：网点映射原先一次低分辨率平滑读取；现在增加一次同尺寸最近邻 Alpha 读取，成本按网点分析格数量而非全画布像素数量增长。若高密度多对象场景 P95 出现回退，再评估共用已有 Alpha 工作面，不能先退回“平均 Alpha 扩张网点中心”的错误结果。

## 十一、场景采样滤镜「CRT 显示」交接（2026-10-13；已实现）

| 层 | 当前事实 | 并行 UI 会话的同步要求 |
| --- | --- | --- |
| Registry / 工程 | 稳定 ID 为 `crt-display`，**仅 `scene` 作用域**，位于场景采样阶段末端。七个主题为可编辑参数预设；静态参数包括曲率、扫描线强度与间距、荧光栅格、RGB 错位、光晕、暗角、显示色彩与荧光色。噪声／闪烁／滚动亮带强度仍保存为该效果的参数。动态配置为 `motion:{enabled,type:'crt-motion',period,steps,scanlineDrift}`，全部 Step。 | 入口只放在场景 Inspector 的「采样滤镜」，不要复制到对象采样或场景背景成样。主题切换要写入参数而非仅换主题名；动态开关关闭不删除已填写参数。 |
| Inspector | 效果卡「动态」默认关闭。打开后渐进显示周期时间、周期帧数、扫描线漂移，以及噪声、闪烁、滚动亮带强度。只有一种动态类型时不显示「动态方式」单选下拉；这条规则已推广给所有仅有一种可用动态类型的效果。 | 样式改造保留「动态」开关和参数的展开关系。静态 CRT 仍可看到扫描线、荧光栅格和固定相位纹理；不要把关闭动态误当成停用整张效果卡。 |
| Runtime / 调度 / 导出 | `68a-crt-screen.js` 优先使用离屏 WebGL，失败回退 Canvas 2D；两条路径共用数据。动态开启后相位按周期循环，预览调度器因 `motion.enabled` 持续绘制，即使场景对象不动。关闭后相位固定为零。测试场景沿用同一 v4 Runtime 镜像，无单独的 CRT 网页实现。 | 当前 GPU 只加速 CRT；其他效果不因本卡启用而加速。CPU 回退在大画布可能较慢，UI 不应保证所有设备全分辨率实时。 |
| 测试 | `tests/browser/v4-crt-display.mjs` 验证七主题不同、GPU 非空输出、CPU 确定性、动态开关及预览调度、单一动态方式不显示冗余下拉。已接入 `scripts/verify-v4.mjs`。 | 后续修改组件时保留专项测试，并在目标画布上人工检查大尺寸扫描线／荧光栅格产生的摩尔纹是否可接受。 |

参考实现的扫描线相位随时间移动，且与横向荧光栅格、亮带叠加；本效果采用独立实现，不承诺与参考网站逐像素一致。GPU 迁移的下一步应先做场景级后处理共享管线的基准实验，**不应把「支持 Linear」与「改用 GPU」等同**：Linear 首先是时间轴参数求值与过渡语义，GPU 只可能降低某些连续变化参数每帧重绘的成本。

## 十二、文字完成度与可选光标（2026-10-13）

| 层 | 当前合同 | 并行 UI 会话同步要求 |
| --- | --- | --- |
| 工程／参数 | `textCompletion`：0–100，默认100，支持对象轨 Step/Linear；`textCursor.enabled/style/period/color`：Step，默认关闭，样式竖线／下划线／方块，闪烁周期默认1秒，0常亮；颜色null跟随正文。 | 放在对象成样的「文字」栏；不要把完成度实现为整体透明度或图像裁切，也不建立额外的打字效果轨。 |
| Inspector | 完成度输入与现有「时序」写入方式共用，未武装时改基础值；光标开关启用后立即展开样式、闪烁周期、颜色跟随及可选自定义颜色。 | 样式重排须保留渐进展开与当前播放位置的参数刷新；完成度可显示 Linear 标记。 |
| Runtime／资源 | `59-text-reveal.js` 在成样内容阶段显现完整字形；完整PNG快照＋单张字形图集＋排版元数据。两张PNG均为内部资源，导出自包含，无字体运行依赖。完成度不改变完整布局；光标所需空间由内容边界预留，避免效果胶囊裁掉光标。 | 播放时不可调用文字重栅格化；不要让内部字形资源进入素材库。光标只在未完成时按播放时钟闪烁，随对象变换和效果处理。 |
| 测试 | `tests/browser/v4-text-reveal.mjs` 覆盖逐字实际像素、多行位置、组合字符／Emoji、无字体字形播放、渐进控件、撤销、对象轨写入、Linear画面与Inspector同步、自包含导出。 | 笔触完成度暂缓，本次不改变像素铅笔与图元的时序合同。 |

## 十三、非破坏笔触平滑与共用描线（2026-10-14）

| 层 | 当前合同 | 并行 UI 会话同步要求 |
| --- | --- | --- |
| 工程参数 | `smoothing` 0…100、默认0，仅笔触；`strokeCap` 平头／圆头／方头；`strokeJoin` 尖角／圆角／斜角；`strokeDash` 含enabled、length（默认3）、gap（默认2）、offset（默认0）。length/gap按线宽倍数，offset为0…1。笔触默认圆头／圆角，其他图形平头／尖角。 | 不把平滑写回原始points；虚线关闭应保留参数。闭合路径通常只显示转角；启用虚线后显示端点用于每段虚线。椭圆没有转角参数。 |
| 共用组件 | 新 `classic-v4-stroke-style-control.js` 同时生成工具栏「描线设置」、图元Inspector、单图元对象与原生形状对象的参数。打开描线后显示相关控件；虚线开关打开后立即展开长度、间隔、偏移。 | 原型／替换页面必须加入该脚本，位于Inspector与Drawing控制器之前；复用组件与data-stroke-param，不再复制多份字段。共用控件外观仍沿现有global-field，可由UI会话统一改造。 |
| Runtime／性能 | 新 `59a-path-stroke.js` 共用描线设置和非破坏平滑；原始路径经弧长等距取样与局部加权滤波，端点不动，派生坐标保留小数。派生路径／边界缓存按原始点数组与参数失效，不做逐像素模糊。预览与提交都先消除共线点，统一描线端点／转角／虚线。奇数线宽的包围框使用整数外包，避免建立对象时把路径意外移动一像素。 | 图元命中使用平滑后的路径；虚线间隙仍按连续路径提供点击容差。不要通过绘制PNG再模糊替代路径处理。对象胶囊边界覆盖圆头／方头和尖角的延伸，防止加样／采样裁切笔触。 |
| 时序 | 除后续第十四节的完成度外，新描线字段只支持Step；所属对象轨写入 `partsById.<encodedPartId>.<field>`，Runtime按稳定ID找到图元，无父级属性副本。对象选中时「时序」可编辑单图元的描线样式；不创建独立图元轨。旧图元动态索引路径本轮未整体迁移。 | 字段名不因图元名字／顺序改变。笔触完成度现已在第十四节按相同稳定ID目标扩展。 |
| 验证 | `tests/browser/v4-path-stroke.mjs` 检查三种端点实际像素、五种路径的虚线、效果胶囊端点完整性、非破坏平滑、缓存、端点固定、ID Step调序、真实工具创建、预览／提交像素一致、渐进展开、撤销与项目恢复。 | 已接入verify-v4。 |

## 十四、笔触完成度沿用所属对象轨（2026-10-14）

后续新增场景ASCII见第十五节；笔触部分的合同不变。

| 层 | 当前合同 | 并行 UI 会话同步要求 |
| --- | --- | --- |
| 参数 | `strokeCompletion` 0…100，默认100，支持Step/Linear；显示保留最多一位小数，实际插值不强制取整。`strokeReverse` 默认false，只支持Step。两项只存在于笔触图元。 | 在既有描线设置中，与平滑度一起显示「完成度」「反向绘制」；不用在父对象复制属性，也不新增顶层笔触实体类型。 |
| 时间轴 | 选中笔触时，下轴指向所属对象轨，顶部「时序」武装该对象当前段。每条笔触写入 `partsById.<encodedPartId>.strokeCompletion`，各笔触数值独立，切段边界共用；对象Linear白名单自动包含其所有笔触完成度字段。 | 不建立笔触独立轨、不自动新增切段。清除时序仍按所属对象当前参数段处理；选中笔触不应跳至另一条参数轨。选中多图元对象时，先下钻选中要编辑的笔触。 |
| Runtime | 按平滑后路径累计长度显现，末段插值笔尖；0%完全不绘制，100%保留原完整笔触。反向取原路径后缀，并按省略的路径长度补偿虚线相位，避免图案游移。长度缓存跟随路径／平滑度失效，播放不重新平滑。 | 当前推进端使用已选端点形状；降低完成度会收回已显示部分。完整选择框与旋转中心保持不变，胶囊边界预留途中圆头／方头的延伸。蒙版／加样／采样处理当前已显现的内容。 |
| 校验 | `tests/browser/v4-stroke-reveal.mjs` 检查不均匀点列的匀速长度显现、反向、虚线锚定、稳定框、默认终态、多个笔触共享对象轨但数值独立、Linear实际画面与Inspector、撤销、项目包与导出。 | 已接入verify-v4；无单独的笔触动画播放器或导出实现。 |

## 十五、场景ASCII映射（2026-10-14）

| 层 | 当前合同 | 并行UI会话同步要求 |
| --- | --- | --- |
| Registry | `ascii-mapping`仅scene，采样滤镜内、CRT之前。size默认8、整数步长1、最小1，glyphRatio默认1、仍为小数，stretch默认false；字符集、字体、「亮度」「对比」、反相、单色／原色、两套颜色Alpha、边缘强化及方向字符，全部Step。 | 不复制到对象Inspector，不新增ASCII动态开关；相对尺寸整数化不意味着单元高度也取整。字形比例是宽／高，单元高=采样尺寸×size/glyphRatio。亮度仍为乘数，对比仍为指数映射，本轮只改名不改算法。 |
| Inspector | 新共享`classic-v4-ascii-control.js`，在Inspector之前加载。字符集修改后自动重建排序图集，字体选择／+复用既有字体连接。字体行带疏密预览。边缘开启立即展开「检测灵敏度」「显示阈值」「方向字符」；原色隐藏固定色，透明度显示0…100。 | 不把每个字符可见紧框拉伸成满格；stretch只改变统一字形格。字符集空格有意义，不trim。方向字符默认`—|/\\`，长横线比原短横线更饱满；四方向依次横、竖、右上斜、右下斜，不按亮度排序。显示阈值越高，方向确认越严格，边缘字符越少。 |
| Runtime／工程 | 字形图集为效果内Base64灰度数据，无字体二进制／素材卡。图集和字符集/字体同批写入当前Step段。当前可选GPU分析及CPU回退见第十七节；参数合同不变。 | 不能在保存／导出时删去glyphAtlas；不能播放时重建字体或上传网络。原色按每单元单一RGB着色。图集资源不入素材栏。 |
| 基础格／CRT | 仅启用ASCII或CRT等输出效果时先处理基础采样格；有其他采样效果消费者时不增加重复基础格。 | 不把CRT扫描线、荧光栅格的尺度与内容采样格混为一项。 |
| 验收／性能 | `tests/browser/v4-ascii-mapping.mjs`＋verify-v4，CPU/GPU同规则最大通道误差≤2，浮点格／边缘Alpha／字体图集／动态输入／Inspector／撤销／项目／导出。1080p、默认近似密度，边缘关闭约12…13ms中位，开启约65…68ms。 | 后者不承诺30fps；可提示增大单元或降低预览尺寸。数据为单机Runtime墙钟，并非GPU query、全编辑器FPS或复杂照片场景保证。 |

详细参数、算法参考、四层落点和基准方法见 [ASCII首版合同](../architecture/V4_ASCII_MAPPING_2026-10-14.md)。

## 十六、ASCII边缘性能实验（2026-10-15；历史实验，正式迁入见十七）

本轮没有新增／修改Inspector参数。隔离实验比较当前基线、保真CPU边缘优化、选字函数拆分、低／全分辨率GPU分析。四类640×360素材中CPU与低分辨率GPU候选逐像素一致；全分辨率改变外观，暂不作为替换。

正式60帧动态夹具：1080p基线P95 116.4ms，CPU分析与选字优化48.6ms，GPU低分辨率与选字优化27.2ms。仅证明单机Runtime预算潜力，不代表正式编辑器已变快、全部组合已验收或Tauri已稳定30fps。不得据此增加“全分辨率”默认开关或宣称CPU回退同样27ms。

后续迁入先保持参数／时间轴／字体／颜色合同，完善共享GPU释放与CPU回退，再做编辑器和导出验收。详见 [实验报告与对照图](../architecture/V4_ASCII_EDGE_EXPERIMENT_2026-10-15.md)。

## 十七、ASCII CPU／共享GPU分析正式落地（2026-10-15）

- UI同步：无Registry／Inspector／输入字段／默认值修改；另一前端分支无需增加GPU开关。原Step、颜色、蒙版、字体图集、处理顺序合同不变。
- Runtime：构建先加载`68c-ascii-analysis.js`、`68d-ascii-gpu-analysis.js`再加载`68b-ascii-mapping.js`。CPU分析合并遍历并复用数组；GPU低分辨率DoG／方向／投票与字形合成共用一个上下文，无方向读回。导出内联镜像已同步。
- 回退：无Float framebuffer／highp时仅回退CPU分析；无WebGL、着色器失败、上下文丢失时完整CPU绘制。若丢失发生在GPU分析成功后，必须重算CPU方向，不能降成仅亮度选字。已知能力不足按pool缓存，不逐帧重试；clear／dispose清理后允许重建。
- 精度：CPU与冻结参考严格一致；GPU扩展1080p照片发现39个通道差异、平均误差0.000582/255、Alpha一致。保持公式不等于跨设备浮点逐位相同，不扩大首版小图≤2断言的适用范围。
- 性能：本机Intel UHD620、每尺寸预热12／采样60帧，正式GPU路径P95为14.1／25.2／44.6ms（360p／720p／1080p），同次CPU分析为23.3／66.6／137.9ms；最终字形均GPU。不是完整编辑器FPS或Tauri验收，不宣称稳定30fps。分析纹理1080p约9.76MB，不含最终Canvas与驱动。
- 新测试：`v4-ascii-gpu-analysis.mjs`已接入verify-v4，覆盖精度、尺寸切换、无Float／无WebGL／着色器失败、帧中上下文丢失、纹理释放。参数不变但不能省略Runtime分发与内联镜像更新。

完整边界与后续门槛见[正式GPU报告](../architecture/V4_ASCII_GPU_PRODUCTION_2026-10-15.md)。

## 十八、ASCII组合／桌面宿主定向验收（2026-10-15）

无产品参数／输入／Runtime改动。新增同源夹具`ascii-editor-acceptance.js`及`v4-ascii-host-acceptance.mjs`，普通浏览器流程接入根verify-v4，`--tauri`按需运行。三种组合（ASCII／范围／CRT）验证Step真实取值、撤销画面、完整CPU回退、8轮项目切换、项目恢复和HTML输出。

桌面使用现有exe＋临时本机v4前端，未改默认Legacy入口与正式分发白名单；不包含原生文件对话框、安装包资源、长稳或人工视觉验收。另一前端会话无需同步控件。性能与正式入口差距见[定向验收报告](../architecture/V4_ASCII_HOST_ACCEPTANCE_2026-10-15.md)。

## 十九、ASCII默认字体扩展不再整套回退（2026-10-15）

- Registry／输入协议无变更。默认字体仍`font=builtin`；Inspector只同步该选项的说明：保留内置8×8，扩展字符单独烘焙到固定8×8格，按最终Alpha一起排序。不是新增字体／粗细／密度控件。
- `68b-ascii-mapping.js`新增内部`builtinAlpha`，内置掩码直接复制；扩展字素通过固定32×32 em格（24px monospace）缩入8×8。只有过长字素按advance等比例缩小，不用各字可见紧框拉伸；新增中文等不扩大格，也不重画原符号。主动选其他字体的整套烘焙路径不变。
- 所有最终Alpha合并为一张v1图集，再统一计算density／LUT；不分别给两组字形排序后拼接。不自动加粗／拉高Alpha来伪造视觉一致。
- 仍是最多12项图集缓存和每pool一张当前GPU字形纹理。20帧检查字体绘制／测量调用0、字形上传1；4个扩展字形只增加256字节原始Alpha。图集与当前字符集同批写入，沿用Step／撤销／工程／导出。
- Edge和现有Tauri WebView的定向夹具均通过；扩展字形创建时可能采用不同系统回退字体，之后以保存的Alpha为准，播放不再读字体。已保存的旧图集不静默迁移，修改字符集或重新切换字体才重建。
- 新`v4-ascii-glyph-extension.mjs`加入verify-v4；本轮实际跑了ASCII针对性浏览器、CPU／GPU回归、状态合同、Runtime smoke与桌面`--glyphs`，没有重新制作安装包。详见[修复与测试记录](../architecture/V4_ASCII_MIXED_GLYPHS_2026-10-15.md)。

## 二十、默认字体升级寒蝉16px＋16×16格（2026-10-15）

第十九节的8×8混合为历史版本，当前内部格16×16。旧符号2倍最近邻复制，扩展使用寒蝉16px；输入参数／Registry不变。

并行前端需同步异步写入：先`await EditorClassicV4AsciiControl.ensureBuiltinFont(nextValues)`，确认项目与控件仍有效，再`preparePatch`并与字符同批提交。载入失败不得用monospace冒充成功。默认字体选择内部也有等待／过期请求保护。

新增懒加载资源`assets/fonts/ChillBitmap16-default.js`及OFL／完整来源声明。它是未修改字体TTF的gzip/base64传输，JS约3.82MB，仅首次扩展时读取；不会进入scene／HTML输出。原字体12.6MB、镜像来源与固定SHA在字体说明中公开，官方当前ZIP实际只有7px，不宣称该镜像已通过官方校验。

Runtime分发与内联已更新。具体实现、缓存／字体失败／默认输出不变测试与真实Tauri字体验证见[16px落地报告](../architecture/V4_ASCII_16PX_IMPLEMENTATION_2026-10-15.md)。

## 二十一、ASCII默认7px扩展＋可选16px（2026-10-15）

取代第二十节默认16px混合方案：font=builtin仍保留原8×8符号，扩展改为官方寒蝉7px（8px em、整像素居中、Alpha二值化）。字体下拉新增chill-16，整套字形均用寒蝉16px，不混用内置符号。两份字体独立按需载入，仍先await ensureBuiltinFont(nextValues)再preparePatch；加载失败不得静默回退。

不新增Registry参数，不改变Step／撤销／项目／导出格式。旧图集打开不重建，显式切换或改字符才重烘焙。导出只携带实际字形，不携带字体库。完整合同与四层落点见[默认8px与可选16px](../architecture/V4_ASCII_PIXEL_FONT_OPTIONS_2026-10-15.md)。并行前端需同步下拉选项与说明，不能继续标注默认16px混合。

## 二十二、ASCII原图背景与混合（2026-10-17）

新增Step参数originalBackground=false；开启后渐进显示blend=normal（共用12项原生混合），隐藏background/backgroundAlpha但保留原值，渲染时背景Alpha强制0。字符色彩／颜色／透明度语义不变：透明字符层按blend叠到ASCII之前的当前输入。不是读取素材原图，不冻结动态，不修改对象最终叠加方式。

Registry、Agent manifest、Runtime及内联、针对性浏览器测试均已同步。对象级本次仅评估，仍不开放scope；迁移需接通对象采样末端、处理格锚点／透明边界和多对象缓存。见[实现与迁移评估](../architecture/V4_ASCII_ORIGINAL_BACKGROUND_2026-10-17.md)。并行前端需同步开关、渐进混合项和背景控件显隐；不要再将原图背景和纯色背景同时应用。

## 二十三、ASCII迁入对象（2026-10-17）

新增object作用域及ready状态；参数名、默认值、渐进显隐、字体异步烘焙、Step与场景完全复用，不新增控件。左侧效果容器随Registry生成。对象采样先执行基础格及其他效果，再于全尺寸胶囊末端执行ASCII；原图背景仅取当前对象处理前内容。对象最终透明度／叠加不被覆盖，mask/decorate/sample仍支持调序。

保持完整字符，不逐像素裁回原Alpha；需要裁边可将蒙版后置。沿用轴对齐胶囊采样，格点锚在取整后的对象原点附近；不是字符对象随旋转变形的新系统。GPU增加4项／4MiB近期图集LRU，避免多对象字符集交替重复上传。粒子复用每帧共享精灵，不逐粒子生成ASCII。

四层落点、几何舍入边界、极大字符单元的防巨量空白分配策略及测试见[对象ASCII合同](../architecture/V4_ASCII_OBJECT_2026-10-17.md)。正式Runtime／内联／Agent manifest已生成，未重打桌面安装包。

## 二十四、图元路径能力扩展（2026-10-17）

矩形／椭圆／多边形／直线增加既有strokeCompletion（0～100，默认100，Linear）与strokeReverse（Step）。封闭图形增加pathStart（0～1，默认0，Step）；凸规则形状增加fillReveal=none/center（保持完整／中心展开，默认none，Step）。填充默认不随描线完成度变化，中心展开才裁切纯色／渐变／纹理，内部径向边不描线。

poly增加polygonMode=free/regular、sides=3～64（默认3）与radius（默认0），均Step。工具栏提供自由多边形、三角形、五边形、六边形及自定义边数；regular拖拽创建，free保持逐点闭合。正多边形支持圆角，暂不向自由凹多边形开放圆角／中心展开。

共用路径设置增加strokeWave.enabled，展开amplitude=2、wavelength=16、phase=0，以及开放路径fixEnds=true。均Step；封闭图形的填充和描线默认共用波形边界，无单独跟随开关，无描线时也显示波形入口；开放路径仅描线。不增加自动运动开关。fillReveal标签调整为“填充显现”，其保持完整／中心展开只控制完成度，不是波形跟随开关。原描线虚线和端点继续组合使用。所有完成度沿用所属对象轨partsById字段，不新增图元轨；原生图形使用对象strokeCompletion。

Inspector和工具复用classic-v4-stroke-style-control，填充未启用描线时仍能看到完成度／填充跟随。另一前端分支应复用该模块，不能只移植输入框而忽略所属对象Linear键。四层落点、默认起点、缓存和预算、兼容边界及验收见[图元路径合同](../architecture/V4_SHAPE_PATH_GEOMETRY_2026-10-17.md)。

## 二十五、路径波形节奏（2026-10-18）

strokeWave新增type=sine/triangle/saw/square/digits/noise（默认sine）。数字节奏时展开digits="1595"与interpolation=hold/linear/smooth（默认smooth）；平滑随机时展开seed=1。全部Step，仍使用所属对象partsById路径，不新增效果卡、图元轨或自动动态入口。既有幅度／波长／相位／固定端点保留。

数字字符串代表一个波长周期，1=-幅度、5=原路径、9=+幅度；首尾循环插值，不自动居中或拉满。支持空格／逗号分隔，规范化后最多128位；无效文本通过控件有效性提示拦截，不写历史。平滑为保形周期Hermite，不是每数字处都停顿的smoothstep。随机用既有hash生成8个周期控制点，相同seed可复现。

共享控件已更新，请另一前端分支复用，不要重新拼装下拉及字符串校验。工具设置浮层同时修复窄窗口被结构树遮挡的问题：固定视口定位、避开左栏、限制高度滚动，并在展开／参数重绘／舞台尺寸变化时更新。几何仍最多8192段，周期编译缓存32项，完整几何64项。详细四层落点和测试见[路径节奏合同](../architecture/V4_PATH_WAVE_RHYTHMS_2026-10-18.md)。

## 场景阈值 GPU 实验补记（2026-10-15）

无产品参数、输入范围、Registry或Inspector控件修改。只扩大显式场景GPU后端：阈值分色／呼吸／Step可与不均采样按固定顺序串联，逐卡蒙版独立；对象阈值未迁移，默认编辑器／导出不切换。另一前端会话无需增加按钮，也不要将两卡接通展示为全部效果GPU化。CPU基线不变，构建分发和内联镜像已同步。方法、精度边界和性能见[真实阈值GPU接线](../architecture/V4_GPU_THRESHOLD_PLAYER_2026-10-15.md)。

## 场景杂色 GPU 实验补记（2026-10-15）

无产品参数、默认值、输入范围、Registry／Inspector／时间轴UI修改，另一前端会话无需同步控件。只扩大显式`sceneBackend:'gpu-experimental'`场景链：杂色→阈值→不均采样，各卡范围独立，三卡交替中间纹理；对象处理未迁移。GPU整数xorshift使用CPU预备的静态跳跃／字节舍入表，不是上传CPU噪声帧，也非零CPU准备；新增统计仅作内部诊断。

不透明48组照片与8组边界、Step／seek／暂停／第三卡故障回退通过。透明后接阈值仍有少量大色差点，严格画质未通过；不得展示为“全部GPU完成／一致”。默认编辑器与导出仍CPU，项目格式与CPU基线不变。详情与真实三卡预算见[杂色GPU记录](../architecture/V4_GPU_NOISE_PLAYER_2026-10-15.md)。

## 场景GPU透明链修复补记（2026-10-15，更新上项状态）

仍无Inspector、Registry、输入字段、默认值、Step／Linear或项目格式修改，另一前端会话无需同步控件。Runtime统一预乘RGBA8、合成Canvas校准的64KB反预乘表与GPU原生范围混合，消除上项透明杂色→阈值的临界错点。96组透明／不透明照片逐像素一致，Alpha／反相／引用范围与最终透明转场通过最大误差门禁；不是全部效果GPU化或跨设备完成。

带范围每卡新增一道绘制，三卡范围十一道、双侧转场二十三道；显存统计增加每上下文64KB表，首次上传计数同步。1080p三卡范围P95为29.0ms、双侧57.1ms，不能将画质修复写为提速。默认CPU、对象处理和正式UI入口不变，详见[透明字节与范围合成](../architecture/V4_GPU_ALPHA_BYTES_2026-10-15.md)。

## 图元拓展入口与参数（2026-10-18）

### 括号／角标图样（2026-10-18）

补充`brackets.offsetX`／`brackets.offsetY`：水平偏移／垂直偏移，默认0，允许正负，步长1。独立保存recipe.params，应用保存extensions.brackets，均只写基础值。整组图样相对载体局部坐标平移，非左右／上下向外扩张；不改框定宽高和臂长，允许超出原框。绘制／命中／边界均跟随，既有共享参数表已加入，另一前端会话应同步。

新增已交付hybrid目录项`brackets`，直接拖拽新建custom，或应用到rect／ellipse／poly的局部框定范围，不沿源轮廓变形。复用`classic-v4-path-extension-control.js`，仅应用路线提供`brackets.enabled`，独立本体没有启用开关。主Tab与原图样一致，不新增载体切换。

独立保存`recipe:{id:'brackets',version:1,params:{shape,layout,side,corners,armX,armY,radius}}`，样式仍为stroke／strokeWidth／strokeAlpha；应用保存`extensions.brackets`及其中width／color／alpha。控件前缀`data-extension-param="brackets.*"`：layout(full完整/corners角标)、shape(square直角/round圆弧)；full显示side(both/left/right)，corners显示corners(all/tl-br/bl-tr/tl/tr/bl/br)；横向长度armX默认24，角标显示纵向长度armY默认24；直角显示radius默认0；粗细width与共享颜色透明度始终显示。隐藏参数保留，大小复用成样w/h及Canvas，不新增重复尺寸控件。

参数全部仅写基础，不能走通用时序写入。新Runtime模块59h-bracket-shapes.js在共用自定义轮廓上构造镜像方折／椭圆弧。输入过大时限幅但保留请求值，显示有效值反馈。新前端应复用共享控件及recipe映射，不能将Agent提案中的width/height/thickness等原始字段直接作为应用格式。详细默认、几何、预算及实验边界见[括号合同](../architecture/V4_BRACKET_PATTERN_2026-10-18.md)。

### 本轮增量：路径显现与箭杆（2026-10-18）

共享描线组件新增`data-stroke-param="pathRevealEnabled"`，默认关。开启才显示完成度／反向／闭合起点／适用填充显现／端点样式；虚线及路径波形独立。关闭是Runtime旁路，不清值、不删轨；其Step沿用对象写入器，完成度Linear不变，端点字段仍仅基础。必须复用组件，不能只在新前端藏字段而不执行旁路。

箭头共享控件新增`corner-arrows.shaftMode`（center几何中心／fixed固定角度），fixed才显示`shaftAngle`（以局部水平轴为基准的镜像倾角，0°水平90°垂直，按角点方向左右／上下镜像；轴上角点沿轴线）。此项修正了初版“所有箭杆平行”的错误语义，in/out同步反转箭杆，字段及数值不变，新前端只需同步提示语和Runtime。`shaftCap`为butt平头／round圆头／point尖头，默认butt。radius=0必须尖角，正值作用于整个箭头轮廓。独立recipe.params和依附extensions同字段，仍只写基础，不加独立时序。长度量至最终尾端，端头切换不增加总长度。

`nested.pathStep`标签改为“逐层起点偏移”：描线在虚线或显现启用时显示；填充／色带在显现启用且中心展开时显示。不得再根据当前完成度<100判定，否则播放会跳动。详见[路径显现合同](../architecture/V4_PATH_REVEAL_AND_ARROW_SHAFT_2026-10-18.md)。

### G3自定义图元／角点箭头（已实现）

图样目录新增corner-arrows，hybrid类，默认直接拖拽建立custom图元，不弹载体菜单。独立路线保存`parts[].type='custom'`、`recipe:{id:'corner-arrows',version:1,params:{size:24,length:36,inset:0,direction:'out',radius:0}}`；宽／高仍是布局框，不增加载体切换。应用路线保留rect／poly，保存到`extensions['corner-arrows']`，只有该路线提供启用开关。两者均复用classic-v4-path-extension-control.js中的同一参数表。

新增控件data-extension-param前缀corner-arrows：size箭头大小、length箭杆长度、inset缩进、direction方向（out/in）、radius圆角；样式为width线宽、color颜色与alpha透明度。应用路线样式保存在拓展中；独立路线写回图元strokeWidth／stroke／strokeAlpha，recipe.params不重复保存。若源没有描线，默认箭头线宽3而非0。所有新参数仅写基础值；自定义本体不显示完成度、填充、路径波形等未支持控件，也不显示无意义的启用开关。

Runtime新增59g-custom-shapes.js及版本化definitions，由绘制／边界／命中／工程校验共用；生成结果不展开为实体。Registry.target将自定义视为一个确定图元：当前无兼容拓展时目录为空，不回退全量新建；撤销后失效图元ID退回唯一有效目标。完整默认值、预算、有限支持与样例见[G3合同](../architecture/V4_CUSTOM_SHAPES_G3_2026-10-18.md)。前端会话应迁移这份现成控件及保存映射，不新造recipe或另接一套颜色逻辑。

### 图样目录交接：G1/G2已实现；G3增量见上，G4待实施

首批实际接入`editor/v4-pattern-registry.js`与`classic-v4-pattern-library.js/.css`，HTML在现有Drawing／Inspector创建后初始化目录。顶栏按钮ID为toolbar-pattern，左下共享区新增素材／图样Tab；图样面板ID为v4-pattern-library，卡片data-pattern-id、动作data-pattern-action、载体data-pattern-carrier。Inspector新增focusExtension(ownerId,partId,extensionId)，继续复用既有参数组件。Drawing新增beginPattern/cancelPattern，复用原有绘制并一次提交载体与拓展；没有Runtime参数或保存格式变化。新前端应复用登记、目标解析、幂等应用及绘制接线，不复制成另一套状态逻辑。原生图形使用@self；目录不显示启用状态。详见[交付记录](PATTERN_LIBRARY_G1_G2_2026-10-18.md)。

以[图样目录实施合同](PATTERN_LIBRARY_INTERACTION_CONTRACT_2026-10-18.md)为入口唯一依据：无选择／多图元／组／多选时全量仅新建；单图元元素或下钻单图元时筛选兼容项、仅应用。新建依附类先在卡片内选载体再复用画布工具，不弹窗；角点箭头已支持直接建立自定义图元，螺旋仍待G4。创建后不换载体；应用保持原类型，已启用项仅导航，不重置参数；关闭再应用保留值；Inspector负责停用。

### 完成度端点样式补记

共用描线控件在“完成度”下增加`pathEndpoints.enabled`渐进开关，开启显示type（circle圆点／bar垂直线／object引用对象）、start起点（默认关）、end终点（默认开）。circle暴露size直径=8；bar暴露width法向总长度=12，线粗沿用描线；object暴露sourceId，选项复用元素排布合法来源。样式字段只写基础值，不能走通用时序写入；完成度Linear驱动标记位置。关闭保留配置。0%隐藏，闭合100%重合去重；引用根混合由载体控制。颜色沿用路径描线／填色，无新增取色控件。字段、四层落点和性能见[路径端点合同](../architecture/V4_PATH_ENDPOINTS_2026-10-18.md)。新前端应复用`classic-v4-stroke-style-control.js`，避免独立复制一份开关及参数逻辑。

新增源图元`extensions`基础配置，稳定类型ID为ticks／nested／elements，不归入加样或采样卡片，不接入Step／Linear。单图元元素在成样“外观”下方有拓展入口，多图元先选择目标并同步选择；选中图元时主Tab仅为“成样／拓展”，取消重复的局部Tab及不可用的加样／采样；对象选择仍为三个主Tab。所有拓展参数由`classic-v4-path-extension-control.js`统一生成，拓展页隐藏时序按钮；即便原对象时序已激活也只写基础值，不能让新前端将其归入通用时序写入器。

刻度含数量／起始偏移／长度／两端归一化位置／线宽／颜色透明度／朝向角度、主刻度及渐进的空间节奏。嵌套含生成方式／层数／方向／间距或缩放步差／旋转／描线或填充／统一颜色透明度，描线渐进宽度步差及有意义时的起点步差。颜色共用既有编辑器。完整字段、默认值、显隐条件及生成／缓存预算见[图元拓展合同](../architecture/V4_PATH_EXTENSIONS_2026-10-18.md)。

元素排布`elements`默认关闭，展开后提供来源sourceId、数量count=12、起始偏移offset=0、缩放scale=1（界面百分比100）、朝向orientation=path、角度angle=0、沿路径偏移along=0、法线偏移normal=0、保留来源keepSource=true。来源列表只列合法顶层普通元素／组，排除粒子、含粒子的组、自引用和间接循环。所有字段只写基础值。新增“编辑样本”按钮：画布移动／旋转样本修改全部实例的统一偏移／角度，不生成独立实例；一次手势一次撤销，Esc取消。切换项目清理手势和临时状态。来源自身根混合不继承，由载体图元／对象统一控制；组内成员混合保留。样本按钮、渐进参数和状态提示应由新前端一并迁移，完整字段合同见[元素排布](../architecture/V4_PATH_INSTANCES_2026-10-18.md)。

拓展修改不重定源对象原点，Runtime视觉边界和命中包含派生内容。已有复制、撤销、工程和HTML工作流继承完整配置。浏览器确认“时序打开仍只改基础值”、多目标隔离及加样胶囊Alpha不裁切。

## 像素铅笔自适应平滑（2026-10-18）

无新增UI字段、Registry条目、默认值或Step／Linear语义。共享控件`smoothing`仍为0..100；0恢复原始点，首尾保留。Runtime平均范围改为按原始笔触包围盒对角线的2%计算，基准限制12..256，再乘平滑强度并限制不超过路径弧长20%；不随舞台缩放或画布尺寸变化。高于50时有小容差邻点简化。前端会话无需另加控件或更名。

平均计算改为线性累计和，仍保留缓存和8193点预算。大小笔触、直接核对照、非破坏恢复以及真实浏览器描线／完成度／几何回归通过。详见[自适应平滑合同](../architecture/V4_PATH_SMOOTHING_2026-10-18.md)。

## 场景染色／边缘色散GPU补记（2026-10-15）

无Registry、Inspector、参数、默认值、输入范围、Step／Linear规则或工程格式改动，另一前端会话无需同步控件。场景实验链增加全尺寸染色normal／screen／lighter（不是lighten变亮）和采样末端色散；其他染色混合方式仍在上传前完整CPU回退，不能从面板删除或标记不可用。染色动态共用原CPU求值，色散邻域／方向／强度／色序语义保持。

Runtime新增染色全尺寸工作纹理与1KB来源Alpha数值表、色散6KB亮度／64KB强度表；表不含作品／噪声帧，首次和改参准备上传有成本。48组染色、24组色散、严格亮度临界、CSS／fade／blink、Linear实际求值、Step／故障及原回归通过。1080p五卡P95 GPU无范围18.7ms、独立范围43.5ms、双侧范围81.6ms，默认后端不改，不宣称流畅30fps；连续染色Linear／fade预算尚待测。详见[五卡接线记录](../architecture/V4_GPU_TINT_DISPERSION_PLAYER_2026-10-15.md)。
## 2026-10-19 R4a 增量交接

### 同日 R4b 增量

收藏栏增加 `[data-module-bake-panel]`，仅选中单个程序对象时显示。冻结读取正式入口传入的 `time:()=>state.t`；序列输入 `[data-module-bake-frames]` 是“周期帧数”（整数、步长1，2～当前画布预算上限），显示精确周期帧率与解码内存估算。动作分别为 `freeze-module`、`bake-module`、`cancel-bake`；取消按钮不能被通用busy门禁阻止。生成普通素材，不自动放置、替换或更改原构件。

新加载 `editor/v4-module-baker.js`，复用Full对象渲染和素材状态；新素材增加 `moduleBake` 来源元数据（基础参数为 `paramsJson`，避免被素材ID扫描器当作依赖）。不新增Registry效果和Runtime参数。帧数选择为当前工作区的临时UI状态，不进入作品。预算、透明画布范围、原构件保留、失败原子性和无Module交付见 [R4合同](../architecture/V4_MODULE_RESOURCES_R4_2026-10-19.md)。

程序资源新建入口复用收藏行 `[data-resource-action="create-module"]`，自动选择新对象并通过 Inspector.focusModule 进入成样的 Manifest 参数；没有新输入组件和新 Scene 参数。实例参数仍为 entity.params，时间轴继续使用 `params.<key>` 与作者声明的 timing。收藏是构件定义，不是实例造型预设。UI副本同步时需保留 `editor/v4-module-instances.js` 加载及显式授信确认，不能把新建按钮做成绕过确认的源码执行入口。详见 R4 合同；冻结／烘焙尚未实现。

## 2026-10-21 素材卡后续同步

### 后续已实现：烘焙与共享卡尺寸

- 新载入`v4-material-baker.js`／`classic-v4-material-bake-controller.js`。元素卡左下`.asset-card-action.alpha[data-material-action="bake"]`展示▧，调用`classicV4MaterialBaking.open(presetId,opener)`，位图卡原α不变。
- 烘焙原子单历史入库，普通／程序元素统一读取预设，非画布实例；输入`data-bake-mode`（freeze／sequence）、`data-bake-time`（非负秒）、`data-bake-frames`（整数2～预算上限）。隐藏参数同时禁用，取消／Esc／换工程中止；`data-bake-start`预算有效才可用。帧时间与统一输出边界由服务准备，勿自行在UI里另算。
- `EditorV4ModuleBaker`显式`material:true`及`viewport:{x,y,w,h}`扩展只用于此适配器；默认原构件流程不变。无Registry效果参数或正式Runtime算法变更。`moduleBake.scope=element-preset`记录来源，位图不依赖此来源运行。
- 删除共享卡display:flex专属覆盖，项目／共享均使用同一网格和预览内24px图标位置；统一`.lib-name`与位图`.nm`排版。`data-share-action="update"`内`.share-idle`显示♥，hover／focus-visible切`.share-hover`为↥；title／aria-label仍更新共享，不加取消行为。
- 契约／实际坐标／撤销／取消／工程往返证据：[本批合同](../architecture/V4_MATERIAL_CARD_BAKING_2026-10-21.md)。下方“未完成”描述为此前状态，以本节为准。

- Module根导入用`EditorV4ElementPresets.fromModule`形成普通元素卡；不再渲染`#v4-module-management`。导入素材接受图片与资源JSON，多图片维持一次序列预处理。
- 卡片`data-share-action="toggle"`为♡发布，已共享后变`update`／♥，仅更新；移除只在共享卡`remove`。项目素材不再渲染复选框和文字共享按钮。卡片控件固定在预览四角，具title及aria-label。
- 图片名称点击仅选中；选中后只有预览canvas点击进入预处理。程序／普通元素卡不进入预处理。新建／删除／回存／授权仍用原命令。
- 现有构件烘焙暂在画布选中构件后显示；普通元素卡烘焙未完成，勿仅复制按钮当成接通。详细落点与验收：[卡片增量](../architecture/V4_MATERIAL_CARDS_RC3_2026-10-21.md)。Runtime绘制及Inspector参数本批不改。

