import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    esbuildOptions: {
      jsx: 'automatic',
    },
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Don't split React - keep it with vendor to ensure it's always available
          // This prevents "React is undefined" errors when vendor code uses React.forwardRef
          if (id.includes('node_modules')) {
            // Put React and React-DOM in vendor chunk to ensure they're available
            // when other vendor code (like Radix UI) tries to use React.forwardRef
            return 'vendor';
          }
        },
      },
    },
  },
})

