import { useState } from 'react'
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

const ProductCard = ({ product, onClick, onTryOn, onPair, onDetails: _onDetails, isSelected = false }: ProductCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    const stars = []

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={i} className="text-yellow-400 text-xs">
          ★
        </span>,
      )
    }
    if (hasHalfStar) {
      stars.push(
        <span key="half" className="text-yellow-400 text-xs">
          ☆
        </span>,
      )
    }
    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <span key={`empty-${i}`} className="text-gray-300 text-xs">
          ★
        </span>,
      )
    }
    return stars
  }

  return (
    <div
      className={`product-card-height flex flex-col h-full w-full overflow-hidden bg-white text-slate-900 rounded-3xl border transition-all duration-200 ${isSelected
        ? 'border-slate-800 ring-1 ring-slate-800'
        : 'border-slate-200 shadow-sm'
        }`}
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
          onClick={onClick}
        />
      </div>

      {/* Content Container */}
      <div className="flex flex-col flex-1 p-3 sm:p-4 min-h-0 bg-white">
        {/* Brand */}
        <div className="text-[10px] sm:text-xs text-slate-400 uppercase font-medium tracking-wide mb-1 truncate">
          {product.brand.name}
        </div>

        {/* Product Name */}
        <h3
          onClick={onClick}
          className="text-xs sm:text-sm font-bold text-slate-900 uppercase leading-snug mb-1 line-clamp-2 cursor-pointer"
        >
          {product.name}
        </h3>

        {/* Ratings */}
        {product.ratings > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex">{renderStars(product.ratings)}</div>
            <span className="text-[10px] text-slate-300">
              (200 ratings)
            </span>
          </div>
        )}

        {/* Price */}
        <div className="text-sm sm:text-base font-bold text-slate-900 mb-3">
          {formatPrice(product.mrp)}
        </div>

        {/* Spacer to push buttons to bottom */}
        <div className="flex-1" />

        {/* Buttons Row */}
        <div className={`grid ${onPair ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mt-auto`}>
          {onPair && (
            <button
              onClick={onPair}
              className="w-full bg-black text-white text-[10px] sm:text-xs font-medium py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Pair it
            </button>
          )}
          <button
            onClick={onTryOn}
            className={`w-full text-white text-[10px] sm:text-xs font-medium py-2.5 rounded-lg transition-colors ${isSelected
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-black hover:bg-slate-800'
              }`}
          >
            {isSelected ? 'Selected' : 'Try On'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductCard
