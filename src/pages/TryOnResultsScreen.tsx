import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import MotionFade from '../components/UI/MotionFade'
import LoadingPulse from '../components/UI/LoadingPulse'
import { useKioskStore } from '../store/kioskStore'
import { unifiedKioskApi } from '../utils/unifiedKioskApi'
import useAutoNavigate from '../hooks/useAutoNavigate'
import { formatPrice } from '../utils/validators'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const TryOnResultsScreen = () => {
  useAutoNavigate()
  const navigate = useNavigate()
  const selectedProducts = useKioskStore((state) => state.selectedProducts)
  const resetSession = useKioskStore((state) => state.resetSession)
  const setUserMeasurements = useKioskStore((state) => state.setUserMeasurements)
  const userMeasurements = useKioskStore((state) => state.userMeasurements)

  const vtonJobs = useKioskStore((state) => state.vtonJobs)

  // Derived state from store jobs
  const jobs = useMemo(() => {
    return selectedProducts.map(p => {
      const job = vtonJobs[p.id]
      return {
        garment_id: p.id,
        productName: p.title || 'Product',
        imageUrl: job?.imageUrl || null,
        status: job?.status || 'PENDING',
        error: job?.error,
      }
    })
  }, [selectedProducts, vtonJobs])

  const isLoading = useMemo(() => jobs.some(j => j.status === 'RUNNING' || j.status === 'PENDING' || j.status === 'QUEUED' || j.status === 'WAITING_MASK'), [jobs])
  const location = useLocation()
  const [activeIndex, setActiveIndex] = useState(location.state?.initialIndex || 0)

  // Refs for cleanup
  const eventSourceRef = useRef<EventSource | null>(null)

  // Get current error state (if all jobs failed)
  const error = useMemo(() => {
    // Only show error if NOT loading and ALL jobs failed
    if (!isLoading && jobs.length > 0 && jobs.every(j => j.status === 'FAILED' || j.error)) {
      return jobs.find(j => j.error)?.error || 'All try-ons failed'
    }
    return null
  }, [jobs, isLoading])

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

  // Main effect: Ensure session and products valid
  useEffect(() => {
    const session = unifiedKioskApi.getSession()
    // If no session exists locally or in store, redirect
    if (!session && !useKioskStore.getState().sessionId) {
      console.log('[TryOnResults] No session, redirecting')
      navigate('/')
      return
    }
    if (selectedProducts.length === 0) {
      console.log('[TryOnResults] No products, redirecting')
      navigate('/products')
    }
  }, [navigate, selectedProducts])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

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
  const currentJob = jobs[activeIndex] || jobs[0]

  if (isLoading && jobs.every(j => !j.imageUrl)) {
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
          <div className="flex items-center gap-4 pointer-events-auto">
            <button
              onClick={() => navigate('/products')}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200 text-black shadow-sm hover:bg-neutral-50 transition-all"
              aria-label="Back to Products"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-black tracking-wide">Try-On Results</h2>
          </div>

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
            initialSlide={activeIndex}
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

                    {/* Garment Details Overlay - Bottom Left */}
                    {/* Garment Details Overlay */}
                    {product && (
                      <>
                        {product.pairedProduct ? (
                          <>
                            {/* Upper Garment Detail - Top Left */}
                            <div className="absolute top-20 left-4 z-10 max-w-[150px] sm:max-w-[200px]">
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

                            {/* Lower Garment Detail - Bottom Left */}
                            <div className="absolute bottom-4 left-4 z-10 max-w-[150px] sm:max-w-[200px]">
                              <div className="bg-white/90 backdrop-blur-lg p-3 rounded-2xl shadow-lg border border-white/50">
                                <p className="text-[10px] text-black/50 uppercase tracking-widest font-bold">
                                  {product.pairedProduct.description ? product.pairedProduct.description.split('-')[0] : 'Brand'}
                                </p>
                                <h3 className="text-sm font-bold text-black truncate leading-tight">
                                  {product.pairedProduct.title}
                                </h3>
                                <p className="text-xs font-medium text-black/80 mt-1">
                                  {formatPrice(product.pairedProduct.price)}
                                </p>
                              </div>
                            </div>
                          </>
                        ) : (
                          /* Standard Single Garment Detail - Bottom Left */
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
                      </>
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
