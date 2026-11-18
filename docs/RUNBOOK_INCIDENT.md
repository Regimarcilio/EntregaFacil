# Incident Response Runbook
## EntregaFácil Mobile & Backend

> **Purpose**: Standardized incident response procedures for production issues
> **Scope**: Mobile app (iOS/Android) + Backend API + Infrastructure
> **SLA**: Critical: 15min response, High: 1h, Medium: 4h, Low: 24h

---

## 🚨 Incident Classification

| Severity | Definition | Response Time | Examples |
|----------|------------|---------------|----------|
| **SEV-1 (Critical)** | Service unavailable, data loss, security breach | 15 min | API down, crash loop, data leak, payment failure |
| **SEV-2 (High)** | Major feature broken, significant user impact | 1 hour | WhatsApp not sending, sync failing, map offline |
| **SEV-3 (Medium)** | Minor feature degraded, workaround exists | 4 hours | CSV import slow, push delayed, minor UI bug |
| **SEV-4 (Low)** | Cosmetic, non-urgent, enhancement | 24 hours | Typo, color tweak, docs update |

---

## 📞 Escalation Contacts

| Role | Name | Phone | Slack | Email | Backup |
|------|------|-------|-------|-------|--------|
| **Incident Commander** | | | | | |
| **Mobile Tech Lead** | | | | | |
| **Backend Tech Lead** | | | | | |
| **DevOps/Infra** | | | | | |
| **Security Officer** | | | | | |
| **Product Owner** | | | | | |
| **DPO (LGPD)** | | | | | |

---

## 🔄 Incident Lifecycle

```
DETECT → TRIAGE → INVESTIGATE → RESOLVE → VERIFY → CLOSE → RETRO
```

---

## 📋 Incident Response Procedures

### Phase 1: DETECT (0-5 min)
**Trigger**: Alert (PagerDuty/Sentry/Grafana) or User Report

**Actions**:
1. Acknowledge alert in PagerDuty/Slack
2. Create incident channel: `#incident-YYYYMMDD-XXX`
3. Post initial status: "🔴 INVESTIGATING - [Service] - [Brief description]"
4. Assign Incident Commander (first responder)
5. Start timeline document

**Template Message**:
```
🚨 INCIDENT DECLARED
Severity: SEV-[1-4]
Service: [Mobile API / Evolution API / Database / etc.]
Impact: [User-facing description]
Commander: @name
Channel: #incident-YYYYMMDD-XXX
Started: YYYY-MM-DD HH:MM UTC
```

---

### Phase 2: TRIAGE (5-15 min)
**Goal**: Confirm severity, scope, and initial hypothesis

**Checklist**:
- [ ] Verify alert is real (not false positive)
- [ ] Check dashboards: Grafana, Sentry, Loki
- [ ] Check dependent services: DB, Redis, MinIO, OSRM, Evolution
- [ ] Determine blast radius: % users affected, regions, features
- [ ] Classify severity (SEV-1/2/3/4)
- [ ] Notify stakeholders per escalation matrix

**Escalation Matrix**:
| Severity | Notify Immediately | Notify Within 1h |
|----------|-------------------|------------------|
| SEV-1 | All leads + PO + Security | DPO + Exec |
| SEV-2 | Tech Leads + QA | PO |
| SEV-3 | On-call engineer | Tech Lead (next day) |
| SEV-4 | Ticket only | Sprint planning |

---

### Phase 3: INVESTIGATE (15 min - 4h)
**Goal**: Root cause analysis

**Standard Checks by Service**:

#### Mobile App Issues
```bash
# Sentry - Check crash trends
# Filter: release=v1.0.0, last 1h
# Top crashes: Group by error.type, device.os

# Device logs (if user provided)
# iOS: Settings > Privacy > Analytics > Analytics Data
# Android: Settings > Developer > Bug report
```

#### Backend API Issues
```bash
# Health checks
curl https://api-staging.entregafacil.app/health
curl https://api.entregafacil.app/health

# Database
psql -h postgres -U entregafacil -c "SELECT * FROM pg_stat_activity WHERE state != 'idle';"

# Redis
redis-cli INFO memory
redis-cli CLIENT LIST

# Logs (Loki)
# Query: {job="entregafacil-api"} |= "error" | json | level="error"
```

