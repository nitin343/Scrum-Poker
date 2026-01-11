/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: false,
  } as any,
  define: {
    'import.meta.env.VITE_SERVER_URL': JSON.stringify('http://localhost:3001/api/v1'),
  },
})
