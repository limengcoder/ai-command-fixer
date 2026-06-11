export const EXAMPLE_INPUT = `验证：

\`\`\`bash
/home/venvs/geo/bin/python -c "from dotenv import load_dotenv; load_dotenv('.env'); from models.database import get_db; db=get_db(); rows=db.execute_query(\\"SELECT id,pipeline_code,batch_code,status,current_step,error_message
FROM geo_pipeline_runs WHERE batch_code='yilan_20260610_worker_smoke1'\\"); [print(r) for r in rows]"
\`\`\`

看 raw：
root@host:/srv/app# /home/venvs/geo/bin/python -c "from dotenv import load_dotenv; load_dotenv('.env'); from models.database import get_db; db=get_db(); rows=db.execute_query(\\"SELECT id,request_id,response_text
FROM geo_raw_responses WHERE created_at >= '2026-06-10' ORDER BY id DESC LIMIT 5\\"); [print(r) for r in rows]"

curl -X POST https://api.example.test/jobs \\
  -H "Content-Type: application/json" \\
  -d '{"customer":"future_vision",
       "date":"2026-06-10",
       "dryRun":true}'

rm -rf /tmp/ai-command-fixer-demo`;
