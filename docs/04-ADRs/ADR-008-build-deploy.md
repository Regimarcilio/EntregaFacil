# ADR-008: Build/Deploy — EAS Build + GitHub Actions + VPS Docker Compose

**Status:** Accepted  
**Data:** 2026-11-17  
**Autor:** PLANMASTER

## Contexto
Pipeline de build e deploy para:
- Mobile: APK (Android) + AAB (Play Store) + IPA (iOS TestFlight/App Store)
- Backend: API, OSRM, GraphHopper, Evolution API, PostgreSQL, Redis, MinIO
- CI: Lint, typecheck, testes, validação SRS
- CD: Deploy staging/production com rollback
- Zero custo licença, infra self-hosted

## Decisão
**EAS Build (Expo)** para mobile (grátis 30 builds/mês), **GitHub Actions** para CI/CD, **VPS Docker Compose** para backend deploy.

## Alternativas Consideradas

| Opção | Mobile Build | Backend Deploy | Custo | Veredito |
|-------|--------------|----------------|-------|----------|
| **EAS + GH Actions + Docker Compose (Escolhido)** | ✅ Cloud, grátis | ✅ Declarativo, rollback fácil | $0 | ✅ |
| Fastlane Local | ⚠️ Requer Mac | Manual/Ansible | $0 | ❌ Complexo |
| Codemagic / Bitrise | ✅ Cloud | ❌ Não backend | Pago | ❌ |
| Kubernetes (K3s) | ✅ | ✅ | Complexo | ❌ Overkill |
| Ansible + VPS | ❌ | ✅ | $0 | ❌ Mobile gap |

## Consequências

### Positivas
- **EAS Build**: Build cloud sem Xcode/Android Studio local (managed workflow), OTA updates, credentials management
- **GitHub Actions**: CI nativo, matrix builds, cache, artifacts, environments (staging/prod)
- **Docker Compose**: Infra declarativa, `docker compose up -d` deploy, rollback = tag anterior
- **Zero Vendor Lock**: Self-hosted VPS, portable compose files

### Negativas/Riscos
- **EAS Bare Workflow**: Requer `eas build --profile production` com config nativa customizada
- **GitHub Actions Minutes**: Grátis 2000min/mês (público) / 3000min (privado) — suficiente
- **VPS Single Point**: Um VPS = SPOF (mitigado: backup diário, restore < 30min, futuro: multi-AZ)

## Pipeline CI (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

env:
  NODE_VERSION: '20'
  YARN_VERSION: '4.x'

jobs:
  lint-typecheck:
    name: Lint + TypeCheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: ${{ env.NODE_VERSION }}, cache: 'yarn' }
      - run: yarn install --frozen-lockfile
      - run: yarn lint
      - run: yarn typecheck
  
  test-unit:
    name: Testes Unitários
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: ${{ env.NODE_VERSION }}, cache: 'yarn' }
      - run: yarn install --frozen-lockfile
      - run: yarn test:unit --coverage
      - uses: codecov/codecov-action@v4
  
  test-integration:
    name: Testes Integração (Backend)
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.5
        env: { POSTGRES_DB: test, POSTGRES_USER: test, POSTGRES_PASSWORD: test }
        ports: [5432:5432]
        options: >-
          --health-cmd="pg_isready -U test" --health-interval=10s --health-timeout=5s --health-retries=5
      redis:
        image: redis:7-alpine
        ports: [6379:6379]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: ${{ env.NODE_VERSION }}, cache: 'yarn' }
      - run: yarn install --frozen-lockfile
      - run: yarn db:migrate:test
      - run: yarn test:integration
  
  validate-srs:
    name: Validação SRS
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          # Verificar se todos RFs têm AC Gherkin
          # Verificar se matriz rastreabilidade completa
          # Verificar se RNFs têm métricas quantificáveis
          node scripts/validate-srs.js docs/SRS.md
  
  build-mobile-dev:
    name: Build Mobile Development
    needs: [lint-typecheck, test-unit]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with: { eas-version: 'latest', token: ${{ secrets.EXPO_TOKEN }} }
      - run: yarn install --frozen-lockfile
      - run: eas build --profile development --platform android --non-interactive --no-wait
      - run: eas build --profile development --platform ios --non-interactive --no-wait

  build-mobile-prod:
    name: Build Mobile Production
    needs: [lint-typecheck, test-unit, test-integration, validate-srs]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with: { eas-version: 'latest', token: ${{ secrets.EXPO_TOKEN }} }
      - run: yarn install --frozen-lockfile
      - run: eas build --profile production --platform all --non-interactive --wait
      - name: Upload Artifacts
        uses: actions/upload-artifact@v4
        with: { name: 'mobile-builds', path: 'builds/' }
