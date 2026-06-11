# AI Command Fixer 部署说明

AI Command Fixer 是纯前端静态工具。第一版不需要后端服务器、数据库、环境变量、账号系统或 API。

## 推荐路径

MVP 推荐优先使用 Vercel 或 Cloudflare Pages：

- 每次推送后自动发布。
- 支持预览环境，方便验收。
- 回滚简单。
- 适合静态 Web 工具。

如果只需要最简单的公开静态站，也可以使用 GitHub Pages。客户私有化或内网使用时，可以交付静态文件给客户自己的 Nginx、对象存储、CDN 或内网静态服务器。

## 当前仓库状态

当前项目只在本地 Git 仓库中提交，路径为：

```text
/Users/wangxb/Documents/产品思维提升
```

当前没有配置远程仓库。后续如果开源，需要先创建 GitHub 仓库，再添加 remote 并推送。

## Vercel

1. 将仓库连接到 Vercel。
2. Framework Preset 选择 Other。
3. Build Command 留空或使用项目文档中的测试命令后手动发布。
4. Output Directory 使用项目根目录，或使用构建产物目录。
5. 发布后用预览地址完成验收。

## Cloudflare Pages

1. 创建 Pages 项目并连接仓库。
2. Framework Preset 选择 None。
3. Build Command 留空。
4. Output Directory 使用项目根目录。
5. 发布后用预览地址完成验收。

## GitHub Pages

1. 在仓库 Settings 中启用 Pages。
2. Source 选择主分支。
3. 如果项目保持根目录静态文件结构，发布目录选择 `/`。
4. 等待 Pages 构建完成后访问公开地址。

## 客户自有静态托管

客户只需要托管静态文件：

- `index.html`
- `styles.css`
- `src/*.js`

可放到 Nginx、Apache、S3、OSS、COS、内网静态服务器或 CDN 源站中。

本地预览可以运行：

```bash
npm start
```

然后访问 `http://127.0.0.1:4173`。

## 隐私说明

页面需要明确说明：

- 所有命令都只在浏览器本地处理。
- 不上传命令。
- 不登录。
- 不保存命令历史。
- 浏览器本地存储只保存偏好和自定义规则。
- 用户可一键清除本地设置。
- 工具只做格式修复和风险提示，不保证命令安全。

不要设计会把命令写入 URL 参数的分享功能。即使工具没有后端，静态托管服务仍可能记录 URL、IP 和 User-Agent。

## 统计与站长工具

已确认允许接入隐私友好的匿名统计，并支持主流运营工具：

- Google Search Console
- Bing Webmaster Tools
- Google Analytics
- Cloudflare Web Analytics
- Plausible / Umami

接入边界见 [统计与站长工具接入规范](analytics.md)。任何工具都不能采集原始命令、修复后命令、命令 hash、服务器路径、数据库名、token、剪贴板内容或命令历史。

## 缓存建议

- `index.html` 使用短缓存或不缓存，保证新版本入口及时生效。
- 当前版本没有构建 hash，`styles.css` 和 `src/*.js` 建议短缓存。
- 如果未来引入 hash 文件名，JS/CSS 可使用长缓存。
- 本地存储数据结构需要带版本号，避免未来字段变化污染新版行为。

## 回滚建议

- 每次发布对应一个 Git commit。
- MVP 发布前打 tag，例如 `v0.1.0-mvp`。
- Vercel / Cloudflare Pages：优先使用平台后台回滚。
- GitHub Pages：回滚到上一个 commit 后重新部署。
- 客户自有托管：保留上一版静态目录，通过软链接或 CDN 版本切换回滚。

## 发布前检查清单

- 粘贴整段 AI 回复后，可以识别多条命令。
- Python `-c` 内部 SQL 折行能修复为单行。
- 反斜杠续行命令能合并。
- JSON 参数命令能合并。
- `<<EOF` 被提示为暂不支持，不自动修复。
- `rm -rf`、`DROP DATABASE` 等高风险内容有提示。
- 复制单条和复制全部可用。
- 复制全部时多条命令用换行分隔。
- 刷新页面后不会恢复上一条命令内容。
- 偏好设置刷新后仍保留。
- 清除本地设置按钮可用。
- 断网后，已加载页面的核心修复功能仍可使用。
- 浏览器控制台无明显报错。
- 移动端至少可粘贴、修复、复制，不出现按钮遮挡。
- 页面隐私说明清晰可见。

## 无后端检查

- 没有 API 请求依赖。
- 没有数据库依赖。
- 没有登录、账号、session。
- 没有服务端环境变量。
- 没有把命令写入 URL。
- 没有第三方分析脚本默认采集输入内容。
- 如接入 GSC、GA 等工具，事件参数不能包含命令内容或命令派生文本。
- 没有把原始命令、修复命令、历史记录写入 localStorage。
- 仅保存偏好、自定义规则和 UI 设置。
- 构建产物可直接作为静态文件访问。
