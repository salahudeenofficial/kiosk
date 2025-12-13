import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/UI/Button'
import Card from '../components/UI/Card'
import MotionFade from '../components/UI/MotionFade'
import { useKioskStore } from '../store/kioskStore'

const SessionEnd = () => {
  const navigate = useNavigate()
  const resetAll = useKioskStore((state) => state.resetAll)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      resetAll()
      navigate('/')
    }, 5000)
    return () => window.clearTimeout(timer)
  }, [navigate, resetAll])

  return (
    <MotionFade>
      <Card className="flex flex-col items-center gap-[3%] text-center">
        <h2 className="text-clamp-title font-bold">Thank you</h2>
        <p className="text-clamp-body text-white/70">
          Your session is complete. We&apos;re resetting for the next guest.
        </p>
        <Button onClick={() => navigate('/')}>Restart now</Button>
      </Card>
    </MotionFade>
  )
}

export default SessionEnd

