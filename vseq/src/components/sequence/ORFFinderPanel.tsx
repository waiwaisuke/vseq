import { useState, useMemo } from 'react';
import { Search, Dna } from 'lucide-react';
import { findAllORFs } from '../../lib/orfFinder';
import type { ORF } from '../../lib/orfFinder';

interface ORFFinderPanelProps {
    sequence: string;
    onAddAsFeature?: (orf: ORF) => void;
}

const FRAME_COLORS: Record<number, string> = {
    1: 'text-green-400',
    2: 'text-emerald-400',
    3: 'text-teal-400',
    '-1': 'text-red-400',
    '-2': 'text-orange-400',
    '-3': 'text-rose-400',
};

export const ORFFinderPanel = ({ sequence, onAddAsFeature }: ORFFinderPanelProps) => {
    const [minAaLength, setMinAaLength] = useState(100);
    const [frameFilter, setFrameFilter] = useState<Set<number>>(new Set([1, 2, 3, -1, -2, -3]));
    const [searchQuery, setSearchQuery] = useState('');

    const allOrfs = useMemo(() => findAllORFs(sequence, minAaLength), [sequence, minAaLength]);

    const filteredOrfs = useMemo(() => {
        let result = allOrfs.filter(orf => frameFilter.has(orf.frame));
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(orf =>
                orf.id.toLowerCase().includes(q) ||
                `frame ${orf.frame}`.includes(q) ||
                `${orf.start + 1}`.includes(q) ||
                `${orf.end}`.includes(q)
            );
        }
        return result;
    }, [allOrfs, frameFilter, searchQuery]);

    const toggleFrame = (frame: number) => {
        setFrameFilter(prev => {
            const next = new Set(prev);
            next.has(frame) ? next.delete(frame) : next.add(frame);
            return next;
        });
    };

    // Group by frame for summary
    const summary = useMemo(() => {
        const counts: Record<number, number> = {};
        for (const orf of allOrfs) {
            counts[orf.frame] = (counts[orf.frame] || 0) + 1;
        }
        return counts;
    }, [allOrfs]);

    return (
        <div className="flex flex-col h-full bg-gray-900">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-2 mb-2">
                    <Dna size={16} className="text-cyan-400" />
                    <h3 className="font-medium text-gray-200">ORF Finder</h3>
                </div>
                <div className="flex gap-4 text-xs text-gray-400">
                    <span>{allOrfs.length} ORFs found</span>
                    <span>Min length: {minAaLength} aa</span>
                </div>
            </div>

            {/* Controls */}
            <div className="px-4 py-3 border-b border-gray-800 space-y-3">
                {/* Min length slider */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Minimum ORF length</span>
                        <span className="text-xs text-gray-200 font-mono">{minAaLength} aa ({minAaLength * 3} bp)</span>
                    </div>
                    <input
                        type="range"
                        min={10}
                        max={500}
                        step={10}
                        value={minAaLength}
                        onChange={(e) => setMinAaLength(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                        <span>10 aa</span>
                        <span>500 aa</span>
                    </div>
                </div>

                {/* Frame filter */}
                <div>
                    <div className="text-xs text-gray-400 mb-2">Frames</div>
                    <div className="flex gap-1.5">
                        {[1, 2, 3, -1, -2, -3].map(frame => (
                            <button
                                key={frame}
                                onClick={() => toggleFrame(frame)}
                                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${frameFilter.has(frame)
                                    ? `bg-gray-700 ${FRAME_COLORS[frame]} font-bold`
                                    : 'bg-gray-800/50 text-gray-600'
                                    }`}
                            >
                                {frame > 0 ? `+${frame}` : frame} ({summary[frame] || 0})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search ORFs..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Results count */}
            <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-800">
                {filteredOrfs.length} ORFs shown
            </div>

            {/* ORF List */}
            <div className="flex-1 overflow-y-auto">
                {filteredOrfs.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        No ORFs found with current settings.
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-800 text-gray-400 uppercase font-medium text-xs sticky top-0">
                            <tr>
                                <th className="px-4 py-2">Frame</th>
                                <th className="px-4 py-2">Start</th>
                                <th className="px-4 py-2">End</th>
                                <th className="px-4 py-2">Length</th>
                                <th className="px-4 py-2">AA</th>
                                {onAddAsFeature && <th className="px-4 py-2"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {filteredOrfs.map(orf => (
                                <tr key={orf.id} className="hover:bg-gray-800/50 transition-colors">
                                    <td className={`px-4 py-2 font-mono font-bold ${FRAME_COLORS[orf.frame]}`}>
                                        {orf.frame > 0 ? `+${orf.frame}` : orf.frame}
                                    </td>
                                    <td className="px-4 py-2 font-mono text-gray-300">{orf.start + 1}</td>
                                    <td className="px-4 py-2 font-mono text-gray-300">{orf.end}</td>
                                    <td className="px-4 py-2 font-mono text-gray-300">{orf.length} bp</td>
                                    <td className="px-4 py-2 font-mono text-gray-300">{orf.aaLength} aa</td>
                                    {onAddAsFeature && (
                                        <td className="px-4 py-2">
                                            <button
                                                onClick={() => onAddAsFeature(orf)}
                                                className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                                            >
                                                Add as CDS
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
