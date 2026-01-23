import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MotionFade from '../components/UI/MotionFade'
import LoadingPulse from '../components/UI/LoadingPulse'
import LandingGif from '../assets/Landing.gif'
import { unifiedKioskApi } from '../utils/unifiedKioskApi'
import { useKioskStore } from '../store/kioskStore'

const NewIdleScreen = () => {
  const navigate = useNavigate()
  const setIsConfigured = useKioskStore((state) => state.setIsConfigured)
  const setSession = useKioskStore((state) => state.setSession)
  const resetSession = useKioskStore((state) => state.resetSession)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if kiosk is configured on mount
  useEffect(() => {
    const config = unifiedKioskApi.getConfig()
    if (config) {
      setIsConfigured(true)
    }
    // Reset any existing session state when returning to idle
    resetSession()
  }, [setIsConfigured, resetSession])

  const handleScreenTouch = async () => {
    // Check if kiosk is configured
    if (!unifiedKioskApi.isConfigured()) {
      // Redirect to configuration screen
      navigate('/config', { replace: true })
      return
    }

    setIsCreatingSession(true)
    setError(null)

    try {
      // Create a new session (uses mock or real API based on mode)
      const session = await unifiedKioskApi.createSession()

      // Store session in global state
      setSession({
        sessionId: session.sessionId,
        token: session.token,
        userId: session.userId,
        expiresAt: session.expiresAt,
      })

      // Navigate to user details
      navigate('/user-details', { replace: true })
    } catch (err) {
      console.error('Session creation failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to start session')
      setIsCreatingSession(false)

      // If it's an auth error, might need to reconfigure
      if (err instanceof Error && (
        err.message.includes('401') ||
        err.message.includes('403') ||
        err.message.includes('not configured')
      )) {
        setTimeout(() => {
          navigate('/config', { replace: true })
        }, 2000)
      }
    }
  }

  // Show loading state while creating session
  if (isCreatingSession) {
    return (
      <div className="fixed inset-0 bg-black z-50 min-h-screen w-full flex flex-col items-center justify-center">
        <LoadingPulse className="text-white max-w-[150px]" />
        <p className="text-white/70 text-lg mt-6">Starting your session...</p>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div
        className="fixed inset-0 bg-black z-50 min-h-screen w-full flex flex-col items-center justify-center cursor-pointer p-8"
        onClick={() => setError(null)}
      >
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-200 mb-4">{error}</p>
          <p className="text-white/50 text-sm">Tap to try again</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-white z-50 min-h-screen w-full flex items-center justify-center cursor-pointer"
      onClick={handleScreenTouch}
    >
      <MotionFade className="w-full h-full">
        <img
          src={LandingGif}
          alt="Touch to Start"
          className="w-full h-full object-cover"
        />
      </MotionFade>

      {/* Config button - hidden in corner for admin access */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          navigate('/config')
        }}
        className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 transition-colors opacity-30 hover:opacity-100"
        title="Configure Kiosk"
      >
        <svg className="w-4 h-4 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  )
}

export default NewIdleScreen

