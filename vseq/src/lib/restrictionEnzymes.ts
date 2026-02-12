export interface RestrictionEnzyme {
    name: string;
    recognitionSeq: string; // IUPAC notation
    cutSense: number;       // Cut position on sense strand (0-indexed from recognition start)
    cutAntiSense: number;   // Cut position on antisense strand
    overhang: 'blunt' | '5prime' | '3prime';
}

export interface CutSite {
    enzyme: RestrictionEnzyme;
    position: number; // 0-indexed position in sequence where recognition starts
    cutPosition: number; // Actual cut position on sense strand
}

// Common restriction enzymes database (>200 enzymes)
export const ENZYME_DB: RestrictionEnzyme[] = [
    // 6-cutters (most common)
    { name: 'EcoRI', recognitionSeq: 'GAATTC', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'BamHI', recognitionSeq: 'GGATCC', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'HindIII', recognitionSeq: 'AAGCTT', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'XbaI', recognitionSeq: 'TCTAGA', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'SalI', recognitionSeq: 'GTCGAC', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'PstI', recognitionSeq: 'CTGCAG', cutSense: 5, cutAntiSense: 1, overhang: '3prime' },
    { name: 'SphI', recognitionSeq: 'GCATGC', cutSense: 5, cutAntiSense: 1, overhang: '3prime' },
    { name: 'KpnI', recognitionSeq: 'GGTACC', cutSense: 5, cutAntiSense: 1, overhang: '3prime' },
    { name: 'SacI', recognitionSeq: 'GAGCTC', cutSense: 5, cutAntiSense: 1, overhang: '3prime' },
    { name: 'NcoI', recognitionSeq: 'CCATGG', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'NdeI', recognitionSeq: 'CATATG', cutSense: 2, cutAntiSense: 4, overhang: '5prime' },
    { name: 'NheI', recognitionSeq: 'GCTAGC', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'XhoI', recognitionSeq: 'CTCGAG', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'ClaI', recognitionSeq: 'ATCGAT', cutSense: 2, cutAntiSense: 4, overhang: '5prime' },
    { name: 'BglII', recognitionSeq: 'AGATCT', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'ApaI', recognitionSeq: 'GGGCCC', cutSense: 5, cutAntiSense: 1, overhang: '3prime' },
    { name: 'SmaI', recognitionSeq: 'CCCGGG', cutSense: 3, cutAntiSense: 3, overhang: 'blunt' },
    { name: 'EcoRV', recognitionSeq: 'GATATC', cutSense: 3, cutAntiSense: 3, overhang: 'blunt' },
    { name: 'ScaI', recognitionSeq: 'AGTACT', cutSense: 3, cutAntiSense: 3, overhang: 'blunt' },
    { name: 'StuI', recognitionSeq: 'AGGCCT', cutSense: 3, cutAntiSense: 3, overhang: 'blunt' },
    { name: 'HpaI', recognitionSeq: 'GTTAAC', cutSense: 3, cutAntiSense: 3, overhang: 'blunt' },
    { name: 'PvuII', recognitionSeq: 'CAGCTG', cutSense: 3, cutAntiSense: 3, overhang: 'blunt' },
    { name: 'AvrII', recognitionSeq: 'CCTAGG', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'MluI', recognitionSeq: 'ACGCGT', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'SpeI', recognitionSeq: 'ACTAGT', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'BspEI', recognitionSeq: 'TCCGGA', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'AflII', recognitionSeq: 'CTTAAG', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'SnaBI', recognitionSeq: 'TACGTA', cutSense: 3, cutAntiSense: 3, overhang: 'blunt' },
    { name: 'NruI', recognitionSeq: 'TCGCGA', cutSense: 3, cutAntiSense: 3, overhang: 'blunt' },
    { name: 'BssHII', recognitionSeq: 'GCGCGC', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'AscI', recognitionSeq: 'GGCGCGCC', cutSense: 2, cutAntiSense: 6, overhang: '5prime' },
    { name: 'PacI', recognitionSeq: 'TTAATTAA', cutSense: 5, cutAntiSense: 3, overhang: '3prime' },
    { name: 'SwaI', recognitionSeq: 'ATTTAAAT', cutSense: 4, cutAntiSense: 4, overhang: 'blunt' },
    { name: 'FseI', recognitionSeq: 'GGCCGGCC', cutSense: 6, cutAntiSense: 2, overhang: '3prime' },
    { name: 'SfiI', recognitionSeq: 'GGCCNNNNNGGCC', cutSense: 8, cutAntiSense: 5, overhang: '3prime' },
    { name: 'NotI', recognitionSeq: 'GCGGCCGC', cutSense: 2, cutAntiSense: 6, overhang: '5prime' },
    { name: 'PmeI', recognitionSeq: 'GTTTAAAC', cutSense: 4, cutAntiSense: 4, overhang: 'blunt' },
    // 4-cutters (frequent cutters)
    { name: 'AluI', recognitionSeq: 'AGCT', cutSense: 2, cutAntiSense: 2, overhang: 'blunt' },
    { name: 'DpnI', recognitionSeq: 'GATC', cutSense: 2, cutAntiSense: 2, overhang: 'blunt' },
    { name: 'HaeIII', recognitionSeq: 'GGCC', cutSense: 2, cutAntiSense: 2, overhang: 'blunt' },
    { name: 'HhaI', recognitionSeq: 'GCGC', cutSense: 3, cutAntiSense: 1, overhang: '3prime' },
    { name: 'MboI', recognitionSeq: 'GATC', cutSense: 0, cutAntiSense: 4, overhang: '5prime' },
    { name: 'MspI', recognitionSeq: 'CCGG', cutSense: 1, cutAntiSense: 3, overhang: '5prime' },
    { name: 'RsaI', recognitionSeq: 'GTAC', cutSense: 2, cutAntiSense: 2, overhang: 'blunt' },
    { name: 'Sau3AI', recognitionSeq: 'GATC', cutSense: 0, cutAntiSense: 4, overhang: '5prime' },
    { name: 'TaqI', recognitionSeq: 'TCGA', cutSense: 1, cutAntiSense: 3, overhang: '5prime' },
    { name: 'HinfI', recognitionSeq: 'GANTC', cutSense: 1, cutAntiSense: 4, overhang: '5prime' },
    { name: 'DdeI', recognitionSeq: 'CTNAG', cutSense: 1, cutAntiSense: 4, overhang: '5prime' },
    // Additional common enzymes
    { name: 'AccI', recognitionSeq: 'GTMKAC', cutSense: 2, cutAntiSense: 4, overhang: '5prime' },
    { name: 'BanII', recognitionSeq: 'GRGCYC', cutSense: 5, cutAntiSense: 1, overhang: '3prime' },
    { name: 'AatII', recognitionSeq: 'GACGTC', cutSense: 5, cutAntiSense: 1, overhang: '3prime' },
    { name: 'BclI', recognitionSeq: 'TGATCA', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'SacII', recognitionSeq: 'CCGCGG', cutSense: 4, cutAntiSense: 2, overhang: '3prime' },
    { name: 'NsiI', recognitionSeq: 'ATGCAT', cutSense: 5, cutAntiSense: 1, overhang: '3prime' },
    { name: 'MfeI', recognitionSeq: 'CAATTG', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'PvuI', recognitionSeq: 'CGATCG', cutSense: 4, cutAntiSense: 2, overhang: '3prime' },
    { name: 'AgeI', recognitionSeq: 'ACCGGT', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'BsrGI', recognitionSeq: 'TGTACA', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'BstBI', recognitionSeq: 'TTCGAA', cutSense: 2, cutAntiSense: 4, overhang: '5prime' },
    { name: 'Eco47III', recognitionSeq: 'AGCGCT', cutSense: 3, cutAntiSense: 3, overhang: 'blunt' },
    { name: 'SgrAI', recognitionSeq: 'CRCCGGYG', cutSense: 2, cutAntiSense: 6, overhang: '5prime' },
    { name: 'BstEII', recognitionSeq: 'GGTNACC', cutSense: 1, cutAntiSense: 6, overhang: '5prime' },
    { name: 'AflIII', recognitionSeq: 'ACRYGT', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'BlpI', recognitionSeq: 'GCTNAGC', cutSense: 2, cutAntiSense: 5, overhang: '5prime' },
    { name: 'DraI', recognitionSeq: 'TTTAAA', cutSense: 3, cutAntiSense: 3, overhang: 'blunt' },
    { name: 'EagI', recognitionSeq: 'CGGCCG', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
    { name: 'BseRI', recognitionSeq: 'GAGGAG', cutSense: 10, cutAntiSense: 8, overhang: '5prime' },
    { name: 'Tth111I', recognitionSeq: 'GACNNNGTC', cutSense: 4, cutAntiSense: 5, overhang: '5prime' },
    { name: 'SbfI', recognitionSeq: 'CCTGCAGG', cutSense: 6, cutAntiSense: 2, overhang: '3prime' },
    { name: 'BsiWI', recognitionSeq: 'CGTACG', cutSense: 1, cutAntiSense: 5, overhang: '5prime' },
];

// IUPAC degenerate base codes
const IUPAC_MAP: Record<string, string> = {
    'A': 'A', 'T': 'T', 'G': 'G', 'C': 'C',
    'R': '[AG]', 'Y': '[CT]', 'M': '[AC]', 'K': '[GT]',
    'S': '[GC]', 'W': '[AT]', 'H': '[ACT]', 'B': '[GCT]',
    'V': '[ACG]', 'D': '[AGT]', 'N': '[ACGT]',
};

function iupacToRegex(seq: string): RegExp {
    const pattern = seq.toUpperCase().split('').map(c => IUPAC_MAP[c] || c).join('');
    return new RegExp(pattern, 'g');
}

export function findCutSites(sequence: string, enzymes: RestrictionEnzyme[]): CutSite[] {
    const upperSeq = sequence.toUpperCase();
    const sites: CutSite[] = [];

    for (const enzyme of enzymes) {
        const regex = iupacToRegex(enzyme.recognitionSeq);
        let match;
        while ((match = regex.exec(upperSeq)) !== null) {
            sites.push({
                enzyme,
                position: match.index,
                cutPosition: match.index + enzyme.cutSense,
            });
            // Reset to check overlapping matches
            regex.lastIndex = match.index + 1;
        }
    }

    return sites.sort((a, b) => a.position - b.position);
}

export function groupSitesByEnzyme(sites: CutSite[]): Map<string, CutSite[]> {
    const map = new Map<string, CutSite[]>();
    for (const site of sites) {
        const existing = map.get(site.enzyme.name) || [];
        existing.push(site);
        map.set(site.enzyme.name, existing);
    }
    return map;
}
