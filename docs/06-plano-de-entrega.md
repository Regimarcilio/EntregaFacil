# Plano de Entrega e Handoff — EntregaFácil

**Versão:** 0.1  
**Data:** 2026-11-17  
**Autor:** PLANMASTER  
**Branch:** develop  
**Referência:** docs/SRS.md, docs/05-backlog.md, docs/03-arquitetura-e-uml.md

---

## 1. Estrutura de Pastas do Projeto

```
EntregaFacil/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # Lint, typecheck, test, validate-srs
│   │   ├── cd-backend.yml         # Deploy staging/prod VPS
│   │   └── update-routing.yml     # Cron mensal OSRM/GraphHopper
│   └── dependabot.yml
├── .husky/
│   └── pre-commit                 # lint-staged + typecheck
├── docs/
│   ├── 01-visao-e-escopo.md
│   ├── 02-benchmarks.md
│   ├── 03-arquitetura-e-uml.md
│   ├── 04-ADRs/
│   │   ├── ADR-001-mobile-framework.md
│   │   ├── ADR-002-map-engine.md
│   │   ├── ADR-003-routing-engine.md
│   │   ├── ADR-004-whatsapp-integration.md
│   │   ├── ADR-005-offline-maps.md
│   │   ├── ADR-006-database.md
│   │   ├── ADR-007-sync-strategy.md
│   │   └── ADR-008-build-deploy.md
│   ├── 05-backlog.md
│   ├── 06-plano-de-entrega.md
│   ├── lgpd-checklist.md
│   ├── onboarding-mobile.md
│   └── templates/
│       ├── SRS_TEMPLATE.md
│       └── SCRUM_TEMPLATE.md
├── mobile/                        # React Native + Expo (Bare)
│   ├── .expo/
│   ├── .eas/
│   ├── app.json / app.config.ts
│   ├── eas.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app/                   # Expo Router (file-based routing)
│   │   │   ├── (auth)/            # Login, Onboarding, WhatsApp Config
│   │   │   ├── (tabs)/            # Home, Rotas, Histórico, Perfil, Config
│   │   │   ├── route/             # Checklist, Mapa, Navegação, Comprovação
│   │   │   └── _layout.tsx
│   │   ├── features/
│   │   │   ├── addresses/         # AddressForm, AddressList, CSVImporter, WhatsAppShare
│   │   │   ├── routes/            # RouteBuilder, ChecklistDraggable, RouteOptimizer
│   │   │   ├── navigation/        # NavigationView, TurnByTurn, DrivingMode
│   │   │   ├── proof/             # CameraCapture, SignatureCanvas, ProblemSelector
│   │   │   ├── whatsapp/          # WAConfig, TemplateEditor, ContactManager
│   │   │   ├── history/           # RouteHistory, RouteDetail, ReportExporter
│   │   │   ├── profile/           # DriverProfile, VehicleForm, Preferences
│   │   │   └── maps/              # OfflineMapDownloader, MapView
│   │   ├── shared/
│   │   │   ├── ui/                # Button, Card, Input, Modal, MapView, ChecklistItem
│   │   │   ├── hooks/             # useLocation, useSync, useOSRM, useEvolution, useOfflineMaps
│   │   │   ├── utils/             # geo, date, format, validation, crypto
│   │   │   ├── store/             # Zustand: routes, addresses, queue, settings, auth
│   │   │   ├── api/               # axios instance + interceptors + offline queue middleware
│   │   │   ├── types/             # Shared TypeScript types (sync with backend)
│   │   │   └── constants/         # Theme tokens, config, enums
│   │   ├── native/                # Bare workflow native modules (se necessário)
│   │   └── __tests__/             # Unit + Integration tests
│   ├── assets/                    # Fonts, icons, images, map styles
│   └── scripts/
│       ├── prebuild.sh            # expo prebuild + config nativa
│       └── validate-srs.js        # SRS validation script
├── backend/                       # Node.js + Hono + TypeScript
│   ├── package.json
│   ├── tsconfig.json
│   ├── drizzle.config.ts
│   ├── src/
│   │   ├── index.ts               # Entry point (Hono app)
│   │   ├── routes/
│   │   │   ├── auth.ts            # Better Auth endpoints
│   │   │   ├── addresses.ts
│   │   │   ├── routes.ts
│   │   │   ├── deliveries.ts
│   │   │   ├── sync.ts            # POST /sync/batch
│   │   │   ├── reports.ts
│   │   │   └── health.ts
│   │   ├── services/
│   │   │   ├── osrm.ts            # OSRM Client (Trip, Route, Table)
│   │   │   ├── graphhopper.ts     # GraphHopper Client (VRP)
│   │   │   ├── evolution.ts       # Evolution API Client (REST + WS)
│   │   │   ├── minio.ts           # Presigned URLs, upload/download
│   │   │   └── sync.ts            # Conflict resolution, serverChanges
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT validation, roles
│   │   │   ├── validation.ts      # Zod schemas
│   │   │   └── rateLimit.ts
│   │   ├── db/
│   │   │   ├── index.ts           # Drizzle client
│   │   │   ├── schema/            # Tables (motoristas, rotas, entregas, etc.)
│   │   │   └── migrations/        # SQL migrations
│   │   ├── utils/
│   │   │   ├── geo.ts             # Geo helpers (polyline, distance)
│   │   │   └── crypto.ts          # Hash, encryption
│   │   └── __tests__/             # Integration tests
│   ├── Dockerfile
│   └── .env.example
├── infra/                         # Infrastructure as Code
│   ├── docker-compose.yml         # Base: api, postgres, redis, minio
│   ├── docker-compose.staging.yml # Overrides staging
│   ├── docker-compose.prod.yml    # Overrides production
│   ├── docker-compose.routing.yml # OSRM + GraphHopper
│   ├── docker-compose.evolution.yml # Evolution API + PG + Redis
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── conf.d/
│   ├── scripts/
│   │   ├── deploy.sh              # Wrapper deploy manual
│   │   ├── backup.sh              # pg_dump + minio mirror
│   │   ├── restore.sh             # Restore from backup
│   │   └── generate-mbtiles.sh    # Planetiler pipeline
│   ├── monitoring/
│   │   ├── prometheus.yml
│   │   ├── grafana-dashboards/
│   │   └── alerting-rules.yml
│   └── .env.staging / .env.prod   # Gitignored
├── scripts/                       # Scripts compartilhados
│   ├── validate-srs.js
│   ├── generate-types.sh          # Sync types mobile ↔ backend
│   └── setup-hooks.sh
└── README.md
```

