/**
 * Mock Kiosk API - Simulates the backend for debugging and testing
 * 
 * Features:
 * - Realistic product catalog with fashion items
 * - Configurable delays and error simulation
 * - Session management simulation
 * - VTON result simulation
 */

import type { ProductListItem, ProductListResponse, ProductDetails } from './productApi'

// ============================================================================
// CONFIGURATION
// ============================================================================

export const MOCK_CONFIG = {
    // Simulate network delays
    DELAY_MIN_MS: 200,
    DELAY_MAX_MS: 800,

    // Simulate errors (set to true to test error handling)
    SIMULATE_ERRORS: false,
    ERROR_RATE: 0.1, // 10% of requests fail

    // VTON simulation
    VTON_DELAY_MS: 3000, // Time to "generate" a VTON result

    // Enable/disable mock mode
    ENABLED: false,
}

// ============================================================================
// MOCK DATA - REALISTIC FASHION CATALOG
// ============================================================================

// High-quality product images from Unsplash (fashion)
const PRODUCT_IMAGES = {
    shirts: [
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
        'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80',
        'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800&q=80',
    ],
    tshirts: [
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
        'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800&q=80',
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80',
        'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80',
    ],
    jeans: [
        'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=800&q=80',
        'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=800&q=80',
        'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80',
    ],
    dresses: [
        'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80',
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80',
        'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80',
    ],
    jackets: [
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80',
        'https://images.unsplash.com/photo-1544923246-77307dd628b7?w=800&q=80',
        'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80',
    ],
    sweaters: [
        'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80',
        'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80',
    ],
}

// Brands
const BRANDS = [
    { id: 1, name: 'Zara' },
    { id: 2, name: 'H&M' },
    { id: 3, name: 'Uniqlo' },
    { id: 4, name: 'Mango' },
    { id: 5, name: 'Massimo Dutti' },
    { id: 6, name: 'COS' },
    { id: 7, name: 'Levi\'s' },
    { id: 8, name: 'Tommy Hilfiger' },
]

// Categories (Men, Women, Unisex – all genders)
const CATEGORIES = [
    { id: 1, name: 'Shirts', gender: 'Men' },
    { id: 2, name: 'T-Shirts', gender: 'Men' },
    { id: 3, name: 'Jeans', gender: 'Men' },
    { id: 4, name: 'Jackets', gender: 'Men' },
    { id: 5, name: 'Sweaters', gender: 'Men' },
    { id: 11, name: 'Dresses', gender: 'Women' },
    { id: 12, name: 'Tops', gender: 'Women' },
    { id: 13, name: 'Jeans', gender: 'Women' },
    { id: 14, name: 'Jackets', gender: 'Women' },
    { id: 21, name: 'Activewear', gender: 'Unisex' },
    { id: 22, name: 'Accessories', gender: 'Unisex' },
]

// Colors
const COLORS = ['Black', 'White', 'Navy Blue', 'Grey', 'Olive', 'Beige', 'Burgundy', 'Charcoal', 'Cream', 'Indigo']

// Generate realistic product names
const PRODUCT_NAMES = {
    shirts: [
        'Oxford Classic Fit Shirt',
        'Slim Fit Poplin Shirt',
        'Linen Blend Summer Shirt',
        'Chambray Work Shirt',
        'Flannel Check Shirt',
        'Denim Western Shirt',
        'Button-Down Collar Shirt',
        'Easy Iron Business Shirt',
    ],
    tshirts: [
        'Premium Cotton Crew Neck',
        'Essential V-Neck Tee',
        'Oversized Graphic Tee',
        'Athletic Fit Performance Tee',
        'Relaxed Fit Pocket Tee',
        'Stripe Jersey T-Shirt',
        'Heavyweight Cotton Tee',
        'Soft Touch Modal Blend',
    ],
    jeans: [
        'Slim Fit Stretch Jeans',
        'Regular Fit Selvedge Denim',
        'Skinny Fit Washed Jeans',
        'Relaxed Tapered Jeans',
        'Straight Leg Classic Jeans',
        'High Rise Mom Jeans',
    ],
    dresses: [
        'Floral Midi Wrap Dress',
        'Satin Slip Dress',
        'Cotton Poplin Shirt Dress',
        'Ribbed Knit Bodycon Dress',
        'Tiered Maxi Dress',
        'Blazer Mini Dress',
    ],
    jackets: [
        'Leather Biker Jacket',
        'Wool Blend Overcoat',
        'Quilted Puffer Jacket',
        'Denim Trucker Jacket',
        'Water-Resistant Bomber',
        'Lightweight Field Jacket',
    ],
    sweaters: [
        'Merino Wool V-Neck Sweater',
        'Cashmere Crew Neck',
        'Cable Knit Cardigan',
        'Cotton Half-Zip Sweater',
        'Ribbed Turtleneck',
    ],
}

