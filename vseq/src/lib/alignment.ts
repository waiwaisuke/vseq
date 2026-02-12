export interface AlignmentResult {
    alignedSeq1: string;
    alignedSeq2: string;
    matchLine: string;      // '|' for match, ':' for similar, ' ' for mismatch/gap
    score: number;
    identity: number;       // 0-1
    gaps: number;
    length: number;
    startSeq1: number;      // for local alignment: where in seq1 the alignment starts
    startSeq2: number;
}

interface ScoringMatrix {
    match: number;
    mismatch: number;
    gapOpen: number;
    gapExtend: number;
}

const DEFAULT_SCORING: ScoringMatrix = {
    match: 2,
    mismatch: -1,
    gapOpen: -5,
    gapExtend: -1,
};

/**
 * Needleman-Wunsch global alignment.
 */
export function globalAlign(
    seq1: string,
    seq2: string,
    scoring: Partial<ScoringMatrix> = {}
): AlignmentResult {
    const s = { ...DEFAULT_SCORING, ...scoring };
    const m = seq1.length;
    const n = seq2.length;

    // DP matrix
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    // Initialize
    for (let i = 0; i <= m; i++) dp[i][0] = s.gapOpen + i * s.gapExtend;
    for (let j = 0; j <= n; j++) dp[0][j] = s.gapOpen + j * s.gapExtend;
    dp[0][0] = 0;

    // Fill
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const matchScore = dp[i - 1][j - 1] + (seq1[i - 1] === seq2[j - 1] ? s.match : s.mismatch);
            const deleteScore = dp[i - 1][j] + s.gapExtend;
            const insertScore = dp[i][j - 1] + s.gapExtend;
            dp[i][j] = Math.max(matchScore, deleteScore, insertScore);
        }
    }

    // Traceback
    return traceback(dp, seq1, seq2, s, m, n, false);
}

/**
 * Smith-Waterman local alignment.
 */
export function localAlign(
    seq1: string,
    seq2: string,
    scoring: Partial<ScoringMatrix> = {}
): AlignmentResult {
    const s = { ...DEFAULT_SCORING, ...scoring };
    const m = seq1.length;
    const n = seq2.length;

    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    let maxScore = 0;
    let maxI = 0;
    let maxJ = 0;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const matchScore = dp[i - 1][j - 1] + (seq1[i - 1] === seq2[j - 1] ? s.match : s.mismatch);
            const deleteScore = dp[i - 1][j] + s.gapExtend;
            const insertScore = dp[i][j - 1] + s.gapExtend;
            dp[i][j] = Math.max(0, matchScore, deleteScore, insertScore);

            if (dp[i][j] > maxScore) {
                maxScore = dp[i][j];
                maxI = i;
                maxJ = j;
            }
        }
    }

    return traceback(dp, seq1, seq2, s, maxI, maxJ, true);
}

function traceback(
    dp: number[][],
    seq1: string,
    seq2: string,
    s: ScoringMatrix,
    endI: number,
    endJ: number,
    isLocal: boolean,
): AlignmentResult {
    let aligned1 = '';
    let aligned2 = '';
    let matchLine = '';
    let i = endI;
    let j = endJ;
    let matches = 0;
    let gaps = 0;

    while (i > 0 || j > 0) {
        if (isLocal && dp[i][j] === 0) break;

        if (i > 0 && j > 0 &&
            dp[i][j] === dp[i - 1][j - 1] + (seq1[i - 1] === seq2[j - 1] ? s.match : s.mismatch)) {
            aligned1 = seq1[i - 1] + aligned1;
            aligned2 = seq2[j - 1] + aligned2;
            if (seq1[i - 1] === seq2[j - 1]) {
                matchLine = '|' + matchLine;
                matches++;
            } else {
                matchLine = '.' + matchLine;
            }
            i--;
            j--;
        } else if (i > 0 && dp[i][j] === dp[i - 1][j] + s.gapExtend) {
            aligned1 = seq1[i - 1] + aligned1;
            aligned2 = '-' + aligned2;
            matchLine = ' ' + matchLine;
            gaps++;
            i--;
        } else {
            aligned1 = '-' + aligned1;
            aligned2 = seq2[j - 1] + aligned2;
            matchLine = ' ' + matchLine;
            gaps++;
            j--;
        }
    }

    const length = aligned1.length;

    return {
        alignedSeq1: aligned1,
        alignedSeq2: aligned2,
        matchLine,
        score: dp[endI][endJ],
        identity: length > 0 ? matches / length : 0,
        gaps,
        length,
        startSeq1: i,
        startSeq2: j,
    };
}
