// Backend API configuration
export const API_CONFIG = {
  // Backend URL - will be set via environment variable or placeholder for now
  // In production, this should be set via VITE_API_BASE_URL environment variable
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '',

  // Kiosk configuration - these are now set via the configuration screen
  // and stored in localStorage
  KIOSK_ID: import.meta.env.VITE_KIOSK_ID || '',
  KIOSK_PASSWORD: import.meta.env.VITE_KIOSK_PASSWORD || '',

  // API endpoints - New Kiosk API
  ENDPOINTS: {
    // Kiosk Auth & Session
    KIOSK_CONFIGURE: '/api/kiosk/auth/configure',
    KIOSK_SESSIONS: '/api/kiosk/sessions',
    KIOSK_SESSION_UPDATE: '/api/kiosk/sessions', // + /{session_id} - PATCH
    KIOSK_SESSION_COMPLETE: '/api/kiosk/sessions', // + /{session_id}/complete - POST
    KIOSK_SESSION_IMAGE: '/api/kiosk/sessions', // + /{session_id}/image - POST
    KIOSK_SESSION_VTON: '/api/kiosk/sessions', // + /{session_id}/vton - POST
    KIOSK_SESSION_STREAM: '/api/kiosk/sessions', // + /{session_id}/stream - GET SSE
    KIOSK_SESSION_MEASUREMENTS: '/api/kiosk/sessions', // + /{session_id}/measurements - GET

    // Catalog
    KIOSK_CATALOG: '/api/kiosk/catalog',
    KIOSK_CATALOG_FILTERS: '/api/kiosk/catalog/filters',

    // Legacy endpoints (kept for compatibility during transition)
    VALIDATE_IMAGE: '/api/validate-image',
    UPLOAD_IMAGE: '/api/users/image/kiosk',
    PRODUCTS: '/api/products',
    PRODUCTS_LIST: '/api/products/list',
    PRODUCT_DETAILS: '/api/products/details',
    VTON: '/api/vton/manual',
    VTON_RESULT: '/api/vton/result/image',
    SIGNUP: '/api/auth/signup',
    USER_DETAILS: '/api/users/details',
  },

  // Request timeout in milliseconds
  TIMEOUT: 30000,

  // Session timeout in minutes (for reference, server controls this)
  SESSION_TIMEOUT_MINUTES: 30,

  // Max garments per VTON request
  MAX_GARMENTS_PER_SESSION: 3,
}

// Generate random string for unique username (kept for any legacy needs)
export const generateRandomString = (length: number = 8): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Helper function to build full API URL
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.BASE_URL.trim()
  // If BASE_URL is empty or just "/", use relative URL
  if (!baseUrl || baseUrl === '/') {
    return endpoint
  }
  // Ensure no double slashes between base URL and endpoint
  const cleanBase = baseUrl.replace(/\/+$/, '') // Remove trailing slashes
  const cleanEndpoint = endpoint.replace(/^\/+/, '') // Remove leading slashes
  return `${cleanBase}/${cleanEndpoint}`
}

// Kiosk configuration storage key
export const KIOSK_CONFIG_STORAGE_KEY = 'kiosk_config'
export const KIOSK_SESSION_STORAGE_KEY = 'current_session'

// Types for kiosk configuration
export type KioskConfig = {
  clientId: string
  clientSecret: string
  kioskId: string
  locationId?: number
  locationName?: string
  clientName?: string
  configuredAt?: string
}

// Types for kiosk session
export type KioskSession = {
  sessionId: string
  userId: number
  token: string  // JWT access token
  expiresAt: string
  currentStep?: string
}

// Helper to get stored kiosk config
export const getStoredKioskConfig = (): KioskConfig | null => {
  try {
    const stored = localStorage.getItem(KIOSK_CONFIG_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to parse stored kiosk config:', e)
  }
  return null
}

// Helper to store kiosk config
export const storeKioskConfig = (config: KioskConfig): void => {
  localStorage.setItem(KIOSK_CONFIG_STORAGE_KEY, JSON.stringify({
    ...config,
    configuredAt: new Date().toISOString()
  }))
}

// Helper to clear kiosk config
export const clearKioskConfig = (): void => {
  localStorage.removeItem(KIOSK_CONFIG_STORAGE_KEY)
}

// In-memory session storage (cleared on page reload)
let currentSession: KioskSession | null = null

// Helper to get stored session
export const getStoredSession = (): KioskSession | null => {
  return currentSession
}

// Helper to store session
export const storeSession = (session: KioskSession): void => {
  currentSession = session
}

// Helper to clear session
export const clearSession = (): void => {
  currentSession = null
}

