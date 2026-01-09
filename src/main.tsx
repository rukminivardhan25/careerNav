import React, { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import "./index.css"

// Ensure React is available globally for hooks
if (typeof React === 'undefined' || React === null) {
  throw new Error('React is not available. Check module resolution.')
}

const rootElement = document.getElementById("root")
if (!rootElement) {
  throw new Error("Root element not found")
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

