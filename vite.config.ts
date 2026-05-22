import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  server: {
    host: '10.90.25.125',
    port: 3002,
    proxy: {
      "/api": {
        target: "http://10.90.25.125:5000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || ''
          const extType = name.split('.').pop()
          
          if (/woff2?|ttf|eot|otf/i.test(extType || '')) {
            return `static/fonts_source/[name]-[hash][extname]`
          }
          
          if (extType === 'css') {
            return `static/css/pages/[name]-[hash][extname]`
          }
          
          return `assets/[name]-[hash][extname]`
        },
        entryFileNames: `static/js/pages/[name]-[hash].js`,
        chunkFileNames: `static/js/pages/[name]-[hash].js`,
      },
    },
    copyPublicDir: true,
  },
  publicDir: 'public',
})