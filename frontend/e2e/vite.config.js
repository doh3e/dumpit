import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: process.cwd(),
  envDir: false,
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5184,
    strictPort: true,
  },
})
