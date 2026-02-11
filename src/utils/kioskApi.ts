/**
 * Kiosk API - New backend integration
 * 
 * This module handles all communication with the new kiosk backend API.
 * It uses session-based authentication with JWT tokens.
 */

import {
    API_CONFIG,
    getApiUrl,
    getStoredKioskConfig,
    getStoredSession,
    storeKioskConfig,
    storeSession,
    clearSession,
    type KioskConfig,
    type KioskSession,
} from './config'
import type { ProductDetails } from './productApi'

// API response types
type ApiResponse<T> = {
    success: boolean
    data?: T
    error?: {
        message: string
        code?: string
    }
}

// Configure response
type ConfigureResponse = {
    kiosk_id: string
    client_id: number
    client_name: string
    location_id: number
    location_name: string
    status: string
    config: {
        session_timeout_minutes: number
        max_garments_per_session: number
    }
}

// Session response
type SessionResponse = {
    session_id: string
    user_id: number
    expires_at: string
    token: string
}

// Session update response
type SessionUpdateResponse = {
    session_id: string
    user_id: number
    age?: number
    height?: number
    updated_at: string
}

// Image upload response
type ImageUploadResponse = {
    session_id: string
    user_id: number
    image_url: string
    status: string
    current_step: string
}

// Measurements response
export type MeasurementsResponse = {
    status: string // 'success' | 'processing' | 'failed' | 'not_started'
    measurements: string | null // CSV string: "key,value\nkey2,value2"
}

// Catalog types
export type CatalogProduct = {
    productId: number
    name: string
    mrp: number
    imageUrl: string
    brand: { id: number; name: string }
    category: { id: number; name: string; gender: string }
}

type CatalogResponse = {
    products: CatalogProduct[]
    pagination: {
        total: number
        limit: number
        offset: number
        hasNext: boolean
        hasPrevious: boolean
    }
}

// Catalog filters types
export type CatalogFilterBrand = {
    id: number
    name: string
}

export type CatalogFilterCategory = {
    id: number
    name: string
    gender: string
}

export type CatalogFiltersResponse = {
    brands: CatalogFilterBrand[]
    categories: CatalogFilterCategory[]
    price_range: {
        min: number
        max: number
    }
}

// VTON job types
export type VtonJob = {
    job_id: string
    garment_id?: number // Optional, used in standard mode
    garment_ids?: number[] // Used in stitch mode
    stitch?: boolean
    status: string
}

type VtonRequestResponse = {
    session_id: string
    jobs: VtonJob[]
    current_step: string
}

// SSE Event types
export type VtonResultEvent = {
    job_id: string
    garment_id: number
    status: string
    output_image_data?: string | null
    output_image_url?: string | null
    error?: string | null
    timestamp?: string
}

export type VtonErrorEvent = {
    job_id: string
    garment_id: number
    status: string
    error: string
}

export type VtonUpdateEvent = {
    job_id: string
    status: string
}

// Size Recommendation Types
export type SizeRecommendationDetail = {
    user: number
    chart: number
    diff_cm: number
    fit: 'good' | 'tight' | 'loose'
}

export type SizeRecommendationOption = {
    size: string
    score: number
    fit: 'regular' | 'tight' | 'loose'
    details: Record<string, SizeRecommendationDetail>
}

export type SizeRecommendationResponse = {
    product_id: number
    recommended_size: string
    confidence: number
    fit_type: 'regular' | 'tight' | 'loose'
    all_sizes: SizeRecommendationOption[]
    matched_measurements: string[]
    missing_measurements: string[]
    measurement_status: string
}

// Helper to get auth headers from stored config
const getKioskHeaders = (): Record<string, string> => {
    const config = getStoredKioskConfig()
    if (!config) {
        throw new Error('Kiosk not configured. Please configure the kiosk first.')
    }
    return {
        'X-Client-ID': config.clientId,
        'X-Client-Secret': config.clientSecret,
        'X-Kiosk-ID': config.kioskId,
    }
}

// Helper to get session auth headers (includes both JWT and kiosk headers)
const getSessionHeaders = (): Record<string, string> => {
    const session = getStoredSession()
    if (!session) {
        throw new Error('No active session. Please start a new session.')
    }
    // Include both JWT token AND kiosk headers as backend may require both
    return {
        ...getKioskHeaders(),
        'Authorization': `Bearer ${session.token}`,
    }
}