// Generate mock products
function generateMockProducts(): ProductListItem[] {
    const products: ProductListItem[] = []
    let id = 1000

    const categoryImageMap: Record<string, string[]> = {
        'Shirts': PRODUCT_IMAGES.shirts,
        'T-Shirts': PRODUCT_IMAGES.tshirts,
        'Tops': PRODUCT_IMAGES.tshirts,
        'Jeans': PRODUCT_IMAGES.jeans,
        'Dresses': PRODUCT_IMAGES.dresses,
        'Jackets': PRODUCT_IMAGES.jackets,
        'Sweaters': PRODUCT_IMAGES.sweaters,
    }

    const categoryNameMap: Record<string, string[]> = {
        'Shirts': PRODUCT_NAMES.shirts,
        'T-Shirts': PRODUCT_NAMES.tshirts,
        'Tops': PRODUCT_NAMES.tshirts,
        'Jeans': PRODUCT_NAMES.jeans,
        'Dresses': PRODUCT_NAMES.dresses,
        'Jackets': PRODUCT_NAMES.jackets,
        'Sweaters': PRODUCT_NAMES.sweaters,
    }

    // Generate products for each category
    CATEGORIES.forEach(category => {
        const images = categoryImageMap[category.name] || PRODUCT_IMAGES.shirts
        const names = categoryNameMap[category.name] || PRODUCT_NAMES.shirts

        // Generate 12-20 products per category
        const count = 12 + Math.floor(Math.random() * 9)

        for (let i = 0; i < count; i++) {
            const brand = BRANDS[Math.floor(Math.random() * BRANDS.length)]
            const color = COLORS[Math.floor(Math.random() * COLORS.length)]
            const name = names[i % names.length]
            const image = images[i % images.length]

            // Realistic pricing based on category
            let basePrice: number
            switch (category.name) {
                case 'T-Shirts':
                case 'Tops':
                    basePrice = 799 + Math.floor(Math.random() * 1200)
                    break
                case 'Shirts':
                    basePrice = 1499 + Math.floor(Math.random() * 2000)
                    break
                case 'Jeans':
                    basePrice = 1999 + Math.floor(Math.random() * 3000)
                    break
                case 'Dresses':
                    basePrice = 2499 + Math.floor(Math.random() * 4000)
                    break
                case 'Jackets':
                    basePrice = 3999 + Math.floor(Math.random() * 6000)
                    break
                case 'Sweaters':
                    basePrice = 1999 + Math.floor(Math.random() * 3000)
                    break
                default:
                    basePrice = 999 + Math.floor(Math.random() * 2000)
            }

            products.push({
                productId: id++,
                name: `${brand.name} ${name}`,
                mrp: basePrice,
                baseColour: color,
                ratings: 3.5 + Math.random() * 1.5, // 3.5 - 5.0
                imageCount: 3 + Math.floor(Math.random() * 4),
                imageUrl: image,
                brand,
                category: {
                    id: category.id,
                    name: category.name,
                    gender: category.gender,
                },
            })
        }
    })

    return products
}

