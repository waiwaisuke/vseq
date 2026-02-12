import { useState, useMemo } from 'react';
import { Search, Scissors, Filter } from 'lucide-react';
import { ENZYME_DB, findCutSites, groupSitesByEnzyme } from '../../lib/restrictionEnzymes';
import type { CutSite } from '../../lib/restrictionEnzymes';

interface RestrictionEnzymePanelProps {
    sequence: string;
}

type CutFilter = 'all' | 'unique' | 'double' | 'none';

export const RestrictionEnzymePanel = ({ sequence }: RestrictionEnzymePanelProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [cutFilter, setCutFilter] = useState<CutFilter>('all');
    const [overhangFilter, setOverhangFilter] = useState<'all' | 'blunt' | '5prime' | '3prime'>('all');
    const [expandedEnzyme, setExpandedEnzyme] = useState<string | null>(null);

    // Find all cut sites
    const allSites = useMemo(() => findCutSites(sequence, ENZYME_DB), [sequence]);
    const sitesByEnzyme = useMemo(() => groupSitesByEnzyme(allSites), [allSites]);

    // Build display list: enzyme name -> cut count
    const enzymeList = useMemo(() => {
        const list = ENZYME_DB.map(enzyme => ({
            enzyme,
            sites: sitesByEnzyme.get(enzyme.name) || [],
            cutCount: sitesByEnzyme.get(enzyme.name)?.length || 0,
        }));

        return list.filter(item => {
            // Search filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!item.enzyme.name.toLowerCase().includes(q) &&
                    !item.enzyme.recognitionSeq.toLowerCase().includes(q)) {
                    return false;
                }
            }

            // Cut count filter
            if (cutFilter === 'unique' && item.cutCount !== 1) return false;
            if (cutFilter === 'double' && item.cutCount !== 2) return false;
            if (cutFilter === 'none' && item.cutCount !== 0) return false;

            // Overhang filter
            if (overhangFilter !== 'all' && item.enzyme.overhang !== overhangFilter) return false;

            return true;
        }).sort((a, b) => {
            // Sort by cut count (cutters first), then by name
            if (a.cutCount !== b.cutCount) return b.cutCount - a.cutCount;
            return a.enzyme.name.localeCompare(b.enzyme.name);
        });
    }, [sitesByEnzyme, searchQuery, cutFilter, overhangFilter]);

    const uniqueCutters = useMemo(() =>
        Array.from(sitesByEnzyme.entries()).filter(([, sites]) => sites.length === 1).length
    , [sitesByEnzyme]);

    const totalSites = allSites.length;

    const formatPosition = (site: CutSite) => {
        return `${site.position + 1}`;
    };

    return (
        <div className="flex flex-col h-full bg-gray-900">
            {/* Summary */}
            <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-2 mb-2">
                    <Scissors size={16} className="text-purple-400" />
                    <h3 className="font-medium text-gray-200">Restriction Enzymes</h3>
                </div>
                <div className="flex gap-4 text-xs text-gray-400">
                    <span>{ENZYME_DB.length} enzymes in database</span>
                    <span>{totalSites} total sites found</span>
                    <span className="text-yellow-400">{uniqueCutters} unique cutters</span>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="px-4 py-3 border-b border-gray-800 space-y-2">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search enzymes..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                        <Filter size={12} className="text-gray-500" />
                        <span className="text-xs text-gray-500">Cuts:</span>
                    </div>
                    {([
                        ['all', 'All'],
                        ['unique', 'Unique (1)'],
                        ['double', 'Double (2)'],
                        ['none', 'None (0)'],
                    ] as [CutFilter, string][]).map(([value, label]) => (
                        <button
                            key={value}
                            onClick={() => setCutFilter(value)}
                            className={`px-2 py-0.5 rounded text-xs transition-colors ${cutFilter === value
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Overhang:</span>
                    </div>
                    {([
                        ['all', 'All'],
                        ['5prime', "5' overhang"],
                        ['3prime', "3' overhang"],
                        ['blunt', 'Blunt'],
                    ] as ['all' | 'blunt' | '5prime' | '3prime', string][]).map(([value, label]) => (
                        <button
                            key={value}
                            onClick={() => setOverhangFilter(value)}
                            className={`px-2 py-0.5 rounded text-xs transition-colors ${overhangFilter === value
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results count */}
            <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-800">
                {enzymeList.length} enzymes shown
            </div>

            {/* Enzyme List */}
            <div className="flex-1 overflow-y-auto">
                {enzymeList.map(({ enzyme, sites, cutCount }) => (
                    <div key={enzyme.name} className="border-b border-gray-800/50">
                        <div
                            className="flex items-center px-4 py-2 hover:bg-gray-800/50 cursor-pointer"
                            onClick={() => setExpandedEnzyme(expandedEnzyme === enzyme.name ? null : enzyme.name)}
                        >
                            <div className="flex-1">
                                <span className="text-sm font-medium text-gray-200">{enzyme.name}</span>
                                <span className="text-xs text-gray-500 ml-2 font-mono">{enzyme.recognitionSeq}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${enzyme.overhang === 'blunt'
                                    ? 'bg-gray-700 text-gray-300'
                                    : enzyme.overhang === '5prime'
                                        ? 'bg-blue-900/50 text-blue-300'
                                        : 'bg-purple-900/50 text-purple-300'
                                    }`}>
                                    {enzyme.overhang === 'blunt' ? 'Blunt' : enzyme.overhang === '5prime' ? "5'" : "3'"}
                                </span>
                                <span className={`text-sm font-mono font-bold min-w-[2rem] text-center ${cutCount === 0
                                    ? 'text-gray-600'
                                    : cutCount === 1
                                        ? 'text-yellow-400'
                                        : 'text-gray-300'
                                    }`}>
                                    {cutCount}
                                </span>
                            </div>
                        </div>

                        {/* Expanded: show cut positions */}
                        {expandedEnzyme === enzyme.name && cutCount > 0 && (
                            <div className="px-4 pb-3 pt-1">
                                <div className="text-xs text-gray-400 mb-1">Cut positions:</div>
                                <div className="flex flex-wrap gap-1">
                                    {sites.map((site, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-0.5 bg-gray-800 rounded text-xs font-mono text-gray-300"
                                        >
                                            {formatPosition(site)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
