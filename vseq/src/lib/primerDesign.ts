import { getReverseComplement } from './dnaTranslation';

export interface Primer {
    id: string;
    name: string;
    sequence: string;
    start: number;       // 0-indexed in original sequence
    end: number;         // exclusive
    strand: 1 | -1;
    length: number;
    tm: number;          // melting temperature
    gcPercent: number;
    selfComplementarity: number; // score 0-1
    hasGcClamp: boolean;
}

export interface PrimerPair {
    forward: Primer;
    reverse: Primer;
    productSize: number;
}

/**
 * Calculate melting temperature using nearest-neighbor method (simplified).
 * Uses the basic formula: Tm = 64.9 + 41 * (G+C - 16.4) / length
 * For short oligos (<14 bp): Tm = (A+T)*2 + (G+C)*4
 */
export function calculateTm(seq: string): number {
    const upper = seq.toUpperCase();
    const gc = (upper.match(/[GC]/g) || []).length;
    const at = (upper.match(/[AT]/g) || []).length;
    const len = upper.length;

    if (len < 14) {
        return at * 2 + gc * 4;
    }
    // Salt-adjusted Tm (simplified nearest-neighbor approximation)
    return 64.9 + 41 * (gc - 16.4) / len;
}

/**
 * Calculate GC content as percentage.
 */
export function calculateGcPercent(seq: string): number {
    const upper = seq.toUpperCase();
    const gc = (upper.match(/[GC]/g) || []).length;
    return (gc / upper.length) * 100;
}

/**
 * Check for 3' GC clamp (G or C in last 2 bases).
 */
export function hasGcClamp(seq: string): boolean {
    const last2 = seq.slice(-2).toUpperCase();
    return /[GC]/.test(last2);
}

/**
 * Score self-complementarity (simplified).
 * Returns 0-1 where 0 is no self-complementarity.
 */
export function scoreSelfComplementarity(seq: string): number {
    const upper = seq.toUpperCase();
    const rc = getReverseComplement(upper);
    const len = upper.length;
    let maxRun = 0;

    // Check for longest self-complementary run
    for (let offset = 0; offset < len; offset++) {
        let run = 0;
        for (let i = 0; i < len - offset; i++) {
            if (upper[i + offset] === rc[i]) {
                run++;
                maxRun = Math.max(maxRun, run);
            } else {
                run = 0;
            }
        }
    }

    return Math.min(1, maxRun / 8); // Normalize: 8+ consecutive matches = 1.0
}

/**
 * Design primer candidates from a region.
 */
export function designPrimers(
    sequence: string,
    regionStart: number,
    regionEnd: number,
    options: {
        minLength?: number;
        maxLength?: number;
        minTm?: number;
        maxTm?: number;
        minGc?: number;
        maxGc?: number;
    } = {}
): PrimerPair[] {
    const {
        minLength = 18,
        maxLength = 25,
        minTm = 55,
        maxTm = 65,
        minGc = 40,
        maxGc = 60,
    } = options;

    const forwardCandidates: Primer[] = [];
    const reverseCandidates: Primer[] = [];

    // Generate forward primer candidates near regionStart
    for (let len = minLength; len <= maxLength; len++) {
        const start = regionStart;
        const end = start + len;
        if (end > sequence.length) break;

        const seq = sequence.slice(start, end).toUpperCase();
        const tm = calculateTm(seq);
        const gc = calculateGcPercent(seq);

        if (tm >= minTm && tm <= maxTm && gc >= minGc && gc <= maxGc) {
            forwardCandidates.push({
                id: `fwd-${start}-${len}`,
                name: `Forward ${len}bp`,
                sequence: seq,
                start,
                end,
                strand: 1,
                length: len,
                tm,
                gcPercent: gc,
                selfComplementarity: scoreSelfComplementarity(seq),
                hasGcClamp: hasGcClamp(seq),
            });
        }
    }

    // Generate reverse primer candidates near regionEnd
    for (let len = minLength; len <= maxLength; len++) {
        const end = regionEnd;
        const start = end - len;
        if (start < 0) break;

        const templateSeq = sequence.slice(start, end).toUpperCase();
        const primerSeq = getReverseComplement(templateSeq);
        const tm = calculateTm(primerSeq);
        const gc = calculateGcPercent(primerSeq);

        if (tm >= minTm && tm <= maxTm && gc >= minGc && gc <= maxGc) {
            reverseCandidates.push({
                id: `rev-${start}-${len}`,
                name: `Reverse ${len}bp`,
                sequence: primerSeq,
                start,
                end,
                strand: -1,
                length: len,
                tm,
                gcPercent: gc,
                selfComplementarity: scoreSelfComplementarity(primerSeq),
                hasGcClamp: hasGcClamp(primerSeq),
            });
        }
    }

    // Pair forward and reverse primers
    const pairs: PrimerPair[] = [];
    for (const fwd of forwardCandidates) {
        for (const rev of reverseCandidates) {
            const tmDiff = Math.abs(fwd.tm - rev.tm);
            if (tmDiff <= 5) {
                pairs.push({
                    forward: fwd,
                    reverse: rev,
                    productSize: rev.end - fwd.start,
                });
            }
        }
    }

    // Sort by Tm match quality, then by self-complementarity
    return pairs.sort((a, b) => {
        const tmDiffA = Math.abs(a.forward.tm - a.reverse.tm);
        const tmDiffB = Math.abs(b.forward.tm - b.reverse.tm);
        if (Math.abs(tmDiffA - tmDiffB) > 0.5) return tmDiffA - tmDiffB;
        const scA = a.forward.selfComplementarity + a.reverse.selfComplementarity;
        const scB = b.forward.selfComplementarity + b.reverse.selfComplementarity;
        return scA - scB;
    });
}
