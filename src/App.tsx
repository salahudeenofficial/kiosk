import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import MotionFade from './components/UI/MotionFade'
import { useKioskStore } from './store/kioskStore'
import useSessionTimeout from './hooks/useSessionTimeout'
import SessionTimeoutBar from './components/UI/SessionTimeoutBar'

const AppLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const userGender = useKioskStore((state) => state.userGender)
  const resetAll = useKioskStore((state) => state.resetAll)

  // Initialize session timeout logic
  const { remaining, resetTimer, isWarning } = useSessionTimeout()

  // On page load/reload, if no gender is set, ensure we're on user-details screen
  useEffect(() => {
    // Only check on initial mount - if no gender and not on initial screens, reset
    if (!userGender && location.pathname !== '/' && location.pathname !== '/user-details') {
      resetAll() // Reset store to ensure clean state
      navigate('/user-details', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

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
    </div>
  )
}

export default AppLayout
