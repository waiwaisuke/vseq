/**
 * Standard codon table mapping codons to amino acids.
 */
export const CODON_TO_AA: Record<string, string> = {
    'TTT': 'F', 'TTC': 'F', 'TTA': 'L', 'TTG': 'L',
    'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
    'ATT': 'I', 'ATC': 'I', 'ATA': 'I', 'ATG': 'M',
    'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
    'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S',
    'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
    'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
    'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
    'TAT': 'Y', 'TAC': 'Y', 'TAA': '*', 'TAG': '*',
    'CAT': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q',
    'AAT': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K',
    'GAT': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E',
    'TGT': 'C', 'TGC': 'C', 'TGA': '*', 'TGG': 'W',
    'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',
    'AGT': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',
    'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G',
};

/**
 * Group codons by amino acid.
 */
export const AA_TO_CODONS: Record<string, string[]> = {};
for (const [codon, aa] of Object.entries(CODON_TO_AA)) {
    if (!AA_TO_CODONS[aa]) AA_TO_CODONS[aa] = [];
    AA_TO_CODONS[aa].push(codon);
}

export interface CodonCount {
    codon: string;
    aa: string;
    count: number;
    frequency: number;       // count / total codons
    fractionOfAA: number;    // count / total codons for this AA (RSCU-like)
}

export interface CodonUsageResult {
    totalCodons: number;
    counts: CodonCount[];
    cai: number;             // Codon Adaptation Index (0-1)
    gcContent: number;
    gc3Content: number;      // GC content at 3rd codon position
}

/**
 * E. coli K12 reference codon usage (fraction of AA).
 */
export const ECOLI_REFERENCE: Record<string, number> = {
    'TTT': 0.58, 'TTC': 0.42, 'TTA': 0.14, 'TTG': 0.13,
    'CTT': 0.12, 'CTC': 0.10, 'CTA': 0.04, 'CTG': 0.47,
    'ATT': 0.51, 'ATC': 0.42, 'ATA': 0.08, 'ATG': 1.00,
    'GTT': 0.28, 'GTC': 0.22, 'GTA': 0.17, 'GTG': 0.33,
    'TCT': 0.17, 'TCC': 0.15, 'TCA': 0.14, 'TCG': 0.14,
    'CCT': 0.18, 'CCC': 0.13, 'CCA': 0.20, 'CCG': 0.49,
    'ACT': 0.19, 'ACC': 0.40, 'ACA': 0.17, 'ACG': 0.25,
    'GCT': 0.18, 'GCC': 0.26, 'GCA': 0.23, 'GCG': 0.33,
    'TAT': 0.59, 'TAC': 0.41, 'TAA': 0.61, 'TAG': 0.09,
    'CAT': 0.57, 'CAC': 0.43, 'CAA': 0.34, 'CAG': 0.66,
    'AAT': 0.49, 'AAC': 0.51, 'AAA': 0.74, 'AAG': 0.26,
    'GAT': 0.63, 'GAC': 0.37, 'GAA': 0.68, 'GAG': 0.32,
    'TGT': 0.46, 'TGC': 0.54, 'TGA': 0.30, 'TGG': 1.00,
    'CGT': 0.36, 'CGC': 0.36, 'CGA': 0.07, 'CGG': 0.11,
    'AGT': 0.16, 'AGC': 0.25, 'AGA': 0.07, 'AGG': 0.04,
    'GGT': 0.35, 'GGC': 0.37, 'GGA': 0.13, 'GGG': 0.15,
};

/**
 * Human reference codon usage.
 */
export const HUMAN_REFERENCE: Record<string, number> = {
    'TTT': 0.45, 'TTC': 0.55, 'TTA': 0.07, 'TTG': 0.13,
    'CTT': 0.13, 'CTC': 0.20, 'CTA': 0.07, 'CTG': 0.41,
    'ATT': 0.36, 'ATC': 0.48, 'ATA': 0.16, 'ATG': 1.00,
    'GTT': 0.18, 'GTC': 0.24, 'GTA': 0.11, 'GTG': 0.47,
    'TCT': 0.19, 'TCC': 0.22, 'TCA': 0.15, 'TCG': 0.05,
    'CCT': 0.29, 'CCC': 0.33, 'CCA': 0.28, 'CCG': 0.11,
    'ACT': 0.25, 'ACC': 0.36, 'ACA': 0.28, 'ACG': 0.12,
    'GCT': 0.27, 'GCC': 0.40, 'GCA': 0.23, 'GCG': 0.11,
    'TAT': 0.43, 'TAC': 0.57, 'TAA': 0.28, 'TAG': 0.20,
    'CAT': 0.41, 'CAC': 0.59, 'CAA': 0.25, 'CAG': 0.75,
    'AAT': 0.46, 'AAC': 0.54, 'AAA': 0.42, 'AAG': 0.58,
    'GAT': 0.46, 'GAC': 0.54, 'GAA': 0.42, 'GAG': 0.58,
    'TGT': 0.45, 'TGC': 0.55, 'TGA': 0.52, 'TGG': 1.00,
    'CGT': 0.08, 'CGC': 0.19, 'CGA': 0.11, 'CGG': 0.21,
    'AGT': 0.15, 'AGC': 0.24, 'AGA': 0.20, 'AGG': 0.20,
    'GGT': 0.16, 'GGC': 0.34, 'GGA': 0.25, 'GGG': 0.25,
};

