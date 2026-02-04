import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import MotionFade from '../components/UI/MotionFade'
import LoadingPulse from '../components/UI/LoadingPulse'
import { useKioskStore } from '../store/kioskStore'
import { unifiedKioskApi, type VtonResultEvent, type VtonErrorEvent } from '../utils/unifiedKioskApi'
import useAutoNavigate from '../hooks/useAutoNavigate'
import { formatPrice } from '../utils/validators'
import { MOCK_PRODUCTS } from '../utils/mockKioskApi'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

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
  const addSelectedProduct = useKioskStore((state) => state.addSelectedProduct)
  const setVtonResults = useKioskStore((state) => state.setVtonResults)
  const resetSession = useKioskStore((state) => state.resetSession)
  const setUserMeasurements = useKioskStore((state) => state.setUserMeasurements)
  const userMeasurements = useKioskStore((state) => state.userMeasurements)

  const [jobs, setJobs] = useState<VtonJob[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isRequestingVton, setIsRequestingVton] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)

  // Refs for cleanup
  const eventSourceRef = useRef<EventSource | null>(null)
  const hasInitiatedRef = useRef(false)

  // Poll for measurements
  useEffect(() => {
    let pollingActive = true

    const fetchMeasurements = async () => {
      try {
        const result = await unifiedKioskApi.getMeasurements()
        if (result.status === 'success' && result.measurements) {
          setUserMeasurements(result.measurements)
          pollingActive = false // Stop polling once success
        } else if (result.status === 'failed') {
          pollingActive = false
        }
      } catch (e) {
        console.warn('Error fetching measurements:', e)
      }
    }

    // Initial fetch
    fetchMeasurements()

    const interval = setInterval(() => {
      if (pollingActive && !userMeasurements) {
        fetchMeasurements()
      } else {
        clearInterval(interval)
      }
    }, 2000) // Poll every 2s

    return () => clearInterval(interval)
  }, [setUserMeasurements, userMeasurements])

  // Main effect for VTON
  useEffect(() => {
    if (hasInitiatedRef.current) return
    hasInitiatedRef.current = true

    const initFlow = async () => {
      const isDev = unifiedKioskApi.isMockMode() || import.meta.env.DEV

      // 1. Check Session
      let session = unifiedKioskApi.getSession()

      // Auto-create session in mock/dev mode if missing
      if (!session && isDev) {
        console.log('[Dev] Auto-creating mock session')
        await unifiedKioskApi.createSession()
        session = unifiedKioskApi.getSession()
      }

      const hasSession = !!session
      if (!hasSession) {
        console.log('[VTON] No active session, redirecting')
        navigate('/')
        return
      }

      // 2. Check Products
      let currentProducts = useKioskStore.getState().selectedProducts

      // Auto-populate products in mock/dev mode if empty
      if (currentProducts.length === 0 && isDev) {
        console.log('[Dev] Auto-seeding mock products')
        const mockItems = MOCK_PRODUCTS.slice(0, 3)
        mockItems.forEach(p => {
          addSelectedProduct({
            id: String(p.productId),
            title: p.name,
            price: p.mrp,
            image: p.imageUrl,
            description: `${p.brand.name} - ${p.baseColour}`,
            sizes: ['S', 'M', 'L', 'XL']
          })
        })
        // Re-read from store for immediate consistency
        currentProducts = useKioskStore.getState().selectedProducts
      }

      if (currentProducts.length === 0) {
        console.log('[VTON] No products selected, redirecting')
        navigate('/products')
        return
      }

      // 3. Initialize Jobs
      const initialJobs: VtonJob[] = currentProducts.slice(0, 3).map((product) => ({
        garment_id: String(product.id),
        productName: product.title || 'Product',
        imageUrl: null,
        status: 'PENDING',
      }))
      setJobs(initialJobs)

      // 4. Start VTON Request
      try {
        const garmentIds = currentProducts.slice(0, 3).map((p) => Number(p.id))
        console.log('[VTON] Requesting VTON for garments:', garmentIds)

        const startTime = Date.now()
        // In mock mode, requestVton returns mock jobs quickly
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

        // Start SSE stream for results (or mock polling)
        console.log('[VTON] Starting processing stream...')
        const eventSource = unifiedKioskApi.startVtonStream(
          (result: VtonResultEvent) => {
            console.log('[VTON] Received result:', result)
            setJobs((prev) =>
              prev.map((job) => {
                if (job.garment_id === String(result.garment_id)) {
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
          (update) => {
            setJobs((prev) => prev.map(job =>
              job.garment_id === update.job_id ? { ...job, status: update.status } : job
            ))
          },
          (connectionError) => {
            console.error('[VTON] SSE connection error:', connectionError)
          }
        )

        if (eventSource) {
          eventSourceRef.current = eventSource
        } else if (unifiedKioskApi.isMockMode() || isDev) {
          // Poll for mock results since SSE isn't real in mock mode
          console.log('[Dev] Starting mock result simulation')
          garmentIds.forEach(id => {
            unifiedKioskApi.getMockVtonResult(id).then(res => {
              // Simulate updating state with result
              setJobs(prev => prev.map(j => j.garment_id === String(id) ? {
                ...j,
                imageUrl: res.output_image_url || null,
                status: 'SUCCESS',
                responseTime: Date.now() - startTime
              } : j))
            })
          })
        }

      } catch (err) {
        console.error('[VTON] Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to start try-on')
        setIsRequestingVton(false)
      }
    }

    initFlow()

    return () => {
      console.log('[VTON] Cleanup')
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setTimeout(() => {
        hasInitiatedRef.current = false
      }, 100)
    }
  }, [selectedProducts, navigate, setVtonResults, addSelectedProduct])

  const handleDone = async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    await unifiedKioskApi.completeSession()
    resetSession()
    navigate('/')
  }

  const handleFitCheck = () => {
    navigate('/fit-check')
  }

  // Get current product details
  const currentJob = jobs[activeIndex]
  const currentProduct = useMemo(() => {
    if (!currentJob) return null
    return selectedProducts.find(p => String(p.id) === currentJob.garment_id)
  }, [currentJob, selectedProducts])

  if (isRequestingVton) {
    return (
      <div className="fixed inset-0 bg-white text-black overflow-hidden z-50 min-h-screen w-full flex flex-col items-center justify-center">
        <LoadingPulse className="text-black/50 max-w-[200px]" />
        <p className="text-xl text-black/70 text-center mt-6 font-light">Creating your look...</p>
      </div>
    )
  }

  if (error && jobs.every(j => !j.imageUrl)) {
    return (
      <div className="fixed inset-0 bg-white text-black overflow-hidden z-50 min-h-screen w-full flex flex-col items-center justify-center p-8">
        <p className="text-xl text-red-500 mb-6">{error}</p>
        <button onClick={handleDone} className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-neutral-800 transition-colors">
          Return Home
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-white text-black overflow-hidden z-50 min-h-screen w-full flex flex-col">
      <MotionFade className="flex flex-col h-full w-full relative">

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 px-6 py-6 flex items-center justify-between pointer-events-none">
          <h2 className="text-xl font-bold text-black tracking-wide pointer-events-auto">Try-On Results</h2>

          {/* End Session Button */}
          <button
            onClick={handleDone}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200 text-black shadow-sm hover:bg-neutral-50 transition-all pointer-events-auto"
            aria-label="End Session"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Swiper Content */}
        <div className="flex-1 w-full h-full pb-0">
          <Swiper
            modules={[Navigation, Pagination]}
            spaceBetween={20}
            slidesPerView={1}
            centeredSlides
            onSlideChange={(swiper: SwiperType) => setActiveIndex(swiper.activeIndex)}
            pagination={{
              clickable: true,
              bulletClass: 'swiper-pagination-bullet !bg-black/20 !w-2 !h-2 !transition-all',
              bulletActiveClass: '!bg-black !scale-150',
            }}
            // Force swiper to take full height
            className="w-full !h-full"
          >
            {jobs.map((job) => {
              const product = selectedProducts.find(p => String(p.id) === job.garment_id)

              return (
                // SwiperSlide must be flexible to center content perfectly
                <SwiperSlide key={job.garment_id} className="!flex !h-full !w-full items-center justify-center p-4 pt-20 pb-8 box-border">
                  {/* Image Card Container - Responsive Sizing */}
                  <div className="relative w-full max-w-[85vw] sm:max-w-[400px] md:max-w-[450px] aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl border border-gray-100 bg-gray-50 flex-shrink-0">
                    {job.imageUrl ? (
                      <img src={job.imageUrl} alt={job.productName} className="w-full h-full object-cover" />
                    ) : job.error ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gray-50">
                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <p className="text-red-500 text-center">{job.error}</p>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gray-50">
                        <LoadingPulse className="text-black/20 mb-6" />
                        <p className="text-black/40">Generating...</p>
                      </div>
                    )}

                    {job.responseTime && (
                      <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] sm:text-xs text-black/60 font-mono border border-gray-200">
                        {(job.responseTime / 1000).toFixed(1)}s
                      </div>
                    )}

                    {/* Garment Details Overlay - Bottom Left */}
                    {product && (
                      <div className="absolute bottom-4 left-4 z-10 max-w-[150px] sm:max-w-[200px]">
                        <div className="bg-white/90 backdrop-blur-lg p-3 rounded-2xl shadow-lg border border-white/50">
                          <p className="text-[10px] text-black/50 uppercase tracking-widest font-bold">
                            {product.description ? product.description.split('-')[0] : 'Brand'}
                          </p>
                          <h3 className="text-sm font-bold text-black truncate leading-tight">
                            {product.title}
                          </h3>
                          <p className="text-xs font-medium text-black/80 mt-1">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Fit Check Button - Bottom Right */}
                    <div className="absolute bottom-4 right-4 z-10">
                      <button
                        onClick={handleFitCheck}
                        disabled={!userMeasurements}
                        className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-full shadow-lg transition-all active:scale-95 ${userMeasurements
                            ? 'bg-black text-white hover:bg-neutral-800'
                            : 'bg-gray-100 text-gray-400 cursor-wait'
                          }`}
                      >
                        {!userMeasurements ? (
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
                            <line x1="16" y1="8" x2="2" y2="22"></line>
                            <line x1="17.5" y1="15" x2="9" y2="15"></line>
                          </svg>
                        )}
                        <span className="text-xs sm:text-sm font-bold">Fit Check</span>
                      </button>
                    </div>

                  </div>
                </SwiperSlide>
              )
            })}
          </Swiper>
        </div>

      </MotionFade>
    </div>
  )
}

export default TryOnResultsScreen
