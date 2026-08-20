import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: {
    port: 5178,
    proxy: {
      '/api': 'http://localhost:4747',
      '/thumb': 'http://localhost:4747',
      '/file': 'http://localhost:4747'
    }
  }
});
