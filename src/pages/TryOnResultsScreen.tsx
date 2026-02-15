import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import MotionFade from '../components/UI/MotionFade'
import LoadingPulse from '../components/UI/LoadingPulse'
import { useKioskStore } from '../store/kioskStore'
import { unifiedKioskApi } from '../utils/unifiedKioskApi'
import useAutoNavigate from '../hooks/useAutoNavigate'
import { formatPrice } from '../utils/validators'
import EndSessionButton from '../components/UI/EndSessionButton'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const TryOnResultsScreen = () => {
  useAutoNavigate()
  const navigate = useNavigate()
  const selectedProducts = useKioskStore((state) => state.selectedProducts)
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
  const [swiperRef, setSwiperRef] = useState<SwiperType | null>(null)

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



  const handleFitCheck = () => {
    const currentJob = jobs[activeIndex]
    if (!currentJob) return

    const product = selectedProducts.find(p => String(p.id) === currentJob.garment_id)
    if (!product) return

    const garmentIds: number[] = [parseInt(product.id)]
    if (product.pairedProduct) {
      garmentIds.push(parseInt(product.pairedProduct.id))
    }

    navigate('/fit-check', { state: { garmentIds } })
  }



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
        <EndSessionButton />
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
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-black text-black shadow-sm hover:bg-neutral-50 transition-all"
              aria-label="Back to Products"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* End Session Button */}
          <EndSessionButton className="!text-black !border-black hover:!bg-black hover:!text-white" />
        </div>

        {/* Swiper Content */}
        <div className="flex-1 w-full min-h-0 relative">
          <Swiper
            initialSlide={activeIndex}
            modules={[Navigation]}
            spaceBetween={20}
            slidesPerView={1}
            centeredSlides
            onSwiper={setSwiperRef}
            onSlideChange={(swiper: SwiperType) => setActiveIndex(swiper.activeIndex)}
            // Force swiper to take full height
            className="w-full !h-full"
          >
            {jobs.map((job) => {
              const product = selectedProducts.find(p => String(p.id) === job.garment_id)

              return (
                // SwiperSlide must be flexible to center content perfectly
                <SwiperSlide key={job.garment_id} className="!flex !flex-col !h-full !w-full items-center justify-center p-4 pt-16 pb-4 box-border relative">
                  {/* Image Card Container - Responsive Sizing */}
                  <div className="relative w-full max-w-[85vw] sm:max-w-[600px] md:max-w-[675px] aspect-[3/4] rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0">
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
                            <div className="absolute top-4 left-4 z-10 max-w-[200px]">
                              <div className="bg-white/95 backdrop-blur-md p-2 rounded-md shadow-sm border border-gray-100 flex items-center gap-2">
                                <img src={product.image} alt={product.title} className="w-10 h-12 object-cover rounded-sm bg-gray-50" />
                                <div className="min-w-0">
                                  <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold truncate">
                                    {product.description ? product.description.split('-')[0] : 'Brand'}
                                  </p>
                                  <h3 className="text-xs font-bold text-gray-900 truncate leading-tight">
                                    {product.title}
                                  </h3>
                                  <p className="text-[10px] font-medium text-gray-600 mt-0.5">
                                    {formatPrice(product.price)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Lower Garment Detail - Top Right */}
                            <div className="absolute top-4 right-4 z-10 max-w-[200px]">
                              <div className="bg-white/95 backdrop-blur-md p-2 rounded-md shadow-sm border border-gray-100 flex items-center gap-2">
                                <img src={product.pairedProduct.image} alt={product.pairedProduct.title} className="w-10 h-12 object-cover rounded-sm bg-gray-50" />
                                <div className="min-w-0">
                                  <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold truncate">
                                    {product.pairedProduct.description ? product.pairedProduct.description.split('-')[0] : 'Brand'}
                                  </p>
                                  <h3 className="text-xs font-bold text-gray-900 truncate leading-tight">
                                    {product.pairedProduct.title}
                                  </h3>
                                  <p className="text-[10px] font-medium text-gray-600 mt-0.5">
                                    {formatPrice(product.pairedProduct.price)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          /* Standard Single Garment Detail - Top Left */
                          <div className="absolute top-4 left-4 z-10 max-w-[200px]">
                            <div className="bg-white/95 backdrop-blur-md p-2 rounded-md shadow-sm border border-gray-100 flex items-center gap-2">
                              <img src={product.image} alt={product.title} className="w-10 h-12 object-cover rounded-sm bg-gray-50" />
                              <div className="min-w-0">
                                <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold truncate">
                                  {product.description ? product.description.split('-')[0] : 'Brand'}
                                </p>
                                <h3 className="text-xs font-bold text-gray-900 truncate leading-tight">
                                  {product.title}
                                </h3>
                                <p className="text-[10px] font-medium text-gray-600 mt-0.5">
                                  {formatPrice(product.price)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* See My Fit Button - Bottom Right */}
                    <div className="absolute bottom-4 right-4 z-10">
                      <button
                        onClick={handleFitCheck}
                        disabled={!userMeasurements}
                        className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-md shadow-lg transition-all active:scale-95 border border-gray-100 ${userMeasurements
                          ? 'bg-white text-black hover:bg-gray-50'
                          : 'bg-gray-100 text-gray-400 cursor-wait'
                          }`}
                      >
                        {!userMeasurements ? (
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <img src="/icons/fit-check-icon.png" alt="Fit Check" className="w-4 h-4 sm:w-[18px] sm:h-[18px] object-contain" />
                        )}
                        <span className="text-xs sm:text-sm font-bold">See My Fit</span>
                      </button>
                    </div>

                  </div>
                </SwiperSlide>
              )
            })}
          </Swiper>
        </div>



        {/* Indicators fixed at bottom - Static Footer */}
        <div className="w-full flex justify-center gap-2 pt-6 pb-24 bg-white shrink-0 z-30">
          {jobs.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation()
                swiperRef?.slideTo(idx)
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === activeIndex ? 'bg-gray-600 scale-125' : 'bg-gray-300 hover:bg-gray-400'
                }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

      </MotionFade >
    </div >
  )
}

export default TryOnResultsScreen
