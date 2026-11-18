#!/bin/bash
set -e

echo "🔨 Building EntregaFácil APK locally..."

cd "$(dirname "$0")"

# 1. Fix package.json versions (remove tildes)
sed -i 's/"@react-native-gesture-handler": "~2.16.1"/"@react-native-gesture-handler": "2.16.1"/' package.json
sed -i 's/"react-native-reanimated": "~3.10.0"/"react-native-reanimated": "3.10.0"/' package.json
sed -i 's/"expo": "~51.0.0"/"expo": "51.0.0"/' package.json
sed -i 's/"expo-constants": "~16.0.0"/"expo-constants": "16.0.0"/' package.json
sed -i 's/"expo-camera": "~15.0.0"/"expo-camera": "15.0.0"/' package.json
sed -i 's/"expo-file-system": "~17.0.0"/"expo-file-system": "17.0.0"/' package.json
sed -i 's/"expo-font": "~12.0.0"/"expo-font": "12.0.0"/' package.json
sed -i 's/"expo-image": "~1.12.0"/"expo-image": "1.12.0"/' package.json
sed -i 's/"expo-location": "~17.0.0"/"expo-location": "17.0.0"/' package.json
sed -i 's/"expo-media-library": "~16.0.0"/"expo-media-library": "16.0.0"/' package.json
sed -i 's/"expo-modules-core": "~1.12.0"/"expo-modules-core": "1.12.0"/' package.json
sed -i 's/"expo-notifications": "~0.28.0"/"expo-notifications": "0.28.0"/' package.json
sed -i 's/"expo-router": "~3.5.0"/"expo-router": "3.5.0"/' package.json
sed -i 's/"expo-secure-store": "~13.0.0"/"expo-secure-store": "13.0.0"/' package.json
sed -i 's/"expo-speech": "~12.0.0"/"expo-speech": "12.0.0"/' package.json
sed -i 's/"expo-status-bar": "~1.12.0"/"expo-status-bar": "1.12.0"/' package.json
sed -i 's/"expo-system-ui": "~3.0.0"/"expo-system-ui": "3.0.0"/' package.json
sed -i 's/"expo-task-manager": "~11.8.0"/"expo-task-manager": "11.8.0"/' package.json
sed -i 's/"expo-updates": "~0.25.0"/"expo-updates": "0.25.0"/' package.json
sed -i 's/"@expo\/metro-runtime": "~3.2.1"/"@expo\/metro-runtime": "3.2.1"/' package.json
sed -i 's/"@react-native-async-storage\/async-storage": "1.23.1"/"@react-native-async-storage\/async-storage": "1.23.1"/' package.json
sed -i 's/"@react-native-community\/netinfo": "11.4.1"/"@react-native-community\/netinfo": "11.4.1"/' package.json
sed -i 's/"@gorhom\/bottom-sheet": "\^4.6.0"/"@gorhom\/bottom-sheet": "4.6.0"/' package.json
sed -i 's/"@maplibre\/maplibre-react-native": "11.5.1"/"@maplibre\/maplibre-react-native": "11.5.1"/' package.json
sed -i 's/"@react-native-async-storage\/async-storage": "1.23.1"/"@react-native-async-storage\/async-storage": "1.23.1"/' package.json
sed -i 's/"@react-native-community\/netinfo": "11.4.1"/"@react-native-community\/netinfo": "11.4.1"/' package.json
sed -i 's/"@react-native-gesture-handler": "2.16.1"/"@react-native-gesture-handler": "2.16.1"/' package.json
sed -i 's/"@react-native-masked-view\/masked-view": "0.3.2"/"@react-native-masked-view\/masked-view": "0.3.2"/' package.json
sed -i 's/"@react-native-picker\/picker": "2.7.5"/"@react-native-picker\/picker": "2.7.5"/' package.json
sed -i 's/"@react-navigation\/bottom-tabs": "\^6.5.20"/"@react-navigation\/bottom-tabs": "6.5.20"/' package.json
sed -i 's/"@react-navigation\/native": "\^6.1.17"/"@react-navigation\/native": "6.1.17"/' package.json
sed -i 's/"@react-navigation\/stack": "\^6.3.29"/"@react-navigation\/stack": "6.3.29"/' package.json
sed -i 's/"@shopify\/flash-list": "1.6.4"/"@shopify\/flash-list": "1.6.4"/' package.json
sed -i 's/"@tanstack\/react-query": "\^5.28.0"/"@tanstack\/react-query": "5.28.0"/' package.json
sed -i 's/"axios": "\^1.7.0"/"axios": "1.7.0"/' package.json
sed -i 's/"date-fns": "\^3.6.0"/"date-fns": "3.6.0"/' package.json
sed -i 's/"@shopify\/flash-list": "1.6.4"/"@shopify\/flash-list": "1.6.4"/' package.json
sed -i 's/"@tanstack\/react-query": "\^5.28.0"/"@tanstack\/react-query": "5.28.0"/' package.json
sed -i 's/"axios": "\^1.7.0"/"axios": "1.7.0"/' package.json
sed -i 's/"date-fns": "\^3.6.0"/"date-fns": "3.6.0"/' package.json
sed -i 's/"patch-package": "\^8.0.0"/"patch-package": "8.0.0"/' package.json
sed -i 's/"react": "18.2.0"/"react": "18.2.0"/' package.json
sed -i 's/"react-dom": "18.2.0"/"react-dom": "18.2.0"/' package.json
sed -i 's/"react-native": "0.74.5"/"react-native": "0.74.5"/' package.json
sed -i 's/"react-native-gesture-handler": "2.16.1"/"react-native-gesture-handler": "2.16.1"/' package.json
sed -i 's/"react-native-maps": "1.14.0"/"react-native-maps": "1.14.0"/' package.json
sed -i 's/"react-native-reanimated": "3.10.0"/"react-native-reanimated": "3.10.0"/' package.json
sed -i 's/"react-native-safe-area-context": "4.10.5"/"react-native-safe-area-context": "4.10.5"/' package.json
sed -i 's/"react-native-screens": "3.31.1"/"react-native-screens": "3.31.1"/' package.json
sed -i 's/"react-native-svg": "15.2.0"/"react-native-svg": "15.2.0"/' package.json
sed -i 's/"react-native-view-shot": "3.8.0"/"react-native-view-shot": "3.8.0"/' package.json
sed -i 's/"uuid": "\^9.0.1"/"uuid": "9.0.1"/' package.json
sed -i 's/"zustand": "\^4.5.2"/"zustand": "4.5.2"/' package.json
sed -i 's/"@babel\/core": "\^7.24.0"/"@babel\/core": "7.24.0"/' package.json
sed -i 's/"@babel\/preset-env": "\^7.24.0"/"@babel\/preset-env": "7.24.0"/' package.json
sed -i 's/"@babel\/preset-typescript": "\^7.24.0"/"@babel\/preset-typescript": "7.24.0"/' package.json
sed -i 's/"@types\/jest": "\^29.5.12"/"@types\/jest": "29.5.12"/' package.json
sed -i 's/"@types\/react": "~18.2.79"/"@types\/react": "18.2.79"/' package.json
sed -i 's/"@types\/react-native": "\^0.73.0"/"@types\/react-native": "0.73.0"/' package.json
sed -i 's/"@types\/uuid": "\^9.0.8"/"@types\/uuid": "9.0.8"/' package.json
sed -i 's/"detox": "\^20.16.0"/"detox": "20.16.0"/' package.json
sed -i 's/"eslint": "\^8.57.0"/"eslint": "8.57.0"/' package.json
sed -i 's/"eslint-config-expo": "\^7.0.0"/"eslint-config-expo": "7.0.0"/' package.json
sed -i 's/"eslint-config-prettier": "\^9.1.0"/"eslint-config-prettier": "9.1.0"/' package.json
sed -i 's/"eslint-plugin-prettier": "\^5.1.3"/"eslint-plugin-prettier": "5.1.3"/' package.json
sed -i 's/"expo-doctor": "\^1.12.0"/"expo-doctor": "1.12.0"/' package.json
sed -i 's/"jest": "\^29.7.0"/"jest": "29.7.0"/' package.json
sed -i 's/"jest-expo": "~51.0.0"/"jest-expo": "51.0.0"/' package.json
sed -i 's/"patch-package": "\^8.0.0"/"patch-package": "8.0.0"/' package.json
sed -i 's/"prettier": "\^3.2.5"/"prettier": "3.2.5"/' package.json
sed -i 's/"ts-jest": "\^29.1.2"/"ts-jest": "29.1.2"/' package.json
sed -i 's/"typescript": "~5.3.3"/"typescript": "5.3.3"/' package.json

echo "✅ package.json versions fixed"
