import http from 'k6/http';
import { check, fail } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const endpoint = __ENV.LOAD_TEST_API_URL || '';
const projectRef = __ENV.LOAD_TEST_PROJECT_REF || '';
const productionRef = 'cjzwbnjqchtlguqwdlfo';
if (!/^[a-z]{20}$/.test(projectRef) || projectRef === productionRef) {
  throw new Error('An isolated, non-production Supabase project ref is required.');
}
const expected = 'https://' + projectRef + '.supabase.co/functions/v1/dear-myself';
if (endpoint !== expected) {
  throw new Error('LOAD_TEST_API_URL must exactly match the isolated project Edge Function endpoint.');
}

const failures = new Rate('submission_failures');
const latency = new Trend('submission_latency_ms', true);
export const options = {
  scenarios: Object.fromEntries([50, 100, 150, 200].map((users, i) => [
    'users_' + users,
    {
      executor: 'per-vu-iterations',
      vus: users,
      iterations: 1,
      maxDuration: '2m',
      startTime: (i * 150) + 's',
      gracefulStop: '10s',
    },
  ])),
  thresholds: {
    submission_failures: ['rate==0'],
    submission_latency_ms: ['p(95)<3000'],
  },
};

function uuid() {
  const hex = '0123456789abcdef';
  let value = '';
  for (let i = 0; i < 36; i++) {
    if ([8, 13, 18, 23].includes(i)) value += '-';
    else if (i === 14) value += '4';
    else if (i === 19) value += hex[Math.floor(Math.random() * 4) + 8];
    else value += hex[Math.floor(Math.random() * 16)];
  }
  return value;
}

export default function () {
  const key = uuid();
  const payload = JSON.stringify({
    action: 'submit',
    answer1: 'LOAD_TEST_ONLY: synthetic first answer ' + key,
    answer2: 'LOAD_TEST_ONLY: synthetic second answer ' + key,
    submissionKey: key,
  });
  const response = http.post(endpoint, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: '20s',
    tags: { action: 'submit', stage: __ENV.K6_SCENARIO || 'all' },
  });
  const ok = check(response, {
    'submission returned 201': r => r.status === 201,
    'submission returned an id': r => {
      if (r.status !== 201) return false;
      try { return !!JSON.parse(r.body).id; } catch { return false; }
    },
  });
  failures.add(!ok);
  latency.add(response.timings.duration);
}
