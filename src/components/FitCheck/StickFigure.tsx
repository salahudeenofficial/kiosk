import React from 'react';
import { motion } from 'framer-motion';

interface StickFigureProps {
    colors: Record<string, string>;
    gender?: string;
}

const DEFAULT_COLOR = '#cbd5e1'; // Slate-300 for no data

const StickFigure: React.FC<StickFigureProps> = ({ colors }) => {
    // Colors for dynamic parts — use zone_colors directly, fallback to default
    const shoulderColor = colors['shoulder'] || DEFAULT_COLOR;
    const chestColor = colors['chest'] || DEFAULT_COLOR;
    const waistColor = colors['waist'] || DEFAULT_COLOR;
    const hipColor = colors['hip'] || DEFAULT_COLOR;

    // Static color for limbs/head
    const staticColor = '#94a3b8'; // Slate-400
    const strokeColor = '#ffffff';
    const strokeWidth = 2;
    const measurementLineColor = 'rgba(255, 255, 255, 0.5)';

    // Dimensions
    const centerX = 150;

    // Proportions (Based on roughly 7.5-8 heads tall figure)
    const headRadius = 24;
    const neckHeight = 22;

    // Vertical Layout
    const yHead = 50;
    const yNeckExactStart = 50 + headRadius - 2; // slight overlap
    const yShoulderStart = yNeckExactStart + neckHeight;

    // Torso Segments Heights
    const shoulderHeight = 18;
    const chestHeight = 60;
    const waistHeight = 22;
    const hipsHeight = 45;

    const yChestStart = yShoulderStart + shoulderHeight;
    const yWaistStart = yChestStart + chestHeight;
    const yHipsStart = yWaistStart + waistHeight;
    const yLegsStart = yHipsStart + hipsHeight;

    // Limb Configuration
    const armWidth = 22;
    const upperArmLength = 75;
    const lowerArmLength = 75;
    const armGap = 8;

    // Leg Dimensions (Tapered)
    const legTopWidth = 36;
    const legKneeWidth = 22;
    const legAnkleWidth = 18;

    const upperLegLength = 100;
    const lowerLegLength = 100;
    const legGap = 8;

    // Positioning
    const shoulderParams = { top: 40, bottom: 38 };
    const chestParams = { top: 38, bottom: 36 };
    const waistParams = { top: 36, bottom: 36 };
    const hipsParams = { top: 36, bottom: 40 };

    // Arm positioning
    const armPivotOffset = shoulderParams.top + 13;
    const yArmStart = yShoulderStart;
    const leftArmPivot = { x: centerX - armPivotOffset, y: yArmStart };
    const rightArmPivot = { x: centerX + armPivotOffset, y: yArmStart };

    // Leg positioning
    const legOffset = 22;

    return (
        <svg
            viewBox="70 16 160 442"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
        >
            {/* --- HEAD --- */}
            <circle cx={centerX} cy={yHead} r={headRadius} fill={staticColor} />

            {/* --- NECK --- */}
            <rect x={centerX - 8} y={yNeckExactStart} width="16" height={neckHeight + 5} fill={staticColor} />

            {/* --- ARMS (Parallel) --- */}
            {/* LEFT ARM */}
            <g>
                <rect
                    x={leftArmPivot.x - armWidth / 2}
                    y={leftArmPivot.y}
                    width={armWidth}
                    height={upperArmLength}
                    rx={armWidth / 2}
                    fill={staticColor}
                />
                <rect
                    x={leftArmPivot.x - armWidth / 2}
                    y={leftArmPivot.y + upperArmLength + armGap}
                    width={armWidth}
                    height={lowerArmLength}
                    rx={armWidth / 2}
                    fill={staticColor}
                />
            </g>

            {/* RIGHT ARM */}
            <g>
                <rect
                    x={rightArmPivot.x - armWidth / 2}
                    y={rightArmPivot.y}
                    width={armWidth}
                    height={upperArmLength}
                    rx={armWidth / 2}
                    fill={staticColor}
                />
                <rect
                    x={rightArmPivot.x - armWidth / 2}
                    y={rightArmPivot.y + upperArmLength + armGap}
                    width={armWidth}
                    height={lowerArmLength}
                    rx={armWidth / 2}
                    fill={staticColor}
                />
            </g>

            {/* --- SHOULDERS (Trapezoid) --- */}
            <motion.path
                d={`M ${centerX - shoulderParams.top},${yShoulderStart} L ${centerX + shoulderParams.top},${yShoulderStart} L ${centerX + shoulderParams.bottom},${yChestStart} L ${centerX - shoulderParams.bottom},${yChestStart} Z`}
                fill={shoulderColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                animate={{ fill: shoulderColor }}
                transition={{ duration: 0.5 }}
            />
            <line x1={centerX - (shoulderParams.top - 5)} y1={yShoulderStart + 9} x2={centerX + (shoulderParams.top - 5)} y2={yShoulderStart + 9} stroke={measurementLineColor} strokeWidth="1" strokeDasharray="4 2" />

            {/* --- CHEST (Trapezoid/Rect) --- */}
            <motion.path
                d={`M ${centerX - chestParams.top},${yChestStart} L ${centerX + chestParams.top},${yChestStart} L ${centerX + chestParams.bottom},${yWaistStart} L ${centerX - chestParams.bottom},${yWaistStart} Z`}
                fill={chestColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                animate={{ fill: chestColor }}
                transition={{ duration: 0.5 }}
            />
            <line
                x1={centerX - (chestParams.top - 5)} y1={yChestStart + 30}
                x2={centerX + (chestParams.top - 5)} y2={yChestStart + 30}
                stroke={measurementLineColor} strokeWidth="1" strokeDasharray="4 2"
            />

            {/* --- WAIST (Trapezoid) --- */}
            <motion.path
                d={`M ${centerX - waistParams.top},${yWaistStart} L ${centerX + waistParams.top},${yWaistStart} L ${centerX + waistParams.bottom},${yHipsStart} L ${centerX - waistParams.bottom},${yHipsStart} Z`}
                fill={waistColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                animate={{ fill: waistColor }}
                transition={{ duration: 0.5 }}
            />
            <line
                x1={centerX - (waistParams.top - 5)} y1={yWaistStart + 11}
                x2={centerX + (waistParams.top - 5)} y2={yWaistStart + 11}
                stroke={measurementLineColor} strokeWidth="1" strokeDasharray="4 2"
            />

            {/* --- HIPS (Trapezoid) --- */}
            <motion.path
                d={`M ${centerX - hipsParams.top},${yHipsStart} L ${centerX + hipsParams.top},${yHipsStart} L ${centerX + hipsParams.bottom},${yLegsStart} L ${centerX - hipsParams.bottom},${yLegsStart} Z`}
                fill={hipColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                animate={{ fill: hipColor }}
                transition={{ duration: 0.5 }}
            />

            {/* --- LEGS --- */}
            {/* Left Leg */}
            <path
                d={`
                    M ${centerX - legOffset - legTopWidth / 2},${yLegsStart}
                    L ${centerX - legOffset + legTopWidth / 2},${yLegsStart}
                    L ${centerX - legOffset + legKneeWidth / 2},${yLegsStart + upperLegLength}
                    L ${centerX - legOffset - legKneeWidth / 2},${yLegsStart + upperLegLength}
                    Z
                `}
                fill={staticColor}
            />
            <path
                d={`
                    M ${centerX - legOffset - legKneeWidth / 2},${yLegsStart + upperLegLength + legGap}
                    L ${centerX - legOffset + legKneeWidth / 2},${yLegsStart + upperLegLength + legGap}
                    L ${centerX - legOffset + legAnkleWidth / 2},${yLegsStart + upperLegLength + legGap + lowerLegLength}
                    L ${centerX - legOffset - legAnkleWidth / 2},${yLegsStart + upperLegLength + legGap + lowerLegLength}
                    Z
                `}
                fill={staticColor}
            />

            {/* Right Leg */}
            <path
                d={`
                    M ${centerX + legOffset - legTopWidth / 2},${yLegsStart}
                    L ${centerX + legOffset + legTopWidth / 2},${yLegsStart}
                    L ${centerX + legOffset + legKneeWidth / 2},${yLegsStart + upperLegLength}
                    L ${centerX + legOffset - legKneeWidth / 2},${yLegsStart + upperLegLength}
                    Z
                `}
                fill={staticColor}
            />
            <path
                d={`
                    M ${centerX + legOffset - legKneeWidth / 2},${yLegsStart + upperLegLength + legGap}
                    L ${centerX + legOffset + legKneeWidth / 2},${yLegsStart + upperLegLength + legGap}
                    L ${centerX + legOffset + legAnkleWidth / 2},${yLegsStart + upperLegLength + legGap + lowerLegLength}
                    L ${centerX + legOffset - legAnkleWidth / 2},${yLegsStart + upperLegLength + legGap + lowerLegLength}
                    Z
                `}
                fill={staticColor}
            />

        </svg>
    );
};

export default StickFigure;
