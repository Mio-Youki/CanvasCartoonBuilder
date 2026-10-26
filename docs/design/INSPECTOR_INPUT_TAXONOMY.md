# Inspector 输入类型盘点（V4）

状态：2026-10-06，设计盘点；尚未修改正式编辑器控件。范围是正式 V4 Inspector，不把素材预处理、Alpha 派生浮层和导出面板混入。依据为 `tools/editor/classic-v4-inspector-controller.js`、`classic-v4-pattern-field.js`、`classic-v4-color-control.js`、`classic-v4-inspector-effect-parameters.js`、`effect-registry-vnext.js`。程序构件和 Builtin 的具体字段由各自 manifest 决定，因此盘点的是其允许的输入类型，而不是穷举每个未来模块。

## 结论：11 类输入样式

首轮视觉与交互小样见 [Inspector 输入样式集合](prototypes/inspector-input-lab.html)。该页是离线原型，不代表控件已迁入正式编辑器。

数据层不需要 11 种类型。Registry 目前的 14 个效果、17 组效果动态、1 个采样控制器，共有 145 个声明式参数位置：109 个 `number`、22 个 `select`、11 个 `color`、3 个 `boolean`。其中 90 个 number 同时声明上下限；**有上下限不等于适合滑杆**。Inspector 的其他入口还使用文字、引用、画布编辑和复合图样。这些操作语义收敛为下面 11 种可复用输入样式。

| # | 输入样式 | 适用字段 | 核心交互与约束 |
| --- | --- | --- | --- |
| 1 | 精确数值 `ScalarField` | 画布尺寸、帧序号、随机种子、粒子数、间距、周期时间 | 保留键盘输入；按字段声明整数／小数、步进、范围和单位。种子不做滑杆。所有数值框默认无独立边框／底色，悬停或聚焦才显编辑态；按住上下拖动可调值，不另设加减按钮。 |
| 2 | 强度滑杆＋数值 `RangeField` | 对象透明度、阈值、强度、密度、对比、幅度等有感知上下限且需反复试看的量 | 轨道用离散刻度视觉，但输入仍按声明步进连续／离散；拖动实时预览，右侧可精确输入。颜色自身的 Alpha 不使用滑杆。高成本效果可在拖动时用 Draft。 |
| 3 | 成对数值 `PairField` | X／Y、宽／高、宽比／高比、水平／垂直斜切、相位 X／Y、场中心 X／Y | 同排、等宽、固定顺序；宽／高右侧有锁定比例开关，激活时修改一项联动另一项。窄栏不足时保持标签辨识并允许卡片内部换行。 |
| 4 | 角度／方向 `AngleField` | 旋转、投影角度、滚动方向、扫描擦除方向、网格旋转、粒子方向与扩散角 | 标题与精确数值之间可附小型环状方向盘；不再另放滑杆。扫描擦除方向是连续角度，而非四向枚举；明确角度范围与 0° 方向。 |
| 5 | 枚举选择 `ChoiceField` | 效果类型、混合方式、动态方式、点形、排列、场类型、过渡方式、蒙版类型 | 2–3 个互斥且高频的选项可并排，且每项各有独立边框；选项多、文案长或依赖展开时用下拉。扫描擦除的连续方向不属于此类。 |
| 6 | 双态开关 `ToggleField` | 启用、反相、跟随、循环、双色、包含投影、随寿命淡出 | 明确开／关，不把“展开参数”误当成“启用”。开启后渐进显示从属字段。 |
| 7 | 颜色＋透明度 `ColorField` | 场景背景、图元填色／描线、纹理色、染色叠加、灯光与双色调色 | 色块、色号、透明度同排；色块以透明棋盘为底直接预览合成色，不另设预览框或 Alpha 滑杆。色块打开共用取色器。对象整体透明度是独立字段；无 Alpha 的颜色不凭空附加透明度。 |
| 8 | 引用选择 `ReferenceField` | Alpha 图片、蒙版对象／组、粒子实体、字体连接 | 显示可辨认名称及必要预览，不只给内部 ID；失联、空素材和循环引用要有明确状态。预设虽然也是 select，但不是引用。 |
| 9 | 文本 `TextField` | 文字内容、少数名称／字体回退 | 短值单行，正文多行；文字对象内容不能压成一格高度的输入。 |
| 10 | 画布空间编辑 `SpatialField` | 旋转中心、矩形／椭圆／多边形蒙版、粒子发射／运动范围 | 旋转中心仅提供“设置中心”与右侧“复位中心”图标，实际取点在画布；不再为它重复提供坐标框。蒙版／粒子范围仍按自身任务提供编辑入口。 |
| 11 | 图样预览编辑 `PatternField` | 成样纹理填充、加样纹理叠加、背景纹理填充 | 共用预览、图样类型与条件参数；图样类型和颜色在预览框下方各独占一行，起始偏移 X／Y 等强关联参数同排。噪点与叠线是此复合控件的分支。 |

动态、时序、效果启用、效果选中和卡片删除是**状态／操作语法**，不计作第 12 种参数输入。它们应附着在所属卡片或字段组，不能改变参数本身的数据类型。

