# EntregaFácil

> **Copiloto do motoboy:** Organiza endereços, calcula a melhor rota, navega offline, comprova entrega com foto+assinatura e avisa o cliente no WhatsApp automaticamente.

## 📋 Visão Geral

Aplicativo mobile (React Native + Expo) para motoristas de aplicativos de entrega (iFood, Uber Eats, 99Food, Rappi) e motoboys autônomos que precisam:

- 📍 **Gerenciar endereços** - CRUD, autocomplete (OSM/Google), import CSV/WhatsApp
- 🗺️ **Otimizar rotas** - OSRM (TSP guloso) + GraphHopper (VRP com restrições)
- 🧭 **Navegar offline** - MapLibre + MBTiles (tiles vetoriais), turn-by-turn com voz
- 📸 **Comprovar entregas** - Foto obrigatória + GPS + hash + assinatura digital
- 💬 **WhatsApp automático** - Evolution API (Cloud API + Baileys), templates aprovados Meta
- 🔄 **Sync offline-first** - Queue local idempotente + LWW conflict resolution

## 🏗️ Arquitetura

```
┌─────────────────┐     ┌──────────────────────────────────────────┐
│  Mobile App     │────►│  Backend API (Hono/Node.js)              │
│  React Native   │     │  - Auth (Better Auth)                    │
│  + Expo         │     │  - CRUD (Drizzle/PostgreSQL+PostGIS)     │
│  Bare Workflow  │     │  - Sync Engine (Optimistic + LWW)        │
└─────────────────┘     └──────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌───────────┐       ┌─────────────┐    ┌─────────────┐
    │   OSRM    │       │ GraphHopper │    │  Evolution  │
    │  (TSP)    │       │  (jsprit)   │    │   API (WA)  │
    └───────────┘       └─────────────┘    └─────────────┘
```

## 🚀 Quick Start

### Pré-requisitos
- Node.js 20+
- Yarn 4+ (Berry)
- Docker + Docker Compose
- Android Studio / Xcode (para bare workflow)

### 1. Clone e Setup
```bash
git clone https://github.com/seu-org/entregafacil.git
cd entregafacil
```

### 2. Infraestrutura (Docker Compose)
```bash
cd infra
cp .env.example .env
# Edite as variáveis de ambiente
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d
```

### 3. Backend
```bash
cd backend
cp .env.example .env
# Edite as variáveis
yarn install
yarn db:migrate
yarn db:seed  # opcional: dados de teste
yarn dev
```

### 4. Mobile
```bash
cd mobile
cp .env.example .env
yarn install
yarn start          # Expo Go (managed)
# ou
yarn prebuild       # Bare workflow (necessário para MapLibre Navigation SDK)
yarn run:android
yarn run:ios
```

## 📁 Estrutura do Projeto

```
entregafacil/
├── mobile/                 # React Native + Expo
│   ├── src/
│   │   ├── app/           # Expo Router (file-based routing)
│   │   ├── features/      # Features (addresses, routes, navigation, etc.)
│   │   ├── shared/        # Shared (ui, hooks, store, api, constants)
│   │   └── __tests__/
│   ├── eas.json           # EAS Build config
│   └── app.config.ts
├── backend/               # Node.js + Hono + TypeScript
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── services/      # External services (OSRM, Evolution, etc.)
│   │   ├── db/            # Drizzle ORM + schemas
│   │   └── middleware/
│   └── Dockerfile
├── infra/                 # Infrastructure as Code
│   ├── docker-compose.yml           # Base services
│   ├── docker-compose.routing.yml   # OSRM + GraphHopper
│   ├── docker-compose.evolution.yml # Evolution API
│   └── nginx/             # Reverse proxy + SSL
└── .github/workflows/     # CI/CD
```

## 🔧 Comandos Úteis

### Mobile
```bash
cd mobile
yarn start              # Expo CLI
yarn android            # Emulador Android
yarn ios                # Simulador iOS
yarn lint               # ESLint
yarn typecheck          # TypeScript check
yarn test:unit          # Jest
yarn test:e2e           # Detox
eas build --profile development --platform android
eas build --profile production --platform all
```

### Backend
```bash
cd backend
yarn dev                # Hot reload
yarn build              # Compila para dist/
yarn db:generate        # Gera migrações Drizzle
yarn db:migrate         # Aplica migrações
yarn db:studio          # Drizzle Studio UI
yarn test:unit          # Vitest
yarn test:integration   # Testes com testcontainers
```

### Infraestrutura
```bash
cd infra
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d
docker compose logs -f api
./scripts/backup.sh
```

## 🧪 Testes

```bash
# Mobile
cd mobile && yarn test:unit --coverage
cd mobile && yarn test:e2e

# Backend
cd backend && yarn test:unit --coverage
cd backend && yarn test:integration
```

## 📦 CI/CD

- **GitHub Actions** para lint, typecheck, testes, SAST
- **EAS Build** para builds mobile (development/preview/production)
- **Docker Compose** para deploy backend (staging/production)
- **Health checks** automáticos em todos os serviços

## 🔐 Variáveis de Ambiente Principais

### Backend (.env)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/entregafacil
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-32-char-secret
BETTER_AUTH_SECRET=your-32-char-secret
OSRM_BASE_URL=http://localhost:5000
GRAPHHOPPER_BASE_URL=http://localhost:8989
EVOLUTION_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=your-evolution-key
MINIO_ENDPOINT=localhost
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

### Mobile (.env)
```env
EXPO_PUBLIC_API_URL=https://api.entregafacil.app
EXPO_PUBLIC_EVOLUTION_URL=https://evolution.entregafacil.app
EXPO_PUBLIC_MAPBOX_TOKEN=optional
```

## 📚 Documentação

- [Visão e Escopo](docs/01-visao-e-escopo.md)
- [Benchmarks Técnicos](docs/02-benchmarks.md)
- [SRS Completo](docs/SRS.md)
- [Arquitetura e UML](docs/03-arquitetura-e-uml.md)
- [ADRs](docs/04-ADRs/)
- [Backlog Scrum](docs/05-backlog.md)
- [Plano de Entrega](docs/06-plano-de-entrega.md)
- [Onboarding Mobile](docs/onboarding-mobile.md)
- [Onboarding Backend](docs/onboarding-backend.md)
- [Checklist LGPD](docs/lgpd-checklist.md)

## 🛣️ Roadmap

| Versão | Data | Features |
|--------|------|----------|
| **v0.1 (MVP)** | 10 semanas | Core: endereços, rotas, OSRM, navegação simples, comprovação, WhatsApp, offline, relatórios |
| **v0.2** | +6 semanas | MapLibre Navigation SDK nativo, GraphHopper VRP, dashboard web gestor |
| **v1.0 (GA)** | +12 semanas | Integração iFood/Uber APIs, IA previsão demanda, multi-idioma, gamificação |

## 🤝 Contribuindo

1. Fork o projeto
2. Crie branch feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit seguindo [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/)
4. Push e abra Pull Request
5. CI deve passar (lint, typecheck, testes, SAST)

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

**Desenvolvido com ❤️ para motoboys e motoristas de entrega do Brasil**