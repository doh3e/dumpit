import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(__dirname, '..', '..', 'frontend')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const result = spawnSync(npmCommand, ['run', 'build'], {
  cwd: frontendDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_API_URL: process.env.VITE_API_URL || 'https://api.dumpit.kr/api',
  },
})

process.exit(result.status ?? 1)
