#!/usr/bin/env node
/**
 * EAS Build Pre-Build Hook
 * Increments version code/build number automatically
 * Runs before each build
 */

const fs = require('fs');
const path = require('path');

const APP_CONFIG_PATH = path.resolve(__dirname, '../app.config.ts');
const PACKAGE_JSON_PATH = path.resolve(__dirname, '../package.json');

function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  return packageJson.version;
}

function incrementVersion(version, type = 'patch') {
  const parts = version.split('.').map(Number);
  if (type === 'major') {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (type === 'minor') {
    parts[1] += 1;
    parts[2] = 0;
  } else {
    parts[2] += 1;
  }
  return parts.join('.');
}

function incrementBuildNumber(buildNumber) {
  return parseInt(buildNumber) + 1;
}

function updatePackageJson(newVersion) {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  packageJson.version = newVersion;
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✅ Updated package.json version to ${newVersion}`);
}

function updateAppConfig(newVersion, newBuildNumber) {
  let content = fs.readFileSync(APP_CONFIG_PATH, 'utf-8');
  
  // Update version in app.config.ts
  content = content.replace(
    /version:\s*['"`][^'"`]+['"`]/,
    `version: '${newVersion}'`
  );
  
  // Update buildNumber in app.config.ts (for iOS)
  content = content.replace(
    /buildNumber:\s*['"`][^'"`]+['"`]/,
    `buildNumber: '${newBuildNumber}'`
  );
  
  // Update versionCode in app.config.ts (for Android)
  content = content.replace(
    /versionCode:\s*parseInt\(['"`][^'"`]+['"`]\)/,
    `versionCode: ${newBuildNumber}`
  );
  
  // Update versionName in app.config.ts
  content = content.replace(
    /versionName:\s*['"`][^'"`]+['"`]/,
    `versionName: '${newVersion}'`
  );
  
  fs.writeFileSync(APP_CONFIG_PATH, content);
  console.log(`✅ Updated app.config.ts version to ${newVersion} (build ${newBuildNumber})`);
}

function main() {
  const buildProfile = process.env.EAS_BUILD_PROFILE;
  const currentVersion = getCurrentVersion();
  
  console.log(`🔧 Pre-build hook running for profile: ${buildProfile}`);
  console.log(`📦 Current version: ${currentVersion}`);
  
  let newVersion = currentVersion;
  let newBuildNumber = process.env.BUILD_NUMBER || '1';
  
  if (buildProfile === 'production') {
    // For production, increment patch version and build number
    newVersion = incrementVersion(currentVersion, 'patch');
    newBuildNumber = incrementBuildNumber(newBuildNumber).toString();
  } else if (buildProfile === 'preview') {
    // For preview, increment build number only
    newBuildNumber = incrementBuildNumber(newBuildNumber).toString();
  } else if (buildProfile === 'development') {
    // For development, use dev suffix
    newVersion = `${currentVersion}-dev`;
  }
  
  console.log(`📦 New version: ${newVersion} (build ${newBuildNumber})`);
  
  // Update files
  updatePackageJson(newVersion);
  updateAppConfig(newVersion, newBuildNumber);
  
  // Set environment variables for the build
  process.env.APP_VERSION = newVersion;
  process.env.BUILD_NUMBER = newBuildNumber;
  
  console.log('✅ Version bump completed');
}

main();