#### Evolution API (WhatsApp)
```bash
# Connection status
curl https://evolution-staging.entregafacil.app/instance/connectionState/entregafacil

# Instance logs
docker logs entregafacil-evolution-staging --tail 100

# Webhook delivery
# Check Loki: {job="entregafacil-api"} |="webhook" |="evolution"
```

#### Infrastructure
```bash
# Docker services
docker ps --filter "name=entregafacil"

# Resource usage
docker stats --no-stream

# Disk space
df -h

# Network
netstat -tulpn | grep -E "3000|5000|8080|8989|9000"
```

---

### Phase 4: RESOLVE (Variable)
**Goal**: Implement fix, deploy, verify

**Resolution Types**:

| Type | Procedure | Verification |
|------|-----------|--------------|
| **Config Change** | Update env var → restart service | Health check + smoke test |
| **Code Fix (Backend)** | PR → CI → Deploy staging → Deploy prod | API tests + canary |
| **Code Fix (Mobile - JS)** | Fix → `eas update` (OTA) | Test on device |
| **Code Fix (Mobile - Native)** | Fix → `eas build` → Submit store | TestFlight/Play Internal |
| **Infra Scale** | `docker-compose up -d --scale api=3` | Load test |
| **DB Migration** | Backup → Run migration → Verify | Data integrity check |
| **Rollback** | Level 1-5 per ROLLOUT_PLAN.md | Full regression |

**OTA Hotfix Procedure (Mobile JS)**:
```bash
# 1. Fix bug locally
git checkout -b hotfix/issue-description
# ... fix code ...
git commit -m "hotfix: fix crash on route start"

# 2. Publish OTA
eas update --branch production --message "Hotfix: Fix crash on route start"

# 3. Verify
eas update:list --branch production | head -3

# 4. Test: Kill app → reopen → verify fix
```

**Rollback Procedure (Mobile Native)**:
```bash
# Level 4 - Store Rollback
# 1. Identify last good build
eas build:list --profile production --platform all --limit 10

# 2. Android - Submit previous AAB to Play Console
# 3. iOS - Submit previous IPA to App Store Connect
# 4. Simultaneous OTA
eas update --branch production --message "Rollback to v1.0.0 - Critical fix"
```

---

### Phase 5: VERIFY (15-60 min)
**Goal**: Confirm fix works, no regressions

**Verification Checklist**:
- [ ] Health checks passing (all services)
- [ ] Core user flows working (login → route → delivery)
- [ ] Error rates back to baseline
- [ ] Latency within SLA
- [ ] No new crashes in Sentry
- [ ] User reports decreasing
- [ ] Canary users (if applicable) stable

**Canary Verification** (if applicable):
```bash
# Check specific user segment
# Sentry: Filter by release=v1.0.1, environment=production
# Grafana: Compare metrics canary vs control
```

---

### Phase 6: CLOSE (Within 24h of resolve)
**Goal**: Document, communicate, schedule retro

**Closure Checklist**:
- [ ] Update incident status to RESOLVED
- [ ] Post resolution message in channel
- [ ] Update status page (if public)
- [ ] Send stakeholder communication
- [ ] Link related tickets/PRs
- [ ] Schedule retrospective (within 5 business days)
- [ ] Archive channel (after 7 days)

**Resolution Message Template**:
```
✅ INCIDENT RESOLVED
Incident: #INC-YYYYMMDD-XXX
Duration: Xh Ym
Root Cause: [Brief description]
Fix: [What was done]
Impact: [Users affected, duration]
Prevention: [What will prevent recurrence]
Retro: Scheduled for YYYY-MM-DD
```

---

### Phase 7: RETROSPECTIVE (Within 5 business days)
**Attendees**: All responders + stakeholders
**Duration**: 60 min max

**Agenda**:
1. Timeline review (5 min)
2. What happened? (10 min)
3. What went well? (10 min)
4. What could be improved? (15 min)
5. Action items (15 min)
5. Assign owners & deadlines (5 min)

**Output**: Retro document + Action items in tracker

---

## 📋 Specific Incident Playbooks

