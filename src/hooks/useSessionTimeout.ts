import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useKioskStore } from '../store/kioskStore'
import { unifiedKioskApi } from '../utils/unifiedKioskApi'

const DEFAULT_IDLE_LIMIT = 120 // Standard page timeout (2 minutes)
const TRYON_IDLE_LIMIT = 120 // Try-on results page timeout (2 minutes)
const WARNING_THRESHOLD_SEC = 30 // Show warning in last 30 seconds

const useSessionTimeout = () => {
  const navigate = useNavigate()
  const resetSession = useKioskStore((state) => state.resetSession)
  const location = useLocation()

  // Determine limit based on current route
  const getCurrentLimit = useCallback(() => {
    return location.pathname === '/tryon-results' ? TRYON_IDLE_LIMIT : DEFAULT_IDLE_LIMIT
  }, [location.pathname])

  const [remaining, setRemaining] = useState<number>(getCurrentLimit())

  const resetTimer = useCallback(() => {
    setRemaining(getCurrentLimit())
  }, [getCurrentLimit])

  // Reset timer when location changes (so we start fresh with new limit)
  useEffect(() => {
    resetTimer()
  }, [location.pathname, resetTimer])

  // Handle session timeout
  const handleTimeout = useCallback(async () => {
    console.log('[Session] Timeout - clearing session and redirecting to idle')

    // Try to complete session on backend
    try {
      await unifiedKioskApi.completeSession()
    } catch (err) {
      console.error('[Session] Error completing session:', err)
    }

    // Clear local session state
    resetSession()
    unifiedKioskApi.clearSession()

    // Navigate to idle screen
    navigate('/', { replace: true })
  }, [navigate, resetSession])

  useEffect(() => {
    // Skip timeout on pages that don't need session
    const noTimeoutPages = ['/', '/config']
    if (noTimeoutPages.includes(location.pathname)) {
      return
    }

    // Timer interval
    const interval = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          // Timeout reached
          handleTimeout()
          return getCurrentLimit()
        }
        return prev - 1
      })
    }, 1000)

    // Reset on user interaction
    const events: (keyof WindowEventMap)[] = [
      'pointerdown',
      'keydown',
      'touchstart',
    ]
    const handleReset = () => resetTimer()
    events.forEach((event) => window.addEventListener(event, handleReset))

    return () => {
      window.clearInterval(interval)
      events.forEach((event) => window.removeEventListener(event, handleReset))
    }
  }, [navigate, location.pathname, getCurrentLimit, handleTimeout, resetTimer])

  return {
    remaining,
    resetTimer,
    isWarning: remaining <= WARNING_THRESHOLD_SEC
  }
}

export default useSessionTimeout

