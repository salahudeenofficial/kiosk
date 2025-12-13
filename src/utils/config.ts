// Backend API configuration
export const API_CONFIG = {
  // Backend URL - can be set via environment variable or default to empty for proxy
  // Use empty string for relative URLs (vite proxy), or explicit URL for direct backend
  BASE_URL:
    import.meta.env.VITE_API_BASE_URL !== undefined
      ? import.meta.env.VITE_API_BASE_URL
      : '',

  // Kiosk configuration
  KIOSK_ID: import.meta.env.VITE_KIOSK_ID || 'kiosk-001',
  KIOSK_PASSWORD: import.meta.env.VITE_KIOSK_PASSWORD || 'kiosk-default-password',

  // API endpoints
  ENDPOINTS: {
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
}

// Generate random string for unique username
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

