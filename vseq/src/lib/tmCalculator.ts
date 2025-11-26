/**
 * Calculate the melting temperature (Tm) of a DNA sequence
 */

interface BaseCount {
    A: number;
    T: number;
    G: number;
    C: number;
}

/**
 * Count the number of each base in a sequence
 */
export const countBases = (sequence: string): BaseCount => {
    const upper = sequence.toUpperCase();
    return {
        A: (upper.match(/A/g) || []).length,
        T: (upper.match(/T/g) || []).length,
        G: (upper.match(/G/g) || []).length,
        C: (upper.match(/C/g) || []).length,
    };
};

/**
 * Calculate GC content percentage
 */
export const calculateGCContent = (sequence: string): number => {
    const counts = countBases(sequence);
    const total = counts.A + counts.T + counts.G + counts.C;
    if (total === 0) return 0;
    return ((counts.G + counts.C) / total) * 100;
};

/**
 * Calculate melting temperature (Tm) for DNA oligonucleotides
 * 
 * For short oligos (<14 bp): Wallace rule
 * Tm = (A+T)×2 + (G+C)×4
 * 
 * For longer oligos (≥14 bp): Basic GC method
 * Tm = 64.9 + 41×(G+C-16.4)/(A+T+G+C)
 * 
 * @param sequence DNA sequence string
 * @returns Melting temperature in Celsius, or null if sequence is empty
 */
export const calculateTm = (sequence: string): number | null => {
    if (!sequence || sequence.length === 0) return null;

    const counts = countBases(sequence);
    const total = counts.A + counts.T + counts.G + counts.C;

    // Ignore non-ATGC bases
    if (total === 0) return null;

    if (total < 14) {
        // Wallace rule for short oligos
        return (counts.A + counts.T) * 2 + (counts.G + counts.C) * 4;
    } else {
        // Basic GC method for longer sequences
        const gcCount = counts.G + counts.C;
        return 64.9 + 41 * (gcCount - 16.4) / total;
    }
};
