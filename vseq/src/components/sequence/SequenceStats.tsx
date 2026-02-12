import { useMemo } from 'react';
import type { SequenceData } from '../../types';

interface SequenceStatsProps {
    data: SequenceData;
    sequence: string;
    features: SequenceData['features'];
}

export const SequenceStats = ({ data, sequence, features }: SequenceStatsProps) => {
    const stats = useMemo(() => {
        const seq = sequence.toUpperCase();
        const len = seq.length;
        const counts = { A: 0, T: 0, G: 0, C: 0, N: 0, other: 0 };

        for (const base of seq) {
            if (base in counts) {
                counts[base as keyof typeof counts]++;
            } else {
                counts.other++;
            }
        }

        const gc = counts.G + counts.C;
        const gcContent = len > 0 ? (gc / len) * 100 : 0;

        // Approximate molecular weight (daltons)
        // Average MW of a nucleotide pair: ~649 Da for dsDNA, ~330 Da for ssDNA
        const mwSsDNA = len * 330;
        const mwDsDNA = len * 649;

        // Feature type breakdown
        const featureTypes: Record<string, number> = {};
        for (const f of features) {
            featureTypes[f.type] = (featureTypes[f.type] || 0) + 1;
        }

        return { len, counts, gcContent, mwSsDNA, mwDsDNA, featureTypes };
    }, [sequence, features]);

    const formatNumber = (n: number) => n.toLocaleString();

    return (
        <div className="h-full overflow-y-auto p-6 bg-gray-900">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-100">{data.name}</h2>
                    <p className="text-sm text-gray-400 mt-1">
                        {data.type.toUpperCase()} &bull; {data.circular ? 'Circular' : 'Linear'} &bull; {formatNumber(stats.len)} bp
                    </p>
                </div>

                {/* Sequence Length & GC Content */}
                <div className="grid grid-cols-2 gap-4">
                    <StatCard label="Length" value={`${formatNumber(stats.len)} bp`} />
                    <StatCard label="GC Content" value={`${stats.gcContent.toFixed(1)}%`} />
                </div>

                {/* GC Content Bar */}
                <div>
                    <div className="text-xs text-gray-400 mb-2">GC / AT Ratio</div>
                    <div className="h-4 rounded-full overflow-hidden bg-gray-800 flex">
                        <div
                            className="bg-blue-500 transition-all"
                            style={{ width: `${stats.gcContent}%` }}
                            title={`GC: ${stats.gcContent.toFixed(1)}%`}
                        />
                        <div
                            className="bg-orange-500 transition-all"
                            style={{ width: `${100 - stats.gcContent}%` }}
                            title={`AT: ${(100 - stats.gcContent).toFixed(1)}%`}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span className="text-blue-400">GC {stats.gcContent.toFixed(1)}%</span>
                        <span className="text-orange-400">AT {(100 - stats.gcContent).toFixed(1)}%</span>
                    </div>
                </div>

                {/* Base Composition */}
                <div>
                    <div className="text-xs text-gray-400 mb-3 uppercase tracking-wider">Base Composition</div>
                    <div className="grid grid-cols-5 gap-2">
                        {(['A', 'T', 'G', 'C', 'N'] as const).map(base => {
                            const count = stats.counts[base];
                            const pct = stats.len > 0 ? (count / stats.len) * 100 : 0;
                            return (
                                <div key={base} className="bg-gray-800 rounded-lg p-3 text-center">
                                    <div className={`text-xl font-bold font-mono ${baseColor(base)}`}>{base}</div>
                                    <div className="text-sm text-gray-200 mt-1">{formatNumber(count)}</div>
                                    <div className="text-xs text-gray-500">{pct.toFixed(1)}%</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Molecular Weight */}
                <div>
                    <div className="text-xs text-gray-400 mb-3 uppercase tracking-wider">Molecular Weight (approx.)</div>
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard label="ssDNA" value={`${(stats.mwSsDNA / 1000).toFixed(1)} kDa`} />
                        <StatCard label="dsDNA" value={`${(stats.mwDsDNA / 1000).toFixed(1)} kDa`} />
                    </div>
                </div>

                {/* Features Summary */}
                <div>
                    <div className="text-xs text-gray-400 mb-3 uppercase tracking-wider">
                        Features ({features.length} total)
                    </div>
                    {features.length > 0 ? (
                        <div className="bg-gray-800 rounded-lg divide-y divide-gray-700">
                            {Object.entries(stats.featureTypes)
                                .sort((a, b) => b[1] - a[1])
                                .map(([type, count]) => (
                                    <div key={type} className="flex justify-between items-center px-4 py-2">
                                        <span className="text-sm text-gray-300">{type}</span>
                                        <span className="text-sm text-gray-400 bg-gray-700 rounded-full px-2 py-0.5 min-w-[1.5rem] text-center">
                                            {count}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">No features annotated</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
    <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-lg font-semibold text-gray-100 mt-1">{value}</div>
    </div>
);

const baseColor = (base: string) => {
    switch (base) {
        case 'A': return 'text-green-400';
        case 'T': return 'text-red-400';
        case 'G': return 'text-yellow-400';
        case 'C': return 'text-blue-400';
        default: return 'text-gray-400';
    }
};
