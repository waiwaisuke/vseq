import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import type { Feature } from '../../types';
import { translateDNA } from '../../lib/dnaTranslation';

interface FeatureEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (feature: Omit<Feature, 'id'> | Feature) => void;
    onDelete?: () => void;
    initialFeature?: Feature;
    selectionStart?: number;
    selectionEnd?: number;
    sequence?: string;  // Full sequence to extract feature sequence from
}

const FEATURE_TYPES = [
    'CDS',
    'gene',
    'promoter',
    'terminator',
    'misc_feature',
    'regulatory',
    'origin_of_replication',
    'primer_bind',
    'misc_binding',
    'protein_bind',
    'RBS',
    'misc_RNA',
    'mRNA',
    'tRNA',
    'rRNA',
];

export const FeatureEditor = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    initialFeature,
    selectionStart,
    selectionEnd,
    sequence,
}: FeatureEditorProps) => {
    const [type, setType] = useState(initialFeature?.type || 'misc_feature');
    const [label, setLabel] = useState(initialFeature?.label || '');
    const [strand, setStrand] = useState<1 | -1>(initialFeature?.strand || 1);
    const [start, setStart] = useState(initialFeature?.start || selectionStart || 0);
    const [end, setEnd] = useState(initialFeature?.end || selectionEnd || 0);

    useEffect(() => {
        if (initialFeature) {
            setType(initialFeature.type);
            setLabel(initialFeature.label || '');
            setStrand(initialFeature.strand || 1);
            setStart(initialFeature.start);
            setEnd(initialFeature.end);
        } else if (selectionStart !== undefined && selectionEnd !== undefined) {
            setStart(selectionStart);
            setEnd(selectionEnd);
        }
    }, [initialFeature, selectionStart, selectionEnd]);

    // Calculate amino acid sequence for CDS features
    const aminoAcidSequence = useMemo(() => {
        if (type !== 'CDS' || !sequence || start === 0 || end === 0) return null;

        try {
            // Extract feature sequence (0-based to 1-based conversion)
            const featureSeq = sequence.slice(start - 1, end);
            if (!featureSeq) return null;

            // Translate
            const aaSeq = translateDNA(featureSeq, strand);
            return aaSeq;
        } catch (error) {
            console.error('Translation error:', error);
            return null;
        }
    }, [type, sequence, start, end, strand]);

    const handleSave = () => {
        if (!label.trim()) {
            alert('Label is required');
            return;
        }

        const feature: Omit<Feature, 'id'> | Feature = initialFeature
            ? { ...initialFeature, type, label, strand: strand as 1 | -1, start, end }
            : { type, label, strand: strand as 1 | -1, start, end, name: label };

        onSave(feature);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'Enter' && e.ctrlKey) {
            handleSave();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-100">
                        {initialFeature ? 'Edit Feature' : 'Add Feature'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Type
                        </label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {FEATURE_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Label */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Label *
                        </label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Enter feature label"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                    </div>

                    {/* Strand */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Strand
                        </label>
                        <select
                            value={strand}
                            onChange={(e) => setStrand(Number(e.target.value) as 1 | -1)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={1}>Forward (+)</option>
                            <option value={-1}>Reverse (-)</option>
                        </select>
                    </div>

                    {/* Start/End */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Start
                            </label>
                            <input
                                type="number"
                                value={start}
                                onChange={(e) => setStart(Number(e.target.value))}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                End
                            </label>
                            <input
                                type="number"
                                value={end}
                                onChange={(e) => setEnd(Number(e.target.value))}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Amino Acid Sequence (for CDS) */}
                    {type === 'CDS' && aminoAcidSequence && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Amino Acid Sequence ({aminoAcidSequence.length} aa)
                            </label>
                            <div className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 font-mono text-xs break-all max-h-24 overflow-y-auto">
                                {aminoAcidSequence}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between mt-6">
                    <div>
                        {initialFeature && onDelete && (
                            <button
                                onClick={() => {
                                    onDelete();
                                    onClose();
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                    Press Esc to cancel, Ctrl+Enter to save
                </div>
            </div>
        </div>
    );
};
