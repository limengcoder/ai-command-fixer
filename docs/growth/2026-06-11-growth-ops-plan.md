# AI Command Fixer 增长/运营工作规划

日期：2026-06-11

## 1. 角色定位

增长/运营 Agent 负责 AI Command Fixer 的发布、内容、搜索可见性、社区传播和基础运营体系建设。该角色不负责产品代码实现，不直接改核心功能，不推动任何会破坏“本地处理、不上传命令、不保存历史”承诺的增长手段。

核心职责：

- 维护发布与推广工作清单。
- 准备页面文案、FAQ、博客、README、发布贴等基础物料。
- 规划 SEO 与 GEO/AI 搜索优化。
- 规划中英双语内容与 i18n 节奏。
- 建议指标体系，但不采集命令内容。
- 根据用户反馈、搜索词和社区问题，向产品经理提交产品改进建议。

当前阶段只做准备工作，不要求马上改页面或上线博客。用户已确认第一版公开发布采用中英并行、项目准备开源，并允许接入隐私友好的匿名统计与主流站长/分析工具。

## 2. 参考观察

本规划参考了同类或相邻开发者工具的资源结构：

- ShellCheck：网站首屏直接提供在线编辑器、示例、输出区，同时强调本地安装、文档、GitHub、编辑器集成和包管理器生态。
- explainshell：聚焦单一任务，首屏直接输入命令，并通过示例帮助用户理解使用方式。
- Warp：具备完整的开发者产品资源结构，包括 Docs、Blog、Community、Changelog、Roadmap、FAQ、Press、Security、Privacy、Product Hunt、GitHub、YouTube、Slack、LinkedIn 等。

补充网络检索结论：常见 line break remover、formatter、developer tools 通常具备“输入框 + 输出框 + 示例 + 复制 + FAQ + 隐私说明 + 多语言/SEO 页面”的基础资产，但大多不是面向 AI 生成命令折行问题。AI Command Fixer 应避免泛化成普通文本清洗工具，优先占住“AI command line break fixer / broken AI command fixer”这个更明确的位置。

## 3. 发布前工作

发布前目标是让工具具备“可以被理解、可以被信任、可以被测试、可以被推荐”的基础。

产品页面物料：

- 一句话定位：Fix broken AI-generated commands into copy-ready one-line commands.
- 中文定位：把 AI 回复里被折断的命令，修复成可复制的单行命令。
- 三个核心卖点：本地处理、不上传命令、不保存历史。
- 三个能力卖点：默认单命令修复、自动修复点核对、风险提示。
- 一个真实前后对比样例：Python `-c` + SQL 被折断后修复为单行。
- 一个明确限制：暂不自动合并 `<<EOF` / here-doc / 复杂多行脚本。

信任物料：

- 隐私说明：所有输入只在浏览器本地处理。
- 存储说明：只保存偏好和自定义规则，不保存命令历史。
- 安全说明：工具做格式修复和风险提示，不保证命令语义安全。
- 清除本地设置说明：用户可以一键清除偏好。

发布资产：

- GitHub README 草稿与开源仓库基础物料。
- MIT License。
- GitHub issue 模板与反馈指南。
- Product Hunt 发布文案。
- X/Twitter、即刻、V2EX、掘金、Hacker News、Reddit 发布素材。
- 中英文 FAQ。
- Changelog 初版。
- Roadmap 初版。
- 基础截图：空状态、输入示例、长命令修复结果、自动修复点、风险提示、设置区。
- 统计接入规范：GSC、Bing Webmaster Tools、GA、Cloudflare Web Analytics 等只允许采集匿名行为，不允许采集命令内容。

## 4. 发布时工作

发布当天应控制节奏，先小范围验证，再公开扩散。

建议顺序：

1. 内部/朋友小范围试用，收集命令识别失败样例。
2. 发布 GitHub 仓库和公开 Demo。
3. 补齐 README、FAQ、隐私说明和 Changelog。
4. 在开发者社区发布第一波帖子。
5. 记录反馈，不急于加复杂功能。
6. 如果反馈稳定，再准备 Product Hunt 或更正式的英文发布。

