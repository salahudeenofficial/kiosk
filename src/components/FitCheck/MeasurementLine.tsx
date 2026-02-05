import React from 'react';

type FitStatus = 'perfect' | 'tight' | 'loose';

interface MeasurementLineProps {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    status: FitStatus;
    label: string;
    value: string;
    isHovered?: boolean;
}

const MeasurementLine: React.FC<MeasurementLineProps> = ({
    x1, y1, x2, y2,
    status,
    label,
    // value, // Unused
    isHovered = false
}) => {
    // Determine color based on status
    const getColor = (status: FitStatus) => {
        switch (status) {
            case 'perfect': return '#0fc505'; // Brighter Green
            case 'tight': return '#ff1717'; // Brighter Red
            case 'loose': return '#01e2ff'; // Brighter Blue
            default: return '#94a3b8'; // Slate-400
        }
    };

    const color = getColor(status);
    const id = `gradient-${label.replace(/\s+/g, '-').toLowerCase()}`;

    // Calculate control point for curve (bend down)
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    // Amount to bend - proportional to width, or fixed?
    // Let's use a slight fixed bend + proportional to width
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Only bend "down" (positive Y) if it's mostly horizontal
    // If it's vertical (like inseam), we might not want to bend it, or bend it slightly?
    const isHorizontal = Math.abs(dx) > Math.abs(dy);

    let bendFactor = 0.15; // Default 15%
    if (label.toLowerCase() === 'shoulder') {
        bendFactor = 0.08; // Shoulder 8%
    }

    const bendAmount = isHorizontal ? length * bendFactor : 0;

    const cx = midX;
    const cy = midY + bendAmount;

    return (
        <g
            style={{
                opacity: isHovered ? 1 : 0.8,
                transition: 'opacity 0.3s ease-in-out',
                cursor: 'pointer'
            }}
        >
            <defs>
                <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={color} stopOpacity="0" />
                    <stop offset="50%" stopColor={color} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* The Gradient Curve */}
            <path
                d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                fill="none"
                stroke={`url(#${id})`}
                strokeWidth="1"
                strokeLinecap="round"
            />

            {/* Label and Value */}
            {/* We position text near the center or slightly to the right/left based on layout */}
            {/* For this specific design, we might want to standardize where labels go, 
                but centering them on the line is a good default for "on-body" visualization */}

            {/* Label and Value removed as per request */}
        </g>
    );
};

export default MeasurementLine;
