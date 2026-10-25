import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ServicesLoader } from './services/ServicesLoader'
import '@fontsource/gloock/latin-400.css'
import '@fontsource/hanken-grotesk/latin-400.css'
import '@fontsource/hanken-grotesk/latin-500.css'
import '@fontsource/hanken-grotesk/latin-600.css'
import '@fontsource/hanken-grotesk/latin-700.css'
import './index.css'

// Mocks unless VITE_USE_BACKEND=true; see server/README.md. The shell renders at once either way.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ServicesLoader useBackend={import.meta.env.VITE_USE_BACKEND === 'true'}>
      <App />
    </ServicesLoader>
  </React.StrictMode>,
)
