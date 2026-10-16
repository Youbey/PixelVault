import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/PixelVault/',
  plugins: [react(), tailwindcss()],
  // The ASR worker imports onnxruntime-web's ESM bundle; the default 'iife'
  // worker format cannot carry ESM dependencies.
  worker: { format: 'es' },
  build: {
    outDir: 'dist',
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
});
