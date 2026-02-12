import type { SequenceData, Feature } from '../types';

/**
 * Parse EMBL format files.
 */
export function parseEMBL(content: string): SequenceData | null {
    try {
        const lines = content.split('\n');
        let name = 'Unknown';
        let circular = false;
        const features: Feature[] = [];
        let sequence = '';
        let inSequence = false;

        for (const line of lines) {
            if (line.startsWith('ID')) {
                const parts = line.split(/\s+/);
                name = parts[1] || 'Unknown';
                if (line.includes('circular')) circular = true;
            }

            if (line.startsWith('AC')) {
                if (name === 'Unknown') {
                    const acc = line.replace('AC', '').trim().replace(';', '');
                    if (acc) name = acc;
                }
            }

            if (line.startsWith('FT')) {
                const featureLine = line.slice(5).trim();
                const match = featureLine.match(/^(\S+)\s+(\d+)\.\.(\d+)/);
                if (match) {
                    const strand = featureLine.includes('complement') ? -1 : 1;
                    const start = parseInt(match[2]);
                    const end = parseInt(match[3]);
                    features.push({
                        id: crypto.randomUUID(),
                        name: match[1],
                        type: match[1],
                        start,
                        end,
                        strand: strand as 1 | -1,
                    });
                }
                // Check for /label or /gene qualifier
                const labelMatch = featureLine.match(/\/(?:label|gene)="([^"]+)"/);
                if (labelMatch && features.length > 0) {
                    features[features.length - 1].label = labelMatch[1];
                }
            }

            if (line.startsWith('SQ')) {
                inSequence = true;
                continue;
            }

            if (line.startsWith('//')) {
                inSequence = false;
            }

            if (inSequence) {
                sequence += line.replace(/[\s0-9]/g, '');
            }
        }

        if (!sequence) return null;

        return {
            id: crypto.randomUUID(),
            name,
            sequence: sequence.toUpperCase(),
            type: 'dna',
            circular,
            features,
        };
    } catch {
        return null;
    }
}

/**
 * Parse SnapGene .dna format (simplified - binary header + GenBank text).
 * Note: Full SnapGene parsing requires binary format support.
 * This handles the basic text-based sections that some tools export.
 */
export function parseSnapGene(content: string): SequenceData | null {
    // SnapGene files are binary, but some tools export pseudo-SnapGene
    // that's actually GenBank format with a different extension.
    // Try to parse as GenBank
    if (content.includes('LOCUS') && content.includes('ORIGIN')) {
        // It's actually GenBank format
        return null; // Let the GenBank parser handle it
    }

    // For actual binary SnapGene files, we'd need an ArrayBuffer parser.
    // Return null for now - binary parsing would be a future enhancement.
    return null;
}

/**
 * Parse GFF3 format (annotation only - requires separate sequence).
 */
export function parseGFF3(content: string, existingSequence?: string): Feature[] {
    const features: Feature[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
        if (line.startsWith('#') || !line.trim()) continue;
        if (line.startsWith('>')) break; // FASTA section

        const fields = line.split('\t');
        if (fields.length < 9) continue;

        const [, , type, startStr, endStr, , strandStr, , attributes] = fields;
        const start = parseInt(startStr);
        const end = parseInt(endStr);
        const strand = strandStr === '-' ? -1 : 1;

        // Parse attributes (key=value pairs separated by ;)
        const attrs: Record<string, string> = {};
        if (attributes) {
            attributes.split(';').forEach(attr => {
                const [key, ...valParts] = attr.split('=');
                if (key && valParts.length > 0) {
                    attrs[key.trim()] = decodeURIComponent(valParts.join('='));
                }
            });
        }

        features.push({
            id: crypto.randomUUID(),
            name: attrs['Name'] || attrs['ID'] || type,
            type,
            start,
            end,
            strand: strand as 1 | -1,
            label: attrs['Name'] || attrs['gene'] || attrs['product'],
            attributes: attrs,
        });
    }

    return features;
}
