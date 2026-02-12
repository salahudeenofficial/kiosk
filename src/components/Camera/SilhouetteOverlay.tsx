

type SilhouetteOverlayProps = {
    isValid: boolean
}

export const SilhouetteOverlay = ({ isValid }: SilhouetteOverlayProps) => {
    // Green (valid), Red (invalid/default)
    const strokeColor = isValid ? '#00FF00' : '#FF0000'

    // Dotted line style
    const strokeDasharray = "4 4"

    return (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-70">
            <svg
                viewBox="0 0 100 133"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full"
                style={{ filter: 'drop-shadow(0px 0px 4px rgba(0,0,0,0.5))' }}
            >
                {/* 
          A-Pose Silhouette Path
          Designed to be inclusive (wide enough for various body types)
          Head centered at 50, ~15
          Shoulders broad
          Arms slightly out (A-pose)
          Legs apart
        */}
                <path
                    d="
            M 50 12
            A 9 9 0 1 1 50 30
            A 9 9 0 1 1 50 12
            M 50 30
            L 50 32
            
            M 32 35
            Q 50 38 68 35
            L 85 65
            L 78 70
            L 65 55
            L 65 80
            L 70 125
            L 55 125
            L 52 85
            L 48 85
            L 45 125
            L 30 125
            L 35 80
            L 35 55
            L 22 70
            L 15 65
            L 32 35
          "
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1.5"
                    strokeDasharray={strokeDasharray}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />

                {/* Optional: Add some guide lines or markers if needed, but keeping it simple for now */}
            </svg>
        </div>
    )
}
