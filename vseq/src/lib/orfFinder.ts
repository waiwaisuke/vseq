import { getReverseComplement } from './dnaTranslation';

export interface ORF {
    id: string;
    frame: number;       // +1, +2, +3, -1, -2, -3
    start: number;       // 0-indexed position in original sequence
    end: number;         // 0-indexed exclusive
    length: number;      // in nucleotides
    aaLength: number;    // in amino acids
    strand: 1 | -1;
}

const CODON_TABLE: Record<string, string> = {
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

function findORFsInFrame(seq: string, frame: number, minAaLength: number): ORF[] {
    const isForward = frame > 0;
    const offset = Math.abs(frame) - 1;
    const workSeq = isForward ? seq.toUpperCase() : getReverseComplement(seq.toUpperCase());

    const orfs: ORF[] = [];
    let orfId = 0;

    // Scan for start codons (ATG) and find ORFs
    let i = offset;
    while (i + 2 < workSeq.length) {
        const codon = workSeq.substring(i, i + 3);

        if (codon === 'ATG') {
            // Found start codon, scan for stop
            let j = i + 3;
            let foundStop = false;

            while (j + 2 < workSeq.length) {
                const nextCodon = workSeq.substring(j, j + 3);
                const aa = CODON_TABLE[nextCodon];

                if (aa === '*') {
                    foundStop = true;
                    const orfEnd = j + 3; // Include stop codon
                    const orfLength = orfEnd - i;
                    const aaLength = Math.floor(orfLength / 3) - 1; // Exclude stop

                    if (aaLength >= minAaLength) {
                        // Convert positions back to original sequence coords
                        let start: number, end: number;
                        if (isForward) {
                            start = i;
                            end = orfEnd;
                        } else {
                            start = seq.length - orfEnd;
                            end = seq.length - i;
                        }

                        orfs.push({
                            id: `orf-${frame}-${orfId++}`,
                            frame,
                            start,
                            end,
                            length: orfLength,
                            aaLength,
                            strand: isForward ? 1 : -1,
                        });
                    }
                    i = j + 3; // Continue scanning after stop codon
                    break;
                }
                j += 3;
            }

            if (!foundStop) {
                // No stop codon found before end of sequence
                // Treat as ORF extending to end
                const orfLength = workSeq.length - i;
                const aaLength = Math.floor(orfLength / 3);

                if (aaLength >= minAaLength) {
                    let start: number, end: number;
                    if (isForward) {
                        start = i;
                        end = i + orfLength;
                    } else {
                        start = seq.length - i - orfLength;
                        end = seq.length - i;
                    }

                    orfs.push({
                        id: `orf-${frame}-${orfId++}`,
                        frame,
                        start,
                        end,
                        length: orfLength,
                        aaLength,
                        strand: isForward ? 1 : -1,
                    });
                }
                break; // End of sequence
            }
        } else {
            i += 3; // Move to next codon
        }
    }

    return orfs;
}

export function findAllORFs(sequence: string, minAaLength: number = 100): ORF[] {
    const allOrfs: ORF[] = [];

    for (const frame of [1, 2, 3, -1, -2, -3]) {
        allOrfs.push(...findORFsInFrame(sequence, frame, minAaLength));
    }

    // Sort by length descending
    return allOrfs.sort((a, b) => b.aaLength - a.aaLength);
}
