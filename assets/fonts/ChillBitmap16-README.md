# Optional ASCII 16px font

Original: 寒蝉点阵体 16px / ChillBitmap 16px, Regular, version 1.000.

Author project: https://github.com/Warren2060/ChillBitmap

The author's current repository describes 16px but the downloadable Version 2.400 archive contains only 7px fonts. The actual 16px font was obtained unchanged from this font collection:

https://github.com/jaywcjlove/free-font/blob/main/docs/fonts/寒蝉字型/寒蝉点阵体_16px.ttf

Pinned Git blob: `92d559db391e9dafb1dddedf59c6bdabd1571229`

Original SHA-256: `9c699de0d24e482700fa0a08ce3abe58ef2ceaf6173323c77b767c72cd538512`

The original font's embedded copyright names Roman Czyborra, Paul Hardy, Qianqian Fang, Andrew Miller, Johnnie Weaver, David Corbett, Nils Moskopp, Rebecca Bettencourt, Ho-Seok Ee et al. Its embedded license states dual SIL OFL 1.1 and GNU GPL 2 or later with the GNU Font Embedding Exception. The author project's full statements are retained in `ChillBitmap16-LICENSE.md` and `ChillBitmap16-OFL.txt`; these font materials are not relicensed under the editor's MIT license.

`ChillBitmap16-default.js` contains a gzip/base64 transport of the **unchanged** 12,636,508-byte TTF. No font outlines, names, tables or character coverage were modified. The historical filename is retained; this wrapper is now loaded only when choosing the optional `chill-16` font, and supplies the whole character set. Default extensions instead use ChillBitmap7. Font rendering uses a private browser family alias, not a renamed font binary. Scene exports retain rasterized glyph masks, not the full font transport.

Reproduce the wrapper with `node scripts/build-ascii-default-font.mjs` after placing the pinned original font and the two author license files under `.local/ascii-font-vendor/`. Verify the committed wrapper without that cache using `node scripts/build-ascii-default-font.mjs --check`.
