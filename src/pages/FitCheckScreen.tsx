import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import MotionFade from '../components/UI/MotionFade'
import StickFigure from '../components/FitCheck/StickFigure'
import { useKioskStore } from '../store/kioskStore'
import { unifiedKioskApi } from '../utils/unifiedKioskApi'
import EndSessionButton from '../components/UI/EndSessionButton'
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


interface FitCheckScreenProps {
    isOverlay?: boolean
    onClose?: () => void
}

const FitCheckScreen: React.FC<FitCheckScreenProps> = ({ isOverlay = false, onClose }) => {
    const navigate = useNavigate()
    const location = useLocation()
    const userGender = useKioskStore((state) => state.userGender)


    const [isPanelOpen, setIsPanelOpen] = useState(false)
    const [selectedSize, setSize] = useState<string>('M')
    // manualScores removed

    const [recommendations, setRecommendations] = useState<SizeRecommendationResponse[]>([])
    const [loading, setLoading] = useState(true)

    // Derive available sizes from recommendations
    const availableSizes = useMemo(() => {
        if (recommendations.length === 0) return [];
        // Aggregate all unique sizes from all recommendations
        const sizes = new Set<string>();
        recommendations.forEach(rec => {
            rec.all_sizes?.forEach(s => sizes.add(s.size));
        });

        const sizeArray = Array.from(sizes);

        // Helper to sort sizes logically
        const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL'];

        return sizeArray.sort((a, b) => {
            const aIndex = sizeOrder.indexOf(a.toUpperCase());
            const bIndex = sizeOrder.indexOf(b.toUpperCase());

            // If both are standard letter sizes, sort by index
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            // If only A is standard, A comes first
            if (aIndex !== -1) return -1;
            // If only B is standard, B comes first
            if (bIndex !== -1) return 1;

            // If both are numbers, sort numerically
            const aNum = parseFloat(a);
            const bNum = parseFloat(b);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;

            // Fallback to alphabetical
            return a.localeCompare(b);
        });
    }, [recommendations]);

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

                // Set default size logic:
                // 1. Recommended size (if exists)
                // 2. First available size in the list
                // 3. Keep current if valid? (Simplified: just reset to best guess)

                const recSize = results[0]?.recommended_size;
                if (recSize) {
                    setSize(recSize);
                } else if (results[0]?.all_sizes?.length > 0) {
                    setSize(results[0].all_sizes[0].size); // Default to first available
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
        if (!selectedSize) return null;

        // Find the first recommendation that has details for the selected size
        // We search through all recommendations (garments) to find one that supports this size
        const targetSize = selectedSize; // Case-sensitive exact match preference, but fallback?? 
        // User asked "take it as it is", so we try exact match first.

        for (const rec of recommendations) {
            if (!rec?.all_sizes) continue;

            // Try exact match first
            const sizeOption = rec.all_sizes.find(s => s.size === targetSize);
            if (sizeOption?.details) {
                return sizeOption.details;
            }
        }
        return null;
    }, [recommendations, selectedSize])

    // Calculate loose scores for StickFigure
    const looseScores = useMemo(() => {
        const scores: Record<string, number | null> = {
            chest: null, waist: null, shoulder: null, hip: null
        }

        if (selectedSizeDetails) {
            Object.entries(selectedSizeDetails).forEach(([key, detail]) => {
                // Map keys to standard stick figure keys (chest, waist, shoulder, hip)
                const normalizedKey = key.toLowerCase();
                let stickKey: string | null = null;

                if (normalizedKey.includes('chest') || normalizedKey.includes('bust')) stickKey = 'chest';
                else if (normalizedKey.includes('waist')) stickKey = 'waist';
                else if (normalizedKey.includes('shoulder')) stickKey = 'shoulder';
                else if (normalizedKey.includes('hip')) stickKey = 'hip';

                if (stickKey && stickKey in scores) {
                    // Always calculate as (Garment - User) so that:
                    // Positive = Loose (Garment is bigger) -> Blue
                    // Negative = Tight (Garment is smaller) -> Red
                    if (typeof detail.chart === 'number' && typeof detail.user === 'number') {
                        scores[stickKey] = detail.chart - detail.user
                    } else if (typeof detail.diff_cm === 'number') {
                        // Fallback: If diff_cm is provided, assume it might be (User - Garment) which caused the reverse issue.
                        // We'll flip it just in case, or stick to the manual calc preference.
                        // If the user said it's reversed, likely diff_cm was (User - Garment).
                        // Let's invert it if we are forced to use it.
                        scores[stickKey] = -detail.diff_cm
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

    // Sort keys for display
    const sortedMeasurementKeys = useMemo(() => {
        const detailKeys = selectedSizeDetails ? Object.keys(selectedSizeDetails) : [];
        const userKeys = recommendations[0]?.user_measurements ? Object.keys(recommendations[0].user_measurements) : [];

        // Merge unique keys
        const allKeys = Array.from(new Set([...detailKeys, ...userKeys]));

        return allKeys.sort((a, b) => {
            const pA = MEASUREMENT_METADATA[a]?.priority || 99
            const pB = MEASUREMENT_METADATA[b]?.priority || 99

            // If priorities are equal (both 99 or both explicitly same), fallback to alphabet
            if (pA === pB) {
                return a.localeCompare(b);
            }
            return pA - pB
        })
    }, [selectedSizeDetails, recommendations])

    return (
        <MotionFade>
            <div className="fixed inset-0 bg-white text-slate-900 z-50 overflow-y-auto">
                {/* Back Button */}
                <EndSessionButton />
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
                    <div className="flex flex-col items-center mb-8 pt-12 text-center">
                        <p className="text-sm uppercase tracking-[0.2em] text-slate-500 mb-2">
                            ANALYSIS
                        </p>
                        <h1 className="text-clamp-title font-bold text-slate-900 tracking-tight mb-2">
                            Fit Intelligence
                        </h1>
                        <p className="text-base text-slate-600 max-w-md mx-auto leading-relaxed">
                            Personal fit recommendation based on your measurements
                        </p>
                    </div>

                    {/* Main Content Container */}
                    <div className="relative">
                        {/* Measurements Panel (Collapsible from Left) */}
                        <div className={`fit-measurements-panel ${isPanelOpen ? '' : 'collapsed'}`}>
                            <div className="fit-panel-header">
                                <span className="fit-panel-title">MEASUREMENTS</span>
                            </div>

                            {/* List Header */}
                            <div className="fit-list-header grid-cols-2">
                                <div>Body Part</div>
                                <div>Your Size</div>
                            </div>

                            {/* Measurement Rows */}
                            {/* Measurement Rows */}
                            {sortedMeasurementKeys.length > 0 ? (
                                sortedMeasurementKeys.map(key => {
                                    // Try to get detail from selected size, otherwise basic user measurement
                                    const detail = selectedSizeDetails?.[key];
                                    const userMeasurement = recommendations[0]?.user_measurements?.[key];

                                    // Value to display: prefer detail.user (contextual), then userMeasurement
                                    const displayValue = detail?.user ?? userMeasurement;

                                    // Skip if no value found
                                    if (displayValue === undefined || displayValue === null) return null;

                                    const meta = MEASUREMENT_METADATA[key] || { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') }

                                    return (
                                        <div
                                            key={key}
                                            className="fit-measurement-row grid-cols-2"
                                        >
                                            <div className="fit-m-label">{meta.label}</div>
                                            <div className="fit-m-value">
                                                {typeof displayValue === 'number' ? `${displayValue.toFixed(1)} cm` : displayValue}
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="p-4 text-slate-400 text-center italic">
                                    No measurement data available
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
                                    {availableSizes.map(size => {
                                        // Use logic: Show unless explicitly missing from response
                                        // If no recommendations yet (loading), show all
                                        // If recommendations exist, check if size is in `all_sizes`

                                        const isAvailable = recommendations.length === 0 ||
                                            recommendations.some(rec =>
                                                rec.all_sizes?.some(s => s.size === size && !!s.details)
                                            );

                                        if (!isAvailable) return null;

                                        const isRec = recommendations[0]?.recommended_size === size;
                                        const isSelected = size === selectedSize;

                                        return (
                                            <div key={size} className="relative flex flex-col items-center">
                                                {isRec && (
                                                    <span className="absolute -top-6 text-[10px] uppercase font-bold tracking-wider text-black bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 shadow-sm z-10 whitespace-nowrap">
                                                        Recommended
                                                    </span>
                                                )}
                                                <button
                                                    className={`relative px-4 py-3 min-w-[3.5rem] rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap ${isSelected
                                                        ? 'bg-black text-white shadow-xl shadow-black/20 scale-105 ring-2 ring-offset-2 ring-black'
                                                        : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                                                        } ${isRec && !isSelected ? 'border-emerald-400 border-2 text-emerald-600' : ''}`}
                                                    onClick={() => setSize(size)}
                                                >
                                                    {size}
                                                </button>
                                            </div>
                                        )
                                    })}
                                    {availableSizes.length === 0 && !loading && (
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
                </div>
            </div>
        </MotionFade>
    )
}

export default FitCheckScreen
