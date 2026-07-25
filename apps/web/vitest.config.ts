import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@inplace/app-core': path.resolve(__dirname, '../../packages/app-core/src/index.ts'),
      '@inplace/domain': path.resolve(__dirname, '../../packages/domain/src/index.ts'),
      '@inplace/api-client': path.resolve(__dirname, '../../packages/api-client/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
});
