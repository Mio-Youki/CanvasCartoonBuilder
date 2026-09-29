# v4 Parts 迁移合同

> 状态：Phase 7 实施基线。Runtime、Parts State、树/Inspector、逐层命中、单图元青框变换、同父图元多选、两层旋转/非等比父组变换、组合 parts 保存重开、多帧图片 + parts 绘制顺序、Paint 复合面板与文字字体连接已进入验收；`npm run verify:phase7` 汇总门禁已通过，迁移矩阵仍等待新桌面进程中的字体授权边界验收后再升级。

## 1. 为什么不能用 Group 替代 Parts

Legacy 的一个元素可以同时包含图片或程序主体与多个图元，并把透明度、动画、蒙版、加样和采样作用于最终组合结果。v4 `group` 只是成员的变换父级，不建立合成容器；把每个 part 改成 group 子实体会改变效果范围、Alpha、命中层级和性能，也会让原本一个对象的结构膨胀成多个对象。

因此：

- `group` 继续只表达用户组织与父级变换；
- `parts` 继续表达一个对象内部的轻量图元；
- 不以“多个单图形实体 + group”冒充 Legacy parts 等价迁移。

## 2. v4 数据模型

普通矩形、椭圆、直线、多边形仍可作为单一实体存在，保持最简单的 Agent 与用户创建路径。需要第二个图元时，编辑器把对象提升为组合内容，而不是拆成多个顶层实体。

```js
{
  id: 'sign',
  type: 'vector',
  x: 80, y: 40, w: 96, h: 48,
  parts: [
    { id:'part-bg', type:'rect', x:0, y:0, w:96, h:48, radius:6, fill:'#f5d76e' },
    { id:'part-line', type:'line', x:8, y:32, x2:88, y2:32, stroke:'#291f1a', strokeWidth:2 }
  ]
}
```

规则：

1. `part.id` 在父对象内稳定且唯一；名称变化和数组调序不得更换 id。
2. part 坐标使用父对象局部像素，原点为父对象左上角；不再同时维护画布绝对坐标。
3. `parts` 按数组顺序绘制，后项覆盖前项；Inspector 的视觉顺序必须按 Legacy 基线呈现，但写回仍以此数组为唯一真值源。
4. 面形支持 `fill / fillAlpha / fillPattern / stroke / strokeAlpha / strokeWidth`；矩形额外支持 `radius`。
5. part 可保存 `rot / scaleX / scaleY / alpha / blend / hidden / locked / anim`。part 不拥有第二套蒙版、加样或采样管线。
6. 图片实体可保留 `parts` 作为主体图片之后的内部覆盖层；后续 builtin/program 迁移也复用同一覆盖层，不再创造另一种附着图元格式。

Paint 把路径描线、纯色填充和纹理填充保存为三个可独立启停的字段组；`fillAlpha`、`strokeAlpha` 与 `fillPattern.opacity` 不得折算到 part 整体 `alpha`。`fillPattern` 承诺 `lines / dots / checker`，线纹支持 1–3 层叠加；纹理以画布坐标生成、由 part 路径裁剪，并按画布尺寸和纹理参数缓存，对象进入效果胶囊后仍必须维持同一画布相位。单图形实体与 part 共用 Legacy 的复合取色器、透明度和纹理预览弹层，实时预览由 v4 Scene Mutation 手势提交，不能再维护第二套简化 Paint 控件。

## 3. 合成与效果顺序

```text
对象主体（图片 / builtin / 单图形）
  → 内部 parts（数组顺序）
  → 对象蒙版
  → decorate
  → sample
  → 场景
```

对象级透明度、混合方式、父组变换与时序覆盖作用于主体 + parts 的整体。只有 part 自身的填充、描线、局部 Alpha、混合和声明式 `anim` 在组合之前求值。

没有对象效果时，Runtime 应直接在主 Canvas 内循环绘制主体与 parts；只有既有对象效果要求时才进入视觉胶囊，不能因为存在 parts 就强制创建离屏面。

## 4. 编辑状态

选择层级固定为：

```text
场景 → 组 → 对象 → part
```

- 第一次点击选择对象；进入编辑态后点击命中 part。
- 结构树展开对象后显示 part 行；part 不是顶层实体，不参与场景 z 排序。
- 选中 part 后，Canvas、结构树、Inspector 和 Delete/Esc 必须同步。
- Ctrl/Cmd 点击只可在同一父对象内追加/移除 part；Ctrl/Cmd+A 在 part 上下文选择该父对象内所有未隐藏、未锁定 part。Esc 先退回父对象，再退出对象选择。
- 多 part 使用一个联合青框；移动、缩放、旋转和镜像必须作用于选择集，但不得把它们提升为 group 或永久改变父对象结构。
- part 或同父 part 选择集的拖动、缩放、旋转、镜像及调序均只生成一条 Scene Mutation。
- 在单图形实体上“继续绘制”时，编辑器原子地把原图形变为第一 part，再追加新 part；固定时间像素必须不变。
- 图片添加 part 不转换图片主体，仍保持素材引用、帧播放与图片尺寸语义。

## 5. 时序边界

- 对象 TRS、Alpha 与对象效果继续使用对象轨道。
- part 的声明式动画继续是轻量程序运动，不自动生成关键帧轨道。
- part 独立时序若以后需要，轨道键必须包含稳定 `part.id`；Phase 7 不因迁移 parts 顺带扩张时间轴格式。

## 6. 兼容与验收门槛

实现顺序：

1. Runtime 绘制纯 `vector.parts` 和 `image.parts`，固定时间像素测试。
2. Parts State：提升单图形、追加、删除、调序、包围盒归一化。
3. 结构树展开/选择同步与 Inspector 几何/外观字段。
4. Canvas part 命中和黄框→蓝框编辑手势。
5. Legacy 样例迁移与真实 Edge 连续操作验收。
6. Paint 三行、独立 Alpha、纹理缓存和直接/胶囊路径固定时间验收。

必须验证：

- 单图形提升前后像素一致；
- 图片多帧播放不因 parts 改变帧选择；
- 对象蒙版/加样/采样覆盖主体和全部 parts；
- part 调序与结构树显示一致；
- 保存重开保留 part id、顺序、样式与动画；
- 无对象效果的 parts 不产生额外全尺寸离屏面。

在以上门槛通过前，`parts-drawing` 只能保持 `schema-ready`，不能升级为 `browser-parity` 或 `complete`。
