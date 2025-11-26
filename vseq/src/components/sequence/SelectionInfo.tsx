import { calculateTm, calculateGCContent } from '../../lib/tmCalculator';

interface SelectionInfoProps {
    selectionStart: number;
    selectionEnd: number;
    sequence: string;
}

export const SelectionInfo = ({ selectionStart, selectionEnd, sequence }: SelectionInfoProps) => {
    const selectedSeq = sequence.slice(selectionStart, selectionEnd);
    const length = selectionEnd - selectionStart;
    const gcContent = calculateGCContent(selectedSeq);
    const tm = calculateTm(selectedSeq);

    // Convert to 1-indexed for display
    const displayStart = selectionStart + 1;
    const displayEnd = selectionEnd;

    return (
        <div className="flex items-center gap-4 px-4 py-2 bg-blue-900/30 border border-blue-500/30 rounded-lg text-sm">
            <div className="flex items-center gap-2">
                <span className="text-gray-400">Selection:</span>
                <span className="font-mono text-blue-300 font-semibold">
                    {displayStart}-{displayEnd}
                </span>
                <span className="text-gray-500">({length} bp)</span>
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

            {length > 0 && length <= 50 && (
                <>
                    <div className="h-4 w-px bg-gray-700" />
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400">Seq:</span>
                        <span className="font-mono text-gray-300 text-xs uppercase">{selectedSeq}</span>
                    </div>
                </>
            )}
        </div>
    );
};
