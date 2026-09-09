import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // The built SPA is served at the web root by Laravel
  // (Apache DocumentRoot -> backend/public). API calls stay at '/api'.
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Build straight into Laravel's public/ so a single app serves the API
    // and the SPA — no Node needed to run it, only to (re)build it.
    // emptyOutDir is OFF on purpose: public/ also holds Laravel's index.php,
    // .htaccess and robots.txt. `npm run build` wipes public/assets/ first
    // (see the "prebuild" script) so old hashed bundles don't accumulate.
    outDir: '../backend/public',
    emptyOutDir: false,
    assetsDir: 'assets',
  },
  server: {
    port: 5173,
    proxy: {
      // Keep API + Sanctum's CSRF-cookie route on the same origin as the SPA
      // so session-cookie auth works through the dev server.
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
      '/sanctum': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
    },
  },
})