发布时必须避免：

- 不承诺“保证命令安全”。
- 不暗示会保存历史或同步历史。
- 不把命令内容放入 URL 分享。
- 不默认接入会采集输入内容的第三方分析脚本。
- 不使用夸张的 AI 自动修复宣传，避免用户误以为工具会理解业务语义。

## 5. 发布后工作

发布后增长/运营 Agent 重点维护反馈闭环。

每周工作：

- 汇总用户反馈：识别失败、误合并、文案误解、FAQ 缺口。
- 更新 FAQ 和使用指南。
- 维护内容 backlog 优先级。
- 记录搜索词和社区讨论，但不记录命令内容。
- 输出一份增长周报给产品经理：流量、反馈、内容进展、下一周建议。

每个版本工作：

- 更新 Changelog。
- 更新 README 能力说明。
- 更新测试样例说明。
- 维护公开 Roadmap。
- 标注已知限制。

## 6. SEO 工作清单

页面级 SEO：

- 明确 title：
  - English: `AI Command Fixer - Fix Broken AI-Generated Commands`
  - 中文：`AI 命令折行修复器 - 修复被 AI 折断的命令`
- 明确 meta description：
  - English: `Paste AI-generated terminal commands and fix accidental line breaks into copy-ready one-line commands. Runs locally in your browser. No uploads, no command history.`
  - 中文：`粘贴 AI 生成的终端命令，自动修复意外折行，输出可复制的单行命令。浏览器本地处理，不上传，不保存命令历史。`
- H1 聚焦真实需求，不写空泛口号。
- 首屏必须包含“paste AI command / fix line breaks / copy one-line command / local browser processing”等关键词。
- FAQ 使用问答结构，覆盖隐私、here-doc、Python `-c`、SQL、默认单命令、多命令后续探索。
- 增加 Open Graph 和 Twitter Card 文案与截图。
- 增加 `robots.txt`、`sitemap.xml`、canonical URL。
- 发布后接入 Google Search Console 和 Bing Webmaster Tools。
- 如接入 Google Analytics，只发送匿名行为事件和区间化指标，不发送命令内容、修复结果、命令 hash、自定义前缀文本或剪贴板内容。

关键词方向：

- `AI command fixer`
- `fix AI generated command`
- `fix broken terminal command`
- `command line break fixer`
- `shell command line break remover`
- `Python -c line break fixer`
- `fix copied command from ChatGPT`
- `AI 命令 修复`
- `命令 折行 修复`
- `ChatGPT 命令 换行`
- `终端命令 单行 复制`

内容页 SEO：

- 每篇博客只解决一个明确问题。
- 用真实命令片段做例子，但避免暴露敏感 token、域名、IP。
- 每篇文章都有“工具如何处理”和“什么时候不要自动合并”的边界说明。
- 中英文页面应使用 `hreflang`，避免中英文内容互相抢排名。

## 7. GEO / AI 搜索优化清单

GEO 目标是让 ChatGPT、Perplexity、Google AI Overviews、Bing Copilot 等系统更容易理解和引用产品。

可被 AI 引用的页面结构：

- 产品是什么：一句话定义。
- 解决什么问题：AI 回复把命令折成多行，复制到终端失败。
- 适合谁：开发者、运维、使用 AI 生成部署命令的人。
- 如何工作：浏览器本地规则解析，修复意外换行，输出单行命令。
- 隐私承诺：不上传、不保存命令历史。
- 限制：不处理 here-doc、多行脚本，不保证命令安全。
- 对比：不是 ShellCheck，不解释命令参数，不执行命令，只做格式修复。

建议新增内容资产：

- `What is AI Command Fixer?`
- `AI Command Fixer vs ShellCheck`
- `AI Command Fixer vs explainshell`
- `Why not just replace newlines with spaces?`
- `Does AI Command Fixer upload my commands?`
- `What command formats are supported?`

