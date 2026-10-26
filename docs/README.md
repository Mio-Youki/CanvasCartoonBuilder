# ToSampool / 图森破：文档导航

2026-10-26：[持续图层取样、圆形与原图显示解耦](architecture/V4_CONTINUOUS_LAYER_PARTICLES_2026-10-26.md)，覆盖首轮默认隐藏原图语义；含真实粒子纹理、缓存及性能验收。

2026-10-26：[图层切片正式接入及性能](architecture/V4_LAYER_PARTICLES_INTEGRATION_2026-10-26.md)。粒子Inspector实体方式可选；工程ZIP／测试HTML和普通粒子回归通过，后续GPU／Tauri未验收。

2026-10-25：[路径截取／归一化权重／图层切片实验](architecture/V4_WEIGHTED_PARTICLES_LAYER_PROBE_2026-10-25.md)。覆盖首轮稀疏范围减量语义，附前端参数交接、实验入口与CPU实测；图层模式尚未接正式Inspector。

2026-10-25 蒙版U4：[粒子出生批次／四类范围与实测](architecture/V4_PARTICLE_MASK_U4_2026-10-25.md)。CPU功能和共用编辑器接线通过；大图动态完整来源的冷启动仍需优化，U5/U6未整体完成。下方“粒子待做”为历史状态。

2026-10-25 蒙版第三批：[实际灰度预览与U3收尾](architecture/V4_MASK_PREVIEW_U3_2026-10-25.md)，含临时View状态、返回／草稿／导出隔离及异步竞态验收；接下来为U4粒子，较早批次“预览待做”是历史状态。

2026-10-25 蒙版第二批：[四类来源／多图形与共用编辑](architecture/V4_MASK_SHAPES_U1_U3_2026-10-25.md)，含数据、资源、前端交接及真实像素验收。蒙版预览、粒子新模型仍待后续；下方首批条目为当时状态。

2026-10-25 蒙版首批：[No／完整对象来源实现与性能](architecture/V4_MASK_SOURCE_U1_U2_2026-10-25.md)，含显式来源处理、像素与公共Player门禁、压力／配对数据。尚未完成多图形、最终面板分组和粒子新出生模型；[分批状态](architecture/V4_UNIFIED_MASK_EXECUTION_PLAN.md)。

2026-10-25 蒙版统一（仅规划）：[目标合同](architecture/V4_UNIFIED_MASK_CONTRACT.md)／[U0–U6执行计划](architecture/V4_UNIFIED_MASK_EXECUTION_PLAN.md)。已记录用户确认；U1–U6尚未实现，包含后续需继续对齐的细节与验收门槛。

RC5-P4完成：[图样随元素取用、私有来源与资源双击改名](architecture/V4_PATTERN_ELEMENT_LIFECYCLE_P4_2026-10-23.md)。不改变稳定ID，名称别名随元素进入新项目，停用保值及私有来源清理；下一步P5。下方较早批次状态为历史记录。

RC5-P2b完成：[路径预设、私有来源及样例](architecture/V4_PATH_PATTERN_PRESETS_P2B_2026-10-22.md)。五项mode=path、图片／组／程序依赖、真实取用和单次撤销／重开；下一步P2c统一卡片。

RC5-P2a：[共享底座及P2b／P2c边界](design/PATTERN_RC5_DECISIONS_2026-10-22.md)。图样复用发布库与项目关系，添加身份可随元素入库；未交付新图样卡界面，不把内部服务测试当作前端完成。

进行中：[RC5图样产品合同与P0～P5实施表](design/PATTERN_RC5_DECISIONS_2026-10-22.md)。P0确认完成，P1添加式Inspector通过定向验收；项目／共享卡片、树中排序、完整依赖与Agent实验分批跟踪。

最新：[RC4素材四项收口](architecture/V4_RC4_MATERIAL_CLOSEOUT_2026-10-22.md)：共享工程包、导出画面／工程文件夹提取、组与粒子单卡；收藏Tab移除。下方相反状态为历史，不再作为当前入口说明。

最新：[素材卡烘焙／共享卡对齐](architecture/V4_MATERIAL_CARD_BAKING_2026-10-21.md)。普通与程序元素可从卡片烘焙位图／序列；项目♥hover显示更新，共享卡尺寸和按钮位置统一。下方为此前批次记录。

