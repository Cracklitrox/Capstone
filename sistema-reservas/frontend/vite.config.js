import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
// 1. Importamos tailwind y autoprefixer directamente aquí
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [react(), tsconfigPaths()], 

  // 2. Esta es la sección clave. Le ordenamos a Vite que use
  //    tailwindcss y autoprefixer explícitamente.
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer(),
      ],
    },
  },

  // El resto de tu configuración se mantiene intacta
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
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})