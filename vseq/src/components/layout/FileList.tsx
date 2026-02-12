import React from 'react';
import { useFileSystemStore } from '../../store/useFileSystemStore';
import { File } from 'lucide-react';

export const FileList = () => {
    const items = useFileSystemStore((state) => state.items);
    const selectedId = useFileSystemStore((state) => state.selectedId);
    const activeFileIds = useFileSystemStore((state) => state.activeFileIds);
    const setActiveFiles = useFileSystemStore((state) => state.setActiveFiles);
    const toggleActiveFile = useFileSystemStore((state) => state.toggleActiveFile);

    // Get files in the selected folder
    const files = React.useMemo(() => {
        if (!selectedId) return [];

        const selectedItem = items[selectedId];
        if (!selectedItem || selectedItem.type !== 'folder') return [];

        const childIds = selectedItem.children || [];
        return childIds
            .map(id => items[id])
            .filter(item => item && item.type === 'file');
    }, [selectedId, items]);

    // Get file metadata
    const getFileMetadata = (file: any) => {
        const content = file.content || '';
        const sizeInBytes = new Blob([content]).size;
        const sizeStr = sizeInBytes < 1024
            ? `${sizeInBytes} B`
            : sizeInBytes < 1024 * 1024
                ? `${(sizeInBytes / 1024).toFixed(1)} KB`
                : `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;

        // Try to extract sequence length from GenBank content
        let sequenceLength = 0;
        const locusMatch = content.match(/LOCUS\s+\S+\s+(\d+)\s+bp/);
        if (locusMatch) {
            sequenceLength = parseInt(locusMatch[1], 10);
        }

        return {
            size: sizeStr,
            length: sequenceLength > 0 ? `${sequenceLength.toLocaleString()} bp` : 'Unknown',
        };
    };

    const handleFileClick = (fileId: string, event: React.MouseEvent) => {
        if (event.ctrlKey || event.metaKey) {
            // Ctrl/Cmd + click: toggle file in selection
            toggleActiveFile(fileId);
        } else {
            // Regular click: select only this file
            setActiveFiles([fileId]);
        }
    };

    if (!selectedId) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                <p>Select a folder to view its files</p>
            </div>
        );
    }

    const selectedItem = items[selectedId];
    if (!selectedItem || selectedItem.type !== 'folder') {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                <p>Select a folder to view its files</p>
            </div>
        );
    }

    if (files.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                <p>No files in this folder</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto bg-gray-900 border-b border-gray-800">
            <div className="p-4">
                <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase">
                    Files in {selectedItem.name}
                    {activeFileIds.length > 0 && (
                        <span className="ml-2 text-xs text-blue-400">
                            ({activeFileIds.length} selected)
                        </span>
                    )}
                </h2>
                {/* Test button for selecting all files */}
                {files.length > 1 && (
                    <button
                        onClick={() => setActiveFiles(files.map(f => f.id))}
                        className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-white mb-2"
                    >
                        Select All (Test Multi-View)
                    </button>
                )}
                <div className="space-y-1">
                    {files.map((file) => {
                        const metadata = getFileMetadata(file);
                        const isActive = activeFileIds.includes(file.id);

                        return (
                            <div
                                key={file.id}
                                onClick={(e) => handleFileClick(file.id, e)}
                                className={`
                                    flex items-start gap-3 p-3 rounded-md cursor-pointer
                                    transition-colors duration-150
                                    ${isActive
                                        ? 'bg-blue-600/20 border border-blue-500/50'
                                        : 'hover:bg-gray-800/50 border border-transparent'
                                    }
                                `}
                            >
                                <File
                                    className={`flex-shrink-0 mt-0.5 ${isActive ? 'text-blue-400' : 'text-gray-500'}`}
                                    size={18}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className={`font-medium truncate ${isActive ? 'text-blue-200' : 'text-gray-200'}`}>
                                        {file.name}
                                    </div>
                                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                        <span>{metadata.size}</span>
                                        <span>•</span>
                                        <span>{metadata.length}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
