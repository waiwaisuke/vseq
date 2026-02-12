import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { getReverseComplement } from '../../lib/dnaTranslation';

interface SequenceOperationsMenuProps {
    sequence: string;
    selectionStart: number | null;
    selectionEnd: number | null;
    hasSelection: boolean;
    onReplaceSequence: (newSeq: string) => void;
    onReplaceSelection: (start: number, end: number, replacement: string) => void;
}

function reverseString(s: string): string {
    return s.split('').reverse().join('');
}

function complementBase(base: string): string {
    const map: Record<string, string> = {
        'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G',
        'a': 't', 't': 'a', 'g': 'c', 'c': 'g',
        'R': 'Y', 'Y': 'R', 'M': 'K', 'K': 'M',
        'S': 'S', 'W': 'W', 'H': 'D', 'D': 'H',
        'B': 'V', 'V': 'B', 'N': 'N',
        'r': 'y', 'y': 'r', 'm': 'k', 'k': 'm',
        's': 's', 'w': 'w', 'h': 'd', 'd': 'h',
        'b': 'v', 'v': 'b', 'n': 'n',
    };
    return map[base] || base;
}

function complementString(s: string): string {
    return s.split('').map(complementBase).join('');
}

export const SequenceOperationsMenu = ({
    sequence,
    selectionStart,
    selectionEnd,
    hasSelection,
    onReplaceSequence,
    onReplaceSelection,
}: SequenceOperationsMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const getTargetSeq = (): string => {
        if (hasSelection && selectionStart !== null && selectionEnd !== null) {
            const s = Math.min(selectionStart, selectionEnd);
            const e = Math.max(selectionStart, selectionEnd);
            return sequence.slice(s, e);
        }
        return sequence;
    };

    const applyOperation = (op: (seq: string) => string) => {
        if (hasSelection && selectionStart !== null && selectionEnd !== null) {
            const s = Math.min(selectionStart, selectionEnd);
            const e = Math.max(selectionStart, selectionEnd);
            const target = sequence.slice(s, e);
            onReplaceSelection(s, e, op(target));
        } else {
            onReplaceSequence(op(sequence));
        }
        setIsOpen(false);
    };

    const target = hasSelection ? 'Selection' : 'Sequence';

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${isOpen
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                    }`}
                title="Sequence Operations"
            >
                <Wand2 size={16} />
                <span>Transform</span>
            </button>
            {isOpen && (
                <div className="absolute top-10 right-0 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 min-w-[220px]">
                    <div className="px-3 py-1.5 text-xs text-gray-500 uppercase">
                        {target} Operations
                    </div>
                    <button
                        onClick={() => applyOperation(reverseString)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                    >
                        Reverse
                    </button>
                    <button
                        onClick={() => applyOperation(complementString)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                    >
                        Complement
                    </button>
                    <button
                        onClick={() => applyOperation(s => getReverseComplement(s))}
                        className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                    >
                        Reverse Complement
                    </button>
                    <div className="border-t border-gray-700 my-1" />
                    <button
                        onClick={() => applyOperation(s => s.toUpperCase())}
                        className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                    >
                        UPPERCASE
                    </button>
                    <button
                        onClick={() => applyOperation(s => s.toLowerCase())}
                        className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                    >
                        lowercase
                    </button>
                </div>
            )}
        </div>
    );
};
