import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ProductListItem } from '../utils/productApi'
import { formatPrice } from '../utils/validators'
import { isUpperGarment, isLowerGarment } from '../utils/garmentHelpers'

type PairingModalProps = {
    isOpen: boolean
    onClose: () => void
    product: ProductListItem | null
    availableProducts: ProductListItem[]
    onGenerate: (product1: ProductListItem, product2: ProductListItem) => void
}

const PairingCard = ({ product }: { product: ProductListItem }) => (
    <div className="w-full h-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 flex flex-col">
        {/* Image Area - Flexible height to fill available space */}
        <div className="flex-1 relative w-full bg-slate-50 min-h-0">
            <div className="absolute inset-0 p-4 flex items-center justify-center">
                <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                />
            </div>
        </div>

        {/* Content Area - Fixed height at bottom */}
        <div className="p-3 flex flex-col gap-0.5 border-t border-slate-50">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium truncate">
                {product.brand.name}
            </p>
            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                {product.name}
            </h4>
            <p className="text-xs font-bold text-slate-900 mt-0.5">
                {formatPrice(product.mrp)}
            </p>
        </div>
    </div>
)

const PairingModal = ({ isOpen, onClose, product, availableProducts, onGenerate }: PairingModalProps) => {
    const [activeIndex, setActiveIndex] = useState(0)
    const [candidates, setCandidates] = useState<ProductListItem[]>([])

    // Determine if the selected product is upper or lower
    const isSelectedUpper = useMemo(() => {
        if (!product) return true
        return isUpperGarment(product.category.name)
    }, [product])

    // Filter available products for the opposite category
    useEffect(() => {
        if (!product) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCandidates([])
            return
        }
        const targetIsUpper = !isSelectedUpper

        // Filter from available products
        let matches = availableProducts.filter(p => {
            // Don't include the product itself
            if (p.productId === product.productId) return false

            const pIsUpper = isUpperGarment(p.category.name)
            const pIsLower = isLowerGarment(p.category.name)

            if (targetIsUpper) return pIsUpper
            return pIsLower
        })

        // Fallback: If no strict category matches found, show ANY other product
        // This ensures the slider is always visible even if categorization fails or list is filtered
        if (matches.length === 0) {
            matches = availableProducts.filter(p => p.productId !== product.productId)
        }

        // Randomize once on mount
        setCandidates(matches.sort(() => 0.5 - Math.random())) // random is okay in effect
    }, [product, availableProducts, isSelectedUpper])

    // Current candidate
    const currentCandidate = candidates[activeIndex]

    const handleNext = () => {
        setActiveIndex((prev) => (prev + 1) % candidates.length)
    }

    const handlePrev = () => {
        setActiveIndex((prev) => (prev - 1 + candidates.length) % candidates.length)
    }

    const handleGenerate = () => {
        if (!product || !currentCandidate) return

        if (isSelectedUpper) {
            onGenerate(product, currentCandidate)
        } else {
            onGenerate(currentCandidate, product)
        }
    }

    if (!isOpen || !product) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
                    />

                    {/* Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-[90] flex items-center justify-center p-4"
                    >
                        <div
                            className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl flex flex-col overflow-hidden"
                            style={{ maxHeight: '85vh', height: '600px' }}
                        >
                            {/* Header - Close Button Only - Absolute positioned */}
                            <div className="relative z-[100]">
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-slate-100 border border-slate-100 backdrop-blur-sm transition-colors shadow-sm"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>

                            {/* Body: Stacked Cards - Flex layout to fill space without scroll */}
                            <div className="flex-1 flex flex-col p-3 gap-3 min-h-0">

                                {/* Upper Garment Slot */}
                                <div className="flex-1 min-h-0 relative group">
                                    {isSelectedUpper ? (
                                        // Static Selected Card
                                        <PairingCard product={product} />
                                    ) : (
                                        // Swipable Candidate Card
                                        <div className="relative w-full h-full">
                                            {candidates.length > 0 ? (
                                                <>
                                                    <PairingCard product={currentCandidate} />

                                                    {/* Navigation Arrows - Using z-20 to sit above card image */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-slate-800 hover:scale-110 active:scale-95 transition-all z-20 cursor-pointer"
                                                    >
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-slate-800 hover:scale-110 active:scale-95 transition-all z-20 cursor-pointer"
                                                    >
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 border-2 border-dashed border-slate-200">
                                                    No matches found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Lower Garment Slot */}
                                <div className="flex-1 min-h-0 relative group">
                                    {!isSelectedUpper ? (
                                        // Static Selected Card
                                        <PairingCard product={product} />
                                    ) : (
                                        // Swipable Candidate Card
                                        <div className="relative w-full h-full">
                                            {candidates.length > 0 ? (
                                                <>
                                                    <PairingCard product={currentCandidate} />

                                                    {/* Navigation Arrows */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-slate-800 hover:scale-110 active:scale-95 transition-all z-20 cursor-pointer"
                                                    >
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-slate-800 hover:scale-110 active:scale-95 transition-all z-20 cursor-pointer"
                                                    >
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 border-2 border-dashed border-slate-200">
                                                    No matches found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* Footer */}
                            <div className="p-4 pt-0">
                                <button
                                    onClick={handleGenerate}
                                    disabled={candidates.length === 0}
                                    className="w-full bg-black text-white font-medium py-3.5 rounded-xl text-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                                >
                                    Generate Fit
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default PairingModal
