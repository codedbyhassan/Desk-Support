
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react({
    fastRefresh: true,
    jsxRuntime: 'automatic',
  })],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 4000,
    strictPort: true,
    host: 'localhost',
    open: true,
    middlewareMode: false,
    warmupEntry: ['./src/main.tsx'],
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 4000,
    }
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
