import { getFeatureColorHex } from '../../lib/featureUtils';
import type { SequenceData } from '../../types';

interface LinearMapViewProps {
    data: SequenceData;
    zoomLevel?: number;
}

export const LinearMapView = ({ data, zoomLevel = 1.0 }: LinearMapViewProps) => {
    const baseWidth = 1000;
    const baseHeight = 400;
    const width = baseWidth * zoomLevel;
    const height = baseHeight * zoomLevel;
    const padding = 50 * zoomLevel;
    const rulerHeight = 40 * zoomLevel;
    const featureTrackHeight = 60 * zoomLevel;
    const totalLength = data.sequence.length;

    // Calculate scale factor
    const availableWidth = width - (2 * padding);
    const scale = availableWidth / totalLength;

    // Helper to convert base position to x coordinate
    const getX = (pos: number) => {
        return padding + (pos * scale);
    };

    // Generate tick marks for the ruler
    const ticks = [];
    const tickInterval = Math.pow(10, Math.floor(Math.log10(totalLength / 10)));
    for (let i = 0; i <= totalLength; i += tickInterval) {
        ticks.push(i);
    }

    return (
        <div className="flex items-center justify-center h-full overflow-auto p-4">
            <div className="relative">
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                    {/* Title */}
                    <text x={width / 2} y={30} textAnchor="middle" fill="#e5e7eb" className="text-lg font-bold">
                        {data.name}
                    </text>
                    <text x={width / 2} y={50} textAnchor="middle" fill="#9ca3af" className="text-sm">
                        {data.sequence.length} bp (Linear)
                    </text>

                    {/* Ruler baseline */}
                    <line
                        x1={padding}
                        y1={rulerHeight + 60}
                        x2={width - padding}
                        y2={rulerHeight + 60}
                        stroke="#4b5563"
                        strokeWidth="2"
                    />

                    {/* Tick marks */}
                    {ticks.map((tick) => (
                        <g key={tick}>
                            <line
                                x1={getX(tick)}
                                y1={rulerHeight + 60}
                                x2={getX(tick)}
                                y2={rulerHeight + 70}
                                stroke="#6b7280"
                                strokeWidth="1"
                            />
                            <text
                                x={getX(tick)}
                                y={rulerHeight + 85}
                                textAnchor="middle"
                                fill="#9ca3af"
                                className="text-xs"
                            >
                                {tick}
                            </text>
                        </g>
                    ))}

                    {/* Features */}
                    {data.features.map((feature, index) => {
                        const startX = getX(feature.start);
                        const endX = getX(feature.end);
                        const featureWidth = Math.max(endX - startX, 2); // Minimum 2px width
                        const color = getFeatureColorHex(feature.type);
                        const y = rulerHeight + 100 + (index % 3) * 70; // Stagger features in 3 tracks

                        return (
                            <g key={`${feature.type}-${index}`} className="group cursor-pointer">
                                {/* Feature box */}
                                <rect
                                    x={startX}
                                    y={y}
                                    width={featureWidth}
                                    height={featureTrackHeight}
                                    fill={color}
                                    fillOpacity="0.6"
                                    stroke={color}
                                    strokeWidth="2"
                                    className="transition-all duration-200 hover:fill-opacity-100"
                                >
                                    <title>{`${feature.name || feature.type} (${feature.start}-${feature.end})`}</title>
                                </rect>

                                {/* Arrow indicator for strand direction */}
                                {feature.strand === 1 && (
                                    <polygon
                                        points={`${endX - 5},${y + 20} ${endX},${y + 30} ${endX - 5},${y + 40}`}
                                        fill={color}
                                    />
                                )}
                                {feature.strand === -1 && (
                                    <polygon
                                        points={`${startX + 5},${y + 20} ${startX},${y + 30} ${startX + 5},${y + 40}`}
                                        fill={color}
                                    />
                                )}

                                {/* Feature label (if width allows) */}
                                {featureWidth > 50 && (
                                    <text
                                        x={startX + featureWidth / 2}
                                        y={y + featureTrackHeight / 2 + 5}
                                        textAnchor="middle"
                                        fill="#ffffff"
                                        className="text-xs font-medium"
                                    >
                                        {feature.name || feature.type}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};
