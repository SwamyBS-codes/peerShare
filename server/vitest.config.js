const path = require('node:path')
const { defineConfig } = require('vitest/config')

module.exports = defineConfig({
  root: path.resolve(__dirname, '..'),
  test: {
    globals: true,
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
    globalTeardown: ['tests/integration/support/globalTeardown.cjs'],
  },
})