## 逐模块归类

| Inspector 模块 | 当前字段与条件分支 | 应复用的样式 |
| --- | --- | --- |
| 场景 · 画布 | 宽、高、周期时间 | `PairField`＋`ScalarField`；画布尺寸为整数，时间允许小数 |
| 场景 · 背景 | 背景颜色／Alpha；纹理填充开关、纹理色／Alpha、图样参数 | `ColorField`、`ToggleField`、`PatternField`；背景仅随 Scene 分段，不再有 Scene 内背景时序 |
| 场景 · 过渡 | 无／黑场／淡入淡出／扫描擦除／溶解、持续时间；黑场颜色、扫描擦除方向、溶解颗粒／种子 | 过渡方式 `ChoiceField`；当前扫描方向仍为四向 `ChoiceField`，待 R01 完成后改为连续 `AngleField`；时间与颗粒 `ScalarField`；黑场 `ColorField` |
| 对象／组 · 基本 | X/Y、宽高（组无固有宽高）、比例 X/Y、斜切 X/Y、旋转、中心、混合方式、透明度 | `PairField`、`AngleField`、`SpatialField`、`ChoiceField`、`RangeField` |
| 对象／图元 · 动态 | 漂浮／滚动、缩放呼吸、持续旋转／摆动、闪烁；每项启用、幅度、周期、速度、方向、运动方式、重复 | `ToggleField`、`RangeField`／`ScalarField`、`AngleField`、`ChoiceField`；按所属基本量分组 |
| 图元 · 几何与外观 | 本地坐标；线终点或笔触路径；宽高、比例、旋转、透明度；圆角、路径描线、纯色、纹理 | `PairField`、`ScalarField`、`AngleField`、`RangeField`、`ToggleField`、`ColorField`、`PatternField`；图元外观不另建时序入口 |
| 文字／图片 | 文字内容、字号、字距、行高、字体、填色；多帧播放帧率、循环 | `TextField`、`ScalarField`、`ReferenceField`、`ColorField`、`ToggleField` |
| 对象／场景 · 蒙版 | 类型、反相／跟随、Alpha 素材或元素引用、映射、编辑范围和多边形 | `ChoiceField`、`ToggleField`、`ReferenceField`、`SpatialField`；元素引用源仅作蒙版；粒子范围当前只列几何类型，需另行决定是否扩展引用能力 |
| 粒子 · 预设／实体 | 预设、使用预设实体、实体引用、播放方式／帧率／帧序号／循环 | `ChoiceField`、`ToggleField`、`ReferenceField`、`ScalarField` |
| 粒子 · 发射／运动／外观 | 数量、种子、发射／运动范围、寿命、速度、方向、扩散、重力、风力、旋转、尺寸、差异、透明度、淡出 | `ScalarField`、`SpatialField`、`AngleField`、`RangeField`、`ToggleField` |
| 程序构件／Builtin | manifest 声明的 number、color、select、boolean；可按条件显隐 | 复用对应基础样式，禁止模块自行注入不受控的任意 DOM 控件 |

### Registry 效果参数的具体落点

| 效果 / 控制器 | 输入归类 |
| --- | --- |
| 采样格 | 采样尺寸：整数 `ScalarField` |
| 投影 | 颜色／透明度 `ColorField`；距离 `ScalarField`；角度 `AngleField`；混合 `ChoiceField` |
| 描边 | 颜色／透明度 `ColorField`；宽度 `ScalarField`；混合 `ChoiceField`；包含投影 `ToggleField` |
| 染色叠加 | 颜色／透明度 `ColorField`；混合 `ChoiceField` |
| 纹理叠加 | 颜色／透明度 `ColorField`；`PatternField`（单线、网格、叠线、点阵、噪点）；混合 `ChoiceField` |
| 内光效、外光效 | 颜色／透明度 `ColorField`；光效范围与退晕层数 `ScalarField`；混合 `ChoiceField` |
| 调色四轴 | 色相、亮度、对比度、饱和度：有中心零点的 `RangeField`，保留精确输入 |
| 颜色映射 | 调色板 `ChoiceField`；自动提取时的最大颜色数为整数 `ScalarField` |
| 阈值分色 | 阈值 `RangeField`；暗色、亮色为两个 `ColorField` |
| 边缘色散 | 距离、边缘宽度 `ScalarField`；方向 `AngleField`；强度 `RangeField`；作用边缘与色序 `ChoiceField` |
| 偏移采样 | 类型、边缘／条带模式 `ChoiceField`；密度／呼吸幅度 `RangeField`；偏置、保护宽度、条带数／厚度／位移和种子 `ScalarField` |
| 网点映射 | 点形／色彩模式 `ChoiceField`；相对尺寸 `ScalarField`；角度 `AngleField`；起始偏移／错列偏移／阈值／对比 `RangeField`；单色时出现一个 `ColorField`，双色渐变时出现暗／亮两个 `ColorField` |
| 不均采样 | 粗细幅度／空间对比 `RangeField`；最大采样／图样尺度／种子／保护宽度 `ScalarField`；场类型／边缘规则 `ChoiceField`；方向 `AngleField`；径向中心 `PairField` |
| 蒙版暗角（仅场景） | 颜色 `ColorField`；强度、中心保留、边缘范围 `RangeField`；混合 `ChoiceField`；可选蒙版复用 `SpatialField`／`ReferenceField` |

