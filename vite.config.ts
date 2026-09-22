import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 4173 },
  test: {
    include: ['src/**/*.test.ts', 'server/**/*.test.mjs'],
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
