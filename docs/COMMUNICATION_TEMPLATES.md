# Communication Templates
## EntregaFácil Mobile - Deployment & Incident Communications

---

## 📧 Email Templates

### 1. Phase 0 Complete - Go/No-Go Decision
**Subject**: [ENTREGAFAÇIL] Phase 0 Complete - Go/No-Go Decision for Beta Rollout

```
Hi Team,

Phase 0 (Internal Testing) for EntregaFácil v1.0.0 is complete.

**Test Period**: [Start Date] - [End Date]
**Devices Tested**: [X] iOS + [Y] Android devices
**Testers**: [N] internal team members

**Key Metrics**:
- Crash-free Sessions: [XX]% (Target: >99.5%) ✅
- ANR Rate: [XX]% (Target: <0.2%) ✅
- Cold Start p95: [X.XX]s (Target: <3s) ✅
- API Latency p95: [XXX]ms (Target: <800ms) ✅
- Core Flow Completion: [XX]% ✅
- Team NPS: +[XX] (Target: >+30) ✅

**Blockers**: [Number] - [List if any]
**Known Issues**: [Number] - [List if any, with severity]

**Decision Meeting**: [Date/Time] - [Calendar Link]
**Decision Options**: GO → Phase 1 (Beta 5%) | NO-GO → Fix & Re-test

Please review the attached Phase 0 Test Checklist and Test Team Feedback Summary before the meeting.

Best regards,
[Release Manager Name]
Release Manager, EntregaFácil
```

---

### 2. Phase 1 Beta Launch - Internal Announcement
**Subject**: [ENTREGAFAÇIL] 🚀 Phase 1 Beta Launch - 5% Rollout Starting [Date]

```
Hi Team,

We're excited to announce Phase 1 Beta rollout is starting today!

**Rollout Details**:
- **Percentage**: 5% of eligible users
- **Channels**: TestFlight External + Play Console Closed Testing
- **Duration**: 5-7 days (until [End Date])
- **Feature Flags Active**:
  - voice_navigation_v2: 50% rollout
  - push_notifications_rich: 75% rollout
  - route_optimization_ml: 0% (internal only)

**Monitoring**:
- Hourly metrics review (Grafana + Sentry)
- Daily standup at [Time] in #release-beta
- Go/No-Go for Phase 2 (10%) on [Date]

**Support**:
- Beta users directed to in-app feedback
- Support team briefed on known issues
- Escalation: #release-beta Slack channel

**Rollback Plan**: Feature flag toggle (<5 min) or OTA hotfix (<30 min)

Let's make this a successful beta! 🎉

[Release Manager Name]
```

---

### 3. Phase Transition - Go Decision
**Subject**: [ENTREGAFAÇIL] ✅ GO DECISION - Phase [N] Rollout Approved

```
Hi Team,

**DECISION: GO** - Phase [N] rollout approved to proceed.

**Phase [N] Details**:
- **Rollout**: [X]% of production users
- **Start Date**: [Date]
- **Duration**: [X] days
- **Feature Flags Adjusted**:
  - [Flag 1]: [X]% → [Y]%
  - [Flag 2]: [X]% → [Y]%

**Key Metrics Supporting Go**:
- Crash-free: [XX]% (Target: >[YY]%) ✅
- ANR Rate: [XX]% (Target: <[YY]%) ✅
- Error Rate: [XX]% (Target: <[YY]%) ✅
- User NPS: +[XX] ✅

**Next Checkpoint**: Phase [N+1] Go/No-Go on [Date]

**Monitoring**: Daily metrics review at [Time] in #release-phase[N]

[Release Manager Name]
```

---

### 4. Phase Transition - No-Go Decision
**Subject**: [ENTREGAFAÇIL] ⏸️ NO-GO DECISION - Phase [N] Rollout Paused

