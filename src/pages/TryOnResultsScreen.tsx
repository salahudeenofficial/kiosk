import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import MotionFade from '../components/UI/MotionFade'
import LoadingPulse from '../components/UI/LoadingPulse'
import { useKioskStore } from '../store/kioskStore'
import { unifiedKioskApi, type VtonResultEvent, type VtonErrorEvent } from '../utils/unifiedKioskApi'
import useAutoNavigate from '../hooks/useAutoNavigate'

type VtonJob = {
  garment_id: string
  productName: string
  imageUrl: string | null
  status: string
  error?: string
  responseTime?: number
}

const TryOnResultsScreen = () => {
  useAutoNavigate()
  const navigate = useNavigate()
  const selectedProducts = useKioskStore((state) => state.selectedProducts)
  const setVtonResults = useKioskStore((state) => state.setVtonResults)
  const resetSession = useKioskStore((state) => state.resetSession)

  const [jobs, setJobs] = useState<VtonJob[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isRequestingVton, setIsRequestingVton] = useState(true)

  // Refs for cleanup
  const eventSourceRef = useRef<EventSource | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const hasInitiatedRef = useRef(false)

  // Main effect for VTON
  useEffect(() => {
    // Prevent StrictMode double-mount
    if (hasInitiatedRef.current) {
      console.log('[VTON] Already initiated, skipping duplicate mount')
      return
    }
    hasInitiatedRef.current = true

    if (selectedProducts.length === 0) {
      console.log('[VTON] No products selected, redirecting')
      navigate('/products')
      return
    }

    // Check for active session
    const session = unifiedKioskApi.getSession()
    if (!session) {
      console.log('[VTON] No active session, redirecting')
      navigate('/')
      return
    }

    // Initialize jobs from selected products
    const initialJobs: VtonJob[] = selectedProducts.slice(0, 3).map((product) => ({
      garment_id: String(product.id),
      productName: product.title || 'Product',
      imageUrl: null,
      status: 'PENDING',
    }))
    setJobs(initialJobs)

    const startVton = async () => {
      try {
        // Request VTON for all selected garments
        const garmentIds = selectedProducts.slice(0, 3).map((p) => Number(p.id))
        console.log('[VTON] Requesting VTON for garments:', garmentIds)

        const startTime = Date.now()
        const response = await unifiedKioskApi.requestVton(garmentIds)
        console.log('[VTON] VTON request successful:', response.jobs)

        // Update job statuses from response
        setJobs((prev) =>
          prev.map((job) => {
            const responseJob = response.jobs.find((j) => String(j.garment_id) === job.garment_id)
            if (responseJob) {
              return { ...job, status: responseJob.status }
            }
            return job
          })
        )

        setIsRequestingVton(false)

        // Start SSE stream for results
        console.log('[VTON] Starting SSE stream...')
        const eventSource = unifiedKioskApi.startVtonStream(
          // On result
          (result: VtonResultEvent) => {
            console.log('[VTON] Received result:', result)
            setJobs((prev) =>
              prev.map((job) => {
                if (job.garment_id === String(result.garment_id)) {
                  // Use output_image_data (base64) if available, otherwise fallback to URL
                  const img = result.output_image_data || result.output_image_url || null
                  return {
                    ...job,
                    imageUrl: img,
                    status: result.status,
                    responseTime: Date.now() - startTime,
                  }
                }
                return job
              })
            )
            // Update store with results - collect all completed image URLs
            setJobs((currentJobs) => {
              const allUrls = currentJobs
                .filter(j => j.imageUrl !== null)
                .map(j => j.imageUrl!)

              const newImg = result.output_image_data || result.output_image_url
              if (newImg && !allUrls.includes(newImg)) {
                allUrls.push(newImg)
              }
              setVtonResults(allUrls)
              return currentJobs
            })
          },
          // On error
          (errorEvent: VtonErrorEvent) => {
            console.error('[VTON] Error for garment:', errorEvent)
            setJobs((prev) =>
              prev.map((job) => {
                if (job.garment_id === String(errorEvent.garment_id)) {
                  return {
                    ...job,
                    status: errorEvent.status,
                    error: errorEvent.error,
                  }
                }
                return job
              })
            )
          },
          // On update
          (update) => {
            console.log('[VTON] Status update:', update)
            setJobs((prev) =>
              prev.map((job) => {
                if (job.garment_id === update.job_id) {
                  return { ...job, status: update.status }
                }
                return job
              })
            )
          },
          // On connection error
          (connectionError) => {
            console.error('[VTON] SSE connection error:', connectionError)
            // Don't set error state - might just be connection issue
            // Jobs will show as pending
          }
        )

        if (eventSource) {
          eventSourceRef.current = eventSource
        }
      } catch (err) {
        console.error('[VTON] Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to start try-on')
        setIsRequestingVton(false)
      }
    }

    startVton()

    // Cleanup
    return () => {
      console.log('[VTON] Cleanup')
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      // Reset flag for next navigation
      setTimeout(() => {
        hasInitiatedRef.current = false
      }, 100)
    }
  }, [selectedProducts, navigate, setVtonResults])

  const handleDone = async () => {
    // Stop SSE stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    // Complete the session
    try {
      await unifiedKioskApi.completeSession()
    } catch (err) {
      console.error('Failed to complete session:', err)
    }

    // Reset session state
    resetSession()
    navigate('/')
  }

  const handleTryAgain = () => {
    // Reset and go back to products
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    navigate('/products')
  }

  // Check completion status
  const completedJobs = jobs.filter((j) => j.imageUrl !== null)
  const failedJobs = jobs.filter((j) => j.error)
  const allDone = jobs.length > 0 && (completedJobs.length + failedJobs.length) >= jobs.length
  const anySuccess = completedJobs.length > 0

  // Loading state
  if (isRequestingVton) {
    return (
      <div className="fixed inset-0 bg-black text-white overflow-hidden z-50 min-h-screen w-full flex flex-col items-center justify-center">
        <LoadingPulse className="text-white max-w-[200px]" />
        <p className="text-xl text-white/70 text-center mt-6">Starting your try-on...</p>
      </div>
    )
  }

  // Error state
  if (error && !anySuccess) {
    return (
      <div className="fixed inset-0 bg-black text-white overflow-hidden z-50 min-h-screen w-full flex flex-col items-center justify-center p-8">
        <p className="text-xl text-red-400 mb-6">{error}</p>
        <div className="flex gap-4">
          <button onClick={handleTryAgain} className="px-8 py-3 bg-white/20 text-white rounded-xl font-bold hover:bg-white/30">
            Try Again
          </button>
          <button onClick={handleDone} className="px-8 py-3 bg-white text-black rounded-xl font-bold">
            Return Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden z-50 min-h-screen w-full">
      <MotionFade className="flex flex-col h-full w-full">
        <div className="px-[4%] pt-[12%] pb-0 flex items-center justify-center">
          <h2 className="text-clamp-title font-bold text-white text-center">Your Try-On Results</h2>
        </div>

        <div className="flex-1 flex items-start justify-center px-[4%] pb-[4%] pt-4">
          {jobs.length > 0 ? (
            <Swiper
              modules={[Navigation, Pagination]}
              spaceBetween={20}
              slidesPerView={1}
              centeredSlides
              pagination={{
                clickable: true,
                bulletClass: 'swiper-pagination-bullet !bg-white/30 !w-3 !h-3',
                bulletActiveClass: '!bg-white !scale-125',
              }}
              className="w-full h-full"
            >
              {jobs.map((job) => (
                <SwiperSlide key={job.garment_id} className="flex items-center justify-center">
                  <div className="w-full max-w-2xl aspect-[3/4] bg-slate-800 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
                    {job.imageUrl ? (
                      <img src={job.imageUrl} alt={job.productName} className="w-full h-full object-cover" />
                    ) : job.error ? (
                      <div className="flex flex-col items-center gap-4 p-6">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <p className="text-sm text-red-400 text-center">{job.error}</p>
                        <p className="text-xs text-white/40">{job.productName}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 p-6">
                        <LoadingPulse className="text-white" />
                        <p className="text-sm text-white/60 text-center">Generating {job.productName}...</p>
                        <p className="text-xs text-white/40 uppercase tracking-wide">{job.status}</p>
                      </div>
                    )}
                    {job.responseTime && (
                      <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white/80 font-mono">
                        {(job.responseTime / 1000).toFixed(1)}s
                      </div>
                    )}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <p className="text-white/60">No results available</p>
          )}
        </div>

        {/* Status indicator */}
        {!allDone && (
          <div className="px-[4%] pb-2 flex justify-center">
            <p className="text-sm text-white/50">
              {completedJobs.length} of {jobs.length} completed
            </p>
          </div>
        )}

        <div className="px-[4%] pb-[6%] flex gap-4">
          <button
            onClick={handleDone}
            disabled={!allDone}
            className={`w-full py-4 rounded-xl font-bold ${allDone ? 'bg-white text-black' : 'bg-white/20 text-white/50 cursor-not-allowed'}`}
          >
            Done
          </button>
        </div>
      </MotionFade>
    </div>
  )
}

export default TryOnResultsScreen

