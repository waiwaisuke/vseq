import { useEffect, useRef } from 'react';
import type { SequenceData } from '../../types';
import { getFeatureColor } from '../../lib/featureUtils';

interface LinearViewProps {
    data: SequenceData;
    zoomLevel?: number;
    editable?: boolean;
    cursorPosition?: number;
    selectionStart?: number | null;
    selectionEnd?: number | null;
    onCursorMove?: (position: number) => void;
    setSelection?: (start: number, end: number) => void;
    clearSelection?: () => void;
    onInsertBase?: (base: string) => void;
    onDeleteBase?: () => void;
    onBackspace?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
}

export const LinearView = ({
    data,
    zoomLevel = 1.0,
    editable = false,
    cursorPosition = 0,
    selectionStart = null,
    selectionEnd = null,
    onCursorMove,
    setSelection,
    clearSelection,
    onInsertBase,
    onDeleteBase,
    onBackspace,
    onUndo,
    onRedo
}: LinearViewProps) => {
    const { sequence, features } = data;
    const chunkSize = 50; // Bases per row
    const chunks = [];
    const containerRef = useRef<HTMLDivElement>(null);
    const hasSelection = selectionStart !== null && selectionEnd !== null;


    for (let i = 0; i < sequence.length; i += chunkSize) {
        chunks.push({
            index: i,
            seq: sequence.slice(i, i + chunkSize),
        });
    }

    // Apply zoom to font size
    const scaledFontSize = 0.75 * zoomLevel;
    const scaledLineHeight = 1.5 * zoomLevel;

    // Keyboard event handler for editing and selection
    useEffect(() => {
        if (!containerRef.current) return;
        // Allow selection in both edit and view modes
        const selectionEnabled = true;

        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toUpperCase();

            // Select All (Cmd+A / Ctrl+A)
            if ((e.metaKey || e.ctrlKey) && key === 'A' && !e.shiftKey) {
                e.preventDefault();
                setSelection?.(0, sequence.length);
                return;
            }

            // Undo/Redo shortcuts
            if ((e.metaKey || e.ctrlKey) && key === 'Z' && !e.shiftKey) {
                e.preventDefault();
                onUndo?.();
                return;
            }

            // Redo shortcut (Cmd+Shift+Z or Ctrl+Shift+Z or Ctrl+Y)
            if ((e.metaKey || e.ctrlKey) && (e.shiftKey && key === 'Z' || key === 'Y')) {
                e.preventDefault();
                onRedo?.();
                return;
            }

            // Arrow key navigation with Shift for selection
            if (key === 'ARROWLEFT') {
                e.preventDefault();
                const newPos = Math.max(0, cursorPosition - 1);
                if (e.shiftKey) {
                    // Extend selection
                    const anchorPos = selectionStart !== null && selectionEnd !== null
                        ? (cursorPosition === selectionEnd ? selectionStart : selectionEnd)
                        : cursorPosition;
                    setSelection?.(anchorPos, newPos);
                } else {
                    // Clear selection and move cursor
                    clearSelection?.();
                    onCursorMove?.(newPos);
                }
                return;
            }

            if (key === 'ARROWRIGHT') {
                e.preventDefault();
                const newPos = Math.min(sequence.length, cursorPosition + 1);
                if (e.shiftKey) {
                    // Extend selection
                    const anchorPos = selectionStart !== null && selectionEnd !== null
                        ? (cursorPosition === selectionEnd ? selectionStart : selectionEnd)
                        : cursorPosition;
                    setSelection?.(anchorPos, newPos);
                } else {
                    // Clear selection and move cursor
                    clearSelection?.();
                    onCursorMove?.(newPos);
                }
                return;
            }

            if (['A', 'T', 'G', 'C', 'N'].includes(key)) {
                e.preventDefault();
                onInsertBase?.(key);
            } else if (key === 'DELETE') {
                e.preventDefault();
                onDeleteBase?.();
            } else if (key === 'BACKSPACE') {
                e.preventDefault();
                onBackspace?.();
            }
        };

        const container = containerRef.current;
        container.tabIndex = 0; // Make div focusable
        container.focus();
        container.addEventListener('keydown', handleKeyDown);

        return () => {
            container.removeEventListener('keydown', handleKeyDown);
        };
    }, [editable, cursorPosition, sequence.length, onInsertBase, onDeleteBase, onBackspace, onCursorMove]);

    return (
        <div
            ref={containerRef}
            className="font-mono text-sm overflow-auto h-full p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded"
            style={{ fontSize: `${scaledFontSize}rem`, lineHeight: `${scaledLineHeight}rem` }}
        >
            {chunks.map((chunk) => (
                <div key={chunk.index} className="mb-8 relative">
                    {/* Sequence Row */}
                    <div className="flex hover:bg-gray-800/50 rounded px-2 py-1">
                        <div className="w-16 text-gray-500 select-none text-right mr-4 pt-0.5">
                            {chunk.index + 1}
                        </div>
                        <div className="flex-1 flex relative">
                            {chunk.seq.split('').map((base, i) => {
                                const globalPosition = chunk.index + i;
                                const showCursorBefore = editable && !hasSelection && cursorPosition === globalPosition;
                                const isSelected = selectionStart !== null && selectionEnd !== null &&
                                    globalPosition >= selectionStart && globalPosition < selectionEnd;

                                const handleClick = (e: React.MouseEvent) => {
                                    if (!editable) return;

                                    if (e.shiftKey && onCursorMove && setSelection) {
                                        // Shift+click: extend selection from cursor to clicked position
                                        e.preventDefault();
                                        setSelection(cursorPosition, globalPosition);
                                    } else {
                                        // Normal click: set cursor and clear selection
                                        clearSelection?.();
                                        onCursorMove?.(globalPosition);
                                    }
                                };

                                const handleDoubleClick = (e: React.MouseEvent) => {
                                    if (!editable || !setSelection) return;
                                    e.preventDefault();

                                    // Find all consecutive same bases
                                    const clickedBase = base.toUpperCase();
                                    let start = globalPosition;
                                    let end = globalPosition + 1;

                                    // Expand left
                                    while (start > 0 && sequence[start - 1]?.toUpperCase() === clickedBase) {
                                        start--;
                                    }

                                    // Expand right
                                    while (end < sequence.length && sequence[end]?.toUpperCase() === clickedBase) {
                                        end++;
                                    }

                                    setSelection(start, end);
                                };

                                return (
                                    <div key={i} className="relative flex items-center">
                                        {showCursorBefore && (
                                            <div className="absolute -left-0.5 w-0.5 h-4 bg-blue-500 animate-pulse" />
                                        )}
                                        <div
                                            className={`w-4 text-center ${isSelected
                                                ? 'bg-blue-500/30 text-white'
                                                : 'text-gray-300'
                                                } ${editable ? 'cursor-pointer hover:bg-gray-700' : 'select-none'}`}
                                            onClick={handleClick}
                                            onDoubleClick={handleDoubleClick}
                                        >
                                            {base}
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Cursor at the end of the chunk */}
                            {editable && !hasSelection && cursorPosition === chunk.index + chunk.seq.length && (
                                <div className="relative flex items-center">
                                    <div className="absolute -left-0.5 w-0.5 h-4 bg-blue-500 animate-pulse" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Feature Tracks */}
                    <div className="flex px-2 mt-1">
                        <div className="w-16 mr-4"></div>
                        <div className="flex-1 relative min-h-[20px]">
                            {features.map(feature => {
                                // Check overlap
                                const featureStart = feature.start - 1; // 0-based
                                const featureEnd = feature.end; // 0-based exclusive (or inclusive in 1-based)

                                const chunkStart = chunk.index;
                                const chunkEnd = chunk.index + chunkSize;

                                if (featureEnd <= chunkStart || featureStart >= chunkEnd) return null;

                                const startInChunk = Math.max(featureStart, chunkStart);
                                const endInChunk = Math.min(featureEnd, chunkEnd);

                                const offset = startInChunk - chunkStart;
                                const length = endInChunk - startInChunk;

                                // Use fixed pixel width (w-4 = 1rem = 16px by default in Tailwind)
                                const left = (offset * 16) + 'px';
                                const width = (length * 16) + 'px';

                                const isForward = feature.strand !== -1;
                                const colors = getFeatureColor(feature.type);

                                // Arrow logic
                                const isFeatureStart = startInChunk === featureStart;
                                const isFeatureEnd = endInChunk === featureEnd;

                                let clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'; // Default rectangle

                                if (isForward) {
                                    if (isFeatureEnd) {
                                        // Arrow on right
                                        clipPath = 'polygon(0% 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 0% 100%)';
                                    }
                                } else {
                                    if (isFeatureStart) {
                                        // Arrow on left
                                        clipPath = 'polygon(8px 0%, 100% 0%, 100% 100%, 8px 100%, 0% 50%)';
                                    }
                                }

                                // If it's both start and end (short feature fully in chunk), combine?
                                if (isForward && isFeatureEnd && isFeatureStart) {
                                    clipPath = 'polygon(0% 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 0% 100%)';
                                } else if (!isForward && isFeatureStart && isFeatureEnd) {
                                    clipPath = 'polygon(8px 0%, 100% 0%, 100% 100%, 8px 100%, 0% 50%)';
                                }
                                // Note: Double arrow (pointed both ends) isn't standard for single feature, 
                                // but if we wanted to show "cut off" vs "end", the flat side implies continuation.

                                return (
                                    <div
                                        key={feature.id}
                                        className={`absolute h-4 top-0 ${colors.bg} ${colors.text} border-b-2 ${colors.border} text-[10px] flex items-center px-1 overflow-hidden whitespace-nowrap`}
                                        style={{ left, width, clipPath }}
                                        title={`${feature.label || feature.type} (${feature.start}..${feature.end})`}
                                    >
                                        {/* Only show label if the feature starts in this chunk or if it's long and we are at the start of the chunk */}
                                        {(featureStart >= chunkStart || offset === 0) && (
                                            <span className={`drop-shadow-md ml-${!isForward && isFeatureStart ? '2' : '0'}`}>
                                                {feature.label || feature.name}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
