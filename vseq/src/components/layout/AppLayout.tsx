import React, { useState, useCallback, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { FileList } from './FileList';
import { ResizablePanel } from './ResizablePanel';
import { useFileSystemStore } from '../../store/useFileSystemStore';
import { Upload } from 'lucide-react';

const SUPPORTED_EXTENSIONS = ['.gb', '.gbk', '.fasta', '.fa', '.txt', '.embl', '.dna', '.gff', '.gff3'];

interface AppLayoutProps {
    children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [dropError, setDropError] = useState<string | null>(null);
    const dragCounterRef = useRef(0);
    const { importItems, selectedId, items } = useFileSystemStore();

    const getTargetParentId = useCallback((): string | undefined => {
        if (!selectedId) return undefined;
        const item = items[selectedId];
        if (!item) return undefined;
        if (item.type === 'folder') return item.id;
        return item.parentId || undefined;
    }, [selectedId, items]);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current++;
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragOver(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current--;
        if (dragCounterRef.current === 0) {
            setIsDragOver(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        dragCounterRef.current = 0;
        setDropError(null);

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const supported = files.filter(f => {
            const ext = '.' + f.name.split('.').pop()?.toLowerCase();
            return SUPPORTED_EXTENSIONS.includes(ext);
        });

        const unsupported = files.length - supported.length;
        if (unsupported > 0 && supported.length === 0) {
            setDropError(`Non supporté: ${files.map(f => f.name).join(', ')}. Formats: ${SUPPORTED_EXTENSIONS.join(', ')}`);
            setTimeout(() => setDropError(null), 4000);
            return;
        }

        const targetParentId = getTargetParentId();
        const newItems: Record<string, import('../../types').FileSystemItem> = {};

        for (let i = 0; i < supported.length; i++) {
            const file = supported[i];
            const content = await file.text();
            const id = `file-${Date.now()}-${i}`;
            newItems[id] = {
                id,
                name: file.name,
                type: 'file',
                parentId: targetParentId || null,
                content,
            };
        }

        importItems(newItems);

        if (unsupported > 0) {
            setDropError(`${supported.length} file(s) imported. ${unsupported} file(s) skipped (unsupported format).`);
            setTimeout(() => setDropError(null), 4000);
        }
    }, [importItems, getTargetParentId]);

    return (
        <div
            className="flex flex-col h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <TopBar />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-hidden relative flex flex-col">
                    <ResizablePanel defaultTopHeight={30} minTopHeight={15} minBottomHeight={30}>
                        <FileList />
                        {children}
                    </ResizablePanel>
                </main>
            </div>

            {/* Drop zone overlay */}
            {isDragOver && (
                <div className="absolute inset-0 z-50 bg-blue-600/20 backdrop-blur-sm border-4 border-dashed border-blue-400 flex items-center justify-center pointer-events-none">
                    <div className="bg-gray-900/90 rounded-2xl px-12 py-10 text-center shadow-2xl">
                        <Upload className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                        <p className="text-xl font-semibold text-blue-200">Drop files here to import</p>
                        <p className="text-sm text-gray-400 mt-2">{SUPPORTED_EXTENSIONS.join(', ')}</p>
                    </div>
                </div>
            )}

            {/* Drop error/success notification */}
            {dropError && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 text-gray-200 px-6 py-3 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-bottom-4">
                    {dropError}
                </div>
            )}
        </div>
    );
};
