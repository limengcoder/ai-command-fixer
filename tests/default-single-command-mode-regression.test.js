import test from "node:test";
import assert from "node:assert/strict";
import { parseCommands } from "../src/command-parser.js";

test("regression: default mode treats for-loop shell structure as one long command", () => {
  const input = String.raw`cd /home/magneto/app/geo && for d in 2026-06-06 2026-06-07 2026-06-08 2026-06-09 2026-06-10 2026-06-11; do /home/venvs/geo/bin/python scripts/create_pipeline_run.py --pipeline-code future_vision_daily_quickbi --date "$d"; /home/venvs/geo/bin/
  python scripts/simple_geo_pipeline_worker.py --pipeline-code future_vision_daily_quickbi --once; done`;

  const result = parseCommands(input);

  assert.equal(result.commands.length, 1);
  assert.equal(
    result.commands[0].fixed,
    String.raw`cd /home/magneto/app/geo && for d in 2026-06-06 2026-06-07 2026-06-08 2026-06-09 2026-06-10 2026-06-11; do /home/venvs/geo/bin/python scripts/create_pipeline_run.py --pipeline-code future_vision_daily_quickbi --date "$d"; /home/venvs/geo/bin/python scripts/simple_geo_pipeline_worker.py --pipeline-code future_vision_daily_quickbi --once; done`
  );
  assert.doesNotMatch(result.commands[0].fixed, /\/home\/venvs\/geo\/bin\/\s+python/);
});
