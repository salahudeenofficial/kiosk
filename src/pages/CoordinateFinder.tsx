import React, { useState, useRef, useMemo } from 'react';

type Point = { x: number, y: number };
type Line = { label: string, start: Point, end: Point, type: 'line' };
type Path = { label: string, points: Point[], type: 'path' };
type Shape = Line | Path;

const FEMALE_SHAPES: Shape[] = [
    {
        "label": "Shoulder",
        "points": [
            { "x": 46.44672555890046, "y": 18.099491684350788 },
            { "x": 45.18333909095396, "y": 19.047031535310666 },
            { "x": 43.76202931451414, "y": 20.152494694763856 },
            { "x": 42.0248729210877, "y": 20.784187928737108 },
            { "x": 40.919409761634505, "y": 21.257957854217047 },
            { "x": 39.97186991067463, "y": 22.99511424764349 },
            { "x": 39.81394660218132, "y": 23.468884173123428 },
            { "x": 39.340176676701375, "y": 24.258500715589992 },
            { "x": 39.340176676701375, "y": 25.363963875043183 },
            { "x": 39.182253368208066, "y": 26.31150372600306 }
        ],
        "type": "path"
    },
    {
        "label": "Shoulder",
        "points": [
            { "x": 53.079504515619604, "y": 17.15195183339091 },
            { "x": 54.97458421753936, "y": 18.573261609830727 },
            { "x": 57.027587227952424, "y": 19.36287815229729 },
            { "x": 58.448897004392244, "y": 19.36287815229729 },
            { "x": 60.343976706312, "y": 20.152494694763856 },
            { "x": 61.291516557271876, "y": 21.100034545723734 },
            { "x": 61.6073631742585, "y": 22.205497705176924 },
            { "x": 61.6073631742585, "y": 24.416424024083305 },
            { "x": 62.239056408231754, "y": 25.048117258056557 },
            { "x": 62.239056408231754, "y": 25.67981049202981 }
        ],
        "type": "path"
    }
];

const MALE_SHAPES: Shape[] = [
    {
        "label": "Shoulder",
        "points": [
            { "x": 45.18333909095396, "y": 17.941568375857475 },
            { "x": 43.60410600602083, "y": 18.415338301337414 },
            { "x": 41.39317968711445, "y": 19.83664807777723 },
            { "x": 39.81394660218132, "y": 20.626264620243795 },
            { "x": 38.708483442728124, "y": 20.94211123723042 },
            { "x": 38.550560134234814, "y": 22.52134432216355 },
            { "x": 37.760943591768246, "y": 23.468884173123428 },
            { "x": 37.28717366628831, "y": 24.10057740709668 },
            { "x": 36.81340374080837, "y": 25.048117258056557 },
            { "x": 36.65548043231506, "y": 25.83773380052312 }
        ],
        "type": "path"
    },
    {
        "label": "Shoulder",
        "points": [
            { "x": 53.39535113260623, "y": 17.309875141884223 },
            { "x": 54.18496767507279, "y": 17.783645067364162 },
            { "x": 55.92212406849924, "y": 18.73118491832404 },
            { "x": 58.13305038740562, "y": 19.36287815229729 },
            { "x": 59.238513546858805, "y": 19.994571386270543 },
            { "x": 60.343976706312, "y": 21.257957854217047 },
            { "x": 61.13359324877856, "y": 22.52134432216355 },
            { "x": 61.6073631742585, "y": 23.468884173123428 },
            { "x": 61.6073631742585, "y": 24.258500715589992 },
            { "x": 61.6073631742585, "y": 24.890193949563244 }
        ],
        "type": "path"
    }
];

