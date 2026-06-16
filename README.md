# AI Command Fixer

Local-first web tool for repairing accidental line breaks in long AI-generated terminal commands.

AI Command Fixer 是一个本地优先的 Web 工具，用来把 AI 回复里被聊天界面折断的长终端命令，修复成可复制、可核对的单行命令。

## Why This Exists / 为什么需要它

AI assistants often generate long deployment, verification, Python `-c`, SQL, Docker, `kubectl`, or SSH commands. Chat interfaces and Markdown rendering can wrap those commands across lines. When copied into a terminal, the command may fail because a string, path, filename, date, SQL identifier, or shell block was split in the wrong place.

AI 经常生成很长的部署、验证、Python `-c`、SQL、Docker、`kubectl` 或 SSH 命令。聊天界面和 Markdown 排版有时会把这些命令折成多行。直接复制到终端后，路径、文件名、日期、SQL 标识符、字段名或 shell block 可能被断开，导致命令执行失败。

## Why Not Just Replace Newlines? / 为什么普通换行工具不够

Generic line-break removers do not understand command structure. Replacing every newline with a space can still leave broken tokens such as `citation_l ist`, `2026- 06-12`, or `geo_ raw_responses`. Removing all whitespace can be worse: it can merge separate arguments and change command meaning.

AI Command Fixer focuses on command-format repair. It keeps the MVP single-command-first, then repairs high-risk accidental breakpoints such as paths, dates, SQL identifiers, field names, filenames, backslash continuations, and complex shell blocks like `for ... do ... done`.

普通换行删除工具不了解命令结构。简单把所有换行替换成空格，仍可能留下 `citation_l ist`、`2026- 06-12`、`geo_ raw_responses` 这样的坏断点。直接删除所有空白更危险，可能把不同参数粘在一起，改变命令含义。

AI Command Fixer 专注做命令格式修复。MVP 默认按一条长命令处理，并针对路径、日期、SQL 标识符、字段名、文件名、反斜杠续行，以及 `for ... do ... done` 这类复杂 shell block 的高风险断点做修复。

## Core Capabilities / 核心能力

- Paste a full AI response or one long command.
- Treat input as one command by default, avoiding accidental splitting of long shell structures.
- Repair accidental line breaks, backslash continuations, and spacing caused by chat UI wrapping.
- Repair high-risk breakpoints in paths, dates, SQL identifiers, field names, filenames, and shell blocks.
- Show automatic repair points so you can review what changed.
- Copy with the per-command copy button or by clicking the repaired result block.
- Detect unsupported here-doc structures such as `<<EOF` without flattening them.
- Show risk hints for dangerous command patterns, while leaving the final decision to the user.

---

- 支持粘贴整段 AI 回复或一条长命令。
- 默认按一条命令处理，避免长 shell 结构被误拆。
- 修复聊天界面造成的意外折行、反斜杠续行和多余空白。
- 支持修复路径、日期、SQL 标识符、字段名、文件名和 shell block 中的高风险断点。
- 展示自动修复点，方便人工核对。
- 支持单条复制按钮，也支持点击修复结果框复制。
- 检测 `<<EOF` 等暂不支持的 here-doc 结构，但不会强行压缩。
- 对高风险命令给出提示，但最终执行判断仍由用户负责。

## How To Use / 使用方式

1. Paste the AI reply or long command into the input box.
2. Click **Fix command**.
3. Review the repaired command and repair points.
4. Copy the command with the copy button or by clicking the result block.
5. Run it only after you understand the command and confirm it matches your intent.

---

1. 把 AI 回复或长命令粘贴到输入框。
2. 点击“修复命令”。
3. 核对修复后的命令和自动修复点。
4. 用复制按钮，或点击结果框复制命令。
5. 只有在确认命令含义和执行目标后，再粘贴到终端执行。

## Privacy Commitment / 隐私承诺

AI Command Fixer runs entirely in your browser. It does not upload command text and does not require an account. By default, it does not save commands. If you explicitly use Local Stash, only the repaired command is stored in the current browser with an expiration time.

Privacy-friendly analytics and webmaster tools may be used for public releases, but they must never collect command text, repaired output, stashed command text, paths, tokens, clipboard content, custom prefix text, or command history. See [docs/analytics.md](docs/analytics.md).

AI Command Fixer 完全在浏览器本地运行。它不会上传命令，也不需要账号。默认情况下，它不会保存命令；只有当你主动使用“本地暂存”时，修复后的命令才会保存在当前浏览器本地，并按过期时间自动清理。

公开发布时可以接入隐私友好的匿名统计和站长工具，但绝不能采集命令内容、修复结果、暂存命令、路径、token、剪贴板内容、自定义前缀文本或命令历史。详见 [docs/analytics.md](docs/analytics.md)。

## Good Fits / 适用场景

