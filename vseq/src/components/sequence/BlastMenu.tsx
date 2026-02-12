import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface BlastMenuProps {
    sequence: string;
    selectionStart: number | null;
    selectionEnd: number | null;
    hasSelection: boolean;
}

export const BlastMenu = ({ sequence, selectionStart, selectionEnd, hasSelection }: BlastMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const getTargetSequence = (): string => {
        if (hasSelection && selectionStart !== null && selectionEnd !== null) {
            const s = Math.min(selectionStart, selectionEnd);
            const e = Math.max(selectionStart, selectionEnd);
            return sequence.slice(s, e);
        }
        return sequence;
    };

    const openBlast = (program: 'blastn' | 'blastx') => {
        const seq = getTargetSequence();
        // NCBI BLAST URL with query parameter
        const url = new URL('https://blast.ncbi.nlm.nih.gov/Blast.cgi');
        url.searchParams.set('PROGRAM', program);
        url.searchParams.set('PAGE_TYPE', program === 'blastn' ? 'BlastSearch' : 'BlastSearch');
        url.searchParams.set('DATABASE', program === 'blastn' ? 'nt' : 'nr');
        url.searchParams.set('QUERY', seq);
        window.open(url.toString(), '_blank');
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${isOpen
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                    }`}
                title="NCBI BLAST"
            >
                <ExternalLink size={16} />
                <span>BLAST</span>
            </button>
            {isOpen && (
                <div className="absolute top-10 right-0 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 min-w-[220px]">
                    <div className="px-3 py-1.5 text-xs text-gray-500 uppercase">
                        Search {hasSelection ? 'Selection' : 'Sequence'} ({getTargetSequence().length} bp)
                    </div>
                    <button
                        onClick={() => openBlast('blastn')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                    >
                        <span className="font-mono text-xs bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">blastn</span>
                        Nucleotide BLAST
                    </button>
                    <button
                        onClick={() => openBlast('blastx')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                    >
                        <span className="font-mono text-xs bg-green-900/50 text-green-300 px-1.5 py-0.5 rounded">blastx</span>
                        Translated BLAST
                    </button>
                </div>
            )}
        </div>
    );
};
