# Agent Tool Protocol（草案）

> 2026-10-26图层语义后续修订：`particle.mode:'layer'`支持`layerEmission:'burst'|'continuous'`；`fragmentShape:'rect'|'circle'`、`sampleTime:'birth'|'fixed'`、`sourceFps`默认12、`showSource`默认true，均No。持续模式沿用数量／寿命出生机制，来源Alpha×发射范围归一化取点，纹理按来源刷新率分批冻结；固定模式取startTime。静态来源复用一张纹理，不生成每粒子独立资源。原图的消逝交给其自身时序／蒙版，不自动隐藏；覆盖下方首轮隐藏约定。[完整协议与预算](../architecture/V4_CONTINUOUS_LAYER_PARTICLES_2026-10-26.md)。

> 2026-10-26覆盖下方“仅独立实验”状态：正式粒子支持`particle.mode:'layer'`、`cellSize`正整数默认32、`startTime`秒默认0，三者No。规则切片保留来源原位原色，引用源正常绘制暂停；读取开始时完整对象，后续一次飞散，不持续出生或更新每片内部动画。数量／发射范围不用于该模式，显示范围仍生效；限16384片和16MP来源，默认CPU。详见[正式合同及成本](../architecture/V4_LAYER_PARTICLES_INTEGRATION_2026-10-26.md)。

> 2026-10-25后续修订覆盖下方U4初始减量约定：普通粒子按有效Alpha／亮度的归一化权重分配目标数量，非空稀疏区域不再减量，全黑仍为零，保留候选与存活预算。路径截取使用`strokeTrimStart`／`strokeCompletion`，UI分别“截取起点／截取终点”，0～100且支持Linear，封闭路径的起点位置仍独立。规则图层切片只在独立实验页验证，尚无正式工程字段，不应由Agent直接写入场景。见[实现与性能边界](../architecture/V4_WEIGHTED_PARTICLES_LAYER_PROBE_2026-10-25.md)。

> 2026-10-25 U4：粒子emissionRange／motionRange接受统一四类来源、多图形及Alpha／luma，全部No；默认本地图形使用follow=true、followMatrix=I，引用对象保持世界位置。数量／寿命仅Step；旧批次按出生快照存活，分布可减少有效数量，全黑不出生。新Player需particles.birthRanges=1；临时预览新增particle-emission／particle-motion。动态完整来源首次／编辑重建成本显著，必要时让用户明确选择sourceQuality，不静默删效果。[语义、输入与性能](../architecture/V4_PARTICLE_MASK_U4_2026-10-25.md)。下方“粒子未开放”为早期状态。

> 2026-10-25 第三批：对象／场景蒙版支持临时灰度预览。通过`View.setMaskPreview({scope,ownerId|effectId})`或正式`renderTo`的`maskPreview`选项使用，不把它写入Scene或资源；保存／导出仍使用正常画面。粒子范围预览仍待U4，见[接口与边界](../architecture/V4_MASK_PREVIEW_U3_2026-10-25.md)。

> 2026-10-25 第二批：对象／场景多图形使用`type:'shapes',version:1,shapes:[{id,type,x,y,w,h}|{id,type:'poly',points}]`，1～64项，固定合并，子项同向绕行防止重叠挖洞；反相／跟随只在根。全部No，不生成子项时序或子项引用；公共Player需`masks.shapeUnion>=1`。粒子集合／图片／对象来源仍未开放，不能套用对象蒙版能力。见[数据和边界](../architecture/V4_MASK_SHAPES_U1_U3_2026-10-25.md)。下方首批状态是历史记录。

> 2026-10-25：蒙版参数默认No；来源对象自身动态仍生效。完整对象／组来源支持透明度或亮度（Y×A）、showSource及显式sourceQuality，默认full；不得为了性能静默去掉加样／采样。公共Player需`masks.completeSources>=1`，旧Player明确拒绝。见[首批实现与性能](../architecture/V4_MASK_SOURCE_U1_U2_2026-10-25.md)；多图形和粒子新出生模型未完成，不生成不存在的能力。

> 2026-10-25：生成循环动态须先读[循环运动合同](MOTION_CONTRACT_V1.md)。优先复用Runtime的往返／循环推进／随机刷新，不各自重写时间公式；声明单位、周期、逐帧、Step能力及闭合条件。两帧往返须真实产生两个端点状态；导出镜像与GPU重复路径也须验证。其他尚未迁入的算法不得因有相似参数而被声称已统一。

