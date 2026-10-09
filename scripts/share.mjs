// Share the app at a temporary public link (a Cloudflare "quick tunnel"):
//
//   npm run share      -> prints https://<random-words>.trycloudflare.com ; Ctrl+C stops it
//
// Builds the web app, serves the built files (not the dev server: faster, no source or dev
// tools exposed), starts the API if it isn't already running, and opens the tunnel.
// The link works only while this is running and your PC is on; a new run gets a new link.
//
// ONLY FOR PUBLIC DATA. Anyone with the link can see the app: there is no sign-in, and the
// traffic passes through Cloudflare. Never use this for patient-level or other sensitive data.

import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const IS_WINDOWS = process.platform === 'win32'
const API_PORT = 3000
const WEB_PORT = 4173
const children = []

function fail(message) {
  console.error(`\n${message}`)
  stopAll()
  process.exit(1)
}

function stopAll() {
  for (const child of children) if (child.exitCode === null) child.kill()
}
process.on('SIGINT', () => {
  console.log('\nStopping… the public link no longer works.')
  stopAll()
  process.exit(0)
})

// Start a long-running process, prefixing its output so it's clear which part said what.
function start(label, command, args, cwd, onLine) {
  const child = spawn(command, args, { cwd })
  children.push(child)
  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding('utf8')
    stream.on('data', (text) => {
      for (const line of text.split(/\r?\n/).filter(Boolean)) {
        if (!onLine?.(line)) console.log(`[${label}] ${line}`)
      }
    })
  }
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) fail(`${label} stopped unexpectedly (exit code ${code}).`)
  })
  return child
}

async function isUp(url) {
  try {
    return (await fetch(url)).ok
  } catch {
    return false
  }
}

async function waitFor(url, what, seconds = 30) {
  for (let i = 0; i < seconds * 2; i++) {
    if (await isUp(url)) return
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  fail(`${what} didn't start within ${seconds} seconds.`)
}

// cloudflared on the PATH, or where the Windows installer puts it (a terminal opened before
// installing won't have it on the PATH yet).
function findCloudflared() {
  const candidates = ['cloudflared']
  if (IS_WINDOWS) {
    for (const dir of [process.env['ProgramFiles(x86)'], process.env.ProgramFiles]) {
      if (dir) candidates.push(join(dir, 'cloudflared', 'cloudflared.exe'))
    }
  }
  for (const candidate of candidates) {
    if (spawnSync(candidate, ['--version']).status === 0) return candidate
  }
  fail(
    'cloudflared (Cloudflare\'s tunnel program) is not installed. Install it, then run this again:\n' +
      '  Windows:  winget install Cloudflare.cloudflared\n' +
      '  macOS:    brew install cloudflared\n' +
      '  Other:    https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/',
  )
}

// ---- 1. Checks
if (!existsSync(join(ROOT, 'data', 'app.sqlite'))) fail('No data yet. Run "npm run setup" first.')
if (!existsSync(join(ROOT, 'web', 'node_modules'))) fail('Packages not installed. Run "npm run setup" first.')
const cloudflared = findCloudflared()
if (await isUp(`http://localhost:${WEB_PORT}`)) {
  fail(`Port ${WEB_PORT} is already in use. Is another "npm run share" (or vite preview) running?`)
}

// ---- 2. API (reuse it if "npm run dev" is already running it)
if (await isUp(`http://localhost:${API_PORT}/api/health`)) {
  console.log(`Using the API already running on port ${API_PORT}.`)
} else {
  console.log('Starting the API…')
  start('api', process.execPath, ['src/server.js'], join(ROOT, 'api'))
  await waitFor(`http://localhost:${API_PORT}/api/health`, 'The API')
}

// ---- 3. Build and serve the web app (vite preview uses the same /api proxy as dev)
console.log('Building the web app…')
const build = spawnSync(process.execPath, [join('node_modules', 'vite', 'bin', 'vite.js'), 'build'], {
  cwd: join(ROOT, 'web'),
  stdio: 'inherit',
})
if (build.status !== 0) fail('The web build failed (see above).')

start('web', process.execPath, [join('node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(WEB_PORT), '--strictPort'], join(ROOT, 'web'), () => true)
await waitFor(`http://localhost:${WEB_PORT}`, 'The web app')

// ---- 4. Tunnel. --http-host-header makes requests look local, so Vite accepts them.
console.log('Opening the tunnel…')
let link
let announced = false
start(
  'tunnel',
  cloudflared,
  ['tunnel', '--no-autoupdate', '--url', `http://localhost:${WEB_PORT}`, '--http-host-header', `localhost:${WEB_PORT}`],
  ROOT,
  (line) => {
    link ??= line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0]
    if (link && !announced && line.includes('Registered tunnel connection')) {
      announced = true
      console.log(
        `\n  Public link (share this):\n\n    ${link}\n\n` +
          '  Works while this keeps running and your PC stays on. Press Ctrl+C to stop sharing.\n' +
          '  Public or made-up data only: anyone with the link can see the app.\n',
      )
    }
    return true // cloudflared is chatty; only its errors matter, and they show via exit codes
  },
)
