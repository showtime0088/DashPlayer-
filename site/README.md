# DashPlayer Website

这是 DashPlayer 的静态网站版本，可以直接部署到任意静态托管平台。

目前包含两个入口：

- `index.html`: 官网介绍页
- `app.html`: Web 播放器，支持本地视频、本地字幕、查词和 OpenAI-compatible AI 接口

## 本地预览

```bash
python3 -m http.server 4173 --directory site
```

打开：

```text
http://localhost:4173
```

Web 播放器：

```text
http://localhost:4173/app.html
```

## Web 播放器功能

- 浏览器本地选择视频或音频文件
- 浏览器本地选择 `.srt` / `.vtt` 字幕文件
- 字幕自动跟随视频时间同步
- 点击字幕跳转播放
- 上一句、下一句、重复当前句
- 倍速播放
- 声音恢复与音频兼容性诊断
- 字幕搜索
- 选词或输入英文单词查询释义
- 配置 OpenAI-compatible `chat/completions` 接口分析当前句

## AI 接口说明

`app.html` 里的 AI 面板需要填写：

- 接口地址，例如 `https://api.openai.com/v1/chat/completions`
- API Key
- 模型名

注意：纯前端直连 AI 服务会把 API Key 保存在当前浏览器里，并且请求时会暴露给网页运行环境。个人本地使用可以接受；正式上线给别人使用时，建议增加一个后端代理或边缘函数，由服务端保存 API Key。

## Windows 浏览器声音说明

Web 播放器依赖浏览器自己的解码能力。Windows 上的 Chrome / Edge 通常最稳的是：

```text
MP4 + H.264 视频 + AAC 音频
```

如果 MKV、AVI 或某些下载视频出现“有画面没声音”，常见原因是音轨为 AC3、EAC3、DTS 等浏览器不支持的编码。页面里的“声音状态”和“恢复声音”可以排查静音、音量和音轨问题；如果仍然无声，需要先把视频音频转成 AAC。

## 部署方式

### GitHub Pages

把 `site/` 目录内容提交到仓库，GitHub Pages 的发布目录选择 `site`。

### Vercel / Netlify

导入仓库后：

- Build command 留空
- Publish directory 设置为 `site`

### 普通服务器

将 `site/` 目录中的文件上传到 Nginx、Apache 或对象存储的静态网站目录即可。

## 文件说明

- `index.html`: 网站结构与文案
- `styles.css`: 响应式视觉样式
- `script.js`: 主题切换逻辑
- `assets/`: 从 DashPlayer 项目复用的 logo 和截图资源
