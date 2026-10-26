# ASCII 默认扩展字体：寒蝉7px

来源：[官方 ChillBitmap](https://github.com/Warren2060/ChillBitmap) 的 Version 2.400.zip，文件 `ChillBitmap7x.woff2`。

- 原文件 886,012 字节，SHA256 `155b5448b0378b8ea3846143d85ee0492b0cdc8e33c9cf18740636cc0373c186`。
- 分发 JS 只做 gzip/base64 传输，字体文件未修改；内部 FontFace 别名不修改字体。
- 使用声明见同目录 `ChillBitmap7-OFL.txt` 和 `ChillBitmap7-LICENSE.md`；两份均保留官方原文。
- 7px 指点阵设计；字体 UPEM=2048、ascent=1536、descent=-512。以8px em绘制到8×8格，基线6，字符advance居中到整像素。轮廓具有小数边缘，最终Alpha以128二值化，避免浏览器抗锯齿灰边。没有7→8缩放或逐字紧框撑满。
- 原内置符号不使用此字体重绘；仅扩展字符按需载入。显式选择16px时另载入16px资源并整套重绘。
- 扩展以黑色墨迹烘焙后仅保留Alpha，避免Chromium对白色小字的对比增强把「界」等字符的内部留白填实。最终显示颜色仍由ASCII字符颜色决定。
- 播放工程／导出只需烘焙字形，不携带整套字体。`scripts/build-ascii-default-font.mjs --check` 校验原始字体哈希。
