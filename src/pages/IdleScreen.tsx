import { useState, useEffect } from 'react'
import LandingGif from '../assets/Landing.gif'
import Button from '../components/UI/Button'
import MotionFade from '../components/UI/MotionFade'
import LoadingPulse from '../components/UI/LoadingPulse'
import { useKioskStore } from '../store/kioskStore'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

const IdleScreen = () => {
  const navigate = useNavigate()
  const userGender = useKioskStore((state) => state.userGender)
  const userHeight = useKioskStore((state) => state.userHeight)
  const setUserGender = useKioskStore((state) => state.setUserGender)
  const setUserHeight = useKioskStore((state) => state.setUserHeight)

  const [heightValue, setHeightValue] = useState(userHeight || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Check fullscreen status
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err)
    }
  }

  const handleStart = async () => {
    if (!userGender || !heightValue) return

    setLoading(true)
    setError(null)

    try {
      // Step 1: Signup user
      const signupResponse = await api.signup()
      const token = signupResponse.token

      // Step 2: Update user details with gender and height
      const heightNum = parseFloat(heightValue)
      await api.updateUserDetails(token, userGender, heightNum)

      // Step 3: Save to store and navigate
      setUserHeight(heightValue)
      navigate('/capture')
    } catch (err) {
      console.error('Signup/update failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to create account. Please try again.')
      setLoading(false)
    }
  }

  const isFormValid = userGender && heightValue.trim() !== '' && !loading

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black text-white overflow-y-auto z-50 min-h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-[4%]">
          <LoadingPulse className="text-white" />
          <p className="text-clamp-body text-white/70 text-center">
            Creating your account...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-y-auto z-50 min-h-screen w-full">
      <MotionFade className="flex flex-col min-h-screen w-full p-[4%] sm:p-[5%] md:p-[6%]">
        {/* Top bar with back button and fullscreen button */}
        <div className="flex items-center justify-between mb-[3%]">
          {/* Back button - only show if there's a previous route, otherwise it's the initial screen */}
          {window.history.length > 1 ? (
            <button
              onClick={() => navigate(-1)}
              className="text-white text-2xl sm:text-3xl font-light hover:text-white/80 transition-colors"
              disabled={loading}
            >
              ‹
            </button>
          ) : (
            <div></div>
          )}

          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className="text-white text-2xl sm:text-3xl font-light hover:text-white/80 transition-colors p-2 -mr-2 flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/10"
            disabled={loading}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              // Exit fullscreen icon
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
            ) : (
              // Enter fullscreen icon
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full gap-[5%] sm:gap-[6%]">
          <div className="w-full flex justify-center mb-12">
            <img
              src={LandingGif}
              alt="Fashion Kiosk"
              className="w-48 h-48 object-contain"
            />
          </div>
          <p className="text-clamp-body text-white/70 text-left">
            Make sure we&apos;ve got it right for you.
          </p>

          <div className="w-full flex flex-col gap-[5%] sm:gap-[6%]">
            {/* Gender Selection */}
            <div className="flex flex-col gap-[3%]">
              <label className="text-sm sm:text-base md:text-lg font-semibold text-white/90 uppercase tracking-wide">
                YOUR GENDER
              </label>
              <div className="grid grid-cols-2 gap-[3%] sm:gap-[4%]">
                <button
                  onClick={() => setUserGender('male')}
                  className={`flex flex-col items-center justify-center gap-[3%] p-[5%] sm:p-[6%] rounded-xl border-2 transition-all ${userGender === 'male'
                    ? 'bg-white/20 border-white text-white'
                    : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                    }`}
                >
                  <div className="text-3xl sm:text-4xl md:text-5xl">♂</div>
                  <span className="text-sm sm:text-base md:text-lg font-medium">Male</span>
                </button>
                <button
                  onClick={() => setUserGender('female')}
                  className={`flex flex-col items-center justify-center gap-[3%] p-[5%] sm:p-[6%] rounded-xl border-2 transition-all ${userGender === 'female'
                    ? 'bg-white/20 border-white text-white'
                    : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                    }`}
                >
                  <div className="text-3xl sm:text-4xl md:text-5xl">♀</div>
                  <span className="text-sm sm:text-base md:text-lg font-medium">Female</span>
                </button>
              </div>
            </div>

            {/* Height Input */}
            <div className="flex flex-col gap-[3%]">
              <label className="text-sm sm:text-base md:text-lg font-semibold text-white/90 uppercase tracking-wide">
                YOUR HEIGHT (cm)
              </label>
              <input
                type="number"
                value={heightValue}
                onChange={(e) => setHeightValue(e.target.value)}
                placeholder="Enter your height in cm"
                className="w-full p-[4%] sm:p-[5%] bg-white/5 border-2 border-white/20 rounded-xl text-white placeholder:text-white/40 text-base sm:text-lg md:text-xl focus:outline-none focus:border-white focus:bg-white/10 transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="w-full p-[4%] bg-red-900/30 border border-red-500/50 rounded-xl">
              <p className="text-sm sm:text-base text-red-200 text-center">
                {error}
              </p>
            </div>
          )}

          <div className="w-full mt-[4%]">
            <Button
              className={`!w-full !py-[4%] sm:!py-[4.5%] !text-base sm:!text-lg md:!text-xl !font-bold !rounded-xl transition-all ${isFormValid
                ? '!bg-white !text-black hover:!bg-gray-100'
                : '!bg-white/20 !text-white/50 !cursor-not-allowed'
                }`}
              onClick={handleStart}
              disabled={!isFormValid}
            >
              Continue
            </Button>
          </div>
        </div>
      </MotionFade >
    </div >
  )
}

export default IdleScreen

