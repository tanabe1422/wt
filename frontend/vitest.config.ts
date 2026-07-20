import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // forks より軽く、DOM ファイルが多いときの起動を抑える
    pool: 'threads',
    fileParallelism: true,
  },
})
