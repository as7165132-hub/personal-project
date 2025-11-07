import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@layers': path.resolve(__dirname, './src/layers'),
      '@systems': path.resolve(__dirname, './src/systems'),
      '@config': path.resolve(__dirname, './src/config'),
    },
  },
  server: {
    port: 3000,
    open: '/index-surface.html',
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index-surface.html'),
      },
    },
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
});
