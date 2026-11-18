# Release Checklist - EntregaFácil Mobile v1.0.0

**Release Manager**: _______________  
**Data**: _______________  
**Versão**: 1.0.0  
**Build**: 1  

---

## ✅ Pré-Release (Code Complete)

### Code Quality
- [ ] TypeScript strict mode: zero erros (`yarn typecheck`)
- [ ] ESLint: zero warnings (`yarn lint`)
- [ ] Testes unitários: > 80% coverage (`yarn test:unit`)
- [ ] Testes E2E: todos passando (`yarn test:e2e`)
- [ ] Testes de carga: thresholds atendidos (`k6 run`)
- [ ] Security audit: zero critical/high (`npm audit`)
- [ ] Dependências atualizadas (sem vulnerabilidades conhecidas)

### Build & Config
- [ ] `app.config.ts` version/build corretos
- [ ] `eas.json` profiles configurados (dev/preview/prod)
- [ ] Variáveis de ambiente `.env.example` atualizada
- [ ] Keystore Android configurado no EAS
- [ ] Certificados iOS configurados no EAS
- [ ] Google Play Service Account configurado
- [ ] App Store Connect API Key configurado
- [ ] Sentry DSN configurado
- [ ] Feature flags defaults definidos

### Documentação
- [ ] README.md atualizado
- [ ] CHANGELOG.md atualizado
- [ ] API.md documentado
- [ ] ROLLOUT_PLAN.md revisado
- [ ] SECURITY_AUDIT.md assinado
- [ ] Runbooks de incidentes criados

---

## 🧪 Quality Assurance

### Functional Testing
- [ ] Login/Register/Logout
- [ ] CRUD Endereços (manual, busca, CSV, share)
- [ ] CRUD Rotas (criar, otimizar, iniciar, finalizar)
- [ ] Checklist drag-and-drop
- [ ] Comprovação: foto + GPS + assinatura
- [ ] Tipos de problema (ausente, errado, recusou, outro)
- [ ] WhatsApp: config, QR, templates, envio, status
- [ ] Offline: criar/editar/excluir → sync online
- [ ] Mapas offline: download, navegação, remoção
- [ ] Perfil: veículo, preferências, foto, CRLV
- [ ] Histórico: filtros, export PDF/CSV
- [ ] Configurações: tema, unidades, voz, modo luva, sync, push

### Non-Functional Testing
- [ ] Performance: startup < 2s, navegação 60fps
- [ ] Memória: < 150MB baseline, sem leaks
- [ ] Bateria: navegação 4h+ contínua
- [ ] Rede: offline/online transitions suaves
- [ ] Acessibilidade: VoiceOver/TalkBack, contraste, touch targets
- [ ] Segurança: certificate pinning, armazenamento seguro

### Device Testing
- [ ] Android: Pixel 7 (API 34), Samsung Galaxy (API 33), Moto G (API 30)
- [ ] iOS: iPhone 15 (iOS 17), iPhone 13 (iOS 16), iPad (se suportado)
- [ ] Orientação: portrait apenas (conforme config)
- [ ] Tamanhos: 375pt, 414pt, 390pt widths

### Regression Testing
- [ ] Fluxo completo: login → rota → entregas → logout
- [ ] Upgrade: v0.9.0 → v1.0.0 (dados preservados)
- [ ] Downgrade: v1.0.0 → v0.9.0 (graceful degradation)

---

## 🔐 Security & Compliance

### Security Hardening
- [ ] JWT secret validation (mín 32 chars, sem fallback)
- [ ] CORS origin enforcement produção
- [ ] Rate limiter fail-closed produção
- [ ] Security headers: CSP, HSTS, X-Frame-Options, etc.
- [ ] Webhook HMAC validation
- [ ] Certificate pinning configurado
- [ ] Secrets: GitLeaks clean, EAS Secrets configurados
- [ ] Dependencies: npm audit clean

### LGPD Compliance
- [ ] Opt-in WhatsApp por destinatário
- [ ] Dados mínimos coletados
- [ ] Criptografia em repouso (PostgreSQL + TLS)
- [ ] Direito ao esquecimento (DELETE /auth/account)
- [ ] DPO contato na política de privacidade
- [ ] Termos de uso atualizados
- [ ] Data breach notification procedure documentado

### Store Compliance
- [ ] Play Console: Data Safety form preenchido
- [ ] App Store: Privacy Nutrition Labels preenchidos
- [ ] Permissions justificadas no description
- [ ] Screenshots atualizadas (PT-BR)
- [ ] Descrição otimizada (ASO)

---

## 📦 Build & Deploy

### Mobile Builds
- [ ] Development build testado (Android + iOS)
- [ ] Preview build distribuído para QA (TestFlight + Play Internal)
- [ ] Production build gerado (AAB + IPA)
- [ ] EAS Update OTA configurado (branch production)
- [ ] Code signing certificates válidos
- [ ] Provisioning profiles válidos (iOS)

