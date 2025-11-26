const fs = require('fs');
const path = require('path');

const parseGenBank = (content) => {
    const lines = content.split('\n');
    let name = 'Unknown';
    let sequence = '';
    let isOrigin = false;
    let isCircular = false;
    const features = [];

    let inFeatures = false;
    let currentFeature = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
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
            const featureMatch = line.match(/^ {5}(\w+)\s+(.+)$/);

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
                    if (nextLine.match(/^ {21}[^/]/)) {
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
                let strand = 1;

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

                currentFeature = {
                    name: type,
                    type,
                    start,
                    end,
                    strand,
                    label: type, // Default label
                    attributes: {}
                };
            } else if (currentFeature) {
                // Qualifiers: 21 spaces, /key=value
                const labelMatch = line.match(/^ {21}\/label=(.+)$/);
                const noteMatch = line.match(/^ {21}\/note="?(.+?)"?$/);
                const geneMatch = line.match(/^ {21}\/gene="?(.+?)"?$/);
                const productMatch = line.match(/^ {21}\/product="?(.+?)"?$/);

                if (labelMatch) {
                    currentFeature.label = labelMatch[1].replace(/"/g, '');
                    currentFeature.name = currentFeature.label;
                } else if (geneMatch) {
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

    if (currentFeature && !isOrigin) {
        features.push(currentFeature);
    }

    return { name, features };
};

const filePath = path.join(__dirname, 'vseq/test/addgene-plasmid-200458-sequence-394118.gbk');
try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = parseGenBank(content);

    console.log('Type,Name,Start,End,Strand,Length');
    result.features.forEach(f => {
        console.log(`${f.type},"${f.name}",${f.start},${f.end},${f.strand},${f.end - f.start + 1}`);
    });
} catch (err) {
    console.error('Error reading file:', err);
}
