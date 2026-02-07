export type Product = {
  id: string
  title: string
  price: number
  image: string
  description: string
  sizes: string[]
  pairedProduct?: Product
}

const sampleProducts: Product[] = [
  {
    id: '1',
    title: 'Aurora Silk Dress',
    price: 129.0,
    image:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
    description:
      'Flowing silk midi dress with subtle shimmer for evening looks.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    id: '2',
    title: 'Onyx Street Jacket',
    price: 168.0,
    image:
      'https://images.unsplash.com/photo-1496747611180-206a5c8c46c0?auto=format&fit=crop&w=800&q=80',
    description:
      'Lightweight bomber with water-resistant shell and magnetic closures.',
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    id: '3',
    title: 'Cloud Knit Sweater',
    price: 98.0,
    image:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
    description: 'Breathable knit with a relaxed drape and tonal texture.',
    sizes: ['XS', 'S', 'M', 'L'],
  },
  {
    id: '4',
    title: 'Quartz Tailored Suit',
    price: 240.0,
    image:
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
    description: 'Sleek two-piece suit with stretch lining for all-day wear.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  },
  {
    id: '5',
    title: 'Helix Tech Tee',
    price: 54.0,
    image:
      'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=800&q=80',
    description:
      'Moisture-wicking tee with bonded seams and adaptive ventilation.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    id: '6',
    title: 'Prism Denim Set',
    price: 185.0,
    image:
      'https://images.unsplash.com/photo-1496747611180-206a5c8c46c0?auto=format&fit=crop&w=800&q=80',
    description: 'Structured denim jacket and tapered pant in deep indigo.',
    sizes: ['S', 'M', 'L', 'XL'],
  },
]

import { api } from './api'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Mock implementations (fallback)
const mockValidateImage = async (_img?: string): Promise<{ success: boolean }> => {
  await delay(1200)
  return { success: true }
}

const mockFetchProducts = async (): Promise<Product[]> => {
  await delay(800)
  return sampleProducts
}

const mockGetVtonResult = async (
  product: Product,
  _userImage: string,
): Promise<{ url: string }> => {
  await delay(1800 + Math.random() * 600)
  const overlay =
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80'
  return { url: overlay || product.image }
}

// Hybrid API that tries real backend first, falls back to mock
export const mockApi = {
  async validateImage(img?: string): Promise<{ success: boolean }> {
    try {
      if (!img) return mockValidateImage()
      return await api.validateImage(img)
    } catch (error) {
      console.warn('Backend unavailable, using mock data:', error)
      return mockValidateImage(img)
    }
  },

  async fetchProducts(): Promise<Product[]> {
    try {
      return await api.fetchProducts()
    } catch (error) {
      console.warn('Backend unavailable, using mock data:', error)
      return mockFetchProducts()
    }
  },

  async getVtonResult(
    product: Product,
    userImage: string,
  ): Promise<{ url: string }> {
    return mockGetVtonResult(product, userImage)
  },
}

