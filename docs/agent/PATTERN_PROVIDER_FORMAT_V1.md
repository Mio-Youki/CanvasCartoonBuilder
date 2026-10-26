# Agent交付：可插拔参数图样 v1

> 2026-10-23：新增可选参数`timing: No|Step|Linear`及`interpolation`；旧参数缺省No。正式受限模板的数值等声明参数可在所属对象原轨内写入稀疏覆层，Linear按白名单插值，不新增图样轨。参考[双色放射提案与时序合同](../architecture/V4_PATTERN_PARAMETER_TIMING_P5_2026-10-23.md)。双色重复扇区仍是候选算法，本文件的v1坐标模板不能表达，不能伪造字段作为正式交付。

使用场景：用户需要可调的框标、角标、标记、线条组合等静态图样，希望导入后直接获得共用参数面板，而不是修改编辑器源码。

优先复用原生图样。需要新构造且能够用有限路径与线性坐标绑定表达时，输出`.tosampool-pattern.json`，格式`tosampool-pattern-definition/v1`。实际可导入样例：[折线框标](../../examples/resources/folded-frame.tosampool-pattern.json)；完整语义与预算：[R3b合同](../architecture/V4_PATTERN_PROVIDERS_R3B_2026-10-18.md)。

## 最小输入和补全

用户提供目标图样／参考图与希望可调的意图，例如“角落有折线，能调臂长、缩进和圆角”。Agent自行选择直接路径构造，不必按视觉印象硬做布尔裁切。默认暴露3～8项有实际视觉作用的参数，不把几何中间变量和所有坐标推给用户。

## 输出规则

- 稳定的自有命名空间ID，如`user.folded-frame`，正整数版本。不能占用`corner-arrows`／`brackets`。
- 名称、参数标签、select选项用易懂的自然语言。共享颜色与粗细由现有图元样式控制，不再声明一套颜色字段。
- 参数支持number／boolean／select，默认值必须有效；数值可声明min／max／step／integer。
- 路径points的分量是数值，或`{constant,w,h,params:{声明的数值参数:系数}}`。不允许字符串表达式、函数、循环或未声明字段。
- stroke表示开放描线轮廓，fill表示闭合填充轮廓；可用none／x／y／xy镜像。radius同样接受线性绑定；when为`{key,equals}`显隐条件。
- 数量、坐标范围、定义体积与派生点数都受合同预算约束。缺省参数下必须生成有效轮廓；避免初始臂长／缩进把图样全部挤出可见区域。
- 变更相同ID／版本的定义内容会被拒绝，应提升版本。用户安装新版后旧实例不自动改变；“应用此版本”是显式更新动作。

## 验证和交付

先由`ToSampoolRuntimeVNext.modules.patternProviders.validate`校验源定义，再用`EditorV4PatternLifecycle.install`在Scene副本安装，使用生成的预设创建图元，固定画布渲染检查默认态与参数变化。关注边界、命中、重叠Alpha、较窄载体及参数极值。交付源JSON与预览／验证说明，不声称未经测试的函数可用。

用户入口：左下“收藏”→“导入图样/资源”→当前工程预设“新建”→画布拖拽；参数位于图元“拓展”。不需要额外执行程序脚本。收藏预设会携带定义，工程和embed均自包含；`runtime.js`部署需使用包含模板能力的当前共享Player。

若构造需要任意算法、时间推进或复杂专用绘制，不要伪造表达式字段或强行近似为模板：明确报告需要扩展原语，或选择现有受信Scene Module创作路线。它们是不同的执行边界，不混为一个资源包代码入口。
