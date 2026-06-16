# AI Command Fixer 统计与站长工具接入规范

日期：2026-06-11

## 1. 已确认决策

- 允许接入隐私友好的匿名统计。
- 支持主流运营工具接入，包括 Google Search Console、Bing Webmaster Tools、Google Analytics 等。
- 任何统计工具都不能采集原始命令、修复后命令、暂存命令、命令片段 hash、服务器路径、数据库名、域名、IP、token、剪贴板内容或命令历史。
- 统计能力必须服务于发布、SEO、GEO/AI 搜索优化和基础产品改进，而不是追踪个人命令内容。

## 2. 工具分类

### 2.1 推荐优先接入

Google Search Console：

- 用途：搜索收录、关键词、点击率、页面覆盖情况。
- 风险：低。不采集工具输入框内容。
- 要求：只接入站点验证和 sitemap，不把命令写入 URL。

Bing Webmaster Tools：

- 用途：Bing 搜索收录，也有助于部分 AI 搜索生态理解站点。
- 风险：低。
- 要求：与 GSC 一样，只做站点级接入。

Cloudflare Web Analytics：

- 用途：基础访问量、页面浏览、来源。
- 风险：较低。
- 要求：不使用 session replay，不采集输入内容。

### 2.2 可选接入

Google Analytics：

- 用途：页面访问、渠道来源、匿名事件。
- 风险：中。能力强，但需要严格配置。
- 要求：
  - 不发送命令内容。
  - 不发送 textarea 内容。
  - 不发送修复结果。
  - 不发送命令 hash。
  - 不启用会记录输入内容的增强测量或第三方插件。
  - 事件参数只允许使用枚举、布尔值和数量区间。

Plausible / Umami：

- 用途：隐私友好型访问与事件统计。
- 风险：较低，尤其是自托管。
- 要求：同样不能发送命令内容或命令派生文本。

### 2.3 禁止默认接入

- Session replay。
- Heatmap。
- FullStory、LogRocket、Hotjar 等可能记录输入行为或页面内容的工具。
- 会自动采集表单内容、剪贴板内容、DOM 快照或用户输入的 SDK。
- 错误监控中包含用户输入和结果内容的默认配置。

## 3. 允许采集的事件

只允许采集匿名行为和区间化统计：

- `page_view`
- `language_selected`: `zh-CN` 或 `en`
- `example_loaded`
- `fix_clicked`
- `repair_result_status`: `empty`、`single_supported`、`unsupported`
- `unsupported_detected`: `true` / `false`
- `risk_hint_shown`: `true` / `false`
- `copy_single_clicked`
- `copy_all_clicked`
- `stash_clicked`
- `stash_result_status`: `saved`、`limit_reached`、`expired_removed`
- `stash_ttl_selected`: `1h`、`24h`、`7d`
- `stash_count_bucket`: `0`、`1`、`2-5`、`6-20`
- `settings_opened`
- `preferences_cleared`
- `custom_prefix_count_bucket`: `0`、`1`、`2-5`、`6+`

## 4. 禁止采集的事件与字段

禁止采集：

- 原始输入全文。
- 修复后的命令。
- 暂存命令。
- 原始片段。
- 命令 hash。
- 命令长度的精确值。
- 服务器路径。
- 数据库名。
- 域名。
- IP 地址片段。
- token、key、secret、password。
- 用户剪贴板内容。
- 浏览器本地存储中的自定义前缀文本。
 - 浏览器本地存储中的暂存命令文本。

如果需要统计数量，必须使用区间，而不是精确内容或精确长度。

## 5. GA 事件参数规范

允许：

```text
event_name=fix_clicked
command_count_bucket=2-5
has_unsupported=true
has_risk=false
language=en
```

禁止：

```text
raw_input=/home/venvs/geo/bin/python ...
fixed_command=python -c ...
command_hash=...
custom_prefix=/home/venvs/geo/bin/python
```

## 6. Cookie 与合规提示

第一版如果只接入 GSC、Bing Webmaster Tools 和不设 cookie 的基础统计，可以不做复杂 cookie 偏好面板。

如果接入 GA：

- 页面需要补充统计说明。
- 面向欧盟或英国用户时，需要评估 cookie consent。
- 产品隐私文案必须说明统计只记录匿名行为，不记录命令内容。

## 7. 产品经理验收清单

- 页面 URL 不包含命令内容。
- 源码中没有把 textarea value 传给统计 SDK。
- 统计事件参数不包含用户输入、修复结果、暂存命令或自定义前缀文本。
- localStorage 只保存偏好、自定义规则和用户主动暂存的修复后命令；默认不保存历史。
- README、FAQ、隐私说明中的承诺与统计实现一致。
- GSC / GA / Bing 的接入说明进入发布文档。
