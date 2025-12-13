import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import LoadingPulse from '../components/UI/LoadingPulse'
import Button from '../components/UI/Button'
import ProductCard from '../components/ProductCard'
import SearchBar from '../components/SearchBar'
import SortDropdown, { type SortOption } from '../components/SortDropdown'
import FiltersDrawer, { type Filters } from '../components/FiltersDrawer'
import useAutoNavigate from '../hooks/useAutoNavigate'
import { useKioskStore } from '../store/kioskStore'
import { productApi, type ProductListItem } from '../utils/productApi'

// Skeleton Card Component - Responsive fixed height matching ProductCard
const SkeletonCard = () => (
  <div
    className="product-card-height flex flex-col overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-lg animate-pulse h-full"
  >
    <div className="w-full h-[280px] sm:h-[320px] md:h-[360px] bg-slate-200 flex-shrink-0" />
    <div className="flex flex-col flex-1 p-3 sm:p-4 flex-shrink-0">
      <div className="h-[56px] sm:h-[64px] md:h-[70px] mb-2 bg-slate-200 rounded flex-shrink-0" />
      <div className="h-[20px] sm:h-[22px] md:h-[24px] mb-2 bg-slate-200 rounded w-2/3 flex-shrink-0" />
      <div className="flex-1 min-h-0" />
      <div className="h-[24px] sm:h-[28px] md:h-[30px] mb-2 sm:mb-3 bg-slate-200 rounded w-1/3 flex-shrink-0" />
      <div className="h-[44px] sm:h-[46px] md:h-[48px] bg-slate-200 rounded flex-shrink-0" />
    </div>
  </div>
)

