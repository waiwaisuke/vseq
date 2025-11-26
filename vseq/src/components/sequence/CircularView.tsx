import { getFeatureColorHex, describeArc } from '../../lib/featureUtils';
import type { SequenceData } from '../../types';

interface CircularViewProps {
    data: SequenceData;
    zoomLevel?: number;
}

export const CircularView = ({ data, zoomLevel = 1.0 }: CircularViewProps) => {
    const baseWidth = 600;
    const baseHeight = 600;
    const width = baseWidth * zoomLevel;
    const height = baseHeight * zoomLevel;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 200 * zoomLevel;
    const featureWidth = 15 * zoomLevel;

    const totalLength = data.sequence.length;

    // Helper to convert base position to angle (degrees)
    const getAngle = (pos: number) => {
        return (pos / totalLength) * 360;
    };

    return (
        <div className="flex items-center justify-center h-full overflow-auto p-4">
            <div className="relative">
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                    {/* Backbone */}
                    <circle
                        cx={centerX}
                        cy={centerY}
                        r={radius}
                        fill="none"
                        stroke="#374151"
                        strokeWidth="2"
                    />

                    {/* Features */}
                    {data.features.map((feature, index) => {
                        const startAngle = getAngle(feature.start);
                        const endAngle = getAngle(feature.end);
                        const color = getFeatureColorHex(feature.type);
                        // const isReverse = feature.strand === -1;

                        // Calculate arc path
                        // For simplicity in this prototype, we'll draw a simple arc
                        // A more complex implementation would handle arrows and wrapping properly

                        let pathD = "";

                        if (feature.end < feature.start) {
                            // Wrap around case
                            // Draw two arcs or handle as one large arc?
                            // Simple approach: draw from start to 360/0, then 0 to end
                            // But describeArc handles angles > 360 if we just add 360 to end?
                            // Let's try adding 360 to end angle if it's smaller
                            pathD = describeArc(centerX, centerY, radius, startAngle, endAngle + 360);
                        } else {
                            pathD = describeArc(centerX, centerY, radius, startAngle, endAngle);
                        }

                        // Arrowhead logic (simplified for now - just a marker or thickened end?)
                        // For now, let's just render the arc with a thicker stroke

                        return (
                            <g key={`${feature.type}-${index}`} className="group cursor-pointer">
                                <path
                                    d={pathD}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth={featureWidth}
                                    strokeOpacity="0.6"
                                    className="transition-all duration-200 hover:stroke-opacity-100 hover:stroke-width-[20]"
                                >
                                    <title>{`${feature.name || feature.type} (${feature.start}-${feature.end})`}</title>
                                </path>
                            </g>
                        );
                    })}

                    {/* Center Text */}
                    <text x={centerX} y={centerY - 10} textAnchor="middle" fill="#e5e7eb" className="text-xl font-bold">
                        {data.name}
                    </text>
                    <text x={centerX} y={centerY + 15} textAnchor="middle" fill="#9ca3af" className="text-sm">
                        {data.sequence.length} bp
                    </text>
                </svg>
            </div>
        </div>
    );
};
