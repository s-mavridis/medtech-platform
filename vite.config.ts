import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Mirrors netlify.toml redirects so `vite dev` can reach CMS public APIs locally
// (Netlify's redirect proxying only applies to `netlify dev` / production).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/nppes': {
        target: 'https://npiregistry.cms.hhs.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nppes/, '/api'),
      },
      '/api/open-payments': {
        target: 'https://openpaymentsdata.cms.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/open-payments/, '/api/1/datastore/query'),
      },
      '/api/cms-provider': {
        target: 'https://data.cms.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cms-provider/, '/provider-data/api/1/datastore/query'),
      },
      '/api/cms-data': {
        target: 'https://data.cms.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cms-data/, '/data-api/v1/dataset'),
      },
    },
  },
})
