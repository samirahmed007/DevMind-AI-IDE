import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves from /DevMind-AI-IDE/ — Vercel serves from /
  base: process.env.GITHUB_ACTIONS ? '/DevMind-AI-IDE/' : '/',
  define: {
    'process.env': process.env
  },
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'monaco': ['@monaco-editor/react'],
          'icons': ['lucide-react'],
        }
      }
    }
  }
});
