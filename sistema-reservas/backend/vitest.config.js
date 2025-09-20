import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Ejecutar tests de forma secuencial para evitar conflictos de concurrencia
    threads: false,
    sequence: {
      concurrent: false,
      shuffle: false // Desactiva el orden aleatorio para mayor predictibilidad
    },
    pool: 'forks',
    // Tiempo límite mayor para tests que incluyen operaciones de BD
    testTimeout: 30000,
    hookTimeout: 30000,
    // Configuración de coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'prisma/',
        'src/config/',
        'src/server.js',
        'src/db/',
        '**/*.test.js',
        '**/*test-helpers.js',
        'docker-entrypoint.sh',
        'jest.setup.js',
        'vitest.setup.js',
        'vitest.config.js', // Archivo de configuración - no necesita tests
        'src/utils/errorHandler.js' // Archivo vacío
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    // Configuración del entorno de prueba
    setupFiles: ['./vitest.setup.js'],
    // Configuración para isolar cada test
    isolate: true,
    // Configurar patrones para encontrar archivos de test
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
});