### Playbook: API Down (SEV-1)
**Symptoms**: Health check failing, 5xx errors, timeout
**Initial Checks**:
1. `docker ps` - any containers crashed?
2. `docker logs api` - OOM? Panic? Port conflict?
2. DB connections exhausted? `SELECT count(*) FROM pg_stat_activity;`
3. Redis memory? `redis-cli INFO memory`
4. Upstream (OSRM/Evolution) reachable?

**Common Fixes**:
- Restart API: `docker restart entregafacil-api-staging`
- Increase DB pool: `DATABASE_POOL_SIZE=50`
- Clear Redis: `redis-cli FLUSHDB` (careful!)
- Scale API: `docker-compose up -d --scale api=3`

### Playbook: WhatsApp Not Sending (SEV-2)
**Symptoms**: Messages stuck "enviado", no "entregue/lido"
**Initial Checks**:
1. Evolution API health: `curl https://evolution-staging.entregafacil.app/health`
2. Instance status: `curl https://evolution-staging.entregafacil.app/instance/connectionState/entregafacil`
3. Webhook delivery: Check logs for `messages.upsert`
4. Rate limits: Evolution API quota exceeded?

**Common Fixes**:
- Restart Evolution: `docker restart entregafacil-evolution-staging`
- Re-pair QR: Trigger re-pair via API
- Check webhook URL accessible
- Verify API key valid

### Playbook: Database Issues (SEV-1/2)
**Symptoms**: Slow queries, connection errors, locks
**Initial Checks**:
1. Long queries: `SELECT * FROM pg_stat_activity WHERE state='active' AND now() - query_start > interval '30s';`
2. Locks: `SELECT * FROM pg_locks WHERE NOT granted;`
3. Bloat: `SELECT schemaname, tablename, n_dead_tup FROM pg_stat_user_tables WHERE n_dead_tup > 1000;`
4. Connections: `SELECT count(*) FROM pg_stat_activity;`

**Common Fixes**:
- Kill long queries: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE ...;`
- Vacuum: `VACUUM ANALYZE [table];`
- Increase pool: `DATABASE_POOL_SIZE=50`
- Read replica for reporting queries

### Playbook: Mobile Crash Spike (SEV-1)
**Symptoms**: Sentry alerts, crash-free sessions dropping
**Initial Checks**:
1. Sentry: Group by error type, device, OS version
2. Check latest release: `eas build:list --profile production --limit 5`
3. Correlate with deploy: `eas update:list --branch production`
4. Device-specific? (Android 14, iOS 17, specific model)

**Common Fixes**:
- OTA hotfix (JS only): `eas update --branch production --message "Hotfix: ..."`
- Disable feature flag: `curl -X PATCH .../feature-flags/xxx -d '{"enabled":false}'`
- Rollback OTA: `eas update:rollback --branch production`
- Native fix: New build + store submission

### Playbook: Offline Sync Failing (SEV-2)
**Symptoms**: Sync queue growing, operations stuck "pending"
**Initial Checks**:
1. API `/sync/batch` endpoint health
2. Conflict resolution logic
3. Network connectivity (offline detection)
4. Queue size: `SELECT count(*) FROM sync_queue WHERE status='pending';`

**Common Fixes**:
- Clear stuck operations: Manual DB cleanup
- Fix conflict resolution logic
- Increase sync interval
- Retry logic improvement

---

## 📊 Monitoring Dashboards & Alerts

### Key Dashboards
| Dashboard | URL | Key Panels |
|-----------|-----|------------|
| Mobile & API Overview | Grafana/entregafacil-monitoring | Request rate, Error rate, Latency p95, Active users |
| Mobile App Health | Grafana/mobile-app | Crash-free, ANR, Startup time, Sync success |
| Backend Infrastructure | Grafana/infra | CPU, Memory, Disk, Network, DB connections |
| Business Metrics | Grafana/business | Deliveries, Routes, WhatsApp, Revenue |

### Critical Alerts (PagerDuty)
| Alert | Condition | Severity | Runbook |
|-------|-----------|----------|---------|
| API Down | Health check fails 3x | SEV-1 | API Down |
| Crash Spike | Crash-free < 99% | SEV-1 | Mobile Crash |
| ANR Spike | ANR rate > 0.5% | SEV-1 | Mobile Crash |
| API Latency | p95 > 2s | SEV-2 | API Down |
| Sync Failures | Error rate > 5% | SEV-2 | Sync Failing |
| WhatsApp Fail | Delivery rate < 90% | SEV-2 | WhatsApp Not Sending |
| DB Connections | > 80% pool | SEV-2 | Database Issues |
| Disk Space | > 85% | SEV-2 | Infra Scale |

---

## 📞 Communication Templates

### Internal Slack (Incident Channel)
```
🚨 INCIDENT DECLARED - SEV-[1-4]
**Service**: [API / Mobile / WhatsApp / Sync / DB]
**Impact**: [User-facing: "Users cannot create routes", "WhatsApp notifications delayed"]
**Commander**: @name
**Started**: YYYY-MM-DD HH:MM UTC
**Channel**: #incident-YYYYMMDD-XXX

