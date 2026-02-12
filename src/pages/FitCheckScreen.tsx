import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import MotionFade from '../components/UI/MotionFade'
import StickFigure from '../components/FitCheck/StickFigure'
import { useKioskStore } from '../store/kioskStore'
import { unifiedKioskApi } from '../utils/unifiedKioskApi'
import type { SizeRecommendationResponse } from '../utils/kioskApi'
import './FitCheckScreen.css'

// Hardcoded Measurement Chart removed - using API data

// Measurements Configuration
// Helper types
// (Removed Point and LineSegment types as they are no longer used)
// Measurement Metadata for labels and ordering
const MEASUREMENT_METADATA: Record<string, { label: string, priority: number }> = {
    chest: { label: 'Chest', priority: 1 },
    shoulder_width: { label: 'Shoulder', priority: 2 },
    shoulder: { label: 'Shoulder', priority: 2 }, // fallback
    waist: { label: 'Waist', priority: 3 },
    hip: { label: 'Hips', priority: 4 },
    sleeve_length: { label: 'Sleeve', priority: 5 },
    inseam: { label: 'Inseam', priority: 6 },
    thigh: { label: 'Thigh', priority: 7 },
    neck: { label: 'Neck', priority: 8 },
}



// ... (Rest of existing FitCheckScreen code, but map loop updated)



const SORTED_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

interface FitCheckScreenProps {
    isOverlay?: boolean
    onClose?: () => void
}

