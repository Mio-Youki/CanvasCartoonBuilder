# 多图形蒙版与来源分组：U1–U3第二批

日期：2026-10-25。承接[完整来源首批](V4_MASK_SOURCE_U1_U2_2026-10-25.md)，遵循[统一蒙版合同](V4_UNIFIED_MASK_CONTRACT.md)。本批交付多图形及对象／场景共用控件，不代表整个统一蒙版计划完成。

## 用户操作

- 对象成样的“蒙版”和场景滤镜的“范围蒙版”统一显示：无／图形／图片／场景对象。
- 选择图形，渐进显示“当前图形”“图形类型”和添加／复制／删除；初始一个矩形，可切换为椭圆或多边形。
- 在列表选择当前图形，再点击“编辑”，使用原绿色画布编辑器移动／缩放；XYWH仅编辑期间出现。多边形保留拖点、点边插点、点选重绘、Enter／双击闭合。
- 编辑时可点击另一块区域选中对应图形；重叠区域优先操作当前图形。其余图形显示较淡轮廓。
- 反相和跟随作用于整组图形；不单独为子图形增加反相、调序或时序。删除最后一个图形等同清除蒙版。
- 图片仍支持从文件导入入库、透明度／亮度提取；场景对象仍使用完整来源／显式处理档位。对象来源不再显示无意义的“跟随”开关。
- 粒子范围保持现有单几何入口；没有提前开放多图形／图片／场景对象，待U4正式改造取样和出生规则。

## 数据与唯一求值

```json
{
  "type": "shapes",
  "version": 1,
  "shapes": [
    {"id": "shape-1", "type": "rect", "x": 20, "y": 20, "w": 48, "h": 40},
    {"id": "shape-2", "type": "ellipse", "x": 100, "y": 64, "w": 48, "h": 40}
  ],
  "invert": false,
  "follow": false
}
```

- 不将UI四类直接替换成四个新数据枚举：图片继续`alpha`，对象继续`element`；原单图形数据在UI统一投影为“图形”，添加第二个时提升为集合。没有Legacy入口或独立兼容层。
- `49-mask-contract.normalizeShapes`是集合schema的唯一校验：version=1，1～64项，稳定且不重复的子项ID，只允许rect／ellipse／poly；每多边形最多4096点、总计16384点。拒绝未声明子项字段，防止引用、反相、独立跟随偷偷进入子项。
- `50-mask-resolver.clipPath`按一致绕向追加所有子路径，以nonzero规则形成合并。反向绘制多边形不会与矩形重叠后挖洞；椭圆显式开启子路径，不连接上一图形。
- 仍走原`applyStatic`一次临时遮罩，不按形状分配Canvas。反相在合并之后执行，跟随／geometryMatrix在整组路径绘制前应用。
- `EditorVNextMaskState`负责新增、复制、替换、删除和范围写入。选中图形通过`shapeId`定位；画布控制器不将子项数组位置作为身份。
- 资源的portable／translate／rebase／references／remapReferences扩展到collection；子项没有额外素材依赖，不在素材层复制一套坐标算法。
- 公共Player增加`masks.shapeUnion=1`。使用多图形的导出遇到旧Player明确拒绝；内联Runtime同步更新。

## 共用控件与前端交接

唯一入口仍为`classic-v4-inspector-controller.renderMaskFields`；多图形子区由同控制器内`maskShapeFields`生成。对象和场景只传scope／ownerId／effectId，不复制表单。

UI词汇：蒙版来源“图形／图片／场景对象”；新增“当前图形”“图形类型”“图形操作”；范围编辑仍为“编辑／完成”。既有Alpha素材选择、提取方式、显示来源、来源处理保持字段及写入适配器。

新增domain API：`editable(mask,shapeId)`、`replaceShape(scene,options,geometry)`、`addShape(scene,options,type,copyId)`、`removeShape(scene,options,id)`；`setBounds`支持`options.shapeId`，不传时缩放整个集合。后续新版Inspector应调用这些适配器，不复制当前HTML快照或直接拼接shapes数组。

选中shapeId是临时View状态，不进入工程。所有新增字段仍为No；不生成任何子图形轨、时序按钮或额外效果卡。编辑叠层只是轮廓编辑提示，不等同后续“预览蒙版”的真实灰度视图。

## 验收与边界

- `tests/v4-mask-shapes-contract.mjs`：版本／ID／预算校验、单图形提升、子项编辑、复制删除、整体范围、可移植变换；粒子集合明确拒绝。
- `tests/browser/v4-mask-shapes.mjs`：16组父组／跟随／反相／时间组合与独立Canvas路径参考Alpha完全一致；不相交区域与反向多边形重叠；32图形仍仅1次临时表面申请；素材入库／跨项目导入／工程往返；真实Inspector、父组下拖动与撤销；场景共用表单、正式HTML与旧Player拒绝。
- 既有完整来源像素／显隐／缓存／保存导出回归，以及44组父组仿射绿色框编辑通过；父组边界最大通道差仍为2。
- 新增`v4-gpu-scene-effect-masks`的多图形及反相夹具，验证CPU遮罩栅格上传后的WebGL合成，不声称几何蒙版本身变成GPU生成，也不等同所有正式GPU后端验收。
- 新合同及真实浏览器测试纳入根`verify-v4`入口。本批未跑全量verify-v4或Tauri；完整共享生命周期矩阵仍在U5。

本批检查表四个落点：合同/schema（49＋MaskState）→ 共用Inspector/绿色编辑器 → Runtime统一路径 → unit、真实像素／操作及交付回归。没有新增效果Registry项，因为这是蒙版领域数据，不是可启用的加样／采样效果。

后续：U3真实蒙版预览；U4粒子按出生时刻取样／灰度密度和显示范围；U5完整资源及宿主矩阵；U6整体收尾。
