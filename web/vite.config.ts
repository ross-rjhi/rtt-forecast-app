import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import VueRouter from 'vue-router/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // File-based routing: src/pages/index.vue -> "/". Must come before vue().
    VueRouter({ dts: 'src/route-map.d.ts' }),
    vue(),
    tailwindcss(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // In development, forward /api/* to the Node API (api/, port 3000), so the browser
    // sees one origin - the same as Azure Static Web Apps with a linked API.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
