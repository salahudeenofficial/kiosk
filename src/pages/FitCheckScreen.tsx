import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MotionFade from '../components/UI/MotionFade'
import MeasurementLine from '../components/FitCheck/MeasurementLine'
import { useKioskStore } from '../store/kioskStore'
import './FitCheckScreen.css'

// Size Chart Data - Ranges for each size
const SIZE_CHART: Record<string, Record<string, [number, number]>> = {
    'XS': {
        neck: [36, 37],
        chest: [84, 88],
        waist: [68, 72],
        hips: [86, 90],
    },
    'S': {
        neck: [38, 39],
        chest: [89, 94],
        waist: [73, 78],
        hips: [91, 96],
    },
    'M': {
        neck: [40, 41],
        chest: [95, 100],
        waist: [79, 84],
        hips: [97, 102],
    },
    'L': {
        neck: [42, 43],
        chest: [101, 106],
        waist: [85, 90],
        hips: [103, 108],
    },
    'XL': {
        neck: [44, 45],
        chest: [107, 112],
        waist: [91, 96],
        hips: [109, 114],
    },
    'XXL': {
        neck: [46, 47],
        chest: [113, 118],
        waist: [97, 102],
        hips: [115, 120],
    },
    '3XL': {
        neck: [48, 49],
        chest: [119, 124],
        waist: [103, 108],
        hips: [121, 126],
    },
    '4XL': {
        neck: [50, 51],
        chest: [125, 130],
        waist: [109, 114],
        hips: [127, 132],
    },
}

// Measurements Configuration
interface MeasurementConfig {
    key: string
    label: string
    apiKey: string // Key from API response
    defaultBody: number
    defaultRef?: number
    unit: string
    regionId: string | string[]
    // Coordinates for the measurement line (percentage 0-100)
    coordinates?: {
        male: { x1: number, y1: number, x2: number, y2: number },
        female: { x1: number, y1: number, x2: number, y2: number }
    }
}

const measurementsConfig: MeasurementConfig[] = [
    {
        key: 'shoulder', apiKey: 'shoulder breadth', label: 'Shoulder', defaultBody: 44, defaultRef: 46, unit: 'cm', regionId: 'chest',
        coordinates: {
            male: { x1: 38.84, y1: 21.38, x2: 59.64, y2: 21.53 },
            female: { x1: 40.50, y1: 21.53, x2: 60.40, y2: 21.53 }
        }
    },
    {
        key: 'chest', apiKey: 'chest circumference', label: 'Chest', defaultBody: 98, unit: 'cm', regionId: 'chest',
        coordinates: {
            male: { x1: 40.80, y1: 30.88, x2: 57.08, y2: 30.58 },
            female: { x1: 43.06, y1: 29.52, x2: 57.83, y2: 29.52 }
        }
    },
    {
        key: 'waist', apiKey: 'waist circumference', label: 'Waist', defaultBody: 85, defaultRef: 95, unit: 'cm', regionId: 'waist',
        coordinates: {
            male: { x1: 40.50, y1: 45.65, x2: 58.29, y2: 45.50 },
            female: { x1: 41.85, y1: 40.68, x2: 58.14, y2: 40.68 }
        }
    },
    /*
    {
        key: 'hips', apiKey: 'hip circumference', label: 'Hips', defaultBody: 102, defaultRef: 100, unit: 'cm', regionId: 'hips',
        coordinates: {
            male: { x1: 40.65, y1: 54.70, x2: 58.74, y2: 54.70 },
            female: { x1: 40.05, y1: 50.63, x2: 59.79, y2: 50.48 }
        }
    },
    {
        key: 'inseam', apiKey: 'inseam', label: 'Inseam', defaultBody: 76, defaultRef: 78, unit: 'cm', regionId: ['l-thigh', 'r-thigh'],
        coordinates: {
            male: { x1: 49.09, y1: 56.87, x2: 48.64, y2: 89.43 },
            female: { x1: 49.39, y1: 54.46, x2: 50.30, y2: 88.98 }
        }
    }
    */
]

