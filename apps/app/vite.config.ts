import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          'react-router': ['react-router-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