// Generate mock product details
function generateMockProductDetails(productId: number, listItem?: ProductListItem): ProductDetails {
    const item = listItem || MOCK_PRODUCTS.find(p => p.productId === productId)

    if (!item) {
        throw new Error(`Product ${productId} not found`)
    }

    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    const availableSizes = sizes.slice(
        Math.floor(Math.random() * 2),
        4 + Math.floor(Math.random() * 2)
    )

    return {
        productId: item.productId,
        name: item.name,
        mrp: item.mrp,
        baseColour: item.baseColour,
        description: `Premium quality ${item.category.name.toLowerCase()} made from carefully selected materials. Features a comfortable fit and modern design that's perfect for everyday wear or special occasions.`,
        materialCare: '100% Cotton. Machine wash cold with like colors. Tumble dry low. Do not bleach.',
        originalUrl: `https://www.example.com/products/${item.productId}`,
        ratings: item.ratings,
        sizes: availableSizes,
        imageCount: item.imageCount,
        firstImageFilename: `product_${item.productId}_1.jpg`,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        attributes: {
            fit: ['Regular Fit', 'Slim Fit', 'Relaxed Fit'][Math.floor(Math.random() * 3)],
            sleeve: ['Short Sleeve', 'Long Sleeve', 'Half Sleeve'][Math.floor(Math.random() * 3)],
            pattern: ['Solid', 'Striped', 'Checked', 'Printed'][Math.floor(Math.random() * 4)],
        },
        images: Array.from({ length: item.imageCount }, (_, i) => ({
            filename: `product_${item.productId}_${i + 1}.jpg`,
            url: item.imageUrl + `&v=${i}`, // Add variation to make unique URLs
            order: i,
            isThumbnail: i === 0,
        })),
        brand: item.brand,
        category: item.category,
    }
}

// Pre-generate products
const MOCK_PRODUCTS = generateMockProducts()

// ============================================================================
// SESSION STATE
// ============================================================================

type MockSessionState = {
    sessionId: string | null
    userId: number | null
    token: string | null
    age: number | null
    height: number | null
    imageUrl: string | null
    measurements: Record<string, number> | null
}

const DEFAULT_SESSION_STATE: MockSessionState = {
    sessionId: null,
    userId: null,
    token: null,
    age: null,
    height: null,
    imageUrl: null,
    measurements: null,
}

// Try to load from localStorage
let mockSessionState: MockSessionState = DEFAULT_SESSION_STATE
try {
    const saved = localStorage.getItem('mock_session_state')
    if (saved) {
        mockSessionState = JSON.parse(saved)
    }
} catch (e) {
    console.warn('Failed to load mock session state', e)
}

