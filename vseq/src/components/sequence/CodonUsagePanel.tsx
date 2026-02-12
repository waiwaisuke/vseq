import { useState, useMemo } from 'react';
import { BarChart2 } from 'lucide-react';
import { analyzeCodonUsage, CODON_TO_AA, AA_TO_CODONS, REFERENCE_ORGANISMS } from '../../lib/codonUsage';
import type { Feature } from '../../types';

interface CodonUsagePanelProps {
    sequence: string;
    features: Feature[];
}

export const CodonUsagePanel = ({ sequence, features }: CodonUsagePanelProps) => {
    const [selectedCds, setSelectedCds] = useState<string | null>(null);
    const [referenceOrg, setReferenceOrg] = useState('E. coli K12');
    const [sortBy, setSortBy] = useState<'codon' | 'count' | 'fraction'>('codon');

    const cdsFeatures = useMemo(() =>
        features.filter(f => f.type === 'CDS')
    , [features]);

    // Get sequence for selected CDS or whole sequence
    const cdsSequence = useMemo(() => {
        if (selectedCds) {
            const feature = cdsFeatures.find(f => f.id === selectedCds);
            if (feature) {
                return sequence.slice(feature.start - 1, feature.end);
            }
        }
        return sequence;
    }, [selectedCds, cdsFeatures, sequence]);

    const usage = useMemo(() => analyzeCodonUsage(cdsSequence), [cdsSequence]);
    const reference = REFERENCE_ORGANISMS[referenceOrg];

    // Group by amino acid
    const groupedByAA = useMemo(() => {
        const aminoAcids = [...new Set(Object.values(CODON_TO_AA))].filter(aa => aa !== '*').sort();
        return aminoAcids.map(aa => ({
            aa,
            codons: AA_TO_CODONS[aa],
            counts: usage.counts.filter(c => c.aa === aa),
        }));
    }, [usage]);

    const sortedCounts = useMemo(() => {
        const all = [...usage.counts].filter(c => c.aa !== '*');
        if (sortBy === 'count') return all.sort((a, b) => b.count - a.count);
        if (sortBy === 'fraction') return all.sort((a, b) => b.fractionOfAA - a.fractionOfAA);
        return all; // already in codon order
    }, [usage, sortBy]);

    return (
        <div className="flex flex-col h-full bg-gray-900">
            <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-2 mb-1">
                    <BarChart2 size={16} className="text-amber-400" />
                    <h3 className="font-medium text-gray-200">Codon Usage Analysis</h3>
                </div>
                <div className="flex gap-4 text-xs text-gray-400">
                    <span>{usage.totalCodons} codons</span>
                    <span>GC: {usage.gcContent.toFixed(1)}%</span>
                    <span>GC3: {usage.gc3Content.toFixed(1)}%</span>
                    <span>CAI: {usage.cai.toFixed(3)}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="px-4 py-3 border-b border-gray-800 space-y-2">
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1">CDS Region</label>
                        <select
                            value={selectedCds || ''}
                            onChange={e => setSelectedCds(e.target.value || null)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Entire sequence</option>
                            {cdsFeatures.map(f => (
                                <option key={f.id} value={f.id}>
                                    {f.label || f.name || f.type} ({f.start}..{f.end})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1">Reference Organism</label>
                        <select
                            value={referenceOrg}
                            onChange={e => setReferenceOrg(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                        >
                            {Object.keys(REFERENCE_ORGANISMS).map(org => (
                                <option key={org} value={org}>{org}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex gap-2">
                    <span className="text-xs text-gray-500">Sort:</span>
                    {(['codon', 'count', 'fraction'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setSortBy(s)}
                            className={`px-2 py-0.5 rounded text-xs ${sortBy === s
                                ? 'bg-amber-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Codon Table */}
            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-xs">
                    <thead className="bg-gray-800 text-gray-400 uppercase sticky top-0">
                        <tr>
                            <th className="px-3 py-2 text-left">Codon</th>
                            <th className="px-3 py-2 text-left">AA</th>
                            <th className="px-3 py-2 text-right">Count</th>
                            <th className="px-3 py-2 text-right">Freq</th>
                            <th className="px-3 py-2 text-right">Fraction</th>
                            <th className="px-3 py-2 text-left">Ref</th>
                            <th className="px-3 py-2 text-left w-24">Usage</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/30">
                        {sortedCounts.map(c => {
                            const refVal = reference[c.codon] || 0;
                            const isRare = c.fractionOfAA < refVal * 0.3 && c.count > 0;
                            return (
                                <tr key={c.codon} className={`${isRare ? 'bg-red-900/10' : ''} hover:bg-gray-800/30`}>
                                    <td className="px-3 py-1.5 font-mono font-bold text-gray-200">{c.codon}</td>
                                    <td className="px-3 py-1.5 font-mono text-gray-400">{c.aa}</td>
                                    <td className="px-3 py-1.5 text-right font-mono text-gray-300">{c.count}</td>
                                    <td className="px-3 py-1.5 text-right font-mono text-gray-400">
                                        {(c.frequency * 1000).toFixed(1)}‰
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-mono text-gray-300">
                                        {(c.fractionOfAA * 100).toFixed(0)}%
                                    </td>
                                    <td className="px-3 py-1.5 font-mono text-gray-500">
                                        {(refVal * 100).toFixed(0)}%
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <div className="w-full bg-gray-800 rounded-full h-2 relative">
                                            <div
                                                className={`h-full rounded-full ${isRare ? 'bg-red-500' : 'bg-amber-500'}`}
                                                style={{ width: `${Math.min(100, c.fractionOfAA * 100)}%` }}
                                            />
                                            {refVal > 0 && (
                                                <div
                                                    className="absolute top-0 bottom-0 w-0.5 bg-white/50"
                                                    style={{ left: `${Math.min(100, refVal * 100)}%` }}
                                                />
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