> RC5-P4：name只作展示别名，Agent应以稳定ID读写和引用，不能因用户改名重新生成ID。元素携带的路径图样会在取用时补齐项目目录；可选patternNames仅保留别名，不改参数键／生成器ID。项目已有同图样参数和名称优先，不能借隐式依赖导入覆盖。共享改名不会自动改项目，内容回传仍需显式更新。下一步P5才是新图样生产验收，见[P4边界](../architecture/V4_PATTERN_ELEMENT_LIFECYCLE_P4_2026-10-23.md)。

> RC5-P2c：图样入口为项目／共享卡片，不再指示用户展开旧“图样管理”。自带只读，导入入项目不自动应用；保存预设只保存项目定义，♥显式发布／更新。新建采用暂存工程，绘制完成才提交资源与来源，取消不写入。当前五项原生路径能力已接通；旧custom定义保留不等于任意独立生成器都符合路径图样合同。未知新算法仍须P5审阅，详见[本批](../architecture/V4_PATTERN_CARDS_P2C_2026-10-22.md)。

> RC5-P2b已接通：使用kind=pattern、patternResources的mode=path表达五项已登记路径引擎；元素排布source为完整元素预设闭包，不能写原场景sourceId；source依赖必须进入资源包。版本／载体不支持明确失败，未知算法仍不可执行。图样UI卡片在P2c，参见[API及样例](../architecture/V4_PATH_PATTERN_PRESETS_P2B_2026-10-22.md)，替代下方“当前仅custom预设”的旧批次限制。

> RC5-P2a准备：图样共享与素材共用publication／版本／项目关系，kind=pattern；取用只复制定义、不创建画布。当前仍只接受既有custom图样预设，刻度／嵌套／元素排布的完整预设在P2b，不得绕过校验强写未知engineId。`extensions.attached`可随元素入库；未知身份仍拒绝。前端图样共享卡在P2c，不提供不存在的操作指引。

> RC5-P1：图样须真实读取宿主路径，独立内容属于元素，不通过无作用的矩形伪装路径图样。`extensions.attached`表达已添加身份，不能因Runtime归一化包含默认配置就列出全部图样；停用保留值、移除才解除。当前新增算法生成与项目／共享图样合同仍在分批实施，不得声称任意图样包已可执行。见[RC5流水线与限制](../design/PATTERN_RC5_DECISIONS_2026-10-22.md)。

> RC4：组与粒子均为元素素材，不建立新一级资源类型。保留内部层级，捕获来源闭包，取用时重映射身份；不得把私有来源自动变成可见素材卡。入库不带时序，删除粒子来源保护则须保留其时序并重接。收藏Tab及迁入入口已撤下，不再指示用户使用。跨项目用共享或保存工程文件夹导入；[完整合同](../architecture/V4_RC4_MATERIAL_CLOSEOUT_2026-10-22.md)。

> 本轮素材约定：改写工程保留asset.libraryHidden及实例resourceBindings.element，不通过名称重连。Canvas→素材回存是显式命令，非自动同步；移出素材库不删除画布或依赖。不得生成“已信任”字段以绕过导入授权；程序源码仅由人类导入确认获当前工程许可。详见[合同](../architecture/V4_MATERIAL_UPDATE_REMOVE_IMPORT_2026-10-21.md)。

> RC3-b：改写已有工程须保留编辑器`materialShares`发布关系（publicationId／publishedHash／localHash）；Agent生成普通场景不必填写该字段，不能凭名称自动绑定共享素材。画布实例改动不回写素材定义或共享库，跨工程导入不继承Module授信；网页交付移除关系但保留实际内容。格式与并发规则见[合同](../architecture/V4_MATERIAL_SHARING_RC3B_2026-10-21.md)。

> 当前RC2-c2b：普通／程序根元素可从父组脱离入库；蒙版`geometryMatrix`是共享MaskState产生的有限可逆仿射基，不是Agent可随意猜测的视觉参数。改写工程必须保留该字段及followMatrix；几何／跟随通过detach、translate和placementMatrix同步，不复制父组动画或外观。公共Player需要masks.affineGeometry。下方历史“父组坐标不支持”限制由[本合同](../architecture/V4_ELEMENT_PARENT_MASK_SPACE_RC2C2B_2026-10-21.md)替代，组／粒子根和来源仍未开放。

