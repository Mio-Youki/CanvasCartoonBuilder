# 绘制型图样归属修正：2026-10-24

本批替代B2报告中的“custom图元即正式图样”的结论。用户指出的图样共存、子条目、显示原图元、项目拖绘和统一时序，是验收前提，不是后续美化。

## 根因与正确结构

旧实现把生成器声明直接接入custom recipe，因此绘制／资源包／单参数轨可以各自通过测试，但类型已被替换，extensions被删除，绕过了现有附着图样链路。新结构保留rect／ellipse／poly及其外观，将图样保存在`part.extensions[稳定ID]`，成员和覆盖顺序共用`extensions.attached`。

共享和项目卡片使用原有`mode: path`预设；参数是唯一可覆盖的预设剪切板。Runtime的`pathGenerators`接收载体的真实路径与时间，不再把载体下拉或bounding box当作正式图元类型。`显示原图元`、图样启停／移除、树下子条目和覆盖顺序均复用已有机制。未把生成器自动加到自带图样列表。

## 时序归位

新附着图样不再渲染逐参数时钟。采用Inspector顶部既有“时序”入口，写入所属对象轨；底层继续声明No／Step／Linear。图元ID与图样ID都通过稳定ID路径定位；`extensionsById.<编码ID>`避免图样ID中的点被误当成属性路径分隔符。

数值／颜色可按声明Linear；整数、开关及选择值为Step；载体是当前图元自身，正式参数区不再提供载体切换，No字段不会进入覆层。颜色与透明度仍共用现有颜色组件，批量修改共用历史事务。启用时序后改值、清除与Ctrl+Z沿用当前对象轨，不创建独立图样时间轴。

## 旧错误实验产物的处理

- 旧的生成器预设在取用／导入时规整为path预设，不再新建custom副本，因此项目卡片重复拖绘不会再降级为缓存。
- 对已经存在的错误custom实例，只有用户主动重新应用对应图样时才恢复载体并附着；不会在载入工程时偷偷改写全部对象。保留ID、变换和尺寸，能恢复记录下来的载体形状。
- 旧实现已经删掉的原填充／纹理，以及未保留下来的自由多边形顶点，无法凭空恢复；重新应用只使用仍记录的载体信息，不伪称已恢复丢失的原外观。需要原外观时可在成样中重新配置。
- 审阅确认后，如果共享库中的同ID／版本确实是旧错误的非path生成器包，可按当前revision更新同一条发布记录，不复制第二张卡、不清空共享库。普通不同内容冲突仍拒绝自动覆盖。修复仅在用户确认／取用动作中发生，不把测试库的数据写到用户库。

这是修复本次错误实验格式，不是引入旧Legacy JS兼容层。HTTP与file的IndexedDB仍隔离；跨宿主持久化和GPU后端继续另案。

## Runtime与前端同步落点

| 部分 | 接入点 |
| --- | --- |
| 参数与渲染 | 新增`runtime-src/vnext/59m-path-generators.js`，复用pathExtensions.paint顺序，不创建新的实体种类 |
| 归一化／性能 | Runtime载入时归一化已附着生成器声明；路径缓存键引用声明身份，不逐帧序列化完整参数定义 |
| 项目／共享资源 | `v4-path-pattern-presets.js`、`v4-resource-core.js`；声明随path预设携带，不要求custom geometrySnapshot |
| Inspector | `classic-v4-path-extension-control.js`新增附着生成器区；沿用`section(id)`、颜色组件和`write`事务，输入键为`generator|ID|参数` |
| 时序 | `classic-v4-inspector-controller.js`顶部既有入口；`20-timeline-evaluator.js`、`21-parameter-timing.js`负责稳定路径及能力门控 |
| 图样库／结构树 | 复用registry.attached、reorder、remove与卡片prepare/use；不再有独立“替换为生成图元”分支 |
| 预览与发布 | 审阅绘制也调用pathGenerators；正式包由release builder生成path资源，原模板格式继续可用 |

后续前端副本不要恢复`provider.*`逐参数时钟作为新图样入口；不要把新控件再次放入custom分支。carrier参数只用于提案预览和新建默认载体，不是创建后更换类型的UI。

## 性能指标同步修正

舞台改为显示“目标12fps”和“渲染P95”，取编辑器实际render采样；悬停说明它含准备和选择框开销。原frameP95移至悬停，明确为调度回调间隔，非绘制耗时、非实际输出帧率。没有偷偷提高帧率或启用GPU，也没有把渲染P95叫作纯Runtime内核耗时。

## 验收

- `tests/v4-path-generator-contract.mjs`：载体保留、多图样共存、排序、参数覆写、Step／Linear／No、禁用、项目与共享往返、旧错误资源规整与同条发布修复。
- `tests/browser/v4-path-generator.mjs`：真实项目文件导入、选择载体拖绘、树子条目定位、共存拖动排序及像素改变、顶部时序写入与Ctrl+Z、项目卡片再次绘制椭圆无缓存锁定；24组正式附着渲染与冻结旧绘制算法逐通道一致。
- `tests/browser/v4-dual-ray-delivery.mjs`：确认→path包→隔离共享库→主编辑器→应用后椭圆类型不变，颜色／动态有效。
- 原路径预设、登记、Runtime smoke、参数时序和宿主回归继续运行。新验收已替换verify-v4中旧的“custom路径通过即正式接入”条目。

未声称：完整全量测试、Tauri验收、跨来源共享库统一、GPU采样性能修复、任意第三方JS热安装。此前B2的CPU快速路径数据只证明绘制，不再作为产品结构验收依据。
