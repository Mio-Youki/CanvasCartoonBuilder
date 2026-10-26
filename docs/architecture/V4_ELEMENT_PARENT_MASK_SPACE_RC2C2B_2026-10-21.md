# RC2-c2b：脱离父组的元素蒙版坐标

状态：2026-10-21完成数据层及针对性浏览器验收。补齐RC2确认范围；不是组素材入库或RC3素材界面上线。

## 范围与依据

D1要求保存元素自身的基础属性与循环动态，不携带父组影响。移除父组时，世界坐标蒙版必须转换到同一脱离后的坐标空间；只减去X/Y无法处理旋转、镜像、非等比缩放或斜切。把椭圆改成包围矩形同样不成立。

本次支持被父组包含的普通／程序根元素，以及原有rect、ellipse、poly、图片Alpha／luma和element蒙版。对象来源闭包仍沿RC2-c2a规则：普通／程序、无父级来源；组／粒子根及来源仍暂缓。父组的动画、时序、透明度、混合和效果不被继承。

## 共享蒙版合同

新增可选内部字段`mask.geometryMatrix:[a,b,c,d,e,f]`，表示原始几何坐标到当前世界坐标的仿射基。字段须为六个有限数且可逆，单位矩阵省略；不增加用户控件，不烘焙位图。粒子范围暂不接受此字段。

令`P`为祖先组自身基础变换的组合，`o`为根元素原始X/Y，`T`为平移：

- 捕获先按旧合同平移几何`-o`；再左乘`K=T(-o)·P⁻¹·T(o)`。
- 重定位`d`时，原始几何平移`d`，几何基`G`变为`T(d)·G·T(-d)`。
- 跟随锚点同样经过坐标换基；绘制使用`M当前·B锚点⁻¹·G`，不重复携带父组。
- element来源仍独立复制；其引用绘制输出受`G`转换，不作为额外可见对象。

共享`EditorVNextMaskState`提供`parentBaseMatrix`、`detach`、`rebase`和既有`translate`。元素预设只调用这些适配，不另写蒙版类型分支。父链缺失、循环、超过64级或矩阵不可逆时捕获失败，不部分写入。

Runtime蒙版模块提供`placementMatrix`和`affineGeometry:true`。编辑器绿色轮廓、命中、拖动及重绘复用同一矩阵。正式交付保留字段；公共Player不支持该能力时明确拒绝，不能静默忽略。源码与两份Runtime分发镜像同步构建。

## 四层落点与验收

| 层 | 落点 |
| --- | --- |
| 状态／适配 | `editor/vnext-mask-state.js`；`editor/v4-element-presets.js` |
| 编辑 | `editor/classic-v4-mask-controller.js`；无新增面板 |
| Runtime／交付 | `runtime-src/vnext/50-mask-resolver.js`；`editor/vnext-delivery-builder.js`及Runtime镜像 |
| 验证 | `tests/v4-element-parent-mask-space-contract.mjs`、`tests/browser/v4-element-parent-mask-space.mjs`，已进入verify-v4 |

合同覆盖六类父变换、嵌套、独立矩阵点对照、基础循环动态保留、父时序剥离、再次捕获、工程往返及原子拒绝。浏览器44组覆盖嵌套／镜像、跟随／反相及六类蒙版入口，三个时刻与独立全画布参考的最大可见通道差为2；六份正式HTML与编辑器画面一致，实际绿色轮廓、鼠标拖动、撤销及旧Player门禁通过。

参考Canvas与Runtime同用OffscreenCanvas，但坐标转换由测试独立计算，不调用detach／rebase。页面Canvas与离屏Canvas在浏览器的clip边缘抗锯齿不同，不能把该后端差异误判为坐标错误。比较Alpha及预乘RGB，未放宽两级通道误差门槛。

已补跑c1蒙版20组、c2a对象来源和b资源依赖浏览器，以及蒙版状态、预设、引用、交付和Runtime smoke。没有运行全量verify-v4、Tauri或性能专项，不据此声称全产品验收。

## 后续边界

未来新增蒙版通道／来源／绘制，必须同时更新共享PORTABLE声明、几何换基、Runtime placement、画布编辑及闭包测试，不能只修改素材模块。

RC2在D1确认的普通／程序元素数据范围内可收口。下一阶段RC3应先过D2／D3决策门，讨论项目／共享入口及发布／更新行为；组、粒子、删除生命周期和新界面不在本次扩围。
