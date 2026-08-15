# LaTeX → 网页札记构建工具

这套工具不会要求你维护第二份正文：LaTeX 仍是唯一内容源，网页、交换图和搜索索引都是生成物。

## 环境

- Python 3.10+
- Pandoc 3+
- pdfLaTeX（含 `standalone`、`tikz-cd`）
- Poppler 的 `pdftocairo`
- Node.js / npm（只用于取得本地 KaTeX 资源）

## 推荐：在 VSCode 里一键同步

把 `build-tools/` 放在网站仓库里。第一次使用时：

1. 在 `build-tools/` 运行 `npm install`；
2. 复制 `sync-config.example.json` 为 `sync-config.json`，填写 LaTeX 工程和网站仓库的绝对路径；
3. 把 `vscode-tasks.example.json` 的内容复制到 LaTeX 工程的 `.vscode/tasks.json`，并把其中的脚本路径改成真实路径。

如果网站仓库位于 `D:/table/work/thread478.github.io`，任务中的脚本路径应写成：

```text
D:/table/work/thread478.github.io/build-tools/sync_notes.py
```

`sync-config.json` 可以继续使用你本机的 Windows 绝对路径；该文件已被 `.gitignore` 排除，不会提交到公开仓库。

之后仍然在 VSCode 中编辑原来的 `.tex` 文件。需要更新网站时按 `Ctrl+Shift+B`（macOS 为 `⇧⌘B`），选择“更新代数几何网页札记”。任务会直接重建网站仓库中的 `notes/ag/`。预览确认后，在网站仓库正常提交并推送；如果网站已配置 Pages / Vercel 等自动部署，推送后就会上线。

也可以在 `build-tools/` 直接运行：

```bash
npm run sync
```

不建议每次保存都触发整站构建；写完一段后手动运行任务更稳定。交换图按内容哈希缓存，没有修改的图不会重复编译。

## 直接构建

1. 把原 LaTeX 工程放到 `source/algebraic_geometry/`，其中应有 `main.tex`、`structure.tex`、`bibliography.bib` 和 `chapters/`。
2. 在本目录运行：

   ```bash
   npm install
   npm run build
   ```

3. 生成结果位于 `public/notes/ag/`，把这个文件夹覆盖到网站的 `notes/ag/`。

也可以不复制 LaTeX 工程，直接指定绝对路径：

```bash
THREAD478_NOTES_SOURCE=/absolute/path/to/algebraic_geometry \
THREAD478_NOTES_OUTPUT=/absolute/path/to/your-site/notes/ag \
npm run build
```

## 章节发布规则

- 正文仍在原来的章节 `.tex` 文件里写；
- `tools/web-main.tex` 决定哪些章节进入网页正文；
- `tools/notes-manifest.json` 决定总目录中的发布状态；`planned` 可以继续留作自己的管理信息，但不会显示在网站上；
- 运行 `npm run build` 后，旧网页目录会被完整重建；
- 交换图按内容哈希缓存，未修改的图不会重复编译。

要让一个计划中章节上线：先完成该 `.tex` 文件，再把它加入 `tools/web-main.tex`，并在 `tools/notes-manifest.json` 把状态从 `planned` 改为 `published`。

构建器会从 Pandoc 目录链接中移除 `#小节锚点` 后再匹配页面文件。任一 `published` 章节没有生成有效链接时，构建会失败并保留网站上一次成功的版本，不再产生“显示章数但目录为空”的半成品。

构建器会在输出前移除公式中的 `\\label{...}`，避免 KaTeX 把标签命令显示成红色错误文字；若仍有标签泄出，校验会直接让构建失败。

## 兼容说明

普通 `tikzcd` 与 Quiver 的曲线箭头会生成 SVG。原稿中两张 Kan extension 图使用了 Quiver 专属的 `between` 二胞腔辅助箭头；网页构建保留底层函子图，省略这两条专属覆盖箭头，相关自然变换仍由相邻正文完整说明。

## 杂文集与 Hartshorne 题解

两个独立书架位于网站仓库的 `essays/` 与 `hartshorne/`。各自的 `manifest.json` 是公开索引；页面只显示同时具有 `"status": "published"` 和 `"href"` 的条目。未完成内容可以留在自己的写作目录，或以 `planned` 状态登记，都不会显示灰色占位。

条目格式示例：

```json
{
  "title": "文章标题",
  "topic": "Linear algebra",
  "date": "2026-08-15",
  "summary": "一两句话说明本文解决什么问题。",
  "tags": ["定理", "应用"],
  "href": "articles/example.html",
  "status": "published"
}
```
