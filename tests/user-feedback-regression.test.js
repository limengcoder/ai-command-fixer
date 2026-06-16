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
