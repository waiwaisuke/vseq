/**
 * Simple melting temperature (Tm) calculator for DNA sequences.
 * Uses the Wallace rule (2°C per A/T, 4°C per G/C) for short oligos (<14 bp).
 * For longer sequences, uses a basic nearest-neighbor approximation (50 + 0.1*(%GC*length)).
 */
export const calculateTm = (seq: string): number => {
    const upper = seq.toUpperCase().replace(/[^ATGC]/g, ''); // ignore non‑standard bases
    const length = upper.length;
    if (length === 0) return 0;
    const a = (upper.match(/A/g) || []).length;
    const t = (upper.match(/T/g) || []).length;
    const g = (upper.match(/G/g) || []).length;
    const c = (upper.match(/C/g) || []).length;
    const gc = g + c;
    // Wallace rule for short sequences
    if (length < 14) {
        return 2 * (a + t) + 4 * gc;
    }
    // Simple approximation for longer sequences
    const percentGC = (gc / length) * 100;
    return 50 + 0.1 * (percentGC * length);
};
