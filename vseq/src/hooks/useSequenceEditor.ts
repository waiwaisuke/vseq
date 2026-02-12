import { useState, useCallback } from 'react';
import type { Feature } from '../types';

interface SequenceState {
    sequence: string;
    features: Feature[];
}

interface UseSequenceEditorResult {
    sequence: string;
    features: Feature[];
    cursorPosition: number;
    selectionStart: number | null;
    selectionEnd: number | null;
    selectionDirection: 'forward' | 'reverse';
    hasSelection: boolean;
    selectedSequence: string;
    canUndo: boolean;
    canRedo: boolean;
    setCursorPosition: (position: number) => void;
    setSelection: (start: number, end: number, direction?: 'forward' | 'reverse') => void;
    clearSelection: () => void;
    deleteSelection: () => void;
    replaceSelection: (replacement: string) => void;
    replaceSequence: (newSequence: string) => void;
    addFeature: (feature: Omit<Feature, 'id'>) => void;
    updateFeature: (featureId: string, updates: Partial<Feature>) => void;
    deleteFeature: (featureId: string) => void;
    insertBase: (base: string) => void;
    deleteBase: () => void;
    backspace: () => void;
    undo: () => void;
    redo: () => void;
    resetHistory: (newSequence: string, newFeatures: Feature[]) => void;
}

