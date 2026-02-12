import { useState, useMemo, useEffect, useCallback } from 'react';
import { useFileSystemStore } from '../../store/useFileSystemStore';
import { Dna, AlertCircle, Map, FileText, List, ZoomIn, ZoomOut, RotateCcw, Edit3, Eye, Undo2, Redo2, Save, FlipVertical2, Plus, Search, ChevronUp, ChevronDown, X, Download, BarChart3, Scissors } from 'lucide-react';
import { parseGenBank, parseFasta } from '../../lib/parsers';
import { parseEMBL } from '../../lib/parsersExtra';
import { exportAsGenBank, exportAsFasta, downloadFile } from '../../lib/exporters';
import { LinearView } from './LinearView';
import { CircularView } from './CircularView';
import { LinearMapView } from './LinearMapView';
import { FeatureList } from './FeatureList';
import { MultiSequenceView } from './MultiSequenceView';
import { useSequenceEditor } from '../../hooks/useSequenceEditor';
import { SelectionInfo } from './SelectionInfo';
import { FeatureEditor } from './FeatureEditor';
import { SequenceStats } from './SequenceStats';
import { RestrictionEnzymePanel } from './RestrictionEnzymePanel';
import { ORFFinderPanel } from './ORFFinderPanel';
import { JumpToPositionDialog } from './JumpToPositionDialog';
import { SequenceOperationsMenu } from './SequenceOperationsMenu';
import { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';
import { BlastMenu } from './BlastMenu';
import { DigestSimPanel } from './DigestSimPanel';
import { PrimerDesignPanel } from './PrimerDesignPanel';
import { AlignmentPanel } from './AlignmentPanel';
import { CodonUsagePanel } from './CodonUsagePanel';
import { FeatureColorSettings } from './FeatureColorSettings';
import { CloningSimPanel } from './CloningSimPanel';
import { getReverseComplement } from '../../lib/dnaTranslation';
import { findAllORFs } from '../../lib/orfFinder';
import { findCutSites, ENZYME_DB } from '../../lib/restrictionEnzymes';
import type { ORF } from '../../lib/orfFinder';
import type { Primer } from '../../lib/primerDesign';
import type { Feature } from '../../types';

export const SequenceViewer = () => {
    const { activeFileIds, items, updateFileContent } = useFileSystemStore();
    const [viewMode, setViewMode] = useState<'seq' | 'map' | 'features' | 'stats' | 'enzymes' | 'orfs' | 'digest' | 'primers' | 'align' | 'codons' | 'colors' | 'cloning'>('seq');
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [editMode, setEditMode] = useState(false);
    const [showReverseStrand, setShowReverseStrand] = useState(false);
    const [featureEditorOpen, setFeatureEditorOpen] = useState(false);
    const [editingFeature, setEditingFeature] = useState<Feature | undefined>(undefined);

    // Export menu state
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    // 6-frame translation state
    const [translationFrames, setTranslationFrames] = useState<Set<number>>(new Set());
    const [showTranslationMenu, setShowTranslationMenu] = useState(false);

    // Jump to position state
    const [isJumpDialogOpen, setIsJumpDialogOpen] = useState(false);

    // Keyboard shortcuts help
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

    // Feature colors version (for triggering re-render)
    const [, setColorsVersion] = useState(0);

    // Map view overlay toggles
    const [showEnzymesOnMap, setShowEnzymesOnMap] = useState(false);
    const [showORFsOnMap, setShowORFsOnMap] = useState(false);

    // Search state
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ fileId: string; start: number; end: number }[]>([]);
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

    // Resolve the sequence for multi-file selection
    const multiSelectionSequence = useMemo(() => {
        if (!multiSelection) return '';
        const file = items[multiSelection.fileId];
        if (!file?.content) return '';
        if (file.name.endsWith('.gb') || file.name.endsWith('.gbk')) {
            return parseGenBank(file.content)?.sequence || '';
        }
        if (file.name.endsWith('.fasta') || file.name.endsWith('.fa')) {
            return parseFasta(file.content)?.sequence || '';
        }
        return '';
    }, [multiSelection?.fileId, items]);

    const sequenceData = useMemo(() => {
        if (!selectedFile || !selectedFile.content) return null;
        if (selectedFile.name.endsWith('.gb') || selectedFile.name.endsWith('.gbk')) {
            return parseGenBank(selectedFile.content);
        }
        if (selectedFile.name.endsWith('.fasta') || selectedFile.name.endsWith('.fa')) {
            return parseFasta(selectedFile.content);
        }
        if (selectedFile.name.endsWith('.embl')) {
            return parseEMBL(selectedFile.content);
        }
        // Try SnapGene (.dna) as GenBank fallback
        if (selectedFile.name.endsWith('.dna')) {
            return parseGenBank(selectedFile.content);
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

    // ORF → CDS feature handler
    const handleAddOrfAsFeature = useCallback((orf: ORF) => {
        editor.addFeature({
            type: 'CDS',
            start: orf.start + 1, // convert to 1-indexed
            end: orf.end,
            strand: orf.strand,
            label: `ORF ${orf.frame > 0 ? '+' : ''}${orf.frame} (${orf.aaLength} aa)`,
        });
    }, [editor]);

    // Primer → feature handler
    const handleAddPrimerAsFeature = useCallback((primer: Primer) => {
        editor.addFeature({
            type: 'primer_bind',
            start: primer.start + 1,
            end: primer.end,
            strand: primer.strand,
            label: primer.name,
        });
    }, [editor]);

    // Map view callbacks
    const handleNavigateToSequence = useCallback((position: number) => {
        setViewMode('seq');
        editor.setCursorPosition(position);
    }, [editor]);

    const handleMapSelectRange = useCallback((start: number, end: number) => {
        editor.setSelection(start, end);
    }, [editor]);

    // Computed overlays for map view (cached)
    const mapEnzymeSites = useMemo(() => {
        if (!showEnzymesOnMap || !editor.sequence) return undefined;
        // Use a subset of common 6-cutters for map overlay
        const common6Cutters = ENZYME_DB.filter(e => e.recognitionSeq.length === 6);
        return findCutSites(editor.sequence, common6Cutters);
    }, [showEnzymesOnMap, editor.sequence]);

    const mapORFs = useMemo(() => {
        if (!showORFsOnMap || !editor.sequence) return undefined;
        return findAllORFs(editor.sequence, 100);
    }, [showORFsOnMap, editor.sequence]);

    // Search results formatted for map view (without fileId)
    const mapSearchResults = useMemo(() => {
        if (!searchResults.length || !selectedFile) return undefined;
        return searchResults
            .filter(r => r.fileId === selectedFile.id)
            .map(r => ({ start: r.start, end: r.end }));
    }, [searchResults, selectedFile]);

    // Export handlers
    const handleExportGenBank = useCallback(() => {
        if (!sequenceData) return;
        const baseName = sequenceData.name || 'sequence';
        const content = exportAsGenBank(sequenceData, editor.sequence, editor.features);
        downloadFile(content, `${baseName}.gb`);
        setIsExportMenuOpen(false);
    }, [sequenceData, editor.sequence, editor.features]);

    const handleExportFasta = useCallback(() => {
        if (!sequenceData) return;
        const baseName = sequenceData.name || 'sequence';
        const content = exportAsFasta(sequenceData, editor.sequence);
        downloadFile(content, `${baseName}.fasta`);
        setIsExportMenuOpen(false);
    }, [sequenceData, editor.sequence]);

    const handleExportSelectionFasta = useCallback(() => {
        if (!sequenceData || !editor.hasSelection || editor.selectionStart === null || editor.selectionEnd === null) return;
        const start = Math.min(editor.selectionStart, editor.selectionEnd);
        const end = Math.max(editor.selectionStart, editor.selectionEnd);
        const selectedSeq = editor.sequence.slice(start, end);
        const name = `${sequenceData.name}_${start + 1}-${end}`;
        const content = `>${name}\n${selectedSeq}`;
        downloadFile(content, `${name}.fasta`);
        setIsExportMenuOpen(false);
    }, [sequenceData, editor.sequence, editor.selectionStart, editor.selectionEnd, editor.hasSelection]);

    // Wrappers to clear search on interaction
    const handleCursorMove = useCallback((pos: number) => {
        editor.setCursorPosition(pos);
        if (searchResults.length > 0) closeSearch();
    }, [editor.setCursorPosition, searchResults.length, closeSearch]);

    const handleSetSelection = useCallback((start: number, end: number, direction?: 'forward' | 'reverse') => {
        editor.setSelection(start, end, direction);
        if (searchResults.length > 0) closeSearch();
    }, [editor.setSelection, searchResults.length, closeSearch]);

    // Sequence operations handlers
    const handleReplaceSequence = useCallback((newSeq: string) => {
        editor.replaceSequence(newSeq);
    }, [editor]);

    const handleReplaceSelection = useCallback((start: number, end: number, replacement: string) => {
        editor.setSelection(start, end);
        editor.replaceSelection(replacement);
    }, [editor]);

    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't capture when typing in inputs (unless it's a global shortcut)
            const target = e.target as HTMLElement;
            const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            // Escape always works
            if (e.key === 'Escape') {
                if (isJumpDialogOpen) { setIsJumpDialogOpen(false); return; }
                if (isShortcutsOpen) { setIsShortcutsOpen(false); return; }
                if (isSearchOpen) { closeSearch(); return; }
                if (featureEditorOpen) { setFeatureEditorOpen(false); return; }
                if (editor.hasSelection) { editor.clearSelection(); return; }
                return;
            }

            // Ctrl/Cmd shortcuts work even in inputs
            const mod = e.metaKey || e.ctrlKey;

            if (mod && e.key === 'g') {
                e.preventDefault();
                setIsJumpDialogOpen(true);
                return;
            }
            if (mod && e.key === 'f') {
                e.preventDefault();
                setIsSearchOpen(true);
                return;
            }
            if (mod && e.key === 's') {
                e.preventDefault();
                if (editMode && hasUnsavedChanges) handleSave();
                return;
            }
            if (mod && e.key === 'e') {
                e.preventDefault();
                if (!isMultiFileMode) setEditMode(prev => !prev);
                return;
            }
            if (mod && e.key === 'a' && !isInInput) {
                e.preventDefault();
                if (editor.sequence.length > 0) {
                    editor.setSelection(0, editor.sequence.length);
                }
                return;
            }
            if (mod && e.key === 'c') {
                if (!editor.hasSelection || editor.selectionStart === null || editor.selectionEnd === null) return;
                const s = Math.min(editor.selectionStart, editor.selectionEnd);
                const end = Math.max(editor.selectionStart, editor.selectionEnd);
                const sel = editor.sequence.slice(s, end);
                if (e.shiftKey) {
                    e.preventDefault();
                    navigator.clipboard.writeText(getReverseComplement(sel));
                } else {
                    e.preventDefault();
                    navigator.clipboard.writeText(sel);
                }
                return;
            }

            // Non-modifier shortcuts (don't fire in inputs)
            if (isInInput) return;

            if (e.key === '?') {
                e.preventDefault();
                setIsShortcutsOpen(true);
                return;
            }
            if (e.key === 'r' || e.key === 'R') {
                if (!isMultiFileMode && viewMode === 'seq') {
                    setShowReverseStrand(prev => !prev);
                }
                return;
            }
            if (e.key === 'Tab') {
                e.preventDefault();
                const modes: typeof viewMode[] = ['seq', 'map', 'features', 'stats', 'enzymes', 'orfs', 'digest', 'primers', 'align', 'codons', 'colors', 'cloning'];
                const idx = modes.indexOf(viewMode);
                setViewMode(modes[(idx + 1) % modes.length]);
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isJumpDialogOpen, isShortcutsOpen, isSearchOpen, featureEditorOpen, editor, editMode, hasUnsavedChanges, handleSave, isMultiFileMode, viewMode, closeSearch]);

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
                        <button
                            onClick={() => setViewMode('stats')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${viewMode === 'stats' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                            title="Sequence Statistics"
                        >
                            <BarChart3 size={16} />
                            <span>Stats</span>
                        </button>
                        <button
                            onClick={() => setViewMode('enzymes')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${viewMode === 'enzymes' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                            title="Restriction Enzymes"
                        >
                            <Scissors size={16} />
                            <span>Enzymes</span>
                        </button>
                        <button
                            onClick={() => setViewMode('orfs')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${viewMode === 'orfs' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                            title="ORF Finder"
                        >
                            <Dna size={16} />
                            <span>ORFs</span>
                        </button>
                        <button
                            onClick={() => setViewMode('digest')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${viewMode === 'digest' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                            title="Digestion Simulation"
                        >
                            <Scissors size={16} />
                            <span>Digest</span>
                        </button>
                        <button
                            onClick={() => setViewMode('primers')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${viewMode === 'primers' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                            title="Primer Design"
                        >
                            <span className="font-mono text-xs font-bold">Pr</span>
                            <span>Primers</span>
                        </button>
                        <button
                            onClick={() => setViewMode('align')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${viewMode === 'align' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                            title="Pairwise Alignment"
                        >
                            <span className="font-mono text-xs font-bold">Al</span>
                            <span>Align</span>
                        </button>
                        <button
                            onClick={() => setViewMode('codons')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${viewMode === 'codons' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                            title="Codon Usage"
                        >
                            <span className="font-mono text-xs font-bold">Cu</span>
                            <span>Codons</span>
                        </button>
                        <button
                            onClick={() => setViewMode('colors')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${viewMode === 'colors' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                            title="Feature Colors"
                        >
                            <span className="font-mono text-xs font-bold">Fc</span>
                            <span>Colors</span>
                        </button>
                        <button
                            onClick={() => setViewMode('cloning')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${viewMode === 'cloning' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                            title="Cloning Simulation"
                        >
                            <span className="font-mono text-xs font-bold">Cl</span>
                            <span>Clone</span>
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

                {/* BLAST Button */}
                {!isMultiFileMode && sequenceData && (
                    <BlastMenu
                        sequence={editor.sequence}
                        selectionStart={editor.selectionStart}
                        selectionEnd={editor.selectionEnd}
                        hasSelection={editor.hasSelection}
                    />
                )}

                {/* Export Button */}
                {!isMultiFileMode && sequenceData && (
                    <div className="relative">
                        <button
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                            className={`p-1.5 rounded-md transition-colors ${isExportMenuOpen ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                            title="Export Sequence"
                        >
                            <Download size={16} />
                        </button>
                        {isExportMenuOpen && (
                            <div className="absolute top-10 right-0 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 min-w-[200px]">
                                <button
                                    onClick={handleExportGenBank}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                                >
                                    Export as GenBank (.gb)
                                </button>
                                <button
                                    onClick={handleExportFasta}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                                >
                                    Export as FASTA (.fasta)
                                </button>
                                {editor.hasSelection && (
                                    <>
                                        <div className="border-t border-gray-700 my-1" />
                                        <button
                                            onClick={handleExportSelectionFasta}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                                        >
                                            Export Selection as FASTA
                                        </button>
                                    </>
                                )}
                                <div className="border-t border-gray-700 my-1" />
                                <button
                                    onClick={() => { window.print(); setIsExportMenuOpen(false); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                                >
                                    Print / PDF
                                </button>
                            </div>
                        )}
                    </div>
                )}

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
                {/* Map View Overlay Toggles */}
                {!isMultiFileMode && viewMode === 'map' && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowEnzymesOnMap(!showEnzymesOnMap)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors text-sm font-medium ${showEnzymesOnMap
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                                }`}
                            title="Show Restriction Enzyme Sites"
                        >
                            <Scissors size={14} />
                            <span>Enzymes</span>
                        </button>
                        <button
                            onClick={() => setShowORFsOnMap(!showORFsOnMap)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors text-sm font-medium ${showORFsOnMap
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                                }`}
                            title="Show Open Reading Frames"
                        >
                            <Dna size={14} />
                            <span>ORFs</span>
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

                {/* 6-Frame Translation Toggle (Seq view only) */}
                {!isMultiFileMode && viewMode === 'seq' && (
                    <div className="relative">
                        <button
                            onClick={() => setShowTranslationMenu(!showTranslationMenu)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${translationFrames.size > 0
                                ? 'bg-yellow-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                                }`}
                            title="6-Frame Translation"
                        >
                            <span className="font-mono text-xs font-bold">AA</span>
                            <span>Frames</span>
                            {translationFrames.size > 0 && (
                                <span className="bg-white/20 rounded-full px-1.5 text-xs">{translationFrames.size}</span>
                            )}
                        </button>
                        {showTranslationMenu && (
                            <div className="absolute top-10 right-0 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-2 min-w-[180px]">
                                <div className="px-3 py-1 text-xs text-gray-400 uppercase">Forward</div>
                                {[1, 2, 3].map(frame => (
                                    <button
                                        key={frame}
                                        onClick={() => {
                                            setTranslationFrames(prev => {
                                                const next = new Set(prev);
                                                next.has(frame) ? next.delete(frame) : next.add(frame);
                                                return next;
                                            });
                                        }}
                                        className={`w-full text-left px-4 py-1.5 text-sm flex items-center gap-2 ${translationFrames.has(frame)
                                            ? 'text-yellow-300 bg-yellow-500/10'
                                            : 'text-gray-300 hover:bg-gray-700'
                                            }`}
                                    >
                                        <span className={`w-4 h-4 rounded border text-xs flex items-center justify-center ${translationFrames.has(frame)
                                            ? 'bg-yellow-500 border-yellow-500 text-black'
                                            : 'border-gray-600'
                                            }`}>
                                            {translationFrames.has(frame) ? '✓' : ''}
                                        </span>
                                        Frame +{frame}
                                    </button>
                                ))}
                                <div className="border-t border-gray-700 my-1" />
                                <div className="px-3 py-1 text-xs text-gray-400 uppercase">Reverse</div>
                                {[-1, -2, -3].map(frame => (
                                    <button
                                        key={frame}
                                        onClick={() => {
                                            setTranslationFrames(prev => {
                                                const next = new Set(prev);
                                                next.has(frame) ? next.delete(frame) : next.add(frame);
                                                return next;
                                            });
                                        }}
                                        className={`w-full text-left px-4 py-1.5 text-sm flex items-center gap-2 ${translationFrames.has(frame)
                                            ? 'text-yellow-300 bg-yellow-500/10'
                                            : 'text-gray-300 hover:bg-gray-700'
                                            }`}
                                    >
                                        <span className={`w-4 h-4 rounded border text-xs flex items-center justify-center ${translationFrames.has(frame)
                                            ? 'bg-yellow-500 border-yellow-500 text-black'
                                            : 'border-gray-600'
                                            }`}>
                                            {translationFrames.has(frame) ? '✓' : ''}
                                        </span>
                                        Frame {frame}
                                    </button>
                                ))}
                                <div className="border-t border-gray-700 my-1" />
                                <div className="flex gap-1 px-3 py-1">
                                    <button
                                        onClick={() => setTranslationFrames(new Set([1, 2, 3, -1, -2, -3]))}
                                        className="text-xs text-blue-400 hover:underline"
                                    >All</button>
                                    <span className="text-gray-600">|</span>
                                    <button
                                        onClick={() => setTranslationFrames(new Set())}
                                        className="text-xs text-red-400 hover:underline"
                                    >None</button>
                                </div>
                            </div>
                        )}
                    </div>
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

                {/* Sequence Operations (Seq view, edit mode) */}
                {!isMultiFileMode && viewMode === 'seq' && editMode && (
                    <SequenceOperationsMenu
                        sequence={editor.sequence}
                        selectionStart={editor.selectionStart}
                        selectionEnd={editor.selectionEnd}
                        hasSelection={editor.hasSelection}
                        onReplaceSequence={handleReplaceSequence}
                        onReplaceSelection={handleReplaceSelection}
                    />
                )}
            </div>

            {/* Main View Area */}
            <div className="flex-1 overflow-hidden relative">
                {isMultiFileMode ? (
                    <>
                        <MultiSequenceView
                            files={activeFiles}
                            zoomLevel={zoomLevel}
                            searchResults={searchResults}
                            currentMatchIndex={currentMatchIndex}
                            selection={multiSelection}
                            onSelectionChange={setMultiSelection}
                        />

                        {/* Selection Info Panel for Multi-File Mode */}
                        {multiSelection && multiSelection.end > multiSelection.start && multiSelectionSequence && (
                            <div className="absolute bottom-4 right-4 shadow-lg z-10">
                                <SelectionInfo
                                    selectionStart={multiSelection.start}
                                    selectionEnd={multiSelection.end}
                                    sequence={multiSelectionSequence}
                                    direction={multiSelection.direction}
                                />
                            </div>
                        )}
                    </>
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
                            translationFrames={translationFrames}
                        />}
                        {viewMode === 'map' && sequenceData && (
                            sequenceData.circular ?
                                <CircularView
                                    data={{ ...sequenceData, sequence: editor.sequence, features: editor.features }}
                                    zoomLevel={zoomLevel}
                                    onFeatureClick={handleEditFeature}
                                    onNavigateToSequence={handleNavigateToSequence}
                                    onSelectRange={handleMapSelectRange}
                                    searchResults={mapSearchResults}
                                    currentMatchIndex={currentMatchIndex}
                                    showEnzymeSites={mapEnzymeSites}
                                    showORFs={mapORFs}
                                /> :
                                <LinearMapView
                                    data={{ ...sequenceData, sequence: editor.sequence, features: editor.features }}
                                    zoomLevel={zoomLevel}
                                    onFeatureClick={handleEditFeature}
                                    onNavigateToSequence={handleNavigateToSequence}
                                    onSelectRange={handleMapSelectRange}
                                    searchResults={mapSearchResults}
                                    currentMatchIndex={currentMatchIndex}
                                    showEnzymeSites={mapEnzymeSites}
                                    showORFs={mapORFs}
                                />
                        )}
                        {viewMode === 'features' && sequenceData && <FeatureList data={sequenceData} />}
                        {viewMode === 'stats' && sequenceData && (
                            <SequenceStats
                                data={sequenceData}
                                sequence={editor.sequence}
                                features={editor.features}
                            />
                        )}
                        {viewMode === 'enzymes' && sequenceData && (
                            <RestrictionEnzymePanel sequence={editor.sequence} />
                        )}
                        {viewMode === 'orfs' && sequenceData && (
                            <ORFFinderPanel
                                sequence={editor.sequence}
                                onAddAsFeature={handleAddOrfAsFeature}
                            />
                        )}
                        {viewMode === 'digest' && sequenceData && (
                            <DigestSimPanel
                                sequence={editor.sequence}
                                circular={sequenceData.circular}
                            />
                        )}
                        {viewMode === 'primers' && sequenceData && (
                            <PrimerDesignPanel
                                sequence={editor.sequence}
                                selectionStart={editor.selectionStart}
                                selectionEnd={editor.selectionEnd}
                                hasSelection={editor.hasSelection}
                                onAddAsFeature={handleAddPrimerAsFeature}
                            />
                        )}
                        {viewMode === 'align' && sequenceData && (
                            <AlignmentPanel sequence={editor.sequence} />
                        )}
                        {viewMode === 'codons' && sequenceData && (
                            <CodonUsagePanel
                                sequence={editor.sequence}
                                features={editor.features}
                            />
                        )}
                        {viewMode === 'colors' && sequenceData && (
                            <FeatureColorSettings
                                featureTypes={[...new Set(editor.features.map(f => f.type))]}
                                onColorsChanged={() => setColorsVersion(v => v + 1)}
                            />
                        )}
                        {viewMode === 'cloning' && sequenceData && (
                            <CloningSimPanel
                                sequence={editor.sequence}
                                circular={sequenceData.circular}
                            />
                        )}

                        {/* Selection Info Panel */}
                        {(viewMode === 'seq' || viewMode === 'map') && editor.hasSelection && editor.selectionStart !== null && editor.selectionEnd !== null && (
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

            {/* Jump to Position Dialog */}
            {sequenceData && (
                <JumpToPositionDialog
                    isOpen={isJumpDialogOpen}
                    onClose={() => setIsJumpDialogOpen(false)}
                    onJump={(pos) => {
                        editor.setCursorPosition(pos);
                    }}
                    onSelectRange={(start, end) => {
                        editor.setSelection(start, end);
                    }}
                    sequenceLength={editor.sequence.length}
                    features={editor.features}
                />
            )}

            {/* Keyboard Shortcuts Help */}
            <KeyboardShortcutsPanel
                isOpen={isShortcutsOpen}
                onClose={() => setIsShortcutsOpen(false)}
            />
        </div>
    );
};