本轮：[元素卡统一／单向共享](architecture/V4_MATERIAL_CARDS_RC3_2026-10-21.md)。程序根资源导入成为普通元素卡，独立构件栏移除；卡片图标统一，项目♥仅更新共享，选中预览才编辑。先前[回存／非连带移除／导入授权](architecture/V4_MATERIAL_UPDATE_REMOVE_IMPORT_2026-10-21.md)继续有效。素材卡烘焙及旧归档余项尚未完成。

最新：[RC3-c2b图样／构件／烘焙入口归位](architecture/V4_RESOURCE_ENTRY_PLACEMENT_RC3C2B_2026-10-21.md)：图样管理在图样下，程序构件与烘焙在素材项目区，复用现有命令、信任、预算、库和取消。旧收藏保留完整包归档等余项，c2未整体结案。此前[c2a旧素材迁入](architecture/V4_LEGACY_MATERIAL_MIGRATION_RC3C2A_2026-10-21.md)及c1预览已完成。

最新：[RC3-b显式共享](architecture/V4_MATERIAL_SHARING_RC3B_2026-10-21.md)完成发布、更新、跨工程取用、移除与IndexedDB升级；新metadata只用于编辑器，交付剥离。下一步c统一卡片／预览及旧入口替换，下方为此前分批记录。

最新：[RC3-a项目元素素材入口](architecture/V4_PROJECT_MATERIAL_PANEL_RC3A_2026-10-21.md)完成实际入库、独立放置、基础首帧与工程往返；[D2／D3决议](design/RC3_MATERIAL_PANEL_DECISIONS_2026-10-21.md)确认显式发布／更新及标题下独立按钮行。共享和完整入口替换尚待下一批。

最新：[RC2-c2b父组蒙版坐标](architecture/V4_ELEMENT_PARENT_MASK_SPACE_RC2C2B_2026-10-21.md)，共享几何换基、跟随与画布编辑同步、44组浏览器及正式HTML验证；RC2确认数据范围收口，下一步讨论RC3。以下为此前分批记录。

最新：[RC2-c1统一蒙版适配](architecture/V4_ELEMENT_PRESET_MASKS_RC2C1_2026-10-21.md)，包括几何与跟随矩阵重定位、素材引用重连、20组实际画面对照和未来亮度来源／绘制更新清单；对象来源留待c2。

数据层增量：[RC2-a独立元素预设](architecture/V4_ELEMENT_PRESETS_RC2A_2026-10-21.md)，包含基础快照、资源／项目往返、程序参数画面对照和明确拒绝范围；不代表RC3面板已上线。

后续已补齐[RC2-b图片／序列／文字／图样及Module素材依赖](architecture/V4_ELEMENT_PRESET_DEPENDENCIES_RC2B_2026-10-21.md)，未用预设不解码；外部对象来源仍待RC2-c。

当前产品收口计划：[素材／图样／效果RC0～RC9](architecture/V4_RESOURCE_PRODUCT_CONSOLIDATION_PLAN_2026-10-21.md)。包含已确认原则、分阶段计划表、待讨论面板／卡片／删除规则，以及效果扩展的独立验收阶段；尚非已实现功能说明。

已完成[RC1元素素材最小合同与现状审计](architecture/V4_ELEMENT_MATERIAL_RC1_CONTRACT_2026-10-21.md)：六组可重复输入、基础值／时序区分、引用闭包、身份映射与RC2小批顺序；该历史审计不是当前功能清单，用户入库面板尚未实现。

程序构件复用：[R4a实例／R4b显式冻结与烘焙合同](architecture/V4_MODULE_RESOURCES_R4_2026-10-19.md)、[可导入雨幕](../examples/resources/rain-curtain.tosampool-resource.json)。首次新建显式授信，实例参数独立；生成普通图片／序列素材，不替换源对象。

声明式图样接入：[R3b生命周期合同](architecture/V4_PATTERN_PROVIDERS_R3B_2026-10-18.md)、[Agent文件格式](agent/PATTERN_PROVIDER_FORMAT_V1.md)、[可导入折线框标](../examples/resources/folded-frame.tosampool-pattern.json)。定义是纯数据，不是任意代码插件。

静态图样缺失保护：[R3a合同](architecture/V4_PATTERN_SNAPSHOT_R3A_2026-10-18.md)说明几何缓存、精确版本／参数绑定、内部编辑锁定与工程／交付边界。它不代表任意生成器热安装完成。

资源复用新增：[统一资源合同R0～R4](architecture/V4_RESOURCE_PACKAGE_CONTRACT_2026-10-18.md)定义身份、工程边界、依赖与安全；[R2收藏入口](design/RESOURCE_COLLECTION_R2_2026-10-18.md)说明左栏操作、支持范围与验收。不与原生插件热更新或自动项目重开混为一谈。

