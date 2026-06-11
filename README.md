# AI Command Fixer

AI Command Fixer is a local-first web tool that fixes accidental line breaks in AI-generated terminal commands.

AI Command Fixer 是一个本地优先的 Web 工具，用来把 AI 回复里被意外折断的终端命令修复成可复制的单行命令。

## What It Does

- Paste a full AI response, a single command, or multiple commands.
- Detect ordinary terminal commands from surrounding explanation text.
- Repair accidental line breaks, backslash continuations, and spacing caused by chat UI wrapping.
- Copy individual commands or copy all supported commands.
- Flag unsupported here-doc structures such as `<<EOF`.
- Show risk hints for dangerous command patterns.

## 核心能力

- 支持粘贴整段 AI 回复、单条命令或多条命令。
- 自动忽略说明文字，识别普通终端命令。
- 修复聊天界面造成的意外折行、反斜杠续行和多余空白。
- 支持单条复制和复制全部。
- 检测 `<<EOF` 等暂不支持的 here-doc 结构。
- 对高风险命令给出提示。

## Privacy

AI Command Fixer runs entirely in your browser. It does not upload command text, does not require an account, and does not save command history. Browser storage is used only for preferences such as display options and custom command prefixes.

AI Command Fixer 完全在浏览器本地运行。它不会上传命令、不需要账号，也不会保存命令历史。浏览器本地存储只用于保存显示偏好和自定义命令前缀。

## What It Is Not

- It is not a shell linter like ShellCheck.
- It is not a command explainer like explainshell.
- It does not execute commands.
- It does not guarantee that a command is safe.
- The MVP does not auto-collapse here-doc or complex multi-line scripts.

## Local Usage

```bash
npm start
```

Then open:

```text
http://127.0.0.1:4173
```

Run tests:

```bash
npm test
```

## Deployment

This is a static front-end tool. It can be deployed to Vercel, Cloudflare Pages, GitHub Pages, Nginx, object storage, CDN hosting, or a customer-owned static hosting environment.

See [docs/deploy.md](docs/deploy.md).

## Growth And Operations

The first public release is planned as bilingual Chinese/English. Growth work includes SEO, GEO/AI-search optimization, FAQ, blog backlog, README, community launch material, and privacy-friendly analytics planning.

See:

- [Growth operations plan](docs/growth/2026-06-11-growth-ops-plan.md)
- [Content backlog](docs/growth/content-backlog.md)
- [Analytics policy](docs/analytics.md)

## License

MIT. See [LICENSE](LICENSE).

