import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const envDir = fileURLToPath(new URL('../', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '')

  return {
    envDir,
    plugins: [
      react(),
      sentryVitePlugin({
        org: 'dumpit',
        project: 'javascript-react',
        authToken: env.SENTRY_AUTH_TOKEN || process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          filesToDeleteAfterUpload: ['dist/**/*.map'],
        },
      }),
    ],
    build: {
      sourcemap: true,
      // 아이콘 srcset 사다리(assets/icons/*)는 개당 1KB 안팎이라 기본 4KB 인라인
      // 대상이지만, 50여 개가 전부 메인 청크에 base64로 박히면 +60KB라 파일로 유지
      assetsInlineLimit: (filePath) =>
        filePath.includes('src/assets/icons/') ? false : undefined,
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          // localhost로 통일해야 OAuth redirect_uri와 세션 쿠키 호스트가 프론트(localhost:5173)와 일치함
          target: 'http://localhost:8080',
          changeOrigin: true,
          cookieDomainRewrite: 'localhost',
        },
      },
    },
  }
})
