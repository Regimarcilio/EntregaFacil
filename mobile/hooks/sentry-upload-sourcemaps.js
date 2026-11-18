#!/usr/bin/env node
/**
 * EAS Build Post-Publish Hook
 * Uploads sourcemaps to Sentry after publish
 * Requires @sentry/cli and SENTRY_AUTH_TOKEN environment variable
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function main() {
  const organization = process.env.SENTRY_ORG || 'entregafacil';
  const project = process.env.SENTRY_PROJECT || 'mobile';
  const authToken = process.env.SENTRY_AUTH_TOKEN;
  const release = process.env.EXPO_RELEASE_VERSION || process.env.APP_VERSION;
  const dist = process.env.EXPO_RELEASE_DIST || process.env.BUILD_NUMBER;

  if (!authToken) {
    console.log('⚠️ SENTRY_AUTH_TOKEN not set, skipping sourcemap upload');
    return;
  }

  if (!release) {
    console.log('⚠️ Release version not available, skipping sourcemap upload');
    return;
  }

  console.log(`📤 Uploading sourcemaps to Sentry (${organization}/${project}@${release})...`);

  try {
    // Create Sentry release
    execSync(
      `npx @sentry/cli releases new ${release} --org ${organization} --project ${project}`,
      { stdio: 'inherit', env: { ...process.env, SENTRY_AUTH_TOKEN: authToken } }
    );

    // Set commits (optional, requires git)
    try {
      execSync(
        `npx @sentry/cli releases set-commits ${release} --auto --org ${organization} --project ${project}`,
        { stdio: 'inherit', env: { ...process.env, SENTRY_AUTH_TOKEN: authToken } }
      );
    } catch (e) {
      console.log('⚠️ Could not set commits (not in git repo or no commits)');
    }

    // Upload sourcemaps for Android
    const androidSourcemapsPath = path.resolve(__dirname, '../dist/android');
    if (fs.existsSync(androidSourcemapsPath)) {
      execSync(
        `npx @sentry/cli releases files ${release} upload-sourcemaps ${androidSourcemapsPath} --org ${organization} --project ${project} --strip-prefix dist/android --rewrite`,
        { stdio: 'inherit', env: { ...process.env, SENTRY_AUTH_TOKEN: authToken } }
      );
      console.log('✅ Android sourcemaps uploaded');
    }

    // Upload sourcemaps for iOS
    const iosSourcemapsPath = path.resolve(__dirname, '../dist/ios');
    if (fs.existsSync(iosSourcemapsPath)) {
      execSync(
        `npx @sentry/cli releases files ${release} upload-sourcemaps ${iosSourcemapsPath} --org ${organization} --project ${project} --strip-prefix dist/ios --rewrite`,
        { stdio: 'inherit', env: { ...process.env, SENTRY_AUTH_TOKEN: authToken } }
      );
      console.log('✅ iOS sourcemaps uploaded');
    }

    // Finalize release
    execSync(
      `npx @sentry/cli releases finalize ${release} --org ${organization} --project ${project}`,
      { stdio: 'inherit', env: { ...process.env, SENTRY_AUTH_TOKEN: authToken } }
    );

    console.log(`✅ Sentry release ${release} finalized`);
  } catch (error) {
    console.error('❌ Failed to upload sourcemaps to Sentry:', error.message);
    // Don't fail the build for sourcemap upload errors
    process.exit(0);
  }
}

main();