export const UPPER_GARMENTS = ['polo', 'shirt', 'hood', 'sweat', 'jacket', 'top', 'kurta', 'vest', 'coat', 'blazer']
export const LOWER_GARMENTS = ['jean', 'trouser', 'pant', 'short', 'skirt', 'jogger', 'bottom', 'leg', 'chino', 'track']

export const isUpperGarment = (category: string) => {
    const c = category.toLowerCase()
    return UPPER_GARMENTS.some(k => c.includes(k))
}

export const isLowerGarment = (category: string) => {
    const c = category.toLowerCase()
    return LOWER_GARMENTS.some(k => c.includes(k))
}

export const isEligibleForPairing = (category: string) => isUpperGarment(category) || isLowerGarment(category)
