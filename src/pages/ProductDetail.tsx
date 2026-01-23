import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import Button from '../components/UI/Button'
import MotionFade from '../components/UI/MotionFade'
import LoadingPulse from '../components/UI/LoadingPulse'
import useAutoNavigate from '../hooks/useAutoNavigate'
import { formatPrice } from '../utils/validators'
import type { ProductDetails } from '../utils/productApi'
import { unifiedKioskApi } from '../utils/unifiedKioskApi'
import { useKioskStore } from '../store/kioskStore'

const ProductDetail = () => {
  useAutoNavigate()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const addSelectedProduct = useKioskStore((state) => state.addSelectedProduct)

  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const handleTryOn = () => {
    if (product) {
      // Add to selected products list
      addSelectedProduct({
        id: product.productId.toString(),
        title: product.name,
        image: product.images?.[0]?.url || '',
        price: product.mrp,
        description: product.brand?.name || '',
        sizes: product.sizes || []
      })
      // Return to product list (will restore scroll position)
      navigate(-1)
    }
  }

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
        const productData = await unifiedKioskApi.getProductDetails(productId)
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



  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <LoadingPulse className="text-slate-900" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="fixed inset-0 bg-white z-50 overflow-y-auto p-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 mb-8"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-lg font-medium text-slate-900 mb-4">{error || 'Product not found'}</p>
          <Button onClick={() => navigate('/products')}>Back to Products</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-white text-slate-900 z-50 overflow-y-auto">
      <MotionFade className="min-h-screen pb-24">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            {product.brand?.name || 'Details'}
          </span>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Image Section */}
          <div className="w-full bg-slate-50 relative aspect-[3/4] sm:aspect-[4/3] md:aspect-[16/9] overflow-hidden">
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
                    <div className="w-full h-full flex items-center justify-center bg-white">
                      <img
                        src={img.url}
                        alt={product.name}
                        className="h-full w-full object-contain mix-blend-multiply"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x800' }}
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white">
                <img
                  src={'https://via.placeholder.com/600x800'}
                  alt="Placeholder"
                  className="h-full w-full object-contain mix-blend-multiply"
                />
              </div>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-medium z-10">
              {currentImageIndex + 1} / {product.images?.length || 1}
            </div>
          </div>

          <div className="px-6 py-6 flex flex-col gap-6">
            {/* Title & Price */}
            <div className="flex flex-col gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                {product.name}
              </h1>

              <div className="flex flex-col items-start">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  {formatPrice(product.mrp)}
                </span>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">MRP (Incl. taxes)</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                {product.ratings > 0 && (
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
                    <span className="text-yellow-500 flex items-center">★</span>
                    <span className="font-semibold text-slate-900">{product.ratings.toFixed(1)}</span>
                  </div>
                )}
                {product.baseColour && (
                  <div className="flex items-center gap-1 text-slate-500">
                    <span className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: product.baseColour.toLowerCase() }}></span>
                    <span>{product.baseColour}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-sm font-semibold uppercase text-slate-500 tracking-wide">Available Sizes</span>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(size => (
                    <span key={size} className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-sm font-medium border border-slate-200">
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <hr className="border-slate-100" />

            {/* Attributes */}
            {product.attributes && Object.keys(product.attributes).length > 0 && (
              <div className="flex flex-col gap-4">
                <span className="text-sm font-semibold uppercase text-slate-500 tracking-wide">Details</span>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                  {Object.entries(product.attributes).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-400 uppercase">{key}</span>
                      <span className="text-sm font-medium text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400 mt-4 leading-relaxed bg-slate-50 p-3 rounded-lg">
              * Colors may vary slightly depending on lighting. Check tax and shipping details at checkout.
            </p>
          </div>
        </div>

        {/* Floating Action Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-200 z-20">
          <div className="max-w-4xl mx-auto w-full">
            <Button
              onClick={handleTryOn}
              className="w-full !bg-slate-900 hover:!bg-black !text-white !py-4 !rounded-xl !text-lg !font-bold shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
              </svg>
              Add to Try On List
            </Button>
          </div>
        </div>
      </MotionFade>
    </div>
  )
}

export default ProductDetail
