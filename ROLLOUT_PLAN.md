# EntregaFácil - Gradual Rollout Plan

## Overview

This document defines the staged release strategy for EntregaFácil mobile app, ensuring safe deployment with the ability to rollback quickly if issues are detected.

---

## Release Phases

### Phase 0: Internal Testing (Day 0-1)
**Target**: Development team + QA
**Percentage**: 100% of internal users
**Channels**: EAS Development builds, TestFlight Internal, Play Console Internal

| Criteria | Threshold |
|----------|-----------|
| Crash-free sessions | > 99.9% |
| ANR rate | < 0.1% |
| Critical bugs | 0 |
| Core flows working | 100% |

**Duration**: 1-2 days
**Rollback**: Immediate (rebuild previous version)

---

### Phase 1: Beta Testing (Day 2-7)
**Target**: Beta program users (opt-in)
**Percentage**: 5% of eligible users
**Channels**: TestFlight External, Play Console Closed Testing

| Criteria | Threshold |
|----------|-----------|
| Crash-free sessions | > 99.5% |
| ANR rate | < 0.2% |
| Error rate (Sentry) | < 1% |
| User satisfaction (NPS) | > 30 |
| Core flows completion | > 95% |

**Duration**: 5-7 days
**Rollback**: < 2 hours (disable feature flags, push OTA update)

**Feature Flags Active**:
- `voice_navigation_v2`: 50% rollout
- `push_notifications_rich`: 75% rollout
- `beta_features`: 0% (internal only)

---

### Phase 2: Staged Rollout - 10% (Day 8-10)
**Target**: Random 10% of production users
**Percentage**: 10%
**Channels**: Play Console Staged Rollout (10%), TestFlight External (10%)

| Criteria | Threshold |
|----------|-----------|
| Crash-free sessions | > 99.5% |
| ANR rate | < 0.2% |
| Error rate | < 0.5% |
| API latency p95 | < 800ms |
| Sync success rate | > 99% |
| WhatsApp delivery rate | > 95% |

**Duration**: 2-3 days
**Rollback**: < 1 hour (pause rollout in Play Console, OTA rollback)

**Monitoring Focus**:
- New user onboarding completion
- Route creation → optimization → delivery flow
- Offline sync reliability
- Battery drain reports

---

### Phase 3: Staged Rollout - 25% (Day 11-14)
**Target**: Random 25% of production users
**Percentage**: 25%
**Channels**: Play Console Staged Rollout (25%)

| Criteria | Threshold |
|----------|-----------|
| Crash-free sessions | > 99.5% |
| ANR rate | < 0.15% |
| Error rate | < 0.3% |
| User retention (D1) | > 80% |
| Feature adoption | > 60% |

**Duration**: 3-4 days
**Rollback**: < 1 hour

**Additional Feature Flags**:
- `voice_navigation_v2`: 100% rollout
- `push_notifications_rich`: 100% rollout

---

### Phase 4: Staged Rollout - 50% (Day 15-21)
**Target**: Random 50% of production users
**Percentage**: 50%
**Channels**: Play Console Staged Rollout (50%)

| Criteria | Threshold |
|----------|-----------|
| Crash-free sessions | > 99.7% |
| ANR rate | < 0.1% |
| Error rate | < 0.2% |
| App Store rating | Maintained or improved |
| Support tickets | No spike |

**Duration**: 5-7 days
**Rollback**: < 30 minutes

**Business Metrics**:
- Revenue impact (positive/neutral)
- Driver productivity metrics
- Customer satisfaction (delivery confirmations)

---

### Phase 5: Full Rollout - 100% (Day 22+)
**Target**: All production users
**Percentage**: 100%
**Channels**: Play Console Production, App Store

| Criteria | Threshold |
|----------|-----------|
| All previous thresholds met | ✓ |
| No critical issues in last 7 days | ✓ |
| Rollback plan tested | ✓ |
| Team on-call for 48h | ✓ |

**Duration**: Permanent
**Rollback**: OTA update + store rollback (2-24h for store approval)

---

## Feature Flag Rollout Schedule

| Feature | Internal | Beta (5%) | 10% | 25% | 50% | 100% |
|---------|----------|-----------|-----|-----|-----|------|
| `new_map_style` | 100% | 100% | 100% | 100% | 100% | 100% |
| `offline_sync_v2` | 100% | 100% | 100% | 100% | 100% | 100% |
| `whatsapp_templates` | 100% | 100% | 100% | 100% | 100% | 100% |
| `dark_mode_scheduler` | 100% | 100% | 100% | 100% | 100% | 100% |
| `analytics_events` | 100% | 100% | 100% | 100% | 100% | 100% |
| `crash_reporting` | 100% | 100% | 100% | 100% | 100% | 100% |
| `push_notifications_rich` | 100% | 75% | 75% | 100% | 100% | 100% |
| `voice_navigation_v2` | 100% | 50% | 50% | 100% | 100% | 100% |
| `route_optimization_ml` | 0% | 0% | 0% | 0% | 0% | 0% (future) |
| `beta_features` | 100% | 0% | 0% | 0% | 0% | 0% |

---

## Rollback Procedures

