import { useState } from 'react'
import type { ProductListItem } from '../utils/productApi'
import { formatPrice } from '../utils/validators'

type ProductCardProps = {
  product: ProductListItem
  onClick: () => void
  onTryOn: (e: React.MouseEvent) => void
  onDetails: (e: React.MouseEvent) => void
  isSelected?: boolean
}

const ProductCard = ({ product, onClick, onTryOn, onDetails: _onDetails, isSelected = false }: ProductCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    const stars = []

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={i} className="text-yellow-400 text-sm">
          ★
        </span>,
      )
    }
    if (hasHalfStar) {
      stars.push(
        <span key="half" className="text-yellow-400 text-sm">
          ☆
        </span>,
      )
    }
    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <span key={`empty-${i}`} className="text-gray-300 text-sm">
          ★
        </span>,
      )
    }
    return stars
  }

  return (
    <div
      className={`product-card-height flex flex-col h-full w-full overflow-hidden bg-white text-slate-900 rounded-3xl border-2 shadow-lg shadow-black/5 transition-all duration-200 ${isSelected
        ? 'border-slate-800 ring-2 ring-slate-800 ring-offset-2'
        : 'border-slate-200'
        }`}
    >
      {/* Image Container - Responsive fixed height */}
      <div className="relative w-full h-[280px] sm:h-[320px] md:h-[360px] bg-slate-100 flex-shrink-0">
        {/* Loading placeholder */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          </div>
        )}
        {/* Image */}
        <img
          src={imageError ? 'https://via.placeholder.com/400x600?text=No+Image' : product.imageUrl}
          alt={product.name}
          className={`absolute inset-0 w-full h-full object-cover rounded-t-3xl transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true)
            setImageLoaded(true)
          }}
          loading="lazy"
        />
      </div>

      {/* Content Container */}
      <div className="flex flex-col flex-1 p-3 sm:p-4 flex-shrink-0 min-h-0">
        {/* Product Name Section - Reduced size */}
        <div className="flex items-start justify-between gap-2 mb-1 flex-shrink-0">
          <h3
            onClick={onClick}
            className="text-sm font-semibold text-slate-900 leading-tight flex-1 line-clamp-2 overflow-hidden cursor-pointer hover:underline"
          >
            {product.name}
          </h3>
        </div>

        {/* Brand/Rating Section */}
        <div className="flex items-center gap-2 mb-0.5 flex-shrink-0">
          <span className="text-[10px] sm:text-xs font-medium text-slate-500 truncate">
            {product.brand.name}
          </span>
          {product.ratings > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {renderStars(product.ratings)}
              <span className="text-[10px] sm:text-xs text-slate-400 ml-1">
                {product.ratings.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-0" />

        {/* Price & Action Section - Combined Row */}
        <div className="flex items-center justify-between gap-3 mt-1 flex-shrink-0">
          <span className="text-base sm:text-lg font-bold text-slate-900">
            {formatPrice(product.mrp)}
          </span>

          <button
            className={`flex-1 border-0 px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors max-w-[120px] ${isSelected
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-slate-900 text-white hover:bg-black'
              }`}
            onClick={onTryOn}
          >
            {isSelected ? 'Selected' : 'Try On'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductCard
