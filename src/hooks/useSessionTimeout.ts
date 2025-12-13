import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKioskStore } from '../store/kioskStore'

import { useLocation } from 'react-router-dom'

const DEFAULT_IDLE_LIMIT = 120 // Standard page timeout (2 minutes)
const TRYON_IDLE_LIMIT = 120 // Try-on results page timeout (2 minutes)
const WARNING_THRESHOLD_SEC = 30 // Show warning in last 30 seconds

const useSessionTimeout = () => {
  const navigate = useNavigate()
  const resetAll = useKioskStore((state) => state.resetAll)
  const location = useLocation()

  // Determine limit based on current route
  const getCurrentLimit = () => {
    return location.pathname === '/tryon-results' ? TRYON_IDLE_LIMIT : DEFAULT_IDLE_LIMIT
  }

  const [remaining, setRemaining] = useState(getCurrentLimit())

  const resetTimer = () => setRemaining(getCurrentLimit())

  // Reset timer when location changes (so we start fresh with new limit)
  useEffect(() => {
    resetTimer()
  }, [location.pathname])

  useEffect(() => {
    // Timer interval
    const interval = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          // Timeout reached
          resetAll()
          navigate('/')
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
  }, [navigate, resetAll, location.pathname]) // Depend on location to update limit logic

  return {
    remaining,
    resetTimer,
    isWarning: remaining <= WARNING_THRESHOLD_SEC
  }
}

export default useSessionTimeout