README 只承担产品入口与快速开始；本页面向维护者和贡献者，按职责组织稳定文档。旧文档中的 Patcharium / 拼好景为历史名称；当前对外名称为 ToSampool / 图森破。

先读 [文档架构与提交边界](DOCUMENTATION_ARCHITECTURE.md)：它说明各类文档的权威范围、代码数据流，以及本轮 v4 基线为何分成四类提交。

## 使用与产品

- [用户指南](USER_GUIDE.md)：当前编辑器工作区、操作、保存与导出。
- [产品叙事](product/PRODUCT_NARRATIVE.md)：目标用户、公开承诺、人与 Agent 的分工。
- [路线图](../PLAN.md)：只记录未完成方向、优先级及已交付基线。
- [更新日志](../CHANGELOG.md)：按时间记录已完成变化。

## Scene 与 Agent

- [Agent 创作 Skill 架构](architecture/V4_AGENT_CREATIVE_SKILL_ARCHITECTURE.md)：以 `scene-author / asset-derive` 统一当前画布协作、参考图角色、结果类型与安全回写边界。
- [Agent 参考图输入协议](architecture/V4_AGENT_REFERENCE_INPUT_PROTOCOL.md)：三条创作分支共享的参考图入口与素材授权规则。
- [Scene Spec](../SCENE_SPEC.md)：字段与 Runtime 语义的唯一真相。
- [生成协议](agent/AGENT_GENERATE_SPEC.md)：自然语言/参考图到 Scene。
- [改写协议](agent/AGENT_REWRITE_SPEC.md)：既有脚本到可编辑 Scene。
- [Agent Tool Protocol](agent/AGENT_TOOL_PROTOCOL.md)：外部 Agent 的操作与验证边界。
- [提示词手册](agent/AGENT_PROMPT_PLAYBOOK.md)：三类案例提示词。
- [试验状态](agent/AGENT_WORKFLOW_STATUS.md)：已验证结论、失败方式和待解决问题。
- [Builtin Manifest](agent/BUILTIN_MANIFEST_V4.json)：Agent 可使用的受控内建构件、参数与时序白名单。
- [项目内 Skill](../skills/tosampool-create/SKILL.md)：可外部发布、也供编辑器显式调用的创作入口。

## 架构

先读 [架构总览](architecture/ARCHITECTURE_OVERVIEW.md)，再按问题进入专题：