- AI-generated one-line commands that were visually wrapped by a chat interface.
- Python `-c` commands containing long SQL strings.
- Commands with broken file paths, filenames, dates, identifiers, or field names.
- Shell commands with backslash continuations.
- Long single-command shell blocks that should stay together.
- Local or internal deployments where command privacy matters.

---

- AI 生成的一行命令被聊天界面意外折行。
- Python `-c` 中包含很长 SQL 字符串。
- 文件路径、文件名、日期、标识符或字段名被断开。
- 使用反斜杠续行的 shell 命令。
- 本应保持为一条命令的长 shell block。
- 对命令隐私敏感的本地或内网部署场景。

## Not A Good Fit / 不适用场景

- Checking whether a command is semantically correct or safe.
- Explaining every shell option or command argument.
- Executing commands.
- Flattening here-doc (`<<EOF`) or complex multi-line scripts.
- Batch processing command files.
- Acting as a CLI, Codex skill, browser extension, or shell plugin in the MVP.

---

- 判断命令语义是否正确或安全。
- 解释每一个 shell 参数。
- 执行命令。
- 自动压缩 here-doc (`<<EOF`) 或复杂多行脚本。
- 批量处理命令文件。
- 在 MVP 中作为 CLI、Codex skill、浏览器插件或 shell 插件使用。

## Local Usage / 本地运行

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

Manual regression cases for long AI-generated commands are documented in [docs/testing.md](docs/testing.md).

长命令人工回归用例见 [docs/testing.md](docs/testing.md)。

## Deployment / 部署

This is a static front-end tool. It can be deployed to Vercel, Cloudflare Pages, GitHub Pages, Nginx, object storage, CDN hosting, or a customer-owned static hosting environment.

The first version does not need a backend, database, account system, API key, or environment variables. Do not put command text into URLs or analytics events.

这是一个纯前端静态工具，可部署到 Vercel、Cloudflare Pages、GitHub Pages、Nginx、对象存储、CDN 或客户自有静态托管环境。

第一版不需要后端、数据库、账号系统、API key 或环境变量。不要把命令内容写入 URL 或统计事件。

See [docs/deploy.md](docs/deploy.md).

## FAQ / 常见问题

See [docs/faq.md](docs/faq.md).

## Roadmap / 路线图

Now:

- Improve real-world repair coverage for long AI-generated commands.
- Keep the MVP single-command-first and easy to review.
- Prepare bilingual open-source release materials.
- Maintain privacy-friendly analytics rules.

Next:

- Explore an explicit multi-command mode.
- Improve diff and repair-point review.
- Add more documentation for reporting failed examples safely.
- Consider UI language switching after the bilingual release materials stabilize.

Later:

- Explore CLI, Codex skill, browser extension, and batch workflows.
- Explore here-doc support through safer script-file workflows instead of flattening.
- Explore team-shared rules without storing command contents by default.

---

当前：

- 继续提升 AI 长命令真实场景的修复覆盖。
- 保持 MVP 默认单命令、可核对的产品形态。
- 准备中英并行的开源发布材料。
- 维护隐私友好的统计边界。

下一步：

- 探索显式多命令模式。
- 改进差异展示和修复点核对体验。
- 补充如何安全反馈失败样例的文档。
- 在双语发布材料稳定后，再考虑 UI 语言切换。

后续：

- 探索 CLI、Codex skill、浏览器插件和批量处理。
- 探索通过更安全的脚本文件工作流支持 here-doc，而不是强行压缩。
- 探索不默认存储命令内容的团队规则共享。

## Project Docs / 项目文档

- [Changelog](CHANGELOG.md)
- [Testing](docs/testing.md)
- [Deployment](docs/deploy.md)
- [FAQ](docs/faq.md)
- [Analytics policy](docs/analytics.md)
- [Growth operations plan](docs/growth/2026-06-11-growth-ops-plan.md)
- [Content backlog](docs/growth/content-backlog.md)
- [Collaboration rules](docs/collaboration.md)

## Contributing / 参与贡献

The project is preparing for open source. Good early contributions include:

- Real command-format failure cases with sensitive data removed.
- Parser edge cases and regression tests.
- Documentation improvements.
- Privacy review of analytics or deployment suggestions.
- Translation improvements for Chinese/English materials.

When reporting a broken command, remove secrets, tokens, internal hostnames, private paths, customer names, database names, and production identifiers first.

项目正在准备开源。早期适合贡献：

- 去敏后的真实命令折行失败样例。
- 解析边界和回归测试。
- 文档改进。
- 统计或部署建议的隐私审查。
- 中英文材料的翻译和表达改进。

反馈失败命令前，请先移除 secret、token、内部主机名、私有路径、客户名、数据库名和生产标识符。

## License / 许可证

MIT. See [LICENSE](LICENSE).
