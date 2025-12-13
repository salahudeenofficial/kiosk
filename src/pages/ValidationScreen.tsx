import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MotionFade from '../components/UI/MotionFade'
import LoadingPulse from '../components/UI/LoadingPulse'
import useAutoNavigate from '../hooks/useAutoNavigate'
import { useKioskStore } from '../store/kioskStore'
import { api } from '../utils/api'
import Button from '../components/UI/Button'

const ValidationScreen = () => {
  useAutoNavigate()
  const navigate = useNavigate()
  const userImage = useKioskStore((state) => state.userImage)
  const userToken = useKioskStore((state) => state.userToken)
  const setValidated = useKioskStore((state) => state.setValidated)
  const setUserImageUrl = useKioskStore((state) => state.setUserImageUrl)

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleContinue = async () => {
    if (!userImage || !userToken) {
      setError('Missing image or session. Please restart.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Upload image to backend
      const result = await api.uploadUserImage(userToken, userImage)

      // Save the backend URL to store
      setUserImageUrl(result.imageUrl)
      setValidated(true)

      // Navigate to products
      navigate('/products')
    } catch (err) {
      console.error('Upload failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload image. Please try again.')
      setUploading(false)
    }
  }

  if (uploading) {
    return (
      <div className="fixed inset-0 bg-black text-white overflow-hidden z-50 min-h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-[4%]">
          <LoadingPulse className="text-white" />
          <p className="text-clamp-body text-white/70 text-center">
            Uploading your photo...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden z-50 min-h-screen w-full">
      <MotionFade className="flex flex-col h-full w-full p-[4%] sm:p-[5%] md:p-[6%]">
        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {userImage ? (
              <div className="relative w-full h-full max-h-[70vh] flex items-center justify-center overflow-hidden rounded-2xl border-2 border-white/10 shadow-2xl bg-black">
                <img
                  src={userImage}
                  alt="Captured"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-full w-full max-w-2xl items-center justify-center rounded-2xl bg-slate-800/50 text-white/60">
                Waiting for capture…
              </div>
            )}
          </div>

          {error && (
            <div className="w-full max-w-2xl mt-4 p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
              <p className="text-sm text-red-200 text-center">{error}</p>
            </div>
          )}

          <div className="w-full max-w-2xl mt-[4%] space-y-4 shrink-0">
            <Button
              className="!bg-white !text-black hover:!bg-gray-100 !border-0 !w-full !py-[3%] sm:!py-[4%] !text-clamp-button !font-bold !rounded-xl"
              onClick={() => navigate('/capture')}
              disabled={uploading}
            >
              RE-TAKE
            </Button>
            <Button
              className="!bg-transparent !text-white/70 hover:!text-white !border !border-white/30 hover:!border-white/60 !w-full !py-[3%] sm:!py-[4%] !text-clamp-button !font-bold !rounded-xl transition-all"
              onClick={handleContinue}
              disabled={uploading || !userImage}
            >
              CONTINUE
            </Button>
          </div>
        </div>
      </MotionFade>
    </div>
  )
}

export default ValidationScreen
