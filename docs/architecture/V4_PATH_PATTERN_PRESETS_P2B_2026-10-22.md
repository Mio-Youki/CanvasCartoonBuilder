# RC5-P2b：路径图样预设与私有来源闭包

2026-10-22。数据／取用批次完成；不是P2c项目／共享卡片已经完成，也不是P3排序或P5新算法插件完成。

## 格式

复用`scene.patternResources[id]`与kind=pattern资源记录，不新增库。新增路径预设分支：

```json
{
  "mode": "path",
  "name": "沿线排布",
  "engineId": "elements",
  "engineVersion": 1,
  "carrier": "line",
  "params": { "count": 7, "scale": 1 }
}
```

- 五个已登记引擎：ticks、nested、elements、corner-arrows、brackets；版本精确为1。载体为现有rect／ellipse／regular／free／line／stroke登记，仍按实际支持过滤。字段／身份／载体／预算校验集中在`EditorV4PathPatternPresets`。
- 参数使用既有Runtime归一化，不另设面板参数。普通路径保持原几何类型并写入extensions，**不变成custom**。旧custom本体预设仍走原分支，不强制改写或丢失参数。
- 元素排布可选`source`，是既有元素预设完整闭包，不是旧场景sourceId或共享实时链接。支持普通／程序元素及组，禁止粒子及含粒子的来源。`params.sourceId`不得携带外部身份。
- `source`包含必要后代／引用来源及基础动态；捕获复用元素素材、统一蒙版与来源图适配，舍弃时序与外部父组影响。内部来源不创建额外元素素材卡。
- 单路径预设上限512KB，嵌入元素仍遵循原256KB及来源／子元素预算。现有Runtime的实例数、精灵尺寸、缓存预算不改变。

## 操作与原子边界

- `fromPart(scene,part,id,{ownerId})`只读捕获参数和来源；`EditorV4Resources.addPattern`加入项目；收集、导入、共享继续使用原资源包hash、依赖闭包、版本与冲突规则。
- source中的图片／Module进入pattern记录的dependencies；图片冲突按实际映射重写source内部引用；Module同名不同实现依旧拒绝，不静默改源码。缺依赖、循环或不支持来源明确失败。
- 导入只增加定义与必要依赖，不创建Canvas对象。取用时为source根及后代／引用生成新身份，标为仅供引用；不写入元素素材卡，不保留临时模板定义。每次新建独立，不影响其他实例。
- 应用到已有图元，已经添加时默认不重置参数或再建来源；明确replace由内部调用方承担语义，不提供用户新开关。
- 绘制configure从事务外移入changes.run。Esc／未完成绘制不分配私有来源；完整绘制与来源一次提交、一次撤销／重做。Module准备在绘制前完成，失败不进入半成品状态。
- 导入程序依赖使用已有确认边界；接受只授权。beginPreset首次使用时loadAuthorized，后续不重复询问。未授权／版本或依赖失败，不插入私有来源，不执行陌生实现。

## Runtime与交付

没有新增绘制算法。继续复用路径图样和对象来源共享精灵；来源效果不是每个排布实例单独计算。路径预设是源声明，不作为custom轮廓快照烘焙；Runtime快照准备跳过mode=path，其实例仍按既有路径绘制。正式Runtime与导出内联镜像已重新生成并通过同步检查。

元素入库可继续捕获图元、排布及其来源。但“从元素导入后自动在项目图样页生成可取用卡片”属于P4完整交付，不因内部引用已可保存而提前宣称完成。移除图样／宿主时私有来源的引用清理也需在后续实例生命周期中验收；本批验证的是失败／取消不遗留与一次撤销，不声称已完成垃圾回收。

## 验收

- `tests/v4-path-pattern-presets-contract.mjs`：五项原几何类型、载体／版本、只读捕获、图片／组闭包、同名图片变体、独立来源、幂等、工程严格重开、共享往返、缺依赖／自引用／粒子拒绝、程序依赖与未授权回滚。
- `tests/browser/v4-path-pattern-presets.mjs`：当前管理入口真实绘制直线载体；组及PNG来源、动态继承、7个实例仅1份精灵；Esc、单次撤销／重做、保存重开。程序来源的拒绝零写入、接受不执行、首次使用加载及同scope单次执行。
- 原`v4-path-instances`更新为添加式入口，来源样本编辑、蒙版／效果、组、扩框／命中和工程／HTML回归通过；原图样目录、素材依赖、资源／共享、路径算法、Runtime smoke通过。
- 本批无新面板、视觉风格或新参数，没有额外视觉评分；未跑全量verify-v4、Tauri或长时性能基准，不以精灵计数冒称整帧提速。

## 可手动检查的样例

- [工程](../../tests/artifacts/path-pattern-presets/project.tosampool.json)：直接打开，含沿线排布与私有组／图片来源。
- [图样资源包](../../tests/artifacts/path-pattern-presets/line-stamps.tosampool-resource.json)：P2c后从图样页顶部导入，选中项目卡右下新建，选择直线再拖绘载体；旧文字管理列表已移除。

下一步P2c：统一素材式卡片、项目／共享、自带／我的、导入后选中项目、发布／更新／移除与适配应用；接管后移除旧管理列表，不再建立平行UI。
