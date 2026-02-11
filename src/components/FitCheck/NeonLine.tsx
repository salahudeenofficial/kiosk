import React from 'react';

interface NeonLineProps {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    score: number | null; // Null means unknown/no score
    label: string;
    isHovered?: boolean;
}

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

const NeonLine: React.FC<NeonLineProps> = ({
    x1, y1, x2, y2,
    score,
    isHovered = false
}) => {
    // 1. Calculate Gradual Color
    const validScore = score || 0;
    const color = React.useMemo(() => {
        if (validScore <= 0) return '#ef4444'; // Red (Tight < 0)

        if (validScore <= 1) {
            // 0 to 1: Red to Orange
            return interpolateColor('#ef4444', '#f97316', validScore);
        }
        if (validScore <= 2) {
            // 1 to 2: Orange to Green
            return interpolateColor('#f97316', '#22c55e', validScore - 1);
        }
        if (validScore <= 4) {
            // 2 to 4: Green to Blue (Transition)
            return interpolateColor('#22c55e', '#3b82f6', (validScore - 2) / 2);
        }
        return '#3b82f6'; // Blue (Loose > 4)
    }, [validScore]);

    // 2. Calculate Intensity (Symmetric)
    const intensity = React.useMemo(() => {
        const absScore = Math.min(10, Math.abs(validScore));
        return 1.0 + (absScore / 10);
    }, [validScore]);

    if (score === null) return null;

    const dVisible = `M ${x1} ${y1} L ${x2} ${y2}`;

    return (
        <g style={{ opacity: isHovered ? 1.0 : 0.9, transition: 'opacity 0.3s' }}>
            {/* Ambient Base (Wide Soft Glow) */}
            <path
                d={dVisible}
                fill="none"
                stroke={color}
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: 'blur(10px)', opacity: Math.min(1, 0.4 * intensity) }}
                vectorEffect="non-scaling-stroke"
            />
            {/* Outer Glow (Atmosphere) */}
            <path
                d={dVisible}
                fill="none"
                stroke={color}
                strokeWidth="14"
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
                style={{ filter: 'blur(2px)', opacity: Math.min(1, 0.9 * intensity) }}
                vectorEffect="non-scaling-stroke"
            />
            {/* Core Filament (Soft Center) */}
            <path
                d={dVisible}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: 'blur(2px)', opacity: Math.min(1, 0.9 * intensity) }}
                vectorEffect="non-scaling-stroke"
            />
        </g>
    );
};

export default NeonLine;
