# Changelog

## 2026-06-12 - Open-source release documentation

This documentation update prepares the project for a bilingual open-source release without changing product runtime behavior.

本次文档更新用于准备中英并行的开源发布，不涉及产品运行行为变化。

### Documentation

- Reworked `README.md` into a bilingual open-source README covering problem background, why generic newline tools are not enough, core capabilities, usage, privacy, fit/non-fit scenarios, testing, deployment, roadmap, contribution guidance, and license.
- Added `docs/faq.md` with bilingual answers for default single-command behavior, here-doc limitations, privacy, analytics boundaries, multi-command handling, manual review, and future CLI/skill/plugin exploration.
- Updated growth and content planning docs to align launch messaging with the MVP single-command-first scope.
- Updated analytics event guidance to use MVP result-status events instead of multi-command count buckets.
- Updated deployment checklist language to focus on single-command repair, per-result copy, click-result-to-copy, and privacy-safe analytics boundaries.

## 2026-06-12 - MVP long-command review

This release focuses on the core MVP workflow: repairing one long AI-generated terminal command locally in the browser, reviewing the repaired command, and copying it without extra ceremony.

本版本聚焦 MVP 核心流程：在浏览器本地修复一条 AI 生成的长命令，人工核对修复结果，并快速复制可执行命令。

### Added

- Local-first static web app for repairing AI-generated command line breaks.
- Support for pasting a full AI reply or one long command.
- Default single-command mode to avoid splitting long shell structures.
- Backslash continuation merging for shell-style multi-line commands.
- Repair highlights for automatic fixes.
- Click-to-copy result blocks.
- Per-result copy button.
- Browser-local preferences for display options and custom command prefixes.
- Risk hints for destructive command patterns such as `rm -rf`, `DROP TABLE`, `DROP DATABASE`, `mkfs`, and forced Docker prune.
- Unsupported handling for here-doc structures such as `<<EOF`, without flattening them.
- Long-command manual regression cases in `docs/testing.md`.

### Repair Coverage

- Accidental newlines in Python `-c` SQL commands.
- SQL identifier breaks such as `t.trig ⏎ gered_by`, `batch ⏎ _code`, and `r. ⏎ question_id`.
- Quoted field-name breaks such as `citation_l ⏎ ist`.
- High-confidence manually flattened token spaces such as `citation_l  ist`.
- ISO date breaks such as `2026- ⏎ 06-03`.
- Path and filename breaks such as `jingdong_ ⏎ 20260609...xlsx`.
- Table/path token breaks such as `geo_ ⏎ raw_responses` and `raw_ ⏎ exports`.
- Shell compound command breaks such as `/home/venvs/geo/bin/ ⏎ python` inside `for ... do ... done`.
- Shell prompt stripping for common Linux/macOS terminal prompts.

### Changed

- Main workspace changed from side-by-side panels to a vertical input-then-result flow, which is easier to inspect for long commands.
- Default parsing changed from automatic multi-command detection to single-command-first behavior.
- Result area widened and enlarged for long command review.
- Automatic repair note now describes date, path, field-name, and filename repair points.
- Static asset URLs include version query strings to reduce stale browser-cache issues during local testing.

### Privacy

- Commands are processed entirely in the browser.
- Command text is not uploaded.
- Command history is not saved.
- Local storage is used only for preferences such as display options and custom command prefixes.

### Verification

- Parser test suite: `npm test`.
- Current automated coverage includes 26 parser tests.
- Manual long-command regression checklist is documented in `docs/testing.md`.

### Deferred

- Explicit multi-command mode.
- Codex skill or standalone CLI.
- Browser extension.
- Batch text/file processing.
