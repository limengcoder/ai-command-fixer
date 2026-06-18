# AI Command Fixer 测试说明

## 自动化测试

本项目第一版不依赖第三方包，解析器测试使用 Node 内置 `node:test`。

```bash
npm test
```

测试覆盖：

- P0：Python `-c` 内部 SQL 折行修复。
- P0：默认单命令模式下，复杂 shell 结构按一条长命令修复。
- P0：多命令识别作为后置能力，仍需能从整段 AI 回复中识别多条命令并忽略说明文字。
- P0：反斜杠续行合并。
- P0：JSON 参数命令合并。
- P0：`<<EOF` / here-doc 标记为不支持且不压缩。
- P0：`rm -rf` 等高风险命令提示。
- P1：Markdown 代码块边界移除。
- P1：Shell 提示符移除。
- P1：相邻完整命令不错误合并。
- P1：自定义命令前缀。
- P1：SQL 高风险语句提示。
- P1：修复引号内被折断的 ISO 日期，例如 `2026- ⏎ 06-03`。
- P1：修复路径/文件名中下划线或点号附近的折断，例如 `jingdong_ ⏎ 20260609...xlsx`。
- P1：移除 macOS zsh 风格提示符，例如 `wangxb@bogon magneto %`。
- P1：只修复高置信的同一行 token 双空格，例如 `citation_l  ist`，不误修 SQL 可读性空格。
- P1：SQL 查询字符串中的标识符折断会修复，例如 `t.trig ⏎ gered_by`、`batch ⏎ _code`、`r. ⏎ question_id`。
- P1：Python 字符串/列表内字段名真实换行会修复，例如 `citation_l ⏎ ist`。
- P0：本地暂存存储契约，使用 `ai-command-fixer.localStash.v1`，只保存修复后的完整命令和 `id` / `createdAt` / `expiresAt`。
- P0：默认修复不会创建暂存数据；主动暂存才写入 localStorage。
- P0：本地暂存过期项会自动清理，20 条上限会阻止第 21 条新增。
- P1：本地暂存支持删除单条和清空全部，且不保存原始输入、修复点、风险详情、hash、路径或 URL 等敏感派生字段。
- P0：结果编辑状态中，复制和暂存读取编辑后的 `currentText`。
- P0：恢复自动修复结果后，`currentText` 回到 `autoFixedText`，并退出编辑态。
- P0：不支持结果只保留复制动作，不提供暂存或编辑动作。
- P0：复制全部使用每条支持结果的 `currentText`，并跳过不支持项。

## 手工验收

启动本地静态服务：

```bash
npm start
```

然后打开 `http://127.0.0.1:4173`。