- 成样纹理填充、场景背景纹理填充和加样纹理叠加应共用 `PatternField` 的静态参数与预览，仅所属颜色／Alpha 和混合语义按场合配置。
- 网点映射的起始偏移 X/Y、不均采样径向中心 X/Y、纹理相位 X/Y 应使用相同 `PairField`，但标签和单位语义由字段定义提供，不能因外观相同混用存储单位。
- 效果动态的 17 个定义目前全部声明 number 参数，仍需区分强度、周期、帧数、速度、方向、种子；动态“方式”和启用状态来自外层，不可简单按 `number` 自动生成统一滑杆。
- 「采样场」是不均采样的内置组成，没有独立启用开关。Registry 尚留有 `uneven-sampling.field.enabled` 字段，但专用参数规划器有意不显示；迁移控件时应将它视为内部兼容字段，后续再收束协议，不从该字段生成开关。

## 待合并处理的正式编辑器改动

- 场景过渡「扫描擦除」的方向改为连续角度。**当前只在小样和设计分类中表达，正式编辑器尚未修改。**现状是 `classic-v4-inspector-controller.js` 的 `right/left/down/up` 下拉和 `runtime-src/vnext/80-scene-renderer.js` 的四向矩形裁切。四层落点、旧值迁移和放行测试已独立登记为 [R01](INSPECTOR_PRE_MIGRATION_RUNTIME.md)；应在正式视觉迁移前完成，不能只替换下拉控件。

## 同行排布规则

每个双数值 `PairField` 固定三段：两个等宽数值区、右侧 **28 px 操作槽**。无锁定／复位按钮时保留不可点击、不可聚焦的空槽，保证 X/Y、宽/高与起始偏移的第二个数值对齐。一般字段行则由“名称＋值区”组成；两个独立字段同排时由外层布局拆为等宽两列，不强行给每个单字段再预留操作槽。实际逐行选择见 [图鉴排布矩阵](INSPECTOR_ATLAS_LAYOUT_MATRIX.md)。

- **同行**：同一语义量的两个分量（X/Y、宽/高、水平/垂直）、一个量及其直接辅助动作。旋转角度、迷你方向盘、「设置中心」及复位可以同行，因为后三者都直接改变旋转的参照；但要先用真实 Inspector 宽度验证命中区，放不下时允许“设置中心”移至紧邻下一行，不缩小数字和按钮。
- **分行**：两个需要各自阅读或展开条件参数的概念，例如旋转与动态·旋转、颜色与混合方式、图样类型与图样颜色。动态开关属于分组标题，时序属于可时序卡片标题，不塞入数值行。
- **主次顺序**：标签 → 值 → 单位 → 附属操作。优先保持数值列、单位列和操作槽齐线；不是为了凑两列而强行合并无关字段。

## 后续新增参数怎样套用

新增字段先在 Registry／模块 manifest 中定义稳定 ID、值类型、范围／步进／单位、默认值、时序和动态能力，再登记一份 `InputSpec`（所用的 11 类样式、成对伙伴、条件显隐、实时预览与性能预算）。Inspector 由共享控件和上述同行规则渲染，不在新效果里临时拼输入框。最后同时验收：值写入与恢复、Canvas 预览、Undo／Redo、时间轴、最窄 Inspector 和键盘／指针交互；视觉小样是样式基线，不代替 Runtime 合同测试。

## 迁移顺序与验收

Inspector 的内部滚动区应预留稳定的滚动条槽位，避免开启动态参数后由无滚动条变为有滚动条、挤窄字段并造成横向位移。正式编辑器可先在 `.inspector-context` 验证 `scrollbar-gutter: stable`；验收需覆盖内容高度恰好跨越滚动阈值、动态展开／收起、不同 Inspector 页和 Windows 滚动条设置。该约束只处理宽度跳动，展开时的纵向滚动定位仍需保留当前卡片和焦点可见。

1. 先做 `InputSpec` 映射表：字段 key → 输入样式、单位、显示精度、范围、默认值、成对伙伴、是否实时预览；Registry 与非 Registry 字段都必须登记。
2. 实现共享 `Scalar`、`Range`、`Pair`、`Choice`、`Toggle`、`Color` 基础控件；先拿对象「基本」、场景「背景」、描边和网点映射四组验证。
3. 再做 `Reference`、`Spatial`、`Pattern` 复合控件及文字。程序模块使用同一映射协议，不给每个 module 单独制作一套参数 UI。
4. 验证改值后的 Canvas 即时反馈、Undo／Redo、Step／Linear、动态启停、条件字段显隐、键盘输入、狭窄 Inspector 与高成本效果拖动预算。视觉原型只证明排版，不替代这些功能测试。
