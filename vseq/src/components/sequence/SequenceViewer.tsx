import { useState, useMemo, useEffect, useCallback } from 'react';
import { useFileSystemStore } from '../../store/useFileSystemStore';
import { Dna, AlertCircle, Map, FileText, List, ZoomIn, ZoomOut, RotateCcw, Edit3, Eye, Undo2, Redo2, Save, FlipVertical2, Plus, Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { parseGenBank, parseFasta } from '../../lib/parsers';
import { LinearView } from './LinearView';
import { CircularView } from './CircularView';
import { LinearMapView } from './LinearMapView';
import { FeatureList } from './FeatureList';
import { MultiSequenceView } from './MultiSequenceView';
import { useSequenceEditor } from '../../hooks/useSequenceEditor';
import { SelectionInfo } from './SelectionInfo';
import { FeatureEditor } from './FeatureEditor';
import type { Feature } from '../../types';

export const SequenceViewer = () => {
    const { activeFileIds, items, updateFileContent } = useFileSystemStore();
    const [viewMode, setViewMode] = useState<'seq' | 'map' | 'features'>('seq');
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [editMode, setEditMode] = useState(false);
    const [showReverseStrand, setShowReverseStrand] = useState(false);
    const [featureEditorOpen, setFeatureEditorOpen] = useState(false);
    const [editingFeature, setEditingFeature] = useState<Feature | undefined>(undefined);

    // Search state
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ fileId?: string; start: number; end: number }[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

    // Multi-file selection state
    const [multiSelection, setMultiSelection] = useState<{
        fileId: string;
        start: number;
        end: number;
        direction: 'forward' | 'reverse';
    } | null>(null);

    // Determine if we're in multi-file mode
    const isMultiFileMode = activeFileIds.length > 1;
    const selectedFile = activeFileIds.length === 1 ? items[activeFileIds[0]] : null;

    // Get all active files for multi-file view
    const activeFiles = useMemo(() => {
        return activeFileIds.map(id => items[id]).filter(Boolean);
    }, [activeFileIds, items]);

    const sequenceData = useMemo(() => {
        if (!selectedFile || !selectedFile.content) return null;
        if (selectedFile.name.endsWith('.gb') || selectedFile.name.endsWith('.gbk')) {
            return parseGenBank(selectedFile.content);
        }
        if (selectedFile.name.endsWith('.fasta') || selectedFile.name.endsWith('.fa')) {
            return parseFasta(selectedFile.content);
        }
        return null;
    }, [selectedFile]);

    // Initialize sequence editor with current sequence data
    const editor = useSequenceEditor(
        sequenceData?.sequence || '',
        sequenceData?.features || []
    );

    // Reset editor when sequence data changes (e.g., different file selected)
    useEffect(() => {
        if (sequenceData) {
            editor.resetHistory(sequenceData.sequence, sequenceData.features);
        }
    }, [sequenceData]);

    // Check if there are unsaved changes
    const hasUnsavedChanges = editMode && (
        editor.sequence !== sequenceData?.sequence ||
        JSON.stringify(editor.features) !== JSON.stringify(sequenceData?.features)
    );

    // Save handler to regenerate file content and update store
    const handleSave = () => {
        if (!selectedFile || !sequenceData) return;

        // For now, create a simple GenBank format with edited sequence and features
        // This is a simplified version - in production, you'd want a proper GenBank serializer
        const updatedContent = regenerateGenBankContent(sequenceData, editor.sequence, editor.features);
        updateFileContent(selectedFile.id, updatedContent);
        // Reset editor history to mark changes as saved
        editor.resetHistory(editor.sequence, editor.features);
    };

    // Helper to regenerate GenBank content (simplified)
    const regenerateGenBankContent = (_original: any, newSequence: string, newFeatures: any[]) => {
        // Extract header from original content
        const originalLines = selectedFile?.content?.split('\n') || [];
        const headerEndIndex = originalLines.findIndex(line => line.startsWith('ORIGIN'));
        const headerLines = headerEndIndex > 0 ? originalLines.slice(0, headerEndIndex) : [];

        // Generate features section 
        const featuresSection = newFeatures.map(f =>
            `     ${f.type.padEnd(16)}${f.start}..${f.end}\n` +
            (f.label ? `                     /label="${f.label}"\n` : '')
        ).join('');

        // Generate sequence section
        const seqLines = [];
        for (let i = 0; i < newSequence.length; i += 60) {
            const chunk = newSequence.slice(i, i + 60).toLowerCase().match(/.{1,10}/g)?.join(' ') || '';
            seqLines.push(`${String(i + 1).padStart(9)} ${chunk}`);
        }

        return [
            ...headerLines,
            featuresSection ? 'FEATURES             Location/Qualifiers\n' + featuresSection : '',
            'ORIGIN',
            ...seqLines,
            '//'
        ].join('\n');
    };

    // Feature editor handlers
    const handleAddFeature = () => {
        setEditingFeature(undefined);
        setFeatureEditorOpen(true);
    };

    const handleEditFeature = (feature: Feature) => {
        setEditingFeature(feature);
        setFeatureEditorOpen(true);
    };

    const handleSaveFeature = (feature: Omit<Feature, 'id'> | Feature) => {
        if ('id' in feature && feature.id) {
            // Editing existing feature
            editor.updateFeature(feature.id, feature);
        } else {
            // Adding new feature
            editor.addFeature(feature as Omit<Feature, 'id'>);
        }
    };

    const handleDeleteFeature = () => {
        if (editingFeature) {
            editor.deleteFeature(editingFeature.id);
        }
    };

    // Search handlers
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (!query) {
            setSearchResults([]);
            setCurrentMatchIndex(-1);
            return;
        }

        const results: { fileId: string; start: number; end: number }[] = [];
        const search = query.toUpperCase();

        // Search in all active files
        activeFiles.forEach(file => {
            if (!file.content) return;

            let sequence = '';
            if (file.name.endsWith('.gb') || file.name.endsWith('.gbk')) {
                const data = parseGenBank(file.content);
                sequence = data?.sequence || '';
            } else if (file.name.endsWith('.fasta') || file.name.endsWith('.fa')) {
                const data = parseFasta(file.content);
                sequence = data?.sequence || '';
            }

            if (!sequence) return;

            const seq = sequence.toUpperCase();
            let pos = seq.indexOf(search);
            while (pos !== -1) {
                results.push({ fileId: file.id, start: pos, end: pos + search.length });
                pos = seq.indexOf(search, pos + 1);
            }
        });

        setSearchResults(results);
        setCurrentMatchIndex(results.length > 0 ? 0 : -1);
    };

    const nextMatch = () => {
        if (searchResults.length === 0) return;
        setCurrentMatchIndex((prev) => (prev + 1) % searchResults.length);
    };

    const prevMatch = () => {
        if (searchResults.length === 0) return;
        setCurrentMatchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    };

    const closeSearch = useCallback(() => {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
        setCurrentMatchIndex(-1);
    }, []);

    // Wrappers to clear search on interaction
    const handleCursorMove = useCallback((pos: number) => {
        editor.setCursorPosition(pos);
        if (searchResults.length > 0) closeSearch();
    }, [editor.setCursorPosition, searchResults.length, closeSearch]);

    const handleSetSelection = useCallback((start: number, end: number, direction?: 'forward' | 'reverse') => {
        editor.setSelection(start, end, direction);
        if (searchResults.length > 0) closeSearch();
    }, [editor.setSelection, searchResults.length, closeSearch]);

    // Single file mode: existing behavior
    if (!isMultiFileMode && (!selectedFile || activeFileIds.length === 0)) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-500">
                <div className="text-center">
                    <Dna className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>Select a file from the list above to view its sequence</p>
                </div>
            </div>
        );
    }

    if (!isMultiFileMode && !sequenceData) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-900 text-red-400">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                    <p>Unsupported file format</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-900 overflow-hidden">
            {/* Toolbar */}
            <div className="h-12 border-b border-gray-800 flex items-center px-4 justify-between bg-gray-900/50 backdrop-blur-sm relative z-10">
                <div className="flex items-center space-x-4">
                    {isMultiFileMode ? (
                        <h2 className="font-medium text-gray-200">
                            {activeFiles.length} files selected
                        </h2>
                    ) : (
                        <>
                            <h2 className="font-medium text-gray-200">{sequenceData?.name}</h2>
                            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                                {sequenceData?.type.toUpperCase()} • {sequenceData?.sequence.length} bp • {sequenceData?.circular ? 'Circular' : 'Linear'}
                            </span>
                        </>
                    )}
                </div>

                {!isMultiFileMode && (
                    <div className="flex items-center bg-gray-800 rounded-lg p-1 gap-1">
                        <button
                            onClick={() => setViewMode('seq')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${viewMode === 'seq' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                            title="Sequence Viewer"
                        >
                            <FileText size={16} />
                            <span>Seq</span>
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                            title="Map Viewer"
                        >
                            <Map size={16} />
                            <span>Map</span>
                        </button>
                        <button
                            onClick={() => setViewMode('features')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${viewMode === 'features' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                            title="Feature List"
                        >
                            <List size={16} />
                            <span>List</span>
                        </button>
                    </div>
                )}

                {/* Zoom Controls */}
                <div className="flex items-center bg-gray-800 rounded-lg p-1 gap-1">
                    <button
                        onClick={() => setZoomLevel(Math.min(3.0, zoomLevel + 0.25))}
                        disabled={zoomLevel >= 3.0}
                        className="p-1.5 rounded-md transition-colors text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Zoom In"
                    >
                        <ZoomIn size={16} />
                    </button>
                    <span className="text-xs text-gray-400 px-2 min-w-[3rem] text-center">
                        {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                        onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                        disabled={zoomLevel <= 0.5}
                        className="p-1.5 rounded-md transition-colors text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Zoom Out"
                    >
                        <ZoomOut size={16} />
                    </button>
                    <button
                        onClick={() => setZoomLevel(1.0)}
                        disabled={zoomLevel === 1.0}
                        className="p-1.5 rounded-md transition-colors text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Reset Zoom"
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>

                {/* Search Toggle */}
                <button
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    className={`p-1.5 rounded-md transition-colors ${isSearchOpen ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                    title="Search Sequence"
                >
                    <Search size={16} />
                </button>

                {/* Search Bar */}
                {isSearchOpen && (
                    <div className="absolute top-14 right-4 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Find sequence..."
                            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500 w-40 font-mono uppercase"
                            autoFocus
                        />
                        <div className="flex items-center gap-1 text-xs text-gray-400 min-w-[3rem] justify-center">
                            {searchResults.length > 0 ? (
                                <span>{currentMatchIndex + 1} / {searchResults.length}</span>
                            ) : searchQuery ? (
                                <span className="text-red-400">0 / 0</span>
                            ) : (
                                <span>0 / 0</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={prevMatch}
                                disabled={searchResults.length === 0}
                                className="p-1 hover:bg-gray-700 rounded disabled:opacity-50"
                            >
                                <ChevronUp size={14} />
                            </button>
                            <button
                                onClick={nextMatch}
                                disabled={searchResults.length === 0}
                                className="p-1 hover:bg-gray-700 rounded disabled:opacity-50"
                            >
                                <ChevronDown size={14} />
                            </button>
                        </div>
                        <div className="w-px h-4 bg-gray-700 mx-1" />
                        <button
                            onClick={closeSearch}
                            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
                {/* Reverse Strand Toggle (Seq view only) */}
                {!isMultiFileMode && viewMode === 'seq' && (
                    <button
                        onClick={() => setShowReverseStrand(!showReverseStrand)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${showReverseStrand
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                            }`}
                        title="Toggle Reverse Strand"
                    >
                        <FlipVertical2 size={16} />
                        <span>Reverse</span>
                    </button>
                )}

                {/* Edit Mode Controls (Seq view only) */}
                {!isMultiFileMode && viewMode === 'seq' && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setEditMode(!editMode)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${editMode ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                            title={editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
                        >
                            {editMode ? <><Eye size={16} /><span>View</span></> : <><Edit3 size={16} /><span>Edit</span></>}
                        </button>

                        {editMode && (
                            <>
                                <div className="flex items-center bg-gray-800 rounded-lg p-1 gap-1">
                                    <button
                                        onClick={() => editor.undo()}
                                        disabled={!editor.canUndo}
                                        className="p-1.5 rounded-md transition-colors text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Undo"
                                    >
                                        <Undo2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => editor.redo()}
                                        disabled={!editor.canRedo}
                                        className="p-1.5 rounded-md transition-colors text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Redo"
                                    >
                                        <Redo2 size={16} />
                                    </button>
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={!hasUnsavedChanges}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Save Changes"
                                >
                                    <Save size={16} />
                                    <span>Save</span>
                                </button>
                            </>
                        )}

                        {/* Add Feature Button (visible when selection exists) */}
                        {editor.hasSelection && (
                            <button
                                onClick={handleAddFeature}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium bg-purple-600 text-white hover:bg-purple-700"
                                title="Add Feature from Selection"
                            >
                                <Plus size={16} />
                                <span>Add Feature</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Main View Area */}
            <div className="flex-1 overflow-hidden relative">
                {isMultiFileMode ? (
                    <MultiSequenceView
                        files={activeFiles}
                        zoomLevel={zoomLevel}
                        searchResults={searchResults}
                        currentMatchIndex={currentMatchIndex}
                        selection={multiSelection}
                        onSelectionChange={setMultiSelection}
                    />
                ) : (
                    <>
                        {viewMode === 'seq' && sequenceData && <LinearView
                            data={{
                                ...sequenceData,
                                sequence: editor.sequence,
                                features: editor.features
                            }}
                            zoomLevel={zoomLevel}
                            editable={editMode}
                            cursorPosition={editor.cursorPosition}
                            selectionStart={editor.selectionStart}
                            selectionEnd={editor.selectionEnd}
                            selectionDirection={editor.selectionDirection}
                            onCursorMove={handleCursorMove}
                            setSelection={handleSetSelection}
                            clearSelection={editor.clearSelection}
                            onInsertBase={editor.insertBase}
                            onDeleteBase={editor.deleteBase}
                            onBackspace={editor.backspace}
                            onUndo={editor.undo}
                            onRedo={editor.redo}
                            showReverseStrand={showReverseStrand}
                            onFeatureClick={handleEditFeature}
                            searchResults={searchResults}
                            currentMatchIndex={currentMatchIndex}
                        />}
                        {viewMode === 'map' && sequenceData && (
                            sequenceData.circular ?
                                <CircularView data={sequenceData} zoomLevel={zoomLevel} /> :
                                <LinearMapView data={sequenceData} zoomLevel={zoomLevel} />
                        )}
                        {viewMode === 'features' && sequenceData && <FeatureList data={sequenceData} />}

                        {/* Selection Info Panel */}
                        {viewMode === 'seq' && editor.hasSelection && editor.selectionStart !== null && editor.selectionEnd !== null && (
                            <div className="absolute bottom-4 right-4 shadow-lg z-10">
                                <SelectionInfo
                                    selectionStart={editor.selectionStart}
                                    selectionEnd={editor.selectionEnd}
                                    sequence={editor.sequence}
                                    direction={editor.selectionDirection}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Feature Editor Modal */}
            <FeatureEditor
                isOpen={featureEditorOpen}
                onClose={() => setFeatureEditorOpen(false)}
                onSave={handleSaveFeature}
                onDelete={editingFeature ? handleDeleteFeature : undefined}
                initialFeature={editingFeature}
                selectionStart={editor.selectionStart ?? undefined}
                selectionEnd={editor.selectionEnd ?? undefined}
                sequence={editor.sequence}
            />
        </div>
    );
};
