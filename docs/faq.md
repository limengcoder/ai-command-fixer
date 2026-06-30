# AI Command Fixer FAQ

## English

### What is AI Command Fixer?

AI Command Fixer is a local-first web tool for repairing accidental line breaks in long AI-generated terminal commands. It focuses on turning a broken copied command back into a reviewable, copy-ready one-line command.

### Why is the MVP single-command-first by default?

The most painful failures often happen inside one long command: Python `-c` strings, SQL queries, file paths, filenames, dates, or shell blocks. If a tool eagerly splits pasted text into many commands, it can break structures such as `for ... do ... done`. The MVP therefore treats the input as one long command by default and optimizes for careful review.

### Why not just replace every newline with a space?

Plain newline replacement does not know whether a break happened between arguments, inside a path, inside a date, or inside a SQL identifier. It can leave broken tokens such as `geo_ raw_responses` or `2026- 06-12`. AI Command Fixer applies command-aware repair rules and shows repair points for review.

### Does it upload my commands?

No. Command text is processed in your browser. The MVP does not send command input or repaired output to a server.

### Does it save command history?

No. It does not save command history by default. Browser storage is used for preferences such as display options and custom command prefixes. If you explicitly click the local stash action, only the repaired command and its editable local title are saved in the current browser with an expiration time.

### What is local stash?

Local stash is an optional temporary save area for repaired commands. It is not automatic history. It stores repaired command text plus a short editable title after you explicitly choose to stash it, keeps both in the current browser, and automatically removes expired items. Older stash entries without titles are still readable and receive a default title locally.

### Do analytics collect commands?

No. Public releases may use privacy-friendly analytics or webmaster tools, but analytics must not collect command text, repaired output, stashed command text, paths, tokens, clipboard content, custom prefix text, or command history. Allowed events are anonymous behavior counts and coarse buckets only. See [analytics.md](analytics.md).

### What if I paste multiple commands?

The MVP is optimized for one long command by default. If you have multiple commands, review the output carefully and split them manually when needed. An explicit multi-command mode is a future exploration, not the default MVP behavior.

### Why is here-doc not supported yet?

Here-doc structures such as `cat <<EOF ... EOF` are intentionally multi-line. Flattening them into one line can change meaning or produce unsafe output. The MVP detects common here-doc markers and treats them as unsupported instead of pretending it can safely repair them.

### Does it support Python `-c` and SQL?

Yes, the MVP is designed around real failures such as Python `-c` commands with long SQL strings. It can repair high-confidence breaks in dates, SQL identifiers, field names, filenames, paths, Chinese paths/filenames, and Chinese quoted values broken by real newlines.

### Why do I still need to review repair points?

The tool repairs formatting; it does not understand your production context. A line break can be accidental, but a command can still be destructive, outdated, or pointed at the wrong environment. Always review the repaired command and the highlighted repair points before execution.

### Does it check whether a command is dangerous?

It can show risk hints for patterns such as destructive file operations or dangerous SQL statements. These hints are not a security guarantee, and the tool does not block copying because the user must remain in control.

### Will there be a CLI, Codex skill, browser extension, or batch mode?

They are possible future directions. The first version is intentionally a static web tool so the workflow stays visible, reviewable, and local-first.

### Can I deploy it inside a company network?

Yes. It is a static front-end tool and can be hosted on internal static infrastructure such as Nginx, object storage, a private CDN, or an internal web server.

### How should I report a broken example?

Remove secrets, tokens, internal hostnames, private paths, customer names, database names, production IDs, and any sensitive business text first. Share only the smallest sanitized example that still reproduces the formatting issue.

## 中文

### AI Command Fixer 是什么？

AI Command Fixer 是一个本地优先的 Web 工具，用来修复 AI 生成长终端命令里的意外折行，把坏掉的复制结果还原成可核对、可复制的单行命令。

### 为什么 MVP 默认按单命令处理？

最常见的失败通常发生在一条很长的命令内部，例如 Python `-c` 字符串、SQL 查询、文件路径、文件名、日期或 shell block。如果工具过早把粘贴内容拆成多条命令，可能误拆 `for ... do ... done` 这类结构。所以 MVP 默认把输入视为一条长命令，优先保证可核对。

### 为什么不能直接把所有换行替换成空格？

普通换行替换不知道断点是在参数之间、路径内部、日期内部，还是 SQL 标识符内部。它可能留下 `geo_ raw_responses` 或 `2026- 06-12` 这样的坏 token。AI Command Fixer 会按命令结构做更高置信的修复，并展示修复点供人工核对。

### 工具会上传我的命令吗？

不会。命令文本在浏览器本地处理。MVP 不会把原始输入或修复结果发送到服务器。

### 工具会保存命令历史吗？

默认不会。浏览器本地存储只用于保存显示偏好和自定义命令前缀。只有当你主动点击“本地暂存”时，工具才会把修复后的命令和可编辑本地标题保存在当前浏览器本地，并按过期时间自动清理。

### 什么是本地暂存？

本地暂存是一个可选的临时保存区，用来保存修复后的命令。它不是自动历史记录。只有你主动暂存时才会保存修复后的命令文本和短标题，内容只保存在当前浏览器本地，并会自动清理过期项。旧版没有标题的暂存数据仍可读取，并会在本地补默认标题。

### 统计会采集命令内容吗？

不会。公开发布时可以使用隐私友好的匿名统计或站长工具，但统计不得采集命令内容、修复结果、暂存命令、路径、token、剪贴板内容、自定义前缀文本或命令历史。允许的只是匿名行为计数和区间化指标。详见 [analytics.md](analytics.md)。

### 如果我粘贴了多条命令怎么办？

MVP 默认优化的是一条长命令。遇到多条命令时，请仔细核对输出，并在需要时手动拆分。显式多命令模式属于后续探索，不是第一版默认行为。

### 为什么 here-doc 暂不支持？

`cat <<EOF ... EOF` 这类 here-doc 本来就是多行结构。把它强行压成一行可能改变语义，也可能产生危险结果。MVP 会识别常见 here-doc 标记并提示暂不支持，而不是假装可以安全修复。

### 支持 Python `-c` 和 SQL 吗？

支持。MVP 的核心场景之一就是 Python `-c` 中包含长 SQL 字符串的折行问题。它可以修复日期、SQL 标识符、字段名、文件名、路径、中文路径/文件名，以及引号内中文参数值被真实换行打断等高置信断点。

### 为什么还需要人工核对修复点？

工具只修格式，不理解你的生产环境。折行可能是意外的，但命令仍可能具有破坏性、已经过期，或指向错误环境。执行前请始终核对修复后的命令和高亮的修复点。

### 工具会检查命令是否危险吗？

它会对一些危险模式给出风险提示，例如破坏性文件操作或危险 SQL 语句。但这不是安全保证，工具也不会替你阻止复制，最终判断必须由用户完成。

### CLI、Codex skill、浏览器插件或批量模式会做吗？

这些都是可能的后续方向。第一版刻意先做静态 Web 工具页，让修复过程保持可见、可核对，并且坚持本地优先。

### 可以部署到公司内网吗？

可以。它是纯前端静态工具，可以部署到 Nginx、对象存储、私有 CDN 或公司内网静态服务器。

### 如何反馈识别失败的样例？

请先移除 secret、token、内部主机名、私有路径、客户名、数据库名、生产 ID 和敏感业务文本。只保留能复现格式问题的最小去敏样例。
