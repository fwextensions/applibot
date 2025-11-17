import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    strictPort: false, // If port 3000 is in use, automatically try next available port
    proxy: {
      '/api': {
        target: 'https://dahlia-full.herokuapp.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path
      }
    }
  }
})