**Current Status**: 🔴 INVESTIGATING
**Hypothesis**: [Initial theory]
**Next Update**: HH:MM UTC
```

### Status Page (Public - if applicable)
```
Title: [Service] Degraded Performance
Status: Investigating / Identified / Monitoring / Resolved
Message: We're aware of an issue affecting [feature]. Users may experience [symptom]. Our team is investigating.
```

### Stakeholder Email (SEV-1/2)
```
Subject: [ENTREGAFAÇIL INCIDENT] SEV-[1-2] - [Service] - [Brief Description]

Team,

We're currently experiencing an incident affecting [service].

**Impact**: [User-facing description]
**Started**: [Timestamp]
**Current Status**: Investigating / Identified / Fix Deployed / Monitoring
**ETA for Resolution**: [Time or "Unknown"]

We'll provide updates every [30 min / 1 hour] until resolved.

Incident Commander: [Name]
Channel: #incident-XXXXXX
```

### User Communication (In-App Banner / Push)
```
Title: "Estamos cientes de um problema"
Message: "Alguns usuários podem enfrentar [sintoma]. Nossa equipe já está trabalhando na correção. Obrigado pela paciência!"
Action: "OK" (dismiss)
```

---

## 📋 Post-Incident Checklist

### Immediate (Within 1 hour of resolve)
- [ ] Incident marked RESOLVED in PagerDuty
- [ ] Resolution message posted in incident channel
- [ ] Status page updated (if public)
- [ ] Stakeholder communication sent
- [ ] Related PRs/tickets linked

### Within 24 hours
- [ ] Retrospective scheduled (within 5 business days)
- [ ] Timeline document finalized
- [ ] Action items created in tracker with owners
- [ ] Runbook updated if new scenario

### Within 5 business days (Retrospective)
- [ ] Retro meeting held
- [ ] Action items assigned with deadlines
- [ ] Runbooks updated
- [ ] Monitoring/alerts improved
- [ ] Documentation updated

---

## 🔐 Security Incident Addendum

### If Security Breach Suspected
1. **Immediate**: Isolate affected systems
2. **Preserve Evidence**: Don't delete logs, snapshot disks
3. **Notify**: Security Officer + DPO immediately
4. **Assess**: Data exposed? Users affected? Regulatory notification needed?
5. **Contain**: Rotate credentials, revoke tokens, patch vulnerability
6. **Report**: LGPD/ANPD within 48h if personal data exposed

### LGPD Notification Timeline
- **48 hours**: Notify ANPD if risk to data subjects
- **72 hours**: Notify affected users if high risk
- **Document**: All decisions, timeline, evidence

---

## 📚 References

- [ROLLOUT_PLAN.md](./ROLLOUT_PLAN.md) - Rollback procedures
- [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) - Pre-flight checks
- [GONOGO_SIMULATION.md](./GONOGO_SIMULATION.md) - Decision process
- [EAS_BUILD_COMMANDS.md](./EAS_BUILD_COMMANDS.md) - Build/deploy commands
- [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md) - Security baseline

---

**Document Version**: 1.0  
**Last Updated**: 2024-11-18  
**Next Review**: 2025-02-18  
**Owner**: Release Manager