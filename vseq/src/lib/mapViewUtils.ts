import type { Feature } from '../types';

// --- Smart Track Assignment (Greedy Bin-Packing) ---

/** Assign features to non-overlapping tracks using greedy bin-packing. */
export function assignTracks(features: Feature[]): { feature: Feature; track: number }[] {
    if (features.length === 0) return [];

    // Sort by start position ascending, then by length descending for stable layout
    const sorted = [...features].sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

    // trackEnds[i] = the end position of the last feature placed in track i
    const trackEnds: number[] = [];
    const result: { feature: Feature; track: number }[] = [];

    for (const feature of sorted) {
        let placed = false;
        for (let t = 0; t < trackEnds.length; t++) {
            if (feature.start >= trackEnds[t]) {
                trackEnds[t] = feature.end;
                result.push({ feature, track: t });
                placed = true;
                break;
            }
        }
        if (!placed) {
            trackEnds.push(feature.end);
            result.push({ feature, track: trackEnds.length - 1 });
        }
    }

    return result;
}

/** Assign tracks for circular views, handling wrap-around features. */
export function assignTracksCircular(features: Feature[], _seqLength: number): { feature: Feature; track: number }[] {
    if (features.length === 0) return [];

    // Separate normal and wrap-around features
    const normal: Feature[] = [];
    const wrapping: Feature[] = [];
    for (const f of features) {
        if (f.end < f.start) {
            wrapping.push(f);
        } else {
            normal.push(f);
        }
    }

    // Sort normal features by start
    normal.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

    const trackEnds: number[] = [];
    const result: { feature: Feature; track: number }[] = [];

    // Place normal features first
    for (const feature of normal) {
        let placed = false;
        for (let t = 0; t < trackEnds.length; t++) {
            if (feature.start >= trackEnds[t]) {
                trackEnds[t] = feature.end;
                result.push({ feature, track: t });
                placed = true;
                break;
            }
        }
        if (!placed) {
            trackEnds.push(feature.end);
            result.push({ feature, track: trackEnds.length - 1 });
        }
    }

    // Wrapping features always get their own tracks (they potentially overlap everything)
    for (const feature of wrapping) {
        // Check if any existing track has space: need start >= trackEnd AND no conflict at beginning
        let placed = false;
        for (let t = 0; t < trackEnds.length; t++) {
            // A wrapping feature occupies [start..seqLength] and [0..end]
            // It's safe if trackEnd <= feature.end won't happen. Actually wrapping features
            // are tricky - just give them new tracks for safety.
            if (trackEnds[t] <= 0) {
                // Empty track (shouldn't happen normally)
                trackEnds[t] = feature.end;
                result.push({ feature, track: t });
                placed = true;
                break;
            }
        }
        if (!placed) {
            trackEnds.push(feature.end);
            result.push({ feature, track: trackEnds.length - 1 });
        }
    }

    return result;
}

/** Get the number of tracks needed. */
export function getTrackCount(assignments: { track: number }[]): number {
    if (assignments.length === 0) return 0;
    return Math.max(...assignments.map(a => a.track)) + 1;
}

// --- Dynamic Size Calculation ---

export interface LinearMapDimensions {
    width: number;
    height: number;
    padding: number;
    headerHeight: number;
    rulerY: number;
    trackStartY: number;
    trackHeight: number;
    trackGap: number;
    legendY: number;
    availableWidth: number;
}

export function calculateLinearDimensions(
    seqLength: number,
    trackCount: number,
    zoom: number,
    hasOverlays: boolean = false,
): LinearMapDimensions {
    const padding = 50;
    const headerHeight = 60;
    const rulerHeight = 40;
    const trackHeight = 30;
    const trackGap = 8;
    const legendHeight = 60;
    const overlayHeight = hasOverlays ? 50 : 0;

    const baseWidth = Math.min(Math.max(800, seqLength * 0.15), 2000);
    const width = baseWidth * zoom;
    const rulerY = headerHeight + 10;
    const trackStartY = rulerY + rulerHeight + 10;
    const tracksHeight = Math.max(trackCount, 1) * (trackHeight + trackGap);
    const height = (trackStartY + tracksHeight + overlayHeight + legendHeight + padding) * zoom;
    const availableWidth = (baseWidth - 2 * padding) * zoom;

    return {
        width,
        height: Math.max(height, 300),
        padding: padding * zoom,
        headerHeight: headerHeight * zoom,
        rulerY: rulerY * zoom,
        trackStartY: trackStartY * zoom,
        trackHeight: trackHeight * zoom,
        trackGap: trackGap * zoom,
        legendY: (trackStartY + tracksHeight + overlayHeight + 10) * zoom,
        availableWidth,
    };
}

