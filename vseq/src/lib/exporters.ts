import type { SequenceData } from '../types';

export const exportAsGenBank = (data: SequenceData, sequence: string, features: SequenceData['features']): string => {
    const lines: string[] = [];
    const seqLen = sequence.length;
    const topology = data.circular ? 'circular' : 'linear';

    // LOCUS line
    lines.push(`LOCUS       ${data.name.padEnd(16)} ${seqLen} bp    DNA     ${topology} SYN ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}`);
    lines.push(`DEFINITION  .`);
    lines.push(`ACCESSION   .`);
    lines.push(`VERSION     .`);
    lines.push(`KEYWORDS    .`);
    lines.push(`SOURCE      .`);
    lines.push(`  ORGANISM  .`);

    // FEATURES
    if (features.length > 0) {
        lines.push(`FEATURES             Location/Qualifiers`);
        lines.push(`     source          1..${seqLen}`);
        lines.push(`                     /mol_type="other DNA"`);
        lines.push(`                     /organism="synthetic DNA construct"`);

        for (const f of features) {
            let location = `${f.start}..${f.end}`;
            if (f.strand === -1) {
                location = `complement(${location})`;
            }
            lines.push(`     ${f.type.padEnd(16)}${location}`);
            if (f.label) {
                lines.push(`                     /label="${f.label}"`);
            }
            if (f.attributes) {
                for (const [key, value] of Object.entries(f.attributes)) {
                    if (key !== 'label') {
                        lines.push(`                     /${key}="${value}"`);
                    }
                }
            }
        }
    }

    // ORIGIN
    lines.push('ORIGIN');
    const seqLower = sequence.toLowerCase();
    for (let i = 0; i < seqLower.length; i += 60) {
        const chunk = seqLower.slice(i, i + 60).match(/.{1,10}/g)?.join(' ') || '';
        lines.push(`${String(i + 1).padStart(9)} ${chunk}`);
    }
    lines.push('//');

    return lines.join('\n');
};

export const exportAsFasta = (data: SequenceData, sequence: string): string => {
    const lines: string[] = [];
    lines.push(`>${data.name}`);

    // Wrap sequence at 80 characters per line
    for (let i = 0; i < sequence.length; i += 80) {
        lines.push(sequence.slice(i, i + 80));
    }

    return lines.join('\n');
};

export const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
