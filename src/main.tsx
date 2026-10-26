import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './theme/ThemeProvider'
import { LocalThemeStore } from './storage/localThemeStore'
import { AuthProvider } from './auth/AuthProvider'
import { Gate } from './auth/Gate'
import { LocalAuthService } from './auth/LocalAuthService'
import '@fontsource/schibsted-grotesk/400.css'
import '@fontsource/schibsted-grotesk/600.css'
import '@fontsource/schibsted-grotesk/800.css'
import './index.css'

// The concrete theme store is wired here (profile and catalogue wiring lives in createServices).
const themeStore = new LocalThemeStore()
// The one place the auth service is built; the provider takes it as a prop.
const authService = new LocalAuthService()

// Mocks unless VITE_USE_BACKEND=true; see server/README.md. The shell renders at once either way.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider store={themeStore}>
      <AuthProvider service={authService}>
        <Gate useBackend={import.meta.env.VITE_USE_BACKEND === 'true'}>
          <App />
        </Gate>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
