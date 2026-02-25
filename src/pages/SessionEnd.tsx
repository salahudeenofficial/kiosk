import { useEffect } from 'react'
import Button from '../components/UI/Button'
import Card from '../components/UI/Card'
import MotionFade from '../components/UI/MotionFade'
import { useKioskStore } from '../store/kioskStore'
import { unifiedKioskApi } from '../utils/unifiedKioskApi'

const SessionEnd = () => {
  const resetSession = useKioskStore((state) => state.resetSession)

  useEffect(() => {
    // Complete the session on the backend
    const completeSession = async () => {
      try {
        await unifiedKioskApi.completeSession()
      } catch (err) {
        console.error('Failed to complete session:', err)
      }
    }
    completeSession()

    // Auto-navigate back to home after 5 seconds
    const timer = window.setTimeout(() => {
      resetSession()
      window.location.replace('/')
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [resetSession])

  const handleRestart = () => {
    resetSession()
    window.location.replace('/')
  }

  return (
    <MotionFade>
      <Card className="flex flex-col items-center gap-[3%] text-center">
        <h2 className="text-clamp-title font-bold">Thank you</h2>
        <p className="text-clamp-body text-white/70">
          Your session is complete. We&apos;re resetting for the next guest.
        </p>
        <Button onClick={handleRestart}>Restart now</Button>
      </Card>
    </MotionFade>
  )
}

export default SessionEnd

