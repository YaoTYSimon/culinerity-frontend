import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './theme/ThemeProvider'
import { ServicesLoader } from './services/ServicesLoader'
import '@fontsource/schibsted-grotesk/400.css'
import '@fontsource/schibsted-grotesk/600.css'
import '@fontsource/schibsted-grotesk/800.css'
import './index.css'

// Mocks unless VITE_USE_BACKEND=true; see server/README.md. The shell renders at once either way.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ServicesLoader useBackend={import.meta.env.VITE_USE_BACKEND === 'true'}>
        <App />
      </ServicesLoader>
    </ThemeProvider>
  </React.StrictMode>,
)
