import React from 'react';
import { useFileSystemStore } from '../../store/useFileSystemStore';
import { Folder, File, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import type { FileSystemItem } from '../../types';

const FileTreeItem = ({ item, level = 0 }: { item: FileSystemItem; level?: number }) => {
    const { expandedIds, selectedId, toggleFolder, selectItem, items, deleteItem, setActiveFiles } = useFileSystemStore();
    const isExpanded = expandedIds.has(item.id);
    const isSelected = selectedId === item.id;
    // const hasChildren = item.children && item.children.length > 0;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (item.type === 'folder') {
            toggleFolder(item.id);
            selectItem(item.id);
        } else {
            // When clicking a file, select its parent folder (to keep FileList visible)
            // and set it as the active file for the viewer
            if (item.parentId) {
                selectItem(item.parentId);
            }
            setActiveFiles([item.id]);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        deleteItem(item.id);
    };

    return (
        <div>
            <div
                className={`group flex items-center py-1 px-2 cursor-pointer hover:bg-gray-800 ${isSelected ? 'bg-blue-900/50 text-blue-200' : 'text-gray-300'
                    }`}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={handleClick}
            >
                <span className="mr-1 opacity-70">
                    {item.type === 'folder' && (
                        isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    )}
                    {item.type === 'file' && <span className="w-3.5 inline-block" />}
                </span>
                <span className="mr-2 text-blue-400">
                    {item.type === 'folder' ? <Folder size={16} /> : <File size={16} />}
                </span>
                <span className="text-sm truncate select-none flex-1">{item.name}</span>

                <button
                    onClick={handleDelete}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {item.type === 'folder' && isExpanded && item.children && (
                <div>
                    {item.children.map((childId) => (
                        <FileTreeItem key={childId} item={items[childId]} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

export const Sidebar = () => {
    const { items, rootIds, createFolder, createFile, importItems, selectedId, selectItem } = useFileSystemStore();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const folderInputRef = React.useRef<HTMLInputElement>(null);

    // Determine parent ID for new items
    const getTargetParentId = () => {
        if (!selectedId) return undefined;
        const item = items[selectedId];
        if (!item) return undefined;

        // If selected is folder, create inside it
        if (item.type === 'folder') return item.id;

        // If selected is file, create in its parent
        return item.parentId || undefined;
    };

    const handleCreateFolder = () => {
        createFolder('New Folder', getTargetParentId());
    };

    const handleCreateFile = () => {
        createFile('New Sequence.gb', '', getTargetParentId());
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newItems: Record<string, FileSystemItem> = {};
        const targetParentId = getTargetParentId();

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const content = await file.text();
            const id = `file-${Date.now()}-${i}`;
            newItems[id] = {
                id,
                name: file.name,
                type: 'file',
                parentId: targetParentId || null,
                content
            };
        }

        importItems(newItems);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFolderImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newItems: Record<string, FileSystemItem> = {};
        const pathMap: Record<string, string> = {}; // path -> id
        const targetParentId = getTargetParentId();

        // First pass: Create all folders and files
        // Note: webkitdirectory gives a flat list of files with webkitRelativePath
        // e.g. "folder/subfolder/file.txt"

        // We need to reconstruct the tree
        // Ideally we find the common root folder name first, but let's just create the structure as is relative to root

        // Helper to get or create folder ID for a path
        const getOrCreateFolder = (path: string): string => {
            if (pathMap[path]) return pathMap[path];

            const parts = path.split('/');
            const name = parts[parts.length - 1];
            const parentPath = parts.slice(0, -1).join('/');

            const id = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            let parentId: string | null = null;
            if (parentPath) {
                parentId = getOrCreateFolder(parentPath);
            } else {
                // Top level folder in this import
                parentId = targetParentId || null;
            }

            newItems[id] = {
                id,
                name,
                type: 'folder',
                parentId,
                children: []
            };
            pathMap[path] = id;
            return id;
        };

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const path = file.webkitRelativePath;
            const parts = path.split('/');
            const fileName = parts.pop()!;
            const folderPath = parts.join('/');

            let parentId: string | null = null;
            if (folderPath) {
                parentId = getOrCreateFolder(folderPath);
            } else {
                parentId = targetParentId || null;
            }

            const content = await file.text();
            const id = `file-${Date.now()}-${i}`;

            newItems[id] = {
                id,
                name: fileName,
                type: 'file',
                parentId,
                content
            };

            // Add to parent's children immediately in our temp map so we don't lose track
            if (parentId && newItems[parentId]) {
                newItems[parentId].children = [...(newItems[parentId].children || []), id];
            }
        }

        importItems(newItems);
        if (folderInputRef.current) folderInputRef.current.value = '';
    };

    return (
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
            <div className="p-3 border-b border-gray-800 flex justify-between items-center">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Explorer</h2>
                <div className="flex gap-1">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        accept=".gb,.gbk,.fasta,.fa,.txt"
                        onChange={handleFileImport}
                    />
                    <input
                        type="file"
                        ref={folderInputRef}
                        className="hidden"
                        // @ts-ignore - webkitdirectory is not standard but supported
                        webkitdirectory=""
                        directory=""
                        onChange={handleFolderImport}
                    />

                    <button
                        onClick={() => folderInputRef.current?.click()}
                        className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
                        title="Import Folder"
                    >
                        <Folder size={14} />
                        <span className="absolute ml-2 -mt-1 text-[10px] font-bold">+</span>
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
                        title="Import File"
                    >
                        <File size={14} />
                        <span className="absolute ml-2 -mt-1 text-[10px] font-bold">+</span>
                    </button>
                    <div className="w-px h-4 bg-gray-700 mx-1 self-center"></div>
                    <button
                        onClick={handleCreateFolder}
                        className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
                        title="New Folder"
                    >
                        <Folder size={14} />
                    </button>
                    <button
                        onClick={handleCreateFile}
                        className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
                        title="New File"
                    >
                        <File size={14} />
                    </button>
                </div>
            </div>
            <div
                className="flex-1 overflow-y-auto py-2"
                onClick={() => selectItem(null)}
            >
                {rootIds.map((id) => (
                    <FileTreeItem key={id} item={items[id]} />
                ))}
            </div>
        </div>
    );
};