### Level 1: Feature Flag Toggle (< 5 minutes)
**Trigger**: Non-critical issue affecting specific feature
**Action**: Disable feature flag via backend config
**Impact**: Feature disabled for all users instantly

### Level 2: OTA Update (< 30 minutes)
**Trigger**: Bug fix needed, JS-only change
**Action**: `eas update --branch production --message "Hotfix: ..."`
**Impact**: Users get fix on next app start (or immediately if foreground)

### Level 3: Pause Staged Rollout (< 5 minutes)
**Trigger**: Metrics degradation at current percentage
**Action**: Pause in Play Console / TestFlight
**Impact**: No new users get the update, existing users keep current version

### Level 4: Full Rollback - Store (< 2-24 hours)
**Trigger**: Critical issue requiring native code change
**Action**: 
1. Submit previous version to Play Console/App Store
2. `eas update --branch production --message "Rollback to vX.Y.Z"`
3. Communicate to users via in-app message

**Android Rollback Time**: ~2 hours (Play Console)
**iOS Rollback Time**: ~24 hours (App Store Review)

### Level 5: Emergency Kill Switch (< 1 minute)
**Trigger**: Security breach, data leak, severe crash loop
**Action**: 
1. Feature flag `crash_reporting` → disable all non-critical features
2. Push silent OTA with minimal safe mode
3. Communicate via email/push to all users

---

## Monitoring & Alerting During Rollout

### Automated Alerts (PagerDuty/Slack)

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Crash Spike | Crash-free sessions < 99% | Critical | Auto-pause rollout |
| ANR Spike | ANR rate > 0.5% | Critical | Auto-pause rollout |
| Error Rate | API errors > 1% | High | Investigate |
| Latency Spike | p95 > 2s | High | Investigate |
| Sync Failures | Sync error rate > 5% | High | Investigate |
| WhatsApp Failures | Delivery rate < 90% | Medium | Investigate |
| Battery Drain | Reports > 10/hour | Medium | Investigate |

### Manual Checks (Every 4 hours during active rollout)

1. **Sentry Dashboard**: New issues, regressions, user impact
2. **Grafana Dashboard**: API health, latency, error rates
3. **Play Console / App Store Connect**: Crash reports, ANRs, ratings
4. **Support Channel**: User complaints, common issues
5. **Business Metrics**: Active drivers, deliveries completed, revenue

---

## Communication Plan

### Internal (Slack #releases)
- **Rollout Start**: Announcement with phase, percentage, feature flags
- **Phase Complete**: Metrics summary, decision to proceed/pause
- **Issues Found**: Bug reports, impact assessment, fix timeline
- **Rollback**: Immediate notification with reason and ETA

### External (Users)
- **In-App Banner**: "Nova versão disponível!" (for major updates)
- **Push Notification**: Critical fixes only
- **Email**: Major version announcements (monthly)
- **Support**: Prepared FAQ for common issues

---

## Go/No-Go Decision Matrix

| Metric | Green (Proceed) | Yellow (Investigate) | Red (Rollback) |
|--------|-----------------|---------------------|----------------|
| Crash-free | > 99.5% | 99.0% - 99.5% | < 99.0% |
| ANR Rate | < 0.2% | 0.2% - 0.5% | > 0.5% |
| Error Rate | < 0.5% | 0.5% - 1% | > 1% |
| API p95 | < 800ms | 800ms - 1.5s | > 1.5s |
| Sync Success | > 99% | 95% - 99% | < 95% |
| User Reports | < 5/day | 5-20/day | > 20/day |

**Decision Authority**:
- **Green**: Release Manager proceeds
- **Yellow**: Team lead investigates, 2h decision
- **Red**: Immediate rollback, CTO notified

---

## Post-Rollout (Day 30+)

### Success Criteria
- [ ] 100% rollout completed
- [ ] All metrics green for 14 consecutive days
- [ ] No critical bugs unreolved
- [ ] App Store rating ≥ 4.5
- [ ] Crash-free sessions > 99.7%

### Retrospective (Day 30)
- What went well?
- What could be improved?
- Feature flag performance analysis
- Rollback drill effectiveness
- Documentation updates needed

### Ongoing
- Monthly feature flag review
- Quarterly rollout process refinement
- Annual disaster recovery drill

---

## Appendix: Quick Reference Commands

```bash
# Check current rollout status
eas build:list --platform all --profile production --limit 5

# Pause rollout (Android)
# Go to Play Console > Release > Staged rollout > Pause

# Pause rollout (iOS)
# Go to App Store Connect > TestFlight > Stop Testing

# Hotfix OTA
eas update --branch production --message "Hotfix: Fix crash on route start"

# Rollback OTA
eas update --branch production --message "Rollback to v1.0.2"

# Check feature flags
curl -H "Authorization: Bearer $TOKEN" https://api.entregafacil.app/api/v1/feature-flags

# Update feature flag
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -d '{"rolloutPercentage": 0}' \
  https://api.entregafacil.app/api/v1/feature-flags/voice_navigation_v2
```

---

*Document Version: 1.0*
*Last Updated: 2024-11-18*
*Next Review: 2024-12-18*