---

## 2. Comandos de Setup por Stack

### 2.1 Mobile (React Native + Expo)

```bash
# Pré-requisitos
node --version    # >= 20.0.0
yarn --version    # >= 4.0.0 (Berry)
git --version

# Clone e install
git clone <repo> EntregaFacil
cd EntregaFacil/mobile
yarn install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com: EXPO_PUBLIC_API_URL, EXPO_PUBLIC_EVOLUTION_URL, etc.

# Development (Managed Workflow - Expo Go)
yarn start                    # Expo CLI
yarn android                  # Abre no emulador Android
yarn ios                      # Abre no simulador iOS

# Bare Workflow (para MapLibre Navigation SDK)
yarn prebuild                 # Gera pastas android/ ios/ nativas
yarn run:android              # npx expo run:android
yarn run:ios                  # npx expo run:ios

# EAS Build (Cloud)
eas login
eas build --profile development --platform android
eas build --profile production --platform all

# Testes
yarn test:unit                # Jest + React Native Testing Library
yarn test:e2e                 # Detox (requer device/emulador)
yarn lint                     # ESLint
yarn typecheck                # tsc --noEmit
```

### 2.2 Backend (Node.js + Hono)

```bash
cd EntregaFacil/backend

# Install
yarn install

# Database (requer PostgreSQL + PostGIS rodando)
cp .env.example .env
# Editar .env com: DATABASE_URL, REDIS_URL, MINIO_*, JWT_SECRET, EVOLUTION_*

# Migrations
yarn db:generate              # drizzle-kit generate
yarn db:migrate               # drizzle-kit migrate
yarn db:studio                # drizzle-kit studio (UI)

# Development
yarn dev                      # tsx watch src/index.ts (hot reload)

# Testes
yarn test:unit                # Vitest
yarn test:integration         # Vitest + testcontainers (postgres, redis)

# Docker
docker build -t entregafacil-api .
docker run -p 3000:3000 --env-file .env entregafacil-api
```

