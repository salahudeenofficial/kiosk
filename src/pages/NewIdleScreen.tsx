import { useNavigate } from 'react-router-dom'
import MotionFade from '../components/UI/MotionFade'
import LandingGif from '../assets/Landing.gif'

const NewIdleScreen = () => {
  const navigate = useNavigate()

  const handleScreenTouch = () => {
    navigate('/user-details', { replace: true })
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
    </div>
  )
}

export default NewIdleScreen
