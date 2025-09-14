import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    moduleNameMapper: {
      '^.+\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/**',
    ],
    testTimeout: 10000, 
    coverage: {
      provider: 'v8', 
      reporter: ['text', 'json', 'html', 'lcov'],
      all: true,
      exclude: [
        'coverage/**',
        'dist/**',
        'tests/**',
        'tests-examples/**',
        '.husky/**',
        '**/*.config.{js,ts,cjs}',
        'src/App.jsx',
        'src/index.jsx',
        'src/setupTests.js',
      ],
    },
    server: {
      watch: {
        usePolling: true,
      },
      host: true, 
      strictPort: true,
      port: 5173,
    },
  },
})

