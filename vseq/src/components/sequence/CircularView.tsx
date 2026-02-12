import { useMemo, useState, useRef, useCallback } from 'react';
import { getFeatureColorHex, polarToCartesian, describeFeatureArc, describeArc } from '../../lib/featureUtils';
import {
    assignTracksCircular,
    getTrackCount,
    calculateCircularDimensions,
    generateRulerTicks,
    resolveLabelCollisions,
} from '../../lib/mapViewUtils';
import { MapContextMenu } from './MapContextMenu';
import type { SequenceData, Feature } from '../../types';
import type { CutSite } from '../../lib/restrictionEnzymes';
import type { ORF } from '../../lib/orfFinder';

interface CircularViewProps {
    data: SequenceData;
    zoomLevel?: number;
    onFeatureClick?: (feature: Feature) => void;
    onNavigateToSequence?: (position: number) => void;
    onSelectRange?: (start: number, end: number) => void;
    searchResults?: { start: number; end: number }[];
    currentMatchIndex?: number;
    showEnzymeSites?: CutSite[];
    showORFs?: ORF[];
}

export const CircularView = ({
    data,
    zoomLevel = 1.0,
    onFeatureClick,
    onNavigateToSequence,
    onSelectRange,
    searchResults,
    currentMatchIndex,
    showEnzymeSites,
    showORFs,
}: CircularViewProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        x: number; y: number; position: number; feature?: Feature;
    } | null>(null);

    const totalLength = data.sequence.length;

    // Smart track assignment for circular layout
    const trackAssignments = useMemo(
        () => assignTracksCircular(data.features, totalLength),
        [data.features, totalLength],
    );
    const trackCount = useMemo(() => getTrackCount(trackAssignments), [trackAssignments]);

    // Dynamic dimensions
    const dim = useMemo(
        () => calculateCircularDimensions(trackCount, zoomLevel),
        [trackCount, zoomLevel],
    );

    // Angle helper: bp position → degrees
    const getAngle = useCallback(
        (pos: number) => (pos / totalLength) * 360,
        [totalLength],
    );

    // Inverse: angle → bp position
    const angleToPos = useCallback(
        (angle: number) => Math.round(((((angle % 360) + 360) % 360) / 360) * totalLength),
        [totalLength],
    );

    // Ruler ticks
    const rulerTicks = useMemo(() => generateRulerTicks(totalLength), [totalLength]);

    // Feature labels with collision resolution
    const featureLabels = useMemo(() => {
        const rawLabels = trackAssignments.map(({ feature }, i) => {
            const midPos = feature.end >= feature.start
                ? (feature.start + feature.end) / 2
                : ((feature.start + feature.end + totalLength) / 2) % totalLength;
            return {
                featureIndex: i,
                angle: getAngle(midPos),
                text: feature.name || feature.type,
            };
        });
        return resolveLabelCollisions(rawLabels);
    }, [trackAssignments, totalLength, getAngle]);

    // Unique feature types for legend
    const legendItems = useMemo(() => {
        const seen = new Map<string, string>();
        for (const f of data.features) {
            if (!seen.has(f.type)) {
                seen.set(f.type, getFeatureColorHex(f.type));
            }
        }
        return Array.from(seen.entries()).map(([type, color]) => ({ type, color }));
    }, [data.features]);

    // --- Event Handlers ---

    const getAngleFromEvent = (e: React.MouseEvent): number | null => {
        if (!svgRef.current) return null;
        const rect = svgRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (dim.size / rect.width) - dim.centerX;
        const y = (e.clientY - rect.top) * (dim.size / rect.height) - dim.centerY;
        // Convert to degrees (0 at top, clockwise)
        let angle = Math.atan2(x, -y) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        return angle;
    };

    const handleFeatureClick = (feature: Feature, e: React.MouseEvent) => {
        e.stopPropagation();
        if (onFeatureClick) onFeatureClick(feature);
    };

    const handleFeatureDoubleClick = (feature: Feature, e: React.MouseEvent) => {
        e.stopPropagation();
        if (onNavigateToSequence) onNavigateToSequence(feature.start);
    };

    const handleFeatureMouseEnter = (feature: Feature, e: React.MouseEvent) => {
        setTooltip({
            x: e.clientX,
            y: e.clientY - 40,
            text: `${feature.name || feature.type} (${feature.start}–${feature.end}, ${feature.strand === 1 ? '+' : '-'})`,
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const angle = getAngleFromEvent(e);
        if (angle === null) return;

        // Show position tooltip near backbone
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (dim.size / rect.width) - dim.centerX;
        const y = (e.clientY - rect.top) * (dim.size / rect.height) - dim.centerY;
        const dist = Math.sqrt(x * x + y * y);
        const outerLimit = dim.backboneRadius + (trackCount + 1) * dim.ringSpacing;

        if (dist >= dim.backboneRadius - 20 && dist <= outerLimit + 20) {
            const pos = angleToPos(angle);
            setTooltip({ x: e.clientX, y: e.clientY - 40, text: `${pos} bp` });
        } else {
            setTooltip(null);
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const angle = getAngleFromEvent(e);
        if (angle === null) return;
        const pos = angleToPos(angle);

        // Find feature under cursor (simplified)
        let clickedFeature: Feature | undefined;
        for (const { feature } of trackAssignments) {
            let startA = getAngle(feature.start);
            let endA = getAngle(feature.end);
            if (feature.end < feature.start) endA += 360;
            let a = angle;
            if (a < startA) a += 360;
            if (a >= startA && a <= endA) {
                clickedFeature = feature;
                break;
            }
        }

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            position: pos,
            feature: clickedFeature,
        });
    };

    // Radius for a given track
    const getTrackRadius = (track: number) =>
        dim.backboneRadius + (track + 1) * dim.ringSpacing;

    // Label ring base radius
    const labelBaseRadius = dim.backboneRadius + (trackCount + 1) * dim.ringSpacing + 10 * zoomLevel;

    // ORF ring radius (inside backbone)
    const orfInnerRadius = dim.backboneRadius - 25 * zoomLevel;

    return (
        <div className="flex items-center justify-center h-full overflow-auto p-4">
            <div className="relative">
                <svg
                    ref={svgRef}
                    width={dim.size}
                    height={dim.size}
                    viewBox={`0 0 ${dim.size} ${dim.size}`}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setTooltip(null)}
                    onContextMenu={handleContextMenu}
                >
                    {/* Backbone circle */}
                    <circle
                        cx={dim.centerX}
                        cy={dim.centerY}
                        r={dim.backboneRadius}
                        fill="none"
                        stroke="#374151"
                        strokeWidth={2}
                    />

                    {/* Position Ruler Ticks */}
                    {rulerTicks.filter(t => t.major).map((tick, i) => {
                        const angle = getAngle(tick.position);
                        const innerPt = polarToCartesian(dim.centerX, dim.centerY, dim.backboneRadius - dim.rulerTickLength, angle);
                        const outerPt = polarToCartesian(dim.centerX, dim.centerY, dim.backboneRadius, angle);
                        const labelPt = polarToCartesian(dim.centerX, dim.centerY, dim.backboneRadius - dim.rulerTickLength - 8 * zoomLevel, angle);
                        return (
                            <g key={`ruler-${i}`}>
                                <line
                                    x1={innerPt.x} y1={innerPt.y}
                                    x2={outerPt.x} y2={outerPt.y}
                                    stroke="#6b7280" strokeWidth={1}
                                />
                                {tick.label && (
                                    <text
                                        x={labelPt.x} y={labelPt.y}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        fill="#9ca3af"
                                        fontSize={8 * zoomLevel}
                                        transform={`rotate(${angle}, ${labelPt.x}, ${labelPt.y})`}
                                    >
                                        {tick.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* Search Result Highlights */}
                    {searchResults?.map((result, i) => {
                        const startA = getAngle(result.start);
                        const endA = getAngle(result.end);
                        const isCurrent = i === currentMatchIndex;
                        const highlightRadius = dim.backboneRadius + 3 * zoomLevel;
                        const pathD = result.end > result.start
                            ? describeArc(dim.centerX, dim.centerY, highlightRadius, startA, endA)
                            : describeArc(dim.centerX, dim.centerY, highlightRadius, startA, endA + 360);
                        return (
                            <path
                                key={`search-${i}`}
                                d={pathD}
                                fill="none"
                                stroke={isCurrent ? '#f59e0b' : '#f97316'}
                                strokeWidth={6 * zoomLevel}
                                strokeOpacity={isCurrent ? 0.8 : 0.4}
                            />
                        );
                    })}

                    {/* Features — filled wedge arcs with arrows */}
                    {trackAssignments.map(({ feature, track }, index) => {
                        const startA = getAngle(feature.start);
                        let endA = getAngle(feature.end);
                        if (feature.end < feature.start) endA += 360;
                        const color = getFeatureColorHex(feature.type);
                        const r = getTrackRadius(track);
                        const innerR = r - dim.featureWidth / 2;
                        const outerR = r + dim.featureWidth / 2;

                        const pathD = describeFeatureArc(
                            dim.centerX, dim.centerY,
                            innerR, outerR,
                            startA, endA,
                            feature.strand,
                        );

                        return (
                            <g
                                key={`${feature.id || feature.type}-${index}`}
                                className="cursor-pointer"
                                onClick={(e) => handleFeatureClick(feature, e)}
                                onDoubleClick={(e) => handleFeatureDoubleClick(feature, e)}
                                onMouseEnter={(e) => handleFeatureMouseEnter(feature, e)}
                                onMouseLeave={() => setTooltip(null)}
                            >
                                <path
                                    d={pathD}
                                    fill={color}
                                    fillOpacity={0.65}
                                    stroke={color}
                                    strokeWidth={1}
                                    className="transition-all duration-150 hover:fill-opacity-100"
                                />
                            </g>
                        );
                    })}

                    {/* Feature Labels with leader lines */}
                    {featureLabels.map((label) => {
                        const r = labelBaseRadius + label.tier * 14 * zoomLevel;
                        const featureR = getTrackRadius(trackAssignments[label.featureIndex]?.track ?? 0);
                        const featurePt = polarToCartesian(dim.centerX, dim.centerY, featureR + dim.featureWidth / 2 + 2 * zoomLevel, label.angle);
                        const labelPt = polarToCartesian(dim.centerX, dim.centerY, r, label.angle);
                        // Determine text anchor based on angle
                        const isRight = label.angle > 0 && label.angle < 180;
                        const textPt = polarToCartesian(dim.centerX, dim.centerY, r + 4 * zoomLevel, label.angle);

                        return (
                            <g key={`label-${label.featureIndex}`}>
                                {/* Leader line */}
                                <line
                                    x1={featurePt.x} y1={featurePt.y}
                                    x2={labelPt.x} y2={labelPt.y}
                                    stroke="#6b7280" strokeWidth={0.5}
                                    strokeDasharray="2 1"
                                />
                                {/* Label text */}
                                <text
                                    x={textPt.x} y={textPt.y}
                                    textAnchor={isRight ? 'start' : 'end'}
                                    dominantBaseline="central"
                                    fill="#d1d5db"
                                    fontSize={9 * zoomLevel}
                                    transform={`rotate(${label.angle > 90 && label.angle < 270 ? label.angle + 180 : label.angle}, ${textPt.x}, ${textPt.y})`}
                                >
                                    {label.text}
                                </text>
                            </g>
                        );
                    })}

                    {/* Restriction Enzyme Sites — radial ticks */}
                    {showEnzymeSites?.map((site, i) => {
                        const angle = getAngle(site.cutPosition);
                        const innerPt = polarToCartesian(dim.centerX, dim.centerY, dim.backboneRadius - 2, angle);
                        const outerPt = polarToCartesian(dim.centerX, dim.centerY, dim.backboneRadius + 8 * zoomLevel, angle);
                        const labelPt = polarToCartesian(dim.centerX, dim.centerY, dim.backboneRadius + 12 * zoomLevel, angle);
                        return (
                            <g key={`enzyme-${i}`}>
                                <line
                                    x1={innerPt.x} y1={innerPt.y}
                                    x2={outerPt.x} y2={outerPt.y}
                                    stroke="#a855f7" strokeWidth={1.5}
                                />
                                <circle cx={outerPt.x} cy={outerPt.y} r={1.5 * zoomLevel} fill="#a855f7" />
                                <text
                                    x={labelPt.x} y={labelPt.y}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fill="#a855f7"
                                    fontSize={7 * zoomLevel}
                                    transform={`rotate(${angle}, ${labelPt.x}, ${labelPt.y})`}
                                >
                                    {site.enzyme.name}
                                </text>
                            </g>
                        );
                    })}

                    {/* ORF Overlays — inner arcs */}
                    {showORFs?.map((orf, i) => {
                        const startA = getAngle(orf.start);
                        const endA = getAngle(orf.end);
                        const color = orf.strand === 1 ? '#22c55e' : '#ef4444';
                        const r = orfInnerRadius - (orf.strand === 1 ? 0 : 10 * zoomLevel);
                        const pathD = orf.end > orf.start
                            ? describeArc(dim.centerX, dim.centerY, r, startA, endA)
                            : describeArc(dim.centerX, dim.centerY, r, startA, endA + 360);
                        return (
                            <path
                                key={`orf-${i}`}
                                d={pathD}
                                fill="none"
                                stroke={color}
                                strokeWidth={5 * zoomLevel}
                                strokeOpacity={0.4}
                            />
                        );
                    })}

                    {/* Center Text */}
                    <text x={dim.centerX} y={dim.centerY - 10 * zoomLevel} textAnchor="middle" fill="#e5e7eb" fontSize={16 * zoomLevel} fontWeight="bold">
                        {data.name}
                    </text>
                    <text x={dim.centerX} y={dim.centerY + 12 * zoomLevel} textAnchor="middle" fill="#9ca3af" fontSize={11 * zoomLevel}>
                        {totalLength} bp
                    </text>

                    {/* Legend */}
                    {legendItems.length > 0 && (
                        <g>
                            {legendItems.map((item, i) => {
                                const lx = 15 + i * 100 * zoomLevel;
                                const ly = dim.size - 20 * zoomLevel;
                                return (
                                    <g key={item.type}>
                                        <rect
                                            x={lx} y={ly}
                                            width={10 * zoomLevel} height={10 * zoomLevel}
                                            fill={item.color} fillOpacity={0.7} rx={2}
                                        />
                                        <text
                                            x={lx + 14 * zoomLevel} y={ly + 8 * zoomLevel}
                                            fill="#9ca3af" fontSize={9 * zoomLevel}
                                        >
                                            {item.type}
                                        </text>
                                    </g>
                                );
                            })}
                        </g>
                    )}
                </svg>

                {/* Tooltip */}
                {tooltip && (
                    <div
                        className="fixed bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 pointer-events-none z-50 shadow-lg"
                        style={{ left: tooltip.x + 10, top: tooltip.y }}
                    >
                        {tooltip.text}
                    </div>
                )}

                {/* Context Menu */}
                {contextMenu && (
                    <MapContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        position={contextMenu.position}
                        feature={contextMenu.feature}
                        onClose={() => setContextMenu(null)}
                        onNavigateToSequence={onNavigateToSequence}
                        onFeatureClick={onFeatureClick}
                        onSelectRange={onSelectRange}
                    />
                )}
            </div>
        </div>
    );
};
