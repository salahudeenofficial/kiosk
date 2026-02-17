import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import MotionFade from '../components/UI/MotionFade'
import StickFigure from '../components/FitCheck/StickFigure'
import { useKioskStore } from '../store/kioskStore'
import { unifiedKioskApi } from '../utils/unifiedKioskApi'
import { formatPrice } from '../utils/validators'
import type { SizeRecommendationResponse } from '../utils/kioskApi'
import type { Product } from '../utils/mockApi'
import './FitCheckScreen.css'

const toCanonicalKey = (raw: string): string | null => {
    const k = raw.toLowerCase()
    if (k.includes('chest') || k.includes('bust')) return 'chest'
    if (k.includes('shoulder')) return 'shoulder'
    if (k.includes('waist')) return 'waist'
    if (k.includes('hip')) return 'hip'
    if (k.includes('sleeve') || k === 'arm right length' || k === 'arm left length') return 'sleeve_length'
    if (k.includes('inseam') || k === 'inside leg height') return 'inseam'
    if (k.includes('thigh')) return 'thigh'
    if (k.includes('neck')) return 'neck'
    if (k === 'height') return 'height'
    return null
}

const MEASUREMENT_METADATA: Record<string, { label: string, priority: number }> = {
    chest: { label: 'Chest', priority: 1 },
    shoulder: { label: 'Shoulder', priority: 2 },
    waist: { label: 'Waist', priority: 3 },
    hip: { label: 'Hips', priority: 4 },
    sleeve_length: { label: 'Sleeve', priority: 5 },
    inseam: { label: 'Inseam', priority: 6 },
    thigh: { label: 'Thigh', priority: 7 },
    neck: { label: 'Neck', priority: 8 },
    height: { label: 'Height', priority: 9 },
}

