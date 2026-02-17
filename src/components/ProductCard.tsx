import { useState, memo, useRef } from 'react'
import type { ProductListItem } from '../utils/productApi'
import { formatPrice } from '../utils/validators'

type ProductCardProps = {
  product: ProductListItem
  onClick: () => void
  onTryOn: (e: React.MouseEvent) => void
  onPair?: (e: React.MouseEvent) => void
  onDetails?: (e: React.MouseEvent) => void
  isSelected?: boolean
}

const ProductCard = memo(({ product, onClick, onTryOn, onPair, isSelected = false }: ProductCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const startPos = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)

  const handlePointerDown = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    startPos.current = { x: clientX, y: clientY }
    isDragging.current = false
  }

  /* Increase drag threshold slightly */
  const DRAG_THRESHOLD = 15

  const handlePointerMove = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (isDragging.current) return
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    const dx = Math.abs(clientX - startPos.current.x)
    const dy = Math.abs(clientY - startPos.current.y)
    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
      isDragging.current = true
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging.current) {
      e.stopPropagation()
      e.preventDefault()
      return
    }
    onClick()
  }

  const handleButtonAction = (e: React.MouseEvent, action?: (e: React.MouseEvent) => void) => {
    if (isDragging.current) {
      e.stopPropagation()
      e.preventDefault()
      return
    }
    // "Make click more effortful" - ensure it's not a micro-drag that didn't trip threshold
    // We can also add a small delay check if needed, but drag check is usually sufficient.
    action?.(e)
  }



  return (
    <div
      className={`product-card-height flex flex-col h-full w-full overflow-hidden bg-white text-slate-900 rounded-none transition-all duration-200 ${isSelected
        ? 'border border-slate-800 ring-1 ring-slate-800'
        : ''
        }`}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
    >
      {/* Image Container */}
      <div className="relative w-full h-[280px] sm:h-[320px] md:h-[360px] bg-slate-100 flex-shrink-0">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          </div>
        )}
        <img
          src={imageError ? 'https://via.placeholder.com/400x600?text=No+Image' : product.imageUrl}
          alt={product.name}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true)
            setImageLoaded(true)
          }}
          loading="lazy"
          onClick={handleClick}
        />
      </div>

      {/* Content Container */}
      <div className="flex flex-col flex-1 p-0 min-h-0 bg-white">

        {/* Text Section */}
        <div className="px-2 pt-2 mb-2 w-full">
          {/* Brand */}
          <div className="text-gray-500 text-xs font-figtree mb-0.5 text-left">
            {product.brand?.name || 'TNF'}
          </div>

          {/* Name and Price */}
          <div className="flex justify-between items-start gap-2 w-full">
            <h3
              onClick={handleClick}
              className="text-xs sm:text-sm font-bold text-slate-900 uppercase leading-snug truncate flex-1 cursor-pointer text-left"
              title={product.name}
            >
              {product.name}
            </h3>
            <div className="text-sm sm:text-base font-bold text-slate-900 whitespace-nowrap">
              {formatPrice(product.mrp)}
            </div>
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex justify-between items-end w-full mt-2">
          <button
            onClick={(e) => handleButtonAction(e, onTryOn)}
            className={`text-white text-[10px] sm:text-xs font-medium py-2 px-4 rounded-[1px] transition-colors ${isSelected
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-black hover:bg-slate-800'
              }`}
          >
            {isSelected ? 'Selected' : 'Try On'}
          </button>

          {onPair && (
            <button
              onClick={(e) => handleButtonAction(e, onPair)}
              className="bg-white text-[#5D5D5D] border border-[#5D5D5D] text-[10px] sm:text-xs font-medium py-2 px-4 rounded-[1px] hover:bg-slate-50 transition-colors"
            >
              + Pair it
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

export default ProductCard
