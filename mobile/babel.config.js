module.exports = function(api) {
  api.cache(true);
  
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'react-native',
          jsxRuntime: 'automatic',
        },
      ],
    ],
    plugins: [
      // Path aliases
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@/shared': './src/shared',
            '@/app': './src/app',
            '@/assets': './assets',
          },
        },
      ],
      
      // React Compiler (experimental - disable for now)
      // 'react-compiler',
      
      // Reanimated plugin (must be last)
      'react-native-reanimated/plugin',
      
      // Performance optimizations for production
      ...(isProduction ? [
        // Remove console.log in production
        [
          'transform-remove-console',
          {
            exclude: ['error', 'warn', 'info'],
          },
        ],
        // Dead code elimination
        'transform-remove-debugger',
        // Inline small functions
        'inline-functions',
        // Constant folding
        'constant-folding',
      ] : []),
      
      // Development tools
      ...(isDevelopment ? [
        // React DevTools
        'react-refresh/babel',
      ] : []),
    ],
    
    // Env-specific configs
    env: {
      production: {
        compact: true,
        minified: true,
        comments: false,
      },
      development: {
        compact: false,
        minified: false,
        comments: true,
      },
    },
  };
};