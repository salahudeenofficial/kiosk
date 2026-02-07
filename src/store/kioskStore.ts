import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '../utils/mockApi'

type KioskState = {
  // User session state
  userImage: string | null
  validated: boolean
  products: Product[]
  selectedProduct: Product | null
  selectedProducts: Product[] // Up to 3 products for try-on
  vtonResult: string | null
  vtonResults: string[] // Array of try-on result URLs
  vtonJobs: Record<string, { jobId?: string; status: string; imageUrl: string | null; error?: string }> // Job status per garment ID
  cart: Product[]
  sessionStartedAt: number
  userGender: 'male' | 'female' | null
  userHeight: string | null
  userAge: number | null // Added for new backend
  selectedSize: string | null // Selected garment size
  userImageUrl: string | null // Backend URL of uploaded image
  userMeasurements: Record<string, number> | null // User body measurements from API

  // Legacy auth (kept for compatibility)
  userToken: string | null // Auth token for API calls
  userId: number | null // User ID from signup

  // New session-based auth
  isConfigured: boolean // Whether kiosk is configured
  sessionId: string | null // Current session ID
  sessionToken: string | null // JWT token for session
  sessionUserId: number | null // User ID from session
  sessionExpiresAt: string | null // Session expiry time

  // Actions
  setUserImage: (image: string | null) => void
  setValidated: (value: boolean) => void
  setProducts: (items: Product[]) => void
  setSelectedProduct: (product: Product | null) => void
  addSelectedProduct: (product: Product) => void
  removeSelectedProduct: (id: string) => void
  clearSelectedProducts: () => void
  setVtonResult: (url: string | null) => void
  setVtonResults: (urls: string[]) => void
  updateVtonJob: (garmentId: string, status: string, imageUrl?: string | null, error?: string, jobId?: string) => void
  addToCart: (product: Product) => void
  removeFromCart: (id: string) => void
  clearCart: () => void
  setUserGender: (gender: 'male' | 'female' | null) => void
  setUserHeight: (height: string | null) => void
  setUserAge: (age: number | null) => void
  setUserToken: (token: string | null) => void
  setUserId: (id: number | null) => void
  setUserImageUrl: (url: string | null) => void
  setSelectedSize: (size: string | null) => void
  setUserMeasurements: (measurements: Record<string, number> | null) => void

  // New session actions
  setIsConfigured: (configured: boolean) => void
  setSession: (session: {
    sessionId: string
    token: string
    userId: number
    expiresAt: string
  } | null) => void

  resetAll: () => void
  resetSession: () => void // New: Reset only session state, keep config

  // UI State
  productListScrollPosition: number
  setProductListScrollPosition: (position: number) => void
}

const baseState = () => ({
  userImage: null,
  validated: false,
  products: [],
  selectedProduct: null,
  selectedProducts: [],
  vtonResult: null,
  vtonResults: [],
  vtonJobs: {},
  cart: [],
  sessionStartedAt: Date.now(),
  userGender: null,
  userHeight: null,
  userAge: null,
  userToken: null,
  userId: null,
  userImageUrl: null,
  selectedSize: null,
  userMeasurements: null,
  // New session state
  isConfigured: false,
  sessionId: null,
  sessionToken: null,
  sessionUserId: null,
  sessionExpiresAt: null,
})

export const useKioskStore = create<KioskState>()(
  persist(
    (set, get) => ({
      ...baseState(),
      setUserImage: (image) =>
        set((state) => ({
          userImage: image,
          validated: false,
          vtonResult: null,
          sessionStartedAt: image ? Date.now() : state.sessionStartedAt,
        })),
      setValidated: (value) => set({ validated: value }),
      setProducts: (items) => set({ products: items }),
      setSelectedProduct: (product) => set({ selectedProduct: product }),
      addSelectedProduct: (product) => {
        const current = get().selectedProducts
        // Check if already selected
        if (current.some((p) => p.id === product.id)) return
        // Limit to 3 products
        if (current.length >= 3) return
        set({ selectedProducts: [...current, product] })
      },
      removeSelectedProduct: (id) =>
        set((state) => ({
          selectedProducts: state.selectedProducts.filter((item) => item.id !== id),
        })),
      clearSelectedProducts: () => set({ selectedProducts: [] }),
      setVtonResult: (url) => set({ vtonResult: url }),
      setVtonResults: (urls) => set({ vtonResults: urls }),
      updateVtonJob: (garmentId, status, imageUrl, error, jobId) =>
        set((state) => {
          const currentJob = state.vtonJobs[garmentId] || {};
          return {
            vtonJobs: {
              ...state.vtonJobs,
              [garmentId]: {
                ...currentJob,
                status,
                imageUrl: imageUrl || null,
                error,
                // Only update jobId if provided, otherwise keep existing
                jobId: jobId || currentJob.jobId
              },
            },
          }
        }),
      addToCart: (product) => {
        const exists = get().cart.some((item) => item.id === product.id)
        if (exists) return
        set((state) => ({ cart: [...state.cart, product] }))
      },
      removeFromCart: (id) =>
        set((state) => ({ cart: state.cart.filter((item) => item.id !== id) })),
      clearCart: () => set({ cart: [] }),
      setUserGender: (gender) => set({ userGender: gender }),
      setUserHeight: (height) => set({ userHeight: height }),
      setUserAge: (age) => set({ userAge: age }),
      setUserToken: (token) => set({ userToken: token }),
      setUserId: (id) => set({ userId: id }),
      setUserImageUrl: (url) => set({ userImageUrl: url }),
      setSelectedSize: (size) => set({ selectedSize: size }),
      setUserMeasurements: (measurements) => set({ userMeasurements: measurements }),

      // New session actions
      setIsConfigured: (configured) => set({ isConfigured: configured }),
      setSession: (session) => {
        if (session) {
          set({
            sessionId: session.sessionId,
            sessionToken: session.token,
            sessionUserId: session.userId,
            sessionExpiresAt: session.expiresAt,
            // Also sync with legacy state for compatibility
            userToken: session.token,
            userId: session.userId,
          })
        } else {
          set({
            sessionId: null,
            sessionToken: null,
            sessionUserId: null,
            sessionExpiresAt: null,
            userToken: null,
            userId: null,
          })
        }
      },

      resetAll: () => set(() => baseState()),

      // Reset session but keep configuration status
      resetSession: () => {
        const isConfigured = get().isConfigured
        set(() => ({
          ...baseState(),
          isConfigured, // Preserve configuration status
        }))
      },
      // UI State
      productListScrollPosition: 0,
      setProductListScrollPosition: (position) => set({ productListScrollPosition: position }),
    }),
    {
      name: 'kiosk-storage',
      partialize: (state) => ({
        selectedProducts: state.selectedProducts,
        userGender: state.userGender,
        userAge: state.userAge,
        userHeight: state.userHeight,
        userImageUrl: state.userImageUrl,
        userMeasurements: state.userMeasurements,
        sessionId: state.sessionId,
        sessionToken: state.sessionToken,
        sessionUserId: state.sessionUserId,
        sessionExpiresAt: state.sessionExpiresAt,
        isConfigured: state.isConfigured,
      }),
    }
  )
)