const ProductList = () => {
  useAutoNavigate()
  const navigate = useNavigate()
  const selectedProducts = useKioskStore((state) => state.selectedProducts)
  const addSelectedProduct = useKioskStore((state) => state.addSelectedProduct)
  const removeSelectedProduct = useKioskStore((state) => state.removeSelectedProduct)
  const userGender = useKioskStore((state) => state.userGender)
  const userImage = useKioskStore((state) => state.userImage)

  // Blocklist for products to hide (by productId). Populate as needed.
  const BLOCKED_PRODUCT_IDS: Array<number | string> = []
  const filterBlocked = (items: ProductListItem[]) =>
    items.filter((item) => !BLOCKED_PRODUCT_IDS.includes(item.productId))

  // State management
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>({})
  const [sortOption, setSortOption] = useState<SortOption>({
    value: 'newest',
    label: 'Newest',
    sort_by: 'created_at',
    sort_order: 'desc',
  })
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false)

  const limit = 20
  const loadingRef = useRef(false) // Prevent double-fetch

  // Load products function
  const loadProducts = useCallback(async () => {
    // Prevent duplicate requests
    if (loadingRef.current || loading || !hasMore) return

    loadingRef.current = true
    setLoading(true)
    setError(null)

    // Calculate offset from page
    const offset = page * limit

    // Use stored gender from IdleScreen, but allow override from filters
    const genderFilter =
      filters.gender ||
      (userGender === 'male' ? 'Men' : userGender === 'female' ? 'Women' : undefined)

    const params = {
      limit,
      offset,
      search: search || undefined,
      gender: genderFilter,
      category_id: filters.category_id,
      brand_id: filters.brand_id,
      min_price: filters.min_price,
      max_price: filters.max_price,
      sort_by: sortOption.sort_by,
      sort_order: sortOption.sort_order,
    }

    try {
      const response = await productApi.getProductsList(params)
      const newProducts = filterBlocked(response.products)

      // Auto-stop when returned less than limit
      if (newProducts.length < limit) {
        setHasMore(false)
      }

      // Filter duplicates and append results
      setProducts((prev) => {
        if (page === 0) {
          // First page - replace products
          const uniqueProducts = newProducts.filter(
            (product, index, self) =>
              index === self.findIndex((p) => p.productId === product.productId),
          )
          return uniqueProducts
        } else {
          // Append results and filter duplicates
          const existingIds = new Set(prev.map((p) => p.productId))
          const uniqueNewProducts = newProducts.filter(
            (p) => !existingIds.has(p.productId),
          )
          return [...prev, ...uniqueNewProducts]
        }
      })

      // Note: Page is NOT incremented here - it's incremented by handleLoadMore before calling this function
    } catch (err) {
      console.error('Error loading products', err)
      setError('Failed to load products. Please try again.')
      setHasMore(false)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [page, loading, hasMore, search, filters, sortOption, userGender])

  // Load more handler - increments page which triggers loadProducts
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore && !loadingRef.current) {
      // Increment page to load next batch
      setPage((prev) => prev + 1)
    }
  }, [loading, hasMore])

  // Reset and load first page when filters/search/sort change
  useEffect(() => {
    setProducts([])
    setPage(0)
    setHasMore(true)
    setError(null)
    loadingRef.current = false

    // Load first page
    const loadFirstPage = async () => {
      if (loadingRef.current) return

      loadingRef.current = true
      setLoading(true)
      const offset = 0
      const genderFilter =
        filters.gender ||
        (userGender === 'male' ? 'Men' : userGender === 'female' ? 'Women' : undefined)

      const params = {
        limit,
        offset,
        search: search || undefined,
        gender: genderFilter,
        category_id: filters.category_id,
        brand_id: filters.brand_id,
        min_price: filters.min_price,
        max_price: filters.max_price,
        sort_by: sortOption.sort_by,
        sort_order: sortOption.sort_order,
      }

      try {
        const response = await productApi.getProductsList(params)
        const newProducts = filterBlocked(response.products)

        if (newProducts.length < limit) {
          setHasMore(false)
        }

        const uniqueProducts = newProducts.filter(
          (product, index, self) =>
            index === self.findIndex((p) => p.productId === product.productId),
        )
        setProducts(uniqueProducts)
        // Keep page at 0 - handleLoadMore will increment to 1 for next batch (offset=20)
      } catch (err) {
        console.error('Error loading products', err)
        setError('Failed to load products. Please try again.')
        setHasMore(false)
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    }

    loadFirstPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters, sortOption, userGender])

  // Load products when page changes (triggered by Load More button)
  useEffect(() => {
    // Skip if page is 0 (initial load handled by reset effect)
    if (page === 0) return

    // Skip if already loading or no more data
    if (loadingRef.current || loading || !hasMore) return

    // Load products for current page (offset = page * limit)
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleTryOn = (e: React.MouseEvent, product: ProductListItem) => {
    e.stopPropagation()
    const storeProduct = {
      id: product.productId.toString(),
      title: product.name,
      price: product.mrp,
      image: product.imageUrl,
      description: `${product.brand.name} - ${product.baseColour}`,
      sizes: ['S', 'M', 'L', 'XL'],
    }

    // Check if product is already selected
    const isSelected = selectedProducts.some((p) => p.id === storeProduct.id)

    if (isSelected) {
      // Remove if already selected
      removeSelectedProduct(storeProduct.id)
    } else {
      // Add if not selected (max 3)
      addSelectedProduct(storeProduct)
    }
  }

  const handleTryOnButton = () => {
    if (selectedProducts.length === 0) return
    navigate('/tryon-results')
  }

  const handleDetails = (e: React.MouseEvent, product: ProductListItem) => {
    e.stopPropagation()
    navigate(`/product/${product.productId}`)
  }

  const handleCardClick = (product: ProductListItem) => {
    navigate(`/product/${product.productId}`)
  }

  const handleRetry = () => {
    setError(null)
    setHasMore(true)
    handleLoadMore()
  }

  return (
    <div className="fixed inset-0 bg-white text-slate-900 overflow-hidden z-50 min-h-screen w-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-[3%] p-[4%] max-w-[1920px] mx-auto min-h-full pb-[120px]">
          {/* Header */}
          <div className="flex flex-col gap-[3%]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[2%]">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                  Looks
                </p>
                <h2 className="text-clamp-title font-bold text-slate-900">
                  Pick your style
                </h2>
                <p className="text-clamp-body text-slate-600">
                  Curated fits ready for virtual try-on.
                </p>
              </div>
            </div>

            {/* Search and Controls */}
            <div className="flex flex-col sm:flex-row gap-[2%] items-stretch sm:items-center py-4">
              <div className="flex-1">
                <SearchBar value={search} onChange={setSearch} />
              </div>
              <div className="flex gap-[2%] h-[56px]">
                <Button
                  className="!bg-white !text-slate-900 !border !border-slate-300 hover:!bg-slate-50 !w-[56px] !p-0 flex items-center justify-center !rounded-xl"
                  onClick={() => setFiltersDrawerOpen(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                </Button>
                <div className="h-full">
                  <SortDropdown value={sortOption.value} onChange={setSortOption} />
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {(userGender || filters.gender || filters.min_price || filters.max_price) && (
              <div className="flex items-center gap-[2%] flex-wrap mb-4">
                <span className="text-sm text-slate-600">Active filters:</span>
                {(filters.gender || userGender) && (
                  <span className="px-[2%] py-[1%] bg-slate-100 text-slate-700 rounded-lg text-xs">
                    {filters.gender ||
                      (userGender === 'male' ? 'Men' : userGender === 'female' ? 'Women' : '')}
                  </span>
                )}
                {(filters.min_price || filters.max_price) && (
                  <span className="px-[2%] py-[1%] bg-slate-100 text-slate-700 rounded-lg text-xs">
                    ₹{filters.min_price || 0} - ₹{filters.max_price || '∞'}
                  </span>
                )}
                <button
                  onClick={() => {
                    setFilters({})
                    setFiltersDrawerOpen(false)
                  }}
                  className="text-sm text-slate-600 hover:text-slate-900 underline"
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* Selected Products - Now handled by floating bar below */}
          </div>

          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-[4%] bg-red-50 border border-red-200 rounded-xl"
            >
              <div className="flex flex-col items-center gap-[2%]">
                <p className="text-red-700 text-center">{error}</p>
                <Button
                  className="!bg-red-600 !text-white hover:!bg-red-700 !mt-[2%]"
                  onClick={handleRetry}
                >
                  Retry
                </Button>
              </div>
            </motion.div>
          )}

          {/* Loading State - Skeleton Grid */}
          {loading && !products.length ? (
            <div
              className="product-grid-rows grid grid-cols-3 gap-x-4 gap-y-4 sm:gap-x-5 sm:gap-y-5 lg:gap-x-4 lg:gap-y-4 w-full"
            >
              {Array.from({ length: limit }).map((_, index) => (
                <SkeletonCard key={`skeleton-${index}`} />
              ))}
            </div>
          ) : products.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-[10%] text-center">
              <p className="text-lg font-semibold text-slate-700 mb-[2%]">
                No products found
              </p>
              <p className="text-slate-500 mb-[4%]">
                No products match your filters. Try clearing filters.
              </p>
              <Button
                className="!bg-slate-800 !text-white hover:!bg-slate-900"
                onClick={() => {
                  setFilters({})
                  setSearch('')
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              {/* Product Grid - Large responsive grid */}
              <div
                className="product-grid-rows grid grid-cols-3 gap-x-4 gap-y-4 sm:gap-x-5 sm:gap-y-5 lg:gap-x-4 lg:gap-y-4 w-full"
              >
                <AnimatePresence mode="popLayout">
                  {products.map((product, index) => (
                    <motion.div
                      key={product.productId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.25,
                        delay: Math.min((index % limit) * 0.02, 0.4),
                      }}
                      className="h-full"
                    >
                      <ProductCard
                        product={product}
                        onClick={() => handleCardClick(product)}
                        onTryOn={(e) => handleTryOn(e, product)}
                        onDetails={(e) => handleDetails(e, product)}
                        isSelected={selectedProducts.some(
                          (p) => p.id === product.productId.toString(),
                        )}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>


              {/* End of List */}
              {!hasMore && products.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-[4%] text-slate-500 text-lg"
                >
                  Showing all {products.length} products
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating Selection Bar - Fixed at top */}
      <AnimatePresence>
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-3 left-0 right-0 mx-auto z-[60] w-[94vw] max-w-[520px] px-2 sm:px-0"
        >
          <div className="relative overflow-hidden rounded-xl shadow-xl border border-slate-700/50">
            {/* Solid dark background */}
            <div className="absolute inset-0 bg-slate-800" />
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 opacity-50" />

            {/* Content */}
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3">
              {/* Selection Counter */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.8 }}
                      animate={{
                        scale: i < selectedProducts.length ? 1 : 0.85,
                        backgroundColor: i < selectedProducts.length ? '#22c55e' : '#475569'
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="w-2.5 h-2.5 rounded-full"
                    />
                  ))}
                </div>
                <span className="text-white/90 text-sm font-medium">
                  <span className="font-bold text-white">{selectedProducts.length}</span>
                  <span className="text-slate-400"> / 3</span>
                </span>
              </div>

              {/* Try On Button */}
              <motion.button
                onClick={handleTryOnButton}
                disabled={selectedProducts.length === 0 || !userImage}
                whileHover={selectedProducts.length > 0 && userImage ? { scale: 1.02 } : {}}
                whileTap={selectedProducts.length > 0 && userImage ? { scale: 0.98 } : {}}
                className={`
                  w-full sm:w-auto px-5 py-2 rounded-lg font-semibold text-sm text-center
                  transition-all duration-200
                  ${selectedProducts.length > 0 && userImage
                    ? 'bg-white text-slate-900 shadow-md hover:bg-slate-100'
                    : 'bg-slate-600/50 text-slate-500 cursor-not-allowed'
                  }
                `}
              >
                Try On
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Load More Button - Fixed at bottom */}
      {hasMore && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50 p-[2%] sm:p-[3%]">
          <motion.div
            className="flex items-center justify-center max-w-[1920px] mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.button
              onClick={handleLoadMore}
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.03 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className={`
                w-full max-w-[60%] h-[70px] sm:h-[80px] md:h-[90px]
                rounded-2xl font-bold text-white text-2xl sm:text-3xl
                transition-all duration-200 shadow-lg
                flex items-center justify-center gap-4
                ${loading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-900 active:bg-slate-950'
                }
              `}
            >
              {loading ? (
                <LoadingPulse className="text-white w-full max-w-[200px]" lines={4} />
              ) : (
                'LOAD MORE PRODUCTS'
              )}
            </motion.button>
          </motion.div>
        </div>
      )}

      {/* Filters Drawer */}
      <FiltersDrawer
        isOpen={filtersDrawerOpen}
        onClose={() => setFiltersDrawerOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onApply={() => {
          setFiltersDrawerOpen(false)
        }}
        onReset={() => {
          setFiltersDrawerOpen(false)
        }}
      />
    </div>
  )
}

export default ProductList
