// src/lib/vault/types.ts

export type NodeKind = 'folder' | 'plainNote' | 'pdfNote';

export interface TreeNode {
    name: string;
    path: string; // relative to vault root
    kind: NodeKind;
    children: TreeNode[] | null; // Option<Vec<T>> in Rust -> null, not undefined
}

export interface PdfNotes {
    pdfFile: string; // filename of the PDF in this folder
    pages: Record<string, { text: string }>; // keyed by page number as string
}

export interface Workspace {
    order: Record<string, string[]>; // folder path -> ordered filenames/foldernames
    lastOpened?: string; // path to last opened note
    pinned?: string[];
}