```

## Pipeline CD Backend (GitHub Actions → VPS)

```yaml
# .github/workflows/cd-backend.yml
name: CD Backend
on:
  push:
    branches: [main]
    paths: ['backend/**', 'docker-compose.yml', 'docker-compose.*.yml']

jobs:
  deploy-staging:
    name: Deploy Staging
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Staging VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/entregafacil-staging
            git pull origin main
            docker compose -f docker-compose.yml -f docker-compose.staging.yml pull
            docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d --remove-orphans
            docker image prune -f
  
  deploy-production:
    name: Deploy Production
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Production VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROD_VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/entregafacil-prod
            git pull origin main
            docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
            docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans
            docker image prune -f
      - name: Health Check
        run: |
          sleep 30
          curl -f https://api.entregafacil.app/health || exit 1
```

## Docker Compose Structure

```
├── docker-compose.yml              # Base services (api, postgres, redis, minio)
├── docker-compose.staging.yml      # Overrides: ports, env, resources (staging)
├── docker-compose.prod.yml         # Overrides: replicas, healthchecks, logging (prod)
├── docker-compose.routing.yml      # OSRM + GraphHopper (opcional, pode ser separado)
├── docker-compose.evolution.yml    # Evolution API + PostgreSQL + Redis
├── .env.staging                    # Secrets staging (gitignored)
├── .env.prod                       # Secrets prod (gitignored)
└── scripts/
    ├── deploy.sh                   # Wrapper deploy manual
    ├── backup.sh                   # pg_dump + minio mirror
    └── restore.sh                  # Restore from backup
```

## EAS Build Profiles (eas.json)

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "gradleCommand": ":app:assembleDebug" },
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "enterpriseProvisioning": "adhoc" }
    },
    "production": {
      "android": { "buildType": "aab" },
      "ios": { "enterpriseProvisioning": "app-store" }
    }
  },
  "submit": {
    "production": {
      "android": { "serviceAccountKeyPath": "./google-play-key.json", "track": "internal" },
      "ios": { "appleId": "dev@entregafacil.app", "ascAppId": "123456789" }
    }
  }
}
```

## Rollback Strategy

```bash
# Mobile: EAS Build version anterior
eas build:list --platform android --limit 5
eas submit --platform android --build-id <build-id-anterior>

# Backend: Docker Compose tag anterior
cd /opt/entregafacil-prod
git log --oneline -10
git checkout <tag-anterior>
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans

# Database: pg_restore point-in-time (WAL-G ou pgBackRest futuro)
pg_restore -d entregafacil backup_20261117_0300.dump
```

## Validação
- [ ] CI: Lint + TypeCheck + Testes unitários + Integração passam em < 10min
- [ ] Validação SRS: Script `validate-srs.js` detecta RFs sem AC, RNFs sem métricas
- [ ] Build Dev: `eas build --profile development` gera APK/IPA instalável
- [ ] Build Prod: `eas build --profile production` gera AAB/IPA submissível
- [ ] Deploy Staging: `docker compose up -d` em VPS staging < 5min
- [ ] Deploy Prod: Blue-green ou rolling update, health check passa
- [ ] Rollback: Mobile + Backend rollback testado < 15min

## Referências
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Compose Spec](https://docs.docker.com/compose/)
- [Benchmarks](docs/02-benchmarks.md#5-backend--sync--database--comparativo)