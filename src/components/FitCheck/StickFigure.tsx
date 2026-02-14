import React from 'react';
import { motion } from 'framer-motion';

interface StickFigureProps {
    scores: Record<string, number | null>;
    gender?: string;
}

// Helper for smooth color transition (Same as FitCheckScreen logic)
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

const getColorForScore = (score: number | null) => {
    if (score === null || score === undefined) return '#cbd5e1'; // Slate-300 for no data

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
};

const StickFigure: React.FC<StickFigureProps> = ({ scores, gender: _gender = 'female' }) => {
    // Colors for dynamic parts
    const shoulderColor = getColorForScore(scores['shoulder']);
    const chestColor = getColorForScore(scores['chest']);
    const waistColor = getColorForScore(scores['waist']);
    const hipColor = getColorForScore(scores['hip']);

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
    const shoulderHeight = 45;
    const chestHeight = 33; // Reduced to 60% of 55
    const waistHeight = 22; // Reduced to 40% of 55
    const hipsHeight = 45;

    const yChestStart = yShoulderStart + shoulderHeight;
    const yWaistStart = yChestStart + chestHeight;
    const yHipsStart = yWaistStart + waistHeight;
    const yLegsStart = yHipsStart + hipsHeight;

    // Limb Configuration
    const armWidth = 22; // Increased width
    const upperArmLength = 75;
    const lowerArmLength = 75;
    const armGap = 8;

    // Leg Dimensions (Tapered)
    const legTopWidth = 36; // Matches new hips bottom width (40*2 = 80 -> 36*2 + 8 = 80)
    const legKneeWidth = 22;
    const legAnkleWidth = 18;

    const upperLegLength = 100;
    const lowerLegLength = 100;
    const legGap = 8;

    // Positioning
    // Ensure ~20% difference (was >30%)
    const shoulderParams = { top: 40, bottom: 38 };  // Reduced width
    const chestParams = { top: 38, bottom: 36 };     // Gentle taper
    const waistParams = { top: 36, bottom: 36 };     // Straight waist (Unisex)
    const hipsParams = { top: 36, bottom: 40 };      // Slight flare, mostly straight

    // Arm positioning
    const armPivotOffset = shoulderParams.top + 13; // Positioned relative to shoulder edge
    // "Start from same line vertically" -> Align y almost with shoulder start
    const yArmStart = yShoulderStart; // Aligned with shoulder start
    const leftArmPivot = { x: centerX - armPivotOffset, y: yArmStart };
    const rightArmPivot = { x: centerX + armPivotOffset, y: yArmStart };

    // Leg positioning - adjusted for hips
    const legOffset = 22; // (legGap + legTopWidth) / 2 -> (8 + 36) / 2 = 22

    return (
        <svg
            viewBox="0 0 300 700"
            className="w-full h-full max-h-[600px]"
            preserveAspectRatio="xMidYMid meet"
        >
            {/* --- HEAD --- */}
            <circle cx={centerX} cy={yHead} r={headRadius} fill={staticColor} />

            {/* --- NECK --- */}
            <rect x={centerX - 8} y={yNeckExactStart} width="16" height={neckHeight + 5} fill={staticColor} />

            {/* --- ARMS (Parallel) --- */}
            {/* LEFT ARM */}
            <g>
                {/* Upper Arm */}
                <rect
                    x={leftArmPivot.x - armWidth / 2}
                    y={leftArmPivot.y}
                    width={armWidth}
                    height={upperArmLength}
                    rx={armWidth / 2}
                    fill={staticColor}
                />
                {/* Lower Arm */}
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
                {/* Upper Arm */}
                <rect
                    x={rightArmPivot.x - armWidth / 2}
                    y={rightArmPivot.y}
                    width={armWidth}
                    height={upperArmLength}
                    rx={armWidth / 2}
                    fill={staticColor}
                />
                {/* Lower Arm */}
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
            {/* Shoulder Measurement Line */}
            <line x1={centerX - (shoulderParams.top - 5)} y1={yShoulderStart + 22} x2={centerX + (shoulderParams.top - 5)} y2={yShoulderStart + 22} stroke={measurementLineColor} strokeWidth="1" strokeDasharray="4 2" />


            {/* --- CHEST (Trapezoid/Rect) --- */}
            <motion.path
                d={`M ${centerX - chestParams.top},${yChestStart} L ${centerX + chestParams.top},${yChestStart} L ${centerX + chestParams.bottom},${yWaistStart} L ${centerX - chestParams.bottom},${yWaistStart} Z`}
                fill={chestColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                animate={{ fill: chestColor }}
                transition={{ duration: 0.5 }}
            />
            {/* Chest Measurement Line */}
            <line
                x1={centerX - (chestParams.top - 5)} y1={yChestStart + 16}
                x2={centerX + (chestParams.top - 5)} y2={yChestStart + 16}
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
            {/* Waist Measurement Line */}
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
