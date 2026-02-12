import { useMemo, useState, useRef, useCallback } from 'react';
import { getFeatureColorHex } from '../../lib/featureUtils';
import {
    assignTracks,
    getTrackCount,
    calculateLinearDimensions,
    generateRulerTicks,
} from '../../lib/mapViewUtils';
import { MapContextMenu } from './MapContextMenu';
import type { SequenceData, Feature } from '../../types';
import type { CutSite } from '../../lib/restrictionEnzymes';
import type { ORF } from '../../lib/orfFinder';

interface LinearMapViewProps {
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

export const LinearMapView = ({
    data,
    zoomLevel = 1.0,
    onFeatureClick,
    onNavigateToSequence,
    onSelectRange,
    searchResults,
    currentMatchIndex,
    showEnzymeSites,
    showORFs,
}: LinearMapViewProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        x: number; y: number; position: number; feature?: Feature;
    } | null>(null);
    const [dragStart, setDragStart] = useState<number | null>(null);
    const [dragEnd, setDragEnd] = useState<number | null>(null);

    const totalLength = data.sequence.length;

    // Smart track assignment
    const trackAssignments = useMemo(
        () => assignTracks(data.features),
        [data.features],
    );
    const trackCount = useMemo(() => getTrackCount(trackAssignments), [trackAssignments]);

    const hasOverlays = !!(showEnzymeSites?.length || showORFs?.length);

    // Dynamic dimensions
    const dim = useMemo(
        () => calculateLinearDimensions(totalLength, trackCount, zoomLevel, hasOverlays),
        [totalLength, trackCount, zoomLevel, hasOverlays],
    );

    // Scale: bp position → x coordinate
    const getX = useCallback(
        (pos: number) => dim.padding + (pos / totalLength) * dim.availableWidth,
        [dim.padding, dim.availableWidth, totalLength],
    );

    // Inverse: x coordinate → bp position
    const getPos = useCallback(
        (x: number) => Math.round(Math.max(0, Math.min(totalLength, ((x - dim.padding) / dim.availableWidth) * totalLength))),
        [dim.padding, dim.availableWidth, totalLength],
    );

    // Ruler ticks
    const ticks = useMemo(() => generateRulerTicks(totalLength), [totalLength]);

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

    const getSvgPoint = (e: React.MouseEvent): { x: number; y: number } | null => {
        if (!svgRef.current) return null;
        const rect = svgRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (dim.width / rect.width),
            y: (e.clientY - rect.top) * (dim.height / rect.height),
        };
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
            text: `${feature.name || feature.type} (${feature.start}–${feature.end}, ${feature.end - feature.start} bp, ${feature.strand === 1 ? '+' : '-'})`,
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const pt = getSvgPoint(e);
        if (!pt) return;

        // Update drag selection
        if (dragStart !== null) {
            setDragEnd(getPos(pt.x));
        }

        // Update tooltip for ruler area
        if (pt.y >= dim.rulerY && pt.y <= dim.rulerY + 30 * zoomLevel && dragStart === null) {
            const pos = getPos(pt.x);
            if (pos >= 0 && pos <= totalLength) {
                setTooltip({ x: e.clientX, y: e.clientY - 40, text: `${pos} bp` });
            }
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // left click only
        const pt = getSvgPoint(e);
        if (!pt) return;
        const pos = getPos(pt.x);
        if (pos >= 0 && pos <= totalLength) {
            setDragStart(pos);
            setDragEnd(pos);
        }
    };