const CoordinateFinder = () => {
    const [selectedImage, setSelectedImage] = useState('figure1.png');
    // We store both lines and paths in a unified shapes array for rendering order/storage
    const [shapes, setShapes] = useState<Shape[]>(FEMALE_SHAPES);

    // Interaction state
    const [currentMode, setCurrentMode] = useState<'line' | 'path'>('line');
    const [currentStart, setCurrentStart] = useState<Point | null>(null); // For line mode
    const [currentPath, setCurrentPath] = useState<Point[]>([]); // For path mode
    const [currentLabel, setCurrentLabel] = useState('Shoulder');

    // Simulation state
    // Simulation state: Fit Score (Tight to Loose)
    const [fitScore, setFitScore] = useState(0); // -10 to 10

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

        if (currentMode === 'line') {
            if (!currentStart) {
                setCurrentStart(point);
            } else {
                setShapes([...shapes, { label: currentLabel, start: currentStart, end: point, type: 'line' }]);
                setCurrentStart(null);
            }
        } else {
            // Path mode
            setCurrentPath([...currentPath, point]);
        }
    };

    const finishPath = () => {
        if (currentPath.length < 2) return;
        setShapes([...shapes, { label: currentLabel, points: currentPath, type: 'path' }]);
        setCurrentPath([]);
    };

    const undoLast = () => {
        if (currentMode === 'line') {
            if (currentStart) {
                setCurrentStart(null);
            } else {
                setShapes(shapes.slice(0, -1));
            }
        } else {
            if (currentPath.length > 0) {
                setCurrentPath(currentPath.slice(0, -1));
            } else {
                setShapes(shapes.slice(0, -1));
            }
        }
    };

    const clearAll = () => {
        setShapes([]);
        setCurrentStart(null);
        setCurrentPath([]);
    };

    // Helper to get total length of a path (in percentage units)
    const getPathLength = (points: Point[]) => {
        let length = 0;
        for (let i = 0; i < points.length - 1; i++) {
            const dx = points[i + 1].x - points[i].x;
            const dy = points[i + 1].y - points[i].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }
        return length;
    };

    // Helper to get points for a partial path based on ratio (0.0 to 1.0)
    const getPartialPath = (points: Point[], ratio: number) => {
        if (points.length < 2) return points;
        if (ratio >= 1) return points;
        if (ratio <= 0) return [points[0]];

        const totalLength = getPathLength(points);
        const targetLength = totalLength * ratio;

        const result: Point[] = [points[0]];
        let currentLength = 0;

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segLength = Math.sqrt(dx * dx + dy * dy);

            if (currentLength + segLength > targetLength) {
                // Determine the crop point
                const remaining = targetLength - currentLength;
                const segRatio = remaining / segLength;
                result.push({
                    x: p1.x + dx * segRatio,
                    y: p1.y + dy * segRatio
                });
                break;
            } else {
                result.push(p2);
                currentLength += segLength;
            }
        }
        return result;
    };

    // Interpreted Logic:
    // User assumes a "10 dot" path.
    // Base State (Score 0): "First 5 dots are important" -> 50% length.
    // Worst Negative (-10): "Only two points passed" (Neglect 2 from 5) -> 3 dots -> 30% length.
    // Positive Score (0 to 10): "Draw 6 to 10 dots" -> Scale from 50% to 100%.
    const displayRatio = useMemo(() => {
        if (fitScore < 0) {
            // Range -10 to 0
            // Map -10 -> 0.3
            // Map 0 -> 0.5
            // Formula: 0.5 + (score/10 * 0.2) -> 0.5 + (-1 * 0.2) = 0.3
            return 0.5 + (fitScore / 10) * 0.2;
        } else {
            // Range 0 to 10
            // Map 0 -> 0.5
            // Map 10 -> 1.0
            // Formula: 0.5 + (score/10 * 0.5)
            // Note: fitScore is 0-10 here.
            return 0.5 + (fitScore / 10) * 0.5;
        }
    }, [fitScore]);

    // Color based on fit score (Negative=Tight, Positive=Loose)
    const pathColor = useMemo(() => {
        // -10 (3 dots) -> Red
        // -5  (4 dots) -> Orange "4th line"
        // 0   (5 dots) -> Green  "5th line"
        // >0  (6+ dots) -> Blue

        if (fitScore <= -6) {
            return '#ef4444'; // Red (Tightest)
        } else if (fitScore < 0) {
            return '#f97316'; // Orange (Tight)
        } else if (fitScore === 0) {
            return '#22c55e'; // Green (Perfect/Base)
        } else {
            return '#3b82f6'; // Blue (Loose)
        }
    }, [fitScore]);

    return (
        <div className="p-4 max-w-full mx-auto bg-white min-h-screen text-slate-900 overflow-y-auto">
            <h1 className="text-2xl font-bold mb-4">Coordinate Finder Tool</h1>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 max-w-2xl">
                    <div className="mb-4 flex flex-wrap gap-4 items-center bg-gray-100 p-2 rounded">
                        <select
                            className="border p-2 rounded"
                            value={selectedImage}
                            onChange={(e) => {
                                const newVal = e.target.value;
                                setSelectedImage(newVal);
                                if (newVal === 'figure1.png') {
                                    setShapes(FEMALE_SHAPES);
                                } else if (newVal === 'figure2.png') {
                                    setShapes(MALE_SHAPES);
                                } else {
                                    setShapes([]); // Default empty for unknown
                                }
                                setCurrentStart(null);
                                setCurrentPath([]);
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
                            <option value="Custom">Custom</option>
                        </select>

                        <div className="flex items-center gap-2 border-l pl-4 border-gray-300">
                            <label className="font-semibold text-sm">Mode:</label>
                            <div className="flex rounded overflow-hidden border border-gray-300">
                                <button
                                    className={`px-3 py-1 text-sm ${currentMode === 'line' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                    onClick={() => setCurrentMode('line')}
                                >
                                    2-Pt Line
                                </button>
                                <button
                                    className={`px-3 py-1 text-sm ${currentMode === 'path' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                    onClick={() => setCurrentMode('path')}
                                >
                                    Multi-Pt Path
                                </button>
                            </div>
                        </div>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={usePercentage}
                                onChange={(e) => setUsePercentage(e.target.checked)}
                            />
                            Use %
                        </label>
                    </div>

                    <div className="mb-4 p-3 bg-slate-900 text-white rounded">
                        <div className="flex items-center justify-between mb-2">
                            <label className="font-bold text-sm">Simulation: Fit Score (-10 to +10)</label>
                            <span className="font-mono">{fitScore}</span>
                        </div>
                        <input
                            type="range"
                            min="-10"
                            max="10"
                            step="1"
                            value={fitScore}
                            onChange={(e) => setFitScore(parseFloat(e.target.value))}
                            className={`w-full ${fitScore < 0 ? 'accent-red-500' : 'accent-blue-500'}`}
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>-10 (Tight/Short)</span>
                            <span>Line Length: {(displayRatio * 100).toFixed(0)}%</span>
                            <span>+10 (Loose/Full)</span>
                        </div>
                    </div>

                    <div className="relative inline-block border-2 border-slate-300 w-full bg-gray-50">
                        <img
                            ref={imageRef}
                            src={`/figures/${selectedImage}`}
                            alt="Target"
                            className="w-full h-auto cursor-crosshair block select-none"
                            onClick={handleImageClick}
                        />
                        {/* Visualize existing shapes */}
                        {/* Layer for Lines (SVG) */}
                        <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                            {shapes.map((shape, i) => {
                                if (shape.type === 'line') {
                                    return (
                                        <g key={i}>
                                            <line
                                                x1={`${shape.start.x}%`}
                                                y1={`${shape.start.y}%`}
                                                x2={`${shape.end.x}%`}
                                                y2={`${shape.end.y}%`}
                                                stroke="red"
                                                strokeWidth="2"
                                            />
                                            <text x={`${shape.start.x}%`} y={`${shape.start.y}%`} fill="red" fontSize="12" dy="-5">
                                                {shape.label}
                                            </text>
                                        </g>
                                    );
                                }
                                return null;
                            })}
                        </svg>

                        {/* Layer for Paths (SVG with viewBox for easier Path logic) */}
                        <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                            {shapes.map((shape, i) => {
                                if (shape.type === 'path') {
                                    const visiblePoints = getPartialPath(shape.points, displayRatio);
                                    // Generate path data
                                    const dVisible = visiblePoints.length > 1 ? visiblePoints.map((p, idx) => idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ') : '';

                                    return (
                                        <g key={`path-group-${i}`}>
                                            {/* Reference Dots (All points) */}
                                            {shape.points.map((p, idx) => (
                                                <circle key={`dot-${i}-${idx}`} cx={p.x} cy={p.y} r="0.5" fill="rgba(0,0,0,0.5)" />
                                            ))}

                                            {/* Full Path Trace (Faint) */}
                                            {/* <path d={dWait} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" /> */}

                                            {/* Visible Path (Colored) */}
                                            {dVisible && (
                                                <path
                                                    d={dVisible}
                                                    fill="none"
                                                    stroke={pathColor}
                                                    strokeWidth="1"
                                                    strokeLinecap="round"
                                                    style={{ filter: 'drop-shadow(0 0 4px currentColor)' }}
                                                    vectorEffect="non-scaling-stroke" // NOTE: This might not work perfectly with viewBox scaling but let's try
                                                />
                                            )}
                                        </g>
                                    );
                                }
                                return null;
                            })}

                            {/* Current Path Draft */}
                            {currentPath.length > 0 && (
                                <g>
                                    <path
                                        d={`M ${currentPath.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                                        fill="none"
                                        stroke="blue"
                                        strokeWidth="0.5"
                                        strokeDasharray="1 1"
                                    />
                                    {currentPath.map((p, idx) => (
                                        <circle key={`curr-${idx}`} cx={p.x} cy={p.y} r="0.8" fill="blue" />
                                    ))}
                                </g>
                            )}
                        </svg>

                        {/* Current start point for Line mode */}
                        <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                            {currentStart && (
                                <circle cx={`${currentStart.x}%`} cy={`${currentStart.y}%`} r="4" fill="blue" />
                            )}
                        </svg>
                    </div>

                    <div className="mt-2 text-sm text-gray-500">
                        {currentMode === 'line'
                            ? "Click start point, then click end point."
                            : "Click to add points. Click 'Finish Path' to save."}
                    </div>
                </div>

                <div className="w-80 space-y-4">
                    <div className="p-4 border rounded bg-gray-50">
                        <h3 className="font-bold mb-2">Instructions</h3>
                        <ol className="list-decimal pl-4 space-y-1 text-sm">
                            <li>Select Image & Label</li>
                            <li>Choose <strong>Mode</strong> (Line vs Path)</li>
                            <li><strong>Path Mode:</strong> Click multiple points along the outline.</li>
                            <li>Click "Finish" to save the path.</li>
                            <li>Use <strong>Loose Score</strong> slider to preview effect.</li>
                        </ol>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        {currentMode === 'path' && currentPath.length > 0 && (
                            <button onClick={finishPath} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 w-full font-bold">
                                Finish Path ({currentPath.length} pts)
                            </button>
                        )}
                        <button onClick={undoLast} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 flex-1">Undo</button>
                        <button onClick={clearAll} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex-1">Clear All</button>
                    </div>

                    <div>
                        <h3 className="font-bold mb-2">Generated Config</h3>
                        <textarea
                            className="w-full h-64 p-2 border rounded font-mono text-xs"
                            readOnly
                            value={JSON.stringify(shapes, null, 2)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoordinateFinder;
