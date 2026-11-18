module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: ['**/e2e/**/*.test.ts'],
  testTimeout: 120000,
  maxWorkers: 1,
  setupFilesAfterSetup: ['<rootDir>/e2e/setup.ts'],
  
  // Detox specific
  globals: {
    __DEV__: true,
  },
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './e2e/reports',
      outputName: 'junit.xml',
    }],
  ],
  
  // Coverage (optional for e2e)
  collectCoverage: false,
  
  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  
  // Test environment setup
  testEnvironmentOptions: {
    customExportConditions: ['react-native', 'browser'],
  },
};