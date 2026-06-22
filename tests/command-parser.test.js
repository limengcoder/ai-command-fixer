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

test("P0: keeps pasted command-like lines as one command by default", () => {
  const input = `先验证目录：
cd /srv/app
然后看状态：
git status
说明文字不要被当作命令。`;

  const result = parseCommands(input);

  assert.equal(result.commands.length, 1);
  assert.equal(result.commands[0].fixed, "cd /srv/app 然后看状态： git status 说明文字不要被当作命令。");
  assert.equal(result.summary.supported, 1);
});

test("P0: recognizes folded certificate import pipeline as one supported command", () => {
  const input = `echo | openssl s_client -showcerts -connect gitea.mstudios.cn:443 -servername gitea.mstudios.cn 2>/dev/null | sed -n '/BEGIN CERTIFICATE/,/END CERTIFICATE/p' > /usr/local/share/ca-
  certificates/gitea-mstudios-cn.crt && update-ca-certificates`;

  const result = parseCommands(input);

  assert.equal(result.commands.length, 1);
  assert.equal(result.commands[0].unsupported, false);
  assert.equal(result.summary.supported, 1);
  assert.match(result.commands[0].fixed, /echo \| openssl s_client/);
  assert.match(result.commands[0].fixed, /2>\/dev\/null \| sed -n/);
  assert.match(result.commands[0].fixed, /> \/usr\/local\/share\/ca-certificates\/gitea-mstudios-cn\.crt/);
  assert.match(result.commands[0].fixed, /&& update-ca-certificates/);
  assert.doesNotMatch(result.commands[0].fixed, /ca- certificates/);
  assert.doesNotMatch(result.commands[0].fixed, /ca-\s+certificates/);
});

test("P0: fallback command detection ignores plain Chinese prose", () => {
  const input = "这是一段纯中文说明文字，没有任何需要执行的终端命令。";

  const result = parseCommands(input);

  assert.equal(result.commands.length, 0);
  assert.equal(result.summary.supported, 0);
});

test("P0: fallback command detection starts at cd without prepending prose", () => {
  const input = `先进入项目目录后再执行检查：
cd /srv/app && npm test`;

  const result = parseCommands(input);

  assert.equal(result.commands.length, 1);
  assert.match(result.commands[0].fixed, /^cd \/srv\/app && npm test/);
  assert.doesNotMatch(result.commands[0].fixed, /先进入项目目录/);
});

