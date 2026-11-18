// k6 Load Test Script for EntregaFácil API
// Run with: k6 run --vus 50 --duration 5m load-test/k6-script.js

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// Custom metrics
const errorRate = new Rate('error_rate');
const authLatency = new Trend('auth_latency');
const apiLatency = new Trend('api_latency');
const syncLatency = new Trend('sync_latency');
const uploadLatency = new Trend('upload_latency');
const activeUsers = new Counter('active_users');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Spike to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],     // 95% of requests < 1s
    http_req_failed: ['rate<0.01'],        // Error rate < 1%
    auth_latency: ['p(95)<500'],           // Auth < 500ms
    api_latency: ['p(95)<800'],            // API < 800ms
    sync_latency: ['p(95)<2000'],          // Sync < 2s
    upload_latency: ['p(95)<5000'],        // Upload < 5s
  },
  // Cloud execution (optional)
  // ext: { loadimpact: { projectID: 12345, name: 'EntregaFácil Load Test' } },
};

// Base URL from environment
const BASE_URL = __ENV.API_URL || 'https://api-staging.entregafacil.app';
const TEST_USER_EMAIL = __ENV.TEST_USER_EMAIL || 'loadtest@entregafacil.app';
const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || 'LoadTest@123';

// Test data
const testAddresses = new SharedArray('addresses', function() {
  return [
    { nome: 'Entrega 1', enderecoFormatado: 'Av. Paulista, 1000 - São Paulo/SP', latitude: -23.5733, longitude: -46.6417 },
    { nome: 'Entrega 2', enderecoFormatado: 'Rua Augusta, 500 - São Paulo/SP', latitude: -23.5609, longitude: -46.6573 },
    { nome: 'Entrega 3', enderecoFormatado: 'Av. Faria Lima, 2000 - São Paulo/SP', latitude: -23.5882, longitude: -46.6819 },
    { nome: 'Entrega 4', enderecoFormatado: 'Rua Oscar Freire, 800 - São Paulo/SP', latitude: -23.5628, longitude: -46.6689 },
    { nome: 'Entrega 5', enderecoFormatado: 'Av. Brigadeiro Faria Lima, 3000 - São Paulo/SP', latitude: -23.5945, longitude: -46.6823 },
  ];
});

// Authentication token storage
let authToken = null;
let refreshToken = null;

