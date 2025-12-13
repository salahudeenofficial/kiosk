export const getSuggestedSize = (sizes: string[]) => {
  if (!sizes.length) return 'M'
  const index = Math.floor(Math.random() * sizes.length)
  return sizes[index]
}

export const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price)

export const isPortraitStream = (width?: number, height?: number) =>
  Boolean(width && height && height > width)

