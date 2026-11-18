const { randomBytes } = require('node:crypto')
const { spawnSync } = require('node:child_process')

const npmCli = process.env.npm_execpath
if (!npmCli) {
  console.error('Run this script with `npm run test:e2e:local`.')
  process.exit(1)
}

const testDatabaseUrl = 'postgresql://postgres@127.0.0.1:55432/peershare_test?schema=public'
const env = {
  ...process.env,
  TEST_DATABASE_URL: testDatabaseUrl,
  DATABASE_URL: testDatabaseUrl,
  E2E_TEST_PASSWORD: randomBytes(24).toString('hex'),
}

function runNpm(args, label) {
  console.log(`\n> ${label}`)
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    env,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(`Could not run ${label}:`, result.error.message)
    return 1
  }

  return result.status ?? 1
}

let exitCode = 0
let databaseStartAttempted = false
let seedAttempted = false

function runStep(args, label) {
  const status = runNpm(args, label)
  if (status !== 0) {
    console.error(`\n${label} failed with exit code ${status}.`)
    exitCode = status
    return false
  }
  return true
}

try {
  databaseStartAttempted = true
  if (runStep(['run', 'test:db:up'], 'Start isolated test database') &&
      runStep(['--prefix', 'server', 'run', 'test:db:migrate'], 'Apply database migrations') &&
      runStep(['run', 'test:e2e:install'], 'Install Playwright Chromium')) {
    seedAttempted = true
    if (runStep(['--prefix', 'server', 'run', 'test:e2e:seed'], 'Seed E2E test accounts')) {
      runStep(['run', 'test:e2e'], 'Run Playwright E2E tests')
    }
  }
} catch (error) {
  console.error('Local E2E setup failed:', error.message)
  exitCode = 1
} finally {
  if (seedAttempted) {
    const status = runNpm(['--prefix', 'server', 'run', 'test:e2e:clean'], 'Clean E2E test accounts')
    if (exitCode === 0 && status !== 0) exitCode = status
  }

  if (databaseStartAttempted) {
    const status = runNpm(['run', 'test:db:down'], 'Stop isolated test database')
    if (exitCode === 0 && status !== 0) exitCode = status
  }
}

process.exitCode = exitCode