const saveSessionState = () => {
    try {
        localStorage.setItem('mock_session_state', JSON.stringify(mockSessionState))
    } catch (e) {
        console.warn('Failed to save mock session state', e)
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const randomDelay = () => delay(
    MOCK_CONFIG.DELAY_MIN_MS + Math.random() * (MOCK_CONFIG.DELAY_MAX_MS - MOCK_CONFIG.DELAY_MIN_MS)
)

const maybeThrowError = () => {
    if (MOCK_CONFIG.SIMULATE_ERRORS && Math.random() < MOCK_CONFIG.ERROR_RATE) {
        throw new Error('Simulated network error')
    }
}

const generateSessionId = () => `mock_sess_${Date.now()}_${Math.random().toString(36).slice(2)}`
const generateToken = () => `mock_token_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`

// Generate realistic mock measurements (in cm)
const generateMockMeasurements = (): Record<string, number> => {
    // Generate measurements that are realistic for a medium-sized person
    // These match the API key format expected by FitCheckScreen
    return {
        'neck circumference': 38 + Math.floor(Math.random() * 4), // 38-41 cm
        'chest circumference': 95 + Math.floor(Math.random() * 10), // 95-104 cm
        'waist circumference': 80 + Math.floor(Math.random() * 10), // 80-89 cm
        'hip circumference': 98 + Math.floor(Math.random() * 8), // 98-105 cm
        'thigh left circumference': 56 + Math.floor(Math.random() * 6), // 56-61 cm
        'thigh right circumference': 56 + Math.floor(Math.random() * 6), // 56-61 cm
        'bicep right circumference': 32 + Math.floor(Math.random() * 4), // 32-35 cm
        'bicep left circumference': 32 + Math.floor(Math.random() * 4), // 32-35 cm
        'shoulder breadth': 42 + Math.floor(Math.random() * 4), // 42-45 cm
        'calf left circumference': 36 + Math.floor(Math.random() * 4), // 36-39 cm
        'calf right circumference': 36 + Math.floor(Math.random() * 4), // 36-39 cm
        'inseam': 74 + Math.floor(Math.random() * 8), // 74-82 cm
    }
}

// ============================================================================
// MOCK API IMPLEMENTATION
// ============================================================================

export const mockKioskApi = {
    // Configuration (always succeeds in mock mode)
    async configure(clientId: string, _clientSecret: string, kioskId: string) {
        await randomDelay()
        maybeThrowError()

        console.log('[MockAPI] Configure:', { clientId, kioskId })


        // Persist to localStorage so kioskApi.getConfig() works locally in mock mode
        const configData = {
            clientId,
            clientSecret: _clientSecret,
            kioskId,
            locationName: 'Mock Location - Debug Mode',
            clientName: 'Mock Fashion Store',
        }
        localStorage.setItem('kiosk_config', JSON.stringify(configData))

        return {
            kiosk_id: kioskId,
            client_id: 1,
            client_name: 'Mock Fashion Store',
            location_id: 1,
            location_name: 'Mock Location - Debug Mode',
            status: 'online',
            config: {
                session_timeout_minutes: 30,
                max_garments_per_session: 3,
            },
        }
    },

    // Session creation
    async createSession() {
        await randomDelay()
        maybeThrowError()

        mockSessionState = {
            sessionId: generateSessionId(),
            userId: 1000 + Math.floor(Math.random() * 9000),
            token: generateToken(),
            age: null,
            height: null,
            imageUrl: null,
            measurements: null,
        }
        saveSessionState()

        console.log('[MockAPI] Session created:', mockSessionState)

        return {
            session_id: mockSessionState.sessionId!,
            user_id: mockSessionState.userId!,
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            token: mockSessionState.token!,
        }
    },

    // Profile update
    async updateProfile(age?: number, height?: number) {
        await randomDelay()
        maybeThrowError()

        if (age !== undefined) mockSessionState.age = age
        if (height !== undefined) mockSessionState.height = height
        saveSessionState()

        console.log('[MockAPI] Profile updated:', { age, height })

        return {
            session_id: mockSessionState.sessionId!,
            user_id: mockSessionState.userId!,
            age: mockSessionState.age,
            height: mockSessionState.height,
            updated_at: new Date().toISOString(),
        }
    },

    // Image upload
    async uploadImage(_imageFile: File | Blob) {
        await delay(MOCK_CONFIG.DELAY_MAX_MS * 2) // Longer delay for upload
        maybeThrowError()

        mockSessionState.imageUrl = `https://mock-storage.example.com/user-images/${mockSessionState.userId}.jpg`

        // Generate mock measurements after image upload
        mockSessionState.measurements = generateMockMeasurements()
        saveSessionState()

        console.log('[MockAPI] Image uploaded, measurements generated')

        return {
            session_id: mockSessionState.sessionId!,
            user_id: mockSessionState.userId!,
            image_url: mockSessionState.imageUrl,
            status: 'processing',
            current_step: 'catalog',
        }
    },

    // Catalog
    async loadCatalog(filters: {
        limit?: number
        offset?: number
        categoryId?: number
        gender?: string
        search?: string
        min_price?: number
        max_price?: number
        brand_id?: number
        sort_by?: string
        sort_order?: 'asc' | 'desc'
    } = {}): Promise<ProductListResponse> {
        await randomDelay()
        maybeThrowError()

        console.log(`[MockAPI] Loading catalog with filters:`, filters)

        let filtered = [...MOCK_PRODUCTS]

        // Apply filters
        console.log(`[MockAPI] Initial count: ${filtered.length}. Filters:`, filters)

        if (filters.gender) {
            filtered = filtered.filter(p => p.category.gender === filters.gender)
        }
        if (filters.categoryId) {
            filtered = filtered.filter(p => p.category.id === filters.categoryId)
        }
        if (filters.min_price !== undefined) {
            const min = Number(filters.min_price)
            if (!isNaN(min)) {
                console.log(`[MockAPI] Filtering min_price: ${min}`)
                filtered = filtered.filter(p => p.mrp >= min)
            }
        }
        if (filters.max_price !== undefined) {
            const max = Number(filters.max_price)
            if (!isNaN(max)) {
                console.log(`[MockAPI] Filtering max_price: ${max}`)
                filtered = filtered.filter(p => p.mrp <= max)
            }
        }
        if (filters.search) {
            const search = filters.search.toLowerCase()
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(search) ||
                p.brand.name.toLowerCase().includes(search)
            )
        }

        console.log(`[MockAPI] Filtered results: ${filtered.length}`)

        // Sort results
        if (filters.sort_by) {
            const sortBy = filters.sort_by
            const sortOrder = filters.sort_order || 'asc'
            const direction = sortOrder === 'asc' ? 1 : -1

            filtered.sort((a, b) => {
                let valA: any = a[sortBy as keyof typeof a]
                let valB: any = b[sortBy as keyof typeof b]

                // Handle special case for created_at (use productId as proxy)
                if (sortBy === 'created_at') {
                    valA = a.productId
                    valB = b.productId
                }

                if (valA < valB) return -1 * direction
                if (valA > valB) return 1 * direction
                return 0
            })
        }

        const limit = filters.limit || 20
        const offset = filters.offset || 0
        const paged = filtered.slice(offset, offset + limit)

        return {
            products: paged,
            pagination: {
                total: filtered.length,
                limit,
                offset,
                currentPage: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(filtered.length / limit),
                hasNext: offset + limit < filtered.length,
                hasPrevious: offset > 0,
            },
        }
    },

    // Product details
    async getProductDetails(productId: number): Promise<ProductDetails> {
        await randomDelay()
        maybeThrowError()

        console.log('[MockAPI] Getting product details:', productId)

        return generateMockProductDetails(productId)
    },

    // VTON request
    async requestVton(garmentIds: number[], stitch: boolean = false) {
        await randomDelay()
        maybeThrowError()

        console.log('[MockAPI] VTON requested for garments:', garmentIds, 'stitch:', stitch)

        if (stitch) {
            return {
                session_id: mockSessionState.sessionId!,
                jobs: [{
                    job_id: `mock_job_stitched_${Date.now()}`,
                    garment_ids: garmentIds,
                    stitch: true,
                    status: 'QUEUED',
                }],
                current_step: 'results',
            }
        }

        return {
            session_id: mockSessionState.sessionId!,
            jobs: garmentIds.map(id => ({
                job_id: `mock_job_${id}_${Date.now()}`,
                garment_id: id,
                status: 'QUEUED',
            })),
            current_step: 'results',
        }
    },

    // VTON result simulation (returns mock results after delay)
    async getVtonResult(garmentId: number): Promise<{ status: string; output_image_url?: string }> {
        // Simulate processing time
        await delay(MOCK_CONFIG.VTON_DELAY_MS + Math.random() * 2000)

        // Return a "try-on" result image (using a fashion model image from Unsplash)
        const resultImages = [
            'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80',
            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80',
            'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&q=80',
            'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&q=80',
        ]

        console.log('[MockAPI] VTON result ready for:', garmentId)

        return {
            status: 'SUCCESS',
            output_image_url: resultImages[Math.floor(Math.random() * resultImages.length)],
        }
    },

    // Get user measurements
    async getUserMeasurements(): Promise<{ status: string; measurements: Record<string, number> | null }> {
        await randomDelay()
        maybeThrowError()

        // With persistence, we might have measurements ready
        if (mockSessionState.measurements) {
            console.log('[MockAPI] Returning measurements')
            return {
                status: 'success',
                measurements: mockSessionState.measurements,
            }
        }

        // Auto-generate measurements for development if missing/not uploaded
        // This is a dev convenience to allow Fit Check testing without full flow
        if (MOCK_CONFIG.ENABLED || import.meta.env.VITE_API_MODE === 'mock') {
            console.log('[MockAPI] Auto-generating measurements for development testing')
            mockSessionState.measurements = generateMockMeasurements()
            saveSessionState()
            return {
                status: 'success',
                measurements: mockSessionState.measurements
            }
        }

        // If measurements haven't been generated yet (image not uploaded), return processing status
        return {
            status: 'processing',
            measurements: null,
        }
    },

    // Get size recommendation
    async getSizeRecommendation(productId: number): Promise<any> {
        await randomDelay()
        maybeThrowError()

        const product = MOCK_PRODUCTS.find(p => p.productId === productId)
        if (!product) {
            throw new Error('Product not found')
        }

        console.log('[MockAPI] Size recommendation for:', productId)

        return {
            product_id: productId,
            recommended_size: 'M',
            confidence: 0.92,
            fit_type: 'regular',
            all_sizes: [
                {
                    size: 'S',
                    score: 0.689,
                    fit: 'tight',
                    details: {
                        chest: { user: 94.0, chart: 90.0, diff_cm: 4.0, fit: 'tight' },
                        waist: { user: 80.0, chart: 76.0, diff_cm: 4.0, fit: 'tight' },
                        shoulder: { user: 42.0, chart: 40.0, diff_cm: 2.0, fit: 'tight' }
                    }
                },
                {
                    size: 'M',
                    score: 0.952,
                    fit: 'regular',
                    details: {
                        chest: { user: 94.0, chart: 96.0, diff_cm: -2.0, fit: 'good' },
                        waist: { user: 80.0, chart: 82.0, diff_cm: -2.0, fit: 'good' },
                        shoulder: { user: 42.0, chart: 42.0, diff_cm: 0.0, fit: 'good' }
                    }
                },
                {
                    size: 'L',
                    score: 0.823,
                    fit: 'loose',
                    details: {
                        chest: { user: 94.0, chart: 102.0, diff_cm: -8.0, fit: 'loose' },
                        waist: { user: 80.0, chart: 88.0, diff_cm: -8.0, fit: 'loose' },
                        shoulder: { user: 42.0, chart: 44.0, diff_cm: -2.0, fit: 'loose' }
                    }
                },
                {
                    size: 'XL',
                    score: 0.75,
                    fit: 'loose',
                    details: {
                        chest: { user: 94.0, chart: 108.0, diff_cm: -14.0, fit: 'loose' },
                        waist: { user: 80.0, chart: 94.0, diff_cm: -14.0, fit: 'loose' },
                        shoulder: { user: 42.0, chart: 46.0, diff_cm: -4.0, fit: 'loose' }
                    }
                }
            ],
            matched_measurements: ['chest', 'waist', 'shoulder'],
            missing_measurements: [],
            measurement_status: 'success'
        }
    },

    // Session completion
    async completeSession() {
        await randomDelay()

        console.log('[MockAPI] Session completed')

        mockSessionState = DEFAULT_SESSION_STATE
        saveSessionState()
    },

    // Debug helpers
    getSessionState() {
        return { ...mockSessionState }
    },

    getAllProducts() {
        return [...MOCK_PRODUCTS]
    },

    resetSession() {
        mockSessionState = DEFAULT_SESSION_STATE
        saveSessionState()
    },
}

// Export mock products for direct access
export { MOCK_PRODUCTS, CATEGORIES, BRANDS }
