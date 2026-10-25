import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ServicesProvider } from './services/ServicesContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ServicesProvider>
      <App />
    </ServicesProvider>
  </React.StrictMode>,
)
