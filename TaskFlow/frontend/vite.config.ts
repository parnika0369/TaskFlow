import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '^/(auth|projects|tasks|users)': {
        target: 'http://localhost:8080',
        bypass: (req) => {
          // browser page navigations accept HTML — serve SPA instead of proxying
          if (req.headers.accept?.includes('text/html')) return '/index.html'
        },
      },
    },
  },
})
