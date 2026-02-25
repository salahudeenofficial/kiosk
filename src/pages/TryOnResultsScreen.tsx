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
import type { SizeRecommendationResponse } from '../utils/kioskApi'
import { useFitLines, type FitLinesData } from '../hooks/useFitLines'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

// --- Utility Functions ---
const toCanonicalKey = (raw: string): string | null => {
  const k = raw.toLowerCase()
  if (k.includes('chest') || k.includes('bust')) return 'chest'
  if (k.includes('shoulder')) return 'shoulder'
  if (k.includes('waist')) return 'waist'
  if (k.includes('hip')) return 'hip'
  if (k.includes('sleeve') || k === 'arm right length' || k === 'arm left length') return 'sleeve_length'
  if (k.includes('inseam') || k === 'inside leg height') return 'inseam'
  if (k.includes('thigh')) return 'thigh'
  if (k.includes('neck')) return 'neck'
  if (k === 'height') return 'height'
  return null
}

// --- Product Detail Popup ---
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
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="w-full aspect-[3/4] bg-gray-50">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>

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

// --- User Measurements Popup ---
const UserMeasurementsPopup = ({ measurements, onClose }: {
  measurements: Record<string, number>
  onClose: () => void
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm shadow-2xl transition-all" onClick={onClose}>
      <div
        className="relative bg-white rounded-[2px] w-full max-w-sm overflow-hidden shadow-2xl animate-pop-in border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full flex items-center justify-center shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.3 15.3l-14-14a2 2 0 00-2.8 0l-2.8 2.8a2 2 0 000 2.8l14 14a2 2 0 002.8 0l2.8-2.8a2 2 0 000-2.8z" /><path d="M14.5 5.5l4 4" /><path d="M11.5 8.5l4 4" /><path d="M8.5 11.5l4 4" /><path d="M5.5 14.5l4 4" /></svg>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mt-0.5">
            My Measurements
          </h3>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-y-5 gap-x-4">
            {Object.entries(measurements).map(([key, value]) => {
              const formattedKey = key.replace(/circumference/i, '').replace(/breadth/i, '').trim()
              return (
                <div key={key} className="flex flex-col bg-gray-50 p-3 rounded-[2px] border border-gray-100 shadow-sm">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1 truncate" title={formattedKey}>{formattedKey}</span>
                  <span className="text-lg font-bold text-gray-900 leading-none">{value} <span className="text-[11px] text-gray-400 font-bold uppercase ml-0.5">cm</span></span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Garment Fit Card ---
const GarmentFitCard = ({
  product,
  recommendation,
  selectedSize,
  onSizeSelect,
  onDetailClick,
}: {
  product: Product
  recommendation: SizeRecommendationResponse | null
  selectedSize: string
  onSizeSelect: (size: string) => void
  onDetailClick?: () => void
}) => {
  const allSizes = recommendation?.all_sizes || []
  const recommended = recommendation?.recommended_size
  const fitType = recommendation?.fit_type
  const selectedSizeInfo = allSizes.find(s => s.size === selectedSize)

  const zoneColorKeys = recommendation?.zone_colors ? Object.keys(recommendation.zone_colors) : []
  const orderedSizes = zoneColorKeys.length > 0
    ? zoneColorKeys.map(key => allSizes.find(s => s.size === key)).filter(Boolean) as typeof allSizes
    : allSizes

  // Fit color helper
  const getFitColor = (fit: string) => {
    if (fit === 'regular' || fit === 'good') return 'text-emerald-600'
    if (fit === 'tight') return 'text-red-500'
    return 'text-blue-500'
  }

  return (
    <div className="bg-white rounded-[1px] shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col justify-center transition-all hover:shadow-md pointer-events-auto">
      <div className="flex gap-3 p-3 items-center">
        <div
          className="w-14 h-[70px] flex-shrink-0 rounded-[2px] overflow-hidden bg-slate-50 cursor-pointer transition-transform hover:scale-105"
          title="Tap for details"
          onClick={onDetailClick}
        >
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x260' }}
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
          {/* Product info */}
          <div className="cursor-pointer group" onClick={onDetailClick} title="Tap for details">
            <p className="text-[7px] text-slate-400 uppercase tracking-widest font-semibold truncate group-hover:text-slate-600">
              {product.description?.split('-')[0]?.trim() || 'Brand'}
            </p>
            <h3 className="text-[9px] font-bold text-slate-900 leading-tight mt-0.5 truncate group-hover:text-blue-600 transition-colors">
              {product.title}
            </h3>
          </div>

          {/* Size tiles */}
          <div className="flex flex-wrap gap-1 overflow-y-auto max-h-[60px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {orderedSizes.length > 0 ? orderedSizes.map(s => {
              if (!s) return null
              const isSelected = s.size === selectedSize
              const isRec = s.size === recommended
              return (
                <button
                  key={s.size}
                  onClick={(e) => { e.stopPropagation(); onSizeSelect(s.size); }}
                  className={`h-6 px-1.5 flex items-center justify-center text-[8px] font-bold uppercase transition-all duration-150 whitespace-nowrap rounded-sm
                      ${isSelected
                      ? 'bg-black text-white shadow-sm scale-105'
                      : isRec
                        ? 'bg-white text-emerald-600 border-2 border-emerald-400 hover:bg-emerald-50'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
                    }`}
                  style={{ fontFamily: 'Figtree, sans-serif' }}
                >
                  {s.size}
                </button>
              )
            }) : (
              <span className="text-[8px] text-slate-400 italic">No sizing data</span>
            )}
          </div>

          {/* Recommendation & fit info */}
          <div className="flex items-center gap-2 flex-wrap">
            {recommended && (
              <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wide text-emerald-700">
                <img src="/icons/fit-check-icon.png" alt="" className="w-3 h-3" />
                Best: {recommended}
              </span>
            )}
            {fitType && (
              <span className="text-[8px] font-medium text-slate-400 uppercase tracking-wide">{fitType} fit</span>
            )}
            {selectedSizeInfo && selectedSizeInfo.size !== recommended && (
              <span className={`text-[8px] font-semibold uppercase ${getFitColor(selectedSizeInfo.fit)}`}>
                {selectedSizeInfo.fit}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- PinchZoomImage ---
const PinchZoomImage = ({ src, alt, fitLines, fitColors, showFit }: { src: string; alt: string; fitLines?: FitLinesData | null, fitColors?: Record<string, string>, showFit: boolean }) => {
  const showOverlay = showFit && fitLines
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef({ scale: 1, tx: 0, ty: 0 })
  const imgRef = useRef<HTMLDivElement>(null)
  const [, forceUpdate] = useState(0)

  const pinchRef = useRef<{ startDist: number; startScale: number; startTx: number; startTy: number; midX: number; midY: number } | null>(null)
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

      const focalX = p.midX - rect.left
      const focalY = p.midY - rect.top

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
      className="w-full h-full overflow-hidden touch-none relative bg-gray-50"
      onTouchStart={(e) => { handleTap(e); handleTouchStart(e) }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div ref={imgRef} className="w-full h-full" style={{ willChange: 'transform', transformOrigin: '0 0' }}>
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover absolute inset-0"
          draggable={false}
        />
        {/* Dark greyscale overlay — sits BETWEEN image and gradient SVG */}
        <div
          className={`absolute inset-0 transition-opacity duration-400 ease-in-out pointer-events-none ${showOverlay ? 'opacity-100' : 'opacity-0'
            }`}
          style={{ background: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'grayscale(1)', zIndex: 5 }}
        />
        {showFit && fitLines && (() => {
          // Helper to build a gradient curved line
          const renderFitCurve = (
            zone: keyof typeof fitLines,
            label: string,
            bendFactor: number = 0.02
          ) => {
            const data = fitLines[zone] as { left: { x: number; y: number }; right: { x: number; y: number } } | undefined
            if (!data) return null

            const explicitColor = fitColors?.[zone as string]
            if (zone === 'waist' && !explicitColor) return null

            const { left, right } = data
            const color = explicitColor || '#cbd5e1'
            const gradientId = `fit-grad-${label}`

            // Quadratic bezier control point — bend downward
            const midX = (left.x + right.x) / 2
            const midY = (left.y + right.y) / 2
            const dx = right.x - left.x
            const dy = right.y - left.y
            const length = Math.sqrt(dx * dx + dy * dy)
            const isHorizontal = Math.abs(dx) > Math.abs(dy)
            const bendAmount = isHorizontal ? length * bendFactor : 0
            const cx = midX
            const cy = midY + bendAmount

            const strokeW = Math.max(2, fitLines.width * 0.006)

            return (
              <g key={label} style={{ opacity: 0.85 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={color} stopOpacity="0" />
                    <stop offset="35%" stopColor={color} stopOpacity="0.85" />
                    <stop offset="50%" stopColor={color} stopOpacity="1" />
                    <stop offset="65%" stopColor={color} stopOpacity="0.85" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={`M ${left.x} ${left.y} Q ${cx} ${cy} ${right.x} ${right.y}`}
                  fill="none"
                  stroke={`url(#${gradientId})`}
                  strokeWidth={strokeW}
                  strokeLinecap="round"
                />
              </g>
            )
          }

          return (
            <svg
              viewBox={`0 0 ${fitLines.width} ${fitLines.height}`}
              preserveAspectRatio="xMidYMid slice"
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            >
              {renderFitCurve('shoulder', 'shoulder', 0.01)}
              {renderFitCurve('chest', 'chest', 0.02)}
              {renderFitCurve('waist', 'waist', 0.02)}
            </svg>
          )
        })()}
      </div>
    </div>
  )
}

// --- Try On Slide ---
const TryOnSlide = ({
  job,
  product,
  recommendations,
  selectedSizes,
  setSelectedSizes,
  setDetailProduct,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  job: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  product: any
  recommendations: Record<string, SizeRecommendationResponse>
  selectedSizes: Record<string, string>
  setSelectedSizes: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setDetailProduct: React.Dispatch<React.SetStateAction<Product | null>>
}) => {
  // Per-slide fit toggle state
  const [showFitToggle, setShowFitToggle] = useState(false)
  const userMeasurements = useKioskStore((state) => state.userMeasurements)
  const [showMeasurementsPopup, setShowMeasurementsPopup] = useState(false)
  const { data: fitLines, error: fitError } = useFitLines(job.imageUrl)

  const fitColors = useMemo(() => {
    const colors: Record<string, string> = {}
    if (!product) return colors

    const gids = [product.id]
    if (product.pairedProduct) gids.push(product.pairedProduct.id)

    gids.forEach(gid => {
      const rec = recommendations[gid]
      const size = selectedSizes[gid]
      if (rec?.zone_colors?.[size]) {
        Object.entries(rec.zone_colors[size]).forEach(([key, color]) => {
          const stickKey = toCanonicalKey(key)
          if (stickKey && color && !colors[stickKey]) {
            colors[stickKey] = color
          }
        })
      }
    })
    return colors
  }, [product, recommendations, selectedSizes])

  const productsToDisplay: { data: Product; id: string; label?: string }[] = []
  if (product) {
    productsToDisplay.push({ data: product, id: product.id, label: undefined })
    if (product.pairedProduct) {
      productsToDisplay[0].label = 'Upper'
      productsToDisplay.push({ data: product.pairedProduct, id: product.pairedProduct.id, label: 'Lower' })
    }
  }

  // Check if recommendations are loaded for this product
  const hasRecommendations = product && recommendations[product.id]?.zone_colors
  const isFitReady = fitLines && hasRecommendations && !fitError
  const isAnalyzing = showFitToggle && (!fitLines || !hasRecommendations) && !fitError

  return (
    <>
      <div className="relative w-full max-w-[85vw] sm:max-w-[450px] aspect-[3/4] rounded-[1px] overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0 pointer-events-auto">
        {job.imageUrl ? (
          <PinchZoomImage src={job.imageUrl} alt={job.productName} fitLines={fitLines} fitColors={fitColors} showFit={showFitToggle && !!isFitReady} />
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
          <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-black">
            <LoadingPulse className="mb-8" />
            <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden relative">
              <div
                className="absolute inset-y-0 left-0 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] w-1/3 rounded-full animate-[progress_1.5s_ease-in-out_infinite]"
              />
            </div>
            <p className="text-white/70 text-sm mt-6 font-medium tracking-wide">Generating fit...</p>
            <style>{`
              @keyframes progress {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(300%); }
              }
            `}</style>
          </div>
        )}

        {/* Fit error indicator */}
        {job.imageUrl && showFitToggle && fitError && (
          <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none z-30">
            <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full">
              <p className="text-white text-[10px] uppercase font-bold tracking-wider">Fit Visualization Unavailable</p>
            </div>
          </div>
        )}

        {/* Analyzing overlay — only shown on THIS card when fit check clicked */}
        {job.imageUrl && isAnalyzing && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full">
              <p className="text-white text-xs uppercase font-bold tracking-wider animate-pulse">Analyzing fit...</p>
            </div>
          </div>
        )}

        {job.imageUrl && (
          <>
            {userMeasurements && Object.keys(userMeasurements).length > 0 && (
              <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
                <button
                  onClick={() => setShowMeasurementsPopup(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-[4px] shadow-lg transition-all active:scale-95 border min-w-[130px] bg-white text-black border-gray-300 hover:bg-gray-50"
                  title="View Measurements"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.3 15.3l-14-14a2 2 0 00-2.8 0l-2.8 2.8a2 2 0 000 2.8l14 14a2 2 0 002.8 0l2.8-2.8a2 2 0 000-2.8z" />
                    <path d="M14.5 5.5l4 4" />
                    <path d="M11.5 8.5l4 4" />
                    <path d="M8.5 11.5l4 4" />
                    <path d="M5.5 14.5l4 4" />
                  </svg>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                    Measures
                  </span>
                </button>
              </div>
            )}
            <div className="absolute bottom-4 right-4 z-20 pointer-events-auto">
              <button
                onClick={() => setShowFitToggle(prev => !prev)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-[4px] shadow-lg transition-all active:scale-95 border min-w-[130px] ${showFitToggle
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <img
                  src="/icons/fit-check-icon.png"
                  alt=""
                  className="w-4 h-4"
                  style={{ filter: showFitToggle ? 'invert(1)' : 'none' }}
                />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  {showFitToggle ? 'Hide Fit' : 'See My Fit'}
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      <div className={`w-full max-w-[95vw] sm:max-w-[500px] flex flex-row gap-3 pt-[15px] pb-2 flex-shrink-0 ${productsToDisplay.length === 1 ? 'justify-center' : ''}`} style={{ minHeight: '170px' }}>
        {productsToDisplay.map(item => (
          <div key={item.id} className={`${productsToDisplay.length === 1 ? 'w-full max-w-[320px]' : 'flex-1'} min-w-0 pointer-events-auto`}>
            <GarmentFitCard
              product={item.data}
              recommendation={recommendations[item.id] || null}
              selectedSize={selectedSizes[item.id] || 'M'}
              onSizeSelect={(size) => {
                setSelectedSizes(prev => ({ ...prev, [item.id]: size }))
              }}
              onDetailClick={() => setDetailProduct(item.data)}
            />
          </div>
        ))}
      </div>

      {showMeasurementsPopup && userMeasurements && (
        <UserMeasurementsPopup
          measurements={userMeasurements}
          onClose={() => setShowMeasurementsPopup(false)}
        />
      )}
    </>
  )
}

// --- Try On Results Screen ---
const TryOnResultsScreen = () => {
  useAutoNavigate()
  const navigate = useNavigate()
  const selectedProducts = useKioskStore((state) => state.selectedProducts)
  const vtonJobs = useKioskStore((state) => state.vtonJobs)

  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const storedRecommendations = useKioskStore((state) => state.sizeRecommendations)
  const [recommendations, setRecommendations] = useState<Record<string, SizeRecommendationResponse>>({})
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({})
  // showFitToggle moved to per-slide (TryOnSlide) state

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

  const error = useMemo(() => {
    if (!isLoading && jobs.length > 0 && jobs.every(j => j.status === 'FAILED' || j.error)) {
      return jobs.find(j => j.error)?.error || 'All try-ons failed'
    }
    return null
  }, [jobs, isLoading])

  useEffect(() => {
    const session = unifiedKioskApi.getSession()
    if (!session && !useKioskStore.getState().sessionId) {
      if (!import.meta.env.DEV) {
        navigate('/')
        return
      }
    }
    if (selectedProducts.length === 0) {
      navigate('/products')
    }
  }, [navigate, selectedProducts])

  useEffect(() => {
    const fetchRecs = async () => {
      const garmentIds = new Set<string>()
      selectedProducts.forEach(p => {
        garmentIds.add(p.id.toString())
        if (p.pairedProduct) garmentIds.add(p.pairedProduct.id.toString())
      })

      const promises = Array.from(garmentIds).map(async (idStr) => {
        const id = parseInt(idStr)
        const stored = storedRecommendations[id]
        if (stored && stored.measurement_status !== 'processing') {
          setRecommendations(prev => ({ ...prev, [id]: stored }))
          if (stored.recommended_size) {
            setSelectedSizes(prev => ({ ...prev, [id]: stored.recommended_size }))
          } else if (stored.all_sizes?.[0]) {
            setSelectedSizes(prev => ({ ...prev, [id]: stored.all_sizes[0].size }))
          }
        } else {
          try {
            const rec = await unifiedKioskApi.getSizeRecommendation(id)
            setRecommendations(prev => ({ ...prev, [id]: rec }))
            if (rec.recommended_size) {
              setSelectedSizes(prev => ({ ...prev, [id]: rec.recommended_size }))
            } else if (rec.all_sizes?.[0]) {
              setSelectedSizes(prev => ({ ...prev, [id]: rec.all_sizes[0].size }))
            }
          } catch (err) {
            console.error("Failed to load rec for", id, err)
          }
        }
      })
      await Promise.all(promises)
    }

    if (selectedProducts.length > 0) {
      fetchRecs()
    }
  }, [selectedProducts, storedRecommendations])

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

        {/* Header - back button only */}
        <div className="absolute top-0 left-0 z-20 px-6 py-6 pointer-events-none">
          <button
            onClick={() => navigate('/products')}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-black text-black shadow-sm hover:bg-neutral-50 transition-all pointer-events-auto"
            aria-label="Back to Products"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
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
            className="w-full !h-full"
          >
            {jobs.map((job) => {
              const product = selectedProducts.find(p => String(p.id) === job.garment_id)
              return (
                <SwiperSlide key={job.garment_id} className="!flex !flex-col !h-full !w-full items-center justify-start p-4 pt-[10vh] pb-[10px] box-border relative">
                  <TryOnSlide
                    job={job}
                    product={product}
                    recommendations={recommendations}
                    selectedSizes={selectedSizes}
                    setSelectedSizes={setSelectedSizes}
                    setDetailProduct={setDetailProduct}
                  />
                </SwiperSlide>
              )
            })}
          </Swiper>
        </div>

        {/* Unified Bottom Footer: Indicators & End Session */}
        <div className="w-full flex flex-col items-center justify-end pb-8 pt-2 gap-4 flex-shrink-0 z-30 pointer-events-auto relative">

          {/* Carousel Indicators */}
          {jobs.length > 1 && (
            <div className="flex justify-center gap-3 w-full -translate-y-3">
              {jobs.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => swiperRef?.slideTo(idx)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === activeIndex ? 'bg-black scale-110 opacity-100' : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {/* End Session Button */}
          <button
            onClick={async () => {
              try { await unifiedKioskApi.completeSession() } catch (e) { console.error(e) }
              useKioskStore.getState().resetSession()
              window.location.replace('/')
            }}
            className="text-[13px] font-bold text-slate-400 hover:text-black tracking-widest uppercase transition-all underline underline-offset-4 decoration-slate-300 hover:decoration-black"
          >
            End Session
          </button>
        </div>

      </MotionFade >

      {detailProduct && (
        <ProductDetailPopup
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
        />
      )}

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
