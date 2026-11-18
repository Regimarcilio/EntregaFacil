# EntregaFácil - Mobile App for Delivery Drivers

[![Expo](https://img.shields.io/badge/Expo-51-black?logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.74-blue?logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://typescriptlang.org)
[![EAS Build](https://img.shields.io/badge/EAS_Build-enabled-purple?logo=expo)](https://expo.dev/eas)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

Aplicativo mobile para motoristas de entrega (motoboys, entregadores de app) que permite adicionar múltiplos endereços, calcula a rota ótima para todas as entregas, envia notificações WhatsApp ao concluir entregas e funciona offline.

## 🚀 Funcionalidades Principais

### 📍 Gestão de Endereços
- Cadastro manual e via busca (Nominatim/OpenStreetMap)
- Importação via CSV
- Compartilhamento via WhatsApp (recebe endereços)
- Geocoding automático com validação

### 🗺️ Rotas Otimizadas
- Criação de rotas com múltiplos waypoints
- Ordenação drag-and-drop
- Otimização automática (TSP via OSRM)
- Fallback para VRP com GraphHopper (janelas de tempo, capacidade)
- Visualização no mapa (MapLibre + MBTiles offline)

### 📦 Comprovação de Entrega
- Captura de foto com validação GPS (precisão ≤ 50m)
- Assinatura digital do destinatário
- Registro de problemas (cliente ausente, endereço errado, recusou, outro)
- Upload direto para MinIO (S3 compatible) com progresso

### 💬 Notificações WhatsApp
- Evolution API (Cloud API + Baileys fallback)
- Templates pré-aprovados pelo Meta
- Opt-in por destinatário (LGPD)
- Remetente configurável (motorista ou destinatário)
- Status em tempo real (enviado, entregue, lido)

### 📱 Offline-First
- Banco local SQLite (expo-sqlite)
- Fila de sincronização otimista (15min intervalo)
- Resolução de conflitos LWW + merge manual
- Mapas offline (MBTiles por estado/região)
- Sincronização apenas em Wi-Fi (configurável)

### ⚙️ Configurações Avançadas
- Tema (claro/escuro/sistema)
- Unidades (métrico/imperial)
- Voz na navegação + volume
- Modo luva (áreas de toque maiores)
- Auto-iniciar navegação
- Sync apenas Wi-Fi
- Notificações push

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile (React Native/Expo)               │
├─────────────────────────────────────────────────────────────┤
│  Expo Router + TypeScript + Zustand + React Query          │
│  MapLibre + MBTiles + OSRM + Exo-Camera + Exo-Location     │
│  Expo Notifications + Expo Updates (OTA)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                    HTTPS/REST + WebSocket
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js/Hono)                   │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL + PostGIS + Drizzle ORM                        │
│  Redis (Rate Limit + Cache + Sessions)                     │
│  MinIO (S3 compatible - fotos/assinaturas)                 │
│  OSRM (Roteamento) + GraphHopper (VRP fallback)            │
│  Evolution API (WhatsApp)                                   │
│  Better Auth (JWT 15min + Refresh 30d)                     │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Stack Tecnológica

### Mobile
- **Framework**: Expo SDK 51 + React Native 0.74
- **Language**: TypeScript 5.3
- **Navigation**: Expo Router (file-based)
- **State**: Zustand + TanStack Query
- **Maps**: MapLibre React Native + MBTiles
- **Routing**: OSRM (primário) + GraphHopper (fallback)
- **Storage**: Expo SQLite + AsyncStorage
- **Notifications**: Expo Notifications + Expo Updates
- **Camera**: Expo Camera + Expo Image Picker
- **Auth**: Better Auth (JWT + Refresh tokens)

### Backend
- **Runtime**: Node.js 20 + Hono
- **Database**: PostgreSQL 16 + PostGIS 3
- **ORM**: Drizzle ORM (type-safe)
- **Cache/Queue**: Redis 7
- **Storage**: MinIO (S3 API)
- **Routing**: OSRM (docker) + GraphHopper (docker)
- **WhatsApp**: Evolution API (self-hosted)
- **Auth**: Better Auth (JWT HS256 + Refresh rotation)

### DevOps
- **CI/CD**: GitHub Actions
- **Build**: EAS Build (Expo Application Services)
- **Deploy**: Fastlane (Play Store + App Store)
- **Monitoring**: Sentry + Grafana (Prometheus/Loki)
- **Testing**: Detox (E2E) + Jest (Unit)
- **Security**: SAST (ESLint Security) + DAST (OWASP ZAP)

## 📋 Pré-requisitos

- Node.js 20+
- Yarn 1.22+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Docker + Docker Compose (para backend local)
- Xcode 15+ (iOS)
- Android Studio (Android)

## 🚀 Quick Start

### 1. Clone e Configure
```bash
git clone https://github.com/entregafacil/mobile.git
cd EntregaFacil

# Mobile
cd mobile
cp .env.example .env.local
yarn install

# Backend
cd ../backend
cp .env.example .env
docker-compose up -d
```

### 2. Desenvolvimento Mobile
```bash
cd mobile
yarn start          # Expo dev server
yarn android        # Android emulator
yarn ios            # iOS simulator
```

### 3. Desenvolvimento Backend
```bash
cd backend
docker-compose up -d    # PostgreSQL, Redis, MinIO, OSRM, GraphHopper
yarn dev                # Hono dev server with hot reload
```

### 4. Build Preview
```bash
cd mobile
eas build --profile preview --platform all
```

## 📁 Estrutura do Projeto

```
EntregaFacil/
├── mobile/                     # React Native App (Expo)
│   ├── src/
│   │   ├── app/               # Expo Router pages
│   │   │   ├── (tabs)/        # Tab navigation
│   │   │   ├── route/         # Route flows
│   │   │   ├── addresses/     # Address management
│   │   │   └── settings/      # Settings screens
│   │   ├── shared/
│   │   │   ├── api/           # Axios client + sync
│   │   │   ├── hooks/         # Custom hooks
│   │   │   ├── store/         # Zustand store
│   │   │   ├── services/      # Notifications, feature flags
│   │   │   ├── constants/     # Theme, accessibility
│   │   │   ├── providers/     # Context providers
│   │   │   └── utils/         # Geo, performance
│   │   └── components/        # Shared UI components
│   ├── e2e/                   # Detox tests
│   ├── scripts/               # Build, analysis scripts
│   ├── app.config.ts          # Expo config
│   ├── eas.json               # EAS Build config
│   └── package.json
│
├── backend/                    # Node.js API (Hono)
│   ├── src/
│   │   ├── routes/            # API endpoints
│   │   ├── middleware/        # Auth, rate limit, security
│   │   ├── services/          # MinIO, OSRM, Evolution
│   │   ├── db/                # Drizzle schema + migrations
│   │   └── utils/             # Logger, validators
│   ├── docker-compose.yml     # Local stack
│   └── package.json
│
├── infra/                      # Infrastructure
│   ├── docker-compose.yml     # Production stack
│   ├── nginx.conf             # Reverse proxy
│   └── init-scripts/          # DB initialization
│
├── load-test/                  # k6 load tests
├── .github/workflows/          # CI/CD pipelines
├── docs/                       # Documentation
│   ├── SRS.md                 # Software Requirements Spec
│   ├── ARCHITECTURE.md        # Architecture decisions
│   ├── ROLLOUT_PLAN.md        # Gradual release plan
│   └── SECURITY_AUDIT.md      # Security audit report
│
└── README.md
```

## 🔧 Scripts Úteis

### Mobile
```bash
yarn start              # Expo dev server
yarn android            # Run on Android
yarn ios                # Run on iOS
yarn lint               # ESLint
yarn typecheck          # TypeScript check
yarn test:unit          # Jest unit tests
yarn test:e2e           # Detox E2E tests
yarn build:dev          # EAS development build
yarn build:preview      # EAS preview build
yarn build:prod         # EAS production build
yarn build:local        # Local build (requires Xcode/Android Studio)
yarn doctor             # Expo doctor
yarn prebuild           # Generate native projects
```

### Backend
```bash
yarn dev                # Dev server with hot reload
yarn build              # TypeScript compile
yarn lint               # ESLint
yarn typecheck          # TypeScript check
yarn test               # Unit tests
yarn db:generate        # Generate Drizzle migrations
yarn db:migrate         # Run migrations
yarn db:studio          # Drizzle Studio
yarn db:seed            # Seed test data
```

## 🧪 Testes

```bash
# Unit tests
cd mobile && yarn test:unit

# E2E tests (requires emulator/simulator)
cd mobile && yarn test:e2e

# Load tests (k6)
cd load-test && k6 run k6-script.js

# Security audit
cd backend && npm audit
```

## 📦 Deploy

### Preview/Staging
```bash
# Mobile
cd mobile
eas build --profile preview --platform all
eas submit --platform android --profile preview
eas submit --platform ios --profile preview

# Backend (via GitHub Actions on push to develop)
git push origin develop
```

### Produção
```bash
# Mobile
cd mobile
eas build --profile production --platform all
eas submit --platform android --profile production
eas submit --platform ios --profile production

# Backend (via GitHub Actions on push to main + tag)
git tag v1.0.0
git push origin main --tags
```

## 📊 Monitoramento

- **Sentry**: Error tracking + Performance (mobile + backend)
- **Grafana**: API metrics, latency, error rates, infrastructure
- **Loki**: Log aggregation
- **Prometheus**: Metrics collection
- **Alertas**: PagerDuty/Slack para crash spikes, ANR, latency

## 🔐 Segurança

- **SAST**: ESLint Security + TypeScript strict mode
- **DAST**: OWASP ZAP em CI
- **Secrets**: GitLeaks no pre-commit + GitHub Secrets
- **Dependencies**: npm audit + Dependabot
- **Network**: Certificate pinning (produção)
- **Data**: Criptografia em repouso (PostgreSQL) + TLS 1.3
- **LGPD**: Opt-in WhatsApp, dados mínimos, direito ao esquecimento

## 📚 Documentação

- [SRS - Especificação de Requisitos](docs/SRS.md)
- [Arquitetura e ADRs](docs/ARCHITECTURE.md)
- [Plano de Rollout Gradual](docs/ROLLOUT_PLAN.md)
- [Auditoria de Segurança](docs/SECURITY_AUDIT.md)
- [Guia EAS Build](mobile/EAS_BUILD_GUIDE.md)
- [Load Testing](load-test/README.md)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie branch feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit seguindo [Conventional Commits](https://www.conventionalcommits.org/)
4. Push para branch (`git push origin feature/nova-funcionalidade`)
5. Abra Pull Request

### Padrões de Commit
```
feat(scope): descrição curta
fix(scope): descrição curta
docs(scope): descrição curta
refactor(scope): descrição curta
test(scope): descrição curta
chore(scope): descrição curta
```

## 📄 Licença

Proprietary - Todos os direitos reservados © 2024 EntregaFácil

## 📞 Suporte

- **Email**: suporte@entregafacil.app
- **WhatsApp**: +55 11 99999-9999
- **Issues**: GitHub Issues (para bugs/feature requests)

---

**Versão**: 1.0.0  
**Última atualização**: 2024-11-18  
**Expo SDK**: 51 | **React Native**: 0.74 | **Node.js**: 20 LTS