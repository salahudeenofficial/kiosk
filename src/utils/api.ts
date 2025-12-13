import { API_CONFIG, getApiUrl, generateRandomString } from './config'
import type { Product } from './mockApi'

// API response types
type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
  }
}

type SignupResponse = {
  user: {
    id: number
    email: string
    name: string
  }
  token: string
}

type UserDetailsResponse = {
  user: {
    id: number
    email: string
    name: string
    gender?: string | null
    age?: number | null
    height?: number | null
    weight?: number | null
    imageUrl?: string | null
    skinTone?: string | null
    initialStyleVectorGenerated?: boolean
  }
}

// Helper function for API requests
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = getApiUrl(endpoint)

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error)
    throw error
  }
}

// Real API implementation
export const api = {
  /**
   * Signup user with kiosk credentials
   */
  async signup(): Promise<SignupResponse> {
    const randomString = generateRandomString(8)
    const username = `${API_CONFIG.KIOSK_ID}-${randomString}`
    const email = `${username}@${API_CONFIG.KIOSK_ID}.com`

    const response = await apiRequest<ApiResponse<SignupResponse>>(
      API_CONFIG.ENDPOINTS.SIGNUP,
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: API_CONFIG.KIOSK_PASSWORD,
          name: username,
        }),
      },
    )

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Signup failed')
    }

    return response.data
  },

  /**
   * Update user details (gender, height, etc.)
   */
  async updateUserDetails(
    token: string,
    gender?: string,
    height?: number,
  ): Promise<UserDetailsResponse> {
    const body: { gender?: string; height?: number } = {}
    if (gender) body.gender = gender
    if (height) body.height = parseFloat(height.toString())

    const response = await apiRequest<ApiResponse<UserDetailsResponse>>(
      API_CONFIG.ENDPOINTS.USER_DETAILS,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      },
    )

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Update user details failed')
    }

    // Validate that gender and height are correctly updated
    const user = response.data.user
    if (gender && user.gender !== gender) {
      throw new Error('Gender was not updated correctly')
    }
    if (height && Math.abs((user.height || 0) - parseFloat(height.toString())) > 0.1) {
      throw new Error('Height was not updated correctly')
    }

    return response.data
  },

  /**
   * Validate user image
   */
  async validateImage(imageData: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(API_CONFIG.ENDPOINTS.VALIDATE_IMAGE, {
      method: 'POST',
      body: JSON.stringify({ image: imageData }),
    })
  },

  /**
   * Fetch all products
   */
  async fetchProducts(): Promise<Product[]> {
    return apiRequest<Product[]>(API_CONFIG.ENDPOINTS.PRODUCTS, {
      method: 'GET',
    })
  },

  /**
   * Create a VTON job for a specific garment
   * Uses headers for user ID and garment ID as per API spec
   */
  async createVtonJob(
    token: string,
    userId: number,
    garmentProductId: number | string,
  ): Promise<{ job_id: string; garment_id: number; status: string }> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.VTON)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-ID': userId.toString(),
          'X-Garment-ID': garmentProductId.toString(),
        },
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 401) {
          throw new Error('Authentication failed. Please restart the session.')
        }
        if (response.status === 400) {
          throw new Error(errorData.detail || 'Invalid request. Please check your image.')
        }
        if (response.status === 404) {
          throw new Error(errorData.detail || 'Garment not found.')
        }
        throw new Error(errorData.detail || `VTON request failed: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('VTON job creation error:', error)
      throw error
    }
  },

  /**
   * Get VTON result image for a specific user + garment
   * Returns blob URL if image is ready, null if still processing
   * Throws error on authentication/permanent failures
   */
  async getVtonResultImage(
    token: string,
    userId: number,
    garmentProductId: number | string,
  ): Promise<string | null> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.VTON_RESULT)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-ID': userId.toString(),
          'X-Garment-ID': garmentProductId.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      })

      if (response.status === 404) {
        // Job still processing or not found - this is expected during polling
        return null
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 401) {
          throw new Error('Authentication failed. Please restart the session.')
        }
        throw new Error(errorData.detail || `Failed to get result: ${response.status}`)
      }

      // Success - convert blob to URL
      const blob = await response.blob()
      return URL.createObjectURL(blob)
    } catch (error) {
      // Re-throw auth errors, but treat network errors as "not ready"
      if (error instanceof Error && error.message.includes('Authentication')) {
        throw error
      }
      console.warn('VTON result polling error:', error)
      return null
    }
  },

  /**
   * Upload user image to backend
   * Converts base64 data URL to File and sends as multipart/form-data
   */
  async uploadUserImage(
    token: string,
    imageDataUrl: string,
  ): Promise<{ imageUrl: string; imageId: string }> {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.UPLOAD_IMAGE)

    // Convert base64 data URL to Blob
    const response = await fetch(imageDataUrl)
    const blob = await response.blob()

    // Debug: Log the image being uploaded
    console.log(`[Upload] Image blob size: ${(blob.size / 1024).toFixed(1)} KB, type: ${blob.type}`)

    // Determine file extension from mime type
    const mimeType = blob.type || 'image/jpeg'
    const extension = mimeType.split('/')[1] || 'jpg'
    const filename = `user-image-${Date.now()}.${extension}`

    // Create File object
    const file = new File([blob], filename, { type: mimeType })
    console.log(`[Upload] Uploading file: ${filename}, size: ${(file.size / 1024).toFixed(1)} KB`)

    // Create FormData
    const formData = new FormData()
    formData.append('image', file)

    try {
      const apiResponse = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Note: Do NOT set Content-Type header - browser will set it with boundary
        },
        body: formData,
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      })

      if (!apiResponse.ok) {
        if (apiResponse.status === 401) {
          throw new Error('Authentication failed. Please restart the session.')
        }
        throw new Error(`Upload failed: ${apiResponse.status} ${apiResponse.statusText}`)
      }

      const data = await apiResponse.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Image upload failed')
      }

      return {
        imageUrl: data.data.imageUrl,
        imageId: data.data.imageId,
      }
    } catch (error) {
      console.error('Image upload error:', error)
      throw error
    }
  },
}

