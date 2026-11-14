# Cedric Being

念念不忘，必有回响。LOVE AND IT ECHOES.

Cedric 的个人网站：**首页 / 作品 / 文章 / 关于**。暖白色画布、实时点阵双手、错位溶解换姿与按钮下的彩虹微光。

## 本地预览

无需安装依赖，在仓库目录运行：

```sh
python3 -m http.server 8000
```

访问 http://localhost:8000 。全部页面代码位于 `index.html`；只有 Inter 字体和 Higgsfield 手部源图使用外部资源。手部图必须通过支持 CORS 的地址加载，失败时页面保留全部内容并显示提示。

## 内容维护

- `#works`：作品。目前收录本网站自身，后续添加真实项目。
- `#writing`：技术思考、社会观察、分享与教程。目前明确显示未发布状态，分类按钮可切换分类说明。
- `#about`：个人介绍及 GitHub 入口。
- 响应系统的减少动态效果偏好，也可以手动暂停动画；首屏不可见或标签页隐藏时暂停渲染。
- 调用 `window.__render(seconds)` 可绘制指定时间的动画帧，截图前先点击暂停动效。

## 发布

仓库包含 GitHub Pages 工作流。到仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，推送到 `main` 后自动部署。

默认地址：https://RRRealCedric.github.io/Cedric-Being/

手部源图来自需求提供的 Higgsfield URL；公开使用前请自行确认该图片的使用授权。
