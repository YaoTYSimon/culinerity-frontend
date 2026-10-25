import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { loadServices } from './services/container'
import { ServicesProvider } from './services/ServicesContext'
import '@fontsource/gloock/latin-400.css'
import '@fontsource/hanken-grotesk/latin-400.css'
import '@fontsource/hanken-grotesk/latin-500.css'
import '@fontsource/hanken-grotesk/latin-600.css'
import '@fontsource/hanken-grotesk/latin-700.css'
import './index.css'

// Mocks unless VITE_USE_BACKEND=true; see server/README.md.
void loadServices(import.meta.env.VITE_USE_BACKEND === 'true').then((services) => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ServicesProvider services={services}>
        <App />
      </ServicesProvider>
    </React.StrictMode>,
  )
})
