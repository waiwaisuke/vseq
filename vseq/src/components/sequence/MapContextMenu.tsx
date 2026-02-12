import { useEffect, useRef } from 'react';
import type { Feature } from '../../types';

export interface MapContextMenuProps {
    x: number;
    y: number;
    position: number; // bp position
    feature?: Feature;
    onClose: () => void;
    onNavigateToSequence?: (position: number) => void;
    onFeatureClick?: (feature: Feature) => void;
    onSelectRange?: (start: number, end: number) => void;
}

export const MapContextMenu = ({
    x,
    y,
    position,
    feature,
    onClose,
    onNavigateToSequence,
    onFeatureClick,
    onSelectRange,
}: MapContextMenuProps) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Adjust position to stay within viewport
    const adjustedStyle: React.CSSProperties = {
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 100,
    };

    const handleCopyPosition = () => {
        navigator.clipboard.writeText(String(position));
        onClose();
    };

    return (
        <div
            ref={menuRef}
            style={adjustedStyle}
            className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[200px] text-sm"
        >
            <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-700">
                Position: {position} bp
            </div>

            {onNavigateToSequence && (
                <button
                    onClick={() => { onNavigateToSequence(position); onClose(); }}
                    className="w-full text-left px-3 py-1.5 text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                >
                    <span className="text-blue-400">↗</span>
                    Go to Seq View at this position
                </button>
            )}

            {feature && onFeatureClick && (
                <>
                    <div className="border-t border-gray-700 my-0.5" />
                    <div className="px-3 py-1 text-xs text-gray-500">
                        Feature: {feature.name || feature.type}
                    </div>
                    <button
                        onClick={() => { onFeatureClick(feature); onClose(); }}
                        className="w-full text-left px-3 py-1.5 text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                    >
                        <span className="text-purple-400">✎</span>
                        Edit Feature
                    </button>
                </>
            )}

            {feature && onSelectRange && (
                <button
                    onClick={() => { onSelectRange(feature.start, feature.end); onClose(); }}
                    className="w-full text-left px-3 py-1.5 text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                >
                    <span className="text-green-400">▬</span>
                    Select Feature Range
                </button>
            )}

            <div className="border-t border-gray-700 my-0.5" />
            <button
                onClick={handleCopyPosition}
                className="w-full text-left px-3 py-1.5 text-gray-200 hover:bg-gray-700 flex items-center gap-2"
            >
                <span className="text-gray-400">📋</span>
                Copy Position
            </button>
        </div>
    );
};
