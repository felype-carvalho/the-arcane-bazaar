import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

declare const process: { cwd: () => string }

const sourceDirectory = `${process.cwd()}/src`

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': sourceDirectory },
  },
  base: '/the-arcane-bazaar/',
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
