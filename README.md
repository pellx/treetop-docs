# 树梢文档（必修1《分子与细胞》）

纯静态站点：HTML + CSS + 原生 JS，无任何外部网络请求。

## 如何打开

- **连播模式（推荐）**：双击 `index.html`。左侧目录、搜索、播放器在外壳中，正文在中间 iframe 中切换，翻页不打断语音，一期播完自动续播下一期。
- **单页模式**：双击 `必修1/bx1-01.html` 等任一页面，页面自带目录与播放器，只播放本期。
- **本地服务器**：在本目录执行 `python3 -m http.server 8000`，浏览器访问 `http://localhost:8000/`（手机可在同一局域网访问）。
- 深链：`index.html#/bx1-01/p3`（第 3 个考点）、`index.html#/bx1-01/co3`（某句旁白）、`index.html#/bx1-ch2`（第 2 章）。

## 键盘快捷键

| 按键 | 功能 |
|---|---|
| 空格 | 播放 / 暂停当前朗读（输入框内不拦截，且不再滚动页面） |
| 小键盘 4 / 6 | 上一句 / 下一句；连播模式跨期继续，单页模式只在本期内切换 |
| ← / → | 上一句 / 下一句（笔记本备选） |
| Ctrl / ⌘ + K | 聚焦搜索框 |

## 目录结构

```
index.html            总索引 + 跨页连播外壳
使用方法.html          使用说明
必修1/bx1-XX.html      25 期独立页面
assets/css/site.css    样式（@font-face 引用 assets/fonts/NotoSansSC.ttf）
assets/js/app.js       交互：侧栏、搜索、播放器、外壳路由与 postMessage 通信
assets/js/site-data.js 册/章/节结构（var SITE）
assets/js/playlist.js  播放清单（var PLAYLIST：期号、考点序号、行 id、音频路径、秒数）
assets/js/search-data.js 搜索索引（var SEARCH_DATA）
assets/audio/BX1-XX/   每句旁白的 mp3
assets/img/BX1-XX/     封面与正文图片
assets/fonts/          NotoSansSC 字体
assets/img/site/       站点图标（品牌头像、favicon、apple-touch-icon）
```

## 品牌与主题

- 站名「树梢文档」，左上角图标由 `~/Desktop/biology-docs-build/site-icon.jpg` 生成：运行 `python3 scripts/make_icons.py` 重新裁切缩放到 `static/img/`，`build.py` 再复制到 `assets/img/site/`。
- 主题色（低饱和绿）与全部颜色都集中定义在 `assets/css/site.css` 顶部的 `:root` 变量中；`@media (prefers-color-scheme: dark)` 里是深色模式的同名变量，页面跟随系统浅色/深色设置（外壳与 iframe 内的页面一致）。规则里不写死颜色，只引用变量。
- 正文文字类强调色用 `--accent-text`（浅色 `#2F6F4A`、深色 `#9FD3B0`），`--accent #74B58A` 只用于填充、边线和进度条，以保证对比度 ≥ 4.5:1。检查：`python3 scripts/contrast.py`（token 两套共 92 组）与 `scripts/selftest.py`（渲染后逐元素审计）。

## 内容来源与扩写原则

- 全部讲义只依据每期源目录中的三类材料：`narration.json`（旁白）、`episode.json`（考点名、易错速查判断题及解析、图片来源）、`out/简介.txt`（仅 BX1-01 存在）。不引入材料之外的事实、数据、年份、人名。
- 旁白是骨架：每个考点的讲义保持旁白的术语与逻辑顺序，把旁白的并列信息整理成段落、列表和对比表格，`{词|red}` 高亮转为页面中的重点标记，化学式、离子和同位素写成上下标。
- 每个考点固定三类提示：高考怎么考、易错点、解题方法。旁白里有“考法/易错/解题方法”句的，原句归入对应提示；没有的，只用该期易错速查判断题的说法或对旁白内容的归纳补足。
- 每个讲义段落绑定其对应的旁白行（`blocks[].lines`），点击段落旁的 ▶ 从该句开始播放，播放时对应段落高亮；“视频原话”折叠块逐句列出旁白原文（去掉高亮标记）。
- 构建时 `build.py` 自动校验扩写稿：考点标题与 `episode.json` 一致、本考点每句旁白都被引用、段落数 2–5、三类提示齐全、正文中出现的数字必须能在源材料中找到（含汉字数字等价）。结果见 `~/Desktop/biology-docs-build/report/validation.md`。

## 如何新增其他册

站点由 `~/Desktop/biology-docs-build/build.py` 生成，请勿手改 HTML。

1. 准备与必修1 相同结构的源目录：`list.md`（总览表 + `## 第N章` / `### 编号　节号 标题（N 个考点）`）与 `工程/<前缀>-XX/{src,public,out}`。
2. 在 `build.py` 顶部的 `BOOKS` 列表追加一项（`key` 为 ASCII 文件名前缀，`name` 为输出子目录名）。
3. 在 `biology-docs-build/content/<编号>.json` 写扩写稿（缺失时自动以旁白原文生成草稿页）。
4. 运行 `python3 ~/Desktop/biology-docs-build/build.py`，查看 `report/validation.md`。
