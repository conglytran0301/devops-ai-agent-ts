import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  scenarios: {
    stress_test: {
      executor: 'constant-vus',
      vus: 20,
      duration: '2m',
    }
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate must be below 10%
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function() {
  // Weighted endpoint selection (more realistic traffic)
  const endpoints = [
    { path: '/', weight: 70 },        // Main page gets most traffic
    { path: '/health', weight: 20 },  // Health checks
    { path: '/nginx_status', weight: 10 } // Status monitoring
  ];
  
  // Select endpoint based on weight
  const random = Math.random() * 100;
  let cumulative = 0;
  let selectedEndpoint = '/';
  
  for (const endpoint of endpoints) {
    cumulative += endpoint.weight;
    if (random <= cumulative) {
      selectedEndpoint = endpoint.path;
      break;
    }
  }
  
  try {
    let response = http.get(`${BASE_URL}${selectedEndpoint}`, {
      timeout: '10s',
      headers: {
        'User-Agent': 'k6-load-test/1.0',
      }
    });
    
    // Comprehensive checks
    let success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'response time < 1s': (r) => r.timings.duration < 1000,
      'has content': (r) => r.body && r.body.length > 0,
    });
    
    // Only log failures to reduce noise
    if (response.status !== 200) {
      console.log(`Failed request to ${selectedEndpoint}: status=${response.status}, time=${response.timings.duration}ms`);
    }
    
  } catch (error) {
    console.log(`Request error to ${selectedEndpoint}: ${error}`);
  }
  
  // Variable sleep for more realistic traffic pattern
  sleep(Math.random() * 0.5 + 0.1); // 0.1-0.6 seconds
}

export function handleSummary(data) {
  const requests = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const failures = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0;
  const avgDuration = data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg : 0;
  const p95Duration = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0;
  
  return {
    stdout: `
🎯 K6 Load Test Complete
========================
📊 Total Requests: ${requests}
❌ Failure Rate: ${(failures * 100).toFixed(2)}%
✅ Success Rate: ${((1 - failures) * 100).toFixed(2)}%
⏱️  Average Response Time: ${avgDuration.toFixed(2)}ms
📈 95th Percentile: ${p95Duration.toFixed(2)}ms
🎯 Test Status: ${failures < 0.1 && p95Duration < 500 ? '✅ PASSED' : '❌ FAILED'}
    `,
  };
}