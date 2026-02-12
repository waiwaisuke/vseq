import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const SHORTCUTS = [
    { category: 'Navigation', items: [
        { keys: ['Ctrl', 'G'], desc: 'Jump to position' },
        { keys: ['Ctrl', 'F'], desc: 'Search sequence' },
        { keys: ['Ctrl', 'A'], desc: 'Select all' },
        { keys: ['Tab'], desc: 'Cycle view mode' },
        { keys: ['Escape'], desc: 'Close dialog / Deselect' },
    ]},
    { category: 'Editing', items: [
        { keys: ['Ctrl', 'E'], desc: 'Toggle edit mode' },
        { keys: ['Ctrl', 'S'], desc: 'Save changes' },
        { keys: ['Ctrl', 'Z'], desc: 'Undo' },
        { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Redo' },
        { keys: ['Delete'], desc: 'Delete base at cursor' },
        { keys: ['Backspace'], desc: 'Delete base before cursor' },
        { keys: ['A/T/G/C'], desc: 'Insert base (edit mode)' },
    ]},
    { category: 'Clipboard', items: [
        { keys: ['Ctrl', 'C'], desc: 'Copy selection' },
        { keys: ['Ctrl', 'Shift', 'C'], desc: 'Copy reverse complement' },
    ]},
    { category: 'View', items: [
        { keys: ['?'], desc: 'Show this help' },
        { keys: ['R'], desc: 'Toggle reverse strand' },
    ]},
];

export const KeyboardShortcutsPanel = ({ isOpen, onClose }: KeyboardShortcutsPanelProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50" />
            <div
                className="relative bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-[520px] max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 sticky top-0 bg-gray-800">
                    <div className="flex items-center gap-2">
                        <Keyboard size={18} className="text-blue-400" />
                        <h3 className="font-medium text-gray-200">Keyboard Shortcuts</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
                        <X size={16} />
                    </button>
                </div>
                <div className="p-5 space-y-5">
                    {SHORTCUTS.map(group => (
                        <div key={group.category}>
                            <h4 className="text-xs text-gray-500 uppercase font-medium mb-2">{group.category}</h4>
                            <div className="space-y-1.5">
                                {group.items.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between py-1">
                                        <span className="text-sm text-gray-300">{item.desc}</span>
                                        <div className="flex items-center gap-1">
                                            {item.keys.map((key, j) => (
                                                <span key={j}>
                                                    {j > 0 && <span className="text-gray-600 mx-0.5">+</span>}
                                                    <kbd className="px-2 py-0.5 bg-gray-900 border border-gray-600 rounded text-xs font-mono text-gray-300 min-w-[1.5rem] text-center inline-block">
                                                        {key}
                                                    </kbd>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
