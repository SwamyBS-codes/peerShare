// Selects the client unit-test files and runs them from the repository root.
import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export default defineConfig({
  root,
  test: {
    environment: 'node',
    include: [
      'tests/unit/authentication/authService.test.js',
      'tests/unit/file-sharing/**/*.test.js',
      'tests/unit/messaging/**/*.test.js',
    ],
    clearMocks: true,
  },
})