const FitCheckScreen: React.FC<FitCheckScreenProps> = ({ isOverlay = false, onClose }) => {
    const navigate = useNavigate()
    const location = useLocation()
    const userGender = useKioskStore((state) => state.userGender)
    const setSelectedSize = useKioskStore((state) => state.setSelectedSize)

    const [isPanelOpen, setIsPanelOpen] = useState(false)
    const [selectedSize, setSize] = useState<string>('M')
    // manualScores removed

    const [recommendations, setRecommendations] = useState<SizeRecommendationResponse[]>([])
    const [loading, setLoading] = useState(true)



    // Load Data
    useEffect(() => {
        const loadData = async () => {
            let garmentIds = location.state?.garmentIds as number[] || []

            // Fallback 1: Use selected products from store if available
            if (garmentIds.length === 0) {
                const storeSelected = useKioskStore.getState().selectedProducts
                if (storeSelected.length > 0) {
                    garmentIds = storeSelected.map(p => Number(p.id))
                }
            }

            // Fallback 2: Dev mode default
            if (garmentIds.length === 0 && import.meta.env.DEV) {
                console.log('[FitCheck] No garments found, using mock ID for dev')
                garmentIds = [1001]
            }

            if (garmentIds.length === 0) {
                console.warn("No garment IDs passed to FitCheck")
                setLoading(false)
                return
            }

            try {
                const results = await Promise.all(
                    garmentIds.map(id => unifiedKioskApi.getSizeRecommendation(id))
                )
                console.log('[FitCheck] Raw API Response:', results)
                setRecommendations(results)

                // Set default size from first result if available
                if (results[0]?.recommended_size) {
                    setSize(results[0].recommended_size)
                }
            } catch (err) {
                console.error("Failed to load size recommendations", err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [location.state])

    // Get selected size details for rendering
    const selectedSizeDetails = useMemo(() => {
        const rec = recommendations[0] // Assuming single product for now or taking first
        if (!rec?.all_sizes) return null
        return rec.all_sizes.find(s => s.size === selectedSize)?.details || null
    }, [recommendations, selectedSize])



    // Calculate loose scores for StickFigure
    const looseScores = useMemo(() => {
        const scores: Record<string, number | null> = {
            chest: null, waist: null, shoulder: null, hip: null
        }

        if (selectedSizeDetails) {
            Object.entries(selectedSizeDetails).forEach(([key, detail]) => {
                // Map keys to standard stick figure keys (chest, waist, shoulder, hip)
                let stickKey: string | null = key
                if (key === 'shoulder_width') stickKey = 'shoulder'

                if (stickKey && stickKey in scores) {
                    if (typeof detail.diff_cm === 'number') {
                        scores[stickKey] = detail.diff_cm
                    } else {
                        scores[stickKey] = detail.chart - detail.user
                    }
                }
            })
        }

        console.log('[FitCheck] Computed Loose Scores:', scores)
        return scores
    }, [selectedSizeDetails])


    const handleBack = () => {
        if (isOverlay && onClose) {
            onClose()
        } else {
            navigate(-1)
        }
    }

    const handleDone = () => {
        if (setSelectedSize) {
            setSelectedSize(selectedSize)
        }
        if (isOverlay && onClose) {
            onClose()
        } else {
            navigate('/tryon-results')
        }
    }

    // Sort keys for display
    const sortedMeasurementKeys = useMemo(() => {
        if (!selectedSizeDetails) return []
        return Object.keys(selectedSizeDetails).sort((a, b) => {
            const pA = MEASUREMENT_METADATA[a]?.priority || 99
            const pB = MEASUREMENT_METADATA[b]?.priority || 99
            return pA - pB
        })
    }, [selectedSizeDetails])

    return (
        <MotionFade>
            <div className="fixed inset-0 bg-white text-slate-900 z-50 overflow-y-auto">
                {/* Back Button */}
                <button
                    className="absolute top-4 left-4 z-50 p-2 rounded-full hover:bg-slate-100 transition-colors"
                    onClick={handleBack}
                    aria-label="Go Back"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <div className="max-w-4xl mx-auto px-6 py-8 pb-24">
                    {/* Header */}
                    <header className="text-center mb-8 pt-12">
                        <h1 className="fit-check-heading text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight pb-3 border-b-2 border-slate-200 inline-block mx-auto mb-4">
                            Fit Check
                        </h1>
                        <p className="text-base text-slate-500 max-w-md mx-auto leading-relaxed">
                            Personal fit recommendation based on your measurements
                        </p>
                    </header>

                    {/* Main Content Container */}
                    <div className="relative">
                        {/* Measurements Panel (Collapsible from Left) */}
                        <div className={`fit-measurements-panel ${isPanelOpen ? '' : 'collapsed'}`}>
                            <div className="fit-panel-header">
                                <span className="fit-panel-title">MEASUREMENTS</span>
                            </div>

                            {/* List Header */}
                            <div className="fit-list-header">
                                <div>Body Part</div>
                                <div>Your Size</div>
                                <div>Garment Size</div>
                                <div>Difference</div>
                            </div>

                            {/* Measurement Rows */}
                            {sortedMeasurementKeys.length > 0 ? (
                                sortedMeasurementKeys.map(key => {
                                    const detail = selectedSizeDetails![key]
                                    const meta = MEASUREMENT_METADATA[key] || { label: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ') }

                                    const userVal = detail.user
                                    const chartVal = detail.chart
                                    const diff = detail.diff_cm

                                    return (
                                        <div
                                            key={key}
                                            className="fit-measurement-row"
                                        >
                                            <div className="fit-m-label">{meta.label}</div>
                                            <div className="fit-m-value">
                                                {userVal ? `${userVal.toFixed(1)} cm` : '--'}
                                            </div>
                                            <div className="fit-m-value">
                                                {typeof chartVal === 'number' ? `${chartVal.toFixed(1)} cm` : '--'}
                                            </div>
                                            <div className="fit-m-value" style={{
                                                color: diff !== null ? (Math.abs(diff) <= 2 ? '#22c55e' : (diff < 0 ? '#ef4444' : '#3b82f6')) : 'inherit',
                                                fontWeight: '600'
                                            }}>
                                                {diff !== null ? (diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)) : '--'} cm
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="p-4 text-slate-400 text-center italic">
                                    Select a size to see measurement details
                                </div>
                            )}
                        </div>

                        {/* Panel Toggle */}
                        <button
                            className={`fit-panel-toggle ${isPanelOpen ? '' : 'collapsed'}`}
                            onClick={() => setIsPanelOpen(!isPanelOpen)}
                            aria-label="Toggle Measurements"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={`fit-toggle-icon ${isPanelOpen ? 'open' : ''}`}>
                                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="fit-toggle-label">MEASUREMENTS</span>
                        </button>

                        {/* Content Card */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-200/50">
                            <div className="relative flex flex-col items-center justify-center mb-8">
                                {/* Image Container */}
                                <div className="relative w-full max-w-md mx-auto">
                                    <StickFigure scores={looseScores} gender={userGender || undefined} />
                                </div>
                            </div>

                            {/* Size Toggle Buttons */}
                            <div className="flex flex-col items-center mb-8">
                                <div className="flex flex-wrap gap-2 justify-center mb-2">
                                    {SORTED_SIZES.map(size => {
                                        // Use logic: Show unless explicitly missing from response
                                        // If no recommendations yet (loading), show all
                                        // If recommendations exist, check if size is in `all_sizes`

                                        const isAvailable = recommendations.length === 0 ||
                                            recommendations.some(rec =>
                                                rec.all_sizes?.some(s => s.size === size && !!s.details)
                                            );

                                        if (!isAvailable) return null;

                                        return (
                                            <button
                                                key={size}
                                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${size === selectedSize
                                                    ? 'bg-black text-white border-2 border-black shadow-lg'
                                                    : 'bg-white text-slate-500 border-2 border-slate-200 hover:border-slate-400'
                                                    }`}
                                                onClick={() => setSize(size)}
                                            >
                                                {size}
                                            </button>
                                        )
                                    })}
                                    {recommendations.length === 0 && !loading && (
                                        <div className="text-slate-400 text-sm">No size data available</div>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Try other sizes to see how the fit changes</p>
                            </div>

                            {/* Color Reference Gradient Bar */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                                <div className="relative h-4 rounded-full overflow-hidden mb-2" style={{
                                    background: 'linear-gradient(to right, #ef4444 0%, #f97316 33%, #22c55e 66%, #3b82f6 100%)'
                                }}>
                                    {/* Gradient only for reference */}
                                </div>
                                <div className="flex justify-between text-xs font-semibold text-slate-500 px-1">
                                    <span style={{ color: '#ef4444' }}>Tight</span>
                                    <span style={{ color: '#f97316' }}>Slightly Tight</span>
                                    <span style={{ color: '#22c55e' }}>Perfect</span>
                                    <span style={{ color: '#3b82f6' }}>Loose</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Done Button */}
                    <div className="flex justify-center mt-8">
                        <button
                            className="px-8 py-4 bg-black text-white rounded-xl text-lg font-bold shadow-xl hover:bg-slate-800 transition-colors flex items-center gap-2"
                            onClick={handleDone}
                        >
                            Done
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </MotionFade>
    )
}

export default FitCheckScreen
