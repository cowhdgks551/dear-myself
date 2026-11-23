# Dear. Myself load test (isolated environments only)

This k6 test sends real HTTP POST submissions. **NEVER run it against the production Supabase project** (cjzwbnjqchtlguqwdlfo). The test requires an isolated Supabase project with a copy of the Edge Function and schema.

## Run

Install k6, then:

```bash
LOAD_TEST_API_URL=https://YOUR-TEST-PROJECT.supabase.co/functions/v1/dear-myself \
LOAD_TEST_PROJECT_REF=YOUR-TEST-PROJECT \
k6 run tests/load/submit.js
```

The script rejects the production project ref and any endpoint that does not match the explicitly supplied test project ref.

It uses 50, 100, 150 and 200 concurrent virtual users in successive scenarios. Each virtual user submits a unique synthetic letter once per stage. The expected volume is 500 test submissions. It measures HTTP failures and latency, and uses unique UUID submission keys. For real tests, use an isolated DB; no production letter is inserted, deleted, drawn, or changed.

Success targets: 0 HTTP errors, p95 < 3000ms. For a 99.9% success criterion, a 500-request sample can only pass with zero failures. The results alone do not prove mobile network or browser reliability.
