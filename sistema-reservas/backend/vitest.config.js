import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    threads: false,
    sequence: {
      concurrent: false
    },
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'prisma/',
        'src/config/',
        'src/server.js',
        'src/db/',
        '**/*.test.js',
        'docker-entrypoint.sh',
        'jest.setup.js'
      ],
    },
  },
});