    const handleMouseUp = () => {
        if (dragStart !== null && dragEnd !== null && dragStart !== dragEnd) {
            const start = Math.min(dragStart, dragEnd);
            const end = Math.max(dragStart, dragEnd);
            if (onSelectRange) onSelectRange(start, end);
        }
        setDragStart(null);
        setDragEnd(null);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const pt = getSvgPoint(e);
        if (!pt) return;
        const pos = getPos(pt.x);

        // Check if right-clicking on a feature
        let clickedFeature: Feature | undefined;
        for (const { feature, track } of trackAssignments) {
            const fx = getX(feature.start);
            const fw = Math.max(getX(feature.end) - fx, 2);
            const fy = dim.trackStartY + track * (dim.trackHeight + dim.trackGap);
            if (pt.x >= fx && pt.x <= fx + fw && pt.y >= fy && pt.y <= fy + dim.trackHeight) {
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

    // ORF overlay Y position
    const orfTrackY = dim.legendY - (hasOverlays ? 40 * zoomLevel : 0);

    return (
        <div className="flex items-center justify-center h-full overflow-auto p-4">
            <div className="relative">
                <svg
                    ref={svgRef}
                    width={dim.width}
                    height={dim.height}
                    viewBox={`0 0 ${dim.width} ${dim.height}`}
                    onMouseMove={handleMouseMove}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => { setTooltip(null); handleMouseUp(); }}
                    onContextMenu={handleContextMenu}
                >
                    {/* Title */}
                    <text x={dim.width / 2} y={25 * zoomLevel} textAnchor="middle" fill="#e5e7eb" fontSize={14 * zoomLevel} fontWeight="bold">
                        {data.name}
                    </text>
                    <text x={dim.width / 2} y={45 * zoomLevel} textAnchor="middle" fill="#9ca3af" fontSize={11 * zoomLevel}>
                        {totalLength} bp (Linear)
                    </text>

                    {/* Ruler baseline */}
                    <line
                        x1={dim.padding}
                        y1={dim.rulerY + 15 * zoomLevel}
                        x2={dim.padding + dim.availableWidth}
                        y2={dim.rulerY + 15 * zoomLevel}
                        stroke="#4b5563"
                        strokeWidth={2}
                    />

                    {/* Ruler ticks */}
                    {ticks.map((tick, i) => {
                        const x = getX(tick.position);
                        const tickLen = tick.major ? 10 * zoomLevel : 5 * zoomLevel;
                        return (
                            <g key={i}>
                                <line
                                    x1={x} y1={dim.rulerY + 15 * zoomLevel}
                                    x2={x} y2={dim.rulerY + 15 * zoomLevel + tickLen}
                                    stroke="#6b7280" strokeWidth={1}
                                />
                                {tick.label && (
                                    <text
                                        x={x} y={dim.rulerY + 15 * zoomLevel + tickLen + 12 * zoomLevel}
                                        textAnchor="middle" fill="#9ca3af" fontSize={9 * zoomLevel}
                                    >
                                        {tick.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* Search Result Highlights */}
                    {searchResults?.map((result, i) => {
                        const sx = getX(result.start);
                        const ex = getX(result.end);
                        const isCurrent = i === currentMatchIndex;
                        return (
                            <rect
                                key={`search-${i}`}
                                x={sx}
                                y={dim.trackStartY - 4 * zoomLevel}
                                width={Math.max(ex - sx, 2)}
                                height={trackCount * (dim.trackHeight + dim.trackGap) + 8 * zoomLevel}
                                fill={isCurrent ? '#f59e0b' : '#f97316'}
                                fillOpacity={isCurrent ? 0.4 : 0.2}
                                stroke={isCurrent ? '#f59e0b' : 'none'}
                                strokeWidth={isCurrent ? 1.5 : 0}
                                rx={2}
                            />
                        );
                    })}

                    {/* Drag Selection */}
                    {dragStart !== null && dragEnd !== null && dragStart !== dragEnd && (
                        <rect
                            x={getX(Math.min(dragStart, dragEnd))}
                            y={dim.rulerY}
                            width={Math.abs(getX(dragEnd) - getX(dragStart))}
                            height={dim.trackStartY + trackCount * (dim.trackHeight + dim.trackGap) - dim.rulerY + 10 * zoomLevel}
                            fill="#3b82f6"
                            fillOpacity={0.15}
                            stroke="#3b82f6"
                            strokeWidth={1}
                            strokeDasharray="4 2"
                        />
                    )}

                    {/* Features */}
                    {trackAssignments.map(({ feature, track }, index) => {
                        const startX = getX(feature.start);
                        const endX = getX(feature.end);
                        const featureWidth = Math.max(endX - startX, 2);
                        const color = getFeatureColorHex(feature.type);
                        const y = dim.trackStartY + track * (dim.trackHeight + dim.trackGap);

                        return (
                            <g
                                key={`${feature.id || feature.type}-${index}`}
                                className="cursor-pointer"
                                onClick={(e) => handleFeatureClick(feature, e)}
                                onDoubleClick={(e) => handleFeatureDoubleClick(feature, e)}
                                onMouseEnter={(e) => handleFeatureMouseEnter(feature, e)}
                                onMouseLeave={() => setTooltip(null)}
                            >
                                {/* Feature box */}
                                <rect
                                    x={startX}
                                    y={y}
                                    width={featureWidth}
                                    height={dim.trackHeight}
                                    fill={color}
                                    fillOpacity={0.6}
                                    stroke={color}
                                    strokeWidth={1.5}
                                    rx={3}
                                    className="transition-all duration-150 hover:fill-opacity-100"
                                />

                                {/* Arrow indicator for strand direction */}
                                {feature.strand === 1 && featureWidth > 10 && (
                                    <polygon
                                        points={`${endX - 6 * zoomLevel},${y + 6 * zoomLevel} ${endX - 1},${y + dim.trackHeight / 2} ${endX - 6 * zoomLevel},${y + dim.trackHeight - 6 * zoomLevel}`}
                                        fill="#fff"
                                        fillOpacity={0.7}
                                    />
                                )}
                                {feature.strand === -1 && featureWidth > 10 && (
                                    <polygon
                                        points={`${startX + 6 * zoomLevel},${y + 6 * zoomLevel} ${startX + 1},${y + dim.trackHeight / 2} ${startX + 6 * zoomLevel},${y + dim.trackHeight - 6 * zoomLevel}`}
                                        fill="#fff"
                                        fillOpacity={0.7}
                                    />
                                )}

                                {/* Feature label */}
                                {featureWidth > 40 * zoomLevel && (
                                    <text
                                        x={startX + featureWidth / 2}
                                        y={y + dim.trackHeight / 2 + 4 * zoomLevel}
                                        textAnchor="middle"
                                        fill="#ffffff"
                                        fontSize={10 * zoomLevel}
                                        fontWeight={500}
                                        style={{ pointerEvents: 'none' }}
                                    >
                                        {feature.name || feature.type}
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* Restriction Enzyme Sites */}
                    {showEnzymeSites?.map((site, i) => {
                        const x = getX(site.cutPosition);
                        return (
                            <g key={`enzyme-${i}`}>
                                <line
                                    x1={x} y1={dim.rulerY + 5 * zoomLevel}
                                    x2={x} y2={dim.rulerY + 25 * zoomLevel}
                                    stroke="#a855f7" strokeWidth={1.5}
                                />
                                <circle cx={x} cy={dim.rulerY + 5 * zoomLevel} r={2 * zoomLevel} fill="#a855f7" />
                                <text
                                    x={x} y={dim.rulerY}
                                    textAnchor="middle" fill="#a855f7" fontSize={7 * zoomLevel}
                                    transform={`rotate(-45, ${x}, ${dim.rulerY})`}
                                >
                                    {site.enzyme.name}
                                </text>
                            </g>
                        );
                    })}

                    {/* ORF Overlays */}
                    {showORFs?.map((orf, i) => {
                        const sx = getX(orf.start);
                        const ex = getX(orf.end);
                        const w = Math.max(ex - sx, 2);
                        const color = orf.strand === 1 ? '#22c55e' : '#ef4444';
                        const yOrf = orfTrackY + (orf.strand === 1 ? 0 : 12 * zoomLevel);
                        return (
                            <g key={`orf-${i}`}>
                                <rect
                                    x={sx} y={yOrf}
                                    width={w} height={10 * zoomLevel}
                                    fill={color} fillOpacity={0.35}
                                    stroke={color} strokeWidth={0.5}
                                    rx={2}
                                />
                                {w > 30 * zoomLevel && (
                                    <text
                                        x={sx + w / 2} y={yOrf + 8 * zoomLevel}
                                        textAnchor="middle" fill={color} fontSize={7 * zoomLevel}
                                        style={{ pointerEvents: 'none' }}
                                    >
                                        {orf.aaLength} aa
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* Legend */}
                    {legendItems.length > 0 && (
                        <g>
                            {legendItems.map((item, i) => {
                                const lx = dim.padding + i * 120 * zoomLevel;
                                return (
                                    <g key={item.type}>
                                        <rect
                                            x={lx} y={dim.legendY}
                                            width={12 * zoomLevel} height={12 * zoomLevel}
                                            fill={item.color} fillOpacity={0.7}
                                            rx={2}
                                        />
                                        <text
                                            x={lx + 16 * zoomLevel} y={dim.legendY + 10 * zoomLevel}
                                            fill="#9ca3af" fontSize={10 * zoomLevel}
                                        >
                                            {item.type}
                                        </text>
                                    </g>
                                );
                            })}
                            {/* Overlay legend entries */}
                            {showEnzymeSites && showEnzymeSites.length > 0 && (
                                <g>
                                    <rect
                                        x={dim.padding + legendItems.length * 120 * zoomLevel} y={dim.legendY}
                                        width={12 * zoomLevel} height={12 * zoomLevel}
                                        fill="#a855f7" fillOpacity={0.7} rx={2}
                                    />
                                    <text
                                        x={dim.padding + legendItems.length * 120 * zoomLevel + 16 * zoomLevel}
                                        y={dim.legendY + 10 * zoomLevel}
                                        fill="#9ca3af" fontSize={10 * zoomLevel}
                                    >
                                        Enzyme Sites
                                    </text>
                                </g>
                            )}
                            {showORFs && showORFs.length > 0 && (
                                <g>
                                    <rect
                                        x={dim.padding + (legendItems.length + (showEnzymeSites?.length ? 1 : 0)) * 120 * zoomLevel}
                                        y={dim.legendY}
                                        width={12 * zoomLevel} height={12 * zoomLevel}
                                        fill="#22c55e" fillOpacity={0.7} rx={2}
                                    />
                                    <text
                                        x={dim.padding + (legendItems.length + (showEnzymeSites?.length ? 1 : 0)) * 120 * zoomLevel + 16 * zoomLevel}
                                        y={dim.legendY + 10 * zoomLevel}
                                        fill="#9ca3af" fontSize={10 * zoomLevel}
                                    >
                                        ORFs
                                    </text>
                                </g>
                            )}
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
