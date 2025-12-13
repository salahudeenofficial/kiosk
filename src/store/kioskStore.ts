import { create } from 'zustand'
import type { Product } from '../utils/mockApi'

type KioskState = {
  userImage: string | null
  validated: boolean
  products: Product[]
  selectedProduct: Product | null
  selectedProducts: Product[] // Up to 3 products for try-on
  vtonResult: string | null
  vtonResults: string[] // Array of try-on result URLs
  cart: Product[]
  sessionStartedAt: number
  userGender: 'male' | 'female' | null
  userHeight: string | null
  userToken: string | null // Auth token for API calls
  userId: number | null // User ID from signup
  userImageUrl: string | null // Backend URL of uploaded image
  setUserImage: (image: string | null) => void
  setValidated: (value: boolean) => void
  setProducts: (items: Product[]) => void
  setSelectedProduct: (product: Product | null) => void
  addSelectedProduct: (product: Product) => void
  removeSelectedProduct: (id: string) => void
  clearSelectedProducts: () => void
  setVtonResult: (url: string | null) => void
  setVtonResults: (urls: string[]) => void
  addToCart: (product: Product) => void
  removeFromCart: (id: string) => void
  clearCart: () => void
  setUserGender: (gender: 'male' | 'female' | null) => void
  setUserHeight: (height: string | null) => void
  setUserToken: (token: string | null) => void
  setUserId: (id: number | null) => void
  setUserImageUrl: (url: string | null) => void
  resetAll: () => void
}

const baseState = () => ({
  userImage: null,
  validated: false,
  products: [],
  selectedProduct: null,
  selectedProducts: [],
  vtonResult: null,
  vtonResults: [],
  cart: [],
  sessionStartedAt: Date.now(),
  userGender: null,
  userHeight: null,
  userToken: null,
  userId: null,
  userImageUrl: null,
})

export const useKioskStore = create<KioskState>((set, get) => ({
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
  setUserToken: (token) => set({ userToken: token }),
  setUserId: (id) => set({ userId: id }),
  setUserImageUrl: (url) => set({ userImageUrl: url }),
  resetAll: () => set(() => baseState()),
}))

