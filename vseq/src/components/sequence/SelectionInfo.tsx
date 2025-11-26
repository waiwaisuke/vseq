import { useState } from 'react';
import { calculateTm, calculateGCContent } from '../../lib/tmCalculator';
import { translateDNA, getReverseComplement } from '../../lib/dnaTranslation';
import { Check, Dna, ArrowRightLeft, FileText } from 'lucide-react';

interface SelectionInfoProps {
    selectionStart: number;
    selectionEnd: number;
    sequence: string;
    direction: 'forward' | 'reverse';
}

export const SelectionInfo = ({ selectionStart, selectionEnd, sequence, direction }: SelectionInfoProps) => {
    const [copiedType, setCopiedType] = useState<string | null>(null);

    const selectedSeq = sequence.slice(selectionStart, selectionEnd);

    // If selection is reverse (right-to-left), show reverse complement
    const displaySeq = direction === 'reverse' ? getReverseComplement(selectedSeq) : selectedSeq;

    const length = selectionEnd - selectionStart;
    const gcContent = calculateGCContent(displaySeq);
    const tm = calculateTm(displaySeq);

    // Convert to 1-indexed for display
    const displayStart = selectionStart + 1;
    const displayEnd = selectionEnd;

    const handleCopy = async (text: string, type: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedType(type);
            setTimeout(() => setCopiedType(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="flex items-center gap-4 px-4 py-2 bg-blue-900/30 border border-blue-500/30 rounded-lg text-sm">
            <div className="flex items-center gap-2">
                <span className="text-gray-400">Selection:</span>
                <span className="font-mono text-blue-300 font-semibold">
                    {displayStart}-{displayEnd}
                </span>
                <span className="text-gray-500">({length} bp)</span>
                {direction === 'reverse' && (
                    <span className="text-purple-400 text-xs ml-2">(Reverse)</span>
                )}
            </div>

            <div className="h-4 w-px bg-gray-700" />

            <div className="flex items-center gap-2">
                <span className="text-gray-400">GC:</span>
                <span className="font-mono text-green-300">{gcContent.toFixed(1)}%</span>
            </div>

            {tm !== null && (
                <>
                    <div className="h-4 w-px bg-gray-700" />
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400">Tm:</span>
                        <span className="font-mono text-orange-300 font-semibold">{tm.toFixed(1)}°C</span>
                    </div>
                </>
            )}

            <div className="h-4 w-px bg-gray-700" />

            <div className="flex items-center gap-1">
                <button
                    onClick={() => handleCopy(displaySeq, 'seq')}
                    className="p-1.5 hover:bg-blue-500/20 rounded text-gray-300 hover:text-white transition-colors relative group flex items-center gap-1"
                    title="Copy Sequence"
                >
                    {copiedType === 'seq' ? <Check size={14} className="text-green-400" /> : <Dna size={14} />}
                    <span className="text-xs">Seq</span>
                </button>

                <button
                    onClick={() => handleCopy(getReverseComplement(displaySeq), 'rev')}
                    className="p-1.5 hover:bg-blue-500/20 rounded text-gray-300 hover:text-white transition-colors relative group flex items-center gap-1"
                    title="Copy Reverse Complement"
                >
                    {copiedType === 'rev' ? <Check size={14} className="text-green-400" /> : <ArrowRightLeft size={14} />}
                    <span className="text-xs">Rev</span>
                </button>

                <button
                    onClick={() => handleCopy(translateDNA(displaySeq), 'aa')}
                    className="p-1.5 hover:bg-blue-500/20 rounded text-gray-300 hover:text-white transition-colors relative group flex items-center gap-1"
                    title="Copy Amino Acid Sequence"
                >
                    {copiedType === 'aa' ? <Check size={14} className="text-green-400" /> : <FileText size={14} />}
                    <span className="text-xs">AA</span>
                </button>
            </div>
        </div>
    );
};
