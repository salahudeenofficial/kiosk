import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import MotionFade from '../components/UI/MotionFade'
import NeonLine from '../components/FitCheck/NeonLine'
import { useKioskStore } from '../store/kioskStore'
import { unifiedKioskApi } from '../utils/unifiedKioskApi'
import type { SizeRecommendationResponse } from '../utils/kioskApi'
import './FitCheckScreen.css'

// Hardcoded Measurement Chart removed - using API data

// Measurements Configuration
// Helper types
type Point = { x: number, y: number }
interface LineSegment {
    x1: number; y1: number; x2: number; y2: number
}
interface MeasurementConfig {
    key: string
    label: string
    apiKey: string // Key from API response
    unit: string
    regionId: string | string[]
    // Legacy line segments (e.g. chest, waist)
    coordinates?: {
        male: LineSegment[],
        female: LineSegment[]
    }
    // New Path-based configuration (e.g. shoulder)
    paths?: {
        male: { points: Point[] }[],
        female: { points: Point[] }[]
    }
}

// ... (Rest of code remains same until render loop) ...

{/* SVG Overlay for Measurements */ }
// ... (Rest of code remains same until render loop) ...

// Shoulder Paths Data
const FEMALE_SHOULDER_PATHS = [
    {
        "points": [
            { "x": 46.558666044114396, "y": 18.683883855461577 },
            { "x": 45.30727296326639, "y": 19.30958039588558 },
            { "x": 44.055879882418395, "y": 19.77885280120358 },
            { "x": 42.648062666464384, "y": 20.404549341627582 },
            { "x": 41.70951785582839, "y": 21.18667001715758 },
            { "x": 41.08382131540439, "y": 22.12521482779358 },
            { "x": 40.458124774980384, "y": 23.22018377353558 },
            { "x": 40.14527650476838, "y": 24.002304449065583 },
            { "x": 39.969739784072075, "y": 24.655403841113348 },
            { "x": 39.590045546390996, "y": 25.604639435316063 }
        ]
    },
    {
        "points": [
            { "x": 53.63873234059111, "y": 18.010754681694376 },
            { "x": 54.58796793479381, "y": 18.770143157056545 },
            { "x": 55.631265880262404, "y": 18.996732125673578 },
            { "x": 56.5698106908984, "y": 18.996732125673578 },
            { "x": 57.664779636640404, "y": 19.153156260779582 },
            { "x": 58.75974858238241, "y": 19.30958039588558 },
            { "x": 59.85471752812441, "y": 19.62242866609758 },
            { "x": 60.480414068548406, "y": 19.935276936309577 },
            { "x": 61.10611060897241, "y": 20.87382174694558 },
            { "x": 61.73180714939641, "y": 22.12521482779358 }
        ]
    }
]

const MALE_SHOULDER_PATHS = [
    {
        "points": [
            { "x": 45.28545911160726, "y": 17.25136765475078 },
            { "x": 44.146376398564, "y": 17.820909011272406 },
            { "x": 42.437752328999125, "y": 18.959991724315657 },
            { "x": 40.770973045192385, "y": 19.77885399462502 },
            { "x": 38.893883423920386, "y": 20.717398805261023 },
            { "x": 37.79891447817839, "y": 21.499519480791022 },
            { "x": 37.17321793775438, "y": 22.750912561639026 },
            { "x": 36.703945532436386, "y": 23.689457372275026 },
            { "x": 36.39109726222438, "y": 24.940850453123026 },
            { "x": 36.234673127118384, "y": 26.192243533971027 }
        ]
    },
    {
        "points": [
            { "x": 52.6894967463884, "y": 17.061520535910233 },
            { "x": 54.01842657827219, "y": 17.44121477359132 },
            { "x": 55.34735641015599, "y": 18.200603248953488 },
            { "x": 56.86613336088032, "y": 18.959991724315657 },
            { "x": 58.5747574304452, "y": 19.719380199677826 },
            { "x": 59.523993024647915, "y": 20.28892155619945 },
            { "x": 60.09353438116955, "y": 21.04831003156162 },
            { "x": 60.663075737691166, "y": 21.80769850692379 },
            { "x": 61.042769975372245, "y": 22.94678121996704 },
            { "x": 61.42246421305333, "y": 24.085863933010295 }
        ]
    }
]

