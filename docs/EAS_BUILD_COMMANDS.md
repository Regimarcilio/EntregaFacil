# EAS Build Commands - Ready to Run
## EntregaFácil Mobile v1.0.0

> **Important**: Run these commands from the `mobile/` directory
> ```bash
> cd /home/oficina/PROJETOS/EntregaFacil/mobile
> ```

---

## 🔐 Prerequisites: Credential Setup

### 1. Login to EAS
```bash
# Login (one-time)
eas login

# Verify login
eas whoami
```

### 2. Configure Project (first time only)
```bash
# Link project to EAS
eas build:configure

# This creates/updates eas.json and prompts for:
# - Platform (Android/iOS/both)
# - Build profile
# - Keystore/credentials handling
```

### 3. Set Up Credentials (Android)

#### Option A: EAS Managed Credentials (Recommended)
```bash
# Let EAS generate and manage keystore
eas credentials:configure --platform android

# Select: "Generate new keystore"
# EAS stores keystore securely in cloud
```

#### Option B: Local Keystore (If you have existing)
```bash
# Generate keystore locally
./scripts/generate-keystore.sh

# Upload to EAS
eas credentials:upload:android \
  --keystore-path ./keystore.jks \
  --alias entregafacil

# Set secrets in EAS
eas secret:create --scope project --name ANDROID_KEYSTORE_PASSWORD --value "YOUR_KEYSTORE_PASSWORD"
eas secret:create --scope project --name ANDROID_KEY_PASSWORD --value "YOUR_KEY_PASSWORD"
```

### 4. Set Up Credentials (iOS)

#### Option A: EAS Managed (Recommended)
```bash
# Let EAS handle certificates/provisioning
eas credentials:configure --platform ios

# Select: "Let EAS manage"
# Requires Apple Developer account credentials
```

#### Option B: Local Certificates
```bash
# If you have .p12 and .mobileprovision
eas credentials:upload:ios \
  --cert-path ./certs/entregafacil.p12 \
  --provisioning-profile-path ./certs/entregafacil.mobileprovision

# Set secrets
eas secret:create --scope project --name IOS_CERT_PASSWORD --value "YOUR_P12_PASSWORD"
```

### 5. Store Secrets
```bash
# Required secrets for all builds
eas secret:create --scope project --name EXPO_TOKEN --value "YOUR_EXPO_TOKEN"
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value "YOUR_SENTRY_TOKEN"
eas secret:create --scope project --name SENTRY_DSN --value "https://your-dsn@sentry.io/project"
eas secret:create --scope project --name GOOGLE_PLAY_SERVICE_ACCOUNT_JSON --value "$(cat google-play-service-account.json)"
eas secret:create --scope project --name APP_STORE_CONNECT_API_KEY --value "$(cat appstoreconnect-api-key.json | base64)"
eas secret:create --scope project --name ASC_APP_ID --value "YOUR_APP_STORE_CONNECT_APP_ID"
eas secret:create --scope project --name APPLE_TEAM_ID --value "YOUR_APPLE_TEAM_ID"
eas secret:create --scope project --name APPLE_ID --value "your-apple-id@email.com"

# Staging-specific
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://api-staging.entregafacil.app" --environment staging
eas secret:create --scope project --name EXPO_PUBLIC_EVOLUTION_URL --value "https://evolution-staging.entregafacil.app" --environment staging

# Production-specific
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://api.entregafacil.app" --environment production
eas secret:create --scope project --name EXPO_PUBLIC_EVOLUTION_URL --value "https://evolution.entregafacil.app" --environment production
```

### 6. Verify Secrets
```bash
# List all secrets
eas secret:list --scope project

# Verify specific secret (value hidden)
eas secret:get --scope project --name ANDROID_KEYSTORE_PASSWORD
```

---

## 🏗️ Build Commands

### Development Build (Internal Testing)
```bash
# Android only
eas build --profile development --platform android

# iOS only (simulator)
eas build --profile development --platform ios

# Both platforms
eas build --profile development --platform all

# Local build (requires Xcode/Android Studio)
eas build --profile local --platform all --local
```

### Preview/Staging Build (QA Distribution)
```bash
# Both platforms - creates APK (Android) + Ad-hoc IPA (iOS)
eas build --profile preview --platform all

# Android only (APK)
eas build --profile preview --platform android

# iOS only (Ad-hoc)
eas build --profile preview --platform ios

# With custom message
eas build --profile preview --platform all --message "Staging build for QA - $(date)"
```

### Production Build (Store Release)
```bash
# Both platforms - creates AAB (Android) + App Store IPA (iOS)
eas build --profile production --platform all

# Android only (AAB)
eas build --profile production --platform android

# iOS only (App Store IPA)
eas build --profile production --platform ios

# With version bump (auto-increments via hook)
eas build --profile production --platform all --message "Release v1.0.0"
```

### Build with Specific Environment
```bash
# Force staging env on production profile
eas build --profile production --platform all \
  --env NODE_ENV=staging \
  --env EXPO_PUBLIC_API_URL=https://api-staging.entregafacil.app

# Build specific git commit
eas build --profile production --platform all --commit abc123def

# Build from specific branch
eas build --profile production --platform all --branch release/v1.0.0
```

---

## 📦 Submit to Stores

### Google Play Store
```bash
# Internal Testing (instant)
eas submit --platform android --profile production

# Closed Testing (Alpha)
eas submit --platform android --profile production --track alpha

# Open Testing (Beta)
eas submit --platform android --profile production --track beta

# Production (with rollout)
eas submit --platform android --profile production --track production --rollout 0.1

# Check submission status
eas submit:status --platform android --id SUBMISSION_ID
```