### 2.3 Infraestrutura (Docker Compose VPS)

```bash
cd EntregaFacil/infra

# Staging
cp .env.staging.example .env.staging
# Editar secrets
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# Production
cp .env.prod.example .env.prod
# Editar secrets (fortes!)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Health checks
curl https://api.entregafacil.app/health
curl http://localhost:5000/health     # OSRM
curl http://localhost:8989/health     # GraphHopper
curl http://localhost:8080/health     # Evolution API

# Logs
docker compose logs -f api
docker compose logs -f osrm

# Backup
./scripts/backup.sh

# Atualização mensal rotas (cron)
./scripts/generate-mbtiles.sh
```

---

## 3. Estratégia de Branches (GitFlow Adaptado)

```
main (protegido, apenas release tags)
  ↑
release/* (ex: release/v0.1.0) ← PR de develop → homologação → merge main + tag
  ↑
develop (branch principal integração) ← PRs de feature/* / bugfix/* / docs/*
  ↑
feature/* (ex: feature/US-011-osrm-trip)
bugfix/* (ex: bugfix/offline-sync-duplicate)
docs/*   (ex: docs/adr-009-sentry)
```

### Regras (Conforme planmaster-git)

| Branch | Naming | Merge Target | PR Required | Checks |
|--------|--------|--------------|-------------|--------|
| `develop` | fixa | — | — | CI verde |
| `feature/*` | `feature/US-XXX-slug` | `develop` | ✅ 1 approve | CI + DoD |
| `bugfix/*` | `bugfix/issue-XXX-slug` | `develop` | ✅ 1 approve | CI + teste regressão |
| `docs/*` | `docs/adr-XXX-slug` | `develop` | ✅ 1 approve | — |
| `release/*` | `release/vX.Y.Z` | `main` | ✅ 2 approve | CI + staging validado + CHANGELOG |

### Conventional Commits (pt-BR)

```
tipo(escopo): descrição curta imperativa

Corpo opcional com motivação e contexto.

Rodapé: Refs #123, Closes #456
```

**Tipos:** `feat`, `fix`, `docs`, `plan`, `refactor`, `test`, `chore`, `perf`, `security`, `style`

**Escopos:** `mobile`, `backend`, `infra`, `docs`, `sync`, `routing`, `whatsapp`, `maps`, `auth`, `ui`

**Exemplos:**
```
feat(mobile): adiciona drag-and-drop na checklist de rotas
fix(backend): corrige LWW conflict resolution timestamp server
docs(plan): atualiza ADR-003 com benchmark GraphHopper 11.1
plan(srs): adiciona RF-031 para impressora térmica
refactor(mobile): extrai useOSRM hook para shared/hooks
test(backend): adiciona property-based test sync queue
chore(infra): atualiza OSRM para v5.27.0
```

---

## 4. CI Mínimo (GitHub Actions)

```yaml
# .github/workflows/ci.yml (resumo)
jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps: [checkout, setup-node, yarn install, yarn lint, yarn typecheck]

  test-unit:
    runs-on: ubuntu-latest
    steps: [checkout, setup-node, yarn install, yarn test:unit --coverage]

  test-integration:
    runs-on: ubuntu-latest
    services: [postgres, redis]
    steps: [checkout, setup-node, yarn install, yarn db:migrate:test, yarn test:integration]

  validate-srs:
    runs-on: ubuntu-latest
    steps: [checkout, node scripts/validate-srs.js docs/SRS.md]

  build-mobile-dev:
    needs: [lint-typecheck, test-unit]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps: [checkout, expo-github-action, eas build --profile development --platform android --non-interactive]

  build-mobile-prod:
    needs: [lint-typecheck, test-unit, test-integration, validate-srs]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps: [checkout, expo-github-action, eas build --profile production --platform all --wait]
```

