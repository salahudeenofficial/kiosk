import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'

import Button from '../components/UI/Button'
import MotionFade from '../components/UI/MotionFade'
import LoadingPulse from '../components/UI/LoadingPulse'
import useAutoNavigate from '../hooks/useAutoNavigate'
import { formatPrice } from '../utils/validators'
import { unifiedKioskApi } from '../utils/unifiedKioskApi'
import { useKioskStore } from '../store/kioskStore'
import PairingModal, { isEligibleForPairing } from '../components/PairingModal'
import type { ProductListItem, ProductDetails } from '../utils/productApi'
import type { VtonJob } from '../utils/kioskApi'

const ProductDetail = () => {
  useAutoNavigate()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const addSelectedProduct = useKioskStore((state) => state.addSelectedProduct)

  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Pairing State
  const [pairingModalOpen, setPairingModalOpen] = useState(false)
  const [availableProducts, setAvailableProducts] = useState<ProductListItem[]>([])
  const updateVtonJob = useKioskStore((state) => state.updateVtonJob)

  const handleTryOn = () => {
    if (product) {
      addSelectedProduct({
        id: product.productId.toString(),
        title: product.name,
        image: product.images?.[0]?.url || '',
        price: product.mrp,
        description: product.brand?.name || '',
        sizes: product.sizes || []
      })
      navigate(-1)
    }
  }

  const toProductListItem = (p: ProductDetails): ProductListItem => ({
    productId: p.productId,
    name: p.name,
    mrp: p.mrp,
    baseColour: p.baseColour,
    ratings: p.ratings,
    imageCount: p.imageCount,
    imageUrl: p.images?.[0]?.url || '',
    brand: p.brand || { id: 0, name: '' },
    category: p.category || { id: 0, name: '', gender: '' }
  })

  const loadPairingCandidates = async () => {
    if (availableProducts.length > 0) return
    try {
      // Load a batch of products for pairing
      const response = await unifiedKioskApi.loadCatalog({ limit: 50 })
      // Convert to simplified items
      const items = response.products.map(p => ({
        productId: p.productId,
        name: p.name,
        mrp: p.mrp,
        baseColour: 'Black',
        ratings: 4.5,
        imageCount: 1,
        imageUrl: p.imageUrl,
        brand: p.brand,
        category: p.category
      } as ProductListItem))
      setAvailableProducts(items)
    } catch (e) {
      console.error("Failed to load pairing candidates", e)
    }
  }

  const handlePairClick = async () => {
    await loadPairingCandidates()
    setPairingModalOpen(true)
  }

  const handleGeneratePair = async (p1: ProductListItem, p2: ProductListItem) => {
    // Add both to store
    const item1 = {
      id: p1.productId.toString(),
      title: p1.name,
      price: p1.mrp,
      image: p1.imageUrl,
      description: p1.brand.name,
      sizes: ['M'],
      pairedProduct: {
        id: p2.productId.toString(),
        title: p2.name,
        price: p2.mrp,
        image: p2.imageUrl,
        description: p2.brand.name,
        sizes: ['M']
      }
    }
    addSelectedProduct(item1)
    setPairingModalOpen(false)

    // Trigger VTON (optimistic + api call)
    const productIds = [p1.productId, p2.productId]
    productIds.forEach(id => updateVtonJob(id.toString(), 'RUNNING', null))

    try {
      const response = await unifiedKioskApi.requestVton(productIds, true)
      response.jobs.forEach((j) => {
        const job = j as VtonJob
        if (job.garment_ids) {
          (job.garment_ids as number[]).forEach((gid: number) => {
            updateVtonJob(gid.toString(), job.status, null, undefined, job.job_id)
          })
        }
      })
    } catch (err) {
      console.error(err)
    }
    navigate('/products') // Go back to list to see result
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
        console.log('[ProductDetail] Loaded product details:', productData)
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
            Product Details
          </span>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Image Section */}
          <div className="w-full bg-slate-50 relative aspect-[3/4] sm:aspect-[4/3] md:aspect-[16/9] overflow-hidden">
            {product.images && product.images.length > 0 ? (
              <Swiper
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

          {/* Custom Pagination */}
          {product.images && product.images.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {product.images.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${currentImageIndex === idx ? 'bg-slate-600 scale-110' : 'bg-slate-300'
                    }`}
                />
              ))}
            </div>
          )}

          <div className="px-5 py-5 flex flex-col gap-4">
            {/* Header Info: Brand, Name, Price */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {product.brand?.name}
              </span>
              <h1 className="text-xl sm:text-2xl font-medium text-slate-900 leading-tight">
                {product.name}
              </h1>
              <span className="text-xl sm:text-2xl font-medium text-slate-900 tracking-tight">
                {formatPrice(product.mrp)}
              </span>
            </div>

            {/* Sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">Available Sizes</span>
                  {/* Placeholder for size recommendation badge if needed */}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(size => (
                    <button
                      key={size}
                      style={{ fontFamily: 'Figtree, sans-serif' }}
                      className="w-12 h-12 flex items-center justify-center border border-black rounded-none text-sm font-medium text-slate-900 hover:bg-slate-50 transition-colors uppercase"
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rating and Color Info (Keeping these but maybe less prominent or integrated? User didn't ask to remove, but image didn't show them. I'll keep them below sizes for now or remove if it clutters. The image only showed brand, name, price, sizes. I will preserve them but maybe move them down or keep them subtle.) */}
            {/* Actually, I'll put them in the accordion or just below the sizes if they fit well. Let's hide them in the details toggle for cleaner look if they aren't critical. The user said "hide the other details using prodcut details toggle". */}

            {/* Product Details Accordion */}
            <details className="group border-t border-b border-slate-100">
              <summary className="flex items-center justify-between py-4 cursor-pointer list-none bg-slate-50 px-4 -mx-4">
                <span className="font-semibold text-slate-900">Product Details</span>
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                </span>
              </summary>
              <div className="text-slate-600 transition-all duration-300 ease-in-out pb-4 pt-2">

                {/* Rating & Color moved here */}
                <div className="flex flex-col gap-3 mb-4">
                  {product.ratings > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">Rating:</span>
                      <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md">
                        <span className="text-yellow-500 text-xs">★</span>
                        <span className="text-sm font-semibold text-slate-900">{product.ratings.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                  {product.baseColour && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">Color:</span>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: product.baseColour.toLowerCase() }}></span>
                        <span className="text-sm text-slate-900">{product.baseColour}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Attributes */}
                {product.attributes && Object.keys(product.attributes).length > 0 && (
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-4">
                    {Object.entries(product.attributes).map(([key, value]) => (
                      <div key={key} className="flex flex-col">
                        <span className="text-xs text-slate-400 uppercase tracking-wide">{key}</span>
                        <span className="text-sm text-slate-900">{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Size Chart Table */}
                {product.sizeChart && product.sizeChart.available && (
                  <div className="mt-4">
                    <span className="text-sm font-semibold text-slate-900 block mb-2">Size Chart ({product.sizeChart.unit})</span>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-sm text-left text-slate-700">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                          <tr>
                            <th className="px-3 py-2 border-b border-slate-200">Size</th>
                            {product.sizeChart.measurements.map(m => (
                              <th key={m} className="px-3 py-2 border-b border-slate-200">{m}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {product.sizeChart.sizes.map(size => (
                            <tr key={size} className="border-b border-slate-100 last:border-0">
                              <td className="px-3 py-2 font-medium text-slate-900">{size}</td>
                              {product.sizeChart?.measurements.map(m => (
                                <td key={m} className="px-3 py-2">
                                  {product.sizeChart?.chart[size]?.[m] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-400 mt-4">
                  * Colors may vary slightly depending on lighting. Check tax and shipping details at checkout.
                </p>
              </div>
            </details>
          </div>
        </div>

        {/* Floating Action Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-200 z-20">
          <div className="max-w-4xl mx-auto w-full flex gap-3">
            <Button
              onClick={handleTryOn}
              className="flex-1 !bg-black hover:!bg-slate-900 !text-white !py-4 !rounded-none !text-lg !font-medium flex items-center justify-center gap-2"
            >
              Try On
            </Button>

            {product && product.category && isEligibleForPairing(product.category.name) && (
              <Button
                onClick={handlePairClick}
                className="flex-1 !bg-white hover:!bg-slate-50 !text-black !py-4 !rounded-none !text-lg !font-medium !border !border-black flex items-center justify-center gap-2"
              >
                Pair it
              </Button>
            )}
          </div>
        </div>
      </MotionFade>

      {product && (
        <PairingModal
          isOpen={pairingModalOpen}
          onClose={() => setPairingModalOpen(false)}
          product={toProductListItem(product)}
          availableProducts={availableProducts}
          onGenerate={handleGeneratePair}
        />
      )}
    </div>
  )
}

export default ProductDetail
