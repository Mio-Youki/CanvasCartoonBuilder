# RC2-c2a：元素蒙版、排布与端点的对象来源闭包

后续已完成[c2b父组蒙版坐标](V4_ELEMENT_PARENT_MASK_SPACE_RC2C2B_2026-10-21.md)：下文父组限制是c2a当时范围，由共享坐标换基补齐；组／粒子根和来源仍暂缓。

状态：首批普通／程序来源的数据闭环完成；不是完整RC2结案。引用组、粒子或带父级的来源仍遵循D1拒绝。根对象带父组且有蒙版时，仍待c2b完成一般坐标转换，不将父组影响偷偷带入素材。无新增素材卡或来源编辑面板。

## 本批交付

元素蒙版、`extensions.elements.sourceId`与`pathEndpoints.sourceId`共用`editor/v4-element-references.js`。图形蒙版的类型、通道与引用适配继续只调用`EditorVNextMaskState`；本批不添加新的亮度遮罩或绘制算法。

- 递归读取基础对象引用，包含关闭配置里仍保留的来源；同一个来源被多处引用只存一次。
- 预设保留一个可见根和最多32个内部来源，256KB整体数据预算不变。各节点均须通过普通／程序元素校验，保留自身基础动态，舍去全局时序、sceneVariants和编辑状态。
- 根位置归零，所有内部来源的位置、静态蒙版及其跟随锚点使用相同平移增量。图元仍保留对象局部坐标；绝不递归平移所有名为x/y的参数。
- 缺失来源、循环／自引、未知类型、组／粒子、带父级的来源、超预算及闭包外多余对象在提交前明确失败，不带整个Scene逃避分析。
- 所有节点的位图／文字图集、图样实现及Module声明素材复用RC2-b资源闭包。对象ID、素材ID和实现身份分开重连，不因原工程中对象与图片都叫stamp而串线。
- 每次放置整条来源链都分配新对象身份；实例A来源的参数修改不会影响B或预设。任何节点里的程序都必须在目标工程显式信任／加载，不能只检查可见根是否为程序。

## 数据增量

沿用`tosampool-element-preset/v1`，增加可选`sources`数组；没有引用的旧预设仍不写该字段。

```json
{
  "format": "tosampool-element-preset/v1",
  "version": 1,
  "name": "带标记的路径",
  "root": {
    "id": "root", "type": "line", "x": 0, "y": 0, "w": 60, "h": 20,
    "pathEndpoints": { "enabled": true, "type": "object", "sourceId": "source-1", "end": true }
  },
  "sources": [
    { "id": "source-1", "type": "ellipse", "x": 4, "y": 4, "w": 8, "h": 8, "fill": "#ff8800" }
  ]
}
```

定义身份只在预设内部有效。放置后根和来源仍是现有普通实体，根的`resourceBindings.sources`记录本次新建的内部来源身份，供后续编辑器生命周期使用；它与来源的原对象ID、图片assetId都不同。交付剔除resourceBindings，保留运行必须的引用和来源角色。

## 为什么不能直接隐藏来源

排布精灵读取来源的可见性；设置`hidden:true`会连精灵一起消失。新建的内部来源使用`referenceSourceOnly:true`：

- Runtime主场景遍历跳过其独立绘制，但蒙版／排布／端点仍可读取内容；来源原有hidden状态仍保留，不能强制把本来隐藏的来源显示出来。
- 普通结构树、框选候选及Canvas顶层点选不把它当作额外图层；本批不创建来源编辑入口，后续RC3须给出明确编辑方式，而不是让来源浮在作品上。
- 该角色随工程和网页交付保存，不能放在会被交付剥离的来源元数据中。
- 正式HTML／runtime.js复用旧公共Player时先检查renderer.referenceSources能力；不支持则要求更新Player，不以额外可见对象冒充正确播放。

本批不提前改变删除、普通剪贴板、素材卡共享发布等生命周期入口。用户可达的完整素材流程仍待RC3／RC4：届时必须依据根的实际来源闭包处理复制、删除、重复发布和来源编辑，不能只删除根或复制root字段。当前没有新增素材入库UI，不能把API验证当作这些入口已验收。

## 性能与四层落点

闭包遍历、校验和新ID分配发生在捕获／导入／放置，不进入每帧采样。Runtime只在原主遍历增加角色判断；引用渲染继续复用原frame-scoped精灵缓存。浏览器实测同一来源的多次排布／端点共用一次pathSpriteBuilds，不按每个摆放位置创建胶囊。未重新跑S/M/L长时性能矩阵或GPU基准。

| 层 | 实际落点 |
| --- | --- |
| 数据／合同 | `v4-element-references.js`typed引用、闭包、循环／预算和对象重连；`v4-element-presets.js`节点校验、资源汇总、独立放置 |
| UI／命令 | HTML加载新引用模块；View／CanvasHit识别内部来源角色，仍无新素材面板。SceneMutation整条链单次提交 |
| Runtime／交付 | `runtime-src/vnext/80-scene-renderer.js`跳过直接绘制，保留引用渲染；正式分发及inline镜像重建；delivery builder检查旧Player能力 |
| 测试 | `tests/v4-element-reference-closure-contract.mjs`、`tests/browser/v4-element-reference-closure.mjs`，接入verify-v4 |

## 实际验收及后续

合同验证原对象不变、三入口去重、休眠引用、对象／素材同名冲突、新实例来源独立、程序来源的依赖和授信、工程重开／交付保留角色；缺失／循环／非法类型及32个来源预算失败无半次写入。RC2-a／c1中过期的“不支持外部引用”断言退役，保留缺失引用和不支持类型的拒绝测试。

真实Edge覆盖对象蒙版、纯排布、纯端点、共享来源组合和程序来源五例。独立手动平移的参考场景与跨工程新实例在0／0.5／1.25秒非空像素一致；来源不浮层、不抢Canvas点选、不占普通树行；完整来源链撤销／重做正确，工程重开和正式HTML首帧一致。旧Player缺能力时明确报错。浏览器启动需经批准在沙箱外运行；不宣称完整verify-v4或Tauri验收。

定向回归通过：RC2-a／b／c1合同，RC2-b及c1真实浏览器，R1资源、工程包、交付、统一蒙版、SceneMutation、Runtime smoke、排布和端点合同。Runtime分发与inline镜像一致性、语法及本批跟踪文件的差异空白检查通过。

下一批c2b仅处理根对象从父组脱离时的蒙版坐标合同。非平移父变换不能靠减去x/y完成，需在共享MaskState几何／基准及Runtime／编辑投影之间同步验证；组／粒子作为素材根或来源仍不自动扩围。之后再核对RC2结案门槛，并进入RC3待讨论的面板入口。
