# 线，从来 · static site refresh

这是可直接用于 GitHub Pages 的静态站版本，不需要 Node、构建工具或数据库。

## 覆盖方式

1. 先备份现有仓库。
2. 将补丁包中的文件按原目录覆盖到仓库根目录。
3. 保留仓库中已有的 `image/`、`pdf/`、`inter_th/*.pdf` 与 `favicon.ico`。
4. 本地从仓库根目录运行一个静态服务器后检查链接；不要直接双击 PDF 阅读页测试。

## 新增文件

- `assets/css/site.css`：全站视觉、响应式布局、深色模式。
- `assets/js/site.js`：主题切换、移动菜单、图片灯箱。
- `errata.html`：数学笔记勘误与修订记录。
- `CHANGELOG.md`：本次结构和内容调整说明。

## 维护约定

- 数学材料使用“草稿 / 待校对 / 已校订”状态，不再使用“工作”暗示原创研究。
- 发现数学问题时，先写入 `errata.html`，再回写 LaTeX 或原始笔记并重新导出 PDF。
- 音乐页只保留聆听记录，不再引用仓库中的完整音频文件；确认不再需要后，可自行删除 `music/` 目录。
- 全站不依赖 Tailwind CDN、Google Fonts、Font Awesome、DiceBear 或远程背景图。