/**
 * Yeast (S. cerevisiae) reference codon usage.
 */
export const YEAST_REFERENCE: Record<string, number> = {
    'TTT': 0.59, 'TTC': 0.41, 'TTA': 0.28, 'TTG': 0.29,
    'CTT': 0.13, 'CTC': 0.06, 'CTA': 0.14, 'CTG': 0.11,
    'ATT': 0.46, 'ATC': 0.26, 'ATA': 0.27, 'ATG': 1.00,
    'GTT': 0.39, 'GTC': 0.21, 'GTA': 0.21, 'GTG': 0.19,
    'TCT': 0.26, 'TCC': 0.16, 'TCA': 0.21, 'TCG': 0.10,
    'CCT': 0.31, 'CCC': 0.15, 'CCA': 0.42, 'CCG': 0.12,
    'ACT': 0.35, 'ACC': 0.22, 'ACA': 0.30, 'ACG': 0.14,
    'GCT': 0.38, 'GCC': 0.22, 'GCA': 0.29, 'GCG': 0.11,
    'TAT': 0.56, 'TAC': 0.44, 'TAA': 0.47, 'TAG': 0.23,
    'CAT': 0.64, 'CAC': 0.36, 'CAA': 0.69, 'CAG': 0.31,
    'AAT': 0.59, 'AAC': 0.41, 'AAA': 0.58, 'AAG': 0.42,
    'GAT': 0.65, 'GAC': 0.35, 'GAA': 0.70, 'GAG': 0.30,
    'TGT': 0.63, 'TGC': 0.37, 'TGA': 0.30, 'TGG': 1.00,
    'CGT': 0.15, 'CGC': 0.06, 'CGA': 0.07, 'CGG': 0.04,
    'AGT': 0.16, 'AGC': 0.11, 'AGA': 0.48, 'AGG': 0.21,
    'GGT': 0.47, 'GGC': 0.19, 'GGA': 0.22, 'GGG': 0.12,
};

export const REFERENCE_ORGANISMS: Record<string, Record<string, number>> = {
    'E. coli K12': ECOLI_REFERENCE,
    'Human': HUMAN_REFERENCE,
    'Yeast (S. cerevisiae)': YEAST_REFERENCE,
};

/**
 * Analyze codon usage for a coding sequence.
 */
export function analyzeCodonUsage(cdsSequence: string): CodonUsageResult {
    const seq = cdsSequence.toUpperCase().replace(/[^ATGC]/g, '');
    const totalCodons = Math.floor(seq.length / 3);

    // Count codons
    const rawCounts: Record<string, number> = {};
    const aaCounts: Record<string, number> = {};

    for (let i = 0; i < totalCodons * 3; i += 3) {
        const codon = seq.slice(i, i + 3);
        if (codon.length === 3 && CODON_TO_AA[codon]) {
            rawCounts[codon] = (rawCounts[codon] || 0) + 1;
            const aa = CODON_TO_AA[codon];
            aaCounts[aa] = (aaCounts[aa] || 0) + 1;
        }
    }

    // Build count array
    const counts: CodonCount[] = Object.keys(CODON_TO_AA).map(codon => {
        const aa = CODON_TO_AA[codon];
        const count = rawCounts[codon] || 0;
        return {
            codon,
            aa,
            count,
            frequency: totalCodons > 0 ? count / totalCodons : 0,
            fractionOfAA: aaCounts[aa] > 0 ? count / aaCounts[aa] : 0,
        };
    });

    // GC at 3rd position
    let gc3 = 0;
    let total3 = 0;
    for (let i = 0; i < totalCodons * 3; i += 3) {
        const base = seq[i + 2];
        if (base === 'G' || base === 'C') gc3++;
        total3++;
    }

    // Overall GC
    const gcCount = (seq.match(/[GC]/g) || []).length;

    // Simple CAI calculation (geometric mean of w_i values against E. coli)
    let caiProduct = 0;
    let caiCount = 0;
    for (let i = 0; i < totalCodons * 3; i += 3) {
        const codon = seq.slice(i, i + 3);
        if (codon.length === 3 && ECOLI_REFERENCE[codon] && CODON_TO_AA[codon] !== '*') {
            caiProduct += Math.log(Math.max(ECOLI_REFERENCE[codon], 0.01));
            caiCount++;
        }
    }

    return {
        totalCodons,
        counts,
        cai: caiCount > 0 ? Math.exp(caiProduct / caiCount) : 0,
        gcContent: seq.length > 0 ? (gcCount / seq.length) * 100 : 0,
        gc3Content: total3 > 0 ? (gc3 / total3) * 100 : 0,
    };
}