> RC2-c2a：元素预设可用sources携带蒙版／排布／端点的普通／程序对象闭包，放置后各实例分配独立对象身份。内部来源的referenceSourceOnly角色不等于hidden，网页交付必须保留。生成普通场景仍不强制先建预设；程序来源依然需要当前工程显式授信，组／粒子来源与父组蒙版坐标尚不支持。见[对象引用合同](../architecture/V4_ELEMENT_REFERENCE_CLOSURE_RC2C2A_2026-10-21.md)。

> RC2-c1：无父级元素预设可携带静态几何及图片Alpha／luma蒙版，入库／放置用共享MaskState适配；不应手动猜测平移followMatrix的线性项。对象来源／排布／端点及父组蒙版坐标仍拒绝。未来新增蒙版能力需同步共享声明及验收，不视为自动支持。见[合同](../architecture/V4_ELEMENT_PRESET_MASKS_RC2C1_2026-10-21.md)。

> RC2-b补充：元素预设可携带图片／序列的原图＋recipe＋Alpha链、准备好的文字双图集及布局、内嵌图样配方和Module声明素材；外部对象来源仍拒绝。未使用预设不解码，Agent直接生成普通实体的路径不变。文字缓存不等于字体安装，程序素材同名异内容冲突不改写源码。详见[依赖合同](../architecture/V4_ELEMENT_PRESET_DEPENDENCIES_RC2B_2026-10-21.md)。下方RC2-a为初次数据层落地记录。

> RC2-a：`elementPresets`是编辑器资源定义集合，不是新的Runtime实体。Agent生成场景仍可直接创建普通实体，无需先生成预设；改写已有工程时应保留该集合。捕获仅保留自身基础值／循环动态，位图及外部来源等未完成依赖必须明确拒绝。见[范围合同](../architecture/V4_ELEMENT_PRESETS_RC2A_2026-10-21.md)。本增量未增加Agent面板工具或通用插件执行权限。

> 目标：让外部 Agent 与 ToSampool / 图森破围绕同一 v4 项目合同协作，而不是让 Agent 直接操控不稳定的界面坐标或输出无法验证的任意 Canvas 代码。
>
> 字段真相仍以 [SCENE_SPEC.md](../../SCENE_SPEC.md) 为准；视觉生成步骤见 [AGENT_GENERATE_SPEC.md](AGENT_GENERATE_SPEC.md)。本文件只定义协作动作、输入输出与验收。

## 1. 设计原则

1. **项目内容是共同中间物**：声明式对象修改使用 Scene Patch；项目 Scene Module 作为独立、显式、可审阅的项目文件修改，不把源码塞进 Scene，也不修改共享 Runtime。
2. **先诊断，后变更**：每次修改先读取场景摘要和固定时间预览，再限定目标对象与影响范围。
3. **最小 Patch**：一次请求只改必要对象；保留稳定 `id`、命名和未涉及的层级。
4. **可验证、可撤销**：每次 Patch 都应有校验结果、固定时间预览点和可回退的前态。
5. **渐进披露**：初始生成只暴露基础 Scene 能力；用户提出局部时序、蒙版、FX 需求后，才向 Agent 提供对应高级字段。

编辑器内部的 `EditorCommands` 只提供稳定工作流入口，不等于 `applyScenePatch`。Agent 可以调用保存、测试、固定时间渲染等安全命令；对象字段修改仍必须提交声明式 Patch，经 Scene schema、引用关系和历史边界校验，不能通过模拟 UI 点击代替。

## 2. 最小动作集