type FitStatus = 'very-tight' | 'tight' | 'snug' | 'good' | 'relaxed' | 'loose' | 'very-loose' | 'unknown'

// Calculate fit status based on body measurement vs reference
function calculateStatus(bodyVal: number | null, refValOrRange: [number, number] | number | null): FitStatus {
    if (!bodyVal || refValOrRange === null) return 'unknown'

    // Range from chart
    if (Array.isArray(refValOrRange)) {
        const [min, max] = refValOrRange
        if (bodyVal >= min && bodyVal <= max) return 'good'

        if (bodyVal > max) {
            const diff = bodyVal - max
            if (diff <= 2) return 'snug'
            if (diff <= 5) return 'tight'
            return 'very-tight'
        }

        if (bodyVal < min) {
            const diff = min - bodyVal
            if (diff <= 3) return 'relaxed'
            if (diff <= 8) return 'loose'
            return 'very-loose'
        }
    }

    // Single value reference
    if (typeof refValOrRange === 'number') {
        const diff = refValOrRange - bodyVal
        if (diff < -5) return 'very-tight'
        if (diff < -2) return 'tight'
        if (diff < 0) return 'snug'
        if (diff >= 0 && diff <= 4) return 'good'
        if (diff > 4 && diff <= 8) return 'relaxed'
        if (diff > 8 && diff <= 12) return 'loose'
        return 'very-loose'
    }

    return 'unknown'
}

const statusLabels: Record<FitStatus, string> = {
    'very-tight': 'V. TIGHT',
    'tight': 'TIGHT',
    'snug': 'SNUG',
    'good': 'PERFECT',
    'relaxed': 'RELAXED',
    'loose': 'LOOSE',
    'very-loose': 'V. LOOSE',
    'unknown': '--'
}

interface FitCheckScreenProps {
    isOverlay?: boolean
    onClose?: () => void
}

