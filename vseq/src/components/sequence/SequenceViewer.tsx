import { useState, useMemo, useEffect } from 'react';
import { useFileSystemStore } from '../../store/useFileSystemStore';
import { Dna, AlertCircle, Map, FileText, List, ZoomIn, ZoomOut, RotateCcw, Edit3, Eye, Undo2, Redo2, Save } from 'lucide-react';
import { parseGenBank, parseFasta } from '../../lib/parsers';
import { LinearView } from './LinearView';
import { CircularView } from './CircularView';
import { LinearMapView } from './LinearMapView';
import { FeatureList } from './FeatureList';
import { useSequenceEditor } from '../../hooks/useSequenceEditor';

export const SequenceViewer = () => {
    const { selectedId, items, updateFileContent } = useFileSystemStore();
    const [viewMode, setViewMode] = useState<'seq' | 'map' | 'features'>('seq');
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [editMode, setEditMode] = useState(false);

    const selectedFile = selectedId ? items[selectedId] : null;

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

    if (!selectedFile) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-500">
                <div className="text-center">
                    <Dna className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>Select a sequence file to view</p>
                </div>
            </div>
        );
    }

    if (!sequenceData) {
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
            <div className="h-12 border-b border-gray-800 flex items-center px-4 justify-between bg-gray-900/50 backdrop-blur-sm">
                <div className="flex items-center space-x-4">
                    <h2 className="font-medium text-gray-200">{sequenceData.name}</h2>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                        {sequenceData.type.toUpperCase()} • {sequenceData.sequence.length} bp • {sequenceData.circular ? 'Circular' : 'Linear'}
                    </span>
                </div>

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

                {/* Edit Mode Controls (Seq view only) */}
                {viewMode === 'seq' && (
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
                    </div>
                )}
            </div>

            {/* Main View Area */}
            <div className="flex-1 overflow-hidden relative">
                {viewMode === 'seq' && <LinearView
                    data={editMode ? { ...sequenceData, sequence: editor.sequence, features: editor.features } : sequenceData}
                    zoomLevel={zoomLevel}
                    editable={editMode}
                    cursorPosition={editor.cursorPosition}
                    selectionStart={editor.selectionStart}
                    selectionEnd={editor.selectionEnd}
                    onCursorMove={editor.setCursorPosition}
                    setSelection={editor.setSelection}
                    clearSelection={editor.clearSelection}
                    onInsertBase={editor.insertBase}
                    onDeleteBase={editor.deleteBase}
                    onBackspace={editor.backspace}
                    onUndo={editor.undo}
                    onRedo={editor.redo}
                />}
                {viewMode === 'map' && (
                    sequenceData.circular ?
                        <CircularView data={sequenceData} zoomLevel={zoomLevel} /> :
                        <LinearMapView data={sequenceData} zoomLevel={zoomLevel} />
                )}
                {viewMode === 'features' && <FeatureList data={sequenceData} />}
            </div>
        </div>
    );
};