// Helper to safely parse JSON response or return error details
const parseJsonResponse = async <T>(response: Response): Promise<{ ok: boolean; data?: T; error?: string }> => {
    const text = await response.text()
    try {
        const json = JSON.parse(text)
        return { ok: response.ok, data: json }
    } catch {
        // Not JSON - return the text as error message
        return { ok: false, error: text || `HTTP ${response.status}` }
    }
}

/**
 * Kiosk API service
 */
export const kioskApi = {
    /**
     * Configure the kiosk with client credentials
     * This should be called once during kiosk setup
     */
    async configure(
        clientId: string,
        clientSecret: string,
        kioskId: string
    ): Promise<ConfigureResponse> {
        const url = getApiUrl(API_CONFIG.ENDPOINTS.KIOSK_CONFIGURE)

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-Client-ID': clientId,
                    'X-Client-Secret': clientSecret,
                    'X-Kiosk-ID': kioskId,
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
            })

            const data: ApiResponse<ConfigureResponse> = await response.json()

            if (!response.ok || !data.success || !data.data) {
                throw new Error(data.error?.message || `Configuration failed: ${response.status}`)
            }

            // Store the configuration
            const config: KioskConfig = {
                clientId,
                clientSecret,
                kioskId,
                locationId: data.data.location_id,
                locationName: data.data.location_name,
                clientName: data.data.client_name,
            }
            storeKioskConfig(config)

            return data.data
        } catch (error) {
            console.error('Kiosk configuration error:', error)
            throw error
        }
    },

    /**
     * Check if kiosk is configured
     */
    isConfigured(): boolean {
        return getStoredKioskConfig() !== null
    },

    /**
     * Get current kiosk configuration
     */
    getConfig(): KioskConfig | null {
        return getStoredKioskConfig()
    },

    /**
     * Create a new session (when user touches the screen)
     */
    async createSession(): Promise<KioskSession> {
        const url = getApiUrl(API_CONFIG.ENDPOINTS.KIOSK_SESSIONS)

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...getKioskHeaders(),
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
            })

            const data: ApiResponse<SessionResponse> = await response.json()

            if (!response.ok || !data.success || !data.data) {
                throw new Error(data.error?.message || `Session creation failed: ${response.status}`)
            }

            // Store the session
            const session: KioskSession = {
                sessionId: data.data.session_id,
                userId: data.data.user_id,
                token: data.data.token,
                expiresAt: data.data.expires_at,
            }
            storeSession(session)

            return session
        } catch (error) {
            console.error('Session creation error:', error)
            throw error
        }
    },

    /**
     * Get current session
     */
    getSession(): KioskSession | null {
        return getStoredSession()
    },

    /**
     * Update session profile (age, height)
     */
    async updateProfile(age?: number, height?: number, gender?: string): Promise<SessionUpdateResponse> {
        const session = getStoredSession()
        if (!session) {
            throw new Error('No active session')
        }

        const url = getApiUrl(`${API_CONFIG.ENDPOINTS.KIOSK_SESSION_UPDATE}/${session.sessionId}`)

        try {
            const body: { age?: number; height?: number; gender?: string } = {}
            if (age !== undefined) body.age = age
            if (height !== undefined) body.height = height
            if (gender !== undefined) body.gender = gender

            console.log('[API] Updating profile:', { url, body })

            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    ...getSessionHeaders(),
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
            })

            const result = await parseJsonResponse<ApiResponse<SessionUpdateResponse>>(response)

            // Handle 422 validation errors specially
            if (response.status === 422 && result.data) {
                const detail = (result.data as unknown as { detail?: Array<{ msg: string; loc: string[] }> }).detail
                if (detail && Array.isArray(detail)) {
                    const errorMsg = detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(', ')
                    throw new Error(`Validation error: ${errorMsg}`)
                }
            }

            if (!result.ok || result.error) {
                console.error('[API] Profile update failed:', result)
                throw new Error(result.error || `Profile update failed: ${response.status}`)
            }

            const data = result.data as ApiResponse<SessionUpdateResponse>
            if (!data?.success || !data?.data) {
                throw new Error(data?.error?.message || `Profile update failed: ${response.status}`)
            }

            return data.data
        } catch (error) {
            console.error('Profile update error:', error)
            throw error
        }
    },

    /**
     * Upload user image
     */
    async uploadImage(imageFile: File | Blob): Promise<ImageUploadResponse> {
        const session = getStoredSession()
        if (!session) {
            throw new Error('No active session')
        }

        const url = getApiUrl(`${API_CONFIG.ENDPOINTS.KIOSK_SESSION_IMAGE}/${session.sessionId}/image`)

        try {
            const formData = new FormData()
            formData.append('image', imageFile)

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...getSessionHeaders(),
                    // Don't set Content-Type - browser will set it with boundary
                },
                credentials: 'include',
                body: formData,
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
            })

            const data: ApiResponse<ImageUploadResponse> = await response.json()

            if (!response.ok || !data.success || !data.data) {
                throw new Error(data.error?.message || `Image upload failed: ${response.status}`)
            }

            // Update session step
            const updatedSession = { ...session, currentStep: data.data.current_step }
            storeSession(updatedSession)

            return data.data
        } catch (error) {
            console.error('Image upload error:', error)
            throw error
        }
    },

    /**
     * Upload user image from base64 data URL
     */
    async uploadImageFromDataUrl(dataUrl: string): Promise<ImageUploadResponse> {
        // Convert base64 data URL to Blob
        const response = await fetch(dataUrl)
        const blob = await response.blob()

        // Determine file extension from mime type
        const mimeType = blob.type || 'image/jpeg'
        const extension = mimeType.split('/')[1] || 'jpg'
        const filename = `user-image-${Date.now()}.${extension}`

        // Create File object
        const file = new File([blob], filename, { type: mimeType })
        console.log(`[Upload] Uploading file: ${filename}, size: ${(file.size / 1024).toFixed(1)} KB`)

        return this.uploadImage(file)
    },

    /**
     * Get available catalog filters (brands, categories, price range)
     */
    async getCatalogFilters(filters: {
        gender?: string
        search?: string
    } = {}): Promise<CatalogFiltersResponse> {
        const params = new URLSearchParams()
        if (filters.gender) params.append('gender', filters.gender)
        if (filters.search) params.append('search', filters.search)

        const url = `${getApiUrl(API_CONFIG.ENDPOINTS.KIOSK_CATALOG_FILTERS)}?${params}`

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...getSessionHeaders(),
                },
                credentials: 'include',
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
            })

            const data: ApiResponse<CatalogFiltersResponse> = await response.json()

            if (!response.ok || !data.success || !data.data) {
                throw new Error(data.error?.message || `Catalog filters load failed: ${response.status}`)
            }

            return data.data
        } catch (error) {
            console.error('Catalog filters load error:', error)
            throw error
        }
    },

    /**
     * Load catalog
     */
    async loadCatalog(filters: {
        limit?: number
        offset?: number
        categoryId?: number
        gender?: string
        search?: string
        brand_id?: number
        min_price?: number
        max_price?: number
        sort_by?: string
        sort_order?: 'asc' | 'desc'
    } = {}): Promise<CatalogResponse> {
        const params = new URLSearchParams()
        params.append('limit', String(filters.limit || 50))
        params.append('offset', String(filters.offset || 0))
        if (filters.categoryId) params.append('category_id', String(filters.categoryId))
        if (filters.gender) params.append('gender', filters.gender)
        if (filters.search) params.append('search', filters.search)
        if (filters.brand_id !== undefined) params.append('brand_id', String(filters.brand_id))
        if (filters.min_price !== undefined) params.append('min_price', String(filters.min_price))
        if (filters.max_price !== undefined) params.append('max_price', String(filters.max_price))
        if (filters.sort_by) params.append('sort_by', filters.sort_by)
        if (filters.sort_order) params.append('sort_order', filters.sort_order)

        const url = `${getApiUrl(API_CONFIG.ENDPOINTS.KIOSK_CATALOG)}?${params}`

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...getSessionHeaders(),
                },
                credentials: 'include',
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
            })

            const data: ApiResponse<CatalogResponse> = await response.json()

            if (!response.ok || !data.success || !data.data) {
                throw new Error(data.error?.message || `Catalog load failed: ${response.status}`)
            }

            return data.data
        } catch (error) {
            console.error('Catalog load error:', error)
            throw error
        }
    },

    /**
     * Get user measurements
     */
    async getMeasurements(): Promise<MeasurementsResponse> {
        const session = getStoredSession()
        if (!session) {
            throw new Error('No active session')
        }

        const url = getApiUrl(`${API_CONFIG.ENDPOINTS.KIOSK_SESSION_MEASUREMENTS}/${session.sessionId}/measurements`)

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...getSessionHeaders(),
                },
                credentials: 'include',
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
            })

            const data: ApiResponse<MeasurementsResponse> = await response.json()

            if (!response.ok || !data.success || !data.data) {
                // Return data even if success=false if it contains status
                throw new Error(data.error?.message || `Measurements load failed: ${response.status}`)
            }

            return data.data
        } catch (error) {
            console.error('Measurements load error:', error)
            throw error
        }
    },

    /**
     * Get size recommendation for a product
     */
    async getSizeRecommendation(productId: number): Promise<SizeRecommendationResponse> {
        const session = getStoredSession()
        if (!session) {
            throw new Error('No active session')
        }

        const url = `${getApiUrl(API_CONFIG.ENDPOINTS.KIOSK_SESSIONS)}/${session.sessionId}/size-recommendation?product_id=${productId}`

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...getSessionHeaders(),
                },
                credentials: 'include',
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
            })

            const data: ApiResponse<SizeRecommendationResponse> = await response.json()

            if (!response.ok || !data.success || !data.data) {
                throw new Error(data.error?.message || `Size recommendation failed: ${response.status}`)
            }

            return data.data
        } catch (error) {
            console.error('Size recommendation error:', error)
            throw error
        }
    },

    /**
     * Get product details by productId
     */
    async getProductDetails(productId: number): Promise<ProductDetails> {
        const session = getStoredSession()
        // We allow unauthenticated access if no session (for browsing before scan), 
        // but if we have a session we should include it.
        // If your backend REQUIRES a session for this endpoint, check session here.
        // Based on docs: "X-Kiosk-ID... OR Authorization: Bearer {JWT_TOKEN}"

        // If we have a session, use session headers (includes token + kiosk headers)
        // If not, fall back to just kiosk headers
        let headers: Record<string, string>
        try {
            headers = session ? getSessionHeaders() : getKioskHeaders()
        } catch (e) {
            // If kiosk not configured, we can't make this call
            throw new Error('Kiosk not configured')
        }

        const url = `${getApiUrl(API_CONFIG.ENDPOINTS.KIOSK_CATALOG)}/${productId}`

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
            })

            const data: ApiResponse<any> = await response.json()

            if (!response.ok || !data.success || !data.data) {
                // Check if it's a 404 "Not available at this location" vs "Not found" 
                const msg = data.error?.message || `Product load failed: ${response.status}`
                throw new Error(msg)
            }

            const rawProduct = data.data

            // Map the new API response to the ProductDetails interface expected by the UI
            // The new API returns `sizeChart` inline, so we map it directly.
            const product: ProductDetails = {
                productId: rawProduct.productId,
                name: rawProduct.name,
                mrp: rawProduct.mrp,
                baseColour: rawProduct.baseColour,
                description: rawProduct.description,
                materialCare: rawProduct.materialCare,
                originalUrl: "", // Not in new response, defaulting
                ratings: rawProduct.ratings,
                sizes: rawProduct.sizes,
                imageCount: rawProduct.imageCount,
                firstImageFilename: rawProduct.images?.[0]?.filename || '',
                attributes: {}, // Not in new response, defaulting
                images: rawProduct.images.map((img: any) => ({
                    filename: img.filename,
                    url: img.imageUrl, // Presigned URL
                    order: img.order,
                    isThumbnail: img.isThumbnail,
                    isVtonImage: img.isVtonImage
                })),
                brand: rawProduct.brand,
                category: rawProduct.category,
                sizeChart: rawProduct.sizeChart?.available ? rawProduct.sizeChart : undefined
            }

            return product
        } catch (error) {
            console.error('Product details load error:', error)
            throw error
        }
    },
    async requestVton(garmentIds: number[], stitch: boolean = false): Promise<VtonRequestResponse> {
        const session = getStoredSession()
        if (!session) {
            throw new Error('No active session')
        }

        if (garmentIds.length === 0) {
            throw new Error('Please select at least one garment')
        }

        if (stitch) {
            if (garmentIds.length !== 2) {
                throw new Error('Stitch mode requires exactly 2 garments (upper and lower)')
            }
        } else {
            if (garmentIds.length > API_CONFIG.MAX_GARMENTS_PER_SESSION) {
                throw new Error(`Maximum ${API_CONFIG.MAX_GARMENTS_PER_SESSION} garments allowed`)
            }
        }

        const url = getApiUrl(`${API_CONFIG.ENDPOINTS.KIOSK_SESSION_VTON}/${session.sessionId}/vton`)

        try {
            const body: any = { garment_ids: garmentIds }
            if (stitch) {
                body.stitch = true
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...getSessionHeaders(),
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
            })

            const data: ApiResponse<VtonRequestResponse> = await response.json()

            if (!response.ok || !data.success || !data.data) {
                throw new Error(data.error?.message || `VTON request failed: ${response.status}`)
            }

            // Update session step
            const updatedSession = { ...session, currentStep: data.data.current_step }
            storeSession(updatedSession)

            return data.data
        } catch (error) {
            console.error('VTON request error:', error)
            throw error
        }
    },

    /**
     * Start SSE stream for VTON results
     * Returns an EventSource that can be used to listen for events
     */
    startVtonStream(
        onResult: (result: VtonResultEvent) => void,
        onError: (error: VtonErrorEvent) => void,
        onUpdate?: (update: VtonUpdateEvent) => void,
        onConnectionError?: (error: Error) => void
    ): EventSource | null {
        const session = getStoredSession()
        if (!session) {
            onConnectionError?.(new Error('No active session'))
            return null
        }

        // EventSource doesn't support custom headers, so we pass token as query param
        const url = `${getApiUrl(API_CONFIG.ENDPOINTS.KIOSK_SESSION_STREAM)}/${session.sessionId}/stream?token=${encodeURIComponent(session.token)}`

        try {
            const eventSource = new EventSource(url)

            eventSource.addEventListener('connected', (event) => {
                console.log('SSE connected:', JSON.parse((event as MessageEvent).data))
            })

            eventSource.addEventListener('vton_result', (event) => {
                const result: VtonResultEvent = JSON.parse((event as MessageEvent).data)
                console.log('VTON result:', result)
                onResult(result)
            })

            eventSource.addEventListener('vton_error', (event) => {
                const error: VtonErrorEvent = JSON.parse((event as MessageEvent).data)
                console.error('VTON error:', error)
                onError(error)
            })

            eventSource.addEventListener('vton_update', (event) => {
                const update: VtonUpdateEvent = JSON.parse((event as MessageEvent).data)
                console.log('VTON update:', update)
                onUpdate?.(update)
            })

            eventSource.onerror = (error) => {
                console.error('SSE error:', error)
                if (eventSource.readyState === EventSource.CLOSED) {
                    onConnectionError?.(new Error('SSE connection closed'))
                }
            }

            return eventSource
        } catch (error) {
            console.error('Failed to start SSE stream:', error)
            onConnectionError?.(error instanceof Error ? error : new Error(String(error)))
            return null
        }
    },

    /**
     * Alternative: Use fetch API for SSE stream (better header support)
     * This is the recommended approach for production
     */
    async startVtonStreamWithFetch(
        onResult: (result: VtonResultEvent) => void,
        onError: (error: VtonErrorEvent) => void,
        onUpdate?: (update: VtonUpdateEvent) => void,
        signal?: AbortSignal
    ): Promise<void> {
        const session = getStoredSession()
        if (!session) {
            throw new Error('No active session')
        }

        const url = `${getApiUrl(API_CONFIG.ENDPOINTS.KIOSK_SESSION_STREAM)}/${session.sessionId}/stream`

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...getSessionHeaders(),
                    'Accept': 'text/event-stream',
                },
                credentials: 'include',
                signal,
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const reader = response.body?.getReader()
            if (!reader) {
                throw new Error('No response body')
            }

            const decoder = new TextDecoder()
            let buffer = ''
            let currentEventType = ''

            while (true) {
                const { done, value } = await reader.read()

                if (done) {
                    console.log('Stream ended')
                    break
                }

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || '' // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith('event:')) {
                        currentEventType = line.substring(6).trim()
                    } else if (line.startsWith('data:')) {
                        const data = JSON.parse(line.substring(5).trim())

                        switch (currentEventType) {
                            case 'vton_result':
                                onResult(data as VtonResultEvent)
                                break
                            case 'vton_error':
                                onError(data as VtonErrorEvent)
                                break
                            case 'vton_update':
                                onUpdate?.(data as VtonUpdateEvent)
                                break
                            case 'connected':
                                console.log('SSE connected:', data)
                                break
                        }
                    }
                }
            }
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                console.log('SSE stream aborted')
                return
            }
            console.error('SSE stream error:', error)
            throw error
        }
    },

    /**
     * Complete session (when user finishes or session times out)
     */
    async completeSession(): Promise<void> {
        const session = getStoredSession()
        if (!session) {
            return // No session to complete
        }

        const url = getApiUrl(`${API_CONFIG.ENDPOINTS.KIOSK_SESSION_COMPLETE}/${session.sessionId}/complete`)

        try {
            await fetch(url, {
                method: 'POST',
                headers: {
                    ...getSessionHeaders(),
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
            })
        } catch (error) {
            console.error('Session completion error:', error)
            // Don't throw - we still want to clear the session locally
        } finally {
            clearSession()
        }
    },

    /**
     * Clear session without calling the API
     */
    clearSession(): void {
        clearSession()
    },
}
