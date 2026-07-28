import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: '/',
    plugins: [react(), tailwindcss()],
    server: {
      host: env.DEV_HOST || '0.0.0.0',
      port: Number(env.DEV_PORT || 3002),
      strictPort: true,

      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET || "http://127.0.0.1:5000",
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
      dedupe: ['apexcharts'],
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
  };
});
