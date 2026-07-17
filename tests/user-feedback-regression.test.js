import test from "node:test";
import assert from "node:assert/strict";
import { parseCommands } from "../src/command-parser.js";

test("feedback: preserves SQL keyword boundary when FROM is folded before table name", () => {
  const input = `cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'sql="SELECT id, answer_content FROM
  geo_raw_responses WHERE stat_date=%s"; print(sql)'`;

  const result = parseCommands(input);
  const fixed = result.commands[0]?.fixed ?? "";

  assert.equal(result.commands.length, 1);
  assert.match(fixed, /FROM geo_raw_responses WHERE/);
  assert.doesNotMatch(fixed, /FROMgeo_raw_responses/);
});

test("feedback: preserves SQL keyword boundary for dashboard summary table", () => {
  const input = `cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'sql="SELECT customer_id, stat_date FROM
  geo_dashboard_summary WHERE stat_date=%s"; print(sql)'`;

  const result = parseCommands(input);
  const fixed = result.commands[0]?.fixed ?? "";

  assert.equal(result.commands.length, 1);
  assert.match(fixed, /FROM geo_dashboard_summary WHERE/);
  assert.doesNotMatch(fixed, /FROMgeo_dashboard_summary/);
});

test("feedback: repairs ISO date folded between month hyphen and day", () => {
  const input = `cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'target_date="2026-06-
  12"; print(target_date)'`;

  const result = parseCommands(input);
  const fixed = result.commands[0]?.fixed ?? "";

  assert.equal(result.commands.length, 1);
  assert.match(fixed, /"2026-06-12"/);
  assert.doesNotMatch(fixed, /"2026-06- 12"/);
});

test("feedback: keeps folded for-loop compound command as one command", () => {
  const input = `cd /home/magneto/app/geo && for d in 2026-06-06 2026-06-07 2026-06-08 2026-06-09 2026-06-10 2026-06-11; do /home/venvs/geo/bin/python scripts/create_pipeline_run.py --pipeline-code future_vision_daily_quickbi --date "$d"; /home/venvs/geo/bin/
  python scripts/simple_geo_pipeline_worker.py --pipeline-code future_vision_daily_quickbi --once; done`;

  const result = parseCommands(input);
  const fixed = result.commands[0]?.fixed ?? "";

  assert.equal(result.commands.length, 1);
  assert.equal(
    fixed,
    `cd /home/magneto/app/geo && for d in 2026-06-06 2026-06-07 2026-06-08 2026-06-09 2026-06-10 2026-06-11; do /home/venvs/geo/bin/python scripts/create_pipeline_run.py --pipeline-code future_vision_daily_quickbi --date "$d"; /home/venvs/geo/bin/python scripts/simple_geo_pipeline_worker.py --pipeline-code future_vision_daily_quickbi --once; done`
  );
  assert.match(fixed, /for d in .*; do .*; done/);
  assert.doesNotMatch(fixed, /\/home\/venvs\/geo\/bin\/\s+python/);
});

test("feedback: auto split mode still keeps shell compound blocks together", () => {
  const input = `cd /home/magneto/app/geo && for d in 2026-06-06 2026-06-07; do /home/venvs/geo/bin/python scripts/create_pipeline_run.py --date "$d"; /home/venvs/geo/bin/
  python scripts/simple_geo_pipeline_worker.py --once; done
git status`;

  const result = parseCommands(input, { splitMode: "auto" });

  assert.deepEqual(result.commands.map((item) => item.fixed), [
    `cd /home/magneto/app/geo && for d in 2026-06-06 2026-06-07; do /home/venvs/geo/bin/python scripts/create_pipeline_run.py --date "$d"; /home/venvs/geo/bin/python scripts/simple_geo_pipeline_worker.py --once; done`,
    "git status"
  ]);
});

test("feedback: preserves folded crontab entry as one command", () => {
  const input = `*/15 6-16 * * * cd /home/magneto/app/geo && /home/venvs/geo/bin/python scripts/create_deep_anji_analysis_when_ready.py --date "$(date -I)" >> /home/magneto/
  app/geo/logs/deep_anji_analysis_ready_check.cron.log 2>&1`;

  const result = parseCommands(input);
  const fixed = result.commands[0]?.fixed ?? "";

  assert.equal(result.commands.length, 1);
  assert.equal(
    fixed,
    `*/15 6-16 * * * cd /home/magneto/app/geo && /home/venvs/geo/bin/python scripts/create_deep_anji_analysis_when_ready.py --date "$(date -I)" >> /home/magneto/app/geo/logs/deep_anji_analysis_ready_check.cron.log 2>&1`
  );
  assert.match(fixed, /^\*\/15 6-16 \* \* \* cd /);
  assert.doesNotMatch(fixed, /\/home\/magneto\/\s+app\/geo/);
});

