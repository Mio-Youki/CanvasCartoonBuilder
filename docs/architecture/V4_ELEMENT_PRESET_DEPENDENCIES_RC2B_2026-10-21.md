# RC2-b：元素预设的资源依赖闭包

状态：数据API小批完成；不新增素材按钮、卡片或Inspector输入。接续[RC2-a](V4_ELEMENT_PRESETS_RC2A_2026-10-21.md)与[RC1合同](V4_ELEMENT_MATERIAL_RC1_CONTRACT_2026-10-21.md)。外部对象来源、蒙版坐标／角色仍属RC2-c，组及粒子仍暂缓。

后续增量：[RC2-c1](V4_ELEMENT_PRESET_MASKS_RC2C1_2026-10-21.md)已支持无父级对象的静态／图片蒙版及统一适配；下文RC2-b的蒙版限制保留为当时批次范围。外部对象来源及带父组的蒙版坐标仍待c2。

## 能力与边界

| 来源 | 实际保存与恢复 | 不承诺的能力 |
| --- | --- | --- |
| 图片对象 | assetId、附着普通／自定义图元、基础变换／动态／效果；完整素材descriptor | 不烘焙替换原素材，不携带父组或时序 |
| 预处理／Alpha素材 | sourceAssetId递归原图链、recipe、Alpha侧图及派生元数据 | 不把外部主机路径当作可移植数据 |
| 多帧 | 全部帧、fps、frameLoop及对象级播放配置 | 不降成首帧，不新增序列编辑UI |
| 文字 | rasterAssetId、glyphAssetId、textLayout、文本及字体设置、完成度／光标 | 不打包字体文件，不保证缺少原字体时仍能原样重新排字 |
| 图样图元 | 原生recipe，或项目内有限声明式definition＋providerKey＋参数；按原有预算生成静态快照 | 不引入任意代码图样插件；不放宽原有几何有效性与预算 |
| 程序构件 | 精确Module实现及Manifest.assets声明素材闭包 | 不猜测源码里未声明的资源，不自动改写JS中的素材ID |

文字入库前必须已有栅格、字形图集及布局；纯字体回退文字要先由既有文字准备流程生成它们，再捕获。字体名称／ID保留为编辑意图，实际缓存保证当前文字、完成度与光标在没有原字体时仍可播放；改变文字／字体时继续遵循现有字体加载规则，不称为可移植字体安装。

## 定义、资源及身份

沿用`tosampool-element-preset/v1`和`scene.elementPresets`，不增加Runtime实体类型。`references(preset)`返回直接位图依赖和精确Module依赖；资源内核进一步展开sourceAssetId等素材链及Module声明。捕获／导入不执行源码，程序实例化继续要求当前项目显式授信与Manifest一致。

图样配方属于图元本身：自定义声明式实现内嵌到recipe中，不额外制造一张同名图样目录预设卡，也不保留指向旧工程目录卡的绑定。仅providerKey时从当前工程匹配定义补齐；只有匹配静态快照而无实现时，沿用R3a锁定内部参数的回退，不能声称可编辑实现已恢复。同ID／版本但内容不同的定义与当前工程冲突时，整包拒绝。

位图ID冲突由原资源映射生成新ID，同时重连元素assetId、文字双图集及素材sourceAssetId链；不覆盖目标原素材。元素预设ID另行映射。程序源码可能直接读取原素材ID，所以含Module包遇到异内容素材同名冲突时拒绝，而不冒险重命名；同内容资源可复用。依赖不齐、循环、未知资源引用位置或不支持对象引用均显式报错，提交前不改当前Scene。

两个元素实例的图元、参数、动态及效果数据是独立深副本；它们可以共同引用项目里的同一位图descriptor，这与普通图片对象一致。修改项目素材recipe影响其引用者，不把“独立元素实例”误解为每次放置都复制一遍原图文件。文字重新编辑走既有按实例ID生成栅格的流程。

## 工程、运行开销与交付

- 工程包保留未使用预设及其资源；Alpha侧图若来自外部路径，保存时解析为包内Scene中的data URL，防止重开依赖原主机路径。主图／序列继续使用既有素材目录结构。
- 资源包要求主图、各帧和附属locator全部自包含；SHA-256及原子提交沿用R1。
- `referencedOnly`解码不扫描elementPresets、素材descriptor、图样目录等编辑器集合；只因存入未使用预设不会加载图片。实际可见程序对象的Manifest声明素材仍会解码。保留定义不引入每帧额外像素处理。
- 正式“测试场景”沿用`portableV4Scene`，只冻结作品实际使用素材的已应用recipe／Alpha结果，不携带预设定义和原图编辑链。普通Runtime绘制未新增处理分支。
- 未重新测试原生目录Vault、自动重开、Tauri文件路径或完整性能矩阵；这些不属于本批结果。

## 四层落点

| 层 | 落点 |
| --- | --- |
| 数据／校验 | `editor/v4-element-presets.js`扩展类型、typed references、依赖校验与图样准备；`v4-resource-core.js`捕获、依赖声明和重连 |
| UI／命令 | 无新入口；现有正式HTML及资源控制器沿用RC2-a接线。收入库／项目共享面板留至RC3 |
| Host／Runtime／交付 | `vnext-project-package.js`冻结Alpha侧图路径；`vnext-asset-loader.js`剔除未用定义并解析实际程序素材；既有Runtime和正式导出链复用 |
| 验证 | `tests/v4-element-preset-dependencies-contract.mjs`、`tests/browser/v4-element-preset-dependencies.mjs`，两者接入根verify-v4 |

## 实际验收与下一步

合同覆盖图片原图／recipe／Alpha、序列、文字双图集、原生及声明式图样、Module素材、同名重连、缺依赖／循环／定义冲突原子失败、未用不解码、工程保存重开。RC2-a测试保留独立实例／基础值／授信覆盖，退役其中RC2-b类型尚未支持的旧断言。

真实Edge浏览器通过正式页面API验证上述六类画面：跨项目同名导入、保存重开后0／0.5／1.25秒像素一致；图片／序列／文字光标／程序动态未被冻结。实际调用编辑器`currentV4TestArtifact`，导出HTML首帧与源画面一致，无pageerror。此为无新UI入口的数据集成测试，不冒称已经从素材卡完成用户操作。

本机沙箱内Edge在页面加载前被进程管道限制阻断；经批准在沙箱外运行完成。首轮夹具误用工作区replace公开签名，造成程序作用域测试错误，已修正为双参数选项接口后通过，不以吞掉pageerror解决。

定向回归通过：RC2-a合同及浏览器、R1资源、工程包、交付、程序实例、Runtime smoke、SceneMutation、Workspace及PreviewScheduler。语法与本批跟踪文件的差异空白检查通过；未运行完整verify-v4或Tauri打包，不将局部测试说成全量产品验收。

下一步RC2-c：蒙版、元素排布和端点引用的来源闭包、局部／场景坐标转换、仅供引用角色及循环处理。RC3前不新增面板；完整RC2尚未结案。
