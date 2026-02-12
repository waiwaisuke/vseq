import { useMemo, useState, useRef, useEffect } from 'react';
import { parseGenBank, parseFasta } from '../../lib/parsers';
import { getFeatureColor } from '../../lib/featureUtils';
import type { FileSystemItem } from '../../types';

interface MultiSequenceViewProps {
    files: FileSystemItem[];
    zoomLevel?: number;
    searchResults?: { fileId: string; start: number; end: number }[];
    currentMatchIndex?: number;
    selection?: {
        fileId: string;
        start: number;
        end: number;
        direction: 'forward' | 'reverse';
    } | null;
    onSelectionChange?: (selection: {
        fileId: string;
        start: number;
        end: number;
        direction: 'forward' | 'reverse';
    } | null) => void;
}

export const MultiSequenceView = ({
    files,
    zoomLevel = 1.0,
    searchResults = [],
    currentMatchIndex = -1,
    selection = null,
    onSelectionChange
}: MultiSequenceViewProps) => {
    // Parse all files
    const parsedFiles = useMemo(() => {
        return files.map(file => {
            if (!file.content) return null;

            let data = null;
            if (file.name.endsWith('.gb') || file.name.endsWith('.gbk')) {
                data = parseGenBank(file.content);
            } else if (file.name.endsWith('.fasta') || file.name.endsWith('.fa')) {
                data = parseFasta(file.content);
            }

            return data ? { ...data, fileName: file.name, fileId: file.id } : null;
        }).filter(Boolean);
    }, [files]);

    // Character width in pixels (must match font settings)
    // Base width 8.5px at zoom 1.0
    // We use 'ch' units for alignment, so CHAR_WIDTH_ESTIMATE is only used for total width estimation
    const CHAR_WIDTH_ESTIMATE = 8.5 * zoomLevel;
    const FONT_SIZE = 14 * zoomLevel;
    const LINE_HEIGHT = 96; // Fixed row height for now, or could scale

    // Common font styles for alignment
    const fontStyles = {
        fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
        fontSize: `${FONT_SIZE}px`,
        letterSpacing: '0px',
    };

    // Measure actual character width for hit testing
    const [charWidth, setCharWidth] = useState(0);
    const measureRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (measureRef.current) {
            const rect = measureRef.current.getBoundingClientRect();
            setCharWidth(rect.width);
        }
    }, [zoomLevel, FONT_SIZE]); // Re-measure when zoom changes

    // Selection handling
    const isDragging = useRef(false);
    const dragStart = useRef<{ fileId: string; index: number } | null>(null);

    const getBaseIndex = (e: React.MouseEvent, fileId: string) => {
        if (!charWidth) return 0;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        return Math.max(0, Math.floor(x / charWidth));
    };

    const handleMouseDown = (e: React.MouseEvent, fileId: string, seqLength: number) => {
        if (!onSelectionChange) return;

        const index = Math.min(getBaseIndex(e, fileId), seqLength);
        isDragging.current = true;
        dragStart.current = { fileId, index };

        onSelectionChange({
            fileId,
            start: index,
            end: index,
            direction: 'forward'
        });
    };

    const handleMouseMove = (e: React.MouseEvent, fileId: string, seqLength: number) => {
        if (!isDragging.current || !dragStart.current || dragStart.current.fileId !== fileId || !onSelectionChange) return;

        const currentIndex = Math.min(getBaseIndex(e, fileId), seqLength);
        const startIndex = dragStart.current.index;

        onSelectionChange({
            fileId,
            start: Math.min(startIndex, currentIndex),
            end: Math.max(startIndex, currentIndex),
            direction: currentIndex < startIndex ? 'reverse' : 'forward'
        });
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        dragStart.current = null;
    };

    // Global mouse up to catch drags that end outside
    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    // Find max sequence length for ruler
    const maxLength = useMemo(() => {
        return Math.max(...parsedFiles.map(f => f?.sequence.length || 0), 0);
    }, [parsedFiles]);

    // Use ch units for width to match content exactly
    const totalWidthStyle = { minWidth: `calc(${maxLength}ch + 40px)` };

    // Generate position markers
    const generateMarkers = (length: number) => {
        const markers = [];
        const step = 100;
        for (let i = 0; i <= length; i += step) {
            markers.push(i);
        }
        return markers;
    };

    const markers = generateMarkers(maxLength);

    if (parsedFiles.length === 0) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-900 text-gray-500">
                <p>No valid sequence files selected</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-900 overflow-hidden">
            {/* Hidden measurement element */}
            <span
                ref={measureRef}
                style={{ ...fontStyles, position: 'absolute', visibility: 'hidden', whiteSpace: 'pre' }}
            >
                W
            </span>

            {/* Header */}
            <div className="h-12 border-b border-gray-800 flex items-center px-4 bg-gray-900/50 backdrop-blur-sm">
                <h2 className="font-medium text-gray-200">
                    Multi-Sequence View ({parsedFiles.length} files)
                </h2>
                {selection && (
                    <div className="ml-4 text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded border border-blue-800">
                        Selected: {selection.end - selection.start} bp ({selection.start + 1}..{selection.end})
                    </div>
                )}
            </div>

            {/* Main scrollable area */}
            <div
                className="flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain"
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#4B5563 #1F2937'
                }}
            >
                <style>{`
                    /* Always show scrollbar on WebKit browsers */
                    .overflow-x-auto::-webkit-scrollbar {
                        height: 12px;
                    }
                    .overflow-x-auto::-webkit-scrollbar-track {
                        background: #1F2937;
                    }
                    .overflow-x-auto::-webkit-scrollbar-thumb {
                        background: #4B5563;
                        border-radius: 6px;
                    }
                    .overflow-x-auto::-webkit-scrollbar-thumb:hover {
                        background: #6B7280;
                    }
                `}</style>
                <div className="flex" style={{ minWidth: '100%' }}>
                    {/* Fixed file names column */}
                    <div className="sticky left-0 z-20 bg-gray-900 border-r border-gray-800 min-w-[200px] shadow-lg">
                        {/* Header spacer for ruler */}
                        <div className="h-8 border-b border-gray-800 bg-gray-850" />

                        {/* File names */}
                        {parsedFiles.map((data, idx) => (
                            <div
                                key={idx}
                                className={`h-24 border-b border-gray-800 flex items-center px-3 ${selection?.fileId === data?.fileId ? 'bg-blue-900/10' : ''}`}
                            >
                                <div className="truncate">
                                    <div className={`text-sm font-medium truncate ${selection?.fileId === data?.fileId ? 'text-blue-300' : 'text-gray-200'}`}>
                                        {data?.fileName}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {data?.sequence.length.toLocaleString()} bp
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Scrollable sequences area */}
                    <div className="flex-1">
                        {/* Position ruler */}
                        <div
                            className="h-8 border-b border-gray-800 bg-gray-850 flex items-center relative"
                            style={{ ...totalWidthStyle, ...fontStyles }}
                        >
                            {markers.map((pos) => (
                                <div
                                    key={pos}
                                    className="absolute"
                                    style={{ left: `${pos}ch` }}
                                >
                                    <div className="text-xs text-gray-500 -translate-x-1/2 font-sans">
                                        {pos}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Sequences */}
                        {parsedFiles.map((data, idx) => (
                            <div
                                key={idx}
                                className={`h-24 border-b border-gray-800 relative cursor-text ${selection?.fileId === data?.fileId ? 'bg-blue-900/5' : ''}`}
                                style={{ ...totalWidthStyle, ...fontStyles }}
                                onMouseDown={(e) => data && handleMouseDown(e, data.fileId, data.sequence.length)}
                                onMouseMove={(e) => data && handleMouseMove(e, data.fileId, data.sequence.length)}
                            >
                                {/* Sequence text */}
                                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                    <div
                                        className="p-0 text-gray-300 whitespace-nowrap"
                                        style={{
                                            lineHeight: `${LINE_HEIGHT}px`,
                                            paddingLeft: '0px'
                                        }}
                                    >
                                        {data?.sequence.toUpperCase()}
                                    </div>
                                </div>

                                {/* Selection Overlay */}
                                {selection && selection.fileId === data?.fileId && (
                                    <div className="absolute inset-0 pointer-events-none">
                                        <div
                                            className="absolute bg-blue-500/30 border-x border-blue-400/50 h-full"
                                            style={{
                                                left: `${selection.start}ch`,
                                                width: `${selection.end - selection.start}ch`,
                                                top: 0
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Search Results Overlay */}
                                {searchResults.length > 0 && (
                                    <div className="absolute inset-0 pointer-events-none">
                                        {searchResults
                                            .filter(result => result.fileId === data?.fileId)
                                            .map((result, rIdx) => {
                                                const startX = `${result.start}ch`;
                                                const width = `${result.end - result.start}ch`;

                                                // Check if this is the current match
                                                // We need to find the global index of this match to compare with currentMatchIndex
                                                // But simpler: just check if the current match in the global array matches this one
                                                const isCurrent = currentMatchIndex !== -1 &&
                                                    searchResults[currentMatchIndex] === result;

                                                return (
                                                    <div
                                                        key={`search-${rIdx}`}
                                                        className={`absolute ${isCurrent ? 'bg-orange-500/50 border-b-2 border-orange-500' : 'bg-yellow-500/30'}`}
                                                        style={{
                                                            left: startX,
                                                            width: width,
                                                            top: '50%',
                                                            transform: 'translateY(-50%)', // Center vertically
                                                            height: `${FONT_SIZE + 4}px` // Highlight height slightly larger than font
                                                        }}
                                                    />
                                                );
                                            })}
                                    </div>
                                )}

                                {/* Features overlay */}
                                {data?.features && data.features.length > 0 && (
                                    <div className="absolute inset-0 pointer-events-none">
                                        {data.features.map((feature, fIdx) => {
                                            const startX = `${feature.start}ch`;
                                            const width = `${feature.end - feature.start}ch`;
                                            const colors = getFeatureColor(feature.type);
                                            const isForward = feature.strand !== -1;

                                            // Arrow logic
                                            let clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'; // Default rectangle

                                            if (isForward) {
                                                // Arrow on right
                                                clipPath = 'polygon(0% 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 0% 100%)';
                                            } else {
                                                // Arrow on left
                                                clipPath = 'polygon(8px 0%, 100% 0%, 100% 100%, 8px 100%, 0% 50%)';
                                            }

                                            return (
                                                <div
                                                    key={fIdx}
                                                    className="absolute"
                                                    style={{
                                                        left: startX,
                                                        width: width,
                                                        top: '4px',
                                                        height: '16px'
                                                    }}
                                                >
                                                    <div
                                                        className={`w-full h-full ${colors.bg} ${colors.text} border-b-2 ${colors.border} text-[10px] flex items-center px-1 overflow-hidden whitespace-nowrap font-sans`}
                                                        style={{ clipPath }}
                                                        title={`${feature.label || feature.type} (${feature.start}..${feature.end})`}
                                                    >
                                                        {feature.label && (feature.end - feature.start) > 5 && (
                                                            <span className={`drop-shadow-md ml-${!isForward ? '2' : '0'}`}>
                                                                {feature.label}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
