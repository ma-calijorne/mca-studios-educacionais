import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:4173', channel: 'chrome' },
  webServer: {
    command: 'PORT=4173 SESSION_SECRET=e2e-session-secret ADMIN_KEY=e2e-admin-key STUDENTS_FILE=e2e/students.json npm start',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
})
