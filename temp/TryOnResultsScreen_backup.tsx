import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
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
import type { Product } from '../utils/mockApi'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

// --- Product Detail Popup (centered, image-focused) ---
const ProductDetailPopup = ({ product, onClose }: {
  product: Product
  onClose: () => void
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Large product image */}
        <div className="w-full aspect-[3/4] bg-gray-50">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Minimal info */}
        <div className="px-4 py-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
            {product.description?.split('-')[0]?.trim() || 'Brand'}
          </p>
          <h3 className="text-sm font-bold text-gray-900 leading-tight mt-0.5 truncate">
            {product.title}
          </h3>
          <p className="text-sm font-semibold text-gray-900 mt-1">
            {formatPrice(product.price)}
          </p>
        </div>
      </div>
    </div>
  )
}

// --- Pinch-Zoomable Image (focal-point aware) ---
const PinchZoomImage = ({ src, alt }: { src: string; alt: string }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  // Use refs for transform state to avoid re-render lag during gestures
  const stateRef = useRef({ scale: 1, tx: 0, ty: 0 })
  const imgRef = useRef<HTMLImageElement>(null)
  const [, forceUpdate] = useState(0)

  const pinchRef = useRef<{
    startDist: number
    startScale: number
    startTx: number
    startTy: number
    midX: number
    midY: number
  } | null>(null)
  const panRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null)

  const getDist = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX
    const dy = t1.clientY - t2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const getMid = (t1: React.Touch, t2: React.Touch) => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  })

  const applyTransform = () => {
    if (!imgRef.current) return
    const { scale, tx, ty } = stateRef.current
    imgRef.current.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const mid = getMid(e.touches[0], e.touches[1])
      const s = stateRef.current
      pinchRef.current = {
        startDist: getDist(e.touches[0], e.touches[1]),
        startScale: s.scale,
        startTx: s.tx,
        startTy: s.ty,
        midX: mid.x,
        midY: mid.y,
      }
      panRef.current = null
    } else if (e.touches.length === 1 && stateRef.current.scale > 1) {
      panRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startTx: stateRef.current.tx,
        startTy: stateRef.current.ty,
      }
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault()
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const p = pinchRef.current
      const dist = getDist(e.touches[0], e.touches[1])
      const newScale = Math.min(Math.max(p.startScale * (dist / p.startDist), 1), 3)

      // Focal point: keep the pinch midpoint fixed on screen
      // The midpoint in container-relative coords
      const focalX = p.midX - rect.left
      const focalY = p.midY - rect.top

      // Before zoom, the focal point maps to image coord:
      //   imgX = (focalX - startTx) / startScale
      // After zoom, we want: focalX = imgX * newScale + newTx
      //   newTx = focalX - imgX * newScale
      const imgX = (focalX - p.startTx) / p.startScale
      const imgY = (focalY - p.startTy) / p.startScale
      const newTx = focalX - imgX * newScale
      const newTy = focalY - imgY * newScale

      if (newScale <= 1) {
        stateRef.current = { scale: 1, tx: 0, ty: 0 }
      } else {
        stateRef.current = { scale: newScale, tx: newTx, ty: newTy }
      }
      applyTransform()
    } else if (e.touches.length === 1 && panRef.current && stateRef.current.scale > 1) {
      const dx = e.touches[0].clientX - panRef.current.startX
      const dy = e.touches[0].clientY - panRef.current.startY
      stateRef.current.tx = panRef.current.startTx + dx
      stateRef.current.ty = panRef.current.startTy + dy
      applyTransform()
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null
    panRef.current = null
    if (stateRef.current.scale <= 1.05) {
      stateRef.current = { scale: 1, tx: 0, ty: 0 }
      applyTransform()
    }
    forceUpdate(n => n + 1)
  }, [])

  // Double-tap to zoom into tap location
  const lastTap = useRef(0)
  const handleTap = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const now = Date.now()
    if (now - lastTap.current < 300) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const s = stateRef.current

      if (s.scale > 1) {
        stateRef.current = { scale: 1, tx: 0, ty: 0 }
      } else {
        const tapX = e.touches[0].clientX - rect.left
        const tapY = e.touches[0].clientY - rect.top
        const newScale = 2
        // Zoom so the tap point stays fixed
        const imgX = (tapX - s.tx) / s.scale
        const imgY = (tapY - s.ty) / s.scale
        stateRef.current = {
          scale: newScale,
          tx: tapX - imgX * newScale,
          ty: tapY - imgY * newScale,
        }
      }
      applyTransform()
      forceUpdate(n => n + 1)
    }
    lastTap.current = now
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden touch-none"
      onTouchStart={(e) => { handleTap(e); handleTouchStart(e) }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        style={{ willChange: 'transform', transformOrigin: '0 0' }}
        draggable={false}
      />
    </div>
  )
}

const TryOnResultsScreen = () => {
  useAutoNavigate()
  const navigate = useNavigate()
  const selectedProducts = useKioskStore((state) => state.selectedProducts)
  const userMeasurements = useKioskStore((state) => state.userMeasurements)
  const vtonJobs = useKioskStore((state) => state.vtonJobs)

  // Product detail popup state
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)

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


  // Get current error state (if all jobs failed)
  const error = useMemo(() => {
    // Only show error if NOT loading and ALL jobs failed
    if (!isLoading && jobs.length > 0 && jobs.every(j => j.status === 'FAILED' || j.error)) {
      return jobs.find(j => j.error)?.error || 'All try-ons failed'
    }
    return null
  }, [jobs, isLoading])

  // Measurements are now provided by the size-recommendation endpoint in FitCheck
  // No separate measurements polling needed

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
                      <PinchZoomImage src={job.imageUrl} alt={job.productName} />
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
                            <div
                              className="absolute top-4 left-4 z-10 max-w-[200px] cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); setDetailProduct(product) }}
                            >
                              <div className="bg-white/95 backdrop-blur-md p-2 rounded-md shadow-sm border border-gray-100 flex items-center gap-2 hover:shadow-md transition-shadow">
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
                            <div
                              className="absolute top-4 right-4 z-10 max-w-[200px] cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (product.pairedProduct) {
                                  setDetailProduct({
                                    id: product.pairedProduct.id,
                                    title: product.pairedProduct.title,
                                    price: product.pairedProduct.price,
                                    image: product.pairedProduct.image,
                                    description: product.pairedProduct.description,
                                    sizes: product.pairedProduct.sizes || [],
                                  })
                                }
                              }}
                            >
                              <div className="bg-white/95 backdrop-blur-md p-2 rounded-md shadow-sm border border-gray-100 flex items-center gap-2 hover:shadow-md transition-shadow">
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
                          <div
                            className="absolute top-4 left-4 z-10 max-w-[200px] cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); setDetailProduct(product) }}
                          >
                            <div className="bg-white/95 backdrop-blur-md p-2 rounded-md shadow-sm border border-gray-100 flex items-center gap-2 hover:shadow-md transition-shadow">
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

      {/* Product Detail Popup */}
      {detailProduct && (
        <ProductDetailPopup
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
        />
      )}

      {/* Pop-in animation */}
      <style>{`
        @keyframes pop-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-pop-in {
          animation: pop-in 0.2s ease-out;
        }
      `}</style>
    </div >
  )
}

export default TryOnResultsScreen
