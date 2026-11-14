# Cedric Being

念念不忘，必有回响。LOVE AND IT ECHOES.

个人网站：**首页 / 作品 / 文章 / 关于**。首页只显示精选；作品与文章分别拥有独立目录、分类、标签、搜索、排序和分页，详情页提供目录和统一阅读排版。

## 启动

需要 Node.js 22 或更新版本：

```sh
npm ci
npm run dev
```

网站：http://localhost:8000/ · 内容工作台：http://localhost:8000/studio.html

端口被占用时可运行 `PORT=8001 npm run dev`。修改内容、图片、样式与首页后自动重新生成，刷新页面查看；修改 `scripts/` 后重启服务。

## 上传与发布

### 本地工作台

1. 打开工作台，选择或拖入 `.md`、`.markdown`、`.html` 或 `.htm` 文件（最大 2 MB）。
2. 选择作品 / 文章，填写标题、分类、日期、摘要、标签。文件头已有信息会自动识别；无文件头也能导入。
3. 预览正文，点击「导入到网站」。源文件保存在 `content/`，本地列表和详情自动更新。
4. 更新已有内容时，保持相同页面名称 / slug，勾选「更新已有的同名内容」。更新时保持原 Markdown / HTML 格式。
5. 可勾选草稿（不公开）与首页精选（最多 2 件作品、3 篇文章）。没有精选时显示最新内容。
6. 确认后提交并推送：

```sh
git add content
git commit -m "Publish new content"
git push
```

也可以下载补好文件头的内容文件。导入仅保存本地文件，不会自动提交或推送。

**GitHub Pages 是静态网站，线上工作台不能直接保存文件，也没有公开上传接口。** 本地服务仅监听 `127.0.0.1`，校验 Host 和 Origin；无需在网页配置 GitHub Token。

### 直接在 GitHub 上传

无需本地运行：复制 `templates/` 下的 Markdown / HTML 模板，填好正文与文件头，设置 `draft: false`，通过下方入口上传并提交：

- [上传文章](https://github.com/RRRealCedric/Cedric-Being/upload/main/content/articles)
- [上传作品](https://github.com/RRRealCedric/Cedric-Being/upload/main/content/works)

GitHub Actions 自动生成目录与详情页，无需维护索引。没有文件头时标题从 Markdown 一级标题或 HTML title / h1 推断，slug 取文件名，使用模块的第一个分类。建议填写分类、日期与摘要。

## 文件头格式

```yaml
---
title: 一篇具体的文章标题
slug: a-specific-article
category: 技术思考
date: '2026-11-15'
tags: [前端, 实践]
summary: 讨论什么问题，读者能从中获得什么。
featured: false
draft: false
link: ''
source: ''
---
```

| 字段 | 说明 |
| --- | --- |
| title | 标题，最多 200 字符 |
| slug | 稳定页面名称，最多 100 字符，仅文字、数字、短横线或下划线；发布后保持不变，避免旧链接失效 |
| category | 使用下表中的分类名称 |
| date | 有效的 YYYY-MM-DD，建议加引号；未填显示「未标注日期」 |
| tags | 标签列表，最多 8 个 |
| summary | 摘要，最多 300 字符；未填取正文开头 |
| featured / draft | true / false：首页精选候选 / 不公开的草稿 |
| link / source | 可选的作品体验 / 源码地址，仅 HTTP 或 HTTPS |

| 模块与目录 | 分类 |
| --- | --- |
| 作品 content/works/ | 网站与应用 / 工具与开源 / 设计与实验 |
| 文章 content/articles/ | 技术思考 / 社会观察 / 分享与教程 |

同一模块的 slug 必须唯一，包括草稿。无效日期、未知分类、重复 slug 或不支持的文件名会阻止构建，并指出文件。文件头只支持 YAML，不支持可执行 JavaScript。

## 正文与图片

- Markdown 支持段落、标题、链接、列表、GFM 表格、引用、代码块和图片。
- HTML 支持完整文档或正文片段，提取正文后使用全站阅读样式。脚本、事件处理器、iframe 和自定义 CSS 会移除。HTML 用于阅读内容；交互应用请单独部署，并在作品的 `link` 字段填写体验地址。
- 图片放到 `content/assets/`，正文使用 `![图片说明](../assets/filename.png)` 或 `<img src="../assets/filename.png" alt="图片说明">`，与正文一起提交。也支持 HTTPS 图片。
- 列表采用文字与点阵封面，正文内可以放作品截图。

## 项目结构

- `index.html`：首页源文件与 Canvas 动画。
- `studio.html`、`assets/`：上传工作台、公共样式与页面交互。
- `content/works/`、`content/articles/`、`content/assets/`：作品、文章、正文图片。
- `templates/`：内容模板，不发布。
- `scripts/content.mjs`：元数据解析、Markdown 转换、HTML 清理。
- `scripts/build.mjs`：多页面静态生成；`scripts/dev.mjs`：本地服务与文件导入。
- `dist/`：自动生成的发布目录，不提交 Git。

## 检查与部署

```sh
npm test
npm run build
```

浏览器端无框架与 Markdown 运行时依赖。构建使用 marked、gray-matter、sanitize-html。`tests/smoke.cjs` 和 `tests/import.cjs` 是额外浏览器验收，需要运行本地服务、Playwright 和 Google Chrome；导入测试自动创建并清理随机命名的文件，不要与内容编辑同时运行。

在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。每次推送 main，依次安装依赖、运行内容测试、生成 dist 并部署。若 configure-pages 报 404，请先启用上述设置，再重跑工作流。

默认网址：https://RRRealCedric.github.io/Cedric-Being/

首页响应减少动态效果设置，也可以手动暂停；首屏不可见或标签页隐藏时停止绘制。暂停后调用 `window.__render(seconds)` 可绘制指定时间。手部源图暂不可用时，保留完整内容并显示提示。

首页的作品、文章、关于采用整屏滚动吸附，每个章节使用毛玻璃面板，滚动时轻微位移、缩放和虚化。右侧章节导航（手机为底部导航）可直接切换。小高度屏幕与减少动态效果模式使用更宽松的吸附，长内容仍可完整滚动阅读。

全站字体采用 Lora / Noto Serif SC 的衬线标题与正文、DM Sans / Noto Sans SC 的导航和操作文字，参考 Anthropic 的编辑风格，并非其专有品牌字体。代码保持等宽字体；工作台正文预览使用相同排版。字体依赖 Google Fonts，载入失败时使用系统宋体 / 衬线与无衬线后备字体。
