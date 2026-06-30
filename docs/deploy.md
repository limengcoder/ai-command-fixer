# AI Command Fixer 部署说明

AI Command Fixer MVP 是一个本地优先的纯前端静态工具页。它默认把粘贴内容当作一条长命令修复，第一版不需要后端服务器、数据库、账号系统、服务端环境变量或 API。

## MVP 发布口径

- 产品形态：单页 Web 工具，核心流程是粘贴命令、修复折行、人工核对、复制结果。
- 默认模式：默认单命令，不把一段 AI 回复积极拆成多条命令；多命令能力只作为后置兼容能力验收。
- 数据边界：命令内容、修复结果和命令历史只在浏览器当前页面内处理，不上传、不落库、不写入 URL；用户主动本地暂存除外。
- 本地存储：允许保存偏好、自定义前缀、UI 设置，以及用户主动暂存的修复后完整命令；不得保存原始命令、修复前文本、自动修复点详情、风险详情、命令历史或剪贴板内容。
- 部署形态：托管 `index.html`、`styles.css` 和 `src/*.js` 即可，不需要构建产物目录。

## 推荐路径

MVP 默认推荐使用 Cloudflare Pages。它对静态站足够轻，支持预览部署、后台回滚、访问统计和 CDN 缓存规则，适合这个工具的第一版发布。

Vercel 是等价备选，适合团队已经使用 Vercel 的情况。GitHub Pages 适合最简公开页面或开源项目首页。客户私有化、内网或离线场景，可以交付静态文件给 Nginx、对象存储、CDN 源站或内网静态服务器。

## 当前仓库状态

当前项目在本地 Git 仓库中，路径为：

```text
/Users/wangxb/Documents/产品思维提升
```

当前未配置远程仓库。正式公开发布前，需要先创建远程仓库，推送一个可回滚的发布 commit，并为 MVP 打 tag。

## 平台配置

Cloudflare Pages：

1. 创建 Pages 项目并连接仓库。
2. Framework Preset 选择 None。
3. Build Command 留空。
4. Output Directory 使用项目根目录 `/`。
5. 发布预览地址后，先完成本文的发布前检查，再切换正式域名。

Vercel：

1. 将仓库连接到 Vercel。
2. Framework Preset 选择 Other。
3. Build Command 留空。
4. Output Directory 使用项目根目录 `/`。
5. 使用 Preview Deployment 完成验收后再 promote 到生产环境。

GitHub Pages：

1. 在仓库 Settings 中启用 Pages。
2. Source 选择主分支或发布分支。
3. 如果继续保持根目录静态文件结构，发布目录选择 `/`。
4. 等待 Pages 构建完成后访问公开地址并完成发布前检查。

客户自有静态托管：

- 必需文件：`index.html`、`styles.css`、`src/*.js`。
- 可托管位置：Nginx、Apache、S3、OSS、COS、内网静态服务器或 CDN 源站。
- 建议保留上一版静态目录，生产入口通过软链接、对象存储版本或 CDN 版本切换。

本地预览：

```bash
npm start
```

然后访问：

```text
http://127.0.0.1:4173
```

## 隐私边界

页面和发布说明需要保持一致承诺：

- 所有命令只在浏览器本地处理。
- 不上传命令。
- 默认不保存命令；主动本地暂存除外。
- 主动暂存只保存修复后的完整命令，并按过期时间自动清理。
- 不读取或保存剪贴板内容；只在用户主动复制时写入剪贴板。
- 不登录，不创建账号，不依赖 session。
- 浏览器本地存储只保存偏好、自定义前缀、UI 设置和用户主动暂存的修复后命令。
- 用户可一键清除本地设置。
- 工具只做格式修复和风险提示，不保证命令语义正确或执行安全。

禁止设计会把命令写入 URL 参数、hash、分享链接、错误日志、统计事件或远程请求的功能。即使工具没有后端，静态托管服务和浏览器插件也可能记录 URL、IP、User-Agent 或页面内容，因此 URL 和事件参数必须始终保持无命令内容。

## 统计与站长工具

允许接入隐私友好的匿名统计和主流站长工具：

- Google Search Console
- Bing Webmaster Tools
- Cloudflare Web Analytics
- Google Analytics
- Plausible / Umami

接入边界见 [统计与站长工具接入规范](analytics.md)。任何工具都不能采集原始命令、修复后命令、暂存命令、命令片段、命令 hash、服务器路径、数据库名、token、剪贴板内容、命令历史或自定义前缀文本。

