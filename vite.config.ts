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
          // Keep React and React-DOM in the main bundle to ensure they're always available
          // This prevents "React is null" errors when hooks are called
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            // Don't chunk React - keep it in the main bundle
            return undefined;
          }
          // Separate vendor chunks for better caching
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
})