- 编辑器：[行为合同](architecture/EDITOR_BEHAVIOR_SPEC.md)、[命令](architecture/EDITOR_COMMANDS.md)、[Scene Mutation](architecture/SCENE_MUTATION.md)、[Inspector 控件](architecture/INSPECTOR_CONTROL_SYSTEM.md)
- v4 正式迁移：[迁移总规范](architecture/V4_MIGRATION_MASTER_SPEC.md)、[机器迁移矩阵](architecture/V4_MIGRATION_MATRIX.json)、[Legacy 行为基线](architecture/V4_BEHAVIOR_BASELINE.md)、[差异白名单](architecture/V4_DIFFERENCE_ALLOWLIST.md)、[Parity 测试计划](architecture/V4_PARITY_TEST_PLAN.md)
- v4 能力收尾：[能力收尾台账](architecture/V4_CAPABILITY_CLOSEOUT.md)，它管理效果、粒子/Builtin 与 v4 交付；不替代纯 v4 产品化迁移。
- v4 后续总计划：[工程包、交付与 Agent 模块总计划](architecture/V4_EXECUTION_MASTER_PLAN.md)。其中 [项目包协议](architecture/V4_PROJECT_PACKAGE_PROTOCOL.md)、[交付产物协议](architecture/V4_DELIVERY_ARTIFACT_PROTOCOL.md)、[Agent 场景模块协议](architecture/V4_AGENT_SCENE_MODULE_PROTOCOL.md) 与 [设置面板台账](architecture/SETTINGS_PANEL_BACKLOG.md) 分别定义下一阶段的稳定边界。
- v4 支撑资料：[v4 Scene 合同](architecture/VNEXT_SCENE_CONTRACT.md)、[Legacy → v4 转换合同](architecture/LEGACY_V4_CONVERSION.md)、[外部转换实验](architecture/V4_LEGACY_CONVERSION_EXPERIMENT.md)、[Parts 迁移合同](architecture/V4_PARTS_MIGRATION_CONTRACT.md)、[效果系统](architecture/EFFECT_SYSTEM_VNEXT.md)、[Classic Shell 桥接说明](architecture/V4_CLASSIC_SHELL_MIGRATION.md)、[预览性能合同](architecture/V4_PREVIEW_PERFORMANCE_CONTRACT.md)、[历史差异盘点](architecture/VNEXT_PARITY_AUDIT.md)
- 运行：[Runtime 合同](architecture/RUNTIME_CONTRACT.md)、[Runtime Adapter 状态](architecture/RUNTIME_ADAPTER_PLAN.md)、[蒙版与 FX](architecture/MASK_AND_FX_STATUS.md)
- GPU 实验：[场景执行器接线合同](architecture/V4_SCENE_GPU_EXECUTOR_CONTRACT.md)、[画质与性能验证记录](architecture/V4_GPU_POSTPROCESS_FEASIBILITY_2026-10-13.md)。真实 Player 仅显式试用首批白名单，默认场景 CPU 路径尚未切换。
- 来源传递诊断：[Canvas／OffscreenCanvas／位图 Alpha／静态纹理对照](architecture/V4_GPU_SOURCE_TRANSPORT_2026-10-15.md)。这是独立复制实验，不替代真实 Player 或默认来源策略。
- 连续压力与诊断收束：[真实 Player 四策略交错验收](architecture/V4_GPU_INTERLEAVED_PLAYBACK_2026-10-15.md)。区分 RAF 参数时间与回调实际到达，固定角色不推广；默认后端不切换。
- 首批整链扩充：[场景阈值分色真实 GPU 接线](architecture/V4_GPU_THRESHOLD_PLAYER_2026-10-15.md)。阈值→不均采样保留逐卡缩放与范围；不是全部效果已GPU化。
- 后续整链扩充：[场景杂色抖动真实 GPU 接线](architecture/V4_GPU_NOISE_PLAYER_2026-10-15.md)。GPU整数随机序列、三卡交替中间纹理、性能与透明临界错点分别记录；仍为实验后端。
- 当前透明链基线：[预乘字节与原生范围合成](architecture/V4_GPU_ALPHA_BYTES_2026-10-15.md)。96组照片与严格门禁通过，资源／绘制道数和新增成本同步；不是全部效果或默认后端完成。
- 五卡扩充：[场景染色／边缘色散真实GPU](architecture/V4_GPU_TINT_DISPERSION_PLAYER_2026-10-15.md)。全尺寸染色与采样末端色散保留固定顺序；染色仅三种混合先行，其他整链CPU，预算与未完成项独立记录。
- 文件与交付：[Host Adapter](architecture/HOST_ADAPTER.md)、[Tauri Host](architecture/TAURI_HOST.md)、[Asset Resolver](architecture/ASSET_RESOLVER.md)、[Artifact Builder](architecture/ARTIFACT_BUILDER.md)
- 质量：[验收测试矩阵](architecture/ACCEPTANCE_TEST_MATRIX.md)

历史基线审查已归档至 [docs/history](history/VERSION_BASELINE_V3_1_REVIEW.md)，不作为当前架构入口。

## 设计

- [图样目录与拓展实施合同](design/PATTERN_LIBRARY_INTERACTION_CONTRACT_2026-10-18.md)：三类图样、新建／应用选择矩阵与数据归属；[G1/G2交付](design/PATTERN_LIBRARY_G1_G2_2026-10-18.md)及[G3自定义／角点箭头合同](architecture/V4_CUSTOM_SHAPES_G3_2026-10-18.md)含验证、样例和截图，G4独立生成与Agent实验仍待实施。

- [旧媒介工作台 UI 规则](design/OLD_MEDIA_WORKBENCH_UI_RULES.md)：下一轮界面的已确认视觉方向、屏幕布局、Inspector、时间轴、实体按钮与临时浮层规则；图标造型和数值待小样校准，当前页面尚未实施。
- [Design System](design/DESIGN_SYSTEM.md)
- [UI 信息架构](design/UI_INFORMATION_ARCHITECTURE.md)
- [组件登记](design/COMPONENT_REGISTRY.md)
- [交互与动效](design/INTERACTION_AND_MOTION.md)
- [UI 重构蓝图](design/UI_RECONSTRUCTION_V1.md)

当前工作区骨架已经实施；下一轮旧媒介工作台方向尚待实现，图标造型和视觉 token 尚未定稿。

## 维护规则

[文档同步协议](../DOCUMENTATION_PROTOCOL.md) 规定哪些修改必须同步 README、Scene Spec、Agent 协议、架构合同、PLAN 和 CHANGELOG。验证脚本只报告问题，不自动改写源码。