export interface CircularMapDimensions {
    size: number;
    centerX: number;
    centerY: number;
    backboneRadius: number;
    ringSpacing: number;
    featureWidth: number;
    labelMargin: number;
    rulerTickLength: number;
}

export function calculateCircularDimensions(
    trackCount: number,
    zoom: number,
): CircularMapDimensions {
    const baseRadius = 150;
    const ringSpacing = 22;
    const featureWidth = 14;
    const labelMargin = 60;
    const rulerTickLength = 8;

    const totalRadius = baseRadius + Math.max(trackCount, 1) * ringSpacing + labelMargin;
    const size = totalRadius * 2 * zoom + 40; // 40 for padding

    return {
        size,
        centerX: size / 2,
        centerY: size / 2,
        backboneRadius: baseRadius * zoom,
        ringSpacing: ringSpacing * zoom,
        featureWidth: featureWidth * zoom,
        labelMargin: labelMargin * zoom,
        rulerTickLength: rulerTickLength * zoom,
    };
}

// --- Label Collision Resolution (for Circular View) ---

export interface LabelPosition {
    featureIndex: number;
    angle: number; // midpoint angle in degrees
    text: string;
    tier: number; // how far out from the default label ring
}

export function resolveLabelCollisions(
    labels: Omit<LabelPosition, 'tier'>[],
    minAngleGap: number = 12,
): LabelPosition[] {
    if (labels.length === 0) return [];

    // Sort by angle
    const sorted = [...labels].sort((a, b) => a.angle - b.angle);
    const result: LabelPosition[] = sorted.map(l => ({ ...l, tier: 0 }));

    // Simple collision resolution: push overlapping labels to outer tiers
    for (let i = 1; i < result.length; i++) {
        let angleDiff = result[i].angle - result[i - 1].angle;
        if (angleDiff < 0) angleDiff += 360;

        if (angleDiff < minAngleGap && result[i - 1].tier === result[i].tier) {
            result[i].tier = result[i - 1].tier + 1;
        }
    }

    // Check wrap-around between last and first
    if (result.length > 1) {
        const last = result[result.length - 1];
        const first = result[0];
        let angleDiff = first.angle + 360 - last.angle;
        if (angleDiff < minAngleGap && last.tier === first.tier) {
            first.tier = Math.max(first.tier, last.tier + 1);
        }
    }

    return result;
}

// --- Ruler Tick Generation ---

export function generateRulerTicks(totalLength: number): { position: number; label: string; major: boolean }[] {
    if (totalLength <= 0) return [];

    const ticks: { position: number; label: string; major: boolean }[] = [];
    const magnitude = Math.pow(10, Math.floor(Math.log10(totalLength / 5)));
    const majorInterval = magnitude;
    const minorInterval = majorInterval / 5;

    for (let i = 0; i <= totalLength; i += minorInterval) {
        const pos = Math.round(i);
        if (pos > totalLength) break;
        const isMajor = pos % majorInterval === 0;
        ticks.push({
            position: pos,
            label: isMajor ? formatBp(pos) : '',
            major: isMajor,
        });
    }

    return ticks;
}

function formatBp(bp: number): string {
    if (bp >= 1000000) return `${(bp / 1000000).toFixed(1)}M`;
    if (bp >= 1000) return `${(bp / 1000).toFixed(bp >= 10000 ? 0 : 1)}k`;
    return String(bp);
}

// --- Unique Feature Types for Legend ---

export function getUniqueFeatureTypes(features: Feature[]): { type: string; color: string }[] {
    const seen = new Set<string>();
    const result: { type: string; color: string }[] = [];

    // Import color inline to avoid circular deps
    for (const f of features) {
        if (!seen.has(f.type)) {
            seen.add(f.type);
            result.push({ type: f.type, color: '' }); // color filled by caller
        }
    }

    return result;
}
