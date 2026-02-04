import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import MotionFade from './components/UI/MotionFade'
import { useKioskStore } from './store/kioskStore'
import useSessionTimeout from './hooks/useSessionTimeout'
import SessionTimeoutBar from './components/UI/SessionTimeoutBar'
import DebugPanel from './components/Debug/DebugPanel'
import { unifiedKioskApi } from './utils/unifiedKioskApi'

const AppLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const userGender = useKioskStore((state) => state.userGender)
  const sessionId = useKioskStore((state) => state.sessionId)
  const setIsConfigured = useKioskStore((state) => state.setIsConfigured)

  // Initialize session timeout logic
  const { remaining, resetTimer, isWarning } = useSessionTimeout()

  // Check if kiosk is configured on mount
  useEffect(() => {
    // Check for reset param
    const params = new URLSearchParams(location.search)
    if (params.get('reset') === 'true') {
      console.log('Resetting kiosk configuration...')
      localStorage.clear()
      sessionStorage.clear()
      // Use window.location to force full reload and clear memory state
      window.location.replace('/')
      return
    }

    const config = unifiedKioskApi.getConfig()
    if (config) {
      setIsConfigured(true)
    }
  }, [setIsConfigured, location.search])

  // Route protection: redirect to appropriate pages based on session state
  useEffect(() => {
    const currentPath = location.pathname

    // Skip all checks in dev mode to allow editing any page
    if (import.meta.env.DEV) {
      return
    }

    // Pages that don't need a session
    const publicPages = ['/', '/config', '/fit-check', '/products']
    if (publicPages.includes(currentPath)) {
      return
    }

    // Check for active session
    const session = unifiedKioskApi.getSession()
    if (!session && !sessionId) {
      console.log('[App] No session for protected route, redirecting to home')
      navigate('/', { replace: true })
      return
    }

    // Check if gender is set for flow pages
    const flowPages = ['/capture', '/validate', '/products', '/product', '/tryon', '/tryon-results', '/review', '/purchase']
    if (!userGender && flowPages.some(path => currentPath.startsWith(path))) {
      console.log('[App] No gender set for flow page, redirecting to user-details')
      navigate('/user-details', { replace: true })
    }
  }, [location.pathname, sessionId, userGender, navigate])

  return (
    <div className="min-h-screen w-full bg-kiosk-gradient text-slate-50 relative">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col p-[4%]">
        <MotionFade className="flex-1 flex flex-col">
          <Outlet />
        </MotionFade>

        <SessionTimeoutBar
          remainingSeconds={remaining}
          onContinue={resetTimer}
          isVisible={isWarning && location.pathname === '/tryon-results'}
        />
      </div>

      {/* Debug Panel - only visible in development */}
      <DebugPanel />
    </div>
  )
}

export default AppLayout

