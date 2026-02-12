/**
 * Default feature type colors (used across Linear/Circular/Map views).
 */
export const DEFAULT_FEATURE_COLORS: Record<string, string> = {
    CDS: '#3b82f6',         // blue
    gene: '#10b981',        // green
    promoter: '#f59e0b',    // amber
    terminator: '#ef4444',  // red
    rep_origin: '#8b5cf6',  // violet
    primer_bind: '#ec4899', // pink
    misc_feature: '#6b7280', // gray
    regulatory: '#f97316',  // orange
    mRNA: '#06b6d4',        // cyan
    tRNA: '#14b8a6',        // teal
    rRNA: '#0ea5e9',        // sky
    ncRNA: '#a855f7',       // purple
    intron: '#78716c',      // stone
    exon: '#22c55e',        // green
    sig_peptide: '#d946ef', // fuchsia
    transit_peptide: '#c084fc', // purple-light
    mat_peptide: '#2dd4bf', // teal-light
    source: '#94a3b8',      // slate
};

const STORAGE_KEY = 'vseq-feature-colors';

/**
 * Get stored custom colors from localStorage.
 */
export function getCustomColors(): Record<string, string> {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

/**
 * Save custom color for a feature type.
 */
export function setCustomColor(featureType: string, color: string) {
    const colors = getCustomColors();
    colors[featureType] = color;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
}

/**
 * Reset a custom color (revert to default).
 */
export function resetCustomColor(featureType: string) {
    const colors = getCustomColors();
    delete colors[featureType];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
}

/**
 * Get the effective color for a feature type.
 */
export function getFeatureColor(featureType: string, customColor?: string): string {
    if (customColor) return customColor;
    const custom = getCustomColors();
    return custom[featureType] || DEFAULT_FEATURE_COLORS[featureType] || '#6b7280';
}
