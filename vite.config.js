import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vitest liest denselben Config-Block mit — reine Unit-/Smoke-Tests für
  // Node, kein Browser-DOM nötig (siehe Punkt 12 der Checkliste).
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