```
Hi Team,

**DECISION: NO-GO** - Phase [N] rollout paused due to [primary reason].

**Blocking Issues**:
1. [Issue 1] - [Severity] - Owner: [Name] - ETA: [Date]
2. [Issue 2] - [Severity] - Owner: [Name] - ETA: [Date]

**Impacted Metrics**:
- [Metric]: [Actual]% (Threshold: [Target]%) ❌

**Action Plan**:
- [ ] Fix Issue 1 by [Date] - [Owner]
- [ ] Fix Issue 2 by [Date] - [Owner]
- [ ] Re-run smoke tests on [Date]
- [ ] Re-evaluate Go/No-Go on [Date]

**Current Rollout**: Paused at [X]%
- Play Console: Rollout paused
- TestFlight: Testing stopped
- Feature flags: [Relevant flags] rolled back to [X]%

**Next Review**: [Date/Time] - [Calendar Link]

We'll communicate updates daily until resolved.

[Release Manager Name]
```

---

### 5. Hotfix OTA Deployed
**Subject**: [ENTREGAFAÇIL] 🔧 Hotfix Deployed - OTA Update v[Version]

```
Hi Team,

A hotfix has been deployed via OTA (Over-The-Air) update.

**Issue**: [Brief description of bug]
**Impact**: [User-facing impact, % users affected]
**Fix**: [Brief technical description]
**Deployed**: [Timestamp] UTC
**OTA Message**: "[OTA message sent to users]"

**Verification**:
- [ ] Tested on device: Kill app → reopen → verified
- [ ] Sentry: No new crashes for this error
- [ ] Grafana: Error rate returning to baseline

**Rollback**: `eas update:rollback --branch production` (if needed)

Users will receive update on next app launch (or immediately if foreground).

[Release Manager Name]
```

---

### 6. Rollback Executed
**Subject**: [ENTREGAFAÇIL] 🔄 ROLLBACK EXECUTED - v[Old Version] Restored

```
Hi Team,

**ROLLBACK EXECUTED** - Previous version restored due to [reason].

**Rollback Details**:
- **Type**: Level [1-5] Rollback
- **From**: v[Bad Version] → v[Good Version]
- **Triggered**: [Timestamp] UTC
- **Duration**: [X] minutes/hours
- **Affected Users**: [X]% (those on bad version)

**Actions Taken**:
- [ ] OTA rollback: `eas update:rollback --branch production`
- [ ] Store rollback: [Play Console / App Store] submission
- [ ] Feature flags: [Relevant flags] disabled/adjusted
- [ ] Communication: [In-app banner / push / email sent]

**Current Status**: [Monitoring / Stable / Investigating]
**Next Steps**: [Root cause analysis / Fix development / Re-release planning]

**Retrospective**: Scheduled for [Date]

[Release Manager Name]
```

---

### 7. Production Release Announcement
**Subject**: [ENTREGAFAÇIL] 🎉 v[Version] Released to Production!

```
Hi Team,

**EntregaFácil v[Version] is now live in production!** 🎉

**Release Highlights**:
- [Feature 1]: [Brief description]
- [Feature 2]: [Brief description]
- [Bug Fix]: [Brief description]
- [Performance]: [Improvement metrics]

**Rollout Status**:
- Android: [X]% → [Y]% (Play Console)
- iOS: [X]% → [Y]% (App Store)
- OTA: [Branch] updated

**Key Metrics** (First 24h):
- Crash-free: [XX]%
- Adoption Rate: [XX]%
- User Rating: [X.X]/5.0
- Support Tickets: [N] (vs [M] baseline)

**Rollout Plan**:
- Day 1-3: 10% (Hypercare - 24/7 monitoring)
- Day 4-7: 25% (Daily reviews)
- Day 8-14: 50% (Business metrics focus)
- Day 15+: 100% (Full availability)

**Support**: On-call rotation active in #release-prod
**Rollback Ready**: Level 1-5 procedures documented

Thank you to everyone who made this release possible! 🙏

[Release Manager Name]
```

---

### 8. Incident Communication - Internal
**Subject**: [ENTREGAFAÇIL INCIDENT] SEV-[1-4] - [Service] - [Brief Description]

