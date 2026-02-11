import { API_CONFIG, getApiUrl } from './config'

// Product API Types
export type ProductListItem = {
  productId: number
  name: string
  mrp: number
  baseColour: string
  ratings: number
  imageCount: number
  imageUrl: string
  brand: {
    id: number
    name: string
  }
  category: {
    id: number
    name: string
    gender: string
  }
}

export type ProductListResponse = {
  products: ProductListItem[]
  pagination: {
    total: number
    limit: number
    offset: number
    currentPage: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
  filters?: Record<string, unknown>
  sorting?: Record<string, unknown>
}

export type ProductImage = {
  filename: string
  url: string
  order: number
  isThumbnail?: boolean
  fileSize?: number
  uploadedAt?: string
}

export type ProductAttributes = {
  fit?: string
  sleeve?: string
  pattern?: string
  [key: string]: string | undefined
}

export type ProductDetails = {
  productId: number
  name: string
  mrp: number
  baseColour: string
  description: string
  materialCare: string // Note: backend uses materialCare, not materialsCare
  originalUrl: string
  ratings: number
  sizes: string[]
  imageCount: number
  firstImageFilename: string
  createdAt?: string
  updatedAt?: string
  attributes: ProductAttributes
  images: ProductImage[]
  brand: {
    id: number
    name: string
  } | null
  category: {
    id: number
    name: string
    gender: string
  } | null
  sizeChart?: {
    available: boolean
    sizes: string[]
    measurements: string[]
    chart: Record<string, Record<string, number>>
    unit: string
  }
}

export type ProductDetailsResponse = {
  product: ProductDetails
}

export type ProductListParams = {
  limit?: number
  offset?: number
  search?: string
  category_id?: number
  brand_id?: number
  gender?: string
  min_price?: number
  max_price?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// Helper to build query string
const buildQueryString = (params: ProductListParams): string => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString())
    }
  })
  return searchParams.toString()
}

// Product API functions
export const productApi = {
  /**
   * Get paginated product list with filters and sorting
   */
  async getProductsList(
    params: ProductListParams = {},
  ): Promise<ProductListResponse> {
    const queryString = buildQueryString({
      limit: 20,
      offset: 0,
      ...params,
    })
    const url = `${getApiUrl(API_CONFIG.ENDPOINTS.PRODUCTS_LIST)}?${queryString}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success || !data.data) {
        throw new Error(data.error?.message || 'Failed to fetch products')
      }

      return data.data
    } catch (error) {
      console.error('Failed to fetch products list:', error)
      throw error
    }
  },

  /**
   * Get product details by productId
   */
  async getProductDetails(productId: number): Promise<ProductDetails> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.PRODUCT_DETAILS)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Product-ID': productId.toString(),
        },
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `API error: ${response.status} ${response.statusText}`

        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error?.message || errorData.message || errorMessage
        } catch {
          // If not JSON, use the text as error message
          if (errorText) {
            errorMessage = errorText
          }
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()

      // Check if request was successful
      if (data.success && data.data && data.data.product) {
        return data.data.product
      }

      // Handle error response
      if (data.error) {
        const errorMessage = data.error.message || 'Failed to fetch product details'
        const errorCode = data.error.code || 'UNKNOWN_ERROR'
        throw new Error(`${errorMessage} (Code: ${errorCode})`)
      }

      throw new Error('Invalid response format: product data not found')
    } catch (error) {
      console.error('Failed to fetch product details:', {
        productId,
        url,
        error: error instanceof Error ? error.message : String(error),
      })

      // Re-throw with more context
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`Failed to fetch product details: ${String(error)}`)
    }
  },
}

