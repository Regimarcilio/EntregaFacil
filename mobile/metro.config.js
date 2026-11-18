const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Custom resolver for path aliases
config.resolver = {
  ...config.resolver,
  alias: {
    '@': path.resolve(__dirname, 'src'),
    '@/shared': path.resolve(__dirname, 'src/shared'),
    '@/app': path.resolve(__dirname, 'src/app'),
    '@/assets': path.resolve(__dirname, 'assets'),
  },
  // Support for .cjs files
  sourceExts: [...config.resolver.sourceExts, 'cjs'],
};

// Transformer optimizations
config.transformer = {
  ...config.transformer,
  // Enable minification in production
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
    compress: {
      drop_console: process.env.NODE_ENV === 'production',
      drop_debugger: process.env.NODE_ENV === 'production',
    },
  },
  // Experimental features
  unstable_allowRequireContext: true,
};

// Serializer for better caching
config.serializer = {
  ...config.serializer,
  // Use stable hashing for better cache hits
  getModulesRunBeforeMainModule: () => [],
};

// Watchman configuration
config.watchFolders = [
  path.resolve(__dirname, 'src'),
];

// Reset cache on config change
config.resetCache = true;

module.exports = config;