```
Team,

**INCIDENT DECLARED** - SEV-[1-4]

**Service**: [API / Mobile App / WhatsApp / Sync / Database]
**Impact**: [User-facing: "Users cannot create routes", "WhatsApp notifications delayed"]
**Severity**: SEV-[1-4] ([Critical/High/Medium/Low])
**Commander**: @[Name]
**Started**: [YYYY-MM-DD HH:MM] UTC
**Channel**: #incident-YYYYMMDD-XXX

**Current Status**: 🔴 INVESTIGATING
**Hypothesis**: [Initial theory]
**Next Update**: [HH:MM] UTC

**Affected Users**: [Estimated % or count]
**Workaround**: [If any]

**Timeline**:
- [HH:MM] - Alert triggered
- [HH:MM] - Incident declared
- [HH:MM] - Commander assigned
- [HH:MM] - [Action taken]

**Next Update**: [HH:MM] UTC in #incident-XXXXXX

---
Join channel: #incident-YYYYMMDD-XXX
Dashboard: [Grafana Link]
Sentry: [Sentry Link]
```

---

### 9. Incident Resolution - Internal
**Subject**: [ENTREGAFAÇIL RESOLVED] SEV-[1-4] - [Service] - [Brief Description]

```
Team,

**INCIDENT RESOLVED** ✅

**Incident**: #INC-YYYYMMDD-XXX
**Duration**: [X]h [Y]m
**Root Cause**: [Brief technical description]
**Fix**: [What was deployed/changed]
**Impact**: [Users affected, duration of degradation]

**Resolution Timeline**:
- [HH:MM] - Fix deployed (OTA / Config / Code / Infra)
- [HH:MM] - Verification complete
- [HH:MM] - Incident resolved

**Prevention**:
- [Action 1] - Owner: [Name] - Due: [Date]
- [Action 2] - Owner: [Name] - Due: [Date]

**Retrospective**: Scheduled for [Date] - [Calendar Link]

**Post-Incident**: Runbook updated, monitoring improved

Great work team! 👏

[Incident Commander Name]
```

---

## 📱 In-App Notifications (Mobile)

### 1. Update Available Banner
```json
{
  "type": "banner",
  "title": "Nova versão disponível! 🎉",
  "message": "Atualize para acessar [nova funcionalidade] e melhorias de performance.",
  "actions": [
    { "label": "Atualizar agora", "action": "store" },
    { "label": "Depois", "action": "dismiss" }
  ],
  "severity": "info",
  "targetVersion": "1.0.1"
}
```

### 2. Critical Hotfix Alert
```json
{
  "type": "modal",
  "title": "Atualização importante 🔧",
  "message": "Corrigimos um problema que podia causar [sintoma]. Reinicie o app para aplicar a correção.",
  "actions": [
    { "label": "Reiniciar agora", "action": "restart" }
  ],
  "severity": "critical",
  "dismissible": false
}
```

### 3. Maintenance Notice
```json
{
  "type": "banner",
  "title": "Manutenção programada 🛠️",
  "message": "Faremos manutenção nos servidores em [Data] das [Hora] às [Hora]. Algumas funções podem ficar indisponíveis temporariamente.",
  "actions": [
    { "label": "Entendido", "action": "dismiss" }
  ],
  "severity": "warning",
  "schedule": {
    "start": "2024-11-20T02:00:00Z",
    "end": "2024-11-20T04:00:00Z"
  }
}
```

### 4. Feature Announcement
```json
{
  "type": "card",
  "title": "Novo: Navegação por Voz v2! 🗣️",
  "message": "Agora com melhor pronúncia de endereços brasileiros e alertas de trânsito em tempo real.",
  "imageUrl": "https://assets.entregafacil.app/voice-nav-v2.png",
  "actions": [
    { "label": "Experimentar", "action": "deeplink", "url": "entregafacil://settings/voice" },
    { "label": "Saiba mais", "action": "url", "url": "https://blog.entregafacil.app/voice-nav-v2" }
  ],
  "severity": "info",
  "featureFlag": "voice_navigation_v2"
}
```

