# Security Audit Report - EntregaFácil Mobile & Backend

**Date**: 2024-11-18  
**Auditor**: Kalimaster SAST  
**Scope**: Mobile (React Native/Expo) + Backend (Node.js/Hono)  
**Severity Scale**: CRITICAL > HIGH > MEDIUM > LOW > INFO

---

## Executive Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 1 | 🔴 Open |
| HIGH | 3 | 🟠 Open |
| MEDIUM | 5 | 🟡 Open |
| LOW | 4 | 🟢 Open |
| INFO | 6 | 🔵 Open |

**Total Findings**: 19

---

## CRITICAL Findings

### CRIT-001: Hardcoded JWT Secret Fallback
**File**: `backend/src/middleware/auth.ts:25`
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-min-32-chars-for-hs256';
```
**Risk**: If `JWT_SECRET` env var is not set, all tokens use a known default secret → token forgery, privilege escalation
**Fix**: Remove fallback, fail fast if not configured
```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET must be set');
```

---

## HIGH Findings

### HIGH-001: CORS Misconfiguration for Production
**File**: `backend/src/index.ts:27-28`
```typescript
origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:8081', 'exp://localhost:8081'],
```
**Risk**: Production will default to localhost origins if env var missing → CORS bypass
**Fix**: Require explicit CORS_ORIGIN in production, validate domains

### HIGH-002: Rate Limiter Fail-Open Behavior
**File**: `backend/src/middleware/rateLimit.ts:58-61`
```typescript
} catch (error) {
  // Em caso de erro no Redis, permite a requisição (fail-open)
  console.error('Rate limiter error:', error);
  await next();
}
```
**Risk**: Redis outage = no rate limiting → DoS vulnerability
**Fix**: Fail-closed in production, fail-open only in development

### HIGH-003: Missing Security Headers (Helmet equivalent)
**File**: `backend/src/index.ts` - No CSP, HSTS, X-Frame-Options, etc.
**Risk**: XSS, clickjacking, MIME sniffing, SSL stripping attacks
**Fix**: Add security headers middleware

---

## MEDIUM Findings

### MED-001: No Certificate Pinning for API Calls
**Files**: `mobile/src/shared/api/client.ts`, `mobile/src/shared/hooks/useMinIO.ts`
**Risk**: MITM attacks on API/MinIO/Evolution endpoints
**Fix**: Implement certificate pinning for production

### MED-002: HTTP URLs in Development Config
**File**: `mobile/src/shared/api/client.ts:7-8`
```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.entregafacil.app';
const EVOLUTION_BASE_URL = process.env.EXPO_PUBLIC_EVOLUTION_URL || 'https://evolution.entregafacil.app';
```
**Risk**: Accidental HTTP in production if env vars not set
**Fix**: Enforce HTTPS in production builds

### MED-003: Webhook Without Signature Verification
**File**: `backend/src/routes/whatsapp.ts:213-218`
```typescript
const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
if (secret) {
  const signature = c.req.header('x-signature');
  // TODO: Validar HMAC signature
}
```
**Risk**: Unverified webhook → spoofed WhatsApp status updates
**Fix**: Implement HMAC validation, reject unsigned webhooks in production

### MED-004: Exposed Debug Endpoints
**File**: `backend/src/index.ts:60-63`
```typescript
app.post('/webhook/evolution', async (c) => {
  const body = await c.req.json();
  return c.json({ received: true });
});
```
**Risk**: No auth on webhook endpoint → data injection
**Fix**: Add webhook secret validation, IP allowlist

### MED-005: Sensitive Data in Logs
**File**: `backend/src/middleware/auth.ts:66`
```typescript
logger.warn({ err: error }, 'JWT verification failed');
```
**Risk**: JWT errors may log token fragments
**Fix**: Sanitize error objects before logging

---

## LOW Findings

### LOW-001: Hardcoded Test Credentials
**File**: `mobile/e2e/setup.ts:44`
```typescript
password: 'Teste@123',
```
**Risk**: Test credentials in source control
**Fix**: Use environment variables for test credentials

### LOW-002: Console.log in Production Code
**Files**: Multiple files with `console.log`, `console.error`
**Risk**: Information leakage, performance impact
**Fix**: Use structured logger, remove console.* in production build

### LOW-003: Missing Input Sanitization on File Uploads
**File**: `backend/src/routes/deliveries.ts:214-227`
**Risk**: File type bypass via magic bytes, path traversal in objectName
**Fix**: Validate MIME type + extension, sanitize filenames

### LOW-004: No Request Size Limits
**File**: `backend/src/index.ts` - No body parser limits
**Risk**: DoS via large payloads
**Fix**: Add body size limits per endpoint

---

## INFO Findings

### INFO-001: Dependency Audit Needed
**Status**: No lockfile found for audit
**Action**: Run `npm install` to generate lockfile, then `npm audit`

### INFO-002: Outdated Expo SDK (51)
**Current**: Expo SDK 51  
**Latest**: Check for SDK 52+ security patches

### INFO-003: React Native 0.74.x
**Status**: Current version  
**Action**: Monitor for 0.75 security releases

### INFO-004: Node.js Version
**Current**: 20.x LTS  
**Action**: Ensure Node 20.x security updates applied

### INFO-004: Docker Base Images
**Action**: Scan base images for vulnerabilities (node:20-alpine, etc.)

### INFO-005: Secrets in .env.example
**File**: `mobile/.env.example` - Template only, but verify no real values

---

## Remediation Priority

### Phase 1 (Before Staging Deploy) - CRITICAL + HIGH
1. ✅ Remove JWT_SECRET fallback
2. ✅ Enforce CORS_ORIGIN in production
3. ✅ Change rate limiter to fail-closed
4. ✅ Add security headers (CSP, HSTS, etc.)

### Phase 2 (Before Production) - MEDIUM
5. ✅ Certificate pinning for API/MinIO/Evolution
6. ✅ Webhook HMAC validation
7. ✅ Enforce HTTPS in production builds
8. ✅ Input sanitization on uploads

### Phase 3 (Post-Launch) - LOW + INFO
9. ✅ Remove test credentials from source
8. ✅ Dependency audit & updates
9. ✅ Request size limits
10. ✅ Structured logging without console.*

---

## Compliance Notes

### LGPD (Brazilian GDPR)
- ✅ Opt-in for WhatsApp notifications
- ✅ Data minimization (only necessary fields)
- ⚠️ Need: Data retention policy documentation
- ⚠️ Need: DPO contact in privacy policy
- ⚠️ Need: Data breach notification procedure

### OWASP Mobile Top 10 2024
| Category | Status |
|----------|--------|
| M1: Improper Credential Usage | ⚠️ JWT fallback |
| M2: Inadequate Supply Chain Security | ⚠️ No dep audit |
| M3: Insecure Authentication/Authorization | ✅ JWT + refresh |
| M4: Insufficient Input/Output Validation | ⚠️ Upload validation |
| M5: Insecure Communication | ⚠️ No cert pinning |
| M6: Inadequate Privacy Controls | ✅ Opt-in |
| M7: Insufficient Binary Protections | ⚠️ No obfuscation |
| M8: Security Misconfiguration | ⚠️ CORS, headers |
| M9: Insecure Data Storage | ✅ SecureStore/AsyncStorage |
| M10: Insufficient Cryptography | ✅ HS256 + HTTPS |

---

## Recommended Tools Integration

### SAST (Static Analysis)
```bash
# Add to CI
npm install -g @typescript-eslint/parser eslint-plugin-security
# Or use: semgrep, codeql, sonarqube
```

### DAST (Dynamic Analysis)
```bash
# OWASP ZAP for API testing
docker run -t owasp/zap2docker-stable zap-api-scan.py -t https://api-staging.entregafacil.app
```

### Dependency Scanning
```bash
# Snyk / Dependabot / npm audit
npx audit-ci --config audit-ci.json
```

### Secret Scanning
```bash
# GitLeaks / TruffleHog in pre-commit
gitleaks detect --source . --verbose
```

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Security Auditor | Kalimaster | 2024-11-18 | ✅ |
| Lead Developer | | | |
| DevOps Engineer | | | |
| DPO (LGPD) | | | |

---

*This report should be reviewed and findings remediated before production deployment.*