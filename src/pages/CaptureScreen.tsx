import AutoCamera from '../components/Camera/AutoCamera'
import MotionFade from '../components/UI/MotionFade'
import useAutoNavigate from '../hooks/useAutoNavigate'

const CaptureScreen = () => {
  useAutoNavigate()

  return (
    <div className="bg-kiosk-gradient min-h-screen relative flex flex-col overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/60">
            Capture
          </p>
          <h2 className="text-clamp-title font-bold">Step into frame</h2>
          <p className="text-clamp-body text-white/70">
            Hold a relaxed pose. We'll auto-capture once the pose looks stable.
          </p>
        </div>
        <div className="hidden md:block text-right text-sm text-white/60">
          3:4 portrait stream · AI pose-ready
        </div>
      </div>
      <MotionFade className="flex-1 w-full min-h-0 relative pt-[4%]">
        <AutoCamera />
      </MotionFade>
    </div>
  )
}

export default CaptureScreen

