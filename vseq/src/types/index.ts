export type FileType = 'folder' | 'file';
export type SequenceType = 'dna' | 'protein';

export interface FileSystemItem {
    id: string;
    name: string;
    type: FileType;
    parentId: string | null;
    content?: string; // For now, store content in memory
    children?: string[]; // IDs of children
}

export interface SequenceData {
    id: string;
    name: string;
    sequence: string;
    type: SequenceType;
    circular: boolean;
    features: Feature[];
}

export interface Feature {
    id: string;
    name: string;
    start: number;
    end: number;
    type: string;
    strand: 1 | -1;
    color?: string;
    label?: string;
    attributes?: Record<string, string>;
}
