import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const srcDir = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  server: {
    port: 4000,
    strictPort: true,
    host: '0.0.0.0',
    open: true,
    hmr: {
      clientPort: 4000,
    },
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
    ],
  },
})
