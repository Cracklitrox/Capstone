import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [react(), tsconfigPaths()], 

  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer(),
      ],
    },
  },

  // Configuración específica para testing
  test: {
    // Usar jsdom como entorno para simular el DOM
    environment: 'jsdom',
    
    // Archivo de setup que se ejecuta antes de cada test
    setupFiles: ['./src/setupTests.js', './src/__tests__/setup/mocks.js'],
    
    // Variables globales disponibles en los tests
    globals: true,
    
    // Timeout para tests individuales (10 segundos)
    testTimeout: 10000,
    
    // Timeout para hooks (beforeAll, afterAll, etc.)
    hookTimeout: 10000,
    
    // Archivos y carpetas a excluir de los tests
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/**', // Playwright tests
      '**/e2e/**',
      '**/.{git,cache}/**',
      '**/build/**'
    ],

    // Configuración de coverage
    coverage: {
      // Proveedor de coverage
      provider: 'v8',
      
      // Tipos de reportes a generar
      reporter: ['text', 'json', 'html', 'lcov'],
      
      // Incluir todos los archivos en el coverage
      all: true,
      
      // Archivos a incluir en coverage
      include: ['src/**/*.{js,jsx}'],
      
      // Archivos a excluir del coverage
      exclude: [
        'src/__tests__/**',
        'coverage/**',
        'dist/**',
        'tests/**',
        'tests-examples/**',
        '.husky/**',
        '**/*.config.{js,ts,cjs}',
        'src/index.jsx',
        'src/setupTests.js',
        'src/App.jsx', // Archivo simple que principalmente maneja routing
        'src/logo.svg',
        'src/lib/utils.js', // Utilidad simple de Tailwind
      ],
      
      // Umbrales de coverage
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },

    // Configuración para modo watch
    server: {
      watch: {
        usePolling: true,
      },
      host: true, 
      strictPort: true,
      port: 5173,
    },

    // Configuración de módulos mock
    moduleNameMapper: {
      // Mock de archivos CSS y otros assets
      '^.+\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      // Mock de imágenes y otros assets estáticos
      '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'identity-obj-proxy',
    },

    // Pool de workers para paralelización
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },

    // Configuración de reportes
    reporter: [
      'default',
      'json',
      'html'
    ],

    // Directorio de salida para reportes
    outputFile: {
      json: './coverage/test-results.json',
      html: './coverage/index.html'
    }
  },

  // Alias para importaciones
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Configuración para el servidor de desarrollo (usado en tests también)
  server: {
    port: 5173,
  },

  // Configuración específica para el entorno de testing
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:3001/api/v1'),
    'import.meta.env.MODE': JSON.stringify('test'),
  },
})