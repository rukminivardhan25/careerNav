[1mdiff --git a/vite.config.ts b/vite.config.ts[m
[1mindex 1cbd74a..698675d 100644[m
[1m--- a/vite.config.ts[m
[1m+++ b/vite.config.ts[m
[36m@@ -32,11 +32,14 @@[m [mexport default defineConfig({[m
     rollupOptions: {[m
       output: {[m
         manualChunks(id) {[m
[31m-          // Don't split React - keep it with vendor to ensure it's always available[m
[31m-          // This prevents "React is undefined" errors when vendor code uses React.forwardRef[m
[32m+[m[32m          // Keep React and React-DOM in the main bundle to ensure they're always available[m
[32m+[m[32m          // This prevents "React is null" errors when hooks are called[m
[32m+[m[32m          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {[m
[32m+[m[32m            // Don't chunk React - keep it in the main bundle[m
[32m+[m[32m            return undefined;[m
[32m+[m[32m          }[m
[32m+[m[32m          // Separate vendor chunks for better caching[m
           if (id.includes('node_modules')) {[m
[31m-            // Put React and React-DOM in vendor chunk to ensure they're available[m
[31m-            // when other vendor code (like Radix UI) tries to use React.forwardRef[m
             return 'vendor';[m
           }[m
         },[m
