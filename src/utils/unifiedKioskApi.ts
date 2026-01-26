/**
 * Unified Kiosk API - Automatically switches between real and mock API
 * 
 * This wrapper allows the Debug Panel to switch between real and mock mode
 * without changing the code in individual components.
 */

import { kioskApi, type VtonResultEvent, type VtonErrorEvent, type CatalogFiltersResponse } from './kioskApi'
import { productApi, type ProductDetails } from './productApi'
import { mockKioskApi, MOCK_CONFIG } from './mockKioskApi'
import type { KioskSession, KioskConfig } from './config'

// Re-export types for convenience
export type { VtonResultEvent, VtonErrorEvent }

// Check if we should use mock mode
const shouldUseMock = (): boolean => {
    return MOCK_CONFIG.ENABLED || import.meta.env.VITE_API_MODE === 'mock'
}

// Unified API that delegates to either real or mock
export const unifiedKioskApi = {
    // Configuration
    async configure(clientId: string, clientSecret: string, kioskId: string) {
        console.log(`[UnifiedAPI] configure - mode: ${shouldUseMock() ? 'MOCK' : 'REAL'}`)

        if (shouldUseMock()) {
            return mockKioskApi.configure(clientId, clientSecret, kioskId)
        }
        return kioskApi.configure(clientId, clientSecret, kioskId)
    },

    isConfigured(): boolean {
        return kioskApi.isConfigured()
    },

    getConfig(): KioskConfig | null {
        return kioskApi.getConfig()
    },

    // Session
    async createSession() {
        console.log(`[UnifiedAPI] createSession - mode: ${shouldUseMock() ? 'MOCK' : 'REAL'}`)

        if (shouldUseMock()) {
            const mockResult = await mockKioskApi.createSession()
            // Store in the same place as real API for consistency
            return {
                sessionId: mockResult.session_id,
                userId: mockResult.user_id,
                token: mockResult.token,
                expiresAt: mockResult.expires_at,
            } as KioskSession
        }
        return kioskApi.createSession()
    },

    getSession(): KioskSession | null {
        if (shouldUseMock()) {
            const mockState = mockKioskApi.getSessionState()
            if (mockState.sessionId) {
                return {
                    sessionId: mockState.sessionId,
                    userId: mockState.userId!,
                    token: mockState.token!,
                    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                }
            }
            return null
        }
        return kioskApi.getSession()
    },

    // Profile
    async updateProfile(age?: number, height?: number, gender?: string) {
        console.log(`[UnifiedAPI] updateProfile - mode: ${shouldUseMock() ? 'MOCK' : 'REAL'}`)

        if (shouldUseMock()) {
            return mockKioskApi.updateProfile(age, height)
        }
        return kioskApi.updateProfile(age, height, gender)
    },

    // Image upload
    async uploadImage(imageFile: File | Blob) {
        console.log(`[UnifiedAPI] uploadImage - mode: ${shouldUseMock() ? 'MOCK' : 'REAL'}`)

        if (shouldUseMock()) {
            return mockKioskApi.uploadImage(imageFile)
        }
        return kioskApi.uploadImage(imageFile)
    },

    async uploadImageFromDataUrl(dataUrl: string) {
        console.log(`[UnifiedAPI] uploadImageFromDataUrl - mode: ${shouldUseMock() ? 'MOCK' : 'REAL'}`)

        if (shouldUseMock()) {
            // Convert to blob for mock API
            const response = await fetch(dataUrl)
            const blob = await response.blob()
            return mockKioskApi.uploadImage(blob)
        }
        return kioskApi.uploadImageFromDataUrl(dataUrl)
    },

    // Catalog Filters
    async getCatalogFilters(filters: {
        gender?: string
        search?: string
    } = {}): Promise<CatalogFiltersResponse> {
        console.log(`[UnifiedAPI] getCatalogFilters - mode: ${shouldUseMock() ? 'MOCK' : 'REAL'}`)

        if (shouldUseMock()) {
            const { MOCK_PRODUCTS, CATEGORIES } = await import('./mockKioskApi')
            let filteredCategories = [...CATEGORIES]
            let filteredProducts = [...MOCK_PRODUCTS]

            if (filters.gender) {
                filteredProducts = filteredProducts.filter(p => p.category.gender === filters.gender)
                filteredCategories = filteredCategories.filter(c => c.gender === filters.gender)
            }

            if (filters.search) {
                const searchLower = filters.search.toLowerCase()
                filteredProducts = filteredProducts.filter(p =>
                    p.name.toLowerCase().includes(searchLower) ||
                    p.brand.name.toLowerCase().includes(searchLower)
                )
            }

            const brandMap = new Map<number, { id: number; name: string }>()
            const categoryMap = new Map<number, { id: number; name: string; gender: string }>()
            filteredProducts.forEach(p => {
                if (p.brand && !brandMap.has(p.brand.id)) brandMap.set(p.brand.id, p.brand)
                if (p.category && !categoryMap.has(p.category.id)) categoryMap.set(p.category.id, p.category)
            })

            const prices = filteredProducts.map(p => p.mrp).filter(p => p > 0)
            const minPrice = prices.length > 0 ? Math.min(...prices) : 0
            const maxPrice = prices.length > 0 ? Math.max(...prices) : 0

            // When gender is omitted, return all categories (all genders). Otherwise use gender-filtered.
            const categories =
                filters.gender
                    ? Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name))
                    : [...CATEGORIES].sort((a, b) => a.name.localeCompare(b.name))

            return {
                brands: Array.from(brandMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
                categories,
                price_range: { min: minPrice, max: maxPrice },
            }
        }
        return kioskApi.getCatalogFilters(filters)
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
    } = {}) {
        console.log(`[UnifiedAPI] loadCatalog - mode: ${shouldUseMock() ? 'MOCK' : 'REAL'}`)

        if (shouldUseMock()) {
            return mockKioskApi.loadCatalog(filters)
        }
        return kioskApi.loadCatalog(filters)
    },

    // Product Details
    async getProductDetails(productId: number): Promise<ProductDetails> {
        console.log(`[UnifiedAPI] getProductDetails - mode: ${shouldUseMock() ? 'MOCK' : 'REAL'}`)

        if (shouldUseMock()) {
            return mockKioskApi.getProductDetails(productId)
        }
        return productApi.getProductDetails(productId)
    },

    // VTON
    async requestVton(garmentIds: number[]) {
        console.log(`[UnifiedAPI] requestVton - mode: ${shouldUseMock() ? 'MOCK' : 'REAL'}`)

        if (shouldUseMock()) {
            return mockKioskApi.requestVton(garmentIds)
        }
        return kioskApi.requestVton(garmentIds)
    },

    // For mock mode, we simulate SSE with polling
    startVtonStream(
        onResult: (result: VtonResultEvent) => void,
        onError: (error: VtonErrorEvent) => void,
        onUpdate?: (update: { job_id: string; status: string }) => void,
        onConnectionError?: (error: Error) => void
    ): EventSource | null {
        console.log(`[UnifiedAPI] startVtonStream - mode: ${shouldUseMock() ? 'MOCK' : 'REAL'}`)

        if (shouldUseMock()) {
            // For mock mode, we'll simulate results using the mock VTON function
            // This won't return an EventSource, so components using this in mock mode
            // should check for null return
            console.log('[UnifiedAPI] Mock mode - SSE not available, use polling instead')
            return null
        }
        return kioskApi.startVtonStream(onResult, onError, onUpdate, onConnectionError)
    },

    // Get user measurements
    async getMeasurements(): Promise<{ status: string; measurements: Record<string, number> | null }> {
        console.log(`[UnifiedAPI] getMeasurements - mode: ${shouldUseMock() ? 'MOCK' : 'REAL'}`)

        if (shouldUseMock()) {
            // Mock API already returns parsed measurements
            return mockKioskApi.getUserMeasurements()
        }

        // Real API returns CSV string
        const response = await kioskApi.getMeasurements()

        let parsedMeasurements: Record<string, number> | null = null
        if (response.measurements) {
            parsedMeasurements = {}
            const lines = response.measurements.split('\n')
            for (const line of lines) {
                if (!line.trim()) continue

                // Handle CSV line "key,value"
                // Find last comma to separate value (in case key has commas, though unlikely)
                const lastCommaIndex = line.lastIndexOf(',')
                if (lastCommaIndex !== -1) {
                    const key = line.substring(0, lastCommaIndex).trim()
                    const valueStr = line.substring(lastCommaIndex + 1).trim()
                    const value = parseFloat(valueStr)

                    if (key && !isNaN(value)) {
                        parsedMeasurements[key] = value
                    }
                }
            }
        }

        return {
            status: response.status,
            measurements: parsedMeasurements
        }
    },

    // Session completion
    async completeSession() {
        console.log(`[UnifiedAPI] completeSession - mode: ${shouldUseMock() ? 'MOCK' : 'REAL'}`)

        if (shouldUseMock()) {
            return mockKioskApi.completeSession()
        }
        return kioskApi.completeSession()
    },

    clearSession() {
        if (shouldUseMock()) {
            mockKioskApi.resetSession()
        }
        kioskApi.clearSession()
    },

    // Mock-specific helpers
    getMockVtonResult: mockKioskApi.getVtonResult.bind(mockKioskApi),
    isMockMode: shouldUseMock,
}