test("P0: can identify multiple commands when auto split mode is explicit", () => {
  const input = `先验证目录：
cd /srv/app
然后看状态：
git status
说明文字不要被当作命令。`;

  const result = parseCommands(input, { splitMode: "auto" });

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

test("P0: auto split mode does not use shell-like fallback starts", () => {
  const input = `unknown-tool --write /tmp/demo
echo ok`;

  const result = parseCommands(input, { splitMode: "auto" });

  assert.deepEqual(result.commands.map((item) => item.fixed), ["echo ok"]);
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
  const result = parseCommands(input, { splitMode: "auto" });

  assert.deepEqual(result.commands.map((item) => item.fixed), ["npm install", "npm test"]);
});

test("P1: auto split mode keeps if and while shell blocks together", () => {
  const ifResult = parseCommands(
    `if [ -f ready.flag ]; then python scripts/run.py --once;
fi
git status`,
    { splitMode: "auto" }
  );
  const whileResult = parseCommands(
    `while true; do python scripts/run.py --once;
done
npm test`,
    { splitMode: "auto" }
  );

  assert.deepEqual(ifResult.commands.map((item) => item.fixed), [
    "if [ -f ready.flag ]; then python scripts/run.py --once; fi",
    "git status"
  ]);
  assert.deepEqual(whileResult.commands.map((item) => item.fixed), [
    "while true; do python scripts/run.py --once; done",
    "npm test"
  ]);
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

test("P1: repairs folded ISO dates inside quoted SQL parameters", () => {
  const input = `cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'from dotenv import load_dotenv; load_dotenv(".env"); from models.database import get_db; db=get_db(); rows=db.execute_query("SELECT * FROM geo_raw_responses WHERE stat_date BETWEEN %s AND %s", ("2026
  -06-03", "2026-06-08")); [print(r) for r in rows]'`;

  const result = parseCommands(input);

  assert.equal(result.commands.length, 1);
  assert.match(result.commands[0].fixed, /"2026-06-03"/);
  assert.doesNotMatch(result.commands[0].fixed, /2026\s+-06-03/);
  assert.ok(result.commands[0].stats.repairedBrokenTokens > 0);
  assert.deepEqual(result.commands[0].repairs.map((repair) => repair.after), ["2026-06-03"]);
});

test("P1: repairs folded filename tokens and strips macOS zsh prompts", () => {
  const input = `wangxb@bogon magneto %   cd /Users/wangxb/Project/magneto && git fetch origin feature/geo_project_dynamic && git restore --source=FETCH_HEAD --worktree -- "app/geo/output/jingdong_batch_reports/jingdong_618_activity_analysis_20260609_jingdong_
  20260609_temp10_national_10x_pipeline.xlsx"`;

  const result = parseCommands(input);

  assert.equal(result.commands.length, 1);
  assert.match(
    result.commands[0].fixed,
    /jingdong_618_activity_analysis_20260609_jingdong_20260609_temp10_national_10x_pipeline\.xlsx/
  );
  assert.doesNotMatch(result.commands[0].fixed, /jingdong_\s+20260609/);
  assert.equal(result.commands[0].stats.removedPrompts, 1);
});

test("P1: only repairs high-confidence same-line token spaces", () => {
  const input = `python -c 'print("2026  -06-03"); print("jingdong_  20260609_temp10")'`;
  const result = parseCommands(input);

  assert.equal(result.commands.length, 1);
  assert.match(result.commands[0].fixed, /2026  -06-03/);
  assert.match(result.commands[0].fixed, /jingdong_20260609_temp10/);
  assert.ok(result.commands[0].repairs.some((repair) => repair.type === "inferred-token"));
});

test("P1: repairs folded SQL identifiers without joining SQL keyword boundaries", () => {
  const input = `root@iZ2zeakc1dke7l2mrm324wZ:/home/magneto/app/geo#   cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'from dotenv import load_dotenv; load_dotenv(".env"); from models.database import get_db; db=get_db(); rows=db.execute_query("SELECT r.stat_date,  COALESCE(r.batch_code,t.batch_code,t.trig
gered_by,%s) batch
_code, r.platform_
name, COUNT(*) cnt, COUNT(DISTINCT r.
question_id) qcnt, SUM(CASE WHEN r.
answer_content IS NULL OR r.answer_content=%s THEN 1 ELSE 0 END) empty_cnt FROM  geo_
raw_responses r LEFT JOIN geo_monitor_tasks t ON t.customer_id=r.customer_id AND t.task_id=r.task_id WHERE r.customer_id=(SELECT id FROM geo_customers WHERE customer_code=%s LIMIT 1) AND r.stat_date BETWEEN %s AND %s GROUP BY  r.stat_date, COALESCE(r.batch_code,t.batch_code,t.
triggered_by,%s), r.platform_name ORDER BY r.stat_date,batch_code,r.platform_name", ("<NULL>", "", "jingdong", "2026-
06-03", "2026-06-08", "<NULL>")); [print(r) for r in rows]'`;

  const result = parseCommands(input);
  const fixed = result.commands[0].fixed;

  assert.equal(result.commands.length, 1);
  assert.match(fixed, /t\.triggered_by,%s\) batch_code/);
  assert.match(fixed, /r\.platform_name/);
  assert.match(fixed, /r\.question_id/);
  assert.match(fixed, /r\.answer_content/);
  assert.match(fixed, /geo_raw_responses/);
  assert.match(fixed, /"2026-06-03"/);
  assert.doesNotMatch(fixed, /trig gered_by/);
  assert.doesNotMatch(fixed, /batch _code/);
  assert.doesNotMatch(fixed, /SELECTr/);
  assert.ok(result.commands[0].repairs.some((repair) => repair.after.includes("triggered_by")));
});

test("P1: preserves SQL keyword spacing and repairs day-split date in long union command", () => {
  const input = `cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'from dotenv import load_dotenv; load_dotenv(".env"); from models.database import get_db; db=get_db(); rows=db.execute_query("SELECT %s AS source, COUNT(*) cnt FROM
  geo_raw_responses WHERE stat_date=%s UNION ALL SELECT %s AS source, COUNT(*) cnt FROM
 geo_dashboard_summary WHERE stat_date=%s", ("raw", "2026-06-
  12", "summary", "2026-06-
  12")); [print(r) for r in rows]'`;

  const result = parseCommands(input);
  const fixed = result.commands[0].fixed;

  assert.equal(result.commands.length, 1);
  assert.match(fixed, /FROM geo_raw_responses WHERE/);
  assert.match(fixed, /UNION ALL SELECT %s AS source, COUNT\(\*\) cnt FROM geo_dashboard_summary WHERE/);
  assert.match(fixed, /"2026-06-12"/);
  assert.doesNotMatch(fixed, /FROMgeo_raw_responses/);
  assert.doesNotMatch(fixed, /FROMgeo_dashboard_summary/);
  assert.doesNotMatch(fixed, /2026-06-\s+12/);
  assert.ok(result.commands[0].repairs.some((repair) => repair.type === "date" && repair.after === "2026-06-12"));
});

test("P1: repairs manually flattened quoted field names without touching SQL spacing", () => {
  const input = `cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'import csv; from pathlib import Path; from dotenv import load_dotenv; load_dotenv(".env"); from models.database import get_db; db=get_db(); out=Path("output/raw_exports/future_vision_20260606_20260612_raw.csv"); out.parent.mkdir(parents=True, exist_ok=True); rows=db.execute_query("SELECT r.id,COALESCE(r.batch_code,t.batch_code,t.triggered_by) AS  batch_code,r.media_content,  r.created_at FROM geo_raw_responses r WHERE c.customer_code=%s", ("future_vision",)); fields=["id","batch_code","citation_l  ist","reasoning_process"]; print({"rows":  len(fields)})'`;

  const result = parseCommands(input);
  const fixed = result.commands[0].fixed;

  assert.equal(result.commands.length, 1);
  assert.match(fixed, /"citation_list"/);
  assert.match(fixed, /AS  batch_code/);
  assert.match(fixed, /r\.media_content,  r\.created_at/);
  assert.match(fixed, /"rows":  len\(fields\)/);
  assert.doesNotMatch(fixed, /citation_l  ist/);
  assert.ok(result.commands[0].repairs.some((repair) => repair.type === "inferred-token" && repair.after === "citation_list"));
});

test("P1: repairs real-newline quoted field names outside SQL strings", () => {
  const input = `cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'fields=["id","citation_l
  ist","reasoning_process"]; print(fields)'`;

  const result = parseCommands(input);
  const fixed = result.commands[0].fixed;

  assert.equal(result.commands.length, 1);
  assert.match(fixed, /"citation_list"/);
  assert.doesNotMatch(fixed, /citation_l\s+ist/);
  assert.ok(result.commands[0].repairs.some((repair) => repair.type === "inferred-token" && repair.after === "citation_list"));
});

test("P1: repairs long CLI option names split after a hyphen by real newlines", () => {
  const input = `root@iZ2zeakc1dke7l2mrm324wZ:/home/magneto/app/geo# cd /home/magneto/app/geo && /home/venvs/geo/bin/python scripts/refresh_completed_results.py --customer-code guanghai_yinghua --date 2026-06-18 --batch-code guanghai_yinghua_20260618_daily --status-
  concurrency 10 --result-
  concurrency 8 --request-
  interval 0.2 --platform deepseek --platform yuanbao`;

  const result = parseCommands(input);
  const fixed = result.commands[0].fixed;

  assert.equal(result.commands.length, 1);
  assert.match(fixed, /--status-concurrency 10/);
  assert.match(fixed, /--result-concurrency 8/);
  assert.match(fixed, /--request-interval 0\.2/);
  assert.match(fixed, /--batch-code guanghai_yinghua_20260618_daily/);
  assert.match(fixed, /--platform deepseek --platform yuanbao/);
  assert.doesNotMatch(fixed, /--status-\s+concurrency/);
  assert.doesNotMatch(fixed, /--result-\s+concurrency/);
  assert.doesNotMatch(fixed, /--request-\s+interval/);
  assert.doesNotMatch(fixed, /--batch-codeguanghai_yinghua_20260618_daily/);
  assert.doesNotMatch(fixed, /--platformdeepseek/);
  assert.ok(result.commands[0].repairs.some((repair) => repair.type === "option" && repair.after === "--status-concurrency"));
  assert.match(result.commands[0].notes.join(" "), /命令参数名/);
});

test("P1: covers long-command manual regression cases", () => {
  const cases = [
    {
      name: "fields list token",
      input: `cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'import csv; fields=["id","customer_id","task_id","reference_list","citation_l
  ist","reasoning_process","recommended_questions","media_content","created_at"]; print(fields)'`,
      includes: ['"citation_list"'],
      excludes: [/citation_l\s+ist/]
    },
    {
      name: "date range",
      input: `cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'from datetime import date; start="2026-
06-06"; end="2026-
06-12"; print({"start": start, "end": end})'`,
      includes: ['"2026-06-06"', '"2026-06-12"'],
      excludes: [/2026-\s+06-06/, /2026-\s+06-12/]
    },
    {
      name: "long filename",
      input: `cd /Users/wangxb/Project/magneto && git restore --source=FETCH_HEAD --worktree -- "app/geo/output/jingdong_batch_reports/jingdong_618_activity_analysis_20260609_jingdong_
20260609_temp10_national_10x_pipeline.xlsx"`,
      includes: ["jingdong_618_activity_analysis_20260609_jingdong_20260609_temp10_national_10x_pipeline.xlsx"],
      excludes: [/jingdong_\s+20260609/]
    },
    {
      name: "SQL table name",
      input: `cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'sql="SELECT id,platform_name,question_id,answer_content FROM geo_
raw_responses WHERE batch_code=%s ORDER BY platform_name,question_id"; print(sql)'`,
      includes: ["FROM geo_raw_responses WHERE"],
      excludes: [/geo_\s+raw_responses/, /FROMgeo_raw_responses/]
    },
    {
      name: "Python variable name",
      input: `cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'reference_list=["a","b"]; citation_list=["c"]; recommended_
questions=["q1","q2"]; media_content=[]; print({"reference_list": reference_list, "citation_list": citation_list, "recommended_questions": recommended_questions, "media_content": media_content})'`,
      includes: ["recommended_questions=[", '"recommended_questions": recommended_questions'],
      excludes: [/recommended_\s+questions/]
    },
    {
      name: "path directory token",
      input: `cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'from pathlib import Path; out=Path("output/raw_
exports/future_vision_20260606_20260612_raw.csv"); print(out)'`,
      includes: ['Path("output/raw_exports/future_vision_20260606_20260612_raw.csv")'],
      excludes: [/raw_\s+exports/]
    },
    {
      name: "mixed long command",
      input: `cd /home/magneto/app/geo && /home/venvs/geo/bin/python -c 'from pathlib import Path; stat_date_start="2026-
06-06"; stat_date_end="2026-
06-12"; out=Path("output/raw_exports/future_vision_
20260606_20260612_raw.csv"); fields=["id","platform_name","citation_l
ist","reasoning_process"]; sql="SELECT r.platform_
name,r.citation_list FROM geo_
raw_responses r WHERE r.stat_date BETWEEN %s AND %s"; print({"out": str(out), "fields": fields, "sql": sql, "range": [stat_date_start, stat_date_end]})'`,
      includes: [
        '"2026-06-06"',
        '"2026-06-12"',
        "future_vision_20260606_20260612_raw.csv",
        '"citation_list"',
        "r.platform_name",
        "FROM geo_raw_responses r"
      ],
      excludes: [/2026-\s+06/, /future_vision_\s+20260606/, /citation_l\s+ist/, /platform_\s+name/, /geo_\s+raw_responses/]
    }
  ];

  for (const item of cases) {
    const result = parseCommands(item.input);
    const fixed = result.commands[0]?.fixed ?? "";

    assert.equal(result.commands.length, 1, item.name);
    for (const expected of item.includes) {
      assert.ok(fixed.includes(expected), `${item.name}: expected ${expected}`);
    }
    for (const pattern of item.excludes) {
      assert.doesNotMatch(fixed, pattern, item.name);
    }
    assert.ok(result.commands[0].repairs.length > 0, `${item.name}: expected repair records`);
  }
});
