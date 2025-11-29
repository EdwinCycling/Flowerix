import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: {
            overlay: false
        },
        proxy: {
          '/.netlify/functions': {
            target: 'http://localhost:8888',
            changeOrigin: true,
            rewrite: (p) => p,
          }
        }
      },
      css: {
        postcss: {
            plugins: [tailwindcss, autoprefixer]
        }
      },
      plugins: [react()],
      define: {},
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
    };
});
