// One-command setup for a fresh clone. Works on Windows, macOS and Linux, and needs only
// Node installed (no npm packages), so it can run before anything else.
//
//   npm run setup          install everything, then build the example data if it isn't there yet
//   npm run seed           (re)build the example data only

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const IS_WINDOWS = process.platform === 'win32'
const DB = join(ROOT, 'data', 'app.sqlite')

function step(message) {
  console.log(`\n==> ${message}`)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', ...options })
  if (result.status !== 0) {
    console.error(`\nFailed: ${command} ${args.join(' ')}`)
    process.exit(result.status ?? 1)
  }
}

// Run npm through the Node that's running this script (npm sets npm_execpath), so no shell is
// needed on Windows, where npm is a .cmd file.
function npm(args, cwd) {
  const npmCli = process.env.npm_execpath
  if (npmCli) run(process.execPath, [npmCli, ...args], { cwd })
  else run(IS_WINDOWS ? 'npm.cmd' : 'npm', args, { cwd, shell: IS_WINDOWS })
}

for (const folder of ['.', 'api', 'web']) {
  step(`Installing Node packages in ${folder === '.' ? 'the repo root' : `${folder}/`}`)
  npm(['install', '--no-fund', '--no-audit'], join(ROOT, folder))
}

if (!existsSync(DB)) {
  step('Building the example data (data/app.sqlite)')
  npm(['run', 'seed'], join(ROOT, 'api'))
} else {
  step('Example data already built (data/app.sqlite exists). To rebuild it: npm run seed')
}

console.log('\nAll set. Start the app with:  npm run dev   then open http://localhost:5173')
