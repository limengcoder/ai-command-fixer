import test from "node:test";
import assert from "node:assert/strict";
import { parseCommands } from "../src/command-parser.js";

test("P0: fixes Python -c SQL folded inside an AI reply", () => {
  const input = `验证：

/home/venvs/geo/bin/python -c "from dotenv import load_dotenv; load_dotenv('.env'); from models.database import get_db; db=get_db(); rows=db.execute_query(\\"SELECT id,pipeline_code,batch_code,status,current_step,error_message
FROM geo_pipeline_runs WHERE batch_code='yilan_20260610_worker_smoke1'\\"); [print(r) for r in rows]"`;

  const result = parseCommands(input);

  assert.equal(result.commands.length, 1);
  assert.equal(result.commands[0].unsupported, false);
  assert.equal(
    result.commands[0].fixed,
    `/home/venvs/geo/bin/python -c "from dotenv import load_dotenv; load_dotenv('.env'); from models.database import get_db; db=get_db(); rows=db.execute_query(\\"SELECT id,pipeline_code,batch_code,status,current_step,error_message FROM geo_pipeline_runs WHERE batch_code='yilan_20260610_worker_smoke1'\\"); [print(r) for r in rows]"`
  );
  assert.match(result.commands[0].notes.join(" "), /合并 1 处换行/);
});

test("P0: identifies multiple commands and ignores explanation text", () => {
  const input = `先验证目录：
cd /srv/app
然后看状态：
git status
说明文字不要被当作命令。`;

  const result = parseCommands(input);

  assert.deepEqual(result.commands.map((item) => item.fixed), ["cd /srv/app", "git status"]);
  assert.equal(result.summary.supported, 2);
});

test("P0: merges backslash continuation commands", () => {
  const input = `/home/venvs/geo/bin/python scripts/create_pipeline_run.py \\
  --customer-code future_vision \\
  --date 2026-06-10 \\
  --dry-run`;

  const result = parseCommands(input);

  assert.equal(result.commands.length, 1);
  assert.equal(
    result.commands[0].fixed,
    "/home/venvs/geo/bin/python scripts/create_pipeline_run.py --customer-code future_vision --date 2026-06-10 --dry-run"
  );
  assert.equal(result.commands[0].stats.removedContinuations, 3);
});

test("P0: keeps JSON argument together", () => {
  const input = `curl -X POST https://api.example.test/jobs \\
  -H "Content-Type: application/json" \\
  -d '{"customer":"future_vision",
       "date":"2026-06-10",
       "dryRun":true}'`;

  const result = parseCommands(input);

  assert.equal(result.commands.length, 1);
  assert.equal(
    result.commands[0].fixed,
    `curl -X POST https://api.example.test/jobs -H "Content-Type: application/json" -d '{"customer":"future_vision", "date":"2026-06-10", "dryRun":true}'`
  );
});

test("P0: marks here-doc as unsupported and does not flatten it", () => {
  const input = `cat <<EOF
hello
world
EOF`;

  const result = parseCommands(input);

  assert.equal(result.commands.length, 1);
  assert.equal(result.commands[0].unsupported, true);
  assert.match(result.commands[0].fixed, /hello\nworld/);
  assert.match(result.commands[0].notes.join(" "), /here-doc/);
});

test("P0: flags high risk commands without blocking output", () => {
  const result = parseCommands("rm -rf /tmp/demo");

  assert.equal(result.commands.length, 1);
  assert.equal(result.commands[0].unsupported, false);
  assert.equal(result.commands[0].fixed, "rm -rf /tmp/demo");
  assert.ok(result.commands[0].risks.some((risk) => risk.includes("rm -rf")));
});

test("P1: strips Markdown fences and shell prompts", () => {
  const input = "```bash\nroot@host:/srv/app# python -c \"print('ok')\"\n```";
  const result = parseCommands(input);

  assert.equal(result.commands.length, 1);
  assert.equal(result.commands[0].fixed, "python -c \"print('ok')\"");
  assert.equal(result.commands[0].stats.removedPrompts, 1);
});

test("P1: does not merge adjacent complete commands", () => {
  const input = `npm install
npm test`;
  const result = parseCommands(input);

  assert.deepEqual(result.commands.map((item) => item.fixed), ["npm install", "npm test"]);
});

test("P1: supports custom command prefixes", () => {
  const result = parseCommands("ansible-playbook deploy.yml", {
    customPrefixes: ["ansible-playbook"]
  });

  assert.equal(result.commands.length, 1);
  assert.equal(result.commands[0].fixed, "ansible-playbook deploy.yml");
});

test("P1: detects SQL destructive statements inside Python command", () => {
  const input = `python -c "db.execute_query(\\"DROP DATABASE prod\\")"`;
  const result = parseCommands(input);

  assert.equal(result.commands.length, 1);
  assert.ok(result.commands[0].risks.some((risk) => risk.includes("DROP DATABASE")));
});