### Quality Gates (Obrigatórios para Merge)
- [ ] ✅ Lint passa (0 errors, 0 warnings críticos)
- [ ] ✅ TypeCheck passa (0 errors)
- [ ] ✅ Testes unitários > 80% coverage
- [ ] ✅ Testes integração passando
- [ ] ✅ `validate-srs.js` passa (RFs com AC, RNFs com métricas, matriz completa)
- [ ] ✅ `kalimaster-sast` limpo (0 segredos, 0 vuln crit/alta)
- [ ] ✅ Build mobile development sucesso (EAS)

---

## 5. Checklist Anti-Retrabalho Final

### Planejamento (Antes de Codar)
- [x] **Visão e Escopo** documentados (`docs/01-visao-e-escopo.md`)
- [x] **Benchmarks** com 3+ fontes, tabela comparativa, decisão justificada (`docs/02-benchmarks.md`)
- [x] **SRS Completo** com RF/RNF/RN, AC Gherkin, matriz rastreabilidade, riscos (`docs/SRS.md`)
- [x] **UML + Arquitetura** com diagramas Mermaid (Contexto, Casos Uso, Classes, Sequência, Componentes, Deploy, Estados, Atividades) (`docs/03-arquitetura-e-uml.md`)
- [x] **ADRs** para 8 decisões arquiteturais críticas (`docs/04-ADRs/ADR-001` a `008`)
- [x] **Backlog Scrum** com 11 épicos, 29 user stories, 6 sprints, roadmap, DoR/DoD (`docs/05-backlog.md`)
- [x] **Plano de Entrega** com estrutura pastas, comandos, branches, CI, handoff (este doc)

### Validações Técnicas
- [ ] **POC Validada:** MapLibre + MBTiles offline + navegação básica em device real
- [ ] **POC Validada:** OSRM Trip 15 waypoints < 3s em VPS staging
- [ ] **POC Validada:** Evolution API + Cloud API envio template + callback delivered/read
- [ ] **POC Validada:** Sync offline 10 entregas → online → 100% sucesso
- [ ] **Infra Pronta:** VPS staging com Docker Compose, health checks, Grafana dashboards
- [ ] **CI/CD Funcionando:** Pipeline completa verde no `develop`

### Documentação Handoff
- [x] `docs/onboarding-mobile.md` — Setup mobile, bare workflow, EAS, debug
- [x] `docs/onboarding-backend.md` — Setup backend, database, auth, deploy
- [x] `docs/lgpd-checklist.md` — Checklist conformidade LGPD
- [x] `README.md` — Visão geral, quick start, links docs
- [x] `CHANGELOG.md` — Iniciado com v0.0.0 (planejamento)

### Squad Handoff

| Role | Responsável | Onboarding Doc | Acessos Necessários |
|------|-------------|----------------|---------------------|
| **Product Owner** | [A definir] | `docs/01-visao-e-escopo.md`, `docs/05-backlog.md` | GitHub Projects, Figma |
| **Tech Lead** | [A definir] | Todos ADRs, `docs/03-arquitetura-e-uml.md` | GitHub Admin, VPS SSH, AWS/GCP Console |
| **Dev Mobile** | [A definir] | `docs/onboarding-mobile.md`, `mobile/README.md` | GitHub Write, Expo/EAS, Firebase Test Lab |
| **Dev Backend** | [A definir] | `docs/onboarding-backend.md`, `backend/README.md` | GitHub Write, VPS SSH, Docker Hub |
| **DevOps** | [A definir] | `infra/README.md`, `docs/04-ADRs/ADR-008.md` | VPS Root, GitHub Actions Secrets, Grafana Admin |
| **QA** | [A definir] | `docs/05-backlog.md` (DoD), `mobile/__tests__/` | GitHub Read, Sentry, Device Farm |

