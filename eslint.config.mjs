import mobileConfig from './apps/mobile/eslint.config.mjs';

export default [
  {
    ignores: [
      'apps/mobile/.expo/**',
      'apps/mobile/android/**',
      'apps/mobile/node_modules/**',
      'apps/mobile/releases/**',
      'apps/mobile/index.js',
      'apps/mobile/app.config.js',
      'apps/mobile/babel.config.js',
      'apps/mobile/jest.config.js',
      'apps/mobile/metro.config.js',
    ],
  },
  ...mobileConfig,
];
