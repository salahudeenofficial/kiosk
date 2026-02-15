

type SilhouetteOverlayProps = {
    isValid: boolean
}

export const SilhouetteOverlay = ({ isValid }: SilhouetteOverlayProps) => {
    // Green (valid), Red (invalid/default)
    const strokeColor = isValid ? '#00FF00' : '#FF0000'

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none flex items-center justify-center z-10">
            {/* Circle Indicator */}
            <div
                className="w-24 h-24 rounded-full border-4 flex items-center justify-center backdrop-blur-sm transition-colors duration-300"
                style={{
                    borderColor: isValid ? '#00FF00' : 'rgba(255, 255, 255, 0.5)',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)'
                }}
            >
                <svg
                    viewBox="0 0 100 100"
                    className="w-16 h-16"
                    style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))' }}
                >
                    <g transform="translate(0, 5)">
                        {/* Head */}
                        <circle
                            cx="50" cy="20" r="8"
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                        />

                        {/* Body / Spine */}
                        <line
                            x1="50" y1="28" x2="50" y2="60"
                            stroke={strokeColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                        />

                        {/* Arms (A-Pose) */}
                        <line
                            x1="50" y1="35" x2="20" y2="55"
                            stroke={strokeColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                        <line
                            x1="50" y1="35" x2="80" y2="55"
                            stroke={strokeColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                        />

                        {/* Legs */}
                        <line
                            x1="50" y1="60" x2="30" y2="90"
                            stroke={strokeColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                        <line
                            x1="50" y1="60" x2="70" y2="90"
                            stroke={strokeColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                    </g>
                </svg>
            </div>
        </div>
    )
}
