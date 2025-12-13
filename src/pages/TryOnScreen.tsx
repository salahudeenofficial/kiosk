import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/UI/Card'
import LoadingPulse from '../components/UI/LoadingPulse'
import MotionFade from '../components/UI/MotionFade'
import useAutoNavigate from '../hooks/useAutoNavigate'
import { useKioskStore } from '../store/kioskStore'
import { mockApi } from '../utils/mockApi'

const TryOnScreen = () => {
  useAutoNavigate()
  const navigate = useNavigate()
  const selectedProduct = useKioskStore((state) => state.selectedProduct)
  const userImage = useKioskStore((state) => state.userImage)
  const setVtonResult = useKioskStore((state) => state.setVtonResult)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let mounted = true
    let timer: number

    const runTryOn = async () => {
      if (!selectedProduct || !userImage) {
        navigate('/products')
        return
      }

      const totalTime = 2200 + Math.random() * 800
      const start = performance.now()
      timer = window.setInterval(() => {
        const elapsed = performance.now() - start
        const pct = Math.min(1, elapsed / totalTime)
        setProgress(pct)
      }, 120)

      const result = await mockApi.getVtonResult(selectedProduct, userImage)
      if (!mounted) return

      setVtonResult(result.url)
      window.clearInterval(timer)
      setProgress(1)
      navigate('/review')
    }

    runTryOn()
    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [navigate, selectedProduct, setVtonResult, userImage])

  return (
    <MotionFade>
      <Card className="flex flex-col gap-[3%]">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/60">
            Try-on
          </p>
          <h2 className="text-clamp-title font-bold">Generating your look</h2>
          <p className="text-clamp-body text-white/70">
            Creating a virtual try-on with your capture and the selected outfit.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-[3%] min-h-[40vh]">
          <LoadingPulse />
          <div className="h-[2vh] w-full rounded-full bg-white/10 overflow-hidden border border-white/10">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.floor(progress * 100)}%` }}
            />
          </div>
          <p className="text-white/70">This takes about 2–3 seconds.</p>
        </div>
      </Card>
    </MotionFade>
  )
}

export default TryOnScreen