### 5. Opt-in WhatsApp
```json
{
  "type": "modal",
  "title": "Receber atualizações no WhatsApp? 📱",
  "message": "Podemos te avisar quando sua entrega sair para entrega, for confirmada ou tiver algum problema. Você controla o que recebe.",
  "actions": [
    { "label": "Ativar notificações", "action": "deeplink", "url": "entregafacil://settings/whatsapp" },
    { "label": "Agora não", "action": "dismiss" },
    { "label": "Configurar depois", "action": "deeplink", "url": "entregafacil://settings/notifications" }
  ],
  "severity": "info",
  "consentRequired": true
}
```

---

## 📲 Push Notifications

### 1. Delivery Confirmation
```json
{
  "title": "✅ Entrega confirmada!",
  "body": "Sua entrega para [Nome] em [Endereço] foi concluída às [Hora].",
  "data": {
    "type": "delivery_confirmed",
    "deliveryId": "uuid",
    "routeId": "uuid"
  },
  "category": "DELIVERY",
  "priority": "high",
  "sound": "default"
}
```

### 2. Delivery Problem
```json
{
  "title": "⚠️ Problema na entrega",
  "body": "[Tipo de problema] na entrega para [Nome] em [Endereço]. Verifique o app para detalhes.",
  "data": {
    "type": "delivery_problem",
    "deliveryId": "uuid",
    "problemType": "cliente_ausente|endereco_errado|recusou|outro"
  },
  "category": "DELIVERY",
  "priority": "high",
  "sound": "alert"
}
```

### 3. Route Started
```json
{
  "title": "🚀 Rota iniciada",
  "body": "Sua rota '[Nome da Rota]' com [N] entregas começou agora. Boa viagem!",
  "data": {
    "type": "route_started",
    "routeId": "uuid"
  },
  "category": "ROUTE",
  "priority": "normal"
}
```

### 4. Route Completed
```json
{
  "title": "🏁 Rota finalizada!",
  "body": "Rota '[Nome]' concluída: [X] entregues, [Y] problemas, [Z] km em [T] min. Ganho estimado: R$ [Valor].",
  "data": {
    "type": "route_completed",
    "routeId": "uuid",
    "metrics": { "entregues": 8, "problemas": 1, "km": 25.5, "ganho": 125.50 }
  },
  "category": "ROUTE",
  "priority": "high"
}
```

### 5. Sync Complete
```json
{
  "title": "☁️ Sincronização concluída",
  "body": "[N] operações sincronizadas com sucesso. Seus dados estão atualizados.",
  "data": {
    "type": "sync_complete",
    "operations": 12
  },
  "category": "SYSTEM",
  "priority": "low",
  "silent": true
}
```

### 6. Offline Warning
```json
{
  "title": "📴 Modo offline",
  "body": "Você está sem conexão. As alterações serão salvas localmente e sincronizadas quando a internet voltar.",
  "data": {
    "type": "offline_mode"
  },
  "category": "SYSTEM",
  "priority": "normal"
}
```

### 6. Version Update Available
```json
{
  "title": "📱 Nova versão disponível",
  "body": "Versão [X.Y.Z] traz [feature/fix]. Atualize na loja para a melhor experiência.",
  "data": {
    "type": "app_update",
    "version": "1.0.1",
    "storeUrl": "https://play.google.com/store/apps/details?id=com.entregafacil.app"
  },
  "category": "SYSTEM",
  "priority": "normal"
}
```

---

## 📱 SMS Templates (Fallback)

### 1. Delivery Confirmation (SMS)
```
✅ Entrega confirmada! Entrega para [Nome] em [Endereço] concluída às [Hora]. Foto: [URL] | EntregaFácil
```

### 2. Delivery Problem (SMS)
```
⚠️ Problema: [Tipo] na entrega para [Nome] em [Endereço]. Verifique o app EntregaFácil para detalhes e próximo passo.
```

### 3. OTP / Magic Link
```
Seu código de acesso EntregaFácil: [CÓDIGO]. Válido por 10 min. Não compartilhe.
```