test("feedback: auto split mode treats cron entries as command starts", () => {
  const input = `准备定时任务：
*/15 6-16 * * * cd /home/magneto/app/geo && /home/venvs/geo/bin/python scripts/create_deep_anji_analysis_when_ready.py --date "$(date -I)" >> /home/magneto/
  app/geo/logs/deep_anji_analysis_ready_check.cron.log 2>&1
git status`;

  const result = parseCommands(input, { splitMode: "auto" });

  assert.deepEqual(result.commands.map((item) => item.fixed), [
    `*/15 6-16 * * * cd /home/magneto/app/geo && /home/venvs/geo/bin/python scripts/create_deep_anji_analysis_when_ready.py --date "$(date -I)" >> /home/magneto/app/geo/logs/deep_anji_analysis_ready_check.cron.log 2>&1`,
    "git status"
  ]);
});

test("feedback: does not treat prose after five cron-like fields as a command", () => {
  const input = `*/15 6-16 * * * every fifteen minutes during the work day
This is only a scheduling note, not a shell command.`;

  const result = parseCommands(input);

  assert.equal(result.commands.length, 0);
  assert.equal(result.summary.supported, 0);
});

test("feedback: escapes literal percent in PyMySQL execute_query SQL string", () => {
  const input = `cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c "from dotenv import load_dotenv; load_dotenv('.env'); from models.database import get_db; db=get_db(); rows=db.execute_query(\\"SELECT batch_code, platform_name, COUNT(*) raw_cnt, COUNT(DISTINCT question_id) questions, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) completed_cnt FROM geo_raw_responses r JOIN geo_customers c ON c.id=r.customer_id WHERE c.customer_code='deep_anji' AND r.stat_date='2026-07-03' AND r.batch_code LIKE 'deep_anji_20260703_daily_%' GROUP BY batch_code, platform_name ORDER BY batch_code, platform_name\\"); [print(r) for r in rows]"`;

  const result = parseCommands(input);
  const fixed = result.commands[0]?.fixed ?? "";

  assert.equal(result.commands.length, 1);
  assert.match(fixed, /LIKE 'deep_anji_20260703_daily_%%'/);
  assert.doesNotMatch(fixed, /LIKE 'deep_anji_20260703_daily_%' GROUP/);
  assert.ok(result.commands[0].repairs.some((repair) => repair.type === "pymysql-percent"));
});

test("feedback: keeps PyMySQL placeholders and params tuple percent values unchanged", () => {
  const input = `cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'from models.database import get_db; db=get_db(); rows=db.execute_query("SELECT * FROM geo_raw_responses WHERE batch_code LIKE %s", ("deep_anji_20260703_daily_%",)); print(rows)'`;

  const result = parseCommands(input);
  const fixed = result.commands[0]?.fixed ?? "";

  assert.equal(result.commands.length, 1);
  assert.match(fixed, /LIKE %s", \("deep_anji_20260703_daily_%",\)/);
  assert.doesNotMatch(fixed, /LIKE %%s/);
  assert.equal(result.commands[0].repairs.some((repair) => repair.type === "pymysql-percent"), false);
});

test("feedback: does not double-escape existing PyMySQL literal percent escapes", () => {
  const input = `cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'from models.database import get_db; db=get_db(); rows=db.execute_query("SELECT * FROM geo_raw_responses WHERE batch_code LIKE 'foo%%'"); print(rows)'`;

  const result = parseCommands(input);
  const fixed = result.commands[0]?.fixed ?? "";

  assert.equal(result.commands.length, 1);
  assert.match(fixed, /LIKE 'foo%%'/);
  assert.doesNotMatch(fixed, /foo%%%%/);
  assert.equal(result.commands[0].repairs.some((repair) => repair.type === "pymysql-percent"), false);
});

test("feedback: repairs folded hyphenated CLI option value", () => {
  const input = `cd /home/magneto && git pull --ff-only origin feature/geo_project_dynamic && cd /home/magneto/app/geo && /home/venvs/geo/bin/python scripts/check_geo_workers.py --workers geo-
  daily-analysis-worker --restart-all`;

  const result = parseCommands(input);
  const fixed = result.commands[0]?.fixed ?? "";

  assert.equal(result.commands.length, 1);
  assert.match(fixed, /--workers geo-daily-analysis-worker --restart-all/);
  assert.doesNotMatch(fixed, /--workers geo-\s+daily-analysis-worker/);
  assert.ok(result.commands[0].repairs.some((repair) => repair.type === "option-value"));
});

test("feedback: does not merge hyphenated words outside CLI option value context", () => {
  const input = `echo geo-
  daily-analysis-worker`;

  const result = parseCommands(input);
  const fixed = result.commands[0]?.fixed ?? "";

  assert.equal(result.commands.length, 1);
  assert.equal(fixed, "echo geo- daily-analysis-worker");
  assert.equal(result.commands[0].repairs.some((repair) => repair.type === "option-value"), false);
});

test("feedback: does not merge folded option value into the next CLI option", () => {
  const input = `python script.py --name geo-
  --restart-all`;

  const result = parseCommands(input);
  const fixed = result.commands[0]?.fixed ?? "";

  assert.equal(result.commands.length, 1);
  assert.equal(fixed, "python script.py --name geo- --restart-all");
  assert.equal(result.commands[0].repairs.some((repair) => repair.type === "option-value"), false);
});
