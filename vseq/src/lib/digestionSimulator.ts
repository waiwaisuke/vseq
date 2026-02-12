import type { CutSite, RestrictionEnzyme } from './restrictionEnzymes';

export interface DigestFragment {
    index: number;
    start: number;       // 0-indexed
    end: number;         // exclusive
    length: number;
    sequence: string;
    isLinear: boolean;    // true if the molecule is linear
}

/**
 * Simulate restriction enzyme digestion.
 * Returns fragments sorted by size (descending).
 */
export function simulateDigestion(
    sequence: string,
    cutSites: CutSite[],
    circular: boolean,
): DigestFragment[] {
    if (cutSites.length === 0) {
        return [{
            index: 0,
            start: 0,
            end: sequence.length,
            length: sequence.length,
            sequence,
            isLinear: !circular,
        }];
    }

    // Sort cut positions
    const positions = [...new Set(cutSites.map(s => s.position))].sort((a, b) => a - b);

    const fragments: DigestFragment[] = [];

    if (circular) {
        // Circular: fragments go from cut to cut, wrapping around
        for (let i = 0; i < positions.length; i++) {
            const start = positions[i];
            const end = positions[(i + 1) % positions.length];
            let seq: string;
            let length: number;

            if (end > start) {
                seq = sequence.slice(start, end);
                length = end - start;
            } else {
                // Wraps around
                seq = sequence.slice(start) + sequence.slice(0, end);
                length = sequence.length - start + end;
            }

            fragments.push({
                index: i,
                start,
                end: end > start ? end : end + sequence.length,
                length,
                sequence: seq,
                isLinear: true, // All fragments become linear after digestion
            });
        }
    } else {
        // Linear: fragments from start to first cut, between cuts, last cut to end
        const allPositions = [0, ...positions, sequence.length];
        for (let i = 0; i < allPositions.length - 1; i++) {
            const start = allPositions[i];
            const end = allPositions[i + 1];
            const length = end - start;
            if (length > 0) {
                fragments.push({
                    index: i,
                    start,
                    end,
                    length,
                    sequence: sequence.slice(start, end),
                    isLinear: true,
                });
            }
        }
    }

    // Sort by size descending
    return fragments.sort((a, b) => b.length - a.length);
}

/**
 * Calculate gel migration distance (log-linear relationship).
 * Returns a value 0-1 representing relative migration.
 */
export function getGelMigration(fragmentLength: number, maxLength: number): number {
    const minLog = Math.log10(100);
    const maxLog = Math.log10(Math.max(maxLength, 10000));
    const fragLog = Math.log10(Math.max(fragmentLength, 100));
    // Larger fragments migrate less (closer to 0), smaller fragments migrate more (closer to 1)
    return 1 - (fragLog - minLog) / (maxLog - minLog);
}

/**
 * Standard DNA ladder sizes (bp) for gel reference.
 */
export const DNA_LADDER = [10000, 8000, 6000, 5000, 4000, 3000, 2000, 1500, 1000, 750, 500, 250];
