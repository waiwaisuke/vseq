import { useEffect, useRef } from 'react';
import type { SequenceData, Feature } from '../../types';
import { getFeatureColor } from '../../lib/featureUtils';
import { translateDNA } from '../../lib/dnaTranslation';

interface LinearViewProps {
    data: SequenceData;
    zoomLevel?: number;
    editable?: boolean;
    cursorPosition?: number;
    selectionStart?: number | null;
    selectionEnd?: number | null;
    onCursorMove?: (position: number) => void;
    setSelection?: (start: number, end: number, direction?: 'forward' | 'reverse') => void;
    clearSelection?: () => void;
    onInsertBase?: (base: string) => void;
    onDeleteBase?: () => void;
    onBackspace?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    showReverseStrand?: boolean;
    onFeatureClick?: (feature: Feature) => void;
    selectionDirection?: 'forward' | 'reverse';
    searchResults?: { start: number; end: number }[];
    currentMatchIndex?: number;
}

const getComplementBase = (base: string): string => {
    const map: Record<string, string> = {
        'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G',
        'a': 't', 't': 'a', 'g': 'c', 'c': 'g',
        'N': 'N', 'n': 'n'
    };
    return map[base] || base;
};

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
    onRedo,
    showReverseStrand = false,
    onFeatureClick,
    selectionDirection = 'forward',
    searchResults = [],
    currentMatchIndex = -1
}: LinearViewProps) => {
    const { sequence, features } = data;
    const chunkSize = 50; // Bases per row
    const chunks = [];
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStartPos = useRef<number | null>(null);
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
        // Allow selection in both edit and view modes

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
                if (editable) onInsertBase?.(key);
            } else if (key === 'DELETE') {
                e.preventDefault();
                if (editable) onDeleteBase?.();
            } else if (key === 'BACKSPACE') {
                e.preventDefault();
                if (editable) onBackspace?.();
            }
        };

        const container = containerRef.current;
        // Only focus if we're not already focused on an input
        if (document.activeElement === document.body) {
            // Don't auto-focus aggressively, let user click to focus
            // container.focus();
        }

        container.addEventListener('keydown', handleKeyDown);

        return () => {
            container.removeEventListener('keydown', handleKeyDown);
        };
    }, [editable, cursorPosition, sequence.length, onInsertBase, onDeleteBase, onBackspace, onCursorMove, setSelection, clearSelection, onUndo, onRedo]);

    // Global mouse up handler to stop dragging
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            isDragging.current = false;
            dragStartPos.current = null;
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    // Auto-scroll to current match
    useEffect(() => {
        if (currentMatchIndex !== -1 && searchResults.length > 0) {
            const match = searchResults[currentMatchIndex];
            // Find the chunk containing the match start
            const chunkIndex = Math.floor(match.start / chunkSize) * chunkSize;
            const rowElement = document.getElementById(`row-${chunkIndex}`);

            if (rowElement) {
                rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [currentMatchIndex, searchResults, chunkSize]);

    return (
        <div
            ref={containerRef}
            className="font-mono text-sm overflow-auto h-full p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded"
            style={{ fontSize: `${scaledFontSize}rem`, lineHeight: `${scaledLineHeight}rem` }}
        >
            {chunks.map((chunk) => (
                <div key={chunk.index} id={`row-${chunk.index}`} className="mb-8 relative">
                    {/* Sequence Row */}
                    <div className="flex hover:bg-gray-800/50 rounded px-2 py-1">
                        <div className="w-16 text-gray-500 select-none text-right mr-4 pt-0.5">
                            {chunk.index + 1}
                        </div>
                        <div className="flex-1 flex relative">
                            {chunk.seq.split('').map((base, i) => {
                                const globalPosition = chunk.index + i;
                                // Show cursor in both edit and view modes if no selection
                                const showCursorBefore = !hasSelection && cursorPosition === globalPosition;
                                const isSelected = selectionStart !== null && selectionEnd !== null &&
                                    globalPosition >= selectionStart && globalPosition < selectionEnd;

                                // Check if this base is part of any search result
                                let isMatch = false;
                                let isCurrentMatch = false;

                                if (searchResults.length > 0) {
                                    const matchIndex = searchResults.findIndex(result =>
                                        globalPosition >= result.start && globalPosition < result.end
                                    );

                                    if (matchIndex !== -1) {
                                        isMatch = true;
                                        if (matchIndex === currentMatchIndex) {
                                            isCurrentMatch = true;
                                        }
                                    }
                                }

                                const handleDoubleClick = (e: React.MouseEvent) => {
                                    if (!setSelection) return;
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

                                const handleMouseDown = (e: React.MouseEvent) => {
                                    if (!setSelection) return;
                                    // Only left click
                                    if (e.button !== 0) return;

                                    // Handle Shift+click for range selection
                                    if (e.shiftKey && selectionStart !== null) {
                                        // Extend selection from current selectionStart to clicked position
                                        const start = Math.min(selectionStart, globalPosition);
                                        const end = Math.max(selectionStart, globalPosition) + 1;
                                        const direction = globalPosition < selectionStart ? 'reverse' : 'forward';
                                        setSelection(start, end, direction);
                                        return; // Don't start dragging
                                    }

                                    isDragging.current = true;
                                    dragStartPos.current = globalPosition;

                                    // Start selection at clicked position (length 1 initially, forward direction)
                                    setSelection(globalPosition, globalPosition + 1, 'forward');
                                    onCursorMove?.(globalPosition + 1);
                                };

                                const handleMouseEnter = () => {
                                    if (isDragging.current && dragStartPos.current !== null && setSelection) {
                                        const start = Math.min(dragStartPos.current, globalPosition);
                                        const end = Math.max(dragStartPos.current, globalPosition) + 1;

                                        // Determine direction: if we're dragging left (current < start), it's reverse
                                        const direction = globalPosition < dragStartPos.current ? 'reverse' : 'forward';

                                        setSelection(start, end, direction);
                                        onCursorMove?.(end);
                                    }
                                };

                                return (
                                    <div key={i} className="relative flex flex-col items-center group">
                                        <div className="relative flex items-center">
                                            {showCursorBefore && (
                                                <div className="absolute -left-0.5 w-0.5 h-4 bg-blue-500 animate-pulse z-10" />
                                            )}
                                            <div
                                                className={`w-4 text-center ${isCurrentMatch
                                                    ? 'bg-orange-500 text-white font-bold'
                                                    : isMatch
                                                        ? 'bg-yellow-500/50 text-white'
                                                        : isSelected
                                                            ? 'bg-blue-500/30 text-white'
                                                            : 'text-gray-300'
                                                    } cursor-pointer hover:bg-gray-700 select-none transition-colors duration-75`}
                                                onMouseDown={handleMouseDown}
                                                onMouseEnter={handleMouseEnter}
                                                onDoubleClick={handleDoubleClick}
                                            // Keep onClick for simple cursor positioning if not dragging (handled by mouseup/down logic usually, but let's keep it simple)
                                            // Actually, mousedown handles the start of selection/cursor.
                                            // We can remove onClick and rely on mousedown for initial click.
                                            // But we need to handle simple click vs drag.
                                            // If we just click, it selects 1 char.
                                            // If we want just cursor, we might need to handle mouseup without move.
                                            // Let's refine: mousedown starts selection. If we just click, it selects 1 char.
                                            // To just place cursor, maybe we check if drag distance is 0 on mouseup?
                                            // Or maybe standard behavior is: mousedown places cursor. Drag extends selection.
                                            // So mousedown should clear selection and set cursor.
                                            >
                                                {base}
                                            </div>
                                        </div>

                                        {/* Reverse Strand */}
                                        {showReverseStrand && (
                                            <div className="w-4 text-center text-gray-500 text-xs select-none mt-0.5">
                                                {getComplementBase(base)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {/* Cursor at the end of the chunk */}
                            {!hasSelection && cursorPosition === chunk.index + chunk.seq.length && (
                                <div className="relative flex items-center">
                                    <div className="absolute -left-0.5 w-0.5 h-4 bg-blue-500 animate-pulse" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Feature Tracks */}
                    <div className="flex px-2 mt-1">
                        <div className="w-16 mr-4"></div>
                        <div className="flex-1 relative" style={{ minHeight: '40px' }}>
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

                                // Use rem units to match w-4 (1rem) character width
                                const left = `calc(${offset} * 1rem)`;
                                const width = `calc(${length} * 1rem)`;

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
                                        className={`absolute h-4 top-0 ${colors.bg} ${colors.text} border-b-2 ${colors.border} text-[10px] flex items-center px-1 overflow-hidden whitespace-nowrap ${onFeatureClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                                        style={{ left, width, clipPath }}
                                        title={`${feature.label || feature.type} (${feature.start}..${feature.end}) - Click to edit`}
                                        onClick={() => onFeatureClick?.(feature)}
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

                            {/* Amino Acid Track for CDS features */}
                            {features.filter(f => f.type === 'CDS').map(feature => {
                                const featureStart = feature.start - 1; // 0-based
                                const featureEnd = feature.end; // 0-based exclusive (or inclusive in 1-based)
                                const chunkStart = chunk.index;
                                const chunkEnd = chunk.index + chunkSize;

                                if (featureEnd <= chunkStart || featureStart >= chunkEnd) return null;

                                // Calculate amino acid sequence for this feature
                                const featureSeq = sequence.slice(featureStart, featureEnd);
                                let aaSeq = translateDNA(featureSeq, feature.strand);

                                // For reverse strand, reverse the ENTIRE amino acid sequence first
                                const isReverseStrand = feature.strand === -1;
                                if (isReverseStrand) {
                                    aaSeq = aaSeq.split('').reverse().join('');
                                }

                                // Render each amino acid with its 3-nucleotide box
                                return (
                                    <div key={`aa-${feature.id}-container`} className="absolute top-5 pointer-events-none" style={{ left: 0, width: '100%' }}>
                                        {aaSeq.split('').map((aa, aaIndex) => {
                                            // Calculate the position of this amino acid's codon
                                            const codonStartInFeature = aaIndex * 3;
                                            const codonStart = featureStart + codonStartInFeature;
                                            const codonEnd = codonStart + 3;

                                            // Check if any part of this codon is in the current chunk
                                            if (codonEnd <= chunkStart || codonStart >= chunkEnd) return null;

                                            // Calculate the visible portion of the codon in this chunk
                                            const visibleCodonStart = Math.max(codonStart, chunkStart);
                                            const visibleCodonEnd = Math.min(codonEnd, chunkEnd);
                                            const visibleCodonOffset = visibleCodonStart - chunkStart;
                                            const visibleCodonLength = visibleCodonEnd - visibleCodonStart;

                                            // Position for the box (spanning the 3 nucleotides)
                                            const boxLeft = `calc(${visibleCodonOffset} * 1rem)`;
                                            const boxWidth = `calc(${visibleCodonLength} * 1rem)`;

                                            // Only show the amino acid letter if this is the start of the codon (or first visible part)
                                            const showLetter = visibleCodonStart === codonStart;

                                            return (
                                                <div
                                                    key={`aa-${feature.id}-${aaIndex}`}
                                                    className="absolute inline-block"
                                                    style={{
                                                        left: boxLeft,
                                                        width: boxWidth,
                                                        height: '14px',
                                                    }}
                                                >
                                                    {/* Background box for the codon */}
                                                    <div
                                                        className="absolute inset-0 bg-yellow-500/20 border border-yellow-400/40 rounded-sm"
                                                        title={`${feature.label || feature.type}: ${aa} (codon ${aaIndex + 1}, ${isReverseStrand ? 'reverse' : 'forward'})`}
                                                    />
                                                    {/* Amino acid letter, centered in the full 3-nucleotide box */}
                                                    {showLetter && (
                                                        <div
                                                            className="absolute text-[9px] text-yellow-300 font-mono font-semibold"
                                                            style={{
                                                                left: '50%',
                                                                top: '50%',
                                                                transform: 'translate(-50%, -50%)',
                                                                width: '3rem', // Full width to center across all 3 nucleotides
                                                                textAlign: 'center',
                                                            }}
                                                        >
                                                            {aa}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}

                            {/* Amino Acid Track for Selected Sequence */}
                            {hasSelection && selectionStart !== null && selectionEnd !== null && (() => {
                                const chunkStart = chunk.index;
                                const chunkEnd = chunk.index + chunkSize;

                                // Check if selection overlaps with this chunk
                                if (selectionEnd <= chunkStart || selectionStart >= chunkEnd) return null;

                                // Calculate amino acid sequence for the selected region
                                const selectedSeq = sequence.slice(selectionStart, selectionEnd);
                                // Use selectionDirection: if reverse, translate reverse complement
                                // For selection display, continue past stop codons (stopAtStopCodon = false)
                                let aaSeq = translateDNA(selectedSeq, selectionDirection === 'reverse' ? -1 : 1, false);

                                // For reverse direction, reverse the ENTIRE amino acid sequence first
                                if (selectionDirection === 'reverse') {
                                    aaSeq = aaSeq.split('').reverse().join('');
                                }

                                // Display each amino acid at the center of its codon (position of 2nd nucleotide)
                                return (
                                    <div key="selection-aa-container" className="absolute top-[-12px] pointer-events-none" style={{ left: 0, width: '100%' }}>
                                        {aaSeq.split('').map((aa, aaIndex) => {
                                            // Calculate the position of this amino acid's codon
                                            // Each amino acid corresponds to 3 nucleotides
                                            const codonStartInSelection = aaIndex * 3;
                                            const codonStart = selectionStart + codonStartInSelection;
                                            const codonEnd = codonStart + 3;

                                            // Check if any part of this codon is in the current chunk
                                            if (codonEnd <= chunkStart || codonStart >= chunkEnd) return null;

                                            // Calculate the visible portion of the codon in this chunk
                                            const visibleCodonStart = Math.max(codonStart, chunkStart);
                                            const visibleCodonEnd = Math.min(codonEnd, chunkEnd);
                                            const visibleCodonOffset = visibleCodonStart - chunkStart;
                                            const visibleCodonLength = visibleCodonEnd - visibleCodonStart;

                                            // Position for the box (spanning the 3 nucleotides)
                                            const boxLeft = `calc(${visibleCodonOffset} * 1rem)`;
                                            const boxWidth = `calc(${visibleCodonLength} * 1rem)`;

                                            // Only show the amino acid letter if this is the start of the codon (or first visible part)
                                            const showLetter = visibleCodonStart === codonStart;

                                            return (
                                                <div
                                                    key={aaIndex}
                                                    className="absolute inline-block"
                                                    style={{
                                                        left: boxLeft,
                                                        width: boxWidth,
                                                        height: '12px',
                                                    }}
                                                >
                                                    {/* Background box for the codon */}
                                                    <div
                                                        className="absolute inset-0 bg-cyan-500/20 border border-cyan-400/40 rounded-sm"
                                                        title={`Amino acid: ${aa} (codon ${aaIndex + 1})`}
                                                    />
                                                    {/* Amino acid letter, centered in the full 3-nucleotide box */}
                                                    {showLetter && (
                                                        <div
                                                            className="absolute text-[9px] text-cyan-300 font-mono font-semibold"
                                                            style={{
                                                                left: '50%',
                                                                top: '50%',
                                                                transform: 'translate(-50%, -50%)',
                                                                width: '3rem', // Full width to center across all 3 nucleotides
                                                                textAlign: 'center',
                                                            }}
                                                        >
                                                            {aa}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
