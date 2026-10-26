# 受控图样生成器合同 v1

状态：2026-10-23完成B1首版；2026-10-24接入首个正式双色放射，见[B2报告](../architecture/DUAL_RAY_B2_DELIVERY_2026-10-24.md)。**不是外部JS安装器。**

## 与现有格式的关系

`tosampool-pattern-definition/v1`继续用于有限路径模板，不改旧格式含义。
`tosampool-pattern-generator/v1`是宿主已审阅实现的声明；工程数据不能携带可执行函数并自动注册。生成器只能接收路径与参数并返回绘制计划，属于图元图样，不是独立程序元素。

首版仅支持封闭载体rect／ellipse／poly，无外部依赖，输出被真实载体路径裁切。开放路径、资产引用、溢出边界、几何命中输出需要后续扩展合同，不伪装已支持。

## 四层落点

2026-10-24补充：图样归属以[附着修正](../architecture/PATH_GENERATOR_CORRECTION_2026-10-24.md)为准，不再采用旧B2的custom替换方案；参数呈现按[共用参数控件合同](PARAMETER_CONTROL_CONTRACT_V1.md)接入。下表为B1历史落点，不代表当前待办全部尚未实施。

| 层 | 本批实现 | B2仍须连接 |
| --- | --- | --- |
| Registry | Runtime `patternGenerators.validate/register/definition`，稳定ID＋版本＋implementation标识、重复拒绝 | 编辑器图样目录／项目定义解析／版本冲突与缺失保护 |
| Inspector | controls唯一覆盖所有参数；color-alpha把颜色和0–1透明度绑定为一项 | 使用现有颜色组件实际渲染，别名、渐进参数、对象轨时序接线 |
| Runtime | 接收实际路径、范围、已求值params、秒制time和显式seed；输出层与绘制指令 | 正式图元绘制入口、图样覆盖排序、对象效果与静态缓存失效 |
| 测试 | 非法声明、类型／时序、绑定重复、预算、冻结输入输出、Canvas裁切／圆弧／透明度／异常恢复 | 正式共享卡片、保存重开、导出内联一致、双色放射视觉与成本 |

## 声明字段

- `format/id/version/name/implementation`：implementation仅为版本标识，不是实现摘要或安全证明。发布器未来须把实现内容哈希纳入资源闭包；当前不能据此安装代码。
- `carriers`：rect、ellipse、poly的非空子集，调用方提供路径，不允许生成器自行把多边形替换成矩形。
- `parameters`：最多24项，number／color／boolean／select；显式No／Step／Linear，沿用已有parameterTiming能力门控。数值必须有有限min/max。布尔、选项及整数不能Linear。渐进when只能引用开关，不得循环。
- `controls`：field或color-alpha；每个参数恰好覆盖一次，颜色必须与0–1透明度合并。该声明不代表前端组件已经接入。
- `output: carrier-clipped-paint`；`dependencies: []`。
- `budget: {layers,commands}`：不超过256层／4096条指令，每实现还可设更小预算。

## 调用与输出

宿主`register(manifest, generate, {trust:'repository-reviewed'})`。**trust字符串不是权限隔离**，已有执行权的JS当然可以传入它。可信实现本身仍有全局访问、耗时或死循环风险；禁止把这个接口解释为沙箱或任意Agent代码自动发布许可。

`generate(id, version, {carrierType,path,bounds,params,time,seed})`复制并冻结输入，规范化参数，验证返回的`{layers}`。每层为`{color:'#rrggbb',alpha:0..1,commands}`；指令为：

- `['M',x,y]`、`['L',x,y]`
- `['A',cx,cy,r,startRadians,endRadians]`，顺时针Canvas arc
- `['Z']`

层为填充路径，按数组顺序覆盖；不自行设置对象混合方式。首版范围由载体裁切决定；不产生额外边界。计划不可变且以WeakSet标记，paint不接收未经本实例验证的伪造计划。

`paint(ctx, plan)`保存上下文、裁切、乘算调用方globalAlpha并恢复。不分配离屏画布、不读像素、不做实现哈希、无每帧序列化。生成和验证仍有有限数组分配，其成本必须在B2实测，不能以原预览的P95代替。

输出预算在可信函数返回后检查，**不限制函数执行时间或返回前的内存使用**。需要隔离任意代码时应另做Worker／宿主执行授权与取消，不用Node vm冒充安全隔离。

时间求值仍由既有对象轨完成；本层不创建第二套关键帧求值器，也不自动缓存动态计划。相同输入的确定性由实现负责，通过测试验证；随机性使用显式seed，不访问Math.random／Date来决定作品结果。首版不提供新的随机算法。

### B2补充

- 宿主可同时登记可信的`carrier(params,box,part)`构造函数；provider通过统一入口取得实际轮廓，不硬编码某个图样ID。
- `validateDefinition`允许名称／标签／默认值和版本修订，要求其他声明与已审阅实现语义一致，不把数据文件当代码加载器。`labels`可为select提供与options对应的显示名称。
- 首层可使用`{color,alpha,fillCarrier:true}`代替commands，复用单独受预算控制的载体路径。仅首层允许一次，不允许同时声明commands，避免大椭圆顶点重复展开造成误拒绝。
- `restorePlan`重新检查静态绘制快照的所有指令；颜色及Alpha仍为数据，快照不能执行代码。共享和工程资源沿用原SHA256闭包。
- 参数组件的实际接线、播放调度和首个资源示例已完成；本文件前述“B2仍须连接”表保留为首版落点记录，完成情况以B2报告为准。

## 验证入口

`tests/v4-pattern-generator-contract.mjs`及`tests/browser/v4-pattern-generator-contract.mjs`已加入根目录`scripts/verify-v4.mjs`。浏览器夹具使用真实Canvas，比较三时刻指令绘制与直接Canvas绘制的逐通道结果；不是双色放射发布验收。Runtime源同步生成分发与内联镜像。

B2首个接线已经完成，参见报告。继续遵守：不要借测试专用Scene Module将图样归类为程序元素；后续任意第三方实现的加载／隔离仍需单独设计。