结构化数据建议：

- 使用 `SoftwareApplication` schema 描述工具。
- FAQ 页面使用 `FAQPage` schema。
- 博客使用 `Article` schema。
- Changelog 可使用普通 HTML 页面，不必复杂化。

AI 可读文案原则：

- 多用明确短句。
- 每个页面都重复核心隐私承诺。
- 避免只用图片承载关键信息。
- FAQ 中直接回答“是否上传命令”“是否保存历史”“是否支持 here-doc”。
- README、官网、FAQ 的定位表述保持一致。

## 8. 页面物料清单

MVP 页面：

- 顶部短文案：`Local-first command line break fixer for AI-generated commands.`
- 中文短文案：`专为 AI 生成命令准备的本地折行修复工具。`
- 隐私徽章：`Runs locally`、`No uploads`、`No command history`
- 使用步骤：`Paste -> Fix -> Copy`
- 示例输入和示例输出。
- 支持能力列表。
- 暂不支持列表。
- FAQ 入口。
- GitHub / Feedback 入口。

后续页面：

- `/faq`
- `/blog`
- `/changelog`
- `/roadmap`
- `/privacy`
- `/docs` 或 `/guide`
- `/zh` 和 `/en`

截图素材：

- 空状态。
- 粘贴 AI 回复或长命令后显示修复结果。
- Python `-c` 折行修复。
- 单条复制、复制全部和可编辑结果状态。
- here-doc 不支持状态。
- 高风险命令提示。
- 偏好设置和自定义前缀。

## 9. 博客/内容矩阵

内容应围绕“AI 生成命令的真实失败场景”，而不是泛泛写文本工具。

内容支柱：

- 问题教育：为什么 AI 命令复制到终端会失败。
- 场景指南：Python `-c`、SQL、JSON 参数、反斜杠续行。
- 工具边界：什么时候不能压成一行，尤其是 here-doc。
- 隐私信任：为什么命令修复工具应该本地处理。
- 对比说明：ShellCheck、explainshell、普通 line break remover 各自解决什么。
- 发布记录：每个版本修复了哪些命令识别问题。

内容节奏：

- 发布前：准备 3 篇基础文章和 1 份 FAQ。
- 发布首周：发布 1 篇产品介绍、1 篇真实问题拆解。
- 发布后 4 周：每周 1 篇场景文章，沉淀长尾搜索。

## 10. FAQ 清单

首批 FAQ 应覆盖：

- AI Command Fixer 是什么？
- 它和普通换行删除工具有什么区别？
- 它会上传我的命令吗？
- 它会保存命令历史吗？
- 为什么不直接把所有换行替换成空格？
- 支持多条命令吗？
- 为什么默认按单命令处理？
- 支持 Python `-c` 和 SQL 查询吗？
- 支持反斜杠续行吗？
- 支持 JSON 参数吗？
- 支持 `<<EOF` / here-doc 吗？
- 它会检查命令是否危险吗？
- 为什么风险命令仍然可以复制？
- 可以离线使用吗？
- 可以部署到公司内网吗？
- 支持中英文吗？
- 如何反馈识别失败的命令样例？

## 11. 中英双语与 i18n 建议

已确认策略：第一版公开发布采用中英并行。

阶段建议：

- MVP：当前工具可先保持单页工作台结构，但公开发布所需的 README、FAQ、发布贴、SEO 标题、meta description 需要中英并行。
- 第一次公开发布：提供中英文 README、FAQ、发布贴和首页核心文案。
- 后续版本：将 UI 文案抽离为 `zh-CN` 和 `en` 字典，再做语言切换。

语言策略：

- 中文定位偏真实场景：AI 回复、服务器命令、终端复制失败。
- 英文定位偏搜索词：AI-generated commands、line breaks、copy-ready one-line commands。
- 不要逐字翻译，按各自用户的搜索习惯写。

i18n 注意事项：

