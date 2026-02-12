import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { Feature } from '../../types';

interface JumpToPositionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onJump: (position: number) => void;
    onSelectRange: (start: number, end: number) => void;
    sequenceLength: number;
    features: Feature[];
}

export const JumpToPositionDialog = ({
    isOpen,
    onClose,
    onJump,
    onSelectRange,
    sequenceLength,
    features,
}: JumpToPositionDialogProps) => {
    const [input, setInput] = useState('');
    const [error, setError] = useState('');
    const [suggestions, setSuggestions] = useState<Feature[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setInput('');
            setError('');
            setSuggestions([]);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const handleInputChange = (value: string) => {
        setInput(value);
        setError('');

        // Feature name suggestions
        if (value && !/^\d/.test(value)) {
            const q = value.toLowerCase();
            const matches = features.filter(f =>
                f.label?.toLowerCase().includes(q) ||
                f.type.toLowerCase().includes(q)
            ).slice(0, 5);
            setSuggestions(matches);
        } else {
            setSuggestions([]);
        }
    };

    const handleSubmit = () => {
        const trimmed = input.trim();
        if (!trimmed) return;

        // Range: "100..500" or "100-500"
        const rangeMatch = trimmed.match(/^(\d+)\s*[.]{2,}|-\s*(\d+)$/);
        if (rangeMatch) {
            const parts = trimmed.split(/[.]{2,}|-/);
            const start = parseInt(parts[0]);
            const end = parseInt(parts[1]);
            if (start >= 1 && end <= sequenceLength && start <= end) {
                onSelectRange(start - 1, end);
                onClose();
                return;
            }
            setError(`Range must be between 1 and ${sequenceLength}`);
            return;
        }

        // Single number
        const num = parseInt(trimmed);
        if (!isNaN(num)) {
            if (num >= 1 && num <= sequenceLength) {
                onJump(num - 1);
                onClose();
                return;
            }
            setError(`Position must be between 1 and ${sequenceLength}`);
            return;
        }

        // Feature name search
        const q = trimmed.toLowerCase();
        const match = features.find(f =>
            f.label?.toLowerCase() === q ||
            f.type.toLowerCase() === q
        );
        if (match) {
            onSelectRange(match.start - 1, match.end);
            onClose();
            return;
        }

        setError('Enter a position number, range (e.g. 100..500), or feature name');
    };

    const handleFeatureClick = (feature: Feature) => {
        onSelectRange(feature.start - 1, feature.end);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50" />
            <div
                className="relative bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-[420px] p-0 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                    <h3 className="text-sm font-medium text-gray-200">Jump to Position</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
                        <X size={16} />
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    <div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => handleInputChange(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleSubmit();
                                if (e.key === 'Escape') onClose();
                            }}
                            placeholder="Position (e.g. 1234), range (100..500), or feature name"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                        />
                        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
                        <p className="text-xs text-gray-500 mt-1">Sequence length: {sequenceLength.toLocaleString()} bp</p>
                    </div>

                    {suggestions.length > 0 && (
                        <div className="border border-gray-700 rounded-lg overflow-hidden">
                            <div className="text-xs text-gray-500 px-3 py-1.5 bg-gray-900/50">Matching features</div>
                            {suggestions.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => handleFeatureClick(f)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 flex items-center justify-between border-t border-gray-700/50"
                                >
                                    <span className="text-gray-200">{f.label || f.type}</span>
                                    <span className="text-xs text-gray-500 font-mono">{f.start}..{f.end}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 rounded-md hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Go
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
