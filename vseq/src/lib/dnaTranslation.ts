// Standard genetic code codon table
const CODON_TABLE: Record<string, string> = {
    // Phenylalanine
    'TTT': 'F', 'TTC': 'F',
    // Leucine
    'TTA': 'L', 'TTG': 'L', 'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
    // Isoleucine
    'ATT': 'I', 'ATC': 'I', 'ATA': 'I',
    // Methionine (Start)
    'ATG': 'M',
    // Valine
    'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
    // Serine
    'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S', 'AGT': 'S', 'AGC': 'S',
    // Proline
    'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
    // Threonine
    'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
    // Alanine
    'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
    // Tyrosine
    'TAT': 'Y', 'TAC': 'Y',
    // Stop codons
    'TAA': '*', 'TAG': '*', 'TGA': '*',
    // Histidine
    'CAT': 'H', 'CAC': 'H',
    // Glutamine
    'CAA': 'Q', 'CAG': 'Q',
    // Asparagine
    'AAT': 'N', 'AAC': 'N',
    // Lysine
    'AAA': 'K', 'AAG': 'K',
    // Aspartic acid
    'GAT': 'D', 'GAC': 'D',
    // Glutamic acid
    'GAA': 'E', 'GAG': 'E',
    // Cysteine
    'TGT': 'C', 'TGC': 'C',
    // Tryptophan
    'TGG': 'W',
    // Arginine
    'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R', 'AGA': 'R', 'AGG': 'R',
    // Glycine
    'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G',
};

/**
 * Get complement of a DNA base
 */
const getComplement = (base: string): string => {
    const map: Record<string, string> = {
        'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G',
        'a': 't', 't': 'a', 'g': 'c', 'c': 'g',
        'N': 'N', 'n': 'n'
    };
    return map[base] || base;
};

/**
 * Get reverse complement of a DNA sequence
 */
export const getReverseComplement = (sequence: string): string => {
    return sequence.split('').map(getComplement).reverse().join('');
};

/**
 * Translate a DNA sequence to amino acid sequence
 * @param sequence - DNA sequence (should be in reading frame, starting with start codon)
 * @param strand - 1 for forward, -1 for reverse
 * @param stopAtStopCodon - Whether to stop translation at stop codons (default: true)
 * @returns Amino acid sequence in single-letter code
 */
export const translateDNA = (sequence: string, strand: 1 | -1 = 1, stopAtStopCodon: boolean = true): string => {
    // If reverse strand, get reverse complement first
    const dnaSeq = strand === -1 ? getReverseComplement(sequence) : sequence;

    const aminoAcids: string[] = [];
    const upperSeq = dnaSeq.toUpperCase();

    // Translate codons
    for (let i = 0; i < upperSeq.length - 2; i += 3) {
        const codon = upperSeq.substring(i, i + 3);

        // Check if codon has only valid bases
        if (!/^[ATGC]{3}$/.test(codon)) {
            aminoAcids.push('X'); // Unknown amino acid
            continue;
        }

        const aminoAcid = CODON_TABLE[codon];
        if (aminoAcid) {
            aminoAcids.push(aminoAcid);
            // Stop at stop codon only if stopAtStopCodon is true
            if (stopAtStopCodon && aminoAcid === '*') {
                break;
            }
        } else {
            aminoAcids.push('X'); // Unknown
        }
    }

    return aminoAcids.join('');
};

/**
 * Format amino acid sequence with line breaks for display
 */
export const formatAminoAcidSequence = (aaSeq: string, lineLength: number = 60): string => {
    const lines: string[] = [];
    for (let i = 0; i < aaSeq.length; i += lineLength) {
        lines.push(aaSeq.substring(i, i + lineLength));
    }
    return lines.join('\n');
};