- 不要把用户输入或结果写入 URL 来实现语言切换。
- 语言偏好可以保存在 localStorage，但只保存语言代码。
- FAQ 和博客应做独立 URL，例如 `/zh/faq`、`/en/faq`。
- 使用 `hreflang` 标注中英文版本。

## 12. 社区/发布渠道建议

中文渠道：

- V2EX：以真实痛点帖发布，标题避免广告腔。
- 掘金：写技术复盘文章，讲状态机解析和隐私设计。
- 即刻：适合轻量发布和收集反馈。
- 少数派：适合工具推荐，但需要更成熟的产品故事。
- 知乎：适合回答“ChatGPT 生成的命令复制到终端报错怎么办”。

英文渠道：

- Product Hunt：准备视觉截图、短视频/GIF、Maker comment。
- Hacker News：适合 `Show HN: AI Command Fixer`，要强调本地、简单、开源或可读。
- Reddit：`r/commandline`、`r/devops`、`r/ChatGPTCoding`，注意遵守社区规则。
- GitHub：README、topics、release notes。
- X/Twitter、LinkedIn：适合短视频或动图演示。

推荐发布角度：

- “I kept breaking production commands copied from AI chats, so I built a local fixer.”
- “Not a shell linter. Not a command explainer. Just fixes accidental line breaks in AI-generated commands.”
- “Runs entirely in your browser. No uploads. No command history.”

## 13. 指标和埋点建议

增长指标必须尊重隐私承诺，不能采集命令内容。

已确认策略：允许接入隐私友好的匿名统计，并支持 GSC、GA 等主流工具；具体边界见 `docs/analytics.md`。

可以采集的匿名事件：

- 页面访问量。
- 语言选择。
- 点击加载示例。
- 点击修复按钮。
- 修复结果状态，例如 `empty`、`single_supported`、`unsupported`。
- 修复类型计数区间，例如合并换行、反斜杠续行、here-doc 不支持、高风险提示。
- 点击复制单条。
- 打开设置。
- 清除本地偏好。

不能采集：

- 原始输入文本。
- 修复后命令。
- 命令片段 hash。
- 服务器路径、数据库名、域名、IP、token。
- 用户剪贴板内容。
- 命令历史。

分析工具建议：

- MVP 可以先接入 GSC / Bing Webmaster Tools 这类站点级工具。
- 如需行为统计，可选 Google Analytics、Plausible、Umami 自托管或 Cloudflare Web Analytics，但必须按 `docs/analytics.md` 的事件边界实现。
- 默认不接入会记录输入内容的 session replay、heatmap、fullstory 类工具。
- 如果使用错误监控，必须过滤所有用户输入和结果内容。

## 14. 协作边界

与产品经理：

- 增长 Agent 向产品经理提交内容、渠道、FAQ、指标建议。
- 产品经理负责决定是否进入产品需求、设计任务或开发任务。

与设计 Agent：

- 增长 Agent 提供首屏文案、截图需求、发布图规格。
- 设计 Agent 负责视觉表达和页面结构。

与前端 Agent：

- 增长 Agent 不直接改代码。
- 如需 SEO meta、FAQ 页面、i18n 字典、结构化数据，由产品经理拆成前端任务。

与测试 Agent：

- 增长 Agent 提供发布前页面内容验收清单。
- 测试 Agent 验证页面功能、隐私承诺和文案一致性。

与运维 Agent：

- 增长 Agent 提供 sitemap、robots、域名、统计、发布渠道需求。
- 运维 Agent 负责部署、缓存、回滚和托管策略。

## 15. 风险与原则

主要风险：

- 为增长接入过度分析，破坏隐私信任。
- 文案过度承诺，让用户误以为工具能保证命令安全。
- 内容泛化成普通换行工具，失去 AI 命令折行这个差异化定位。
- 过早做多语言、博客系统、复杂站点，拖慢 MVP 验证。

原则：

- 信任优先于短期增长。
- 内容优先解释真实问题。
- 运营资产先轻后重。
- 所有外部表述都必须和产品实际能力一致。
