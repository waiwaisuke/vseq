import { useState, useMemo } from 'react';
import { FlaskConical, Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import { designPrimers, calculateTm, calculateGcPercent, hasGcClamp, scoreSelfComplementarity } from '../../lib/primerDesign';
import type { PrimerPair, Primer } from '../../lib/primerDesign';

interface PrimerDesignPanelProps {
    sequence: string;
    selectionStart: number | null;
    selectionEnd: number | null;
    hasSelection: boolean;
    onAddAsFeature?: (primer: Primer) => void;
}

export const PrimerDesignPanel = ({
    sequence,
    selectionStart,
    selectionEnd,
    hasSelection,
    onAddAsFeature,
}: PrimerDesignPanelProps) => {
    const [minLength, setMinLength] = useState(18);
    const [maxLength, setMaxLength] = useState(25);
    const [minTm, setMinTm] = useState(55);
    const [maxTm, setMaxTm] = useState(65);
    const [manualSeq, setManualSeq] = useState('');

    const regionStart = hasSelection && selectionStart !== null && selectionEnd !== null
        ? Math.min(selectionStart, selectionEnd) : 0;
    const regionEnd = hasSelection && selectionStart !== null && selectionEnd !== null
        ? Math.max(selectionStart, selectionEnd) : Math.min(sequence.length, 500);

    const pairs = useMemo(() => {
        if (regionEnd - regionStart < 50) return [];
        return designPrimers(sequence, regionStart, regionEnd, {
            minLength, maxLength, minTm, maxTm,
        });
    }, [sequence, regionStart, regionEnd, minLength, maxLength, minTm, maxTm]);

    // Manual primer analysis
    const manualAnalysis = useMemo(() => {
        const seq = manualSeq.trim().toUpperCase().replace(/[^ATGCN]/g, '');
        if (seq.length < 10) return null;
        return {
            sequence: seq,
            length: seq.length,
            tm: calculateTm(seq),
            gcPercent: calculateGcPercent(seq),
            hasGcClamp: hasGcClamp(seq),
            selfComplementarity: scoreSelfComplementarity(seq),
        };
    }, [manualSeq]);

    const renderPrimerInfo = (p: Primer) => (
        <div className="flex items-center gap-3 text-xs">
            <span className={`px-1.5 py-0.5 rounded font-mono ${p.strand === 1 ? 'bg-blue-900/30 text-blue-300' : 'bg-red-900/30 text-red-300'}`}>
                {p.strand === 1 ? 'FWD' : 'REV'}
            </span>
            <span className="font-mono text-gray-300 truncate max-w-[180px]" title={p.sequence}>{p.sequence}</span>
            <span className="text-gray-500">{p.length}bp</span>
            <span className="text-gray-500">Tm:{p.tm.toFixed(1)}°C</span>
            <span className="text-gray-500">GC:{p.gcPercent.toFixed(0)}%</span>
            {p.hasGcClamp
                ? <CheckCircle size={12} className="text-green-400" title="GC clamp" />
                : <AlertTriangle size={12} className="text-yellow-400" title="No GC clamp" />
            }
            {onAddAsFeature && (
                <button
                    onClick={() => onAddAsFeature(p)}
                    className="text-cyan-400 hover:text-cyan-300 ml-auto"
                    title="Add as primer_bind feature"
                >
                    <Plus size={14} />
                </button>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-gray-900">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-2 mb-1">
                    <FlaskConical size={16} className="text-pink-400" />
                    <h3 className="font-medium text-gray-200">Primer Design</h3>
                </div>
                <div className="text-xs text-gray-400">
                    {hasSelection
                        ? `Region: ${regionStart + 1}..${regionEnd} (${regionEnd - regionStart} bp)`
                        : 'Select a region in Seq view to design primers'
                    }
                </div>
            </div>

            {/* Manual Primer Analysis */}
            <div className="px-4 py-3 border-b border-gray-800 space-y-2">
                <div className="text-xs text-gray-400">Analyze a primer</div>
                <input
                    type="text"
                    value={manualSeq}
                    onChange={e => setManualSeq(e.target.value)}
                    placeholder="Paste primer sequence..."
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 font-mono focus:outline-none focus:border-blue-500"
                />
                {manualAnalysis && (
                    <div className="bg-gray-800/50 rounded p-3 space-y-1 text-xs">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Length</span>
                            <span className="text-gray-200 font-mono">{manualAnalysis.length} bp</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Tm</span>
                            <span className="text-gray-200 font-mono">{manualAnalysis.tm.toFixed(1)} °C</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">GC%</span>
                            <span className="text-gray-200 font-mono">{manualAnalysis.gcPercent.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">3' GC Clamp</span>
                            <span className={manualAnalysis.hasGcClamp ? 'text-green-400' : 'text-yellow-400'}>
                                {manualAnalysis.hasGcClamp ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Self-complementarity</span>
                            <span className={manualAnalysis.selfComplementarity > 0.5 ? 'text-red-400' : 'text-green-400'}>
                                {(manualAnalysis.selfComplementarity * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Design Parameters */}
            <div className="px-4 py-3 border-b border-gray-800 space-y-2">
                <div className="text-xs text-gray-400">Design Parameters</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <label className="text-gray-500">Min length</label>
                        <input type="number" value={minLength} onChange={e => setMinLength(+e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-gray-500">Max length</label>
                        <input type="number" value={maxLength} onChange={e => setMaxLength(+e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-gray-500">Min Tm (°C)</label>
                        <input type="number" value={minTm} onChange={e => setMinTm(+e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-gray-500">Max Tm (°C)</label>
                        <input type="number" value={maxTm} onChange={e => setMaxTm(+e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-800">
                {pairs.length} primer pair{pairs.length !== 1 ? 's' : ''} found
            </div>
            <div className="flex-1 overflow-y-auto">
                {pairs.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 text-sm">
                        {hasSelection && regionEnd - regionStart >= 50
                            ? 'No primer pairs match current criteria. Try adjusting parameters.'
                            : 'Select a region (≥50 bp) in Seq view to design primers.'}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-800/50">
                        {pairs.slice(0, 20).map((pair, i) => (
                            <div key={i} className="px-4 py-3 hover:bg-gray-800/30 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-300">Pair #{i + 1}</span>
                                    <span className="text-xs text-gray-500 font-mono">Product: {pair.productSize} bp</span>
                                </div>
                                {renderPrimerInfo(pair.forward)}
                                {renderPrimerInfo(pair.reverse)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