export const useSequenceEditor = (
    initialSequence: string,
    initialFeatures: Feature[]
): UseSequenceEditorResult => {
    const [history, setHistory] = useState<SequenceState[]>([
        { sequence: initialSequence, features: initialFeatures }
    ]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [selectionStart, setSelectionStart] = useState<number | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
    const [selectionDirection, setSelectionDirection] = useState<'forward' | 'reverse'>('forward');

    const currentState = history[historyIndex];
    const hasSelection = selectionStart !== null && selectionEnd !== null;

    // Helper to detect if a position is within any feature
    const getFeaturesAtPosition = useCallback((position: number, features: Feature[]): Feature[] => {
        return features.filter(feature =>
            position >= feature.start - 1 && position < feature.end
        );
    }, []);

    // Helper to add a new state to history
    const addToHistory = useCallback((newState: SequenceState) => {
        setHistory(prev => {
            // Remove any future history if we're not at the end
            const newHistory = prev.slice(0, historyIndex + 1);
            // Add new state
            newHistory.push(newState);
            // Limit history to 50 states
            if (newHistory.length > 50) {
                newHistory.shift();
                return newHistory;
            }
            return newHistory;
        });
        setHistoryIndex(prev => Math.min(prev + 1, 49));
    }, [historyIndex]);

    // Selection methods
    const setSelection = useCallback((start: number, end: number, direction: 'forward' | 'reverse' = 'forward') => {
        // Normalize selection so start is always less than end
        const normalizedStart = Math.min(start, end);
        const normalizedEnd = Math.max(start, end);
        setSelectionStart(normalizedStart);
        setSelectionEnd(normalizedEnd);
        setSelectionDirection(direction);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectionStart(null);
        setSelectionEnd(null);
        setSelectionDirection('forward');
    }, []);

    const deleteSelection = useCallback(() => {
        if (!hasSelection || selectionStart === null || selectionEnd === null) return;

        const newSequence =
            currentState.sequence.slice(0, selectionStart) +
            currentState.sequence.slice(selectionEnd);

        // Remove features that overlap with selection
        const newFeatures = currentState.features.filter(feature => {
            const featureStart = feature.start - 1;
            const featureEnd = feature.end;
            // Keep feature only if it doesn't overlap with selection
            return featureEnd <= selectionStart || featureStart >= selectionEnd;
        });

        addToHistory({ sequence: newSequence, features: newFeatures });
        setCursorPosition(selectionStart);
        clearSelection();
    }, [hasSelection, selectionStart, selectionEnd, currentState, addToHistory, clearSelection]);

    const replaceSelection = useCallback((replacement: string) => {
        if (!hasSelection || selectionStart === null || selectionEnd === null) return;
        const newSequence =
            currentState.sequence.slice(0, selectionStart) +
            replacement +
            currentState.sequence.slice(selectionEnd);
        addToHistory({ sequence: newSequence, features: currentState.features });
        setCursorPosition(selectionStart + replacement.length);
        clearSelection();
    }, [hasSelection, selectionStart, selectionEnd, currentState, addToHistory, clearSelection]);

    const replaceSequence = useCallback((newSequence: string) => {
        addToHistory({ sequence: newSequence, features: currentState.features });
        setCursorPosition(0);
        clearSelection();
    }, [currentState, addToHistory, clearSelection]);

    // Feature management methods
    const addFeature = useCallback((feature: Omit<Feature, 'id'>) => {
        const newFeature: Feature = {
            ...feature,
            id: crypto.randomUUID(),
        };
        const newFeatures = [...currentState.features, newFeature];
        addToHistory({ sequence: currentState.sequence, features: newFeatures });
        clearSelection();
    }, [currentState, addToHistory, clearSelection]);

    const updateFeature = useCallback((featureId: string, updates: Partial<Feature>) => {
        const newFeatures = currentState.features.map(f =>
            f.id === featureId ? { ...f, ...updates } : f
        );
        addToHistory({ sequence: currentState.sequence, features: newFeatures });
    }, [currentState, addToHistory]);

    const deleteFeature = useCallback((featureId: string) => {
        const newFeatures = currentState.features.filter(f => f.id !== featureId);
        addToHistory({ sequence: currentState.sequence, features: newFeatures });
    }, [currentState, addToHistory]);

    const insertBase = useCallback((base: string) => {
        const upperBase = base.toUpperCase();
        if (!['A', 'T', 'G', 'C', 'N'].includes(upperBase)) return;

        let newSequence: string;
        let newCursorPos: number;

        // If selection exists, replace it
        if (hasSelection && selectionStart !== null && selectionEnd !== null) {
            newSequence =
                currentState.sequence.slice(0, selectionStart) +
                upperBase +
                currentState.sequence.slice(selectionEnd);
            newCursorPos = selectionStart + 1;
        } else {
            // Normal insert at cursor
            newSequence =
                currentState.sequence.slice(0, cursorPosition) +
                upperBase +
                currentState.sequence.slice(cursorPosition);
            newCursorPos = cursorPosition + 1;
        }

        // Remove features that overlap with insertion/replacement area
        const startPos = hasSelection && selectionStart !== null ? selectionStart : cursorPosition;
        const endPos = hasSelection && selectionEnd !== null ? selectionEnd : cursorPosition;
        const affectedFeatures = currentState.features.filter(feature => {
            const featureStart = feature.start - 1;
            const featureEnd = feature.end;
            return !(featureEnd <= startPos || featureStart >= endPos);
        });
        const newFeatures = currentState.features.filter(
            feature => !affectedFeatures.includes(feature)
        );

        addToHistory({ sequence: newSequence, features: newFeatures });
        setCursorPosition(newCursorPos);
        clearSelection();
    }, [currentState, cursorPosition, hasSelection, selectionStart, selectionEnd, addToHistory, clearSelection]);

    const deleteBase = useCallback(() => {
        if (cursorPosition >= currentState.sequence.length) return;

        const newSequence =
            currentState.sequence.slice(0, cursorPosition) +
            currentState.sequence.slice(cursorPosition + 1);

        // Remove features that overlap with the deleted position
        const affectedFeatures = getFeaturesAtPosition(cursorPosition, currentState.features);
        const newFeatures = currentState.features.filter(
            feature => !affectedFeatures.includes(feature)
        );

        addToHistory({ sequence: newSequence, features: newFeatures });
    }, [currentState, cursorPosition, getFeaturesAtPosition, addToHistory]);

    const backspace = useCallback(() => {
        // If selection exists, delete it instead of single character
        if (hasSelection) {
            deleteSelection();
            return;
        }

        if (cursorPosition === 0) return;

        const deletePosition = cursorPosition - 1;
        const newSequence =
            currentState.sequence.slice(0, deletePosition) +
            currentState.sequence.slice(cursorPosition);

        // Remove features that overlap with the deleted position
        const affectedFeatures = getFeaturesAtPosition(deletePosition, currentState.features);
        const newFeatures = currentState.features.filter(
            feature => !affectedFeatures.includes(feature)
        );

        addToHistory({ sequence: newSequence, features: newFeatures });
        setCursorPosition(prev => prev - 1);
    }, [currentState, cursorPosition, getFeaturesAtPosition, addToHistory]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
        }
    }, [historyIndex]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1);
        }
    }, [historyIndex, history.length]);

    const selectedSequence = (selectionStart !== null && selectionEnd !== null)
        ? currentState.sequence.slice(selectionStart, selectionEnd)
        : '';

    const resetHistory = useCallback((newSequence: string, newFeatures: Feature[]) => {
        setHistory([{ sequence: newSequence, features: newFeatures }]);
        setHistoryIndex(0);
        setCursorPosition(0);
        clearSelection();
    }, [clearSelection]);

    return {
        sequence: currentState.sequence,
        features: currentState.features,
        cursorPosition,
        selectionStart,
        selectionEnd,
        selectionDirection,
        selectedSequence,
        hasSelection,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        setCursorPosition,
        setSelection,
        clearSelection,
        deleteSelection,
        replaceSelection,
        replaceSequence,
        addFeature,
        updateFeature,
        deleteFeature,
        insertBase,
        deleteBase,
        backspace,
        undo,
        redo,
        resetHistory,
    };
};