1. 桌面端确认第一屏是上下流程：上方输入、下方结果；长命令有完整宽度可检查。
2. 确认输入区底部只有“修复命令”是主按钮，“试用示例”和“清空”是轻量次级操作。
3. 初始状态下确认结果区显示输出空状态，且不显示“复制全部”。
4. 输入一条包含 `&& for ... do ... done` 的长命令，确认默认只输出 1 条命令，并能修复命令中间的意外折行。
5. 点击“试用示例”，将多命令识别作为后置场景确认；只有输出多条命令时才显示“复制全部”。
6. 输入含日期、文件名或 SQL 标识符折行的命令，确认结果卡片显示“自动修复点”高亮。
7. 每条结果卡片右上角都显示单条“复制”按钮；点击后确认剪贴板内容是当前单条命令，且页面状态提示“已复制命令 X”。
8. 只读状态下点击结果命令框，确认仍可复制当前单条命令，且与右上角“复制”按钮复制内容一致。
9. 点击支持结果的“编辑”，确认结果命令框变为可编辑文本框，文本框获得焦点，且点击文本框只移动光标、不触发复制。
10. 修改编辑框内容后点击“复制编辑结果”，确认剪贴板内容是编辑后的完整命令。
11. 修改编辑框内容后点击“暂存编辑结果”，确认本地暂存只保存编辑后的完整命令。
12. 编辑后确认卡片显示“已手动编辑”；点击“恢复自动修复结果”后，内容回到自动修复结果，编辑标记消失，按钮回到只读状态。
13. 输入含 here-doc 的不支持命令，确认结果卡片不提供“暂存”或“编辑”，只允许复制原文。
14. 点击“复制全部”，确认多条可支持命令使用换行分隔，已编辑结果使用编辑后的内容，未编辑结果使用自动修复结果，here-doc 不支持项会被跳过。
15. 默认不点击“暂存”，刷新页面后确认本地暂存区仍为空，localStorage 中没有 `ai-command-fixer.localStash.v1` 暂存数据。
16. 点击单条结果旁的“暂存”，确认只保存修复后的完整命令；localStorage 暂存项只包含 `id`、`command`、`createdAt`、`expiresAt`。
17. 检查暂存 JSON 不包含原始输入、修复前文本、自动修复点、风险详情、命令 hash、路径分类、URL 或来源页面等字段。
18. 选择 `1 小时`、`24 小时`、`7 天` 过期选项分别暂存，刷新后未过期项仍可见；造一条已过期数据后，页面加载或打开暂存区时会清理。
19. 连续暂存到 20 条后再新增第 21 条，确认新增被阻止，并提示删除旧暂存项或清空全部，不自动覆盖旧项。
20. 在本地暂存区确认单条复制、删除单条、清空全部都可用，且复制内容等于暂存的修复后完整命令。
21. 下滑到工作区下方，展开“设置”，修改“显示原始片段”“显示修复摘要”或自定义前缀，刷新页面后确认偏好保留。
22. 清除本地偏好后确认默认不显示原始片段和修复摘要。
23. 刷新页面后确认输入框和结果区不会恢复之前的命令内容；只有用户主动暂存且未过期的修复结果可在本地暂存区看到。
24. 移动端窄屏确认页面变为单列，进入编辑后检查编辑框、复制/暂存/恢复按钮和修复点列表不互相遮挡，长命令可横向滚动或完整换行查看。
25. 断网后重新打开已加载页面，确认修复、复制和本地暂存核心流程仍可使用。

说明：项目使用 ES module。通过本地静态服务访问比直接用 `file://` 打开 `index.html` 更接近真实部署环境，也能避免部分浏览器对本地模块加载的限制。

## 长命令人工回归用例

这些用例用于人工核验长命令修复效果。每次改动解析逻辑后，至少抽测 3 条；发布前应完整跑一遍。复制时直接复制“输入”内容，不需要额外包裹代码块。

### 用例 1：fields 字段名内部断开

输入：

cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'import csv; fields=["id","customer_id","task_id","reference_list","citation_l
  ist","reasoning_process","recommended_questions","media_content","created_at"]; print(fields)'

预期重点：

- `citation_l ⏎ ist` 修复为 `citation_list`。
- 自动修复点显示 `citation_l ⏎ ist -> citation_list` 或等价提示。

### 用例 2：SQL 字段名内部多处断开

输入：

cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'from dotenv import load_dotenv; load_dotenv(".env"); from models.database import get_db; db=get_db(); rows=db.execute_query("SELECT r.stat_date, COALESCE(r.batch_code,t.batch_code,t.trig
gered_by,%s) batch_code, r.platform_
name, COUNT(DISTINCT r.
question_id) qcnt FROM geo_raw_responses r LEFT JOIN geo_monitor_tasks t ON t.customer_id=r.customer_id AND t.task_id=r.task_id WHERE r.customer_id=%s GROUP BY r.stat_date,COALESCE(r.batch_code,t.batch_code,t.triggered_by,%s),r.platform_name", ("<NULL>", 1, "<NULL>")); print(rows)'

预期重点：