---

## 📢 Social Media Templates

### 1. Release Announcement (Twitter/LinkedIn)
```
🚀 EntregaFácil v1.0.0 is LIVE!

New features for delivery drivers:
✅ Smart route optimization (OSRM + GraphHopper)
✅ Offline-first with auto-sync
✅ WhatsApp notifications with templates
✅ Photo + signature proof of delivery
✅ Voice navigation & dark mode

Built with: React Native, Expo, Node.js, PostgreSQL/PostGIS

Download: entregafacil.app 📱

#ReactNative #Expo #Logistics #DeliveryApp #OpenSource
```

### 2. Feature Highlight (Instagram Story)
```
Slide 1: 🎉 NEW FEATURE: Voice Navigation v2
Slide 2: 🗣️ Better Portuguese pronunciation
Slide 3: 🚦 Real-time traffic alerts
Slide 4: 🌙 Works in dark mode
Slide 5: 👉 Update now: entregafacil.app
```

### 3. Incident Update (Twitter)
```
⚠️ We're aware of an issue with [feature]. Users may experience [symptom]. Our team is investigating. Updates here: status.entregafacil.app

#EntregaFacil #Incident
```

---

## 📋 Communication Checklist per Release Phase

| Phase | Internal | External | Channels |
|-------|----------|----------|----------|
| **Phase 0 Complete** | ✅ Go/No-Go email | ❌ | Slack, Email |
| **Phase 1 Beta** | ✅ Launch email | ✅ Beta invite email | Slack, Email, TestFlight |
| **Phase 2-4** | ✅ Go/No-Go email | ✅ In-app banner | Slack, Email, App |
| **Phase 5 (100%)** | ✅ Release email | ✅ Push + In-app + Social | All channels |
| **Hotfix** | ✅ Deploy notification | ✅ In-app modal (if critical) | Slack, App |
| **Rollback** | ✅ Rollback email | ✅ Push + In-app | Slack, Email, App |
| **Incident** | ✅ Incident channel | ✅ Status page + In-app | Slack, Status Page, App |
| **Post-Launch** | ✅ Retro summary | ✅ Blog post + Social | Email, Blog, Social |

---

## 🎨 Brand Guidelines

### Colors
- Primary: `#0066CC` (Blue)
- Success: `#059669` (Green)
- Warning: `#F59E0B` (Amber)
- Danger: `#DC2626` (Red)
- Info: `#00D4AA` (Teal)

### Tone
- **Professional but friendly** - "Nós" not "A empresa"
- **Clear and actionable** - Tell users what to do
- **Transparent** - Admit issues, explain fixes
- **Portuguese (Brazil)** - Native language

### Emoji Usage
- ✅ Success / Complete
- 🔧 Fix / Maintenance
- 🚀 Launch / New Feature
- ⚠️ Warning / Attention
- 🔄 Rollback / Sync
- 🛠️ Maintenance
- 📱 Mobile / App
- ☁️ Cloud / Sync

---

## 📞 Emergency Communication Tree

```
INCIDENT DETECTED
       │
       ▼
Incident Commander (IC) ←→ Slack #incident-XXX
       │
       ├── Technical Leads (Mobile, Backend, DevOps)
       │       │
       │       ▼
       │   Engineers (Fix Implementation)
       │
       ├── Product Owner (Business Impact)
       │       │
       │       ▼
       │   Support Team (User Communication)
       │
       ├── Security Officer (If SEV-1 + Security)
       │       │
       │       ▼
       │   DPO / Legal (If Data Breach)
       │
       └── Executive Sponsor (If SEV-1 > 2h)
               │
               ▼
           Stakeholder Updates (Email/Slack)
```

**IC Responsibilities**:
1. Own the incident timeline
2. Coordinate technical response
3. Communicate status every 15-30 min
4. Make Go/No-Go on rollback
5. Declare resolution
6. Schedule retrospective

---

**Document Version**: 1.0  
**Last Updated**: 2024-11-18  
**Next Review**: 2025-02-18