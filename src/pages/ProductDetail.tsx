import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import Button from '../components/UI/Button'
import MotionFade from '../components/UI/MotionFade'
import LoadingPulse from '../components/UI/LoadingPulse'
import useAutoNavigate from '../hooks/useAutoNavigate'
import { formatPrice } from '../utils/validators'
import { productApi, type ProductDetails } from '../utils/productApi'

const ProductDetail = () => {
  useAutoNavigate()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) {
        setError('Invalid product ID')
        return
      }

      const productId = parseInt(id, 10)
      if (isNaN(productId)) {
        setError('Invalid product ID')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const productData = await productApi.getProductDetails(productId)
        setProduct(productData)
      } catch (err) {
        console.error('Failed to load product:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to load product. Please try again.'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [id])

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    const stars = []

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={i} className="text-yellow-400 text-lg">
          ★
        </span>,
      )
    }
    if (hasHalfStar) {
      stars.push(
        <span key="half" className="text-yellow-400 text-lg">
          ☆
        </span>,
      )
    }
    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <span key={`empty-${i}`} className="text-gray-300 text-lg">
          ★
        </span>,
      )
    }
    return stars
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-100 text-slate-900 overflow-y-auto z-10">
        <div className="flex items-center justify-center min-h-screen">
          <LoadingPulse className="text-slate-700 max-w-[200px]" />
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="fixed inset-0 bg-gray-100 text-slate-900 overflow-y-auto z-10">
        <div className="p-[4%]">
          <button
            onClick={() => navigate(-1)}
            className="text-2xl font-light mb-[4%]"
          >
            ‹
          </button>
          <div className="text-center py-[10%]">
            <p className="text-lg font-semibold text-slate-700 mb-[2%]">
              {error || 'Product not found'}
            </p>
            <Button
              className="!bg-slate-800 !text-white hover:!bg-slate-900"
              onClick={() => navigate('/products')}
            >
              Back to Products
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-100 text-slate-900 overflow-y-auto z-10">
      <MotionFade className="flex flex-col min-h-screen w-full relative">
        <div className="p-[4%] flex flex-col gap-[4%]">
          {/* Header */}
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full text-slate-900 hover:bg-slate-200 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>   {/* Image Carousel */}
          <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-white">
            {product.images && product.images.length > 0 ? (
              <Swiper
                modules={[Navigation, Pagination]}
                navigation
                pagination={{ clickable: true }}
                onSlideChange={(swiper) => setCurrentImageIndex(swiper.activeIndex)}
                className="h-full w-full"
              >
                {product.images.map((img, idx) => (
                  <SwiperSlide key={idx}>
                    <img
                      src={img.url}
                      alt={`${product.name} - Image ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        ; (e.target as HTMLImageElement).src =
                          'https://via.placeholder.com/400x600?text=No+Image'
                      }}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <img
                src={product.images && product.images.length > 0 ? product.images[0].url : 'https://via.placeholder.com/400x600?text=No+Image'}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  ; (e.target as HTMLImageElement).src =
                    'https://via.placeholder.com/400x600?text=No+Image'
                }}
              />
            )}
            <div className="absolute bottom-[3%] right-[3%] bg-white rounded-xl px-[3%] py-[2%] shadow-lg">
              <p className="text-xs font-medium text-slate-900">
                {currentImageIndex + 1} / {product.images?.length || 1}
              </p>
            </div>
          </div>

          {/* Title Box */}
          <div className="flex flex-col gap-[2%]">
            <h1 className="text-clamp-body font-medium text-slate-700">
              {product.name}
            </h1>
            <div className="flex items-center gap-[2%] flex-wrap">
              {product.brand && (
                <span className="text-sm font-medium text-slate-600">
                  {product.brand.name}
                </span>
              )}
              {product.baseColour && (
                <span className="px-[2%] py-[1%] rounded-lg text-xs font-medium text-slate-600 border border-slate-300 bg-white">
                  {product.baseColour}
                </span>
              )}
              {product.ratings > 0 && (
                <div className="flex items-center gap-1">
                  {renderStars(product.ratings)}
                  <span className="text-sm text-slate-500 ml-1">
                    {product.ratings.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-[3%] flex-wrap">
              <span className="text-clamp-title font-bold text-slate-900">
                {formatPrice(product.mrp)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-[1%]">
              Check tax and shipping details on the seller&apos;s website.
            </p>
          </div>

          {/* Available Sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="flex flex-col gap-[2%]">
              <h2 className="text-base font-semibold text-slate-900">Available Sizes</h2>
              <div className="flex flex-wrap gap-[2%]">
                {product.sizes.map((size) => (
                  <span
                    key={size}
                    className="px-[5%] py-[2.5%] rounded-lg text-sm font-medium bg-slate-100 text-slate-700"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Attributes Section */}
          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <div className="flex flex-col gap-[2%] pt-[3%]">
              <h2 className="text-base font-bold text-slate-900 uppercase mb-[2%]">
                Product Attributes
              </h2>
              <div className="grid grid-cols-2 gap-[2%]">
                {Object.entries(product.attributes).map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <span className="text-xs uppercase text-slate-500 mb-[1%]">
                      {key}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {value || 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </MotionFade >
    </div >
  )
}

export default ProductDetail