- `t.trig ⏎ gered_by` 修复为 `t.triggered_by`。
- `platform_ ⏎ name` 修复为 `platform_name`。
- `r. ⏎ question_id` 修复为 `r.question_id`。
- `batch_code` 前后的 SQL 语义空格不被错误删除。

### 用例 3：日期内部断开

输入：

cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'from datetime import date; start="2026-
06-06"; end="2026-
06-12"; print({"start": start, "end": end})'

预期重点：

- `2026- ⏎ 06-06` 修复为 `2026-06-06`。
- `2026- ⏎ 06-12` 修复为 `2026-06-12`。
- `2026-06- ⏎ 12` 修复为 `2026-06-12`，不能变成 `2026-06- 12`。

补充输入：

cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'target_date="2026-06-
  12"; print(target_date)'

### 用例 4：长文件名内部断开

输入：

cd /Users/wangxb/Project/magneto && git restore --source=FETCH_HEAD --worktree -- "app/geo/output/jingdong_batch_reports/jingdong_618_activity_analysis_20260609_jingdong_
20260609_temp10_national_10x_pipeline.xlsx"

预期重点：

- `jingdong_ ⏎ 20260609` 修复为 `jingdong_20260609`。
- 文件路径整体仍保留在双引号内。

### 用例 5：SQL 表名内部断开

输入：

cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'sql="SELECT id,platform_name,question_id,answer_content FROM geo_
raw_responses WHERE batch_code=%s ORDER BY platform_name,question_id"; print(sql)'

预期重点：

- `geo_ ⏎ raw_responses` 修复为 `geo_raw_responses`。
- `FROM geo_raw_responses WHERE` 的 SQL 关键字边界不被误合并。
- `FROM ⏎ geo_raw_responses` 修复为 `FROM geo_raw_responses`，不能变成 `FROMgeo_raw_responses`。
- `FROM ⏎ geo_dashboard_summary` 修复为 `FROM geo_dashboard_summary`，不能变成 `FROMgeo_dashboard_summary`。

补充输入：

cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'sql="SELECT id FROM
  geo_raw_responses WHERE stat_date=%s"; print(sql)'

cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'sql="SELECT id FROM
  geo_dashboard_summary WHERE stat_date=%s"; print(sql)'

### 用例 6：Python 变量名内部断开

输入：

cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'reference_list=["a","b"]; citation_list=["c"]; recommended_
questions=["q1","q2"]; media_content=[]; print({"reference_list": reference_list, "citation_list": citation_list, "recommended_questions": recommended_questions, "media_content": media_content})'

预期重点：

- `recommended_ ⏎ questions` 修复为 `recommended_questions`。
- 字典里的普通语义空格不被删除。

### 用例 7：路径目录名内部断开

输入：

cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'from pathlib import Path; out=Path("output/raw_
exports/future_vision_20260606_20260612_raw.csv"); print(out)'

预期重点：

- `raw_ ⏎ exports` 修复为 `raw_exports`。
- 路径斜杠结构保留。

### 用例 8：混合字段名、日期、文件名和表名断开

输入：

cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'from pathlib import Path; stat_date_start="2026-
06-06"; stat_date_end="2026-
06-12"; out=Path("output/raw_exports/future_vision_
20260606_20260612_raw.csv"); fields=["id","platform_name","citation_l
ist","reasoning_process"]; sql="SELECT r.platform_
name,r.citation_list FROM geo_
raw_responses r WHERE r.stat_date BETWEEN %s AND %s"; print({"out": str(out), "fields": fields, "sql": sql, "range": [stat_date_start, stat_date_end]})'

预期重点：

- 日期修复为 `2026-06-06` 和 `2026-06-12`。
- `future_vision_ ⏎ 20260606...` 修复为 `future_vision_20260606...`。
- `citation_l ⏎ ist` 修复为 `citation_list`。
- `platform_ ⏎ name` 修复为 `platform_name`。
- `geo_ ⏎ raw_responses` 修复为 `geo_raw_responses`。