// --- Compact Garment Fit Card for kiosk ---
const GarmentFitCard = ({
    product,
    recommendation,
    selectedSize,
    onSizeSelect,
    label,
}: {
    product: Product
    recommendation: SizeRecommendationResponse | null
    selectedSize: string
    onSizeSelect: (size: string) => void
    label?: string
}) => {
    const allSizes = recommendation?.all_sizes || []
    const recommended = recommendation?.recommended_size
    const fitType = recommendation?.fit_type
    const selectedSizeInfo = allSizes.find(s => s.size === selectedSize)

    // Derive size order from zone_colors keys (correct display order)
    const zoneColorKeys = recommendation?.zone_colors ? Object.keys(recommendation.zone_colors) : []
    const orderedSizes = zoneColorKeys.length > 0
        ? zoneColorKeys.map(key => allSizes.find(s => s.size === key)).filter(Boolean) as typeof allSizes
        : allSizes

    return (
        <div className="bg-white rounded-[1px] shadow-lg border border-black overflow-hidden h-full">
            {label && (
                <div className="px-3 pt-2 pb-0">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</span>
                </div>
            )}
            <div className="flex gap-3 p-3">
                {/* Product Image */}
                <div className="w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-50">
                    <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x260' }}
                    />
                </div>

                {/* Info + Sizes */}
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold truncate">
                        {product.description?.split('-')[0]?.trim() || 'Brand'}
                    </p>
                    <h3 className="text-xs font-bold text-slate-900 leading-tight mt-0.5 truncate">
                        {product.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-900 mt-0.5">
                        {formatPrice(product.price)}
                    </p>

                    {/* Size Tiles — auto-width to fit any label */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {orderedSizes.map(s => {
                            const isSelected = s.size === selectedSize
                            const isRec = s.size === recommended
                            return (
                                <button
                                    key={s.size}
                                    onClick={() => onSizeSelect(s.size)}
                                    className={`min-w-[36px] h-9 px-2.5 flex items-center justify-center text-[11px] font-bold uppercase transition-all duration-150 whitespace-nowrap
                                        ${isSelected
                                            ? 'bg-black text-white shadow-lg scale-105'
                                            : isRec
                                                ? 'bg-white text-emerald-600 border-2 border-emerald-400 hover:bg-emerald-50'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
                                        }`}
                                    style={{ fontFamily: 'Figtree, sans-serif' }}
                                >
                                    {s.size}
                                </button>
                            )
                        })}
                    </div>

                    {/* Recommendation + fit */}
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        {recommended && (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                                Recommended: {recommended}
                            </span>
                        )}
                        {fitType && (
                            <span className="text-[9px] text-slate-400">({fitType})</span>
                        )}
                        {selectedSizeInfo && (
                            <span className={`text-[9px] font-semibold ${selectedSizeInfo.fit === 'regular' ? 'text-emerald-600' : selectedSizeInfo.fit === 'tight' ? 'text-red-500' : 'text-blue-500'}`}>
                                {selectedSizeInfo.fit} fit
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

interface FitCheckScreenProps {
    isOverlay?: boolean
    onClose?: () => void
}

const FitCheckScreen: React.FC<FitCheckScreenProps> = ({ isOverlay = false, onClose }) => {
    const navigate = useNavigate()
    const location = useLocation()
    const userGender = useKioskStore((state) => state.userGender)
    const selectedProducts = useKioskStore((state) => state.selectedProducts)

    const resetSession = useKioskStore((state) => state.resetSession)
    const [isPanelOpen, setIsPanelOpen] = useState(false)
    const [selectedSizes, setSelectedSizes] = useState<Record<number, string>>({})
    const [recommendations, setRecommendations] = useState<SizeRecommendationResponse[]>([])
    const [garmentIds, setGarmentIds] = useState<number[]>([])
    const [loading, setLoading] = useState(true)

    const storedRecommendations = useKioskStore((state) => state.sizeRecommendations)

    useEffect(() => {
        const loadData = async () => {
            let garmentIds = location.state?.garmentIds as number[] || []

            if (garmentIds.length === 0) {
                const storeSelected = useKioskStore.getState().selectedProducts
                if (storeSelected.length > 0) {
                    garmentIds = storeSelected.map(p => Number(p.id))
                }
            }

            if (garmentIds.length === 0 && import.meta.env.DEV) {
                console.log('[FitCheck] No garments found, using mock ID for dev')
                garmentIds = [1001]
            }

            if (garmentIds.length === 0) {
                console.warn("No garment IDs passed to FitCheck")
                setLoading(false)
                return
            }

            setGarmentIds(garmentIds)

            try {
                const results = await Promise.all(
                    garmentIds.map(async (id) => {
                        const stored = storedRecommendations[id.toString()]
                        if (stored && stored.measurement_status !== 'processing') {
                            return stored
                        }
                        return unifiedKioskApi.getSizeRecommendation(id)
                    })
                )
                setRecommendations(results)

                const initialSizes: Record<number, string> = {}
                garmentIds.forEach((gid, idx) => {
                    const rec = results[idx]
                    if (rec?.recommended_size) {
                        initialSizes[gid] = rec.recommended_size
                    } else if (rec?.all_sizes?.length > 0) {
                        initialSizes[gid] = rec.all_sizes[0].size
                    } else {
                        initialSizes[gid] = 'M'
                    }
                })
                setSelectedSizes(initialSizes)
            } catch (err) {
                console.error("Failed to load size recommendations", err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [location.state, storedRecommendations])

    const perGarmentDetails = useMemo(() => {
        return recommendations.map((rec, idx) => {
            const gid = garmentIds[idx]
            const size = selectedSizes[gid]
            if (!size || !rec?.all_sizes) return null
            const sizeOption = rec.all_sizes.find(s => s.size === size)
            return sizeOption?.details || null
        })
    }, [recommendations, selectedSizes, garmentIds])

    const selectedSizeDetails = perGarmentDetails[0] || null

    // Extract zone colors directly from API response for the selected size
    const stickFigureColors = useMemo(() => {
        const colors: Record<string, string> = {}
        for (let idx = 0; idx < recommendations.length; idx++) {
            const rec = recommendations[idx]
            const gid = garmentIds[idx]
            const size = selectedSizes[gid]
            if (!size || !rec?.zone_colors?.[size]) continue
            const zoneMap = rec.zone_colors[size]
            Object.entries(zoneMap).forEach(([key, color]) => {
                const stickKey = toCanonicalKey(key)
                if (stickKey && !colors[stickKey]) {
                    colors[stickKey] = color
                }
            })
        }
        return colors
    }, [recommendations, selectedSizes, garmentIds])

    const handleBack = () => {
        if (isOverlay && onClose) {
            onClose()
        } else {
            navigate(-1)
        }
    }

    const displayMeasurements = useMemo(() => {
        const seen = new Map<string, { canonKey: string; value: number }>()
        const userM = recommendations[0]?.user_measurements
        if (userM) {
            Object.entries(userM).forEach(([key, val]) => {
                const canon = toCanonicalKey(key)
                if (canon && typeof val === 'number' && !seen.has(canon)) {
                    seen.set(canon, { canonKey: canon, value: val })
                }
            })
        }
        if (selectedSizeDetails) {
            Object.entries(selectedSizeDetails).forEach(([key, detail]) => {
                const canon = toCanonicalKey(key)
                if (canon && typeof detail.user === 'number') {
                    seen.set(canon, { canonKey: canon, value: detail.user })
                }
            })
        }
        return Array.from(seen.values()).sort((a, b) => {
            const pA = MEASUREMENT_METADATA[a.canonKey]?.priority || 99
            const pB = MEASUREMENT_METADATA[b.canonKey]?.priority || 99
            return pA - pB
        })
    }, [selectedSizeDetails, recommendations])

    const isPaired = garmentIds.length > 1

    // Build garment card data
    const garmentCards = garmentIds.map((gid, idx) => {
        const product = selectedProducts.find(p => p.id === gid.toString())
        const pairedParent = selectedProducts.find(p => p.pairedProduct?.id === gid.toString())
        const productData: Product | null = product
            || (pairedParent?.pairedProduct ? {
                id: pairedParent.pairedProduct.id,
                title: pairedParent.pairedProduct.title,
                price: pairedParent.pairedProduct.price,
                image: pairedParent.pairedProduct.image,
                description: pairedParent.pairedProduct.description,
                sizes: pairedParent.pairedProduct.sizes || [],
            } : null)

        const rec = recommendations[idx] || null
        if (!productData) return null

        const label = isPaired
            ? (idx === 0 ? 'Upper' : 'Lower')
            : undefined

        return { gid, productData, rec, label }
    }).filter(Boolean) as { gid: number; productData: Product; rec: SizeRecommendationResponse | null; label?: string }[]

    return (
        <MotionFade>
            <div className="fixed inset-0 bg-white text-slate-900 z-50 overflow-hidden flex flex-col">

                {/* Top Bar */}
                <div className="flex-shrink-0 relative flex items-center justify-center px-4 pt-8 pb-6">
                    <button
                        className="absolute left-4 w-10 h-10 flex items-center justify-center rounded-full border border-black hover:bg-slate-100 transition-colors"
                        onClick={handleBack}
                        aria-label="Go Back"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-light tracking-[0.2em] uppercase text-slate-900 text-center" style={{ fontFamily: 'Figtree, sans-serif' }}>Fit Intelligence</h1>
                    <button
                        className="absolute right-4 w-10 h-10 flex items-center justify-center rounded-full border border-black hover:bg-slate-100 transition-colors"
                        onClick={async () => {
                            try { await unifiedKioskApi.completeSession() } catch {}
                            resetSession()
                            navigate('/')
                        }}
                        aria-label="Close"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* === Hero: Stick Figure with side indicators === */}
                <div className="flex-1 min-h-0 flex flex-row">

                    {/* Left: Vertical color indicator */}
                    <div className="flex-shrink-0 w-16 flex flex-col items-center justify-center pl-3 pr-1">
                        <div className="flex flex-col items-center" style={{ height: '200px' }}>
                            <span className="text-[9px] font-bold text-blue-500 mb-1.5">Loose</span>
                            <div className="w-3 rounded-full overflow-hidden flex-1">
                                <div className="w-full h-full" style={{
                                    background: 'linear-gradient(to bottom, #3b82f6 0%, #22c55e 33%, #f97316 66%, #ef4444 100%)'
                                }} />
                            </div>
                            <span className="text-[9px] font-bold text-red-500 mt-1.5">Tight</span>
                        </div>
                    </div>

                    {/* Center: Stick Figure — 60% size, centered */}
                    <div className="flex-1 min-w-0 flex items-center justify-center">
                        <div style={{ width: '60%', height: '60%' }}>
                            <StickFigure colors={stickFigureColors} gender={userGender || undefined} />
                        </div>
                    </div>

                    {/* Right: Measurements panel — same 200px height as color indicator */}
                    <div className="flex-shrink-0 w-16 flex flex-col items-center justify-center pr-3 pl-1">
                        <button
                            onClick={() => setIsPanelOpen(!isPanelOpen)}
                            className="relative flex flex-col items-center justify-center gap-2 group"
                            style={{ height: '200px' }}
                        >
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors flex-shrink-0">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                                    <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 4-6" />
                                </svg>
                            </div>
                            <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                Measurements
                            </span>
                        </button>

                        {/* Measurements popup */}
                        {isPanelOpen && (
                            <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 min-w-[160px] z-30">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Your Measurements</p>
                                {displayMeasurements.length > 0 ? (
                                    <div className="space-y-2">
                                        {displayMeasurements.map(({ canonKey, value }) => {
                                            const meta = MEASUREMENT_METADATA[canonKey] || { label: canonKey }
                                            return (
                                                <div key={canonKey} className="flex justify-between gap-4 text-xs">
                                                    <span className="text-slate-500">{meta.label}</span>
                                                    <span className="font-mono text-slate-800 font-semibold">{value.toFixed(1)} cm</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 text-center italic">No data</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* === Bottom: Garment Cards === */}
                <div className="flex-shrink-0 px-4 pb-32 pt-2">
                    {isPaired ? (
                        /* Paired: two cards side by side */
                        <div className="flex gap-3 items-stretch">
                            {garmentCards.map((card) => (
                                <div key={card.gid} className="flex-1 min-w-0 flex">
                                    <GarmentFitCard
                                        product={card.productData}
                                        recommendation={card.rec}
                                        selectedSize={selectedSizes[card.gid] || 'M'}
                                        onSizeSelect={(size) => setSelectedSizes(prev => ({ ...prev, [card.gid]: size }))}
                                        label={card.label}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Single: one card centered below */
                        <div className="max-w-[420px] mx-auto">
                            {garmentCards.map(card => (
                                <GarmentFitCard
                                    key={card.gid}
                                    product={card.productData}
                                    recommendation={card.rec}
                                    selectedSize={selectedSizes[card.gid] || 'M'}
                                    onSizeSelect={(size) => setSelectedSizes(prev => ({ ...prev, [card.gid]: size }))}
                                />
                            ))}
                        </div>
                    )}

                    {garmentIds.length === 0 && !loading && (
                        <p className="text-slate-400 text-sm text-center py-4">No garment data available</p>
                    )}
                </div>
            </div>
        </MotionFade>
    )
}

export default FitCheckScreen