// Helper functions
function getHeaders(token = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Request-ID': `k6-${__VU}-${__ITER}`,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function checkResponse(response, expectedStatus = 200) {
  const success = check(response, {
    [`status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    'response has body': (r) => r.body && r.body.length > 0,
  });
  errorRate.add(!success);
  return success;
}

// Main test function
export default function () {
  activeUsers.add(1);
  
  group('Authentication', () => {
    // Login
    const loginStart = new Date();
    const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    }), { headers: getHeaders() });
    
    authLatency.add(new Date() - loginStart);
    checkResponse(loginRes, 200);
    
    if (loginRes.status === 200) {
      const data = JSON.parse(loginRes.body);
      authToken = data.token;
      refreshToken = data.refreshToken;
    }
  });

  if (!authToken) {
    console.log('Failed to authenticate, skipping API tests');
    return;
  }

  group('Addresses CRUD', () => {
    // Create addresses
    const addressIds = [];
    for (const addr of testAddresses) {
      const createStart = new Date();
      const createRes = http.post(`${BASE_URL}/api/v1/addresses`, JSON.stringify(addr), { headers: getHeaders(authToken) });
      apiLatency.add(new Date() - createStart);
      
      if (checkResponse(createRes, 201)) {
        const data = JSON.parse(createRes.body);
        addressIds.push(data.id);
      }
    }

    // List addresses
    const listStart = new Date();
    const listRes = http.get(`${BASE_URL}/api/v1/addresses`, { headers: getHeaders(authToken) });
    apiLatency.add(new Date() - listStart);
    checkResponse(listRes, 200);

    // Get single address
    if (addressIds.length > 0) {
      const getStart = new Date();
      const getRes = http.get(`${BASE_URL}/api/v1/addresses/${addressIds[0]}`, { headers: getHeaders(authToken) });
      apiLatency.add(new Date() - getStart);
      checkResponse(getRes, 200);
    }
  });

  group('Routes CRUD', () => {
    // Create route with waypoints
    const waypoints = testAddresses.slice(0, 3).map((addr, index) => ({
      enderecoId: addr.id || `test-${index}`,
      ordem: index + 1,
    }));

    const routeData = {
      nome: `Rota Load Test ${__VU}-${__ITER}`,
      data: new Date().toISOString().split('T')[0],
      waypoints,
    };

    const createRouteStart = new Date();
    const createRouteRes = http.post(`${BASE_URL}/api/v1/routes`, JSON.stringify(routeData), { headers: getHeaders(authToken) });
    apiLatency.add(new Date() - createRouteStart);
    
    let routeId = null;
    if (checkResponse(createRouteRes, 201)) {
      const data = JSON.parse(createRouteRes.body);
      routeId = data.id;
    }

    // Optimize route
    if (routeId) {
      const optStart = new Date();
      const optRes = http.post(`${BASE_URL}/api/v1/routes/${routeId}/optimize`, '', { headers: getHeaders(authToken) });
      apiLatency.add(new Date() - optStart);
      checkResponse(optRes, 200);

      // Start route
      const startStart = new Date();
      const startRes = http.post(`${BASE_URL}/api/v1/routes/${routeId}/start`, '', { headers: getHeaders(authToken) });
      apiLatency.add(new Date() - startStart);
      checkResponse(startRes, 200);
    }

    // List routes
    const listRoutesStart = new Date();
    const listRoutesRes = http.get(`${BASE_URL}/api/v1/routes`, { headers: getHeaders(authToken) });
    apiLatency.add(new Date() - listRoutesStart);
    checkResponse(listRoutesRes, 200);
  });

  group('Deliveries/Proof', () => {
    // Simulate delivery proof creation
    const proofData = {
      rotaId: 'test-route',
      waypointId: 'test-waypoint',
      enderecoId: 'test-address',
      fotoUrl: 'https://example.com/proof.jpg',
      fotoHash: 'abc123',
      latitude: -23.5733,
      longitude: -46.6417,
      accuracy: 5.0,
      timestamp: new Date().toISOString(),
      observacao: 'Load test delivery',
    };

    const proofStart = new Date();
    const proofRes = http.post(`${BASE_URL}/api/v1/deliveries`, JSON.stringify(proofData), { headers: getHeaders(authToken) });
    apiLatency.add(new Date() - proofStart);
    checkResponse(proofRes, [201, 404]); // 404 if route doesn't exist
  });

  group('Sync Operations', () => {
    // Batch sync
    const operations = [
      { type: 'create', entity: 'address', payload: { test: true } },
      { type: 'update', entity: 'route', payload: { test: true } },
    ];

    const syncStart = new Date();
    const syncRes = http.post(`${BASE_URL}/api/v1/sync/batch`, JSON.stringify({ operations }), { headers: getHeaders(authToken) });
    syncLatency.add(new Date() - syncStart);
    checkResponse(syncRes, 200);

    // Get server changes
    const changesStart = new Date();
    const changesRes = http.get(`${BASE_URL}/api/v1/sync/changes?since=${new Date(Date.now() - 3600000).toISOString()}`, { headers: getHeaders(authToken) });
    syncLatency.add(new Date() - changesStart);
    checkResponse(changesRes, 200);
  });

  group('WhatsApp', () => {
    // Test connection
    const connStart = new Date();
    const connRes = http.get(`${BASE_URL}/api/v1/whatsapp/connection/test-instance`, { headers: getHeaders(authToken) });
    apiLatency.add(new Date() - connStart);
    checkResponse(connRes, [200, 404]); // 404 if not configured

    // Get templates
    const tmplStart = new Date();
    const tmplRes = http.get(`${BASE_URL}/api/v1/whatsapp/templates?instance=test-instance`, { headers: getHeaders(authToken) });
    apiLatency.add(new Date() - tmplStart);
    checkResponse(tmplRes, [200, 404]);
  });

  group('Reports', () => {
    // Dashboard stats
    const statsStart = new Date();
    const statsRes = http.get(`${BASE_URL}/api/v1/reports/dashboard`, { headers: getHeaders(authToken) });
    apiLatency.add(new Date() - statsStart);
    checkResponse(statsRes, 200);

    // Export CSV
    const csvStart = new Date();
    const csvRes = http.get(`${BASE_URL}/api/v1/reports/routes/test-route/csv`, { headers: getHeaders(authToken) });
    apiLatency.add(new Date() - csvStart);
    checkResponse(csvRes, [200, 404]);
  });

  // Sleep between iterations (simulate user think time)
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

// Teardown
export function teardown(data) {
  // Cleanup if needed
  console.log('Load test completed');
}

// Handle test lifecycle
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  console.log(`Test user: ${TEST_USER_EMAIL}`);
  
  // Verify API is reachable
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    throw new Error(`API health check failed: ${healthRes.status}`);
  }
  console.log('API health check passed');
}