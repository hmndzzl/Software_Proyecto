/// <reference types="vitest" />
import { coverageConfigDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: process.env.VITEST ? [] : [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: process.env.ALLOWED_HOSTS?.split(',') || [],
    watch: {
      usePolling: true,
    },
    proxy: {
      '/uploads': {
        target: process.env.DEV_BACKEND_TARGET || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api': {
        target: process.env.VITE_API_URL || 'http://backend:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          clerk: ['@clerk/react', '@clerk/localizations'],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    pool: 'threads',
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['src/**/*.{ts,tsx}'],
      // Utilidades de prueba (setup, authValue): no son código de la app.
      // main.tsx solo monta React; el comportamiento se cubre desde App.
      exclude: [
        ...coverageConfigDefaults.exclude,
        'src/test/**',
        'src/types/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        lines: 95,
        statements: 95,
        functions: 95,
        branches: 95
      }
    }
  },
})
