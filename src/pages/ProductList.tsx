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
import type { CatalogFilterBrand, CatalogFilterCategory, VtonJob } from '../utils/kioskApi'


import PairingModal from '../components/PairingModal'
import { isEligibleForPairing } from '../utils/garmentHelpers'
import tuckLogo from '../assets/tuck_logo.png'

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

// Blocklist for products to hide (by productId). Populate as needed.
const BLOCKED_PRODUCT_IDS: Array<number | string> = []
const filterBlocked = (items: ProductListItem[]) =>
  items.filter((item) => !BLOCKED_PRODUCT_IDS.includes(item.productId))

const ProductList = () => {
  useAutoNavigate()
  const navigate = useNavigate()
  const selectedProducts = useKioskStore((state) => state.selectedProducts)
  const addSelectedProduct = useKioskStore((state) => state.addSelectedProduct)
  const removeSelectedProduct = useKioskStore((state) => state.removeSelectedProduct)
  const userGender = useKioskStore((state) => state.userGender)

  const vtonJobs = useKioskStore((state) => state.vtonJobs)
  const updateVtonJob = useKioskStore((state) => state.updateVtonJob)
  const setSizeRecommendation = useKioskStore((state) => state.setSizeRecommendation)
  const setUserMeasurements = useKioskStore((state) => state.setUserMeasurements)

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
  // REPLACED by vtonJobs from store
  // const [loadingStates, setLoadingStates] = useState<Record<string, 'loading' | 'success'>>({})

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount



  const limit = 20
  const loadingRef = useRef(false) // Prevent double-fetch
  const hasMoreRef = useRef(true) // Sync with hasMore state to avoid dependency loop

  // Load products function
  const loadProducts = useCallback(async () => {
    // Prevent duplicate requests
    // Important: DO NOT checking "loading" if page is 0, effectively forcing reload on filter change
    if (loadingRef.current || (!hasMoreRef.current && page > 0)) return

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
        hasMoreRef.current = false
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
      hasMoreRef.current = false
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [page, search, filters, sortOption, userGender])

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

  // Single effect to handle both filter resets and page changes.
  // When filters/search/sort/gender change, reset to page 0 and load.
  // When page changes (infinite scroll), load the next batch.
  const prevFiltersRef = useRef({ search, filters, sortOption, userGender })

  useEffect(() => {
    const prev = prevFiltersRef.current
    const filtersChanged =
      prev.search !== search ||
      prev.filters !== filters ||
      prev.sortOption !== sortOption ||
      prev.userGender !== userGender

    if (filtersChanged) {
      prevFiltersRef.current = { search, filters, sortOption, userGender }
      setProducts([])
      setHasMore(true)
      hasMoreRef.current = true
      setError(null)
      loadingRef.current = false
      if (page !== 0) {
        setPage(0) // Will re-trigger this effect with page=0
        return
      }
    }

    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filters, sortOption, userGender])








  // Load products when page changes (triggered by Load More button)


  const addProductToSelection = (product: ProductListItem, pairedItem?: ProductListItem) => {
    const storeProduct = {
      id: product.productId.toString(),
      title: product.name,
      price: product.mrp,
      image: product.imageUrl,
      description: `${product.brand.name} - ${product.baseColour}`,
      sizes: ['S', 'M', 'L', 'XL'],
      pairedProduct: pairedItem ? {
        id: pairedItem.productId.toString(),
        title: pairedItem.name,
        price: pairedItem.mrp,
        image: pairedItem.imageUrl,
        description: `${pairedItem.brand.name} - ${pairedItem.baseColour}`,
        sizes: ['S', 'M', 'L', 'XL'],
      } : undefined
    }

    if (!selectedProducts.some((p) => p.id === storeProduct.id)) {
      addSelectedProduct(storeProduct)
      // VTON request is now triggered separately to handle stitch vs single
      return true
    }
    return false
  }

  const triggerVton = async (productIds: number[], stitch: boolean = false) => {
    // Optimistic update
    productIds.forEach(id => {
      updateVtonJob(id.toString(), 'RUNNING', null)
    })

    // Fire VTON request and size recommendations in parallel
    const vtonPromise = (async () => {
      try {
        const response = await unifiedKioskApi.requestVton(productIds, stitch)
        console.log('[ProductList] VTON requested:', response)

        response.jobs.forEach((j) => {
          const job = j as VtonJob
          const status = job.status
          const jobId = job.job_id
          if (stitch && job.garment_ids) {
            (job.garment_ids as number[]).forEach((gid: number) => {
              updateVtonJob(gid.toString(), status, null, undefined, jobId)
            })
          } else if (job.garment_id) {
            updateVtonJob(job.garment_id.toString(), status, null, undefined, jobId)
          }
        })
      } catch (err) {
        console.error('VTON request failed:', err)
        productIds.forEach(id => {
          updateVtonJob(id.toString(), 'FAILED', null, err instanceof Error ? err.message : 'Unknown error')
        })
      }
    })()

    // Fetch size recommendations for each product
    const recPromise = Promise.all(
      productIds.map(async (id) => {
        try {
          const rec = await unifiedKioskApi.getSizeRecommendation(id)
          console.log(`[ProductList] Size recommendation for ${id}:`, rec)
          setSizeRecommendation(id.toString(), rec)

          // Store user measurements from the first successful response
          if (rec.user_measurements && !useKioskStore.getState().userMeasurements) {
            setUserMeasurements(rec.user_measurements)
          }
        } catch (err) {
          console.warn(`[ProductList] Size recommendation failed for ${id}:`, err)
        }
      })
    )

    await Promise.all([vtonPromise, recPromise])
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
      // Removed local loading state update
      // setLoadingStates((prev) => {
      //   const next = { ...prev }
      //   delete next[storeProduct.id]
      //   return next
      // })
    } else {
      // Add if not selected
      if (addProductToSelection(product)) {
        triggerVton([product.productId], false)
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
    // We want to try on these two products as a pair (stitch mode).
    // First, ensure they are in the selected products list.
    const targetIds = [product1.productId, product2.productId]

    // Add primary product with paired product info
    // This counts as ONE request visually in the bar
    addProductToSelection(product1, product2)

    // Trigger ONE stitch request for exactly these two items
    setPairingProduct(null)
    triggerVton(targetIds, true)
  }

  const handleTryOnButton = (initialIndex: number = 0) => {
    if (selectedProducts.length === 0) return
    navigate('/tryon-results', { state: { initialIndex } })
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
    hasMoreRef.current = true
    loadProducts()
  }



  return (
    <div className="fixed inset-0 bg-white text-slate-900 overflow-hidden z-50 min-h-screen w-full flex flex-col">
      {/* End Session Button */}
      {/* End Session Button REMOVED as per request */}



      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-[3%] px-[4%] pt-0 pb-[120px] max-w-[1920px] mx-auto min-h-full">
          {/* Brand Notch - Static */}
          <div className="flex justify-center w-full mb-8 -mt-2">
            <div className="relative">
              <svg width="184" height="39" viewBox="0 0 184 39" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0.852942 0.219738C-2.15621 -7.02437 3.16713 -15 11.0114 -15H172.558C180.266 -15 185.583 -7.27818 182.835 -0.0772257L170.62 31.9228C168.993 36.1845 164.905 39 160.343 39H24.304C19.8589 39 15.8507 36.3247 14.1455 32.2197L0.852942 0.219738Z" fill="black" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pt-1">
                <img src={tuckLogo} alt="Tuck" className="h-6 object-contain brightness-0 invert" />
              </div>
            </div>
          </div>

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
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center py-2 w-full md:w-1/2">
              <div className="w-1/2">
                <SearchBar value={search} onChange={setSearch} className="h-[28px]" inputClassName="!rounded-[1px] !text-xs !py-0 !pl-10 !h-full" />
              </div>
              <div className="flex gap-2 h-[28px]">
                <Button
                  className="!bg-white !text-slate-900 hover:!bg-slate-50 !w-[28px] !h-[28px] !p-0 flex items-center justify-center !rounded-[1px] !border-none !shadow-none"
                  onClick={() => setFiltersDrawerOpen(true)}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="24" height="24" rx="1" fill="#292526" />
                    <path d="M16 10H14C13.7239 10 13.5 9.77614 13.5 9.5C13.5 9.22386 13.7239 9 14 9H16C16.2761 9 16.5 9.22386 16.5 9.5C16.5 9.77614 16.2761 10 16 10Z" fill="#FDFDFD" />
                    <path d="M10 10H8C7.72386 10 7.5 9.77614 7.5 9.5C7.5 9.22386 7.72386 9 8 9H10C10.2761 9 10.5 9.22386 10.5 9.5C10.5 9.77614 10.2761 10 10 10Z" fill="#FDFDFD" />
                    <path d="M11.5 11.5C10.6716 11.5 10 10.8284 10 10C10 9.17157 10.6716 8.5 11.5 8.5C12.3284 8.5 13 9.17157 13 10C13 10.8284 12.3284 11.5 11.5 11.5ZM11.5 9C10.9477 9 10.5 9.44772 10.5 10C10.5 10.5523 10.9477 11 11.5 11C12.0523 11 12.5 10.5523 12.5 10C12.5 9.44772 12.0523 9 11.5 9Z" fill="#FDFDFD" />
                    <path d="M16 15H14C13.7239 15 13.5 14.7761 13.5 14.5C13.5 14.2239 13.7239 14 14 14H16C16.2761 14 16.5 14.2239 16.5 14.5C16.5 14.7761 16.2761 15 16 15Z" fill="#FDFDFD" />
                    <path d="M10 15H8C7.72386 15 7.5 14.7761 7.5 14.5C7.5 14.2239 7.72386 14 8 14H10C10.2761 14 10.5 14.2239 10.5 14.5C10.5 14.7761 10.2761 15 10 15Z" fill="#FDFDFD" />
                    <path d="M13.5 16.5C12.6716 16.5 12 15.8284 12 15C12 14.1716 12.6716 13.5 13.5 13.5C14.3284 13.5 15 14.1716 15 15C15 15.8284 14.3284 16.5 13.5 16.5ZM13.5 14C12.9477 14 12.5 14.4477 12.5 15C12.5 15.5523 12.9477 16 13.5 16C14.0523 16 14.5 15.5523 14.5 15C14.5 14.4477 14.0523 14 13.5 14Z" fill="#FDFDFD" />
                  </svg>
                </Button>
                <div className="h-full">
                  <SortDropdown value={sortOption.value} onChange={setSortOption} className="!rounded-[1px] !text-xs !px-2" />
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {(userGender || filters.gender || filters.category_id || filters.brand_id || filters.min_price || filters.max_price) && (
              <div className="flex items-center gap-[2%] flex-wrap mb-4">
                {/* Active filters label removed */}
                {(filters.gender || userGender) && (
                  <span className="px-[2%] py-[1%] bg-white text-black border border-black rounded-[1px] text-xs">
                    {filters.gender ||
                      (userGender === 'male' ? 'Men' : userGender === 'female' ? 'Women' : '')}
                  </span>
                )}
                {filters.category_id && (
                  <span className="px-[2%] py-[1%] bg-white text-black border border-black rounded-[1px] text-xs">
                    {availableCategories.find((c) => c.id === filters.category_id)?.name || 'Category'}
                  </span>
                )}
                {filters.brand_id && (
                  <span className="px-[2%] py-[1%] bg-white text-black border border-black rounded-[1px] text-xs">
                    {availableBrands.find((b) => b.id === filters.brand_id)?.name || 'Brand'}
                  </span>
                )}
                {(filters.min_price || filters.max_price) && (
                  <span className="px-[2%] py-[1%] bg-white text-black border border-black rounded-[1px] text-xs">
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
      {/* New Result Bar - Top Right */}
      <AnimatePresence>
        {selectedProducts.length > 0 && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-[4%] right-[4%] z-[60]"
          >
            <div
              className="group relative bg-black text-white rounded-full p-2 pl-2 pr-2 flex items-center shadow-2xl gap-3 cursor-pointer overflow-visible"
              onClick={() => handleTryOnButton(0)}
            >
              {/* Left Text Button with Border */}
              <div className="flex flex-col items-center justify-center leading-none border border-white rounded-[32px] px-5 py-2.5 ml-1">
                <span className="text-[10px] text-gray-300 font-medium uppercase tracking-widest mb-0.5">View</span>
                <span className="text-sm font-bold whitespace-nowrap">My Try On</span>
              </div>

              {/* Right Images */}
              <div className="flex items-center pl-2">
                <div className="flex -space-x-3 items-center">
                  {/* Items - Show last 3 (newest) */}
                  {selectedProducts.slice(-3).map((product, idx) => {
                    const jobStatus = vtonJobs[product.id]
                    const isLoading = jobStatus?.status === 'RUNNING' || jobStatus?.status === 'PENDING' || jobStatus?.status === 'QUEUED' || jobStatus?.status === 'WAITING_MASK'
                    const isSuccess = jobStatus?.status === 'SUCCESS' || (product && vtonJobs[product.id]?.imageUrl)

                    return (
                      <div
                        key={product.id}
                        className="relative w-10 h-10 rounded-full border-2 border-slate-800 bg-white flex-shrink-0"
                        style={{ zIndex: idx + 1 }}
                      >
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-full h-full object-cover rounded-full"
                        />

                        {/* Loading Spinner - 3/4 Loop */}
                        {isLoading && (
                          <div className="absolute inset-[-4px] rounded-full pointer-events-none">
                            <svg className="w-full h-full animate-spin" viewBox="0 0 36 36">
                              {/* Background Circle */}
                              <path
                                className="text-transparent"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                              />
                              {/* Progress Circle (3/4) */}
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 -11.25 -4.68"
                                fill="none"
                                stroke="#22c55e"
                                strokeWidth="3"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                        )}

                        {/* Success Tick */}
                        {isSuccess && (
                          <div className="absolute -top-1 -right-1 z-10">
                            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                              <div className="w-full h-full rounded-full border-2 border-green-500 bg-white flex items-center justify-center">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Overflow Indicator */}
                  {selectedProducts.length > 3 && (
                    <div
                      className="relative w-10 h-10 rounded-full bg-slate-100 text-black flex items-center justify-center border-2 border-slate-900 z-0"
                    >
                      <span className="font-bold text-xs">+{selectedProducts.length - 3}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
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
