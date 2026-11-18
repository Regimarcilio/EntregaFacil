#!/bin/bash
set -e

echo "🚀 Building EntregaFácil APK locally (no cloud)..."

cd "$(dirname "$0")"

# 1. Fix package.json versions
./build-local.sh

# 2. Install dependencies (offline-friendly)
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps --prefer-offline 2>/dev/null || npm install --legacy-peer-deps

# 3. Prebuild (generates android/ folder with Gradle)
echo "🔧 Generating Android project..."
npx expo prebuild --clean --platform android

# 4. Build APK with Gradle (local, no cloud)
echo "🔨 Building APK with Gradle..."
cd android
./gradlew clean assembleRelease

# 5. Copy APK to project root
APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
    cp "$APK_PATH" "../../entregafacil.apk"
    echo ""
    echo "✅ APK built successfully!"
    echo "📍 Location: $(pwd)/../../entregafacil.apk"
    ls -lh ../../entregafacil.apk
else
    echo "❌ APK not found at $APK_PATH"
    find . -name "*.apk" -type f 2>/dev/null
    exit 1
fi
