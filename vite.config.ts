import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 4000,
    strictPort: true,
    host: '0.0.0.0',
    open: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 4000,
    }
  },
  preview: {
    port: 4000,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    minify: 'terser',
    sourcemap: false,
    reportCompressedSize: false,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
      'react-hot-toast',
    ]
  }
});