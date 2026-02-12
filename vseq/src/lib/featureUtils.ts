export const getFeatureColor = (type: string): { bg: string; text: string; border: string } => {
    const lowerType = type.toLowerCase();

    switch (lowerType) {
        case 'cds':
            return { bg: 'bg-blue-500/30', text: 'text-blue-300', border: 'border-blue-500' };
        case 'promoter':
            return { bg: 'bg-green-500/30', text: 'text-green-300', border: 'border-green-500' };
        case 'enhancer':
            return { bg: 'bg-emerald-500/30', text: 'text-emerald-300', border: 'border-emerald-500' };
        case 'primer_bind':
            return { bg: 'bg-purple-500/30', text: 'text-purple-300', border: 'border-purple-500' };
        case 'polya_signal':
            return { bg: 'bg-yellow-500/30', text: 'text-yellow-300', border: 'border-yellow-500' };
        case 'rep_origin':
            return { bg: 'bg-orange-500/30', text: 'text-orange-300', border: 'border-orange-500' };
        case 'protein_bind':
            return { bg: 'bg-pink-500/30', text: 'text-pink-300', border: 'border-pink-500' };
        case 'misc_feature':
        default:
            return { bg: 'bg-gray-500/30', text: 'text-gray-300', border: 'border-gray-500' };
    }
};

// Helper to get raw hex colors if needed for canvas/SVG later
export const getFeatureColorHex = (type: string): string => {
    const lowerType = type.toLowerCase();
    switch (lowerType) {
        case 'cds': return '#3b82f6'; // blue-500
        case 'promoter': return '#22c55e'; // green-500
        case 'enhancer': return '#10b981'; // emerald-500
        case 'primer_bind': return '#a855f7'; // purple-500
        case 'polya_signal': return '#eab308'; // yellow-500
        case 'rep_origin': return '#f97316'; // orange-500
        case 'protein_bind': return '#ec4899'; // pink-500
        default: return '#6b7280'; // gray-500
    }
};

// Coordinate helpers for Circular View
export const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
};

export const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    const d = [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
    return d;
};

/**
 * Describe a filled wedge arc (annular sector) for circular map features.
 * Returns an SVG path for a filled region between innerRadius and outerRadius.
 * Optionally adds an arrowhead at the end based on strand direction.
 */
export const describeFeatureArc = (
    cx: number,
    cy: number,
    innerRadius: number,
    outerRadius: number,
    startAngle: number,
    endAngle: number,
    strand: 1 | -1,
): string => {
    const angleDiff = endAngle - startAngle;
    const arrowAngle = Math.min(5, angleDiff * 0.3); // Arrow takes up to 30% or 5 degrees

    if (strand === 1) {
        // Forward: arrowhead at endAngle
        const bodyEnd = endAngle - arrowAngle;
        const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
        const outerEnd = polarToCartesian(cx, cy, outerRadius, bodyEnd);
        const arrowTip = polarToCartesian(cx, cy, (innerRadius + outerRadius) / 2, endAngle);
        const innerEnd = polarToCartesian(cx, cy, innerRadius, bodyEnd);
        const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);

        const largeArc = (bodyEnd - startAngle) > 180 ? 1 : 0;

        return [
            `M ${outerStart.x} ${outerStart.y}`,
            `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
            `L ${arrowTip.x} ${arrowTip.y}`,
            `L ${innerEnd.x} ${innerEnd.y}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
            'Z',
        ].join(' ');
    } else {
        // Reverse: arrowhead at startAngle
        const bodyStart = startAngle + arrowAngle;
        const outerStart = polarToCartesian(cx, cy, outerRadius, bodyStart);
        const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
        const arrowTip = polarToCartesian(cx, cy, (innerRadius + outerRadius) / 2, startAngle);
        const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
        const innerStart = polarToCartesian(cx, cy, innerRadius, bodyStart);

        const largeArc = (endAngle - bodyStart) > 180 ? 1 : 0;

        return [
            `M ${outerStart.x} ${outerStart.y}`,
            `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
            `L ${innerEnd.x} ${innerEnd.y}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
            `L ${arrowTip.x} ${arrowTip.y}`,
            'Z',
        ].join(' ');
    }
};
