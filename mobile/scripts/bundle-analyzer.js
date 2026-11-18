#!/usr/bin/env node
/**
 * Bundle Analysis Script for EntregaFácil Mobile
 * Analyzes JavaScript bundle size and dependencies
 * Run with: node scripts/bundle-analyzer.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MOBILE_DIR = path.join(PROJECT_ROOT, 'mobile');

function runCommand(cmd, cwd = MOBILE_DIR) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe' });
  } catch (error) {
    console.error(`Command failed: ${cmd}`);
    console.error(error.message);
    return null;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzePackageJson() {
  const pkgPath = path.join(MOBILE_DIR, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  
  console.log('\n📦 Package.json Analysis');
  console.log('='.repeat(50));
  console.log(`Name: ${pkg.name}`);
  console.log(`Version: ${pkg.version}`);
  console.log(`Dependencies: ${Object.keys(pkg.dependencies || {}).length}`);
  console.log(`DevDependencies: ${Object.keys(pkg.devDependencies || {}).length}`);
  
  // Check for heavy dependencies
  const heavyDeps = [
    'expo',
    'react-native',
    'react-native-maps',
    'react-native-reanimated',
    '@maplibre/maplibre-react-native',
    '@shopify/flash-list',
    '@gorhom/bottom-sheet',
    '@tanstack/react-query',
    'zustand',
    'axios',
    'date-fns',
    'expo-camera',
    'expo-location',
    'expo-notifications',
  ];
  
  console.log('\n🔍 Heavy Dependencies Check:');
  heavyDeps.forEach(dep => {
    if (pkg.dependencies?.[dep]) {
      console.log(`  ✓ ${dep}: ${pkg.dependencies[dep]}`);
    }
  });
  
  return pkg;
}

function analyzeBundle() {
  console.log('\n📊 Bundle Analysis');
  console.log('='.repeat(50));
  
  // Generate bundle stats using expo
  const output = runCommand('npx expo export --dev false --platform all --output-dir ./dist 2>&1');
  
  if (output) {
    console.log('Export completed');
  }
  
  // Check for bundle analysis tools
  console.log('\n💡 Recommended tools for deeper analysis:');
  console.log('  - npx expo-bundle-analyzer');
  console.log('  - npx metro-bundle-visualizer');
  console.log('  - npx @react-native-community/cli doctor');
}

function analyzeMetroConfig() {
  const metroPath = path.join(MOBILE_DIR, 'metro.config.js');
  
  console.log('\n⚙️ Metro Config Analysis');
  console.log('='.repeat(50));
  
  if (fs.existsSync(metroPath)) {
    const content = fs.readFileSync(metroPath, 'utf-8');
    console.log('metro.config.js exists ✓');
    
    // Check for optimizations
    const checks = [
      { pattern: /resetCache.*true/, name: 'Reset cache enabled' },
      { pattern: /alias/, name: 'Path aliases configured' },
      { pattern: /minifierConfig/, name: 'Minification configured' },
      { pattern: /sourceExts.*cjs/, name: 'CJS support' },
    ];
    
    checks.forEach(({ pattern, name }) => {
      const found = pattern.test(content);
      console.log(`  ${found ? '✓' : '✗'} ${name}`);
    });
  } else {
    console.log('⚠️ metro.config.js not found - using defaults');
  }
}

function analyzeBabelConfig() {
  const babelPath = path.join(MOBILE_DIR, 'babel.config.js');
  
  console.log('\n🔧 Babel Config Analysis');
  console.log('='.repeat(50));
  
  if (fs.existsSync(babelPath)) {
    const content = fs.readFileSync(babelPath, 'utf-8');
    console.log('babel.config.js exists ✓');
    
    const checks = [
      { pattern: /transform-remove-console/, name: 'Console removal (prod)' },
      { pattern: /transform-remove-debugger/, name: 'Debugger removal (prod)' },
      { pattern: /inline-functions/, name: 'Function inlining (prod)' },
      { pattern: /constant-folding/, name: 'Constant folding (prod)' },
      { pattern: /module-resolver/, name: 'Path aliases' },
      { pattern: /reanimated/, name: 'Reanimated plugin' },
    ];
    
    checks.forEach(({ pattern, name }) => {
      const found = pattern.test(content);
      console.log(`  ${found ? '✓' : '✗'} ${name}`);
    });
  } else {
    console.log('⚠️ babel.config.js not found');
  }
}

function checkHermesConfig() {
  console.log('\n⚡ Hermes Engine');
  console.log('='.repeat(50));
  
  const appConfigPath = path.join(MOBILE_DIR, 'app.config.ts');
  if (fs.existsSync(appConfigPath)) {
    const content = fs.readFileSync(appConfigPath, 'utf-8');
    
    if (content.includes('jsEngine') || content.includes('hermes')) {
      console.log('✓ Hermes configuration found in app.config.ts');
    } else {
      console.log('ℹ️ Hermes is default in Expo SDK 51+, no explicit config needed');
    }
  }
  
  // Check for hermes-specific optimizations
  console.log('\n💡 Hermes Optimization Tips:');
  console.log('  - Enable bytecode compilation: hermesFlags: "-O -output-source-map"');
  console.log('  - Use Hermes bytecode for production builds');
  console.log('  - Profile with: npx react-native-performance-monitor');
}

function checkStartupOptimization() {
  console.log('\n🚀 Startup Time Optimization');
  console.log('='.repeat(50));
  
  const checks = [
    { name: 'Lazy loading screens', pattern: /React\.lazy|createLazyScreen/ },
    { name: 'Deferred imports', pattern: /import\(/ },
    { name: 'Font preloading', pattern: /expo-font|Font\.loadAsync/ },
    { name: 'Splash screen config', pattern: /splash/ },
  ];
  
  // Check app files for patterns
  const srcDir = path.join(MOBILE_DIR, 'src');
  let foundPatterns = {};
  
  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        checks.forEach(check => {
          if (check.pattern.test(content)) {
            foundPatterns[check.name] = true;
          }
        });
      }
    });
  }
  
  scanDir(srcDir);
  
  checks.forEach(check => {
    console.log(`  ${foundPatterns[check.name] ? '✓' : '✗'} ${check.name}`);
  });
}

function generateRecommendations() {
  console.log('\n📋 Optimization Recommendations');
  console.log('='.repeat(50));
  
  const recommendations = [
    {
      priority: 'HIGH',
      title: 'Enable Hermes bytecode compilation',
      description: 'Compile JS to bytecode for faster startup',
      action: 'Add hermesFlags to app.config.ts for production',
    },
    {
      priority: 'HIGH',
      title: 'Lazy load heavy screens',
      description: 'Map, Navigation, Settings screens should be lazy loaded',
      action: 'Wrap with React.lazy() and Suspense',
    },
    {
      priority: 'MEDIUM',
      title: 'Optimize images',
      description: 'Use WebP, proper sizing, expo-image for caching',
      action: 'Run: npx expo-optimize',
    },
    {
      priority: 'MEDIUM',
      title: 'Reduce bundle size',
      description: 'Remove unused dependencies, use tree shaking',
      action: 'Run bundle analyzer, remove dead code',
    },
    {
      priority: 'MEDIUM',
      title: 'Preload critical resources',
      description: 'Fonts, critical images, API config',
      action: 'Use expo-font, InteractionManager.runAfterInteractions',
    },
    {
      priority: 'LOW',
      title: 'Enable Hermes bytecode caching',
      description: 'Cache compiled bytecode between runs',
      action: 'Configure in metro.config.js',
    },
  ];
  
  recommendations.forEach(rec => {
    console.log(`\n[${rec.priority}] ${rec.title}`);
    console.log(`  ${rec.description}`);
    console.log(`  Action: ${rec.action}`);
  });
}

function main() {
  console.log('🔬 EntregaFácil Mobile - Bundle Analysis');
  console.log('='.repeat(60));
  
  analyzePackageJson();
  analyzeMetroConfig();
  analyzeBabelConfig();
  checkHermesConfig();
  checkStartupOptimization();
  analyzeBundle();
  generateRecommendations();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Analysis complete!');
  console.log('\nNext steps:');
  console.log('  1. Run: npx expo-bundle-analyzer');
  console.log('  2. Profile startup with: npx react-native-performance-monitor');
  console.log('  3. Test production build: eas build --profile production --local');
}

main();