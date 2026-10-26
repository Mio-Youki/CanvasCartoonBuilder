# RC2-a：独立元素预设数据闭环

状态：首个数据层小批完成。没有新增素材面板或“收入库”按钮；不代表完整RC2或RC3完成。依据[RC1合同](V4_ELEMENT_MATERIAL_RC1_CONTRACT_2026-10-21.md)及D1三项确认：普通／程序元素先行、保留基础动态、不携带父组影响。

后续状态：下文保留RC2-a交付时点；图片／序列／文字及图样依赖现由[RC2-b增量合同](V4_ELEMENT_PRESET_DEPENDENCIES_RC2B_2026-10-21.md)补齐，外部对象来源仍待RC2-c。

## 已实现与明确限制

- 原生rect／ellipse／poly／line、普通矢量parts及无图片依赖的builtin／procedural可捕获为定义，再创建独立实例。
- 保存Scene中的基础值、实例程序参数、图元、基础anim、已有对象效果配置及pipeline；不读取播放头，不带timeline／sceneVariants／父组及编辑临时状态。
- 根坐标为0/0，保留自身宽高／比例／角度／pivot／Alpha；新实例位置由放置操作决定，默认按基础宽高居中，本批不新增自动缩放规则。图元仍使用自身局部坐标。根显隐和编辑锁不作为新素材的使用状态继承，实例默认为可见。
- 图片／文字／图样实现依赖属于RC2-b，蒙版和外部对象来源属于RC2-c。本批明确拒绝它们，不删除字段后继续入库。组／粒子仍按D1暂缓。纯内建、无外部来源的路径拓展配置可保留；未知效果、错误阶段及未知拓展拒绝。
- 捕获和导入程序定义不执行源码。实例化程序预设必须已经在当前工程显式信任并加载实现，且Manifest匹配；不借用另一个工程的作用域。

## 保存字段

Scene增加编辑器集合`elementPresets`，不放入位图`assets`，也不成为新Runtime对象type：

```json
{
  "elementPresets": {
    "my-element": {
      "format": "tosampool-element-preset/v1",
      "version": 1,
      "name": "可复用元素",
      "root": {
        "id": "root",
        "type": "rect",
        "x": 0, "y": 0, "w": 40, "h": 30,
        "fill": "#ee8844", "hidden": false
      }
    }
  }
}
```

集合key是定义身份，root.id只是定义内部的局部根。实例创建新的entity ID，`resourceBindings.element`记录定义来源，不构成实时联动。修改实例不修改定义；修改定义也不自动修改已经创建的实例。可见名称不作为全局实现身份。

每工程最多128个预设，每预设最多256个parts，纯JSON描述最多256KB。有限JSON及字段验证在写入前完成；缺依赖／未知类型／超预算失败无半成品。

统一资源包增加`kind:'element'`，payload为`{preset}`。程序根通过资源dependencies携带精确Module ID／版本与原源码；无依赖的几何预设不复制无关素材。旧Host不认识此类型时应明确拒绝。RC2-b前不允许带声明资产的Module进入元素预设。

项目包的资源索引包含元素定义，未使用预设也随工程保存；恢复校验定义及Module描述。网页交付移除`elementPresets`和实例来源标记，只保留实际实体与它们需要的实现。只有预设、没有程序实例时，交付不会携带未使用Module。

## 编辑器API及变更边界

`EditorV4ElementPresets`：

- `capture(scene, entityId, options?)`：只读返回基础定义，不修改Scene。
- `add(scene, entityId, {id?, name?}?)`：捕获后加入`scene.elementPresets`，冲突创建独立定义ID，不覆盖原定义。
- `instantiate(scene, presetId, {x?, y?}?)`：复制为普通v4实体；不复制源时序，不覆盖已有实例。
- `validate/validateScene/moduleRef`：资源包与工程保存共用校验／依赖入口。

这些是数据API，不自行创建工程历史。正式命令须经`SceneMutation.run`一次提交；异步复制资源仍沿用现有副本事务及revision检查。现有资源控制器的提交字段包含新集合，避免导入资源包后无意丢弃它；本批不增加卡片入口或UI双写。

## 四层落点

| 层 | 实际落点 |
| --- | --- |
| 数据／校验 | `editor/v4-element-presets.js`；`v4-resource-core.js`的element类型、闭包、冲突、索引 |
| UI／命令 | 正式HTML加载新模块；资源控制器提交集合；无新增用户操作入口，不改变复制粘贴保留时序的行为 |
| Runtime／交付 | Runtime不新增分支；`vnext-scene.js`校验编辑器集合，现有项目包经统一索引保存恢复；delivery builder剔除定义和来源元数据 |
| 验证 | `tests/v4-element-presets-contract.mjs`及`tests/browser/v4-element-presets.mjs`，接入根verify-v4 |

## 实际验收

合同验证雨量基础值88与Manifest默认60／时段值240的区别；基础bob及采样格保留，父组和sceneVariants去除；同一定义两个实例可独立改参数和图元，定义本身不受影响。包含同名定义冲突、Module内容冲突原子回滚、未信任拒绝实例化、范围拒绝、JSON／数量／体积预算。

项目与资源测试包括已使用／未使用预设保存重开、跨工程复制Module依赖、显式共享内存适配器往返、交付剔除未使用定义。存储复用既有IndexedDB实现，本批不重新宣称验证原生目录Vault或自动重开。

浏览器在正式HTML加载数据模块，通过实际SceneMutation验证撤销／重做；矢量与程序分别在0／0.5／1.25秒对比基础参考画面，PNG一致，程序88与默认60的画面不同。原对象不改，保存重开与两种独立HTML播放均正常。浏览器测试是无新UI入口的数据集成流程，不冒称用户可从按钮操作。

本机沙箱内Edge在加载页面前因进程管道退出；经授权在沙箱外启动本地Edge后完成上述验证。初轮浏览器夹具误用window访问词法全局变量，已修正，最终测试通过。R1资源、项目包、delivery builder、R4实例、Runtime smoke及SceneMutation定向回归通过。未运行完整verify-v4或Tauri打包。

## 下一批

RC2-b接入图片／序列／文字图像及图样实现的完整依赖，沿用三套身份映射；RC2-c再处理蒙版／排布／端点等外部来源和坐标角色。RC3前不增加新的素材面板。RC1旧审计脚本已移除“element类型尚不存在”的断言，保留既有资源边界审计；本文件两项正向测试才是RC2-a门禁。
