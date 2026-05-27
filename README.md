# DashPlayer Web

DashPlayer Web 是一个可直接部署到 GitHub Pages 的静态网站，包含官网介绍页和浏览器本地播放器。

## 在线入口

- 官网：`index.html`
- Web 播放器：`app.html`

## 本地预览

```bash
python3 -m http.server 4173 --directory site
```

打开：

```text
http://localhost:4173
```

## GitHub Pages 部署

仓库已经包含 GitHub Actions 工作流：

```text
.github/workflows/deploy-pages.yml
```

推送到 `main` 分支后，GitHub Actions 会自动把 `site/` 目录发布到 GitHub Pages。

在 GitHub 仓库中确认：

1. 进入 `Settings`。
2. 打开 `Pages`。
3. `Build and deployment` 选择 `GitHub Actions`。
4. 等待 `Actions` 里的 `Deploy GitHub Pages` 完成。