| 动作 | 输入 | 输出 / 约束 |
|---|---|---|
| `readScene` | 场景文件 | Scene 摘要：画布、场景段、对象表、图片、组、FX、可编辑性诊断 |
| `renderFrame` | Scene + 确定 `t` | 预览图与运行告警；不得依赖编辑器 RAF 状态 |
| `locate` | `id` / 名称 / 语义 | 精确对象、父组、相关蒙版/FX/时段与包围盒 |
| `proposePlan` | 用户意图 + 参考材料 | 元素表、载体判断、修改范围、不可保真项；不直接伪造图片资源 |
| `applyScenePatch` | 声明式 Patch | 新 Scene、变更摘要、保留的稳定 id；不得注入函数或 `program.code`。程序对象只能引用已随项目提供并经信任的 Module id/version |
| `updateSceneModule` | 项目 Module 源 + Manifest | 独立文件变更、公开参数差异、素材依赖、固定时间验证和信任提示；不得绕过项目边界修改共享 Runtime |
| `validateScene` | Scene | Schema、引用循环、资源、保存往返和固定时间渲染结果 |
| `compareFrames` | 基准帧 + 新帧 | 差异摘要与人工审稿点；只辅助判断，不作为唯一视觉质量标准 |

## 3. Patch 形态

协议实现前可用 JSON 兼容的抽象 Patch；不得要求 Agent 输出整份无关 Scene。

```js
{
  intent: 'make-night',
  targetIds: ['sky', 'river', 'tree-foreground-01'],
  operations: [
    { op: 'set', path: 'elements.tree-foreground-01.style.shadow.color', value: '#18243a' },
    { op: 'add', collection: 'fx.layers', value: { id: 'night-fog', /* 合法 fx schema */ } }
  ],
  checks: [{ t: 0 }, { t: 12 }]
}
```

实际路径、合法字段与 `add` 对象必须由 Scene schema 校验。Patch 应报告新增/删除/修改的对象，删除带有其他引用的对象必须先显式说明影响。

## 4. 初始生成与局部修改的不同权限

| 阶段 | Agent 可见能力 | 必交付物 |
|---|---|---|
| 视觉规划 | 参考角色、画布、元素表、可编辑性预算 | 场景蓝图与载体判断 |
| 初始生成 | 普通对象、图片/序列、组、粒子、可选项目 Module、基础动画与场景段 | 合规 v4 Scene/Project、载体表、近似说明 |
| 局部修正 | 目标对象、当前预览、必要的蒙版/FX/时序字段 | 最小 Patch、前后预览点、验证结果 |
| 兼容迁移 | 既有 JS 与受支持字段 | 报告 v2、转换/混合/Module/冻结/人工/真正阻塞清单 |

不要在初始生成提示中强制讲解所有时序轨道、复杂蒙版或局部 FX；这会增加不必要的 schema 噪声。高级能力应由明确用户需求或工具诊断触发。

## 5. 三案例验收矩阵

| 案例 | 关键验证 | Agent 成功条件 |
|---|---|---|
| 微缩景观/雪花球 | 层次、粒子、光照/时段、持续循环 | 语义层次清楚；运动层可单独调整 |
| 静图转氛围场景 | 底图与结构层取舍、局部运动 | 不用低质量 parts 强行替代高密度静态细节 |
| 粗糙波普拼贴 | 快速装配、描边/纹理/效果、导出 | 用户能无需代码替换素材与调整风格 |

所有案例共同通过：可导入 → 可编辑 → 保存 → 再打开 → 独立测试页 → PNG/GIF。记录性能预算与人工修正次数；“文件能解析”不是成功标准。

## 6. 暂不承诺

- 单轮高保真参考图重绘；
- 任意网页、视频、WebGL 或自定义 Canvas 函数的无损迁移；
- 在未封装桌面项目层前，对原图路径和处理配方的长期持久化；
- 内置 Agent 聊天、远程模型服务或自动执行不可审阅修改。
> 素材交付补充：Module根资源导入会按Manifest默认参数和建议尺寸形成普通元素素材，不自动放到画布。若需要交付特定造型参数，应交付元素预设根并携带Module依赖，而不是指望默认卡保留某个未声明实例的状态。导入授权、预览及放置沿用原宿主边界，不生成独立“程序构件栏”相关指令。见[卡片合同](../architecture/V4_MATERIAL_CARDS_RC3_2026-10-21.md)。

素材卡烘焙是显式不可编辑派生：生成独立位图／序列，不以其替代可调的元素预设交付。采用预设基础参数和循环动态，不自动吸收某个画布实例的未回存修改。来源记录`moduleBake`不成为运行依赖；见[卡片烘焙](../architecture/V4_MATERIAL_CARD_BAKING_2026-10-21.md)。