const measurementsConfig: MeasurementConfig[] = [
    {
        key: 'shoulder', apiKey: 'shoulder breadth', label: 'Shoulder', unit: 'cm', regionId: 'shoulder',
        // Use new paths instead of coordinates
        paths: {
            male: MALE_SHOULDER_PATHS,
            female: FEMALE_SHOULDER_PATHS
        }
    },
    {
        key: 'chest', apiKey: 'chest circumference', label: 'Chest', unit: 'cm', regionId: 'chest',
        coordinates: {
            male: [{ x1: 40.80, y1: 30.88, x2: 57.08, y2: 30.58 }],
            female: [{ x1: 43.06, y1: 29.52, x2: 57.83, y2: 29.52 }]
        }
    },
    {
        key: 'waist', apiKey: 'waist circumference', label: 'Waist', unit: 'cm', regionId: 'waist',
        coordinates: {
            male: [{ x1: 40.52126427271222, y1: 46.76981631639914, x2: 58.31375144795631, y2: 46.34618566936952 }],
            female: [{ x1: 41.85, y1: 40.68, x2: 58.14, y2: 40.68 }]
        }
    },
]





// Component helper for rendering a Path Measurement
// Helper for smooth color transition
const interpolateColor = (color1: string, color2: string, factor: number) => {
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);

    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);

    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const PathMeasurement = ({ points, score }: { points: Point[], score: number }) => {
    // Logic from CoordinateFinder



    // 2. Calculate Color based on new ranges
    const color = useMemo(() => {
        if (score <= 0) return '#ef4444'; // Red (Tight < 0)

        if (score <= 1) {
            // 0 to 1: Red to Orange
            return interpolateColor('#ef4444', '#f97316', score);
        }
        if (score <= 2) {
            // 1 to 2: Orange to Green
            return interpolateColor('#f97316', '#22c55e', score - 1);
        }
        if (score <= 4) {
            // 2 to 4: Green to Blue (Transition)
            return interpolateColor('#22c55e', '#3b82f6', (score - 2) / 2);
        }
        return '#3b82f6'; // Blue (Loose > 4)
    }, [score]);

    // 3. Calculate Luminosity Intensity
    // Symmetric: Intensity increases as we move away from 0 (Perfect)
    // 0 = 1.0 (Base)
    // -10 or +10 = 2.0 (Max Brightness)
    const intensity = useMemo(() => {
        const absScore = Math.min(10, Math.abs(score));
        return 1.0 + (absScore / 10); // Maps 0->10 to 1.0->2.0
    }, [score]);

    // Always render the full path
    const visiblePoints = points;
    const dVisible = visiblePoints.length > 1
        ? visiblePoints.map((p, idx) => idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ')
        : '';

    return (
        <g>
            {/* Visible Path */}
            {dVisible && (
                <>
                    {/* Outer Glow (Atmosphere) - Responsive Opacity */}
                    <path
                        d={dVisible}
                        fill="none"
                        stroke={color}
                        strokeWidth="15"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ filter: 'blur(8px)', opacity: Math.min(1, 0.6 * intensity) }}
                        vectorEffect="non-scaling-stroke"
                    />
                    {/* Middle Glow (Body) */}
                    <path
                        d={dVisible}
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ filter: 'blur(4px)', opacity: Math.min(1, 0.8 * intensity) }}
                        vectorEffect="non-scaling-stroke"
                    />
                    {/* Inner Glow (Bridge) */}
                    <path
                        d={dVisible}
                        fill="none"
                        stroke={color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ filter: 'blur(1.5px)', opacity: Math.min(1, 0.9 * intensity) }}
                        vectorEffect="non-scaling-stroke"
                    />
                    {/* Core Filament (Definition) */}
                    <path
                        d={dVisible}
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ filter: 'blur(0.4px)', opacity: Math.min(1, 0.95 * intensity) }}
                        vectorEffect="non-scaling-stroke"
                    />
                </>
            )}
        </g>
    );
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
    const setSelectedSize = useKioskStore((state) => state.setSelectedSize)

    const [isPanelOpen, setIsPanelOpen] = useState(false)
    const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
    const [selectedSize, setSize] = useState<string>('M')
    const [manualScores, setManualScores] = useState<Record<string, number>>({})

    const [recommendations, setRecommendations] = useState<SizeRecommendationResponse[]>([])
    const [loading, setLoading] = useState(true)

    const storeUserMeasurements = useKioskStore((state) => state.userMeasurements)

    // Load Data
    useEffect(() => {
        const loadData = async () => {
            const garmentIds = location.state?.garmentIds as number[] || []

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

    // Helper to normalize keys
    const normalizeKey = (apiInputKey: string): string | null => {
        const lowerKey = apiInputKey.toLowerCase().trim()

        // Find matching config
        const config = measurementsConfig.find(c =>
            c.key.toLowerCase() === lowerKey ||
            c.apiKey.toLowerCase() === lowerKey ||
            // Handle variations
            (lowerKey.includes('chest') && c.key === 'chest') ||
            (lowerKey.includes('waist') && c.key === 'waist') ||
            (lowerKey.includes('shoulder') && c.key === 'shoulder')
        )

        return config ? config.key : null
    }

    // Compute User Measurements for Display
    const userMeasurements = useMemo(() => {
        const measurements: Record<string, number> = {}

        // Use store measurements as base
        if (storeUserMeasurements) {
            Object.entries(storeUserMeasurements).forEach(([k, v]) => {
                const normalized = normalizeKey(k)
                if (normalized) measurements[normalized] = v
            })
        }

        recommendations.forEach(rec => {
            // Just take the first valid measurement found for each part
            const anySize = rec.all_sizes?.[0]
            if (anySize?.details) {
                Object.entries(anySize.details).forEach(([key, detail]) => {
                    const normalized = normalizeKey(key)
                    if (normalized) {
                        measurements[normalized] = detail.user
                    }
                })
            }
        })

        return measurements
    }, [recommendations, storeUserMeasurements])

    // Calculate loose scores for each measurement
    const looseScores = useMemo(() => {
        const scores: Record<string, number | null> = {}

        // Default all to null
        measurementsConfig.forEach(c => scores[c.key] = null)

        recommendations.forEach(rec => {
            const sizeOption = rec.all_sizes.find(s => s.size === selectedSize)

            if (sizeOption && sizeOption.details) {
                Object.entries(sizeOption.details).forEach(([partKey, detail]) => {
                    const normalized = normalizeKey(partKey)

                    if (normalized) {
                        if (manualScores[normalized] !== undefined) {
                            scores[normalized] = manualScores[normalized]
                        } else {
                            // Loose Score = Chart Value - User Value
                            scores[normalized] = detail.chart - detail.user
                        }
                    }
                })
            }
        })

        console.log('[FitCheck] Computed Loose Scores:', scores)
        return scores
    }, [selectedSize, recommendations, manualScores])

    // Helper to get display status (tight/loose) from score
    const getStatus = (score: number | null) => {
        if (score === null) return 'unknown'
        if (score < 0) return 'tight'
        return 'loose'
    }

    const getStatusLabel = (score: number | null) => {
        if (score === null) return '--'
        if (score < 0) return 'TIGHT'
        return 'LOOSE'
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
                                <div>Actual (cm)</div>
                                <div>Loose Score</div>
                                <div>Status</div>
                            </div>

                            {/* Measurement Rows */}
                            {measurementsConfig.map(config => {
                                const score = looseScores[config.key]
                                const status = getStatus(score)

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
                                        <div className="fit-m-value">{userMeasurements[config.key]?.toFixed(1)}</div>
                                        <div className="fit-m-ref">
                                            <input
                                                type="number"
                                                step="1"
                                                value={score !== null && score !== undefined ? Number(score.toFixed(1)) : ''}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value)
                                                    if (!isNaN(val)) {
                                                        setManualScores(prev => ({ ...prev, [config.key]: val }))
                                                    }
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-20 px-1 py-1 text-center font-mono text-xs border rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <span className={`fit-status-badge fit-status-${status}`}>
                                                {getStatusLabel(score)}
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
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-200/50">
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
                                        style={{
                                            zIndex: 10,
                                            maskImage: `url(/figures/${userGender === 'female' ? 'figure1.png' : 'figure2.png'})`,
                                            maskSize: 'contain',
                                            maskRepeat: 'no-repeat',
                                            maskPosition: 'center',
                                            WebkitMaskImage: `url(/figures/${userGender === 'female' ? 'figure1.png' : 'figure2.png'})`,
                                            WebkitMaskSize: 'contain',
                                            WebkitMaskRepeat: 'no-repeat',
                                            WebkitMaskPosition: 'center'
                                        }}
                                    >
                                        {measurementsConfig.map(config => {
                                            const score = looseScores[config.key]

                                            // Only render if we have a valid score
                                            if (score === null || score === undefined) return null

                                            // Check for Paths first (New System)
                                            if (config.paths) {
                                                const pathsArray = userGender === 'female' ? config.paths.female : config.paths.male;
                                                return pathsArray.map((pathObj, index) => (
                                                    <PathMeasurement
                                                        key={`${config.key}-path-${index}`}
                                                        points={pathObj.points}
                                                        score={score}
                                                    />
                                                ));
                                            }

                                            // Fallback to coordinates
                                            const coordsArray = config.coordinates ? (userGender === 'female' ? config.coordinates.female : config.coordinates.male) : null

                                            if (!coordsArray) return null

                                            // Render all segments for this measurement
                                            return coordsArray.map((coords, index) => (
                                                <NeonLine
                                                    key={`${config.key}-${index}`}
                                                    x1={coords.x1}
                                                    y1={coords.y1}
                                                    x2={coords.x2}
                                                    y2={coords.y2}
                                                    score={score}
                                                    label={`${config.key}-${index}`}
                                                    isHovered={hoveredRegion === config.regionId || (Array.isArray(config.regionId) && config.regionId.includes(hoveredRegion || ''))}
                                                />
                                            ))
                                        })}
                                    </svg>
                                </div>
                            </div>

                            {/* Size Toggle Buttons */}
                            <div className="flex flex-col items-center mb-8">
                                <div className="flex flex-wrap gap-2 justify-center mb-2">
                                    {(recommendations[0]?.all_sizes || []).filter(s => !!s.details).map(sizeOption => (
                                        <button
                                            key={sizeOption.size}
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${sizeOption.size === selectedSize
                                                ? 'bg-black text-white border-2 border-black shadow-lg'
                                                : 'bg-white text-slate-500 border-2 border-slate-200 hover:border-slate-400'
                                                }`}
                                            onClick={() => setSize(sizeOption.size)}
                                        >
                                            {sizeOption.size}
                                        </button>
                                    ))}
                                    {recommendations.length === 0 && !loading && (
                                        <div className="text-slate-400 text-sm">No size data available</div>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Try other sizes to see how the fit changes</p>
                            </div>

                            {/* Color Reference Gradient Bar */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                                <div className="relative h-8 rounded-lg overflow-hidden mb-3" style={{
                                    background: 'linear-gradient(to right, #ff0033 0%, #ffffff 50%, #00ccff 100%)'
                                }}>
                                    {/* Gradient only for reference */}
                                </div>
                                <div className="flex justify-between text-xs font-medium text-slate-500">
                                    <span>Tight (Red Neon)</span>
                                    <span>Loose (Blue Neon)</span>
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
