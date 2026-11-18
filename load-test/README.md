# EntregaFácil Load Testing with k6

## Overview

This directory contains k6 load test scripts for the EntregaFácil API. Tests cover authentication, CRUD operations, route optimization, deliveries, sync, WhatsApp integration, and reporting.

## Prerequisites

1. **Install k6**:
   ```bash
   # macOS
   brew install k6
   
   # Linux
   sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt update && sudo apt install k6
   
   # Windows
   choco install k6
   ```

2. **Environment Variables**:
   ```bash
   export API_URL=https://api-staging.entregafacil.app
   export TEST_USER_EMAIL=loadtest@entregafacil.app
   export TEST_USER_PASSWORD=LoadTest@123
   ```

## Running Tests

### Smoke Test (Quick Validation)
```bash
npm run test:smoke
# or
k6 run --vus 1 --duration 30s k6-script.js
```

### Standard Load Test
```bash
npm run test
# or
k6 run k6-script.js
```

### Staging Environment
```bash
npm run test:staging
```

### Stress Test (High Load)
```bash
npm run test:stress
```

### Soak Test (Long Duration)
```bash
npm run test:soak
```

## Test Scenarios

| Scenario | VUs | Duration | Description |
|----------|-----|----------|-------------|
| Smoke | 1 | 30s | Quick validation |
| Load | 10→50→100 | 16m | Standard load pattern |
| Stress | 200 | 10m | High load breaking point |
| Soak | 50 | 1h | Sustained load |

## Thresholds

| Metric | Threshold |
|--------|-----------|
| HTTP Request Duration (p95) | < 1000ms |
| Error Rate | < 1% |
| Auth Latency (p95) | < 500ms |
| API Latency (p95) | < 800ms |
| Sync Latency (p95) | < 2000ms |
| Upload Latency (p95) | < 5000ms |

## Custom Metrics

- `error_rate`: Failed request rate
- `auth_latency`: Authentication response time
- `api_latency`: General API response time
- `sync_latency`: Sync operation time
- `upload_latency`: File upload time
- `active_users`: Concurrent virtual users

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run Load Tests
  run: |
    cd load-test
    API_URL=${{ secrets.API_STAGING_URL }} \
    TEST_USER_EMAIL=${{ secrets.LOAD_TEST_EMAIL }} \
    TEST_USER_PASSWORD=${{ secrets.LOAD_TEST_PASSWORD }} \
    k6 run k6-script.js
```

### Grafana Cloud k6
```bash
k6 cloud k6-script.js
```

## Test Data Requirements

The test requires a test user with:
- Email: `loadtest@entregafacil.app`
- Password: `LoadTest@123`
- Pre-existing addresses (or will create new ones)

## Results Interpretation

### Pass Criteria
- All thresholds met
- Error rate < 1%
- p95 latencies within limits

### Fail Criteria
- Any threshold exceeded
- Error rate > 1%
- Consistent timeouts

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify test user exists and is active
   - Check password hasn't expired

2. **Rate Limiting**
   - Tests may hit rate limits at high VUs
   - Adjust `RATE_LIMIT_*` env vars for test environment

3. **Network Timeouts**
   - Increase `http_req_duration` thresholds
   - Check API server resources

4. **Database Locks**
   - Concurrent writes may cause locks
   - Use test database with higher connection limits

## Reporting

### HTML Report
```bash
k6 run --out json=results.json k6-script.js
k6 report results.json --format html
```

### JUnit XML (for CI)
```bash
k6 run --out junit=results.xml k6-script.js
```

### Grafana Dashboard
Import the provided dashboard JSON in `grafana-dashboard.json` for real-time visualization.

## Extending Tests

### Adding New Scenarios
1. Create new `group()` in the main function
2. Add custom metrics if needed
3. Update thresholds in `options`

### Parameterizing Tests
Use environment variables for:
- Different user roles
- Various payload sizes
- Different API versions

## Best Practices

1. **Run in staging first** - Never run stress tests on production
2. **Monitor backend metrics** - Watch CPU, memory, DB connections
3. **Gradual ramp-up** - Avoid thundering herd
4. **Clean up test data** - Use teardown or separate test DB
5. **Compare baselines** - Track performance over time