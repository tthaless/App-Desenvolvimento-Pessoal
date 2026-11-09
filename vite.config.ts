import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import colorMixFallback from './css-color-mix.ts'
import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  css: { postcss: { plugins: [colorMixFallback()] } },
  // Funcionar também em iPhones sem atualização recente (iOS 15+).
  build: { target: ['es2020', 'safari15', 'chrome90'], cssTarget: ['safari15', 'chrome90'] },
})
