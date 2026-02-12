import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Filter } from 'lucide-react';
import type { SequenceData, Feature } from '../../types';

interface FeatureListProps {
    data: SequenceData;
    onFeatureClick?: (feature: Feature) => void;
}

type SortKey = 'type' | 'name' | 'start' | 'end' | 'strand' | 'length';
type SortDir = 'asc' | 'desc';

export const FeatureList = ({ data, onFeatureClick }: FeatureListProps) => {
    const { features } = data;

    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('start');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
    const [strandFilter, setStrandFilter] = useState<'all' | 'forward' | 'reverse'>('all');

    // Get unique feature types
    const featureTypes = useMemo(() => {
        const types = new Set<string>();
        features.forEach(f => types.add(f.type));
        return Array.from(types).sort();
    }, [features]);

    // Filter and sort
    const filteredFeatures = useMemo(() => {
        let result = [...features];

        // Text search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(f =>
                (f.label || '').toLowerCase().includes(q) ||
                f.name.toLowerCase().includes(q) ||
                f.type.toLowerCase().includes(q) ||
                (f.attributes?.note || '').toLowerCase().includes(q)
            );
        }

        // Type filter
        if (selectedTypes.size > 0) {
            result = result.filter(f => selectedTypes.has(f.type));
        }

        // Strand filter
        if (strandFilter === 'forward') {
            result = result.filter(f => f.strand === 1);
        } else if (strandFilter === 'reverse') {
            result = result.filter(f => f.strand === -1);
        }

        // Sort
        result.sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case 'type': cmp = a.type.localeCompare(b.type); break;
                case 'name': cmp = (a.label || a.name).localeCompare(b.label || b.name); break;
                case 'start': cmp = a.start - b.start; break;
                case 'end': cmp = a.end - b.end; break;
                case 'strand': cmp = a.strand - b.strand; break;
                case 'length': cmp = (a.end - a.start) - (b.end - b.start); break;
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [features, searchQuery, selectedTypes, strandFilter, sortKey, sortDir]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const toggleType = (type: string) => {
        setSelectedTypes(prev => {
            const next = new Set(prev);
            if (next.has(type)) {
                next.delete(type);
            } else {
                next.add(type);
            }
            return next;
        });
    };

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortKey !== column) return <span className="text-gray-600 ml-1"><ChevronUp size={12} /></span>;
        return sortDir === 'asc'
            ? <span className="text-blue-400 ml-1"><ChevronUp size={12} /></span>
            : <span className="text-blue-400 ml-1"><ChevronDown size={12} /></span>;
    };

    if (features.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                No features found.
            </div>
        );
    }

    const activeFilterCount = selectedTypes.size + (strandFilter !== 'all' ? 1 : 0);

    return (
        <div className="flex flex-col h-full">
            {/* Search & Filter Bar */}
            <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-3 bg-gray-900/50">
                <div className="relative flex-1 max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search features..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${showFilters || activeFilterCount > 0
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                        }`}
                >
                    <Filter size={14} />
                    <span>Filter</span>
                    {activeFilterCount > 0 && (
                        <span className="bg-white/20 rounded-full px-1.5 text-xs">{activeFilterCount}</span>
                    )}
                </button>
                <span className="text-xs text-gray-500">
                    {filteredFeatures.length} / {features.length}
                </span>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="px-4 py-3 border-b border-gray-800 bg-gray-850 space-y-3">
                    {/* Type Filter */}
                    <div>
                        <div className="text-xs text-gray-400 mb-2">Feature Type</div>
                        <div className="flex flex-wrap gap-1.5">
                            {featureTypes.map(type => (
                                <button
                                    key={type}
                                    onClick={() => toggleType(type)}
                                    className={`px-2.5 py-1 rounded-full text-xs transition-colors ${selectedTypes.has(type)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                            {selectedTypes.size > 0 && (
                                <button
                                    onClick={() => setSelectedTypes(new Set())}
                                    className="px-2.5 py-1 rounded-full text-xs text-red-400 hover:bg-gray-800"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Strand Filter */}
                    <div>
                        <div className="text-xs text-gray-400 mb-2">Strand</div>
                        <div className="flex gap-1.5">
                            {(['all', 'forward', 'reverse'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStrandFilter(s)}
                                    className={`px-2.5 py-1 rounded-full text-xs capitalize transition-colors ${strandFilter === s
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-auto flex-1 p-4">
                <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-800 text-gray-400 uppercase font-medium sticky top-0">
                        <tr>
                            <th className="px-4 py-3 rounded-tl-lg cursor-pointer select-none hover:text-gray-200" onClick={() => handleSort('type')}>
                                <span className="flex items-center">Type <SortIcon column="type" /></span>
                            </th>
                            <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-200" onClick={() => handleSort('name')}>
                                <span className="flex items-center">Name / Label <SortIcon column="name" /></span>
                            </th>
                            <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-200" onClick={() => handleSort('start')}>
                                <span className="flex items-center">Start <SortIcon column="start" /></span>
                            </th>
                            <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-200" onClick={() => handleSort('end')}>
                                <span className="flex items-center">End <SortIcon column="end" /></span>
                            </th>
                            <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-200" onClick={() => handleSort('strand')}>
                                <span className="flex items-center">Strand <SortIcon column="strand" /></span>
                            </th>
                            <th className="px-4 py-3 rounded-tr-lg cursor-pointer select-none hover:text-gray-200" onClick={() => handleSort('length')}>
                                <span className="flex items-center">Length <SortIcon column="length" /></span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {filteredFeatures.map((feature) => (
                            <tr
                                key={feature.id}
                                className="hover:bg-gray-800/50 transition-colors cursor-pointer"
                                onClick={() => onFeatureClick?.(feature)}
                            >
                                <td className="px-4 py-3 font-medium text-blue-400">{feature.type}</td>
                                <td className="px-4 py-3">{feature.label || feature.name}</td>
                                <td className="px-4 py-3 font-mono">{feature.start}</td>
                                <td className="px-4 py-3 font-mono">{feature.end}</td>
                                <td className="px-4 py-3">
                                    {feature.strand === 1 ? (
                                        <span className="text-green-400">Forward</span>
                                    ) : (
                                        <span className="text-red-400">Reverse</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 font-mono">{feature.end - feature.start + 1} bp</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredFeatures.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                        No features match the current filters.
                    </div>
                )}
            </div>
        </div>
    );
};
