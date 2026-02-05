import React, { useState, useRef } from 'react';

const CoordinateFinder = () => {
    const [selectedImage, setSelectedImage] = useState('figure1.png');
    const [lines, setLines] = useState<{ label: string, start: { x: number, y: number }, end: { x: number, y: number } }[]>([]);
    const [currentStart, setCurrentStart] = useState<{ x: number, y: number } | null>(null);
    const [currentLabel, setCurrentLabel] = useState('Chest');

    // Relative coordinates (percentage)
    const [usePercentage, setUsePercentage] = useState(true);

    const imageRef = useRef<HTMLImageElement>(null);

    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (!imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;

        // Calculate percentage coordinates
        const x = usePercentage ? (rawX / rect.width) * 100 : rawX;
        const y = usePercentage ? (rawY / rect.height) * 100 : rawY;

        const point = { x, y };

        if (!currentStart) {
            setCurrentStart(point);
        } else {
            setLines([...lines, { label: currentLabel, start: currentStart, end: point }]);
            setCurrentStart(null);
        }
    };

    const undoLast = () => {
        if (currentStart) {
            setCurrentStart(null);
        } else {
            setLines(lines.slice(0, -1));
        }
    };

    const clearAll = () => {
        setLines([]);
        setCurrentStart(null);
    };

    return (
        <div className="p-4 max-w-full mx-auto bg-white min-h-screen text-slate-900 overflow-y-auto">
            <h1 className="text-2xl font-bold mb-4">Coordinate Finder Tool</h1>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 max-w-2xl">
                    <div className="mb-4 flex gap-4 items-center">
                        <select
                            className="border p-2 rounded"
                            value={selectedImage}
                            onChange={(e) => {
                                setSelectedImage(e.target.value);
                                clearAll();
                            }}
                        >
                            <option value="figure1.png">Figure 1 (Female)</option>
                            <option value="figure2.png">Figure 2 (Male)</option>
                        </select>

                        <select
                            className="border p-2 rounded"
                            value={currentLabel}
                            onChange={(e) => setCurrentLabel(e.target.value)}
                        >
                            <option value="Shoulder">Shoulder</option>
                            <option value="Chest">Chest</option>
                            <option value="Waist">Waist</option>
                            <option value="Hips">Hips</option>
                            <option value="Inseam">Inseam</option>
                        </select>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={usePercentage}
                                onChange={(e) => setUsePercentage(e.target.checked)}
                            />
                            Use Percentage (%)
                        </label>
                    </div>

                    <div className="relative inline-block border-2 border-slate-300 w-full">
                        <img
                            ref={imageRef}
                            src={`/figures/${selectedImage}`}
                            alt="Target"
                            className="w-full h-auto cursor-crosshair block"
                            onClick={handleImageClick}
                        />
                        {/* Visualize existing lines */}
                        <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                            {lines.map((line, i) => (
                                <g key={i}>
                                    <line
                                        x1={`${line.start.x}%`}
                                        y1={`${line.start.y}%`}
                                        x2={`${line.end.x}%`}
                                        y2={`${line.end.y}%`}
                                        stroke="red"
                                        strokeWidth="2"
                                    />
                                    <text x={`${line.start.x}%`} y={`${line.start.y}%`} fill="red" fontSize="12" dy="-5">
                                        {line.label}
                                    </text>
                                </g>
                            ))}
                            {currentStart && (
                                <circle cx={`${currentStart.x}%`} cy={`${currentStart.y}%`} r="4" fill="blue" />
                            )}
                        </svg>
                    </div>

                    <div className="mt-2 text-sm text-gray-500">
                        Click start point, then click end point.
                    </div>
                </div>

                <div className="w-80 space-y-4">
                    <div className="p-4 border rounded bg-gray-50">
                        <h3 className="font-bold mb-2">Instructions</h3>
                        <ol className="list-decimal pl-4 space-y-1">
                            <li>Select Image</li>
                            <li>Select Body Part Label</li>
                            <li>Click LEFT edge of the measurement</li>
                            <li>Click RIGHT edge of the measurement</li>
                            <li>Copy the generated config</li>
                        </ol>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={undoLast} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">Undo</button>
                        <button onClick={clearAll} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Clear All</button>
                    </div>

                    <div>
                        <h3 className="font-bold mb-2">Generated Config</h3>
                        <textarea
                            className="w-full h-64 p-2 border rounded font-mono text-xs"
                            readOnly
                            value={JSON.stringify(lines, null, 2)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoordinateFinder;
