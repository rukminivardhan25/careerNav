/// <reference types="vite/client" />

// Prevent NodeJS namespace from being used in browser code
// Override NodeJS.Timeout to be number for browser compatibility
declare global {
  namespace NodeJS {
    type Timeout = number;
  }
}
