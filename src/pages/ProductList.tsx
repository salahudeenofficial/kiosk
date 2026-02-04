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
import { type ProductListItem } from '../utils/productApi'
import { unifiedKioskApi } from '../utils/unifiedKioskApi'
import type { CatalogFilterBrand, CatalogFilterCategory } from '../utils/kioskApi'

import PairingModal, { isEligibleForPairing } from '../components/PairingModal'

// Skeleton Card Component - Responsive fixed height matching ProductCard
const SkeletonCard = () => (
  <div
    className="product-card-height flex flex-col overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-lg animate-pulse h-full"
  >
    {/* Image placeholder */}
    <div className="w-full h-[280px] sm:h-[320px] md:h-[360px] bg-slate-200 flex-shrink-0" />

    {/* Content placeholder */}
    <div className="flex flex-col flex-1 p-3 sm:p-4 min-h-0 bg-white">
      {/* Brand */}
      <div className="h-3 w-16 bg-slate-200 rounded mb-2" />

      {/* Name */}
      <div className="h-4 w-3/4 bg-slate-200 rounded mb-2" />

      {/* Ratings */}
      <div className="h-3 w-24 bg-slate-200 rounded mb-4" />

      {/* Price */}
      <div className="h-5 w-20 bg-slate-200 rounded mb-3" />

      <div className="flex-1" />

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <div className="h-10 bg-slate-200 rounded-lg" />
        <div className="h-10 bg-slate-200 rounded-lg" />
      </div>
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
    value: 'featured',
    label: 'Featured',
  })
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false)
  const [pairingProduct, setPairingProduct] = useState<ProductListItem | null>(null)

  // Filter options from backend
  const [availableCategories, setAvailableCategories] = useState<CatalogFilterCategory[]>([])
  const [availableBrands, setAvailableBrands] = useState<CatalogFilterBrand[]>([])
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null)
  const [filtersLoading, setFiltersLoading] = useState(false)

  // Track loading state for each selected product
  const [loadingStates, setLoadingStates] = useState<Record<string, 'loading' | 'success'>>({})

  // Infinite scroll & Scroll persistence
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const observerTarget = useRef<HTMLDivElement>(null)
  const productListScrollPosition = useKioskStore((state) => state.productListScrollPosition)
  const setProductListScrollPosition = useKioskStore((state) => state.setProductListScrollPosition)

  // Restore scroll position on mount
  useEffect(() => {
    if (scrollContainerRef.current && productListScrollPosition > 0) {
      // Small timeout to ensure content renders
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = productListScrollPosition
        }
      }, 100)
    }
  }, []) // Run once on mount



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



    try {
      let newProducts: ProductListItem[]

      // Use unified API for mock mode, productApi for real backend
      const catalogResponse = await unifiedKioskApi.loadCatalog({
        limit,
        offset,
        gender: genderFilter,
        categoryId: filters.category_id,
        search: search || undefined,
        brand_id: filters.brand_id,
        min_price: filters.min_price,
        max_price: filters.max_price,
        sort_by: sortOption.sort_by,
        sort_order: sortOption.sort_order,
      })

      // Convert catalog products to ProductListItem format
      newProducts = catalogResponse.products.map(p => ({
        productId: p.productId,
        name: p.name,
        mrp: p.mrp,
        baseColour: 'Black', // Default as kiosk API doesn't return colour yet
        ratings: 4.0, // Default as kiosk API doesn't return ratings yet
        imageCount: 1,
        imageUrl: p.imageUrl,
        brand: p.brand,
        category: p.category,
      } as ProductListItem))

      newProducts = filterBlocked(newProducts)

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

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingRef.current) {
          handleLoadMore()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading, handleLoadMore])

  // Fetch available filters from backend. Omit gender so we get all categories
  // (Men, Women, Unisex). Product listing still filters by gender via loadCatalog.
  useEffect(() => {
    const fetchFilters = async () => {
      setFiltersLoading(true)
      try {
        const filtersResponse = await unifiedKioskApi.getCatalogFilters({
          search: search || undefined,
        })

        setAvailableCategories(filtersResponse.categories)
        setAvailableBrands(filtersResponse.brands)
        setPriceRange(filtersResponse.price_range)
      } catch (err) {
        console.error('Error loading filters', err)
        setAvailableCategories([])
        setAvailableBrands([])
        setPriceRange(null)
      } finally {
        setFiltersLoading(false)
      }
    }

    fetchFilters()
  }, [search])

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



      try {
        let newProducts: ProductListItem[]

        // Use unified API for mock mode, productApi for real backend
        const catalogResponse = await unifiedKioskApi.loadCatalog({
          limit,
          offset,
          gender: genderFilter,
          categoryId: filters.category_id,
          search: search || undefined,
          brand_id: filters.brand_id,
          min_price: filters.min_price,
          max_price: filters.max_price,
          sort_by: sortOption.sort_by,
          sort_order: sortOption.sort_order,
        })

        // Convert catalog products to ProductListItem format
        newProducts = catalogResponse.products.map(p => ({
          productId: p.productId,
          name: p.name,
          mrp: p.mrp,
          baseColour: 'Black', // Default as kiosk API doesn't return colour yet
          ratings: 4.0, // Default as kiosk API doesn't return ratings yet
          imageCount: 1,
          imageUrl: p.imageUrl,
          brand: p.brand,
          category: p.category,
        } as ProductListItem))

        newProducts = filterBlocked(newProducts)

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

  const addProductToSelection = (product: ProductListItem) => {
    const storeProduct = {
      id: product.productId.toString(),
      title: product.name,
      price: product.mrp,
      image: product.imageUrl,
      description: `${product.brand.name} - ${product.baseColour}`,
      sizes: ['S', 'M', 'L', 'XL'],
    }

    if (!selectedProducts.some((p) => p.id === storeProduct.id)) {
      addSelectedProduct(storeProduct)

      // Start simulated loading
      setLoadingStates(prev => ({ ...prev, [storeProduct.id]: 'loading' }))

      setTimeout(() => {
        setLoadingStates(prev => ({ ...prev, [storeProduct.id]: 'success' }))
      }, 15000)
      return true
    }
    return false
  }

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
      setLoadingStates((prev) => {
        const next = { ...prev }
        delete next[storeProduct.id]
        return next
      })
    } else {
      // Add if not selected (max 3)
      if (selectedProducts.length < 3) {
        addProductToSelection(product)
      }
    }
  }

  const handlePair = (e: React.MouseEvent, product: ProductListItem) => {
    e.stopPropagation()
    if (isEligibleForPairing(product.category.name)) {
      setPairingProduct(product)
    }
  }

  const handleGeneratePair = (product1: ProductListItem, product2: ProductListItem) => {
    // Try adding both. The store or helper checks duplicates.
    // We also check limit.
    const currentCount = selectedProducts.length

    let addedCount = 0

    if (currentCount < 3) {
      if (addProductToSelection(product1)) addedCount++
    }
    if (currentCount + addedCount < 3) {
      addProductToSelection(product2)
    }

    setPairingProduct(null)
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
    if (scrollContainerRef.current) {
      setProductListScrollPosition(scrollContainerRef.current.scrollTop)
    }
    navigate(`/product/${product.productId}`)
  }

  const handleRetry = () => {
    setError(null)
    setHasMore(true)
    handleLoadMore()
  }

  const handleEndSession = async () => {
    try {
      await unifiedKioskApi.completeSession()
    } catch (err) {
      console.error('Failed to complete session:', err)
    }
    useKioskStore.getState().resetSession()
    navigate('/')
  }

  return (
    <div className="fixed inset-0 bg-white text-slate-900 overflow-hidden z-50 min-h-screen w-full flex flex-col">
      {/* End Session Button */}
      <button
        onClick={handleEndSession}
        className="fixed top-6 right-6 z-[70] bg-white/80 hover:bg-white text-slate-500 hover:text-red-500 p-3 rounded-full shadow-lg backdrop-blur-md border border-slate-200 transition-all"
        aria-label="End Session"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-[3%] px-[4%] pt-[80px] pb-[120px] max-w-[1920px] mx-auto min-h-full">
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
            {(userGender || filters.gender || filters.category_id || filters.brand_id || filters.min_price || filters.max_price) && (
              <div className="flex items-center gap-[2%] flex-wrap mb-4">
                <span className="text-sm text-slate-600">Active filters:</span>
                {(filters.gender || userGender) && (
                  <span className="px-[2%] py-[1%] bg-slate-100 text-slate-700 rounded-lg text-xs">
                    {filters.gender ||
                      (userGender === 'male' ? 'Men' : userGender === 'female' ? 'Women' : '')}
                  </span>
                )}
                {filters.category_id && (
                  <span className="px-[2%] py-[1%] bg-slate-100 text-slate-700 rounded-lg text-xs">
                    {availableCategories.find((c) => c.id === filters.category_id)?.name || 'Category'}
                  </span>
                )}
                {filters.brand_id && (
                  <span className="px-[2%] py-[1%] bg-slate-100 text-slate-700 rounded-lg text-xs">
                    {availableBrands.find((b) => b.id === filters.brand_id)?.name || 'Brand'}
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
                        onPair={isEligibleForPairing(product.category.name) ? (e) => handlePair(e, product) : undefined}
                        onDetails={(e) => handleDetails(e, product)}
                        isSelected={selectedProducts.some(
                          (p) => p.id === product.productId.toString(),
                        )}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Infinite Scroll Trigger */}
              {hasMore && (
                <div ref={observerTarget} className="w-full py-8 flex justify-center">
                  {loading && <LoadingPulse className="text-slate-400" lines={3} />}
                </div>
              )}


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

      {/* Floating Selection Bar - Fixed at bottom */}
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-0 right-0 mx-auto z-[60] w-auto max-w-fit px-4"
        >
          <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-transparent bg-[#959595] p-3">
            <div className="flex items-center gap-3">
              {[0, 1, 2].map((i) => {
                const product = selectedProducts[i]
                const isLoading = product && loadingStates[product.id] === 'loading'
                const isSuccess = product && loadingStates[product.id] === 'success'

                return (
                  <div
                    key={i}
                    className={`
                      relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all duration-300
                      ${product
                        ? 'border-slate-800 bg-white shadow-md'
                        : 'border-slate-200 bg-slate-50 border-dashed'
                      }
                      ${isSuccess ? 'cursor-pointer hover:scale-105' : ''}
                    `}
                    onClick={() => {
                      if (isSuccess) {
                        handleTryOnButton()
                      }
                    }}
                  >
                    {product ? (
                      <>
                        <img
                          src={product.image}
                          alt={product.title}
                          className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}
                        />

                        {/* Loading Overlay */}
                        {isLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}

                        {/* Success Overlay */}
                        {isSuccess && (
                          <div className="absolute inset-0 flex items-center justify-center bg-green-500/80 backdrop-blur-[1px]">
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}

                        {/* Remove Button (only show if not success/loading or if desired) */}
                        {/* For this specific request, we focus on the loading/success flow. 
                            Users can deselect from the grid if needed. */}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <span className="text-2xl font-light">+</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <PairingModal
        isOpen={!!pairingProduct}
        onClose={() => setPairingProduct(null)}
        product={pairingProduct}
        availableProducts={products}
        onGenerate={handleGeneratePair}
      />

      {/* Filters Drawer */}
      <FiltersDrawer
        isOpen={filtersDrawerOpen}
        onClose={() => setFiltersDrawerOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        categories={availableCategories}
        brands={availableBrands}
        priceRange={priceRange}
        filtersLoading={filtersLoading}
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
