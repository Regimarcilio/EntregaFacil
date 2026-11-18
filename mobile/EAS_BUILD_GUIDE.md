# EntregaFácil Mobile - EAS Build Guide

Guia completo para configuração, build e deploy do app EntregaFácil usando Expo Application Services (EAS).

---

## 📋 Visão Geral

Este projeto usa **EAS Build** para builds nativos, **EAS Submit** para deploy nas stores, e **Expo Updates (OTA)** para atualizações over-the-air.

### Perfis de Build

| Perfil | Platform | Distribuição | Uso |
|--------|----------|--------------|-----|
| `development` | Android/iOS | Internal | Desenvolvimento com dev client |
| `preview` | Android (APK) / iOS (Ad-hoc) | Internal | Testes internos / QA |
| `production` | Android (AAB) / iOS (App Store) | Store | Release production |
| `local` | Android/iOS | Internal | Build local na máquina |

---

## 🚀 Primeiros Passos

### 1. Pré-requisitos

```bash
# Instalar EAS CLI
npm install -g eas-cli@latest

# Login no Expo
eas login

# Configurar projeto (primeira vez)
cd mobile
eas build:configure
```

### 2. Configurar Credenciais

```bash
# Configurar credenciais Android (keystore)
eas credentials:configure --platform android

# Configurar credenciais iOS (certificados/provisioning)
eas credentials:configure --platform ios
```

### 3. Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
# Edite .env.local com seus valores reais
```

**NUNCA commite `.env.local`** - está no `.gitignore`.

---

## 🔐 Credenciais Necessárias

### Android (Keystore)

```bash
# Gerar keystore (executar uma vez)
./scripts/generate-keystore.sh

# Adicionar secrets no EAS
eas secret:create --scope project --name ANDROID_KEYSTORE_PASSWORD --value "sua_senha"
eas secret:create --scope project --name ANDROID_KEY_PASSWORD --value "sua_senha_chave"

# Upload do keystore
eas credentials:upload:android --keystore-path ./keystore.jks --alias entregafacil
```

### iOS (Certificados)

```bash
# O EAS gerencia certificados automaticamente com "credentialsSource: remote"
# Apenas configure no painel do Expo/Apple Developer:
# 1. App ID: com.entregafacil.app
# 2. Certificados: Development + Distribution
# 3. Provisioning Profiles: Development + Ad Hoc + App Store
```

### Stores

```bash
# Google Play Service Account
eas secret:create --scope project --name GOOGLE_PLAY_SERVICE_ACCOUNT_JSON --value "$(cat google-play-service-account.json)"

# Apple App Store Connect API Key
eas secret:create --scope project --name APP_STORE_CONNECT_API_KEY --value "$(cat appstoreconnect-api-key.json | base64)"

# Apple Team ID
eas secret:create --scope project --name APPLE_TEAM_ID --value "ABC123DEFG"
```

### Sentry (Opcional)

```bash
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value "sua_token_sentry"
eas secret:create --scope project --name SENTRY_DSN --value "https://..."
```

---

## 🏗️ Comandos de Build

### Desenvolvimento
```bash
# Build development client (para testar no device)
eas build --profile development --platform android
eas build --profile development --platform ios

# Ou usar scripts do package.json
yarn build:dev
```

### Preview / Staging
```bash
# Build para testes internos (APK + Ad-hoc)
eas build --profile preview --platform all

# Script
yarn build:preview
```

### Produção
```bash
# Build para stores (AAB + IPA)
eas build --profile production --platform all

# Script
yarn build:prod
```

### Build Local (sem créditos EAS)
```bash
# Requer Android Studio / Xcode instalados
eas build --profile local --platform all --local

# Script
yarn build:local
```

---

## 📦 Deploy nas Stores

### Google Play Store

```bash
# Via EAS Submit (recomendado)
eas submit --platform android --profile production

# Ou via Fastlane (mais controle)
cd fastlane/android
bundle exec fastlane internal    # Internal testing
bundle exec fastlane alpha       # Closed testing
bundle exec fastlane beta        # Open testing
bundle exec fastlane production  # Produção (10% rollout)
```

### Apple App Store / TestFlight

```bash
# Via EAS Submit
eas submit --platform ios --profile production

# Ou via Fastlane
cd fastlane/ios
bundle exec fastlane testflight         # Internal
bundle exec fastlane testflight_external # External
bundle exec fastlane release            # App Store
```

---

## 🔄 Atualizações OTA (Over-The-Air)

### Publicar Update
```bash
# Production
eas update --branch production --message "Release v1.0.0"

# Staging
eas update --branch preview --message "Staging build"

# Scripts
yarn update:prod
yarn update:staging
```

### Configuração no App
- `runtimeVersion.policy: "appVersion"` - Update compatível com mesma versão nativa
- `updates.checkAutomatically: "ON_LOAD"` - Verifica update ao abrir app
- `updates.fallbackToCacheTimeout: 30000` - Timeout 30s

### Rollback
```bash
# Lista updates
eas update:list --branch production