const FitCheckScreen: React.FC<FitCheckScreenProps> = ({ isOverlay = false, onClose }) => {
    const navigate = useNavigate()
    const apiMeasurements = useKioskStore((state) => state.userMeasurements)
    const userGender = useKioskStore((state) => state.userGender)
    const setSelectedSize = useKioskStore((state) => state.setSelectedSize)

    const [isPanelOpen, setIsPanelOpen] = useState(false)
    const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
    const [selectedSize, setSize] = useState<string>('M')

    // Get user measurements - from API if available, otherwise defaults
    const userMeasurements = useMemo(() => {
        const measurements: Record<string, number> = {}
        measurementsConfig.forEach(config => {
            // Try to get from API measurements first
            if (apiMeasurements && apiMeasurements[config.apiKey] !== undefined) {
                measurements[config.key] = apiMeasurements[config.apiKey]
            } else {
                measurements[config.key] = config.defaultBody
            }
        })
        return measurements
    }, [apiMeasurements])

    // Calculate recommended size based on multiple measurements (chest, waist, hips)
    // Uses weighted scoring: chest (50%), waist (25%), hips (25%)
    const recommendedSize = useMemo(() => {
        const chestVal = userMeasurements.chest
        const waistVal = userMeasurements.waist
        const hipsVal = userMeasurements.hips

        if (!chestVal) return 'M'

        // Calculate score for each size (lower score = better fit)
        const sizeScores: { size: string; score: number; fits: number }[] = []

        for (const [size, data] of Object.entries(SIZE_CHART)) {
            let score = 0
            let fits = 0

            // Check chest (most important - 50% weight)
            if (data.chest) {
                const [min, max] = data.chest
                if (chestVal >= min && chestVal <= max) {
                    fits++
                } else if (chestVal < min) {
                    score += (min - chestVal) * 2 // Penalty for too loose
                } else {
                    score += (chestVal - max) * 3 // Higher penalty for too tight
                }
            }

            // Check waist (25% weight)
            if (data.waist && waistVal) {
                const [min, max] = data.waist
                if (waistVal >= min && waistVal <= max) {
                    fits++
                } else if (waistVal < min) {
                    score += (min - waistVal)
                } else {
                    score += (waistVal - max) * 1.5
                }
            }

            // Check hips (25% weight)
            if (data.hips && hipsVal) {
                const [min, max] = data.hips
                if (hipsVal >= min && hipsVal <= max) {
                    fits++
                } else if (hipsVal < min) {
                    score += (min - hipsVal)
                } else {
                    score += (hipsVal - max) * 1.5
                }
            }

            sizeScores.push({ size, score, fits })
        }

        // Sort by: 1) Most fits, 2) Lowest score
        sizeScores.sort((a, b) => {
            if (b.fits !== a.fits) return b.fits - a.fits
            return a.score - b.score
        })

        return sizeScores[0]?.size || 'M'
    }, [userMeasurements.chest, userMeasurements.waist, userMeasurements.hips])

    // Update selectedSize when recommendedSize is calculated
    useEffect(() => {
        if (recommendedSize) {
            setSize(recommendedSize)
        }
    }, [recommendedSize])

    // Calculate fit status for each measurement
    const fitStatuses = useMemo(() => {
        const statuses: Record<string, FitStatus> = {}
        const chartData = SIZE_CHART[selectedSize]

        measurementsConfig.forEach(config => {
            const bodyVal = userMeasurements[config.key]
            let refVal: [number, number] | number | null = null

            if (chartData && chartData[config.key]) {
                refVal = chartData[config.key]
            } else if (config.defaultRef) {
                refVal = config.defaultRef
            }

            statuses[config.key] = calculateStatus(bodyVal, refVal)
        })

        return statuses
    }, [selectedSize, userMeasurements])

    // Reference bar dot position: smaller size → red (left), larger size → blue (right), recommended = center
    const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL']
    const referenceDotPosition = useMemo(() => {
        const recIdx = SIZE_ORDER.indexOf(recommendedSize)
        const selIdx = SIZE_ORDER.indexOf(selectedSize)
        if (recIdx < 0 || selIdx < 0) return 50
        const diff = selIdx - recIdx
        const position = 50 + diff * (50 / 7)
        return Math.max(8, Math.min(92, position))
    }, [selectedSize, recommendedSize])

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
                        <p className="text-base text-slate-600 max-w-md mx-auto leading-relaxed">
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
                                <div>Actual (cm)</div>
                                <div>Reference (cm)</div>
                                <div>Status</div>
                            </div>

                            {/* Measurement Rows */}
                            {measurementsConfig.map(config => {
                                const chartData = SIZE_CHART[selectedSize]
                                const hasChartData = chartData && chartData[config.key]

                                return (
                                    <div
                                        key={config.key}
                                        className="fit-measurement-row"
                                        onMouseEnter={() => {
                                            const ids = Array.isArray(config.regionId) ? config.regionId : [config.regionId]
                                            setHoveredRegion(ids[0])
                                        }}
                                        onMouseLeave={() => setHoveredRegion(null)}
                                    >
                                        <div className="fit-m-label">{config.label}</div>
                                        <div className="fit-m-value">{userMeasurements[config.key]}</div>
                                        <div className="fit-m-ref">
                                            {hasChartData
                                                ? `${chartData[config.key][0]} - ${chartData[config.key][1]}`
                                                : config.defaultRef || '--'
                                            }
                                        </div>
                                        <div>
                                            <span className={`fit-status-badge fit-status-${fitStatuses[config.key]}`}>
                                                {statusLabels[fitStatuses[config.key]]}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
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
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-lg">
                            <div className="relative flex flex-col items-center justify-center mb-8">
                                {/* Image Container */}
                                <div className="relative w-full max-w-md mx-auto">
                                    <img
                                        src={`/figures/${userGender === 'female' ? 'figure1.png' : 'figure2.png'}`}
                                        alt="Body Figure"
                                        className="w-full h-auto object-contain rounded-lg"
                                        style={{ maxHeight: '500px' }}
                                    />

                                    {/* SVG Overlay for Measurements */}
                                    <svg
                                        className="absolute inset-0 w-full h-full pointer-events-none"
                                        viewBox="0 0 100 100"
                                        preserveAspectRatio="none"
                                    >
                                        {measurementsConfig.map(config => {
                                            const status = fitStatuses[config.key] || 'unknown';
                                            const bodyVal = userMeasurements[config.key];

                                            // Map detailed status to 3-state simple status for visualization
                                            let visualStatus: 'perfect' | 'tight' | 'loose' | 'unknown' = 'unknown';
                                            if (['good', 'snug'].includes(status)) visualStatus = 'perfect';
                                            else if (['tight', 'very-tight'].includes(status)) visualStatus = 'tight';
                                            else if (['relaxed', 'loose', 'very-loose'].includes(status)) visualStatus = 'loose';

                                            // Get coordinates based on gender
                                            // Default to male if undefined or gender is null
                                            const coords = config.coordinates ? (userGender === 'female' ? config.coordinates.female : config.coordinates.male) : null;

                                            if (!coords || visualStatus === 'unknown') return null;

                                            return (
                                                <MeasurementLine
                                                    key={config.key}
                                                    x1={coords.x1}
                                                    y1={coords.y1}
                                                    x2={coords.x2}
                                                    y2={coords.y2}
                                                    status={visualStatus as any}
                                                    label={config.label}
                                                    value={`${bodyVal} cm`}
                                                    isHovered={hoveredRegion === config.regionId || (Array.isArray(config.regionId) && config.regionId.includes(hoveredRegion || ''))}
                                                />
                                            );
                                        })}
                                    </svg>
                                </div>
                            </div>

                            {/* Recommended Size - Below Heatmap */}
                            {recommendedSize && (
                                <div className="flex flex-col items-center mb-6">
                                    <span className="text-sm font-semibold uppercase text-slate-500 tracking-wide mb-3">Recommended size</span>
                                    <button
                                        className="px-8 py-4 bg-slate-900 text-white rounded-xl text-2xl font-bold shadow-lg hover:bg-slate-800 transition-colors"
                                        onClick={() => setSize(recommendedSize)}
                                    >
                                        {recommendedSize}
                                    </button>
                                </div>
                            )}

                            {/* Size Toggle Buttons - Below Recommended Size */}
                            <div className="flex flex-col items-center mb-8">
                                <div className="flex flex-wrap gap-2 justify-center mb-2">
                                    {Object.keys(SIZE_CHART).map(size => (
                                        <button
                                            key={size}
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${size === selectedSize
                                                ? 'bg-slate-900 text-white border-2 border-slate-900'
                                                : 'bg-white text-slate-900 border-2 border-slate-200 hover:border-slate-300'
                                                }`}
                                            onClick={() => setSize(size)}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Try other sizes to see how the fit changes</p>
                            </div>

                            {/* Color Reference Gradient Bar - At Bottom */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                                <div className="relative h-8 rounded-lg overflow-hidden mb-3" style={{
                                    background: 'linear-gradient(to right, #cc0000 0%, #ff4d4d 14%, #ffad33 28%, #4dff4d 42%, #33e6ff 57%, #4da6ff 71%, #0040ff 100%)'
                                }}>
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-900 shadow-lg transition-all duration-300 ease-out"
                                        style={{ left: `${referenceDotPosition}%` }}
                                        role="img"
                                        aria-label="Fit indicator"
                                    />
                                </div>
                                <div className="flex justify-between text-xs font-medium text-slate-600">
                                    <span>Too tight</span>
                                    <span>Perfect fit</span>
                                    <span>Very loose</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Done Button */}
                    <div className="flex justify-center mt-8">
                        <button
                            className="px-8 py-4 bg-slate-900 text-white rounded-xl text-lg font-bold shadow-lg hover:bg-black transition-colors flex items-center gap-2"
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
