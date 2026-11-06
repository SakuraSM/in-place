import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'node:fs';

// 应用版本来源优先级：环境变量 INPLACE_VERSION > 根 package.json > 当前包 package.json
function resolveAppVersion(): string {
  if (process.env.INPLACE_VERSION) {
    return process.env.INPLACE_VERSION;
  }
  const candidates = [
    path.resolve(__dirname, '../../package.json'),
    path.resolve(__dirname, './package.json'),
  ];
  for (const file of candidates) {
    try {
      const pkg = JSON.parse(readFileSync(file, 'utf8')) as { version?: string };
      if (pkg.version) return pkg.version;
    } catch {
      // ignore and try next candidate
    }
  }
  return '0.0.0';
}

const appVersion = resolveAppVersion();

function resolveApiProxyTarget(apiBaseUrl: string | undefined): string {
  if (apiBaseUrl) {
    try {
      const parsed = new URL(apiBaseUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.origin;
    } catch {
      // A relative /api URL uses the local development server below.
    }
  }
  return 'http://127.0.0.1:4000';
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'INPLACE_']);
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: resolveApiProxyTarget(env.INPLACE_DEV_API_PROXY_TARGET || env.VITE_API_BASE_URL),
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }

            if (id.includes('@tanstack/react-query')) return 'vendor-query';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('@amap/')) return 'vendor-map';
            if (id.includes('react') || id.includes('react-router-dom')) return 'vendor-react';
            if (id.includes('lucide-react')) return 'vendor-icons';
            return 'vendor';
          },
        },
      },
    },
  };
});
