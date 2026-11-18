# Changelog - EntregaFácil Mobile

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Feature flags system with gradual rollout support
- Accessibility (a11y) improvements: screen reader support, touch targets, contrast
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Webhook HMAC validation for Evolution API
- Rate limiter fail-closed in production
- JWT secret validation (no fallback)
- CORS origin enforcement in production

### Changed
- Theme colors updated for WCAG AA compliance
- Touch targets increased to 48dp minimum
- Font scaling support up to 200%

### Security
- Removed hardcoded JWT secret fallback
- Added webhook signature verification
- Security audit completed (1 CRITICAL, 3 HIGH, 5 MEDIUM fixed)

## [1.0.0] - 2024-11-18

### Added - Core Features
- **Endereços**: CRUD completo, busca Nominatim, importação CSV, compartilhamento WhatsApp
- **Rotas**: Criação, otimização (OSRM TSP), fallback GraphHopper VRP, drag-and-drop
- **Navegação**: MapLibre + MBTiles offline, turn-by-turn, modo direção
- **Comprovação**: Foto com validação GPS, assinatura digital, tipos de problema
- **WhatsApp**: Evolution API, templates, opt-in LGPD, status tempo real
- **Offline**: SQLite local, fila sincronização (15min), mapas MBTiles por estado
- **Perfil**: Veículo, preferências, foto, CRLV, conta
- **Histórico**: Filtros, export PDF/CSV, estatísticas
- **Configurações**: Tema, unidades, voz, modo luva, sync WiFi, notificações

### Added - Infrastructure
- **Backend**: Hono + PostgreSQL/PostGIS + Drizzle ORM
- **Auth**: Better Auth (JWT 15min + Refresh 30d, roles driver/admin)
- **Storage**: MinIO (S3 compatible) para fotos/assinaturas
- **Roteamento**: OSRM primário + GraphHopper fallback
- **WhatsApp**: Evolution API (Cloud API + Baileys)
- **Sync**: Fila otimista, LWW + merge manual, 15min intervalo
- **CI/CD**: GitHub Actions + EAS Build + Fastlane
- **Monitoring**: Sentry + Grafana (Prometheus/Loki) + Alertas

### Added - Testing & Quality
- **E2E**: Detox (auth, addresses, routes, delivery, offline, settings)
- **Load**: k6 (auth, CRUD, routes, sync, WhatsApp, reports)
- **Security**: SAST (ESLint Security) + DAST (OWASP ZAP)
- **Bundle**: Metro/Babel otimizações, Hermes, lazy loading

### Security
- JWT secret validation (mín 32 chars, sem fallback)
- CORS origin enforcement produção
- Rate limiter fail-closed produção
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Webhook HMAC validation
- Certificate pinning configuração

### Accessibility
- Screen reader support (VoiceOver/TalkBack)
- Touch targets 48dp mínimo (56dp recomendado)
- Contraste WCAG AA (4.5:1 normal, 3:1 large)
- Font scaling até 200%
- Reduce motion support
- High contrast mode

## [0.9.0] - 2024-11-10

### Added - Sprint 4
- WhatsApp config screen (QR pairing, template editor)
- MinIO direct upload com progresso
- Webhook real-time status (entregue/lido)
- Offline queue para comprovação
- Notificações push locais

### Added - Sprint 3
- OSRM service com cache
- GraphHopper VRP fallback
- MapLibre MapView + MBTiles offline
- Navigation screen (turn-by-turn + driving mode)
- Offline maps settings screen

### Added - Sprint 2
- Addresses CRUD + autocomplete
- CSV import
- WhatsApp share receive
- Route creation + checklist
- Status machine (pendente→em_rota→entregue/problema/cancelada)

### Added - Sprint 1
- Project structure + CI/CD
- Auth (login/register/magic link)
- Database schema + migrations
- Sync engine
- Design system

## [0.1.0] - 2024-11-01

### Added - Foundation
- Project initialization (Expo + TypeScript)
- Git repository + branching strategy
- Documentation structure (SRS, ADRs, etc.)
- Development environment setup

---

## Release Types

### Major (X.0.0)
- Breaking changes na API
- Mudanças na estrutura de banco
- Nova versão nativa requerida

### Minor (0.X.0)
- Novas funcionalidades
- Melhorias significativas
- Novas telas/flows

### Patch (0.0.X)
- Bug fixes
- Melhorias de performance
- Atualizações de dependências
- Correções de segurança

---

## Versioning Strategy

```
MAJOR.MINOR.PATCH-BUILD
1.0.0-1     → Primeira release produção
1.0.1-2     → Hotfix produção
1.1.0-3     → Nova feature menor
2.0.0-4     → Breaking change
```

- **App Version**: SemVer (package.json + app.config.ts)
- **Build Number**: Incrementa a cada build (iOS CFBundleVersion, Android versionCode)
- **Runtime Version**: `appVersion` policy (OTA compatível com mesma versão nativa)

---

## Release Checklist

### Pre-Release
- [ ] Todos os testes passando (unit + e2e + load)
- [ ] TypeScript sem erros (`yarn typecheck`)
- [ ] Lint limpo (`yarn lint`)
- [ ] Security audit limpo (`npm audit`)
- [ ] Build preview testado em device real
- [ ] QA aprovado em staging
- [ ] Changelog atualizado
- [ ] Version bump executado

### Release
- [ ] Build production gerado (AAB + IPA)
- [ ] Deploy Internal Testing → Alpha → Beta
- [ ] Deploy Produção (10% rollout inicial)
- [ ] OTA update publicado
- [ ] Monitoramento Sentry ativo
- [ ] Rollback plan documentado

### Pós-Release
- [ ] Crash-free sessions > 99.5% por 14 dias
- [ ] App Store rating ≥ 4.5
- [ ] Nenhum bug crítico pendente
- [ ] Retrospectiva realizada (Day 30)