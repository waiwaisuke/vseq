import { useState, useMemo } from 'react';
import { GitMerge, Copy, Check } from 'lucide-react';
import { ENZYME_DB, findCutSites, groupSitesByEnzyme } from '../../lib/restrictionEnzymes';
import type { CutSite } from '../../lib/restrictionEnzymes';

interface CloningSimPanelProps {
    sequence: string;     // vector sequence
    circular: boolean;
}

interface LigationResult {
    sequence: string;
    length: number;
    description: string;
}

export const CloningSimPanel = ({ sequence, circular }: CloningSimPanelProps) => {
    const [insertSeq, setInsertSeq] = useState('');
    const [enzyme1, setEnzyme1] = useState('');
    const [enzyme2, setEnzyme2] = useState('');
    const [insertDirection, setInsertDirection] = useState<'forward' | 'reverse'>('forward');
    const [copied, setCopied] = useState(false);

    const insert = useMemo(() =>
        insertSeq.toUpperCase().replace(/[^ATGCN]/g, '').replace(/\s/g, '')
    , [insertSeq]);

    // Find cut sites on vector
    const vectorSites = useMemo(() => findCutSites(sequence, ENZYME_DB), [sequence]);
    const vectorByEnzyme = useMemo(() => groupSitesByEnzyme(vectorSites), [vectorSites]);

    // Find cut sites on insert
    const insertSites = useMemo(() => insert.length > 0 ? findCutSites(insert, ENZYME_DB) : [], [insert]);
    const insertByEnzyme = useMemo(() => groupSitesByEnzyme(insertSites), [insertSites]);

    // Enzymes that cut both vector and insert exactly once (ideal for cloning)
    const compatibleEnzymes = useMemo(() => {
        return ENZYME_DB.filter(e => {
            const vCount = vectorByEnzyme.get(e.name)?.length || 0;
            const iCount = insertByEnzyme.get(e.name)?.length || 0;
            return vCount >= 1 && iCount >= 1;
        }).map(e => e.name);
    }, [vectorByEnzyme, insertByEnzyme]);

    // Unique cutters on vector (for single-enzyme cloning)
    const vectorUniqueCutters = useMemo(() =>
        ENZYME_DB.filter(e => (vectorByEnzyme.get(e.name)?.length || 0) === 1).map(e => e.name)
    , [vectorByEnzyme]);

    // Simulate ligation
    const result: LigationResult | null = useMemo(() => {
        if (!enzyme1 || insert.length === 0) return null;

        const e1Sites = vectorByEnzyme.get(enzyme1);
        if (!e1Sites || e1Sites.length === 0) return null;

        const cutPos1 = e1Sites[0].position;
        let cutPos2 = cutPos1;

        if (enzyme2 && enzyme2 !== enzyme1) {
            const e2Sites = vectorByEnzyme.get(enzyme2);
            if (!e2Sites || e2Sites.length === 0) return null;
            cutPos2 = e2Sites[0].position;
        }

        // Build the construct
        const pos1 = Math.min(cutPos1, cutPos2);
        const pos2 = Math.max(cutPos1, cutPos2);

        let vectorBackbone: string;
        if (circular && pos1 !== pos2) {
            // For circular vector, backbone is the part we keep
            vectorBackbone = sequence.slice(pos2) + sequence.slice(0, pos1);
        } else {
            // Linear or single cut
            vectorBackbone = sequence.slice(0, pos1) + sequence.slice(pos2);
        }

        const insertFragment = insertDirection === 'forward' ? insert : reverseComplement(insert);

        const finalSeq = sequence.slice(0, pos1) + insertFragment + sequence.slice(pos2);

        return {
            sequence: finalSeq,
            length: finalSeq.length,
            description: enzyme2 && enzyme2 !== enzyme1
                ? `Vector cut at ${enzyme1} (${pos1 + 1}) and ${enzyme2} (${pos2 + 1}), insert ligated ${insertDirection}`
                : `Vector cut at ${enzyme1} (${pos1 + 1}), insert ligated ${insertDirection}`,
        };
    }, [sequence, insert, enzyme1, enzyme2, insertDirection, vectorByEnzyme, circular]);

    const handleCopy = async () => {
        if (!result) return;
        await navigator.clipboard.writeText(result.sequence);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="flex flex-col h-full bg-gray-900">
            <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-2 mb-1">
                    <GitMerge size={16} className="text-emerald-400" />
                    <h3 className="font-medium text-gray-200">Cloning Simulation</h3>
                </div>
                <div className="text-xs text-gray-400">
                    Vector: {sequence.length} bp ({circular ? 'circular' : 'linear'})
                    {insert.length > 0 && ` • Insert: ${insert.length} bp`}
                </div>
            </div>

            <div className="px-4 py-3 border-b border-gray-800 space-y-3">
                {/* Insert sequence */}
                <div>
                    <label className="text-xs text-gray-400 block mb-1">Insert Sequence</label>
                    <textarea
                        value={insertSeq}
                        onChange={e => setInsertSeq(e.target.value)}
                        placeholder="Paste insert DNA sequence..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-blue-500 h-16 resize-none"
                    />
                </div>

                {/* Enzyme selection */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Enzyme 1 (5')</label>
                        <select
                            value={enzyme1}
                            onChange={e => setEnzyme1(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Select enzyme...</option>
                            {insert.length > 0 && compatibleEnzymes.length > 0 && (
                                <optgroup label="Compatible (cuts both)">
                                    {compatibleEnzymes.map(e => (
                                        <option key={e} value={e}>{e}</option>
                                    ))}
                                </optgroup>
                            )}
                            <optgroup label="Vector unique cutters">
                                {vectorUniqueCutters.map(e => (
                                    <option key={e} value={e}>{e}</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Enzyme 2 (3', optional)</label>
                        <select
                            value={enzyme2}
                            onChange={e => setEnzyme2(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Same as Enzyme 1</option>
                            {vectorUniqueCutters.filter(e => e !== enzyme1).map(e => (
                                <option key={e} value={e}>{e}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Direction */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">Insert direction:</span>
                    {(['forward', 'reverse'] as const).map(d => (
                        <button
                            key={d}
                            onClick={() => setInsertDirection(d)}
                            className={`px-2 py-0.5 rounded text-xs ${insertDirection === d
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            {d === 'forward' ? '→ Forward' : '← Reverse'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Result */}
            <div className="flex-1 overflow-y-auto p-4">
                {result ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-200">Ligation Result</h4>
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200"
                            >
                                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                {copied ? 'Copied!' : 'Copy sequence'}
                            </button>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Construct size</span>
                                <span className="text-gray-200 font-mono">{result.length.toLocaleString()} bp</span>
                            </div>
                            <div className="text-xs text-gray-400">{result.description}</div>
                        </div>
                        <div className="bg-gray-950 rounded-lg p-3 max-h-48 overflow-y-auto">
                            <pre className="text-xs font-mono text-gray-400 break-all whitespace-pre-wrap">
                                {result.sequence.match(/.{1,60}/g)?.join('\n')}
                            </pre>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-500 text-sm py-8">
                        {insert.length === 0
                            ? 'Paste an insert sequence and select restriction enzymes'
                            : 'Select a restriction enzyme to simulate cloning'}
                    </div>
                )}
            </div>
        </div>
    );
};

function reverseComplement(seq: string): string {
    const comp: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G', N: 'N' };
    return seq.split('').reverse().map(c => comp[c] || c).join('');
}