# Rollback para versão anterior
eas update:rollback --branch production
```

---

## 🤖 CI/CD com GitHub Actions

O workflow `.github/workflows/eas-build.yml` executa automaticamente:

### Triggers
- Push para `develop` → Build `development` + `preview`
- Push para `main` → Build `preview` + `production` + Deploy + OTA
- Tags `v*` → Build `production` + GitHub Release

### Jobs
1. **quality** - Lint, typecheck, testes
2. **build-android** - Build Android (3 perfis)
3. **build-ios** - Build iOS (3 perfis)
4. **deploy-android** - Deploy Play Store (main only)
5. **deploy-ios** - Deploy TestFlight/App Store (main only)
6. **ota-update** - Publica OTA update (main only)

### Secrets Necessários no GitHub

```bash
# Expo
EXPO_TOKEN
EAS_PROJECT_ID

# Android
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_PASSWORD
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON

# iOS
APPLE_TEAM_ID
APP_STORE_CONNECT_API_KEY
ASC_APP_ID
APPLE_ID

# Sentry
SENTRY_AUTH_TOKEN

# Notificações
SLACK_WEBHOOK_URL
```

---

## 📱 Versionamento

### Estratégia
- **Semantic Versioning**: MAJOR.MINOR.PATCH (ex: 1.0.0)
- **Build Number**: Incrementa a cada build (iOS: CFBundleVersion, Android: versionCode)
- **Auto-increment**: Hook `preBuild` incrementa automaticamente

### Hooks Configurados
- `hooks/version-bump.js` - Incrementa versão antes do build
- `hooks/sentry-upload-sourcemaps.js` - Upload sourcemaps pós-publish

### Manual Version Bump
```bash
# Patch (bugfix): 1.0.0 → 1.0.1
EAS_BUILD_PROFILE=production yarn version:bump

# Minor (feature): 1.0.0 → 1.1.0
# Major (breaking): 1.0.0 → 2.0.0
```

---

## 🔧 Configurações Avançadas

### ProGuard / R8 (Android)
```json
// eas.json - production profile
"android": {
  "proguard": true,
  "minifyEnabled": true,
  "shrinkResources": true
}
```

### Hermes Engine
```json
// app.config.ts
"experiments": {
  "reactCompiler": false  // Usar Hermes (padrão Expo SDK 51+)
}
```

### Bundle Analyzer
```bash
# Analisar bundle size
npx expo-bundle-analyzer
```

### Cache EAS
```json
// eas.json
"experimental": {
  "cache": { "enabled": true },
  "remoteBuildCache": { "enabled": true }
}
```

---

## 🐛 Troubleshooting

### Build Falha - "Credentials not found"
```bash
eas credentials:configure --platform android
eas credentials:configure --platform ios
```

### Build Falha - "Keystore password incorrect"
```bash
# Verifique secrets no EAS Dashboard ou CLI
eas secret:list --scope project
```

### Build Falha - "CocoaPods failed"
```bash
# Limpar cache
cd mobile
rm -rf ios/Pods ios/Podfile.lock
eas build --profile production --platform ios --clear-cache
```

### OTA Update Não Aplica
- Verifique `runtimeVersion` no app.config.ts
- Build nativo deve ter mesma `runtimeVersion`
- `expo-updates` deve estar configurado corretamente

### Metro Bundler Issues
```bash
# Reset cache
expo start -c
# ou
npx expo start --clear
```

---

## 📚 Recursos Úteis

- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [EAS Submit Docs](https://docs.expo.dev/submit/introduction/)
- [Expo Updates](https://docs.expo.dev/eas-update/introduction/)
- [Fastlane Docs](https://docs.fastlane.tools/)
- [App Store Connect API](https://developer.apple.com/app-store-connect/api/)
- [Google Play Publishing API](https://developers.google.com/android-publisher)

---

## 📝 Checklist de Release

### Pré-Release
- [ ] Testes unitários passando (`yarn test:unit`)
- [ ] TypeScript sem erros (`yarn typecheck`)
- [ ] Lint limpo (`yarn lint`)
- [ ] Build preview testado em device real
- [ ] QA aprovado no staging

### Release Production
- [ ] Version bump executado
- [ ] Changelog atualizado
- [ ] Build production gerado (AAB + IPA)
- [ ] Deploy Internal Testing → Alpha → Beta (opcional)
- [ ] Deploy Production (10% rollout inicial)
- [ ] OTA update publicado
- [ ] Monitoramento Sentry ativo
- [ ] Rollback plan documentado

### Pós-Release
- [ ] Verificar crash-free rate > 99.5%
- [ ] Monitorar ANR rate
- [ ] Verificar adoption rate da nova versão
- [ ] Rollout gradual (10% → 50% → 100%)
- [ ] Hotfix se necessário

---

## 🔗 Links Rápidos

| Ação | Comando |
|------|---------|
| Build Dev | `yarn build:dev` |
| Build Preview | `yarn build:preview` |
| Build Prod | `yarn build:prod` |
| Deploy Android | `yarn submit:android` |
| Deploy iOS | `yarn submit:ios` |
| OTA Update Prod | `yarn update:prod` |
| OTA Update Staging | `yarn update:staging` |
| Ver builds | `eas build:list` |
| Ver updates | `eas update:list --branch production` |
| Credenciais | `eas credentials:configure` |
| Secrets | `eas secret:list` |

---

*Última atualização: $(date)*
*Versão do guia: 1.0*