### Apple App Store / TestFlight
```bash
# TestFlight (Internal)
eas submit --platform ios --profile production

# TestFlight (External)
eas submit --platform ios --profile production --group "External Testers"

# App Store Connect (Review)
eas submit --platform ios --profile production --submit-for-review

# Check submission status
eas submit:status --platform ios --id SUBMISSION_ID
```

---

## 🔄 OTA Updates (expo-updates)

### Publish Update
```bash
# Production branch
eas update --branch production --message "Release v1.0.1 - Bug fixes"

# Staging branch
eas update --branch preview --message "Staging hotfix"

# With specific runtime version
eas update --branch production --message "Update" --runtime-version 1.0.0
```

### View Updates
```bash
# List updates
eas update:list --branch production

# View details
eas update:view --branch production --id UPDATE_ID

# Rollback
eas update:rollback --branch production
```

---

## 📋 Build Management

### List Builds
```bash
# All builds
eas build:list --platform all --limit 20

# Specific platform
eas build:list --platform android --limit 10
eas build:list --platform ios --limit 10

# Specific profile
eas build:list --profile production --limit 5
```

### Build Details
```bash
# View build details
eas build:view --id BUILD_ID

# Download artifact
eas build:download --id BUILD_ID --output ./artifacts/

# Cancel running build
eas build:cancel --id BUILD_ID
```

### Wait for Build Completion
```bash
# Start build without waiting
eas build --profile production --platform all --no-wait

# Wait for specific build
eas build:wait --id BUILD_ID

# Wait for latest production build
BUILD_ID=$(eas build:list --platform all --profile production --limit 1 --json | jq -r '.[0].id')
eas build:wait --id $BUILD_ID
```

---

## 🔍 Troubleshooting

### Common Issues

#### Build Fails: "Credentials not found"
```bash
# Reconfigure credentials
eas credentials:configure --platform android
eas credentials:configure --platform ios
```

#### Build Fails: "Keystore password incorrect"
```bash
# Verify secrets
eas secret:list --scope project
eas secret:get --scope project --name ANDROID_KEYSTORE_PASSWORD

# Recreate if needed
eas credentials:configure --platform android
```

#### Build Fails: "CocoaPods failed"
```bash
# Clear cache and rebuild
cd mobile
rm -rf ios/Pods ios/Podfile.lock
eas build --profile production --platform ios --clear-cache
```

#### Build Fails: "Metro bundler error"
```bash
# Reset Metro cache
npx expo start -c
# Or
npx expo start --clear
```

#### "No space left on device" (local builds)
```bash
# Clean up
docker system prune -a
rm -rf ~/Library/Developer/Xcode/DerivedData/*
rm -rf ~/.gradle/caches/*
```

### View Build Logs
```bash
# Real-time logs
eas build:logs --id BUILD_ID

# Last 100 lines
eas build:logs --id BUILD_ID --lines 100

# Follow live
eas build:logs --id BUILD_ID --follow
```

---

## 🔐 Credential Management

### Rotate Secrets
```bash
# Update secret
eas secret:update --scope project --name ANDROID_KEYSTORE_PASSWORD --value "NEW_PASSWORD"

# Delete secret
eas secret:delete --scope project --name OLD_SECRET_NAME
```

### Backup Credentials
```bash
# Export all credentials (for disaster recovery)
eas credentials:export --platform android --output ./credentials-backup/android/
eas credentials:export --platform ios --output ./credentials-backup/ios/
```

### Sync Team Credentials
```bash
# Share credentials with team member
eas credentials:share --platform android --email teammate@entregafacil.app
```

---

## 📊 CI/CD Integration

### GitHub Actions Snippet
```yaml
# .github/workflows/eas-build.yml
- name: Build Android Production
  run: |
    cd mobile
    eas build --profile production --platform android --non-interactive --no-wait
  env:
    EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
    ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
    ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}

- name: Wait for Build
  run: |
    cd mobile
    eas build:wait --id ${{ steps.build.outputs.build_id }}
```

### Build Status Badge
```markdown
# Add to README.md
![EAS Build Status](https://img.shields.io/endpoint?url=https://api.expo.dev/v1/projects/YOUR_PROJECT_ID/builds/latest?style=flat-square)
```

---

## ✅ Pre-Build Checklist

Before running production build:

- [ ] `yarn typecheck` passes
- [ ] `yarn lint` passes (zero warnings)
- [ ] `yarn test:unit` passes
- [ ] `yarn test:e2e` passes
- [ ] Security audit clean (`npm audit`)
- [ ] Version bumped in `package.json` and `app.config.ts`
- [ ] CHANGELOG.md updated
- [ ] All secrets configured in EAS
- [ ] Credentials verified (`eas credentials:list`)
- [ ] TestFlight/Play Console tracks ready
- [ ] Sentry DSN configured
- [ ] Feature flags defaults set for production

---

## 📞 Quick Reference Card

| Task | Command |
|------|---------|
| Quick dev build | `eas build --profile development --platform android` |
| Staging for QA | `eas build --profile preview --platform all` |
| Production release | `eas build --profile production --platform all` |
| Submit to Play Store | `eas submit --platform android --profile production` |
| Submit to TestFlight | `eas submit --platform ios --profile production` |
| OTA hotfix | `eas update --branch production --message "Hotfix"` |
| Check build status | `eas build:list --limit 5` |
| View secrets | `eas secret:list` |
| View credentials | `eas credentials:list --platform all` |

---

**Last Updated**: 2024-11-18  
**Next Review**: Before each production release