### Backend Deploy
- [ ] Docker images buildadas e pushadas
- [ ] Database migrations testadas em staging
- [ ] Redis/MinIO/OSRM/GraphHopper health checks
- [ ] SSL certificates válidos (Let's Encrypt/Cloudflare)
- [ ] Nginx reverse proxy configurado
- [ ] Health endpoints respondendo
- [ ] Logs estruturados (JSON) para Loki

### CI/CD Pipeline
- [ ] GitHub Actions: quality → build → deploy → test
- [ ] Branch protection: develop → main
- [ ] Required checks: quality, build-android, build-ios
- [ ] Auto-merge disabled para main
- [ ] Slack notifications configuradas

---

## 🚀 Rollout Plan Execution

### Phase 0: Internal (Day 0-1)
- [ ] EAS Development build distribuído para team
- [ ] TestFlight Internal + Play Internal
- [ ] Smoke tests passing
- [ ] Go/No-Go para Phase 1

### Phase 1: Beta 5% (Day 2-7)
- [ ] TestFlight External + Play Closed Testing
- [ ] Feature flags: voice_navigation_v2 50%, push_rich 75%
- [ ] Métricas: crash-free > 99.5%, ANR < 0.2%
- [ ] Go/No-Go para Phase 2

### Phase 2: Staged 10% (Day 8-10)
- [ ] Play Console 10% + TestFlight 10%
- [ ] Feature flags: voice 100%, push 100%
- [ ] Métricas: crash-free > 99.5%, error rate < 0.5%
- [ ] Go/No-Go para Phase 3

### Phase 3: Staged 25% (Day 11-14)
- [ ] Play Console 25%
- [ ] Métricas: retention D1 > 80%
- [ ] Go/No-Go para Phase 4

### Phase 4: Staged 50% (Day 15-21)
- [ ] Play Console 50%
- [ ] Métricas: business metrics positivos
- [ ] Go/No-Go para Phase 5

### Phase 5: Full 100% (Day 22+)
- [ ] Play Console 100% + App Store
- [ ] OTA update publicado
- [ ] Monitoramento 48h intensivo
- [ ] Rollback plan testado

---

## 📊 Monitoring & Alerting

### Sentry
- [ ] DSN configurado (mobile + backend)
- [ ] Source maps upload automático (hook)
- [ ] Alertas: crash spike, ANR spike, new issues
- [ ] Release tracking: v1.0.0 marked

### Grafana
- [ ] Dashboard "EntregaFácil - Mobile & API" importado
- [ ] Alertas: API error rate, latency, sync failures
- [ ] Datasources: Prometheus, Loki, Tempo
- [ ] SLOs definidos: availability 99.9%, latency p95 < 800ms

### Logs
- [ ] Loki recebendo logs (mobile + backend)
- [ ] Labels padronizados (app, env, version, level)
- [ ] Retenção: 30d hot, 1y cold

### Uptime
- [ ] Health checks configurados (API, DB, Redis, MinIO)
- [ ] Status page pública (opcional)
- [ ] Runbooks de incidentes linkados nos alertas

---

## 📋 Post-Launch (Day 1-30)

### Day 1-3 (Hypercare)
- [ ] Monitoramento 24/7 (team on-call)
- [ ] Verificação hora a hora: crashes, ANR, errors
- [ ] Suporte: tempo resposta < 1h
- [ ] Hotfix OTA se necessário

### Day 4-7 (Stabilization)
- [ ] Métricas diárias: crash-free, retention, ratings
- [ ] Feature flags review: ajustar rollouts
- [ ] Support tickets: categorizar, priorizar
- [ ] Performance review: startup, sync, navigation

### Day 8-14 (Optimization)
- [ ] A/B test feature flags se necessário
- [ ] Bundle size analysis
- [ ] Battery drain investigation
- [ ] User feedback analysis (NPS, reviews)

### Day 15-30 (Maturity)
- [ ] Crash-free sessions > 99.7% por 14 dias
- [ ] App Store rating ≥ 4.5
- [ ] Zero critical bugs pendentes
- [ ] Retrospectiva Day 30 agendada

---

## 🚨 Rollback Procedures

### Nível 1: Feature Flag (< 5 min)
- [ ] Disable flag via backend/API
- [ ] Verificar impacto imediato

### Nível 2: OTA Hotfix (< 30 min)
- [ ] `eas update --branch production --message "Hotfix: ..."`
- [ ] Verificar distribuição

### Nível 3: Pause Rollout (< 5 min)
- [ ] Play Console: Pause staged rollout
- [ ] TestFlight: Stop testing
- [ ] Verificar usuários existentes não afetados

### Nível 4: Store Rollback (< 2-24h)
- [ ] Submeter versão anterior (Play Console ~2h, App Store ~24h)
- [ ] OTA rollback simultâneo
- [ ] Comunicação usuários (in-app + email)

### Nível 5: Emergency Kill (< 1 min)
- [ ] Feature flag `crash_reporting` → modo seguro
- [ ] OTA silent com minimal safe mode
- [ ] Comunicação massiva (push + email)

---

## ✅ Sign-Off

| Role | Nome | Assinatura | Data |
|------|------|------------|------|
| Release Manager | | | |
| Tech Lead Mobile | | | |
| Tech Lead Backend | | | |
| QA Lead | | | |
| Security Officer | | | |
| Product Owner | | | |
| DPO (LGPD) | | | |

---

## 📎 Anexos

- [ ] Build artifacts (AAB, IPA, mapping files)
- [ ] Test reports (JUnit, coverage, k6)
- [ ] Security audit report
- [ ] Load test results
- [ ] Accessibility audit
- [ ] Store screenshots + metadata
- [ ] Runbooks de incidentes
- [ ] Communication templates (Slack, email, in-app)

---

**Status Final**: ☐ APROVADO PARA RELEASE  
**Data da Release**: _______________  
**Próxima Revisão**: _______________ (Day 30)