---

## 6. Próximos Comandos Imediatos

```bash
# 1. Validar planejamento completo
cd /home/oficina/PROJETOS/EntregaFacil
git log --oneline -10

# 2. Criar repositório GitHub (se não existe)
gh repo create entregafacil --private --source=. --push

# 3. Configurar secrets GitHub Actions
gh secret set EXPO_TOKEN --body "<expo-token>"
gh secret set VPS_SSH_KEY --body "<ssh-private-key>"
gh secret set STAGING_VPS_HOST --body "<staging-ip>"
gh secret set PROD_VPS_HOST --body "<prod-ip>"
# ... demais secrets (DATABASE_URL, JWT_SECRET, EVOLUTION_API_KEY, etc.)

# 4. Iniciar Sprint 1 (Fundação)
# PO cria GitHub Project "EntregaFácil MVP" com sprints
# Tech Lead cria issues para US-001 a US-004
# Devs fazem Planning Poker estimativa

# 5. Spike Bare Workflow (2 dias antes Sprint 1)
cd mobile
yarn prebuild
# Testar build nativo: npx expo run:android
# Verificar MapLibre + Navigation SDK compila

# 6. Provisionar VPS Staging
ssh user@staging-ip
# Instalar Docker, Docker Compose, Nginx, Certbot
# Clonar repo, configurar .env.staging
# docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d
```

---

## 7. Estimativa Resumida MVP

| Item | Esforço | Detalhes |
|------|---------|----------|
| **Planejamento (Concluído)** | ~40h | 7 fases PLANMASTER, docs completos |
| **Sprint 1: Fundação** | ~80h | 2 devs × 2 sem, setup completo |
| **Sprint 2: Endereços & Rotas** | ~80h | 2 devs × 2 sem |
| **Sprint 3: Roteirização & Navegação** | ~80h | 2 devs × 2 sem |
| **Sprint 4: Comprovação & WhatsApp** | ~80h | 2 devs × 2 sem |
| **Sprint 5: Offline, Histórico, Perfil** | ~80h | 2 devs × 2 sem |
| **Sprint 6: Hardening & Release** | ~60h | 2 devs × 1.5 sem |
| **Buffer/Imprevistos** | ~40h | 20% |
| **Total** | **~540h** | ~13-14 semanas (3-3.5 meses) |

### Custo Operacional (Pós-MVP)
- **VPS Produção:** ~R$ 200/mês (Hetzner CX42)
- **Domínio/SSL:** ~R$ 50/ano
- **Apple Developer:** $99/ano
- **Google Play:** $25 (único)
- **EAS Build:** Grátis (30 builds/mês)
- **Total:** **~R$ 250/mês** + stores

---

## 8. Critérios Go/No-Go MVP (Release v0.1)

| Critério | Target | Como Verificar |
|----------|--------|----------------|
| **Roteirização** | < 3s p95 (20 wp) | Benchmark CI + teste device |
| **APK Size** | < 80MB | `eas build --profile production` |
| **Offline Core** | 100% funcional | Teste campo: modo avião 10 entregas |
| **WhatsApp Delivery** | > 98% | Logs Evolution API + Grafana |
| **Crash-Free** | > 99.5% | Sentry / Play Console (beta) |
| **Acessibilidade** | 0 violações AA | `axe-core` CI + teste manual TalkBack |
| **LGPD** | Checklist 100% | `docs/lgpd-checklist.md` assinado |
| **SAST** | 0 segredos, 0 vuln crit | `kalimaster-sast` CI |
| **Testes** | Unit > 80%, E2E critical 100% | Codecov + Detox report |

---

**Fim do Plano de Entrega v0.1**  
**Status:** ✅ Planejamento completo — Pronto para início Sprint 1  
**Próxima Ação:** Criar repo GitHub, configurar secrets, provisionar VPS staging, iniciar US-001