GA、Plausible、Umami 等事件参数只允许使用枚举、布尔值和区间值，例如 `repair_result_status=single_supported`、`risk_hint_shown=true`、`custom_prefix_count_bucket=2-5`。禁止发送 textarea value、修复结果、精确命令长度、路径片段或任何从命令内容派生的文本。

## 缓存与版本号

当前项目没有构建 hash，也没有单独的构建产物目录。MVP 发布时按静态文件缓存处理：

- `index.html` 使用短缓存或不缓存，建议 `Cache-Control: no-cache` 或非常短的 `max-age`。
- `styles.css` 和 `src/*.js` 当前也建议短缓存，避免入口 HTML 更新后仍加载旧脚本。
- 每次正式发布对应一个 Git commit 和一个 tag，例如 `v0.1.0-mvp`。
- 平台发布记录、CHANGELOG 和 tag 的版本号需要一致；当前 npm 包版本为 `0.1.0`。
- 若托管平台支持手动 purge，发布后清理 HTML、CSS 和 JS 缓存。
- 未来如果引入 hash 文件名或查询版本号，例如 `app.js?v=0.1.1`，JS/CSS 才适合长缓存。
- localStorage 数据结构必须保留版本字段或迁移策略，避免未来字段变化污染新版行为。

## 回滚建议

- 每次生产发布必须能对应到一个 Git commit。
- MVP 发布前打 tag，例如 `v0.1.0-mvp`。
- Cloudflare Pages / Vercel：优先使用平台后台回滚到上一条成功生产部署。
- GitHub Pages：回滚到上一个发布 commit 后重新部署。
- 客户自有托管：保留上一版静态目录，通过软链接、对象存储版本或 CDN 源站版本切换回滚。
- 回滚后检查缓存是否仍命中旧坏版本；必要时 purge `index.html`、`styles.css` 和 `src/*.js`。

## 发布前自动检查

在不执行真实部署的前提下，发布前至少运行：

```bash
npm test
git diff --check
```

建议额外做一次只读源码扫描，确认没有引入网络请求、统计越界或历史保存：

```bash
rg -n "fetch\\(|XMLHttpRequest|sendBeacon|gtag\\(|analytics|posthog|hotjar|logrocket|fullstory|localStorage|sessionStorage|clipboard|history|token" index.html src docs
```

如接入统计脚本，必须复核 [analytics.md](analytics.md) 中的允许事件和禁止字段。

## 发布前手工检查

- 粘贴整段 AI 回复或一条长命令后，默认按单命令修复。
- Python `-c` 内部 SQL 折行能修复为单行。
- 反斜杠续行命令能合并。
- JSON 参数命令能合并。
- `<<EOF` 被提示为暂不支持，不自动修复。
- `rm -rf`、`DROP DATABASE` 等高风险内容有提示。
- 单条复制按钮和“复制全部”可用，结果编辑框本身不承担点击复制。
- 主动暂存后会生成可编辑短标题，标题修改刷新后仍保留。
- 只有多条可支持命令时才出现“复制全部”；默认单命令场景不应把它作为主流程。
- 刷新页面后不会恢复上一条命令内容。
- 偏好设置刷新后仍保留。
- 清除本地设置按钮可用。
- 断网后，已加载页面的核心修复功能仍可使用。
- 浏览器控制台无明显报错。
- 移动端至少可粘贴、修复、复制，不出现按钮遮挡。
- 页面隐私说明清晰可见，且不承诺工具会判断命令安全。

更完整的人工回归用例见 [测试说明](testing.md)。

## 无后端发布检查

- 没有 API 请求依赖。
- 没有数据库依赖。
- 没有登录、账号、session。
- 没有服务端环境变量。
- 没有把命令写入 URL、URL hash 或分享链接。
- 没有第三方分析脚本默认采集输入内容、DOM 快照、剪贴板内容或表单内容。
- 如接入 GSC、GA 等工具，事件参数不能包含命令内容、命令派生文本、精确长度、路径、token 或自定义前缀文本。
- 没有把原始命令、自动命令历史记录写入 localStorage 或 sessionStorage。
- 仅保存偏好、自定义规则、UI 设置，以及用户主动暂存的修复后命令和可编辑短标题。
- 构建产物可直接作为静态文件访问。
