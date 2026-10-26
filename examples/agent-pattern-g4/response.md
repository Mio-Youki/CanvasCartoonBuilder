# 交付说明

信息范围：仅依据任务消息提供的 tosampool-scene/v4 场景合同、corner-arrows 配方及正多边形扩展字段制作；未读取应用源码、示例、测试或历史，未修改 Runtime，未执行测试或渲染。

基础版为 720×420 深灰画布，横向排列独立的四角、三角形、五边形箭头对象；使用灰白、浅蓝、暖橙区分图样。所有箭头宽度 8、两翼长度 30、总长度 50、圆角 0、尖尾，隐藏多边形源轮廓。

修改版仅将四角箭头的 length 从 50 改为 75，shaftMode 从 center 改为 fixed，radius 从 0 改为 3；shaftAngle 保持 0，即从箭尖至尾端朝右，四根箭杆平行。其粗细、位置、尺寸、颜色及三角形、五边形的全部内容保持不变；场景名称仅用于区分版本。

可调字段：对象 x/y/w/h；矩形 parts[].stroke、strokeWidth、strokeAlpha 和 recipe.params；多边形 sides 及 extensions["corner-arrows"] 的 size、length、inset、direction、radius、shaftMode、shaftAngle、shaftCap、width、color、alpha。单独调整箭杆长度应改 length，保留宽度字段；整体缩放对象可能同时影响视觉粗细。

未明确的设计选择：合同未指定颜色、布局、加长幅度及固定角度，分别选用上述三色、三列留白布局、长度 75、固定角度 0。radius 按合同作用于整个轮廓，未解释为仅箭头两翼圆角。

不支持项：合同未提供配方参数的独立时序，因此未添加参数动画；未引入未知配方或合同外能力。实际渲染、编辑交互及视觉边界待主 Agent 独立验证。
