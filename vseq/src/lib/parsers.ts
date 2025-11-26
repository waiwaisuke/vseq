import type { SequenceData, Feature } from '../types';

export const parseGenBank = (content: string): SequenceData => {
    // Basic GenBank parser (MVP)
    const lines = content.split(/\r?\n/);
    let name = 'Unknown';
    let sequence = '';
    let isOrigin = false;
    let isCircular = false;
    const features: Feature[] = [];

    let inFeatures = false;
    let currentFeature: Feature | null = null;

    let featureCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trimEnd();

        if (line.startsWith('LOCUS')) {
            const parts = line.split(/\s+/);
            name = parts[1];
            if (line.includes('circular')) isCircular = true;
        } else if (line.startsWith('FEATURES')) {
            inFeatures = true;
        } else if (line.startsWith('ORIGIN')) {
            inFeatures = false;
            isOrigin = true;
            if (currentFeature) {
                features.push(currentFeature);
                currentFeature = null;
            }
        } else if (line.startsWith('//')) {
            isOrigin = false;
        } else if (isOrigin) {
            sequence += line.replace(/[\d\s]/g, '');
        } else if (inFeatures) {
            // Feature start: 5 spaces, type, spaces, location
            // Relaxed regex to handle potential spacing variations
            const featureMatch = line.match(/^\s{5}(\w+)\s+(.+)$/);

            if (featureMatch) {
                // Push previous feature
                if (currentFeature) {
                    features.push(currentFeature);
                    currentFeature = null;
                }

                const type = featureMatch[1];
                let locationStr = featureMatch[2];

                // Check for multi-line location
                // Look ahead for lines starting with 21 spaces but NOT starting with /
                let j = i + 1;
                while (j < lines.length) {
                    const nextLine = lines[j];
                    if (nextLine.match(/^\s{21}[^/]/)) {
                        locationStr += nextLine.trim();
                        i++; // Advance main loop
                        j++;
                    } else {
                        break;
                    }
                }

                // Skip 'source' features as requested
                if (type === 'source') {
                    continue;
                }

                let start = 0;
                let end = 0;
                let strand: 1 | -1 = 1;

                // Handle complement
                const isComplement = locationStr.includes('complement');
                strand = isComplement ? -1 : 1;

                // Extract all numbers to find range (handles join, single, etc. roughly)
                const numbers = locationStr.match(/\d+/g);
                if (numbers && numbers.length > 0) {
                    const nums = numbers.map(n => parseInt(n, 10));
                    start = Math.min(...nums);
                    end = Math.max(...nums);
                }

                featureCount++;
                currentFeature = {
                    id: `feat-${featureCount}-${Date.now()}`, // Simple unique ID
                    name: type,
                    type,
                    start,
                    end,
                    strand,
                    label: type, // Default label, will be updated if /label found
                    attributes: {}
                };
            } else if (currentFeature) {
                // Qualifiers: 21 spaces, /key=value
                const labelMatch = line.match(/^\s{21}\/label=(.+)$/);
                const noteMatch = line.match(/^\s{21}\/note="?(.+?)"?$/);
                const geneMatch = line.match(/^\s{21}\/gene="?(.+?)"?$/);
                const productMatch = line.match(/^\s{21}\/product="?(.+?)"?$/);

                if (labelMatch) {
                    currentFeature.label = labelMatch[1].replace(/"/g, '');
                    currentFeature.name = currentFeature.label; // Use label as name if available
                } else if (geneMatch) {
                    // Use gene name if label not yet set or as fallback
                    if (currentFeature.label === currentFeature.type) {
                        currentFeature.label = geneMatch[1].replace(/"/g, '');
                        currentFeature.name = currentFeature.label;
                    }
                } else if (productMatch) {
                    // Use product for CDS if no label/gene
                    if (currentFeature.label === currentFeature.type) {
                        currentFeature.label = productMatch[1].replace(/"/g, '');
                        currentFeature.name = currentFeature.label;
                    }
                } else if (noteMatch) {
                    currentFeature.attributes = { ...currentFeature.attributes, note: noteMatch[1] };
                }
            }
        }
    }

    // Push last feature if exists
    if (currentFeature && !isOrigin) {
        features.push(currentFeature);
    }

    console.log(`Parsed ${features.length} features`);
    return {
        id: `seq-${Date.now()}`,
        name,
        sequence: sequence.toUpperCase(),
        type: 'dna',
        circular: isCircular,
        features,
    };
};

export const parseFasta = (content: string): SequenceData => {
    const lines = content.split('\n');
    let name = 'Unknown';
    let sequence = '';

    for (const line of lines) {
        if (line.startsWith('>')) {
            name = line.substring(1).trim();
        } else {
            sequence += line.trim();
        }
    }

    return {
        id: crypto.randomUUID(),
        name,
        sequence: sequence.toUpperCase(),
        type: 'dna',
        circular: false,
        features: [],
    };
};
