import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import router from './router'
import { clearSession } from './utils/config'

// Clear any existing session on page load/refresh
// This ensures each browser refresh starts fresh for the next user
// Kiosk configuration is preserved (stored in localStorage)
console.log('[App] Page load - clearing any existing session')
clearSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

