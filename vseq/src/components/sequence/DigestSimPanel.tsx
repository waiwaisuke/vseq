import { useState, useMemo } from 'react';
import { Scissors, Copy, Check } from 'lucide-react';
import { ENZYME_DB, findCutSites, groupSitesByEnzyme } from '../../lib/restrictionEnzymes';
import { simulateDigestion, getGelMigration, DNA_LADDER } from '../../lib/digestionSimulator';

interface DigestSimPanelProps {
    sequence: string;
    circular: boolean;
}

export const DigestSimPanel = ({ sequence, circular }: DigestSimPanelProps) => {
    const [selectedEnzymes, setSelectedEnzymes] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

    const allSites = useMemo(() => findCutSites(sequence, ENZYME_DB), [sequence]);
    const sitesByEnzyme = useMemo(() => groupSitesByEnzyme(allSites), [allSites]);

    // Enzymes that actually cut
    const cuttingEnzymes = useMemo(() =>
        ENZYME_DB.filter(e => (sitesByEnzyme.get(e.name)?.length || 0) > 0)
    , [sitesByEnzyme]);

    const filteredEnzymes = useMemo(() => {
        if (!searchQuery) return cuttingEnzymes;
        const q = searchQuery.toLowerCase();
        return cuttingEnzymes.filter(e =>
            e.name.toLowerCase().includes(q) || e.recognitionSeq.toLowerCase().includes(q)
        );
    }, [cuttingEnzymes, searchQuery]);

    // Get sites for selected enzymes
    const selectedSites = useMemo(() => {
        const sites = allSites.filter(s => selectedEnzymes.has(s.enzymeName));
        return sites;
    }, [allSites, selectedEnzymes]);

    // Simulate digestion
    const fragments = useMemo(() => {
        if (selectedEnzymes.size === 0) return [];
        return simulateDigestion(sequence, selectedSites, circular);
    }, [sequence, selectedSites, circular, selectedEnzymes]);

    const maxFragmentLength = useMemo(() =>
        Math.max(...fragments.map(f => f.length), sequence.length)
    , [fragments, sequence.length]);

    const toggleEnzyme = (name: string) => {
        setSelectedEnzymes(prev => {
            const next = new Set(prev);
            next.has(name) ? next.delete(name) : next.add(name);
            return next;
        });
    };

    const copyFragment = async (seq: string, idx: number) => {
        await navigator.clipboard.writeText(seq);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 1500);
    };

    return (
        <div className="flex flex-col h-full bg-gray-900">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-2 mb-1">
                    <Scissors size={16} className="text-orange-400" />
                    <h3 className="font-medium text-gray-200">Digestion Simulation</h3>
                </div>
                <div className="text-xs text-gray-400">
                    {selectedEnzymes.size} enzyme{selectedEnzymes.size !== 1 ? 's' : ''} selected
                    {fragments.length > 0 && ` • ${fragments.length} fragments`}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left: Enzyme selector */}
                <div className="w-52 border-r border-gray-800 flex flex-col">
                    <div className="p-2 border-b border-gray-800">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search enzymes..."
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredEnzymes.map(enzyme => {
                            const cutCount = sitesByEnzyme.get(enzyme.name)?.length || 0;
                            return (
                                <button
                                    key={enzyme.name}
                                    onClick={() => toggleEnzyme(enzyme.name)}
                                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between border-b border-gray-800/30 ${
                                        selectedEnzymes.has(enzyme.name)
                                            ? 'bg-orange-500/10 text-orange-300'
                                            : 'text-gray-300 hover:bg-gray-800'
                                    }`}
                                >
                                    <span className="font-medium">{enzyme.name}</span>
                                    <span className={`font-mono ${cutCount === 1 ? 'text-yellow-400' : 'text-gray-500'}`}>
                                        {cutCount}x
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    {selectedEnzymes.size > 0 && (
                        <div className="p-2 border-t border-gray-800">
                            <button
                                onClick={() => setSelectedEnzymes(new Set())}
                                className="text-xs text-red-400 hover:underline"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Results */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {fragments.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                            Select enzymes to simulate digestion
                        </div>
                    ) : (
                        <>
                            {/* Virtual Gel */}
                            <div className="p-4 border-b border-gray-800">
                                <div className="text-xs text-gray-500 mb-2">Virtual Gel Electrophoresis</div>
                                <div className="flex gap-4">
                                    {/* Ladder */}
                                    <div className="w-8 relative h-48 bg-gray-950 rounded border border-gray-700">
                                        <div className="absolute top-0 left-0 right-0 text-[8px] text-gray-500 text-center">M</div>
                                        {DNA_LADDER.map(size => {
                                            const pos = getGelMigration(size, maxFragmentLength);
                                            return (
                                                <div
                                                    key={size}
                                                    className="absolute left-0.5 right-0.5 flex items-center"
                                                    style={{ top: `${12 + pos * 85}%` }}
                                                >
                                                    <div className="w-full h-px bg-gray-500/50" />
                                                    <span className="absolute -right-8 text-[7px] text-gray-600 whitespace-nowrap">
                                                        {size >= 1000 ? `${size / 1000}k` : size}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Sample lane */}
                                    <div className="w-12 relative h-48 bg-gray-950 rounded border border-gray-700">
                                        <div className="absolute top-0 left-0 right-0 text-[8px] text-gray-500 text-center">S</div>
                                        {fragments.map((frag, i) => {
                                            const pos = getGelMigration(frag.length, maxFragmentLength);
                                            const intensity = Math.min(1, frag.length / 2000);
                                            return (
                                                <div
                                                    key={i}
                                                    className="absolute left-1 right-1 rounded-sm"
                                                    style={{
                                                        top: `${12 + pos * 85}%`,
                                                        height: `${Math.max(2, 4 - fragments.length * 0.3)}px`,
                                                        backgroundColor: `rgba(59, 235, 151, ${0.4 + intensity * 0.6})`,
                                                        boxShadow: `0 0 ${2 + intensity * 4}px rgba(59, 235, 151, ${0.2 + intensity * 0.3})`,
                                                    }}
                                                    title={`${frag.length} bp`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Fragment list */}
                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-800 text-gray-400 uppercase sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2">#</th>
                                            <th className="px-3 py-2">Size (bp)</th>
                                            <th className="px-3 py-2">Position</th>
                                            <th className="px-3 py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/50">
                                        {fragments.map((frag, i) => (
                                            <tr key={i} className="hover:bg-gray-800/50">
                                                <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                                                <td className="px-3 py-2 font-mono font-bold text-gray-200">
                                                    {frag.length.toLocaleString()}
                                                </td>
                                                <td className="px-3 py-2 font-mono text-gray-400">
                                                    {frag.start + 1}..{frag.start + frag.length}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <button
                                                        onClick={() => copyFragment(frag.sequence, i)}
                                                        className="text-gray-400 hover:text-gray-200"
                                                        title="Copy fragment sequence"
                                                    >
                                                        {copiedIdx === i ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
