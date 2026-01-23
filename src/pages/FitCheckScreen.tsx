import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MotionFade from '../components/UI/MotionFade'
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
}

const measurementsConfig: MeasurementConfig[] = [
    { key: 'neck', apiKey: 'neck circumference', label: 'Neck', defaultBody: 38, unit: 'cm', regionId: 'neck' },
    { key: 'chest', apiKey: 'chest circumference', label: 'Chest', defaultBody: 98, unit: 'cm', regionId: 'chest' },
    { key: 'waist', apiKey: 'waist circumference', label: 'Waist', defaultBody: 85, defaultRef: 95, unit: 'cm', regionId: 'waist' },
    { key: 'hips', apiKey: 'hip circumference', label: 'Hips', defaultBody: 102, defaultRef: 100, unit: 'cm', regionId: 'hips' },
    { key: 'thigh', apiKey: 'thigh left circumference', label: 'Thigh', defaultBody: 58, defaultRef: 60, unit: 'cm', regionId: ['l-thigh', 'r-thigh'] },
    { key: 'bicep', apiKey: 'bicep right circumference', label: 'Bicep', defaultBody: 34, defaultRef: 34, unit: 'cm', regionId: ['l-arm-upper', 'r-arm-upper'] },
    { key: 'shoulder', apiKey: 'shoulder breadth', label: 'Shoulder', defaultBody: 44, defaultRef: 46, unit: 'cm', regionId: 'chest' },
    { key: 'calf', apiKey: 'calf left circumference', label: 'Calf', defaultBody: 38, defaultRef: 42, unit: 'cm', regionId: ['l-calf', 'r-calf'] }
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

const statusColors: Record<FitStatus, string> = {
    'very-tight': '#cc0000',
    'tight': '#ff4d4d',
    'snug': '#ffad33',
    'good': '#4dff4d',
    'relaxed': '#33e6ff',
    'loose': '#4da6ff',
    'very-loose': '#0040ff',
    'unknown': '#333'
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

    // Get color for body part
    const getBodyPartColor = (regionId: string): string => {
        const config = measurementsConfig.find(c => {
            if (Array.isArray(c.regionId)) {
                return c.regionId.includes(regionId)
            }
            return c.regionId === regionId
        })

        if (!config) return '#333'
        return statusColors[fitStatuses[config.key] || 'unknown']
    }

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
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Your Body Measurements</h1>
                        <p className="text-sm text-slate-600">Select a reference size to check your fit</p>
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
                            {/* Heatmap Skeleton - Top Center */}
                            <div className="flex flex-col items-center justify-center mb-8">
                                <svg className="fit-body-svg" viewBox="0 0 200 600" xmlns="http://www.w3.org/2000/svg" style={{ maxHeight: '400px', width: '100%' }}>
                                    {/* Head */}
                                    <circle cx="100" cy="50" r="30" className="fit-body-part" id="head" fill="#e2e8f0" />

                                    {/* Neck */}
                                    <rect
                                        x="85" y="80" width="30" height="20"
                                        className="fit-body-part"
                                        id="neck"
                                        rx="5"
                                        fill={getBodyPartColor('neck')}
                                        style={{ filter: hoveredRegion === 'neck' ? 'brightness(1.2)' : 'none' }}
                                    />

                                    {/* Chest */}
                                    <path
                                        d="M 60 110 C 60 110, 140 110, 140 110 L 130 180 L 70 180 Z"
                                        className="fit-body-part"
                                        id="chest"
                                        fill={getBodyPartColor('chest')}
                                        style={{ filter: hoveredRegion === 'chest' ? 'brightness(1.2)' : 'none' }}
                                    />

                                    {/* Waist */}
                                    <rect
                                        x="70" y="180" width="60" height="40"
                                        className="fit-body-part"
                                        id="waist"
                                        rx="5"
                                        fill={getBodyPartColor('waist')}
                                        style={{ filter: hoveredRegion === 'waist' ? 'brightness(1.2)' : 'none' }}
                                    />

                                    {/* Hips */}
                                    <path
                                        d="M 70 220 L 130 220 L 140 280 L 60 280 Z"
                                        className="fit-body-part"
                                        id="hips"
                                        fill={getBodyPartColor('hips')}
                                        style={{ filter: hoveredRegion === 'hips' ? 'brightness(1.2)' : 'none' }}
                                    />

                                    {/* Arms Upper */}
                                    <rect
                                        x="30" y="110" width="25" height="80"
                                        className="fit-body-part"
                                        id="l-arm-upper"
                                        rx="10"
                                        fill={getBodyPartColor('l-arm-upper')}
                                        style={{ filter: hoveredRegion === 'l-arm-upper' ? 'brightness(1.2)' : 'none' }}
                                    />
                                    <rect
                                        x="145" y="110" width="25" height="80"
                                        className="fit-body-part"
                                        id="r-arm-upper"
                                        rx="10"
                                        fill={getBodyPartColor('r-arm-upper')}
                                        style={{ filter: hoveredRegion === 'r-arm-upper' ? 'brightness(1.2)' : 'none' }}
                                    />

                                    {/* Arms Lower */}
                                    <rect x="30" y="195" width="25" height="70" className="fit-body-part" id="l-arm-lower" rx="10" fill="#e2e8f0" />
                                    <rect x="145" y="195" width="25" height="70" className="fit-body-part" id="r-arm-lower" rx="10" fill="#e2e8f0" />

                                    {/* Thighs */}
                                    <path
                                        d="M 60 280 L 95 280 L 90 400 L 65 400 Z"
                                        className="fit-body-part"
                                        id="l-thigh"
                                        fill={getBodyPartColor('l-thigh')}
                                        style={{ filter: hoveredRegion === 'l-thigh' ? 'brightness(1.2)' : 'none' }}
                                    />
                                    <path
                                        d="M 105 280 L 140 280 L 135 400 L 110 400 Z"
                                        className="fit-body-part"
                                        id="r-thigh"
                                        fill={getBodyPartColor('r-thigh')}
                                        style={{ filter: hoveredRegion === 'r-thigh' ? 'brightness(1.2)' : 'none' }}
                                    />

                                    {/* Calves */}
                                    <rect
                                        x="65" y="405" width="25" height="90"
                                        className="fit-body-part"
                                        id="l-calf"
                                        rx="5"
                                        fill="#e2e8f0"
                                    />
                                    <rect
                                        x="110" y="405" width="25" height="90"
                                        className="fit-body-part"
                                        id="r-calf"
                                        rx="5"
                                        fill="#e2e8f0"
                                    />
                                </svg>
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
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                                size === selectedSize
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
                                <div className="relative h-12 rounded-lg overflow-hidden mb-3" style={{
                                    background: 'linear-gradient(to right, #cc0000 0%, #ff4d4d 14%, #ffad33 28%, #4dff4d 42%, #33e6ff 57%, #4da6ff 71%, #0040ff 100%)'
                                }}>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-3 h-3 rounded-full bg-white border-2 border-slate-900 shadow-lg"></div>
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs font-medium text-slate-600">
                                    <span>Too tight</span>
                                    <span>Perfect fit</span>
                                    <span>Very Loose</span>
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
